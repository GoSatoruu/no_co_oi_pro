# Nợ Có Ơi Pro

> Bản **dùng riêng**, không phát hành công khai (xem `ai/DECISIONS.md` ADR-010).

Game web mô phỏng nghề kế toán Việt Nam: **soi chứng từ → định khoản Nợ/Có → kiểm quỹ → khoá sổ**.
Có hai chế độ **Thường** và **Pro**, nội dung mở rộng bằng dữ liệu JSON.
Lấy cảm hứng về cơ chế từ "Nợ Có Ơi" (JoyUp); toàn bộ code, hình, chữ và nhân vật là tự làm; chỉ tên game dựa theo bản gốc.

- Frontend: HTML + CSS + JavaScript thuần (ES modules, không build)
- Backend: Python, FastAPI + SQLite (bảng xếp hạng, chấm lại ván Pro)

## Chạy thử

```bash
# chỉ frontend (chơi offline): chạy ở thư mục gốc rồi mở http://127.0.0.1:5500/frontend/
python -m http.server 5500

# đầy đủ (khi đã có backend, từ mốc M3)
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload
```

## Kiểm tra

```bash
python tools/validate_content.py      # nội dung
node --test tests/js/                 # lõi JS
cd backend && python -m pytest -q     # Python
```

## Bản đồ thư mục

| Thư mục | Nội dung |
|---|---|
| `AGENTS.md` | **Luật chung cho mọi AI**: đọc trước tiên |
| `ai/` | Bảng việc, bàn giao, quyết định, vai trò, prompt, mẫu |
| `docs/` | 00 RE notes, 01 GDD, 02 kiến trúc, 03 quy ước, 04 content spec, 05 API, 06 lộ trình, 07 luật kế toán, **08 hệ thống thiết kế**, **09 Pro: CTCP và tập đoàn**, **10 Pro: kiểm toán Big Four** |
| `content/` | Dữ liệu game: tài khoản, luật, chế độ, cấp, lỗi, mẫu chứng từ |
| `frontend/` | Trò chơi chạy trên trình duyệt |
| `backend/` | API Python |
| `tests/` | Test JS, test chung (golden) JS↔Python |
| `tools/` | Công cụ dòng lệnh (kiểm nội dung…) |

## Làm việc với nhiều AI

1. Mở `ai/TASKS.md`, chọn việc `todo` có đủ phụ thuộc.
2. Lấy `ai/prompts/_START_HERE.md`, điền mã việc và vai, rồi dán vào AI (Claude, ChatGPT/Codex, Gemini, Cursor…).
3. AI tự nhận việc, làm, kiểm và ghi bàn giao vào `ai/HANDOFF.md`.
4. Giao việc ở trạng thái `review` cho **một AI khác** duyệt bằng `ai/prompts/qa_review.md`.

Tiến độ: xem `docs/06_ROADMAP.md`.
