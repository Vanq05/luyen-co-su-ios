import { GAME_HEIGHT, GAME_WIDTH, PALETTE, TILE_SIZE } from "../config/constants.js";

/**
 * Bộ dựng khung hình Pixel Art độ phân giải cố định 384x216, tắt làm mịn ảnh
 * và cung cấp helper vẽ telegraph ngắm chiêu (line, aoe, dash, arc).
 */
export class PixelRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.canvas.width = GAME_WIDTH;
    this.canvas.height = GAME_HEIGHT;
    this.ctx = canvas.getContext("2d", { alpha: false });
    this.ctx.imageSmoothingEnabled = false;
    this.width = GAME_WIDTH;
    this.height = GAME_HEIGHT;
  }

  clear(color = PALETTE.stoneDark) {
    const ctx = this.ctx;
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, this.width, this.height);
  }

  /**
   * Chuyển tọa độ clientX/clientY trên màn hình thật sang tọa độ pixel 384x216.
   */
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

  /**
   * Vẽ sân đá cổ phong Dark Fantasy (xám đá, xanh rêu tối, nâu đất, phù văn cổ trận ở giữa).
   */
  drawDarkFantasyArena(time) {
    const ctx = this.ctx;
    const cols = Math.ceil(this.width / TILE_SIZE);
    const rows = Math.ceil(this.height / TILE_SIZE);

    for (let gy = 0; gy < rows; gy++) {
      for (let gx = 0; gx < cols; gx++) {
        const hash = (gx * 73856093) ^ (gy * 19349663);
        const mod = Math.abs(hash) % 9;
        const x = gx * TILE_SIZE;
        const y = gy * TILE_SIZE;

        if (gx === 0 || gy === 0 || gx === cols - 1 || gy >= rows - 1) {
          ctx.fillStyle = mod % 2 === 0 ? PALETTE.earthDark : "#1b1412";
          ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
          ctx.fillStyle = "#2f231d";
          ctx.fillRect(x + 1, y + 1, TILE_SIZE - 2, 2);
          continue;
        }

        if (mod === 0 || mod === 4) {
          ctx.fillStyle = PALETTE.mossDark;
        } else if (mod === 2) {
          ctx.fillStyle = "#181520";
        } else {
          ctx.fillStyle = PALETTE.stoneMid;
        }
        ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);

        // Viền gạch đá tối
        ctx.fillStyle = PALETTE.stoneDark;
        ctx.fillRect(x, y + TILE_SIZE - 1, TILE_SIZE, 1);
        ctx.fillRect(x + TILE_SIZE - 1, y, 1, TILE_SIZE);

        // Đốm rêu hoặc vết nứt ngẫu nhiên deterministic
        if (mod === 1) {
          ctx.fillStyle = PALETTE.mossMid;
          ctx.fillRect(x + 3, y + 4, 3, 2);
          ctx.fillRect(x + 9, y + 10, 2, 2);
        } else if (mod === 6) {
          ctx.fillStyle = "#262134";
          ctx.fillRect(x + 2, y + 2, 4, 1);
        }
      }
    }

    // Cổ trận đồng ở tâm sân
    const cx = Math.floor(this.width * 0.5);
    const cy = Math.floor(this.height * 0.5);
    const pulse = 0.28 + Math.sin(time * 2.2) * 0.08;

    ctx.save();
    ctx.strokeStyle = `rgba(156, 122, 68, ${pulse})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, 42, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = `rgba(77, 230, 176, ${pulse * 0.65})`;
    ctx.beginPath();
    ctx.arc(cx, cy, 28, 0, Math.PI * 2);
    ctx.stroke();

    // 4 điểm cổ tự xoay chậm
    for (let i = 0; i < 4; i++) {
      const a = time * 0.45 + (i * Math.PI) / 2;
      const rx = Math.round(cx + Math.cos(a) * 35);
      const ry = Math.round(cy + Math.sin(a) * 35);
      ctx.fillStyle = PALETTE.bronzeBright;
      ctx.fillRect(rx - 1, ry - 1, 2, 2);
    }
    ctx.restore();
  }

  /**
   * Vẽ vệt ngắm định hướng kỹ năng theo kiểu aimType (line, aoe, dash, arc).
   */
  drawAimTelegraph(originX, originY, aimState, slotDef) {
    if (!aimState || !aimState.active || !slotDef) return;

    const ctx = this.ctx;
    const isCancel = aimState.isCanceling;
    const baseColor = isCancel ? "#ff3855" : slotDef.color;
    const angle = aimState.angle;
    const ratio = aimState.distanceRatio;

    ctx.save();
    const ox = Math.round(originX);
    const oy = Math.round(originY);

    if (slotDef.aimType === "line") {
      const len = slotDef.range;
      const tx = Math.round(ox + Math.cos(angle) * len);
      const ty = Math.round(oy + Math.sin(angle) * len);

      ctx.strokeStyle = baseColor;
      ctx.globalAlpha = 0.35;
      ctx.lineWidth = slotDef.radius ?? 8;
      ctx.beginPath();
      ctx.moveTo(ox, oy);
      ctx.lineTo(tx, ty);
      ctx.stroke();

      ctx.globalAlpha = 0.9;
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.moveTo(ox, oy);
      ctx.lineTo(tx, ty);
      ctx.stroke();
      ctx.setLineDash([]);

      // Mũi tên đích
      ctx.fillStyle = baseColor;
      ctx.fillRect(tx - 2, ty - 2, 4, 4);
    } else if (slotDef.aimType === "aoe") {
      const dist = Math.max(18, slotDef.range * Math.max(0.25, ratio));
      const tx = Math.round(ox + Math.cos(angle) * dist);
      const ty = Math.round(oy + Math.sin(angle) * dist);
      const r = slotDef.radius ?? 24;

      ctx.strokeStyle = baseColor;
      ctx.globalAlpha = 0.45;
      ctx.setLineDash([2, 3]);
      ctx.beginPath();
      ctx.moveTo(ox, oy);
      ctx.lineTo(tx, ty);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.globalAlpha = 0.22;
      ctx.fillStyle = baseColor;
      ctx.beginPath();
      ctx.arc(tx, ty, r, 0, Math.PI * 2);
      ctx.fill();

      ctx.globalAlpha = 0.92;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(tx, ty, r, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillRect(tx - 1, ty - 1, 2, 2);
    } else if (slotDef.aimType === "dash") {
      const dist = slotDef.range * Math.max(0.55, ratio);
      const tx = Math.round(ox + Math.cos(angle) * dist);
      const ty = Math.round(oy + Math.sin(angle) * dist);

      ctx.strokeStyle = baseColor;
      ctx.globalAlpha = 0.75;
      ctx.setLineDash([3, 2]);
      ctx.beginPath();
      ctx.moveTo(ox, oy);
      ctx.lineTo(tx, ty);
      ctx.stroke();
      ctx.setLineDash([]);

      // Bóng phân thân đáp đất
      ctx.globalAlpha = 0.45;
      ctx.fillStyle = baseColor;
      ctx.fillRect(tx - 4, ty - 10, 8, 12);
      ctx.globalAlpha = 0.95;
      ctx.strokeStyle = baseColor;
      ctx.strokeRect(tx - 4.5, ty - 10.5, 9, 13);
    } else if (slotDef.aimType === "arc") {
      const len = slotDef.range;
      const spread = slotDef.arcSpread ?? Math.PI * 0.4;
      const start = angle - spread * 0.5;
      const end = angle + spread * 0.5;

      ctx.fillStyle = baseColor;
      ctx.globalAlpha = 0.2;
      ctx.beginPath();
      ctx.moveTo(ox, oy);
      ctx.arc(ox, oy, len, start, end);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = baseColor;
      ctx.globalAlpha = 0.9;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(ox, oy);
      ctx.arc(ox, oy, len, start, end);
      ctx.closePath();
      ctx.stroke();
    }

    ctx.restore();
  }
}
