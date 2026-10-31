# CLAUDE.md

Đọc và làm theo **`AGENTS.md`** ở thư mục gốc. Đó là luật chung cho mọi AI trong dự án.

Ghi chú riêng cho Claude:
- Dùng task list để theo dõi các bước, nhưng trạng thái chính thức của việc vẫn nằm trong `ai/TASKS.md`.
- Có quyền chạy shell thì chạy đủ lệnh kiểm tra ở `AGENTS.md` §5 trước khi bàn giao.
- Dùng subagent thì giao cho mỗi subagent một việc riêng trong `ai/TASKS.md`, với cột `Files` không chồng nhau.

**Bắt buộc khi bàn giao** (AGENTS.md §2.1–§2.2):
- Ghi rõ đã làm gì vào cuối `ai/HANDOFF.md`: bảng file đã đổi, hành vi trước và sau, lệnh kiểm tra kèm kết quả thật, trạng thái README.
- Có tính năng mới hoặc thay đổi thì cập nhật `README.md`: bảng *Tính năng* và một mục mới ngay dưới `<!-- CHANGELOG:START … -->`.
