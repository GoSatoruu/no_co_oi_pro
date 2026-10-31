"""Trọng tài JS↔Python: cùng bộ tests/golden/ với tests/js/golden.test.js."""
import json
from pathlib import Path

import pytest

from app.engine.expr import eval_expr, round_half_up
from app.engine.money_words import money_to_words
from app.engine.rng import create_rng

GOLDEN = Path(__file__).resolve().parents[2] / "tests" / "golden"


def _load(name):
    return json.loads((GOLDEN / name).read_text(encoding="utf-8"))


def test_rng_matches_golden():
    g = _load("rng.json")
    rng = create_rng(g["seed"])
    for i in range(g["count"]):
        assert rng.next() == g["first1000"][i], f"index {i}"


def test_rng_same_seed_same_sequence_and_helpers():
    a, b = create_rng("abc"), create_rng("abc")
    assert [a.int(1, 6) for _ in range(20)] == [b.int(1, 6) for _ in range(20)]
    assert sorted(create_rng("x").shuffle(range(10))) == list(range(10))
    assert create_rng("x").pick([]) is None
    with pytest.raises(ValueError):
        create_rng("x").int(3, 1)


@pytest.mark.parametrize("case", _load("expr.json"), ids=lambda c: c["name"])
def test_expr_matches_golden(case):
    assert eval_expr(case["expr"], case["vars"]) == case["expected"]


@pytest.mark.parametrize(
    "src,vars_",
    [
        ("", {}),
        ("1 +", {}),
        ("a", {}),  # biến chưa định nghĩa
        ("1 / 0", {}),
        ("2 ** 3", {}),  # ký tự lạ
        ("__import__('os')", {}),
        ("1 2", {}),
    ],
)
def test_expr_rejects_bad_input(src, vars_):
    with pytest.raises(ValueError):
        eval_expr(src, vars_)


def test_round_half_up():
    assert [round_half_up(x) for x in (0.5, 1.5, 2.5, -0.5, -2.5, 10.49)] == [1, 2, 3, -1, -3, 10]

@pytest.mark.parametrize("case", _load("money_words.json")["cases"], ids=lambda c: str(c["amount"]))
def test_money_words_matches_golden(case):
    assert money_to_words(case["amount"]) == case["words"]


@pytest.mark.parametrize("bad", [-1, 1.5, True, "100", 2**53])
def test_money_words_rejects_bad_input(bad):
    with pytest.raises(ValueError):
        money_to_words(bad)
