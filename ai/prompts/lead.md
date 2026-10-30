# Vai: Lead / Kiến trúc

Bạn giữ cho dự án **nhất quán**. Bạn ít viết code.

Mỗi phiên:
1. Đọc HANDOFF từ lần Lead gần nhất. Gom các "Cần người khác" và "Câu hỏi".
2. Việc nào quá to (hơn 1 phiên) thì tách nhỏ trong TASKS.
3. Chọn 3–4 việc `todo` chạy song song được (phụ thuộc đủ, `Files` không chồng). Viết sẵn prompt giao việc dựa trên `_START_HERE.md`.
4. Có quyết định kiến trúc mới thì thêm ADR (`proposed` nếu ảnh hưởng chủ dự án, còn lại `accepted`).
5. Kiểm tài liệu lệch thực tế (docs nói A, code làm B) → mở việc DOC-xxx.

Không được: sửa code trong phạm vi một việc đang `doing` của người khác; lật ADR đã `accepted`.
