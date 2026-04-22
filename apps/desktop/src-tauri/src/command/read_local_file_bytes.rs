use std::path::PathBuf;

#[derive(Debug, thiserror::Error)]
pub enum ReadLocalFileBytesError {
    #[error("Only PDF files are supported")]
    UnsupportedFile,
    #[error("Failed to read file: {0}")]
    Io(#[from] std::io::Error),
}

impl serde::Serialize for ReadLocalFileBytesError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}

#[tauri::command]
pub async fn read_local_file_bytes(path: String) -> Result<Vec<u8>, ReadLocalFileBytesError> {
    let path = PathBuf::from(path);

    let is_pdf = path
        .extension()
        .and_then(|ext| ext.to_str())
        .map(|ext| ext.eq_ignore_ascii_case("pdf"))
        .unwrap_or(false);

    if !is_pdf {
        return Err(ReadLocalFileBytesError::UnsupportedFile);
    }

    Ok(std::fs::read(path)?)
}
