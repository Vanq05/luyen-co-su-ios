import { VirtualJoystick } from "../input/VirtualJoystick.js";
import { SkillPad } from "../input/SkillPad.js";

/**
 * HUD đầy đủ cho "Luyện Cổ Sư":
 * - Góc trên-trái: HP, MP, Độ Phản Phệ (0..100%), Bản Mệnh Cổ & nút mở Cổ Nang.
 * - Giữa-trên: Tên Tầng Bí Cảnh, tiến độ đợt quái hoặc thanh máu Boss + cơ chế khắc chế.
 * - Nửa trái: Virtual Joystick 360°.
 * - Góc phải: 4 nút kỹ năng Không Khiếu + vùng Hủy Chiêu + nút Ngữ Cảnh (Luyện Cổ / Gọi Boss / Qua Tầng).
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
  }) {
    this.hudRoot = hudRoot;
    this.slots = slots;

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

    this.hudRoot.querySelector("#btn-open-bag")?.addEventListener("click", () => onOpenBag?.());
    this.ctxBtn?.addEventListener("click", () => onContextAction?.());
    this.secBtn?.addEventListener("click", () => onSecondaryAction?.());
    this.muteBtn?.addEventListener("click", () => onToggleMute?.(this.muteBtn));
    this.accountBtn?.addEventListener("click", () => onOpenAccount?.());

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

    const portraitGuard = document.getElementById("portrait-guard");
    const dismissBtn = document.getElementById("portrait-dismiss");
    if (portraitGuard && dismissBtn) {
      dismissBtn.addEventListener("click", () => {
        portraitGuard.classList.add("is-dismissed");
      });
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
              <span id="passive-title" class="passive-title">Bản Mệnh: ${p?.name ?? "Trống"}</span>
              <span id="passive-sub" class="passive-sub">${p?.description ?? ""}</span>
            </div>
            <button id="btn-open-bag" type="button" class="mini-hud-btn">🎒 Cổ Nang</button>
          </div>
        </div>

        <div class="center-top-hud">
          <div id="floor-badge" class="floor-badge">Tầng 1 · Rừng Chướng Khí</div>
          <div id="boss-bar-box" class="boss-bar-box">
            <div id="boss-name" class="boss-name">Boss</div>
            <div class="boss-track"><div id="boss-hp-fill" class="boss-hp-fill"></div></div>
            <div id="boss-mechanic" class="boss-mechanic"></div>
          </div>
        </div>

        <div class="right-top-hud">
          <button id="btn-open-account" type="button" class="mini-hud-btn">🔄 Đổi NV</button>
          <button id="btn-mute-sfx" type="button" class="mini-hud-btn">🔊 Âm</button>
        </div>
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
    const newSlots = {
      passive: player.getEquippedGu("passive"),
      skill1: { ...(player.getEquippedGu("skill1") ?? {}), slotType: "Chủ Động 1" },
      skill2: { ...(player.getEquippedGu("skill2") ?? {}), slotType: "Chủ Động 2" },
      move: { ...(player.getEquippedGu("move") ?? {}), slotType: "Di Chuyển" },
      ult: { ...(player.getEquippedGu("ult") ?? {}), slotType: "Sát Chiêu" },
    };
    this.skillPad.updateSlotDefinitions(newSlots);
    if (this.passiveTitle) {
      this.passiveTitle.textContent = `Bản Mệnh: ${newSlots.passive ? newSlots.passive.name : "Trống"}`;
    }
    if (this.passiveSub) {
      this.passiveSub.textContent = newSlots.passive ? newSlots.passive.description : "Chưa lắp Bản Mệnh Cổ";
    }
  }

  syncAccountBadge(account) {
    if (!this.accountBtn) return;
    const ch = account?.getActiveCharacter?.();
    const label = ch?.name ?? account?.profile?.dao_hieu ?? "Chọn NV";
    this.accountBtn.textContent = `🔄 Đổi NV · ${label}`;
  }

  syncState(player, world) {
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
      if (world.phase === "waves") {
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

    // Nút ngữ cảnh khi xong đợt quái hoặc thắng tầng
    const near = world.getNearbyInteractable();
    if (this.ctxBtn && this.secBtn) {
      if (world.phase === "cauldron") {
        this.ctxBtn.classList.add("is-visible");
        this.ctxBtn.textContent = near.nearCauldron ? "🔥 MỞ VẠC LUYỆN CỔ" : "🔥 ĐẾN VẠC / LUYỆN CỔ";
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
