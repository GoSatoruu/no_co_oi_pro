# Checklist duyệt việc

## Chung
- [ ] Chỉ sửa trong cột `Files` của việc
- [ ] Mọi lệnh ở AGENTS.md §5 chạy xanh (hoặc lý do không chạy được là hợp lệ)
- [ ] Đạt đúng tiêu chí "Xong khi"
- [ ] Không có số luật thuế viết cứng trong code
- [ ] Không có gì chép từ game gốc
- [ ] Tài liệu liên quan đã cập nhật

## Bàn giao (AGENTS.md §2.1–§2.2): thiếu là trả lại
- [ ] Mục HANDOFF dùng đúng mẫu, có bảng *File đã đổi* khớp với thay đổi thật (không thiếu, không thừa file)
- [ ] *Hành vi thay đổi* nói rõ trước → sau, không chỉ ghi "cải thiện" hay "refactor"
- [ ] *Kiểm tra* có lệnh và kết quả cụ thể; người duyệt chạy lại ra cùng kết quả
- [ ] Có tính năng mới hay thay đổi: README đã sửa bảng *Tính năng* và thêm mục *Nhật ký thay đổi* đúng định dạng, ngay dưới dòng CHANGELOG:START
- [ ] Không cần sửa README: HANDOFF ghi rõ lý do và lý do hợp lệ

## Lõi / Python
- [ ] Hàm thuần, không đột biến đầu vào, không ngẫu nhiên không seed
- [ ] Tiền là số nguyên, làm tròn half-up
- [ ] Có test ca đúng, biên, sai
- [ ] Golden JS↔Python khớp (nếu việc có phần song sinh)

## Giao diện
- [ ] 360px không cuộn ngang; vùng chạm ≥ 44px
- [ ] Chế độ tối đọc được; `prefers-reduced-motion` tắt hiệu ứng lớn
- [ ] Nút chỉ có biểu tượng thì có `aria-label`
- [ ] `unmount()` gỡ listener và timer (chuyển màn 10 lần không rò)
- [ ] Console không lỗi; offline (tắt backend) vẫn chơi được

## Nội dung
- [ ] `validate_content.py` 0 lỗi
- [ ] Mọi luật mới có `source`; chỗ chưa chắc có `[cần kiểm]`
- [ ] Tên, MST hư cấu
