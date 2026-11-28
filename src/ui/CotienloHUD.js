import { drawCharacterPortrait } from "../character/CharacterSpriteBuilder.js";
import { GAME_HEIGHT, GAME_WIDTH } from "../config/constants.js";
import { evaluateAwakeningSteps } from "../data/CultivationData.js";
import { ITEMS_CATALOG } from "../data/EquipmentAndItems.js";
import { GU_CATALOG, KILLER_MOVES, STARTER_VITAL_BUILDS } from "../data/GuCatalog.js";
import { MAIN_QUESTS, SIDE_QUESTS, STARTER_GU_HABITATS, STORY_ACTS } from "../data/QuestsAndEvents.js";
import { getUiFrameAssets } from "../engine/PixelSpriteBaker.js";
import { SkillPad } from "../input/SkillPad.js";
import { VirtualJoystick } from "../input/VirtualJoystick.js";
import { getKillerMovePixelImgHtml } from "./PixelGuIcons.js";
import { getGuIconSvg, getItemIconSvg, getUiIconSvg } from "./XianxiaIcons.js";

/**
 * Giao diện HUD In-Game Cổ Phong Chuẩn Cổ Tiên Lộ (cotienlo.com):
 * - Sử dụng 100% Vector SVG cổ phong & Avatar 88x88 sắc nét (không còn emoji thô).
 * - Vòng cung Cổ Trùng hiển thị biểu tượng SVG từng loài + Tooltip thông tin khi trỏ chuột.
 * - Mini-map chi tiết (đường đi, bãi cát, hồ nước, cổng, NPC, quái vật).
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
    this.mobileMenuOpen = false;
    this._wasMobileUi = false;
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
    this.localChatFeed = [
      { kind: "sys", sender: "Hệ thống", text: "Chào mừng đến với Cổ Tiên Lộ! Ấn 2 lần vào nhiệm vụ để tự đi tới." },
    ];

    this.hudRoot.innerHTML = this._buildMarkup();
    this._cacheElements();
    this._bindEvents(getDefaultAngle);
    this.setQuestCollapsed(this.questCollapsed, false);
    this.syncViewportMode();
  }

  _buildMarkup() {
    const uiFrames = getUiFrameAssets();
    const archSlots = [0, 1, 2, 3, 4, 5, 6]
      .map(
        (idx) => `
      <button type="button" class="arch-gu-slot arch-gu-slot--${idx}" data-arch-slot="${idx}" style="background-image:url('${uiFrames.slot48Url}')">
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
      <button type="button" id="hud-world-prompt" class="ctl-jade-prompt">
        <img id="hud-prompt-token" class="ctl-pixel-icon ctl-prompt-token" src="${uiFrames.jadeTokenFUrl}" width="24" height="24" alt="F" />
        <span id="hud-prompt-text" class="ctl-prompt-text">F · Tương tác</span>
      </button>

      <!-- GÓC TRÊN-TRÁI -->
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
          <div class="ctl-quest-tabs">
            <button type="button" class="ctl-qtab is-active" data-qtab="main">Chính (1/18)</button>
            <button type="button" class="ctl-qtab" data-qtab="side">Phụ (2)</button>
            <button type="button" id="hud-quest-hide-btn" class="ctl-qhide-btn" title="Ẩn bảng nhiệm vụ">Ẩn ▲</button>
          </div>
          <div class="ctl-quest-hint">Ấn 2 lần vào nhiệm vụ để tự đi tới · <button type="button" id="hud-story-open-btn" class="ctl-quest-story-btn">Biên Niên Sử (J)</button></div>
          <div id="hud-quest-list" class="ctl-quest-list"></div>
        </div>
      </div>

      <!-- CHÍNH GIỮA TRÊN -->
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

      <!-- GÓC TRÊN-PHẢI -->
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

        <div id="hud-minimap-wrap" class="ctl-minimap-box">
          <div class="ctl-minimap-head">
            <span id="hud-map-label">Tạ Gia Trại</span>
            <span id="hud-coord-label" class="ctl-coord-tag">360,368</span>
            <button type="button" id="hud-minimap-toggle" class="ctl-mini-circle">&gt;</button>
          </div>
          <div class="ctl-minimap-frame">
            <canvas id="hud-minimap-canvas" width="156" height="100" title="Bấm lên bản đồ nhỏ để tự đi tới"></canvas>
            <span class="ctl-compass-n">B</span>
          </div>
          <div id="hud-weather-label" class="ctl-weather-sub">U Tịch · Thanh Tĩnh</div>
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

      <!-- CHÍNH GIỮA DƯỚI: THANH KỸ NĂNG PIXEL FANTASY + TOOLTIP -->
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
          <button type="button" id="hud-basic-btn" class="ctl-basic-btn" title="Đánh thường (Chuột Trái)">
            ${getUiIconSvg("attack")}
            <span>Đánh<em class="ctl-kb-hint"> [LMB]</em></span>
          </button>
          <button type="button" id="hud-absorb-pill" class="ctl-absorb-pill" title="Giữ R để Hấp Thu Nguyên Thạch">
            ${getUiIconSvg("absorb")}<span><em class="ctl-kb-hint">R · </em>Hấp thu</span>
          </button>
          <button type="button" id="hud-dash-btn" class="ctl-dash-pill" title="Lướt né (Space)"><span class="ctl-kb-hint">Space · </span>Lướt</button>
        </div>

        <div class="ctl-pixel-mainbar">
          <button type="button" id="hud-vital-btn" class="ctl-vital-orb" title="Cổ Bản Mệnh (Chuột Phải)" style="background-image:url('${uiFrames.vital56Url}')">
            <span id="hud-vital-icon" style="width:32px;height:32px;display:grid;place-items:center"></span>
            <span class="ctl-cd-mask"></span>
            <span class="ctl-cd-num"></span>
            <span class="arch-key">RMB</span>
          </button>

          <div class="ctl-pixel-slots-row">
            ${archSlots}
          </div>

          <div class="ctl-pixel-km-row">
            <button type="button" id="hud-km-0" class="ctl-km-btn ctl-km-0" title="Sát chiêu Q" style="background-image:url('${uiFrames.slot48Url}')">
              <span id="hud-km-icon-0" style="width:30px;height:30px;display:grid;place-items:center"></span>
              <span class="ctl-cd-mask"></span>
              <span class="ctl-cd-num"></span>
              <span class="arch-key">Q</span>
            </button>
            <button type="button" id="hud-km-1" class="ctl-km-btn ctl-km-1" title="Sát chiêu E" style="background-image:url('${uiFrames.slot48Url}')">
              <span id="hud-km-icon-1" style="width:30px;height:30px;display:grid;place-items:center"></span>
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
        <button type="button" class="ctl-util-btn" data-panel="cultivate" title="Buồng Tĩnh Tọa Tu Luyện Không Khiếu (K)"><span class="ctl-svg-wrap">${getUiIconSvg("absorb")}</span><em>Tu Luyện</em></button>
        <button type="button" class="ctl-util-btn" data-panel="quests" title="Gia Tộc Nhiệm Vụ Đường & Săn Cổ (J)"><span class="ctl-svg-wrap">${getUiIconSvg("map")}</span><em>N.Vụ (J)</em></button>
        <button type="button" class="ctl-util-btn" data-panel="bag" title="Túi Đồ & Đổ Thạch (B)"><span class="ctl-svg-wrap">${getUiIconSvg("bag")}</span><em>Túi (B)</em></button>
        <button type="button" class="ctl-util-btn" data-panel="gu" title="Cổ Trùng & Lưu Phái (V)"><span class="ctl-svg-wrap">${getUiIconSvg("gu")}</span><em>Cổ (V)</em></button>
        <button type="button" class="ctl-util-btn" data-panel="char" title="Nhân Vật & Đột Phá (C)"><span class="ctl-svg-wrap">${getUiIconSvg("char")}</span><em>NV (C)</em></button>
        <button type="button" id="hud-pvp-btn" class="ctl-util-btn" title="Cờ PvP"><span class="ctl-svg-wrap">${getUiIconSvg("flag")}</span><em id="hud-pvp-lbl">Hòa</em></button>
        <button type="button" class="ctl-util-btn" data-panel="mail" title="Thư & Quà Tân Thủ"><span class="ctl-svg-wrap">${getUiIconSvg("mail")}</span><em>Thư</em></button>
        <button type="button" class="ctl-util-btn" data-panel="settings" title="Cài đặt & Tài khoản"><span class="ctl-svg-wrap">${getUiIconSvg("settings")}</span><em>Cài đặt</em></button>
      </div>

      <div id="joystick-zone" class="touch-only" aria-label="Joystick">
        <div id="joystick-base" class="joystick-base">
          <div class="joystick-ring"></div>
          <div id="joystick-knob" class="joystick-knob"></div>
        </div>
      </div>
      <div id="skill-cancel-zone" class="skill-cancel-zone">HỦY</div>
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

    this.worldPrompt = this.hudRoot.querySelector("#hud-world-prompt");
    this.worldPromptText = this.hudRoot.querySelector("#hud-prompt-text");
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
      this.hudRoot.querySelector("#joystick-zone"),
      this.hudRoot.querySelector("#joystick-base"),
      this.hudRoot.querySelector("#joystick-knob"),
      { maxRadius: 42, deadzone: 0.12 }
    );
    this.skillPad = new SkillPad({
      slots: {},
      cancelZoneEl: this.hudRoot.querySelector("#skill-cancel-zone"),
      getDefaultAngle,
      onCast: (payload) => this.onCast?.(payload),
    });

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
        this.onOpenPanel?.(btn.dataset.panel);
      });
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
        if (km) this._showTooltip(`Sát Chiêu: ${km.name}`, `Cần ${km.thoughtCost} Thanh Niệm · ${km.mpCost} Chân nguyên`, km.desc);
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
    this.worldPrompt?.addEventListener("click", () => this.onInteract?.());
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
    const autoMobile = (vw <= 932 && (vw <= 768 || vh <= 540)) || coarse;
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
      this.weatherLabel.textContent = `U Tịch · ${wLbl}`;
    }
    this._drawMinimap(player, world, mapDef);

    // Vital Gu Pixel Icon & Cooldown
    const vital = player.getVitalGu();
    this.lastVitalData = vital;
    if (this.vitalIcon && this.vitalBtn) {
      const key = vital ? vital.id : "empty";
      if (this.vitalIcon.dataset.key !== key) {
        this.vitalIcon.dataset.key = key;
        this.vitalIcon.innerHTML = getGuIconSvg(vital);
      }
      this.vitalBtn.style.borderColor = vital ? vital.color : "#4de0c9";
      this._updateSlotCooldownEl(this.vitalBtn, player.getCooldownInfo("vital"), Boolean(vital && player.mp < (vital.mpCost ?? 0)));
    }

    // 7 Arch Gu Pixel Slots & Cooldowns
    for (let i = 0; i < 7; i++) {
      const el = this.hudRoot.querySelector(`[data-arch-slot="${i}"]`);
      if (!el) continue;
      const unlocked = i < stage.activeSlotsUnlocked;
      const g = player.getActiveGu(i);
      this.lastSlotData[i] = unlocked ? g : null;
      el.classList.toggle("is-locked", !unlocked);
      el.style.borderColor = unlocked && g ? g.color : "#485b75";
      const iconHost = el.querySelector(".arch-icon");
      const nextKey = !unlocked ? "lock" : g ? g.id : "empty";
      if (iconHost && iconHost.dataset.key !== nextKey) {
        iconHost.dataset.key = nextKey;
        iconHost.innerHTML = !unlocked ? getUiIconSvg("lock") : getGuIconSvg(g);
      }
      this._updateSlotCooldownEl(el, player.getCooldownInfo(`slot_${i}`), Boolean(unlocked && g && player.mp < (g.mpCost ?? 0)));
    }

    // Killer Moves Pixel Icons & Cooldowns
    this.lastKmData = [
      KILLER_MOVES.find((k) => k.id === player.killerMoveIds[0]),
      KILLER_MOVES.find((k) => k.id === player.killerMoveIds[1]),
    ];
    for (let i = 0; i < 2; i++) {
      const btn = this.hudRoot.querySelector(`#hud-km-${i}`);
      const km = this.lastKmData[i];
      const iconHost = this.hudRoot.querySelector(`#hud-km-icon-${i}`);
      if (iconHost && iconHost.dataset.key !== (km?.id || "none")) {
        iconHost.dataset.key = km?.id || "none";
        iconHost.innerHTML = getKillerMovePixelImgHtml(km);
      }
      const cd = player.getCooldownInfo(i === 0 ? "km1" : "km2");
      btn?.classList.toggle("is-ready", Boolean(km && player.thoughtGauge >= km.thoughtCost && cd.rem <= 0));
      this._updateSlotCooldownEl(btn, cd, Boolean(km && (player.thoughtGauge < km.thoughtCost || player.mp < km.mpCost)));
    }

    // Quick items Z/G & Cooldowns
    for (let i = 0; i < 2; i++) {
      const id = player.quickItemIds[i];
      const item = ITEMS_CATALOG[id];
      const btn = this.hudRoot.querySelector(`[data-quick-item="${i}"]`);
      const iconEl = this.hudRoot.querySelector(`#hud-qi-icon-${i}`);
      if (iconEl && iconEl.dataset.key !== (id || "none")) {
        iconEl.dataset.key = id || "none";
        iconEl.innerHTML = item ? getItemIconSvg(item) : "+";
      }
      this.hudRoot.querySelector(`#hud-qcnt-${i}`).textContent = id ? player.getItemCount(id) : 0;
      this._updateSlotCooldownEl(btn, player.getCooldownInfo(`qi_${i}`), false);
    }

    // Auto Combat, Stealth & Downed Overlays
    if (this.autoBtn) {
      const activeAuto = Boolean(player.autoCombat);
      const nextAutoKey = activeAuto ? "1" : "0";
      if (this._lastAutoCombatKey !== nextAutoKey) {
        this._lastAutoCombatKey = nextAutoKey;
        this.autoBtn.classList.toggle("is-active", activeAuto);
        this.autoBtn.innerHTML = `${activeAuto ? "Đang Tự Đánh" : "Tự Đánh"}<span class="ctl-kb-hint"> [T]</span>`;
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

    // Lệnh Ngọc Bài [F] treo gần cổng/NPC/tài nguyên, không bao giờ đè thanh kỹ năng hoặc R · Hấp thu
    const near = world.getNearbyInteractable();
    if (this.worldPrompt && this.worldPromptText) {
      const hasPrompt = (inRitual && (player.awakeningSteps ?? 0) >= 1) || Boolean(near);
      this.worldPrompt.classList.toggle("is-visible", hasPrompt);
      if (hasPrompt) {
        const isPortal = !inRitual && near?.kind === "portal";
        this.worldPrompt.classList.toggle("is-portal", isPortal);
        if (inRitual && (player.awakeningSteps ?? 0) >= 1) {
          this.worldPromptText.textContent = `F · Dừng Khai Khiếu (${player.awakeningSteps}/45)`;
        } else {
          this.worldPromptText.textContent = near.label;
        }
        const anchorData = !inRitual ? near?.data : null;
        const pt = anchorData && this.worldToClient ? this.worldToClient(anchorData.x, anchorData.y, world.camera) : null;
        const isMobile = document.body.classList.contains("is-mobile-ui");
        const isPortrait = document.body.classList.contains("is-mobile-portrait");
        const minXPad = isMobile ? 105 : 130;
        const bottomReserve = isPortrait ? 132 : isMobile ? 116 : 180;
        if (pt?.inBounds) {
          const vw = window.innerWidth || 1280;
          const vh = window.innerHeight || 720;
          const cx = isPortal
            ? Math.max(minXPad, Math.min(vw - minXPad, pt.x + (pt.x < 220 ? 58 : pt.x > vw - 220 ? -58 : 0)))
            : Math.max(minXPad, Math.min(vw - minXPad, pt.x));
          const cy = isPortal
            ? pt.y + 42 <= vh - bottomReserve
              ? Math.round(pt.y + 42)
              : Math.max(52, Math.round(pt.y - 98))
            : Math.max(52, Math.min(vh - bottomReserve, pt.y - 60));
          this.worldPrompt.style.left = `${Math.round(cx)}px`;
          this.worldPrompt.style.top = `${Math.round(cy)}px`;
          this.worldPrompt.classList.add("is-anchored");
        } else {
          const vw = window.innerWidth || 1280;
          const vh = window.innerHeight || 720;
          this.worldPrompt.style.left = `${Math.round(vw * 0.5)}px`;
          this.worldPrompt.style.top = `${Math.round(Math.max(64, vh - bottomReserve + 12))}px`;
          this.worldPrompt.classList.remove("is-anchored");
        }
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
