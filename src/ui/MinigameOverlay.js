/**
 * Lớp phủ 3 Minigame đặc sản Cổ Tiên Lộ (cotienlo.com):
 * 1. Câu Cá (Kéo cá): Thanh mặt nước + Thanh Lực Căng có vùng xanh an toàn (giữ Chuột/R cuốn dây, A/D kéo cần).
 * 2. Luyện Hóa Dã Cổ: Giữ kim Thần Thức trong vùng hào quang di chuyển.
 * 3. Xung Kích Khiếu Bích (Đột Phá Cảnh Giới): Bấm đúng nhịp sóng Chân Nguyên đập vỡ bức tường Không Khiếu.
 */
export class MinigameOverlay {
  constructor(rootEl, sfx) {
    this.root = rootEl;
    this.sfx = sfx;
    this.rafId = 0;
    this.active = false;
    this._keyDownHandler = null;
    this._keyUpHandler = null;
  }

  close() {
    this.active = false;
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.rafId = 0;
    if (this._keyDownHandler) {
      window.removeEventListener("keydown", this._keyDownHandler);
      this._keyDownHandler = null;
    }
    if (this._keyUpHandler) {
      window.removeEventListener("keyup", this._keyUpHandler);
      this._keyUpHandler = null;
    }
    this.root.classList.remove("is-open");
    this.root.innerHTML = "";
  }

  open(kind, opts = {}) {
    this.close();
    this.active = true;
    this.root.classList.add("is-open");

    if (kind === "fishing") this._runFishing(opts);
    else if (kind === "refine") this._runRefine(opts);
    else if (kind === "breakthrough") this._runBreakthrough(opts);
  }

  _runFishing({ onSuccess, onFail }) {
    const state = {
      timer: 18,
      progress: 35,
      tension: 30,
      fishPos: 55,
      fishVel: 22,
      hookPos: 50,
      reeling: false,
      dir: 0,
    };

    this.root.innerHTML = `
      <div class="ctl-mg-card ctl-mg-card--right">
        <div class="ctl-mg-head">
          <span>🎣 Kéo cá</span>
          <span id="mg-time">18s</span>
          <button type="button" id="mg-close" class="ctl-mini-circle">×</button>
        </div>
        <div class="ctl-mg-track-water">
          <div id="mg-fish-icon" class="ctl-mg-fish">🐟</div>
          <div id="mg-hook-zone" class="ctl-mg-hook"></div>
        </div>
        <div class="ctl-mg-label">Lực căng: <b id="mg-tension-pct">30%</b> · Tiến độ: <b id="mg-prog-pct">35%</b></div>
        <div class="ctl-mg-tension-bar">
          <div class="ctl-mg-safe-zone"></div>
          <div id="mg-tension-ptr" class="ctl-mg-ptr"></div>
        </div>
        <div class="ctl-mg-hint">Giữ R / Chuột để cuốn dây · A / D kéo cần · Không để Lực căng vượt 85%!</div>
        <div class="ctl-mg-btns">
          <button type="button" id="mg-left" class="ctl-parch-btn">◀ Kéo A</button>
          <button type="button" id="mg-reel" class="ctl-btn-jade">Giữ Cuốn Dây (R)</button>
          <button type="button" id="mg-right" class="ctl-parch-btn">Kéo D ▶</button>
        </div>
      </div>
    `;

    this.root.querySelector("#mg-close")?.addEventListener("click", () => {
      this.close();
      onFail?.();
    });

    const reelBtn = this.root.querySelector("#mg-reel");
    reelBtn?.addEventListener("pointerdown", () => { state.reeling = true; });
    reelBtn?.addEventListener("pointerup", () => { state.reeling = false; });
    reelBtn?.addEventListener("pointerleave", () => { state.reeling = false; });

    this.root.querySelector("#mg-left")?.addEventListener("pointerdown", () => { state.dir = -1; });
    this.root.querySelector("#mg-left")?.addEventListener("pointerup", () => { state.dir = 0; });
    this.root.querySelector("#mg-right")?.addEventListener("pointerdown", () => { state.dir = 1; });
    this.root.querySelector("#mg-right")?.addEventListener("pointerup", () => { state.dir = 0; });

    const onDown = (e) => {
      if (e.code === "KeyR") state.reeling = true;
      if (e.code === "KeyA" || e.code === "ArrowLeft") state.dir = -1;
      if (e.code === "KeyD" || e.code === "ArrowRight") state.dir = 1;
    };
    const onUp = (e) => {
      if (e.code === "KeyR") state.reeling = false;
      if (["KeyA", "KeyD", "ArrowLeft", "ArrowRight"].includes(e.code)) state.dir = 0;
    };
    this._keyDownHandler = onDown;
    this._keyUpHandler = onUp;
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);

    let last = performance.now();
    const tick = (now) => {
      if (!this.active) return;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      state.timer -= dt;
      state.fishPos += state.fishVel * dt;
      if (state.fishPos < 14 || state.fishPos > 86) state.fishVel *= -1;
      if (Math.random() < 0.04) state.fishVel = (Math.random() - 0.5) * 65;

      state.hookPos = Math.max(12, Math.min(88, state.hookPos + state.dir * 52 * dt));
      if (state.dir === 0) state.hookPos += (state.fishPos - state.hookPos) * 0.9 * dt;

      if (state.reeling) state.tension = Math.min(100, state.tension + 34 * dt);
      else state.tension = Math.max(0, state.tension - 28 * dt);

      const dist = Math.abs(state.fishPos - state.hookPos);
      if (dist <= 16 && state.tension >= 20 && state.tension <= 84) {
        state.progress += (state.reeling ? 28 : 14) * dt;
      } else if (state.tension > 94) {
        state.progress -= 24 * dt;
      }

      this.root.querySelector("#mg-time").textContent = `${Math.max(0, Math.ceil(state.timer))}s`;
      this.root.querySelector("#mg-fish-icon").style.left = `${state.fishPos}%`;
      this.root.querySelector("#mg-hook-zone").style.left = `${state.hookPos}%`;
      this.root.querySelector("#mg-tension-pct").textContent = `${Math.round(state.tension)}%`;
      this.root.querySelector("#mg-prog-pct").textContent = `${Math.min(100, Math.max(0, Math.round(state.progress)))}%`;
      this.root.querySelector("#mg-tension-ptr").style.left = `${state.tension}%`;

      if (state.progress >= 100) {
        this.close();
        onSuccess?.(state.timer > 7);
        return;
      }
      if (state.timer <= 0 || state.progress <= 0) {
        this.close();
        onFail?.();
        return;
      }
      this.rafId = requestAnimationFrame(tick);
    };
    this.rafId = requestAnimationFrame(tick);
  }

  _runRefine({ guName, guRank = 1, onSuccess, onFail }) {
    const rank = Math.max(1, Math.min(5, Number(guRank) || 1));
    const zoneWidth = [28, 28, 22, 18, 14, 11.5][rank] || 20;
    const halfZone = zoneWidth * 0.5;
    const gainRate = [32, 32, 27, 23, 20, 18][rank] || 24;
    const drainRate = [10, 10, 14, 18, 23, 28][rank] || 15;
    const needleUp = [58, 58, 62, 66, 70, 74][rank] || 60;
    const needleDown = [44, 44, 48, 54, 60, 66][rank] || 46;
    const state = { timer: 7.5 + rank * 0.85, progress: rank >= 4 ? 18 : 28, needle: 50, zone: 50, holding: false };
    this.root.innerHTML = `
      <div class="ctl-mg-card">
        <div class="ctl-mg-head">
          <span>Luyện Hóa: ${guName}</span>
          <span id="mg-time">${state.timer.toFixed(1)}s</span>
          <button type="button" id="mg-close" class="ctl-mini-circle">×</button>
        </div>
        <div class="ctl-mg-label">Tiến độ thu phục (Độ khó C${rank}): <b id="mg-prog-pct">${state.progress}%</b></div>
        <div class="ctl-mg-tension-bar">
          <div id="mg-zone" class="ctl-mg-safe-zone" style="width:${zoneWidth}%"></div>
          <div id="mg-ptr" class="ctl-mg-ptr"></div>
        </div>
        <div class="ctl-mg-hint">Giữ R hoặc nhấn nút để giữ kim Thần Thức trong vùng ngọc xanh!</div>
        <button type="button" id="mg-hold" class="ctl-btn-jade" style="width:100%;margin-top:8px">Quán Chú Chân Nguyên (R)</button>
      </div>
    `;
    this.root.querySelector("#mg-close")?.addEventListener("click", () => { this.close(); onFail?.(); });
    const btn = this.root.querySelector("#mg-hold");
    btn?.addEventListener("pointerdown", () => { state.holding = true; });
    btn?.addEventListener("pointerup", () => { state.holding = false; });
    btn?.addEventListener("pointerleave", () => { state.holding = false; });
    btn?.addEventListener("pointercancel", () => { state.holding = false; });

    const onDown = (e) => { if (e.code === "KeyR") state.holding = true; };
    const onUp = (e) => { if (e.code === "KeyR") state.holding = false; };
    this._keyDownHandler = onDown;
    this._keyUpHandler = onUp;
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);

    let last = performance.now();
    const tick = (now) => {
      if (!this.active) return;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      state.timer -= dt;
      const freq1 = 0.002 + rank * 0.00055;
      const freq2 = 0.0034 + rank * 0.0008;
      const amp2 = rank >= 3 ? rank * 2.8 : 0;
      state.zone = Math.max(15, Math.min(85, 50 + Math.sin(now * freq1) * (22 + rank * 1.8) + Math.cos(now * freq2) * amp2));
      state.needle = Math.max(4, Math.min(96, state.needle + (state.holding ? needleUp : -needleDown) * dt));
      if (Math.abs(state.needle - state.zone) <= halfZone) state.progress += gainRate * dt;
      else state.progress = Math.max(0, state.progress - drainRate * dt);

      this.root.querySelector("#mg-time").textContent = `${Math.max(0, state.timer).toFixed(1)}s`;
      this.root.querySelector("#mg-zone").style.left = `${state.zone - halfZone}%`;
      this.root.querySelector("#mg-ptr").style.left = `${state.needle}%`;
      this.root.querySelector("#mg-prog-pct").textContent = `${Math.min(100, Math.max(0, Math.round(state.progress)))}%`;

      if (state.progress >= 100) { this.close(); onSuccess?.(); return; }
      if (state.timer <= 0) { this.close(); onFail?.(); return; }
      this.rafId = requestAnimationFrame(tick);
    };
    this.rafId = requestAnimationFrame(tick);
  }

  _runBreakthrough({ title, hasWineBonus, onSuccess, onFail }) {
    const state = { wallHp: 100, attempts: 6, cursor: 10, dir: 1 };
    const winHalf = hasWineBonus ? 20 : 15;
    this.root.innerHTML = `
      <div class="ctl-mg-card">
        <div class="ctl-mg-head">
          <span>⚡ ${title || "Xung Kích Khiếu Bích"}</span>
          <span id="mg-att">Còn 6 nhịp</span>
          <button type="button" id="mg-close" class="ctl-mini-circle">×</button>
        </div>
        <div class="ctl-mg-label">Độ bền Khiếu Bích: <b id="mg-wall">100%</b> ${hasWineBonus ? "· 🍶 Tửu Trùng nới vùng!" : ""}</div>
        <div class="ctl-mg-tension-bar">
          <div class="ctl-mg-safe-zone" style="left:${50 - winHalf}%;width:${winHalf * 2}%"></div>
          <div id="mg-ptr" class="ctl-mg-ptr"></div>
        </div>
        <button type="button" id="mg-strike" class="ctl-btn-jade" style="width:100%;margin-top:8px">💥 Xung Kích Khiếu Bích! (Space / Click)</button>
      </div>
    `;
    this.root.querySelector("#mg-close")?.addEventListener("click", () => { this.close(); onFail?.(); });

    const strike = () => {
      if (!this.active) return;
      const hit = Math.abs(state.cursor - 50) <= winHalf;
      state.attempts -= 1;
      if (hit) {
        state.wallHp = Math.max(0, state.wallHp - 36);
        this.sfx?.play("fusionSuccess");
      } else {
        this.sfx?.play("hurt");
      }
      this.root.querySelector("#mg-wall").textContent = `${state.wallHp}%`;
      this.root.querySelector("#mg-att").textContent = `Còn ${state.attempts} nhịp`;
      if (state.wallHp <= 0) {
        this.close();
        onSuccess?.();
        return;
      }
      if (state.attempts <= 0) {
        this.close();
        onFail?.();
      }
    };
    this.root.querySelector("#mg-strike")?.addEventListener("click", strike);
    const onDown = (e) => {
      if (e.code === "Space") { e.preventDefault(); strike(); }
    };
    this._keyDownHandler = onDown;
    window.addEventListener("keydown", onDown);

    let last = performance.now();
    const tick = (now) => {
      if (!this.active) return;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      state.cursor += state.dir * 125 * dt;
      if (state.cursor >= 95) { state.cursor = 95; state.dir = -1; }
      if (state.cursor <= 5) { state.cursor = 5; state.dir = 1; }
      const ptr = this.root.querySelector("#mg-ptr");
      if (ptr) ptr.style.left = `${state.cursor}%`;
      this.rafId = requestAnimationFrame(tick);
    };
    this.rafId = requestAnimationFrame(tick);
  }
}
