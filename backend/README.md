# backend/

Chưa có code (bắt đầu ở PY-004). Hợp đồng: `docs/05_API_CONTRACT.md`.

```
backend/
├─ requirements.txt
├─ app/
│  ├─ main.py        # tạo FastAPI app, gắn routes, phục vụ ../frontend tĩnh
│  ├─ config.py      # đọc biến môi trường (.env)
│  ├─ db.py          # sqlite3 + chạy migrations/
│  ├─ content.py     # nạp + kiểm ../content (dùng lại logic của tools/validate_content.py)
│  ├─ routes/        # system.py, runs.py, leaderboard.py
│  ├─ services/      # nghiệp vụ của route
│  ├─ engine/        # bản Python của frontend/js/core (song sinh, ADR-004)
│  └─ migrations/    # 001_init.sql, …
└─ tests/            # pytest
```
