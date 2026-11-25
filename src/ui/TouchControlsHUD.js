import { VirtualJoystick } from "../input/VirtualJoystick.js";
import { SkillPad } from "../input/SkillPad.js";

/**
 * HUD chiến đấu & tương tác Online cho "Luyện Cổ Sư":
 * - Góc trên-trái: HP, MP, Độ Phản Phệ, Đạo Lộ hiện tại + nút Không Khiếu.
 * - Giữa-trên: Tên Tầng / Vạn Cổ Thành (kèm số người Online) hoặc Thanh Máu Boss.
 * - Góc trên-phải: Nút 💬 Truyền Âm Online, 🏯 Về Thành (hoặc 🔄 Đổi NV khi ở Thành), 🔊 Âm thanh.
 * - Ngữ cảnh thông minh tại Vạn Cổ Thành: Mở Lò Hợp Cổ, Cổng Bí Cảnh, Gương Hóa Hình, Bia Thiên Kiêu.
 */
export class TouchControlsHUD {
  constructor({
    hudRoot,
    slots,
    getDefaultAngle,
    onCast,
    onCancel,
    onOpenBag,
    onContextAction,
    onSecondaryAction,
    onToggleMute,
    onOpenAccount,
    onSendChat,
  }) {
    this.hudRoot = hudRoot;
    this.slots = slots;
    this.chatOpen = false;

    this.hudRoot.innerHTML = this._buildMarkup(slots);

    const joystickZone = this.hudRoot.querySelector("#joystick-zone");
    const joystickBase = this.hudRoot.querySelector("#joystick-base");
    const joystickKnob = this.hudRoot.querySelector("#joystick-knob");
    const cancelZone = this.hudRoot.querySelector("#skill-cancel-zone");

    this.hpFill = this.hudRoot.querySelector("#bar-hp-fill");
    this.hpText = this.hudRoot.querySelector("#bar-hp-text");
    this.mpFill = this.hudRoot.querySelector("#bar-mp-fill");
    this.mpText = this.hudRoot.querySelector("#bar-mp-text");
    this.corFill = this.hudRoot.querySelector("#bar-cor-fill");
    this.corText = this.hudRoot.querySelector("#bar-cor-text");
    this.passiveTitle = this.hudRoot.querySelector("#passive-title");
    this.passiveSub = this.hudRoot.querySelector("#passive-sub");

    this.floorBadge = this.hudRoot.querySelector("#floor-badge");
    this.bossBarBox = this.hudRoot.querySelector("#boss-bar-box");
    this.bossNameEl = this.hudRoot.querySelector("#boss-name");
    this.bossFillEl = this.hudRoot.querySelector("#boss-hp-fill");
    this.bossMechEl = this.hudRoot.querySelector("#boss-mechanic");

    this.ctxBtn = this.hudRoot.querySelector("#ctx-action-btn");
    this.secBtn = this.hudRoot.querySelector("#sec-action-btn");
    this.muteBtn = this.hudRoot.querySelector("#btn-mute-sfx");
    this.accountBtn = this.hudRoot.querySelector("#btn-open-account");
    this.chatToggleBtn = this.hudRoot.querySelector("#btn-toggle-chat");
    this.chatDrawer = this.hudRoot.querySelector("#online-chat-drawer");
    this.chatListEl = this.hudRoot.querySelector("#online-chat-list");
    this.chatForm = this.hudRoot.querySelector("#online-chat-form");
    this.chatInput = this.hudRoot.querySelector("#online-chat-input");

    this.hudRoot.querySelector("#btn-open-bag")?.addEventListener("click", () => onOpenBag?.());
    this.ctxBtn?.addEventListener("click", () => onContextAction?.());
    this.secBtn?.addEventListener("click", () => onSecondaryAction?.());
    this.muteBtn?.addEventListener("click", () => onToggleMute?.(this.muteBtn));
    this.accountBtn?.addEventListener("click", () => onOpenAccount?.());

    this.chatToggleBtn?.addEventListener("click", () => {
      this.chatOpen = !this.chatOpen;
      this.chatDrawer?.classList.toggle("is-open", this.chatOpen);
    });

    this.chatForm?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const val = (this.chatInput?.value ?? "").trim();
      if (!val) return;
      this.chatInput.value = "";
      try {
        await onSendChat?.(val);
      } catch (err) {
        if (this.chatListEl) {
          const warn = document.createElement("div");
          warn.className = "chat-line is-sys";
          warn.textContent = `⚠️ ${err.message}`;
          this.chatListEl.appendChild(warn);
          this.chatListEl.scrollTop = this.chatListEl.scrollHeight;
        }
      }
    });

    this.joystick = new VirtualJoystick(joystickZone, joystickBase, joystickKnob, {
      maxRadius: 42,
      deadzone: 0.12,
    });

    this.skillPad = new SkillPad({
      slots,
      cancelZoneEl: cancelZone,
      getDefaultAngle,
      onCast,
      onCancel,
    });

    for (const slotId of ["move", "skill1", "skill2", "ult"]) {
      const btn = this.hudRoot.querySelector(`[data-slot="${slotId}"]`);
      const knob = btn.querySelector(".skill-btn-knob");
      const mask = btn.querySelector(".skill-cooldown-mask");
      const timer = btn.querySelector(".skill-cooldown-text");
      this.skillPad.registerButton(slotId, btn, knob, mask, timer);
    }
  }

  _buildMarkup(slots) {
    const p = slots.passive;
    const buttons = ["move", "skill1", "skill2", "ult"]
      .map((id) => {
        const s = slots[id] ?? { shortLabel: "Trống", slotType: id, color: "#5ef2d6" };
        return `
          <div class="skill-btn skill-btn--${id}" data-slot="${id}" style="--btn-color: ${s.color};">
            <div class="skill-btn-knob">
              <span class="skill-label">${s.shortLabel ?? s.name}</span>
              <span class="skill-tag">${s.slotType ?? id}</span>
            </div>
            <div class="skill-cooldown-mask"></div>
            <div class="skill-cooldown-text"></div>
          </div>
        `;
      })
      .join("");

    return `
      <div class="top-hud">
        <div class="vitals-panel">
          <div class="vital-row">
            <span class="vital-lbl">HP</span>
            <div class="vital-track"><div id="bar-hp-fill" class="vital-fill vital-fill--hp"></div></div>
            <span id="bar-hp-text" class="vital-num">180/180</span>
          </div>
          <div class="vital-row">
            <span class="vital-lbl">MP</span>
            <div class="vital-track"><div id="bar-mp-fill" class="vital-fill vital-fill--mp"></div></div>
            <span id="bar-mp-text" class="vital-num">100/100</span>
          </div>
          <div class="vital-row">
            <span class="vital-lbl">P.PHỆ</span>
            <div class="vital-track vital-track--cor">
              <div class="cor-half-mark"></div>
              <div id="bar-cor-fill" class="vital-fill vital-fill--cor"></div>
            </div>
            <span id="bar-cor-text" class="vital-num">0%</span>
          </div>
          <div class="passive-mini-row">
            <div class="passive-info-mini">
              <span id="passive-title" class="passive-title">${p?.name ?? "Khởi Nguyên Cổ Đạo"}</span>
              <span id="passive-sub" class="passive-sub">${p?.description ?? ""}</span>
            </div>
            <button id="btn-open-bag" type="button" class="mini-hud-btn">🎒 Cổ Nang</button>
          </div>
        </div>

        <div class="center-top-hud">
          <div id="floor-badge" class="floor-badge">Vạn Cổ Thành · Online</div>
          <div id="boss-bar-box" class="boss-bar-box">
            <div id="boss-name" class="boss-name">Boss</div>
            <div class="boss-track"><div id="boss-hp-fill" class="boss-hp-fill"></div></div>
            <div id="boss-mechanic" class="boss-mechanic"></div>
          </div>
        </div>

        <div class="right-top-hud">
          <button id="btn-toggle-chat" type="button" class="mini-hud-btn">💬 Truyền Âm</button>
          <button id="btn-open-account" type="button" class="mini-hud-btn">🔄 Đổi NV</button>
          <button id="btn-mute-sfx" type="button" class="mini-hud-btn">🔊 Âm</button>
        </div>
      </div>

      <div id="online-chat-drawer" class="online-chat-drawer">
        <div id="online-chat-list" class="online-chat-list">
          <div class="chat-line is-sys">🌐 Kênh Truyền Âm Vạn Cổ Thành đã kết nối!</div>
        </div>
        <form id="online-chat-form" class="online-chat-form">
          <input id="online-chat-input" type="text" maxlength="120" placeholder="Truyền âm toàn máy chủ..." />
          <button type="submit" class="mini-hud-btn">Gửi</button>
        </form>
      </div>

      <div id="joystick-zone" aria-label="Joystick di chuyển">
        <div id="joystick-base" class="joystick-base">
          <div class="joystick-ring"></div>
          <div id="joystick-knob" class="joystick-knob"></div>
        </div>
      </div>

      <div class="context-actions-wrap">
        <button id="ctx-action-btn" type="button" class="ctx-btn"></button>
        <button id="sec-action-btn" type="button" class="ctx-btn ctx-btn--sec"></button>
      </div>

      <div id="skill-pad" aria-label="Cụm kỹ năng Không Khiếu">
        <div id="skill-cancel-zone" class="skill-cancel-zone">✕ HỦY CHIÊU</div>
        ${buttons}
      </div>
    `;
  }

  refreshSlots(player) {
    const cdMult = player.cooldownMult ?? 1.0;
    const scaleSlot = (gu, slotType) => {
      if (!gu) return { shortLabel: "Trống", slotType, cooldown: 2, color: "#5ef2d6" };
      return {
        ...gu,
        slotType,
        cooldown: Number(Math.max(0.4, (gu.cooldown ?? 2) * cdMult).toFixed(2)),
      };
    };

    const newSlots = {
      passive: player.getEquippedGu("passive"),
      skill1: scaleSlot(player.getEquippedGu("skill1"), "Chủ Động 1"),
      skill2: scaleSlot(player.getEquippedGu("skill2"), "Chủ Động 2"),
      move: scaleSlot(player.getEquippedGu("move"), "Di Chuyển"),
      ult: scaleSlot(player.getEquippedGu("ult"), "Sát Chiêu"),
    };
    this.skillPad.updateSlotDefinitions(newSlots);

    if (this.passiveTitle) {
      const path = player.pathInfo;
      this.passiveTitle.style.color = path?.color ?? "#d6b16a";
      this.passiveTitle.textContent = `${path?.badge ?? "☯"} ${path?.name ?? "Tán Tu"}`;
    }
    if (this.passiveSub) {
      const pGu = newSlots.passive;
      this.passiveSub.textContent = pGu ? `Bản Mệnh: ${pGu.shortLabel} · ${player.pathInfo?.bonusDesc ?? ""}` : player.pathInfo?.bonusDesc ?? "";
    }
  }

  syncOnlineFeed(onlineHub) {
    if (!onlineHub) return;
    if (this.chatToggleBtn) {
      this.chatToggleBtn.textContent = `💬 Online (${onlineHub.onlineCount ?? 1})`;
    }
    if (!this.chatListEl) return;
    const msgs = onlineHub.messages ?? [];
    if (msgs.length === 0) return;

    this.chatListEl.innerHTML = msgs
      .slice(-18)
      .map((m) => {
        const esc = (s) =>
          String(s ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");
        if (m.kind === "fusion") {
          return `<div class="chat-line is-fusion">🔥 <b>[Thiên Cơ] ${esc(m.sender_name)}</b> ${esc(m.message)}</div>`;
        }
        return `<div class="chat-line"><b style="color:${esc(m.path_color || "#4de6b0")}">${esc(m.sender_name)}:</b> ${esc(m.message)}</div>`;
      })
      .join("");
    this.chatListEl.scrollTop = this.chatListEl.scrollHeight;
  }

  syncAccountBadge(account, world = null) {
    if (!this.accountBtn) return;
    const ch = account?.getActiveCharacter?.();
    const label = ch?.name ?? "Chọn NV";
    if (world && world.floorNumber > 0) {
      this.accountBtn.textContent = `🏯 Về Thành`;
    } else {
      this.accountBtn.textContent = `🔄 Đổi NV · ${label}`;
    }
  }

  syncState(player, world, onlineHub = null) {
    if (this.hpFill) this.hpFill.style.width = `${Math.max(0, (player.hp / player.maxHp) * 100)}%`;
    if (this.hpText) this.hpText.textContent = `${Math.ceil(player.hp)}/${player.maxHp}`;

    if (this.mpFill) this.mpFill.style.width = `${Math.max(0, (player.mp / player.maxMp) * 100)}%`;
    if (this.mpText) this.mpText.textContent = `${Math.floor(player.mp)}/${player.maxMp}`;

    const corPct = Math.round(player.corruption);
    if (this.corFill) {
      this.corFill.style.width = `${corPct}%`;
      this.corFill.classList.toggle("is-warn", corPct >= 50 && player.tauHoaTimer <= 0);
      this.corFill.classList.toggle("is-tauhoa", player.tauHoaTimer > 0);
    }
    if (this.corText) {
      this.corText.textContent =
        player.tauHoaTimer > 0
          ? `TẨU HỎA ${player.tauHoaTimer.toFixed(1)}s`
          : corPct >= 50
            ? `${corPct}% (+25% ST)`
            : `${corPct}%`;
    }

    const def = world.getFloorDef();
    if (this.floorBadge) {
      if (world.phase === "town") {
        const onlineCnt = onlineHub?.onlineCount ?? 1;
        this.floorBadge.textContent = `🏯 Vạn Cổ Thành · 🌐 ${onlineCnt} Cổ Sư Online`;
      } else if (world.phase === "waves") {
        this.floorBadge.textContent = `${def.name} · Đợt ${world.waveIndex + 1}/${def.waves.length} (Còn ${world.enemies.length})`;
      } else if (world.phase === "cauldron") {
        this.floorBadge.textContent = `${def.name} · Trạm Luyện Cổ`;
      } else if (world.phase === "boss") {
        this.floorBadge.textContent = `${def.name} · Quyết Chiến Cổ Vương`;
      } else {
        this.floorBadge.textContent = `${def.name} · Thông Quan`;
      }
    }

    if (this.bossBarBox) {
      const b = world.boss;
      this.bossBarBox.classList.toggle("is-visible", Boolean(b && b.hp > 0));
      if (b && b.hp > 0) {
        this.bossNameEl.textContent = `${b.name} (${Math.max(0, Math.ceil(b.hp))}/${b.maxHp})`;
        this.bossFillEl.style.width = `${Math.max(0, (b.hp / b.maxHp) * 100)}%`;
        if (b.id === "ngo_cong") {
          const aliveSegs = b.segments.filter((s) => s.alive).length;
          this.bossMechEl.textContent = `Đốt thân sáng: ${aliveSegs}/6 · ${def.bossSubtitle}`;
        } else if (b.id === "mac_vo_tam") {
          this.bossMechEl.textContent =
            b.state === "summoning"
              ? `⚠ ĐANG VẬN CÔNG GỌI ĐỆ (Giáp ${Math.max(0, Math.ceil(b.summonShield))}) — DỒN ST NGẮT NHỊP!`
              : b.stunTimer > 0
                ? `✦ CHOÁNG ${b.stunTimer.toFixed(1)}s (+25% ST)`
                : def.bossSubtitle;
        } else if (b.id === "van_co_ta_lo") {
          const aliveLegs = b.legs.filter((l) => l.alive).length;
          this.bossMechEl.textContent =
            b.stunTimer > 0
              ? `💥 NỔ VẠC · CHOÁNG ${b.stunTimer.toFixed(1)}s (+50% ST)`
              : b.exposedTimer > 0
                ? `✦ LỘ LÕI YẾU ${b.exposedTimer.toFixed(1)}s (+50% ST)`
                : `Chân vạc còn: ${aliveLegs}/4 · ${b.state === "closed_shell" ? "Đóng Nắp (-80% ST)" : b.state === "suction" ? "Đang Hút Dị Cổ!" : "Xoay Phun Lửa"}`;
        }
      }
    }

    const near = world.getNearbyInteractable();
    if (this.ctxBtn && this.secBtn) {
      if (world.phase === "town") {
        this.ctxBtn.classList.add("is-visible");
        this.secBtn.classList.add("is-visible");
        if (near.nearMirror) {
          this.ctxBtn.textContent = "🪞 MỞ GƯƠNG HÓA HÌNH";
          this.ctxBtn.dataset.townAct = "mirror";
        } else if (near.nearStele) {
          this.ctxBtn.textContent = "🏆 XEM BIA THIÊN KIÊU";
          this.ctxBtn.dataset.townAct = "stele";
        } else {
          this.ctxBtn.textContent = "🔥 LÒ HỢP CỔ & TỤ BẢO";
          this.ctxBtn.dataset.townAct = "fusion";
        }
        this.secBtn.textContent = near.nearPortal ? "🌀 VÀO CỔNG BÍ CẢNH" : "⚔️ CHỌN TẦNG BÍ CẢNH";
        this.secBtn.dataset.townSec = "dungeon";
      } else if (world.phase === "cauldron") {
        this.ctxBtn.classList.add("is-visible");
        this.ctxBtn.textContent = near.nearCauldron ? "🔥 MỞ VẠC LUYỆN CỔ" : "🔥 ĐẾN VẠC / LUYỆN CỔ";
        delete this.ctxBtn.dataset.townAct;
        this.secBtn.classList.add("is-visible");
        this.secBtn.textContent = "⚔️ KHIÊU CHIẾN CỔ VƯƠNG";
      } else if (world.phase === "floor_clear") {
        this.ctxBtn.classList.add("is-visible");
        this.ctxBtn.textContent = `🌀 SANG TẦNG ${world.floorNumber + 1}`;
        this.secBtn.classList.remove("is-visible");
      } else {
        this.ctxBtn.classList.remove("is-visible");
        this.secBtn.classList.remove("is-visible");
      }
    }
  }
}
