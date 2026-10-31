import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRng } from '../../frontend/js/core/rng.js';
import { evalExpr } from '../../frontend/js/core/expr.js';
import { moneyToWords } from '../../frontend/js/core/money-words.js';

describe('Bộ kiểm thử Golden chung (QA-001)', () => {
  test('Golden RNG: khớp 1000 số đầu của seed "nocooi"', () => {
    const raw = fs.readFileSync(
      new URL('../golden/rng.json', import.meta.url),
      'utf-8'
    );
    const golden = JSON.parse(raw);

    const rng = createRng(golden.seed);
    for (let i = 0; i < golden.count; i++) {
      const expected = golden.first1000[i];
      const actual = rng.next();
      assert.equal(
        actual,
        expected,
        `Index ${i}: mong đợi ${expected}, thực tế ${actual}`
      );
    }
  });

  test('Golden evalExpr: khớp tất cả ca mẫu trong tests/golden/expr.json', () => {
    const raw = fs.readFileSync(
      new URL('../golden/expr.json', import.meta.url),
      'utf-8'
    );
    const cases = JSON.parse(raw);

    for (const c of cases) {
      const actual = evalExpr(c.expr, c.vars);
      assert.equal(
        actual,
        c.expected,
        `Ca '${c.name}': '${c.expr}' ra ${actual}, mong đợi ${c.expected}`
      );
    }
  });

  test('Golden moneyToWords: khớp tests/golden/money_words.json', () => {
    const golden = JSON.parse(
      fs.readFileSync(new URL('../golden/money_words.json', import.meta.url), 'utf-8')
    );
    for (const c of golden.cases) {
      assert.equal(moneyToWords(c.amount), c.words, `Số ${c.amount}`);
    }
  });
});