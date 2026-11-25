import { getRealmInfo } from "../account/AccountManager.js";
import {
  BACK_ITEMS,
  EYE_COLORS,
  HAIR_COLORS,
  HAIR_STYLES,
  HEADGEARS,
  OUTFIT_COLORS,
  OUTFIT_STYLES,
  SKIN_TONES,
  TRIM_COLORS,
  createDefaultAppearance,
  drawCustomCharacterPreview,
  normalizeAppearance,
  randomizeAppearance,
} from "../character/CharacterSpriteBuilder.js";
import { GU_CATALOG } from "../combat/GuDatabase.js";

const STARTER_FAVORITES = ["nguyet_quang", "huyet_nha", "thanh_doc", "hoa_than"];

/**
 * Hệ thống Cổng Online & Tùy Chỉnh Nhân Vật:
 * - `login`: Đăng nhập / Đăng ký tài khoản Online (+ chế độ Khách).
 * - `char_select`: 3 Bệ Đá nhân vật tùy chỉnh, hiển thị Đạo Lộ do Hợp Cổ định hình, vào thẳng Vạn Cổ Thành Online.
 * - `char_create` / `appearance_mirror`: Xưởng Tạo Ngoại Hình Pixel Art 7 lớp + xem trước chuyển động trực tiếp.
 * - `dungeon_select`: Cổng Bí Cảnh chọn Tầng 1 / 2 / 3 từ Vạn Cổ Thành.
 * - `leaderboard`: Bia Thiên Kiêu Online hiển thị Top Cổ Sư toàn máy chủ & Không Khiếu của họ.
 */
export class GateScreens {
  constructor({
    overlayRoot,
    account,
    onlineHub,
    sfx,
    onEnterTown,
    onEnterDungeon,
    onResumeRun,
    onAppearanceUpdated,
    onCloseToWorld,
    onOpenAccountModal,
  }) {
    this.root = overlayRoot;
    this.account = account;
    this.onlineHub = onlineHub;
    this.sfx = sfx;
    this.onEnterTown = onEnterTown;
    this.onEnterDungeon = onEnterDungeon;
    this.onResumeRun = onResumeRun;
    this.onAppearanceUpdated = onAppearanceUpdated;
    this.onCloseToWorld = onCloseToWorld;
    this.onOpenAccountModal = onOpenAccountModal;

    this.screen = "login";
    this.authTab = "login";
    this.authMessage = "";
    this.authError = false;
    this.authBusy = false;

    this.createSlotIndex = 0;
    this.draftName = "";
    this.draftAppearance = createDefaultAppearance();
    this.draftStarterGu = "nguyet_quang";
    this.previewPose = "idle";
    this.customizerCat = "hair"; // "hair" | "outfit" | "detail"
    this.createError = "";

    this.confirmDeleteSlot = null;
    this.endStats = null;

    this._previewRaf = 0;
  }

  _stopPreviewLoop() {
    if (this._previewRaf) {
      cancelAnimationFrame(this._previewRaf);
      this._previewRaf = 0;
    }
  }

  close() {
    this._stopPreviewLoop();
    this.root.classList.remove("is-open");
  }

  openInitialScreen() {
    this.screen = this.account.canEnterLobby() ? "char_select" : "login";
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

  openMirror(currentChar) {
    this.draftName = currentChar?.name ?? "Vô Danh Cổ Sư";
    this.draftAppearance = normalizeAppearance(currentChar?.appearance);
    this.previewPose = "idle";
    this.createError = "";
    this.screen = "appearance_mirror";
    this.render();
  }

  openDungeonSelect() {
    this.screen = "dungeon_select";
    this.render();
  }

  openLeaderboard() {
    this.onlineHub?.pollAll();
    this.screen = "leaderboard";
    this.render();
  }

  openResult(kind, stats) {
    this.screen = kind;
    this.endStats = stats;
    this.render();
  }

  render() {
    this._stopPreviewLoop();
    this.root.classList.add("is-open");

    if (this.screen === "login") return this._renderLoginScreen();
    if (this.screen === "char_select") return this._renderCharSelectScreen();
    if (this.screen === "char_create" || this.screen === "appearance_mirror") {
      return this._renderCustomizerScreen(this.screen === "appearance_mirror");
    }
    if (this.screen === "dungeon_select") return this._renderDungeonSelect();
    if (this.screen === "leaderboard") return this._renderLeaderboard();
    if (this.screen === "victory" || this.screen === "gameover") return this._renderResultScreen();
  }

  _renderLoginScreen() {
    const isReg = this.authTab === "register";
    this.root.innerHTML = `
      <div class="gate-shell gate-shell--login">
        <div class="gate-header-crest">
          <div class="overlay-badge">ONLINE PIXEL ACTION RPG</div>
          <h1 class="overlay-title">LUYỆN CỔ SƯ</h1>
          <p class="gate-sub">Tự tạo ngoại hình Cổ Sư · Dung hợp vạn Cổ tự định Con Đường · Hội tụ Vạn Cổ Thành Online</p>
        </div>

        <div class="gate-panel gate-panel--auth">
          <div class="gate-tabs">
            <button type="button" class="tab-btn ${!isReg ? "is-active" : ""}" data-gate-tab="login">🔑 Đăng Nhập Online</button>
            <button type="button" class="tab-btn ${isReg ? "is-active" : ""}" data-gate-tab="register">📜 Đăng Ký Tài Khoản</button>
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
                <span>Email khôi phục (tùy chọn)</span>
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
                    ? "⏳ Đang kết nối Máy Chủ..."
                    : isReg
                      ? "✨ Tạo Tài Khoản & Vào Chọn Nhân Vật"
                      : "☁️ Đăng Nhập Vào Máy Chủ"
                }
              </button>
              <button type="button" id="gate-guest-btn" class="mini-hud-btn gate-btn-guest" ${this.authBusy ? "disabled" : ""}>
                ⚡ Chơi Thử Offline (Lưu Trên Máy)
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
      ? `🌐 Máy chủ Vạn Cổ · Tài khoản: <b>${this.account.profile.username ?? "Đạo Hữu"}</b>`
      : `📴 Chế độ Khách (Đăng nhập để hiện diện Online cùng người chơi khác)`;

    const slotsHtml = [0, 1, 2]
      .map((slotIdx) => {
        const ch = this.account.characters[slotIdx];
        if (!ch) {
          return `
            <div class="pedestal-card pedestal-card--empty">
              <div class="pedestal-slot-badge">Linh Đài #${slotIdx + 1}</div>
              <div class="pedestal-altar-empty">
                <canvas class="pedestal-canvas" data-slot-canvas="${slotIdx}" width="80" height="80"></canvas>
                <div class="pedestal-empty-hint">Chưa Khai Mở Nhân Vật</div>
              </div>
              <button type="button" class="overlay-btn pedestal-create-btn" data-create-slot="${slotIdx}">
                ✨ Tự Tạo Nhân Vật Mới
              </button>
            </div>
          `;
        }

        const realm = getRealmInfo(ch.cultivation_exp ?? 0);
        const pathName = ch.path_name || "Khởi Nguyên Cổ Đạo";
        const pathCol = ch.path_color || "#4de6b0";
        const guCount = Array.isArray(ch.saved_bag) ? ch.saved_bag.length : 6;
        const hasRun = Boolean(ch.active_run);
        const isConfirmDel = this.confirmDeleteSlot === slotIdx;

        return `
          <div class="pedestal-card is-occupied" style="--sect-col:${pathCol}">
            <div class="pedestal-top-row">
              <span class="pedestal-slot-badge" style="color:${pathCol}">☯ ${pathName}</span>
              <button type="button" class="pedestal-del-btn ${isConfirmDel ? "is-armed" : ""}" data-delete-slot="${slotIdx}">
                ${isConfirmDel ? "Xác Nhận?" : "🗑"}
              </button>
            </div>

            <div class="pedestal-hero-wrap">
              <canvas class="pedestal-canvas" data-slot-canvas="${slotIdx}" width="80" height="80"></canvas>
            </div>

            <div class="pedestal-name">${ch.name}</div>
            <div class="pedestal-realm">${realm.title} · 💎 ${ch.nguyen_thach ?? 0} · 🪲 ${guCount} Cổ</div>

            <div class="pedestal-actions">
              ${
                hasRun
                  ? `<button type="button" class="overlay-btn pedestal-play-btn is-resume" data-resume-slot="${slotIdx}">
                      ▶️ Tiếp Tục Tầng ${ch.active_run.floorNumber}
                    </button>`
                  : ""
              }
              <button type="button" class="overlay-btn pedestal-play-btn" data-town-slot="${slotIdx}">
                🏯 Vào Vạn Cổ Thành Online
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
            <span class="gate-brand">LUYỆN CỔ SƯ ONLINE</span>
            <span class="gate-acc-info">${accLabel}</span>
          </div>
          <div class="gate-topbar-right">
            ${
              isOnline
                ? `<button type="button" id="gate-profile-btn" class="mini-hud-btn">📜 Đạo Tịch</button>`
                : ""
            }
            <button type="button" id="gate-switch-acc-btn" class="mini-hud-btn">
              ${isOnline ? "🚪 Đổi Tài Khoản" : "🔑 Đăng Nhập Online"}
            </button>
          </div>
        </div>

        <div class="gate-pedestals">
          ${slotsHtml}
        </div>
      </div>
    `;

    // Vẽ hoạt ảnh thở/đứng liên tục cho 3 bệ nhân vật
    const startTs = performance.now();
    const animatePedestals = (now) => {
      const t = (now - startTs) / 1000;
      this.root.querySelectorAll("[data-slot-canvas]").forEach((c) => {
        const idx = Number(c.dataset.slotCanvas);
        const ch = this.account.characters[idx];
        drawCustomCharacterPreview(c, ch?.appearance ?? null, {
          timeSec: t + idx * 0.35,
          pathColor: ch?.path_color ?? "#4de6b0",
          scale: 2,
        });
      });
      this._previewRaf = requestAnimationFrame(animatePedestals);
    };
    this._previewRaf = requestAnimationFrame(animatePedestals);

    this.root.querySelector("#gate-profile-btn")?.addEventListener("click", () => {
      this.onOpenAccountModal?.();
    });

    this.root.querySelector("#gate-switch-acc-btn")?.addEventListener("click", () => {
      if (this.account.isLoggedIn()) this.account.logout();
      else this.account.guestMode = false;
      this.openLogin();
    });

    this.root.querySelectorAll("[data-create-slot]").forEach((btn) => {
      btn.addEventListener("click", () => {
        this.sfx?.unlock();
        this.createSlotIndex = Number(btn.dataset.createSlot) || 0;
        this.draftName = "";
        this.draftAppearance = randomizeAppearance();
        this.draftStarterGu = "nguyet_quang";
        this.previewPose = "idle";
        this.customizerCat = "hair";
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

    this.root.querySelectorAll("[data-resume-slot]").forEach((btn) => {
      btn.addEventListener("click", () => {
        this.sfx?.unlock();
        const idx = Number(btn.dataset.resumeSlot);
        this.close();
        this.onResumeRun?.(idx);
      });
    });

    this.root.querySelectorAll("[data-town-slot]").forEach((btn) => {
      btn.addEventListener("click", () => {
        this.sfx?.unlock();
        const idx = Number(btn.dataset.townSlot);
        this.close();
        this.onEnterTown?.(idx);
      });
    });
  }

  _renderOptionRow(label, list, currentId, attrName, colorProp = null) {
    const chips = list
      .map((item) => {
        const active = item.id === currentId;
        const swatch = colorProp
          ? `<span class="cust-swatch" style="background:${item[colorProp]}"></span>`
          : "";
        return `
          <button type="button" class="cust-chip ${active ? "is-selected" : ""}" data-cust-key="${attrName}" data-cust-val="${item.id}">
            ${swatch}${item.name}
          </button>
        `;
      })
      .join("");
    return `
      <div class="cust-group">
        <div class="cust-label">${label}</div>
        <div class="cust-chips">${chips}</div>
      </div>
    `;
  }

  _renderCustomizerScreen(isMirror = false) {
    const ap = this.draftAppearance;
    let rightControlsHtml = "";

    if (this.customizerCat === "hair") {
      rightControlsHtml =
        this._renderOptionRow("Màu Da", SKIN_TONES, ap.skin, "skin", "base") +
        this._renderOptionRow("Kiểu Tóc Cổ Phong", HAIR_STYLES, ap.hairStyle, "hairStyle") +
        this._renderOptionRow("Màu Tóc", HAIR_COLORS, ap.hairColor, "hairColor", "base") +
        this._renderOptionRow("Mũ / Quán / Mặt Nạ", HEADGEARS, ap.headgear, "headgear");
    } else if (this.customizerCat === "outfit") {
      rightControlsHtml =
        this._renderOptionRow("Phom Y Phục / Chiến Giáp", OUTFIT_STYLES, ap.outfitStyle, "outfitStyle") +
        this._renderOptionRow("Màu Y Phục Chủ Đạo", OUTFIT_COLORS, ap.outfitColor, "outfitColor", "base") +
        this._renderOptionRow("Màu Đai Lưng & Viền Lụa", TRIM_COLORS, ap.trimColor, "trimColor", "base");
    } else {
      const starterSection = isMirror
        ? ""
        : `
          <div class="cust-group">
            <div class="cust-label">Cổ Trùng Khởi Đầu Ưa Thích (Con đường về sau tự do định hình qua Hợp Cổ!)</div>
            <div class="cust-chips">
              ${STARTER_FAVORITES.map((id) => {
                const g = GU_CATALOG[id];
                return `
                  <button type="button" class="cust-chip ${this.draftStarterGu === id ? "is-selected" : ""}" data-pick-starter="${id}">
                    <span class="cust-swatch" style="background:${g.color}"></span>${g.shortLabel} (${g.element})
                  </button>
                `;
              }).join("")}
            </div>
          </div>
        `;
      rightControlsHtml =
        this._renderOptionRow("Linh Đồng (Màu Mắt)", EYE_COLORS, ap.eyeColor, "eyeColor", "hex") +
        this._renderOptionRow("Pháp Khí Đeo Lưng", BACK_ITEMS, ap.backItem, "backItem") +
        starterSection;
    }

    const safeName = this.draftName.replace(/"/g, "&quot;");

    this.root.innerHTML = `
      <div class="gate-shell gate-shell--create">
        <div class="gate-topbar">
          <div class="gate-topbar-left">
            <span class="gate-brand">${isMirror ? "🪞 GƯƠNG HÓA HÌNH · ĐỔI NGOẠI HÌNH" : `✨ TẠO NGOẠI HÌNH CỔ SƯ · Ô #${this.createSlotIndex + 1}`}</span>
            <span class="gate-acc-info">Không khóa môn phái — Tự do biến hóa Đạo Lộ bằng Dung Hợp Cổ!</span>
          </div>
          <button type="button" id="cust-back-btn" class="mini-hud-btn">← Quay Lại</button>
        </div>

        <form id="cust-form" class="gate-create-grid">
          <div class="gate-create-left">
            <div class="create-preview-box create-preview-box--lg">
              <canvas id="cust-preview-canvas" width="96" height="96"></canvas>
            </div>
            <div class="pose-btn-row">
              ${[
                ["idle", "Đứng"],
                ["run", "Chạy"],
                ["dash", "Lướt"],
                ["tau-hoa", "Tẩu Hỏa"],
              ]
                .map(
                  ([id, lbl]) =>
                    `<button type="button" class="floor-pill ${this.previewPose === id ? "is-selected" : ""}" data-pose="${id}">${lbl}</button>`
                )
                .join("")}
              <button type="button" id="btn-random-look" class="floor-pill" style="color:#ffd86e;border-color:#ffd86e">🎲 Ngẫu Nhiên</button>
            </div>
            <label class="acc-field" style="width:100%">
              <span>Đạo Hiệu Nhân Vật (2–18 ký tự) *</span>
              <input id="cust-name-input" type="text" maxlength="18" value="${safeName}" placeholder="Nhập tên nhân vật..." required />
            </label>
          </div>

          <div class="gate-create-right">
            <div class="gate-tabs" style="margin-bottom:6px">
              <button type="button" class="tab-btn ${this.customizerCat === "hair" ? "is-active" : ""}" data-cust-cat="hair">👤 Diện Mạo & Tóc</button>
              <button type="button" class="tab-btn ${this.customizerCat === "outfit" ? "is-active" : ""}" data-cust-cat="outfit">🥋 Đạo Bào & Màu Sắc</button>
              <button type="button" class="tab-btn ${this.customizerCat === "detail" ? "is-active" : ""}" data-cust-cat="detail">⚔️ Pháp Khí & Khởi Nguyên</button>
            </div>

            <div class="cust-scroll-panel">
              ${rightControlsHtml}
            </div>

            ${
              this.createError
                ? `<div class="fusion-result is-fail" style="margin-top:6px">${this.createError}</div>`
                : ""
            }

            <button type="submit" class="overlay-btn gate-btn-primary" style="margin-top:8px;width:100%">
              ${isMirror ? "✨ Lưu Diện Mạo Mới & Trở Lại Thành" : "🔥 Hoàn Tất Hóa Hình & Vào Vạn Cổ Thành Online"}
            </button>
          </div>
        </form>
      </div>
    `;

    const previewCanvas = this.root.querySelector("#cust-preview-canvas");
    const startTs = performance.now();
    const tickPreview = (now) => {
      drawCustomCharacterPreview(previewCanvas, this.draftAppearance, {
        animState: this.previewPose,
        timeSec: (now - startTs) / 1000,
        scale: 2.5,
      });
      this._previewRaf = requestAnimationFrame(tickPreview);
    };
    this._previewRaf = requestAnimationFrame(tickPreview);

    const nameInput = this.root.querySelector("#cust-name-input");
    nameInput?.addEventListener("input", () => {
      this.draftName = nameInput.value;
    });

    this.root.querySelector("#cust-back-btn")?.addEventListener("click", () => {
      if (isMirror) {
        this.close();
        this.onCloseToWorld?.();
      } else {
        this.openCharSelect();
      }
    });

    this.root.querySelector("#btn-random-look")?.addEventListener("click", () => {
      this.draftAppearance = randomizeAppearance();
      this.render();
    });

    this.root.querySelectorAll("[data-pose]").forEach((btn) => {
      btn.addEventListener("click", () => {
        this.previewPose = btn.dataset.pose;
        this.render();
      });
    });

    this.root.querySelectorAll("[data-cust-cat]").forEach((btn) => {
      btn.addEventListener("click", () => {
        this.customizerCat = btn.dataset.custCat;
        this.render();
      });
    });

    this.root.querySelectorAll("[data-cust-key]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const key = btn.dataset.custKey;
        const val = btn.dataset.custVal;
        this.draftAppearance = normalizeAppearance({
          ...this.draftAppearance,
          [key]: val,
        });
        this.render();
      });
    });

    this.root.querySelectorAll("[data-pick-starter]").forEach((btn) => {
      btn.addEventListener("click", () => {
        this.draftStarterGu = btn.dataset.pickStarter;
        this.render();
      });
    });

    this.root.querySelector("#cust-form")?.addEventListener("submit", (e) => {
      e.preventDefault();
      this.sfx?.unlock();
      const enteredName = (this.root.querySelector("#cust-name-input")?.value ?? "").trim();
      if (enteredName.length < 2) {
        this.createError = "Đạo hiệu nhân vật cần từ 2 đến 18 ký tự.";
        this.render();
        return;
      }

      if (isMirror) {
        const updated = this.account.updateCharacterAppearance(this.draftAppearance, enteredName);
        this.close();
        this.onAppearanceUpdated?.(updated);
        return;
      }

      try {
        this.account.createCharacter(this.createSlotIndex, {
          name: enteredName,
          appearance: this.draftAppearance,
          starterGuId: this.draftStarterGu,
        });
        this.close();
        this.onEnterTown?.(this.createSlotIndex);
      } catch (err) {
        this.createError = err?.message || "Không thể tạo nhân vật.";
        this.render();
      }
    });
  }

  _renderDungeonSelect() {
    const ch = this.account.getActiveCharacter();
    const maxFloor = Math.min(3, Math.max(1, ch?.highest_floor_unlocked ?? 1));

    this.root.innerHTML = `
      <div class="overlay-card" style="max-width:520px">
        <div class="overlay-badge">CỔNG BÍ CẢNH TAM TẦNG</div>
        <div class="overlay-title">CHỌN TẦNG CHINH PHỤC</div>
        <div class="overlay-sub">
          Toàn bộ Cổ Trùng bạn đã dung hợp, Nguyên Thạch & Cổ Trùng nhặt được trong Bí Cảnh sẽ được bảo toàn cho nhân vật <b>${ch?.name ?? "Cổ Sư"}</b>!
        </div>
        <div class="overlay-btn-row" style="flex-direction:column">
          <button type="button" class="overlay-btn" data-go-floor="1">🌲 Tầng 1 · Rừng Chướng Khí (Boss Ngô Công Vương)</button>
          <button type="button" class="overlay-btn" data-go-floor="2" ${maxFloor < 2 ? "disabled" : ""}>
            ${maxFloor < 2 ? "🔒 Tầng 2 · Bạch Cốt Mộ Địa (Diệt Boss T1 để mở)" : "💀 Tầng 2 · Bạch Cốt Mộ Địa (Boss Mạc Vô Tâm)"}
          </button>
          <button type="button" class="overlay-btn" data-go-floor="3" ${maxFloor < 3 ? "disabled" : ""}>
            ${maxFloor < 3 ? "🔒 Tầng 3 · Xích Viêm Cổ Quật (Diệt Boss T2 để mở)" : "🌋 Tầng 3 · Xích Viêm Cổ Quật (Boss Vạn Cổ Tà Lô)"}
          </button>
          <button type="button" id="btn-cancel-dungeon" class="mini-hud-btn" style="padding:8px">← Ở Lại Vạn Cổ Thành</button>
        </div>
      </div>
    `;

    this.root.querySelector("#btn-cancel-dungeon")?.addEventListener("click", () => {
      this.close();
      this.onCloseToWorld?.();
    });

    this.root.querySelectorAll("[data-go-floor]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const floor = Number(btn.dataset.goFloor) || 1;
        this.close();
        this.onEnterDungeon?.(floor);
      });
    });
  }

  _renderLeaderboard() {
    const rows = this.onlineHub?.leaderboard ?? [];
    const listHtml =
      rows.length === 0
        ? `<div class="overlay-sub">Đang tải danh sách Thiên Kiêu từ Máy Chủ...</div>`
        : rows
            .map((r, i) => {
              const realm = getRealmInfo(r.cultivation_exp ?? 0);
              const guTags = Array.isArray(r.equipped_summary)
                ? r.equipped_summary
                    .map((g) => `<span class="rank-gu-pill" style="border-color:${g.color || "#4de6b0"}">${g.shortLabel || g.name}</span>`)
                    .join("")
                : "";
              return `
                <div class="rank-row">
                  <div class="rank-num">#${i + 1}</div>
                  <canvas class="rank-avatar" data-rank-idx="${i}" width="44" height="44"></canvas>
                  <div class="rank-info">
                    <div>
                      <strong>${r.name}</strong>
                      <span style="color:${r.path_color || "#4de6b0"};font-size:10px;font-weight:700"> · [${r.path_name || "Tán Tu"}]</span>
                    </div>
                    <div style="font-size:9.5px;color:#968fa3">${realm.title} (${r.cultivation_exp} Tu Vi) · Trảm ${r.bosses_slain} Cổ Vương</div>
                    <div class="rank-gu-list">${guTags}</div>
                  </div>
                </div>
              `;
            })
            .join("");

    this.root.innerHTML = `
      <div class="gate-shell" style="max-width:620px">
        <div class="gate-topbar">
          <div class="gate-topbar-left">
            <span class="gate-brand">🏆 BIA THIÊN KIÊU ONLINE</span>
            <span class="gate-acc-info">Đang hiện diện Online: <b>${this.onlineHub?.onlineCount ?? 1}</b> Cổ Sư</span>
          </div>
          <button type="button" id="btn-close-rank" class="mini-hud-btn">✕ Đóng</button>
        </div>
        <div class="rank-list-wrap">${listHtml}</div>
      </div>
    `;

    this.root.querySelectorAll("[data-rank-idx]").forEach((c) => {
      const idx = Number(c.dataset.rankIdx);
      const r = rows[idx];
      if (r) {
        drawCustomCharacterPreview(c, r.appearance, {
          pathColor: r.path_color || "#4de6b0",
          scale: 1.25,
        });
      }
    });

    this.root.querySelector("#btn-close-rank")?.addEventListener("click", () => {
      this.close();
      this.onCloseToWorld?.();
    });
  }

  _renderResultScreen() {
    const ch = this.account.getActiveCharacter();
    const isWin = this.screen === "victory";
    const kills = this.endStats?.kills ?? 0;
    const floorName = this.endStats?.floorName ?? "Bí Cảnh";

    this.root.innerHTML = `
      <div class="overlay-card">
        <div class="overlay-title" style="color:${isWin ? "#4de6b0" : "#ff3855"}">
          ${isWin ? "ĐẠI THÀNH CỔ TÔN!" : "HỒI THÀNH DƯỠNG THƯƠNG"}
        </div>
        <div class="overlay-sub">
          ${
            isWin
              ? `<b>${ch?.name ?? "Cổ Sư"}</b> (${ch?.path_name ?? "Tán Tu"}) đã phá nát Vạn Cổ Tà Lô! Trảm ${kills} yêu trùng.`
              : `Huyết Khí cạn tại ${floorName}. Toàn bộ Cổ Trùng đã luyện & Nguyên Thạch của <b>${ch?.name ?? "Cổ Sư"}</b> vẫn được bảo toàn nguyên vẹn!`
          }
        </div>
        <div class="overlay-btn-row">
          <button type="button" id="res-back-town" class="overlay-btn">🏯 Trở Về Vạn Cổ Thành Online</button>
          <button type="button" id="res-retry-floor" class="mini-hud-btn" style="padding:9px 14px;font-size:12px">⚔️ Tái Chiến Tầng 1</button>
        </div>
      </div>
    `;

    this.root.querySelector("#res-back-town")?.addEventListener("click", () => {
      this.sfx?.unlock();
      this.close();
      if (this.account.activeSlotIndex !== null) {
        this.onEnterTown?.(this.account.activeSlotIndex);
      } else {
        this.openCharSelect();
      }
    });

    this.root.querySelector("#res-retry-floor")?.addEventListener("click", () => {
      this.sfx?.unlock();
      this.close();
      this.onEnterDungeon?.(1);
    });
  }
}
