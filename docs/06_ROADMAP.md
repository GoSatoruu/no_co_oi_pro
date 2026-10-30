# 06 — Lộ trình

> Mỗi mốc có **điều kiện xong** đo được. Việc chi tiết nằm ở `ai/TASKS.md`.

## M0 — Nền móng *(xong 31/10/2026)*
- [x] Tài liệu: RE notes, GDD, kiến trúc, quy ước, content spec, API, luật kế toán
- [x] Bộ điều phối đa-AI: AGENTS.md, TASKS, HANDOFF, DECISIONS, ROLES, prompts, templates
- [x] Content khởi đầu: 34 tài khoản, 8 mẫu chứng từ, 9 loại lỗi, 2 chế độ, 7 mốc cấp
- [x] `tools/validate_content.py`

## M1 — Lõi chạy được (không giao diện)
**Xong khi:** `node --test tests/js/` xanh; sinh được một ca 10 chứng từ có seed, ghi sổ, ra bảng cân đối số phát sinh cân; JS và Python cho **cùng kết quả** trên ≥ 20 ca golden.
- CORE-001 … CORE-008, PY-001 … PY-003, QA-001

## M2 — Chơi được bản Normal (MVP giao diện)
**Xong khi:** chơi trọn 1 tháng game (4 ca + kiểm quỹ + khoá sổ rút gọn) trên điện thoại mà không có lỗi console; bản lưu sống qua lần tải lại trang.
- FE-001 … FE-010, FE-020 (bảng pháp luật), CORE-012

## M3 — Pro mode + backend
**Xong khi:** ván Pro nộp lên server được chấm lại khớp điểm client; bảng xếp hạng Pro tuần hiện được; frontend offline vẫn chơi được.
- FE-011 … FE-014, PY-004 … PY-008

## M5 — Pro: công ty cổ phần và tập đoàn
**Xong khi:** chơi Pro cấp 10–11: phát hành cổ phần, chia và trả cổ tức, mua cổ phiếu quỹ, góp vốn công ty con, bắt lỗi nghị quyết sai thẩm quyền; bảng pháp luật hiện đúng căn cứ cho từng mẫu. Hợp nhất cuối năm cho ra bảng cân đối hợp nhất cân.
- CNT-001, CORE-009, CORE-010, FE-015 … FE-017, PY-009

## M6 — Pro: kiểm toán Big Four
**Xong khi:** một năm chơi Pro kết thúc bằng 5 bước kiểm toán; ý kiến kiểm toán khớp bảng quy tắc docs/10 §5 trên bộ golden.
- CORE-011, FE-018, FE-019, PY-010, CNT-002, QA-003

## M4 — Đánh bóng (làm xen giữa M3–M6)
- Âm thanh tự làm, hiệu ứng, chế độ giảm chuyển động, chế độ tối
- Hướng dẫn chơi lần đầu (ca tập)
- Đóng gói chạy một lệnh (`python run.py`) trên máy cá nhân. Bản này **dùng riêng** (ADR-010, ADR-012), không deploy công khai.

## Sau M4 — mở rộng (mỗi mục là một gói nội dung + màn)
| Gói | Nội dung |
|---|---|
| Lương | Bảng chấm công, BHXH, TNCN, 334/338/3335 |
| Kho | Thẻ kho, nhiều kho, hàng gửi đại lý (157), kiểm kê |
| TSCĐ | Mua tài sản, khấu hao đường thẳng, 211/214 |
| Thuế | Tờ khai GTGT quý, tạm nộp TNDN |
| Hộ kinh doanh | Sổ thu–chi một cột, thuế khoán và kê khai (gần với nghiệp vụ HKD ngoài đời) |
| Thi đấu ngày | Đề theo seed ngày, 3 lượt, bảng ngày/tuần |
| Hành trình | Chuỗi màn đề cố định, 1–3 sao |
| Thẻ tình huống | Đạo đức nghề nghiệp, lừa đảo, hậu quả hẹn sau |
| i18n | Tách chữ ra `content/i18n/`, thêm tiếng Anh |
