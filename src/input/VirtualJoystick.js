/**
 * Virtual Joystick 360 độ cảm ứng đa điểm (gắn pointerId riêng biệt ở nửa trái màn hình).
 * Hỗ trợ điểm chạm nổi (floating origin) trong vùng joystick và tự căn tâm khi nhả tay.
 */
export class VirtualJoystick {
  constructor(zoneEl, baseEl, knobEl, options = {}) {
    this.zoneEl = zoneEl;
    this.baseEl = baseEl;
    this.knobEl = knobEl;
    this.maxRadius = options.maxRadius ?? 42;
    this.deadzone = options.deadzone ?? 0.12;

    this.pointerId = null;
    this.originX = 0;
    this.originY = 0;

    this.state = {
      active: false,
      x: 0,
      y: 0,
      angle: 0,
      magnitude: 0,
    };

    this._bindEvents();
  }

  _bindEvents() {
    this.zoneEl.addEventListener("pointerdown", (e) => {
      if (this.pointerId !== null) return;
      e.preventDefault();
      this.pointerId = e.pointerId;
      try {
        this.zoneEl.setPointerCapture(e.pointerId);
      } catch {
        // Bỏ qua nếu môi trường giả lập không hỗ trợ pointer capture
      }

      const zoneRect = this.zoneEl.getBoundingClientRect();
      const pad = this.maxRadius + 10;
      const localX = Math.max(pad, Math.min(zoneRect.width - pad, e.clientX - zoneRect.left));
      const localY = Math.max(pad, Math.min(zoneRect.height - pad, e.clientY - zoneRect.top));

      this.originX = zoneRect.left + localX;
      this.originY = zoneRect.top + localY;

      this.baseEl.classList.add("is-active");
      this.baseEl.style.left = `${localX}px`;
      this.baseEl.style.top = `${localY}px`;
      this.baseEl.style.bottom = "auto";

      this._updateStick(e.clientX, e.clientY);
    });

    const handleMove = (e) => {
      if (e.pointerId !== this.pointerId) return;
      e.preventDefault();
      this._updateStick(e.clientX, e.clientY);
    };

    const handleRelease = (e) => {
      if (e.pointerId !== this.pointerId) return;
      e.preventDefault();
      this.reset();
    };

    this.zoneEl.addEventListener("pointermove", handleMove);
    this.zoneEl.addEventListener("pointerup", handleRelease);
    this.zoneEl.addEventListener("pointercancel", handleRelease);
  }

  _updateStick(clientX, clientY) {
    const dx = clientX - this.originX;
    const dy = clientY - this.originY;
    const rawDist = Math.hypot(dx, dy);
    const clampedDist = Math.min(this.maxRadius, rawDist);
    const angle = Math.atan2(dy, dx);
    const rawNorm = rawDist > 0 ? clampedDist / this.maxRadius : 0;

    const knobOffsetX = rawDist > 0 ? Math.cos(angle) * clampedDist : 0;
    const knobOffsetY = rawDist > 0 ? Math.sin(angle) * clampedDist : 0;
    this.knobEl.style.transform = `translate3d(${knobOffsetX}px, ${knobOffsetY}px, 0)`;

    if (rawNorm < this.deadzone) {
      this.state.active = true;
      this.state.x = 0;
      this.state.y = 0;
      this.state.magnitude = 0;
      return;
    }

    const mag = (rawNorm - this.deadzone) / (1 - this.deadzone);
    this.state.active = true;
    this.state.angle = angle;
    this.state.magnitude = Math.min(1, mag);
    this.state.x = Math.cos(angle) * this.state.magnitude;
    this.state.y = Math.sin(angle) * this.state.magnitude;
  }

  reset() {
    this.pointerId = null;
    this.state.active = false;
    this.state.x = 0;
    this.state.y = 0;
    this.state.magnitude = 0;
    this.baseEl.classList.remove("is-active");
    this.baseEl.style.left = "";
    this.baseEl.style.top = "";
    this.baseEl.style.bottom = "";
    this.knobEl.style.transform = "translate3d(0px, 0px, 0)";
  }
}
