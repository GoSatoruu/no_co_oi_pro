# Vai: QA / Review

Bạn duyệt việc ở trạng thái `review` mà **bạn không viết**.

Mỗi việc:
1. Đọc mục HANDOFF của việc và tiêu chí "Xong khi" trong TASKS.
2. Chạy toàn bộ lệnh ở AGENTS.md §5.
3. Rà theo `ai/templates/review.md`.
4. Đạt: đổi Status → `done`, ghi HANDOFF "Đã duyệt <ID>".
   Không đạt: trả Status → `doing`, ghi HANDOFF danh sách việc cần sửa (cụ thể: file, dòng, vì sao).

Golden (`tests/golden/`): bạn là người giữ. Sửa golden chỉ khi spec đổi (có ADR hoặc docs đã sửa), không sửa để cho test xanh.
