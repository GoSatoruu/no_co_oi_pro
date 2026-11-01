import { createRng } from './rng.js';
import { evalExpr } from './expr.js';
import { moneyToWords } from './money-words.js';

// ponytail: ruleAt và sinh ca sống tạm ở đây. CORE-004 (rules.js) và CORE-007 (generator.js) thay khi landing; buildShift giữ nguyên chữ ký.

export function ruleAt(rules, key, date) {
  const hit = (rules[key] ?? []).find(r => r.from <= date && (!r.to || date <= r.to));
  if (!hit) throw new Error(`Không có mốc luật ${key} tại ${date}`);
  return hit.value;
}

const step = (rng, [min, max, every]) => min + rng.int(0, Math.floor((max - min) / every)) * every;

export function evalParam(rng, spec, rules, date) {
  if (spec.int) return rng.int(spec.int[0], spec.int[1]);
  if (spec.step) return step(rng, spec.step);
  if (spec.pick) return rng.pick(spec.pick);
  if (spec.const != null) return spec.const;
  if (spec.rule) return ruleAt(rules, spec.rule, date);
  throw new Error(`Tham số không hợp lệ: ${JSON.stringify(spec)}`);
}

function makeDoc(rng, content, tpl, accounts, date) {
  const vars = {};
  for (const [k, spec] of Object.entries(tpl.params ?? {})) {
    vars[k] = evalParam(rng, spec, content.rules, date);
  }
  const pool = content.pools[tpl.partner] ?? [];
  const partner = rng.pick(pool.filter(p => !tpl.partnerFilter?.hasTaxId || p.taxId)) ?? null;
  const items = (content.pools[tpl.item] ?? []).filter(it => !it.account || accounts.has(it.account));
  const item = items.length ? rng.pick(items) : null;
  if (item) {
    vars.unitPrice = step(rng, item.price);
    vars.costRatio = item.costRatio ?? 0;
    vars.vatRate = ruleAt(content.rules, `vat.rate.${item.vatCategory ?? 'goods'}`, date);
  }
  const amounts = {};
  for (const [k, expr] of Object.entries(tpl.amounts)) {
    amounts[k] = evalExpr(expr, { ...vars, ...amounts });
  }
  if (amounts.total == null) {
    amounts.total = amounts.cost ?? amounts.amount ?? Object.values(amounts)[0] ?? 0;
  }
  const truth = tpl.truth.map(([side, acc, amt]) => ({
    side, account: acc === '$item.account' ? item.account : acc, amount: amounts[amt],
  }));
  return { tpl, partner, item, vars, amounts, truth };
}

function applyDefect(rng, doc, defect) {
  const shown = { ...doc.amounts };
  if (shown.total == null) {
    shown.total = shown.cost ?? shown.amount ?? doc.truth[0]?.amount ?? 0;
  }
  let words = moneyToWords(shown.total);
  let signature = 'Đã ký';
  if (defect?.op === 'clear') signature = '';
  if (defect?.op === 'words_of_other_amount') {
    words = moneyToWords(shown.sub && shown.sub !== shown.total ? shown.sub : shown.total + 1000);
  }
  if (defect?.op === 'total_off_by') shown.total += rng.pick(defect.params.deltas);
  return { shown, words, signature };
}

const vnd = n => `${n.toLocaleString('vi-VN')} đ`;

/**
 * @param {object} content bundle từ services/content.js
 * @returns {{docs: object[], accounts: string[]}}
 */
export function buildShift(content, { seed, modeId = 'normal', level = 1, date = '2026-11-02' }) {
  const rng = createRng(String(seed));
  const mode = content.modes.find(m => m.id === modeId);
  const unlocked = content.levels.filter(l => l.level <= level && (!l.modes || l.modes.includes(modeId)));
  const accounts = new Set(unlocked.flatMap(l => l.accounts));
  const defectCodes = new Set(unlocked.flatMap(l => l.defects));
  const templates = content.templates.filter(t => unlocked.some(l => l.templates.includes(t.id)));
  const docs = [];
  for (let i = 0; i < mode.queue.size; i++) {
    const tpl = rng.pick(templates);
    const doc = makeDoc(rng, content, tpl, accounts, date);
    const eligible = content.defects.filter(d => tpl.defects.includes(d.code)
      && defectCodes.has(d.code) && mode.defects.tiers.includes(d.tier));
    const defect = eligible.length && rng.next() < mode.defects.rate ? rng.pick(eligible) : null;
    const view = applyDefect(rng, doc, defect);
    const totalLabel = tpl.kind === 'stock_out' ? 'Tổng giá vốn' : 'Tổng thanh toán';
    const fields = [
      ['date', 'Ngày chứng từ', date],
      ['partner', 'Đối tác', doc.partner?.name ?? content.pools.company.name],
      ['partnerTaxId', 'Mã số thuế', doc.partner?.taxId || '—'],
      ['item', 'Nội dung', doc.item ? `${doc.item.name} × ${doc.vars.qty} ${doc.item.unit}` : tpl.title],
      ['sub', 'Tiền hàng', doc.amounts.sub != null ? vnd(doc.amounts.sub) : '—'],
      ['vatRate', 'Thuế suất GTGT', doc.vars.vatRate != null ? `${doc.vars.vatRate}%` : '—'],
      ['total', totalLabel, vnd(view.shown.total)],
      ['amountInWords', 'Số tiền bằng chữ', view.words],
      ['signature', 'Chữ ký người lập', view.signature || '—'],
    ].filter(([key, , text]) => text !== '—' || key === 'signature');
    const real = [...new Set(doc.truth.map(l => l.amount))];
    const choices = new Set(real);
    let guard = 0;
    while (mode.input.decoyAmounts && choices.size < real.length + mode.input.decoyAmounts && guard++ < 40) {
      const v = view.shown.total + rng.pick([1000, -1000, 10000, -10000, 100000]) * rng.int(1, 2);
      if (v > 0) choices.add(v);
    }
    docs.push({
      no: i + 1, templateId: tpl.id, title: tpl.title, mentorTip: tpl.mentorTip,
      fields: fields.map(([key, label, text]) => ({ key, label, text })),
      defect: defect ? { code: defect.code, field: defect.field, explain: defect.explain } : null,
      truth: doc.truth,
      amountChoices: rng.shuffle([...choices]),
    });
  }
  return { date, accounts: [...accounts], docs };
}

/** key = null nghĩa là người chơi bấm Hợp lệ. */
export function gradeInspect(doc, key) {
  const answer = doc.defect?.field ?? null;
  return { correct: key === answer, reject: answer !== null };
}

export function gradeEntry(doc, lines) {
  const norm = rows => {
    const m = new Map();
    for (const r of rows) {
      if (!r.amount) continue;
      m.set(`${r.side}|${r.account}`, (m.get(`${r.side}|${r.account}`) ?? 0) + r.amount);
    }
    return [...m].sort().map(([k, v]) => `${k}=${v}`).join(';');
  };
  const sum = side => lines.filter(l => l.side === side).reduce((s, l) => s + l.amount, 0);
  const debit = sum('N');
  return { correct: norm(lines) === norm(doc.truth), balanced: debit > 0 && debit === sum('C') };
}
