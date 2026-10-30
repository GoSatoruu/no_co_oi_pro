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

Quy trình bắt buộc: NHẬN (sửa TASKS) → LÀM (chỉ trong cột Files) → KIỂM (AGENTS.md §5) → BÀN GIAO (thêm mục cuối HANDOFF).
Không chắc luật kế toán thì ghi [cần kiểm], không bịa.
Không chép code, hình, lời thoại, nhân vật từ game gốc "Nợ Có Ơi" của JoyUp (docs/00_RE_NOTES.md §1); chỉ tên game là ngoại lệ (ADR-010).
Trả lời tôi bằng tiếng Việt, ngắn gọn: đã làm gì, kiểm tra ra sao, còn gì dở.
```
