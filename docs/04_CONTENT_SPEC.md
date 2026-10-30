# 04 — Đặc tả nội dung (`content/`)

> `content/` là **nguồn sự thật** cho cả frontend và backend. Mọi thay đổi phải qua:
> ```bash
> python tools/validate_content.py
> ```
> Validator là định nghĩa chính xác nhất của schema. Tài liệu này và validator mâu thuẫn thì **sửa cả hai** trong cùng việc.

## 1. Danh sách file

| File | Nội dung | Ai hay sửa |
|---|---|---|
| `accounts.json` | Hệ thống tài khoản + số dư đầu kỳ | Content |
| `rules.json` | Thuế suất, ngưỡng… theo ngày hiệu lực | Content (kiểm luật) |
| `modes.json` | Tham số từng chế độ chơi | Design/Balance |
| `levels.json` | Mở khoá theo cấp | Design/Balance |
| `defects.json` | Loại lỗi chứng từ | Content + Engine (khi thêm `op` mới) |
| `pools.json` | Công ty, khách, nhà cung cấp, hàng hoá, chi phí, NPC (hư cấu) | Content |
| `doc_templates/*.json` | Mẫu chứng từ + đáp án định khoản | Content |
| `i18n/vi.json` | Chữ giao diện | Frontend |

Mọi file có `"version": <int>`. Đổi cấu trúc (không chỉ thêm dữ liệu) thì tăng version và ghi ADR.

## 2. `accounts.json`

```jsonc
{ "code": "1331", "name": "…", "type": "asset|liability|equity|revenue|expense|closing",
  "normal": "N|C", "parent": "133", "contra": true, "proOnly": true }
```
- `opening.balances`: Nợ dương, Có âm, **tổng = 0**.
- Tài khoản cấp 2 có `parent`. Khi chấm, ghi vào TK cấp 1 trong khi đáp án là cấp 2 (vd 133 thay vì 1331) thì:
  Normal **chấp nhận**, Pro **không chấp nhận** (quy định trong `grader`, đọc cờ `mode.grading.acceptParent` — thêm khi làm CORE-005).

## 3. `rules.json`

```jsonc
"vat.rate.goods": [ { "from": "2025-07-01", "to": "2026-12-31", "value": 8, "source": "…" }, … ]
```
- Các mốc **không chồng nhau**, tăng dần. Mốc cuối có thể không có `to` (còn hiệu lực).
- `ruleAt(key, date)` trả `value` của mốc chứa `date`. Không có mốc nào thì **ném lỗi** (không mặc định ngầm).
- Mặt hàng có `vatCategory: "goods"` thì đọc khoá `vat.rate.goods`.

## 4. Biểu thức số tiền (`amounts`)

Ngữ pháp (giống hệt ở `core/expr.js`, `engine/expr.py` và validator):

```
expr  := term (('+' | '-') term)*
term  := unary (('*' | '/') unary)*
unary := '-' unary | atom
atom  := NUMBER | NAME | FUNC '(' expr (',' expr)* ')' | '(' expr ')'
FUNC  := round | floor | ceil | min | max          # round = làm tròn .5 lên (half-up)
```
- Biến có sẵn: các `params`; khi có `item`: `unitPrice`, `costRatio`, `vatRate` (số %, đã tra theo ngày chứng từ).
- `amounts` tính **theo thứ tự khai báo**; biến sau dùng được biến trước.
- Kết quả cuối mỗi biến phải là **số nguyên** (validator báo lỗi nếu ra số lẻ).

## 5. `doc_templates/*.json`

```jsonc
{
  "id": "expense_cash",                 // duy nhất toàn dự án
  "kind": "invoice_in",                 // quyết định cách vẽ tờ giấy (ui/paper/<kind>.js)
  "title": "Chi phí văn phòng trả tiền mặt",
  "giverRoles": ["cashier", "courier"], // NPC nào mang tới (pools.npcs[].role)
  "partner": "suppliers",               // null | customers | suppliers
  "partnerFilter": { "abandoned": false, "hasTaxId": true },
  "item": "expenses",                   // null | goods | expenses
  "params": { "qty": { "int": [1, 4] }, "amount": { "step": [min, max, step] } },
  "amounts": { "sub": "qty * unitPrice", "vat": "round(sub * vatRate / 100)", "total": "sub + vat" },
  "paymentMethod": "cash | bank | credit | null",
  "requires": { "balanceAtLeast": { "131": "total" } },  // chỉ sinh khi sổ thật đủ số dư (theo bên số dư thông thường)
  "truth": [["N", "$item.account", "sub"], ["N", "1331", "vat"], ["C", "111", "total"]],
  "variants": { "vat_not_deductible": [["N", "$item.account", "total"], ["C", "111", "total"]] },
  "defects": ["missing_signature", "cash_over_threshold"],
  "mentorTip": "…"                      // lời nhắc của người hướng dẫn ở Normal
}
```
- `"$item.account"`: lấy tài khoản từ mặt hàng hoặc chi phí được bốc (vd 641 hoặc 642).
- `kind` hợp lệ: `invoice_out`, `invoice_in`, `receipt`, `payment`, `bank_credit`, `bank_debit`, `stock_out`. Thêm kind mới = thêm renderer + cập nhật `KINDS` trong validator.
- Dòng đáp án có số tiền 0 (vd thuế 0%) bị **bỏ** khi chấm.

## 6. `pools.json`
- **Mọi tên, địa chỉ, MST là hư cấu.** MST 10 chữ số, đầu `99`, chữ số kiểm tra:
  `c = 10 − (Σ dᵢ·wᵢ mod 11)` với `w = [31,29,23,19,17,13,7,5,3]`, hợp lệ khi `0 ≤ c ≤ 9` `[cần kiểm công thức chính thức]`.
- `goods[].price = [min, max, step]`; giá được bốc theo bước. `costRatio` dùng để tính giá vốn.
- `suppliers[].abandoned: true`: doanh nghiệp bỏ địa chỉ kinh doanh, chỉ dùng cho lỗi `abandoned_address`.
- NPC: `role` khớp `giverRoles` của mẫu chứng từ.

## 7. `defects.json`

```jsonc
{ "code": "cash_over_threshold", "tier": "basic|advanced", "kinds": ["invoice_in"] | ["*"],
  "field": "paymentMethod",           // trường người chơi phải chạm vào
  "op": "force_cash_over_threshold",  // tên hàm làm hỏng chứng từ (JS + Python cùng tên)
  "params": { … },
  "action": "reject|stamp",           // reject: truth = null; stamp: dùng variants[variant]
  "variant": "vat_not_deductible",
  "ruleRef": "vat.cashPaymentMaxForDeduction",
  "explain": "Giải thích hiện sau khi chấm" }
```
Danh sách `op` cần cài (CORE-006): `clear`, `words_of_other_amount`, `total_off_by`, `date_shift_out_of_period`, `force_cash_over_threshold`, `swap_vat_rate`, `break_tax_id_checksum`, `reuse_posted_invoice_no`, `use_abandoned_partner`.

## 8. `modes.json` và `levels.json`
Xem ý nghĩa trong `01_GDD.md` §4. Validator kiểm khoá bắt buộc. Thêm khoá mới vào mode thì:
1. ghi ý nghĩa vào bảng dưới, 2. cập nhật validator, 3. code đọc khoá và có giá trị mặc định an toàn.

| Khoá | Ý nghĩa |
|---|---|
| `flow` | Thứ tự màn của một tuần |
| `hints.mentor` / `mentorLevels` | Bật người hướng dẫn / số cấp đầu tiên của mỗi mẫu có nhắc |
| `hints.softWarnOnWrongEntry` | Báo nhẹ ngay khi bút toán cân nhưng sai |
| `input.account` | `cards` (thẻ) hoặc `typed` (gõ số hiệu) |
| `input.amount` | `buttons` (nút gợi ý) hoặc `typed` (gõ tay) |
| `input.multiLine` | Cho thêm nhiều dòng tuỳ ý |
| `input.decoyAmounts` | Số nút tiền gây nhiễu |
| `queue.*` | Độ dài hàng chờ, kiên nhẫn (giây), thời lượng ca |
| `defects.rate` / `tiers` | Xác suất chứng từ có lỗi / bậc lỗi được dùng |
| `hiddenErrors.reveal` | Khi nào sai sót ẩn bị lộ |
| `scoring.*` | Điểm, phạt, uy tín, hệ số |
| `serverVerified` | Ván phải được máy chủ chấm lại mới vào bảng xếp hạng |

## 9. Quy trình thêm một nghiệp vụ mới (ví dụ: tạm ứng)
1. Kiểm tra tài khoản cần dùng đã có trong `accounts.json` (141).
2. Thêm mẫu vào file phù hợp trong `doc_templates/` (hoặc file mới).
3. Mở mẫu ở một cấp trong `levels.json`.
4. Chạy validator → 0 lỗi.
5. `kind` mới thì mở việc FE để vẽ tờ giấy.
6. Thêm 1 ca golden (`tests/golden/`) cho mẫu mới nếu có biểu thức lạ.
7. Ghi HANDOFF.

## 10. Bổ sung cho Pro (công ty cổ phần, tập đoàn, kiểm toán)

### 10.1 Mẫu chứng từ
- `"modes": ["pro"]`: mẫu chỉ sinh ở các chế độ liệt kê. Không có khoá này thì mọi chế độ đều dùng.
- `"attachments": ["resolution"]`: chứng từ chính đi kèm tờ phụ (vd nghị quyết); người chơi soi được cả hai.
- `kind` mới: `resolution` (nghị quyết hoặc biên bản họp ĐHĐCĐ/HĐQT). Trường: `approvedBy`, `votePercent`, `resolutionNo`, `date`, `signature`.
- `params` có thêm 3 dạng: `{ "const": 10000 }`, `{ "pick": [a, b, c] }`, `{ "rule": "jsc.parValue" }` (đọc `rules.json` theo ngày chứng từ).
- Biến dùng trong `truth` phải là khoá của `amounts` (tham số thì gán lại: `"total": "gross"`).

### 10.2 `levels.json`
`"modes": ["pro"]`: cấp chỉ có ở chế độ đó (cấp 10–12).

### 10.3 `accounts.json → openingProfiles`
Bộ số dư đầu kỳ theo giai đoạn nghề, mỗi bộ phải cân. `jsc_group` dùng khi lên cấp 10 Pro (docs/09 §2).

### 10.4 `modes.json`
- `hints.legalPanel = { enabled, showMentorTips, defaultOpen }` (đều bool).
- `features`: `corporate` | `group` | `audit` | `consolidation`.

### 10.5 `legal_refs.json`
```jsonc
"refs": [{ "id", "doc", "docNo", "article", "topic", "summary", "tags": [...],
           "verified": "official | secondary | unverified" }],
"panels": [{ "match": { "step": "inspect|entry|consolidation|audit_*", "kind"?: "...|*", "template"?: "..." },
             "refs": ["id", ...] }]
```
- `summary` ≤ 420 ký tự, lời của mình. Văn bản quy phạm pháp luật không phải đối tượng bảo hộ quyền tác giả, nhưng vẫn **tóm tắt** cho vừa bảng hẹp.
- Validator cảnh báo khi một mẫu chứng từ thiếu bảng cho bước `inspect` hoặc `entry`.
- **Không** gắn bảng theo mã lỗi (ADR-011).

### 10.6 `audit.json`
`firms` phải đúng bốn id `deloitte`, `pwc`, `ey`, `kpmg` (validator chặn). Các khối `engagement`, `materiality`, `stages`, `requests`, `findings`, `opinions`: xem docs/10.
