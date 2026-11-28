/**
 * Điều khiển chuẩn Cổ Tiên Lộ (cotienlo.com):
 * - WASD / Mũi tên: Di chuyển
 * - Chuột Trái: Chọn mục tiêu / Đánh thường
 * - Chuột Phải: Tung Cổ Bản Mệnh (chặn menu ngữ cảnh)
 * - 1-7: 7 Ô Cổ Chủ Động · Q/E: Sát Chiêu · Z/G: Đan Dược · Space: Lướt
 * - Giữ R: Hấp thu Nguyên Thạch · F: Tương tác · X: Bế Quan · Tab: Đổi mục tiêu
 * - B/V/C/M/H/Enter/+/-/Escape: Mở các bảng & Chat & Zoom
 */
export class InputManager {
  constructor({ joystick, skillPad, renderer, getOriginGamePos, getCamera, callbacks }) {
    this.joystick = joystick;
    this.skillPad = skillPad;
    this.renderer = renderer;
    this.getOriginGamePos = getOriginGamePos;
    this.getCamera = getCamera;
    this.cb = callbacks ?? {};

    this.keys = new Set();
    this.pointerAim = { x: renderer.width * 0.5, y: renderer.height * 0.5, hasMoved: false };
    this.lastMoveAngle = 0;

    this._bindEvents();
  }

  _bindEvents() {
    window.addEventListener("keydown", (e) => {
      const activeTag = document.activeElement?.tagName;
      if (activeTag === "INPUT" || activeTag === "TEXTAREA") {
        if (e.code === "Escape") document.activeElement.blur();
        return;
      }

      if (["Space", "Tab", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) {
        e.preventDefault();
      }
      this.keys.add(e.code);

      if (e.repeat) return;

      const ang = this.getAimAngle();
      if (e.code === "Space") this.cb.onCast?.({ slotId: "dash", angle: ang });
      else if (e.code === "Digit1") this.cb.onCast?.({ slotId: "slot_0", angle: ang });
      else if (e.code === "Digit2") this.cb.onCast?.({ slotId: "slot_1", angle: ang });
      else if (e.code === "Digit3") this.cb.onCast?.({ slotId: "slot_2", angle: ang });
      else if (e.code === "Digit4") this.cb.onCast?.({ slotId: "slot_3", angle: ang });
      else if (e.code === "Digit5") this.cb.onCast?.({ slotId: "slot_4", angle: ang });
      else if (e.code === "Digit6") this.cb.onCast?.({ slotId: "slot_5", angle: ang });
      else if (e.code === "Digit7") this.cb.onCast?.({ slotId: "slot_6", angle: ang });
      else if (e.code === "KeyQ") this.cb.onCast?.({ slotId: "km1", angle: ang });
      else if (e.code === "KeyE") this.cb.onCast?.({ slotId: "km2", angle: ang });
      else if (e.code === "KeyZ") this.cb.onQuickItem?.(0);
      else if (e.code === "KeyG") this.cb.onQuickItem?.(1);
      else if (e.code === "KeyR") this.cb.onAbsorbStart?.();
      else if (e.code === "KeyF") this.cb.onInteract?.();
      else if (e.code === "KeyX") this.cb.onToggleMeditate?.();
      else if (e.code === "KeyT") this.cb.onToggleAutoCombat?.();
      else if (e.code === "Tab") this.cb.onCycleTarget?.();
      else if (e.code === "KeyB") this.cb.onOpenPanel?.("bag");
      else if (e.code === "KeyV") this.cb.onOpenPanel?.("gu");
      else if (e.code === "KeyC") this.cb.onOpenPanel?.("char");
      else if (e.code === "KeyK") this.cb.onOpenPanel?.("cultivate");
      else if (e.code === "KeyJ") this.cb.onOpenPanel?.("quests");
      else if (e.code === "KeyM") this.cb.onOpenPanel?.("world");
      else if (e.code === "KeyH") this.cb.onSwitchAperture?.();
      else if (e.code === "Enter") this.cb.onFocusChat?.();
      else if (e.code === "Equal" || e.code === "NumpadAdd") this.cb.onZoom?.(0.1);
      else if (e.code === "Minus" || e.code === "NumpadSubtract") this.cb.onZoom?.(-0.1);
      else if (e.code === "Escape") this.cb.onEscape?.();
    });

    window.addEventListener("keyup", (e) => {
      this.keys.delete(e.code);
      if (e.code === "KeyR") this.cb.onAbsorbEnd?.();
    });

    window.addEventListener("blur", () => {
      this.keys.clear();
      this.joystick?.reset();
      this.cb.onAbsorbEnd?.();
    });

    const canvas = this.renderer.canvas;
    canvas.addEventListener("pointermove", (e) => {
      if (e.pointerType === "mouse") {
        const pos = this.renderer.clientToGame(e.clientX, e.clientY);
        this.pointerAim = { x: pos.x, y: pos.y, hasMoved: true };
      }
    });

    canvas.addEventListener("contextmenu", (e) => e.preventDefault());
    canvas.addEventListener("pointerdown", (e) => {
      if (e.pointerType === "mouse" || e.pointerType === "touch" || e.pointerType === "pen") {
        const wp = this.renderer.clientToWorld(e.clientX, e.clientY, this.getCamera?.());
        this.cb.onCanvasClick?.(wp.x, wp.y, e.pointerType === "mouse" && e.button === 2);
      }
    });
  }

  getMoveVector() {
    if (this.joystick?.state.active && this.joystick.state.magnitude > 0) {
      const vec = {
        x: this.joystick.state.x,
        y: this.joystick.state.y,
        magnitude: this.joystick.state.magnitude,
        angle: this.joystick.state.angle,
      };
      this.lastMoveAngle = vec.angle;
      return vec;
    }

    let kx = 0;
    let ky = 0;
    if (this.keys.has("KeyA") || this.keys.has("ArrowLeft")) kx -= 1;
    if (this.keys.has("KeyD") || this.keys.has("ArrowRight")) kx += 1;
    if (this.keys.has("KeyW") || this.keys.has("ArrowUp")) ky -= 1;
    if (this.keys.has("KeyS") || this.keys.has("ArrowDown")) ky += 1;

    if (kx !== 0 || ky !== 0) {
      const len = Math.hypot(kx, ky);
      const angle = Math.atan2(ky, kx);
      this.lastMoveAngle = angle;
      return { x: kx / len, y: ky / len, magnitude: 1, angle };
    }

    return { x: 0, y: 0, magnitude: 0, angle: this.lastMoveAngle };
  }

  getAimAngle() {
    if (this.skillPad?.activeAim.active) return this.skillPad.activeAim.angle;
    if (this.joystick?.state.active && this.joystick.state.magnitude > 0.15) return this.joystick.state.angle;
    if (this.pointerAim.hasMoved) {
      const origin = this.getOriginGamePos();
      return Math.atan2(this.pointerAim.y - origin.y, this.pointerAim.x - origin.x);
    }
    return this.lastMoveAngle;
  }

  update(dt) {
    this.skillPad?.update(dt);
  }
}
