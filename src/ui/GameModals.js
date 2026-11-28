import { drawCustomCharacterPreview } from "../character/CharacterSpriteBuilder.js";
import { RANK_ESSENCE_COLORS } from "../config/constants.js";
import {
  APERTURE_WALL_NAMES,
  BREAKTHROUGH_REQUIREMENTS,
  CULTIVATION_PATHS,
  POTENTIAL_STATS,
  getPathMasteryTier,
  getStageProgress,
} from "../data/CultivationData.js";
import { ARMOR_SLOTS, ITEMS_CATALOG, RARITIES } from "../data/EquipmentAndItems.js";
import { COMPOUND_RECIPES, GU_CATALOG, KILLER_MOVES, createGuWorm } from "../data/GuCatalog.js";
import { DUNGEONS_LIST, MAIN_QUESTS, RANK_GU_QUESTS, STORY_ACTS } from "../data/QuestsAndEvents.js";
import { WORLD_MAPS } from "../world/WorldMaps.js";
import { getKillerMovePixelImgHtml } from "./PixelGuIcons.js";
import { getGuIconSvg, getItemIconSvg, getUiIconSvg } from "./XianxiaIcons.js";

/**
 * Hệ thống Cửa Sổ Chức Năng Cổ Phong chuẩn Cổ Tiên Lộ (cotienlo.com):
 * - Dùng 100% Vector SVG cổ phong, hiển thị Không Khiếu Chân Nguyên Hải, Túi lưới 4 cột và Sơ Đồ Vùng Đất.
 */
export class GameModals {
  constructor({
    rootEl,
    player,
    world,
    account,
    onlineHub,
    sfx,
    minigame,
    onClose,
    onStateChanged,
    onOpenMirror,
    onOpenAccountModal,
    onSwitchCharacter,
    getUiMode,
    onCycleUiMode,
  }) {
    this.root = rootEl;
    this.player = player;
    this.world = world;
    this.account = account;
    this.onlineHub = onlineHub;
    this.sfx = sfx;
    this.minigame = minigame;
    this.onClose = onClose;
    this.onStateChanged = onStateChanged;
    this.onOpenMirror = onOpenMirror;
    this.onOpenAccountModal = onOpenAccountModal;
    this.onSwitchCharacter = onSwitchCharacter;
    this.getUiMode = getUiMode;
    this.onCycleUiMode = onCycleUiMode;

    this.panel = null;
    this.subTab = "main";
    this.questRankFilter = 1;
    this.selectedGuUid = null;
    this._apertureRaf = null;
    this.notice = "";
    this.noticeKind = "success";
  }

  isOpen() {
    return this.root.classList.contains("is-open");
  }

  open(panel, subTab = null) {
    const resolvedSub = subTab || (panel === "quests" ? "story" : "main");
    if (this.isOpen() && this.panel === panel && (!subTab || this.subTab === resolvedSub)) {
      this.close();
      return;
    }
    this.panel = panel;
    this.subTab = resolvedSub;
    this.notice = "";
    this.root.classList.add("is-open");
    this.render();
  }

  close() {
    this.root.classList.remove("is-open");
    this.panel = null;
    if (this._apertureRaf) {
      cancelAnimationFrame(this._apertureRaf);
      this._apertureRaf = null;
    }
    this.onClose?.();
  }

  _flash(msg, kind = "success") {
    this.notice = msg;
    this.noticeKind = kind;
    this.render();
  }

  render() {
    if (!this.panel) return;
    let title = "Cổ Tiên Lộ";
    let iconKey = "char";
    let tabsHtml = "";
    let bodyHtml = "";

    if (this.panel === "char") {
      iconKey = "char";
      title = "Nhân Vật · Cảnh Giới · Hộ Cụ (C)";
      tabsHtml = [
        ["main", "Cảnh Giới & Tiềm Năng"],
        ["armor", "4 Ô Hộ Cụ & Cường Hóa"],
      ]
        .map(([id, lbl]) => `<button type="button" class="tab-btn ${this.subTab === id ? "is-active" : ""}" data-subtab="${id}">${lbl}</button>`)
        .join("");
      bodyHtml = this.subTab === "armor" ? this._buildArmorBody() : this._buildCharBody();
    } else if (this.panel === "gu") {
      iconKey = "gu";
      title = "Cổ Trùng · Hợp Luyện · Lưu Phái (V)";
      tabsHtml = [
        ["main", "Không Khiếu & Sát Chiêu"],
        ["feed", "Nuôi Cổ"],
        ["refine", "Hợp Luyện Cổ Phương"],
        ["paths", "16 Lưu Phái"],
      ]
        .map(([id, lbl]) => `<button type="button" class="tab-btn ${this.subTab === id ? "is-active" : ""}" data-subtab="${id}">${lbl}</button>`)
        .join("");
      bodyHtml =
        this.subTab === "feed"
          ? this._buildFeedBody()
          : this.subTab === "refine"
            ? this._buildCompoundBody()
            : this.subTab === "paths"
              ? this._buildPathsBody()
              : this._buildGuLoadoutBody();
    } else if (this.panel === "bag") {
      iconKey = "bag";
      title = "Túi Đồ · Đổ Thạch · Thương Hội (B)";
      tabsHtml = [
        ["main", "Túi Vật Phẩm"],
        ["gamble", "Đổ Thạch (Bến Thương)"],
        ["shop", "Thương Hội"],
      ]
        .map(([id, lbl]) => `<button type="button" class="tab-btn ${this.subTab === id ? "is-active" : ""}" data-subtab="${id}">${lbl}</button>`)
        .join("");
      bodyHtml =
        this.subTab === "gamble" ? this._buildGambleBody() : this.subTab === "shop" ? this._buildShopBody() : this._buildBagBody();
    } else if (this.panel === "world" || this.panel === "daily") {
      iconKey = "map";
      title = "Thế Giới · Phó Bản · Sự Kiện (M)";
      tabsHtml = [
        ["main", "Dư Đồ Thế Giới"],
        ["dungeons", "7 Phó Bản Thú Huyệt"],
        ["daily", "Quà Hôm Nay & Thiên Kiêu"],
      ]
        .map(([id, lbl]) => `<button type="button" class="tab-btn ${this.subTab === id ? "is-active" : ""}" data-subtab="${id}">${lbl}</button>`)
        .join("");
      const activeSub = this.panel === "daily" ? "daily" : this.subTab;
      bodyHtml =
        activeSub === "dungeons" ? this._buildDungeonsBody() : activeSub === "daily" ? this._buildDailyBody() : this._buildWorldBody();
    } else if (this.panel === "cultivate") {
      iconKey = "absorb";
      title = "Buồng Tĩnh Tọa Tu Luyện Không Khiếu (K)";
      bodyHtml = this._buildCultivateBody();
    } else if (this.panel === "quests") {
      iconKey = "map";
      title = "Biên Niên Sử Chính Tuyến & Nhiệm Vụ Đường (J)";
      tabsHtml = [
        ["story", `Chính Tuyến (${MAIN_QUESTS.length} Chương)`],
        ["main", "Gia Tộc (Nguyên Thạch)"],
        ["gu_quests", "Tầm Cổ (1–3 Chuyển)"],
      ]
        .map(([id, lbl]) => `<button type="button" class="tab-btn ${this.subTab === id ? "is-active" : ""}" data-subtab="${id}">${lbl}</button>`)
        .join("");
      bodyHtml =
        this.subTab === "story"
          ? this._buildMainStoryBody()
          : this.subTab === "gu_quests"
            ? this._buildRankGuQuestsBody()
            : this._buildClanQuestsBody();
    } else if (this.panel === "mail") {
      iconKey = "mail";
      title = "Hộp Thư & Quà Tân Thủ";
      bodyHtml = this._buildMailBody();
    } else if (this.panel === "clan_arena") {
      iconKey = "arena";
      title = "Cổ Nguyệt Lôi Đài · So Tài & Thách Đấu";
      bodyHtml = this._buildClanArenaBody();
    } else if (this.panel === "settings") {
      iconKey = "settings";
      title = "Cài Đặt & Tài Khoản";
      bodyHtml = this._buildSettingsBody();
    }

    this.root.innerHTML = `
      <div class="ctl-modal-card">
        <div class="ctl-modal-header">
          <div class="ctl-modal-title">
            <span class="ctl-svg-wrap" style="width:18px;height:18px">${getUiIconSvg(iconKey, "#4de0c9")}</span>
            <span>${title}</span>
          </div>
          <div class="ctl-stone-badge">Nguyên Thạch: ${this.player.nguyenThach} · Cảm Ngộ: ${this.player.insightCount}</div>
          <button type="button" id="ctl-modal-close" class="ctl-close-x">Đóng</button>
        </div>
        ${tabsHtml ? `<div class="ctl-modal-tabs">${tabsHtml}</div>` : ""}
        ${this.notice ? `<div class="ctl-notice is-${this.noticeKind}">${this.notice}</div>` : ""}
        <div class="ctl-modal-body">${bodyHtml}</div>
      </div>
    `;

    this._bindModalEvents();
  }

  _buildCharBody() {
    const p = this.player;
    const stage = p.getStage();
    const prog = getStageProgress(p.stageLevel, p.cultivationExp);
    const apt = p.getAptitudeInfo();
    const req = BREAKTHROUGH_REQUIREMENTS[stage.rank];

    const potHtml = POTENTIAL_STATS.map(
      (st) => `
      <div class="ctl-stat-row">
        <div><strong>${st.name}: ${p.potentials[st.key]}</strong><div class="ctl-sub-txt">${st.desc}</div></div>
        <button type="button" class="ctl-parch-btn" data-add-pot="${st.key}" ${p.freePoints <= 0 ? "disabled" : ""}>+1</button>
      </div>
    `
    ).join("");

    let btHtml = "";
    if (req) {
      const effCost = p.getEffectiveBreakthroughStoneCost();
      const hasBonus =
        p.guBag.some((g) => g.id === "tuu_trung" || g.id === "tu_vi_tuu_trung") ||
        p.insightCount > 0 ||
        (req.bonusItemId && p.getItemCount(req.bonusItemId) > 0);
      btHtml = `
        <div class="ctl-box" style="margin-top:8px">
          <div class="ctl-box-title">${req.title}</div>
          <div class="ctl-sub-txt">Yêu cầu: Đỉnh phong 100% · ${effCost} Nguyên Thạch${hasBonus ? ` · <b style="color:#4de0c9">Trợ Lực Phá Vách</b>` : ""}</div>
          <button type="button" id="btn-breakthrough" class="ctl-btn-jade" style="margin-top:6px" ${prog.readyForBreakthrough ? "" : "disabled"}>
            ${prog.readyForBreakthrough ? "⚡ Xung Kích Khiếu Bích (Đột Phá)" : `Cần Tu Vi Đỉnh Phong (${Math.round(prog.pct * 100)}%)`}
          </button>
        </div>
      `;
    }

    return `
      <div class="ctl-grid-2">
        <div class="ctl-box" style="text-align:center">
          <canvas id="modal-char-canvas" width="90" height="90"></canvas>
          <div style="font-weight:800;font-size:13px">${p.characterName}</div>
          <div style="color:${stage.essenceColor};font-weight:700;font-size:11px">${stage.title} (${stage.essenceName})</div>
          <div class="ctl-sub-txt">Tu Vi: ${p.cultivationExp}/${prog.need || "Max"} (${Math.round(prog.pct * 100)}%)</div>
          <div class="ctl-sub-txt" style="color:${apt.color}">${apt.name} · Huyết Tuyền: ${p.bloodSpring}%</div>
          <div class="ctl-btn-row">
            <button type="button" id="btn-meditate" class="ctl-parch-btn">Bế Quan (+Tu Vi)</button>
            <button type="button" id="btn-blood-sac" class="ctl-parch-btn">Huyết Lô Tế Huyết</button>
          </div>
        </div>
        <div>
          <div class="ctl-box">
            <div class="ctl-box-title">4 Tiềm Năng (Điểm dư: ${p.freePoints}) · Rèn thân: ${p.bodyTemperCount} lần</div>
            ${potHtml}
          </div>
          ${btHtml}
        </div>
      </div>
    `;
  }

  _buildArmorBody() {
    const p = this.player;
    const eqHtml = ARMOR_SLOTS.map((sl) => {
      const uid = p.armorEquipped[sl.id];
      const item = p.armorBag.find((a) => a.uid === uid);
      return `
        <div class="ctl-stat-row">
          <div>
            <strong>${sl.name}:</strong>
            <span style="color:${item ? item.rarityColor : "#777"}">${item ? `${item.name} (+${item.enhanceLevel})` : "Trống"}</span>
            ${item ? `<div class="ctl-sub-txt">+${item.hpBonus} HP · +${item.dmgBonus} Công · +${Math.round(item.armorBonus * 100)}% Giáp</div>` : ""}
          </div>
          ${item ? `<button type="button" class="ctl-parch-btn" data-enhance="${item.uid}">Cường Hóa (1 Đá + 20 Thạch)</button>` : ""}
        </div>
      `;
    }).join("");

    const bagHtml = p.armorBag
      .map(
        (a) => `
      <button type="button" class="ctl-list-card" data-equip-armor="${a.uid}" style="border-left:4px solid ${a.rarityColor}">
        <span class="ctl-icon-box">${getItemIconSvg({ id: `armor_${a.slotId}`, color: a.rarityColor })}</span>
        <div class="ctl-list-card-txt">
          <strong>${a.name} (+${a.enhanceLevel}) [${RARITIES[a.rarity]?.name ?? "Phàm"}]</strong>
          <span>+${a.hpBonus} HP · +${a.dmgBonus} Công</span>
        </div>
      </button>
    `
      )
      .join("");

    return `
      <div class="ctl-box"><div class="ctl-box-title">Hộ Cụ Đang Mặc (4 Ô)</div>${eqHtml}</div>
      <div class="ctl-box" style="margin-top:8px"><div class="ctl-box-title">Kho Hộ Cụ (${p.armorBag.length}) — Bấm để mặc</div><div class="ctl-list-grid">${bagHtml || "Trống"}</div></div>
    `;
  }

  _buildGuLoadoutBody() {
    const p = this.player;
    const stage = p.getStage();
    const apt = p.getAptitudeInfo();
    const vital = p.getVitalGu();
    const passive = p.getPassiveGu();

    const renderSlotRow = (slotKey, label, gu, unlocked = true) => `
      <div style="display:flex;gap:4px;align-items:stretch">
        <button type="button" class="ctl-slot-pill" style="flex:1" data-assign-slot="${slotKey}" ${unlocked ? "" : "disabled"}>
          <b>${label}:</b> ${unlocked ? (gu ? `${gu.name} (C${gu.rank})` : "Trống") : "Khóa chuyển"}
        </button>
        ${unlocked && gu ? `<button type="button" class="ctl-parch-btn" data-unequip-slot="${slotKey}" title="Tháo Cổ khỏi ô">Tháo</button>` : ""}
      </div>
    `;

    const slotsHtml = [
      renderSlotRow("vital", "Cổ Bản Mệnh (RMB)", vital, true),
      renderSlotRow("passive", "Ô Bị Động (Hướng Thủ)", passive, true),
      ...[0, 1, 2, 3, 4, 5, 6].map((i) => renderSlotRow(`slot_${i}`, `Ô ${i + 1}`, p.getActiveGu(i), i < stage.activeSlotsUnlocked)),
    ].join("");

    const bagHtml = p.guBag
      .map(
        (g) => `
      <button type="button" class="ctl-list-card ${this.selectedGuUid === g.uid ? "is-selected" : ""}" data-select-gu="${g.uid}" style="border-left:4px solid ${g.color}">
        <span class="ctl-icon-box">${getGuIconSvg(g)}</span>
        <div class="ctl-list-card-txt">
          <strong>${g.name} (Chuyển ${g.rank})</strong>
          <span>${g.vitalResonanceDesc || g.description}</span>
        </div>
      </button>
    `
      )
      .join("");

    const kmHtml = KILLER_MOVES.map((k) => {
      const idx = p.killerMoveIds.indexOf(k.id);
      return `
        <button type="button" class="ctl-list-card ${idx >= 0 ? "is-selected" : ""}" data-pick-km="${k.id}">
          <span class="ctl-icon-box">${getKillerMovePixelImgHtml(k)}</span>
          <div class="ctl-list-card-txt">
            <strong>${k.name} ${idx === 0 ? "[Q]" : idx === 1 ? "[E]" : ""}</strong>
            <span>${k.desc}</span>
          </div>
        </button>
      `;
    }).join("");

    return `
      <div class="ctl-aperture-sea" style="border-color:${stage.essenceColor}">
        <span><b>Không Khiếu Chân Nguyên Hải:</b> <span style="color:${stage.essenceColor}">${stage.essenceName}</span></span>
        <span>Dung lượng: ${Math.floor(p.mp)}/${p.maxMp} (${apt.name})</span>
      </div>
      <div class="ctl-grid-2">
        <div>
          <div class="ctl-box-title">1. Cổ Nang (${p.guBag.length}/${p.getMaxGuCapacity()}) — Giới hạn chịu tải Không Khiếu</div>
          <div class="ctl-scroll-list">${bagHtml}</div>
          <div class="ctl-box-title" style="margin-top:8px">Sát Chiêu (Bấm để gán Q)</div>
          <div class="ctl-scroll-list" style="max-height:110px">${kmHtml}</div>
        </div>
        <div>
          <div class="ctl-box-title">2. Ô Không Khiếu Đang Dùng</div>
          <div class="ctl-slots-stack">${slotsHtml}</div>
        </div>
      </div>
    `;
  }

  _buildFeedBody() {
    const p = this.player;
    const rows = p.guBag
      .map(
        (g) => `
      <div class="ctl-stat-row">
        <div style="display:flex;align-items:center;gap:8px">
          <span class="ctl-icon-box">${getGuIconSvg(g)}</span>
          <div>
            <strong style="color:${g.color}">${g.name}</strong> · Độ no: <b>${g.hunger ?? 100}%</b>
            <div class="ctl-sub-txt">Thức ăn: ${g.foodName || "Không cần ăn"}</div>
          </div>
        </div>
        ${g.foodItemId ? `<button type="button" class="ctl-parch-btn" data-feed-gu="${g.uid}">Cho Ăn (${p.getItemCount(g.foodItemId)})</button>` : `<span class="ctl-sub-txt">Tự hấp thu</span>`}
      </div>
    `
      )
      .join("");
    return `
      <label class="ctl-stat-row" style="margin-bottom:8px">
        <span>Tự động cho Cổ ăn theo lịch khi có thức ăn trong túi</span>
        <input type="checkbox" id="chk-autofeed" ${p.autoFeed ? "checked" : ""} />
      </label>
      <div class="ctl-scroll-list" style="max-height:260px">${rows}</div>
    `;
  }

  _buildCompoundBody() {
    const p = this.player;
    const rows = COMPOUND_RECIPES.map((r) => {
      const hasBase = p.guBag.some((g) => g.id === r.baseId);
      const matCount = p.getItemCount(r.subMatId);
      const can = hasBase && matCount >= r.subMatCount && p.nguyenThach >= r.stones;
      return `
        <div class="ctl-stat-row">
          <div>
            <strong>${r.title}</strong>
            <div class="ctl-sub-txt">Cần: ${ITEMS_CATALOG[r.subMatId]?.name ?? r.subMatId} (${matCount}/${r.subMatCount}) · ${r.stones} Thạch · Tỷ lệ ${Math.round(r.rate * 100)}%</div>
          </div>
          <button type="button" class="ctl-btn-jade" data-compound="${r.id}" ${can ? "" : "disabled"}>Hợp Luyện</button>
        </div>
      `;
    }).join("");
    return `<div class="ctl-scroll-list" style="max-height:300px">${rows}</div>`;
  }

  _buildPathsBody() {
    const p = this.player;
    const cards = Object.values(CULTIVATION_PATHS)
      .map((path) => {
        const active = p.chosenPath === path.id;
        const tier = getPathMasteryTier(p.pathExps[path.id] ?? 0);
        return `
          <button type="button" class="ctl-list-card ${active ? "is-selected" : ""}" data-choose-path="${path.id}" style="border-left:4px solid ${path.color}">
            <div class="ctl-list-card-txt">
              <strong>${path.name} · [${tier.tierName}] ${active ? "(Đang Tu)" : ""}</strong>
              <span>${path.trait}</span>
            </div>
          </button>
        `;
      })
      .join("");
    return `<div class="ctl-list-grid" style="max-height:300px;overflow:auto">${cards}</div>`;
  }

  _buildBagBody() {
    const p = this.player;
    const entries = Object.entries(p.itemBag).filter(([, c]) => c > 0);
    const cards = entries
      .map(([id, cnt]) => {
        const it = ITEMS_CATALOG[id] ?? { id, name: id, desc: "", color: "#ccc" };
        const isConsumable = it.category === "consumable" || id === "ruou_trang" || id === "mat_ong";
        const isRelic = it.category === "relic_gu";
        return `
          <div class="ctl-bag-cell" style="border-top:2px solid ${it.color}">
            <div style="display:flex;align-items:center;gap:6px">
              <span class="ctl-icon-box">${getItemIconSvg(it)}</span>
              <div><strong>${it.name}</strong><div class="ctl-sub-txt">SL: ${cnt}</div></div>
            </div>
            <div class="ctl-sub-txt">${it.desc}</div>
            ${
              isRelic
                ? `<div class="ctl-btn-row" style="margin-top:auto">
                    <button type="button" class="ctl-btn-jade" data-use-bag-item="${id}">Luyện Hóa (+1 Tầng)</button>
                  </div>`
                : isConsumable
                  ? `<div class="ctl-btn-row" style="margin-top:auto">
                      <button type="button" class="ctl-btn-jade" data-use-bag-item="${id}">Dùng</button>
                      <button type="button" class="ctl-parch-btn" data-bind-qi="0:${id}">Gán Z</button>
                      <button type="button" class="ctl-parch-btn" data-bind-qi="1:${id}">Gán G</button>
                    </div>`
                  : ""
            }
          </div>
        `;
      })
      .join("");
    return `<div class="ctl-bag-grid">${cards || "Túi trống"}</div>`;
  }

  _buildGambleBody() {
    const p = this.player;
    const stones = ["mao_thach_so", "mao_thach_trung", "mao_thach_cao"]
      .map((id) => {
        const it = ITEMS_CATALOG[id];
        const cnt = p.getItemCount(id);
        return `
          <div class="ctl-stat-row">
            <div style="display:flex;align-items:center;gap:8px">
              <span class="ctl-icon-box">${getItemIconSvg(it)}</span>
              <div><strong style="color:${it.color}">${it.name} (Có: ${cnt})</strong><div class="ctl-sub-txt">${it.desc}</div></div>
            </div>
            <div class="ctl-btn-row" style="margin-top:0">
              <button type="button" class="ctl-btn-jade" data-cut-stone="${id}" ${cnt > 0 ? "" : "disabled"}>Cắt Đá</button>
              <button type="button" class="ctl-parch-btn" data-buy-item="${id}">Mua (${it.buyPrice})</button>
            </div>
          </div>
        `;
      })
      .join("");
    return `<div class="ctl-box"><div class="ctl-box-title">Phường Đổ Thạch Bến Thương</div>${stones}</div>`;
  }

  _buildShopBody() {
    const rows = Object.values(ITEMS_CATALOG)
      .filter((it) => it.buyPrice)
      .map(
        (it) => `
        <div class="ctl-stat-row">
          <div style="display:flex;align-items:center;gap:8px">
            <span class="ctl-icon-box">${getItemIconSvg(it)}</span>
            <div><strong style="color:${it.color}">${it.name}</strong><div class="ctl-sub-txt">${it.desc}</div></div>
          </div>
          <button type="button" class="ctl-parch-btn" data-buy-item="${it.id}">Mua (${it.buyPrice} Thạch)</button>
        </div>
      `
      )
      .join("");
    return `<div class="ctl-scroll-list" style="max-height:300px">${rows}</div>`;
  }

  _buildCultivateBody() {
    const p = this.player;
    const stage = p.getStage();
    const apt = p.getAptitudeInfo();
    const prog = getStageProgress(p.stageLevel, p.cultivationExp);
    const wallName = APERTURE_WALL_NAMES[stage.stageIndex] || "Khiếu Bích";
    const seaColor = RANK_ESSENCE_COLORS[stage.rank]?.color || "#3ec99a";
    const cost1 = apt.stoneCostPerCycle ?? 2;
    const cost5 = cost1 * 5;
    const req = BREAKTHROUGH_REQUIREMENTS[stage.rank];
    const effCost = p.getEffectiveBreakthroughStoneCost();
    const isCapped = !stage.next || prog.readyForBreakthrough;

    return `
      <div class="ctl-cultivate-grid">
        <div class="ctl-box" style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px">
          <div class="ctl-box-title">Không Khiếu & Chân Nguyên Hải</div>
          <canvas id="aperture-sea-canvas" width="168" height="168" style="border-radius:50%;border:2px solid ${seaColor};background:#090d11"></canvas>
          <div style="text-align:center">
            <strong style="color:${apt.color}">${apt.name}</strong>
            <div class="ctl-sub-txt">Độ chứa Khai Khiếu: <b>${p.apertureSeaPct || apt.defaultSeaPct || 48}%</b> (${p.awakeningSteps || 27} bước)</div>
            <div class="ctl-sub-txt">Chân Nguyên: <b>${Math.floor(p.mp)} / ${p.maxMp}</b></div>
          </div>
        </div>
        <div class="ctl-box">
          <div class="ctl-box-title">Tĩnh Tọa Hấp Thu Nguyên Thạch · ${stage.title}</div>
          <div class="ctl-sub-txt" style="margin-bottom:6px">
            • Vách Không Khiếu: <b>${wallName}</b><br/>
            • Tốc độ hấp thu theo Tư Chất: <b style="color:${apt.color}">x${apt.stoneAbsorbMult ?? 1}</b><br/>
            • Tu vi tích lũy: <b>${p.cultivationExp} / ${prog.need || "Max"}</b> (${Math.round(prog.pct * 100)}%)
          </div>
          <div class="ctl-ritual-track" style="margin-bottom:10px">
            <div class="ctl-ritual-fill" style="width:${Math.round(prog.pct * 100)}%;background:linear-gradient(90deg, ${seaColor}, #4de0c9)"></div>
          </div>
          <div style="display:flex;flex-direction:column;gap:7px">
            <button type="button" id="btn-cult-refill" class="ctl-parch-btn" ${p.nguyenThach < 1 ? "disabled" : ""}>
              Hấp Thu 1 Nguyên Thạch → Hồi Chân Nguyên Hải
            </button>
            <button type="button" id="btn-wash-1" class="ctl-btn-jade" ${isCapped || p.nguyenThach < cost1 ? "disabled" : ""}>
              ${isCapped ? "Khiếu Bích Đã Đầy 100% — Hãy Xung Kích Phá Vách!" : `Cọ Rửa Khiếu Bích x1 (-${cost1} Nguyên Thạch · +${Math.round(28 * (apt.stoneAbsorbMult ?? 1))} Tu Vi)`}
            </button>
            <button type="button" id="btn-wash-5" class="ctl-btn-gold" ${isCapped || p.nguyenThach < cost5 ? "disabled" : ""}>
              ${isCapped ? "Không Thể Cọ Rửa Thêm (Đỉnh Phong 100%)" : `Bế Quan Đại Chu Thiên x5 (-${cost5} Nguyên Thạch · +${Math.round(140 * (apt.stoneAbsorbMult ?? 1))} Tu Vi)`}
            </button>
            ${
              stage.isPeak && req
                ? `<div class="ctl-box" style="margin-top:4px;border-color:${prog.readyForBreakthrough ? "#4de0c9" : "#3b4c63"}">
                    <div class="ctl-box-title" style="margin-bottom:2px;color:#4de0c9">${req.title}</div>
                    <div class="ctl-sub-txt" style="margin-bottom:6px">Chi phí Xung Kích Khiếu Bích: <b>${effCost} Nguyên Thạch</b>${p.insightCount > 0 ? " · Có Cảm Ngộ nới vùng an toàn" : ""}</div>
                    <button type="button" id="btn-breakthrough" class="ctl-btn-jade" style="width:100%" ${prog.readyForBreakthrough ? "" : "disabled"}>
                      ${prog.readyForBreakthrough ? "⚡ Xung Kích Phá Vách Đột Phá Chuyển Mới!" : `Cọ rửa đạt 100% Đỉnh Phong để mở khóa (${Math.round(prog.pct * 100)}%)`}
                    </button>
                  </div>`
                : ""
            }
          </div>
        </div>
      </div>
    `;
  }

  _buildMainStoryBody() {
    const p = this.player;
    const total = MAIN_QUESTS.length;
    const idx = Math.max(0, Math.min(total, p.mainQuestIndex ?? 0));
    const donePct = Math.round((idx / total) * 100);
    const activeQ = MAIN_QUESTS[idx] ?? null;
    const activeAct = activeQ ? STORY_ACTS.find((a) => a.id === activeQ.act) : STORY_ACTS[STORY_ACTS.length - 1];

    const listHtml = MAIN_QUESTS.map((q, i) => {
      const isDone = i < idx;
      const isCurrent = i === idx;
      const need = q.goal?.count ?? 1;
      const cur = isDone ? need : isCurrent ? Math.min(need, p.questProgress ?? 0) : 0;
      const actInfo = STORY_ACTS.find((a) => a.id === q.act);
      return `
        <div class="ctl-story-card ${isCurrent ? "is-current" : isDone ? "is-done" : "is-locked"}">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:8px">
            <div>
              <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
                <span class="ctl-qi-badge">${isDone ? "Hoàn Thành" : isCurrent ? `Chương ${q.chapter}` : `Chương ${q.chapter}`}</span>
                <strong style="color:${isCurrent ? "#ffd257" : isDone ? "#5ef2d6" : "#8fa0b5"}">${q.title}</strong>
                <span class="ctl-sub-txt">[${actInfo?.name || ""}]</span>
              </div>
              ${q.loreQuote && (isCurrent || isDone) ? `<div class="ctl-sub-txt" style="color:#b8c7d9;font-style:italic;margin-top:2px">${q.loreQuote}</div>` : ""}
              <div class="ctl-sub-txt" style="margin-top:2px">${q.objectiveText} ${isCurrent || isDone ? `<b>(${cur}/${need})</b>` : ""}</div>
              <div class="ctl-sub-txt" style="color:#5fbf8a;margin-top:2px">Thưởng: +${q.rewards?.stones ?? 0} Nguyên Thạch · +${q.rewards?.exp ?? 0} Tu Vi${q.rewards?.insight ? ` · +${q.rewards.insight} Cảm Ngộ` : ""}</div>
            </div>
            <div style="flex-shrink:0">
              ${
                isDone
                  ? `<span style="color:#5ef2d6;font-weight:700">[Đã Xong]</span>`
                  : isCurrent
                    ? `<button type="button" class="ctl-btn-jade" data-go-main-quest="${q.id}">Thực Hiện</button>`
                    : `<span style="color:#6d7f96">Chưa Mở</span>`
              }
            </div>
          </div>
        </div>
      `;
    }).join("");

    return `
      <div class="ctl-box" style="margin-bottom:8px">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:4px">
          <strong style="color:#ffd257">${activeAct?.name || "Tuyến Chính"}</strong>
          <span style="color:#5ef2d6;font-weight:700">Tiến độ: ${idx}/${total} Chương (${donePct}%)</span>
        </div>
        <div class="ctl-story-bar"><div class="ctl-story-fill" style="width:${donePct}%"></div></div>
        <div class="ctl-sub-txt" style="margin-top:4px">
          ${activeQ ? `Mục tiêu hiện tại: <b>${activeQ.title}</b> — ${activeQ.locationHint}` : "Chúc mừng đạo hữu đã hoàn tất toàn bộ 18 Chương Cổ Chân Nhân từ Hang Ngầm tới Vực Vạn Thủ!"}
        </div>
      </div>
      <div class="ctl-scroll-list" style="max-height:290px">${listHtml}</div>
    `;
  }

  _buildClanQuestsBody() {
    const board = this.player.clanBoard ?? [];
    const rows = board
      .map((m, i) => {
        const need = m.goal?.count ?? 1;
        const cur = Math.min(need, m.progress ?? 0);
        const done = cur >= need;
        return `
          <div class="ctl-stat-row" style="align-items:center">
            <div>
              <strong style="color:#ffd047">${m.title}</strong>
              <div class="ctl-sub-txt">${m.desc}</div>
              <div class="ctl-sub-txt">Tiến độ: <b>${cur}/${need}</b> · Thưởng: <b style="color:#5ef2d6">+${m.rewards.stones} Nguyên Thạch</b> · +${m.rewards.exp} Tu Vi</div>
            </div>
            <div style="display:flex;gap:6px;flex-shrink:0">
              ${
                m.claimed
                  ? `<span class="ctl-sub-txt">Đã nhận</span>`
                  : done
                    ? `<button type="button" class="ctl-btn-jade" data-claim-clan="${i}">Nhận Thưởng</button>`
                    : `<button type="button" class="ctl-parch-btn" data-go-mission="${m.mapId}:${m.x}:${m.y}">Đi Ngay</button>`
              }
            </div>
          </div>
        `;
      })
      .join("");
    return `
      <div class="ctl-box" style="margin-bottom:8px;display:flex;justify-content:space-between;align-items:center">
        <span class="ctl-sub-txt">Nhiệm Vụ Gia Tộc tự động cập nhật tiến độ khi săn thú đúng khu sinh thái hoặc thu thập.</span>
        <button type="button" id="btn-refresh-clan" class="ctl-btn-gold">Làm Mới Bảng Nhiệm Vụ</button>
      </div>
      <div class="ctl-scroll-list" style="max-height:280px">${rows || "<div class='ctl-sub-txt'>Chưa có nhiệm vụ.</div>"}</div>
    `;
  }

  _buildRankGuQuestsBody() {
    const rankTabs = [1, 2, 3]
      .map((r) => `<button type="button" class="floor-pill ${this.questRankFilter === r ? "is-selected" : ""}" data-gq-rank="${r}">Cổ Trùng Chuyển ${r}</button>`)
      .join("");
    const active = this.player.activeGuQuest;
    const claimedSet = new Set(this.player.claimedGuQuestIds ?? []);
    const list = RANK_GU_QUESTS.filter((q) => q.rank === this.questRankFilter);

    const rows = list
      .map((q) => {
        const gu = GU_CATALOG[q.guId];
        const isAct = active?.id === q.id;
        const isDone = isAct && active.completed;
        const isClaimed = claimedSet.has(q.id);
        const cur = isAct ? Math.min(q.goal.count ?? 1, active.progress ?? 0) : 0;
        return `
          <div class="ctl-stat-row" style="align-items:center">
            <div style="display:flex;align-items:center;gap:8px">
              <span class="ctl-icon-box" style="width:34px;height:34px">${getGuIconSvg(gu)}</span>
              <div>
                <div style="display:flex;align-items:center;gap:6px">
                  <strong style="color:${gu?.color || "#e3bc6b"}">${q.title}</strong>
                  <span class="ctl-qi-badge">${q.pathLabel}</span>
                </div>
                <div class="ctl-sub-txt">${q.desc}</div>
                <div class="ctl-sub-txt">Thưởng: <b style="color:${gu?.color}">${gu?.name}</b> + <b>${q.rewards.stones} Nguyên Thạch</b>${isAct ? ` · Tiến độ: <b>${cur}/${q.goal.count ?? 1}</b>` : ""}</div>
              </div>
            </div>
            <div style="flex-shrink:0">
              ${
                isClaimed
                  ? `<span class="ctl-sub-txt">Đã thu phục</span>`
                  : isDone
                    ? `<button type="button" class="ctl-btn-jade" data-claim-gu-quest="${q.id}">Luyện Hóa Cổ!</button>`
                    : isAct
                      ? `<button type="button" class="ctl-parch-btn" data-go-mission="${q.mapId}:${q.x}:${q.y}">Đi Săn (${cur}/${q.goal.count ?? 1})</button>`
                      : `<button type="button" class="ctl-btn-gold" data-accept-gu-quest="${q.id}">Chọn Nhiệm Vụ</button>`
              }
            </div>
          </div>
        `;
      })
      .join("");

    return `
      <div style="display:flex;gap:6px;margin-bottom:8px">${rankTabs}</div>
      <div class="ctl-scroll-list" style="max-height:290px">${rows}</div>
    `;
  }

  _buildWorldBody() {
    const cards = Object.values(WORLD_MAPS)
      .map(
        (m) => `
      <button type="button" class="ctl-map-node ${this.world.currentMapId === m.id ? "is-current" : ""}" data-teleport="${m.id}">
        <strong style="color:${m.pvpZoneType === "safe" ? "#5fbf8a" : "#e3bc6b"}">${m.name}</strong>
        <span class="ctl-sub-txt">${m.recommendedRealm} · ${m.pvpZoneType === "safe" ? "An toàn" : "Cờ tự chọn"}</span>
        <span class="ctl-sub-txt">${m.subtitle}</span>
      </button>
    `
      )
      .join("");
    return `<div class="ctl-world-atlas">${cards}</div>`;
  }

  _buildDungeonsBody() {
    const rows = DUNGEONS_LIST.map(
      (d) => `
      <div class="ctl-stat-row">
        <div><strong>${d.name} (${d.recRank})</strong><div class="ctl-sub-txt">Boss: ${d.bossName} · Thưởng: ${d.stones} Nguyên Thạch</div></div>
        <button type="button" class="ctl-btn-jade" data-enter-dungeon="${d.id}">Khiêu Chiến</button>
      </div>
    `
    ).join("");
    return `<div class="ctl-scroll-list" style="max-height:300px">${rows}</div>`;
  }

  _buildDailyBody() {
    const p = this.player;
    const rankRows = (this.onlineHub?.leaderboard ?? [])
      .slice(0, 6)
      .map((r, i) => `<div class="ctl-stat-row"><span>#${i + 1} <b>${r.name}</b></span><span>${r.cultivation_exp} Tu Vi</span></div>`)
      .join("");
    return `
      <div class="ctl-box">
        <div class="ctl-box-title">Hoạt Động & Quà Hôm Nay</div>
        <div class="ctl-sub-txt">Nhận thưởng mỗi ngày: +120 Nguyên thạch, +2 Cảm ngộ, +2 Mao Thạch Sơ Phẩm.</div>
        <button type="button" id="btn-claim-daily" class="ctl-btn-jade" style="margin-top:6px" ${p.dailyClaimed ? "disabled" : ""}>
          ${p.dailyClaimed ? "Đã Nhận Quà Hôm Nay" : "Nhận Quà Hôm Nay"}
        </button>
      </div>
      <div class="ctl-box" style="margin-top:8px">
        <div class="ctl-box-title">Bảng Xếp Hạng Thiên Kiêu Online</div>
        ${rankRows || `<div class="ctl-sub-txt">Đang đồng bộ danh sách...</div>`}
      </div>
    `;
  }

  _buildMailBody() {
    const claimed = Boolean(this.player.mailClaimed);
    return `
      <div class="ctl-box">
        <div class="ctl-box-title">Thư Chúc Mừng Tân Thủ Cổ Tiên Lộ</div>
        <div class="ctl-sub-txt">Đội ngũ Cổ Tiên Lộ gửi tặng đạo hữu gói quà trải nghiệm (1 lần mỗi nhân vật): +100 Nguyên Thạch, +3 Thảo Dược, +2 Hạt Giống Âm Thảo, +2 Mồi Câu, +1 Mao Thạch!</div>
        <button type="button" id="btn-claim-mail" class="ctl-btn-jade" style="margin-top:8px" ${claimed ? "disabled" : ""}>
          ${claimed ? "Đã Nhận Quà Tân Thủ" : "Nhận Quà Hỗ Trợ"}
        </button>
      </div>
    `;
  }

  _buildClanArenaBody() {
    const challengers = [
      {
        id: "phuong_chinh",
        name: "Cổ Nguyệt Phương Chính",
        realmLabel: "Nhị Chuyển Sơ Giai · Nguyệt Quang Sư",
        monsterType: "mac_vo_tam",
        hpMult: 1.2,
        baseHp: 320,
        dmgRatio: 0.065,
        baseDmg: 14,
        stones: 140,
        desc: "Đệ tử giáp đẳng Cổ Nguyệt tộc, sử dụng Nguyệt Mang Cổ tấn công tầm trung.",
      },
      {
        id: "mac_bac",
        name: "Cổ Nguyệt Mạc Bắc",
        realmLabel: "Nhị Chuyển Đỉnh Phong · Lực Đạo",
        monsterType: "hao_dien_lang",
        hpMult: 1.55,
        baseHp: 460,
        dmgRatio: 0.08,
        baseDmg: 20,
        stones: 220,
        desc: "Thiên kiêu nhánh Mạc gia, công thủ toàn diện, hung hãn như Thanh Mao Lang.",
      },
      {
        id: "xich_thanh",
        name: "Cổ Nguyệt Xích Thành",
        realmLabel: "Nhị Chuyển Trung Giai · Hỏa Đạo",
        monsterType: "co_su_hac_bao",
        hpMult: 1.45,
        baseHp: 410,
        dmgRatio: 0.075,
        baseDmg: 18,
        stones: 190,
        desc: "Truyền nhân nhánh Xích gia, chiêu thức dồn dập tốc độ cao.",
      },
      {
        id: "bach_ngung_bang",
        name: "Bạch Ngưng Băng",
        realmLabel: "Tam Chuyển · Bắc Minh Băng Phách Thể",
        monsterType: "tam_nha_dien_lang",
        hpMult: 2.15,
        baseHp: 780,
        dmgRatio: 0.095,
        baseDmg: 28,
        stones: 380,
        desc: "Thiên tài Bạch Gia Trại thập tuyệt thể, hàn băng kiếm khí cực kỳ nguy hiểm.",
      },
      {
        id: "thanh_thu",
        name: "Cổ Nguyệt Thanh Thư",
        realmLabel: "Tam Chuyển Đỉnh Phong · Mộc Đạo",
        monsterType: "van_thu_vuong",
        hpMult: 2.45,
        baseHp: 940,
        dmgRatio: 0.1,
        baseDmg: 32,
        stones: 480,
        desc: "Cường giả đứng đầu thế hệ trẻ Cổ Nguyệt Sơn Trại, Tùng Châm Cổ áp đảo.",
      },
    ];
    this._clanArenaChallengers = challengers;
    const rows = challengers
      .map(
        (c) => `
        <div class="ctl-box" style="margin-bottom:6px;display:flex;justify-content:space-between;align-items:center;gap:10px">
          <div>
            <div class="ctl-box-title">${c.name} <span style="color:#ffd87a;font-size:11px">[${c.realmLabel}]</span></div>
            <div class="ctl-sub-txt">${c.desc}</div>
            <div class="ctl-sub-txt" style="color:#5ef2d6;margin-top:2px">Thưởng thắng trận: +${c.stones} Nguyên Thạch · +90 Tu Vi · Tinh Luyện Lôi Đài</div>
          </div>
          <button type="button" class="ctl-btn-jade" data-start-arena="${c.id}">Lên Đài Tỷ Thí</button>
        </div>`
      )
      .join("");
    return `
      <div class="ctl-sub-txt" style="margin-bottom:8px">
        Chọn đối thủ để mở trận sinh tử tỷ thí ngay trên đá xanh Bát Quái Cổ Nguyệt Lôi Đài (4 trụ hỏa thú bùng cháy):
      </div>
      <div class="ctl-scroll-list" style="max-height:310px">${rows}</div>
    `;
  }

  _buildSettingsBody() {
    const isMuted = this.sfx?.muted;
    const uiMode = this.getUiMode?.() || "auto";
    const uiModeLabel = uiMode === "mobile" ? "Điện Thoại" : uiMode === "desktop" ? "Máy Tính" : "Tự Động";
    return `
      <div class="ctl-box">
        <div class="ctl-box-title">Tùy Chọn & Tài Khoản</div>
        <div class="ctl-btn-row" style="margin-top:8px;flex-wrap:wrap">
          <button type="button" id="btn-toggle-sfx" class="ctl-parch-btn">${isMuted ? "Đang Tắt Âm" : "Đang Bật Âm"}</button>
          <button type="button" id="btn-cycle-uimode" class="ctl-parch-btn">Giao diện: ${uiModeLabel}</button>
          <button type="button" id="btn-open-mirror" class="ctl-parch-btn">Đổi Diện Mạo</button>
          <button type="button" id="btn-open-acc" class="ctl-parch-btn">Tài Khoản Đám Mây</button>
          <button type="button" id="btn-switch-char" class="ctl-btn-jade">Quay Về Chọn Nhân Vật</button>
        </div>
        <div class="ctl-sub-txt" style="margin-top:10px">
          <b>Máy tính:</b> WASD di chuyển · Chuột Trái đánh thường · Chuột Phải Cổ Bản Mệnh · 1-7 Cổ Chủ Động · Q/E Sát Chiêu · Z/G Đan Dược · Giữ R Hấp Thu · X Bế Quan · F Tương tác · Tab Đổi mục tiêu · Space Lướt.<br/>
          <b>Điện thoại / Cảm ứng:</b> Kéo Joystick góc dưới-trái để di chuyển · Chạm bản đồ để chọn mục tiêu/đi tới · Chạm trực tiếp nút Đánh, Cổ Trùng, Sát Chiêu và Menu bên phải.
        </div>
      </div>
    `;
  }

  _bindModalEvents() {
    this.root.querySelector("#ctl-modal-close")?.addEventListener("click", () => this.close());
    this.root.querySelectorAll("[data-subtab]").forEach((btn) => {
      btn.addEventListener("click", () => {
        this.subTab = btn.dataset.subtab;
        this.notice = "";
        this.render();
      });
    });

    if (this._apertureRaf) {
      cancelAnimationFrame(this._apertureRaf);
      this._apertureRaf = null;
    }
    const apCanvas = this.root.querySelector("#aperture-sea-canvas");
    if (apCanvas && this.panel === "cultivate") {
      const ctx = apCanvas.getContext("2d");
      ctx.imageSmoothingEnabled = false;
      const stage = this.player.getStage();
      const col = RANK_ESSENCE_COLORS[stage.rank]?.color || "#3ec99a";
      const t0 = performance.now();
      const drawOrb = (now) => {
        if (this.panel !== "cultivate") return;
        const t = (now - t0) / 1000;
        const ratio = Math.max(0.12, Math.min(1, this.player.maxMp > 0 ? this.player.mp / this.player.maxMp : 0.45));
        const w = apCanvas.width;
        const h = apCanvas.height;
        const pad = 8;
        const innerW = w - pad * 2;
        const innerH = h - pad * 2;
        ctx.clearRect(0, 0, w, h);
        // Khung bát giác pixel Không Khiếu (0 ctx.arc, 0 createRadialGradient)
        ctx.fillStyle = "#05080d";
        ctx.fillRect(pad - 4, pad - 4, innerW + 8, innerH + 8);
        ctx.fillStyle = "#0a111a";
        ctx.fillRect(pad, pad, innerW, innerH);
        const surfY = h - pad - Math.round(ratio * (innerH - 8));
        // Sóng Chân Nguyên Hải bậc thang pixel 4px
        for (let x = pad; x < w - pad; x += 4) {
          const waveY = Math.round(surfY + Math.sin(x * 0.06 + t * 3.2) * 4);
          const colH = Math.max(2, h - pad - waveY);
          ctx.fillStyle = col;
          ctx.globalAlpha = 0.78;
          ctx.fillRect(x, waveY, 4, colH);
          ctx.globalAlpha = 0.92;
          ctx.fillStyle = "#eafffa";
          ctx.fillRect(x, waveY, 4, 2);
        }
        ctx.globalAlpha = 1;
        // Viền đồng cổ 2 lớp vát góc pixel
        ctx.fillStyle = col;
        ctx.fillRect(pad - 2, pad - 2, innerW + 4, 2);
        ctx.fillRect(pad - 2, h - pad, innerW + 4, 2);
        ctx.fillRect(pad - 2, pad, 2, innerH);
        ctx.fillRect(w - pad, pad, 2, innerH);
        if (this.isOpen()) this._apertureRaf = requestAnimationFrame(drawOrb);
      };
      drawOrb(t0);
    }

    this.root.querySelector("#btn-cult-refill")?.addEventListener("click", () => {
      const res = this.player.absorbStoneRefillMp();
      if (!res.ok) return this._flash(res.reason, "fail");
      this.sfx?.play("pickup");
      this.onStateChanged?.();
      this._flash(`Đã hấp thu 1 Nguyên Thạch (+${res.gain} Chân Nguyên)!`);
    });
    this.root.querySelector("#btn-wash-1")?.addEventListener("click", () => {
      const res = this.player.washApertureWallsWithStones(1);
      if (!res.ok) return this._flash(res.reason, "fail");
      this.sfx?.play("pickup");
      this.onStateChanged?.();
      this._flash(`Cọ rửa ${res.wallName}: -${res.totalCost} Thạch → +${res.gainExp} Tu Vi!`);
    });
    this.root.querySelector("#btn-wash-5")?.addEventListener("click", () => {
      const res = this.player.washApertureWallsWithStones(5);
      if (!res.ok) return this._flash(res.reason, "fail");
      this.sfx?.play("fusionSuccess");
      this.onStateChanged?.();
      this._flash(`Đại Chu Thiên x5 cọ rửa ${res.wallName}: -${res.totalCost} Thạch → +${res.gainExp} Tu Vi!`);
    });
    this.root.querySelector("#btn-goto-breakthrough")?.addEventListener("click", () => {
      this.open("char", "main");
    });

    this.root.querySelector("#btn-refresh-clan")?.addEventListener("click", () => {
      this.player.refreshClanMissions();
      this.sfx?.play("pickup");
      this.onStateChanged?.();
      this._flash("Đã làm mới Bảng Nhiệm Vụ Gia Tộc!");
    });
    this.root.querySelectorAll("[data-claim-clan]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const idx = Number(btn.dataset.claimClan);
        const m = this.player.clanBoard?.[idx];
        if (!m || m.claimed) return;
        m.claimed = true;
        this.player.nguyenThach += m.rewards.stones ?? 100;
        this.player.addCultivationExp(m.rewards.exp ?? 100, {});
        for (const it of m.rewards.items ?? []) this.player.addItem(it.id, it.count);
        this.sfx?.play("fusionSuccess");
        this.onStateChanged?.();
        this._flash(`Nhận thưởng [${m.title}]: +${m.rewards.stones} Nguyên Thạch!`);
      });
    });
    this.root.querySelectorAll("[data-gq-rank]").forEach((btn) => {
      btn.addEventListener("click", () => {
        this.questRankFilter = Number(btn.dataset.gqRank) || 1;
        this.render();
      });
    });
    this.root.querySelectorAll("[data-accept-gu-quest]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const q = RANK_GU_QUESTS.find((x) => x.id === btn.dataset.acceptGuQuest);
        if (!q) return;
        this.player.selectGuQuest(q);
        this.sfx?.play("pickup");
        this.onStateChanged?.();
        this._flash(`Đã nhận nhiệm vụ tầm cổ: ${q.title}!`);
      });
    });
    this.root.querySelectorAll("[data-claim-gu-quest]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const gq = this.player.activeGuQuest;
        if (!gq || gq.id !== btn.dataset.claimGuQuest || !gq.completed) return;
        const maxCap = this.player.getMaxGuCapacity();
        if (this.player.guBag.length >= maxCap) {
          this._flash(`Cổ Nang đã đầy (${this.player.guBag.length}/${maxCap})! Hãy Hợp Luyện hoặc Thăng Chuyển trước!`, "fail");
          return;
        }
        const worm = createGuWorm(gq.guId);
        this.player.guBag.push(worm);
        this.player.nguyenThach += gq.rewards.stones ?? 120;
        this.player.addCultivationExp(gq.rewards.exp ?? 120, {});
        if (!this.player.claimedGuQuestIds.includes(gq.id)) this.player.claimedGuQuestIds.push(gq.id);
        this.player.activeGuQuest = null;
        this.sfx?.play("fusionSuccess");
        this.onStateChanged?.();
        this._flash(`Thu phục thành công [${worm.name}] + ${gq.rewards.stones} Nguyên Thạch!`);
      });
    });
    this.root.querySelectorAll("[data-go-mission]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const [mapId, xs, ys] = btn.dataset.goMission.split(":");
        this.close();
        if (this.world.currentMapId === mapId) {
          this.world.navigateTo(Number(xs), Number(ys), "move");
        } else {
          this.world.navigateToMap(mapId, Number(xs), Number(ys));
        }
      });
    });

    const charCanvas = this.root.querySelector("#modal-char-canvas");
    if (charCanvas) {
      drawCustomCharacterPreview(charCanvas, this.player.appearance, { scale: 2 });
    }

    this.root.querySelectorAll("[data-add-pot]").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (this.player.freePoints <= 0) return;
        this.player.freePoints -= 1;
        this.player.potentials[btn.dataset.addPot] += 1;
        this.player.recalculateStats(false);
        this.onStateChanged?.();
        this.render();
      });
    });

    this.root.querySelector("#btn-meditate")?.addEventListener("click", () => {
      this.player.isMeditating = true;
      this.player.addCultivationExp(45, {});
      this.sfx?.play("pickup");
      this._flash("Đã Bế Quan tu luyện +45 Tu Vi (hoặc nhấn phím X ngoài bản đồ)!");
      this.onStateChanged?.();
    });

    this.root.querySelector("#btn-blood-sac")?.addEventListener("click", () => {
      const stage = this.player.getStage();
      if (stage.rank < 4 || this.player.bloodSpring < 100) {
        this._flash("Cần đạt Tứ Chuyển và tích đủ 100% Huyết Tuyền từ việc săn thú!", "fail");
        return;
      }
      if (this.player.aptitude === "Giap") {
        this._flash("Tư Chất đã đạt Giáp Đẳng đỉnh cao!", "success");
        return;
      }
      this.player.bloodSpring = 0;
      this.player.stageLevel = Math.max(1, this.player.stageLevel - 4);
      this.player.aptitude = this.player.aptitude === "Binh" ? "At" : "Giap";
      this.player.recalculateStats(true);
      this.sfx?.play("fusionSuccess");
      this._flash(`Tế Huyết thành công! Tư chất thăng lên ${this.player.getAptitudeInfo().name}!`);
      this.onStateChanged?.();
    });

    this.root.querySelector("#btn-breakthrough")?.addEventListener("click", () => {
      const stage = this.player.getStage();
      const prog = getStageProgress(this.player.stageLevel, this.player.cultivationExp);
      const req = BREAKTHROUGH_REQUIREMENTS[stage.rank];
      if (!req || !stage.next) return;
      if (!prog.readyForBreakthrough) {
        this._flash(`Cần Tu Vi Đỉnh Phong 100% mới xung kích được Khiếu Bích (hiện tại ${Math.round(prog.pct * 100)}%)!`, "fail");
        return;
      }
      const effCost = this.player.getEffectiveBreakthroughStoneCost();
      if (this.player.nguyenThach < effCost) {
        this._flash(`Cần ${effCost} Nguyên Thạch để đột phá!`, "fail");
        return;
      }
      const hasBonus =
        this.player.guBag.some((g) => g.id === "tuu_trung" || g.id === "tu_vi_tuu_trung") ||
        this.player.insightCount > 0 ||
        (req.bonusItemId && this.player.getItemCount(req.bonusItemId) > 0);
      this.close();
      this.minigame.open("breakthrough", {
        title: req.title,
        hasWineBonus: hasBonus,
        onSuccess: () => {
          this.player.nguyenThach = Math.max(0, this.player.nguyenThach - effCost);
          let extraPts = 8;
          if (this.player.insightCount > 0) {
            this.player.insightCount -= 1;
            extraPts += 2;
          }
          this.player.cultivationExp = 0;
          this.player.stageLevel += 1;
          this.player.freePoints += extraPts;
          this.player.recalculateStats(true);
          this.world?._advanceQuest("reach_rank", {});
          this.sfx?.play("fusionSuccess");
          this.world?.spawnVfx("vfx/nguyet-quang", this.player.x, this.player.y, { scale: 1.1 });
          this.world?.addFloatingText(this.player.x, this.player.y - 36, `ĐỘT PHÁ THÀNH CÔNG: ${this.player.getStage().title}!`, "#4de0c9");
          this.onStateChanged?.();
        },
        onFail: () => {
          this.player.hp = Math.max(10, Math.round(this.player.hp * 0.85));
          this.world?.addFloatingText(this.player.x, this.player.y - 30, "Xung kích Khiếu Bích thất bại — Chân nguyên phản phệ nhẹ!", "#d94854");
          this.onStateChanged?.();
        },
      });
    });

    this.root.querySelectorAll("[data-equip-armor]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const piece = this.player.armorBag.find((a) => a.uid === btn.dataset.equipArmor);
        if (!piece) return;
        this.player.armorEquipped[piece.slotId] = piece.uid;
        this.player.recalculateStats(false);
        this.sfx?.play("pickup");
        this.onStateChanged?.();
        this._flash(`Đã trang bị ${piece.name}!`);
      });
    });

    this.root.querySelectorAll("[data-enhance]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const piece = this.player.armorBag.find((a) => a.uid === btn.dataset.enhance);
        if (!piece) return;
        if (this.player.nguyenThach < 20 || !this.player.consumeItem("da_cuong_hoa", 1)) {
          this._flash("Cần 1 Đá Cường Hóa và 20 Nguyên Thạch!", "fail");
          return;
        }
        this.player.nguyenThach -= 20;
        piece.enhanceLevel = (piece.enhanceLevel ?? 0) + 1;
        this.player.recalculateStats(false);
        this.sfx?.play("fusionSuccess");
        this.onStateChanged?.();
        this._flash(`Cường hóa ${piece.name} lên +${piece.enhanceLevel}!`);
      });
    });

    this.root.querySelectorAll("[data-select-gu]").forEach((btn) => {
      btn.addEventListener("click", () => {
        this.selectedGuUid = btn.dataset.selectGu;
        this.render();
      });
    });

    this.root.querySelectorAll("[data-assign-slot]").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (!this.selectedGuUid) return this._flash("Chọn một Cổ Trùng ở cột trái trước!", "fail");
        const p = this.player;
        const gu = p.getGu(this.selectedGuUid);
        const stage = p.getStage();
        if (gu && (gu.rank ?? 1) > stage.rank + 1) {
          return this._flash(`Không Khiếu ${stage.shortRank} chưa chịu nổi Cổ Chuyển ${gu.rank}! Cần Thăng Chuyển thêm!`, "fail");
        }
        const slot = btn.dataset.assignSlot;
        const targetUid = this.selectedGuUid;
        if (p.vitalUid === targetUid) p.vitalUid = null;
        if (p.passiveUid === targetUid) p.passiveUid = null;
        p.activeUids = p.activeUids.map((u) => (u === targetUid ? null : u));

        if (slot === "vital") p.vitalUid = targetUid;
        else if (slot === "passive") p.passiveUid = targetUid;
        else if (slot.startsWith("slot_")) p.activeUids[Number(slot.replace("slot_", ""))] = targetUid;

        p.recalculateStats(false);
        this.sfx?.play("pickup");
        this.onStateChanged?.();
        const overRank = gu && (gu.rank ?? 1) > stage.rank;
        this._flash(overRank ? "Đã lắp Cổ Trùng vượt Chuyển (tốn +50% Chân Nguyên khi kích hoạt)!" : "Đã lắp Cổ Trùng vào Không Khiếu!");
      });
    });

    this.root.querySelectorAll("[data-unequip-slot]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const slot = btn.dataset.unequipSlot;
        const p = this.player;
        if (slot === "vital") p.vitalUid = null;
        else if (slot === "passive") p.passiveUid = null;
        else if (slot.startsWith("slot_")) p.activeUids[Number(slot.replace("slot_", ""))] = null;
        p.recalculateStats(false);
        this.sfx?.play("pickup");
        this.onStateChanged?.();
        this._flash("Đã tháo Cổ Trùng về Cổ Nang!");
      });
    });

    this.root.querySelectorAll("[data-pick-km]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.dataset.pickKm;
        const prev0 = this.player.killerMoveIds[0];
        const prev1 = this.player.killerMoveIds[1];
        const nextE = prev0 !== id ? prev0 : prev1 !== id ? prev1 : KILLER_MOVES.find((k) => k.id !== id)?.id || id;
        this.player.killerMoveIds = [id, nextE];
        this.onStateChanged?.();
        this._flash("Đã đổi Sát Chiêu phím Q!");
      });
    });

    this.root.querySelector("#chk-autofeed")?.addEventListener("change", (e) => {
      this.player.autoFeed = Boolean(e.target.checked);
      this.onStateChanged?.();
    });

    this.root.querySelectorAll("[data-feed-gu]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const g = this.player.getGu(btn.dataset.feedGu);
        if (!g?.foodItemId || !this.player.consumeItem(g.foodItemId, 1)) {
          this._flash("Không đủ thức ăn cho loài Cổ này!", "fail");
          return;
        }
        g.hunger = 100;
        this.sfx?.play("pickup");
        this.onStateChanged?.();
        this._flash(`${g.name} đã ăn no 100%!`);
      });
    });

    this.root.querySelectorAll("[data-compound]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const r = COMPOUND_RECIPES.find((x) => x.id === btn.dataset.compound);
        if (!r) return;
        const baseIdx = this.player.guBag.findIndex((g) => g.id === r.baseId);
        if (baseIdx < 0 || this.player.nguyenThach < r.stones || !this.player.consumeItem(r.subMatId, r.subMatCount)) {
          this._flash("Chưa đủ nguyên liệu hợp luyện!", "fail");
          return;
        }
        this.player.nguyenThach -= r.stones;
        const oldGu = this.player.guBag[baseIdx];
        if (Math.random() <= r.rate) {
          const newGu = createGuWorm(r.resultId, { uid: oldGu.uid });
          this.player.guBag[baseIdx] = newGu;
          this.player.recalculateStats(false);
          this.world?._advanceQuest("compound_gu", { recipeId: r.id });
          this.sfx?.play("fusionSuccess");
          this._flash(`Hợp luyện ĐẠI THÀNH: ${newGu.name}!`);
        } else {
          this.sfx?.play("fusionFail");
          this._flash("Hợp luyện thất bại, hao tổn phụ liệu!", "fail");
        }
        this.onStateChanged?.();
      });
    });

    this.root.querySelectorAll("[data-choose-path]").forEach((btn) => {
      btn.addEventListener("click", () => {
        this.player.chosenPath = btn.dataset.choosePath;
        this.onStateChanged?.();
        this._flash(`Đã chọn Lưu Phái: ${CULTIVATION_PATHS[this.player.chosenPath]?.name}!`);
      });
    });

    this.root.querySelectorAll("[data-use-bag-item]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.dataset.useBagItem;
        const it = ITEMS_CATALOG[id];
        if (!it) return;
        if (it.category === "relic_gu") {
          const res = this.player.useRelicGu(it);
          if (!res.ok) return this._flash(res.reason, "fail");
          this.sfx?.play("fusionSuccess");
          this.world?.addFloatingText(this.player.x, this.player.y - 34, `Xá Lợi Cổ → ${res.stageTitle}!`, it.color);
          this.onStateChanged?.();
          this._flash(`Luyện hóa ${it.name} thành công! Thăng lên ${res.stageTitle}!`);
          return;
        }
        if (!this.player.consumeItem(id, 1)) return;
        if (it.healHp) this.player.heal(it.healHp);
        if (it.healMp) this.player.mp = Math.min(this.player.maxMp, this.player.mp + it.healMp);
        this.sfx?.play("pickup");
        this.onStateChanged?.();
        this._flash(`Đã dùng 1 ${it.name}!`);
      });
    });

    this.root.querySelectorAll("[data-bind-qi]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const [idxStr, itemId] = btn.dataset.bindQi.split(":");
        this.player.quickItemIds[Number(idxStr)] = itemId;
        this.onStateChanged?.();
        this._flash(`Đã gán ${ITEMS_CATALOG[itemId]?.name} vào phím ${idxStr === "0" ? "Z" : "G"}!`);
      });
    });

    this.root.querySelectorAll("[data-cut-stone]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const stoneId = btn.dataset.cutStone;
        if (!this.player.consumeItem(stoneId, 1)) return;
        const tier = ITEMS_CATALOG[stoneId]?.tier ?? 1;
        const pool = Object.values(GU_CATALOG).filter((g) => g.rank <= tier + 1);
        const roll = Math.random();
        const maxCap = this.player.getMaxGuCapacity();
        if (roll < 0.52) {
          const picked = pool[Math.floor(Math.random() * pool.length)];
          if (this.player.guBag.length >= maxCap) {
            const comp = tier * 65;
            this.player.nguyenThach += comp;
            this.player.addItem("ngoc_vun", tier * 2);
            this.sfx?.play("pickup");
            this._flash(`Cổ Nang đầy (${maxCap})! Đổi [${picked.name}] thành +${comp} Nguyên Thạch & +${tier * 2} Ngọc Vụn!`);
          } else {
            const worm = createGuWorm(picked.id);
            this.player.guBag.push(worm);
            this.sfx?.play("fusionSuccess");
            this._flash(`ÁNH SÁNG ĐỎ ĐỔ THẠCH! Mở được [${worm.name}] (Chuyển ${worm.rank})!`);
          }
        } else {
          const bonus = tier * 35;
          this.player.nguyenThach += bonus;
          this.player.addItem("ngoc_vun", tier);
          if (Math.random() < 0.35) this.player.addItem(tier >= 2 ? "hat_tram_nam" : "hat_linh_thao", 1);
          this.sfx?.play("pickup");
          this._flash(`Mở ra +${bonus} Nguyên Thạch & +${tier} Ngọc Vụn!`);
        }
        this.world?._advanceQuest("gamble_stone", { tier });
        this.onStateChanged?.();
      });
    });

    this.root.querySelectorAll("[data-buy-item]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const it = ITEMS_CATALOG[btn.dataset.buyItem];
        if (!it || this.player.nguyenThach < it.buyPrice) {
          this._flash("Nguyên Thạch không đủ!", "fail");
          return;
        }
        this.player.nguyenThach -= it.buyPrice;
        this.player.addItem(it.id, 1);
        this.sfx?.play("pickup");
        this.onStateChanged?.();
        this._flash(`Đã mua 1 ${it.name}!`);
      });
    });

    this.root.querySelectorAll("[data-teleport]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const mapId = btn.dataset.teleport;
        this.close();
        this.world.loadMap(mapId);
      });
    });

    this.root.querySelectorAll("[data-enter-dungeon]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const d = DUNGEONS_LIST.find((x) => x.id === btn.dataset.enterDungeon);
        if (!d) return;
        this.close();
        this.world.startDungeon(d);
      });
    });

    this.root.querySelector("#btn-claim-daily")?.addEventListener("click", () => {
      if (this.player.dailyClaimed) return;
      this.player.dailyClaimed = true;
      this.player.nguyenThach += 120;
      this.player.insightCount += 2;
      this.player.addItem("mao_thach_so", 2);
      this.sfx?.play("fusionSuccess");
      this.onStateChanged?.();
      this._flash("Đã nhận Quà Hôm Nay (+120 Thạch, +2 Cảm ngộ, +2 Mao thạch)!");
    });

    this.root.querySelector("#btn-claim-mail")?.addEventListener("click", () => {
      if (this.player.mailClaimed) {
        this._flash("Đạo hữu đã nhận Quà Tân Thủ của nhân vật này rồi!", "fail");
        return;
      }
      this.player.mailClaimed = true;
      this.player.nguyenThach += 100;
      this.player.addItem("thao_duoc", 3);
      this.player.addItem("hat_linh_thao", 2);
      this.player.addItem("moi_cau_thuong", 2);
      this.player.addItem("mao_thach_so", 1);
      this.sfx?.play("pickup");
      this.onStateChanged?.();
      this._flash("Đã nhận quà hỗ trợ (+100 Thạch, +2 Hạt Giống Âm Thảo) vào Túi!");
    });

    this.root.querySelector("#btn-toggle-sfx")?.addEventListener("click", () => {
      this.sfx?.setMuted(!this.sfx.muted);
      this.account?.setMuted?.(this.sfx.muted);
      this.render();
    });
    this.root.querySelector("#btn-cycle-uimode")?.addEventListener("click", () => {
      this.onCycleUiMode?.();
      this.render();
    });
    this.root.querySelector("#btn-open-mirror")?.addEventListener("click", () => {
      this.close();
      this.onOpenMirror?.();
    });
    this.root.querySelector("#btn-open-acc")?.addEventListener("click", () => {
      this.close();
      this.onOpenAccountModal?.();
    });
    this.root.querySelector("#btn-switch-char")?.addEventListener("click", () => {
      this.close();
      this.onSwitchCharacter?.();
    });
    this.root.querySelectorAll("[data-go-main-quest]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const q = MAIN_QUESTS.find((x) => x.id === btn.dataset.goMainQuest);
        if (!q) return;
        this.close();
        this.world?.startAutoPathToQuest(q);
      });
    });

    this.root.querySelectorAll("[data-start-arena]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const opp = (this._clanArenaChallengers ?? []).find((c) => c.id === btn.dataset.startArena);
        if (!opp) return;
        this.close();
        this.world.startShadowArena(opp);
      });
    });
  }
}
