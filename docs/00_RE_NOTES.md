# 00 — Ghi chép reverse engineering "Nợ Có Ơi" (JoyUp)

> Ngày khảo sát: 31/10/2026. Nguồn: trang `joyup.vn/game/game-ke-toan` và bản chạy trên trình duyệt.
> Tài liệu này **chỉ mô tả cơ chế bằng lời của mình** để làm đầu vào thiết kế. Không chứa code, lời thoại hay hình của game gốc.

## 1. Luật "phòng sạch" (bắt buộc với mọi AI)

| Được làm | Không được làm |
|---|---|
| Học vòng chơi, nhịp độ, cách chấm điểm, cấu trúc màn | Chép hay dịch lại code JS/CSS của game gốc |
| Dùng cùng kiến thức kế toán công khai (Thông tư, Luật thuế) | Dùng tên và hình nhân vật, mascot (tên game: ngoại lệ cho bản dùng riêng, xem ADR-010) |
| Tự viết chứng từ, nhân vật, lời thoại, tình huống | Chép lời thoại, câu hỏi, kịch bản tình huống |
| Tham khảo cách chia module để tự thiết kế kiến trúc | Tải ảnh, âm thanh, font riêng của game gốc vào repo |

Khi nghi ngờ, coi như **không được** và hỏi chủ dự án.

## 2. Kỹ thuật quan sát được

- Game HTML5 nhúng trong iframe; mã chạy bằng **ES modules thuần, không framework**. Khoảng 45 module, tổng khoảng 1 MB mã chưa nén.
- Màn được đăng ký vào một bộ chuyển màn (router) theo tên: splash, inbox (hộp thư buổi sáng), desk (bàn làm việc), cash (kiểm quỹ), report, close (khoá sổ), payroll (lương), stock (kho), course (khoá học), journey (hành trình).
- Tách riêng phần **dữ liệu và cân chỉnh** (`data`), **bộ sinh chứng từ** (`docs`) và **trạng thái + lưu** (`state`) khỏi phần giao diện.
- Bản lưu nằm trong localStorage, **có chữ ký** chống sửa tay, đồng bộ lên máy chủ qua SDK của nền tảng.
- Ngẫu nhiên có **seed**. Thi đấu ngày và Hành trình dùng PRNG theo ngày hoặc theo số màn để mọi máy ra cùng đề.
- Có chế độ "headless" để kiểm thử tự động bằng trình duyệt.

→ Nhiều ý trùng với kiến trúc mình chọn: lõi thuần, dữ liệu tách riêng, PRNG có seed. Đây là cách làm phổ biến, không phải sao chép.

## 3. Vòng chơi (mô tả lại)

### 3.1 Nhịp thời gian
`Tuần` là đơn vị chơi. Mỗi tuần gồm: **Buổi sáng** (hộp thư, lịch, thẻ tình huống) → **Ca làm** (bàn làm việc) → **Kiểm quỹ** cuối tuần → (tuần cuối tháng) **Khoá sổ tháng** → (cuối quý, cuối năm) tờ khai và báo cáo.

### 3.2 Ca làm: bàn kế toán
- Người đưa chứng từ **xếp hàng**, mỗi người có **thanh kiên nhẫn** tụt dần. Hết kiên nhẫn thì họ bỏ về và người chơi mất uy tín.
- Chọn một người → chứng từ lên bàn → xử lý theo bước:
  1. **Kiểm tra:** chạm vào dòng sai để trả lại (hoặc đóng dấu "không được trừ chi phí"); không sai thì bấm *Hợp lệ*.
  2. **Định khoản:** kéo thẻ tài khoản vào cột Nợ hoặc Có, chọn số tiền từ các nút gợi ý; hai bên phải **cân**.
- Bút toán chỉ vào sổ công ty **khi hết ca**. Bỏ ca giữa chừng thì mất hết phần thưởng của ca đó.
- Loại lỗi trên chứng từ (theo bình luận và mã nguồn): thiếu chữ ký, số tiền bằng chữ không khớp, sai thuế, xuất sai kho, hoá đơn trùng, doanh nghiệp bỏ địa chỉ kinh doanh, chi tiền mặt từ ngưỡng trở lên.

### 3.3 Sai sót ẩn
Bút toán **sai nhưng vẫn cân** không bị báo ngay. Nó chỉ lộ ra khi kiểm quỹ, đối chiếu ngân hàng hoặc khoá sổ, và khi đó mới trừ điểm hay uy tín. **Đây là cơ chế hay nhất**: nó buộc người chơi làm đúng chứ không chỉ làm cho cân.

### 3.4 Kiểm quỹ cuối tuần
Đếm tiền trong két theo mệnh giá rồi so với số dư TK 111 trên sổ. Lệch thì chọn cách xử lý: lập biên bản và rà sổ (đúng quy trình), tự bỏ tiền túi bù, hoặc ghi khống một khoản chi. Hai cách sau dẫn tới hậu quả về sau.

### 3.5 Khoá sổ tháng
Đối chiếu sổ phụ ngân hàng với TK 112 → rà sổ → lương và khấu hao → kết chuyển (911) → bảng cân đối số phát sinh → (cuối quý) tờ khai GTGT → tổng kết. Cuối năm thêm kiểm kê, thuế TNDN và báo cáo tài chính.

### 3.6 Tiến trình và hậu quả
- **XP và cấp:** lên cấp thì mở thêm loại nghiệp vụ và tài khoản. Hai cấp đầu sau khi mở một loại thì có người hướng dẫn nhắc cách định khoản.
- **Uy tín:** về 0 thì bị cho thôi việc, mất vài tuần không lương, sau đó được nơi khác nhận nhưng vẫn giữ cấp.
- **Ví cá nhân** tách khỏi sổ công ty: lương, thưởng, mua công cụ (máy tính, chữ ký số…).
- **Thẻ tình huống:** sếp ép mua hoá đơn khống, "làm đẹp" báo cáo để vay vốn, thủ quỹ nhờ che giùm, lừa đảo qua điện thoại… Nguyên tắc: **làm sai không bao giờ có lợi về lâu dài**, và hậu quả được hẹn tới vài tháng sau.
- Gian lận nặng bị lộ nhiều lần thì bị khởi tố (game over tạm thời).

### 3.7 Các lớp nội dung khác
- **Hành trình:** 5 chương × 10 màn, đề cố định, 1–3 sao (≥70% đúng / ≥90% / điều kiện riêng). Đi từ sổ thu–chi một cột của hộ kinh doanh lên tới kế toán trưởng và văn phòng dịch vụ.
- **Thi đấu ngày:** mọi người cùng một đề theo seed của ngày, 3 lượt mỗi ngày, có bảng xếp hạng ngày và tuần. Điểm: định khoản đúng 100, bắt lỗi 40.
- **Khoá học:** bài đọc → thực hành có chỉ tay → màn thu nhỏ → bài kiểm tra.
- **Mở rộng theo cấp:** lương (BHXH, TNCN), kho nhiều nơi và đại lý (157), tài sản cố định và khấu hao, tạm ứng, văn phòng dịch vụ cho hộ kinh doanh.
- Số liệu thuế bám luật 2025–2026 và đánh dấu `[cần kiểm]` ở chỗ chưa chắc. **Mình áp dụng đúng thói quen này** (AGENTS.md §4.9).

## 4. Điểm yếu của bản gốc (cơ hội cho bản của mình)

Theo bình luận người chơi và quan sát:
- Có lỗi mất tiến trình (tụt từ cấp 15 về 1) và thiếu màn ở vài tuần → cần **bản lưu có phiên bản và migration** (ARCHITECTURE §6).
- Có thẻ tình huống không có đáp án để chọn → cần **validator nội dung** (`tools/validate_content.py`).
- "Chưa cập nhật luật" → luật thuế đặt trong `content/rules.json` có **ngày hiệu lực**, cập nhật không cần sửa code.
- Không có chế độ khó riêng cho người đã làm nghề → **Pro mode**.

## 5. Việc còn có thể khảo sát thêm (nếu cần)
- Chụp lại bố cục màn bàn làm việc để tham khảo UX (chỉ để tham khảo, không dùng ảnh).
- Thời lượng ca và tốc độ tụt kiên nhẫn để cân chỉnh độ khó. Mình sẽ tự cân chỉnh qua playtest, không cần số của họ.
