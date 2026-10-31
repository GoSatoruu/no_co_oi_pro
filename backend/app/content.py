"""Nạp và gộp content/ cho /api/content (docs/05 §1)."""
from __future__ import annotations

import contextlib
import hashlib
import importlib.util
import io
import json
import logging
from pathlib import Path

log = logging.getLogger("nocooi.content")

# khoá response  <-  file trong content/
SINGLE_FILES = {
    "accounts": "accounts.json",
    "rules": "rules.json",
    "modes": "modes.json",
    "levels": "levels.json",
    "defects": "defects.json",
    "pools": "pools.json",
    "legalRefs": "legal_refs.json",
    "audit": "audit.json",
    "i18n": "i18n/vi.json",
}


def _read(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def load_bundle(content_dir: Path) -> dict:
    bundle: dict = {}
    for key, rel in SINGLE_FILES.items():
        bundle[key] = _read(content_dir / rel)
    templates: list = []
    for f in sorted((content_dir / "doc_templates").glob("*.json")):
        templates.extend(_read(f).get("templates", []))
    bundle["templates"] = templates
    # Băm bản chuẩn hoá để cùng nội dung luôn ra cùng ETag, không phụ thuộc khoảng trắng file.
    canon = json.dumps(bundle, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
    bundle["hash"] = hashlib.sha1(canon.encode("utf-8")).hexdigest()
    return bundle


def run_validator(content_dir: Path) -> bool:
    """Chạy tools/validate_content.py: cùng bộ luật với lệnh kiểm của người phát triển."""
    script = content_dir.parent / "tools" / "validate_content.py"
    if not script.is_file():
        log.warning("Không thấy %s, bỏ qua kiểm content", script)
        return True
    spec = importlib.util.spec_from_file_location("nocooi_validate_content", script)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    buf = io.StringIO()
    with contextlib.redirect_stdout(buf):
        code = mod.main()
    if code:
        log.error("Content không qua validator:\n%s", buf.getvalue())
    return not code
