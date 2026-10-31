# backend/

API Python (FastAPI + sqlite3). Hợp đồng: `docs/05_API_CONTRACT.md`.

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload        # http://127.0.0.1:8000  (docs tự sinh ở /docs)
python -m pytest -q
```

Cấu hình qua biến môi trường hoặc `backend/.env` (không commit): `NOCOOI_DB_PATH` (mặc định `backend/data/nocooi.db`),
`NOCOOI_CONTENT_DIR`, `NOCOOI_FRONTEND_DIR`, `NOCOOI_RUN_TTL_MINUTES` (15), `NOCOOI_RATE_LIMIT_PER_HOUR` (30),
`NOCOOI_VALIDATE_CONTENT` (`0` để tắt kiểm content lúc khởi động).

```
backend/
├─ requirements.txt
├─ app/
│  ├─ main.py        # create_app(): gắn routes, phục vụ /frontend và /content tĩnh
│  ├─ config.py      # Settings từ môi trường / .env
│  ├─ db.py          # sqlite3 + chạy migrations/ (bảng schema_migrations)
│  ├─ content.py     # gộp ../content cho /api/content, chạy tools/validate_content.py lúc khởi động
│  ├─ errors.py      # lỗi theo docs/05 §5
│  ├─ deps.py        # cấu hình, content, kết nối DB, IP cho route
│  ├─ timeutil.py    # giờ Việt Nam UTC+7
│  ├─ routes/        # system.py, runs.py, leaderboard.py
│  ├─ services/      # runs.py, scores.py, ratelimit.py
│  ├─ engine/        # rng.py, expr.py, money_words.py (song sinh frontend/js/core, ADR-004); còn thiếu: rules, ledger, grader, defects, generator
│  └─ migrations/    # 001_init.sql
└─ tests/            # pytest: golden JS↔Python, system, runs, leaderboard
```

Chưa làm: chấm lại ván Pro (`services/runs.py: submit_run` trả 501) cho tới khi có `engine/generator` (PY-003).
