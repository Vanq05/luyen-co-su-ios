import { FIXED_DT } from "../config/constants.js";

/**
 * Vòng lặp thời gian cố định 60Hz (chống nhảy frame khi tab nền hoặc giật lag).
 */
export class GameLoop {
  constructor({ onUpdate, onRender }) {
    this.onUpdate = onUpdate;
    this.onRender = onRender;
    this._running = false;
    this._rafId = 0;
    this._lastTime = 0;
    this._accumulator = 0;
    this._fpsTimer = 0;
    this._fpsFrames = 0;
    this.fps = 60;
  }

  start() {
    if (this._running) return;
    this._running = true;
    this._lastTime = performance.now();
    const tick = (now) => {
      if (!this._running) return;
      const rawDt = Math.min(0.1, Math.max(0, (now - this._lastTime) / 1000));
      this._lastTime = now;
      this._accumulator += rawDt;

      while (this._accumulator >= FIXED_DT) {
        this.onUpdate(FIXED_DT);
        this._accumulator -= FIXED_DT;
      }

      this.onRender(this._accumulator / FIXED_DT);

      this._fpsFrames += 1;
      this._fpsTimer += rawDt;
      if (this._fpsTimer >= 0.5) {
        this.fps = Math.round(this._fpsFrames / this._fpsTimer);
        this._fpsFrames = 0;
        this._fpsTimer = 0;
      }

      this._rafId = requestAnimationFrame(tick);
    };
    this._rafId = requestAnimationFrame(tick);
  }

  stop() {
    this._running = false;
    if (this._rafId) {
      cancelAnimationFrame(this._rafId);
      this._rafId = 0;
    }
  }
}
