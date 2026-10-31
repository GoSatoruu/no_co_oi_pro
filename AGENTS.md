# AGENTS.md — Luật chung cho mọi AI làm việc trong dự án

> File này là **nguồn luật duy nhất** cho mọi mô hình AI (Claude, GPT/Codex, Gemini, Copilot, Cursor, DeepSeek…).
> Các file `CLAUDE.md`, `GEMINI.md`, `.github/copilot-instructions.md`, `.cursor/rules/project.mdc` chỉ trỏ về đây.
> Có mâu thuẫn giữa file này và file khác → **file này thắng**, trừ khi chủ dự án nói khác trong chat.

---

## 0. Dự án là gì (đọc 30 giây)

- **Tên game:** `Nợ Có Ơi Pro` (codename `no-co-oi-pro`, tiền tố khoá lưu `nocooi`). Thư mục gốc `no_co_oi`.
- **Phạm vi phát hành:** **chỉ dùng riêng**, không đưa lên mạng công khai (ADR-010). Muốn phát hành thì phải đổi tên trước.
- **Thể loại:** game web mô phỏng nghề kế toán Việt Nam: kiểm chứng từ → định khoản Nợ/Có → kiểm quỹ → khoá sổ.
- **Cảm hứng:** cơ chế của game "Nợ Có Ơi" (JoyUp). **Chỉ học cơ chế**. Không chép code, hình, lời thoại, tên nhân vật. Tên game là ngoại lệ có chủ ý cho bản dùng riêng (ADR-010). Xem `docs/00_RE_NOTES.md` §1 (luật "phòng sạch").
- **Hai chế độ:** `normal` (có gợi ý, thẻ tài khoản giới hạn) và `pro` (không gợi ý, gõ số tài khoản, bút toán nhiều dòng, sai sót ẩn lộ khi khoá sổ). Xem `docs/01_GDD.md` §4.
- **Stack:** HTML + CSS + JavaScript thuần (ES modules, **không** framework, **không** bước build) và Python (FastAPI + SQLite) cho API.
- **Mở rộng bằng dữ liệu:** nghiệp vụ, chứng từ, lỗi, cấp độ, chế độ đều nằm trong `content/*.json`. Thêm nội dung **không** cần sửa code.

## 1. Thứ tự đọc khi bắt đầu phiên

1. `AGENTS.md` (file này)
2. `ai/TASKS.md`: chọn việc
3. `ai/HANDOFF.md`: đọc **3 mục cuối** để biết người trước làm tới đâu; `README.md` mục *Tính năng* để biết hiện trạng
4. `ai/DECISIONS.md`: các quyết định đã chốt, **không tự lật lại**
5. Tài liệu chuyên đề theo việc của bạn:

| Việc | Đọc thêm |
|---|---|
| Lõi kế toán, chấm điểm (`frontend/js/core/`, `backend/app/engine/`) | `docs/02_ARCHITECTURE.md`, `docs/07_ACCOUNTING_RULES.md` |
| Giao diện (`frontend/js/ui`, `screens`, `css`) | **`docs/08_DESIGN_SYSTEM.md`**, `docs/01_GDD.md`, `docs/03_CONVENTIONS.md` §3 |
| Pro: công ty cổ phần, tập đoàn, hợp nhất | `docs/09_PRO_CORPORATE.md` |
| Pro: kiểm toán Big Four | `docs/10_AUDIT_BIG4.md` |
| Bảng pháp luật bên cạnh nhiệm vụ | `docs/08_DESIGN_SYSTEM.md` §6, `content/legal_refs.json`, ADR-011 |
| API Python (`backend/`) | `docs/05_API_CONTRACT.md` |
| Nội dung (`content/`) | `docs/04_CONTENT_SPEC.md`, `docs/07_ACCOUNTING_RULES.md`, `content/legal_refs.json` |
| Kiểm thử | `tests/README.md` |

## 2. Quy trình làm một việc (bắt buộc)

```
NHẬN → LÀM → KIỂM → BÀN GIAO
```

1. **Nhận việc:** trong `ai/TASKS.md`, đổi dòng việc từ `todo` sang `doing`, điền `Owner` = tên mô hình + ngày (vd `claude-opus@2026-10-31`), điền cột `Files` = các file/thư mục bạn sẽ sửa. **Không nhận việc có `Files` chồng lên một việc khác đang `doing`.**
2. **Làm:** chỉ sửa trong phạm vi `Files` đã khai. Cần sửa ngoài phạm vi thì ghi vào `ai/HANDOFF.md` mục "Cần người khác" hoặc tách thành việc mới, không lấn sang.
3. **Kiểm:** chạy các lệnh ở §5. Có lỗi thì sửa xong mới bàn giao. Không chạy được (thiếu môi trường) thì ghi rõ trong bàn giao.
4. **Bàn giao:** làm **đủ cả ba** rồi mới đổi việc sang `review` (hoặc `done` nếu việc là tài liệu nhỏ):
   - a. Thêm mục vào **cuối** `ai/HANDOFF.md`, **ghi rõ đã làm gì** theo §2.1.
   - b. Có tính năng mới, hoặc đổi hành vi, giao diện, dữ liệu hay cách chạy → cập nhật `README.md` theo §2.2.
   - c. Ra quyết định kiến trúc mới → thêm ADR vào `ai/DECISIONS.md`.

### 2.1 Ghi rõ đã làm gì (bắt buộc, mọi việc)

Mục HANDOFF dùng đúng mẫu `ai/templates/handoff_entry.md`, và phải có:

| Phần | Phải ghi | Không chấp nhận |
|---|---|---|
| **File đã đổi** | Bảng: mỗi file một dòng, kèm *Thêm / Sửa / Xoá* và một câu nói đổi gì (tên hàm, khoá JSON, mục tài liệu) | "sửa vài file", "cập nhật code" |
| **Hành vi thay đổi** | Trước thế nào, giờ thế nào, nhìn từ phía người chơi hoặc người gọi hàm | "cải thiện", "tối ưu", "refactor" không kèm hệ quả |
| **Kiểm tra** | Lệnh đã chạy và **kết quả thật** (số test pass, số lỗi validator). Không chạy được thì ghi lý do. | "đã test", "chạy ổn" |
| **README** | `đã cập nhật` (nêu mục nào) hoặc `không cần` (nêu lý do) | Bỏ trống |
| **Chưa xong / rủi ro** | Phần còn dở, giả định, chỗ có thể sai | Bỏ trống khi thật ra còn dở |

Không bịa kết quả. Chưa chạy thì viết "chưa chạy".

### 2.2 Cập nhật README.md (khi có tính năng mới hoặc thay đổi)

README là trang đầu của repo trên GitHub, nên nó phải luôn đúng với hiện trạng.

**Phải cập nhật khi:** thêm hay bỏ tính năng; tính năng đổi trạng thái (vd từ *Có dữ liệu, chưa code* sang *Chơi được*); đổi cách chạy, cài đặt hay lệnh kiểm tra; đổi cấu trúc thư mục; sửa lỗi người chơi nhìn thấy được.
**Không cần khi:** chỉ refactor nội bộ không đổi hành vi, chỉ thêm test, chỉ sửa chính tả trong tài liệu. Vẫn ghi "README: không cần — <lý do>" trong HANDOFF.

Cách cập nhật:
1. **Bảng Tính năng:** thêm dòng mới, hoặc sửa cột *Trạng thái* hay *Tài liệu* của dòng có sẵn. Chỉ dùng ba trạng thái: `Chơi được`, `Có dữ liệu, chưa code`, `Mới có thiết kế` (thêm `Chạy được` cho công cụ).
2. **Nhật ký thay đổi:** thêm mục mới **ngay dưới** dòng `<!-- CHANGELOG:START … -->` (mới nhất ở trên):
   ```markdown
   ### YYYY-MM-DD · <TASK-ID> · <model>
   - **Thêm:** … (tính năng mới, nói bằng lời người chơi hoặc người phát triển hiểu)
   - **Sửa:** … (thay đổi hành vi, sửa lỗi)
   - **Xoá:** … (bỏ gì, vì sao)
   ```
   Chỉ giữ các dòng có nội dung. Mỗi dòng một ý, không dán chi tiết kỹ thuật (chi tiết để ở HANDOFF).
3. Sửa dòng **Trạng thái** đầu README khi xong một mốc (M1, M2…).
4. Đổi lệnh chạy hay kiểm tra → sửa mục *Chạy thử* và *Kiểm tra* trong README **và** §5 của file này.

`README.md` được coi là thuộc phạm vi của **mọi** việc (không cần khai trong cột `Files`). Hai AI cùng thêm mục nhật ký thì người sau giữ nguyên mục của người trước và chèn mục của mình lên trên.

Mỗi việc nên gọn trong **một phiên** (≈ 1–3 giờ người). Việc to hơn thì chia nhỏ trước khi làm.

## 3. Ranh giới module (ai được chạm vào đâu)

| Vùng | Quy tắc |
|---|---|
| `frontend/js/core/` | **Không** đụng DOM, `window`, `localStorage`, `fetch`. Hàm thuần, nhận dữ liệu và trả dữ liệu. Chạy được trong Node để test. |
| `frontend/js/ui/` | Thành phần giao diện dùng lại (thẻ tài khoản, chứng từ, thanh kiên nhẫn…). Không chứa luật kế toán. |
| `frontend/js/screens/` | Mỗi màn một file, xuất `mount(root, params)` và `unmount()`. Gọi `core/` để tính, gọi `ui/` để vẽ. |
| `frontend/js/services/` | Chỗ duy nhất được gọi `fetch` và `localStorage`. |
| `backend/app/engine/` | Bản Python của lõi chấm điểm. Phải **cho cùng kết quả** với `frontend/js/core/` trên bộ `tests/golden/`. |
| `content/` | Chỉ JSON và Markdown. Mỗi thay đổi phải qua `python tools/validate_content.py`. |
| `docs/` | Đổi luật chơi hay kiến trúc thì cập nhật tài liệu **trong cùng việc**. |

**Luật song sinh JS ↔ Python:** sửa logic chấm điểm, sinh chứng từ hay biểu thức ở một bên thì phải sửa bên kia **hoặc** mở việc `PARITY-xxx` và ghi vào HANDOFF. Bộ `tests/golden/` là trọng tài.

## 4. Luật cứng (vi phạm là bị trả lại)

1. **Phòng sạch:** không dán code, chuỗi lời thoại, ảnh, âm thanh hay tên riêng từ game gốc. Chỉ được mô tả cơ chế bằng lời của mình.
2. **Không framework, không build:** không React/Vue/Svelte/Tailwind build, không bundler. Thư viện JS ngoài chỉ thêm khi có ADR.
3. **Không số cứng về luật thuế/kế toán trong code.** Thuế suất, ngưỡng tiền mặt, mức phạt… đều nằm trong `content/rules.json`. Code chỉ đọc.
4. **Tiền là số nguyên VND.** Không dùng số thực cho tiền. Làm tròn theo `docs/07_ACCOUNTING_RULES.md` §3.
5. **Ngẫu nhiên phải có hạt giống:** mọi thứ ngẫu nhiên đi qua PRNG có seed (`core/rng.js`, `engine/rng.py`), không gọi `Math.random()` hay `random.random()` trực tiếp trong lõi.
6. **Không thưởng gian lận:** mọi lựa chọn sai đạo đức trong thẻ tình huống phải thiệt hơn về lâu dài (GDD §7).
7. **Không xoá việc, ADR hay mục bàn giao của người khác.** Chỉ thêm, hoặc đánh dấu `superseded`.
8. **Không tự đổi quyết định đã chốt** trong `ai/DECISIONS.md`. Muốn đổi thì viết ADR mới với trạng thái `proposed` và chờ chủ dự án duyệt.
9. **Luật kế toán chưa chắc thì đánh dấu `[cần kiểm]`** kèm nguồn đang dùng. Không bịa điều khoản.
10. **Bí mật:** không commit khoá, token hay mật khẩu. Cấu hình qua `.env` (đã nằm trong `.gitignore`).
11. **Bảng pháp luật không lộ đáp án** (ADR-011). Bảng chọn theo loại việc, không theo lỗi có trong chứng từ. Không nâng mức `verified` của một trích dẫn nếu chưa tự đối chiếu toàn văn trên nguồn chính thức (vbpl.vn, congbao.chinhphu.vn, cổng Bộ Tài chính).
12. **Big Four** (ADR-012): chỉ dùng tên chữ; không logo hay màu thương hiệu; bốn hãng cơ chế như nhau; hãng và kiểm toán viên luôn chuyên nghiệp, hành vi sai trái chỉ đến từ nhân vật hư cấu phía khách hàng.
13. **Thiết kế** theo `docs/08_DESIGN_SYSTEM.md`: Nợ/Có không tô xanh đỏ; màu bút bi chỉ cho thứ người chơi nhập; con dấu là chuyển động nổi bật duy nhất.
14. **Không bàn giao "câm":** việc không có mục HANDOFF theo §2.1, hoặc có tính năng mới hay thay đổi mà README chưa cập nhật theo §2.2, thì người duyệt **trả lại**, dù code đúng.

## 5. Lệnh kiểm tra

```bash
# Kiểm nội dung (bắt buộc khi sửa content/)
python tools/validate_content.py

# Test lõi JS (Node ≥ 20, không cần npm install)
node --test tests/js/

# Test Python
cd backend && python -m pytest -q

# Chạy thử toàn bộ
cd backend && uvicorn app.main:app --reload    # mở http://127.0.0.1:8000
# hoặc chỉ frontend, không cần backend (chạy ở thư mục gốc để đọc được content/):
python -m http.server 5500                     # mở http://127.0.0.1:5500/frontend/
```

Frontend **phải chơi được ở chế độ offline** (không có backend): bảng xếp hạng và đồng bộ chỉ tắt đi, game không vỡ.

## 6. Phong cách

- Tên biến, hàm, file: **tiếng Anh** (`postEntry`, `trialBalance`). Nghiệp vụ kế toán thì giữ thuật ngữ Việt trong comment hoặc nhãn hiển thị (`// Nợ 111 / Có 511`).
- Chữ hiện cho người chơi: **tiếng Việt**, đặt trong `content/i18n/vi.json` khi đã có hệ i18n (xem ROADMAP).
- Comment giải thích **vì sao**, không giải thích cái gì.
- Chi tiết hơn: `docs/03_CONVENTIONS.md`.

## 7. Khi bí

- Thiếu thông tin về luật chơi: đọc `docs/01_GDD.md`. Vẫn thiếu thì ghi câu hỏi vào `ai/HANDOFF.md` → "Câu hỏi cho chủ dự án", chọn cách hợp lý nhất, ghi rõ giả định và làm tiếp.
- Hai AI sửa đè nhau: người đến sau dừng lại, ghi vào HANDOFF, không ghi đè.
- Không rõ tài khoản kế toán: `docs/07_ACCOUNTING_RULES.md` → `content/accounts.json`.
