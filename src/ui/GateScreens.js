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
import { GAME_HEIGHT, GAME_WIDTH } from "../config/constants.js";
import { CULTIVATION_PATHS, getStageInfo } from "../data/CultivationData.js";
import { GU_CATALOG } from "../data/GuCatalog.js";
import { plotRect } from "../engine/PixelSpriteBaker.js";
import { getUiIconSvg } from "./XianxiaIcons.js";

const STARTER_GU_CHOICES = ["nguyet_quang", "bach_thi", "huyet_nha", "dan_khieu_hoa_than"];

/**
 * Màn hình cổng vào chuẩn Cổ Tiên Lộ (/choi):
 * - Nền canvas Rừng Trúc Sương Đêm & Đom Đóm Linh Khí động.
 * - Cuộn trục ngọc/đồng dọc (Đăng nhập, Đăng ký, Chơi ngay khách không CAPTCHA).
 * - Sảnh 3 Nhân Vật & Xưởng Tạo Ngoại Hình Chibi đa lớp.
 */
export class GateScreens {
  constructor({
    overlayRoot,
    account,
    onlineHub,
    sfx,
    onEnterWorld,
    onAppearanceUpdated,
    onCloseToWorld,
    onOpenAccountModal,
  }) {
    this.root = overlayRoot;
    this.account = account;
    this.onlineHub = onlineHub;
    this.sfx = sfx;
    this.onEnterWorld = onEnterWorld;
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
    this.customizerCat = "hair";
    this.createError = "";
    this.confirmDeleteSlot = null;
    this._previewRaf = 0;
    this._bgRaf = 0;
  }

  _stopLoops() {
    if (this._previewRaf) { cancelAnimationFrame(this._previewRaf); this._previewRaf = 0; }
    if (this._bgRaf) { cancelAnimationFrame(this._bgRaf); this._bgRaf = 0; }
  }

  close() {
    this._stopLoops();
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

  _startBambooBackdrop() {
    const bg = this.root.querySelector("#gate-bg-canvas");
    if (!bg) return;
    bg.width = GAME_WIDTH;
    bg.height = GAME_HEIGHT;
    const ctx = bg.getContext("2d");
    ctx.imageSmoothingEnabled = false;
    const fireflies = Array.from({ length: 34 }, (_, i) => ({
      x: (i * 113) % GAME_WIDTH,
      y: (i * 67) % GAME_HEIGHT,
      spd: 0.45 + (i % 5) * 0.22,
    }));

    const drawBg = (now) => {
      const t = now * 0.001;
      // Nền bầu trời hoàng hôn u tịch phân dải pixel (100% crisp pixel bands)
      const skyBands = [
        [0, 120, "#05070d"],
        [120, 110, "#090e18"],
        [230, 120, "#0e1722"],
        [350, 110, "#091119"],
        [460, 80, "#04060a"],
      ];
      for (const [sy, sh, col] of skyBands) {
        plotRect(ctx, 0, sy, GAME_WIDTH, sh, col);
      }

      // Vầng tàn nguyệt pixel 3 lớp (không dùng arc)
      const mx = 768;
      const my = 92;
      plotRect(ctx, mx - 44, my - 30, 88, 60, "#101b2a");
      plotRect(ctx, mx - 30, my - 42, 60, 84, "#101b2a");
      plotRect(ctx, mx - 24, my - 24, 48, 48, "#25394f");
      plotRect(ctx, mx - 18, my - 18, 36, 36, "#96b8d1");
      plotRect(ctx, mx - 10, my - 18, 28, 32, "#0b1320");

      // Rặng núi xa pixel bậc thang
      for (let rx = 0; rx < GAME_WIDTH; rx += 16) {
        const mh = 56 + Math.round((Math.sin(rx * 0.015) * 28 + Math.cos(rx * 0.032) * 18) / 4) * 4;
        plotRect(ctx, rx, GAME_HEIGHT - 120 - mh, 16, mh + 120, "#070c13");
      }

      // Thân trúc cổ phong phân đốt pixel đung đưa theo bước nhảy pixel
      for (let i = 0; i < 20; i++) {
        const bx = i * 50 + (i % 3) * 9;
        const sway = Math.round(Math.sin(t * 0.75 + i) * 3);
        const col = i % 2 === 0 ? "#0c1920" : "#071016";
        const hi = i % 2 === 0 ? "#18333a" : "#102229";
        const w = i % 3 === 0 ? 6 : 4;
        for (let seg = 0; seg < 12; seg++) {
          const sy = GAME_HEIGHT - seg * 46;
          const sx = bx + Math.round((sway * seg) / 11);
          plotRect(ctx, sx, sy - 46, w, 45, col);
          plotRect(ctx, sx, sy - 46, 1, 45, hi);
          plotRect(ctx, sx - 1, sy - 46, w + 2, 2, "#1c3d42");
          if ((seg + i) % 3 === 0) {
            plotRect(ctx, sx + w, sy - 30, 8, 2, hi);
            plotRect(ctx, sx + w + 4, sy - 28, 6, 2, col);
          }
        }
      }

      // Đom đóm u linh ngọc bích & tử tinh
      for (let i = 0; i < fireflies.length; i++) {
        const f = fireflies[i];
        const fx = Math.round((f.x + Math.sin(t * f.spd + i) * 26 + GAME_WIDTH) % GAME_WIDTH);
        const fy = Math.round((f.y - t * 11 * f.spd + GAME_HEIGHT * 10) % GAME_HEIGHT);
        plotRect(ctx, fx - 1, fy - 1, 4, 4, i % 3 === 0 ? "rgba(139, 92, 246, 0.35)" : "rgba(77, 224, 201, 0.35)");
        plotRect(ctx, fx, fy, 2, 2, i % 3 === 0 ? "#b88cff" : "#7fffdf");
      }

      this._bgRaf = requestAnimationFrame(drawBg);
    };
    this._bgRaf = requestAnimationFrame(drawBg);
  }

  render() {
    this._stopLoops();
    this.root.classList.add("is-open");

    if (this.screen === "login") this._renderLoginScreen();
    else if (this.screen === "char_select") this._renderCharSelectScreen();
    else if (this.screen === "char_create" || this.screen === "appearance_mirror") {
      this._renderCustomizerScreen(this.screen === "appearance_mirror");
    }
    this._startBambooBackdrop();
  }

  _renderLoginScreen() {
    const isReg = this.authTab === "register";
    this.root.innerHTML = `
      <canvas id="gate-bg-canvas" class="gate-bg-canvas"></canvas>
      <a class="ctl-novel-corner-link" href="https://metruyenchu.com.vn/co-chan-nhan" target="_blank" rel="noopener noreferrer">${getUiIconSvg("bamboo_slip")}<span>Ngọc Giản Nguyên Tác · Cổ Chân Nhân ↗</span></a>
      <div class="ctl-scroll-modal">
        <div class="ctl-scroll-cap ctl-scroll-cap--top"></div>
        <div class="ctl-scroll-body">
          <div class="ctl-logo-badge">CỔ CHÂN NHÂN · ARPG TIÊN HIỆP HẮC ÁM</div>
          <h1 class="ctl-logo-title">CỔ CHÂN NHÂN · CỔ TIÊN LỘ</h1>
          <p class="ctl-logo-sub">Khai Khiếu Đom Đóm · Luyện Cổ · Thanh Mao Sơn → Ngũ Vực</p>

          <div class="gate-tabs">
            <button type="button" class="tab-btn ${!isReg ? "is-active" : ""}" data-gate-tab="login">Vào Giang Hồ</button>
            <button type="button" class="tab-btn ${isReg ? "is-active" : ""}" data-gate-tab="register">Đăng Ký</button>
          </div>

          <form id="gate-auth-form" class="acc-form">
            ${
              isReg
                ? `
              <label class="acc-field">
                <span>Tên tài khoản (3–24 ký tự viết liền) *</span>
                <input id="gate-username" type="text" autocomplete="username" placeholder="vd: phuongnguyen" required />
              </label>
              <label class="acc-field">
                <span>Email khôi phục (tùy chọn)</span>
                <input id="gate-email" type="email" autocomplete="email" placeholder="cosu@example.com" />
              </label>
            `
                : `
              <label class="acc-field">
                <span>Tài khoản hoặc Email *</span>
                <input id="gate-identifier" type="text" autocomplete="username" placeholder="Nhập tài khoản hoặc email" required />
              </label>
            `
            }
            <label class="acc-field">
              <span>Mật khẩu *</span>
              <input id="gate-password" type="password" autocomplete="current-password" placeholder="••••••" required />
            </label>

            ${
              this.authMessage
                ? `<div class="fusion-result ${this.authError ? "is-fail" : "is-success"}">${this.authMessage}</div>`
                : ""
            }

            <div class="gate-auth-actions">
              <button type="submit" class="ctl-btn-jade" ${this.authBusy ? "disabled" : ""}>
                ${this.authBusy ? "Đang kết nối..." : isReg ? "Đăng Ký & Bước Vào Nam Cương" : "Vào Giang Hồ"}
              </button>
              <button type="button" id="gate-guest-btn" class="ctl-btn-gold" ${this.authBusy ? "disabled" : ""}>
                Chơi Ngay (Khách — Lưu Trên Máy)
              </button>
            </div>
          </form>
        </div>
        <div class="ctl-scroll-cap ctl-scroll-cap--bot"></div>
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
      ? `Máy chủ Nam Cương · <b>${this.account.profile.username ?? "Đạo Hữu"}</b>`
      : `Chế độ Khách (Lưu nội bộ trên trình duyệt)`;

    const slotsHtml = [0, 1, 2]
      .map((slotIdx) => {
        const ch = this.account.characters[slotIdx];
        if (!ch) {
          return `
            <div class="pedestal-card pedestal-card--empty">
              <div class="pedestal-slot-badge">Ô Nhân Vật #${slotIdx + 1}</div>
              <div class="pedestal-altar-empty">
                <canvas class="pedestal-canvas" data-slot-canvas="${slotIdx}" width="80" height="80"></canvas>
                <div class="pedestal-empty-hint">Chưa Tạo Cổ Sư</div>
              </div>
              <button type="button" class="ctl-btn-jade pedestal-create-btn" data-create-slot="${slotIdx}">
                + Tạo Cổ Sư Mới
              </button>
            </div>
          `;
        }

        const st = ch.ctl_state;
        const stage = getStageInfo(st?.stageLevel ?? 1);
        const pathInfo = CULTIVATION_PATHS[st?.chosenPath ?? "nguyet_dao"] ?? CULTIVATION_PATHS.nguyet_dao;
        const stones = st?.nguyenThach ?? ch.nguyen_thach ?? 180;
        const isConfirmDel = this.confirmDeleteSlot === slotIdx;

        return `
          <div class="pedestal-card is-occupied" style="--sect-col:${pathInfo.color}">
            <div class="pedestal-top-row">
              <span class="pedestal-slot-badge" style="color:${pathInfo.color}">${pathInfo.name}</span>
              <button type="button" class="pedestal-del-btn ${isConfirmDel ? "is-armed" : ""}" data-delete-slot="${slotIdx}">
                ${isConfirmDel ? "Xác nhận xóa?" : "Xóa"}
              </button>
            </div>
            <div class="pedestal-hero-wrap">
              <canvas class="pedestal-canvas" data-slot-canvas="${slotIdx}" width="80" height="80"></canvas>
            </div>
            <div class="pedestal-name">${ch.name}</div>
            <div class="pedestal-realm">${stage.title} · ${stones} Nguyên thạch</div>
            <div class="pedestal-actions">
              <button type="button" class="ctl-btn-jade pedestal-play-btn" data-play-slot="${slotIdx}">
                Vào Giang Hồ
              </button>
            </div>
          </div>
        `;
      })
      .join("");

    this.root.innerHTML = `
      <canvas id="gate-bg-canvas" class="gate-bg-canvas"></canvas>
      <a class="ctl-novel-corner-link" href="https://metruyenchu.com.vn/co-chan-nhan" target="_blank" rel="noopener noreferrer">${getUiIconSvg("bamboo_slip")}<span>Ngọc Giản Nguyên Tác · Cổ Chân Nhân ↗</span></a>
      <div class="gate-shell gate-shell--select">
        <div class="gate-topbar">
          <div class="gate-topbar-left">
            <span class="gate-brand">CỔ TIÊN LỘ · CHỌN NHÂN VẬT (TỐI ĐA 3)</span>
            <span class="gate-acc-info">${accLabel}</span>
          </div>
          <div class="gate-topbar-right">
            <button type="button" id="gate-switch-acc-btn" class="mini-hud-btn">
              ${isOnline ? "Đổi Tài Khoản" : "Đăng Nhập"}
            </button>
          </div>
        </div>
        <div class="gate-pedestals">${slotsHtml}</div>
      </div>
    `;

    const startTs = performance.now();
    const animatePedestals = (now) => {
      const t = (now - startTs) / 1000;
      this.root.querySelectorAll("[data-slot-canvas]").forEach((c) => {
        const idx = Number(c.dataset.slotCanvas);
        const ch = this.account.characters[idx];
        drawCustomCharacterPreview(c, ch?.appearance ?? null, {
          timeSec: t + idx * 0.35,
          pathColor: "#4de0c9",
          scale: 2,
        });
      });
      this._previewRaf = requestAnimationFrame(animatePedestals);
    };
    this._previewRaf = requestAnimationFrame(animatePedestals);

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
        this.draftAppearance = createDefaultAppearance();
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

    this.root.querySelectorAll("[data-play-slot]").forEach((btn) => {
      btn.addEventListener("click", () => {
        this.sfx?.unlock();
        const idx = Number(btn.dataset.playSlot);
        this.close();
        this.onEnterWorld?.(idx);
      });
    });
  }

  _renderOptionRow(label, list, currentId, attrName, colorProp = null) {
    const chips = list
      .map((item) => {
        const active = item.id === currentId;
        const swatch = colorProp ? `<span class="cust-swatch" style="background:${item[colorProp]}"></span>` : "";
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
        this._renderOptionRow("Kiểu Tóc", HAIR_STYLES, ap.hairStyle, "hairStyle") +
        this._renderOptionRow("Màu Tóc", HAIR_COLORS, ap.hairColor, "hairColor", "base") +
        this._renderOptionRow("Mũ / Quán / Nón", HEADGEARS, ap.headgear, "headgear");
    } else if (this.customizerCat === "outfit") {
      rightControlsHtml =
        this._renderOptionRow("Phom Đạo Bào", OUTFIT_STYLES, ap.outfitStyle, "outfitStyle") +
        this._renderOptionRow("Màu Đạo Bào", OUTFIT_COLORS, ap.outfitColor, "outfitColor", "base") +
        this._renderOptionRow("Viền Lụa & Đai Ngọc", TRIM_COLORS, ap.trimColor, "trimColor", "base");
    } else {
      rightControlsHtml =
        this._renderOptionRow("Màu Mắt", EYE_COLORS, ap.eyeColor, "eyeColor", "hex") +
        this._renderOptionRow("Pháp Khí Đeo Lưng", BACK_ITEMS, ap.backItem, "backItem") +
        (isMirror
          ? ""
          : `<div class="cust-group"><div class="cust-label">Khởi Đầu Tại Tạ Gia Trại</div><div class="ctl-sub-txt">Vào thành, ngươi sẽ bước xuống Nguyên Tuyền làm Lễ Khai Khiếu, chọn Cổ Bản Mệnh và tự thân đi tìm luyện hóa ngoài tự nhiên!</div></div>`);
    }

    const safeName = this.draftName.replace(/"/g, "&quot;");
    this.root.innerHTML = `
      <canvas id="gate-bg-canvas" class="gate-bg-canvas"></canvas>
      <a class="ctl-novel-corner-link" href="https://metruyenchu.com.vn/co-chan-nhan" target="_blank" rel="noopener noreferrer">${getUiIconSvg("bamboo_slip")}<span>Ngọc Giản Nguyên Tác · Cổ Chân Nhân ↗</span></a>
      <div class="gate-shell gate-shell--create">
        <div class="gate-topbar">
          <div class="gate-topbar-left">
            <span class="gate-brand">${isMirror ? "THAY ĐỔI DIỆN MẠO" : `TẠO NHÂN VẬT CỔ TIÊN LỘ · Ô #${this.createSlotIndex + 1}`}</span>
          </div>
          <button type="button" id="cust-back-btn" class="mini-hud-btn">Quay Lại</button>
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
                ["attack", "Đánh"],
                ["sit", "Bế Quan"],
              ]
                .map(([id, lbl]) => `<button type="button" class="floor-pill ${this.previewPose === id ? "is-selected" : ""}" data-pose="${id}">${lbl}</button>`)
                .join("")}
              <button type="button" id="btn-random-look" class="floor-pill">Ngẫu Nhiên</button>
            </div>
            <label class="acc-field" style="width:100%">
              <span>Đạo Hiệu Nhân Vật (2–18 ký tự) *</span>
              <input id="cust-name-input" type="text" maxlength="18" value="${safeName}" placeholder="vd: Cổ Nguyệt Phương Nguyên" required />
            </label>
          </div>

          <div class="gate-create-right">
            <div class="gate-tabs" style="margin-bottom:6px">
              <button type="button" class="tab-btn ${this.customizerCat === "hair" ? "is-active" : ""}" data-cust-cat="hair">Diện Mạo</button>
              <button type="button" class="tab-btn ${this.customizerCat === "outfit" ? "is-active" : ""}" data-cust-cat="outfit">Đạo Bào</button>
              <button type="button" class="tab-btn ${this.customizerCat === "detail" ? "is-active" : ""}" data-cust-cat="detail">Chi Tiết & Pháp Khí</button>
            </div>
            <div class="cust-scroll-panel">${rightControlsHtml}</div>
            ${this.createError ? `<div class="fusion-result is-fail" style="margin-top:6px">${this.createError}</div>` : ""}
            <button type="submit" class="ctl-btn-jade" style="margin-top:8px;width:100%">
              ${isMirror ? "Lưu Diện Mạo" : "Bước Vào Hang Ngầm · Khai Khiếu Đại Điển"}
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
        this.draftAppearance = normalizeAppearance({ ...this.draftAppearance, [key]: val });
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
        this.onEnterWorld?.(this.createSlotIndex);
      } catch (err) {
        this.createError = err?.message || "Không thể tạo nhân vật.";
        this.render();
      }
    });
  }
}
