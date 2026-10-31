/**
 * PRNG có seed theo ADR-005: cyrb128 băm seed + sfc32 sinh số ngẫu nhiên.
 * Module thuần không đụng DOM hay global state.
 */

/**
 * Băm một chuỗi thành 4 số uint32.
 * @param {string} str
 * @returns {[number, number, number, number]}
 */
export function cyrb128(str) {
  let h1 = 1779033703;
  let h2 = 3144134277;
  let h3 = 1013904242;
  let h4 = 2773480762;

  for (let i = 0; i < str.length; i++) {
    const k = str.charCodeAt(i);
    h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
    h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
    h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
    h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
  }

  h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
  h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
  h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
  h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);

  return [
    (h1 ^ h2 ^ h3 ^ h4) >>> 0,
    (h2 ^ h1) >>> 0,
    (h3 ^ h1) >>> 0,
    (h4 ^ h1) >>> 0,
  ];
}

/**
 * Sinh số ngẫu nhiên theo thuật toán sfc32 (Small Fast Counter 32-bit).
 * @param {number} a
 * @param {number} b
 * @param {number} c
 * @param {number} d
 * @returns {() => number} Hàm sinh số trả về [0, 1)
 */
export function sfc32(a, b, c, d) {
  return function () {
    a >>>= 0;
    b >>>= 0;
    c >>>= 0;
    d >>>= 0;
    const t = (((a + b) | 0) + d) | 0;
    d = (d + 1) | 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) | 0;
    c = (c << 21) | (c >>> 11);
    c = (c + t) | 0;
    return (t >>> 0) / 4294967296;
  };
}

/**
 * Tạo bộ sinh số ngẫu nhiên từ seed dạng chuỗi.
 * @param {string} seed
 * @returns {{
 *   next: () => number,
 *   int: (a: number, b: number) => number,
 *   pick: <T>(arr: T[]) => T,
 *   shuffle: <T>(arr: T[]) => T[]
 * }}
 */
export function createRng(seed) {
  const [a, b, c, d] = cyrb128(String(seed));
  const rawNext = sfc32(a, b, c, d);

  const next = () => rawNext();

  const int = (min, max) => {
    if (min > max) {
      throw new Error(`min (${min}) không được lớn hơn max (${max})`);
    }
    return min + Math.floor(next() * (max - min + 1));
  };

  const pick = (arr) => {
    if (!arr || arr.length === 0) {
      return undefined;
    }
    return arr[int(0, arr.length - 1)];
  };

  const shuffle = (arr) => {
    const res = [...arr];
    for (let i = res.length - 1; i > 0; i--) {
      const j = int(0, i);
      const temp = res[i];
      res[i] = res[j];
      res[j] = temp;
    }
    return res;
  };

  return { next, int, pick, shuffle };
}
