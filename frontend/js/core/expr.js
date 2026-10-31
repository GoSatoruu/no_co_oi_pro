/**
 * Bộ đọc biểu thức an toàn evalExpr theo docs/04 §4.
 * Cùng ngữ pháp với tools/validate_content.py và backend/app/engine/expr.py.
 * KHÔNG sử dụng eval() hay Function().
 */

const TOKEN_RE = /\s*(?:(\d+(?:\.\d+)?)|([A-Za-z_][A-Za-z0-9_]*)|(.))/g;
const FUNCS = new Set(['round', 'floor', 'ceil', 'min', 'max']);

/**
 * Làm tròn half-up: 0.5 làm tròn lên 1; -0.5 làm tròn về -1.
 * @param {number} x
 * @returns {number}
 */
export function roundHalfUp(x) {
  if (x >= 0) {
    return Math.floor(x + 0.5);
  }
  return -Math.floor(-x + 0.5);
}

/**
 * Phân tích từ vựng (tokenize).
 * @param {string} src
 * @returns {Array<[string, string]>} Danh sách token dạng [loại, giá trị]
 */
export function tokenize(src) {
  const tokens = [];
  TOKEN_RE.lastIndex = 0;
  let match;

  while ((match = TOKEN_RE.exec(src)) !== null) {
    const [full, num, name, op] = match;
    if (!full.trim() && !num && !name && !op) {
      continue;
    }
    if (num !== undefined) {
      tokens.push(['num', num]);
    } else if (name !== undefined) {
      tokens.push(['name', name]);
    } else if (op !== undefined && op.trim() !== '') {
      if (!'+-*/(),'.includes(op)) {
        throw new Error(`Ký tự không hợp lệ '${op}'`);
      }
      tokens.push(['op', op]);
    }
  }

  return tokens;
}

/**
 * Gọi hàm toán học an toàn.
 * @param {string} fn
 * @param {number[]} args
 * @returns {number}
 */
function callFunc(fn, args) {
  if (args.length === 0) {
    throw new Error(`Hàm '${fn}' cần ít nhất 1 đối số`);
  }
  switch (fn) {
    case 'round':
      return roundHalfUp(args[0]);
    case 'floor':
      return Math.floor(args[0]);
    case 'ceil':
      return Math.ceil(args[0]);
    case 'min':
      return Math.min(...args);
    case 'max':
      return Math.max(...args);
    default:
      throw new Error(`Hàm không xác định '${fn}'`);
  }
}

class Parser {
  /**
   * @param {string} src
   * @param {Record<string, number>} vars
   */
  constructor(src, vars = {}) {
    this.tokens = tokenize(src);
    this.index = 0;
    this.vars = vars;
  }

  peek() {
    return this.index < this.tokens.length
      ? this.tokens[this.index]
      : ['eof', ''];
  }

  take(kind = null, val = null) {
    const [k, v] = this.peek();
    if ((kind && k !== kind) || (val && v !== val)) {
      throw new Error(`Cần ${val || kind}, gặp '${v}'`);
    }
    this.index++;
    return v;
  }

  parse() {
    if (this.tokens.length === 0) {
      throw new Error('Biểu thức rỗng');
    }
    const val = this.expr();
    if (this.peek()[0] !== 'eof') {
      throw new Error(`Ký tự thừa không thể phân tích: '${this.peek()[1]}'`);
    }
    return val;
  }

  expr() {
    let val = this.term();
    while (
      this.peek()[0] === 'op' &&
      (this.peek()[1] === '+' || this.peek()[1] === '-')
    ) {
      const op = this.take();
      const right = this.term();
      val = op === '+' ? val + right : val - right;
    }
    return val;
  }

  term() {
    let val = this.unary();
    while (
      this.peek()[0] === 'op' &&
      (this.peek()[1] === '*' || this.peek()[1] === '/')
    ) {
      const op = this.take();
      const right = this.unary();
      if (op === '*') {
        val = val * right;
      } else {
        if (right === 0) {
          throw new Error('Lỗi chia cho 0');
        }
        val = val / right;
      }
    }
    return val;
  }

  unary() {
    if (this.peek()[0] === 'op' && this.peek()[1] === '-') {
      this.take();
      return -this.unary();
    }
    return this.atom();
  }

  atom() {
    const [k, v] = this.peek();
    if (k === 'num') {
      this.take();
      return Number(v);
    }
    if (k === 'name') {
      this.take();
      if (FUNCS.has(v)) {
        this.take('op', '(');
        const args = [this.expr()];
        while (this.peek()[0] === 'op' && this.peek()[1] === ',') {
          this.take();
          args.push(this.expr());
        }
        this.take('op', ')');
        return callFunc(v, args);
      }
      if (!(v in this.vars)) {
        throw new Error(`Biến chưa định nghĩa '${v}'`);
      }
      return Number(this.vars[v]);
    }
    if (k === 'op' && v === '(') {
      this.take();
      const val = this.expr();
      this.take('op', ')');
      return val;
    }
    throw new Error(`Không thể phân tích cú pháp tại '${v}'`);
  }
}

/**
 * Đánh giá biểu thức toán học an toàn.
 * @param {string} src
 * @param {Record<string, number>} vars
 * @returns {number}
 */
export function evalExpr(src, vars = {}) {
  return new Parser(src, vars).parse();
}
