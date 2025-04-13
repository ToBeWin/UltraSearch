use std::{
    fs::File,
    path::Path,
};
use anyhow::Result;
use memmap2::Mmap;
use rayon::iter::{IntoParallelRefIterator, ParallelIterator};
use regex::Regex;

#[derive(Debug)]
pub struct ContentSearcher {
    pattern: Option<Regex>,
}

impl ContentSearcher {
    pub fn new() -> Self {
        ContentSearcher { pattern: None }
    }

    pub fn search_files<'a>(&self, paths: &[&'a Path], query: &str) -> Result<Vec<&'a Path>, String> {
        Ok(paths
            .par_iter()
            .filter(|&&path| {
                if let Ok(file) = File::open(path) {
                    if let Ok(mmap) = unsafe { Mmap::map(&file) } {
                        if let Ok(content) = std::str::from_utf8(&mmap) {
                            if let Some(pattern) = &self.pattern {
                                pattern.is_match(content)
                            } else {
                                content.contains(query)
                            }
                        } else {
                            false
                        }
                    } else {
                        false
                    }
                } else {
                    false
                }
            })
            .copied()
            .collect())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs::File;
    use std::io::Write;
    use tempfile::tempdir;

    #[test]
    fn test_content_search() {
        let temp_dir = tempdir().unwrap();
        let file_path = temp_dir.path().join("test.txt");
        
        let mut file = File::create(&file_path).unwrap();
        file.write_all(b"Hello, world! This is a test file.").unwrap();
        
        let searcher = ContentSearcher::new();
        assert!(searcher.search_files(&[&file_path], "test").unwrap().contains(&file_path));
        assert!(!searcher.search_files(&[&file_path], "nonexistent").unwrap().contains(&file_path));
    }
} 