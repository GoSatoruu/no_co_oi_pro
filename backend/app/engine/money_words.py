"""Song sinh frontend/js/core/money-words.js; trọng tài: tests/golden/money_words.json."""

DIGIT = ["không", "một", "hai", "ba", "bốn", "năm", "sáu", "bảy", "tám", "chín"]
SCALE = ["triệu", "nghìn", ""]
BILLION = 1_000_000_000
MAX_SAFE = 2**53 - 1


def _group(n: int, full: bool) -> str:
    t, c, u = n // 100, n % 100 // 10, n % 10
    out = []
    if full or t:
        out.append(f"{DIGIT[t]} trăm")
    if c > 1:
        out.append(f"{DIGIT[c]} mươi")
        if u:
            out.append({1: "mốt", 4: "tư", 5: "lăm"}.get(u, DIGIT[u]))
    elif c == 1:
        out.append("mười")
        if u:
            out.append("lăm" if u == 5 else DIGIT[u])
    elif u:
        if full or t:
            out.append("linh")
        out.append(DIGIT[u])
    return " ".join(out)


def _read(n: int, full: bool) -> str:
    if n >= BILLION:
        lo = n % BILLION
        hi = _read(n // BILLION, full)
        return f"{hi} tỷ {_read(lo, True)}" if lo else f"{hi} tỷ"
    parts = []
    seen = full
    for i, unit in enumerate((1_000_000, 1000, 1)):
        g = n // unit % 1000
        if g:
            parts.append(f"{_group(g, seen)} {SCALE[i]}".strip())
            seen = True
    return " ".join(parts)


def money_to_words(n: int) -> str:
    if type(n) is not int or n < 0 or n > MAX_SAFE:
        raise ValueError(f"money_to_words: {n!r}")
    if n == 0:
        return "Không đồng"
    text = _read(n, False)
    return f"{text[0].upper()}{text[1:]} đồng"
