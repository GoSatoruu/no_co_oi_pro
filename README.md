# Nợ Có Ơi Pro

> Bản **dùng riêng**, không phát hành công khai (xem `ai/DECISIONS.md` ADR-010).

Game web mô phỏng nghề kế toán Việt Nam: **soi chứng từ → định khoản Nợ/Có → kiểm quỹ → khoá sổ**.
Có hai chế độ **Thường** và **Pro**, nội dung mở rộng bằng dữ liệu JSON.
Lấy cảm hứng về cơ chế từ "Nợ Có Ơi" (JoyUp); toàn bộ code, hình, chữ và nhân vật là tự làm; chỉ tên game dựa theo bản gốc.

- Frontend: HTML + CSS + JavaScript thuần (ES modules, không build)
- Backend: Python, FastAPI + SQLite (bảng xếp hạng, chấm lại ván Pro)

**Trạng thái:** M0 (nền móng) xong; backend (khung API, SQLite, bảng xếp hạng) đã chạy được, còn thiếu phần chấm lại ván Pro. Chưa có bản chơi được; bước tiếp theo là M1 (lõi JS) và FE-001 (khung giao diện). Xem `docs/06_ROADMAP.md`.

## Tính năng

> AI sửa bảng này **mỗi khi** một tính năng đổi trạng thái hoặc có tính năng mới (AGENTS.md §2, bước 4).
> Trạng thái: **Chơi được** · **Có dữ liệu, chưa code** · **Mới có thiết kế**.

| Tính năng | Chế độ | Trạng thái | Tài liệu |
|---|---|---|---|
| Ca làm: hàng chờ, soi chứng từ, định khoản Nợ/Có, ghi sổ | Thường, Pro | Có dữ liệu, chưa code | docs/01 §2.2 |
| 8 mẫu chứng từ cơ bản (bán hàng, mua hàng, chi phí, ngân hàng, giá vốn) | Thường, Pro | Có dữ liệu, chưa code | `content/doc_templates/` |
| 11 loại lỗi chứng từ, sai sót ẩn lộ khi kiểm quỹ và khoá sổ | Thường, Pro | Có dữ liệu, chưa code | `content/defects.json` |
| Kiểm quỹ cuối tuần, khoá sổ tháng | Thường, Pro | Mới có thiết kế | docs/01 §2.3–2.4 |
| Bảng pháp luật bên cạnh mỗi nhiệm vụ (22 trích dẫn, có nhãn mức đối chiếu) | Thường, Pro | Có dữ liệu, chưa code | docs/08 §6, `content/legal_refs.json` |
| Pro: gõ số hiệu tài khoản, bút toán nhiều dòng, không gợi ý | Pro | Mới có thiết kế | docs/01 §4.2 |
| Pro: công ty cổ phần (cổ phần, cổ tức, cổ phiếu quỹ, nghị quyết) | Pro | Có dữ liệu, chưa code | docs/09 |
| Pro: tập đoàn, công ty con, hợp nhất báo cáo tài chính | Pro | Mới có thiết kế | docs/09 §4–5 |
| Pro: kiểm toán độc lập do Big Four thực hiện | Pro | Có dữ liệu, chưa code | docs/10, `content/audit.json` |
| Máy chủ API: phục vụ game, `/api/health`, `/api/content` (có ETag), SQLite + migrations | — | Chạy được | docs/05 §1, §6 |
| Bảng xếp hạng và điểm Thường (`/api/leaderboard`, `/api/scores`, giới hạn 30 lần/giờ/IP; chưa có giao diện) | Thường, Pro | Chạy được | docs/05 §3 |
| Ván xếp hạng Pro: xin đề `/api/runs` (chưa có giao diện) | Pro | Chạy được | docs/05 §2 |
| Máy chủ chấm lại ván Pro (`/api/runs/{id}/submit`; hiện trả 501, chờ PY-003) | Pro | Mới có thiết kế | docs/05 §2 |
| Đọc số tiền thành chữ (`moneyToWords`, JS và Python cho cùng chuỗi; cách đọc nhóm 000 chờ OWN-003) | — | Chạy được | docs/07 §6, `tests/golden/money_words.json` |
| Kiểm tra nội dung tự động (`tools/validate_content.py`) | — | Chạy được | docs/04 |

## Chạy thử

```bash
# chỉ frontend (chơi offline): chạy ở thư mục gốc rồi mở http://127.0.0.1:5500/frontend/
python -m http.server 5500

# đầy đủ: backend phục vụ cả frontend và content, mở http://127.0.0.1:8000
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
| `docs/` | 00 RE notes, 01 GDD, 02 kiến trúc, 03 quy ước, 04 content spec, 05 API, 06 lộ trình, 07 luật kế toán, 08 hệ thống thiết kế, 09 Pro: CTCP và tập đoàn, 10 Pro: kiểm toán Big Four |
| `content/` | Dữ liệu game: tài khoản, luật, chế độ, cấp, lỗi, mẫu chứng từ, trích dẫn pháp luật, kiểm toán |
| `frontend/` | Trò chơi chạy trên trình duyệt |
| `backend/` | API Python |
| `tests/` | Test JS, test chung (golden) JS↔Python |
| `tools/` | Công cụ dòng lệnh (kiểm nội dung…) |

## Làm việc với nhiều AI

1. Mở `ai/TASKS.md`, chọn việc `todo` có đủ phụ thuộc.
2. Lấy `ai/prompts/_START_HERE.md`, điền mã việc và vai, rồi dán vào AI (Claude, ChatGPT/Codex, Gemini, Cursor…).
3. AI tự nhận việc, làm, kiểm, rồi **ghi rõ đã làm gì** vào `ai/HANDOFF.md` và cập nhật README này (bảng Tính năng và Nhật ký thay đổi).
4. Giao việc ở trạng thái `review` cho **một AI khác** duyệt bằng `ai/prompts/qa_review.md`.

## Nhật ký thay đổi

> Mới nhất ở trên. Mỗi mục: ngày, mã việc, người làm (mô hình AI hoặc chủ dự án), rồi các dòng **Thêm / Sửa / Xoá** nói bằng ngôn ngữ người chơi hoặc người phát triển hiểu được.
> Chi tiết kỹ thuật đầy đủ nằm ở `ai/HANDOFF.md`; README chỉ ghi điều người đọc repo cần biết.

<!-- CHANGELOG:START — thêm mục mới ngay dưới dòng này -->

### 2026-10-31 · CORE-003 · claude-opus-5.5
- **Thêm:** đọc số tiền thành chữ tiếng Việt ("Mười lăm triệu không trăm linh tám nghìn đồng"), sẽ dùng cho chứng từ và lỗi "số tiền bằng chữ không khớp"; bản JS và Python khớp nhau trên 21 ca golden.

### 2026-10-31 · PY-001/004/005/007/008 · claude-sonnet-5.5
- **Thêm:** máy chủ Python chạy được (`uvicorn app.main:app`): mở game tại `/`, cấp nội dung ở `/api/content` (có ETag), `/api/health`.
- **Thêm:** bảng xếp hạng và nộp điểm chế độ Thường (`/api/leaderboard`, `/api/scores`), xin đề ván Pro (`/api/runs`), giới hạn 30 lần/giờ/IP.
- **Thêm:** lõi ngẫu nhiên có seed và bộ đọc biểu thức bản Python, cho kết quả giống hệt bản JS trên bộ golden.
- **Chưa có:** chấm lại ván Pro phía server (`/submit` trả 501 cho tới khi xong PY-003).

### 2026-10-31 · DOC-001 · claude-opus-5.5
- **Sửa:** luật cho AI (AGENTS.md và các file trỏ cho Claude, Gemini, Copilot, Cursor) bắt buộc mỗi lần bàn giao phải ghi rõ đã làm gì theo mẫu (file nào, đổi gì, kiểm tra ra sao), và cập nhật README khi có tính năng mới hay thay đổi.
- **Thêm:** mục *Tính năng* và *Nhật ký thay đổi* trong README.

### 2026-10-31 · M0-PRO · claude-opus-5.5
- **Thêm:** hệ thống thiết kế (docs/08): bàn kế toán, giấy, mực bút bi, con dấu; Be Vietnam Pro + Source Serif 4.
- **Thêm:** bảng pháp luật bên cạnh mỗi nhiệm vụ (22 trích dẫn, có nhãn mức đối chiếu, không lộ đáp án).
- **Thêm:** Pro cấp 10–12: công ty cổ phần, tập đoàn, hợp nhất BCTC (docs/09); 5 mẫu chứng từ mới, 9 tài khoản mới.
- **Thêm:** Pro: kiểm toán độc lập, chỉ dùng Big Four (docs/10, `content/audit.json`).

### 2026-10-31 · OWN-001 · chủ dự án + claude-opus-5.5
- **Sửa:** đổi tên game thành **Nợ Có Ơi Pro**, xác định là bản dùng riêng.

### 2026-10-31 · M0 · claude-opus-5.5
- **Thêm:** tài liệu thiết kế (GDD, kiến trúc, quy ước, content spec, API, lộ trình, luật kế toán) và ghi chép reverse engineering cơ chế game gốc.
- **Thêm:** bộ điều phối nhiều AI (`AGENTS.md`, `ai/`).
- **Thêm:** nội dung khởi đầu: 34 tài khoản, 8 mẫu chứng từ, 9 loại lỗi, 2 chế độ, 7 mốc cấp; trình kiểm tra nội dung.
