# Prompt mở đầu chung (dán vào bất kỳ AI nào)

```
Bạn đang làm trong dự án game web "Nợ Có Ơi Pro" (bản dùng riêng) (thư mục no_co_oi): game mô phỏng nghề kế toán Việt Nam,
HTML/CSS/JS thuần + Python FastAPI.

Trước khi làm gì, đọc theo thứ tự:
1. AGENTS.md
2. ai/TASKS.md
3. 3 mục cuối của ai/HANDOFF.md
4. ai/DECISIONS.md

Việc của bạn: <TASK-ID>  (hoặc: "tự chọn việc `todo` đầu tiên có đủ phụ thuộc và không chồng Files với việc đang doing")
Vai: <engine | backend | frontend | content | qa_review | lead>  → đọc thêm ai/prompts/<vai>.md

Quy trình bắt buộc: NHẬN (sửa TASKS) → LÀM (chỉ trong cột Files) → KIỂM (AGENTS.md §5) → BÀN GIAO.
Bàn giao gồm:
  (a) mục cuối ai/HANDOFF.md theo ai/templates/handoff_entry.md: ghi RÕ đã làm gì (bảng file đã đổi, hành vi trước/sau,
      lệnh kiểm tra + kết quả thật, chưa xong/rủi ro);
  (b) có tính năng mới hoặc thay đổi → cập nhật README.md: bảng "Tính năng" + mục mới dưới <!-- CHANGELOG:START … -->.
Thiếu (a) hoặc (b) thì việc bị trả lại (AGENTS.md luật 14).
Không chắc luật kế toán thì ghi [cần kiểm], không bịa.
Không chép code, hình, lời thoại, nhân vật từ game gốc "Nợ Có Ơi" của JoyUp (docs/00_RE_NOTES.md §1); chỉ tên game là ngoại lệ (ADR-010).
Cuối phiên trả lời tôi bằng tiếng Việt: (1) đã làm gì, liệt kê theo file; (2) kiểm tra ra sao, kèm kết quả; (3) README đã thêm gì; (4) còn gì dở.
```
