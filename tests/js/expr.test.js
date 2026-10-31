import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { evalExpr, roundHalfUp } from '../../frontend/js/core/expr.js';

describe('evalExpr core (docs/04 §4)', () => {
  test('tính đúng các phép toán số học cơ bản', () => {
    assert.equal(evalExpr('1 + 2 * 3'), 7);
    assert.equal(evalExpr('(1 + 2) * 3'), 9);
    assert.equal(evalExpr('10 - 4 - 2'), 4);
    assert.equal(evalExpr('100 / 4 / 5'), 5);
  });

  test('roundHalfUp làm tròn half-up chuẩn', () => {
    assert.equal(roundHalfUp(2.4), 2);
    assert.equal(roundHalfUp(2.5), 3);
    assert.equal(roundHalfUp(2.6), 3);
    assert.equal(roundHalfUp(-2.4), -2);
    assert.equal(roundHalfUp(-2.5), -3);
    assert.equal(roundHalfUp(-2.6), -3);
  });

  test('xử lý biến trong môi trường', () => {
    const vars = { qty: 4, unitPrice: 250000, vatRate: 8 };
    const sub = evalExpr('qty * unitPrice', vars);
    assert.equal(sub, 1000000);

    const vat = evalExpr('round(sub * vatRate / 100)', { ...vars, sub });
    assert.equal(vat, 80000);

    const total = evalExpr('sub + vat', { sub, vat });
    assert.equal(total, 1080000);
  });

  test('ném lỗi khi biến chưa được định nghĩa', () => {
    assert.throws(
      () => evalExpr('a + b', { a: 1 }),
      /Biến chưa định nghĩa 'b'/
    );
  });

  test('ném lỗi khi chia cho 0', () => {
    assert.throws(
      () => evalExpr('100 / 0'),
      /Lỗi chia cho 0/
    );
  });

  test('ném lỗi khi có ký tự lạ không thuộc cú pháp', () => {
    assert.throws(
      () => evalExpr('100 $ 20'),
      /Ký tự không hợp lệ '\$'/
    );
    assert.throws(
      () => evalExpr('100 @ 20'),
      /Ký tự không hợp lệ '@'/
    );
  });

  test('ném lỗi khi biểu thức cú pháp sai hoặc thiếu ngoặc', () => {
    assert.throws(() => evalExpr('(10 + 20'));
    assert.throws(() => evalExpr('10 + +'));
    assert.throws(() => evalExpr(''));
  });

  test('đánh giá thành công tất cả biểu thức trong content/doc_templates/', () => {
    const templatesDir = path.resolve('content/doc_templates');
    const files = fs.readdirSync(templatesDir).filter((f) => f.endsWith('.json'));

    const mockEnv = {
      qty: 2,
      unitPrice: 500000,
      costRatio: 0.7,
      vatRate: 8,
      amount: 1000000,
      shares: 1000,
      issuePrice: 15000,
      parValue: 10000,
      outstanding: 50000,
      dps: 1500,
      gross: 2000000,
      pitRate: 5,
      price: 12000,
    };

    let count = 0;
    for (const file of files) {
      const content = JSON.parse(
        fs.readFileSync(path.join(templatesDir, file), 'utf-8')
      );
      for (const t of content.templates || []) {
        if (!t.amounts) continue;
        const currentEnv = { ...mockEnv };
        for (const [key, expr] of Object.entries(t.amounts)) {
          const val = evalExpr(expr, currentEnv);
          assert.equal(typeof val, 'number');
          assert.ok(!Number.isNaN(val), `NaN tại ${file} mẫu ${t.id} khoá ${key}`);
          currentEnv[key] = val;
          count++;
        }
      }
    }
    assert.ok(count > 0, `Đã kiểm tra ${count} biểu thức`);
  });
});
