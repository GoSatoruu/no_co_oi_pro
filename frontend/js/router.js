/**
 * ROUTER — Quản lý chuyển đổi màn hình đơn giản (docs/02 §4)
 * Không framework, dựa trên ES Modules thuần.
 */

export class Router {
  /**
   * @param {HTMLElement} root Phần tử DOM gốc nơi mount màn hình
   * @param {Record<string, any>} ctx Ngữ cảnh dùng chung (store, content, mode, v.v.)
   */
  constructor(root, ctx = {}) {
    this.root = root;
    this.ctx = { ...ctx, go: (name, params) => this.go(name, params) };
    this.routes = new Map();
    this.currentScreen = null;
    this.currentRouteName = null;
  }

  /**
   * Đăng ký một màn hình với tên tương ứng.
   * @param {string} name Tên màn hình (vd: 'title', 'desk', 'cash', 'close')
   * @param {{ mount: (root: HTMLElement, params: any, ctx: any) => void, unmount: () => void }} screen
   */
  register(name, screen) {
    this.routes.set(name, screen);
  }

  /**
   * Chuyển đến màn hình chỉ định.
   * @param {string} name
   * @param {any} params
   */
  go(name, params = {}) {
    const screen = this.routes.get(name);
    if (!screen) {
      console.error(`Router: Màn hình '${name}' chưa được đăng ký.`);
      return;
    }

    if (this.currentScreen && typeof this.currentScreen.unmount === 'function') {
      try {
        this.currentScreen.unmount();
      } catch (err) {
        console.warn('Lỗi khi unmount màn hình cũ:', err);
      }
    }

    this.root.innerHTML = '';
    this.currentScreen = screen;
    this.currentRouteName = name;

    try {
      screen.mount(this.root, params, this.ctx);
    } catch (err) {
      console.error(`Router: Lỗi khi mount màn hình '${name}':`, err);
    }
  }

  /**
   * Lấy tên route hiện tại.
   * @returns {string|null}
   */
  getCurrentRoute() {
    return this.currentRouteName;
  }
}
