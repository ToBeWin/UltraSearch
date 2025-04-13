use std::{
    fs::File,
    path::Path,
};
use anyhow::Result;
use memmap2::Mmap;
use regex::Regex;

#[derive(Debug)]
pub struct FilePreview {
    pattern: Option<Regex>,
}

impl FilePreview {
    pub fn new() -> Self {
        FilePreview { pattern: None }
    }

    pub fn preview_file(&self, path: &Path) -> Result<String, String> {
        if let Ok(file) = File::open(path) {
            if let Ok(mmap) = unsafe { Mmap::map(&file) } {
                if let Ok(content) = std::str::from_utf8(&mmap) {
                    Ok(content.to_string())
                } else {
                    Err("Failed to read file content".to_string())
                }
            } else {
                Err("Failed to memory map file".to_string())
            }
        } else {
            Err("Failed to open file".to_string())
        }
    }

    pub fn highlight_content(&self, content: &str, query: &str) -> String {
        if let Some(pattern) = &self.pattern {
            pattern.replace_all(content, |caps: &regex::Captures| {
                format!("<mark>{}</mark>", caps.get(0).unwrap().as_str())
            }).to_string()
        } else {
            content.replace(query, &format!("<mark>{}</mark>", query))
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs::File;
    use std::io::Write;
    use tempfile::tempdir;

    #[test]
    fn test_file_preview() {
        let temp_dir = tempdir().unwrap();
        let file_path = temp_dir.path().join("test.txt");
        
        let mut file = File::create(&file_path).unwrap();
        file.write_all(b"Hello, world! This is a test file.").unwrap();
        
        let previewer = FilePreview::new();
        let preview = previewer.preview_file(&file_path).unwrap();
        assert!(preview.contains("Hello, world!"));
    }

    #[test]
    fn test_content_highlighting() {
        let previewer = FilePreview::new();
        let content = "Hello, world! This is a test.";
        let highlighted = previewer.highlight_content(content, "test");
        assert!(highlighted.contains("<mark>test</mark>"));
    }
} 