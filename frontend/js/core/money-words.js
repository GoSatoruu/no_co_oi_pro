/**
 * Đọc số tiền VND thành chữ. Quy ước docs/07 §6: "linh", "mốt", "lăm", "tư".
 * Nhóm 000 ở giữa bị bỏ qua (đề xuất cho OWN-003, chưa chốt).
 */

const DIGIT = ["không", "một", "hai", "ba", "bốn", "năm", "sáu", "bảy", "tám", "chín"];
const SCALE = ["triệu", "nghìn", ""];
const BILLION = 1_000_000_000;

// full: có nhóm cao hơn đứng trước, nên phải đọc đủ "không trăm", "linh".
function group(n, full) {
  const t = Math.floor(n / 100);
  const c = Math.floor((n % 100) / 10);
  const u = n % 10;
  const out = [];
  if (full || t) out.push(`${DIGIT[t]} trăm`);
  if (c > 1) {
    out.push(`${DIGIT[c]} mươi`);
    if (u) out.push(u === 1 ? "mốt" : u === 4 ? "tư" : u === 5 ? "lăm" : DIGIT[u]);
  } else if (c === 1) {
    out.push("mười");
    if (u) out.push(u === 5 ? "lăm" : DIGIT[u]);
  } else if (u) {
    if (full || t) out.push("linh");
    out.push(DIGIT[u]);
  }
  return out.join(" ");
}

function read(n, full) {
  if (n >= BILLION) {
    const lo = n % BILLION;
    const hi = read(Math.floor(n / BILLION), full);
    return lo ? `${hi} tỷ ${read(lo, true)}` : `${hi} tỷ`;
  }
  const parts = [];
  let seen = full;
  [1_000_000, 1000, 1].forEach((unit, i) => {
    const g = Math.floor(n / unit) % 1000;
    if (!g) return;
    parts.push(`${group(g, seen)} ${SCALE[i]}`.trim());
    seen = true;
  });
  return parts.join(" ");
}

/** @param {number} n số nguyên VND, 0 ≤ n ≤ Number.MAX_SAFE_INTEGER */
export function moneyToWords(n) {
  if (!Number.isSafeInteger(n) || n < 0) throw new RangeError(`moneyToWords: ${n}`);
  if (n === 0) return "Không đồng";
  const text = read(n, false);
  return `${text.charAt(0).toUpperCase()}${text.slice(1)} đồng`;
}
