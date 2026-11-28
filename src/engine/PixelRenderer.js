import { GAME_HEIGHT, GAME_WIDTH, PALETTE } from "../config/constants.js";
import { bayerThreshold, fillPixelEllipse, plotPixelEllipse, plotPixelLine, plotRect } from "./PixelSpriteBaker.js";

/**
 * Bộ dựng khung hình Pixel Art 960x540 nghiêm ngặt:
 * - Khóa buffer canvas tại đúng độ phân giải pixel nội bộ 960x540 (imageSmoothingEnabled = false).
 * - Hiển thị sắc nét bằng CSS `image-rendering: pixelated`.
 * - Ánh sáng Tĩnh U Tịch (Static Moody Twilight) — KHÔNG có chu kỳ Ngày/Đêm!
 */
export class PixelRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.canvas.width = GAME_WIDTH;
    this.canvas.height = GAME_HEIGHT;
    this.ctx = canvas.getContext("2d", { alpha: false });
    this.ctx.imageSmoothingEnabled = false;
    this.labelCanvas = null;
    this.labelCtx = null;
    if (typeof document !== "undefined" && typeof document.createElement === "function") {
      const lc = document.createElement("canvas");
      lc.id = "label-canvas";
      lc.style.position = "absolute";
      lc.style.inset = "0";
      lc.style.width = "100%";
      lc.style.height = "100%";
      lc.style.pointerEvents = "none";
      lc.style.zIndex = "2";
      canvas.parentElement?.insertBefore(lc, canvas.nextSibling);
      this.labelCanvas = lc;
      this.labelCtx = lc.getContext("2d");
    }
    this.width = GAME_WIDTH;
    this.height = GAME_HEIGHT;
    this.zoom = 1.0;
    this._view = { cssW: GAME_WIDTH, cssH: GAME_HEIGHT, coverScale: 1, offsetX: 0, offsetY: 0 };
    this._weatherSeeds = Array.from({ length: 84 }, (_, i) => ({
      x: (i * 113) % GAME_WIDTH,
      y: (i * 67) % GAME_HEIGHT,
      spd: 0.7 + ((i * 19) % 10) * 0.12,
      size: (i % 3) + 1,
    }));
    this._vignetteCanvas = null;
    window.addEventListener("resize", () => this.syncResolution());
  }

  setZoom(nextZoom) {
    this.zoom = Math.max(0.85, Math.min(1.4, Number(nextZoom) || 1.0));
  }

  syncResolution() {
    const parent = this.canvas.parentElement;
    const vw = parent ? parent.clientWidth : window.innerWidth;
    const vh = parent ? parent.clientHeight : window.innerHeight;
    const cssW = vw > 0 ? vw : GAME_WIDTH;
    const cssH = vh > 0 ? vh : GAME_HEIGHT;
    const aspect = cssW / Math.max(1, cssH);

    let targetGameW = GAME_WIDTH;
    let targetGameH = GAME_HEIGHT;
    if (aspect >= 1) {
      targetGameH = GAME_HEIGHT;
      targetGameW = Math.max(720, Math.min(1440, Math.round(GAME_HEIGHT * aspect)));
    } else {
      targetGameW = GAME_WIDTH;
      targetGameH = Math.max(540, Math.min(1800, Math.round(GAME_WIDTH / Math.max(0.4, aspect))));
    }

    if (this.canvas.width !== targetGameW || this.canvas.height !== targetGameH) {
      this.canvas.width = targetGameW;
      this.canvas.height = targetGameH;
      this.width = targetGameW;
      this.height = targetGameH;
      this._vignetteCanvas = null;
    }
    if (this.labelCanvas && this.labelCtx) {
      const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
      const targetW = Math.max(1, Math.round(cssW * dpr));
      const targetH = Math.max(1, Math.round(cssH * dpr));
      if (this.labelCanvas.width !== targetW || this.labelCanvas.height !== targetH) {
        this.labelCanvas.width = targetW;
        this.labelCanvas.height = targetH;
      }
      this.ctx.__labelOverlay = {
        ctx: this.labelCtx,
        dpr,
        scaleX: targetW / this.width,
        scaleY: targetH / this.height,
      };
    }
    const coverScale = Math.max(cssW / this.width, cssH / this.height);
    const offsetX = (cssW - this.width * coverScale) * 0.5;
    const offsetY = (cssH - this.height * coverScale) * 0.5;
    this._view = { cssW, cssH, coverScale, offsetX, offsetY };
    return this._view;
  }

  clear(color = PALETTE.bgVoid) {
    const ctx = this.ctx;
    this.syncResolution();
    if (this.labelCtx && this.labelCanvas) {
      this.labelCtx.setTransform(1, 0, 0, 1, 0, 0);
      this.labelCtx.clearRect(0, 0, this.labelCanvas.width, this.labelCanvas.height);
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, this.width, this.height);
  }

  clientToGame(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) {
      return { x: this.width * 0.5, y: this.height * 0.5 };
    }
    return {
      x: ((clientX - rect.left) / rect.width) * this.width,
      y: ((clientY - rect.top) / rect.height) * this.height,
    };
  }

  clientToWorld(clientX, clientY, camera = { x: 0, y: 0 }) {
    const g = this.clientToGame(clientX, clientY);
    const z = this.zoom || 1.0;
    const cx = this.width * 0.5;
    const cy = this.height * 0.5;
    return {
      x: (g.x - cx) / z + cx + (camera?.x ?? 0),
      y: (g.y - cy) / z + cy + (camera?.y ?? 0),
    };
  }

  worldToClient(worldX, worldY, camera = { x: 0, y: 0 }) {
    const rect = this.canvas.getBoundingClientRect();
    const z = this.zoom || 1.0;
    const cx = this.width * 0.5;
    const cy = this.height * 0.5;
    const gx = (worldX - (camera?.x ?? 0) - cx) * z + cx;
    const gy = (worldY - (camera?.y ?? 0) - cy) * z + cy;
    return {
      x: rect.left + (gx / this.width) * rect.width,
      y: rect.top + (gy / this.height) * rect.height,
      inBounds: gx >= -24 && gx <= this.width + 24 && gy >= -24 && gy <= this.height + 24,
    };
  }

  /**
   * Vẽ vệt ngắm định hướng kỹ năng theo kiểu aimType hoàn toàn bằng pixel nguyên (0 ctx.arc / ctx.ellipse).
   */
  drawAimTelegraph(originX, originY, aimState, slotDef) {
    if (!aimState || !aimState.active || !slotDef) return;
    const ctx = this.ctx;
    const isCancel = aimState.isCanceling;
    const baseColor = isCancel ? "#d0573c" : (slotDef.color || "#5fbf8a");
    const angle = aimState.angle;
    const ratio = aimState.distanceRatio;
    const ox = Math.round(originX);
    const oy = Math.round(originY);

    ctx.save();
    if (slotDef.aimType === "line") {
      const len = slotDef.range || 120;
      const tx = Math.round(ox + Math.cos(angle) * len);
      const ty = Math.round(oy + Math.sin(angle) * len);
      ctx.globalAlpha = 0.85;
      plotPixelLine(ctx, ox, oy, tx, ty, baseColor, 2);
      plotRect(ctx, tx - 2, ty - 2, 5, 5, "#ffffff");
    } else if (slotDef.aimType === "aoe") {
      const dist = Math.max(22, (slotDef.range || 110) * Math.max(0.28, ratio));
      const tx = Math.round(ox + Math.cos(angle) * dist);
      const ty = Math.round(oy + Math.sin(angle) * dist);
      const r = slotDef.radius ?? 28;
      ctx.globalAlpha = 0.55;
      plotPixelLine(ctx, ox, oy, tx, ty, baseColor, 1);
      ctx.globalAlpha = 0.22;
      fillPixelEllipse(ctx, tx, ty, r, Math.round(r * 0.72), baseColor, true);
      ctx.globalAlpha = 0.92;
      plotPixelEllipse(ctx, tx, ty, r, Math.round(r * 0.72), baseColor, 3, 0);
    } else if (slotDef.aimType === "dash") {
      const dist = (slotDef.range || 72) * Math.max(0.55, ratio);
      const tx = Math.round(ox + Math.cos(angle) * dist);
      const ty = Math.round(oy + Math.sin(angle) * dist);
      ctx.globalAlpha = 0.78;
      plotPixelLine(ctx, ox, oy, tx, ty, baseColor, 1);
      plotRect(ctx, tx - 4, ty - 10, 8, 12, baseColor);
    } else if (slotDef.aimType === "arc") {
      const len = slotDef.range || 110;
      const spread = slotDef.arcSpread ?? Math.PI * 0.45;
      const start = angle - spread * 0.5;
      const end = angle + spread * 0.5;
      ctx.globalAlpha = 0.75;
      plotPixelLine(ctx, ox, oy, ox + Math.cos(start) * len, oy + Math.sin(start) * len, baseColor, 1);
      plotPixelLine(ctx, ox, oy, ox + Math.cos(end) * len, oy + Math.sin(end) * len, baseColor, 1);
      for (let i = 0; i <= 16; i++) {
        const a = start + (end - start) * (i / 16);
        plotRect(ctx, ox + Math.cos(a) * len - 1, oy + Math.sin(a) * len - 1, 2, 2, baseColor);
      }
    }
    ctx.restore();
  }

  _getStaticVignetteCanvas() {
    if (
      this._vignetteCanvas &&
      this._vignetteCanvas.width === this.width &&
      this._vignetteCanvas.height === this.height
    ) {
      return this._vignetteCanvas;
    }
    const c = document.createElement("canvas");
    c.width = this.width;
    c.height = this.height;
    const vctx = c.getContext("2d");
    vctx.imageSmoothingEnabled = false;
    // Viền tối rừng sâu trầm ấm ~22% Bayer dithered ở vùng rìa để trung tâm nổi bật rõ nét
    const cx = this.width * 0.5;
    const cy = this.height * 0.5;
    for (let y = 0; y < this.height; y += 4) {
      for (let x = 0; x < this.width; x += 4) {
        const dx = (x - cx) / cx;
        const dy = (y - cy) / cy;
        const dist = Math.hypot(dx, dy);
        if (dist < 0.68) continue;
        const t = Math.min(1, (dist - 0.68) / 0.68);
        if (bayerThreshold(x >> 2, y >> 2) < t * 0.78) {
          vctx.fillStyle = "rgba(9, 7, 4, 0.24)";
          vctx.fillRect(x, y, 4, 4);
        }
      }
    }
    this._vignetteCanvas = c;
    return c;
  }

  /**
   * Ánh sáng Tĩnh Trầm Ấm Rừng Sâu (Static Warm-Moody Forest Lighting) + Thời tiết pixel cố định.
   * TUYỆT ĐỐI KHÔNG thay đổi sáng/tối theo chu kỳ ngày/đêm.
   */
  drawEnvironmentOverlay(time, { weather = "clear", biome = "grass" } = {}) {
    const ctx = this.ctx;
    ctx.save();
    ctx.imageSmoothingEnabled = false;

    // 1. Tông trầm ấm nhẹ cố định giúp rừng rêu, đường đất vàng nâu & hiệu ứng chiêu thức nổi bật rõ nét
    ctx.fillStyle = "rgba(16, 12, 7, 0.08)";
    ctx.fillRect(0, 0, this.width, this.height);

    // 2. Thời tiết pixel sắc cạnh
    if (weather === "rain" || weather === "storm") {
      const dropCol = weather === "storm" ? "rgba(170, 220, 255, 0.42)" : "rgba(155, 205, 235, 0.28)";
      for (const p of this._weatherSeeds) {
        const px = Math.round((p.x + time * 55 * p.spd) % this.width);
        const py = Math.round((p.y + time * 190 * p.spd) % this.height);
        plotPixelLine(ctx, px, py, px - 3, py + 7, dropCol, 1);
      }
    } else if (weather === "snow") {
      ctx.fillStyle = "rgba(232, 244, 255, 0.75)";
      for (const p of this._weatherSeeds) {
        const px = Math.round((p.x + Math.sin(time * 1.4 + p.y) * 14 + time * 12) % this.width);
        const py = Math.round((p.y + time * 32 * p.spd) % this.height);
        ctx.fillRect(px, py, p.size > 2 ? 2 : 1, p.size > 2 ? 2 : 1);
      }
    } else if (weather === "fog") {
      ctx.fillStyle = "rgba(18, 28, 30, 0.16)";
      ctx.fillRect(0, 0, this.width, this.height);
    } else if (biome === "lakeside" || biome === "village" || biome === "bamboo") {
      for (let i = 0; i < 24; i++) {
        const p = this._weatherSeeds[i];
        const px = Math.round((p.x + time * 16 * p.spd + Math.sin(time * 0.9 + i) * 10) % this.width);
        const py = Math.round((p.y + time * 10 * p.spd) % this.height);
        ctx.fillStyle = i % 3 === 0 ? "rgba(94, 242, 214, 0.35)" : "rgba(175, 195, 225, 0.22)";
        ctx.fillRect(px, py, i % 4 === 0 ? 2 : 1, 1);
      }
    }

    // 3. Viền tối u tịch nhẹ ở bốn góc (~18% dithered)
    ctx.drawImage(this._getStaticVignetteCanvas(), 0, 0);
    ctx.restore();
  }
}
