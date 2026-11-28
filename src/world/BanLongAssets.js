/**
 * BanLongAssets.js — Bộ Dựng Pixel Art Độc Bản Khu Bàn Long & Thiên Thú Vương Vạn Thủ Bàn Long
 * - 100% Pixel Nguyên (Integer Grid + imageSmoothingEnabled = false + Bayer 4x4 Dithering + Dark Selective Outlining).
 * - TUYỆT ĐỐI KHÔNG dùng ctx.arc / ctx.ellipse / đường cong vector / gradient nhòe / SVG.
 * - Tông màu cố định u tịch (Static Moody Dark Fantasy): 6+ sắc độ đá cổ, rêu trầm, vảy rồng thanh đồng & ngọc lam cổ.
 */

import {
  applySelectiveOutline,
  bayerThreshold,
  createPixelCanvas,
  drawCrispPixelText,
  plotPixel,
  plotPixelLine,
  plotRect,
} from "../engine/PixelSpriteBaker.js";

const FLOOR_TILES_CACHE = [];
const DAIS_CACHE = new Map();
const BOSS_BODY_CACHE = [];
const BOSS_HEAD_CACHE = new Map();
const PILLAR_CACHE = new Map();
const PROP_FRAMES_CACHE = new Map();
const BAN_LONG_GATE_CACHE = [];
const MIST_CACHE = [];
let SENTINEL_CACHE = null;

function hashBL(x, y) {
  let h = ((x | 0) * 374761393 + (y | 0) * 668265263) ^ 0x5bf03635;
  h = (h ^ (h >> 13)) * 1274126177;
  return Math.abs(h ^ (h >> 16));
}

// Bảng 6+ sắc độ chuẩn Dark Fantasy Cổ Phong cho Khu Bàn Long
const SLATE_RAMP = ["#06090e", "#0e131d", "#161f2d", "#212e40", "#2f4057", "#435873"];
const MOSS_RAMP = ["#08120d", "#102218", "#193525", "#244a34", "#336347"];
const BRONZE_RAMP = ["#26190c", "#4d3316", "#785124", "#a87638", "#d6a456", "#fae08c"];
const HORN_RAMP = ["#24180d", "#52391d", "#876132", "#ba8e4d", "#e3be78", "#fff0be"];
const SCALE_RAMP = ["#060b10", "#0f1c26", "#18303f", "#24475c", "#35637d", "#528aa6"];

function paintDitherPolygon(ctx, cx, cy, pts, palette, opts = {}) {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const [x, y] of pts) {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  const rx = Math.max(1, (maxX - minX) * 0.5);
  const ry = Math.max(1, (maxY - minY) * 0.5);
  const n = pts.length;

  for (let py = Math.floor(minY); py <= Math.ceil(maxY); py++) {
    for (let px = Math.floor(minX); px <= Math.ceil(maxX); px++) {
      let inside = false;
      for (let i = 0, j = n - 1; i < n; j = i++) {
        const xi = pts[i][0];
        const yi = pts[i][1];
        const xj = pts[j][0];
        const yj = pts[j][1];
        const inter = yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / ((yj - yi) || 0.0001) + xi;
        if (inter) inside = !inside;
      }
      if (!inside) continue;

      const nx = (px - cx) / rx;
      const ny = (py - cy) / ry;
      const shade = 0.54 - nx * 0.24 - ny * 0.34 + (opts.bias ?? 0);
      const val = Math.max(0.05, Math.min(0.98, shade));
      const maxIdx = palette.length - 1;
      const exact = val * maxIdx;
      const baseIdx = Math.min(maxIdx - 1, Math.max(0, Math.floor(exact)));
      const frac = exact - baseIdx;
      const idx = bayerThreshold(px, py) < frac ? Math.min(maxIdx, baseIdx + 1) : baseIdx;
      ctx.fillStyle = palette[idx];
      ctx.fillRect(px, py, 1, 1);
    }
  }
}

function fillPixelOctagon(ctx, cx, cy, rx, ry, col, bevelRatio = 0.42) {
  const bx = Math.round(rx * (1 - bevelRatio));
  const by = Math.round(ry * (1 - bevelRatio));
  const top = Math.round(cy - ry);
  const bot = Math.round(cy + ry);
  ctx.fillStyle = col;
  for (let y = top; y <= bot; y++) {
    const dy = Math.abs(y - cy);
    let hw = rx;
    if (dy > by) {
      const t = (dy - by) / Math.max(1, ry - by);
      hw = Math.round(bx + (rx - bx) * (1 - t));
    }
    ctx.fillRect(Math.round(cx - hw), y, Math.max(1, hw * 2), 1);
  }
}

function strokePixelOctagon(ctx, cx, cy, rx, ry, col, dashMod = 0, phase = 0, bevelRatio = 0.42) {
  const bx = Math.round(rx * (1 - bevelRatio));
  const by = Math.round(ry * (1 - bevelRatio));
  const verts = [
    [Math.round(cx - bx), Math.round(cy - ry)],
    [Math.round(cx + bx), Math.round(cy - ry)],
    [Math.round(cx + rx), Math.round(cy - by)],
    [Math.round(cx + rx), Math.round(cy + by)],
    [Math.round(cx + bx), Math.round(cy + ry)],
    [Math.round(cx - bx), Math.round(cy + ry)],
    [Math.round(cx - rx), Math.round(cy + by)],
    [Math.round(cx - rx), Math.round(cy - by)],
  ];
  for (let e = 0; e < 8; e++) {
    const [x0, y0] = verts[e];
    const [x1, y1] = verts[(e + 1) % 8];
    const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
    for (let s = 0; s <= steps; s++) {
      if (dashMod > 0 && ((s + phase + e * 3) % dashMod) >= Math.ceil(dashMod * 0.6)) continue;
      const t = steps > 0 ? s / steps : 0;
      const px = Math.round(x0 + (x1 - x0) * t);
      const py = Math.round(y0 + (y1 - y0) * t);
      plotPixel(ctx, px, py, col);
    }
  }
}

function plotDitheredBlob(ctx, cx, cy, rx, ry, palette, opts = {}) {
  const icx = Math.round(cx);
  const icy = Math.round(cy);
  const irx = Math.max(1, Math.round(rx));
  const iry = Math.max(1, Math.round(ry));
  for (let dy = -iry; dy <= iry; dy++) {
    for (let dx = -irx; dx <= irx; dx++) {
      const d2 = (dx * dx) / (irx * irx) + (dy * dy) / (iry * iry);
      if (d2 > 1.0) continue;
      const shade = 0.66 - d2 * 0.36 - (dx / irx) * 0.14 - (dy / iry) * 0.22 + (opts.bias ?? 0);
      const val = Math.max(0.05, Math.min(0.98, shade));
      const maxIdx = palette.length - 1;
      const exact = val * maxIdx;
      const baseIdx = Math.min(maxIdx - 1, Math.max(0, Math.floor(exact)));
      const frac = exact - baseIdx;
      const px = icx + dx;
      const py = icy + dy;
      const idx = bayerThreshold(px, py) < frac ? Math.min(maxIdx, baseIdx + 1) : baseIdx;
      ctx.fillStyle = palette[idx];
      ctx.fillRect(px, py, 1, 1);
    }
  }
}

function drawLayeredDragonScale(ctx, cx, cy, w, h, ramp, crestCol = null) {
  const x = Math.round(cx);
  const y = Math.round(cy);
  const hw = Math.max(2, Math.floor(w * 0.5));
  const hh = Math.max(2, Math.floor(h * 0.5));
  // Viền tối tách từng lớp vảy rồng
  plotRect(ctx, x - hw - 1, y - hh, w + 2, h, ramp[0]);
  plotRect(ctx, x - hw, y - hh - 1, w, h + 2, ramp[0]);
  // Tầng bóng & màu nền vảy
  plotRect(ctx, x - hw, y - hh, w, h, ramp[2]);
  // Lõi giữa bắt sáng trên-trái
  plotRect(ctx, x - hw + 1, y - hh + 1, Math.max(1, w - 2), Math.max(1, h - 2), ramp[3]);
  plotRect(ctx, x - hw + 1, y - hh + 1, Math.max(1, Math.floor(w * 0.55)), Math.max(1, Math.floor(h * 0.5)), ramp[4]);
  plotPixel(ctx, x - hw + 1, y - hh + 1, ramp[5]);
  if (crestCol) {
    plotPixel(ctx, x, y - hh - 1, crestCol);
  }
}

function drawDragonClawFoot(ctx, x, y, facing = 1, clawCount = 4, ramp = SCALE_RAMP) {
  const ix = Math.round(x);
  const iy = Math.round(y);
  plotRect(ctx, ix - 4, iy - 4, 9, 6, ramp[0]);
  plotRect(ctx, ix - 3, iy - 3, 7, 4, ramp[3]);
  plotPixel(ctx, ix - 2, iy - 2, ramp[4]);
  for (let c = 0; c < clawCount; c++) {
    const spread = c - (clawCount - 1) * 0.5;
    const tx = Math.round(ix + facing * 3 + spread * 2.4);
    const ty = Math.round(iy + 2 + (c % 2));
    plotPixelLine(ctx, ix + Math.round(spread), iy + 1, tx, ty, ramp[0], 2);
    plotPixel(ctx, tx - facing, ty - 1, HORN_RAMP[3]);
    plotPixel(ctx, tx, ty, HORN_RAMP[5]);
  }
}

/**
 * 1. TILESET ĐÁ CỔ BÀN LONG 64x64 (8 biến thể ghép liền mạch, 6 sắc độ + rêu trầm + vết nứt cổ trận).
 */
export function getBanLongFloorTileSet() {
  if (FLOOR_TILES_CACHE.length > 0) return FLOOR_TILES_CACHE;

  for (let v = 0; v < 8; v++) {
    const { canvas, ctx } = createPixelCanvas(64, 64);
    if (!ctx) {
      FLOOR_TILES_CACHE.push(canvas);
      continue;
    }

    // Nền đá phiến xám đen u tịch theo lưới phiến đá 32x16 lát so le
    plotRect(ctx, 0, 0, 64, 64, SLATE_RAMP[1]);

    for (let row = 0; row < 4; row++) {
      const sy = row * 16;
      const stag = (row & 1) * 16;
      for (let col = -1; col < 3; col++) {
        const sx = col * 32 + stag;
        const bx = Math.max(0, sx + 1);
        const bw = Math.min(64, sx + 31) - bx;
        if (bw <= 0) continue;

        const blockHash = hashBL(col + v * 7, row + v * 13);
        const baseShade = 2 + (blockHash % 2); // SLATE_RAMP[2] or [3]

        // Viền khe đá tối 1px
        plotRect(ctx, Math.max(0, sx), sy, Math.min(32, 64 - sx), 16, SLATE_RAMP[0]);
        plotRect(ctx, bx, sy + 1, bw, 14, SLATE_RAMP[baseShade]);

        // Vát sáng cạnh trên-trái 1px kiểu đá chạm khắc
        plotRect(ctx, bx, sy + 1, bw, 1, SLATE_RAMP[Math.min(5, baseShade + 2)]);
        plotRect(ctx, bx, sy + 1, 1, 14, SLATE_RAMP[Math.min(5, baseShade + 1)]);
        // Bóng cạnh dưới-phải
        plotRect(ctx, bx, sy + 14, bw, 1, SLATE_RAMP[1]);

        // Bayer dither bề mặt đá phong hóa
        for (let py = sy + 2; py < sy + 14; py++) {
          for (let px = bx + 1; px < bx + bw - 1; px++) {
            const n = ((hashBL(px + v * 19, py + v * 23) % 100) / 100) * 0.45 + 0.25;
            if (bayerThreshold(px, py) < n * 0.45) {
              plotPixel(ctx, px, py, SLATE_RAMP[Math.min(4, baseShade + 1)]);
            } else if (hashBL(px * 3, py * 5) % 17 === 0) {
              plotPixel(ctx, px, py, SLATE_RAMP[1]);
            }
          }
        }
      }
    }

    // Rêu sẫm ẩm ướt bám theo khe đá bằng Bayer dithering (5 sắc độ MOSS_RAMP)
    const mossSeeds = 2 + (v % 3);
    for (let m = 0; m < mossSeeds; m++) {
      const mx = 6 + (hashBL(v + 3, m * 19) % 52);
      const my = ((hashBL(m * 11, v + 5) % 4) * 16) + ((hashBL(v, m) % 5) - 2);
      const rx = 5 + (hashBL(m, v * 3) % 7);
      const ry = 3 + (hashBL(v * 7, m) % 4);
      for (let dy = -ry; dy <= ry; dy++) {
        for (let dx = -rx; dx <= rx; dx++) {
          const px = mx + dx;
          const py = my + dy;
          if (px < 0 || py < 0 || px >= 64 || py >= 64) continue;
          const d = Math.hypot(dx / rx, dy / ry);
          if (d > 1) continue;
          const density = (1 - d) * 0.85;
          if (bayerThreshold(px, py) < density) {
            const mi = Math.min(4, Math.max(0, Math.floor(density * 5)));
            plotPixel(ctx, px, py, MOSS_RAMP[mi]);
          }
        }
      }
    }

    // Vết nứt sâu & tàn tích cổ trận mờ ảo trên một số phiến đá
    if (v === 1 || v === 3 || v === 5 || v === 7) {
      const cx0 = 10 + (hashBL(v, 41) % 18);
      const cy0 = 8 + (hashBL(43, v) % 20);
      const cx1 = cx0 + 16 + (v % 3) * 6;
      const cy1 = cy0 + 14 + (v % 2) * 8;
      plotPixelLine(ctx, cx0, cy0, cx1, cy1, SLATE_RAMP[0], 1);
      plotPixelLine(ctx, cx1, cy1, cx1 + 8, cy1 - 5, SLATE_RAMP[0], 1);
      if (v === 3 || v === 7) {
        // Mạch linh khí rạn nứt mờ ẩn dưới khe đá
        plotPixelLine(ctx, cx0 + 1, cy0 + 1, cx1 - 2, cy1 - 1, v === 7 ? "#1e635d" : "#154745", 1);
        plotPixel(ctx, cx1, cy1, "#3eb5a7");
      }
    }

    FLOOR_TILES_CACHE.push(canvas);
  }
  return FLOOR_TILES_CACHE;
}

/**
 * 2. CỔ TRẬN BÁT QUÁI & ĐÀI TẾ ĐÁ BÀN LONG (384x240, 4 frame hoạt ảnh luồng linh khí).
 */
export function getBanLongFormationDais(frameIdx = 0, isBreathWarn = false) {
  const f = ((frameIdx % 4) + 4) % 4;
  const warn = isBreathWarn ? 1 : 0;
  const key = `${f}_${warn}`;
  if (DAIS_CACHE.has(key)) return DAIS_CACHE.get(key);

  const W = 384;
  const H = 244;
  const anchorX = 192;
  const anchorY = 128;
  const { canvas, ctx } = createPixelCanvas(W, H);
  if (!ctx) {
    const stub = { canvas, anchorX, anchorY };
    DAIS_CACHE.set(key, stub);
    return stub;
  }

  const cx = 192;
  const cy = 116;

  // Bóng nền bát giác dưới chân đài tế
  fillPixelOctagon(ctx, cx, cy + 12, 184, 102, "rgba(4, 6, 10, 0.52)");

  // Bậc thềm đá bát giác ngoài + tường thành bậc 2.5D
  fillPixelOctagon(ctx, cx, cy + 10, 178, 96, SLATE_RAMP[0]);
  fillPixelOctagon(ctx, cx, cy + 6, 174, 93, SLATE_RAMP[2]);
  fillPixelOctagon(ctx, cx, cy, 172, 91, SLATE_RAMP[3]);
  strokePixelOctagon(ctx, cx, cy, 172, 91, SLATE_RAMP[5], 0, 0);

  // Lát đá mặt bậc thềm ngoài & rêu Bayer dithering
  for (let y = cy - 90; y <= cy + 90; y += 2) {
    for (let x = cx - 170; x <= cx + 170; x += 2) {
      const dx = Math.abs(x - cx) / 170;
      const dy = Math.abs(y - cy) / 90;
      if (dx + dy > 1.42 || Math.max(dx, dy) > 1.0) continue;
      if (dx + dy > 0.92) {
        const h = hashBL(x >> 2, y >> 2);
        if ((x & 15) === 0 || (y & 11) === 0) {
          plotRect(ctx, x, y, 2, 1, SLATE_RAMP[1]);
        } else if (h % 9 === 0 && bayerThreshold(x >> 1, y >> 1) < 0.6) {
          plotRect(ctx, x, y, 2, 2, MOSS_RAMP[2]);
        }
      }
    }
  }

  // Bậc thứ 2 thu hẹp vào trong
  fillPixelOctagon(ctx, cx, cy + 4, 138, 74, SLATE_RAMP[0]);
  fillPixelOctagon(ctx, cx, cy, 134, 71, SLATE_RAMP[2]);
  strokePixelOctagon(ctx, cx, cy, 134, 71, BRONZE_RAMP[3], 0, 0);
  strokePixelOctagon(ctx, cx, cy, 128, 67, BRONZE_RAMP[1], 0, 0);

  // Vành đai chạm khắc 16 đốt vảy rồng chạy quanh chu vi bát giác giữa
  const runeBase = warn ? "#5c1518" : "#123836";
  const runeMid = warn ? "#ba292e" : "#226e68";
  const runeBright = warn ? "#ff5c42" : "#5ef2d6";
  const runePeak = warn ? "#ffd880" : "#d8fff6";

  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    const rx = Math.round(cx + Math.cos(a) * 149);
    const ry = Math.round(cy + Math.sin(a) * 78);
    drawLayeredDragonScale(ctx, rx, ry, 8, 6, i % 2 === 0 ? BRONZE_RAMP : SLATE_RAMP);
  }

  // Lõi hố trận pháp bát giác tối sâu
  fillPixelOctagon(ctx, cx, cy, 102, 54, SLATE_RAMP[0]);
  fillPixelOctagon(ctx, cx, cy, 98, 51, "#0b1118");
  strokePixelOctagon(ctx, cx, cy, 98, 51, runeMid, 0, 0);
  strokePixelOctagon(ctx, cx, cy, 62, 33, BRONZE_RAMP[2], 3, f);

  // 8 đường mạch cổ ngữ tỏa ra 8 đỉnh bát giác + hạt linh khí chạy vào tâm theo 4 frame
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2 + Math.PI / 8;
    const xOut = Math.round(cx + Math.cos(a) * 124);
    const yOut = Math.round(cy + Math.sin(a) * 65);
    const xIn = Math.round(cx + Math.cos(a) * 24);
    const yIn = Math.round(cy + Math.sin(a) * 14);
    plotPixelLine(ctx, xOut, yOut, xIn, yIn, runeBase, 3);
    plotPixelLine(ctx, xOut, yOut, xIn, yIn, runeMid, 1);

    // Điểm linh khí chạy từ ngoài vào tâm (frame 0 -> 3)
    const prog = (f + (k % 2) * 0.5) / 4;
    const px = Math.round(xOut + (xIn - xOut) * prog);
    const py = Math.round(yOut + (yIn - yOut) * prog);
    plotRect(ctx, px - 2, py - 2, 4, 4, runeBright);
    plotRect(ctx, px - 1, py - 1, 2, 2, runePeak);

    // Khối quẻ Bát Quái 3 vạch ở mép ngoài mỗi hướng
    const qx = Math.round(cx + Math.cos(a) * 112);
    const qy = Math.round(cy + Math.sin(a) * 58);
    for (let bar = -1; bar <= 1; bar++) {
      const broken = ((k + bar + 3) % 2) === 1;
      if (broken) {
        plotRect(ctx, qx - 5, qy + bar * 3, 4, 2, f === k % 4 ? runePeak : BRONZE_RAMP[4]);
        plotRect(ctx, qx + 1, qy + bar * 3, 4, 2, f === k % 4 ? runePeak : BRONZE_RAMP[4]);
      } else {
        plotRect(ctx, qx - 5, qy + bar * 3, 10, 2, f === k % 4 ? runePeak : BRONZE_RAMP[4]);
      }
    }
  }

  // Bậc đá nam nối lên cầu đá dẫn vào đài
  for (let step = 0; step < 4; step++) {
    const sw = 72 - step * 4;
    const sy = cy + 90 + step * 5;
    plotRect(ctx, Math.round(cx - sw * 0.5) - 2, sy - 1, sw + 4, 6, SLATE_RAMP[0]);
    plotRect(ctx, Math.round(cx - sw * 0.5), sy, sw, 4, step % 2 === 0 ? SLATE_RAMP[4] : SLATE_RAMP[3]);
    plotRect(ctx, Math.round(cx - sw * 0.5), sy, sw, 1, SLATE_RAMP[5]);
  }

  // Lõi ấn rồng trung tâm dưới chân trụ Bàn Long
  fillPixelOctagon(ctx, cx, cy, 34, 18, SLATE_RAMP[1]);
  strokePixelOctagon(ctx, cx, cy, 34, 18, BRONZE_RAMP[4], 0, 0);
  plotRect(ctx, cx - 8, cy - 4, 16, 8, f % 2 === 0 ? runeMid : runeBright);
  plotRect(ctx, cx - 4, cy - 2, 8, 4, runePeak);

  const res = { canvas, anchorX, anchorY };
  DAIS_CACHE.set(key, res);
  return res;
}

/**
 * 3. THÂN RỒNG CUỘN QUANH TRỤ ĐÁ CỔ & TỨ CHI 5 NGÓN (192x192, 4 frame hoạt ảnh).
 */
export function getBanLongBossFrames(isBreathWarn = false) {
  const warn = isBreathWarn ? 1 : 0;
  if (BOSS_BODY_CACHE[warn]?.length === 4) return BOSS_BODY_CACHE[warn];

  const frames = [];
  const W = 192;
  const H = 192;
  const anchorX = 96;
  const anchorY = 154;

  const emberCol = warn ? "#ff5c42" : "#24a89a";
  const emberBright = warn ? "#ffd875" : "#78ffea";

  for (let f = 0; f < 4; f++) {
    const { canvas, ctx } = createPixelCanvas(W, H);
    if (!ctx) {
      frames.push({ canvas, anchorX, anchorY });
      continue;
    }

    const tmp = createPixelCanvas(W, H);
    const g = tmp.ctx;
    const breathDy = f === 1 ? -1 : f === 2 ? -2 : f === 3 ? -1 : 0;

    // 1. Đuôi rồng uốn lượn cuộn ra phía sau bên trái (lớp sau trụ)
    const tailPts = [];
    for (let s = 0; s <= 18; s++) {
      const t = s / 18;
      const angle = t * Math.PI * 1.15;
      const swayX = f === 1 ? 2 : f === 3 ? -2 : 0;
      const tx = Math.round(78 - Math.sin(angle) * 56 + t * 14 + swayX * t);
      const ty = Math.round(138 - Math.cos(angle * 0.8) * 18 - t * 44);
      const rad = Math.max(3, Math.round(11 * (1 - t * 0.65)));
      tailPts.push([tx, ty, rad, s]);
    }
    for (let i = tailPts.length - 1; i >= 0; i--) {
      const [tx, ty, rad, s] = tailPts[i];
      drawLayeredDragonScale(g, tx, ty, rad * 2, Math.max(4, Math.round(rad * 1.4)), SCALE_RAMP);
      if (s % 2 === 0) {
        const spCol = f === 0 && s > 10 ? emberBright : HORN_RAMP[4];
        plotRect(g, tx - 1, ty - rad - 3, 2, 4, SCALE_RAMP[0]);
        plotPixel(g, tx, ty - rad - 2, spCol);
      }
    }
    // Chỏm lông & gai đuôi nhọn
    const [tipX, tipY] = tailPts[tailPts.length - 1];
    plotPixelLine(g, tipX, tipY, tipX - 9, tipY - 8, SCALE_RAMP[0], 3);
    plotPixelLine(g, tipX, tipY, tipX - 8, tipY - 7, HORN_RAMP[4], 1);
    plotRect(g, tipX - 6, tipY - 5, 5, 4, emberCol);
    plotPixel(g, tipX - 5, tipY - 4, emberBright);

    // 2. Vòng cuộn lưng phía sau cột đá (y: 82..126)
    for (let s = 0; s <= 16; s++) {
      const t = s / 16;
      const cx = Math.round(44 + t * 104);
      const cy = Math.round(92 + breathDy + Math.sin(t * Math.PI) * 14);
      drawLayeredDragonScale(g, cx, cy, 18, 13, SCALE_RAMP, s % 2 === 0 ? (f === 2 ? emberBright : emberCol) : null);
    }

    // 3. Cột Trụ Cổ Bàn Long ở tâm xoắn ốc (bệ đá bát giác + thân trụ chạm rồng gãy đỉnh)
    fillPixelOctagon(g, 96, 152, 34, 14, SLATE_RAMP[0]);
    fillPixelOctagon(g, 96, 149, 31, 12, SLATE_RAMP[3]);
    plotRect(g, 79, 44, 34, 108, SLATE_RAMP[0]);
    plotRect(g, 81, 46, 30, 104, SLATE_RAMP[2]);
    plotRect(g, 81, 46, 9, 104, SLATE_RAMP[4]);
    plotRect(g, 83, 48, 3, 100, SLATE_RAMP[5]);
    plotRect(g, 106, 46, 5, 104, SLATE_RAMP[1]);
    // Đỉnh trụ vỡ góc cạnh + cổ ấn phát sáng
    plotRect(g, 79, 39, 14, 7, SLATE_RAMP[3]);
    plotRect(g, 98, 41, 14, 5, SLATE_RAMP[2]);
    plotRect(g, 92, 66, 8, 12, SLATE_RAMP[0]);
    plotRect(g, 93, 67, 6, 10, f % 2 === 0 ? emberCol : emberBright);

    // 4. Vòng cuộn bụng lớn ôm mặt trước trụ (2 vòng xoắn ốc uốn lượn rõ rệt + vảy bụng đồng vàng)
    // Vòng dưới (phải -> trái)
    for (let s = 0; s <= 22; s++) {
      const t = s / 22;
      const cx = Math.round(148 - t * 106);
      const cy = Math.round(134 + Math.sin(t * Math.PI) * 18 + Math.round(breathDy * 0.5));
      const w = Math.round(18 + Math.sin(t * Math.PI) * 4);
      const h = 14;
      drawLayeredDragonScale(g, cx, cy, w, h, SCALE_RAMP);
      // Vảy bụng đồng vàng xếp lớp ở mép dưới vòng cuộn
      if (t > 0.12 && t < 0.88) {
        plotRect(g, cx - 5, cy + 2, 10, 6, BRONZE_RAMP[0]);
        plotRect(g, cx - 4, cy + 3, 8, 4, BRONZE_RAMP[3]);
        plotRect(g, cx - 3, cy + 3, 5, 2, BRONZE_RAMP[4]);
        plotPixel(g, cx - 1, cy + 3, BRONZE_RAMP[5]);
      }
      if (s % 3 === 0) {
        const pulseHere = (f === 1 && s > 6 && s < 16) || (f === 3 && s >= 14);
        plotRect(g, cx - 1, cy - 9, 3, 4, SLATE_RAMP[0]);
        plotRect(g, cx, cy - 8, 2, 3, pulseHere ? emberBright : HORN_RAMP[4]);
      }
    }

    // Vòng trên (trái -> phải -> ngực trung tâm, quấn qua thân trụ đá)
    for (let s = 0; s <= 20; s++) {
      const t = s / 20;
      const cx = Math.round(46 + t * 98);
      const cy = Math.round(108 - Math.sin(t * Math.PI) * 16 + breathDy);
      const isLitSpine = (f === 2 && s > 8) || (f === 3);
      drawLayeredDragonScale(g, cx, cy, 19, 14, SCALE_RAMP, isLitSpine ? emberBright : emberCol);
      if (s % 2 === 1) {
        plotRect(g, cx - 4, cy + 2, 8, 5, BRONZE_RAMP[2]);
        plotRect(g, cx - 3, cy + 3, 6, 2, BRONZE_RAMP[4]);
      }
      if (s % 3 === 1) {
        // Gai lưng dọc sống rồng
        plotPixelLine(g, cx, cy - 6, cx - 2, cy - 12, SCALE_RAMP[0], 2);
        plotPixel(g, cx - 1, cy - 11, isLitSpine ? emberBright : HORN_RAMP[5]);
      }
    }

    // 5. Khối ức vai rồng uy nghi bám vào trụ & 4 chi vuốt sắc 5 ngón
    plotDitheredBlob(g, 96, 94 + breathDy, 24, 16, SCALE_RAMP, { bias: 0.06 });
    for (const [vx, vy] of [[88, 92], [96, 95], [104, 92]]) {
      plotRect(g, vx - 4, vy + breathDy, 8, 5, BRONZE_RAMP[3]);
      plotRect(g, vx - 2, vy + 1 + breathDy, 4, 2, BRONZE_RAMP[5]);
    }
    // 2 chi trước bám cột đá & bệ đài (5 ngón sắc nhọn)
    drawDragonClawFoot(g, 73, 102 + breathDy, -1, 5, SCALE_RAMP);
    drawDragonClawFoot(g, 119, 102 + breathDy, 1, 5, SCALE_RAMP);
    // 2 chi sau đạp mặt đá bát giác
    drawDragonClawFoot(g, 58, 150, -1, 4, SCALE_RAMP);
    drawDragonClawFoot(g, 134, 150, 1, 4, SCALE_RAMP);

    // Chạy viền Selective Outlining sắc nét toàn thân rồng cuộn
    applySelectiveOutline(g, W, H, "#1e2e3d", "#05070b");

    // Vẽ bóng rồng pixel dithered xuống mặt canvas đích trước rồi dán thân rồng sắc cạnh
    for (let dy = -16; dy <= 16; dy++) {
      for (let dx = -68; dx <= 68; dx++) {
        if ((dx * dx) / (68 * 68) + (dy * dy) / (16 * 16) > 1) continue;
        if (bayerThreshold(dx, dy) < 0.56) {
          ctx.fillStyle = "rgba(3, 5, 8, 0.52)";
          ctx.fillRect(anchorX + dx, anchorY + dy + 6, 1, 1);
        }
      }
    }
    ctx.drawImage(tmp.canvas, 0, 0);
    frames.push({ canvas, anchorX, anchorY });
  }

  BOSS_BODY_CACHE[warn] = frames;
  return frames;
}

const DRAGON_HEAD_THEMES = [
  { key: "doc", title: "Độc", eye: "#5ceb8b", crest: "#2ab359", ramp: ["#07120b", "#122b1a", "#1c4529", "#2c663e", "#408a56", "#64b87c"] },
  { key: "bang", title: "Băng", eye: "#70e8ff", crest: "#2da2cf", ramp: ["#071017", "#112536", "#1a3c54", "#275878", "#397a9e", "#5fa7cc"] },
  { key: "chu", title: "Chủ", isMain: true, eye: "#ffd257", crest: "#5ef2d6", ramp: ["#060d12", "#0f222b", "#183745", "#245263", "#367387", "#59a1b5"] },
  { key: "loi", title: "Lôi", eye: "#d28cff", crest: "#944ce0", ramp: ["#0e0814", "#20132e", "#321e47", "#482c66", "#64408a", "#8a5eb8"] },
  { key: "viem", title: "Viêm", eye: "#ff6448", crest: "#d93226", ramp: ["#140707", "#2b100e", "#451916", "#632520", "#87362e", "#b55147"] },
];

function getDragonHeadSprite(themeIdx, frameIdx, alive = true) {
  const f = ((frameIdx % 4) + 4) % 4;
  const key = `${themeIdx}_${alive ? f : "dead"}`;
  if (BOSS_HEAD_CACHE.has(key)) return BOSS_HEAD_CACHE.get(key);

  const theme = DRAGON_HEAD_THEMES[themeIdx % DRAGON_HEAD_THEMES.length];
  const W = 58;
  const H = 56;
  const { canvas, ctx } = createPixelCanvas(W, H);
  if (!ctx) {
    BOSS_HEAD_CACHE.set(key, canvas);
    return canvas;
  }

  const tmp = createPixelCanvas(W, H);
  const g = tmp.ctx;
  const cx = 29;
  const cy = 30;

  if (!alive) {
    // Đầu rồng hóa đá nứt nẻ & bám rêu khi bị đánh gãy
    paintDitherPolygon(g, cx, cy, [[cx - 12, cy - 9], [cx + 12, cy - 9], [cx + 14, cy + 5], [cx - 14, cy + 5]], SLATE_RAMP);
    plotPixelLine(g, cx - 10, cy - 8, cx - 16, cy - 19, SLATE_RAMP[2], 2);
    plotPixelLine(g, cx + 10, cy - 8, cx + 15, cy - 17, SLATE_RAMP[2], 2);
    plotPixelLine(g, cx - 5, cy - 6, cx + 4, cy + 4, SLATE_RAMP[0], 1);
    plotRect(g, cx - 9, cy + 1, 5, 4, MOSS_RAMP[2]);
    applySelectiveOutline(g, W, H, "#192029", "#05070a");
    ctx.drawImage(tmp.canvas, 0, 0);
    BOSS_HEAD_CACHE.set(key, canvas);
    return canvas;
  }

  const jawOpen = f === 3 ? 3 : f === 2 ? 2 : 1;
  const maneShift = f === 1 ? -1 : f === 3 ? 1 : 0;

  // 1. Sừng gạc phân nhánh sắc nhọn (5 sắc độ xương sừng đồng cổ)
  for (const dir of [-1, 1]) {
    plotPixelLine(g, cx + dir * 7, cy - 8, cx + dir * 18, cy - 23, HORN_RAMP[1], 3);
    plotPixelLine(g, cx + dir * 7, cy - 8, cx + dir * 18, cy - 23, HORN_RAMP[4], 1);
    plotPixelLine(g, cx + dir * 13, cy - 16, cx + dir * 21, cy - 17, HORN_RAMP[5], 1); // Nhánh chẽ ngang
    plotPixelLine(g, cx + dir * 12, cy - 14, cx + dir * 12, cy - 24, HORN_RAMP[5], 1); // Nhánh chĩa lên
    plotPixel(g, cx + dir * 18, cy - 23, HORN_RAMP[5]);
  }

  // 2. Bờm cổ rậm từng cụm pixel (bờm lửa / linh khí dao động 4 frame)
  for (const dir of [-1, 1]) {
    plotDitheredBlob(g, cx + dir * 12, cy - 1 + maneShift, 7, 8, [theme.ramp[0], theme.ramp[2], theme.ramp[4], theme.crest]);
    plotPixelLine(g, cx + dir * 14, cy - 4 + maneShift, cx + dir * 23, cy - 8, theme.crest, 2);
    plotPixelLine(g, cx + dir * 15, cy + 1 + maneShift, cx + dir * 24, cy + 2, theme.eye, 1);
    plotPixel(g, cx + dir * 23, cy - 8, "#fff6d1");
  }

  // 3. Khối sọ & gò má góc cạnh (0 đường tròn mượt)
  paintDitherPolygon(
    g,
    cx,
    cy - 4,
    [
      [cx - 11, cy - 11],
      [cx + 11, cy - 11],
      [cx + 14, cy - 1],
      [cx + 9, cy + 5],
      [cx - 9, cy + 5],
      [cx - 14, cy - 1],
    ],
    theme.ramp,
    { bias: 0.08 }
  );
  // Gờ trán & sống mũi rồng
  plotRect(g, cx - 4, cy - 11, 8, 12, theme.ramp[4]);
  plotRect(g, cx - 2, cy - 10, 4, 9, theme.ramp[5]);
  plotPixel(g, cx, cy - 13, theme.crest);

  // Mõm trên & lỗ mũi khè khí
  paintDitherPolygon(
    g,
    cx,
    cy + 5,
    [
      [cx - 9, cy + 2],
      [cx + 9, cy + 2],
      [cx + 7, cy + 9],
      [cx - 7, cy + 9],
    ],
    theme.ramp
  );
  plotRect(g, cx - 5, cy + 5, 2, 2, "#06080c");
  plotRect(g, cx + 3, cy + 5, 2, 2, "#06080c");

  // 4. Đôi mắt rồng sắc lẹm sáng rực trên nền sọ tối
  for (const dir of [-1, 1]) {
    const ex = cx + dir * 6;
    const ey = cy - 4;
    plotRect(g, ex - 3, ey - 2, 6, 4, "#06080c");
    plotRect(g, ex - 2, ey - 1, 4, 2, theme.eye);
    plotPixel(g, ex + (dir > 0 ? -1 : 1), ey - 1, "#ffffff");
    // Vảy chân mày xếch sắc cạnh
    plotPixelLine(g, cx + dir * 3, cy - 7, cx + dir * 10, cy - 9, theme.ramp[5], 1);
  }

  // 5. Hàm dưới há rộng kèm nanh trắng sắc nhọn & râu rồng uốn lượn
  const jawY = cy + 9 + jawOpen;
  plotRect(g, cx - 7, cy + 8, 14, 2 + jawOpen, "#1a080c"); // Khoang miệng tối
  if (f >= 2) {
    plotRect(g, cx - 4, cy + 8, 8, jawOpen + 1, theme.eye); // Hỏa quang / linh lực tụ trong họng
  }
  plotRect(g, cx - 7, jawY, 14, 4, theme.ramp[2]);
  plotRect(g, cx - 5, jawY + 1, 10, 2, theme.ramp[4]);
  // 4 răng nanh nhọn hàm trên & 2 nanh hàm dưới
  for (const nx of [-6, -2, 2, 5]) {
    plotRect(g, cx + nx, cy + 8, 2, 3, "#d8e0eb");
    plotPixel(g, cx + nx, cy + 10, "#ffffff");
  }
  plotPixel(g, cx - 4, jawY - 2, "#ffffff");
  plotPixel(g, cx + 4, jawY - 2, "#ffffff");

  // Hai sợi râu rồng uốn nhẹ theo 4 frame
  for (const dir of [-1, 1]) {
    const wx = cx + dir * 8;
    const wy = cy + 7;
    plotPixelLine(g, wx, wy, wx + dir * 10, wy + 5 + maneShift, HORN_RAMP[4], 1);
    plotPixelLine(g, wx + dir * 10, wy + 5 + maneShift, wx + dir * 14, wy + 10, HORN_RAMP[5], 1);
  }

  applySelectiveOutline(g, W, H, "#233242", "#05070a");
  ctx.drawImage(tmp.canvas, 0, 0);
  BOSS_HEAD_CACHE.set(key, canvas);
  return canvas;
}

/**
 * Hàm vẽ hoàn chỉnh Vạn Thủ Bàn Long (Thân cuộn trụ đá + 5 cổ uốn lượn + 5 đầu rồng pixel 4 frame).
 */
export function drawBanLongCoilingBoss(ctx, boss, time, breathWarn = 0) {
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  const bx = Math.round(boss.x);
  const by = Math.round(boss.y);
  const f = Math.floor(time * 4.5) % 4;
  const warn = breathWarn > 0;

  // 1. Thân Rồng Cuộn 192x192 (4 frame cached)
  const bodyFrames = getBanLongBossFrames(warn);
  const bodySpr = bodyFrames[f] ?? bodyFrames[0];
  if (bodySpr) {
    if (boss.hurtFlash > 0) ctx.globalAlpha = 0.72;
    ctx.drawImage(bodySpr.canvas, Math.round(bx - bodySpr.anchorX), Math.round(by - bodySpr.anchorY));
    ctx.globalAlpha = 1;
  }

  // 2. Năm chiếc cổ vảy xếp lớp uốn lượn nối từ ức rồng lên 5 đầu Bàn Long
  const heads = boss.heads ?? [];
  for (let i = 0; i < heads.length; i++) {
    const h = heads[i];
    const theme = DRAGON_HEAD_THEMES[i % DRAGON_HEAD_THEMES.length];
    const neckSocketX = bx + h.dx * 0.22;
    const neckSocketY = by - 58;
    const hx = Math.round(bx + h.dx + (h.alive ? Math.sin(time * 1.9 + i * 1.25) * 3 : 0));
    const hy = Math.round(by + (h.alive ? h.dy + Math.cos(time * 2.5 + i) * 4 : h.dy * 0.35 + 14));

    const segs = 15;
    for (let s = 0; s <= segs; s++) {
      const t = s / segs;
      const sway = h.alive ? Math.sin(t * Math.PI * 2 + time * 3.0 + i) * 7 : Math.sin(t * Math.PI) * 3;
      const nx = Math.round(neckSocketX + (hx - neckSocketX) * t + sway);
      const ny = Math.round(neckSocketY + (hy - neckSocketY) * t - Math.sin(t * Math.PI) * 8);
      const w = Math.max(7, Math.round((theme.isMain ? 16 : 12) * (1 - t * 0.25)));
      const ht = Math.max(6, Math.round(w * 0.72));
      const neckRamp = h.alive ? theme.ramp : SLATE_RAMP;
      const crestPulse = h.alive && s % 2 === 1 ? ((f + s) % 4 === 0 ? theme.eye : theme.crest) : null;
      drawLayeredDragonScale(ctx, nx, ny, w, ht, neckRamp, crestPulse);
      if (h.alive && t > 0.25 && t < 0.85 && s % 2 === 0) {
        plotRect(ctx, nx - 3, ny + Math.floor(ht * 0.25), 6, 3, BRONZE_RAMP[3]);
      }
    }

    // Đầu Rồng Pixel Sprite (58x56, 4 frame)
    const headCanvas = getDragonHeadSprite(i, f, Boolean(h.alive));
    const hw = headCanvas.width;
    const hh = headCanvas.height;
    ctx.drawImage(headCanvas, Math.round(hx - hw * 0.5), Math.round(hy - hh * 0.52));

    if (!h.alive) continue;

    // Thanh máu & danh xưng từng đầu rồng sắc nét
    const pct = Math.max(0, Math.round((h.hp / Math.max(1, h.maxHp)) * 100));
    const barY = Math.round(hy - (theme.isMain ? 34 : 30));
    plotRect(ctx, hx - 24, barY - 1, 48, 6, "#06080d");
    plotRect(ctx, hx - 23, barY, 46, 4, "#241914");
    plotRect(ctx, hx - 23, barY, Math.max(1, Math.round((46 * pct) / 100)), 4, theme.eye);
    ctx.font = "700 8.5px 'Be Vietnam Pro', sans-serif";
    drawCrispPixelText(ctx, `${theme.title} ${pct}%`, hx, barY - 4, "#fff5d6", "#06080d");
  }

  // Thanh máu tổng của Boss Vạn Thủ Bàn Long đặt gọn dưới bệ rồng cuộn (không đè lên đầu hay HUD trên)
  const totalPct = Math.max(0, Math.min(1, boss.hp / Math.max(1, boss.maxHp)));
  plotRect(ctx, bx - 64, by + 42, 128, 7, "#06080d");
  plotRect(ctx, bx - 63, by + 43, 126, 5, "#2b161b");
  plotRect(ctx, bx - 63, by + 43, Math.max(1, Math.round(126 * totalPct)), 5, warn ? "#ff5c42" : "#5ef2d6");
  ctx.font = "700 9px 'Be Vietnam Pro', sans-serif";
  drawCrispPixelText(ctx, boss.name || "VẠN THỦ BÀN LONG", bx, by + 37, "#ffe49c", "#06080d");

  ctx.restore();
}

/**
 * 4. CỘT ĐÁ CHẠM KHẮC RỒNG CUỘN (64x112, 4 frame — dùng cho Trụ Huyết Mạch, Hoàng Kim, Cột Che Chắn & Trụ Mây Cảnh Quan).
 */
export function getBanLongPillarFrames(kind = "cloud") {
  if (PILLAR_CACHE.has(kind)) return PILLAR_CACHE.get(kind);

  const W = 64;
  const H = 112;
  const anchorX = 32;
  const anchorY = 98;
  const frames = [];

  const accentRamp =
    kind === "blood"
      ? ["#26070d", "#5c111f", "#9e1c34", "#de354c", "#ff7085"]
      : kind === "gold"
        ? BRONZE_RAMP
        : kind === "stone"
          ? ["#0b2626", "#164f4d", "#248780", "#45c7ba", "#a6fff2"]
          : ["#0d1e21", "#1a3b40", "#295c63", "#468a91", "#85d6d0"];

  const stoneBase = kind === "gold" ? BRONZE_RAMP : SLATE_RAMP;

  for (let f = 0; f < 4; f++) {
    const { canvas, ctx } = createPixelCanvas(W, H);
    if (!ctx) {
      frames.push({ canvas, anchorX, anchorY, solidRadius: 15 });
      continue;
    }

    const tmp = createPixelCanvas(W, H);
    const g = tmp.ctx;

    // Chân bệ bát giác đá cổ rêu phong
    fillPixelOctagon(g, 32, 96, 19, 8, stoneBase[0]);
    fillPixelOctagon(g, 32, 93, 17, 7, stoneBase[3]);
    plotRect(g, 18, 86, 28, 8, stoneBase[0]);
    plotRect(g, 19, 87, 26, 6, stoneBase[4]);

    // Thân trụ đá 6 sắc độ + vảy nứt rêu
    plotRect(g, 22, 20, 20, 68, stoneBase[0]);
    plotRect(g, 23, 21, 18, 66, stoneBase[2]);
    plotRect(g, 24, 21, 7, 66, stoneBase[4]);
    plotRect(g, 25, 22, 2, 64, stoneBase[5]);
    plotRect(g, 37, 21, 4, 66, stoneBase[1]);

    // Chỏm mây cổ + bảo châu đỉnh cột
    plotRect(g, 17, 14, 30, 8, stoneBase[0]);
    plotRect(g, 18, 15, 28, 6, stoneBase[4]);
    plotRect(g, 25, 7, 14, 8, accentRamp[0]);
    plotRect(g, 26, 8, 12, 6, accentRamp[f % 2 === 0 ? 3 : 4]);
    plotRect(g, 29, 9, 4, 3, "#fff8dc");

    // Rồng điêu khắc quấn quanh thân trụ từ dưới lên đỉnh
    for (let s = 0; s <= 12; s++) {
      const t = s / 12;
      const sx = Math.round(32 + Math.sin(t * Math.PI * 2.6) * 11);
      const sy = Math.round(82 - t * 52);
      const litPulse = (f + Math.floor(s / 3)) % 4 === 0;
      drawLayeredDragonScale(g, sx, sy, 9, 7, SCALE_RAMP, litPulse ? accentRamp[4] : accentRamp[2]);
    }
    // Đầu rồng chạm khắc nhô ra ở 1/3 trên của trụ
    plotRect(g, 21, 27, 15, 11, SLATE_RAMP[0]);
    plotRect(g, 22, 28, 13, 9, SLATE_RAMP[4]);
    plotRect(g, 20, 24, 3, 5, HORN_RAMP[4]);
    plotRect(g, 33, 24, 3, 5, HORN_RAMP[4]);
    plotRect(g, 25, 31, 3, 2, accentRamp[4]); // Mắt rồng sáng
    plotRect(g, 30, 31, 3, 2, accentRamp[4]);

    // Mảng rêu bám chân trụ
    plotRect(g, 19, 86, 6, 4, MOSS_RAMP[2]);
    plotRect(g, 34, 70, 5, 6, MOSS_RAMP[3]);

    applySelectiveOutline(g, W, H, "#1d2836", "#05070a");

    // Bóng pixel dưới chân cột
    for (let dy = -5; dy <= 5; dy++) {
      for (let dx = -19; dx <= 19; dx++) {
        if ((dx * dx) / 361 + (dy * dy) / 25 > 1) continue;
        if (bayerThreshold(dx, dy) < 0.55) {
          ctx.fillStyle = "rgba(4, 6, 10, 0.45)";
          ctx.fillRect(anchorX + dx, anchorY + dy + 2, 1, 1);
        }
      }
    }
    ctx.drawImage(tmp.canvas, 0, 0);
    frames.push({ canvas, anchorX, anchorY, solidRadius: 15 });
  }

  PILLAR_CACHE.set(kind, frames);
  return frames;
}

export function drawBanLongMechanicPillar(ctx, p, boss, time, breathWarn = 0) {
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  const px = Math.round(p.x);
  const py = Math.round(p.y);
  const f = Math.floor(time * 4.5 + px * 0.05) % 4;

  // Dây huyết mạch pixel truyền sinh lực về Bàn Long
  if (p.kind === "blood" && boss) {
    plotPixelLine(ctx, px, py - 52, boss.x, boss.y - 46, "rgba(217, 45, 72, 0.65)", 2);
    for (let k = 0; k < 4; k++) {
      const orbT = (time * 0.85 + k * 0.25) % 1;
      const ox = Math.round(px + (boss.x - px) * orbT);
      const oy = Math.round(py - 52 + (boss.y - 46 - (py - 52)) * orbT - Math.sin(orbT * Math.PI) * 16);
      plotRect(ctx, ox - 2, oy - 2, 4, 4, "#ff5c77");
      plotRect(ctx, ox - 1, oy - 1, 2, 2, "#ffd1da");
    }
  }

  // Vòng bảo hộ bát giác pixel sau Cột Đá khi Boss chuẩn bị phun Long Tức
  if (p.kind === "stone" && breathWarn > 0) {
    const pulse = 0.45 + Math.sin(time * 7) * 0.25;
    ctx.globalAlpha = pulse * 0.5;
    fillPixelOctagon(ctx, px, py + 16, 28, 13, "#1f7870");
    ctx.globalAlpha = 0.92;
    strokePixelOctagon(ctx, px, py + 16, 28, 13, "#6cf7e0", 3, f);
    ctx.globalAlpha = 1;
  } else if (p.kind === "gold") {
    strokePixelOctagon(ctx, px, py + 2, 22, 10, "#e6b84c", 4, f);
  }

  const frames = getBanLongPillarFrames(p.kind);
  const spr = frames[f] ?? frames[0];
  if (spr) {
    ctx.drawImage(spr.canvas, Math.round(px - spr.anchorX), Math.round(py - spr.anchorY));
  }

  if (p.kind !== "stone") {
    const pct = Math.max(0, Math.min(1, p.hp / Math.max(1, p.maxHp)));
    plotRect(ctx, px - 18, py - 98, 36, 5, "#06080d");
    plotRect(ctx, px - 17, py - 97, 34, 3, "#211618");
    plotRect(ctx, px - 17, py - 97, Math.max(1, Math.round(34 * pct)), 3, p.kind === "blood" ? "#ff4d6d" : "#ffd257");
  }
  ctx.font = "700 8px 'Be Vietnam Pro', sans-serif";
  drawCrispPixelText(
    ctx,
    p.label,
    px,
    py - 103,
    p.kind === "blood" ? "#ffb3c1" : p.kind === "gold" ? "#ffe680" : "#b8f7eb",
    "#06080d"
  );
  ctx.restore();
}

/**
 * 5. CÁC CÔNG TRÌNH & CẢNH QUAN BÀN LONG (Tượng Đá Rồng Cuộn, Bệ Tế Hỏa Long, Mảnh Tường Vỡ, Trụ Mây, Cổng 128x160).
 */
export function getBanLongPropFrames(kind) {
  if (PROP_FRAMES_CACHE.has(kind)) return PROP_FRAMES_CACHE.get(kind);

  if (kind === "ban_long_cloud_pillar") {
    const f = getBanLongPillarFrames("cloud");
    PROP_FRAMES_CACHE.set(kind, f);
    return f;
  }

  const frames = [];

  if (kind === "ban_long_statue") {
    // Tượng Đá Bàn Long Rêu Phong uy nghiêm (96x144, 4 frame mắt phát sáng)
    const W = 96;
    const H = 144;
    const anchorX = 48;
    const anchorY = 128;
    for (let f = 0; f < 4; f++) {
      const { canvas, ctx } = createPixelCanvas(W, H);
      if (!ctx) {
        frames.push({ canvas, anchorX, anchorY, solidRadius: 22 });
        continue;
      }
      const tmp = createPixelCanvas(W, H);
      const g = tmp.ctx;

      // Bệ đá hai tầng rêu phong
      fillPixelOctagon(g, 48, 126, 36, 12, SLATE_RAMP[0]);
      fillPixelOctagon(g, 48, 122, 33, 10, SLATE_RAMP[3]);
      fillPixelOctagon(g, 48, 114, 24, 8, SLATE_RAMP[4]);

      // Bia đá khắc mây trung tâm
      plotRect(g, 36, 32, 24, 82, SLATE_RAMP[0]);
      plotRect(g, 38, 34, 20, 78, SLATE_RAMP[2]);
      plotRect(g, 38, 34, 7, 78, SLATE_RAMP[4]);

      // Thân tượng rồng đá cuộn quanh bia (vảy 6 sắc độ đá)
      for (let s = 0; s <= 18; s++) {
        const t = s / 18;
        const sx = Math.round(48 + Math.sin(t * Math.PI * 2.5) * 18);
        const sy = Math.round(112 - t * 68);
        drawLayeredDragonScale(g, sx, sy, 13, 10, SLATE_RAMP, s % 3 === 0 ? MOSS_RAMP[3] : null);
      }
      // Đầu tượng rồng đá ngẩng cao + sừng gạc + mắt đồng rực nhẹ theo 4 frame
      paintDitherPolygon(g, 48, 32, [[32, 22], [64, 22], [66, 38], [30, 38]], SLATE_RAMP, { bias: 0.1 });
      plotPixelLine(g, 37, 23, 25, 11, SLATE_RAMP[5], 2);
      plotPixelLine(g, 59, 23, 71, 11, SLATE_RAMP[5], 2);
      plotPixelLine(g, 30, 16, 31, 9, SLATE_RAMP[5], 1);
      plotPixelLine(g, 66, 16, 65, 9, SLATE_RAMP[5], 1);
      const eyeC = f === 1 || f === 2 ? "#ffd257" : "#9c742b";
      plotRect(g, 39, 28, 4, 2, eyeC);
      plotRect(g, 53, 28, 4, 2, eyeC);

      // Mảng rêu bám thân tượng
      plotRect(g, 28, 108, 12, 7, MOSS_RAMP[2]);
      plotRect(g, 52, 88, 9, 8, MOSS_RAMP[3]);

      applySelectiveOutline(g, W, H, "#1f2b38", "#05070a");
      ctx.fillStyle = "rgba(4, 6, 10, 0.45)";
      fillPixelOctagon(ctx, anchorX, anchorY + 2, 34, 9, "rgba(4, 6, 10, 0.45)");
      ctx.drawImage(tmp.canvas, 0, 0);
      frames.push({ canvas, anchorX, anchorY, solidRadius: 22 });
    }
  } else if (kind === "ban_long_brazier") {
    // Bệ Tế Đá Đầu Rồng & Lửa Linh Cổ (64x96, 4 frame ngọn lửa bùng nhẹ)
    const W = 64;
    const H = 96;
    const anchorX = 32;
    const anchorY = 80;
    for (let f = 0; f < 4; f++) {
      const { canvas, ctx } = createPixelCanvas(W, H);
      if (!ctx) {
        frames.push({ canvas, anchorX, anchorY, solidRadius: 15 });
        continue;
      }
      const tmp = createPixelCanvas(W, H);
      const g = tmp.ctx;

      fillPixelOctagon(g, 32, 76, 20, 8, SLATE_RAMP[0]);
      fillPixelOctagon(g, 32, 73, 18, 7, SLATE_RAMP[3]);
      plotRect(g, 21, 48, 22, 26, SLATE_RAMP[2]);
      plotRect(g, 22, 49, 7, 24, SLATE_RAMP[4]);
      // Đầu rồng chạm nổi giữ miệng lò
      plotRect(g, 14, 34, 36, 16, SLATE_RAMP[0]);
      plotRect(g, 16, 36, 32, 12, BRONZE_RAMP[2]);
      plotRect(g, 18, 37, 28, 4, BRONZE_RAMP[4]);
      plotRect(g, 26, 41, 12, 6, SLATE_RAMP[3]);
      plotPixel(g, 22, 42, "#ffd257");
      plotPixel(g, 41, 42, "#ffd257");

      // Lửa linh khí lam-đồng cổ 4 frame
      const shift = f === 1 ? -1 : f === 3 ? 1 : 0;
      plotRect(g, 22, 28, 20, 8, "#165c58");
      plotRect(g, 24 + shift, 22, 16, 10, "#2db8a8");
      plotRect(g, 27 + shift, 16, 10, 10, "#6ef7df");
      plotRect(g, 30, 11 - (f % 2), 4, 9, "#e6fff8");
      plotPixel(g, 24 + shift * 2, 14 - f, "#a6fff2");
      plotPixel(g, 38 - shift, 12 + (f % 2), "#ffd875");

      applySelectiveOutline(g, W, H, "#1e2936", "#05070a");
      fillPixelOctagon(ctx, anchorX, anchorY + 2, 20, 7, "rgba(4, 6, 10, 0.45)");
      ctx.drawImage(tmp.canvas, 0, 0);
      frames.push({ canvas, anchorX, anchorY, solidRadius: 15 });
    }
  } else if (kind === "ban_long_ruin_wall") {
    // Mảnh tường đá vỡ chạm rồng mây rêu phong (96x80)
    const W = 96;
    const H = 80;
    const anchorX = 48;
    const anchorY = 66;
    const { canvas, ctx } = createPixelCanvas(W, H);
    if (ctx) {
      const tmp = createPixelCanvas(W, H);
      const g = tmp.ctx;

      // Hàng đá vỡ bậc thang
      plotRect(g, 10, 32, 26, 36, SLATE_RAMP[2]);
      plotRect(g, 36, 22, 28, 46, SLATE_RAMP[3]);
      plotRect(g, 64, 40, 22, 28, SLATE_RAMP[2]);
      // Khe gạch & ánh sáng cạnh trên
      plotRect(g, 10, 32, 26, 3, SLATE_RAMP[5]);
      plotRect(g, 36, 22, 28, 3, SLATE_RAMP[5]);
      plotRect(g, 64, 40, 22, 3, SLATE_RAMP[4]);
      for (let py = 28; py < 66; py += 9) {
        plotRect(g, 12, py, 72, 1, SLATE_RAMP[0]);
      }
      // Hoa văn rồng mây chạm chìm giữa tường
      plotRect(g, 41, 32, 18, 16, SLATE_RAMP[1]);
      plotPixelLine(g, 43, 44, 56, 35, BRONZE_RAMP[3], 2);
      plotPixel(g, 55, 36, "#ffd257");
      // Tảng đá rơi & rêu
      plotRect(g, 70, 62, 12, 8, SLATE_RAMP[3]);
      plotRect(g, 14, 62, 14, 6, MOSS_RAMP[2]);
      plotRect(g, 48, 56, 12, 8, MOSS_RAMP[3]);

      applySelectiveOutline(g, W, H, "#1c2633", "#05070a");
      plotRect(ctx, 10, 64, 76, 8, "rgba(4, 6, 10, 0.42)");
      ctx.drawImage(tmp.canvas, 0, 0);
    }
    frames.push({ canvas, anchorX, anchorY, solidRadius: 20 });
  }

  PROP_FRAMES_CACHE.set(kind, frames);
  return frames;
}

/**
 * Cổng Sơn Môn Đá Cổ Bàn Long (128x160, 4 frame — lối đi thông thoáng chính giữa, 0 vòng tròn bẹt).
 */
export function getBanLongGateSprite(frameIdx = 0) {
  const f = ((frameIdx % 4) + 4) % 4;
  if (BAN_LONG_GATE_CACHE[f]) return BAN_LONG_GATE_CACHE[f];

  const W = 128;
  const H = 160;
  const anchorX = 64;
  const anchorY = 142;
  const { canvas, ctx } = createPixelCanvas(W, H);
  if (!ctx) {
    const stub = { canvas, anchorX, anchorY, solidRadius: 0 };
    BAN_LONG_GATE_CACHE[f] = stub;
    return stub;
  }

  // Sương mù cổ ngữ bảng lảng trong vòm cổng (Bayer dithered, không che nhân vật)
  const shift = f * 3;
  for (let y = 94; y <= 140; y++) {
    const t = (y - 94) / 46;
    for (let x = 36; x <= 92; x++) {
      const fade = Math.min(1, Math.min(x - 36, 92 - x) / 14);
      const wave = 0.25 + 0.3 * Math.sin((x + shift) * 0.14 + y * 0.2);
      if (bayerThreshold(x + shift, y) < fade * wave * (0.45 + t * 0.45)) {
        ctx.fillStyle = "rgba(84, 214, 198, 0.2)";
        ctx.fillRect(x, y, 1, 1);
      }
    }
  }

  // Hai trụ đá chạm rồng cuộn bên trái/phải đường đi
  for (const [px, side] of [[14, -1], [96, 1]]) {
    plotRect(ctx, px - 2, 126, 22, 14, SLATE_RAMP[0]);
    plotRect(ctx, px, 128, 18, 10, SLATE_RAMP[3]);
    plotRect(ctx, px, 50, 18, 78, SLATE_RAMP[0]);
    plotRect(ctx, px + 2, 52, 14, 74, SLATE_RAMP[2]);
    plotRect(ctx, px + 2, 52, 5, 74, SLATE_RAMP[4]);
    // Rồng đá quấn trụ cổng
    for (let s = 0; s < 5; s++) {
      const sy = 64 + s * 13;
      const sx = px + 9 + (s % 2 === 0 ? side * 3 : -side * 2);
      drawLayeredDragonScale(ctx, sx, sy, 8, 6, SCALE_RAMP, f === s % 4 ? "#6ef7df" : "#247870");
    }
    plotRect(ctx, px + (side < 0 ? 11 : 1), 110, 6, 8, MOSS_RAMP[2]);
  }

  // Hoành phi đá cổ & Song Long Chầu Ngọc phía trên cổng (y: 16..54)
  plotRect(ctx, 8, 42, 112, 12, SLATE_RAMP[0]);
  plotRect(ctx, 10, 44, 108, 8, SLATE_RAMP[3]);
  plotRect(ctx, 10, 44, 108, 2, SLATE_RAMP[5]);
  plotRect(ctx, 18, 28, 92, 15, SLATE_RAMP[2]);
  plotRect(ctx, 20, 29, 88, 2, SLATE_RAMP[5]);

  // Hai đầu rồng đá đối xứng chầu Long Châu giữa hoành phi
  for (const dir of [-1, 1]) {
    const dx = 64 + dir * 24;
    plotRect(ctx, dx - 9, 21, 18, 13, SLATE_RAMP[0]);
    plotRect(ctx, dx - 8, 22, 16, 11, SLATE_RAMP[4]);
    plotPixelLine(ctx, dx + dir * 4, 22, dx + dir * 12, 14, HORN_RAMP[4], 2);
    plotRect(ctx, dx - dir * 4, 26, 3, 2, "#ffd257");
  }
  // Long Châu giữa mái cổng sáng nhịp theo 4 frame
  plotRect(ctx, 58, 17, 12, 12, "#091716");
  plotRect(ctx, 59, 18, 10, 10, f % 2 === 0 ? "#249c8e" : "#4de0c9");
  plotRect(ctx, 61, 20, 6, 6, f === 1 || f === 2 ? "#e6fff8" : "#8cffeb");

  const res = { canvas, anchorX, anchorY, solidRadius: 0 };
  BAN_LONG_GATE_CACHE[f] = res;
  return res;
}

/**
 * Sương mù pixel Bayer dithered trôi dưới chân ở Khu Bàn Long.
 */
export function getBanLongMistSprite(variant = 0) {
  const v = ((variant % 3) + 3) % 3;
  if (MIST_CACHE[v]) return MIST_CACHE[v];

  const W = 128;
  const H = 42;
  const { canvas, ctx } = createPixelCanvas(W, H);
  if (ctx) {
    const cx = 64;
    const cy = 21;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const dx = (x - cx) / 60;
        const dy = (y - cy) / 18;
        const d = Math.hypot(dx, dy);
        if (d > 1) continue;
        const n = 0.5 + 0.5 * Math.sin(x * 0.08 + v * 1.7 + Math.cos(y * 0.25));
        const alpha = (1 - d) * n * 0.42;
        if (bayerThreshold(x, y) < alpha) {
          ctx.fillStyle = v === 1 ? "rgba(78, 152, 148, 0.16)" : "rgba(132, 176, 192, 0.14)";
          ctx.fillRect(x, y, 2, 1);
        }
      }
    }
  }
  MIST_CACHE[v] = canvas;
  return canvas;
}

/**
 * 6. QUÁI ĐỘC QUYỀN KHU BÀN LONG: BÀN LONG THẠCH VỆ (64x64, 4 frame — không tràn sang khu khác).
 */
export function bakeBanLongSentinelFrames() {
  if (SENTINEL_CACHE) return SENTINEL_CACHE;

  const W = 64;
  const H = 64;
  const anchorX = 32;
  const anchorY = 52;
  const barOffsetY = 52;
  const frames = [];

  for (let f = 0; f < 4; f++) {
    const { canvas, ctx } = createPixelCanvas(W, H);
    if (!ctx) {
      frames.push({ canvas, anchorX, anchorY, barOffsetY });
      continue;
    }

    const tmp = createPixelCanvas(W, H);
    const g = tmp.ctx;
    const bob = f === 1 || f === 3 ? -1 : 0;
    const stride = f === 1 ? 2 : f === 3 ? -2 : 0;

    // Đuôi rồng đá mọc sau lưng
    plotPixelLine(g, 24, 40 + bob, 11, 46 - stride, SLATE_RAMP[3], 4);
    plotPixelLine(g, 11, 46 - stride, 8, 41 - stride, HORN_RAMP[4], 2);

    // Đôi chân giáp vảy đá bước chắc
    plotRect(g, 23 - stride, 42, 7, 10, SCALE_RAMP[2]);
    plotRect(g, 34 + stride, 42, 7, 10, SCALE_RAMP[2]);
    plotRect(g, 22 - stride, 50, 8, 3, HORN_RAMP[4]);
    plotRect(g, 34 + stride, 50, 8, 3, HORN_RAMP[4]);

    // Thân giáp đá & ngực vảy đồng rêu phong
    plotDitheredBlob(g, 32, 34 + bob, 12, 11, SCALE_RAMP, { bias: 0.05 });
    plotRect(g, 27, 29 + bob, 10, 10, BRONZE_RAMP[3]);
    plotRect(g, 29, 31 + bob, 6, 4, BRONZE_RAMP[5]);
    plotRect(g, 20, 26 + bob, 6, 7, SLATE_RAMP[4]); // Giáp vai trái
    plotRect(g, 38, 26 + bob, 6, 7, SLATE_RAMP[4]); // Giáp vai phải

    // Đầu rồng hộ vệ có sừng gạc + mắt đồng sáng
    paintDitherPolygon(g, 32, 18 + bob, [[24, 12], [40, 12], [42, 23], [22, 23]], SCALE_RAMP, { bias: 0.1 });
    plotPixelLine(g, 26, 12 + bob, 20, 5 + bob, HORN_RAMP[4], 2);
    plotPixelLine(g, 38, 12 + bob, 44, 5 + bob, HORN_RAMP[4], 2);
    plotRect(g, 26, 17 + bob, 4, 2, "#ffd257");
    plotRect(g, 34, 17 + bob, 4, 2, "#ffd257");

    // Thương kích đá cổ ngọc lam bên tay phải
    plotPixelLine(g, 46, 51, 48, 12 + bob, BRONZE_RAMP[3], 2);
    plotRect(g, 46, 6 + bob, 4, 8, "#4de0c9");
    plotPixel(g, 47, 7 + bob, "#e6fff8");

    applySelectiveOutline(g, W, H, "#233345", "#05070a");

    for (let dy = -5; dy <= 5; dy++) {
      for (let dx = -16; dx <= 16; dx++) {
        if ((dx * dx) / 256 + (dy * dy) / 25 > 1) continue;
        if (bayerThreshold(dx, dy) < 0.55) {
          ctx.fillStyle = "rgba(4, 6, 10, 0.45)";
          ctx.fillRect(anchorX + dx, anchorY + dy + 1, 1, 1);
        }
      }
    }
    ctx.drawImage(tmp.canvas, 0, 0);
    frames.push({ canvas, anchorX, anchorY, barOffsetY });
  }

  SENTINEL_CACHE = frames;
  return frames;
}
