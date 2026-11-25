import { GU_CATALOG } from "../combat/GuDatabase.js";
import { getRealmInfo } from "../account/AccountManager.js";

/**
 * Giao diện Tài Khoản & Sao Lưu Đám Mây (Đăng nhập / Đăng ký / Hồ Sơ Đạo Tịch).
 */
export class AccountModal {
  constructor({ rootEl, accountManager, sfx, onClose }) {
    this.rootEl = rootEl;
    this.account = accountManager;
    this.sfx = sfx;
    this.onClose = onClose;

    this.authMode = "login"; // "login" | "register"
    this.busy = false;
    this.message = "";
    this.isError = false;
  }

  open(mode = null) {
    if (mode) this.authMode = mode;
    this.message = "";
    this.isError = false;
    this.rootEl.classList.add("is-open");
    this.render();
  }

  close() {
    this.rootEl.classList.remove("is-open");
    this.onClose?.();
  }

  _formatTime(sec = 0) {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}p ${s}s`;
  }

  render() {
    const acc = this.account;
    const p = acc.profile;
    const realm = getRealmInfo(p.cultivation_exp);

    if (!acc.isLoggedIn()) {
      this.rootEl.innerHTML = `
        <div class="modal-card modal-card--account">
          <div class="modal-header">
            <div class="modal-tabs">
              <button type="button" class="tab-btn ${this.authMode === "login" ? "is-active" : ""}" data-auth-tab="login">🔑 Đăng Nhập</button>
              <button type="button" class="tab-btn ${this.authMode === "register" ? "is-active" : ""}" data-auth-tab="register">📜 Đăng Ký Mới</button>
            </div>
            <button type="button" id="btn-close-acc" class="close-btn">✕ Đóng</button>
          </div>
          <div class="modal-body">
            <div class="acc-banner">
              Liên kết tài khoản đám mây để lưu trọn vẹn Đạo Hiệu, Cổ Phương, Đồ Giám, Thống kê & Trận đang chơi dở giữa các máy.
            </div>
            <form id="acc-auth-form" class="acc-form">
              ${
                this.authMode === "register"
                  ? `
                <label class="acc-field">
                  <span>Tên tài khoản (viết liền, dùng đăng nhập) *</span>
                  <input id="inp-username" type="text" autocomplete="username" placeholder="vd: hanlap99" required />
                </label>
                <label class="acc-field">
                  <span>Đạo Hiệu hiển thị trong game</span>
                  <input id="inp-daohieu" type="text" placeholder="vd: Thanh Vân Cổ Sư" />
                </label>
                <label class="acc-field">
                  <span>Email khôi phục (tùy chọn)</span>
                  <input id="inp-email" type="email" autocomplete="email" placeholder="co-su@example.com" />
                </label>
              `
                  : `
                <label class="acc-field">
                  <span>Tên tài khoản hoặc Email *</span>
                  <input id="inp-identifier" type="text" autocomplete="username" placeholder="vd: hanlap99 hoặc email" required />
                </label>
              `
              }
              <label class="acc-field">
                <span>Mật khẩu (tối thiểu 6 ký tự) *</span>
                <input id="inp-password" type="password" autocomplete="current-password" placeholder="••••••" required />
              </label>

              ${
                this.message
                  ? `<div class="fusion-result ${this.isError ? "is-fail" : "is-success"}">${this.message}</div>`
                  : ""
              }

              <button type="submit" class="primary-action-btn" ${this.busy ? "disabled" : ""}>
                ${
                  this.busy
                    ? "⏳ Đang kết nối Linh Đài..."
                    : this.authMode === "register"
                      ? "✨ Tạo Tài Khoản & Sao Lưu Dữ Liệu Hiện Tại"
                      : "☁️ Đăng Nhập & Tải Dữ Liệu Đám Mây"
                }
              </button>
            </form>
          </div>
        </div>
      `;
    } else {
      const discoveredNames = (p.discovered_gu ?? [])
        .map((id) => GU_CATALOG[id]?.name ?? id)
        .join(" · ");
      const historyRows = (p.fusion_history ?? []).slice(0, 6).map(
        (h) => `
          <div class="acc-hist-row">
            <span>${h.main} + ${h.sub}</span>
            <strong style="color:${
              h.outcome === "mutation" ? "#b84dff" : h.outcome === "success" ? "#4de6b0" : "#ff4a66"
            }">→ ${h.result}</strong>
          </div>
        `
      ).join("");

      const activeRunText = p.active_run
        ? `Tầng ${p.active_run.floorNumber} · HP ${p.active_run.hp}/${p.active_run.maxHp} · ${p.active_run.bag?.length ?? 0} Cổ Trùng`
        : "Không có trận đang dở";

      this.rootEl.innerHTML = `
        <div class="modal-card modal-card--account">
          <div class="modal-header">
            <div class="section-title" style="margin:0">👤 Đạo Tịch: ${p.dao_hieu} (@${p.username})</div>
            <button type="button" id="btn-close-acc" class="close-btn">✕ Đóng</button>
          </div>
          <div class="modal-body">
            <div class="acc-profile-grid">
              <div class="acc-stat-box">
                <div class="slot-cap">Cảnh Giới</div>
                <div class="slot-val" style="color:#4de6b0">${realm.title}</div>
                <div class="gu-meta">${p.cultivation_exp} Tu Vi${realm.next ? ` / ${realm.next.minExp}` : " (Đỉnh)"}</div>
              </div>
              <div class="acc-stat-box">
                <div class="slot-cap">Tài Sản & Tiến Độ</div>
                <div class="slot-val" style="color:#ffd86e">💎 ${p.nguyen_thach} Nguyên Thạch</div>
                <div class="gu-meta">Mở Tầng ${p.highest_floor_unlocked}/3 · Phá đảo ${p.floors_cleared} lần</div>
              </div>
              <div class="acc-stat-box">
                <div class="slot-cap">Chiến Tích</div>
                <div class="slot-val">${p.total_kills} Quái · ${p.bosses_slain} Cổ Vương</div>
                <div class="gu-meta">Số trận: ${p.total_runs} · Thời gian: ${this._formatTime(p.total_playtime_sec)}</div>
              </div>
              <div class="acc-stat-box">
                <div class="slot-cap">Luyện Cổ & Cổ Phương</div>
                <div class="slot-val">Thành ${p.fusions_success} · Dị ${p.fusions_mutated} · Nổ ${p.fusions_failed}</div>
                <div class="gu-meta">Cổ Phương: ${(p.unlocked_recipes ?? []).length}/3 · Trận dở: ${activeRunText}</div>
              </div>
            </div>

            <div class="acc-rename-row">
              <input id="inp-rename-daohieu" type="text" value="${p.dao_hieu}" maxlength="32" />
              <button type="button" id="btn-rename-daohieu" class="tab-btn">Đổi Đạo Hiệu</button>
            </div>

            <div class="acc-subblock">
              <div class="section-title">Đồ Giám Cổ Trùng (${(p.discovered_gu ?? []).length})</div>
              <div class="gu-meta">${discoveredNames || "Chưa có"}</div>
            </div>

            ${
              historyRows
                ? `<div class="acc-subblock"><div class="section-title">Lịch Sử Hợp Cổ Gần Nhất</div>${historyRows}</div>`
                : ""
            }

            ${
              this.message
                ? `<div class="fusion-result ${this.isError ? "is-fail" : "is-success"}">${this.message}</div>`
                : ""
            }

            <div class="acc-actions-row">
              <button type="button" id="btn-cloud-push" class="overlay-btn" ${this.busy ? "disabled" : ""}>☁️ Sao Lưu Lên Mây</button>
              <button type="button" id="btn-cloud-pull" class="tab-btn" ${this.busy ? "disabled" : ""}>📥 Tải Từ Mây Về</button>
              <button type="button" id="btn-logout" class="close-btn">🚪 Đăng Xuất</button>
            </div>
          </div>
        </div>
      `;
    }

    this._bindEvents();
  }

  _bindEvents() {
    this.rootEl.querySelector("#btn-close-acc")?.addEventListener("click", () => this.close());

    this.rootEl.querySelectorAll("[data-auth-tab]").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (this.busy) return;
        this.authMode = btn.dataset.authTab;
        this.message = "";
        this.render();
      });
    });

    this.rootEl.querySelector("#acc-auth-form")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (this.busy) return;
      this.busy = true;
      this.message = "";
      this.isError = false;
      this.render();

      try {
        if (this.authMode === "register") {
          const username = this.rootEl.querySelector("#inp-username")?.value ?? "";
          const daoHieu = this.rootEl.querySelector("#inp-daohieu")?.value ?? "";
          const email = this.rootEl.querySelector("#inp-email")?.value ?? "";
          const password = this.rootEl.querySelector("#inp-password")?.value ?? "";
          await this.account.register({ username, email, password, daoHieu });
          this.sfx?.play("fusionSuccess");
          this.message = "Đăng ký & sao lưu toàn bộ tiến trình lên đám mây thành công!";
        } else {
          const identifier = this.rootEl.querySelector("#inp-identifier")?.value ?? "";
          const password = this.rootEl.querySelector("#inp-password")?.value ?? "";
          await this.account.login({ identifier, password });
          this.sfx?.play("pickup");
          this.message = "Đăng nhập thành công! Đã đồng bộ hồ sơ Đạo Tịch từ đám mây.";
        }
      } catch (err) {
        this.isError = true;
        this.message = err.message;
        this.sfx?.play("hurt");
      } finally {
        this.busy = false;
        this.render();
      }
    });

    this.rootEl.querySelector("#btn-rename-daohieu")?.addEventListener("click", () => {
      const val = this.rootEl.querySelector("#inp-rename-daohieu")?.value ?? "";
      this.account.setDaoHieu(val);
      this.message = "Đã cập nhật Đạo Hiệu và xếp lịch đồng bộ.";
      this.isError = false;
      this.render();
    });

    this.rootEl.querySelector("#btn-cloud-push")?.addEventListener("click", async () => {
      this.busy = true;
      this.render();
      const ok = await this.account.syncCloud();
      this.busy = false;
      this.isError = !ok;
      this.message = ok ? "Đã sao lưu toàn bộ dữ liệu lên Supabase thành công!" : `Lỗi đồng bộ: ${this.account.lastError}`;
      this.render();
    });

    this.rootEl.querySelector("#btn-cloud-pull")?.addEventListener("click", async () => {
      this.busy = true;
      this.render();
      const ok = await this.account.pullFromCloud();
      this.busy = false;
      this.isError = !ok;
      this.message = ok ? "Đã tải bản lưu mới nhất từ đám mây về máy!" : `Lỗi tải về: ${this.account.lastError}`;
      this.render();
    });

    this.rootEl.querySelector("#btn-logout")?.addEventListener("click", () => {
      this.account.logout();
      this.message = "Đã đăng xuất tài khoản.";
      this.isError = false;
      this.render();
    });
  }
}
