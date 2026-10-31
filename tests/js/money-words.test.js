import { test } from 'node:test';
import assert from 'node:assert/strict';
import { moneyToWords } from '../../frontend/js/core/money-words.js';

test('moneyToWords: từ chối số âm, số thực, ngoài phạm vi an toàn', () => {
  for (const bad of [-1, 1.5, NaN, Number.MAX_SAFE_INTEGER + 1, '100']) {
    assert.throws(() => moneyToWords(bad), RangeError);
  }
});

test('moneyToWords: số lớn nhất có "triệu tỷ" lồng nhau', () => {
  assert.equal(
    moneyToWords(Number.MAX_SAFE_INTEGER),
    'Chín triệu không trăm linh bảy nghìn một trăm chín mươi chín tỷ hai trăm năm mươi tư triệu bảy trăm bốn mươi nghìn chín trăm chín mươi mốt đồng'
  );
});
