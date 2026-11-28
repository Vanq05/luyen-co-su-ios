/**
 * MonsterArtBosses.js — Bộ Đại Tu Boss Quy Mô Lớn 96x96 / 112x96 (Idle / Telegraph / Attack)
 * - Thiên Trì Ngư Vương (112x96), 7 Bách Thú Vương & 3 Boss Cổ Sư Lôi Đài / Bí Cảnh (96x96).
 * - Tối thiểu 6 sắc độ, Bayer 4x4 Dithering, giáp/vảy/sừng/vây/khí thế cổ phong hắc ám áp đảo.
 */
import {
  applySelectiveOutline,
  bayerThreshold,
  createPixelCanvas,
  fillPixelEllipse,
  plotPixel,
  plotPixelEllipse,
  plotPixelLine,
  plotRect,
} from "../engine/PixelSpriteBaker.js";

const BOSS_CACHE = new Map();

function hash2(x, y) {
  let h = ((x | 0) * 374761393 + (y | 0) * 668265263) ^ 0x5bf03635;
  h = (h ^ (h >> 13)) * 1274126177;
  return Math.abs(h ^ (h >> 16));
}

function paintMass(ctx, W, H, parts, ramp, mode = "smooth") {
  const mask = new Uint8Array(W * H);
  const owner = new Int16Array(W * H);
  owner.fill(-1);

  for (let i = 0; i < parts.length; i++) {
    const pt = parts[i];
    const minX = Math.max(2, Math.floor(pt.cx - pt.rx - 2));
    const maxX = Math.min(W - 3, Math.ceil(pt.cx + pt.rx + 2));
    const minY = Math.max(2, Math.floor(pt.cy - pt.ry - 2));
    const maxY = Math.min(H - 3, Math.ceil(pt.cy + pt.ry + 2));
    const cosA = pt.rot ? Math.cos(-pt.rot) : 1;
    const sinA = pt.rot ? Math.sin(-pt.rot) : 0;

    for (let py = minY; py <= maxY; py++) {
      for (let px = minX; px <= maxX; px++) {
        const dx0 = px - pt.cx;
        const dy0 = py - pt.cy;
        const dx = (dx0 * cosA - dy0 * sinA) / Math.max(1, pt.rx);
        const dy = (dx0 * sinA + dy0 * cosA) / Math.max(1, pt.ry);
        let dist = Math.hypot(dx, dy);
        if (mode === "fur") {
          const ang = Math.atan2(dy, dx);
          dist -= 0.08 * Math.sin(ang * 9 + i * 1.4) + (hash2(px, py) % 3) * 0.025;
        } else if (mode === "rock") {
          dist = dist * 0.62 + (Math.abs(dx) + Math.abs(dy)) * 0.28;
        } else if (mode === "scales") {
          dist -= 0.04 * Math.sin(py * 0.6);
        }
        if (dist <= 1.0) {
          const idx = py * W + px;
          mask[idx] = 1;
          owner[idx] = i;
        }
      }
    }
  }

  for (let py = 2; py < H - 2; py++) {
    for (let px = 2; px < W - 2; px++) {
      const idx = py * W + px;
      if (!mask[idx]) continue;
      const pt = parts[owner[idx]] ?? parts[0];
      const rx = (px - pt.cx) / Math.max(1, pt.rx);
      const ry = (py - pt.cy) / Math.max(1, pt.ry);
      let lum = 0.56 - rx * 0.24 - ry * 0.36 + (pt.bias ?? 0);
      if (mode === "fur") lum += ((hash2(px >> 1, py) % 5) - 2) * 0.06;
      else if (mode === "rock") lum += ((px + py) >> 2) % 2 === 0 ? 0.07 : -0.07;
      else if (mode === "scales") lum += (((px >> 2) + (py >> 1)) & 1) ? 0.09 : -0.09;
      else if (mode === "wart" && hash2(px >> 1, py >> 1) % 7 === 0) lum += 0.22;
      const val = Math.max(0.05, Math.min(0.99, lum + (bayerThreshold(px, py) - 0.5) * 0.16));
      const si = Math.min(ramp.length - 1, Math.max(1, Math.floor(val * (ramp.length - 1)) + 1));
      ctx.fillStyle = ramp[si];
      ctx.fillRect(px, py, 1, 1);
    }
  }
}

function finalizeBoss(tmpCtx, W, H, topOut, botOut, shadowRx = 26) {
  applySelectiveOutline(tmpCtx, W, H, topOut, botOut);
  const { canvas, ctx } = createPixelCanvas(W, H);
  const anchorY = H - 14;
  if (ctx) {
    fillPixelEllipse(ctx, Math.round(W * 0.5), anchorY, shadowRx, 6, "rgba(5, 7, 11, 0.44)", true);
    ctx.drawImage(tmpCtx.canvas, 0, 0);
  }
  return {
    canvas,
    anchorX: Math.round(W * 0.5),
    anchorY,
    barOffsetY: H - 22,
  };
}

function makeBossStates(fn) {
  return {
    idle: [0, 1, 2, 3].map((f) => fn("idle", f)),
    telegraph: [0, 1, 2, 3].map((f) => fn("telegraph", f)),
    attack: [0, 1, 2, 3].map((f) => fn("attack", f)),
  };
}

// ----------------------------------------------------------------------------
// 1. THIÊN TRÌ NGƯ VƯƠNG (112x96) — Cá Chép Hóa Giao Long Đế Vương Dưới Hồ
// ----------------------------------------------------------------------------
function buildDragonFishKing112() {
  const W = 112;
  const H = 96;
  const bodyRamp = ["#061921", "#0c3a47", "#146e7a", "#26ada3", "#5ef0d4", "#d1fff5"];
  const goldRamp = ["#3b2408", "#805212", "#c48823", "#f0c146", "#fff19e"];

  return makeBossStates((state, f) => {
    const tmp = createPixelCanvas(W, H);
    const g = tmp.ctx;
    const isTele = state === "telegraph";
    const isAtk = state === "attack";
    const lift = isTele ? -5 : isAtk ? (f === 1 || f === 2 ? -3 : 1) : f % 2 === 0 ? -2 : 1;
    const surge = isAtk && (f === 1 || f === 2) ? 8 : 0;
    const ox = 54 + surge;
    const oy = 50 + lift;

    // Vòng sóng nước bọt trắng pixel dưới bụng cá
    plotPixelLine(g, 20, 76, 92, 76, "#2c8c9e", 2);
    for (let wx = 22; wx <= 88; wx += 10) {
      const wy = 75 + ((wx + f * 3) % 4 === 0 ? -1 : 1);
      plotRect(g, wx, wy, 5, 2, "#b5fff4");
    }

    // Đuôi Giao Long quạt rộng 3 tầng tung bọt nước
    const tailWag = isAtk ? (f % 2 === 0 ? -8 : 8) : f === 1 ? -4 : f === 3 ? 4 : 0;
    plotPixelLine(g, ox - 20, oy + 2, ox - 42, oy - 14 + tailWag, bodyRamp[3], 8);
    plotPixelLine(g, ox - 20, oy + 4, ox - 44, oy + 14 + tailWag, bodyRamp[2], 8);
    plotPixelLine(g, ox - 28, oy - 3 + Math.round(tailWag * 0.5), ox - 47, oy - 17 + tailWag, goldRamp[3], 3);
    plotPixelLine(g, ox - 28, oy + 6 + Math.round(tailWag * 0.5), ox - 47, oy + 17 + tailWag, goldRamp[3], 3);

    // Thân Ngư Vương uốn cong oai vệ + giáp vảy ngọc hoàng kim
    paintMass(
      g,
      W,
      H,
      [
        { cx: ox - 12, cy: oy + 2, rx: 16, ry: 12, rot: -0.15, bias: 0 },
        { cx: ox + 4, cy: oy - 3, rx: 18, ry: 15, rot: 0.1, bias: 0.1 },
        { cx: ox + 20, cy: oy - 4, rx: 13, ry: 12, bias: 0.08 },
      ],
      bodyRamp,
      "scales"
    );

    // Vây lưng gai hoàng kim & Vây ngực lớn xòe rộng
    for (let s = 0; s < 6; s++) {
      const fx = ox - 14 + s * 6;
      const fy = oy - 14 - Math.round(Math.sin(s * 0.5) * 6);
      plotPixelLine(g, fx, fy + 6, fx - 5, fy - 7, goldRamp[3], 3);
      plotPixel(g, fx - 5, fy - 7, goldRamp[4]);
    }
    plotPixelLine(g, ox + 2, oy + 6, ox - 12, oy + 19, goldRamp[2], 5);
    plotPixelLine(g, ox - 3, oy + 11, ox - 15, oy + 21, bodyRamp[5], 2);

    // Cặp Sừng Giao Long phân nhánh & Râu rồng dài phấp phới
    plotPixelLine(g, ox + 16, oy - 14, ox + 7, oy - 28, goldRamp[2], 3);
    plotPixelLine(g, ox + 11, oy - 22, ox + 15, oy - 30, goldRamp[4], 2);
    plotPixelLine(g, ox + 23, oy - 13, ox + 18, oy - 25, goldRamp[3], 2);
    plotPixelLine(g, ox + 29, oy - 3, ox + 43, oy - 11 + (f % 2) * 3, "#87ffeb", 2);
    plotPixelLine(g, ox + 28, oy + 4, ox + 41, oy + 9 - (f % 2) * 2, "#87ffeb", 2);

    // Mắt rồng đỏ hoàng kim & Thủy cầu tụ lực khi Telegraph / Attack
    plotRect(g, ox + 21, oy - 8, 5, 4, "#0d0608");
    plotRect(g, ox + 22, oy - 7, 4, 3, "#ff385c");
    plotPixel(g, ox + 24, oy - 7, "#fff4bd");

    if (isTele) {
      const rad = 5 + f;
      plotPixelEllipse(g, ox + 36, oy + 1, rad + 2, rad + 2, "#29d9c2", 2, f);
      fillPixelEllipse(g, ox + 36, oy + 1, rad, rad, "#bafff5", true);
    } else if (isAtk && (f === 1 || f === 2)) {
      plotPixelLine(g, ox + 32, oy + 1, ox + 50, oy + 1, "#5ef2d6", 6);
      plotPixelLine(g, ox + 34, oy + 1, ox + 52, oy + 1, "#ffffff", 2);
    }

    return finalizeBoss(g, W, H, "#134e59", "#051217", 36);
  });
}

// ----------------------------------------------------------------------------
// 2. BÁCH THÚ VƯƠNG GIẢP LỚN (96x96): Lợn Rừng / Điện Lang / Tuyết Lang / Thạch Hầu / Thiềm Thừ / Hạt / Mãng / Địa Thử
// ----------------------------------------------------------------------------
function buildBoarKing96() {
  const W = 96;
  const H = 96;
  const ramp = ["#140906", "#2e1309", "#542210", "#82381a", "#b85928", "#e89443"];
  return makeBossStates((state, f) => {
    const tmp = createPixelCanvas(W, H);
    const g = tmp.ctx;
    const isTele = state === "telegraph";
    const isAtk = state === "attack";
    const ox = 46 + (isAtk && (f === 1 || f === 2) ? 7 : 0);
    const oy = 56 + (isTele ? -2 : isAtk ? 2 : f % 2 === 0 ? -1 : 1);

    // Chân trước sau to lớn + giáp đầu gối đồng
    plotRect(g, ox - 20, oy + 8, 8, 16, ramp[1]);
    plotRect(g, ox - 9, oy + 9, 8, 16, ramp[2]);
    plotRect(g, ox + 7, oy + 9, 8, 16, ramp[2]);
    plotRect(g, ox + 17, oy + 8, 8, 15, ramp[1]);

    paintMass(
      g,
      W,
      H,
      [
        { cx: ox - 10, cy: oy - 1, rx: 18, ry: 14, bias: -0.04 },
        { cx: ox + 5, cy: oy - 6, rx: 19, ry: 18, bias: 0.1 },
        { cx: ox + 21, cy: oy, rx: 12, ry: 11, bias: 0.08 },
        { cx: ox + 30, cy: oy + 4, rx: 6, ry: 5, bias: 0.08 },
      ],
      ramp,
      "fur"
    );

    // Giáp vai sắt đồng sứt mẻ + Bờm gai rực lửa
    plotRect(g, ox - 3, oy - 18, 18, 12, "#4d3826");
    plotRect(g, ox - 1, oy - 16, 14, 7, "#9c783e");
    for (let s = 0; s < 7; s++) {
      const sx = ox - 16 + s * 6;
      const sy = oy - 21 - (s % 2) * 4;
      plotPixelLine(g, sx, sy + 7, sx - 3, sy - 5, "#ffae38", 3);
      plotPixel(g, sx - 3, sy - 5, "#fff4bd");
    }

    // 4 răng nanh khổng lồ cong vút
    plotPixelLine(g, ox + 27, oy + 7, ox + 37, oy - 5, "#fff5db", 3);
    plotPixelLine(g, ox + 21, oy + 10, ox + 30, oy + 1, "#e8d2ae", 3);
    plotRect(g, ox + 20, oy - 3, 5, 3, isTele ? "#ffffff" : "#ff243d");

    if (isTele) {
      plotPixelLine(g, ox + 8, oy + 24, ox + 24, oy + 24, "#ff9b26", 2);
      plotRect(g, ox + 14 + f * 3, oy + 18 - f * 2, 3, 3, "#ffe680");
    } else if (isAtk && (f === 1 || f === 2)) {
      plotPixelLine(g, ox + 33, oy - 8, ox + 42, oy + 8, "#ffcb47", 3);
    }

    return finalizeBoss(g, W, H, "#33170b", "#080505", 28);
  });
}

function buildWolfKing96(isSnow) {
  const W = 96;
  const H = 96;
  const ramp = isSnow
    ? ["#0e1824", "#274159", "#4e7396", "#7da6cc", "#b6d9f2", "#effaff"]
    : ["#081c17", "#11382e", "#1c5e4b", "#2e8f70", "#52c498", "#8cffe0"];
  const fxCol = isSnow ? "#94f2ff" : "#5cf2ff";

  return makeBossStates((state, f) => {
    const tmp = createPixelCanvas(W, H);
    const g = tmp.ctx;
    const isTele = state === "telegraph";
    const isAtk = state === "attack";
    const ox = 46 + (isAtk && (f === 1 || f === 2) ? 7 : 0);
    const oy = 56 + (isTele ? -3 : isAtk ? -4 : f % 2 === 0 ? -1 : 1);

    // Đuôi sói khổng lồ tỏa sương/lôi quang
    plotPixelLine(g, ox - 18, oy + 2, ox - 36, oy - 12 + (f % 2) * 4, ramp[2], 6);
    plotPixelLine(g, ox - 25, oy - 4, ox - 38, oy - 14 + (f % 2) * 4, fxCol, 2);

    // 4 chân săn mồi cơ bắp
    plotPixelLine(g, ox - 16, oy + 5, ox - 20, oy + 22, ramp[1], 4);
    plotPixelLine(g, ox - 9, oy + 6, ox - 9, oy + 23, ramp[2], 4);
    plotPixelLine(g, ox + 9, oy + 5, ox + 13, oy + (isAtk ? 15 : 22), ramp[3], 4);
    plotPixelLine(g, ox + 16, oy + 5, ox + 21, oy + (isAtk ? 15 : 22), ramp[2], 4);

    paintMass(
      g,
      W,
      H,
      [
        { cx: ox - 12, cy: oy + 2, rx: 13, ry: 9, bias: -0.05 },
        { cx: ox + 4, cy: oy - 3, rx: 16, ry: 13, bias: 0.08 },
        { cx: ox + 18, cy: oy - 8, rx: 11, ry: 10, bias: 0.08 },
        { cx: ox + 29, cy: oy - 4, rx: 7, ry: 4.5, bias: 0.06 },
      ],
      ramp,
      "fur"
    );

    // Vương miện sừng điện/băng & bờm rực sáng
    plotPixelLine(g, ox + 12, oy - 14, ox + 8, oy - 29, fxCol, 3);
    plotPixelLine(g, ox + 17, oy - 14, ox + 15, oy - 31, "#ffd15c", 3);
    plotPixelLine(g, ox + 21, oy - 13, ox + 23, oy - 26, fxCol, 2);
    plotPixelLine(g, ox - 3, oy - 12, ox + 8, oy - 20, fxCol, 2);
    plotRect(g, ox + 20, oy - 10, 5, 3, "#ffffff");
    plotRect(g, ox + 26, oy - 1, 3, 4, "#ffffff");
    plotRect(g, ox + 31, oy - 1, 3, 4, "#ffffff");

    if (isTele) {
      plotPixelEllipse(g, ox + 4, oy - 4, 28 + f, 20 + f, fxCol, 3, f);
    } else if (isAtk && (f === 1 || f === 2)) {
      plotPixelLine(g, ox + 29, oy - 16, ox + 41, oy - 2, fxCol, 3);
      plotPixelLine(g, ox + 31, oy - 10, ox + 43, oy + 4, "#ffffff", 2);
    }

    return finalizeBoss(g, W, H, isSnow ? "#1e3a52" : "#113329", "#050b0a", 28);
  });
}

function buildMonkeyKing96() {
  const W = 96;
  const H = 96;
  const ramp = ["#0e1116", "#222830", "#3a4350", "#586578", "#7b8da6", "#a8bdd9"];
  return makeBossStates((state, f) => {
    const tmp = createPixelCanvas(W, H);
    const g = tmp.ctx;
    const isTele = state === "telegraph";
    const isAtk = state === "attack";
    const ox = 48;
    const oy = 52 + (isTele ? -4 : isAtk && f === 2 ? 3 : 0);

    // Chân cột đá khổng lồ
    plotRect(g, ox - 14, oy + 10, 10, 18, ramp[2]);
    plotRect(g, ox + 4, oy + 10, 10, 18, ramp[1]);

    paintMass(
      g,
      W,
      H,
      [
        { cx: ox, cy: oy, rx: 18, ry: 16, bias: 0.06 },
        { cx: ox, cy: oy - 18, rx: 12, ry: 10, bias: 0.1 },
      ],
      ramp,
      "rock"
    );

    // Vòng Kim Cô vàng nứt vỡ trên trán + Rêu cổ + Đường nứt vàng rực
    plotRect(g, ox - 10, oy - 26, 20, 3, "#ffd15c");
    plotRect(g, ox - 2, oy - 28, 4, 4, "#ff385c");
    plotPixelLine(g, ox - 7, oy - 7, ox + 1, oy + 2, "#ffd15c", 2);
    plotPixelLine(g, ox + 1, oy + 2, ox + 8, oy - 5, "#5ef2d6", 2);
    plotRect(g, ox - 7, oy - 21, 4, 3, "#ff385c");
    plotRect(g, ox + 3, oy - 21, 4, 3, "#ff385c");

    // Hai nắm đấm khổng lồ khắc cổ văn
    for (const dir of [-1, 1]) {
      const armY = isTele ? oy - 16 : isAtk && f === 2 ? oy + 20 : oy + 12;
      const sx = ox + dir * 18;
      const fx = ox + dir * 26;
      plotPixelLine(g, sx, oy - 6, fx, armY, ramp[2], 9);
      plotRect(g, fx - 7, armY - 6, 14, 13, ramp[4]);
      plotRect(g, fx - 4, armY - 2, 8, 4, isTele || isAtk ? "#fff08a" : "#5ef2d6");
    }

    if (isAtk && f === 2) {
      plotPixelLine(g, ox - 36, oy + 26, ox + 36, oy + 26, "#ffd15c", 3);
    }

    return finalizeBoss(g, W, H, "#232a36", "#07090d", 28);
  });
}

function buildToadKing96() {
  const W = 96;
  const H = 96;
  const ramp = ["#10071a", "#281240", "#492370", "#6e36a6", "#9957d6", "#c98eff"];
  return makeBossStates((state, f) => {
    const tmp = createPixelCanvas(W, H);
    const g = tmp.ctx;
    const isTele = state === "telegraph";
    const isAtk = state === "attack";
    const ox = 48;
    const oy = 56 + (isAtk && f === 1 ? -5 : 0);
    const sac = isTele ? 1.35 : 1.05;

    paintMass(
      g,
      W,
      H,
      [
        { cx: ox - 19, cy: oy + 8, rx: 10, ry: 7, rot: -0.35 },
        { cx: ox + 19, cy: oy + 8, rx: 10, ry: 7, rot: 0.35 },
        { cx: ox, cy: oy, rx: 24, ry: 16, bias: 0.04 },
        { cx: ox - 10, cy: oy - 15, rx: 7, ry: 5, bias: 0.14 },
        { cx: ox + 10, cy: oy - 15, rx: 7, ry: 5, bias: 0.14 },
      ],
      ramp,
      "wart"
    );

    // Sừng xương & Vương miện độc tinh lục phát sáng
    plotPixelLine(g, ox - 12, oy - 19, ox - 18, oy - 30, "#d8cfbd", 3);
    plotPixelLine(g, ox + 12, oy - 19, ox + 18, oy - 30, "#d8cfbd", 3);
    plotRect(g, ox - 4, oy - 16, 8, 6, "#8cff66");
    plotRect(g, ox - 15, oy - 8, 6, 5, "#8cff66");
    plotRect(g, ox + 9, oy - 8, 6, 5, "#8cff66");

    fillPixelEllipse(g, ox, oy + 9, Math.round(15 * sac), Math.round(7 * sac), "#8f3ec4", true);
    plotRect(g, ox - 13, oy - 17, 5, 4, "#ff2e4c");
    plotRect(g, ox + 8, oy - 17, 5, 4, "#ff2e4c");
    plotPixel(g, ox - 11, oy - 16, "#ffffff");
    plotPixel(g, ox + 10, oy - 16, "#ffffff");

    if (isTele || isAtk) {
      for (let b = 0; b < 5; b++) {
        const bx = ox + (b - 2) * 12;
        const by = oy - 24 - ((f * 5 + b * 4) % 16);
        plotRect(g, bx, by, 4, 4, "#9cff78");
        plotPixel(g, bx, by, "#ffffff");
      }
    }

    return finalizeBoss(g, W, H, "#2c1445", "#09040d", 30);
  });
}

function buildScorpionKing96() {
  const W = 96;
  const H = 96;
  const ramp = ["#0b0e17", "#1c2438", "#304063", "#4b6496", "#7492cc", "#acc7f7"];
  return makeBossStates((state, f) => {
    const tmp = createPixelCanvas(W, H);
    const g = tmp.ctx;
    const isTele = state === "telegraph";
    const isAtk = state === "attack";
    const ox = 47 + (isAtk && (f === 1 || f === 2) ? 6 : 0);
    const oy = 58;

    for (let l = 0; l < 4; l++) {
      const lx = ox - 14 + l * 8;
      plotPixelLine(g, lx, oy + 5, lx - 6, oy + 16 + ((f + l) % 2) * 2, ramp[2], 3);
      plotPixelLine(g, lx, oy - 4, lx - 4, oy - 12 - ((f + l) % 2) * 2, ramp[1], 3);
    }

    const stX = isAtk ? 14 : 0;
    plotPixelLine(g, ox - 16, oy, ox - 28, oy - 18, ramp[3], 7);
    plotPixelLine(g, ox - 28, oy - 18, ox - 10 + stX, oy - 30, ramp[4], 6);
    plotPixelLine(g, ox - 10 + stX, oy - 30, ox + 9 + stX, oy - 22, "#ff385c", 4);
    plotPixelLine(g, ox + 4 + stX, oy - 24, ox + 12 + stX, oy - 17, "#ffffff", 2);

    const open = isTele ? 4 : isAtk && f === 2 ? -3 : 0;
    paintMass(
      g,
      W,
      H,
      [
        { cx: ox - 4, cy: oy, rx: 18, ry: 11, bias: 0.05 },
        { cx: ox + 22, cy: oy - 8 - open, rx: 9, ry: 5, rot: -0.25, bias: 0.1 },
        { cx: ox + 22, cy: oy + 8 + open, rx: 9, ry: 5, rot: 0.25, bias: 0.1 },
      ],
      ramp,
      "scales"
    );
    plotRect(g, ox + 10, oy - 3, 4, 3, "#ff385c");
    plotRect(g, ox + 10, oy + 3, 4, 3, "#ff385c");
    plotRect(g, ox - 4, oy - 6, 6, 4, "#ffd15c");

    return finalizeBoss(g, W, H, "#1c2842", "#07090d", 28);
  });
}

function buildSerpentKing96() {
  const W = 96;
  const H = 96;
  const ramp = ["#061924", "#0c3852", "#17658a", "#269cc4", "#5ad9eb", "#c7fcff"];
  return makeBossStates((state, f) => {
    const tmp = createPixelCanvas(W, H);
    const g = tmp.ctx;
    const isTele = state === "telegraph";
    const isAtk = state === "attack";
    const ox = 46;
    const oy = 64;

    // Thân giao xà cuộn cao dựng đầu lớn
    for (let i = 0; i < 34; i++) {
      const t = i / 33;
      const sx = ox - 20 + Math.round(t * 28 + Math.sin(t * 5 + f * 0.5) * 8) + (isAtk ? Math.round(t * 9) : 0);
      const sy = oy + 10 - Math.round(Math.pow(t, 1.3) * 38 + Math.cos(t * 4) * 4);
      const r = t < 0.2 ? 3 + Math.round(t * 14) : 7;
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          if (dx * dx + dy * dy <= r * r) {
            plotPixel(g, sx + dx, sy + dy, dy > r * 0.4 ? "#a3edf2" : dy < -1 ? ramp[4] : ramp[2]);
          }
        }
      }
    }

    const hx = ox + 12 + (isAtk ? 9 : 0);
    const hy = oy - 28;
    // Mang xòe rộng có mắt thần + sừng san hô
    plotRect(g, hx - 14, hy - 6, 22, 16, "#17658a");
    plotRect(g, hx - 12, hy - 4, 4, 5, "#ffd15c");
    plotPixelLine(g, hx - 2, hy - 8, hx - 8, hy - 22, "#ff7b66", 3);
    plotPixelLine(g, hx + 4, hy - 8, hx + 2, hy - 22, "#ff7b66", 3);
    paintMass(g, W, H, [{ cx: hx + 2, cy: hy, rx: 10, ry: 7, bias: 0.12 }], ramp, "scales");
    plotRect(g, hx + 4, hy - 3, 4, 2, "#ffe15c");

    if (isTele) {
      fillPixelEllipse(g, hx + 14, hy + 1, 5 + f, 5 + f, "#87ffeb", true);
    }

    return finalizeBoss(g, W, H, "#124963", "#051017", 26);
  });
}

function buildLavaBeastKing96() {
  const W = 96;
  const H = 96;
  const ramp = ["#140806", "#33100b", "#5c1b10", "#912c16", "#d9571e", "#ffab38"];
  return makeBossStates((state, f) => {
    const tmp = createPixelCanvas(W, H);
    const g = tmp.ctx;
    const isTele = state === "telegraph";
    const isAtk = state === "attack";
    const ox = 46 + (isAtk && (f === 1 || f === 2) ? 7 : 0);
    const oy = 56 + (isTele ? -3 : 0);

    paintMass(
      g,
      W,
      H,
      [
        { cx: ox - 6, cy: oy, rx: 22, ry: 16, bias: 0.05 },
        { cx: ox + 14, cy: oy - 6, rx: 13, ry: 11, bias: 0.1 },
        { cx: ox + 24, cy: oy - 2, rx: 7, ry: 5, bias: 0.08 },
      ],
      ramp,
      "rock"
    );
    // Khe dung nham sáng chói trên mai & sừng hỏa diệm
    plotPixelLine(g, ox - 16, oy - 4, ox + 2, oy - 12, isTele ? "#ffffff" : "#ffe066", 2);
    plotPixelLine(g, ox + 2, oy - 12, ox + 12, oy + 2, "#ff8c24", 2);
    plotPixelLine(g, ox + 12, oy - 14, ox + 19, oy - 28, "#ff5c24", 3);
    plotRect(g, ox + 18, oy - 8, 4, 3, "#ffffff");

    // Vuốt đào khổng lồ 3 ngón rực lửa
    for (let c = 0; c < 3; c++) {
      const cy = oy + 4 + c * 5;
      plotPixelLine(g, ox + 15, cy, ox + 30 + (isAtk ? 6 : 0), cy + 5, "#ffe066", 2);
    }

    return finalizeBoss(g, W, H, "#45140c", "#0a0404", 28);
  });
}

// ----------------------------------------------------------------------------
// 3. BOSS CỔ SƯ NHÂN HÌNH (96x96) — Lôi Đài & Mạc Vô Tâm (Xóa hoàn toàn người tuyết!)
// ----------------------------------------------------------------------------
function buildGuMasterBoss96(variant) {
  const W = 96;
  const H = 96;
  // variant: "mac_vo_tam" (Tử Độc), "co_su_hac_bao" (Hỏa Đao), "van_thu_vuong" (Mộc Châm)
  const isFire = variant === "co_su_hac_bao";
  const isWood = variant === "van_thu_vuong";
  const ramp = isFire
    ? ["#12090d", "#33121b", "#5c1b29", "#942b3c", "#cf4c54", "#ff8d7a"]
    : isWood
      ? ["#091712", "#133629", "#215942", "#358562", "#59b88b", "#a3ffcf"]
      : ["#0d0a17", "#21183b", "#392766", "#593b99", "#825cc7", "#b896ff"];
  const accent = isFire ? "#ff9436" : isWood ? "#ffd46b" : "#c87dff";
  const eyeCol = isFire ? "#ff384c" : isWood ? "#5ef2d6" : "#d975ff";

  return makeBossStates((state, f) => {
    const tmp = createPixelCanvas(W, H);
    const g = tmp.ctx;
    const isTele = state === "telegraph";
    const isAtk = state === "attack";
    const bob = isTele ? -3 : isAtk ? -1 : f === 1 || f === 2 ? -1 : 0;
    const lunge = isAtk && (f === 1 || f === 2) ? 7 : 0;
    const ox = 46 + lunge;
    const oy = 50 + bob;

    // 3 linh châu / phi châm lơ lửng sau lưng Cổ Sư Boss
    for (let o = 0; o < 3; o++) {
      const ang = (o / 3) * Math.PI * 2 + f * 0.45;
      const lx = ox + Math.round(Math.cos(ang) * (isTele ? 24 : 20));
      const ly = oy - 10 + Math.round(Math.sin(ang) * 14);
      plotRect(g, lx - 3, ly - 3, 6, 6, "#090a10");
      plotRect(g, lx - 2, ly - 2, 4, 4, accent);
      plotPixel(g, lx - 1, ly - 1, "#ffffff");
    }

    // Trường bào cổ phong bay tung tà
    for (let y = oy - 12; y <= oy + 26; y++) {
      const t = (y - (oy - 12)) / 38;
      const hw = Math.round(9 + t * 11);
      const sway = Math.round(Math.sin(t * 4 + f * 0.8) * 2 - lunge * t * 0.4);
      for (let x = ox - hw + sway; x <= ox + hw + sway; x++) {
        const lum = 0.54 - ((x - ox) / hw) * 0.25 - t * 0.14 + (bayerThreshold(x, y) - 0.5) * 0.15;
        const si = Math.max(1, Math.min(5, Math.floor(lum * 5) + 1));
        plotPixel(g, x, y, y > oy + 22 ? accent : ramp[si]);
      }
    }

    // Cổ áo V, Đai ngọc & Giáp vai cổ phong
    plotPixelLine(g, ox - 7, oy - 11, ox, oy - 2, accent, 2);
    plotPixelLine(g, ox + 7, oy - 11, ox, oy - 2, accent, 2);
    plotRect(g, ox - 11, oy + 4, 22, 4, "#14121d");
    plotRect(g, ox - 3, oy + 4, 6, 4, accent);
    plotRect(g, ox - 15, oy - 13, 7, 6, "#4d5566");
    plotRect(g, ox + 8, oy - 13, 7, 6, "#4d5566");

    // Đầu, Khuôn mặt lạnh & Trâm quán trên búi tóc dài
    plotRect(g, ox - 12, oy - 28, 24, 24, ramp[1]); // Tóc xõa sau lưng
    paintMass(g, W, H, [{ cx: ox, cy: oy - 22, rx: 8, ry: 8, bias: 0.12 }], ["#1a1418", "#c9b3a8", "#e8d8ce", "#f7ede6"], "smooth");
    plotRect(g, ox - 9, oy - 31, 18, 8, "#16141f"); // Mái tóc đen
    plotRect(g, ox - 4, oy - 36, 8, 5, accent); // Quán ngọc trên đỉnh đầu
    plotRect(g, ox - 5, oy - 22, 3, 2, eyeCol);
    plotRect(g, ox + 2, oy - 22, 3, 2, eyeCol);
    plotPixel(g, ox - 4, oy - 22, "#ffffff");
    plotPixel(g, ox + 3, oy - 22, "#ffffff");

    // Vũ khí / Pháp trượng / Kiếm khí trên tay
    if (isAtk && (f === 1 || f === 2)) {
      plotPixelLine(g, ox + 10, oy - 4, ox + 34, oy + 2, "#ffffff", 3);
      plotPixelLine(g, ox + 22, oy - 19, ox + 37, oy - 2, accent, 3);
      plotPixelLine(g, ox + 37, oy - 2, ox + 22, oy + 17, accent, 3);
    } else if (isTele) {
      plotPixelLine(g, ox + 12, oy - 4, ox + 16, oy - 24, accent, 3);
      plotPixelEllipse(g, ox + 16, oy - 26, 6 + f, 6 + f, accent, 2, f);
    } else {
      plotPixelLine(g, ox + 11, oy + 8, ox + 15, oy - 24, "#94a6bd", 2);
      plotRect(g, ox + 13, oy - 27, 5, 5, accent);
    }

    return finalizeBoss(g, W, H, "#241d38", "#07060d", 22);
  });
}

const BOSS_BUILDERS = {
  thien_tri_ngu_vuong: buildDragonFishKing112,
  lon_rung_vuong: buildBoarKing96,
  tam_nha_dien_lang: () => buildWolfKing96(false),
  soi_tuyet_vuong: () => buildWolfKing96(true),
  thach_hau_vuong: buildMonkeyKing96,
  thiem_thu_vuong: buildToadKing96,
  thiet_giap_hat_vuong: buildScorpionKing96,
  thuy_mang_vuong: buildSerpentKing96,
  xich_viem_vuong: buildLavaBeastKing96,
  mac_vo_tam: () => buildGuMasterBoss96("mac_vo_tam"),
  co_su_hac_bao: () => buildGuMasterBoss96("co_su_hac_bao"),
  van_thu_vuong: () => buildGuMasterBoss96("van_thu_vuong"),
};

export function isBossSpriteType(typeId) {
  return Boolean(BOSS_BUILDERS[typeId]);
}

export function getBossSpriteFrames(typeId, state = "idle") {
  let bundle = BOSS_CACHE.get(typeId);
  if (!bundle) {
    const builder = BOSS_BUILDERS[typeId] ?? BOSS_BUILDERS.mac_vo_tam;
    bundle = builder();
    BOSS_CACHE.set(typeId, bundle);
  }
  return bundle[state] ?? bundle.idle;
}
