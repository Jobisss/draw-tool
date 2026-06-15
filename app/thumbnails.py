"""Geração de thumbnails por formato. Cache isolado em data/thumbs/ (RNF05/RNF08).

Read-only sobre o vault (RNF04): só lê os originais, escreve apenas no cache.
Degradação graciosa (RNF09): formato sem suporte → retorna None (UI mostra placeholder).
"""
from __future__ import annotations

import io
import zipfile
from pathlib import Path

from . import config

THUMB_SIZE = (480, 480)


def thumb_file(file_hash: str) -> Path:
    """Caminho do thumbnail em cache p/ um hash de conteúdo."""
    return config.THUMBS_DIR / f"{file_hash}.webp"


def generate(src: Path, file_hash: str) -> str | None:
    """Gera (se faltar) o thumbnail e retorna caminho do cache, ou None se não suportado.

    Nunca levanta — qualquer falha vira None (placeholder na UI).
    """
    config.ensure_dirs()
    out = thumb_file(file_hash)
    if out.exists():
        return str(out)

    ext = src.suffix.lower()
    try:
        img = _render(src, ext)
        if img is None:
            return None
        _save(img, out)
        return str(out)
    except Exception:
        return None


# --- dispatch por formato ---

def _render(src: Path, ext: str):
    if ext in config.RASTER_EXT:
        return _from_raster(src)
    if ext == ".pdf":
        return _from_pdf(src)
    if ext == ".psd":
        return _from_psd(src)
    if ext == ".procreate":
        return _from_zip(src, ("QuickLook/Thumbnail.png",))
    if ext == ".kra":
        return _from_zip(src, ("mergedimage.png", "preview.png"))
    # .clip e .md → sem thumbnail
    return None


def _from_raster(src: Path):
    from PIL import Image

    img = Image.open(src)
    img.draft("RGB", THUMB_SIZE)  # decode acelerado p/ JPEG grande
    return img.convert("RGB")


def _from_pdf(src: Path):
    import fitz  # PyMuPDF
    from PIL import Image

    doc = fitz.open(src)
    page = doc.load_page(0)
    pix = page.get_pixmap(matrix=fitz.Matrix(1.5, 1.5))
    img = Image.frombytes("RGB", (pix.width, pix.height), pix.samples)
    doc.close()
    return img


def _from_psd(src: Path):
    from psd_tools import PSDImage

    psd = PSDImage.open(src)
    img = psd.composite()
    return img.convert("RGB") if img else None


def _from_zip(src: Path, candidates: tuple[str, ...]):
    """Extrai thumbnail embutido de container ZIP (.procreate, .kra)."""
    from PIL import Image

    with zipfile.ZipFile(src) as zf:
        names = set(zf.namelist())
        for cand in candidates:
            if cand in names:
                data = zf.read(cand)
                return Image.open(io.BytesIO(data)).convert("RGB")
        # fallback: qualquer png/jpg dentro do container
        for n in zf.namelist():
            if n.lower().endswith((".png", ".jpg", ".jpeg")):
                return Image.open(io.BytesIO(zf.read(n))).convert("RGB")
    return None


def _save(img, out: Path) -> None:
    img.thumbnail(THUMB_SIZE)
    img.save(out, "WEBP", quality=80)
