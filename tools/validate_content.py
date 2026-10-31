#!/usr/bin/env python3
"""Kiểm tra toàn bộ content/ trước khi bàn giao.

Chạy:  python tools/validate_content.py           (từ thư mục gốc dự án)
Thoát với mã 1 nếu có LỖI; CẢNH BÁO không làm hỏng lệnh.
Chỉ dùng thư viện chuẩn để AI nào, máy nào cũng chạy được.
"""
from __future__ import annotations

import itertools
import json
import re
import sys
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

if sys.platform == "win32":
    try:
        if hasattr(sys.stdout, "reconfigure"):
            sys.stdout.reconfigure(encoding="utf-8")
        if hasattr(sys.stderr, "reconfigure"):
            sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass
CONTENT = ROOT / "content"

errors: list[str] = []
warnings: list[str] = []


def err(where: str, msg: str) -> None:
    errors.append(f"[LỖI] {where}: {msg}")


def warn(where: str, msg: str) -> None:
    warnings.append(f"[CẢNH BÁO] {where}: {msg}")


def load(rel: str) -> dict | None:
    p = CONTENT / rel
    try:
        return json.loads(p.read_text(encoding="utf-8"))
    except FileNotFoundError:
        err(rel, "không tìm thấy file")
    except json.JSONDecodeError as e:
        err(rel, f"JSON hỏng: {e}")
    return None


# ---------------------------------------------------------------- biểu thức an toàn
# Cùng ngữ pháp với frontend/js/core/expr.js (docs/04_CONTENT_SPEC.md §4).
TOKEN = re.compile(r"\s*(?:(\d+(?:\.\d+)?)|([A-Za-z_][A-Za-z0-9_]*)|(.))")
FUNCS = {"round", "floor", "ceil", "min", "max"}


def tokenize(src: str) -> list[tuple[str, str]]:
    out = []
    for num, name, op in TOKEN.findall(src):
        if num:
            out.append(("num", num))
        elif name:
            out.append(("name", name))
        elif op.strip():
            if op not in "+-*/(),":
                raise ValueError(f"ký tự không hợp lệ '{op}'")
            out.append(("op", op))
    return out


class Parser:
    """expr := term (('+'|'-') term)* ; term := unary (('*'|'/') unary)* ;
    unary := '-' unary | atom ; atom := num | name | func '(' args ')' | '(' expr ')'"""

    def __init__(self, src: str, env: dict[str, float]):
        self.t = tokenize(src)
        self.i = 0
        self.env = env
        self.names: set[str] = set()

    def peek(self):
        return self.t[self.i] if self.i < len(self.t) else ("eof", "")

    def take(self, kind=None, val=None):
        k, v = self.peek()
        if (kind and k != kind) or (val and v != val):
            raise ValueError(f"cần {val or kind}, gặp '{v}'")
        self.i += 1
        return v

    def parse(self) -> float:
        v = self.expr()
        if self.peek()[0] != "eof":
            raise ValueError(f"thừa '{self.peek()[1]}'")
        return v

    def expr(self):
        v = self.term()
        while self.peek() in (("op", "+"), ("op", "-")):
            v = v + self.term() if self.take() == "+" else v - self.term()
        return v

    def term(self):
        v = self.unary()
        while self.peek() in (("op", "*"), ("op", "/")):
            if self.take() == "*":
                v = v * self.unary()
            else:
                d = self.unary()
                if d == 0:
                    raise ValueError("chia cho 0")
                v = v / d
        return v

    def unary(self):
        if self.peek() == ("op", "-"):
            self.take()
            return -self.unary()
        return self.atom()

    def atom(self):
        k, v = self.peek()
        if k == "num":
            self.take()
            return float(v)
        if k == "name":
            self.take()
            if v in FUNCS:
                self.take("op", "(")
                args = [self.expr()]
                while self.peek() == ("op", ","):
                    self.take()
                    args.append(self.expr())
                self.take("op", ")")
                return call(v, args)
            self.names.add(v)
            if v not in self.env:
                raise ValueError(f"biến chưa định nghĩa '{v}'")
            return self.env[v]
        if (k, v) == ("op", "("):
            self.take()
            r = self.expr()
            self.take("op", ")")
            return r
        raise ValueError(f"không đọc được '{v}'")


def round_half_up(x: float) -> int:
    return int(x + 0.5) if x >= 0 else -int(-x + 0.5)


def call(fn: str, a: list[float]) -> float:
    import math

    if fn == "round":
        return round_half_up(a[0])
    if fn == "floor":
        return math.floor(a[0])
    if fn == "ceil":
        return math.ceil(a[0])
    return min(a) if fn == "min" else max(a)


def eval_expr(src: str, env: dict[str, float]) -> float:
    return Parser(src, env).parse()


# ---------------------------------------------------------------- MST (dải hư cấu)
MST_W = [31, 29, 23, 19, 17, 13, 7, 5, 3]


def mst_ok(s: str) -> bool:
    if not re.fullmatch(r"\d{10}", s):
        return False
    r = 10 - sum(int(c) * w for c, w in zip(s[:9], MST_W)) % 11
    return 0 <= r <= 9 and int(s[9]) == r


def iso(d: str) -> date | None:
    try:
        return date.fromisoformat(d)
    except (TypeError, ValueError):
        return None


# ---------------------------------------------------------------- kiểm từng file
def check_accounts(a: dict) -> set[str]:
    codes: set[str] = set()
    for x in a.get("accounts", []):
        c = x.get("code")
        w = f"accounts.json#{c}"
        if c in codes:
            err(w, "trùng mã")
        codes.add(c)
        if x.get("normal") not in ("N", "C"):
            err(w, "normal phải là N hoặc C")
        if x.get("type") not in ("asset", "liability", "equity", "revenue", "expense", "closing"):
            err(w, f"type lạ: {x.get('type')}")
        if not x.get("name"):
            err(w, "thiếu name")
    for x in a.get("accounts", []):
        if x.get("parent") and x["parent"] not in codes:
            err(f"accounts.json#{x['code']}", f"parent {x['parent']} không tồn tại")
    op = a.get("opening", {})
    bal = op.get("balances", {})
    for c in bal:
        if c not in codes:
            err("accounts.json#opening", f"TK {c} không có trong danh mục")
    if sum(bal.values()) != 0:
        err("accounts.json#opening", f"số dư đầu kỳ không cân (lệch {sum(bal.values()):,})")
    if not iso(op.get("date", "")):
        err("accounts.json#opening", "date phải dạng YYYY-MM-DD")
    for name, prof in a.get("openingProfiles", {}).items():
        if name == "note":
            continue
        w = f"accounts.json#openingProfiles.{name}"
        b = prof.get("balances", {})
        for c in b:
            if c not in codes:
                err(w, f"TK {c} không có trong danh mục")
        if sum(b.values()) != 0:
            err(w, f"số dư không cân (lệch {sum(b.values()):,})")
    return codes


def check_rules(r: dict) -> set[str]:
    keys = set()
    for k, lst in r.get("rules", {}).items():
        keys.add(k)
        prev_to = None
        for i, m in enumerate(lst):
            w = f"rules.json#{k}[{i}]"
            f, t = iso(m.get("from", "")), m.get("to")
            if not f:
                err(w, "from sai định dạng")
                continue
            if t is not None and (not iso(t) or iso(t) < f):
                err(w, "to sai hoặc trước from")
            if prev_to and f <= prev_to:
                err(w, "mốc chồng lên mốc trước")
            prev_to = iso(t) if t else None
            if "value" not in m:
                err(w, "thiếu value")
            if not m.get("source"):
                warn(w, "thiếu source (nguồn luật)")
    return keys


def check_pools(p: dict, codes: set[str], rule_keys: set[str]) -> None:
    ids = set()
    for pool in ("customers", "suppliers", "goods", "expenses", "npcs"):
        for x in p.get(pool, []):
            w = f"pools.json#{pool}.{x.get('id')}"
            if x.get("id") in ids:
                err(w, "trùng id")
            ids.add(x.get("id"))
            if x.get("taxId") and not mst_ok(x["taxId"]):
                err(w, f"MST {x['taxId']} sai chữ số kiểm tra")
            if x.get("taxId") and not x["taxId"].startswith("99"):
                warn(w, "MST nên dùng dải hư cấu '99…'")
            if "vatCategory" in x and f"vat.rate.{x['vatCategory']}" not in rule_keys:
                err(w, f"vatCategory '{x['vatCategory']}' không có rules vat.rate.{x['vatCategory']}")
            if "account" in x and x["account"] not in codes:
                err(w, f"account {x['account']} không tồn tại")
            if "price" in x:
                lo, hi, step = x["price"]
                if not (0 < lo <= hi and step > 0 and (hi - lo) % step == 0):
                    err(w, "price phải là [min, max, step] với (max-min) chia hết step")
    if not mst_ok(p.get("company", {}).get("taxId", "")):
        err("pools.json#company", "MST công ty sai")


KINDS = {"invoice_out", "invoice_in", "receipt", "payment", "bank_credit", "bank_debit", "stock_out", "resolution"}
MODE_IDS: set[str] = set()  # điền khi đọc modes.json
TPL_KIND: dict[str, str] = {}  # id mẫu → kind


def sample_envs(t: dict, pools: dict, rules: dict):
    """Sinh vài bộ biến mẫu (biên dưới/trên của params × từng mặt hàng) để thử biểu thức và độ cân."""
    param_vals = []
    for name, spec in t.get("params", {}).items():
        if "int" in spec:
            lo, hi = spec["int"]
        elif "step" in spec:
            lo, hi, _ = spec["step"]
        elif "pick" in spec:
            lo, hi = min(spec["pick"]), max(spec["pick"])
        elif "const" in spec:
            lo = hi = spec["const"]
        elif "rule" in spec:
            lst = rules["rules"].get(spec["rule"])
            if not lst:
                raise ValueError(f"param {name}: rule '{spec['rule']}' không có trong rules.json")
            vals = [m["value"] for m in lst]
            lo, hi = min(vals), max(vals)
        else:
            raise ValueError(f"param {name}: chỉ hỗ trợ int | step | pick | const | rule")
        param_vals.append([(name, lo), (name, hi)])
    items = pools.get(t["item"], []) if t.get("item") else [{}]
    for item in items:
        for combo in itertools.product(*param_vals) if param_vals else [()]:
            env: dict[str, float] = dict(combo)
            if item:
                lo, hi, _ = item["price"]
                env["unitPrice"] = hi
                env["costRatio"] = item.get("costRatio", 1)
                lst = rules["rules"].get(f"vat.rate.{item.get('vatCategory')}", [{"value": 0}])
                env["vatRate"] = lst[0]["value"]
            yield item, env


def check_templates(codes: set[str], defects: dict, pools: dict, rules: dict) -> set[str]:
    ids: set[str] = set()
    for f in sorted((CONTENT / "doc_templates").glob("*.json")):
        data = load(f"doc_templates/{f.name}")
        if not data:
            continue
        for t in data.get("templates", []):
            w = f"doc_templates/{f.name}#{t.get('id')}"
            if t.get("id") in ids:
                err(w, "trùng id")
            ids.add(t.get("id"))
            TPL_KIND[t.get("id")] = t.get("kind")
            if t.get("kind") not in KINDS:
                err(w, f"kind lạ '{t.get('kind')}'")
            if t.get("partner") not in (None, "customers", "suppliers"):
                err(w, "partner phải là null | customers | suppliers")
            if t.get("item") not in (None, "goods", "expenses"):
                err(w, "item phải là null | goods | expenses")
            for md in t.get("modes", []):
                if MODE_IDS and md not in MODE_IDS:
                    err(w, f"mode '{md}' không có trong modes.json")
            for k in t.get("attachments", []):
                if k not in KINDS:
                    err(w, f"attachments có kind lạ '{k}'")
            for d in t.get("defects", []):
                dd = defects.get(d)
                if not dd:
                    err(w, f"defect '{d}' không có trong defects.json")
                    continue
                if "*" not in dd["kinds"] and t["kind"] not in dd["kinds"]:
                    err(w, f"defect '{d}' không áp dụng cho kind {t['kind']}")
                if dd.get("variant") and dd["variant"] not in t.get("variants", {}):
                    err(w, f"defect '{d}' cần variants.{dd['variant']}")
            line_sets = {"truth": t.get("truth", [])} | {
                f"variants.{k}": v for k, v in t.get("variants", {}).items()
            }
            for label, lines in line_sets.items():
                for side, acc, var in lines:
                    if side not in ("N", "C"):
                        err(w, f"{label}: side phải N/C")
                    if acc != "$item.account" and acc not in codes:
                        err(w, f"{label}: TK {acc} không tồn tại")
                    if var not in t.get("amounts", {}):
                        err(w, f"{label}: biến '{var}' không có trong amounts")
            unbalanced: set[str] = set()  # mỗi bộ dòng chỉ báo một lần
            try:
                for item, env in sample_envs(t, pools, rules):
                    for name, src in t.get("amounts", {}).items():
                        v = eval_expr(src, env)
                        if v != int(v):
                            err(w, f"amounts.{name} ra số lẻ {v} (tiền phải là số nguyên, dùng round())")
                        env[name] = int(v)
                    for label, lines in line_sets.items():
                        n = sum(env[v] for s, _, v in lines if s == "N")
                        c = sum(env[v] for s, _, v in lines if s == "C")
                        if n != c and label not in unbalanced:
                            unbalanced.add(label)
                            err(w, f"{label} không cân với mẫu {item.get('id', '-')}: Nợ {n:,} ≠ Có {c:,}")
            except (ValueError, KeyError) as e:
                err(w, f"biểu thức: {e}")
            if not t.get("mentorTip"):
                warn(w, "thiếu mentorTip (Normal mode cần)")
    return ids


def check_defects(d: dict, rule_keys: set[str]) -> dict:
    out = {}
    for x in d.get("defects", []):
        w = f"defects.json#{x.get('code')}"
        if x.get("code") in out:
            err(w, "trùng code")
        out[x["code"]] = x
        if x.get("tier") not in ("basic", "advanced"):
            err(w, "tier phải basic | advanced")
        if x.get("action") not in ("reject", "stamp"):
            err(w, "action phải reject | stamp")
        if x.get("action") == "stamp" and not x.get("variant"):
            err(w, "stamp cần variant")
        if x.get("ruleRef") and x["ruleRef"] not in rule_keys:
            err(w, f"ruleRef '{x['ruleRef']}' không có trong rules.json")
        if not x.get("explain"):
            err(w, "thiếu explain")
    return out


SCREENS = {"morning", "desk", "cash", "close"}
FEATURES = {"corporate", "group", "audit", "consolidation"}


def check_modes(m: dict, defects: dict) -> None:
    ids = set()
    for x in m.get("modes", []):
        w = f"modes.json#{x.get('id')}"
        if x.get("id") in ids:
            err(w, "trùng id")
        ids.add(x.get("id"))
        for s in x.get("flow", []):
            if s not in SCREENS:
                err(w, f"flow có màn lạ '{s}'")
        inp = x.get("input", {})
        if inp.get("account") not in ("cards", "typed"):
            err(w, "input.account phải cards | typed")
        if inp.get("amount") not in ("buttons", "typed"):
            err(w, "input.amount phải buttons | typed")
        for tier in x.get("defects", {}).get("tiers", []):
            if tier not in ("basic", "advanced"):
                err(w, f"tier lạ '{tier}'")
        lp = x.get("hints", {}).get("legalPanel")
        if not isinstance(lp, dict) or not all(isinstance(lp.get(k), bool) for k in ("enabled", "showMentorTips", "defaultOpen")):
            err(w, "hints.legalPanel cần {enabled, showMentorTips, defaultOpen} kiểu bool")
        for f in x.get("features", []):
            if f not in FEATURES:
                err(w, f"feature lạ '{f}'")
        if not 0 <= x.get("defects", {}).get("rate", -1) <= 1:
            err(w, "defects.rate phải trong [0, 1]")
        for k in ("points", "penalties"):
            if k not in x.get("scoring", {}):
                err(w, f"thiếu scoring.{k}")
    if not {"normal", "pro"} <= ids:
        err("modes.json", "phải có cả normal và pro")


def check_levels(lv: dict, codes: set[str], tpl: set[str], defects: dict) -> None:
    prev_l, prev_xp = 0, -1
    seen_t, seen_d = set(), set()
    for x in lv.get("levels", []):
        w = f"levels.json#{x.get('level')}"
        if x["level"] <= prev_l or x["xp"] <= prev_xp:
            err(w, "level và xp phải tăng dần")
        prev_l, prev_xp = x["level"], x["xp"]
        for md in x.get("modes", []):
            if MODE_IDS and md not in MODE_IDS:
                err(w, f"mode '{md}' không có trong modes.json")
        for t in x.get("templates", []):
            if t not in tpl:
                err(w, f"template '{t}' không tồn tại")
            seen_t.add(t)
        for a in x.get("accounts", []):
            if a not in codes:
                err(w, f"TK '{a}' không tồn tại")
        for d in x.get("defects", []):
            if d not in defects:
                err(w, f"defect '{d}' không tồn tại")
            seen_d.add(d)
    for t in tpl - seen_t:
        warn("levels.json", f"template '{t}' chưa được mở ở cấp nào")
    for d in set(defects) - seen_d:
        warn("levels.json", f"defect '{d}' chưa được mở ở cấp nào")


VERIFIED = {"official", "secondary", "unverified"}
STEPS = {"inspect", "entry", "consolidation", "audit_planning", "audit_fieldwork",
         "audit_adjustments", "audit_representation", "audit_opinion"}


def check_legal(lg: dict, tpl_index: dict[str, str]) -> tuple[set[str], list[dict]]:
    ids: set[str] = set()
    for r in lg.get("refs", []):
        w = f"legal_refs.json#{r.get('id')}"
        if r.get("id") in ids:
            err(w, "trùng id")
        ids.add(r.get("id"))
        for k in ("doc", "docNo", "article", "topic", "summary"):
            if not r.get(k):
                err(w, f"thiếu {k}")
        if r.get("verified") not in VERIFIED:
            err(w, "verified phải là official | secondary | unverified")
        if len(r.get("summary", "")) > 420:
            warn(w, "summary quá dài cho bảng bên cạnh (> 420 ký tự)")
    panels = lg.get("panels", [])
    for i, pn in enumerate(panels):
        w = f"legal_refs.json#panels[{i}]"
        m = pn.get("match", {})
        if m.get("step") not in STEPS:
            err(w, f"step lạ '{m.get('step')}'")
        if "kind" in m and m["kind"] != "*" and m["kind"] not in KINDS:
            err(w, f"kind lạ '{m['kind']}'")
        if "template" in m and m["template"] not in tpl_index:
            err(w, f"template '{m['template']}' không tồn tại")
        for rid in pn.get("refs", []):
            if rid not in ids:
                err(w, f"ref '{rid}' không tồn tại")
        if not pn.get("refs"):
            err(w, "panel rỗng")
    # mọi mẫu chứng từ phải có bảng pháp luật cho cả hai bước
    for tid, kind in tpl_index.items():
        for step in ("inspect", "entry"):
            ok = any(
                pn["match"].get("step") == step
                and (pn["match"].get("template") == tid or pn["match"].get("kind") in (kind, "*"))
                for pn in panels
            )
            if not ok:
                warn("legal_refs.json", f"mẫu '{tid}' không có bảng pháp luật cho bước {step}")
    return ids, panels


BIG_FOUR = {"deloitte", "pwc", "ey", "kpmg"}


def check_audit(au: dict, codes: set[str], ref_ids: set[str], panels: list[dict]) -> None:
    firms = {f.get("id") for f in au.get("firms", [])}
    if firms != BIG_FOUR:
        err("audit.json#firms", f"chỉ được gồm đúng Big Four {sorted(BIG_FOUR)} (ADR-012), đang có {sorted(firms)}")
    for f in au.get("firms", []):
        if not f.get("brand") or not f.get("legalName"):
            err(f"audit.json#firms.{f.get('id')}", "thiếu brand hoặc legalName")
    if not au.get("portrayalRules"):
        err("audit.json", "thiếu portrayalRules")
    panel_steps = {pn["match"].get("step") for pn in panels}
    for s in au.get("stages", []):
        if s.get("id") not in STEPS:
            err(f"audit.json#stages.{s.get('id')}", "id stage phải nằm trong STEPS")
        if s.get("id") not in panel_steps:
            warn(f"audit.json#stages.{s.get('id')}", "chưa có bảng pháp luật cho bước này")
    for rq in au.get("requests", []):
        w = f"audit.json#requests.{rq.get('id')}"
        for c in rq.get("accounts", []):
            if c != "*" and c not in codes:
                err(w, f"TK {c} không tồn tại")
        if rq.get("ruleRef") and rq["ruleRef"] not in ref_ids:
            err(w, f"ruleRef '{rq['ruleRef']}' không có trong legal_refs.json")
    if au.get("engagement", {}).get("rotationRuleRef") not in ref_ids:
        err("audit.json#engagement", "rotationRuleRef không có trong legal_refs.json")
    op_ids = [o.get("id") for o in au.get("opinions", [])]
    if len(op_ids) != len(set(op_ids)):
        err("audit.json#opinions", "trùng id")
    m = au.get("materiality", {})
    if not m.get("benchmarks"):
        err("audit.json#materiality", "thiếu benchmarks")


def main() -> int:
    acc, rules, modes, levels, dfx, pools = (
        load(n) for n in ("accounts.json", "rules.json", "modes.json", "levels.json", "defects.json", "pools.json")
    )
    load("i18n/vi.json")
    if None in (acc, rules, modes, levels, dfx, pools):
        pass  # lỗi đã ghi, vẫn chạy phần còn lại nếu được
    if modes:
        MODE_IDS.update(x.get("id") for x in modes.get("modes", []))
    codes = check_accounts(acc) if acc else set()
    rule_keys = check_rules(rules) if rules else set()
    defects = check_defects(dfx, rule_keys) if dfx else {}
    if pools:
        check_pools(pools, codes, rule_keys)
    tpl = check_templates(codes, defects, pools or {}, rules or {"rules": {}})
    if modes:
        check_modes(modes, defects)
    if levels:
        check_levels(levels, codes, tpl, defects)
    legal, audit = load("legal_refs.json"), load("audit.json")
    ref_ids, panels = check_legal(legal, TPL_KIND) if legal else (set(), [])
    if audit:
        check_audit(audit, codes, ref_ids, panels)

    for line in warnings + errors:
        print(line)
    print(
        f"\n{len(tpl)} mẫu chứng từ · {len(codes)} tài khoản · {len(defects)} loại lỗi · {len(ref_ids)} trích dẫn luật"
        f" — {len(errors)} lỗi, {len(warnings)} cảnh báo"
    )
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
