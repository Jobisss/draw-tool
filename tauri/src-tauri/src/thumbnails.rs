use std::fs::{self, File};
use std::io::Read;
use std::path::Path;

use image::DynamicImage;
use psd::Psd;
use tauri::Manager;
use zip::ZipArchive;

const THUMB_MAX: u32 = 400;

/// Lê uma entrada de imagem de dentro de um zip (procreate/kra) e decodifica.
fn zip_entry_image(path: &Path, names: &[&str]) -> Option<DynamicImage> {
    let f = File::open(path).ok()?;
    let mut zip = ZipArchive::new(f).ok()?;
    for n in names {
        if let Ok(mut entry) = zip.by_name(n) {
            let mut buf = Vec::new();
            if entry.read_to_end(&mut buf).is_ok() {
                if let Ok(img) = image::load_from_memory(&buf) {
                    return Some(img);
                }
            }
        }
    }
    None
}

/// Decodifica preview de um .psd (PSD comum; PSB/efeitos podem falhar → None).
fn psd_image(path: &Path) -> Option<DynamicImage> {
    let bytes = fs::read(path).ok()?;
    let psd = Psd::from_bytes(&bytes).ok()?;
    let buf = image::RgbaImage::from_raw(psd.width(), psd.height(), psd.rgba())?;
    Some(DynamicImage::ImageRgba8(buf))
}

/// Gera (ou reusa do cache) o thumbnail PNG de um estudo em appDataDir/thumbs/<hash>.png.
/// Retorna o caminho do thumb, ou None se o formato não tem preview (clip/md/pdf → placeholder).
#[tauri::command]
pub fn generate_thumbnail(
    app: tauri::AppHandle,
    study_path: String,
    format: String,
    hash: String,
) -> Result<Option<String>, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?
        .join("thumbs");
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;

    let out = dir.join(format!("{}.png", hash));
    if out.exists() {
        return Ok(Some(out.to_string_lossy().to_string()));
    }

    let src = Path::new(&study_path);
    let img: Option<DynamicImage> = match format.as_str() {
        "png" | "jpg" | "jpeg" | "webp" | "bmp" => image::open(src).ok(),
        "procreate" => zip_entry_image(src, &["QuickLook/Thumbnail.png"]),
        "kra" => zip_entry_image(src, &["mergedimage.png", "preview.png"]),
        "psd" => psd_image(src),
        _ => None, // clip, md, pdf → placeholder na UI
    };

    match img {
        Some(i) => {
            let thumb = i.thumbnail(THUMB_MAX, THUMB_MAX);
            thumb.save(&out).map_err(|e| e.to_string())?;
            Ok(Some(out.to_string_lossy().to_string()))
        }
        None => Ok(None),
    }
}
