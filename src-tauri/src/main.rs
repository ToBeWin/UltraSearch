#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod preview;

use std::{
    collections::VecDeque,
    path::{Path, PathBuf},
    sync::{Arc, Mutex},
    error::Error,
    time::{Duration, Instant},
};
use tauri::{self, Emitter, State, Manager as _, AppHandle};
use preview::FilePreview;
use serde::{Deserialize, Serialize};
use anyhow::Result;
use chrono;
use log::{info, warn, error, debug, trace};
use tokio::sync::mpsc;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct FileMetadata {
    path: String,
    name: String,
    size: u64,
    #[serde(with = "chrono::serde::ts_seconds")]
    modified_time: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SearchResult {
    file_path: String,
    name: String,
    size: u64,
    #[serde(with = "chrono::serde::ts_seconds")]
    modified_time: chrono::DateTime<chrono::Utc>,
    line_number: Option<i32>,
    content: Option<String>,
    matches: Option<Vec<String>>,
}

impl From<FileMetadata> for SearchResult {
    fn from(metadata: FileMetadata) -> Self {
        SearchResult {
            file_path: metadata.path.clone(),
            name: metadata.name.clone(),
            size: metadata.size,
            modified_time: metadata.modified_time,
            line_number: None,
            content: None,
            matches: None,
        }
    }
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AdvancedSearchOptions {
    query: String,
    use_regex: bool,
    pattern: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ScanProgress {
    current_drive: String,
    drive_index: usize,
    total_drives: usize,
    message: String,
    files_found_on_drive: Option<usize>,
    files_collected_so_far: Option<usize>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AdvancedFilterOptions {
    file_type: Option<String>,
    min_size: Option<u64>,
    max_size: Option<u64>,
}

#[derive(Debug)]
struct AppState {
    files: Arc<Mutex<Vec<FileMetadata>>>,
    file_preview: Arc<FilePreview>,
}

#[tauri::command]
async fn scan_directory(app_handle: AppHandle, state: State<'_, AppState>) -> Result<(), String> {
    let files_arc = state.files.clone();
    let handle = app_handle;
    let scan_start_time = Instant::now();

    info!("Scan directory command received. Spawning parallel background tasks.");

    tokio::spawn(async move {
        {
            let mut files_guard = match files_arc.lock() {
                Ok(guard) => guard,
                Err(poisoned) => {
                    error!("Lock poisoned (clear): {}", poisoned);
                    poisoned.into_inner()
                }
            };
            files_guard.clear();
            files_guard.shrink_to_fit();
            drop(files_guard);
        }

        info!("Background scan coordinator started.");
        if let Err(e) = handle.emit("scan_log", "并行扫描任务已启动".to_string()) {
            error!("Failed to emit scan_log: {}", e);
        }
        if let Err(e) = handle.emit("scan_status", "scanning") {
            error!("Failed to emit scan_status: {}", e);
        }

        let (tx, mut rx) = mpsc::channel::<FileMetadata>(2048);

        let available_drives = match get_available_drives() {
            Ok(drives) => drives,
            Err(e) => {
                error!("Error getting available drives: {}", e);
                let _ = handle.emit("scan_log", format!("获取可用驱动器列表时出错: {}", e));
                let _ = handle.emit("scan_status", "idle");
                return;
            }
        };
        let total_drives = available_drives.len();
        info!("Found {} drives: {:?}", total_drives, available_drives);
        let _ = handle.emit("scan_log", format!("发现 {} 个驱动器: {:?}", total_drives, available_drives));

        let mut join_handles = vec![];
        for (index, drive) in available_drives.into_iter().enumerate() {
            let drive_path = PathBuf::from(drive.clone());
            let tx_clone = tx.clone();
            let handle_clone = handle.clone();
            let drive_label = drive.clone();

            info!("Spawning scan task for drive: {}", drive_label);
            let _ = handle_clone.emit("scan_progress", ScanProgress {
                current_drive: drive_label.clone(), drive_index: index + 1, total_drives,
                message: "任务已启动".to_string(), files_found_on_drive: None, files_collected_so_far: Some(0)
            });

            let join_handle = tokio::spawn(async move {
                let drive_scan_start = Instant::now();
                info!("Task started for drive: {}", drive_label);
                let _ = handle_clone.emit("scan_log", format!("开始扫描驱动器: {}", drive_label));
                let _ = handle_clone.emit("scan_progress", ScanProgress {
                    current_drive: drive_label.clone(), drive_index: index + 1, total_drives,
                    message: "正在扫描...".to_string(), files_found_on_drive: None, files_collected_so_far: Some(0)
                });

                let mut files_on_this_drive: usize = 0;
                if let Err(e) = scan_directory_iterative_chan(&handle_clone, tx_clone, drive_path, &mut files_on_this_drive).await {
                    error!("Task error scanning drive {}: {}", drive_label, e);
                    let _ = handle_clone.emit("scan_log", format!("[{}] 扫描出错: {}", drive_label, e));
                } else {
                    let duration = drive_scan_start.elapsed();
                    info!("Task finished for drive {}. Found {} files in {:?}", drive_label, files_on_this_drive, duration);
                    let _ = handle_clone.emit("scan_log", format!("[{}] 扫描完成. 发现 {} 个文件 ({:.2?})", drive_label, files_on_this_drive, duration));
                    let _ = handle_clone.emit("scan_progress", ScanProgress {
                        current_drive: drive_label.clone(), drive_index: index + 1, total_drives,
                        message: "驱动器扫描完成".to_string(), files_found_on_drive: Some(files_on_this_drive), files_collected_so_far: None
                    });
                }
                files_on_this_drive
            });
            join_handles.push(join_handle);
        }

        drop(tx);

        info!("Coordinator waiting for scan results...");
        let mut collected_files = Vec::new();
        let collection_start_time = Instant::now();
        let mut last_progress_emit = Instant::now();

        while let Some(file_info) = rx.recv().await {
            collected_files.push(file_info);
            if last_progress_emit.elapsed() > Duration::from_millis(500) {
                debug!("Collected {} files so far...", collected_files.len());
                let _ = handle.emit("scan_progress", ScanProgress {
                    current_drive: "汇总中...".to_string(), drive_index: total_drives, total_drives,
                    message: "正在收集结果...".to_string(), files_found_on_drive: None,
                    files_collected_so_far: Some(collected_files.len()),
                });
                last_progress_emit = Instant::now();
            }
        }
        let collection_duration = collection_start_time.elapsed();
        info!("Result collection finished in {:?}. Received {} files total.", collection_duration, collected_files.len());
        let _ = handle.emit("scan_log", format!("结果收集完成 ({:.2?}). 总共 {} 个文件.", collection_duration, collected_files.len()));
        let _ = handle.emit("scan_progress", ScanProgress {
            current_drive: "完成".to_string(), drive_index: total_drives, total_drives,
            message: "结果收集完成".to_string(), files_found_on_drive: None, files_collected_so_far: Some(collected_files.len())
        });

        {
            let write_start_time = Instant::now();
            info!("Updating shared file list...");
            let mut files_guard = match files_arc.lock() {
                Ok(guard) => guard,
                Err(poisoned) => {
                    error!("Lock poisoned (write): {}", poisoned);
                    poisoned.into_inner()
                }
            };
            files_guard.extend(collected_files);
            files_guard.shrink_to_fit();
            let write_duration = write_start_time.elapsed();
            info!("Shared file list updated in {:?}. Final count: {}", write_duration, files_guard.len());
            let _ = handle.emit("scan_log", format!("共享列表更新完毕 ({:.2?}). 最终文件数: {}", write_duration, files_guard.len()));
        }

        let total_scan_duration = scan_start_time.elapsed();
        info!("Background scan coordination finished in {:?}.", total_scan_duration);
        let _ = handle.emit("scan_log", format!("所有扫描任务协调完毕 ({:.2?})", total_scan_duration));
        let _ = handle.emit("scan_status", "idle");
    });

    Ok(())
}

async fn scan_directory_iterative_chan(
    handle: &AppHandle,
    tx: mpsc::Sender<FileMetadata>,
    start_path: PathBuf,
    file_count: &mut usize,
) -> Result<(), Box<dyn Error + Send + Sync>> {
    let mut dirs_to_visit: VecDeque<PathBuf> = VecDeque::new();
    dirs_to_visit.push_back(start_path);

    while let Some(current_dir_path) = dirs_to_visit.pop_front() {
        if !current_dir_path.is_dir() { continue; }
        trace!("Processing directory: {}", current_dir_path.display());

        let mut entries = match tokio::fs::read_dir(&current_dir_path).await {
            Ok(entries) => entries,
            Err(e) => {
                if e.kind() == std::io::ErrorKind::PermissionDenied || e.kind() == std::io::ErrorKind::NotFound {
                    trace!("Skipping inaccessible directory: {} ({})", current_dir_path.display(), e.kind());
                } else {
                    warn!("Could not read directory: {} ({})", current_dir_path.display(), e);
                    let _ = handle.emit("scan_log", format!("警告 [{}]: 无法读取 {}", current_dir_path.display(), e));
                }
                continue;
            }
        };

        while let Some(entry_res) = entries.next_entry().await.transpose() {
            let entry = match entry_res { Ok(e) => e, Err(e) => { error!("Error reading dir entry in {}: {}", current_dir_path.display(), e); continue; } };
            let current_path = entry.path();
            let metadata = entry.metadata().await.ok();

            if let Some(meta) = metadata {
                if meta.is_file() {
                    if let Some(name_osstr) = current_path.file_name() {
                        let name = name_osstr.to_string_lossy().to_string();
                        if let Ok(modified_sys_time) = meta.modified() {
                            let modified_time = chrono::DateTime::from(modified_sys_time);
                            let file_info = FileMetadata {
                                path: current_path.to_string_lossy().to_string(),
                                name,
                                size: meta.len(),
                                modified_time,
                            };
                            if tx.send(file_info).await.is_err() {
                                error!("Channel closed while sending file info from {}", current_dir_path.display());
                                return Err("Channel closed".into());
                            }
                            *file_count += 1;
                        }
                    }
                } else if meta.is_dir() {
                    let dir_name = current_path.file_name().unwrap_or_default();
                    let dir_name_str = dir_name.to_string_lossy();

                    #[cfg(windows)]
                    let is_hidden = meta.file_attributes() & 0x2 != 0 || dir_name_str.starts_with('.');
                    #[cfg(not(windows))]
                    let is_hidden = dir_name_str.starts_with('.');

                    let skip_dirs = [
                        "Windows", "Program Files", "Program Files (x86)", "$Recycle.Bin",
                        "System Volume Information", "Recovery", "Config.Msi", "swapfile",
                        "AppData", "Application Data", "Local Settings", "Library", "/.", "/dev", "/proc", "/sys",
                        "node_modules", "target", "vendor", "venv", ".git", ".hg", ".svn",
                        "__pycache__", ".pyc", ".pyo", ".class", ".jar", ".gradle", ".m2",
                        ".cache", "cache", "Cache", "Temp", "tmp", "Downloads",
                        ".vscode", ".vscode-server", ".idea", "Pods", ".npm", ".cargo", ".rustup",
                        ".vdi", ".vmdk", ".pvm"
                    ];
                    let is_skipped = skip_dirs.iter().any(|&skip| dir_name_str.contains(skip) || dir_name_str.eq_ignore_ascii_case(skip));

                    if is_hidden || is_skipped {
                        trace!("Skipping directory: {}", current_path.display());
                        continue;
                    }
                    dirs_to_visit.push_back(current_path);
                }
            }
        }
    }

    Ok(())
}

#[cfg(windows)]
use std::os::windows::fs::MetadataExt;

fn get_available_drives() -> Result<Vec<String>, Box<dyn Error + Send + Sync>> {
    let mut drives = Vec::new();
    #[cfg(target_os = "windows")]
    {
        for letter_byte in b'A'..=b'Z' {
            let letter = letter_byte as char;
            let drive_path_str = format!("{}:\\", letter);
            let path = Path::new(&drive_path_str);
            match std::fs::metadata(path) {
                Ok(meta) => {
                    if meta.is_dir() {
                        drives.push(drive_path_str);
                    }
                },
                Err(_) => { /* Drive letter likely not valid or inaccessible */ }
            }
        }
    }
    #[cfg(not(target_os = "windows"))]
    {
        drives.push("/".to_string());
    }
    if drives.is_empty() {
        Err("No drives found or accessible.".into())
    } else {
        Ok(drives)
    }
}

#[tauri::command]
async fn basic_search(query: String, state: State<'_, AppState>) -> Result<Vec<SearchResult>, String> {
    let search_start = Instant::now();
    let files_arc = state.files.clone();
    let query_lower = query.to_lowercase();

    let files_guard = match files_arc.lock() {
        Ok(guard) => guard,
        Err(poisoned) => {
            error!("Basic Search: Mutex poisoned: {}", poisoned);
            return Err("Failed to access file list".to_string());
        }
    };

    let results: Vec<SearchResult> = files_guard
        .iter()
        .filter(|file| {
            file.name.to_lowercase().contains(&query_lower) ||
            file.path.to_lowercase().contains(&query_lower)
        })
        .take(500)
        .map(|file| {
            SearchResult {
                file_path: file.path.clone(),
                name: file.name.clone(),
                size: file.size,
                modified_time: file.modified_time,
                line_number: None,
                content: None,
                matches: None,
            }
        })
        .collect();

    let search_duration = search_start.elapsed();
    trace!("Basic search for '{}' completed in {:?}, found {} results (limited)", query, search_duration, results.len());

    Ok(results)
}

#[tauri::command]
async fn advanced_search(
    query: String,
    filters: AdvancedFilterOptions,
    state: State<'_, AppState>
) -> Result<Vec<SearchResult>, String> {
    let search_start = Instant::now();
    let files_arc = state.files.clone();
    let query_lower = query.to_lowercase();

    debug!("Advanced search started for query: '{}', filters: {:?}", query, filters);

    let files_guard = match files_arc.lock() { Ok(guard) => guard, Err(p) => return Err(format!("Mutex poisoned: {}", p)) };

    let results: Vec<SearchResult> = files_guard
        .iter()
        .filter(|file| {
            query_lower.is_empty() ||
            file.name.to_lowercase().contains(&query_lower) ||
            file.path.to_lowercase().contains(&query_lower)
        })
        .filter(|file| {
            if let Some(ref ext_filter) = filters.file_type {
                if !ext_filter.is_empty() {
                    if let Some(file_ext) = Path::new(&file.path).extension().and_then(|os| os.to_str()) {
                        if !file_ext.eq_ignore_ascii_case(ext_filter) {
                            return false;
                        }
                    } else {
                        return false;
                    }
                }
            }

            if let Some(min_size) = filters.min_size {
                if file.size < min_size {
                    return false;
                }
            }

            if let Some(max_size) = filters.max_size {
                 if file.size > max_size {
                     return false;
                 }
            }

            true
        })
        .take(500)
        .map(|file| SearchResult {
             file_path: file.path.clone(),
             name: file.name.clone(),
             size: file.size,
             modified_time: file.modified_time,
             line_number: None, content: None, matches: None,
         })
        .collect();

    let search_duration = search_start.elapsed();
    debug!("Advanced search completed in {:?}, found {} results (limited)", search_duration, results.len());

    Ok(results)
}

#[tauri::command]
async fn preview_file(state: State<'_, AppState>, path: String) -> Result<String, String> {
    warn!("Preview file not fully implemented yet.");
    Ok(format!("Preview for {} not available.", path))
}

#[tauri::command]
async fn highlight_content(state: State<'_, AppState>, content: String, query: String) -> Result<String, String> {
    warn!("Highlight content not fully implemented yet.");
    Ok(content)
}

fn main() {
    env_logger::Builder::from_env(env_logger::Env::default().default_filter_or("info"))
        .init();

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(AppState {
            files: Arc::new(Mutex::new(Vec::with_capacity(1_000_000))),
            file_preview: Arc::new(FilePreview::new()),
        })
        .invoke_handler(tauri::generate_handler![
            preview_file,
            highlight_content,
            basic_search,
            advanced_search,
            scan_directory,
        ])
        .setup(|app| {
            let main_window = app.get_webview_window("main").ok_or("Main window not found")?;
            #[cfg(debug_assertions)]
            main_window.open_devtools();
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
} 