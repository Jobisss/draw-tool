use std::fs::File;
use std::io::Read;
use std::path::Path;
use std::time::UNIX_EPOCH;

use serde::Serialize;
use sha1::{Digest, Sha1};
use walkdir::WalkDir;

const HASH_CHUNK: usize = 256 * 1024; // 256 KB — hash parcial p/ detecção de alteração

const SUPPORTED_EXT: &[&str] = &[
    "png", "jpg", "jpeg", "webp", "bmp", // raster
    "psd", "clip", "procreate", "kra", // app
    "pdf", // doc
    "md",  // nota
];

#[derive(Serialize)]
pub struct StudyEntry {
    pub path: String,
    pub filename: String,
    pub format: String,
    pub hash: String,
    pub mtime: f64,
    pub size_bytes: i64,
}

/// sha1 de (tamanho + primeiros 256KB). Barato e suficiente p/ detectar alteração.
fn partial_hash(path: &Path, size: u64) -> std::io::Result<String> {
    let mut hasher = Sha1::new();
    hasher.update(size.to_string().as_bytes());
    let mut f = File::open(path)?;
    let mut buf = vec![0u8; HASH_CHUNK];
    let n = f.read(&mut buf)?;
    hasher.update(&buf[..n]);
    Ok(hex::encode(hasher.finalize()))
}

/// Varre o vault (read-only) e devolve as entradas suportadas com metadados + hash parcial.
/// O upsert/diff em `study` é feito no frontend via tauri-plugin-sql.
#[tauri::command]
pub fn scan_vault(vault_path: String) -> Result<Vec<StudyEntry>, String> {
    let vault = Path::new(&vault_path);
    if !vault.is_dir() {
        return Err(format!("vault inválido ou inexistente: {}", vault_path));
    }

    let mut entries = Vec::new();

    for dent in WalkDir::new(vault).into_iter().filter_map(|e| e.ok()) {
        if !dent.file_type().is_file() {
            continue;
        }
        let path = dent.path();
        let ext = match path.extension().and_then(|e| e.to_str()) {
            Some(e) => e.to_lowercase(),
            None => continue,
        };
        if !SUPPORTED_EXT.contains(&ext.as_str()) {
            continue;
        }

        let meta = match dent.metadata() {
            Ok(m) => m,
            Err(_) => continue,
        };
        let size = meta.len();
        let mtime = meta
            .modified()
            .ok()
            .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
            .map(|d| d.as_secs_f64())
            .unwrap_or(0.0);

        let hash = match partial_hash(path, size) {
            Ok(h) => h,
            Err(_) => continue, // arquivo ilegível → ignora
        };

        let filename = path
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("")
            .to_string();

        entries.push(StudyEntry {
            path: path.to_string_lossy().to_string(),
            filename,
            format: ext,
            hash,
            mtime,
            size_bytes: size as i64,
        });
    }

    Ok(entries)
}
