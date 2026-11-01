import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildShift, gradeEntry, gradeInspect, evalParam } from '../../frontend/js/core/shift.js';

const read = p => JSON.parse(fs.readFileSync(new URL(p, import.meta.url), 'utf8'));
const content = {
  modes: read('../../content/modes.json').modes,
  levels: read('../../content/levels.json').levels,
  rules: read('../../content/rules.json').rules,
  pools: read('../../content/pools.json'),
  defects: read('../../content/defects.json').defects,
  accounts: read('../../content/accounts.json').accounts,
  templates: ['sales', 'purchases', 'cash_bank', 'corporate']
    .flatMap(f => read(`../../content/doc_templates/${f}.json`).templates),
};

test('cùng seed ra cùng ca, và đáp án tự chấm đúng', () => {
  const a = buildShift(content, { seed: 'nocooi', modeId: 'normal', level: 1 });
  const b = buildShift(content, { seed: 'nocooi', modeId: 'normal', level: 1 });
  assert.deepEqual(a, b);
  assert.equal(a.docs.length, 5);
  for (const doc of a.docs) {
    assert.equal(gradeEntry(doc, doc.truth).correct, true);
    assert.equal(gradeInspect(doc, doc.defect?.field ?? null).correct, true);
    for (const line of doc.truth) assert.equal(Number.isSafeInteger(line.amount), true);
    assert.equal(a.accounts.includes(lineAccount(doc)), true);
  }
});

const lineAccount = doc => doc.truth[0].account;

test('định khoản đảo tài khoản bị chấm sai', () => {
  const doc = buildShift(content, { seed: 7, level: 1 }).docs[0];
  const swapped = doc.truth.map(l => ({ ...l, account: l.account === '111' ? '511' : l.account }));
  assert.equal(gradeEntry(doc, swapped).correct, false);
});

test('trong 40 seed có cả chứng từ lỗi lẫn chứng từ sạch', () => {
  const docs = [];
  for (let s = 0; s < 40; s++) docs.push(...buildShift(content, { seed: s, level: 2 }).docs);
  assert.equal(docs.some(d => d.defect), true);
  assert.equal(docs.some(d => !d.defect), true);
  for (const d of docs.filter(x => x.defect?.code === 'words_mismatch')) {
    const words = d.fields.find(f => f.key === 'amountInWords').text;
    const total = d.fields.find(f => f.key === 'total').text;
    assert.equal(words.includes(total.replace(/\D/g, '')), false);
  }
});

test('evalParam hỗ trợ int, step, pick, const, rule', () => {
  const dummyRng = { int: (min, max) => min, pick: arr => arr[0] };
  const rules = { 'vat.standard': [{ from: '2026-01-01', to: '2026-12-31', value: 10 }] };
  assert.equal(evalParam(dummyRng, { int: [1, 5] }, rules, '2026-06-01'), 1);
  assert.equal(evalParam(dummyRng, { step: [1000, 5000, 500] }, rules, '2026-06-01'), 1000);
  assert.equal(evalParam(dummyRng, { pick: ['A', 'B'] }, rules, '2026-06-01'), 'A');
  assert.equal(evalParam(dummyRng, { const: 42 }, rules, '2026-06-01'), 42);
  assert.equal(evalParam(dummyRng, { rule: 'vat.standard' }, rules, '2026-06-01'), 10);
  assert.throws(() => evalParam(dummyRng, { unknown: 1 }, rules, '2026-06-01'));
});

test('sinh ca cấp 5 (có mẫu cogs giá vốn) 100 seeds không crash', () => {
  for (let s = 0; s < 100; s++) {
    const shift = buildShift(content, { seed: s, modeId: 'normal', level: 5 });
    assert.equal(shift.docs.length, 5);
    for (const d of shift.docs) {
      assert.ok(d.fields.length > 0);
      assert.ok(d.fields.some(f => f.key === 'total'));
      assert.ok(d.fields.some(f => f.key === 'amountInWords'));
    }
  }
});

test('sinh ca cấp 10-12 chế độ Pro (có mẫu corporate và rule spec) không crash', () => {
  for (let lvl = 10; lvl <= 12; lvl++) {
    for (let s = 0; s < 30; s++) {
      const shift = buildShift(content, { seed: s, modeId: 'pro', level: lvl });
      assert.equal(shift.docs.length, 7);
      for (const d of shift.docs) {
        assert.ok(d.fields.length > 0);
        assert.ok(d.truth.length > 0);
      }
    }
  }
});
