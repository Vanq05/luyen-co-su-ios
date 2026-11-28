import { drawCharacterPortrait } from "../character/CharacterSpriteBuilder.js";
import { GAME_HEIGHT, GAME_WIDTH } from "../config/constants.js";
import { evaluateAwakeningSteps } from "../data/CultivationData.js";
import { ITEMS_CATALOG } from "../data/EquipmentAndItems.js";
import { GU_CATALOG, KILLER_MOVES, STARTER_VITAL_BUILDS } from "../data/GuCatalog.js";
import { MAIN_QUESTS, SIDE_QUESTS, STARTER_GU_HABITATS, STORY_ACTS } from "../data/QuestsAndEvents.js";
import { SkillPad } from "../input/SkillPad.js";
import { VirtualJoystick } from "../input/VirtualJoystick.js";
import { getKillerMovePixelImgHtml } from "./PixelGuIcons.js";
import { getGuIconSvg, getItemIconSvg, getUiIconSvg } from "./XianxiaIcons.js";

const HUD_LAYOUT_STORAGE_KEY = "ctl_hud_layout_v2";

function createDefaultHudLayout() {
  return {
    skillStyle: "bar",
    handedness: "right",
    alwaysShowJoystick: false,
    joystick: { xPct: null, yPct: null, scale: 1 },
    skills: { xPct: null, yPct: null, scale: 1 },
    aux: { xPct: null, yPct: null, scale: 1 },
  };
}

function clampHudVal(val, min, max, fallback) {
  const n = Number(val);
  return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : fallback;
}

/**
 * Giao diện HUD In-Game Cổ Phong Chuẩn Cổ Tiên Lộ (cotienlo.com):
 * - Sử dụng 100% Pixel Icon sắc nét & Avatar 88x88 (không dùng SVG thô).
 * - Hỗ trợ Cụm Chiêu MOBA xoay cung tròn ngón cái + Thanh Kỹ Năng PC truyền thống.
 * - Tùy biến kéo-thả vị trí Joystick / Cụm Chiêu / Phím Phụ và chỉnh tỷ lệ trong Cài đặt.
 */
export class CotienloHUD {
  constructor({
    hudRoot,
    getDefaultAngle,
    worldToClient,
    onBasicAttack,
    onCast,
    onUseQuickItem,
    onAbsorbStart,
    onAbsorbEnd,
    onInteract,
    onCycleTarget,
    onTriggerSurge,
    onRitualChoice,
    onQuestClick,
    onOpenPanel,
    onStartEvent,
    onExitInstance,
    onTogglePvp,
    onToggleAutoCombat,
    onRespawn,
    onPickTargetGu,
    onMinimapClick,
    onSendChat,
  }) {
    this.hudRoot = hudRoot;
    this.worldToClient = worldToClient;
    this.onBasicAttack = onBasicAttack;
    this.onCast = onCast;
    this.onUseQuickItem = onUseQuickItem;
    this.onAbsorbStart = onAbsorbStart;
    this.onAbsorbEnd = onAbsorbEnd;
    this.onInteract = onInteract;
    this.onCycleTarget = onCycleTarget;
    this.onTriggerSurge = onTriggerSurge;
    this.onRitualChoice = onRitualChoice;
    this.onQuestClick = onQuestClick;
    this.onOpenPanel = onOpenPanel;
    this.onStartEvent = onStartEvent;
    this.onExitInstance = onExitInstance;
    this.onTogglePvp = onTogglePvp;
    this.onToggleAutoCombat = onToggleAutoCombat;
    this.onRespawn = onRespawn;
    this.onPickTargetGu = onPickTargetGu;
    this.onMinimapClick = onMinimapClick;
    this.onSendChat = onSendChat;

    this.questTab = "main";
    try {
      this.questCollapsed = localStorage.getItem("ctl_quest_collapsed") === "1";
    } catch {
      this.questCollapsed = false;
    }
    try {
      this.uiMode = localStorage.getItem("ctl_ui_mode") || "auto";
    } catch {
      this.uiMode = "auto";
    }
    this.hudLayout = this._loadHudLayout();
    this.isEditingHud = false;
    this.mobileMenuOpen = false;
    this._wasMobileUi = false;
    this._lastPlayerRef = null;
    this.chatTab = "all";
    this.chatCollapsed = false;
    this.chatMuted = false;
    this.minimapCollapsed = false;
    this.lastPortraitKey = "";
    this.lastSlotData = [];
    this.lastVitalData = null;
    this.lastKmData = [];
    this._lastQuestRenderKey = "";
    this._lastAutoCombatKey = "";
    this._armedQuestKey = "";
    this._armedQuestAt = 0;
    this._lastQuestTriggerAt = 0;
    this._currentSideItems = [];
    this._dismissedNoticeKey = "";
    this._lastNoticeKey = "";
    this.localChatFeed = [
      { kind: "sys", sender: "Hệ thống", text: "Chào mừng đến với Cổ Tiên Lộ! Ấn 2 lần vào nhiệm vụ để tự đi tới." },
    ];

    this.hudRoot.innerHTML = this._buildMarkup();
    this._cacheElements();
    this._bindEvents(getDefaultAngle);
    this.setQuestCollapsed(this.questCollapsed, false);
    this.applyHudLayout();
    this.syncViewportMode();
  }

  _loadHudLayout() {
    const def = createDefaultHudLayout();
    try {
      const raw = JSON.parse(localStorage.getItem(HUD_LAYOUT_STORAGE_KEY) || "null");
      if (!raw || typeof raw !== "object") return def;
      return this._normalizeHudLayout(raw);
    } catch {
      return def;
    }
  }

  _normalizeHudLayout(raw = {}) {
    const def = createDefaultHudLayout();
    const normWidget = (src) => ({
      xPct: src?.xPct === null || src?.xPct === undefined ? null : clampHudVal(src.xPct, 1, 86, null),
      yPct: src?.yPct === null || src?.yPct === undefined ? null : clampHudVal(src.yPct, 4, 86, null),
      scale: clampHudVal(src?.scale, 0.7, 1.4, 1),
    });
    return {
      skillStyle: raw.skillStyle === "bar" ? "bar" : "moba",
      handedness: raw.handedness === "left" ? "left" : "right",
      alwaysShowJoystick: Boolean(raw.alwaysShowJoystick === true || raw.alwaysShowJoystick === "always"),
      joystick: normWidget(raw.joystick ?? def.joystick),
      skills: normWidget(raw.skills ?? def.skills),
      aux: normWidget(raw.aux ?? def.aux),
    };
  }

  _saveHudLayout() {
    try {
      localStorage.setItem(HUD_LAYOUT_STORAGE_KEY, JSON.stringify(this.hudLayout));
    } catch {
      // Bỏ qua nếu trình duyệt chặn storage
    }
  }

  _buildMarkup() {
    const archSlots = [0, 1, 2, 3, 4, 5, 6]
      .map(
        (idx) => `
      <button type="button" class="arch-gu-slot arch-gu-slot--${idx}" data-arch-slot="${idx}">
        <span class="arch-icon"></span>
        <span class="ctl-cd-mask"></span>
        <span class="ctl-cd-num"></span>
        <span class="arch-key">${idx + 1}</span>
      </button>
    `
      )
      .join("");

    const chatTabs = [
      ["all", "Tất cả"],
      ["zone", "Vùng"],
      ["world", "Thế giới"],
      ["trade", "Giao dịch"],
      ["party", "Tiểu tổ"],
      ["guild", "Bang"],
      ["whisper", "Riêng"],
      ["sys", "Hệ thống"],
    ]
      .map(([id, lbl], i) => `<button type="button" class="ctl-chat-tab ${i === 0 ? "is-active" : ""}" data-chat-tab="${id}">${lbl}</button>`)
      .join("");

    return `
      <div class="ctl-health-notice">Chơi game quá 180 phút một ngày sẽ ảnh hưởng xấu đến sức khỏe</div>
      <div id="hud-notice-banner" class="ctl-parch-notice" role="status">
        <span id="hud-notice-text" class="ctl-parch-notice-txt"></span>
        <button type="button" id="hud-notice-close" class="ctl-parch-notice-close" title="Đóng thông báo">×</button>
      </div>

      <!-- GÓC TRÊN-TRÁI: AVATAR TRÒN VIỀN ĐỒNG · MÁU / CHÂN NGUYÊN · CUỘN GIẤY NHIỆM VỤ -->
      <div class="ctl-top-left">
        <div class="ctl-profile-bar">
          <button type="button" id="hud-avatar-btn" class="ctl-avatar-ring" title="Mở Bảng Nhân Vật (C)">
            <canvas id="hud-portrait-canvas" width="88" height="88"></canvas>
          </button>
          <div class="ctl-bars-col">
            <div class="ctl-name-banner">
              <span id="hud-char-name">Vô Danh</span>
              <span id="hud-char-realm" class="ctl-realm-tag">Nhất chuyển sơ giai</span>
            </div>
            <div class="ctl-bar-track ctl-bar-hp">
              <div id="hud-hp-fill" class="ctl-bar-fill"></div>
              <span id="hud-hp-text" class="ctl-bar-val">240/240</span>
            </div>
            <div class="ctl-bar-track ctl-bar-mp">
              <div id="hud-mp-fill" class="ctl-bar-fill"></div>
              <span id="hud-mp-text" class="ctl-bar-val">120/120</span>
            </div>
            <div class="ctl-bar-track ctl-bar-sta">
              <div id="hud-sta-fill" class="ctl-bar-fill"></div>
            </div>
          </div>
          <button type="button" id="hud-quest-toggle" class="ctl-mini-circle" title="Ẩn / Hiện nhiệm vụ">-</button>
        </div>

        <button type="button" id="hud-quest-restore-btn" class="ctl-quest-restore-pill" title="Hiện bảng nhiệm vụ">
          <span class="ctl-svg-wrap">${getUiIconSvg("daily")}</span>
          <span id="hud-quest-restore-lbl">Nhiệm Vụ · Chính 1/18 ▾</span>
        </button>

        <div id="hud-quest-box" class="ctl-quest-parchment">
          <div class="ctl-quest-ribbon"></div>
          <span class="ctl-stud ctl-stud--bl" aria-hidden="true"></span>
          <span class="ctl-stud ctl-stud--br" aria-hidden="true"></span>
          <div class="ctl-quest-tabs">
            <button type="button" class="ctl-qtab is-active" data-qtab="main">Chính (1/18)</button>
            <button type="button" class="ctl-qtab" data-qtab="side">Phụ (2)</button>
            <button type="button" id="hud-quest-hide-btn" class="ctl-qhide-btn" title="Ẩn bảng nhiệm vụ">Ẩn ▲</button>
          </div>
          <div class="ctl-quest-hint">Ấn 2 lần vào nhiệm vụ để tự đi tới · <button type="button" id="hud-story-open-btn" class="ctl-quest-story-btn">Biên Niên Sử (J)</button></div>
          <div id="hud-quest-list" class="ctl-quest-list"></div>
        </div>
      </div>

      <!-- CHÍNH GIỮA TRÊN: THANH MỤC TIÊU (T) & SỰ KIỆN -->
      <div class="ctl-top-center">
        <div id="hud-target-bar" class="ctl-target-bar">
          <div class="ctl-target-badge">T</div>
          <div class="ctl-target-info">
            <div id="hud-target-name" class="ctl-target-name">Mục tiêu</div>
            <div class="ctl-target-track">
              <div id="hud-target-fill" class="ctl-target-fill"></div>
              <span id="hud-target-hp" class="ctl-target-hp">0/0</span>
            </div>
          </div>
        </div>

        <div id="hud-event-pill" class="ctl-event-pill">
          <span id="hud-event-text">Thiên Trì Điếu Hội · 07:00</span>
          <button type="button" id="hud-exit-inst-btn" class="ctl-exit-btn">Thoát</button>
        </div>
      </div>

      <!-- GÓC TRÊN-PHẢI: HÀNG HUY HIỆU CỔ PHONG & MINIMAP TRÒN VIỀN ĐỒNG GỖ -->
      <div class="ctl-top-right">
        <div class="ctl-quick-icons">
          <button type="button" class="ctl-round-btn" data-panel="world" title="Bản đồ thế giới (M)">${getUiIconSvg("map")}<em>Bản đồ</em></button>
          <button type="button" class="ctl-round-btn" data-event="tower" title="Tháp Thí Luyện">${getUiIconSvg("tower")}<em>Leo Tháp</em></button>
          <button type="button" class="ctl-round-btn" data-event="arena" title="Lôi Đài Bóng">${getUiIconSvg("arena")}<em>Lôi đài</em></button>
          <button type="button" class="ctl-round-btn" data-event="dieu_hoi" title="Thiên Trì Điếu Hội">${getUiIconSvg("fishing")}<em>Điếu Hội</em></button>
          <button type="button" class="ctl-round-btn" data-event="ban_long" title="Vạn Thủ Bàn Long">${getUiIconSvg("dragon")}<em>Bàn Long</em></button>
          <button type="button" class="ctl-round-btn" data-panel="daily" title="Quà & Hoạt động Hôm Nay">
            ${getUiIconSvg("daily")}<em>Hôm nay</em>
            <i id="hud-daily-dot" class="ctl-red-dot"></i>
          </button>
        </div>

        <div id="hud-minimap-wrap" class="ctl-minimap-box ctl-minimap-round">
          <div class="ctl-minimap-head">
            <span id="hud-map-label">Tạ Gia Trại</span>
            <button type="button" id="hud-minimap-toggle" class="ctl-mini-circle" title="Thu gọn minimap">&gt;</button>
          </div>
          <div class="ctl-minimap-frame ctl-minimap-circle-frame">
            <canvas id="hud-minimap-canvas" width="116" height="116" title="Bấm lên bản đồ nhỏ để tự đi tới"></canvas>
            <span class="ctl-compass-n">B</span>
          </div>
          <div class="ctl-minimap-meta-row">
            <span id="hud-weather-label" class="ctl-weather-sub">Thanh Tĩnh</span>
            <span id="hud-coord-label" class="ctl-coord-tag">360,368</span>
          </div>
        </div>
      </div>

      <!-- GÓC DƯỚI-TRÁI -->
      <div id="hud-chat-wrap" class="ctl-chat-box">
        <div class="ctl-chat-top">
          <span class="ctl-chat-title">Kênh Truyền Âm</span>
          <button type="button" id="hud-chat-min" class="ctl-mini-circle">-</button>
        </div>
        <div id="hud-chat-body" class="ctl-chat-body">
          <div id="hud-chat-lines" class="ctl-chat-lines"></div>
          <div class="ctl-chat-tabs">${chatTabs}</div>
          <form id="hud-chat-form" class="ctl-chat-form">
            <input id="hud-chat-input" type="text" maxlength="120" placeholder="Enter để chat (gửi kênh Vùng)" />
            <button type="submit" class="ctl-parch-btn">Gửi</button>
            <button type="button" id="hud-chat-mute" class="ctl-parch-btn">Câm</button>
          </form>
        </div>
      </div>

      <!-- CHÍNH GIỮA DƯỚI: CỤM CHIÊU THỨC KHUNG TRÒN CỔ PHONG & THẺ TƯƠNG TÁC TINH TẾ -->
      <div class="ctl-bottom-arch ctl-pixel-skilldock">
        <div id="hud-slot-tooltip" class="ctl-slot-tooltip">
          <div id="hud-tt-title" class="ctl-tt-title"></div>
          <div id="hud-tt-meta" class="ctl-tt-meta"></div>
          <div id="hud-tt-desc"></div>
        </div>

        <div id="hud-stealth-pill" class="ctl-stealth-pill">Ẩn Thân trong bụi cỏ</div>

        <div class="ctl-pixel-topstrip">
          <button type="button" id="hud-auto-btn" class="ctl-auto-btn" title="Tự Đánh Bãi Thú (Phím T)">Tự Đánh<span class="ctl-kb-hint"> [T]</span></button>
          <button type="button" class="ctl-item-sq" data-quick-item="0" title="Phím Z">
            <span class="ctl-sq-key">Z</span>
            <span id="hud-qi-icon-0" style="width:20px;height:20px;display:grid;place-items:center"></span>
            <span class="ctl-cd-mask"></span>
            <span class="ctl-cd-num"></span>
            <span id="hud-qcnt-0" class="ctl-sq-cnt">0</span>
          </button>
          <button type="button" class="ctl-item-sq" data-quick-item="1" title="Phím G">
            <span class="ctl-sq-key">G</span>
            <span id="hud-qi-icon-1" style="width:20px;height:20px;display:grid;place-items:center"></span>
            <span class="ctl-cd-mask"></span>
            <span class="ctl-cd-num"></span>
            <span id="hud-qcnt-1" class="ctl-sq-cnt">0</span>
          </button>
          <button type="button" id="hud-absorb-pill" class="ctl-absorb-pill" title="Giữ R để Hấp Thu Nguyên Thạch">
            ${getUiIconSvg("absorb")}<span><em class="ctl-kb-hint">R · </em>Hấp thu</span>
          </button>
          <button type="button" id="hud-context-pill" class="ctl-context-pill" title="Phím F tương tác đối tượng gần">
            <span id="hud-context-text">F · Ngữ cảnh</span>
          </button>
          <button type="button" id="hud-dash-btn" class="ctl-dash-pill" title="Lướt né (Space)"><span class="ctl-kb-hint">Space · </span>Lướt</button>
        </div>

        <div class="ctl-pixel-mainbar">
          <button type="button" id="hud-basic-btn" class="ctl-basic-btn ctl-basic-circle" title="Đánh thường (Chuột Trái)">
            ${getUiIconSvg("attack")}
            <span>Đánh</span>
          </button>

          <button type="button" id="hud-vital-btn" class="ctl-vital-orb" title="Cổ Bản Mệnh (Chuột Phải)">
            <span id="hud-vital-icon" style="width:32px;height:32px;display:grid;place-items:center"></span>
            <span class="ctl-cd-mask"></span>
            <span class="ctl-cd-num"></span>
            <span class="arch-key">RMB</span>
          </button>

          <div class="ctl-pixel-slots-row">
            ${archSlots}
          </div>

          <div class="ctl-pixel-km-row">
            <button type="button" id="hud-km-0" class="ctl-km-btn ctl-km-0" title="Sát chiêu / Tổ Hợp Q">
              <span id="hud-km-icon-0" style="width:28px;height:28px;display:grid;place-items:center"></span>
              <span class="ctl-cd-mask"></span>
              <span class="ctl-cd-num"></span>
              <span class="arch-key">Q</span>
            </button>
            <button type="button" id="hud-km-1" class="ctl-km-btn ctl-km-1" title="Sát chiêu / Tổ Hợp E">
              <span id="hud-km-icon-1" style="width:28px;height:28px;display:grid;place-items:center"></span>
              <span class="ctl-cd-mask"></span>
              <span class="ctl-cd-num"></span>
              <span class="arch-key">E</span>
            </button>
          </div>
        </div>
      </div>

      <!-- BANNER LỄ KHAI KHIẾU & MODAL TRỌNG THƯƠNG -->
      <div id="hud-ceremony-banner" class="ctl-ceremony-banner">
        <div id="hud-cer-title" class="ctl-cer-title">LỄ KHAI KHIẾU</div>
        <div id="hud-cer-sub" class="ctl-cer-sub"></div>
        <div id="hud-cer-desc" class="ctl-cer-desc"></div>
        <button type="button" id="hud-cer-close" class="ctl-parch-btn" style="margin-top:8px">Xác Nhận</button>
      </div>

      <div id="hud-downed-overlay" class="ctl-downed-overlay">
        <div class="ctl-downed-card">
          <div class="ctl-downed-title">Trọng Thương Hôn Mê</div>
          <p class="ctl-downed-desc">Chân nguyên tán loạn, sinh lực cạn kiệt! Chọn nơi điều tức hồi phục:</p>
          <div class="ctl-btn-row">
            <button type="button" id="hud-respawn-station" class="ctl-btn-jade">Hồi Sinh Trạm Gần Nhất</button>
            <button type="button" id="hud-respawn-town" class="ctl-btn-gold">Về Tạ Gia Trại</button>
          </div>
        </div>
      </div>

      <!-- BẢNG CHỌN CỔ BẢN MỆNH SAU KHI KHAI KHIẾU -->
      <div id="hud-starter-gu-modal" class="ctl-downed-overlay">
        <div class="ctl-starter-card ctl-starter-card--wide">
          <div class="ctl-starter-head">
            <span class="ctl-starter-title">CHỌN 1 TRONG 5 CỔ TRÙNG BẢN MỆNH KHỞI ĐẦU</span>
            <span id="hud-starter-apt" class="ctl-starter-apt"></span>
          </div>
          <p class="ctl-downed-desc" style="margin:4px 0 8px">
            Không Khiếu đã khai mở thành công! Hãy chọn hướng build Cổ Trùng Nhất Chuyển định mệnh để mang theo khi bước lên Cổ Nguyệt Sơn Trại:
          </p>
          <div id="hud-starter-gu-grid" class="ctl-starter-grid"></div>
        </div>
      </div>

      <!-- BẢNG NGHI THỨC ĐẾM BƯỚC ĐOM ĐÓM KHAI KHIẾU -->
      <div id="hud-ritual-panel" class="ctl-ritual-panel">
        <div class="ctl-ritual-head">
          <span>KHAI KHIẾU ĐẠI ĐIỂN · DÒNG SUỐI NGUYÊN TUYỀN</span>
          <strong id="hud-ritual-step-val">Bước 0 / 45</strong>
        </div>
        <div class="ctl-ritual-track"><div id="hud-ritual-bar" class="ctl-ritual-fill"></div></div>
        <div id="hud-ritual-grade" class="ctl-ritual-grade">Kéo Joystick sang phải hoặc nhấn D / → tiến vào biển đom đóm Hy Vọng Cổ!</div>
        <div class="ctl-ritual-actions">
          <button type="button" id="btn-ritual-surge" class="ctl-btn-jade">Space · Ý Chí Phản Kháng (+2 Bước)</button>
          <button type="button" id="btn-ritual-confirm" class="ctl-btn-gold">F · Dừng Bước & Mở Không Khiếu</button>
        </div>
      </div>

      <!-- KẾT QUẢ DƯỚI 10 BƯỚC (PHÀM NHÂN / THỬ LẠI) -->
      <div id="hud-ritual-fail-modal" class="ctl-downed-overlay">
        <div class="ctl-downed-card">
          <div class="ctl-downed-title" style="color:#ff9472">Khai Khiếu Thất Bại (Dưới 10 Bước)</div>
          <p id="hud-ritual-fail-desc" class="ctl-downed-desc"></p>
          <div class="ctl-btn-row">
            <button type="button" id="btn-ritual-retry" class="ctl-btn-jade">Thử Lại Trong Biển Đom Đóm</button>
            <button type="button" id="btn-ritual-mortal" class="ctl-btn-gold">Mở Nhánh Ẩn: Phàm Nhân Nghịch Mệnh</button>
          </div>
        </div>
      </div>

      <!-- GÓC DƯỚI-PHẢI & MENU ĐIỆN THOẠI -->
      <button type="button" id="hud-mobile-menu-btn" class="ctl-mobile-menu-btn" title="Mở Menu Chức Năng">
        <span class="ctl-svg-wrap">${getUiIconSvg("settings")}</span>
        <em id="hud-mobile-menu-lbl">Menu</em>
      </button>
      <div id="hud-util-drawer" class="ctl-bottom-right">
        <button type="button" class="ctl-util-btn" data-panel="bag" title="Túi Đồ & Đổ Thạch (B)"><span class="ctl-svg-wrap">${getUiIconSvg("bag")}</span><em>Túi (B)</em></button>
        <button type="button" class="ctl-util-btn" data-panel="char" title="Nhân Vật & Đột Phá (C)"><span class="ctl-svg-wrap">${getUiIconSvg("char")}</span><em>NV (C)</em></button>
        <button type="button" class="ctl-util-btn" data-panel="gu" title="Cổ Trùng & Tổ Hợp 2+ Cổ (V)"><span class="ctl-svg-wrap">${getUiIconSvg("gu")}</span><em>Cổ (V)</em></button>
        <button type="button" class="ctl-util-btn" data-panel="gu" data-open-subtab="combo" title="Ghép Sát Chiêu 2–3 Cổ (Q/E)"><span class="ctl-svg-wrap">${getUiIconSvg("arena")}</span><em>S.Chiêu</em></button>
        <button type="button" class="ctl-util-btn" data-panel="quests" title="Nhiệm Vụ & Tầm Cổ (J)"><span class="ctl-svg-wrap">${getUiIconSvg("map")}</span><em>N.Vụ (J)</em></button>
        <button type="button" class="ctl-util-btn" data-panel="cultivate" title="Buồng Tĩnh Tọa Tu Luyện (K)"><span class="ctl-svg-wrap">${getUiIconSvg("absorb")}</span><em>Tu Luyện</em></button>
        <button type="button" class="ctl-util-btn" data-panel="mail" title="Thư & Quà Tân Thủ"><span class="ctl-svg-wrap">${getUiIconSvg("mail")}</span><em>Thư</em></button>
        <button type="button" class="ctl-util-btn" data-panel="settings" title="Cài đặt & Điều khiển"><span class="ctl-svg-wrap">${getUiIconSvg("settings")}</span><em>Cài đặt</em></button>
      </div>

      <div id="joystick-zone" class="touch-only" data-hud-widget="joystick" aria-label="Joystick">
        <span class="ctl-edit-tag">Joystick · Kéo để dời</span>
        <div id="joystick-base" class="joystick-base">
          <div class="joystick-ring"></div>
          <div id="joystick-knob" class="joystick-knob"></div>
        </div>
      </div>

      <!-- CỤM NÚT CHIÊU THỨC KIỂU MOBA (VÒNG CUNG NGÓN CÁI) -->
      <div id="hud-moba-pad" class="ctl-moba-pad" data-hud-widget="skills">
        <span class="ctl-edit-tag">Cụm Chiêu MOBA · Kéo để dời</span>

        <div id="moba-sec-row" class="moba-sec-row">
          ${[3, 4, 5, 6]
            .map(
              (idx) => `
          <button type="button" class="moba-btn moba-slot-btn moba-slot-btn--${idx}" data-moba-slot="${idx}" title="Ô Cổ ${idx + 1}">
            <span class="arch-icon"></span>
            <span class="moba-cd-mask ctl-cd-mask"></span>
            <span class="moba-cd-num ctl-cd-num"></span>
            <span class="moba-key">${idx + 1}</span>
          </button>`
            )
            .join("")}
        </div>

        <button type="button" id="moba-km-1" class="moba-btn moba-km-btn moba-km-btn--1" title="Sát chiêu E">
          <span id="moba-km-icon-1" class="moba-icon-box"></span>
          <span class="moba-cd-mask ctl-cd-mask"></span>
          <span class="moba-cd-num ctl-cd-num"></span>
          <span class="moba-key">E</span>
        </button>

        <button type="button" id="moba-km-0" class="moba-btn moba-km-btn moba-km-btn--0" title="Sát chiêu Q">
          <span id="moba-km-icon-0" class="moba-icon-box"></span>
          <span class="moba-cd-mask ctl-cd-mask"></span>
          <span class="moba-cd-num ctl-cd-num"></span>
          <span class="moba-key">Q</span>
        </button>

        ${[0, 1, 2]
          .map(
            (idx) => `
        <button type="button" class="moba-btn moba-slot-btn moba-slot-btn--${idx}" data-moba-slot="${idx}" title="Ô Cổ ${idx + 1}">
          <span class="arch-icon"></span>
          <span class="moba-cd-mask ctl-cd-mask"></span>
          <span class="moba-cd-num ctl-cd-num"></span>
          <span class="moba-key">${idx + 1}</span>
        </button>`
          )
          .join("")}

        <button type="button" id="moba-vital-btn" class="moba-btn moba-vital-btn" title="Cổ Bản Mệnh (RMB)">
          <span id="moba-vital-icon" class="moba-icon-box"></span>
          <span class="moba-cd-mask ctl-cd-mask"></span>
          <span class="moba-cd-num ctl-cd-num"></span>
          <span class="moba-key">RMB</span>
        </button>

        <button type="button" id="moba-target-btn" class="moba-btn moba-target-btn" title="Đổi mục tiêu (Tab)">
          ${getUiIconSvg("combat")}
          <span class="moba-key">Tab</span>
        </button>

        <button type="button" id="moba-basic-btn" class="moba-btn moba-basic-btn" title="Đánh thường (LMB)">
          ${getUiIconSvg("attack")}
          <span class="moba-basic-lbl">Đánh</span>
        </button>
      </div>

      <!-- CỤM PHÍM PHỤ (PHÉP BỔ TRỢ MOBA) -->
      <div id="hud-aux-pad" class="ctl-aux-pad" data-hud-widget="aux">
        <span class="ctl-edit-tag">Phím Phụ · Kéo để dời</span>
        <button type="button" id="aux-dash-btn" class="aux-btn aux-dash-btn" title="Lướt né (Space)">
          <span class="aux-lbl">Lướt</span>
          <span class="moba-cd-mask ctl-cd-mask"></span>
          <span class="moba-cd-num ctl-cd-num"></span>
          <span class="moba-key">Spc</span>
        </button>
        <button type="button" id="aux-absorb-btn" class="aux-btn aux-absorb-btn" title="Giữ R để Hấp Thu Nguyên Thạch">
          ${getUiIconSvg("absorb")}
          <span class="moba-key">R</span>
        </button>
        <button type="button" class="aux-btn aux-qi-btn" data-moba-qi="0" title="Vật phẩm nhanh Z">
          <span id="aux-qi-icon-0" class="moba-icon-box"></span>
          <span class="moba-cd-mask ctl-cd-mask"></span>
          <span class="moba-cd-num ctl-cd-num"></span>
          <span id="aux-qcnt-0" class="ctl-sq-cnt">0</span>
          <span class="moba-key">Z</span>
        </button>
        <button type="button" class="aux-btn aux-qi-btn" data-moba-qi="1" title="Vật phẩm nhanh G">
          <span id="aux-qi-icon-1" class="moba-icon-box"></span>
          <span class="moba-cd-mask ctl-cd-mask"></span>
          <span class="moba-cd-num ctl-cd-num"></span>
          <span id="aux-qcnt-1" class="ctl-sq-cnt">0</span>
          <span class="moba-key">G</span>
        </button>
        <button type="button" id="aux-auto-btn" class="aux-btn aux-auto-btn" title="Tự đánh (T)">
          <span id="aux-auto-lbl">Tự Đánh</span>
        </button>
      </div>

      <!-- THANH CHẾ ĐỘ CHỈNH BỐ CỤC HUD -->
      <div id="hud-editor-bar" class="ctl-hud-editor-bar">
        <div class="ctl-editor-title">KÉO THẢ VỊ TRÍ JOYSTICK / CỤM CHIÊU / PHÍM PHỤ</div>
        <div class="ctl-editor-controls">
          <span class="ctl-ed-grp">
            <span>Joystick:</span>
            <button type="button" id="hud-ed-joy-minus" class="ctl-parch-btn">-</button>
            <strong id="hud-ed-joy-val">100%</strong>
            <button type="button" id="hud-ed-joy-plus" class="ctl-parch-btn">+</button>
          </span>
          <span class="ctl-ed-grp">
            <span>Chiêu:</span>
            <button type="button" id="hud-ed-sk-minus" class="ctl-parch-btn">-</button>
            <strong id="hud-ed-sk-val">100%</strong>
            <button type="button" id="hud-ed-sk-plus" class="ctl-parch-btn">+</button>
          </span>
          <button type="button" id="hud-ed-swap" class="ctl-parch-btn">Đảo Trái ⇄ Phải</button>
          <button type="button" id="hud-ed-reset" class="ctl-parch-btn">Mặc Định</button>
          <button type="button" id="hud-ed-done" class="ctl-btn-jade">Lưu &amp; Xong</button>
        </div>
      </div>

      <div id="skill-cancel-zone" class="skill-cancel-zone">✕ HỦY CHIÊU</div>
    `;
  }

  _cacheElements() {
    this.portraitCanvas = this.hudRoot.querySelector("#hud-portrait-canvas");
    this.charNameEl = this.hudRoot.querySelector("#hud-char-name");
    this.charRealmEl = this.hudRoot.querySelector("#hud-char-realm");
    this.hpFill = this.hudRoot.querySelector("#hud-hp-fill");
    this.hpText = this.hudRoot.querySelector("#hud-hp-text");
    this.mpFill = this.hudRoot.querySelector("#hud-mp-fill");
    this.mpText = this.hudRoot.querySelector("#hud-mp-text");
    this.staFill = this.hudRoot.querySelector("#hud-sta-fill");

    this.questBox = this.hudRoot.querySelector("#hud-quest-box");
    this.questListEl = this.hudRoot.querySelector("#hud-quest-list");
    this.questToggleBtn = this.hudRoot.querySelector("#hud-quest-toggle");
    this.questHideBtn = this.hudRoot.querySelector("#hud-quest-hide-btn");
    this.questRestoreBtn = this.hudRoot.querySelector("#hud-quest-restore-btn");
    this.questRestoreLbl = this.hudRoot.querySelector("#hud-quest-restore-lbl");
    this.mobileMenuBtn = this.hudRoot.querySelector("#hud-mobile-menu-btn");
    this.mobileMenuLbl = this.hudRoot.querySelector("#hud-mobile-menu-lbl");
    this.utilDrawer = this.hudRoot.querySelector("#hud-util-drawer");

    this.targetBar = this.hudRoot.querySelector("#hud-target-bar");
    this.targetName = this.hudRoot.querySelector("#hud-target-name");
    this.targetFill = this.hudRoot.querySelector("#hud-target-fill");
    this.targetHp = this.hudRoot.querySelector("#hud-target-hp");
    this.eventPill = this.hudRoot.querySelector("#hud-event-pill");
    this.eventText = this.hudRoot.querySelector("#hud-event-text");
    this.exitInstBtn = this.hudRoot.querySelector("#hud-exit-inst-btn");

    this.minimapWrap = this.hudRoot.querySelector("#hud-minimap-wrap");
    this.minimapCanvas = this.hudRoot.querySelector("#hud-minimap-canvas");
    this.mapLabel = this.hudRoot.querySelector("#hud-map-label");
    this.coordLabel = this.hudRoot.querySelector("#hud-coord-label");
    this.weatherLabel = this.hudRoot.querySelector("#hud-weather-label");
    this.dailyDot = this.hudRoot.querySelector("#hud-daily-dot");
    this.starterGuModal = this.hudRoot.querySelector("#hud-starter-gu-modal");
    this.starterGuGrid = this.hudRoot.querySelector("#hud-starter-gu-grid");
    this.starterAptEl = this.hudRoot.querySelector("#hud-starter-apt");
    this.ritualPanel = this.hudRoot.querySelector("#hud-ritual-panel");
    this.ritualStepVal = this.hudRoot.querySelector("#hud-ritual-step-val");
    this.ritualBar = this.hudRoot.querySelector("#hud-ritual-bar");
    this.ritualGradeEl = this.hudRoot.querySelector("#hud-ritual-grade");
    this.ritualFailModal = this.hudRoot.querySelector("#hud-ritual-fail-modal");
    this.ritualFailDesc = this.hudRoot.querySelector("#hud-ritual-fail-desc");

    this.chatWrap = this.hudRoot.querySelector("#hud-chat-wrap");
    this.chatMinBtn = this.hudRoot.querySelector("#hud-chat-min");
    this.chatBody = this.hudRoot.querySelector("#hud-chat-body");
    this.chatLines = this.hudRoot.querySelector("#hud-chat-lines");
    this.chatInput = this.hudRoot.querySelector("#hud-chat-input");

    this.noticeBanner = this.hudRoot.querySelector("#hud-notice-banner");
    this.noticeBannerText = this.hudRoot.querySelector("#hud-notice-text");
    this.noticeBannerClose = this.hudRoot.querySelector("#hud-notice-close");
    this.contextPill = this.hudRoot.querySelector("#hud-context-pill");
    this.contextPillText = this.hudRoot.querySelector("#hud-context-text");
    this.stealthPill = this.hudRoot.querySelector("#hud-stealth-pill");
    this.autoBtn = this.hudRoot.querySelector("#hud-auto-btn");
    this.vitalBtn = this.hudRoot.querySelector("#hud-vital-btn");
    this.vitalIcon = this.hudRoot.querySelector("#hud-vital-icon");
    this.pvpLbl = this.hudRoot.querySelector("#hud-pvp-lbl");

    this.ceremonyBanner = this.hudRoot.querySelector("#hud-ceremony-banner");
    this.cerTitle = this.hudRoot.querySelector("#hud-cer-title");
    this.cerSub = this.hudRoot.querySelector("#hud-cer-sub");
    this.cerDesc = this.hudRoot.querySelector("#hud-cer-desc");
    this.downedOverlay = this.hudRoot.querySelector("#hud-downed-overlay");

    this.tooltip = this.hudRoot.querySelector("#hud-slot-tooltip");
    this.ttTitle = this.hudRoot.querySelector("#hud-tt-title");
    this.ttMeta = this.hudRoot.querySelector("#hud-tt-meta");
    this.ttDesc = this.hudRoot.querySelector("#hud-tt-desc");

    this.joystickZoneEl = this.hudRoot.querySelector("#joystick-zone");
    this.mobaPadEl = this.hudRoot.querySelector("#hud-moba-pad");
    this.auxPadEl = this.hudRoot.querySelector("#hud-aux-pad");
    this.mobaVitalBtn = this.hudRoot.querySelector("#moba-vital-btn");
    this.mobaVitalIcon = this.hudRoot.querySelector("#moba-vital-icon");
    this.auxAutoBtn = this.hudRoot.querySelector("#aux-auto-btn");
    this.auxAutoLbl = this.hudRoot.querySelector("#aux-auto-lbl");
    this.auxAbsorbBtn = this.hudRoot.querySelector("#aux-absorb-btn");
    this.edJoyVal = this.hudRoot.querySelector("#hud-ed-joy-val");
    this.edSkVal = this.hudRoot.querySelector("#hud-ed-sk-val");
  }

  _showTooltip(title, meta, desc) {
    if (!this.tooltip) return;
    this.ttTitle.textContent = title;
    this.ttMeta.textContent = meta;
    this.ttDesc.textContent = desc;
    this.tooltip.classList.add("is-visible");
  }

  _hideTooltip() {
    this.tooltip?.classList.remove("is-visible");
  }

  _bindEvents(getDefaultAngle) {
    this.joystick = new VirtualJoystick(
      this.joystickZoneEl,
      this.hudRoot.querySelector("#joystick-base"),
      this.hudRoot.querySelector("#joystick-knob"),
      { maxRadius: 42, deadzone: 0.12 }
    );
    this.skillPad = new SkillPad({
      slots: {},
      cancelZoneEl: this.hudRoot.querySelector("#skill-cancel-zone"),
      getDefaultAngle,
      externalCooldowns: true,
      canCast: (slotId) => {
        if (this.isEditingHud) return false;
        const p = this._lastPlayerRef;
        if (!p) return true;
        if (slotId === "dash") return true;
        if (slotId === "vital") return Boolean(p.getVitalGu?.());
        if (slotId === "km1") return Boolean(p.killerMoveIds?.[0]);
        if (slotId === "km2") return Boolean(p.killerMoveIds?.[1]);
        if (slotId.startsWith("slot_")) {
          const idx = Number(slotId.slice(5));
          return Boolean(p.getActiveGu?.(idx));
        }
        return true;
      },
      onCast: (payload) => this.onCast?.(payload),
    });

    const registerMobaAim = (btn, slotId) => {
      if (!btn) return;
      this.skillPad.registerButton(slotId, btn);
    };
    registerMobaAim(this.mobaVitalBtn, "vital");
    for (let i = 0; i < 7; i++) {
      const mBtn = this.hudRoot.querySelector(`[data-moba-slot="${i}"]`);
      registerMobaAim(mBtn, `slot_${i}`);
      mBtn?.addEventListener("mouseenter", () => {
        const g = this.lastSlotData[i];
        if (g) this._showTooltip(g.name, `Chuyển ${g.rank} · Tiêu hao ${g.mpCost} Chân nguyên · CD ${g.cooldown}s`, g.description);
      });
      mBtn?.addEventListener("mouseleave", () => this._hideTooltip());
    }
    registerMobaAim(this.hudRoot.querySelector("#moba-km-0"), "km1");
    registerMobaAim(this.hudRoot.querySelector("#moba-km-1"), "km2");
    registerMobaAim(this.hudRoot.querySelector("#aux-dash-btn"), "dash");

    this.mobaVitalBtn?.addEventListener("mouseenter", () => {
      const g = this.lastVitalData;
      if (g) this._showTooltip(`${g.name} (Cổ Bản Mệnh)`, `Chuyển ${g.rank} · Chân nguyên ${g.mpCost}`, g.vitalResonanceDesc || g.description);
    });
    this.mobaVitalBtn?.addEventListener("mouseleave", () => this._hideTooltip());
    [0, 1].forEach((idx) => {
      const kmBtn = this.hudRoot.querySelector(`#moba-km-${idx}`);
      kmBtn?.addEventListener("mouseenter", () => {
        const km = this.lastKmData[idx];
        if (km) this._showTooltip(`Sát Chiêu: ${km.name}`, `Cần ${km.thoughtCost} Thanh Niệm · ${km.mpCost} Chân nguyên`, km.desc);
      });
      kmBtn?.addEventListener("mouseleave", () => this._hideTooltip());
    });

    this.hudRoot.querySelector("#moba-basic-btn")?.addEventListener("pointerdown", (e) => {
      if (this.isEditingHud) return;
      if (e.pointerType === "mouse" && e.button !== 0) return;
      e.preventDefault();
      this.onBasicAttack?.();
    });
    this.hudRoot.querySelector("#moba-target-btn")?.addEventListener("pointerdown", (e) => {
      if (this.isEditingHud) return;
      if (e.pointerType === "mouse" && e.button !== 0) return;
      e.preventDefault();
      this.onCycleTarget?.();
    });
    this.hudRoot.querySelectorAll("[data-moba-qi]").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (!this.isEditingHud) this.onUseQuickItem?.(Number(btn.dataset.mobaQi));
      });
    });
    this.auxAutoBtn?.addEventListener("click", () => {
      if (!this.isEditingHud) this.onToggleAutoCombat?.();
    });
    if (this.auxAbsorbBtn) {
      const stopAbs = () => {
        this.auxAbsorbBtn.classList.remove("is-active");
        this.onAbsorbEnd?.();
      };
      this.auxAbsorbBtn.addEventListener("pointerdown", (e) => {
        if (this.isEditingHud) return;
        e.preventDefault();
        this.auxAbsorbBtn.classList.add("is-active");
        this.onAbsorbStart?.();
      });
      this.auxAbsorbBtn.addEventListener("pointerup", stopAbs);
      this.auxAbsorbBtn.addEventListener("pointerleave", stopAbs);
      this.auxAbsorbBtn.addEventListener("pointercancel", stopAbs);
    }

    this.hudRoot.querySelector("#hud-ed-joy-minus")?.addEventListener("click", () => {
      this.updateHudLayout({ joystick: { scale: (this.hudLayout.joystick?.scale ?? 1) - 0.1 } });
    });
    this.hudRoot.querySelector("#hud-ed-joy-plus")?.addEventListener("click", () => {
      this.updateHudLayout({ joystick: { scale: (this.hudLayout.joystick?.scale ?? 1) + 0.1 } });
    });
    this.hudRoot.querySelector("#hud-ed-sk-minus")?.addEventListener("click", () => {
      const next = (this.hudLayout.skills?.scale ?? 1) - 0.1;
      this.updateHudLayout({ skills: { scale: next }, aux: { scale: next } });
    });
    this.hudRoot.querySelector("#hud-ed-sk-plus")?.addEventListener("click", () => {
      const next = (this.hudLayout.skills?.scale ?? 1) + 0.1;
      this.updateHudLayout({ skills: { scale: next }, aux: { scale: next } });
    });
    this.hudRoot.querySelector("#hud-ed-swap")?.addEventListener("click", () => this.swapHudHands());
    this.hudRoot.querySelector("#hud-ed-reset")?.addEventListener("click", () => this.resetHudLayout());
    this.hudRoot.querySelector("#hud-ed-done")?.addEventListener("click", () => this.closeHudEditor());
    this._bindHudEditorDrag();

    this.hudRoot.querySelector("#hud-avatar-btn")?.addEventListener("click", () => this.onOpenPanel?.("char"));
    this.questToggleBtn?.addEventListener("click", () => this.setQuestCollapsed(!this.questCollapsed));
    this.questHideBtn?.addEventListener("click", () => this.setQuestCollapsed(true));
    this.questRestoreBtn?.addEventListener("click", () => this.setQuestCollapsed(false));
    this.mobileMenuBtn?.addEventListener("click", () => this.setMobileMenuOpen(!this.mobileMenuOpen));
    this.hudRoot.querySelector("#hud-story-open-btn")?.addEventListener("click", () => {
      this.onOpenPanel?.("quests", "story");
    });

    if (!this._resizeHandler) {
      this._resizeHandler = () => this.syncViewportMode();
      window.addEventListener("resize", this._resizeHandler);
      window.addEventListener("orientationchange", this._resizeHandler);
    }

    this.hudRoot.querySelectorAll("[data-qtab]").forEach((btn) => {
      btn.addEventListener("click", () => {
        this.questTab = btn.dataset.qtab;
        this._lastQuestRenderKey = "";
        this._armedQuestKey = "";
        this.hudRoot.querySelectorAll("[data-qtab]").forEach((b) => b.classList.toggle("is-active", b === btn));
      });
    });

    const handleQuestCardAction = (btn, isDouble) => {
      if (!btn) return;
      const now = performance.now();
      if (btn.dataset.openStory) {
        this.onOpenPanel?.("quests", "story");
        return;
      }
      if (btn.dataset.openQuests) {
        this.onOpenPanel?.("quests", "main");
        return;
      }
      if (btn.dataset.questId) {
        const found = MAIN_QUESTS.find((x) => x.id === btn.dataset.questId);
        if (!found) return;
        const key = `main:${found.id}`;
        if (isDouble || (this._armedQuestKey === key && now - this._armedQuestAt <= 900)) {
          if (now - this._lastQuestTriggerAt < 250) return;
          this._lastQuestTriggerAt = now;
          this._armedQuestKey = "";
          this._lastQuestRenderKey = "";
          this.onQuestClick?.(found, { autoTravel: true });
        } else {
          this._armedQuestKey = key;
          this._armedQuestAt = now;
          this._lastQuestRenderKey = "";
        }
        return;
      }
      if (btn.dataset.sideIdx !== undefined) {
        const idx = Number(btn.dataset.sideIdx);
        const item = this._currentSideItems?.[idx];
        if (!item) return;
        if (item.done || item.claimed) {
          this.onOpenPanel?.("quests", item.kind === "gu" ? "gu_quests" : "main");
          return;
        }
        const key = `side:${idx}`;
        if (isDouble || (this._armedQuestKey === key && now - this._armedQuestAt <= 900)) {
          if (now - this._lastQuestTriggerAt < 250) return;
          this._lastQuestTriggerAt = now;
          this._armedQuestKey = "";
          this._lastQuestRenderKey = "";
          if (item.mapId) {
            this.onQuestClick?.(
              {
                id: `side_${idx}`,
                title: item.title,
                goal: { type: item.goalType, enemyType: item.enemyType },
                target: {
                  mapId: item.mapId,
                  x: item.x,
                  y: item.y,
                  type: item.goalType === "gather_any" ? "gather" : item.enemyType ? "enemy" : "move",
                  targetId: item.enemyType || null,
                },
              },
              { autoTravel: true }
            );
          }
        } else {
          this._armedQuestKey = key;
          this._armedQuestAt = now;
          this._lastQuestRenderKey = "";
        }
      }
    };
    this.questListEl?.addEventListener("click", (e) => {
      handleQuestCardAction(e.target.closest(".ctl-quest-item"), false);
    });
    this.questListEl?.addEventListener("dblclick", (e) => {
      handleQuestCardAction(e.target.closest(".ctl-quest-item"), true);
    });

    this.hudRoot.querySelector("#hud-minimap-toggle")?.addEventListener("click", () => {
      this.minimapCollapsed = !this.minimapCollapsed;
      this.minimapWrap?.classList.toggle("is-collapsed", this.minimapCollapsed);
    });

    this.hudRoot.querySelectorAll("[data-panel]").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (this.mobileMenuOpen) this.setMobileMenuOpen(false);
        this.onOpenPanel?.(btn.dataset.panel, btn.dataset.openSubtab || null);
      });
    });
    this.noticeBannerClose?.addEventListener("click", () => {
      this._dismissedNoticeKey = this._lastNoticeKey;
      if (this._lastPlayerRef) this._lastPlayerRef.lastBacklashNotice = "";
      this.noticeBanner?.classList.remove("is-visible");
    });
    this.hudRoot.querySelectorAll("[data-event]").forEach((btn) => {
      btn.addEventListener("click", () => this.onStartEvent?.(btn.dataset.event));
    });
    this.exitInstBtn?.addEventListener("click", () => this.onExitInstance?.());
    this.hudRoot.querySelector("#hud-pvp-btn")?.addEventListener("click", () => this.onTogglePvp?.());

    this.chatMinBtn?.addEventListener("click", () => {
      this.setChatCollapsed(!this.chatCollapsed);
    });
    this.hudRoot.querySelector("#hud-chat-mute")?.addEventListener("click", (e) => {
      this.chatMuted = !this.chatMuted;
      e.target.textContent = this.chatMuted ? "Mở" : "Câm";
    });
    this.hudRoot.querySelectorAll("[data-chat-tab]").forEach((btn) => {
      btn.addEventListener("click", () => {
        this.chatTab = btn.dataset.chatTab;
        this.hudRoot.querySelectorAll("[data-chat-tab]").forEach((b) => b.classList.toggle("is-active", b === btn));
      });
    });
    this.hudRoot.querySelector("#hud-chat-form")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const val = (this.chatInput?.value ?? "").trim();
      if (!val) return;
      this.chatInput.value = "";
      this.pushSystemMessage(this.charNameEl?.textContent || "Đạo Hữu", val, "zone");
      try {
        await this.onSendChat?.(val);
      } catch {
        // Lưu local feed
      }
    });

    this.hudRoot.querySelector("#hud-basic-btn")?.addEventListener("click", () => this.onBasicAttack?.());
    this.vitalBtn?.addEventListener("click", () => this.onCast?.({ slotId: "vital", angle: getDefaultAngle() }));
    this.vitalBtn?.addEventListener("mouseenter", () => {
      const g = this.lastVitalData;
      if (g) this._showTooltip(`${g.name} (Cổ Bản Mệnh)`, `Chuyển ${g.rank} · Chân nguyên ${g.mpCost}`, g.vitalResonanceDesc || g.description);
    });
    this.vitalBtn?.addEventListener("mouseleave", () => this._hideTooltip());

    this.hudRoot.querySelectorAll("[data-arch-slot]").forEach((btn) => {
      const idx = Number(btn.dataset.archSlot);
      btn.addEventListener("click", () => this.onCast?.({ slotId: `slot_${idx}`, angle: getDefaultAngle() }));
      btn.addEventListener("mouseenter", () => {
        const g = this.lastSlotData[idx];
        if (g) this._showTooltip(g.name, `Chuyển ${g.rank} · Tiêu hao ${g.mpCost} Chân nguyên · CD ${g.cooldown}s`, g.description);
      });
      btn.addEventListener("mouseleave", () => this._hideTooltip());
    });

    this.hudRoot.querySelector("#hud-km-0")?.addEventListener("click", () => this.onCast?.({ slotId: "km1", angle: getDefaultAngle() }));
    this.hudRoot.querySelector("#hud-km-1")?.addEventListener("click", () => this.onCast?.({ slotId: "km2", angle: getDefaultAngle() }));
    [0, 1].forEach((idx) => {
      const el = this.hudRoot.querySelector(`#hud-km-${idx}`);
      el?.addEventListener("mouseenter", () => {
        const km = this.lastKmData[idx];
        if (km) {
          const reqTxt = km.isMultiGu
            ? `Tổ Hợp ${km.guNames?.length || 2} Cổ · ${km.mpCost} MP · Ổn định ${km.stabilityPct}%`
            : `Cần ${km.thoughtCost} Thanh Niệm · ${km.mpCost} Chân nguyên`;
          this._showTooltip(`Sát Chiêu: ${km.name}`, reqTxt, km.desc);
        }
      });
      el?.addEventListener("mouseleave", () => this._hideTooltip());
    });

    this.hudRoot.querySelector("#hud-dash-btn")?.addEventListener("click", () => this.onCast?.({ slotId: "dash", angle: getDefaultAngle() }));
    this.hudRoot.querySelectorAll("[data-quick-item]").forEach((btn) => {
      btn.addEventListener("click", () => this.onUseQuickItem?.(Number(btn.dataset.quickItem)));
    });

    const absBtn = this.hudRoot.querySelector("#hud-absorb-pill");
    if (absBtn) {
      absBtn.addEventListener("pointerdown", () => this.onAbsorbStart?.());
      absBtn.addEventListener("pointerup", () => this.onAbsorbEnd?.());
      absBtn.addEventListener("pointerleave", () => this.onAbsorbEnd?.());
      absBtn.addEventListener("pointercancel", () => this.onAbsorbEnd?.());
    }
    this.contextPill?.addEventListener("click", () => this.onInteract?.());
    this.autoBtn?.addEventListener("click", () => this.onToggleAutoCombat?.());
    this.hudRoot.querySelector("#hud-cer-close")?.addEventListener("click", () => {
      this.ceremonyBanner?.classList.remove("is-visible");
    });
    this.hudRoot.querySelector("#hud-respawn-station")?.addEventListener("click", () => this.onRespawn?.("station"));
    this.hudRoot.querySelector("#hud-respawn-town")?.addEventListener("click", () => this.onRespawn?.("town"));
    this.hudRoot.querySelector("#btn-ritual-surge")?.addEventListener("click", () => this.onTriggerSurge?.());
    this.hudRoot.querySelector("#btn-ritual-confirm")?.addEventListener("click", () => this.onInteract?.());
    this.hudRoot.querySelector("#btn-ritual-retry")?.addEventListener("click", () => {
      this.ritualFailModal?.classList.remove("is-visible");
      this.onRitualChoice?.("retry");
    });
    this.hudRoot.querySelector("#btn-ritual-mortal")?.addEventListener("click", () => {
      this.ritualFailModal?.classList.remove("is-visible");
      this.onRitualChoice?.("mortal");
    });
    this.minimapCanvas?.addEventListener("click", (e) => {
      if (!this._lastMapSize || !this.onMinimapClick) return;
      const rect = this.minimapCanvas.getBoundingClientRect();
      const rx = (e.clientX - rect.left) / Math.max(1, rect.width);
      const ry = (e.clientY - rect.top) / Math.max(1, rect.height);
      this.onMinimapClick(Math.round(rx * this._lastMapSize.w), Math.round(ry * this._lastMapSize.h));
    });
  }

  showRitualFailPrompt(evalInfo = {}) {
    if (!this.ritualFailModal) return;
    if (this.ritualFailDesc) {
      this.ritualFailDesc.textContent = `Bạn mới bước được ${evalInfo.steps ?? 0}/45 bước (cần tối thiểu 10 bước để đạt Đinh Đẳng). Hãy đi sâu hơn vào biển đom đóm Hy Vọng Cổ hoặc chấp nhận nhánh Phàm Nhân Nghịch Mệnh!`;
    }
    this.ritualFailModal.classList.add("is-visible");
  }

  openStarterGuModal(player) {
    if (!this.starterGuModal || !this.starterGuGrid) return;
    const apt = player.getAptitudeInfo();
    if (this.starterAptEl) {
      this.starterAptEl.textContent = `${apt.name} · ${player.apertureSeaPct || apt.defaultSeaPct || 48}% Chân Nguyên (${player.awakeningSteps || 27} bước)`;
      this.starterAptEl.style.color = apt.color;
    }
    this.starterGuGrid.innerHTML = STARTER_VITAL_BUILDS.map((b) => {
      const g = GU_CATALOG[b.vitalGuId || b.id];
      if (!g) return "";
      return `
        <button type="button" class="ctl-starter-item" data-choose-starter-gu="${b.id}" style="border-left:4px solid ${g.color}">
          <span class="ctl-icon-box" style="width:36px;height:36px">${getGuIconSvg(g)}</span>
          <div class="ctl-starter-info">
            <div style="display:flex;align-items:center;justify-content:space-between;gap:6px">
              <strong style="color:${g.color}">${b.title}</strong>
              <span class="ctl-qi-badge">${b.archetype}</span>
            </div>
            <div class="ctl-sub-txt">${b.subtitle}</div>
            <div class="ctl-starter-loc">${b.summary}</div>
          </div>
        </button>
      `;
    }).join("");
    this.starterGuGrid.querySelectorAll("[data-choose-starter-gu]").forEach((btn) => {
      btn.addEventListener("click", () => {
        this.starterGuModal.classList.remove("is-visible");
        this.onPickTargetGu?.(btn.dataset.chooseStarterGu);
      });
    });
    this.starterGuModal.classList.add("is-visible");
  }

  showCeremonyBanner(title, subtitle, desc, color = "#ffd15c") {
    if (!this.ceremonyBanner) return;
    this.cerTitle.textContent = title;
    this.cerSub.textContent = subtitle;
    this.cerSub.style.color = color;
    this.cerDesc.textContent = desc;
    this.ceremonyBanner.classList.add("is-visible");
    clearTimeout(this._cerTimer);
    this._cerTimer = setTimeout(() => this.ceremonyBanner?.classList.remove("is-visible"), 6500);
  }

  _updateSlotCooldownEl(el, cdInfo, isOom = false) {
    if (!el) return;
    const mask = el.querySelector(".ctl-cd-mask");
    const num = el.querySelector(".ctl-cd-num");
    if (mask) mask.style.setProperty("--cd-pct", cdInfo.rem > 0 ? `${Math.round(cdInfo.pct * 100)}%` : "0%");
    if (num) num.textContent = cdInfo.rem > 0 ? cdInfo.rem.toFixed(1) : "";
    el.classList.toggle("is-on-cd", cdInfo.rem > 0);
    el.classList.toggle("is-oom", Boolean(isOom));
  }

  pushSystemMessage(sender, text, kind = "sys") {
    this.localChatFeed.push({ kind, sender, text });
    if (this.localChatFeed.length > 35) this.localChatFeed.shift();
  }

  setQuestCollapsed(collapsed, persist = true) {
    this.questCollapsed = Boolean(collapsed);
    this.questBox?.classList.toggle("is-collapsed", this.questCollapsed);
    this.questRestoreBtn?.classList.toggle("is-visible", this.questCollapsed);
    if (this.questToggleBtn) {
      this.questToggleBtn.textContent = this.questCollapsed ? "+" : "-";
      this.questToggleBtn.title = this.questCollapsed ? "Hiện bảng nhiệm vụ" : "Ẩn bảng nhiệm vụ";
    }
    if (persist) {
      try {
        localStorage.setItem("ctl_quest_collapsed", this.questCollapsed ? "1" : "0");
      } catch {
        // Bỏ qua nếu trình duyệt chặn storage
      }
    }
  }

  setChatCollapsed(collapsed) {
    this.chatCollapsed = Boolean(collapsed);
    this.chatWrap?.classList.toggle("is-collapsed", this.chatCollapsed);
    this.chatBody?.classList.toggle("is-hidden", this.chatCollapsed);
    if (this.chatMinBtn) this.chatMinBtn.textContent = this.chatCollapsed ? "+" : "-";
  }

  setMobileMenuOpen(open) {
    this.mobileMenuOpen = Boolean(open);
    this.utilDrawer?.classList.toggle("is-mobile-open", this.mobileMenuOpen);
    this.mobileMenuBtn?.classList.toggle("is-active", this.mobileMenuOpen);
    if (this.mobileMenuLbl) this.mobileMenuLbl.textContent = this.mobileMenuOpen ? "Đóng" : "Menu";
  }

  getUiMode() {
    return this.uiMode || "auto";
  }

  cycleUiMode() {
    const order = ["auto", "mobile", "desktop"];
    this.uiMode = order[(order.indexOf(this.uiMode) + 1) % order.length];
    try {
      localStorage.setItem("ctl_ui_mode", this.uiMode);
    } catch {
      // Bỏ qua nếu trình duyệt chặn storage
    }
    this.syncViewportMode();
    return this.uiMode;
  }

  syncViewportMode() {
    const vw = window.innerWidth || 1280;
    const vh = window.innerHeight || 720;
    const coarse = Boolean(window.matchMedia?.("(pointer: coarse)")?.matches);
    const isNativeApp = Boolean(window.Capacitor?.isNativePlatform?.());
    const autoMobile = isNativeApp || (vw <= 932 && (vw <= 768 || vh <= 540)) || coarse;
    const isMobile = this.uiMode === "mobile" || (this.uiMode === "auto" && autoMobile);
    const isPortrait = isMobile && vh > vw;
    const isLandscape = isMobile && vw >= vh;

    document.body.classList.toggle("is-mobile-ui", isMobile);
    document.body.classList.toggle("is-mobile-portrait", isPortrait);
    document.body.classList.toggle("is-mobile-landscape", isLandscape);

    if (isMobile && !this._wasMobileUi) {
      this.setChatCollapsed(true);
      this.setMobileMenuOpen(false);
    } else if (!isMobile && this._wasMobileUi) {
      this.setMobileMenuOpen(false);
    }
    this._wasMobileUi = isMobile;
  }

  getHudLayout() {
    return this._normalizeHudLayout(this.hudLayout);
  }

  updateHudLayout(patch = {}) {
    const prev = this.hudLayout || createDefaultHudLayout();
    this.hudLayout = this._normalizeHudLayout({
      skillStyle: patch.skillStyle ?? prev.skillStyle,
      handedness: patch.handedness ?? prev.handedness,
      alwaysShowJoystick: patch.alwaysShowJoystick ?? prev.alwaysShowJoystick,
      joystick: { ...prev.joystick, ...(patch.joystick || {}) },
      skills: { ...prev.skills, ...(patch.skills || {}) },
      aux: { ...prev.aux, ...(patch.aux || {}) },
    });
    this._saveHudLayout();
    this.applyHudLayout();
    return this.getHudLayout();
  }

  swapHudHands() {
    const cur = this.hudLayout || createDefaultHudLayout();
    const nextHand = cur.handedness === "left" ? "right" : "left";
    const vw = window.innerWidth || 1280;
    const mirrorPct = (widgetCfg, el) => {
      if (widgetCfg?.xPct === null || widgetCfg?.xPct === undefined) return widgetCfg;
      const wPct = el ? (el.getBoundingClientRect().width / Math.max(1, vw)) * 100 : 18;
      return {
        ...widgetCfg,
        xPct: Math.round(clampHudVal(100 - wPct - widgetCfg.xPct, 1, 86, widgetCfg.xPct) * 10) / 10,
      };
    };
    return this.updateHudLayout({
      handedness: nextHand,
      joystick: mirrorPct(cur.joystick, this.joystickZoneEl),
      skills: mirrorPct(cur.skills, this.mobaPadEl),
      aux: mirrorPct(cur.aux, this.auxPadEl),
    });
  }

  resetHudLayout() {
    this.hudLayout = createDefaultHudLayout();
    this._saveHudLayout();
    this.applyHudLayout();
    return this.getHudLayout();
  }

  applyHudLayout() {
    const l = this.hudLayout || createDefaultHudLayout();
    document.body.classList.toggle("is-skill-moba", l.skillStyle !== "bar");
    document.body.classList.toggle("is-skill-bar", l.skillStyle === "bar");
    document.body.classList.toggle("is-left-handed", l.handedness === "left");
    document.body.classList.toggle("is-joy-always", Boolean(l.alwaysShowJoystick));

    const applyWidget = (el, cfg) => {
      if (!el || !cfg) return;
      el.style.setProperty("--ctl-widget-scale", String(cfg.scale ?? 1));
      if (cfg.xPct !== null && cfg.yPct !== null) {
        el.style.left = `${cfg.xPct}%`;
        el.style.top = `${cfg.yPct}%`;
        el.style.right = "auto";
        el.style.bottom = "auto";
        el.classList.add("is-custom-pos");
      } else {
        el.style.left = "";
        el.style.top = "";
        el.style.right = "";
        el.style.bottom = "";
        el.classList.remove("is-custom-pos");
      }
    };

    applyWidget(this.joystickZoneEl, l.joystick);
    applyWidget(this.mobaPadEl, l.skills);
    applyWidget(this.auxPadEl, l.aux);

    if (this.edJoyVal) this.edJoyVal.textContent = `${Math.round((l.joystick?.scale ?? 1) * 100)}%`;
    if (this.edSkVal) this.edSkVal.textContent = `${Math.round((l.skills?.scale ?? 1) * 100)}%`;
  }

  openHudEditor() {
    this.isEditingHud = true;
    this.setMobileMenuOpen(false);
    document.body.classList.add("is-editing-hud");
    this.applyHudLayout();
  }

  closeHudEditor() {
    this.isEditingHud = false;
    document.body.classList.remove("is-editing-hud");
    this.applyHudLayout();
  }

  _bindHudEditorDrag() {
    const widgets = [
      ["joystick", this.joystickZoneEl],
      ["skills", this.mobaPadEl],
      ["aux", this.auxPadEl],
    ];
    for (const [key, el] of widgets) {
      if (!el) continue;
      let dragState = null;
      el.addEventListener("pointerdown", (e) => {
        if (!this.isEditingHud) return;
        e.preventDefault();
        e.stopPropagation();
        const rect = el.getBoundingClientRect();
        try {
          el.setPointerCapture(e.pointerId);
        } catch {
          // Bỏ qua nếu môi trường không hỗ trợ pointer capture
        }
        dragState = {
          pointerId: e.pointerId,
          offsetX: e.clientX - rect.left,
          offsetY: e.clientY - rect.top,
          w: rect.width,
          h: rect.height,
        };
      });
      const onMove = (e) => {
        if (!dragState || e.pointerId !== dragState.pointerId || !this.isEditingHud) return;
        e.preventDefault();
        const vw = Math.max(1, window.innerWidth || 1280);
        const vh = Math.max(1, window.innerHeight || 720);
        const nextLeft = Math.max(4, Math.min(vw - Math.min(dragState.w, vw * 0.85) - 4, e.clientX - dragState.offsetX));
        const nextTop = Math.max(48, Math.min(vh - Math.min(dragState.h, vh * 0.85) - 4, e.clientY - dragState.offsetY));
        const xPct = Math.round(((nextLeft / vw) * 100) * 10) / 10;
        const yPct = Math.round(((nextTop / vh) * 100) * 10) / 10;
        dragState.xPct = xPct;
        dragState.yPct = yPct;
        el.style.left = `${xPct}%`;
        el.style.top = `${yPct}%`;
        el.style.right = "auto";
        el.style.bottom = "auto";
        el.classList.add("is-custom-pos");
      };
      const onUp = (e) => {
        if (!dragState || e.pointerId !== dragState.pointerId) return;
        const { xPct, yPct } = dragState;
        dragState = null;
        if (xPct !== undefined && yPct !== undefined) {
          this.updateHudLayout({ [key]: { xPct, yPct } });
        }
      };
      el.addEventListener("pointermove", onMove);
      el.addEventListener("pointerup", onUp);
      el.addEventListener("pointercancel", onUp);
    }
  }

  focusChatInput() {
    this.setChatCollapsed(false);
    this.chatInput?.focus();
  }

  syncOnlineFeed(onlineHub) {
    if (!onlineHub?.messages || this.chatMuted) return;
    this._renderChat(onlineHub.messages);
  }

  _renderChat(onlineMsgs = []) {
    if (!this.chatLines) return;
    const merged = [
      ...this.localChatFeed,
      ...onlineMsgs.map((m) => ({
        kind: m.kind === "fusion" ? "sys" : "world",
        sender: m.sender_name,
        text: m.message,
      })),
    ].slice(-14);

    const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    this.chatLines.innerHTML = merged
      .map((m) => {
        const tag = m.kind === "sys" ? "Hệ thống" : m.kind === "world" ? "Thế giới" : "Vùng";
        return `<div class="ctl-chat-line"><span class="ctl-chat-tag">[${tag}]</span> <b>${esc(m.sender)}:</b> ${esc(m.text)}</div>`;
      })
      .join("");
    this.chatLines.scrollTop = this.chatLines.scrollHeight;
  }

  syncState(player, world, onlineHub = null) {
    this._lastPlayerRef = player;
    const stage = player.getStage();
    const apt = player.getAptitudeInfo();
    if (this.charNameEl) this.charNameEl.textContent = player.characterName;
    if (this.charRealmEl) {
      this.charRealmEl.textContent = player.hasAwakened ? `${apt.short} · ${stage.title}` : "Phàm Nhân · Chưa Khai Khiếu";
    }

    const pKey = JSON.stringify(player.appearance);
    if (pKey !== this.lastPortraitKey && this.portraitCanvas) {
      this.lastPortraitKey = pKey;
      drawCharacterPortrait(this.portraitCanvas, player.appearance);
    }

    if (this.hpFill) this.hpFill.style.width = `${Math.max(0, (player.hp / Math.max(1, player.maxHp)) * 100)}%`;
    if (this.hpText) this.hpText.textContent = `${Math.ceil(player.hp)}/${player.maxHp}`;
    if (this.mpFill) {
      this.mpFill.style.width = player.maxMp > 0 ? `${Math.max(0, (player.mp / player.maxMp) * 100)}%` : "0%";
      this.mpFill.style.background = player.hasAwakened
        ? `linear-gradient(90deg, ${stage.essenceColor}, #6cf7d4)`
        : "#2a2b28";
    }
    if (this.mpText) this.mpText.textContent = player.hasAwakened ? `${Math.floor(player.mp)}/${player.maxMp}` : "Chưa Khai Khiếu";
    if (this.staFill) this.staFill.style.width = `${Math.max(0, (player.stamina / player.maxStamina) * 100)}%`;

    if (this.dailyDot) {
      this.dailyDot.style.display = player.dailyClaimed ? "none" : "block";
    }

    // Quests
    const mainIdx = Math.max(0, Math.min(MAIN_QUESTS.length, player.mainQuestIndex ?? 0));
    const mainTabEl = this.hudRoot.querySelector('[data-qtab="main"]');
    if (mainTabEl) {
      mainTabEl.textContent = mainIdx >= MAIN_QUESTS.length ? `Chính (${MAIN_QUESTS.length}/${MAIN_QUESTS.length})` : `Chính (${mainIdx + 1}/${MAIN_QUESTS.length})`;
    }
    if (this.questRestoreLbl) {
      const nextRestoreText =
        mainIdx >= MAIN_QUESTS.length ? `Nhiệm Vụ · Thông Tuyến ▾` : `Nhiệm Vụ · Chính ${mainIdx + 1}/${MAIN_QUESTS.length} ▾`;
      if (this.questRestoreLbl.textContent !== nextRestoreText) {
        this.questRestoreLbl.textContent = nextRestoreText;
      }
    }
    const sideCount = (player.activeGuQuest ? 1 : 0) + (player.clanBoard?.length ?? 0);
    const sideTabEl = this.hudRoot.querySelector('[data-qtab="side"]');
    if (sideTabEl) sideTabEl.textContent = `Phụ (${sideCount})`;

    if (this.questListEl) {
      if (this.questTab === "main") {
        const q = MAIN_QUESTS[player.mainQuestIndex];
        if (!q) {
          const rKey = `main:done:${MAIN_QUESTS.length}`;
          if (this._lastQuestRenderKey !== rKey) {
            this._lastQuestRenderKey = rKey;
            this.questListEl.innerHTML = `
              <button type="button" class="ctl-quest-item" data-open-story="1">
                <div class="ctl-qi-title"><span class="ctl-qi-badge">Thông Tuyến</span> Độc Bộ Ngũ Vực (${MAIN_QUESTS.length}/${MAIN_QUESTS.length})</div>
                <div class="ctl-qi-obj">▸ Đã hoàn tất toàn bộ 18 Chương Chính Tuyến Cổ Chân Nhân!</div>
                <div class="ctl-qi-loc">Mở Biên Niên Sử (J) hoặc khiêu chiến Tháp / Lôi Đài</div>
              </button>
            `;
          }
        } else {
          const actInfo = STORY_ACTS.find((a) => a.id === q.act);
          const need = q.goal?.count ?? 1;
          const cur = Math.min(need, player.questProgress ?? 0);
          const armed = this._armedQuestKey === `main:${q.id}`;
          const rKey = `main:${q.id}:${cur}:${need}:${player.targetStarterGuId || ""}:${armed ? 1 : 0}`;
          if (this._lastQuestRenderKey !== rKey) {
            this._lastQuestRenderKey = rKey;
            let obj = q.objectiveText;
            let loc = q.locationHint;
            if (q.id === "mq_03_tim_co" && player.targetStarterGuId) {
              const hab = STARTER_GU_HABITATS[player.targetStarterGuId];
              const gName = GU_CATALOG[player.targetStarterGuId]?.name ?? "Cổ Bản Mệnh";
              if (hab) {
                obj = `Tự tìm & Luyện hóa [${gName}]: ${hab.hint}`;
                loc = hab.areaName;
              }
            }
            const progressTag = need > 1 ? ` (${cur}/${need})` : "";
            this.questListEl.innerHTML = `
              <button type="button" class="ctl-quest-item ${armed ? "is-armed" : ""}" data-quest-id="${q.id}">
                <div class="ctl-qi-act">${actInfo?.name || "Chính Tuyến"} · Chương ${q.chapter}/${MAIN_QUESTS.length}</div>
                <div class="ctl-qi-title"><span class="ctl-qi-badge">Chính</span> ${q.title}</div>
                <div class="ctl-qi-obj">▸ ${obj}<b>${progressTag}</b></div>
                <div class="ctl-qi-loc">${armed ? "Ấn thêm 1 lần để tự đi tới · " : ""}${loc} · +${q.rewards?.stones ?? 0} Thạch</div>
              </button>
            `;
          }
        }
      } else {
        const sideItems = [];
        if (player.activeGuQuest) {
          const gq = player.activeGuQuest;
          const need = gq.goal?.count ?? 1;
          const cur = Math.min(need, gq.progress ?? 0);
          sideItems.push({
            id: gq.id,
            kind: "gu",
            title: gq.title,
            obj: gq.completed ? `Hoàn thành (${cur}/${need}) — Bấm mở (J) Luyện Cổ!` : `${gq.desc} (${cur}/${need})`,
            loc: gq.pathLabel || "Nhiệm vụ Tầm Cổ",
            done: Boolean(gq.completed),
            claimed: false,
            mapId: gq.mapId,
            x: gq.x,
            y: gq.y,
            goalType: gq.goal?.type || null,
            enemyType: gq.goal?.enemyType || null,
          });
        }
        for (const m of player.clanBoard ?? []) {
          const need = m.goal?.count ?? 1;
          const cur = Math.min(need, m.progress ?? 0);
          const done = !m.claimed && cur >= need;
          sideItems.push({
            id: m.id,
            kind: m.claimed ? "claimed" : "clan",
            title: m.title,
            obj: m.claimed ? "Đã nhận thưởng" : done ? `Xong (${cur}/${need}) — Bấm mở (J) nhận Nguyên Thạch!` : `${m.desc} (${cur}/${need})`,
            loc: `+${m.rewards?.stones ?? 0} Nguyên Thạch`,
            done,
            claimed: Boolean(m.claimed),
            mapId: m.mapId,
            x: m.x,
            y: m.y,
            goalType: m.goal?.type || null,
            enemyType: m.goal?.enemyType || null,
          });
        }
        this._currentSideItems = sideItems;
        const rKey = `side:${this._armedQuestKey}:${sideItems.map((it) => `${it.id}:${it.obj}:${it.done}:${it.claimed}`).join("|")}`;
        if (this._lastQuestRenderKey !== rKey) {
          this._lastQuestRenderKey = rKey;
          this.questListEl.innerHTML =
            sideItems.length === 0
              ? `<button type="button" class="ctl-quest-item" data-open-quests="1"><div class="ctl-qi-title">Mở Nhiệm Vụ Đường (J)</div><div class="ctl-qi-obj">Nhận nhiệm vụ Gia Tộc & Tầm Cổ!</div></button>`
              : sideItems
                  .map((it, i) => {
                    const armed = this._armedQuestKey === `side:${i}`;
                    return `
                    <button type="button" class="ctl-quest-item ${armed ? "is-armed" : ""}" data-side-idx="${i}">
                      <div class="ctl-qi-title"><span class="ctl-qi-badge">${it.kind === "gu" ? "Cổ" : "Tộc"}</span> ${it.title}</div>
                      <div class="ctl-qi-obj">▸ ${it.obj}</div>
                      <div class="ctl-qi-loc">${armed ? "Ấn thêm 1 lần để tự đi tới · " : ""}${it.loc}</div>
                    </button>
                  `;
                  })
                  .join("");
        }
      }
    }

    // Target & Event Bar
    const target = world.getSelectedTarget() || world.enemies.find((e) => e.typeId === "van_thu_ban_long" || e.typeId === "thien_tri_ngu_vuong");
    if (this.targetBar) {
      this.targetBar.classList.toggle("is-visible", Boolean(target && target.hp > 0));
      if (target && target.hp > 0) {
        this.targetName.textContent = `${target.name}`;
        this.targetFill.style.width = `${Math.max(0, (target.hp / target.maxHp) * 100)}%`;
        this.targetHp.textContent = `${Math.max(0, Math.ceil(target.hp))}/${target.maxHp}`;
      }
    }

    const showEvent = world.mode !== "world" || world.dieuHoi.active || world.currentMapId === "vuc_van_thu";
    if (this.eventPill) {
      this.eventPill.classList.toggle("is-visible", showEvent);
      if (showEvent) {
        if (world.dieuHoi.active) {
          const m = Math.floor(world.dieuHoi.timer / 60);
          const s = Math.floor(world.dieuHoi.timer % 60);
          this.eventText.textContent = `Thiên Trì Điếu Hội | ${m}:${String(s).padStart(2, "0")} · ${world.dieuHoi.score} điểm`;
        } else if (world.currentMapId === "vuc_van_thu") {
          this.eventText.textContent = `Vực Vạn Thủ | Long Tức: ${Math.ceil(world.banLongBreathTimer)}s`;
        } else {
          this.eventText.textContent = `${world.getMapDef().name}`;
        }
        this.exitInstBtn.style.display = world.mode !== "world" || world.currentMapId === "vuc_van_thu" ? "inline-block" : "none";
      }
    }

    const mapDef = world.getMapDef();
    if (this.mapLabel) this.mapLabel.textContent = mapDef.name;
    if (this.coordLabel) this.coordLabel.textContent = `${Math.round(player.x)},${Math.round(player.y)}`;
    if (this.weatherLabel) {
      const wLbl = { clear: "Thanh Tĩnh", rain: "Mưa Rơi", storm: "Giông Sét", fog: "Sương Mù", snow: "Tuyết Hàn" }[world.weather] || "Thanh Tĩnh";
      this.weatherLabel.textContent = `Rừng Cổ · ${wLbl}`;
    }
    this._drawMinimap(player, world, mapDef);

    // Vital Gu Pixel Icon & Cooldown (PC Bar + MOBA Pad)
    const vital = player.getVitalGu();
    this.lastVitalData = vital;
    const vitalCd = player.getCooldownInfo("vital");
    const vitalOom = Boolean(vital && player.mp < (vital.mpCost ?? 0));
    const vitalKey = vital ? vital.id : "empty";
    for (const [btnEl, iconEl] of [
      [this.vitalBtn, this.vitalIcon],
      [this.mobaVitalBtn, this.mobaVitalIcon],
    ]) {
      if (!btnEl || !iconEl) continue;
      if (iconEl.dataset.key !== vitalKey) {
        iconEl.dataset.key = vitalKey;
        iconEl.innerHTML = getGuIconSvg(vital);
      }
      btnEl.style.borderColor = vital ? vital.color : "#4de0c9";
      this._updateSlotCooldownEl(btnEl, vitalCd, vitalOom);
    }

    // 7 Arch Gu Pixel Slots & Cooldowns (PC Bar + MOBA Pad)
    for (let i = 0; i < 7; i++) {
      const unlocked = i < stage.activeSlotsUnlocked;
      const g = player.getActiveGu(i);
      this.lastSlotData[i] = unlocked ? g : null;
      const nextKey = !unlocked ? "lock" : g ? g.id : "empty";
      const cdInfo = player.getCooldownInfo(`slot_${i}`);
      const isOom = Boolean(unlocked && g && player.mp < (g.mpCost ?? 0));
      const color = unlocked && g ? g.color : "#485b75";
      for (const selector of [`[data-arch-slot="${i}"]`, `[data-moba-slot="${i}"]`]) {
        const el = this.hudRoot.querySelector(selector);
        if (!el) continue;
        el.classList.toggle("is-locked", !unlocked);
        el.style.borderColor = color;
        const iconHost = el.querySelector(".arch-icon");
        if (iconHost && iconHost.dataset.key !== nextKey) {
          iconHost.dataset.key = nextKey;
          iconHost.innerHTML = !unlocked ? getUiIconSvg("lock") : getGuIconSvg(g);
        }
        this._updateSlotCooldownEl(el, cdInfo, isOom);
      }
    }

    // Killer Moves Pixel Icons & Cooldowns (hỗ trợ cả Sát Chiêu Tổ Hợp 2–3 Cổ)
    this.lastKmData = [
      player.getResolvedKillerMove?.(0) ?? KILLER_MOVES.find((k) => k.id === player.killerMoveIds[0]),
      player.getResolvedKillerMove?.(1) ?? KILLER_MOVES.find((k) => k.id === player.killerMoveIds[1]),
    ];
    for (let i = 0; i < 2; i++) {
      const km = this.lastKmData[i];
      const cd = player.getCooldownInfo(i === 0 ? "km1" : "km2");
      const reqT = km?.isMultiGu ? 0 : (km?.thoughtCost ?? 60);
      const ready = Boolean(km && player.thoughtGauge >= reqT && cd.rem <= 0 && player.mp >= (km.mpCost ?? 0));
      const isOom = Boolean(km && (player.thoughtGauge < reqT || player.mp < (km.mpCost ?? 0)));
      for (const [btnSel, iconSel] of [
        [`#hud-km-${i}`, `#hud-km-icon-${i}`],
        [`#moba-km-${i}`, `#moba-km-icon-${i}`],
      ]) {
        const btn = this.hudRoot.querySelector(btnSel);
        const iconHost = this.hudRoot.querySelector(iconSel);
        const keySig = `${km?.id || "none"}_${km?.guIds?.join(",") || ""}`;
        if (iconHost && iconHost.dataset.key !== keySig) {
          iconHost.dataset.key = keySig;
          if (km?.isMultiGu && km.guUids?.length) {
            const leadGu = player.getGu(km.guUids[0]);
            iconHost.innerHTML = leadGu ? getGuIconSvg(leadGu) : getKillerMovePixelImgHtml(km);
          } else {
            iconHost.innerHTML = getKillerMovePixelImgHtml(km);
          }
        }
        if (btn && km?.color) btn.style.borderColor = km.color;
        btn?.classList.toggle("is-ready", ready);
        this._updateSlotCooldownEl(btn, cd, isOom);
      }
    }

    // Banner Thông Báo Ngang Giấy Cổ (Cổ đói, Phản phệ, hoặc Mẹo Cổ Sư)
    let noticeMsg = "";
    let noticeKey = "";
    if (player.lastBacklashNotice) {
      noticeMsg = player.lastBacklashNotice;
      noticeKey = `backlash:${player.lastBacklashNotice}`;
    } else {
      const hungryGu = player.getAllEquipped().find((g) => g.foodItemId && (g.hunger ?? 100) <= 35);
      if (hungryGu) {
        noticeMsg = `Cảnh báo: [${hungryGu.name}] sắp đói (${Math.round(hungryGu.hunger)}%), mở Cổ Trùng (V) → Nuôi Cổ bằng ${hungryGu.foodName}!`;
        noticeKey = `hungry:${hungryGu.id}:${Math.floor((hungryGu.hunger ?? 0) / 10)}`;
      }
    }
    this._lastNoticeKey = noticeKey;
    if (this.noticeBanner && this.noticeBannerText) {
      const showNotice = Boolean(noticeMsg && noticeKey !== this._dismissedNoticeKey);
      this.noticeBanner.classList.toggle("is-visible", showNotice);
      if (showNotice) this.noticeBannerText.textContent = noticeMsg;
    }

    // Quick items Z/G & Dash Cooldowns (PC Bar + Aux Pad)
    for (let i = 0; i < 2; i++) {
      const id = player.quickItemIds[i];
      const item = ITEMS_CATALOG[id];
      const cd = player.getCooldownInfo(`qi_${i}`);
      const cntTxt = String(id ? player.getItemCount(id) : 0);
      for (const [btnSel, iconSel, cntSel] of [
        [`[data-quick-item="${i}"]`, `#hud-qi-icon-${i}`, `#hud-qcnt-${i}`],
        [`[data-moba-qi="${i}"]`, `#aux-qi-icon-${i}`, `#aux-qcnt-${i}`],
      ]) {
        const btn = this.hudRoot.querySelector(btnSel);
        const iconEl = this.hudRoot.querySelector(iconSel);
        const cntEl = this.hudRoot.querySelector(cntSel);
        if (iconEl && iconEl.dataset.key !== (id || "none")) {
          iconEl.dataset.key = id || "none";
          iconEl.innerHTML = item ? getItemIconSvg(item) : "+";
        }
        if (cntEl) cntEl.textContent = cntTxt;
        this._updateSlotCooldownEl(btn, cd, false);
      }
    }
    this._updateSlotCooldownEl(this.hudRoot.querySelector("#aux-dash-btn"), player.getCooldownInfo("dash"), false);

    // Auto Combat, Stealth & Downed Overlays
    const activeAuto = Boolean(player.autoCombat);
    const nextAutoKey = activeAuto ? "1" : "0";
    if (this._lastAutoCombatKey !== nextAutoKey) {
      this._lastAutoCombatKey = nextAutoKey;
      if (this.autoBtn) {
        this.autoBtn.classList.toggle("is-active", activeAuto);
        this.autoBtn.innerHTML = `${activeAuto ? "Đang Tự Đánh" : "Tự Đánh"}<span class="ctl-kb-hint"> [T]</span>`;
      }
      if (this.auxAutoBtn) {
        this.auxAutoBtn.classList.toggle("is-active", activeAuto);
        if (this.auxAutoLbl) this.auxAutoLbl.textContent = activeAuto ? "Đang Auto" : "Tự Đánh";
      }
    }
    this.stealthPill?.classList.toggle("is-visible", Boolean(player.isStealthed));
    this.downedOverlay?.classList.toggle("is-visible", Boolean(player.isDead));

    // Bảng Nghi Thức Khai Khiếu Đếm Bước Đom Đóm
    const inRitual = world.currentMapId === "hang_ngam_khai_khieu" && !player.hasAwakened;
    if (this.ritualPanel) {
      this.ritualPanel.classList.toggle("is-visible", inRitual);
      if (inRitual) {
        const steps = player.awakeningSteps ?? 0;
        const baseSteps = player.innateBaseSteps || 24;
        const maxSteps = player.innateMaxSteps || 27;
        const ev = evaluateAwakeningSteps(steps);
        if (this.ritualStepVal) this.ritualStepVal.textContent = `Bước ${steps} / Giới hạn ${maxSteps} (Tối đa 45)`;
        if (this.ritualBar) this.ritualBar.style.width = `${Math.min(100, (steps / 45) * 100)}%`;
        if (this.ritualGradeEl) {
          if (steps >= maxSteps) {
            this.ritualGradeEl.innerHTML = `<b style="color:${ev.color}">⚡ Đã chạm Cực Hạn Thiên Phú (${steps}/${maxSteps} bước · ${ev.aptitudeLabel} · ${ev.seaPct}% Chân Nguyên)</b> — Nhấn [F] Mở Không Khiếu!`;
          } else {
            const surgeHint = steps >= baseSteps ? ` · Nhấn [Space] Ý Chí Phản Kháng để phá ngưỡng tối đa ${maxSteps} bước!` : "";
            this.ritualGradeEl.innerHTML = ev.ok
              ? `<b style="color:${ev.color}">Dự kiến: ${ev.aptitudeLabel}</b> · Không Khiếu chứa <b>${ev.seaPct}% Chân Nguyên</b> (${ev.flavor})${surgeHint}`
              : `<span style="color:#ff9472">Chưa đủ 10 bước để thành Đinh Đẳng (${steps}/10) — Bước tiếp về Đông!</span>${surgeHint}`;
          }
        }
      }
    }

    // Thẻ tương tác tinh tế [F] gắn gọn trên cụm chiêu dưới giữa (TUYỆT ĐỐI không dùng hộp nổi thô kệch che cổng/cầu!)
    const near = world.getNearbyInteractable();
    if (this.contextPill && this.contextPillText) {
      const hasPrompt = (inRitual && (player.awakeningSteps ?? 0) >= 1) || Boolean(near);
      this.contextPill.classList.toggle("is-active", hasPrompt);
      if (inRitual && (player.awakeningSteps ?? 0) >= 1) {
        this.contextPillText.textContent = `F · Khai Khiếu (${player.awakeningSteps}/45)`;
      } else if (near?.label) {
        this.contextPillText.textContent = near.label;
      } else {
        this.contextPillText.textContent = "F · Ngữ cảnh";
      }
    }

    if (this.pvpLbl) {
      this.pvpLbl.textContent = player.pvpFlag === "peace" ? "Hòa" : player.pvpFlag === "flag" ? "Chiến" : "Tự vệ";
    }

    this._renderChat(onlineHub?.messages ?? []);
  }

  _drawMinimap(player, world, mapDef) {
    if (!this.minimapCanvas || this.minimapCollapsed) return;
    this._lastMapSize = { w: mapDef.width, h: mapDef.height };
    const ctx = this.minimapCanvas.getContext("2d");
    ctx.imageSmoothingEnabled = false;
    const w = this.minimapCanvas.width;
    const h = this.minimapCanvas.height;

    const snap = world.mapRenderer?.getMinimapSnapshot?.(mapDef);
    if (snap) {
      ctx.drawImage(snap, 0, 0, w, h);
    } else {
      ctx.fillStyle = "#16261d";
      ctx.fillRect(0, 0, w, h);
    }

    const sx = w / mapDef.width;
    const sy = h / mapDef.height;

    // Khu vực Bãi Thú viền pixel vuông
    for (const sp of mapDef.beastSpots ?? []) {
      ctx.strokeStyle = sp.tier === "boss" ? "#b86bff" : sp.tier === "elite" ? "#ff5c4d" : "#78f29e";
      ctx.lineWidth = 1;
      const rx = Math.max(4, Math.round(sp.r * sx * 0.7));
      ctx.strokeRect(Math.round(sp.x * sx - rx), Math.round(sp.y * sy - rx), rx * 2, rx * 2);
    }

    // Ổ Dã Cổ (vàng rực nếu là Cổ mục tiêu)
    for (const g of world.gatherNodes ?? []) {
      if (g.kind !== "wild_gu" || g.cooldown > 0) continue;
      const isTarget = g.guId === player.targetStarterGuId && !player.vitalUid;
      ctx.fillStyle = isTarget ? "#ffe15c" : "#80ffcf";
      ctx.fillRect(Math.round(g.x * sx - 1), Math.round(g.y * sy - 1), isTarget ? 4 : 2, isTarget ? 4 : 2);
    }

    // Cổng dịch chuyển hình thoi ngọc lam
    for (const p of mapDef.portals ?? []) {
      const px = Math.round(p.x * sx);
      const py = Math.round(p.y * sy);
      ctx.fillStyle = "#082924";
      ctx.fillRect(px - 3, py - 3, 6, 6);
      ctx.fillStyle = "#5ef2d6";
      ctx.fillRect(px - 2, py - 2, 4, 4);
    }

    // NPC chấm vàng viền đen
    for (const n of mapDef.npcs ?? []) {
      const nx = Math.round(n.x * sx);
      const ny = Math.round(n.y * sy);
      ctx.fillStyle = "#1c1308";
      ctx.fillRect(nx - 2, ny - 2, 5, 5);
      ctx.fillStyle = "#ffd15c";
      ctx.fillRect(nx - 1, ny - 1, 3, 3);
    }

    // Quái vật
    for (const e of world.enemies) {
      ctx.fillStyle = e.tier === "Bách thú vương" || e.tier === "Thiên thú vương" ? "#ff9e3d" : "#ff4d4d";
      ctx.fillRect(Math.round(e.x * sx - 1), Math.round(e.y * sy - 1), 2.5, 2.5);
    }

    // Khung tầm nhìn Camera (960x540)
    const camX = (world.camera?.x ?? 0) * sx;
    const camY = (world.camera?.y ?? 0) * sy;
    ctx.strokeStyle = "rgba(255, 248, 224, 0.5)";
    ctx.lineWidth = 1;
    ctx.strokeRect(Math.round(camX), Math.round(camY), Math.round(GAME_WIDTH * sx), Math.round(GAME_HEIGHT * sy));

    // Điểm vị trí & hướng nhìn pixel của người chơi
    const px = Math.round(player.x * sx);
    const py = Math.round(player.y * sy);
    const fx = Math.round(Math.cos(player.facing ?? 0) * 3);
    const fy = Math.round(Math.sin(player.facing ?? 0) * 3);
    ctx.fillStyle = "#080b10";
    ctx.fillRect(px - 3, py - 3, 6, 6);
    ctx.fillStyle = "#fff5b8";
    ctx.fillRect(px - 2, py - 2, 4, 4);
    ctx.fillStyle = "#5ef2d6";
    ctx.fillRect(px + fx - 1, py + fy - 1, 2, 2);
  }
}
