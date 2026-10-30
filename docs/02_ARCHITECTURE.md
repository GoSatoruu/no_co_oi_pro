# 02 — Kiến trúc

## 1. Sơ đồ tổng

```
                ┌──────────────────────── content/*.json ─────────────────────────┐
                │ accounts · rules · modes · levels · defects · doc_templates/*   │
                └───────────────┬─────────────────────────────────┬───────────────┘
                                │ fetch (hoặc bản gộp từ API)      │ đọc file
┌──────────────── FRONTEND (trình duyệt) ───────────────┐   ┌────── BACKEND (Python) ──────┐
│ screens/  ── mount/unmount từng màn                   │   │ app/main.py   FastAPI         │
│    │ gọi                                              │   │ app/routes/   /api/...        │
│ ui/       ── thành phần vẽ (chứng từ, thẻ, thanh…)    │   │ app/engine/   chấm điểm (Py)  │◄─┐
│    │                                                  │   │ app/db.py     sqlite3         │  │
│ core/     ── LÕI THUẦN: rng, expr, generator,         │   │ app/content.py nạp + kiểm     │  │ cùng kết quả
│              ledger, grader, scoring, session         │◄──┼── (song sinh) ─────────────────┼──┘ tests/golden/
│    │                                                  │   └───────────────────────────────┘
│ services/ ── store (localStorage), api (fetch),       │
│              content loader                           │
└───────────────────────────────────────────────────────┘
```

## 2. Thư mục

```
no_co_oi/
├─ AGENTS.md  CLAUDE.md  GEMINI.md  README.md
├─ ai/                     # điều phối đa-AI: TASKS, HANDOFF, DECISIONS, ROLES, prompts/, templates/
├─ docs/                   # tài liệu thiết kế (file này)
├─ content/                # DỮ LIỆU GAME — nguồn sự thật cho cả JS và Python
│  ├─ accounts.json        # hệ thống tài khoản
│  ├─ rules.json           # thuế suất, ngưỡng… có ngày hiệu lực
│  ├─ modes.json           # normal, pro, …
│  ├─ levels.json          # mở khoá theo cấp
│  ├─ defects.json         # loại lỗi chứng từ
│  ├─ doc_templates/*.json # mẫu chứng từ + đáp án định khoản (corporate.json: chỉ Pro)
│  ├─ legal_refs.json      # trích dẫn pháp luật + bảng theo bước (ADR-011)
│  ├─ audit.json           # kiểm toán Big Four (chỉ Pro)
│  ├─ pools.json           # tên hư cấu, công ty, tập đoàn, NPC
│  └─ i18n/vi.json         # chữ hiển thị (khi có)
├─ frontend/
│  ├─ index.html           # một trang duy nhất, nạp js/main.js (type=module)
│  ├─ css/                 # tokens.css (biến màu, cỡ chữ), base.css, components.css, screens/*.css
│  ├─ assets/              # hình tự vẽ (SVG ưu tiên), âm thanh tự làm hoặc giấy phép mở
│  └─ js/
│     ├─ main.js           # khởi động: nạp content → khôi phục bản lưu → router
│     ├─ router.js         # register(name, screen), go(name, params)
│     ├─ core/             # KHÔNG DOM
│     ├─ ui/
│     ├─ screens/
│     └─ services/
├─ backend/
│  ├─ requirements.txt
│  ├─ app/  main.py  config.py  db.py  content.py  routes/  engine/
│  └─ tests/
├─ tests/
│  ├─ js/                  # node --test
│  └─ golden/              # ca kiểm chung JS↔Python: seed + đầu vào → đầu ra mong đợi
└─ tools/validate_content.py
```

## 3. Lõi (`frontend/js/core/`): hợp đồng từng module

| Module | Xuất | Ghi chú |
|---|---|---|
| `rng.js` | `createRng(seed: string) → { next(): number, int(a,b), pick(arr), shuffle(arr) }` | PRNG xác định (mulberry32 hoặc sfc32, băm seed bằng cyrb53). Python cài **cùng thuật toán**. |
| `expr.js` | `evalExpr(src: string, vars: object) → int` | Biểu thức an toàn: số nguyên, biến, `+ - * /`, ngoặc, `round()`, `floor()`, `ceil()`, `min()`, `max()`. **Không `eval`**. |
| `content.js` | `indexContent(raw) → Content` | Gộp các file JSON, lập chỉ mục tài khoản, mẫu theo cấp. |
| `rules.js` | `ruleAt(content, key, date) → value` | Lấy luật theo ngày hiệu lực. |
| `generator.js` | `generateShift(content, { seed, level, mode, date }) → Doc[]` | Sinh chứng từ của một ca. Mỗi `Doc` có `fields`, `truth` (dòng đáp án), `defect` (hoặc null). |
| `ledger.js` | `createLedger(opening)`, `post(ledger, entry)`, `balance(ledger, acc)`, `trialBalance(ledger)` | Sổ là danh sách bút toán; số dư tính lại khi cần. Nợ dương, Có âm. |
| `grader.js` | `gradeInspect(doc, action)`, `gradeEntry(doc, lines, mode) → { correct, balanced, diff }` | So tập dòng sau khi chuẩn hoá (gộp cùng bên cùng TK, bỏ dòng 0). |
| `scoring.js` | `scoreDoc(result, mode, timing)`, `scoreShift(results, mode)` | Hệ số lấy từ `modes.json`. |
| `legal.js` | `panelFor(content, { step, template, kind, mode }) → { refs, tips }` | Chọn bảng pháp luật: `template` > `kind` > `"*"`. **Không nhận `doc.defect`** làm tham số (để không thể lộ đáp án). `tips` rỗng khi `mode.hints.legalPanel.showMentorTips = false`. |
| `consolidation.js` | Bút toán loại trừ, lợi ích cổ đông không kiểm soát, phương pháp vốn chủ sở hữu | Chỉ Pro (docs/09 §5). |
| `audit.js` | Trọng yếu, phát hiện sai sót, ý kiến kiểm toán | Chỉ Pro (docs/10). |
| `session.js` | Máy trạng thái của ca: `start → selectDoc → inspect → entry → post → … → end` | Thuần, nhận sự kiện và trả trạng thái mới (kiểu reducer). Màn `desk` chỉ phát sự kiện và vẽ. |

**Kiểu dữ liệu chung**

```js
// Dòng bút toán
Line = { side: 'N' | 'C', acc: '111', amt: 1100000 }   // amt: số nguyên VND > 0
// Bút toán
Entry = { id, docId, date: 'YYYY-MM-DD', lines: Line[], memo, flags: { nonDeductible?: true } }
// Chứng từ
Doc = { id, template, kind, date, fields: {...}, amounts: { sub, vat, total, ... },
        truth: Line[] | null,          // null = chứng từ phải trả lại, không ghi sổ
        defect: { code, field, action: 'reject' | 'stamp' } | null,
        giver: { npcId, patience } }
```

## 4. Màn hình (`screens/`)

```js
// mỗi màn
export function mount(root, params, ctx) { /* vẽ, gắn sự kiện */ }
export function unmount() { /* gỡ sự kiện, dừng timer */ }
// ctx = { content, store, go, mode }
```
Bảng pháp luật (`ui/legal-panel.js`) **không phải màn**: nó gắn vào khung trang, nghe sự kiện `step-change` do màn phát ra (`{ step, template, kind }`), rồi gọi `core/legal.js` và vẽ lại.
Router chỉ giữ **một màn** tại một thời điểm. Màn không gọi `fetch` hay `localStorage` trực tiếp mà đi qua `ctx.store` và `services/api.js`.

## 5. Backend

- **FastAPI** + **uvicorn**, cơ sở dữ liệu **sqlite3** của thư viện chuẩn (không ORM).
- Phục vụ luôn thư mục `frontend/` dưới dạng tĩnh ở `/`, `content/` ở `/content/`, và API ở `/api/*` (xem `05_API_CONTRACT.md`). Nhờ vậy đường dẫn tương đối `../content/…` của frontend chạy được cả khi mở qua backend lẫn khi chạy `python -m http.server` ở thư mục gốc.
- `app/engine/` là bản Python của `rng`, `expr`, `generator`, `grader`, `scoring`, dùng để:
  - sinh đề có seed cho Pro xếp hạng và Thi đấu ngày;
  - **chấm lại** bài nộp xếp hạng (client chỉ gửi hành động, server tự tính điểm).
- `app/content.py` nạp `content/`, chạy cùng kiểm tra với `tools/validate_content.py`, và trả bản gộp ở `/api/content`.

## 6. Lưu trạng thái

- Khoá localStorage: `nocooi.save.v{N}`. Đối tượng có `schemaVersion`.
- `services/store.js` có bảng **migration** `{ 1: fn, 2: fn }` để nâng bản lưu cũ. **Không bao giờ** xoá bản lưu khi đọc lỗi: sao một bản dự phòng `nocooi.save.bak` trước khi ghi đè.
- Trong ca: trạng thái ca ở bộ nhớ; chỉ commit vào bản lưu khi kết thúc ca (tránh nhân đôi khi tắt app).
- Chống sửa tay: **không làm ở MVP** (chơi offline thì không cần). Bảng xếp hạng an toàn nhờ server chấm lại.

## 7. Điểm mở rộng (thêm mà không sửa lõi)

| Muốn thêm | Làm gì |
|---|---|
| Nghiệp vụ hay chứng từ mới | Thêm file vào `content/doc_templates/`, mở ở `levels.json`. Có dạng chứng từ mới cần vẽ thì thêm renderer trong `ui/paper/` và đăng ký `kind`. |
| Loại lỗi mới | Thêm vào `defects.json` (trường bị sửa, cách sửa, hành động đúng). Có kiểu sửa mới thì thêm một hàm `mutator` trong `core/defects.js` và Python. |
| Chế độ chơi mới | Thêm mục vào `modes.json`; có luồng màn khác thì thêm màn và khai báo `flow` trong mode. |
| Luật thuế đổi | Thêm mốc mới vào `rules.json` với `from: 'YYYY-MM-DD'`. |
| Màn mới | Thêm file trong `screens/`, `register()` ở `main.js`. |

## 8. Hiệu năng và tương thích
- Mục tiêu: tải lần đầu < 300 KB (chưa tính âm thanh), 60 fps trên điện thoại tầm trung.
- Hỗ trợ trình duyệt evergreen 2 năm gần nhất. Không polyfill.
- Không dùng thư viện ngoài cho MVP. Muốn thêm (vd một thư viện âm thanh) thì viết ADR.
