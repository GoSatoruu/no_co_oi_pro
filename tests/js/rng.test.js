import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRng, cyrb128, sfc32 } from '../../frontend/js/core/rng.js';

describe('RNG core (cyrb128 + sfc32)', () => {
  test('cùng seed sinh cùng chuỗi số', () => {
    const rng1 = createRng('test-seed-123');
    const rng2 = createRng('test-seed-123');

    const seq1 = Array.from({ length: 50 }, () => rng1.next());
    const seq2 = Array.from({ length: 50 }, () => rng2.next());

    assert.deepEqual(seq1, seq2);
  });

  test('khác seed sinh chuỗi khác nhau', () => {
    const rng1 = createRng('seed-alpha');
    const rng2 = createRng('seed-beta');

    assert.notEqual(rng1.next(), rng2.next());
  });

  test('int(a, b) sinh số trong khoảng [a, b]', () => {
    const rng = createRng('interval-seed');
    for (let i = 0; i < 200; i++) {
      const val = rng.int(5, 10);
      assert.ok(val >= 5 && val <= 10, `Giá trị ${val} nằm ngoài [5, 10]`);
      assert.equal(Math.floor(val), val, 'Phải là số nguyên');
    }

    // Ca biên: a === b
    assert.equal(rng.int(7, 7), 7);

    // Ca lỗi: a > b
    assert.throws(() => rng.int(10, 5), /không được lớn hơn/);
  });

  test('pick(arr) bốc phần tử hợp lệ và không làm hỏng mảng', () => {
    const rng = createRng('pick-seed');
    const items = ['111', '112', '156', '511', '642'];
    const chosen = rng.pick(items);
    assert.ok(items.includes(chosen));

    // Ca biên: mảng rỗng
    assert.equal(rng.pick([]), undefined);
    assert.equal(rng.pick(null), undefined);
  });

  test('shuffle(arr) xáo trộn phần tử và không biến đổi mảng gốc', () => {
    const rng = createRng('shuffle-seed');
    const original = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const shuffled = rng.shuffle(original);

    // Mảng gốc không bị đột biến
    assert.deepEqual(original, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    // Độ dài giữ nguyên
    assert.equal(shuffled.length, original.length);
    // Tập hợp phần tử giống nhau
    assert.deepEqual([...shuffled].sort((a, b) => a - b), original);
  });

  test('1.000 số đầu của seed "nocooi" khớp file golden', () => {
    const goldenRaw = fs.readFileSync(
      new URL('../golden/rng.json', import.meta.url),
      'utf-8'
    );
    const golden = JSON.parse(goldenRaw);

    const rng = createRng('nocooi');
    for (let i = 0; i < golden.count; i++) {
      const expected = golden.first1000[i];
      const actual = rng.next();
      assert.equal(
        actual,
        expected,
        `Số thứ ${i} không khớp golden: ${actual} !== ${expected}`
      );
    }
  });
});
