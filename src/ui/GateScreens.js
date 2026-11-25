import {
  getRealmInfo,
  ROBE_STYLES,
  SECTS,
} from "../account/AccountManager.js";
import { drawSheetFrame } from "../engine/SpriteSheet.js";
import { GU_CATALOG } from "../combat/GuDatabase.js";

/**
 * Màn hình Cổng Game phong cách Ninja School:
 * 1) Đăng Nhập / Đăng Ký / Chơi Thử Cục Bộ
 * 2) Chọn Nhân Vật (3 bệ đá cạnh nhau + xem trước pixel art + Tiếp Tục / Chọn Tầng / Xóa 2 bước)
 * 3) Tạo Nhân Vật Mới (Đạo hiệu, chọn 1 trong 3 Tông Môn, chọn 3 Y Phục)
 */
export class GateScreens {
  constructor({
    overlayRoot,
    account,
    assets,
    sfx,
    onEnterGame,
    onOpenAccountModal,
  }) {
    this.root = overlayRoot;
    this.account = account;
    this.assets = assets;
    this.sfx = sfx;
    this.onEnterGame = onEnterGame;
    this.onOpenAccountModal = onOpenAccountModal;

    this.screen = "login"; // "login" | "char_select" | "char_create" | "victory" | "gameover"
    this.authTab = "login";
    this.authMessage = "";
    this.authError = false;
    this.authBusy = false;

    this.createSlotIndex = 0;
    this.draftName = "";
    this.draftSect = "thanh_nguyet";
    this.draftRobe = "jade";
    this.createError = "";

    this.confirmDeleteSlot = null;
    this.selectedFloors = [1, 1, 1];
    this.endStats = null;
  }

  openInitialScreen() {
    if (this.account.canEnterLobby()) {
      this.screen = "char_select";
    } else {
      this.screen = "login";
    }
    this.render();
  }

  openCharSelect() {
    this.confirmDeleteSlot = null;
    this.screen = "char_select";
    this.render();
  }

  openLogin() {
    this.authMessage = "";
    this.authError = false;
    this.screen = "login";
    this.render();
  }

  openResult(kind, stats) {
    this.screen = kind; // "victory" | "gameover"
    this.endStats = stats;
    this.render();
  }

  render() {
    this.root.classList.add("is-open");

    if (this.screen === "login") {
      this._renderLoginScreen();
      return;
    }
    if (this.screen === "char_select") {
      this._renderCharSelectScreen();
      return;
    }
    if (this.screen === "char_create") {
      this._renderCharCreateScreen();
      return;
    }
    if (this.screen === "victory" || this.screen === "gameover") {
      this._renderResultScreen();
    }
  }

  _renderLoginScreen() {
    const isReg = this.authTab === "register";
    this.root.innerHTML = `
      <div class="gate-shell gate-shell--login">
        <div class="gate-header-crest">
          <div class="overlay-badge">DARK FANTASY PIXEL ROGUELIKE</div>
          <h1 class="overlay-title">LUYỆN CỔ SƯ</h1>
          <p class="gate-sub">Đăng nhập tài khoản để đồng bộ 3 nhân vật & tiến trình lên Đám Mây</p>
        </div>

        <div class="gate-panel gate-panel--auth">
          <div class="gate-tabs">
            <button type="button" class="tab-btn ${!isReg ? "is-active" : ""}" data-gate-tab="login">🔑 Đăng Nhập</button>
            <button type="button" class="tab-btn ${isReg ? "is-active" : ""}" data-gate-tab="register">📜 Tạo Tài Khoản</button>
          </div>

          <form id="gate-auth-form" class="acc-form">
            ${
              isReg
                ? `
              <label class="acc-field">
                <span>Tên tài khoản (3–24 ký tự viết liền) *</span>
                <input id="gate-username" type="text" autocomplete="username" placeholder="vd: cosu99" required />
              </label>
              <label class="acc-field">
                <span>Email khôi phục (không bắt buộc)</span>
                <input id="gate-email" type="email" autocomplete="email" placeholder="cosu@example.com" />
              </label>
            `
                : `
              <label class="acc-field">
                <span>Tên tài khoản hoặc Email *</span>
                <input id="gate-identifier" type="text" autocomplete="username" placeholder="Nhập tài khoản hoặc email" required />
              </label>
            `
            }
            <label class="acc-field">
              <span>Mật khẩu (từ 6 ký tự) *</span>
              <input id="gate-password" type="password" autocomplete="current-password" placeholder="••••••" required />
            </label>

            ${
              this.authMessage
                ? `<div class="fusion-result ${this.authError ? "is-fail" : "is-success"}">${this.authMessage}</div>`
                : ""
            }

            <div class="gate-auth-actions">
              <button type="submit" class="overlay-btn gate-btn-primary" ${this.authBusy ? "disabled" : ""}>
                ${
                  this.authBusy
                    ? "⏳ Đang kết nối..."
                    : isReg
                      ? "✨ Đăng Ký & Vào Chọn Nhân Vật"
                      : "☁️ Đăng Nhập"
                }
              </button>
              <button type="button" id="gate-guest-btn" class="mini-hud-btn gate-btn-guest" ${this.authBusy ? "disabled" : ""}>
                ⚡ Chơi Nhanh (Lưu Máy)
              </button>
            </div>
          </form>
        </div>
      </div>
    `;

    this.root.querySelectorAll("[data-gate-tab]").forEach((btn) => {
      btn.addEventListener("click", () => {
        this.authTab = btn.dataset.gateTab;
        this.authMessage = "";
        this.authError = false;
        this.render();
      });
    });

    this.root.querySelector("#gate-guest-btn")?.addEventListener("click", () => {
      this.sfx?.unlock();
      this.account.playOfflineGuest();
      this.screen = "char_select";
      this.render();
    });

    this.root.querySelector("#gate-auth-form")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (this.authBusy) return;
      this.sfx?.unlock();
      this.authBusy = true;
      this.authMessage = "";
      this.authError = false;
      const password = this.root.querySelector("#gate-password")?.value ?? "";

      try {
        if (this.authTab === "register") {
          const username = this.root.querySelector("#gate-username")?.value ?? "";
          const email = this.root.querySelector("#gate-email")?.value ?? "";
          this.render();
          await this.account.register({ username, email, password });
        } else {
          const identifier = this.root.querySelector("#gate-identifier")?.value ?? "";
          this.render();
          await this.account.login({ identifier, password });
        }
        this.authBusy = false;
        this.screen = "char_select";
        this.render();
      } catch (err) {
        this.authBusy = false;
        this.authError = true;
        this.authMessage = err?.message || "Kết nối thất bại.";
        this.render();
      }
    });
  }

  _renderCharSelectScreen() {
    const isOnline = this.account.isLoggedIn();
    const accLabel = isOnline
      ? `☁️ Tài khoản: <b>${this.account.profile.username ?? "Đạo Hữu"}</b>`
      : `📴 Chế độ Khách (Lưu trên thiết bị này)`;

    const syncTag = isOnline
      ? this.account.syncStatus === "syncing"
        ? "⏳ Đang đồng bộ..."
        : this.account.syncStatus === "error"
          ? "⚠️ Offline (chờ đồng bộ)"
          : "✓ Cloud Sync"
      : "Lưu cục bộ";

    const slotsHtml = [0, 1, 2]
      .map((slotIdx) => {
        const ch = this.account.characters[slotIdx];
        if (!ch) {
          return `
            <div class="pedestal-card pedestal-card--empty">
              <div class="pedestal-slot-badge">Ô Nhân Vật #${slotIdx + 1}</div>
              <div class="pedestal-altar-empty">
                <canvas class="pedestal-canvas" data-preview-slot="${slotIdx}" width="72" height="72"></canvas>
                <div class="pedestal-empty-hint">Linh Đài Trống</div>
              </div>
              <button type="button" class="overlay-btn pedestal-create-btn" data-create-slot="${slotIdx}">
                ＋ Tạo Nhân Vật
              </button>
            </div>
          `;
        }

        const sect = SECTS[ch.sectId] ?? SECTS.thanh_nguyet;
        const realm = getRealmInfo(ch.cultivation_exp ?? 0);
        const maxFloor = Math.min(3, Math.max(1, ch.highest_floor_unlocked ?? 1));
        const chosenFloor = Math.min(maxFloor, this.selectedFloors[slotIdx] ?? 1);
        const hasRun = Boolean(ch.active_run);
        const isConfirmDel = this.confirmDeleteSlot === slotIdx;

        return `
          <div class="pedestal-card is-occupied" style="--sect-col:${sect.color}">
            <div class="pedestal-top-row">
              <span class="pedestal-slot-badge" style="color:${sect.color}">${sect.badge} ${sect.name}</span>
              <button type="button" class="pedestal-del-btn ${isConfirmDel ? "is-armed" : ""}" data-delete-slot="${slotIdx}">
                ${isConfirmDel ? "Xác Nhận?" : "🗑"}
              </button>
            </div>

            <div class="pedestal-hero-wrap">
              <canvas class="pedestal-canvas" data-preview-slot="${slotIdx}" width="72" height="72"></canvas>
            </div>

            <div class="pedestal-name">${ch.name}</div>
            <div class="pedestal-realm">${realm.title} · 💎 ${ch.nguyen_thach ?? 0}</div>

            <div class="pedestal-floor-picks">
              ${[1, 2, 3]
                .map(
                  (f) => `
                  <button
                    type="button"
                    class="floor-pill ${chosenFloor === f ? "is-selected" : ""}"
                    data-pick-slot="${slotIdx}"
                    data-pick-floor="${f}"
                    ${maxFloor < f ? "disabled" : ""}
                  >
                    ${maxFloor < f ? `🔒T${f}` : `Tầng ${f}`}
                  </button>
                `
                )
                .join("")}
            </div>

            <div class="pedestal-actions">
              ${
                hasRun
                  ? `<button type="button" class="overlay-btn pedestal-play-btn is-resume" data-resume-slot="${slotIdx}">
                      ▶️ Tiếp Tục (T${ch.active_run.floorNumber})
                    </button>`
                  : ""
              }
              <button type="button" class="overlay-btn pedestal-play-btn" data-enter-slot="${slotIdx}">
                ${hasRun ? `⚔️ Mới (T${chosenFloor})` : `⚔️ Nhập Bí Cảnh T${chosenFloor}`}
              </button>
            </div>
          </div>
        `;
      })
      .join("");

    this.root.innerHTML = `
      <div class="gate-shell gate-shell--select">
        <div class="gate-topbar">
          <div class="gate-topbar-left">
            <span class="gate-brand">LUYỆN CỔ SƯ</span>
            <span class="gate-acc-info">${accLabel} · <em>${syncTag}</em></span>
          </div>
          <div class="gate-topbar-right">
            ${
              isOnline
                ? `<button type="button" id="gate-profile-btn" class="mini-hud-btn">📜 Hồ Sơ</button>`
                : ""
            }
            <button type="button" id="gate-switch-acc-btn" class="mini-hud-btn">
              ${isOnline ? "🚪 Đổi Tài Khoản" : "🔑 Đăng Nhập Cloud"}
            </button>
          </div>
        </div>

        <div class="gate-pedestals">
          ${slotsHtml}
        </div>
      </div>
    `;

    this._paintAllPedestalCanvases();

    this.root.querySelector("#gate-profile-btn")?.addEventListener("click", () => {
      this.onOpenAccountModal?.();
    });

    this.root.querySelector("#gate-switch-acc-btn")?.addEventListener("click", () => {
      if (this.account.isLoggedIn()) {
        this.account.logout();
      } else {
        this.account.guestMode = false;
      }
      this.openLogin();
    });

    this.root.querySelectorAll("[data-create-slot]").forEach((btn) => {
      btn.addEventListener("click", () => {
        this.sfx?.unlock();
        this.createSlotIndex = Number(btn.dataset.createSlot) || 0;
        this.draftName = "";
        this.draftSect = "thanh_nguyet";
        this.draftRobe = SECTS.thanh_nguyet.robeDefault;
        this.createError = "";
        this.screen = "char_create";
        this.render();
      });
    });

    this.root.querySelectorAll("[data-delete-slot]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const idx = Number(btn.dataset.deleteSlot);
        if (this.confirmDeleteSlot === idx) {
          this.confirmDeleteSlot = null;
          this.account.deleteCharacter(idx);
          this.render();
        } else {
          this.confirmDeleteSlot = idx;
          this.render();
        }
      });
    });

    this.root.querySelectorAll("[data-pick-slot]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const idx = Number(btn.dataset.pickSlot);
        const f = Number(btn.dataset.pickFloor);
        this.selectedFloors[idx] = f;
        this.render();
      });
    });

    this.root.querySelectorAll("[data-resume-slot]").forEach((btn) => {
      btn.addEventListener("click", () => {
        this.sfx?.unlock();
        const idx = Number(btn.dataset.resumeSlot);
        this.account.selectCharacter(idx);
        this.onEnterGame?.({ slotIndex: idx, resumeRun: true });
      });
    });

    this.root.querySelectorAll("[data-enter-slot]").forEach((btn) => {
      btn.addEventListener("click", () => {
        this.sfx?.unlock();
        const idx = Number(btn.dataset.enterSlot);
        const floor = this.selectedFloors[idx] ?? 1;
        this.account.selectCharacter(idx);
        this.onEnterGame?.({ slotIndex: idx, resumeRun: false, floorNumber: floor });
      });
    });
  }

  _renderCharCreateScreen() {
    const sectCards = Object.values(SECTS)
      .map((s) => {
        const g1 = GU_CATALOG[s.starterSkill1]?.shortLabel ?? s.starterSkill1;
        const g2 = GU_CATALOG[s.starterSkill2]?.shortLabel ?? s.starterSkill2;
        const selected = this.draftSect === s.id;
        return `
          <button type="button" class="sect-card ${selected ? "is-selected" : ""}" style="--sect-col:${s.color}" data-pick-sect="${s.id}">
            <div class="sect-card-head">
              <strong>${s.badge} ${s.name}</strong>
              <span>${s.title}</span>
            </div>
            <div class="sect-card-bonus">${s.bonusText}</div>
            <div class="sect-card-gu">Cổ Trùng chính: ${g1} · ${g2}</div>
          </button>
        `;
      })
      .join("");

    const robePills = Object.values(ROBE_STYLES)
      .map(
        (r) => `
          <button type="button" class="robe-pill ${this.draftRobe === r.id ? "is-selected" : ""}" style="--robe-col:${r.auraColor}" data-pick-robe="${r.id}">
            <span class="robe-swatch" style="background:${r.auraColor}"></span>
            ${r.name}
          </button>
        `
      )
      .join("");

    this.root.innerHTML = `
      <div class="gate-shell gate-shell--create">
        <div class="gate-topbar">
          <div class="gate-topbar-left">
            <span class="gate-brand">KHAI MỞ LINH KHIẾU · Ô #${this.createSlotIndex + 1}</span>
          </div>
          <button type="button" id="gate-back-select" class="mini-hud-btn">← Quay Lại</button>
        </div>

        <form id="gate-create-form" class="gate-create-grid">
          <div class="gate-create-left">
            <div class="create-preview-box">
              <canvas id="create-preview-canvas" width="84" height="84"></canvas>
            </div>
            <label class="acc-field" style="width:100%">
              <span>Đạo Hiệu Nhân Vật (2–18 ký tự) *</span>
              <input id="create-name-input" type="text" maxlength="18" value="${this.draftName}" placeholder="vd: Hàn Lập / Huyết Độc Tử" required />
            </label>
            <div class="robe-picker-block">
              <div class="section-title" style="margin-bottom:4px">Chọn Y Phục Cổ Sư</div>
              <div class="robe-pills-row">${robePills}</div>
            </div>
          </div>

          <div class="gate-create-right">
            <div class="section-title" style="margin-bottom:4px">Chọn Tông Môn Khởi Nguyên</div>
            <div class="sect-list">${sectCards}</div>
            ${
              this.createError
                ? `<div class="fusion-result is-fail" style="margin-top:6px">${this.createError}</div>`
                : ""
            }
            <button type="submit" class="overlay-btn gate-btn-primary" style="margin-top:8px;width:100%">
              🔥 Tạo Cổ Sư & Bước Vào Bí Cảnh
            </button>
          </div>
        </form>
      </div>
    `;

    const createCanvas = this.root.querySelector("#create-preview-canvas");
    if (createCanvas) {
      this._drawPreviewSprite(createCanvas, {
        sectId: this.draftSect,
        robeStyle: this.draftRobe,
      });
    }

    const nameInput = this.root.querySelector("#create-name-input");
    nameInput?.addEventListener("input", () => {
      this.draftName = nameInput.value;
    });

    this.root.querySelector("#gate-back-select")?.addEventListener("click", () => {
      this.openCharSelect();
    });

    this.root.querySelectorAll("[data-pick-sect]").forEach((btn) => {
      btn.addEventListener("click", () => {
        this.draftSect = btn.dataset.pickSect;
        this.draftRobe = SECTS[this.draftSect]?.robeDefault ?? this.draftRobe;
        this.render();
      });
    });

    this.root.querySelectorAll("[data-pick-robe]").forEach((btn) => {
      btn.addEventListener("click", () => {
        this.draftRobe = btn.dataset.pickRobe;
        this.render();
      });
    });

    this.root.querySelector("#gate-create-form")?.addEventListener("submit", (e) => {
      e.preventDefault();
      this.sfx?.unlock();
      const enteredName = (this.root.querySelector("#create-name-input")?.value ?? "").trim();
      if (enteredName.length < 2) {
        this.createError = "Vui lòng nhập Đạo Hiệu ít nhất 2 ký tự.";
        this.render();
        return;
      }
      try {
        this.account.createCharacter(this.createSlotIndex, {
          name: enteredName,
          sectId: this.draftSect,
          robeStyle: this.draftRobe,
        });
        this.onEnterGame?.({
          slotIndex: this.createSlotIndex,
          resumeRun: false,
          floorNumber: 1,
        });
      } catch (err) {
        this.createError = err?.message || "Không thể tạo nhân vật.";
        this.render();
      }
    });
  }

  _renderResultScreen() {
    const ch = this.account.getActiveCharacter();
    const isWin = this.screen === "victory";
    const kills = this.endStats?.kills ?? 0;
    const floorName = this.endStats?.floorName ?? "Bí Cảnh";
    const recipes = ch?.unlocked_recipes?.length ?? this.account.profile.unlocked_recipes.length ?? 0;

    this.root.innerHTML = `
      <div class="overlay-card">
        <div class="overlay-title" style="color:${isWin ? "#4de6b0" : "#ff3855"}">
          ${isWin ? "ĐẠI THÀNH CỔ TÔN!" : "ĐẠO TÂM TAN VỠ"}
        </div>
        <div class="overlay-sub">
          ${
            isWin
              ? `<b>${ch?.name ?? "Cổ Sư"}</b> đã phá nát Vạn Cổ Tà Lô, chinh phục Tam Tầng Bí Cảnh.<br/>Quái đã trảm: ${kills} · Cổ Phương mở khóa: ${recipes}/3.`
              : `Huyết Khí của <b>${ch?.name ?? "Cổ Sư"}</b> đã cạn tại ${floorName}.<br/>Tu Vi, Nguyên Thạch & Cổ Phương (${recipes}/3) đã được lưu vào Đạo Tịch!`
          }
        </div>
        <div class="overlay-btn-row">
          <button type="button" id="res-retry-btn" class="overlay-btn">
            ${isWin ? "🔄 Chinh Phục Lại Tầng 1" : "🔄 Tái Nhập Bí Cảnh"}
          </button>
          <button type="button" id="res-char-select-btn" class="mini-hud-btn" style="padding:9px 14px;font-size:12px">
            🏯 Về Bệ Chọn Nhân Vật
          </button>
        </div>
      </div>
    `;

    this.root.querySelector("#res-retry-btn")?.addEventListener("click", () => {
      this.sfx?.unlock();
      if (this.account.activeSlotIndex !== null) {
        this.onEnterGame?.({
          slotIndex: this.account.activeSlotIndex,
          resumeRun: false,
          floorNumber: 1,
        });
      } else {
        this.openCharSelect();
      }
    });

    this.root.querySelector("#res-char-select-btn")?.addEventListener("click", () => {
      this.openCharSelect();
    });
  }

  _paintAllPedestalCanvases() {
    this.root.querySelectorAll("[data-preview-slot]").forEach((canvas) => {
      const idx = Number(canvas.dataset.previewSlot);
      const ch = this.account.characters[idx];
      this._drawPreviewSprite(canvas, ch);
    });
  }

  _drawPreviewSprite(canvas, charData) {
    const ctx = canvas.getContext("2d");
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.imageSmoothingEnabled = false;

    // Bệ đá cổ phong ở đáy canvas
    const cx = Math.floor(w * 0.5);
    const footY = Math.floor(h * 0.8);

    if (!charData) {
      ctx.fillStyle = "rgba(156, 122, 68, 0.18)";
      ctx.beginPath();
      ctx.ellipse(cx, footY, 22, 7, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(156, 122, 68, 0.45)";
      ctx.stroke();
      return;
    }

    const sect = SECTS[charData.sectId] ?? SECTS.thanh_nguyet;
    const robe = ROBE_STYLES[charData.robeStyle] ?? ROBE_STYLES.jade;

    // Vòng hào quang tông môn & y phục
    ctx.fillStyle = robe.accentColor;
    ctx.beginPath();
    ctx.ellipse(cx, footY, 22, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = robe.auraColor;
    ctx.stroke();

    const sheet = this.assets?.get("characters/co-su-idle");
    if (sheet && sheet.image && sheet.frames?.length > 0) {
      drawSheetFrame(ctx, sheet, 0, cx, footY - 4, {
        scale: Math.min(2, w / 36),
      });
      // Đính dấu tông môn nhỏ trên góc bệ
      ctx.fillStyle = sect.color;
      ctx.fillRect(cx - 8, footY + 4, 16, 2);
      return;
    }

    // Fallback pixel art nếu PNG chưa load xong (vẫn hiện sắc nét ngay lập tức!)
    const px = (dx, dy, col, pw = 2, ph = 2) => {
      ctx.fillStyle = col;
      ctx.fillRect(cx + dx * 2, footY - 26 + dy * 2, pw * 2, ph * 2);
    };
    px(-4, 0, "#d6b16a", 8, 2); // Nón/trâm cổ phong
    px(-3, 2, "#ecd7b8", 6, 4); // Khuôn mặt
    px(-4, 6, robe.accentColor, 8, 7); // Đạo bào
    px(-4, 6, robe.auraColor, 2, 7); // Viền áo
    px(2, 6, robe.trimColor, 2, 7); // Dải lụa
    px(-3, 13, "#1a1724", 2, 3);
    px(1, 13, "#1a1724", 2, 3);
  }
}
