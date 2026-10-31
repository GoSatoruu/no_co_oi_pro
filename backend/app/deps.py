"""Phụ thuộc dùng chung cho route: cấu hình, content, kết nối DB, IP người gọi."""
from __future__ import annotations

import sqlite3
from typing import Iterator

from fastapi import Request

from . import db
from .config import Settings


def get_settings(request: Request) -> Settings:
    return request.app.state.settings


def get_bundle(request: Request) -> dict:
    return request.app.state.bundle


def get_conn(request: Request) -> Iterator[sqlite3.Connection]:
    conn = db.connect(request.app.state.settings.db_path)
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def client_ip(request: Request) -> str:
    # Bản dùng riêng, không đứng sau proxy tin cậy nên chỉ lấy địa chỉ kết nối trực tiếp.
    return request.client.host if request.client else ""
