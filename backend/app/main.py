"""FastAPI app: API /api/*, phục vụ frontend/ và content/ tĩnh cùng đường dẫn tương đối
như `python -m http.server` ở thư mục gốc (xem frontend/README.md)."""
from __future__ import annotations

import logging

from fastapi import FastAPI, Request
from fastapi.responses import RedirectResponse
from fastapi.staticfiles import StaticFiles

from . import content as content_mod
from . import db, errors
from .config import API_VERSION, APP_VERSION, Settings, load_settings
from .routes import leaderboard, runs, system

log = logging.getLogger("nocooi")


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or load_settings()
    if settings.validate_content and not content_mod.run_validator(settings.content_dir):
        # Vẫn chạy để người phát triển thấy lỗi trong log, nhưng nói rõ ràng thay vì im lặng.
        log.error("Khởi động với content chưa hợp lệ. Chạy: python tools/validate_content.py")

    db.migrate(settings.db_path)

    app = FastAPI(title="Nợ Có Ơi Pro API", version=APP_VERSION)
    app.state.settings = settings
    app.state.bundle = content_mod.load_bundle(settings.content_dir)
    errors.install(app)

    @app.middleware("http")
    async def version_header(request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Api-Version"] = API_VERSION
        return response

    app.include_router(system.router)
    app.include_router(runs.router)
    app.include_router(leaderboard.router)

    @app.get("/", include_in_schema=False)
    def root():
        return RedirectResponse("/frontend/")

    # Cùng đường dẫn tương đối với chế độ offline: /frontend/ và /content/ (docs/05 §1).
    if settings.frontend_dir.is_dir():
        app.mount("/frontend", StaticFiles(directory=settings.frontend_dir, html=True), name="frontend")
    app.mount("/content", StaticFiles(directory=settings.content_dir), name="content")
    return app


app = create_app()
