use std::path::PathBuf;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct FileMetadata {
    pub path: PathBuf,
    pub name: String,
    pub extension: Option<String>,
    pub size: u64,
    pub modified_time: DateTime<Utc>,
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs::File;
    use std::io::Write;
    use tempfile::tempdir;

    #[test]
    fn test_file_metadata() {
        let temp_dir = tempdir().unwrap();
        let file_path = temp_dir.path().join("test.txt");
        
        let mut file = File::create(&file_path).unwrap();
        file.write_all(b"Hello, world!").unwrap();
        
        let metadata = FileMetadata {
            path: file_path.clone(),
            name: "test.txt".to_string(),
            extension: Some("txt".to_string()),
            size: 13,
            modified_time: Utc::now(),
        };
        
        assert_eq!(metadata.name, "test.txt");
        assert_eq!(metadata.extension, Some("txt".to_string()));
        assert_eq!(metadata.size, 13);
    }
} 