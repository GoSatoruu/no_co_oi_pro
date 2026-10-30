# 03 — Quy ước code

## 1. Chung
- UTF-8, LF, thụt lề 2 dấu cách (Python: 4). Có `.editorconfig`.
- Tên định danh tiếng Anh; thuật ngữ kế toán giữ nguyên số hiệu tài khoản (`acc111`, không đặt `cashAccount` nếu đang nói đúng TK 111).
- Một file một trách nhiệm; quá ~400 dòng thì tách.
- Không để code chết, `console.log` gỡ lỗi hay `print` trong bản bàn giao.

## 2. JavaScript
- ES2022, `type="module"`, import tương đối **có đuôi `.js`**: `import { post } from '../core/ledger.js';`
- `const` mặc định, `let` khi cần, không `var`. Không dùng `class` cho dữ liệu; dùng object thuần và hàm.
- Lõi (`core/`): hàm thuần, **không** đột biến tham số đầu vào (trả bản mới), không `Date.now()` (nhận thời điểm qua tham số).
- Đặt tên: hàm `camelCase`, hằng `UPPER_SNAKE`, file `kebab-case.js` hoặc một từ (`ledger.js`).
- JSDoc ngắn cho hàm xuất ra ngoài (kiểu tham số và kiểu trả về).
- Định dạng tiền: `formatVnd(1100000) → "1.100.000"`, dùng chung ở `ui/format.js`.
- Sự kiện DOM: uỷ quyền (delegation) ở gốc màn, gỡ trong `unmount()`.

## 3. HTML/CSS
- Biến thiết kế (màu, cỡ chữ, khoảng cách, bo góc) **chỉ** khai trong `css/tokens.css`, dùng qua `var(--...)`.
- Đặt class theo kiểu BEM nhẹ: `.paper`, `.paper__row`, `.paper__row--bad`.
- Ưu tiên bố cục di động; điểm ngắt `min-width: 720px` cho máy tính.
- Có `prefers-reduced-motion` và `prefers-color-scheme`.
- Mọi nút có nhãn đọc được (`aria-label` khi chỉ có biểu tượng). Chạm tối thiểu 44×44 px.

## 4. Python
- Python ≥ 3.11, type hint đầy đủ, `from __future__ import annotations`.
- FastAPI: mô hình Pydantic cho mọi body và response; route mỏng, logic nằm trong `engine/` hoặc service.
- `sqlite3` với câu lệnh có tham số (`?`), **không** ghép chuỗi SQL.
- Định dạng theo `ruff format` (nếu có), độ dài dòng 100.
- Test bằng `pytest`, đặt ở `backend/tests/`, tên `test_*.py`.

## 5. Nội dung (`content/`)
- Khoá JSON dạng `camelCase`; mã định danh (`id`) dạng `snake_case`.
- Chữ hiện cho người chơi viết tiếng Việt có dấu, câu ngắn.
- Tên công ty, người và địa chỉ trong chứng từ là **hư cấu**. MST dùng dải giả (xem `04_CONTENT_SPEC.md` §6), không trùng doanh nghiệp thật.

## 6. Git (khi dự án lên git)
- Nhánh: `ai/<model>/<TASK-ID>-mo-ta-ngan`, vd `ai/claude/CORE-002-ledger`.
- Commit: `<TASK-ID>: <động từ> <nội dung>`, vd `CORE-002: thêm trialBalance và test`.
- Mỗi PR gắn một TASK-ID; mô tả theo `ai/templates/pr_checklist.md`.
- Chưa dùng git thì vẫn giữ kỷ luật bằng `ai/TASKS.md` và `ai/HANDOFF.md`.

## 7. Test
- Lõi JS: `tests/js/*.test.js` với `node:test` và `node:assert/strict`. Không cần npm.
- Mỗi hàm lõi mới: ít nhất 1 ca đúng, 1 ca biên, 1 ca sai.
- Golden: `tests/golden/*.json` dạng `{ "name", "input", "expected" }`. Cả JS và Python đọc cùng file.
