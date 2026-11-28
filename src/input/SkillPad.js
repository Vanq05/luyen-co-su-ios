/**
 * Quản lý cụm nút kỹ năng Không Khiếu bên phải màn hình:
 * - Bắt pointerId độc lập cho từng nút (cho phép vừa kéo Joystick trái vừa kéo ngắm chiêu phải).
 * - Kéo-thả định hướng 360 độ + tỷ lệ tầm xa (cho skill AoE).
 * - Hỗ trợ Quick Tap (bấm nhả nhanh theo hướng đang chạy/hướng nhìn).
 * - Hỗ trợ kéo vào vùng "Hủy Chiêu" để hủy mà không mất hồi chiêu.
 */
export class SkillPad {
  constructor({ slots = {}, cancelZoneEl, getDefaultAngle, canCast = null, externalCooldowns = false, onCast, onCancel }) {
    this.slots = slots;
    this.cancelZoneEl = cancelZoneEl;
    this.getDefaultAngle = getDefaultAngle;
    this.canCast = canCast;
    this.externalCooldowns = externalCooldowns;
    this.onCast = onCast;
    this.onCancel = onCancel;

    this.buttons = new Map();
    this.cooldowns = new Map();
    this.maxCooldowns = new Map();

    this.dragRadius = 46;
    this.tapThreshold = 12;

    this.activeAim = {
      active: false,
      slotId: null,
      pointerId: null,
      startX: 0,
      startY: 0,
      angle: 0,
      distanceRatio: 0.7,
      isDragging: false,
      isCanceling: false,
    };

    for (const [id, def] of Object.entries(slots)) {
      if (id === "passive") continue;
      this.cooldowns.set(id, 0);
      this.maxCooldowns.set(id, def.cooldown ?? 2);
    }
  }

  registerButton(slotId, buttonEl, knobEl = null, cooldownEl = null, timerTextEl = null) {
    if (!buttonEl) return;
    this.buttons.set(slotId, { buttonEl, knobEl, cooldownEl, timerTextEl });

    buttonEl.addEventListener("pointerdown", (e) => {
      if (document.body.classList.contains("is-editing-hud")) return;
      e.preventDefault();
      if (this.activeAim.active) return;

      const blocked = this.externalCooldowns
        ? Boolean(this.canCast && !this.canCast(slotId))
        : (this.cooldowns.get(slotId) ?? 0) > 0;
      if (blocked) {
        buttonEl.classList.remove("is-denied");
        void buttonEl.offsetWidth;
        buttonEl.classList.add("is-denied");
        return;
      }

      try {
        buttonEl.setPointerCapture(e.pointerId);
      } catch {
        // Bỏ qua nếu không hỗ trợ pointer capture
      }

      const rect = buttonEl.getBoundingClientRect();
      const centerX = rect.left + rect.width * 0.5;
      const centerY = rect.top + rect.height * 0.5;

      this.activeAim = {
        active: true,
        slotId,
        pointerId: e.pointerId,
        startX: centerX,
        startY: centerY,
        angle: this.getDefaultAngle(),
        distanceRatio: 0.7,
        isDragging: false,
        isCanceling: false,
      };

      buttonEl.classList.add("is-aiming");
      this.cancelZoneEl?.classList.add("is-visible");
      this._updateDrag(e.clientX, e.clientY);
    });

    buttonEl.addEventListener("pointermove", (e) => {
      if (!this.activeAim.active || e.pointerId !== this.activeAim.pointerId) return;
      e.preventDefault();
      this._updateDrag(e.clientX, e.clientY);
    });

    const release = (e, forceCancel = false) => {
      if (!this.activeAim.active || e.pointerId !== this.activeAim.pointerId) return;
      e.preventDefault();
      this._finishAim(forceCancel);
    };

    buttonEl.addEventListener("pointerup", (e) => release(e, false));
    buttonEl.addEventListener("pointercancel", (e) => release(e, true));
  }

  _updateDrag(clientX, clientY) {
    const aim = this.activeAim;
    const dx = clientX - aim.startX;
    const dy = clientY - aim.startY;
    const dist = Math.hypot(dx, dy);

    if (dist >= this.tapThreshold) {
      aim.isDragging = true;
      aim.angle = Math.atan2(dy, dx);
      aim.distanceRatio = Math.min(1, dist / this.dragRadius);
    } else if (!aim.isDragging) {
      aim.angle = this.getDefaultAngle();
      aim.distanceRatio = 0.7;
    }

    let overCancel = false;
    if (this.cancelZoneEl) {
      const cancelRect = this.cancelZoneEl.getBoundingClientRect();
      const pad = 8;
      overCancel =
        cancelRect.width > 0 &&
        clientX >= cancelRect.left - pad &&
        clientX <= cancelRect.right + pad &&
        clientY >= cancelRect.top - pad &&
        clientY <= cancelRect.bottom + pad;
      this.cancelZoneEl.classList.toggle("is-hover", overCancel);
    }

    aim.isCanceling = overCancel;

    const ui = this.buttons.get(aim.slotId);
    if (ui) {
      ui.buttonEl.classList.toggle("is-canceling", overCancel);
      if (ui.knobEl) {
        const clamped = Math.min(20, dist);
        const kx = dist > 0 ? Math.cos(Math.atan2(dy, dx)) * clamped : 0;
        const ky = dist > 0 ? Math.sin(Math.atan2(dy, dx)) * clamped : 0;
        ui.knobEl.style.transform = `translate3d(${kx}px, ${ky}px, 0)`;
      }
    }
  }

  _finishAim(forceCancel) {
    const aim = this.activeAim;
    const slotId = aim.slotId;
    const ui = this.buttons.get(slotId);

    if (ui) {
      ui.buttonEl.classList.remove("is-aiming", "is-canceling");
      if (ui.knobEl) {
        ui.knobEl.style.transform = "translate3d(0px, 0px, 0)";
      }
    }
    this.cancelZoneEl?.classList.remove("is-visible", "is-hover");

    const canceled = forceCancel || aim.isCanceling;
    const payload = {
      slotId,
      angle: aim.angle,
      distanceRatio: aim.distanceRatio,
      quickTap: !aim.isDragging,
    };

    this.activeAim = {
      active: false,
      slotId: null,
      pointerId: null,
      startX: 0,
      startY: 0,
      angle: 0,
      distanceRatio: 0.7,
      isDragging: false,
      isCanceling: false,
    };

    if (canceled) {
      this.onCancel?.(slotId);
      return;
    }

    this.triggerCast(payload);
  }

  triggerCast({ slotId, angle, distanceRatio = 0.7, quickTap = true }) {
    if (!this.externalCooldowns) {
      if ((this.cooldowns.get(slotId) ?? 0) > 0) return false;
      const maxCd = this.maxCooldowns.get(slotId) ?? 2;
      this.cooldowns.set(slotId, maxCd);
    }
    this.onCast?.({ slotId, angle, distanceRatio, quickTap });
    return true;
  }

  updateSlotDefinitions(newSlots) {
    this.slots = newSlots;
    for (const [slotId, def] of Object.entries(newSlots)) {
      if (slotId === "passive") continue;
      this.maxCooldowns.set(slotId, def?.cooldown ?? 2);
      const curCd = this.cooldowns.get(slotId) ?? 0;
      if (curCd > (def?.cooldown ?? 2)) {
        this.cooldowns.set(slotId, def.cooldown);
      }
      const ui = this.buttons.get(slotId);
      if (ui && def) {
        ui.buttonEl.style.setProperty("--btn-color", def.color ?? "#5ef2d6");
        const labelEl = ui.buttonEl.querySelector(".skill-label");
        if (labelEl) labelEl.textContent = def.shortLabel ?? def.name;
      }
    }
  }

  update(dt) {
    for (const [slotId, cd] of this.cooldowns.entries()) {
      const next = Math.max(0, cd - dt);
      this.cooldowns.set(slotId, next);

      const ui = this.buttons.get(slotId);
      if (!ui) continue;

      const maxCd = this.maxCooldowns.get(slotId) || 1;
      const ratio = next / maxCd;
      ui.buttonEl.classList.toggle("is-cooldown", next > 0);
      if (ui.cooldownEl) {
        ui.cooldownEl.style.transform = `scaleY(${ratio.toFixed(3)})`;
      }
      if (ui.timerTextEl) {
        ui.timerTextEl.textContent = next > 0 ? next.toFixed(1) : "";
      }
    }
  }
}
