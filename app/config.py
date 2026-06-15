"""Configuração de caminhos. Dados do app isolados do vault (RNF08)."""
from pathlib import Path

# raiz do projeto = pasta acima de app/
BASE_DIR = Path(__file__).resolve().parent.parent

# dados derivados do app (gitignored): DB + cache de thumbnails
DATA_DIR = BASE_DIR / "data"
DB_PATH = DATA_DIR / "db.sqlite"
THUMBS_DIR = DATA_DIR / "thumbs"

TEMPLATES_DIR = Path(__file__).resolve().parent / "templates"
STATIC_DIR = Path(__file__).resolve().parent / "static"

# servidor — localhost only (RNF01)
HOST = "127.0.0.1"
PORT = 8000

# formatos suportados no vault
RASTER_EXT = {".png", ".jpg", ".jpeg", ".webp", ".bmp"}
APP_EXT = {".psd", ".clip", ".procreate", ".kra"}
DOC_EXT = {".pdf"}
NOTE_EXT = {".md"}
SUPPORTED_EXT = RASTER_EXT | APP_EXT | DOC_EXT | NOTE_EXT


def ensure_dirs() -> None:
    """Cria as pastas de dados se faltarem. Nunca toca no vault."""
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    THUMBS_DIR.mkdir(parents=True, exist_ok=True)
