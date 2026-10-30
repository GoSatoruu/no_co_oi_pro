# 09 — Pro: công ty cổ phần và tập đoàn

> Gói nội dung **chỉ có ở Pro** (`modes.pro.features` gồm `corporate`, `group`). Mở từ cấp 10.
> Dữ liệu: `content/doc_templates/corporate.json`, `content/accounts.json` (`proOnly`, `openingProfiles.jsc_group`), `content/pools.json` (`companies.jsc`), `content/legal_refs.json`.
> Mọi căn cứ pháp luật trong game hiện qua bảng pháp luật (docs/08 §6). Tài liệu này chỉ mô tả cơ chế.

## 1. Lộ trình nghề ở Pro

| Cấp | Chức danh | Mở thêm |
|---|---|---|
| 1–9 | Như Normal, nhưng không gợi ý | Doanh nghiệp thương mại TNHH "Đông Hồ" |
| **10** | Kế toán trưởng công ty cổ phần | Công ty chuyển thành **CTCP Tập đoàn Đông Hồ**: phát hành cổ phần, cổ tức, cổ phiếu quỹ; nghị quyết ĐHĐCĐ/HĐQT là chứng từ |
| **11** | Kế toán trưởng công ty mẹ | Đầu tư vào công ty con và công ty liên kết, giao dịch với bên liên quan, trái phiếu |
| **12** | Giám đốc tài chính tập đoàn | **Hợp nhất báo cáo tài chính** cuối năm, **kiểm toán Big Four** (docs/10) |

Người chơi Pro có thể chọn "hồ sơ nghề" để bắt đầu thẳng ở cấp 1, 5 hoặc 9 (`modes.pro.startLevels`). Muốn vào thẳng cấp 10 thì phải chơi qua cấp 9.

## 2. Chuyển sang công ty cổ phần (sự kiện mở đầu cấp 10)

Thẻ tình huống buổi sáng: Đại hội đồng cổ đông đã thông qua việc chuyển đổi. Từ tuần sau:
- Sổ chuyển sang hồ sơ số dư `openingProfiles.jsc_group`: vốn góp 80 tỷ (8 triệu cổ phần, mệnh giá 10.000 đ), thặng dư vốn 12 tỷ, lợi nhuận chưa phân phối 20 tỷ.
- Giấy tờ in tên **Công ty Cổ phần Tập đoàn Đông Hồ** (hư cấu).
- Xuất hiện NPC Chủ tịch HĐQT. Sếp cũ giữ vai Tổng giám đốc.
- Cách chuyển tiến trình: là một **migration** của bản lưu (ARCHITECTURE §6), không xoá sổ cũ. Sổ cũ được khoá và lưu trữ để xem lại.

## 3. Nghiệp vụ cổ phần (cấp 10)

| Mẫu | Chứng từ | Đáp án | Bẫy hay gặp |
|---|---|---|---|
| `issue_shares` | Giấy báo Có tiền mua cổ phần, kèm nghị quyết | Nợ 112 / Có 4111 (mệnh giá) / Có 4112 (thặng dư) | Ghi cả số tiền vào 4111 |
| `declare_dividend` | Nghị quyết ĐHĐCĐ chia cổ tức tiền | Nợ 421 / Có 3388 | Nghị quyết do HĐQT ký thay ĐHĐCĐ → trả lại (`wrong_approving_body`) |
| `pay_dividend` | Uỷ nhiệm chi trả cổ tức cá nhân | Nợ 3388 / Có 112 (thực trả) / Có 3335 (thuế khấu trừ) | Quên khấu trừ thuế TNCN |
| `buyback_treasury` | Uỷ nhiệm chi mua cổ phiếu quỹ | Nợ 419 / Có 112 | Ghi 419 như tài sản, hoặc ghi giảm 4111 ngay |

Chứng từ loại mới **`resolution`** (nghị quyết hoặc biên bản họp): tờ giấy có quốc hiệu, tên công ty, số nghị quyết, cơ quan thông qua (ĐHĐCĐ / HĐQT), tỷ lệ biểu quyết, nội dung, chữ ký chủ toạ. Trường chạm được: `approvedBy`, `votePercent`, `date`, `signature`.
`attachments: ["resolution"]` trên mẫu tức là chứng từ chính đi kèm một nghị quyết, và người chơi soi được cả hai.

### Kiểm tra hợp lệ đặc thù CTCP (soi chứng từ)
- **Đúng cơ quan thẩm quyền:** cổ tức hằng năm và mua lại vượt ngưỡng thuộc ĐHĐCĐ; mua lại trong ngưỡng thì HĐQT quyết.
- **Tỷ lệ biểu quyết** đạt mức thông qua (game dùng: nghị quyết thường > 50%, vấn đề đặc biệt ≥ 65% số phiếu dự họp `[cần kiểm theo Luật DN và Điều lệ]`).
- **Điều kiện chia cổ tức:** sau khi chia vẫn còn khả năng trả nợ đến hạn. Game kiểm bằng số dư 112 + 131 ≥ nợ ngắn hạn sau khi chia; vi phạm thì sinh thẻ hậu quả.

## 4. Tập đoàn (cấp 11)

### 4.1 Cấu trúc (hư cấu, trong `pools.json → companies.jsc`)
```
CTCP Tập đoàn Đông Hồ (công ty mẹ)
├── Công ty TNHH MTV Vận tải Đông Hồ ........ 100%  công ty con
├── CTCP Nội thất Đông Hồ Miền Nam ........... 65%  công ty con (có cổ đông không kiểm soát 35%)
└── CTCP Bao bì Giấy Mơ ...................... 30%  công ty liên kết
```

### 4.2 Nghiệp vụ
- `invest_subsidiary`: góp vốn vào công ty con (Nợ 221 / Có 112). Mở rộng sau: góp vào liên kết (222), đầu tư khác (228).
- **Giao dịch nội bộ:** công ty mẹ bán hàng cho công ty con. Ghi sổ riêng như bán hàng bình thường, nhưng phải **gắn cờ "nội bộ"** (thao tác mới ở bước định khoản Pro: công tắc *Giao dịch nội bộ tập đoàn*). Cờ này dùng khi hợp nhất.
- **Bên liên quan:** hoá đơn với công ty có liên quan tới thành viên HĐQT phải kèm văn bản chấp thuận. Thiếu thì trả lại (`related_party_unapproved`).

## 5. Hợp nhất báo cáo tài chính (cấp 12, cuối năm)

Màn mới `consolidation` chạy sau khoá sổ tháng 12, trước kiểm toán. Thứ tự các bước là thật, nên đánh số:

1. **Cộng ngang:** game cộng sẵn bảng cân đối số phát sinh của mẹ và các con (số liệu con do game sinh, đúng sẵn).
2. **Loại trừ khoản đầu tư:** người chơi ghi bút toán loại trừ 221 với vốn chủ sở hữu của công ty con, tách **lợi ích cổ đông không kiểm soát** (35% của công ty Miền Nam).
3. **Loại trừ giao dịch nội bộ:** doanh thu và giá vốn nội bộ; công nợ nội bộ 131/331; **lãi chưa thực hiện** trong hàng tồn kho cuối kỳ. Đây là chỗ cờ "nội bộ" ở §4.2 phát huy tác dụng: giao dịch quên gắn cờ sẽ thiếu bút toán loại trừ.
4. **Công ty liên kết:** chuyển sang phương pháp vốn chủ sở hữu (ghi nhận 30% lãi của liên kết).
5. **Kiểm cân và trình bày:** bảng hợp nhất phải cân; người chơi kéo các khoản vào đúng chỉ tiêu trình bày.

Bảng pháp luật bước này: `vas25_hopnhat`, `vas26_lienquan`, `luatdn_congtyme`.
Kế toán hợp nhất cần lõi riêng `core/consolidation.js` (việc CORE-010) và màn `screens/consolidation.js` (FE-016).

## 6. Thẻ tình huống riêng của Pro tập đoàn (gợi ý viết nội dung)
Theo nguyên tắc GDD §7: làm sai luôn thiệt hơn về lâu dài.
- Chủ tịch muốn "chuyển lãi" từ công ty con sang công ty mẹ bằng giá bán nội bộ cao bất thường trước kỳ chia cổ tức.
- Cổ đông lớn đề nghị tạm ứng cổ tức trước khi có nghị quyết.
- Người thân thành viên HĐQT ký hợp đồng cung cấp mà chưa được chấp thuận.
- Áp lực "làm đẹp" số liệu trước khi kiểm toán vào (liên kết sang docs/10 §6).

## 7. Việc cần làm (đã thêm vào `ai/TASKS.md` M5)
CNT-001 (kiểm điều khoản luật trong `legal_refs.json`), CORE-009 (kind `resolution` + op `swap_approving_body`, `strip_related_party_approval`), CORE-010 (hợp nhất), FE-015 (vẽ `resolution`), FE-016 (màn hợp nhất), FE-017 (công tắc giao dịch nội bộ), PY-009 (song sinh).
