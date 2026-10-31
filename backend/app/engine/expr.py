"""Bộ đọc biểu thức an toàn (docs/04 §4). Song sinh frontend/js/core/expr.js.

Không dùng eval/exec. Trọng tài là tests/golden/expr.json.
"""
from __future__ import annotations

import math
import re

TOKEN_RE = re.compile(r"\s*(?:(\d+(?:\.\d+)?)|([A-Za-z_][A-Za-z0-9_]*)|(.))", re.S)
FUNCS = {"round", "floor", "ceil", "min", "max"}


def round_half_up(x: float) -> int:
    # Python round() làm tròn chẵn; luật tiền (ADR-007) là half-up.
    return math.floor(x + 0.5) if x >= 0 else -math.floor(-x + 0.5)


def tokenize(src: str) -> list[tuple[str, str]]:
    out: list[tuple[str, str]] = []
    for num, name, op in TOKEN_RE.findall(src):
        if num:
            out.append(("num", num))
        elif name:
            out.append(("name", name))
        elif op.strip():
            if op not in "+-*/(),":
                raise ValueError(f"Ký tự không hợp lệ '{op}'")
            out.append(("op", op))
    return out


def _call(fn: str, args: list[float]) -> float:
    if fn == "round":
        return round_half_up(args[0])
    if fn == "floor":
        return math.floor(args[0])
    if fn == "ceil":
        return math.ceil(args[0])
    return min(args) if fn == "min" else max(args)


class _Parser:
    def __init__(self, src: str, env: dict[str, float]) -> None:
        self.toks = tokenize(src)
        self.i = 0
        self.env = env

    def peek(self) -> tuple[str, str]:
        return self.toks[self.i] if self.i < len(self.toks) else ("eof", "")

    def take(self, kind: str | None = None, val: str | None = None) -> str:
        k, v = self.peek()
        if (kind and k != kind) or (val and v != val):
            raise ValueError(f"Cần {val or kind}, gặp '{v}'")
        self.i += 1
        return v

    def parse(self) -> float:
        if not self.toks:
            raise ValueError("Biểu thức rỗng")
        val = self.expr()
        if self.peek()[0] != "eof":
            raise ValueError(f"Ký tự thừa không thể phân tích: '{self.peek()[1]}'")
        return val

    def expr(self) -> float:
        val = self.term()
        while self.peek() in (("op", "+"), ("op", "-")):
            op = self.take()
            right = self.term()
            val = val + right if op == "+" else val - right
        return val

    def term(self) -> float:
        val = self.unary()
        while self.peek() in (("op", "*"), ("op", "/")):
            op = self.take()
            right = self.unary()
            if op == "*":
                val *= right
            else:
                if right == 0:
                    raise ValueError("Lỗi chia cho 0")
                val /= right
        return val

    def unary(self) -> float:
        if self.peek() == ("op", "-"):
            self.take()
            return -self.unary()
        return self.atom()

    def atom(self) -> float:
        k, v = self.peek()
        if k == "num":
            self.take()
            return float(v) if "." in v else int(v)
        if k == "name":
            self.take()
            if v in FUNCS:
                self.take("op", "(")
                args = [self.expr()]
                while self.peek() == ("op", ","):
                    self.take()
                    args.append(self.expr())
                self.take("op", ")")
                return _call(v, args)
            if v not in self.env:
                raise ValueError(f"Biến chưa định nghĩa '{v}'")
            return self.env[v]
        if (k, v) == ("op", "("):
            self.take()
            val = self.expr()
            self.take("op", ")")
            return val
        raise ValueError(f"Không thể phân tích cú pháp tại '{v}'")


def eval_expr(src: str, env: dict[str, float] | None = None) -> float:
    return _Parser(src, env or {}).parse()
