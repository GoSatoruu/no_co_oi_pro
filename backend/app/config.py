"""Cấu hình đọc từ biến môi trường, và từ .env ở thư mục backend/ nếu có (không commit .env)."""
from __future__ import annotations

import os
from dataclasses import dataclass, replace
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent
ROOT = BACKEND_DIR.parent
API_VERSION = "1"
APP_VERSION = "0.1.0"


def _read_dotenv(path: Path) -> dict[str, str]:
    out: dict[str, str] = {}
    if not path.is_file():
        return out
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, val = line.partition("=")
        out[key.strip()] = val.strip().strip('"').strip("'")
    return out


@dataclass(frozen=True)
class Settings:
    content_dir: Path
    frontend_dir: Path
    db_path: Path
    run_ttl_minutes: int = 15
    rate_limit_per_hour: int = 30  # docs/05 §5: mỗi IP 30 ván / giờ
    validate_content: bool = True


def load_settings(**overrides) -> Settings:
    env = {**_read_dotenv(BACKEND_DIR / ".env"), **os.environ}
    base = Settings(
        content_dir=Path(env.get("NOCOOI_CONTENT_DIR", ROOT / "content")),
        frontend_dir=Path(env.get("NOCOOI_FRONTEND_DIR", ROOT / "frontend")),
        db_path=Path(env.get("NOCOOI_DB_PATH", BACKEND_DIR / "data" / "nocooi.db")),
        run_ttl_minutes=int(env.get("NOCOOI_RUN_TTL_MINUTES", 15)),
        rate_limit_per_hour=int(env.get("NOCOOI_RATE_LIMIT_PER_HOUR", 30)),
        validate_content=env.get("NOCOOI_VALIDATE_CONTENT", "1") != "0",
    )
    return replace(base, **overrides)
