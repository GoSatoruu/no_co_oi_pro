"""Giờ Việt Nam cố định UTC+7 (không có giờ mùa hè, nên không cần tzdata trên Windows).

Mọi mốc thời gian lưu cùng múi giờ nên so sánh chuỗi ISO cũng đúng thứ tự thời gian.
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone

VN = timezone(timedelta(hours=7))


def now_vn() -> datetime:
    return datetime.now(VN)


def iso(dt: datetime) -> str:
    return dt.astimezone(VN).isoformat(timespec="seconds")


def start_of_day(dt: datetime) -> datetime:
    return dt.astimezone(VN).replace(hour=0, minute=0, second=0, microsecond=0)


def start_of_week(dt: datetime) -> datetime:
    """Thứ Hai 00:00 của tuần chứa dt."""
    day = start_of_day(dt)
    return day - timedelta(days=day.weekday())
