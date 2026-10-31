"""PRNG có seed theo ADR-005 (cyrb128 + sfc32). Song sinh frontend/js/core/rng.js.

Mọi phép toán giữ trong uint32 bằng mặt nạ để ra đúng từng bit như bản JS
(`Math.imul`, `|0`, `>>>`). Trọng tài là tests/golden/rng.json.
"""
from __future__ import annotations

from typing import Callable, Sequence, TypeVar

M = 0xFFFFFFFF
T = TypeVar("T")


def cyrb128(text: str) -> tuple[int, int, int, int]:
    h1, h2, h3, h4 = 1779033703, 3144134277, 1013904242, 2773480762
    # JS charCodeAt đọc theo đơn vị UTF-16, nên ký tự ngoài BMP phải tách thành 2 đơn vị.
    raw = text.encode("utf-16-le", "surrogatepass")
    for i in range(0, len(raw), 2):
        k = raw[i] | (raw[i + 1] << 8)
        h1 = h2 ^ ((h1 ^ k) * 597399067 & M)
        h2 = h3 ^ ((h2 ^ k) * 2869860233 & M)
        h3 = h4 ^ ((h3 ^ k) * 951274213 & M)
        h4 = h1 ^ ((h4 ^ k) * 2716044179 & M)
    h1 = ((h3 ^ (h1 >> 18)) * 597399067) & M
    h2 = ((h4 ^ (h2 >> 22)) * 2869860233) & M
    h3 = ((h1 ^ (h3 >> 17)) * 951274213) & M
    h4 = ((h2 ^ (h4 >> 19)) * 2716044179) & M
    return (
        (h1 ^ h2 ^ h3 ^ h4) & M,
        (h2 ^ h1) & M,
        (h3 ^ h1) & M,
        (h4 ^ h1) & M,
    )


def sfc32(a: int, b: int, c: int, d: int) -> Callable[[], float]:
    state = [a & M, b & M, c & M, d & M]

    def step() -> float:
        a, b, c, d = state
        t = (a + b + d) & M
        d = (d + 1) & M
        a = b ^ (b >> 9)
        b = (c + (c << 3)) & M
        c = ((c << 21) & M) | (c >> 11)
        c = (c + t) & M
        state[:] = [a, b, c, d]
        return t / 4294967296

    return step


class Rng:
    def __init__(self, seed: str) -> None:
        self.next = sfc32(*cyrb128(str(seed)))

    def int(self, lo: int, hi: int) -> int:
        if lo > hi:
            raise ValueError(f"min ({lo}) không được lớn hơn max ({hi})")
        return lo + int(self.next() * (hi - lo + 1))

    def pick(self, items: Sequence[T]) -> T | None:
        if not items:
            return None
        return items[self.int(0, len(items) - 1)]

    def shuffle(self, items: Sequence[T]) -> list[T]:
        out = list(items)
        for i in range(len(out) - 1, 0, -1):
            j = self.int(0, i)
            out[i], out[j] = out[j], out[i]
        return out


def create_rng(seed: str) -> Rng:
    return Rng(seed)
