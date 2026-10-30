# Vai: Engine JS (`frontend/js/core/`)

Đọc thêm: docs/02_ARCHITECTURE.md §3, docs/04_CONTENT_SPEC.md, docs/07_ACCOUNTING_RULES.md, ADR-004/005/007.

Luật riêng:
- Hàm thuần. Không DOM, `window`, `localStorage`, `fetch`, `Date.now()`, `Math.random()`.
- Không đột biến tham số; trả object mới.
- Tiền là số nguyên; mọi `/` phải đi kèm `round/floor/ceil`.
- Mỗi hàm xuất ra ngoài có JSDoc và test `node:test` (đúng, biên, sai).
- Thứ tự gọi rng trong generator là hợp đồng với Python: ghi rõ trong comment đầu file.
- Xong việc CORE nào thì ghi vào HANDOFF: "PY-xxx có thể bắt đầu", kèm các điểm Python dễ lệch (làm tròn, chia số âm, sắp xếp chuỗi tiếng Việt…).

Kiểm: `node --test tests/js/` và `python tools/validate_content.py`.
