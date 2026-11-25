/**
 * Hợp nhất đầu vào cảm ứng (VirtualJoystick + SkillPad) với bàn phím/chuột PC
 * để thử nghiệm mượt mà trên cả iPhone/iPad và trình duyệt máy tính.
 */
export class InputManager {
  constructor({ joystick, skillPad, renderer, getOriginGamePos }) {
    this.joystick = joystick;
    this.skillPad = skillPad;
    this.renderer = renderer;
    this.getOriginGamePos = getOriginGamePos;

    this.keys = new Set();
    this.pointerAim = { x: renderer.width * 0.5, y: renderer.height * 0.5, hasMoved: false };
    this.lastMoveAngle = 0;

    this._bindKeyboardAndMouse();
  }

  _bindKeyboardAndMouse() {
    const keyMap = {
      Space: "move",
      KeyJ: "skill1",
      Digit1: "skill1",
      KeyK: "skill2",
      Digit2: "skill2",
      KeyL: "ult",
      KeyR: "ult",
    };

    window.addEventListener("keydown", (e) => {
      if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) {
        e.preventDefault();
      }
      this.keys.add(e.code);

      const slotId = keyMap[e.code];
      if (slotId && !e.repeat) {
        this.skillPad.triggerCast({
          slotId,
          angle: this.getAimAngle(),
          distanceRatio: 0.75,
          quickTap: true,
        });
      }
    });

    window.addEventListener("keyup", (e) => {
      this.keys.delete(e.code);
    });

    window.addEventListener("blur", () => {
      this.keys.clear();
      this.joystick.reset();
    });

    this.renderer.canvas.addEventListener("pointermove", (e) => {
      if (e.pointerType === "mouse") {
        const pos = this.renderer.clientToGame(e.clientX, e.clientY);
        this.pointerAim = { x: pos.x, y: pos.y, hasMoved: true };
      }
    });
  }

  getMoveVector() {
    if (this.joystick.state.active && this.joystick.state.magnitude > 0) {
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
    if (this.skillPad.activeAim.active) {
      return this.skillPad.activeAim.angle;
    }
    if (this.joystick.state.active && this.joystick.state.magnitude > 0.15) {
      return this.joystick.state.angle;
    }
    if (this.pointerAim.hasMoved) {
      const origin = this.getOriginGamePos();
      return Math.atan2(this.pointerAim.y - origin.y, this.pointerAim.x - origin.x);
    }
    return this.lastMoveAngle;
  }

  update(dt) {
    this.skillPad.update(dt);
  }
}
