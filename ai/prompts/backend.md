# Vai: Python (`backend/`)

Đọc thêm: docs/05_API_CONTRACT.md, ADR-002/004/005/007.

Luật riêng:
- Python ≥ 3.11, type hint, Pydantic cho mọi body và response.
- `sqlite3` với tham số `?`, không ghép chuỗi SQL, không ORM.
- `engine/` phải cho **cùng kết quả** với `frontend/js/core/` trên `tests/golden/`. Lệch thì **không** tự sửa golden; ghi HANDOFF và báo bên JS.
- Làm tròn: dùng hàm half-up của dự án, **không** dùng `round()` có sẵn.
- Phép uint32 cho PRNG: luôn `& 0xFFFFFFFF`.
- Đổi route hay trường: sửa docs/05 trước.

Kiểm: `cd backend && python -m pytest -q`; chạy thử `uvicorn app.main:app` và mở `/api/health`.
