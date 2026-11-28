/**
 * PixelSpriteBaker.js — Bộ Dựng & Nung Sprite Pixel Art 16-bit/32-bit Dark Fantasy
 * - Toàn bộ sprite được vẽ bằng pixel nguyên + Bayer 4x4 Ordered Dithering + Dark Selective Outlining.
 * - Tuyệt đối KHÔNG dùng ctx.arc / ctx.ellipse / quadraticCurveTo / SVG.
 * - Cache 1 lần vào OffscreenCanvas / HTMLCanvasElement để đạt 60 FPS ổn định.
 */

export const BAYER_4X4 = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];

export function bayerThreshold(x, y) {
  return (BAYER_4X4[((y | 0) & 3)][((x | 0) & 3)] + 0.5) / 16;
}

export function createPixelCanvas(w, h, needDataUrl = false) {
  let canvas;
  if (!needDataUrl && typeof OffscreenCanvas !== "undefined") {
    canvas = new OffscreenCanvas(w, h);
  } else if (typeof document !== "undefined" && typeof document.createElement === "function") {
    canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
  } else {
    return { canvas: { width: w, height: h, isHeadlessMock: true }, ctx: null };
  }
  const ctx = canvas.getContext("2d");
  if (ctx) ctx.imageSmoothingEnabled = false;
  return { canvas, ctx };
}

function hashInt(a, b) {
  let h = ((a | 0) * 374761393 + (b | 0) * 668265263) ^ 0x5bf03635;
  h = (h ^ (h >> 13)) * 1274126177;
  return Math.abs(h ^ (h >> 16));
}

export function hexToRgb(hex) {
  const clean = String(hex || "#ffffff").replace("#", "");
  const full = clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean.padEnd(6, "0");
  const num = parseInt(full.slice(0, 6), 16) || 0;
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

export function rgbToHex(r, g, b) {
  const c = (v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`;
}

export function shadeHex(hex, mult) {
  const [r, g, b] = hexToRgb(hex);
  return rgbToHex(r * mult, g * mult, b * mult);
}

export function buildColorRamp(baseHex, darkHex = null, lightHex = null) {
  return [
    "#080a0f",
    darkHex ? shadeHex(darkHex, 0.72) : shadeHex(baseHex, 0.38),
    darkHex || shadeHex(baseHex, 0.62),
    baseHex,
    lightHex || shadeHex(baseHex, 1.24),
    lightHex ? shadeHex(lightHex, 1.18) : shadeHex(baseHex, 1.48),
  ];
}

export function plotPixel(ctx, x, y, col) {
  if (!ctx) return;
  ctx.fillStyle = col;
  ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
}

export function plotRect(ctx, x, y, w, h, col) {
  if (!ctx || w <= 0 || h <= 0) return;
  ctx.fillStyle = col;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

export function plotPixelLine(ctx, x0, y0, x1, y1, col, thickness = 1) {
  if (!ctx) return;
  let ix0 = Math.round(x0);
  let iy0 = Math.round(y0);
  const ix1 = Math.round(x1);
  const iy1 = Math.round(y1);
  const dx = Math.abs(ix1 - ix0);
  const dy = Math.abs(iy1 - iy0);
  const sx = ix0 < ix1 ? 1 : -1;
  const sy = iy0 < iy1 ? 1 : -1;
  let err = dx - dy;
  const half = Math.floor(thickness * 0.5);
  ctx.fillStyle = col;
  while (true) {
    ctx.fillRect(ix0 - half, iy0 - half, thickness, thickness);
    if (ix0 === ix1 && iy0 === iy1) break;
    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      ix0 += sx;
    }
    if (e2 < dx) {
      err += dx;
      iy0 += sy;
    }
  }
}

export function fillPixelEllipse(ctx, cx, cy, rx, ry, col, ditherMask = false) {
  if (!ctx || rx <= 0 || ry <= 0) return;
  const icx = Math.round(cx);
  const icy = Math.round(cy);
  const minX = Math.floor(-rx);
  const maxX = Math.ceil(rx);
  const minY = Math.floor(-ry);
  const maxY = Math.ceil(ry);
  ctx.fillStyle = col;
  for (let dy = minY; dy <= maxY; dy++) {
    for (let dx = minX; dx <= maxX; dx++) {
      const dist2 = (dx * dx) / (rx * rx) + (dy * dy) / (ry * ry);
      if (dist2 <= 1.0) {
        if (ditherMask && dist2 > 0.72 && ((dx + dy) & 1) !== 0) continue;
        ctx.fillRect(icx + dx, icy + dy, 1, 1);
      }
    }
  }
}

export function plotPixelEllipse(ctx, cx, cy, rx, ry, col, dashPeriod = 0, dashPhase = 0) {
  if (!ctx || rx <= 0 || ry <= 0) return;
  const icx = Math.round(cx);
  const icy = Math.round(cy);
  const steps = Math.max(24, Math.ceil(Math.max(rx, ry) * 7));
  ctx.fillStyle = col;
  let lastKey = "";
  for (let i = 0; i < steps; i++) {
    if (dashPeriod > 0 && ((i + Math.floor(dashPhase)) % dashPeriod) >= Math.ceil(dashPeriod * 0.6)) continue;
    const a = (i / steps) * Math.PI * 2;
    const px = icx + Math.round(Math.cos(a) * rx);
    const py = icy + Math.round(Math.sin(a) * ry);
    const k = `${px},${py}`;
    if (k === lastKey) continue;
    lastKey = k;
    ctx.fillRect(px, py, 1, 1);
  }
}

export function drawCrispPixelText(ctx, text, x, y, fill = "#edf2f8", outline = "#07090d", align = "center") {
  if (!ctx || !text) return;
  const ov = ctx.__labelOverlay;
  if (ov?.ctx && typeof ctx.getTransform === "function") {
    const lctx = ov.ctx;
    const m = ctx.getTransform();
    const gx = m.a * x + m.c * y + m.e;
    const gy = m.b * x + m.d * y + m.f;
    const lx = Math.round(gx * ov.scaleX);
    const ly = Math.round(gy * ov.scaleY);
    const match = /(\d+(?:\.\d+)?)px/.exec(ctx.font || "");
    const basePx = match ? parseFloat(match[1]) : 8.5;
    const fontPx = Math.max(Math.round(10.5 * ov.dpr), Math.round(basePx * ov.scaleY * Math.abs(m.d || 1)));
    lctx.save();
    lctx.setTransform(1, 0, 0, 1, 0, 0);
    lctx.globalAlpha = ctx.globalAlpha;
    lctx.font = `700 ${fontPx}px 'Be Vietnam Pro', 'Segoe UI', sans-serif`;
    lctx.textAlign = align;
    lctx.lineJoin = "round";
    lctx.miterLimit = 2;
    lctx.lineWidth = Math.max(2.5, Math.round(fontPx * 0.24));
    lctx.strokeStyle = outline;
    lctx.strokeText(text, lx, ly);
    lctx.fillStyle = fill;
    lctx.fillText(text, lx, ly);
    lctx.restore();
    return;
  }
  const ix = Math.round(x);
  const iy = Math.round(y);
  ctx.textAlign = align;
  ctx.fillStyle = outline;
  ctx.fillText(text, ix - 1, iy);
  ctx.fillText(text, ix + 1, iy);
  ctx.fillText(text, ix, iy - 1);
  ctx.fillText(text, ix, iy + 1);
  ctx.fillStyle = fill;
  ctx.fillText(text, ix, iy);
}

const GLOW_SPRITE_CACHE = new Map();
export function getDitherGlowSprite(colorHex, radius = 14, maxAlpha = 0.48) {
  const key = `${colorHex}_${radius}_${maxAlpha}`;
  if (GLOW_SPRITE_CACHE.has(key)) return GLOW_SPRITE_CACHE.get(key);
  const size = radius * 2 + 2;
  const { canvas, ctx } = createPixelCanvas(size, size);
  if (ctx) {
    const [r, g, b] = hexToRgb(colorHex);
    const cx = radius + 1;
    const cy = radius + 1;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const d = Math.hypot(x - cx, y - cy) / radius;
        if (d > 1) continue;
        const falloff = Math.pow(1 - d, 1.55);
        if (bayerThreshold(x, y) < falloff) {
          const a = Math.max(0.08, Math.min(maxAlpha, falloff * maxAlpha));
          ctx.fillStyle = `rgba(${r},${g},${b},${a.toFixed(2)})`;
          ctx.fillRect(x, y, 1, 1);
        }
      }
    }
  }
  GLOW_SPRITE_CACHE.set(key, canvas);
  return canvas;
}

/**
 * Dark Selective Outlining: quét bitmap gốc vẽ viền 1px (trên-trái hơi sáng pha sắc độ, dưới-phải đen sẫm).
 */
export function applySelectiveOutline(ctx, w, h, topLeftCol = "#1b1d2b", botRightCol = "#08090e") {
  if (!ctx) return;
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  const copy = new Uint8ClampedArray(d);
  const isSolid = (x, y) => x >= 0 && y >= 0 && x < w && y < h && copy[(y * w + x) * 4 + 3] > 28;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (isSolid(x, y)) continue;
      const nRight = isSolid(x + 1, y);
      const nDown = isSolid(x, y + 1);
      const nLeft = isSolid(x - 1, y);
      const nUp = isSolid(x, y - 1);
      if (nRight || nDown || nLeft || nUp) {
        const isLitSide = (nRight || nDown) && !(nLeft || nUp);
        ctx.fillStyle = isLitSide ? topLeftCol : botRightCol;
        ctx.fillRect(x, y, 1, 1);
      }
    }
  }
}

/**
 * Vẽ vùng hữu cơ có dither Bayer + tô shading 5-6 cấp từ mảng lobes { cx, cy, rx, ry }.
 */
function paintShadedPixelLobes(ctx, w, h, lobes, ramp, opts = {}) {
  const mask = new Uint8Array(w * h);
  const owner = new Int16Array(w * h);
  owner.fill(-1);
  const texMode = opts.texture || "smooth"; // "fur" | "rock" | "wart" | "smooth"

  for (let li = 0; li < lobes.length; li++) {
    const l = lobes[li];
    const minX = Math.max(1, Math.floor(l.cx - l.rx - 2));
    const maxX = Math.min(w - 2, Math.ceil(l.cx + l.rx + 2));
    const minY = Math.max(1, Math.floor(l.cy - l.ry - 2));
    const maxY = Math.min(h - 2, Math.ceil(l.cy + l.ry + 2));
    for (let py = minY; py <= maxY; py++) {
      for (let px = minX; px <= maxX; px++) {
        const dx = (px - l.cx) / Math.max(1, l.rx);
        const dy = (py - l.cy) / Math.max(1, l.ry);
        let dist = Math.hypot(dx, dy);
        if (texMode === "fur") {
          const ang = Math.atan2(dy, dx);
          dist -= 0.08 * Math.sin(ang * 9 + li) + ((hashInt(px, py) % 3) * 0.03);
        } else if (texMode === "rock") {
          // Vát cạnh góc đá
          const man = (Math.abs(dx) + Math.abs(dy)) * 0.72;
          dist = dist * 0.65 + man * 0.35;
        }
        if (dist <= 1.0) {
          const idx = py * w + px;
          mask[idx] = 1;
          owner[idx] = li;
        }
      }
    }
  }

  for (let py = 1; py < h - 1; py++) {
    for (let px = 1; px < w - 1; px++) {
      const idx = py * w + px;
      if (!mask[idx]) continue;
      const li = owner[idx];
      const l = lobes[li] ?? lobes[0];
      const rx = (px - l.cx) / Math.max(1, l.rx);
      const ry = (py - l.cy) / Math.max(1, l.ry);
      let lum = 0.56 - rx * 0.25 - ry * 0.38 + (l.bias ?? 0);
      if (texMode === "fur") {
        lum += ((hashInt(px >> 1, py) % 5) - 2) * 0.07;
      } else if (texMode === "rock") {
        const facet = ((px + py) >> 2) % 2 === 0 ? 0.08 : -0.08;
        lum += facet;
      } else if (texMode === "wart") {
        if ((hashInt(px >> 1, py >> 1) % 9) === 0) lum += 0.22;
      }
      const dither = (bayerThreshold(px, py) - 0.5) * 0.16;
      const val = Math.max(0.05, Math.min(0.99, lum + dither));
      const shadeIdx = Math.min(ramp.length - 1, Math.max(1, Math.floor(val * (ramp.length - 1)) + 1));
      ctx.fillStyle = ramp[shadeIdx];
      ctx.fillRect(px, py, 1, 1);
    }
  }
}

// ============================================================================
// 1. NHÂN VẬT CHÍNH 64x64 (CỔ SƯ ĐẬM CHẤT TIÊN HIỆP DARK FANTASY)
// ============================================================================
const CHAR_SHEET_CACHE = new Map();

function drawHeroGuMaster64(ctx, ox, oy, resolved, state, frameIdx) {
  if (!ctx) return;
  const { skin, hairStyle, hairColor, headgear, outfitStyle, outfitColor, trimColor, eyeColor, backItem } = resolved;
  const outfitRamp = buildColorRamp(outfitColor.base, outfitColor.dark, outfitColor.light);
  const hairRamp = buildColorRamp(hairColor.base, hairColor.dark, hairColor.light);
  const skinRamp = [
    "#181116",
    skin.shadow,
    skin.shadow,
    skin.base,
    skin.highlight,
    skin.highlight,
  ];
  const trimRamp = buildColorRamp(trimColor.base, null, trimColor.light);

  let bobY = 0;
  let leanX = 0;
  let lLegDx = 0;
  let lLegDy = 0;
  let rLegDx = 0;
  let rLegDy = 0;
  let lArmDy = 0;
  let rArmDy = 0;
  let rArmFwd = 0;
  let ribbonSway = 0;

  if (state === "idle") {
    bobY = frameIdx === 1 || frameIdx === 2 ? 1 : 0;
    ribbonSway = frameIdx === 2 ? 2 : frameIdx === 1 ? 1 : 0;
  } else if (state === "run") {
    const cyc = [
      { b: 0, ldx: -3, ldy: -2, rdx: 3, rdy: 1, la: 2, ra: -2, sw: 3 },
      { b: -1, ldx: -1, ldy: -1, rdx: 1, rdy: 0, la: 1, ra: -1, sw: 4 },
      { b: 0, ldx: 2, ldy: 1, rdx: -2, rdy: -1, la: -1, ra: 2, sw: 2 },
      { b: 0, ldx: 3, ldy: 1, rdx: -3, rdy: -2, la: -2, ra: 2, sw: 3 },
      { b: -1, ldx: 1, ldy: 0, rdx: -1, rdy: -1, la: -1, ra: 1, sw: 4 },
      { b: 0, ldx: -2, ldy: -1, rdx: 2, rdy: 1, la: 1, ra: -1, sw: 2 },
    ][frameIdx % 6];
    bobY = cyc.b;
    lLegDx = cyc.ldx;
    lLegDy = cyc.ldy;
    rLegDx = cyc.rdx;
    rLegDy = cyc.rdy;
    lArmDy = cyc.la;
    rArmDy = cyc.ra;
    ribbonSway = cyc.sw;
    leanX = 2;
  } else if (state === "attack") {
    leanX = frameIdx === 1 || frameIdx === 2 ? 4 : frameIdx === 0 ? -1 : 1;
    bobY = frameIdx === 1 ? 1 : 0;
    rArmFwd = frameIdx === 1 ? 7 : frameIdx === 2 ? 5 : 1;
    rArmDy = frameIdx === 1 ? -4 : frameIdx === 2 ? -2 : 0;
    lArmDy = 2;
    ribbonSway = frameIdx === 1 ? -3 : -1;
  } else if (state === "sit") {
    bobY = frameIdx % 2 === 0 ? 7 : 6;
    ribbonSway = frameIdx === 1 || frameIdx === 2 ? 1 : 0;
  } else if (state === "fish") {
    bobY = frameIdx === 1 ? 1 : 0;
    rArmFwd = 4;
    rArmDy = -2;
  } else if (state === "dash") {
    leanX = 4;
    bobY = 1;
    ribbonSway = 5;
  } else if (state === "hurt") {
    leanX = -2;
    bobY = frameIdx === 0 ? -1 : 1;
  } else if (state === "death") {
    if (frameIdx === 0) {
      leanX = -2;
      bobY = 4;
    } else if (frameIdx === 1) {
      leanX = -4;
      bobY = 10;
    } else {
      // Nằm gục 64x64 chi tiết
      plotRect(ctx, ox + 12, oy + 46, 38, 9, "#08090e");
      plotRect(ctx, ox + 14, oy + 47, 34, 7, outfitRamp[2]);
      plotRect(ctx, ox + 18, oy + 47, 22, 5, outfitRamp[3]);
      plotRect(ctx, ox + 26, oy + 47, 8, 6, trimRamp[3]);
      plotRect(ctx, ox + 42, oy + 46, 8, 7, skinRamp[3]);
      plotRect(ctx, ox + 44, oy + 45, 7, 4, hairRamp[2]);
      return;
    }
  } else if (state === "tau-hoa") {
    bobY = frameIdx % 2 === 0 ? -2 : 0;
    ribbonSway = frameIdx % 2 === 0 ? 3 : -2;
  }

  // Tạo canvas tạm 64x64 để applySelectiveOutline đúng trên từng frame rồi blit vào sheet
  const tmp = createPixelCanvas(64, 64);
  const g = tmp.ctx;
  if (!g) return;

  const cx = 32 + leanX;
  const footY = 56;

  // 0. Dash pixel afterimage
  if (state === "dash") {
    g.save();
    g.globalAlpha = 0.32;
    fillPixelEllipse(g, cx - 10 - frameIdx * 3, 36 + bobY, 6, 13, trimRamp[4], true);
    fillPixelEllipse(g, cx - 15 - frameIdx * 3, 38 + bobY, 5, 10, outfitRamp[4], true);
    g.restore();
  }

  // 1. Vòng Linh Khí + Hạt Nguyên Thạch xoay khi ngồi thiền Tĩnh Tọa (`sit`)
  if (state === "sit") {
    const pulse = frameIdx === 1 || frameIdx === 2;
    plotPixelEllipse(g, cx, footY - 1, 20, 7, pulse ? "#5ef2d6" : "#2d8a78", 2, frameIdx);
    plotPixelEllipse(g, cx, footY - 1, 14, 5, "#d9b25f", 3, frameIdx * 2);
    for (let m = 0; m < 4; m++) {
      const a = (m / 4) * Math.PI * 2 + frameIdx * 0.55;
      const mx = cx + Math.round(Math.cos(a) * (17 - frameIdx * 2));
      const my = 42 + Math.round(Math.sin(a) * 5) - frameIdx * 3;
      plotRect(g, mx, my, 2, 2, m % 2 === 0 ? "#85ffea" : "#ffd86b");
      plotPixel(g, mx, my, "#ffffff");
    }
  }

  // 2. Pháp khí đeo lưng (Kiếm Cổ / Hồ Lô / Nguyệt Luân / Huyết Dực)
  if (backItem === "co_kiem") {
    plotPixelLine(g, cx - 10, 14 + bobY, cx + 8, 42 + bobY, "#94a6bd", 2);
    plotPixelLine(g, cx - 9, 14 + bobY, cx + 8, 41 + bobY, "#d8e5f5", 1);
    plotPixelLine(g, cx - 13, 18 + bobY, cx - 6, 12 + bobY, trimRamp[4], 2);
    plotRect(g, cx - 11, 12 + bobY, 3, 3, trimRamp[5]);
  } else if (backItem === "nguyet_luan") {
    plotPixelEllipse(g, cx, 26 + bobY, 14, 14, trimRamp[3], 2, 0);
    plotPixelEllipse(g, cx, 26 + bobY, 13, 13, trimRamp[5], 4, 1);
  } else if (backItem === "ho_lo") {
    fillPixelEllipse(g, cx - 10, 29 + bobY, 4, 4, "#a3631e");
    fillPixelEllipse(g, cx - 10, 35 + bobY, 5, 5, "#c47d2b");
    plotRect(g, cx - 12, 31 + bobY, 4, 2, "#c9382c");
    plotRect(g, cx - 11, 25 + bobY, 2, 2, "#fff0bd");
  } else if (backItem === "huyet_duc") {
    const wl = frameIdx % 2 === 0 ? 0 : -2;
    for (const sgn of [-1, 1]) {
      plotPixelLine(g, cx + sgn * 4, 27 + bobY, cx + sgn * 18, 17 + bobY + wl, "#590e1c", 4);
      plotPixelLine(g, cx + sgn * 6, 26 + bobY, cx + sgn * 17, 18 + bobY + wl, "#d04352", 2);
      plotPixelLine(g, cx + sgn * 8, 29 + bobY, cx + sgn * 15, 25 + bobY + wl, "#9e1c2e", 2);
    }
  }

  // 3. Tà áo choàng sau & Dải lụa tóc dài tung bay
  if (outfitStyle === "truong_bao" || outfitStyle === "ta_tu") {
    for (let y = 26 + bobY; y <= 50 + bobY; y++) {
      const t = (y - (26 + bobY)) / 24;
      const hw = Math.round(7 + t * 5);
      const sway = Math.round(ribbonSway * t);
      for (let x = cx - hw - sway; x <= cx + hw - sway; x++) {
        const edgeDist = Math.min(x - (cx - hw - sway), cx + hw - sway - x);
        let col = outfitRamp[1];
        if (y > 47 + bobY) col = trimRamp[3];
        else if (edgeDist > 2 && bayerThreshold(x, y) > 0.45) col = outfitRamp[2];
        plotPixel(g, x, y, col);
      }
    }
  }

  if (hairStyle === "tien_phong" || hairStyle === "hiep_khach" || hairStyle === "cuong_ma") {
    for (let i = 0; i < 16; i++) {
      const t = i / 15;
      const rx = cx - 4 - Math.round(ribbonSway * (0.4 + t * 1.1));
      const ry = 14 + bobY + i;
      const rw = Math.max(2, 6 - Math.floor(t * 4));
      plotRect(g, rx - Math.floor(rw * 0.5), ry, rw, 1, i % 3 === 0 ? hairRamp[1] : hairRamp[2]);
    }
    if (hairStyle === "hiep_khach") {
      // Dải lụa buộc tóc bay
      for (let i = 0; i < 12; i++) {
        const rx = cx - 4 - Math.round(i * 0.8 + ribbonSway * 0.9);
        const ry = 12 + bobY + Math.round(i * 0.5 + (i % 2 === 0 ? 0 : 1));
        plotRect(g, rx, ry, 2, 1, i % 2 === 0 ? trimRamp[4] : trimRamp[3]);
      }
    }
  }

  // 4. Chân & Hài Cổ (hoặc Xếp Bằng khi ngồi thiền)
  if (state === "sit") {
    fillPixelEllipse(g, cx, 47 + bobY, 11, 4, outfitRamp[2]);
    plotRect(g, cx - 9, 46 + bobY, 18, 3, outfitRamp[3]);
    plotRect(g, cx - 6, 47 + bobY, 4, 3, "#1f242e");
    plotRect(g, cx + 2, 47 + bobY, 4, 3, "#1f242e");
  } else {
    // Chân trái & phải tách biệt có ủng cổ viền chỉ vàng/bạc
    for (const [bx, dy, dark] of [
      [cx - 4 + lLegDx, lLegDy, true],
      [cx + 2 + rLegDx, rLegDy, false],
    ]) {
      plotRect(g, bx - 2, 42 + dy, 4, 9, dark ? outfitRamp[1] : outfitRamp[2]);
      // Hài cổ chiến đấu
      plotRect(g, bx - 2, 49 + dy, 5, 6, "#171921");
      plotRect(g, bx - 1, 50 + dy, 3, 4, "#292f3d");
      plotRect(g, bx - 2, 54 + dy, 6, 2, "#12141a");
      plotRect(g, bx - 2, 49 + dy, 4, 1, trimRamp[3]);
    }
  }

  // 5. Thân Trường Bào Giao Lĩnh 6-Shade Bayer + Cổ Văn + Ngọc Bội Thắt Lưng
  const robeBot = state === "sit" ? 45 + bobY : 48 + bobY;
  for (let y = 23 + bobY; y <= robeBot; y++) {
    const t = (y - (23 + bobY)) / Math.max(1, robeBot - (23 + bobY));
    const hw = y < 34 + bobY ? 7 : Math.round(7 + (t - 0.4) * 5);
    for (let x = cx - hw; x <= cx + hw; x++) {
      // Vạt trước xẻ giữa từ thắt lưng trở xuống
      if (y >= 36 + bobY && x === cx && state !== "sit") continue;
      const rx = (x - cx) / hw;
      const lum = 0.55 - rx * 0.28 + (t < 0.35 ? 0.1 : -0.08);
      const sh = Math.min(5, Math.max(1, Math.floor((lum + (bayerThreshold(x, y) - 0.5) * 0.18) * 5) + 1));
      plotPixel(g, x, y, outfitRamp[sh]);
    }
  }

  // Cổ áo V giao lĩnh + Huyền Thiết Giáp nếu là Chiến Giáp
  for (let i = 0; i < 7; i++) {
    plotRect(g, cx - 4 + Math.floor(i * 0.6), 23 + bobY + i, 2, 1, trimRamp[4]);
    plotRect(g, cx + 3 - Math.floor(i * 0.6), 23 + bobY + i, 2, 1, trimRamp[3]);
  }
  plotRect(g, cx - 2, 23 + bobY, 4, 2, skinRamp[2]);
  if (outfitStyle === "chien_giap") {
    plotRect(g, cx - 10, 23 + bobY, 5, 4, trimRamp[3]);
    plotRect(g, cx + 5, 23 + bobY, 5, 4, trimRamp[3]);
    plotRect(g, cx - 5, 26 + bobY, 10, 6, "#657285");
    plotRect(g, cx - 3, 27 + bobY, 6, 4, "#97a7bf");
  }

  // Thắt lưng + Khóa Đồng + Ngọc Bội Đeo Hông
  plotRect(g, cx - 7, 34 + bobY, 14, 3, "#14161f");
  plotRect(g, cx - 7, 34 + bobY, 14, 1, trimRamp[3]);
  plotRect(g, cx - 2, 34 + bobY, 4, 3, trimRamp[5]);
  // Ngọc bội bên hông trái + tua rua
  plotRect(g, cx - 7, 37 + bobY, 3, 4, "#3ee6c5");
  plotPixel(g, cx - 6, 38 + bobY, "#d4fff6");
  plotRect(g, cx - 6, 41 + bobY, 1, 3, "#c43343");

  // Cổ văn viền gấu áo dưới
  if (state !== "sit") {
    for (let x = cx - 8; x <= cx + 8; x += 2) {
      plotPixel(g, x, 46 + bobY, trimRamp[3]);
    }
  }

  // 6. Tay Áo & Hộ Uyển
  const laX = cx - 9;
  const laY = 25 + bobY + lArmDy;
  plotRect(g, laX, laY, 3, 8, outfitRamp[2]);
  plotRect(g, laX, laY + 7, 3, 3, trimRamp[3]);
  plotRect(g, laX, laY + 10, 3, 3, skinRamp[3]);

  const raX = cx + 6 + rArmFwd;
  const raY = 25 + bobY + rArmDy;
  plotRect(g, cx + 6, 25 + bobY, Math.max(3, rArmFwd + 3), 5, outfitRamp[3]);
  plotRect(g, raX, raY, 3, 7, outfitRamp[4]);
  plotRect(g, raX, raY + 6, 3, 3, trimRamp[4]);
  plotRect(g, raX, raY + 9, 3, 3, skinRamp[3]);

  // Cần câu trúc khi `fish`
  if (state === "fish") {
    plotPixelLine(g, raX + 2, raY + 9, raX + 16, raY - 7, "#9c7036", 1);
    plotPixelLine(g, raX + 16, raY - 7, raX + 16, raY + 15, "#e0f2f0", 1);
    plotPixel(g, raX + 16, raY + 15, "#e04848");
  }

  // Vệt chém Pixel Smear sắc lẹm khi `attack`
  if (state === "attack" && (frameIdx === 1 || frameIdx === 2)) {
    const colA = trimRamp[5];
    const colB = outfitRamp[4];
    for (let i = -9; i <= 9; i++) {
      const sy = 31 + bobY + i;
      const sx = cx + 12 + Math.round(Math.sqrt(Math.max(0, 81 - i * i)) * 0.9);
      plotRect(g, sx - 2, sy, 4, 1, colB);
      plotRect(g, sx, sy, 3, 1, colA);
      plotPixel(g, sx + 2, sy, "#ffffff");
    }
  }

  // 7. Đầu & Gương Mặt Sắc Lạnh 64x64
  const headY = 12 + bobY;
  fillPixelEllipse(g, cx, headY + 6, 6, 6, skinRamp[3]);
  plotRect(g, cx - 5, headY + 2, 4, 7, skinRamp[4]);
  plotRect(g, cx + 3, headY + 3, 2, 6, skinRamp[1]);
  // Cằm nhọn
  plotRect(g, cx - 3, headY + 11, 6, 2, skinRamp[2]);

  // Mắt sắc 2x2px phát sáng + chân mày kiếm
  const eyeHex = state === "tau-hoa" ? "#ff2a4d" : eyeColor.hex;
  plotRect(g, cx - 4, headY + 5, 3, 1, hairRamp[1]);
  plotRect(g, cx + 1, headY + 5, 3, 1, hairRamp[1]);
  plotRect(g, cx - 4, headY + 6, 3, 2, "#0b0d14");
  plotRect(g, cx + 1, headY + 6, 3, 2, "#0b0d14");
  plotRect(g, cx - 3, headY + 6, 2, 2, eyeHex);
  plotRect(g, cx + 1, headY + 6, 2, 2, eyeHex);
  plotPixel(g, cx - 3, headY + 6, "#ffffff");
  plotPixel(g, cx + 1, headY + 6, "#ffffff");

  if (headgear === "anh_sat") {
    plotRect(g, cx - 5, headY + 9, 10, 4, "#151824");
    plotRect(g, cx - 4, headY + 10, 8, 1, trimRamp[3]);
  }

  // 8. Kiểu Tóc & Mũ/Quán
  if (hairStyle === "kho_tu") {
    plotRect(g, cx - 1, headY + 3, 2, 1, trimRamp[4]);
  } else {
    fillPixelEllipse(g, cx, headY + 2, 7, 3, hairRamp[3]);
    plotRect(g, cx - 6, headY + 2, 2, 8, hairRamp[2]);
    plotRect(g, cx + 4, headY + 2, 2, 8, hairRamp[2]);
    plotRect(g, cx - 4, headY, 8, 2, hairRamp[4]);
    // Lọn tóc mái rủ sắc nét
    plotRect(g, cx - 2, headY + 3, 2, 3, hairRamp[3]);
    plotRect(g, cx + 2, headY + 3, 1, 3, hairRamp[3]);

    if (hairStyle === "hiep_khach") {
      plotRect(g, cx - 3, headY - 4, 6, 5, hairRamp[3]);
      plotRect(g, cx - 2, headY - 3, 4, 2, hairRamp[4]);
      plotRect(g, cx - 3, headY, 6, 1, trimRamp[4]);
    } else if (hairStyle === "linh_dong") {
      plotRect(g, cx - 8, headY + 1, 3, 4, hairRamp[3]);
      plotRect(g, cx + 5, headY + 1, 3, 4, hairRamp[3]);
    } else if (hairStyle === "cuong_ma") {
      plotRect(g, cx - 7, headY - 2, 3, 4, hairRamp[4]);
      plotRect(g, cx + 4, headY - 2, 3, 4, hairRamp[4]);
      plotRect(g, cx - 2, headY - 4, 4, 4, hairRamp[5]);
    }
  }

  if (headgear === "ngoc_quan") {
    plotRect(g, cx - 3, headY - 4, 6, 4, trimRamp[4]);
    plotRect(g, cx - 1, headY - 3, 2, 2, "#5ef2d6");
    plotRect(g, cx - 5, headY - 2, 10, 1, trimRamp[5]);
  } else if (headgear === "dau_lap") {
    plotRect(g, cx - 13, headY + 1, 26, 2, "#73582d");
    plotRect(g, cx - 10, headY - 1, 20, 2, "#9c783e");
    plotRect(g, cx - 6, headY - 3, 12, 2, "#bf9754");
    plotRect(g, cx - 2, headY - 5, 4, 2, trimRamp[4]);
  } else if (headgear === "sung_ma") {
    plotPixelLine(g, cx - 5, headY, cx - 8, headY - 5, "#b8283c", 2);
    plotPixelLine(g, cx + 5, headY, cx + 8, headY - 5, "#b8283c", 2);
  } else if (headgear === "kim_co") {
    plotRect(g, cx - 6, headY + 2, 12, 1, "#ffd86b");
    plotRect(g, cx - 1, headY + 1, 2, 2, "#d0573c");
  }

  // Selective Outline trên bản 64x64 rồi blit vào vị trí frame
  applySelectiveOutline(g, 64, 64, "#1c1f30", "#07090e");

  if (state === "hurt" && frameIdx === 0) {
    g.save();
    g.globalAlpha = 0.4;
    g.fillStyle = "#ff4d6a";
    g.fillRect(cx - 8, 12, 16, 40);
    g.restore();
  } else if (state === "tau-hoa") {
    plotRect(g, cx - 14, 20 + (frameIdx % 3) * 4, 2, 3, "#ff385c");
    plotRect(g, cx + 12, 22 + ((frameIdx + 1) % 3) * 4, 2, 3, "#c066ff");
  }

  ctx.drawImage(tmp.canvas, ox, oy);
}

export function bakeCharacterSheets64(resolved, cacheKey) {
  if (CHAR_SHEET_CACHE.has(cacheKey)) return CHAR_SHEET_CACHE.get(cacheKey);

  const states = [
    ["idle", 4, 6, true],
    ["run", 6, 11, true],
    ["attack", 4, 15, false],
    ["dash", 3, 14, false],
    ["sit", 4, 5, true],
    ["fish", 2, 3, true],
    ["hurt", 2, 10, false],
    ["death", 3, 6, false],
    ["tau-hoa", 4, 10, true],
  ];

  const fw = 64;
  const fh = 64;
  const bundle = { appearance: resolved.norm, cacheKey };

  for (const [state, count, fps, loop] of states) {
    const { canvas, ctx } = createPixelCanvas(fw * count, fh);
    const frames = [];
    for (let i = 0; i < count; i++) {
      drawHeroGuMaster64(ctx, i * fw, 0, resolved, state, i);
      frames.push({ frame: { x: i * fw, y: 0, w: fw, h: fh } });
    }
    bundle[state] = {
      key: `gu_master_64/${state}`,
      image: canvas,
      frames,
      meta: { size: { w: fw * count, h: fh } },
      pixelfx: { fps, loop, pivot: [32, 56] },
    };
  }

  if (CHAR_SHEET_CACHE.size > 48) CHAR_SHEET_CACHE.delete(CHAR_SHEET_CACHE.keys().next().value);
  CHAR_SHEET_CACHE.set(cacheKey, bundle);
  return bundle;
}

const AURA_CACHE = new Map();
export function bakeEssenceAuraFrames(colorHex) {
  if (AURA_CACHE.has(colorHex)) return AURA_CACHE.get(colorHex);
  const frames = [];
  const bright = shadeHex(colorHex, 1.35);
  const mid = colorHex;
  const dark = shadeHex(colorHex, 0.55);
  for (let f = 0; f < 4; f++) {
    const { canvas, ctx } = createPixelCanvas(32, 16);
    if (ctx) {
      fillPixelEllipse(ctx, 16, 8, 13, 5, "rgba(6, 9, 14, 0.55)", false);
      plotPixelEllipse(ctx, 16, 8, 13, 5, mid, 3, f);
      plotPixelEllipse(ctx, 16, 8, 10, 4, dark, 2, f);
      for (let m = 0; m < 4; m++) {
        const a = (m / 4) * Math.PI * 2 + f * 0.45;
        const mx = 16 + Math.round(Math.cos(a) * 13);
        const my = 8 + Math.round(Math.sin(a) * 5) - ((f + m) % 2);
        plotRect(ctx, mx - 1, my - 1, 2, 2, bright);
        plotPixel(gDot(ctx), mx, my, "#ffffff");
      }
    }
    frames.push(canvas);
  }
  function gDot(c) { return c; }
  AURA_CACHE.set(colorHex, frames);
  return frames;
}

export function bakePortrait88(canvas, resolved, bgTint = "#1b332b") {
  if (!canvas || typeof canvas.getContext !== "function") return;
  const ctx = canvas.getContext("2d");
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  ctx.imageSmoothingEnabled = false;

  // Nền Bayer Dithered tối cổ phong
  const bgRamp = ["#07090e", "#0e161d", bgTint, shadeHex(bgTint, 1.25)];
  for (let y = 0; y < h; y += 2) {
    for (let x = 0; x < w; x += 2) {
      const d = Math.hypot(x - w * 0.5, y - h * 0.45) / (w * 0.55);
      const val = Math.max(0, Math.min(1, 1 - d + (bayerThreshold(x >> 1, y >> 1) - 0.5) * 0.2));
      const idx = Math.min(3, Math.floor(val * 3.9));
      ctx.fillStyle = bgRamp[idx];
      ctx.fillRect(x, y, 2, 2);
    }
  }

  plotPixelEllipse(ctx, w * 0.5, h * 0.46, Math.round(w * 0.36), Math.round(h * 0.36), "#9c7a44", 3, 0);

  const sheets = bakeCharacterSheets64(resolved, resolved.cacheKey || "portrait_def");
  const frm = sheets.idle?.image;
  if (frm) {
    // Zoom phần đầu & thân trên của sprite 64x64 lên ô 88x88
    ctx.drawImage(frm, 8, 6, 48, 46, 4, 4, w - 8, h - 8);
  }
}

// ============================================================================
// 2. QUÁI VẬT ĐẶC TRƯNG 64x64 / 76x72 (CHI TIẾT & HUNG DỮ)
// ============================================================================
const MONSTER_64_CACHE = new Map();

function buildDaTru64(isKing) {
  const W = isKing ? 76 : 64;
  const H = isKing ? 68 : 64;
  const anchorX = Math.round(W * 0.5);
  const anchorY = H - 10;
  const barOffsetY = isKing ? 58 : 50;
  const ramp = isKing
    ? ["#120906", "#2b1209", "#4f2110", "#7d381b", "#ad582b", "#d98841"]
    : ["#100906", "#24130b", "#3d2214", "#5c351e", "#824e2d", "#ad6e42"];
  const crestCol = isKing ? "#ffd15c" : "#6b3e22";

  const frames = [];
  for (let f = 0; f < 4; f++) {
    const { canvas, ctx } = createPixelCanvas(W, H);
    const tmp = createPixelCanvas(W, H);
    const g = tmp.ctx;
    const sc = isKing ? 1.18 : 1.0;
    const ox = Math.round(W * 0.5);
    const oy = Math.round(H * 0.56) + (f === 1 ? -2 : f === 3 ? 1 : 0);

    // Chân & Móng guốc bước mạnh
    const stepF = f === 1 ? -3 : f === 3 ? 2 : 0;
    const stepB = f === 2 ? -3 : f === 0 ? 2 : 0;
    plotRect(g, ox - Math.round(14 * sc), oy + Math.round(6 * sc) + stepB, Math.round(6 * sc), Math.round(10 * sc), ramp[1]);
    plotRect(g, ox - Math.round(6 * sc), oy + Math.round(7 * sc) - stepB, Math.round(6 * sc), Math.round(10 * sc), ramp[2]);
    plotRect(g, ox + Math.round(6 * sc), oy + Math.round(7 * sc) + stepF, Math.round(6 * sc), Math.round(10 * sc), ramp[2]);
    plotRect(g, ox + Math.round(13 * sc), oy + Math.round(6 * sc) - stepF, Math.round(5 * sc), Math.round(10 * sc), ramp[1]);
    // Móng guốc đen
    plotRect(g, ox - Math.round(14 * sc), oy + Math.round(14 * sc) + stepB, Math.round(6 * sc), 3, "#0b0b0e");
    plotRect(g, ox + Math.round(6 * sc), oy + Math.round(15 * sc) + stepF, Math.round(6 * sc), 3, "#0b0b0e");

    // Thân Dã Trư & Bờm Vai U Cao Khổng Lồ
    paintShadedPixelLobes(
      g,
      W,
      H,
      [
        { cx: ox - 8 * sc, cy: oy, rx: 14 * sc, ry: 11 * sc, bias: -0.05 }, // Hông
        { cx: ox + 3 * sc, cy: oy - 4 * sc, rx: 15 * sc, ry: 14 * sc, bias: 0.1 }, // Bờm vai u lên
        { cx: ox + 15 * sc, cy: oy + 1 * sc, rx: 10 * sc, ry: 9 * sc, bias: 0.06 }, // Đầu to
        { cx: ox + 22 * sc, cy: oy + 4 * sc, rx: 5 * sc, ry: 4 * sc, bias: 0.08 }, // Mõm
      ],
      ramp,
      { texture: "fur" }
    );

    // Sống lưng gai & bờm lông dựng đứng (King có vệt vàng đồng)
    for (let s = 0; s < 6; s++) {
      const sx = ox - Math.round((12 - s * 5) * sc);
      const sy = oy - Math.round((12 + Math.sin(s * 0.5) * 6) * sc);
      plotPixelLine(g, sx, sy + 4, sx - 2, sy - 3, crestCol, isKing ? 3 : 2);
      plotPixel(g, sx - 2, sy - 3, isKing ? "#fff4bd" : "#9c6238");
    }

    // Tai nhọn & Đôi mắt đỏ rực
    plotRect(g, ox + Math.round(10 * sc), oy - Math.round(9 * sc), 4, 5, ramp[2]);
    plotRect(g, ox + Math.round(15 * sc), oy - Math.round(2 * sc), 4, 3, "#090608");
    plotRect(g, ox + Math.round(16 * sc), oy - Math.round(2 * sc), 3, 2, "#ff263d");
    plotPixel(g, ox + Math.round(18 * sc), oy - Math.round(2 * sc), "#ffd6dc");

    // Đuôi xoắn vẫy
    plotPixelLine(g, ox - Math.round(21 * sc), oy - 2, ox - Math.round(26 * sc), oy - 6 + (f % 2) * 3, ramp[3], 2);

    // Cặp Răng Nanh Trắng Cong Vút 6-8px
    plotPixelLine(g, ox + Math.round(20 * sc), oy + Math.round(6 * sc), ox + Math.round(27 * sc), oy - Math.round(1 * sc), "#fff6e3", 2);
    plotPixel(g, ox + Math.round(27 * sc), oy - Math.round(2 * sc), "#ffffff");
    plotPixelLine(g, ox + Math.round(16 * sc), oy + Math.round(8 * sc), ox + Math.round(22 * sc), oy + Math.round(2 * sc), "#e8d7bc", 2);

    applySelectiveOutline(g, W, H, "#24140d", "#070506");
    if (ctx) {
      fillPixelEllipse(ctx, anchorX, anchorY, Math.round(20 * sc), 5, "rgba(5, 7, 10, 0.42)", true);
      ctx.drawImage(tmp.canvas, 0, 0);
    }
    frames.push({ canvas, anchorX, anchorY, barOffsetY });
  }
  return frames;
}

function buildWolf64(variant) {
  const isKing = variant === "king_lightning" || variant === "king_snow";
  const isSnow = variant === "snow" || variant === "king_snow";
  const W = isKing ? 76 : 64;
  const H = isKing ? 68 : 64;
  const anchorX = Math.round(W * 0.5);
  const anchorY = H - 10;
  const barOffsetY = isKing ? 56 : 48;

  const ramp = isSnow
    ? ["#111924", "#2c4157", "#537494", "#84a7c7", "#b8d6eb", "#ebf8ff"]
    : ["#091a16", "#11332a", "#1c5442", "#2d7d60", "#4db085", "#7af5c2"];
  const boltCol = isSnow ? "#94f2ff" : "#5ef2ff";
  const eyeCol = isSnow ? "#5cf2ff" : "#38ffec";

  const frames = [];
  for (let f = 0; f < 4; f++) {
    const { canvas, ctx } = createPixelCanvas(W, H);
    const tmp = createPixelCanvas(W, H);
    const g = tmp.ctx;
    const sc = isKing ? 1.18 : 1.0;
    const ox = Math.round(W * 0.5);
    const oy = Math.round(H * 0.58) + (f === 1 || f === 3 ? -1 : 0);

    // Đuôi sói dài vẫy 4-frame
    const tailWag = [0, -4, 2, -2][f];
    plotPixelLine(g, ox - Math.round(16 * sc), oy + 1, ox - Math.round(27 * sc), oy - Math.round(5 * sc) + tailWag, ramp[2], 4);
    plotPixelLine(g, ox - Math.round(21 * sc), oy - 2 + Math.round(tailWag * 0.5), ox - Math.round(28 * sc), oy - Math.round(6 * sc) + tailWag, ramp[4], 2);

    // 4 chân săn mồi rạp thấp
    const lShift = f === 1 ? -4 : f === 3 ? 3 : 0;
    const rShift = f === 2 ? -4 : f === 0 ? 3 : 0;
    plotPixelLine(g, ox - Math.round(13 * sc), oy + 4, ox - Math.round((15 - lShift) * sc), oy + Math.round(15 * sc), ramp[1], 3);
    plotPixelLine(g, ox - Math.round(8 * sc), oy + 5, ox - Math.round((8 - rShift) * sc), oy + Math.round(15 * sc), ramp[2], 3);
    plotPixelLine(g, ox + Math.round(7 * sc), oy + 4, ox + Math.round((9 + lShift) * sc), oy + Math.round(15 * sc), ramp[3], 3);
    plotPixelLine(g, ox + Math.round(12 * sc), oy + 4, ox + Math.round((15 + rShift) * sc), oy + Math.round(15 * sc), ramp[2], 3);

    // Thân & cổ sói rạp thấp + bờm cổ dựng gai
    paintShadedPixelLobes(
      g,
      W,
      H,
      [
        { cx: ox - 10 * sc, cy: oy + 2 * sc, rx: 10 * sc, ry: 7 * sc, bias: -0.05 },
        { cx: ox + 2 * sc, cy: oy - 1 * sc, rx: 12 * sc, ry: 9 * sc, bias: 0.08 },
        { cx: ox + 14 * sc, cy: oy - 3 * sc, rx: 8 * sc, ry: 7 * sc, bias: 0.06 }, // Đầu sói
        { cx: ox + 22 * sc, cy: oy, rx: 5 * sc, ry: 3 * sc, bias: 0.05 }, // Mõm dài
      ],
      ramp,
      { texture: "fur" }
    );

    // Tai vểnh & Bờm điện lam ngọc
    plotPixelLine(g, ox + Math.round(9 * sc), oy - Math.round(8 * sc), ox + Math.round(7 * sc), oy - Math.round(15 * sc), ramp[3], 3);
    plotPixelLine(g, ox + Math.round(13 * sc), oy - Math.round(8 * sc), ox + Math.round(12 * sc), oy - Math.round(15 * sc), ramp[4], 3);
    plotPixelLine(g, ox - 2, oy - Math.round(7 * sc), ox + 5, oy - Math.round(11 * sc), boltCol, 2);
    plotPixelLine(g, ox + 2, oy - 3, ox - 5, oy + 2, boltCol, 1);
    if (isKing) {
      plotRect(g, ox + 4, oy - Math.round(14 * sc), 3, 5, "#ffd15c");
      plotRect(g, ox - 6, oy - Math.round(11 * sc), 3, 4, boltCol);
    }

    // Mắt sáng & vệt ánh sáng mắt + Răng nanh trắng
    plotRect(g, ox + Math.round(15 * sc), oy - Math.round(4 * sc), 4, 2, eyeCol);
    plotPixelLine(g, ox + Math.round(14 * sc), oy - Math.round(4 * sc), ox + Math.round(9 * sc), oy - Math.round(5 * sc), "#b8ffff", 1);
    plotPixel(g, ox + Math.round(17 * sc), oy - Math.round(4 * sc), "#ffffff");
    plotRect(g, ox + Math.round(20 * sc), oy + 2, 2, 3, "#ffffff");
    plotRect(g, ox + Math.round(24 * sc), oy + 2, 2, 3, "#ffffff");

    applySelectiveOutline(g, W, H, "#132924", "#060b0a");
    if (ctx) {
      fillPixelEllipse(ctx, anchorX, anchorY, Math.round(21 * sc), 5, "rgba(5, 8, 12, 0.42)", true);
      ctx.drawImage(tmp.canvas, 0, 0);
    }
    frames.push({ canvas, anchorX, anchorY, barOffsetY });
  }
  return frames;
}

function buildStoneMonkey64(isKing) {
  const W = isKing ? 76 : 64;
  const H = isKing ? 72 : 64;
  const anchorX = Math.round(W * 0.5);
  const anchorY = H - 10;
  const barOffsetY = isKing ? 60 : 52;
  const ramp = isKing
    ? ["#0d1014", "#222830", "#3a4452", "#596678", "#7d8da3", "#a8bad1"]
    : ["#0e1114", "#24282e", "#3c424a", "#565e69", "#747e8c", "#95a1b0"];
  const crackCol = isKing ? "#ffd047" : "#42f5c5";
  const eyeCol = isKing ? "#ff385c" : "#5ef2d6";

  const frames = [];
  for (let f = 0; f < 4; f++) {
    const { canvas, ctx } = createPixelCanvas(W, H);
    const tmp = createPixelCanvas(W, H);
    const g = tmp.ctx;
    const sc = isKing ? 1.18 : 1.0;
    const ox = Math.round(W * 0.5);
    const oy = Math.round(H * 0.52) + (f === 1 ? -3 : f === 3 ? 1 : 0);
    const armSmash = f === 2 ? 4 : f === 1 ? -3 : 0;

    // Hai cánh tay khổng lồ ghép đá tảng
    for (const dir of [-1, 1]) {
      const shoulderX = ox + dir * Math.round(13 * sc);
      const fistX = ox + dir * Math.round(17 * sc);
      const fistY = oy + Math.round(11 * sc) + (dir > 0 ? armSmash : -armSmash);
      plotPixelLine(g, shoulderX, oy - Math.round(4 * sc), fistX, fistY, ramp[2], Math.round(7 * sc));
      fillPixelEllipse(g, fistX, fistY + 2, 6 * sc, 5 * sc, ramp[3]);
      plotRect(g, fistX - 2, fistY, 3, 2, crackCol);
    }

    // Chân đá
    plotRect(g, ox - Math.round(10 * sc), oy + Math.round(8 * sc), Math.round(7 * sc), Math.round(11 * sc), ramp[2]);
    plotRect(g, ox + Math.round(3 * sc), oy + Math.round(8 * sc), Math.round(7 * sc), Math.round(11 * sc), ramp[2]);

    // Thân & Đầu Khỉ Đá
    paintShadedPixelLobes(
      g,
      W,
      H,
      [
        { cx: ox, cy: oy + 1 * sc, rx: 13 * sc, ry: 12 * sc, bias: 0.06 },
        { cx: ox, cy: oy - 12 * sc, rx: 9 * sc, ry: 8 * sc, bias: 0.1 },
      ],
      ramp,
      { texture: "rock" }
    );

    // Các đường nứt đá phát sáng lân tinh
    plotPixelLine(g, ox - 5, oy - 4, ox + 1, oy + 2, crackCol, 1);
    plotPixelLine(g, ox + 1, oy + 2, ox + 6, oy - 2, crackCol, 1);
    plotPixelLine(g, ox, oy + 2, ox - 2, oy + 8, crackCol, 1);
    if (isKing) {
      plotRect(g, ox - 4, oy - Math.round(22 * sc), 8, 3, "#ffd047");
      plotRect(g, ox - 2, oy - Math.round(24 * sc), 4, 2, "#fff5bd");
    }

    // Ngọc Nhãn sáng rực
    plotRect(g, ox - 5, oy - Math.round(14 * sc), 3, 2, eyeCol);
    plotRect(g, ox + 2, oy - Math.round(14 * sc), 3, 2, eyeCol);
    plotPixel(g, ox - 4, oy - Math.round(14 * sc), "#ffffff");
    plotPixel(g, ox + 3, oy - Math.round(14 * sc), "#ffffff");

    applySelectiveOutline(g, W, H, "#1c222b", "#07090d");
    if (ctx) {
      fillPixelEllipse(ctx, anchorX, anchorY, Math.round(20 * sc), 5, "rgba(5, 8, 10, 0.45)", true);
      ctx.drawImage(tmp.canvas, 0, 0);
    }
    frames.push({ canvas, anchorX, anchorY, barOffsetY });
  }
  return frames;
}

function buildPoisonToad64(isKing) {
  const W = isKing ? 76 : 64;
  const H = isKing ? 68 : 64;
  const anchorX = Math.round(W * 0.5);
  const anchorY = H - 10;
  const barOffsetY = isKing ? 56 : 48;
  const ramp = isKing
    ? ["#0f0617", "#28113b", "#472066", "#6b3294", "#9252bd", "#bd7ee6"]
    : ["#0b1a0c", "#1a3b1b", "#2d6329", "#468f38", "#6ec24f", "#a3f26b"];
  const sacCol = isKing ? "#a33de8" : "#62b846";
  const gasCol = isKing ? "#8cff66" : "#9cff78";

  const frames = [];
  for (let f = 0; f < 4; f++) {
    const { canvas, ctx } = createPixelCanvas(W, H);
    const tmp = createPixelCanvas(W, H);
    const g = tmp.ctx;
    const sc = isKing ? 1.18 : 1.0;
    const ox = Math.round(W * 0.5);
    const hop = f === 1 ? -4 : f === 2 ? -2 : 0;
    const oy = Math.round(H * 0.62) + hop;
    const throatScale = f === 2 || f === 3 ? 1.25 : 1.0;

    // Chân sau gập & Chân trước to bè
    fillPixelEllipse(g, ox - 15 * sc, oy + 5 * sc, 7 * sc, 5 * sc, ramp[1]);
    fillPixelEllipse(g, ox + 15 * sc, oy + 5 * sc, 7 * sc, 5 * sc, ramp[1]);
    plotRect(g, ox - Math.round(12 * sc), oy + Math.round(7 * sc), 5, 7, ramp[2]);
    plotRect(g, ox + Math.round(8 * sc), oy + Math.round(7 * sc), 5, 7, ramp[2]);

    // Thân Cóc Phồng Độc U Cục
    paintShadedPixelLobes(
      g,
      W,
      H,
      [
        { cx: ox, cy: oy, rx: 18 * sc, ry: 12 * sc, bias: 0.04 },
        { cx: ox - 7 * sc, cy: oy - 11 * sc, rx: 5 * sc, ry: 4 * sc, bias: 0.14 },
        { cx: ox + 7 * sc, cy: oy - 11 * sc, rx: 5 * sc, ry: 4 * sc, bias: 0.14 },
      ],
      ramp,
      { texture: "wart" }
    );

    // Túi cổ phình độc
    fillPixelEllipse(g, ox, oy + Math.round(6 * sc), 11 * sc * throatScale, 5 * sc * throatScale, sacCol, true);
    // U độc tím/vàng trên lưng
    plotRect(g, ox - 10, oy - 7, 4, 3, isKing ? "#ffd15c" : "#8042ab");
    plotRect(g, ox + 5, oy - 5, 4, 3, isKing ? "#ffd15c" : "#8042ab");
    plotRect(g, ox - 2, oy - 9, 5, 3, isKing ? "#80ff66" : "#b35fe8");

    // Hai mắt lồi vàng/đỏ
    plotRect(g, ox - Math.round(9 * sc), oy - Math.round(12 * sc), 4, 3, isKing ? "#ff2e4c" : "#ffe15c");
    plotRect(g, ox + Math.round(5 * sc), oy - Math.round(12 * sc), 4, 3, isKing ? "#ff2e4c" : "#ffe15c");
    plotRect(g, ox - Math.round(8 * sc), oy - Math.round(11 * sc), 1, 2, "#0a080c");
    plotRect(g, ox + Math.round(6 * sc), oy - Math.round(11 * sc), 1, 2, "#0a080c");

    applySelectiveOutline(g, W, H, "#23192b", "#070b07");

    // Cụm Bong Bóng Khí Độc Pixel nhả ra bay lên (vẽ sau outline để nổi bật)
    for (let b = 0; b < 3; b++) {
      const bx = ox + (b - 1) * 9 + ((f + b) % 2) * 2;
      const by = oy - Math.round(17 * sc) - ((f * 4 + b * 5) % 14);
      const br = b === 1 ? 3 : 2;
      plotPixelEllipse(g, bx, by, br, br, gasCol);
      plotPixel(g, bx - 1, by - 1, "#ffffff");
    }

    if (ctx) {
      fillPixelEllipse(ctx, anchorX, anchorY, Math.round(22 * sc), 5, "rgba(5, 10, 6, 0.44)", true);
      ctx.drawImage(tmp.canvas, 0, 0);
    }
    frames.push({ canvas, anchorX, anchorY, barOffsetY });
  }
  return frames;
}

function buildScorpion64(isKing) {
  const W = isKing ? 76 : 64;
  const H = isKing ? 68 : 64;
  const anchorX = Math.round(W * 0.5);
  const anchorY = H - 10;
  const barOffsetY = isKing ? 56 : 48;
  const ramp = isKing
    ? ["#0d0f17", "#1e2436", "#33405c", "#50648a", "#7892bf", "#adc5eb"]
    : ["#0e1117", "#232a36", "#3a4557", "#586780", "#7d8fa8", "#b0c3db"];
  const stingCol = isKing ? "#ff385c" : "#5ef2d6";

  const frames = [];
  for (let f = 0; f < 4; f++) {
    const { canvas, ctx } = createPixelCanvas(W, H);
    const tmp = createPixelCanvas(W, H);
    const g = tmp.ctx;
    const sc = isKing ? 1.18 : 1.0;
    const ox = Math.round(W * 0.5);
    const oy = Math.round(H * 0.6) + (f % 2 === 1 ? -1 : 0);

    // 6 chân giáp sắt
    for (let l = 0; l < 3; l++) {
      const lx = ox - 10 + l * 8;
      const shift = ((f + l) % 2) * 2;
      plotPixelLine(g, lx, oy + 4, lx - 5, oy + 12 + shift, ramp[2], 2);
      plotPixelLine(g, lx, oy + 2, lx + 4, oy - 5 - shift, ramp[1], 2);
    }

    // Đuôi bọ cạp cong lên đầu nhọn phát sáng
    const sway = f === 1 ? -2 : f === 3 ? 2 : 0;
    plotPixelLine(g, ox - Math.round(14 * sc), oy, ox - Math.round(22 * sc), oy - Math.round(14 * sc), ramp[3], 5);
    plotPixelLine(g, ox - Math.round(22 * sc), oy - Math.round(14 * sc), ox - Math.round(8 * sc) + sway, oy - Math.round(22 * sc), ramp[4], 4);
    plotPixelLine(g, ox - Math.round(8 * sc) + sway, oy - Math.round(22 * sc), ox + Math.round(4 * sc) + sway, oy - Math.round(17 * sc), stingCol, 3);
    plotPixel(g, ox + Math.round(5 * sc) + sway, oy - Math.round(16 * sc), "#ffffff");

    // Thân giáp đốt & 2 càng kìm lớn
    paintShadedPixelLobes(
      g,
      W,
      H,
      [
        { cx: ox - 4 * sc, cy: oy, rx: 14 * sc, ry: 8 * sc, bias: 0.05 },
        { cx: ox + 17 * sc, cy: oy - 3 * sc, rx: 6 * sc, ry: 4 * sc, bias: 0.1 },
        { cx: ox + 17 * sc, cy: oy + 6 * sc, rx: 6 * sc, ry: 4 * sc, bias: 0.1 },
      ],
      ramp,
      { texture: "rock" }
    );
    plotRect(g, ox + Math.round(8 * sc), oy - 2, 3, 2, "#ff385c");
    plotRect(g, ox + Math.round(8 * sc), oy + 2, 3, 2, "#ff385c");

    applySelectiveOutline(g, W, H, "#1c2536", "#07090d");
    if (ctx) {
      fillPixelEllipse(ctx, anchorX, anchorY, Math.round(21 * sc), 5, "rgba(5, 8, 12, 0.42)", true);
      ctx.drawImage(tmp.canvas, 0, 0);
    }
    frames.push({ canvas, anchorX, anchorY, barOffsetY });
  }
  return frames;
}

function buildStrawDummyFrames() {
  const W = 34;
  const H = 40;
  const anchorX = 17;
  const anchorY = 36;
  const barOffsetY = 36;
  const pal = { k: "#523218", d: "#7a5822", m: "#c89d54", b: "#f0cc75", r: "#d0573c", w: "#fff3d1" };
  const rows = [
    "....dddd....",
    "...dmmmmdd..",
    "...drrrrrd..",
    "...dmbbbmd..",
    "ddddmmbmmddd",
    "mbbbmbrbmmbm",
    "ddddmrbrmddd",
    "...dmbbbmd..",
    "....dmmd....",
    ".....kk.....",
    ".....kk.....",
    "....kkkk....",
  ];
  const frames = [];
  for (let f = 0; f < 3; f++) {
    const { canvas, ctx } = createPixelCanvas(W, H);
    const tmp = createPixelCanvas(W, H);
    const g = tmp.ctx;
    const tilt = f === 1 ? 1 : f === 2 ? -1 : 0;
    const ox = 5 + tilt;
    const oy = 6;
    for (let y = 0; y < rows.length; y++) {
      const row = rows[y];
      for (let x = 0; x < row.length; x++) {
        const ch = row[x];
        if (ch === "." || ch === " ") continue;
        const col = pal[ch];
        if (!col) continue;
        plotRect(g, ox + x * 2, oy + y * 2, 2, 2, col);
      }
    }
    applySelectiveOutline(g, W, H, "#2a1a0d", "#140b06");
    if (ctx) {
      fillPixelEllipse(ctx, anchorX, anchorY, 10, 3, "rgba(5, 8, 12, 0.36)", true);
      ctx.drawImage(tmp.canvas, 0, 0);
    }
    frames.push({ canvas, anchorX, anchorY, barOffsetY });
  }
  return frames;
}

function buildGenericMonster64(typeId) {
  if (typeId === "coc_thao_nhan") {
    return buildStrawDummyFrames();
  }
  const W = typeId === "thien_tri_ngu_vuong" ? 76 : 64;
  const H = 64;
  const anchorX = Math.round(W * 0.5);
  const anchorY = H - 10;
  const barOffsetY = typeId === "thien_tri_ngu_vuong" ? 56 : 52;
  const frames = [];

  for (let f = 0; f < 4; f++) {
    const { canvas, ctx } = createPixelCanvas(W, H);
    const tmp = createPixelCanvas(W, H);
    const g = tmp.ctx;
    const ox = Math.round(W * 0.5);
    const oy = Math.round(H * 0.54) + (f === 1 ? -2 : f === 3 ? 1 : 0);

    if (typeId === "thien_tri_ngu_vuong") {
      const ramp = ["#061921", "#0c3d4a", "#177582", "#2fb8ad", "#6cf2d8", "#d6fff7"];
      paintShadedPixelLobes(
        g,
        W,
        H,
        [
          { cx: ox - 4, cy: oy, rx: 22, ry: 11, bias: 0.06 },
          { cx: ox - 24, cy: oy + (f % 2 === 0 ? -3 : 3), rx: 7, ry: 9, bias: 0 },
        ],
        ramp,
        { texture: "smooth" }
      );
      plotRect(g, ox - 6, oy - 14, 14, 5, "#ffd15c");
      plotRect(g, ox + 10, oy - 4, 4, 4, "#ff385c");
      plotPixel(g, ox + 12, oy - 4, "#ffffff");
    } else if (typeId === "xich_viem_thu" || typeId === "xich_viem_vuong") {
      const isK = typeId === "xich_viem_vuong";
      const ramp = ["#1a0a08", "#47140d", "#872312", "#c93b1a", "#ff7b29", "#ffe066"];
      paintShadedPixelLobes(
        g,
        W,
        H,
        [
          { cx: ox, cy: oy, rx: isK ? 20 : 15, ry: isK ? 14 : 11, bias: 0.08 },
          { cx: ox + 11, cy: oy - 3, rx: 8, ry: 7, bias: 0.1 },
        ],
        ramp,
        { texture: "rock" }
      );
      plotRect(g, ox + 11, oy - 5, 4, 3, "#ffffff");
      plotRect(g, ox - 6, oy - (isK ? 16 : 12), 4, 4, "#ffe066");
    } else {
      // mac_vo_tam, mong_canh_ma_anh, kiem_truc_yeu, thuy_mang
      const isPuppet = typeId === "kiem_truc_yeu";
      const isWraith = typeId === "mong_canh_ma_anh";
      const isSerpent = typeId === "thuy_mang" || typeId === "thuy_mang_vuong";
      const ramp = isPuppet
        ? ["#0e241b", "#1b4d38", "#2d7d5a", "#4db888", "#8be8ba", "#d9fff0"]
        : isWraith
          ? ["#101226", "#232959", "#3d4a94", "#6878cf", "#9bb0ff", "#e0ecff"]
          : isSerpent
            ? ["#071b26", "#0e3b52", "#176787", "#2aa1bf", "#5ed6e8", "#bafaff"]
            : ["#160b21", "#2f1547", "#4f2378", "#783bb0", "#a664e0", "#dab3ff"];
      paintShadedPixelLobes(
        g,
        W,
        H,
        isSerpent
          ? [
              { cx: ox - 12, cy: oy + 5, rx: 11, ry: 7, bias: 0 },
              { cx: ox, cy: oy + 2, rx: 10, ry: 8, bias: 0.06 },
              { cx: ox + 9, cy: oy - 11, rx: 7, ry: 6, bias: 0.1 },
            ]
          : [
              { cx: ox, cy: oy + 3, rx: 10, ry: 12, bias: 0.02 },
              { cx: ox, cy: oy - 13, rx: 7, ry: 7, bias: 0.08 },
            ],
        ramp,
        { texture: "smooth" }
      );
      plotRect(g, ox - 4, oy - 14, 3, 2, "#5ef2d6");
      plotRect(g, ox + 2, oy - 14, 3, 2, "#5ef2d6");
    }

    applySelectiveOutline(g, W, H, "#1c1f2e", "#07090d");
    if (ctx) {
      fillPixelEllipse(ctx, anchorX, anchorY, 17, 5, "rgba(5, 8, 12, 0.4)", true);
      ctx.drawImage(tmp.canvas, 0, 0);
    }
    frames.push({ canvas, anchorX, anchorY, barOffsetY });
  }
  return frames;
}

export function bakeMonsterFrames64(typeId) {
  if (MONSTER_64_CACHE.has(typeId)) return MONSTER_64_CACHE.get(typeId);
  let frames;
  if (typeId === "lon_rung") frames = buildDaTru64(false);
  else if (typeId === "lon_rung_vuong") frames = buildDaTru64(true);
  else if (typeId === "hao_dien_lang") frames = buildWolf64("lightning");
  else if (typeId === "tam_nha_dien_lang") frames = buildWolf64("king_lightning");
  else if (typeId === "soi_tuyet") frames = buildWolf64("snow");
  else if (typeId === "soi_tuyet_vuong") frames = buildWolf64("king_snow");
  else if (typeId === "thach_hau") frames = buildStoneMonkey64(false);
  else if (typeId === "thach_hau_vuong") frames = buildStoneMonkey64(true);
  else if (typeId === "coc_doc_hac_thuy") frames = buildPoisonToad64(false);
  else if (typeId === "thiem_thu_vuong") frames = buildPoisonToad64(true);
  else if (typeId === "thiet_giap_bo_cap") frames = buildScorpion64(false);
  else if (typeId === "thiet_giap_hat_vuong") frames = buildScorpion64(true);
  else frames = buildGenericMonster64(typeId);

  MONSTER_64_CACHE.set(typeId, frames);
  return frames;
}

/**
 * Vẽ Boss Ngũ Đầu Vạn Thủ Bàn Long 100% Pixel Nguyên (0 ctx.arc / ctx.ellipse).
 */
export function drawPixelBanLongBoss(ctx, boss, time) {
  ctx.save();
  const bx = Math.round(boss.x);
  const by = Math.round(boss.y);
  const frameRot = Math.floor(time * 5);

  // Trận pháp Cổ Ngữ pixel dưới chân Bàn Long
  plotPixelEllipse(ctx, bx, by + 10, 92, 42, "rgba(25, 240, 200, 0.36)", 4, frameRot);
  plotPixelEllipse(ctx, bx, by + 10, 68, 30, "rgba(217, 178, 95, 0.42)", 3, -frameRot);
  for (let i = 0; i < 8; i++) {
    const a = time * 0.25 + (i / 8) * Math.PI * 2;
    const rx = Math.round(bx + Math.cos(a) * 80);
    const ry = Math.round(by + 10 + Math.sin(a) * 35);
    plotRect(ctx, rx - 2, ry - 2, 4, 4, i % 2 === 0 ? "#19f0c8" : "#ffd65c");
  }

  // Bóng pixel dithered
  fillPixelEllipse(ctx, bx, by + 20, 80, 22, "rgba(4, 10, 12, 0.54)", true);

  // Đuôi rồng uốn lượn
  for (let s = 12; s >= 1; s--) {
    const t = s / 12;
    const tx = Math.round(bx - 56 - t * 44 + Math.sin(time * 2.2 + t * 5) * 6);
    const ty = Math.round(by + 6 - Math.sin(t * Math.PI) * 16 + Math.cos(time * 2 + t * 4) * 3);
    const rad = Math.max(4, Math.round(13 * (1 - t * 0.68)));
    plotRect(ctx, tx - rad - 1, ty - Math.round(rad * 0.6) - 1, rad * 2 + 2, Math.round(rad * 1.2) + 2, "#061013");
    plotRect(ctx, tx - rad, ty - Math.round(rad * 0.6), rad * 2, Math.round(rad * 1.2), s % 2 === 0 ? "#102830" : "#183b47");
    if (s % 2 === 0) plotRect(ctx, tx - 1, ty - Math.round(rad * 0.6) - 3, 2, 3, "#19f0c8");
  }

  const drawArmoredCoil = (cx, cy, rx, ry, scaleTop = true) => {
    for (let dy = -ry; dy <= ry; dy++) {
      const ratio = dy / ry;
      const hw = Math.round(rx * Math.sqrt(Math.max(0, 1 - ratio * ratio)));
      plotRect(ctx, cx - hw - 2, cy + dy, hw * 2 + 4, 2, "#061013");
      for (let dx = -hw; dx <= hw; dx += 3) {
        let col = "#15333d";
        if (dy > ry * 0.25 && Math.abs(dx) < hw * 0.68) {
          col = ((dx + dy) & 4) === 0 ? "#c89d54" : "#967133";
          if (Math.abs(dx) < hw * 0.35 && dy > ry * 0.4) col = "#f5d37d";
        } else if (dy < -ry * 0.3) col = "#2a6373";
        else col = (((dx >> 2) + (dy >> 2)) & 1) === 0 ? "#1c4452" : "#112930";
        plotRect(ctx, cx + dx, cy + dy, 3, 1, col);
      }
    }
    if (scaleTop) {
      for (let sx = -rx + 14; sx <= rx - 14; sx += 11) {
        const spineY = cy - ry + Math.round(((sx * sx) / (rx * rx)) * 8);
        plotRect(ctx, bx + sx - 2, spineY - 5, 5, 6, "#061013");
        plotRect(ctx, bx + sx - 1, spineY - 4, 3, 4, "#19f0c8");
      }
    }
  };
  drawArmoredCoil(bx, by - 6, 62, 22, true);
  drawArmoredCoil(bx + 4, by + 10, 74, 18, false);

  // 5 Cổ & 5 Đầu Rồng + Thanh Máu Pixel
  const headThemes = [
    { eye: "#46eb78", spine: "#46eb78", dark: "#11301d", mid: "#1d5733", lit: "#348a53", title: "Độc" },
    { eye: "#6ee7ff", spine: "#6ee7ff", dark: "#122b3d", mid: "#1f4d6b", lit: "#3b84ad", title: "Băng" },
    { eye: "#19f0c8", spine: "#19f0c8", dark: "#0f2c33", mid: "#1b525c", lit: "#2f8694", title: "Chủ", isMain: true },
    { eye: "#d98cff", spine: "#d98cff", dark: "#28153b", mid: "#47256b", lit: "#743da8", title: "Lôi" },
    { eye: "#ff5c42", spine: "#ff5c42", dark: "#381212", mid: "#661e1c", lit: "#9e332b", title: "Viêm" },
  ];

  for (let i = 0; i < (boss.heads ?? []).length; i++) {
    const h = boss.heads[i];
    const theme = headThemes[i % headThemes.length];
    const baseAx = bx + h.dx * 0.28;
    const baseAy = by - 12;
    const hx = Math.round(boss.x + h.dx + (h.alive ? Math.sin(time * 1.9 + i * 1.3) * 3 : 0));
    const hy = Math.round(boss.y + (h.alive ? h.dy + Math.sin(time * 2.7 + i) * 4.5 : h.dy * 0.35 + 22));

    for (let s = 0; s <= 16; s++) {
      const t = s / 16;
      const sway = h.alive ? Math.sin(t * Math.PI * 2 + time * 3.1 + i) * 6 : Math.sin(t * Math.PI) * 4;
      const nx = Math.round(baseAx + (hx - baseAx) * t + sway);
      const ny = Math.round(baseAy + (hy - baseAy) * t - Math.sin(t * Math.PI) * 6);
      const half = Math.max(4, Math.round((theme.isMain ? 9 : 7) * (1 - t * 0.28)));
      plotRect(ctx, nx - half - 1, ny - half + 1, half * 2 + 2, Math.round(half * 1.4) + 2, h.alive ? "#061013" : "#171717");
      plotRect(ctx, nx - half, ny - half + 2, half * 2, Math.round(half * 1.3), h.alive ? (s % 2 === 0 ? theme.mid : theme.dark) : "#2a2c2e");
      if (h.alive && s % 2 === 1) plotRect(ctx, nx - 1, ny - half - 1, 2, 3, theme.spine);
    }

    const sc = theme.isMain ? 1.18 : 1.0;
    const drawOff = (dx, dy, w, ht, col) =>
      plotRect(ctx, hx + dx * sc, hy + dy * sc, Math.max(1, w * sc), Math.max(1, ht * sc), col);

    if (!h.alive) {
      drawOff(-15, -10, 30, 20, "#141618");
      drawOff(-13, -8, 26, 16, "#2c3034");
      continue;
    }

    drawOff(-13, -19, 4, 9, "#3b2308");
    drawOff(9, -19, 4, 9, "#3b2308");
    drawOff(-12, -18, 3, 8, "#d9b25f");
    drawOff(9, -18, 3, 8, "#d9b25f");
    drawOff(-17, -12, 34, 22, "#061013");
    drawOff(-15, -10, 30, 18, theme.dark);
    drawOff(-14, -10, 28, 12, theme.mid);
    drawOff(-11, -9, 22, 6, theme.lit);
    drawOff(-10, -4, 5, 2, theme.eye);
    drawOff(5, -4, 5, 2, theme.eye);
    drawOff(-8, 4, 2, 4, "#ffffff");
    drawOff(6, 4, 2, 4, "#ffffff");

    const pct = Math.max(0, Math.round((h.hp / h.maxHp) * 100));
    const barY = Math.round(hy - 26 * sc);
    plotRect(ctx, hx - 23, barY - 1, 46, 6, "#0b0d0a");
    plotRect(ctx, hx - 22, barY, 44, 4, "#3b2c16");
    plotRect(ctx, hx - 22, barY, Math.max(1, Math.round((44 * pct) / 100)), 4, theme.eye);
    ctx.font = "700 8.5px 'Be Vietnam Pro', sans-serif";
    drawCrispPixelText(ctx, `${theme.title} ${pct}%`, hx, barY - 4, "#fff5d6", "#0b0d0a");
  }
  ctx.restore();
}

// ============================================================================
// 3. CỔNG CHUYỂN VÙNG 128x160 (SƠN MÔN CỔ / CỔNG RỪNG / HANG ĐỘNG - 0 VÒNG TRÒN!)
// ============================================================================
const GATE_CACHE = new Map();

export function getPortalGateSprite(variant = "gate_mountain", frameIdx = 0, dir = "ns", layer = "full") {
  const f = ((frameIdx % 4) + 4) % 4;
  const normDir = dir === "west" || dir === "east" ? dir : "ns";
  const normLayer = normDir === "ns" ? "full" : layer === "back" ? "back" : "front";
  const key = `${variant}_${normDir}_${normLayer}_${f}`;
  if (GATE_CACHE.has(key)) return GATE_CACHE.get(key);

  const isCave = variant === "gate_cave";
  const isForest = variant === "gate_forest";
  const stoneRamp = isCave
    ? ["#080a0f", "#181d26", "#2c3442", "#434f61", "#617087", "#8496b0"]
    : ["#0a0e10", "#1b2226", "#313a40", "#4b575e", "#697780", "#8fa0ab"];
  const runeCol = isCave ? "#4df7c0" : isForest ? "#72f58e" : f % 2 === 0 ? "#5ef2d6" : "#3bc4ad";
  const runeHi = f === 1 || f === 2 ? "#c9fff4" : runeCol;
  const tileRamp = isForest
    ? ["#0b1712", "#14291f", "#1f3d2e", "#2d5742", "#40755b"]
    : ["#080d14", "#121b26", "#1e2c3d", "#2d4057", "#435c7a"];
  const gCheck = (c) => c;

  if (normDir === "west" || normDir === "east") {
    const W = 96;
    const H = 176;
    const anchorX = 48;
    const anchorY = 112;
    const faceSign = normDir === "west" ? 1 : -1;
    const { canvas, ctx } = createPixelCanvas(W, H);
    if (!ctx) {
      const stub = { canvas, anchorX, anchorY, solidRadius: 0 };
      GATE_CACHE.set(key, stub);
      return stub;
    }

    const drawSidePillar = (footY, shaftTopY) => {
      const px = 40;
      fillPixelEllipse(ctx, px + 8, footY, 12, 4, "rgba(5, 8, 10, 0.45)", true);
      plotRect(ctx, px - 3, footY - 12, 22, 13, stoneRamp[0]);
      plotRect(ctx, px - 1, footY - 10, 18, 9, stoneRamp[3]);
      plotRect(ctx, px, footY - 10, 7, 8, stoneRamp[4]);
      const sh = Math.max(12, footY - 11 - shaftTopY);
      plotRect(ctx, px, shaftTopY, 16, sh, stoneRamp[0]);
      plotRect(ctx, px + 2, shaftTopY + 1, 12, sh - 2, stoneRamp[2]);
      plotRect(ctx, px + (faceSign > 0 ? 9 : 2), shaftTopY + 1, 5, sh - 2, stoneRamp[4]);
      plotRect(ctx, px + 3, shaftTopY + 14, 7, 7, "#1c3b22");
      plotRect(ctx, px + 4, shaftTopY + 15, 5, 4, "#2c5e35");
      const rx = faceSign > 0 ? px + 10 : px + 3;
      for (let ry = shaftTopY + 8; ry < footY - 18; ry += 16) {
        plotRect(ctx, rx, ry, 3, 6, "#091715");
        plotRect(gCheck(ctx), rx + 1, ry + 1, 1, 4, runeCol);
        plotPixel(ctx, rx + 1, ry + 2, runeHi);
      }
    };

    if (normLayer === "back") {
      // Màn sương mỏng dọc ngưỡng cổng Đông/Tây (trải Bắc–Nam)
      const mistShift = f * 3;
      for (let y = 84; y <= 136; y++) {
        const edgeFade = Math.min(1, Math.min(y - 84, 136 - y) / 10);
        for (let x = 42; x <= 54; x++) {
          const xFade = Math.min(1, Math.min(x - 42, 54 - x) / 4);
          if (bayerThreshold(x, y + mistShift) < edgeFade * xFade * 0.65) {
            ctx.fillStyle = isCave ? "rgba(77, 247, 192, 0.25)" : isForest ? "rgba(114, 245, 142, 0.22)" : "rgba(130, 225, 215, 0.25)";
            ctx.fillRect(x, y, 1, 1);
          }
        }
      }
      // Bia đá nhỏ sát trụ Bắc (nằm trên lề đường, không chắn lối đi)
      const steleX = faceSign > 0 ? 58 : 26;
      plotRect(ctx, steleX, 65, 12, 22, "#0b0e10");
      plotRect(ctx, steleX + 2, 67, 8, 18, "#39424a");
      plotRect(ctx, steleX + 3, 68, 3, 16, "#576470");
      plotRect(ctx, steleX + 5, 71, 2, 8, runeCol);

      if (isCave) {
        fillPixelEllipse(ctx, 48 - faceSign * 10, 88, 16, 20, "#05070b");
        fillPixelEllipse(ctx, 48, 56, 18, 28, stoneRamp[1]);
      }
      // Trụ Bắc (xa camera, nhân vật đi phía trước trụ này)
      drawSidePillar(86, 26);
    } else {
      // Layer Front: Trụ Nam (gần camera) + Xà dọc Bắc-Nam + Mái 2 tầng 3/4 vắt ngang đường
      drawSidePillar(140, 74);

      if (isCave) {
        for (let y = 18; y <= 84; y += 2) {
          const t = Math.abs(y - 51) / 33;
          const halfW = Math.round(11 + t * 5);
          plotRect(ctx, 48 - halfW, y, halfW * 2, 3, stoneRamp[0]);
          plotRect(ctx, 48 - halfW + 2, y, halfW * 2 - 4, 2, stoneRamp[2]);
          plotRect(ctx, 48 + (faceSign > 0 ? 2 : -halfW + 3), y, Math.max(3, halfW - 4), 2, stoneRamp[4]);
        }
        for (const [sy, sw] of [[24, 5], [38, 6], [52, 7], [66, 5]]) {
          const sx = faceSign > 0 ? 54 : 37;
          plotRect(ctx, sx, sy, sw, 4, stoneRamp[3]);
          plotPixel(ctx, sx + (faceSign > 0 ? sw : -1), sy + 1, runeHi);
        }
      } else {
        // Xà dọc gỗ mun kết nối Trụ Bắc -> Trụ Nam
        plotRect(ctx, 40, 22, 16, 62, "#0b0908");
        plotRect(ctx, 42, 24, 12, 58, "#291b14");
        plotRect(ctx, 48 + faceSign * 2, 24, 4, 58, "#473024");
        for (let dy = 26; dy <= 76; dy += 12) {
          plotRect(ctx, 37, dy, 22, 4, "#1f1510");
          plotRect(ctx, 38, dy + 1, 20, 2, "#856532");
        }

        // Mái ngói âm dương 2 tầng chạy dọc Bắc -> Nam (góc nghiêng 2.5D 3/4)
        for (let y = 14; y <= 88; y++) {
          const endDist = Math.min(y - 14, 88 - y);
          const halfW = endDist < 6 ? 12 + Math.round(endDist * 1.4) : 20;
          const isRib = (y & 3) === 0;
          for (let x = 48 - halfW; x <= 48 + halfW; x++) {
            const xDist = Math.abs(x - 48);
            const isEdge = y === 14 || y === 88 || x === 48 - halfW || x === 48 + halfW;
            const shade = isEdge ? 0 : isRib ? 3 : xDist < 9 ? 4 : x - 48 > 0 === faceSign > 0 ? 2 : 1;
            plotPixel(ctx, x, y, tileRamp[shade]);
          }
        }
        // Tầng mái thượng & sống nóc vàng đồng
        for (let y = 20; y <= 82; y++) {
          const endDist = Math.min(y - 20, 82 - y);
          const halfW = endDist < 4 ? 7 + endDist : 11;
          for (let x = 48 - halfW; x <= 48 + halfW; x++) {
            const isEdge = y === 20 || y === 82 || x === 48 - halfW || x === 48 + halfW;
            const isRib = (y & 3) === 0;
            plotPixel(ctx, x, y, tileRamp[isEdge ? 0 : isRib ? 4 : 2]);
          }
        }
        // Sống mái & 2 đầu đao cong vút hướng Bắc / Nam
        plotRect(ctx, 46, 17, 4, 68, "#59401a");
        plotRect(ctx, 47, 17, 2, 68, "#c29442");
        plotRect(ctx, 45, 13, 6, 4, "#ffd470");
        plotRect(ctx, 45, 85, 6, 4, "#ffd470");

        // Rêu bám mái
        plotRect(ctx, 35, 32, 6, 4, "#1f4729");
        plotRect(ctx, 52, 62, 5, 4, "#1f4729");

        // Bảng hoành phi & đèn lồng quay vào phía con đường bên trong bản đồ
        const faceX = 48 + faceSign * 14;
        plotRect(ctx, faceX - 4, 42, 8, 18, "#0d0a08");
        plotRect(ctx, faceX - 3, 43, 6, 16, "#1c130f");
        plotRect(ctx, faceX - 3, 43, 6, 1, "#b89042");
        plotRect(ctx, faceX - 1, 46, 2, 3, "#f0c869");
        plotRect(ctx, faceX - 1, 51, 2, 3, "#f0c869");

        const sway = f === 1 ? -1 : f === 3 ? 1 : 0;
        plotRect(ctx, faceX - 2 + sway, 64, 5, 9, "#17110a");
        plotRect(ctx, faceX - 1 + sway, 65, 3, 7, "#c93838");
        plotPixel(ctx, faceX + sway, 68, "#ffd470");

        if (isForest) {
          plotPixelLine(ctx, 32, 30, 34, 70, "#224d29", 2);
          plotPixelLine(ctx, 63, 38, 60, 76, "#224d29", 2);
        }
      }
      applySelectiveOutline(ctx, W, H, "#161d24", "#06080b");
    }

    const res = { canvas, anchorX, anchorY, solidRadius: 0 };
    GATE_CACHE.set(key, res);
    return res;
  }

  // Biến thể "ns" (Cổng Bắc/Nam bắc qua đường dọc — không nối thanh đá ngang chắn đường!)
  const W = 128;
  const H = 160;
  const anchorX = 64;
  const anchorY = 142;
  const { canvas, ctx } = createPixelCanvas(W, H);
  if (!ctx) {
    const stub = { canvas, anchorX, anchorY, solidRadius: 0 };
    GATE_CACHE.set(key, stub);
    return stub;
  }

  // 1. Sương mù pixel bảng lảng bên trong lòng cổng (không nối đá chắn đường)
  const mistShift = f * 3;
  for (let y = 96; y <= 140; y++) {
    const t = (y - 96) / 44;
    for (let x = 36; x <= 92; x++) {
      const edgeFade = Math.min(1, Math.min(x - 36, 92 - x) / 14);
      const wave = 0.25 + 0.3 * Math.sin((x + mistShift) * 0.14 + y * 0.2);
      if (bayerThreshold(x + mistShift, y) < edgeFade * wave * (0.5 + t * 0.4)) {
        ctx.fillStyle = isCave ? "rgba(77, 247, 192, 0.22)" : isForest ? "rgba(114, 245, 142, 0.2)" : "rgba(130, 225, 215, 0.22)";
        ctx.fillRect(x, y, 1, 1);
      }
    }
  }

  // 2. Hai Trụ Đá Lớn Cổ Kính Phủ Rêu & Khắc Cổ Ngữ Phát Sáng (đế đá tách rời hai bên lề đường)
  for (const [px, side] of [[18, -1], [92, 1]]) {
    fillPixelEllipse(ctx, px + 9, 142, 13, 4, "rgba(5, 8, 10, 0.45)", true);
    plotRect(ctx, px - 3, 126, 24, 15, stoneRamp[0]);
    plotRect(ctx, px - 1, 128, 20, 11, stoneRamp[3]);
    plotRect(ctx, px, 128, 8, 10, stoneRamp[4]);
    plotRect(ctx, px, 54, 18, 74, stoneRamp[0]);
    plotRect(ctx, px + 2, 55, 14, 72, stoneRamp[2]);
    plotRect(ctx, px + 2, 55, 5, 72, stoneRamp[4]);
    plotRect(ctx, px + 13, 55, 3, 72, stoneRamp[1]);
    plotRect(ctx, px + (side < 0 ? 2 : 9), 76, 6, 10, "#1c3b22");
    plotRect(ctx, px + (side < 0 ? 3 : 10), 77, 4, 6, "#2c5e35");
    plotRect(ctx, px + 4, 106, 9, 8, "#1c3b22");
    for (const ry of [66, 84, 100]) {
      plotRect(ctx, px + 7, ry, 4, 7, "#091715");
      plotRect(gCheck(ctx), px + 8, ry + 1, 2, 5, runeCol);
      plotPixel(ctx, px + 8, ry + 2, runeHi);
    }
  }

  // 3. Phần Mái Trên theo biến thể (Mountain Gate / Forest Arch / Cavern Mouth)
  if (isCave) {
    fillPixelEllipse(ctx, 64, 48, 52, 26, stoneRamp[0]);
    fillPixelEllipse(ctx, 64, 49, 49, 23, stoneRamp[2]);
    fillPixelEllipse(ctx, 64, 43, 40, 15, stoneRamp[4]);
    fillPixelEllipse(ctx, 64, 64, 28, 16, "#06080c");
    for (const [sx, sh] of [[42, 16], [52, 22], [64, 18], [76, 24], [85, 14]]) {
      for (let dy = 0; dy < sh; dy++) {
        const w = Math.max(1, Math.round((1 - dy / sh) * 5));
        plotRect(ctx, sx - Math.floor(w * 0.5), 50 + dy, w, 1, dy < sh * 0.4 ? stoneRamp[4] : stoneRamp[2]);
      }
      plotPixel(ctx, sx, 50 + sh, runeHi);
    }
    plotRect(ctx, 30, 38, 6, 4, runeCol);
    plotRect(ctx, 88, 36, 6, 5, runeCol);
  } else {
    plotRect(ctx, 14, 46, 100, 12, "#0b0908");
    plotRect(ctx, 16, 48, 96, 8, "#291b14");
    plotRect(ctx, 16, 48, 96, 3, "#473024");
    for (let dx = 22; dx <= 102; dx += 12) {
      plotRect(ctx, dx - 3, 42, 6, 6, "#1f1510");
      plotRect(ctx, dx - 2, 43, 4, 4, "#856532");
    }
    plotRect(ctx, 44, 45, 40, 13, "#0d0a08");
    plotRect(ctx, 46, 47, 36, 9, "#1c130f");
    plotRect(ctx, 46, 47, 36, 1, "#b89042");
    plotRect(ctx, 46, 55, 36, 1, "#8a682e");
    plotRect(ctx, 54, 49, 4, 4, "#f0c869");
    plotRect(ctx, 62, 49, 4, 4, "#f0c869");
    plotRect(ctx, 70, 49, 4, 4, "#f0c869");

    const drawTileRoof = (topY, botY, halfTop, halfBot) => {
      for (let y = topY; y <= botY; y++) {
        const t = (y - topY) / Math.max(1, botY - topY);
        const hw = Math.round(halfTop + (halfBot - halfTop) * t + (t > 0.78 ? 6 : 0));
        const lift = t > 0.78 ? -2 : 0;
        for (let x = 64 - hw; x <= 64 + hw; x++) {
          const isRib = ((x - 64) & 3) === 0;
          const chip = (x === 64 + hw - 5 && y > botY - 3) || (x === 64 - hw + 7 && y > botY - 2);
          if (chip) continue;
          const shadeIdx = y === topY || y === botY ? 0 : isRib ? Math.min(4, 2 + (t < 0.4 ? 2 : 1)) : 1 + (t < 0.35 ? 1 : 0);
          plotPixel(ctx, x, y + lift, tileRamp[shadeIdx]);
        }
      }
      plotRect(ctx, 64 - halfBot + 10, botY - 3, 9, 3, "#1f4729");
      plotRect(ctx, 64 + halfBot - 22, botY - 2, 7, 2, "#1f4729");
    };
    drawTileRoof(26, 44, 34, 54);
    drawTileRoof(11, 27, 16, 36);
    plotRect(ctx, 61, 6, 6, 6, "#8a682e");
    plotRect(ctx, 63, 4, 2, 3, "#ffd470");

    if (isForest) {
      plotPixelLine(ctx, 22, 38, 25, 78, "#224d29", 2);
      plotPixelLine(ctx, 102, 40, 99, 72, "#224d29", 2);
      plotRect(ctx, 20, 56, 6, 4, "#36733b");
      plotRect(ctx, 97, 52, 6, 4, "#36733b");
    }
  }

  // 4. Hai Lá Bùa Giấy Cổ Đung Đưa Theo Gió
  const swayPx = f === 1 ? -1 : f === 3 ? 1 : 0;
  for (const tx of [39, 86]) {
    plotRect(ctx, tx + swayPx, 58, 5, 13, "#17110a");
    plotRect(ctx, tx + 1 + swayPx, 59, 3, 10, "#ccb072");
    plotPixel(ctx, tx + 2 + swayPx, 61, "#a82424");
    plotPixel(ctx, tx + 2 + swayPx, 64, "#a82424");
    plotPixel(ctx, tx + 2 + swayPx, 67, "#a82424");
  }

  // 5. Bia Đá Địa Giới Cắm Bên Chân Trụ Trái
  plotRect(ctx, 4, 112, 14, 30, "#0b0e10");
  plotRect(ctx, 6, 114, 10, 26, "#39424a");
  plotRect(ctx, 7, 115, 4, 24, "#576470");
  plotRect(ctx, 9, 119, 3, 12, runeCol);
  plotRect(ctx, 5, 132, 8, 6, "#1f4729");

  applySelectiveOutline(ctx, W, H, "#161d24", "#06080b");

  const res = { canvas, anchorX, anchorY, solidRadius: 0 };
  GATE_CACHE.set(key, res);
  return res;
}

// ============================================================================
// 4. LÔI ĐÀI TỶ THÍ HOÀNH TRÁNG (ĐÁ XANH ĐEN 64x64 + BÁT QUÁI + TRỤ LỬA + CỜ)
// ============================================================================
let ARENA_ART_CACHE = null;
export function getArenaArtSet() {
  if (ARENA_ART_CACHE) return ARENA_ART_CACHE;

  // 4A. Tile Nền Đá Xanh Đen 64x64 có vết nứt, rêu & vết kiếm chém
  const tile = createPixelCanvas(64, 64);
  if (tile.ctx) {
    const tctx = tile.ctx;
    plotRect(tctx, 0, 0, 64, 64, "#11161c"); // Mạch vữa tối
    const slabs = [
      [0, 0, 31, 19], [32, 0, 31, 19],
      [0, 20, 15, 21], [16, 20, 31, 21], [48, 20, 15, 21],
      [0, 42, 31, 21], [32, 42, 31, 21],
    ];
    const tones = ["#262f3b", "#202833", "#2c3645", "#1c232d"];
    slabs.forEach(([sx, sy, sw, sh], idx) => {
      for (let y = sy; y < sy + sh; y++) {
        for (let x = sx; x < sx + sw; x++) {
          let c = tones[idx % tones.length];
          if (y === sy) c = "#3b4759";
          else if (bayerThreshold(x, y) > 0.72) c = "#2f3a4a";
          plotPixel(tctx, x, y, c);
        }
      }
    });
    // Rêu trong khe gạch & vết nứt + vết kiếm chém chéo
    plotRect(tctx, 14, 19, 6, 2, "#244729");
    plotRect(tctx, 44, 41, 7, 2, "#244729");
    plotPixelLine(tctx, 8, 8, 24, 15, "#151a21", 1);
    plotPixelLine(tctx, 38, 26, 54, 34, "#4b5a6e", 1); // Vết kiếm xước sáng nhẹ
    plotPixelLine(tctx, 39, 27, 55, 35, "#0d1117", 1);
  }

  // 4B. Trận Pháp Bát Quái Thái Cực Tâm Lôi Đài (168x112 pixel đối xứng)
  const bagua = createPixelCanvas(168, 112);
  if (bagua.ctx) {
    const bctx = bagua.ctx;
    const cx = 84;
    const cy = 56;
    plotPixelEllipse(bctx, cx, cy, 80, 52, "#151a22");
    plotPixelEllipse(bctx, cx, cy, 78, 50, "#9c7a3e");
    plotPixelEllipse(bctx, cx, cy, 76, 48, "#293340");
    plotPixelEllipse(bctx, cx, cy, 56, 36, "#7a5e2c", 2, 0);
    plotPixelEllipse(bctx, cx, cy, 32, 21, "#9c7a3e");
    // 8 tia Bát Quái
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      plotPixelLine(bctx, cx + Math.cos(a) * 32, cy + Math.sin(a) * 21, cx + Math.cos(a) * 74, cy + Math.sin(a) * 47, "#594827", 1);
      // Vạch quẻ ngắn tại bán kính ~66
      const qx = cx + Math.round(Math.cos(a) * 65);
      const qy = cy + Math.round(Math.sin(a) * 41);
      plotRect(bctx, qx - 3, qy - 1, 6, 2, i % 2 === 0 ? "#c89d54" : "#3a8f7c");
    }
    // Âm Dương Thái Cực Pixel ở giữa
    fillPixelEllipse(bctx, cx, cy, 22, 14, "#151821");
    for (let dy = -13; dy <= 13; dy++) {
      for (let dx = 0; dx <= 21; dx++) {
        if ((dx * dx) / 484 + (dy * dy) / 196 <= 1) plotPixel(bctx, cx + dx, cy + dy, "#8896ab");
      }
    }
    fillPixelEllipse(bctx, cx, cy - 7, 10, 7, "#8896ab");
    fillPixelEllipse(bctx, cx, cy + 7, 10, 7, "#151821");
    plotRect(bctx, cx - 2, cy - 8, 4, 3, "#151821");
    plotRect(bctx, cx - 2, cy + 6, 4, 3, "#5ef2d6");
  }

  // 4C. Trụ Đá Đầu Thú Chậu Lửa Linh Hồn 4-Frame (48x96)
  const braziers = [];
  for (let f = 0; f < 4; f++) {
    const { canvas, ctx } = createPixelCanvas(48, 96);
    if (ctx) {
      const tmp = createPixelCanvas(48, 96);
      const g = tmp.ctx;
      // Thân trụ đá xanh chạm khắc
      plotRect(g, 13, 74, 22, 12, "#242b33");
      plotRect(g, 16, 40, 16, 36, "#37414d");
      plotRect(g, 16, 40, 5, 36, "#556373");
      plotRect(g, 28, 40, 4, 36, "#1f252c");
      // Đầu thú đá nhe nanh mặt trước trụ
      plotRect(g, 15, 42, 18, 13, "#495666");
      plotRect(g, 18, 45, 3, 2, "#ff7b39");
      plotRect(g, 27, 45, 3, 2, "#ff7b39");
      plotRect(g, 19, 51, 2, 4, "#e6e0cf");
      plotRect(g, 27, 51, 2, 4, "#e6e0cf");
      // Chậu đồng cổ
      plotRect(g, 11, 31, 26, 9, "#5c421c");
      plotRect(g, 13, 32, 22, 5, "#8f692d");
      plotRect(g, 10, 29, 28, 3, "#c49445");
      // Ngọn lửa linh hồn bập bùng 4-frame
      const sw = f === 1 ? -2 : f === 3 ? 2 : 0;
      fillPixelEllipse(g, 24, 25, 9, 6, "#d93b18");
      fillPixelEllipse(g, 24 + Math.round(sw * 0.5), 21, 7, 7, "#ff7b26");
      fillPixelEllipse(g, 24 + sw, 17, 4, 6, "#ffda57");
      plotRect(g, 23 + sw, 18, 2, 4, "#ffffff");
      plotPixel(g, 21 - sw, 10 + f, "#ffda57");
      plotPixel(g, 28 + sw, 12 + ((f + 2) % 3), "#5ef2d6");

      applySelectiveOutline(g, 48, 96, "#1f2730", "#07090d");
      const glow = getDitherGlowSprite("#ff8f36", 20, 0.34);
      ctx.drawImage(glow, 4, 64);
      ctx.drawImage(tmp.canvas, 0, 0);
    }
    braziers.push({ canvas, anchorX: 24, anchorY: 84, solidRadius: 11 });
  }

  // 4D. Cờ Hiệu Gia Tộc Cổ Nguyệt 4-Frame (44x84)
  const banners = [];
  for (let f = 0; f < 4; f++) {
    const { canvas, ctx } = createPixelCanvas(44, 84);
    if (ctx) {
      const tmp = createPixelCanvas(44, 84);
      const g = tmp.ctx;
      plotRect(g, 10, 70, 12, 8, "#3a424d");
      plotRect(g, 14, 10, 3, 64, "#543419");
      plotRect(g, 13, 7, 5, 4, "#d9b25f");
      plotRect(g, 15, 13, 22, 2, "#8c692d");
      // Lá cờ bay phấp phới
      for (let y = 15; y <= 50; y++) {
        const wave = Math.round(Math.sin(y * 0.22 + f * 1.5) * 2);
        const w = y > 42 ? Math.max(4, 18 - (y - 42) * 2) : 18;
        plotRect(g, 17 + wave, y, w, 1, y < 18 || y > 47 ? "#9c7a3e" : "#151d2e");
        if (y >= 24 && y <= 36 && wave >= -1) {
          plotPixel(g, 25 + wave, y, "#5ef2d6");
        }
      }
      applySelectiveOutline(g, 44, 84, "#1e2430", "#07090d");
      ctx.drawImage(tmp.canvas, 0, 0);
    }
    banners.push({ canvas, anchorX: 16, anchorY: 76, solidRadius: 6 });
  }

  ARENA_ART_CACHE = { tile64: tile.canvas, baguaCenter: bagua.canvas, braziers, banners };
  return ARENA_ART_CACHE;
}

// ============================================================================
// 5. PIXEL FANTASY UI & ICONS BAKER (24x24 ICONS, 48x48 SLOTS, NGỌC GIẢN F, THẺ TRE)
// ============================================================================
const UI_ICON_CACHE = new Map();
let UI_FRAME_CACHE = null;

function paintUiIcon24(ctx, name) {
  const g = "#d9b25f";
  const gl = "#fff0b8";
  const gd = "#6e5224";
  const j = "#5ef2d6";
  const jd = "#186b60";
  const r = "#d94854";
  const rd = "#6e1720";
  const s = "#cbd5e1";

  const grid = (rows, pal, ox = 2, oy = 2) => {
    for (let y = 0; y < rows.length; y++) {
      for (let x = 0; x < rows[y].length; x++) {
        const col = pal[rows[y][x]];
        if (!col) continue;
        ctx.fillStyle = col;
        ctx.fillRect(ox + x * 2, oy + y * 2, 2, 2);
      }
    }
  };

  if (name === "map") {
    grid(
      [
        ".dddddddd.",
        "dggggbgggd",
        "dgjggbgggd",
        "dggggbjjgd",
        "dgdbbbgggd",
        "dgdrgggggd",
        "dggggbgggd",
        ".dddddddd.",
      ],
      { d: gd, g: "#c7b287", b: "#705d3a", j, r }
    );
  } else if (name === "tower") {
    grid(
      [
        "....ll....",
        "...dggd...",
        "..dggggd..",
        ".dggggggd.",
        "dggggggggd",
        "..djjjjd..",
        ".dggggggd.",
        "dddddddddd",
      ],
      { d: gd, g, l: gl, j }
    );
  } else if (name === "arena") {
    grid(
      [
        "s........s",
        ".ss....ss.",
        "..ss..ss..",
        "...rrrr...",
        "..ss..ss..",
        ".gg....gg.",
        "g........g",
      ],
      { s, r, g },
      2,
      4
    );
  } else if (name === "fishing") {
    grid(
      [
        "......ggg.",
        ".....g..j.",
        "....g...j.",
        "...g....j.",
        "..g..jj...",
        ".g..jbbj..",
        "g....jj...",
      ],
      { g, j, b: gl },
      2,
      4
    );
  } else if (name === "dragon") {
    grid(
      [
        ".gg....gg.",
        "gjjg..gjjg",
        ".djjjjjjd.",
        ".djrrjjrd.",
        "..djjjjd..",
        "..dggggd..",
        "...dddd...",
      ],
      { g, j: "#35b8a4", r, d: "#103b38" },
      2,
      4
    );
  } else if (name === "daily") {
    grid(
      [
        "...gggg...",
        "..dggggd..",
        "..dssssd..",
        "..dsggsd..",
        "..dssssd..",
        "..dsrrsd..",
        "..dddddd..",
      ],
      { d: gd, g, s: "#e2d4b4", r },
      2,
      4
    );
  } else if (name === "bag") {
    grid(
      [
        "...gggg...",
        "....dd....",
        "..dggggd..",
        ".dgllllgd.",
        ".dggjjggd.",
        ".dggggggd.",
        "..dddddd..",
      ],
      { d: gd, g: "#b58540", l: gl, j },
      2,
      4
    );
  } else if (name === "gu") {
    grid(
      [
        "..j....j..",
        "...dggd...",
        "..djjjjd..",
        ".gdjwwjdg.",
        "..djjjjd..",
        ".g.dggd.g.",
        "...d..d...",
      ],
      { d: jd, j, g, w: "#ffffff" },
      2,
      4
    );
  } else if (name === "char") {
    grid(
      [
        "...gggg...",
        "...ssss...",
        "...sggs...",
        "..djjjjd..",
        ".djjggjjd.",
        ".djjjjjjd.",
        "..dddddd..",
      ],
      { g, s: "#f0d6bd", d: "#1b2838", j: "#3d6e8f" },
      2,
      4
    );
  } else if (name === "flag") {
    grid(
      [
        ".g........",
        ".grrrrrrg.",
        ".grrrrrg..",
        ".grrrrrrg.",
        ".g........",
        ".g........",
        ".g........",
      ],
      { g, r },
      2,
      4
    );
  } else if (name === "mail") {
    grid(
      [
        "..........",
        "dddddddddd",
        "dggggggggd",
        "dgggrrgggd",
        "dggggggggd",
        "dddddddddd",
      ],
      { d: gd, g: "#d9c8a0", r },
      2,
      5
    );
  } else if (name === "settings") {
    grid(
      [
        "...s..s...",
        ".ss.ss.ss.",
        "..sggggs..",
        "ssgddddgss",
        "..sggggs..",
        ".ss.ss.ss.",
        "...s..s...",
      ],
      { s, g, d: "#11161f" },
      2,
      4
    );
  } else if (name === "lock") {
    grid(
      [
        "...ssss...",
        "..s....s..",
        ".dddddddd.",
        ".dggggggd.",
        ".dggddggd.",
        ".dggggggd.",
        ".dddddddd.",
      ],
      { s: "#8b9bb0", d: "#222936", g: "#58677d" },
      2,
      4
    );
  } else if (name === "attack") {
    grid(
      [
        ".......ww.",
        "......wws.",
        ".....wws..",
        "....wws...",
        ".ggwws....",
        "..gg......",
        ".d..g.....",
      ],
      { w: "#ffffff", s, g, d: gd },
      2,
      4
    );
  } else if (name === "absorb") {
    grid(
      [
        "....jj....",
        "...jwwj...",
        "..jwwwwj..",
        "..jwwjjj..",
        "...jjjj...",
        "....jj....",
      ],
      { j, w: "#ffffff" },
      2,
      5
    );
  } else if (name === "bamboo_slip") {
    grid(
      [
        ".g.g.g.g..",
        "dldldldld.",
        "gggggggggd",
        "dgdgdgdgd.",
        "dldldldld.",
        "gggggggggd",
        "dgdgdgdgd.",
      ],
      { d: "#2e401d", l: "#8fb359", g: "#5e8735" },
      2,
      4
    );
  } else {
    plotRect(ctx, 8, 8, 8, 8, j);
  }
}

export function getUiPixelIconDataUrl(name) {
  if (UI_ICON_CACHE.has(name)) return UI_ICON_CACHE.get(name);
  const { canvas, ctx } = createPixelCanvas(24, 24, true);
  if (ctx) {
    paintUiIcon24(ctx, name);
    applySelectiveOutline(ctx, 24, 24, "#1a1e29", "#07090d");
  }
  const url = typeof canvas.toDataURL === "function" ? canvas.toDataURL("image/png") : "";
  UI_ICON_CACHE.set(name, url);
  return url;
}

export function getUiFrameAssets() {
  if (UI_FRAME_CACHE) return UI_FRAME_CACHE;

  // Khung Kỹ Năng 48x48 đồng đen cổ nạm ngọc 4 góc
  const makeSlot = (size, innerTint = "#0c1118", cornerCol = "#4de0c9") => {
    const { canvas, ctx } = createPixelCanvas(size, size, true);
    if (ctx) {
      plotRect(ctx, 0, 0, size, size, "#06080d");
      plotRect(ctx, 1, 1, size - 2, size - 2, "#384659");
      plotRect(ctx, 2, 2, size - 4, size - 4, "#9c7a44");
      plotRect(ctx, 3, 3, size - 6, size - 6, "#1b2433");
      plotRect(ctx, 4, 4, size - 8, size - 8, innerTint);
      // Chốt đồng & ngọc bích 4 góc
      for (const [cx, cy] of [[1, 1], [size - 5, 1], [1, size - 5], [size - 5, size - 5]]) {
        plotRect(ctx, cx, cy, 4, 4, "#594322");
        plotRect(ctx, cx + 1, cy + 1, 2, 2, cornerCol);
      }
    }
    return typeof canvas.toDataURL === "function" ? canvas.toDataURL("image/png") : "";
  };

  // Ngọc Giản / Lệnh Bài Pixel 24x24 khắc chữ F
  const makeJadeTokenF = () => {
    const { canvas, ctx } = createPixelCanvas(24, 24, true);
    if (ctx) {
      plotRect(ctx, 4, 1, 16, 22, "#060a0d");
      plotRect(ctx, 5, 2, 14, 20, "#9c7a44");
      plotRect(ctx, 6, 3, 12, 18, "#165c52");
      plotRect(ctx, 7, 4, 10, 16, "#2bb598");
      plotRect(ctx, 7, 4, 4, 16, "#4de0c9");
      // Lỗ buộc dây đỉnh thẻ
      plotRect(ctx, 11, 3, 2, 2, "#ffd15c");
      // Chữ F pixel rõ nét viền tối
      plotRect(ctx, 9, 7, 7, 11, "#091c19");
      plotRect(ctx, 10, 8, 5, 2, "#fff9db");
      plotRect(ctx, 10, 8, 2, 9, "#fff9db");
      plotRect(ctx, 10, 12, 4, 2, "#fff9db");
    }
    return typeof canvas.toDataURL === "function" ? canvas.toDataURL("image/png") : "";
  };

  UI_FRAME_CACHE = {
    slot48Url: makeSlot(48, "#0b1017", "#4de0c9"),
    vital56Url: makeSlot(56, "#0d1f24", "#ffd15c"),
    jadeTokenFUrl: makeJadeTokenF(),
  };
  return UI_FRAME_CACHE;
}
