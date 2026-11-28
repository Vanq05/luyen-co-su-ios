/**
 * Bộ Dựng Pixel-Art Atlas Thủ Công 100% Lưới Pixel Nguyên (Strict 1px Integer Grid)
 * cho Bản Đồ Cổ Tiên Lộ:
 * - Không dùng ctx.arc tròn trơn cho tán cây/bụi cỏ; mọi tán lá, cành xù xì, lá trúc nhọn,
 *   rủ liễu, bụi cỏ ẩn thân, Nguyên Tuyền & Ruộng Linh Thảo đều dựng bằng pixel từng điểm.
 */

const ATLAS_CACHE = new Map();

function makeCanvas(w, h) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  return { canvas: c, ctx };
}

function hash(x, y) {
  let h = ((x | 0) * 374761393 + (y | 0) * 668265263) ^ 0x5bf03635;
  h = (h ^ (h >> 13)) * 1274126177;
  return Math.abs(h ^ (h >> 16));
}

export function getBiomeTileSet(biome, pal) {
  return getBiomeTerrainSet(biome, pal).midGrass;
}

export function getBiomeTerrainSet(biome, pal) {
  const key = `terrain_${biome}`;
  if (ATLAS_CACHE.has(key)) return ATLAS_CACHE.get(key);

  const shortGrass = [];
  const midGrass = [];
  const tallGrassFloor = [];
  const flowerMeadow = [];
  const packedDirt = [];
  const stonePlaza = [];
  const mossFloor = [];

  const gShort = pal.grassShort || pal.grass3 || pal.grass1;
  const gDeep = pal.grassDeep || pal.grassDark || "#2d5422";
  const d1 = pal.dirt1 || pal.path || "#9e8356";
  const d2 = pal.dirt2 || pal.pathEdge || "#78603c";
  const m1 = pal.moss1 || pal.grassDark || "#2d4f28";
  const m2 = pal.moss2 || "#1f3a1d";

  for (let v = 0; v < 8; v++) {
    // 1. Cỏ thấp thoáng (Short Grass)
    {
      const { canvas, ctx } = makeCanvas(16, 16);
      ctx.fillStyle = gShort;
      ctx.fillRect(0, 0, 16, 16);
      for (let py = 0; py < 16; py++) {
        for (let px = 0; px < 16; px++) {
          const h = hash(px + v * 19, py + v * 29);
          if (h % 11 === 0) {
            ctx.fillStyle = pal.grass1;
            ctx.fillRect(px, py, 1, 1);
          } else if (h % 23 === 0) {
            ctx.fillStyle = pal.grass3;
            ctx.fillRect(px, py, 1, 1);
          }
        }
      }
      if (v % 2 === 0) {
        const tx = 3 + (hash(v, 5) % 9);
        const ty = 4 + (hash(5, v) % 9);
        ctx.fillStyle = pal.grass2;
        ctx.fillRect(tx, ty, 2, 1);
      }
      shortGrass.push(canvas);
    }

    // 2. Cỏ vừa (Mid Grass)
    {
      const { canvas, ctx } = makeCanvas(16, 16);
      ctx.fillStyle = pal.grass1;
      ctx.fillRect(0, 0, 16, 16);
      for (let py = 0; py < 16; py++) {
        for (let px = 0; px < 16; px++) {
          const h = hash(px + v * 17, py + v * 31);
          if (h % 9 === 0) {
            ctx.fillStyle = pal.grass2;
            ctx.fillRect(px, py, 1, 1);
          } else if (h % 13 === 0) {
            ctx.fillStyle = pal.grass3;
            ctx.fillRect(px, py, 1, 1);
          }
        }
      }
      const tufts = 2 + (v % 2);
      for (let t = 0; t < tufts; t++) {
        const tx = 2 + (hash(v, t * 7) % 11);
        const ty = 3 + (hash(t * 11, v) % 10);
        ctx.fillStyle = pal.grassDark || "#3d6b2d";
        ctx.fillRect(tx, ty + 1, 3, 1);
        ctx.fillStyle = pal.grass3;
        ctx.fillRect(tx, ty, 1, 1);
        ctx.fillRect(tx + 2, ty - 1, 1, 2);
      }
      midGrass.push(canvas);
    }

    // 3. Nền khu cỏ cao rậm rạp (Tall Grass Floor)
    {
      const { canvas, ctx } = makeCanvas(16, 16);
      ctx.fillStyle = gDeep;
      ctx.fillRect(0, 0, 16, 16);
      for (let py = 0; py < 16; py++) {
        for (let px = 0; px < 16; px++) {
          const h = hash(px + v * 23, py + v * 41);
          if (h % 5 === 0) {
            ctx.fillStyle = pal.grass2;
            ctx.fillRect(px, py, 1, 1);
          } else if (h % 14 === 0) {
            ctx.fillStyle = pal.grassDark || "#214019";
            ctx.fillRect(px, py, 1, 1);
          }
        }
      }
      // Ngọn cỏ dày 3-5px xen kẽ đậm-nhạt
      for (let b = 0; b < 7; b++) {
        const bx = 1 + ((hash(v * 3, b * 13) % 13));
        const by = 4 + ((hash(b * 7, v * 11) % 10));
        ctx.fillStyle = pal.grassDark || "#1c3815";
        ctx.fillRect(bx, by + 1, 2, 1);
        ctx.fillStyle = pal.grass1;
        ctx.fillRect(bx, by - 2, 1, 3);
        ctx.fillStyle = pal.grass3;
        ctx.fillRect(bx + 1, by - 3, 1, 3);
      }
      tallGrassFloor.push(canvas);
    }

    // 4. Thảo nguyên hoa dại (Flower Meadow)
    {
      const { canvas, ctx } = makeCanvas(16, 16);
      ctx.drawImage(midGrass[v], 0, 0);
      const count = 2 + (v % 3);
      const petalColors =
        biome === "highland" || biome === "volcanic"
          ? ["#ffe066", "#ff9b54", "#fff4cc"]
          : biome === "snow"
            ? ["#d4f4ff", "#ffffff", "#b8d6ff"]
            : ["#fff8e6", "#ffb0cf", "#ffe066", "#d4b5ff"];
      for (let f = 0; f < count; f++) {
        const fx = 3 + (hash(v + 4, f * 9) % 10);
        const fy = 3 + (hash(f * 13, v + 2) % 10);
        const pCol = petalColors[(v + f) % petalColors.length];
        ctx.fillStyle = gDeep;
        ctx.fillRect(fx, fy + 1, 2, 2);
        ctx.fillStyle = pCol;
        ctx.fillRect(fx, fy - 1, 1, 1);
        ctx.fillRect(fx, fy + 1, 1, 1);
        ctx.fillRect(fx - 1, fy, 1, 1);
        ctx.fillRect(fx + 1, fy, 1, 1);
        ctx.fillStyle = "#f2c14e";
        ctx.fillRect(fx, fy, 1, 1);
      }
      flowerMeadow.push(canvas);
    }

    // 5. Đất nện / Bãi đất sỏi (Packed Dirt)
    {
      const { canvas, ctx } = makeCanvas(16, 16);
      ctx.fillStyle = d1;
      ctx.fillRect(0, 0, 16, 16);
      for (let py = 0; py < 16; py++) {
        for (let px = 0; px < 16; px++) {
          const h = hash(px + v * 37, py + v * 13);
          if (h % 6 === 0) {
            ctx.fillStyle = d2;
            ctx.fillRect(px, py, 1, 1);
          } else if (h % 19 === 0) {
            ctx.fillStyle = "rgba(255, 240, 200, 0.16)";
            ctx.fillRect(px, py, 2, 1);
          }
        }
      }
      // Sỏi đá nhỏ
      const sx = 2 + (hash(v, 3) % 10);
      const sy = 3 + (hash(3, v) % 9);
      ctx.fillStyle = "#524638";
      ctx.fillRect(sx, sy, 2, 2);
      ctx.fillStyle = "#b5a68e";
      ctx.fillRect(sx, sy, 1, 1);
      packedDirt.push(canvas);
    }

    // 6. Sân gạch đá cổ (Stone Plaza)
    {
      const { canvas, ctx } = makeCanvas(16, 16);
      const sBase = biome === "volcanic" || biome === "abyss" ? "#464b52" : biome === "snow" ? "#9aa6b0" : "#8e887c";
      const sHi = biome === "volcanic" || biome === "abyss" ? "#5d646e" : biome === "snow" ? "#bac5cf" : "#a8a194";
      const sDark = biome === "volcanic" || biome === "abyss" ? "#26292e" : "#59544b";
      ctx.fillStyle = sBase;
      ctx.fillRect(0, 0, 16, 16);
      // Mạch vữa đá
      ctx.fillStyle = sDark;
      ctx.fillRect(0, 7, 16, 1);
      ctx.fillRect(0, 15, 16, 1);
      ctx.fillRect(7, 0, 1, 8);
      ctx.fillRect(15, 8, 1, 8);
      // Cạnh sáng phiến đá
      ctx.fillStyle = sHi;
      ctx.fillRect(1, 1, 5, 1);
      ctx.fillRect(9, 1, 5, 1);
      ctx.fillRect(1, 9, 13, 1);
      // Rêu khe đá & vết nứt
      if (v % 3 === 0) {
        ctx.fillStyle = pal.grassDark || "#3d6b2d";
        ctx.fillRect(6, 6, 3, 2);
      }
      if (v % 2 === 1) {
        ctx.fillStyle = sDark;
        ctx.fillRect(3 + (v % 4), 3, 2, 1);
      }
      stonePlaza.push(canvas);
    }

    // 7. Đất rừng phủ rêu & lá rụng (Moss Floor)
    {
      const { canvas, ctx } = makeCanvas(16, 16);
      ctx.fillStyle = m1;
      ctx.fillRect(0, 0, 16, 16);
      for (let py = 0; py < 16; py++) {
        for (let px = 0; px < 16; px++) {
          const h = hash(px + v * 29, py + v * 17);
          if (h % 5 === 0) {
            ctx.fillStyle = m2;
            ctx.fillRect(px, py, 1, 1);
          } else if (h % 17 === 0) {
            ctx.fillStyle = pal.grass2;
            ctx.fillRect(px, py, 2, 1);
          }
        }
      }
      if (v % 2 === 0) {
        ctx.fillStyle = biome === "lakeside" || biome === "village" ? "#ffa3c6" : biome === "highland" ? "#d9652b" : "#9c7b49";
        ctx.fillRect(4 + (v % 7), 5 + ((v * 3) % 6), 2, 1);
      }
      mossFloor.push(canvas);
    }
  }

  const res = { shortGrass, midGrass, tallGrassFloor, flowerMeadow, packedDirt, stonePlaza, mossFloor };
  ATLAS_CACHE.set(key, res);
  return res;
}

/** Bóng đổ pixel dither 1px (không viền mờ trơn). */
function drawPixelShadow(ctx, cx, cy, rx, ry, alpha = 0.28) {
  ctx.fillStyle = `rgba(10, 14, 9, ${alpha})`;
  const minX = Math.floor(cx - rx);
  const maxX = Math.ceil(cx + rx);
  const minY = Math.floor(cy - ry);
  const maxY = Math.ceil(cy + ry);
  for (let py = minY; py <= maxY; py++) {
    for (let px = minX; px <= maxX; px++) {
      const nx = (px - cx) / Math.max(1, rx);
      const ny = (py - cy) / Math.max(1, ry);
      const d2 = nx * nx + ny * ny;
      if (d2 <= 0.78 || (d2 <= 1.0 && ((px + py) & 1) === 0)) {
        ctx.fillRect(px, py, 1, 1);
      }
    }
  }
}

/** Vẽ đoạn thân / cành / rễ xù xì theo đường cong nội suy 1px. */
function paintGnarledSegment(ctx, x0, y0, x1, y1, w0, w1, barkShades, bend = 0) {
  const steps = Math.max(8, Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 1.4));
  const [cOut, cDark, cMid, cHi] = barkShades;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const bx = x0 + (x1 - x0) * t + Math.sin(t * Math.PI) * bend;
    const by = y0 + (y1 - y0) * t;
    const half = Math.max(0.5, (w0 + (w1 - w0) * t) * 0.5);
    const ix = Math.round(bx);
    const iy = Math.round(by);
    const lx = Math.round(ix - half);
    const rx = Math.round(ix + half);
    const span = Math.max(1, rx - lx + 1);

    ctx.fillStyle = cOut;
    ctx.fillRect(lx - 1, iy, span + 2, 2);
    ctx.fillStyle = cDark;
    ctx.fillRect(lx, iy, span, 2);
    if (span >= 3) {
      ctx.fillStyle = cMid;
      ctx.fillRect(lx, iy, Math.max(1, Math.floor(span * 0.68)), 2);
    }
    if (span >= 4 && ((iy + (hash(ix, iy) % 3)) % 2 === 0)) {
      ctx.fillStyle = cHi;
      ctx.fillRect(lx + 1, iy, Math.max(1, Math.floor(span * 0.28)), 1);
    }
  }
}

/**
 * Tô tán lá pixel hữu cơ có rìa răng cưa cụm lá, hốc tối lộ cành và viền tối 1px sắc nét.
 * shades = [outline, deepShadow, shadowMid, midBright, hiLight, sparkle]
 */
function paintPixelCanopy(ctx, W, H, lobes, shades, opts = {}) {
  const mask = new Uint8Array(W * H);
  const owner = new Int16Array(W * H);
  owner.fill(-1);

  const tuftAmp = opts.tuftAmp ?? 0.16;
  const flatBottom = Boolean(opts.flatBottom);

  for (let li = 0; li < lobes.length; li++) {
    const l = lobes[li];
    const pad = Math.ceil(Math.max(l.rx, l.ry) * 1.35) + 2;
    const minX = Math.max(1, Math.floor(l.cx - pad));
    const maxX = Math.min(W - 2, Math.ceil(l.cx + pad));
    const minY = Math.max(1, Math.floor(l.cy - pad));
    const maxY = Math.min(H - 2, Math.ceil(l.cy + pad));

    for (let py = minY; py <= maxY; py++) {
      for (let px = minX; px <= maxX; px++) {
        const dx = px - l.cx;
        const dy = py - l.cy;
        const angle = Math.atan2(dy, dx);
        let ryEff = l.ry;
        if (flatBottom && dy > 0) ryEff = l.ry * 0.62;
        const nx = dx / Math.max(1, l.rx);
        const ny = dy / Math.max(1, ryEff);
        const wave =
          1 +
          tuftAmp * Math.sin(angle * 5 + l.seed) +
          tuftAmp * 0.65 * Math.cos(angle * 8 - l.seed * 1.7) +
          (((hash(px >> 1, py >> 1) % 5) - 2) * 0.032);
        const dist = Math.hypot(nx, ny);
        if (dist <= wave) {
          const idx = py * W + px;
          mask[idx] = 1;
          owner[idx] = li;
        }
      }
    }
  }

  // Đục các khe nhỏ dưới tán để lộ thân cành tạo chiều sâu thực
  for (const gap of opts.gaps ?? []) {
    for (let py = Math.max(1, Math.floor(gap.cy - gap.ry)); py <= Math.min(H - 2, Math.ceil(gap.cy + gap.ry)); py++) {
      for (let px = Math.max(1, Math.floor(gap.cx - gap.rx)); px <= Math.min(W - 2, Math.ceil(gap.cx + gap.rx)); px++) {
        const nx = (px - gap.cx) / gap.rx;
        const ny = (py - gap.cy) / gap.ry;
        if (nx * nx + ny * ny <= 0.95) {
          mask[py * W + px] = 0;
        }
      }
    }
  }

  // Thêm các chùm lá nhỏ 2x2 nhô ra tự nhiên dọc biên tán
  if (!opts.noOuterTufts) {
    const copy = new Uint8Array(mask);
    for (let py = 2; py < H - 3; py++) {
      for (let px = 2; px < W - 3; px++) {
        const idx = py * W + px;
        if (copy[idx] === 1) continue;
        const adj = copy[idx - 1] + copy[idx + 1] + copy[idx - W] + copy[idx + W];
        if (adj >= 1 && hash(px * 3 + 7, py * 5 + 11) % 11 === 0) {
          mask[idx] = 1;
          if (copy[idx + W] === 1) owner[idx] = owner[idx + W];
          else if (copy[idx - 1] === 1) owner[idx] = owner[idx - 1];
          else owner[idx] = owner[idx - W] >= 0 ? owner[idx - W] : 0;
        }
      }
    }
  }

  // Tô bóng 4-5 tầng pixel + dither cụm lá 2x2 + viền tối 1px
  for (let py = 1; py < H - 1; py++) {
    for (let px = 1; px < W - 1; px++) {
      const idx = py * W + px;
      if (!mask[idx]) continue;

      const isEdge = !mask[idx - 1] || !mask[idx + 1] || !mask[idx - W] || !mask[idx + W];
      if (isEdge) {
        ctx.fillStyle = shades[0];
        ctx.fillRect(px, py, 1, 1);
        continue;
      }

      const li = Math.max(0, owner[idx]);
      const l = lobes[li] ?? lobes[0];
      const relX = (px - l.cx) / Math.max(1, l.rx);
      const relY = (py - l.cy) / Math.max(1, l.ry);
      // Ánh sáng chiếu từ trên-trái
      let light = 0.52 - relX * 0.24 - relY * 0.44 + (l.bias ?? 0);
      // Cụm lá dither 2x2
      const clump = (hash(px >> 1, py >> 1) % 5) * 0.06 - 0.12;
      const speck = (hash(px, py) % 3) * 0.03 - 0.03;
      light += clump + speck;

      let shadeIdx = 2;
      if (light < 0.28) shadeIdx = 1;
      else if (light < 0.5) shadeIdx = 2;
      else if (light < 0.74) shadeIdx = 3;
      else shadeIdx = 4;

      if (opts.hangFringe && !mask[idx + W * 2]) {
        shadeIdx = 1;
      }

      ctx.fillStyle = shades[Math.min(shades.length - 1, shadeIdx)];
      ctx.fillRect(px, py, 1, 1);

      // Đốm hoa/lá sáng đỉnh
      if (shades[5] && shadeIdx === 4 && hash(px * 7, py * 13) % 13 === 0) {
        ctx.fillStyle = shades[5];
        ctx.fillRect(px, py, 1, 1);
      }
    }
  }

  return mask;
}

/** Vẽ gai lá nhọn (dùng cho bụi trúc & cỏ ẩn thân) hoàn toàn theo đường pixel nguyên. */
function paintSharpLeafBlade(ctx, x0, y0, dx, dy, len, colDark, colMid, colHi) {
  const steps = Math.max(3, Math.ceil(len));
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const px = Math.round(x0 + dx * t * len);
    const py = Math.round(y0 + dy * t * len);
    const thick = t < 0.55 ? 2 : 1;
    ctx.fillStyle = t < 0.25 ? colDark : t < 0.78 ? colMid : colHi;
    ctx.fillRect(px, py, thick, 1);
  }
}

/** Vẽ tàu lá bản rộng uốn cong (cây chuối Nam Cương, dương xỉ) trên lưới pixel nguyên. */
function paintBroadFrond(ctx, x0, y0, dx, dy, len, width, shades) {
  const [cOut, cDark, cMid, cHi] = shades;
  const steps = Math.max(5, Math.ceil(len));
  const nx = -dy;
  const ny = dx;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const arch = Math.sin(t * Math.PI) * (dy >= 0 ? -3 : 2);
    const cx = x0 + dx * t * len;
    const cy = y0 + dy * t * len + arch + t * t * 3.5;
    const w = Math.max(1, Math.round(Math.sin(Math.pow(t, 0.7) * Math.PI) * width));
    for (let s = -w; s <= w; s++) {
      const px = Math.round(cx + nx * s);
      const py = Math.round(cy + ny * s);
      const isEdge = Math.abs(s) === w || i === steps;
      ctx.fillStyle = isEdge ? cOut : s === 0 ? cHi : s < 0 ? cMid : cDark;
      ctx.fillRect(px, py, 1, 1);
    }
  }
}

/**
 * Vẽ mái ngói âm dương / lưu ly nhiều tầng lớp pixel chuẩn 2.5D Cổ Phong:
 * - Xếp ngói theo từng hàng ngang so le có bóng đổ mí ngói (không bị sọc tôn dọc),
 *   lưng nóc võng nhẹ (saddle curve), sườn đao chéo & đầu đao cong vút + chuông đồng.
 */
function drawLayeredTileRoof(ctx, { cx, topY, topHalfW, botHalfW, roofH, shades, ridgeCol = "#9c7a3e", trimCol = "#8a6b35", finials = true }) {
  const [cOut, cDeep, cMidDark, cMid, cLit, cSpec] = shades;
  const rowH = 4;

  for (let dy = 0; dy <= roofH; dy++) {
    const t = dy / Math.max(1, roofH);
    const flare = Math.pow(t, 1.18);
    const half = Math.round(topHalfW + (botHalfW - topHalfW) * flare);
    const centerSag = topHalfW >= 8 ? Math.round((1 - t) * 1.4) : 0;
    const py = topY + dy + centerSag;

    // Bóng viền ngoài & bóng đáy mái
    ctx.fillStyle = cOut;
    ctx.fillRect(cx - half - 2, py, half * 2 + 4, 2);

    const rowCourse = Math.floor(dy / rowH);
    const rowStep = dy % rowH;

    for (let dx = -half; dx <= half; dx++) {
      const edgeDist = half - Math.abs(dx);
      const flareSpan = Math.min(10, Math.max(5, Math.round(botHalfW * 0.2)));
      const up = edgeDist < flareSpan ? Math.round(((flareSpan - edgeDist) / flareSpan) * t * 5.2) : 0;
      const drawY = py - up;

      // Nhịp ống ngói âm dương rộng 3px, có ngắt hàng ngang rõ nét
      const seamOffset = (rowCourse & 1) === 1 ? 1 : 0;
      const tileSlot = (((dx + seamOffset) % 3) + 3) % 3;
      const isLeftLit = dx < half * 0.12;
      const isFarRightShadow = dx > half * 0.55;

      let col;
      if (rowStep === rowH - 1 && dy > 2) {
        // Mí bóng đổ giữa hai hàng ngói
        col = cDeep;
      } else if (rowStep === 0 && dy > 1) {
        // Cạnh gờ ngói bắt sáng nhẹ
        col = isLeftLit ? (tileSlot === 1 ? cSpec : cLit) : isFarRightShadow ? cMidDark : cMid;
      } else {
        if (tileSlot === 0) col = isLeftLit ? cLit : cMid;
        else if (tileSlot === 1) col = isLeftLit ? cMid : cMidDark;
        else col = isFarRightShadow ? cDeep : cMidDark;
      }

      // Rêu phong & vết bồ hóng cổ kính lấm tấm trên mái ngói
      const wHash = hash(dx + topY * 3, dy + botHalfW);
      if (dy > 3 && wHash % 29 === 0) {
        col = wHash % 58 === 0 ? "#23422b" : "#0b0f12";
      }

      // Sườn đao chéo nổi gân đồng cổ/đá dọc hai mép mái
      const diagSlope = Math.round(topHalfW + (botHalfW - topHalfW) * flare) - 3;
      if (Math.abs(Math.abs(dx) - diagSlope) <= 1 && dy > 1 && botHalfW >= 24) {
        col = Math.abs(dx) - diagSlope === 0 ? trimCol : cOut;
      }

      ctx.fillStyle = col;
      ctx.fillRect(cx + dx, drawY, 1, 1);
    }
  }

  // Diềm ngói câu đầu (giọt nước) dọc mép dưới
  const flareSpan = Math.min(10, Math.max(5, Math.round(botHalfW * 0.2)));
  for (let dx = -botHalfW; dx <= botHalfW; dx += 3) {
    const edgeDist = botHalfW - Math.abs(dx);
    const up = edgeDist < flareSpan ? Math.round(((flareSpan - edgeDist) / flareSpan) * 5.2) : 0;
    const py = topY + roofH - up;
    ctx.fillStyle = cOut;
    ctx.fillRect(cx + dx - 1, py + 1, 3, 2);
    ctx.fillStyle = trimCol;
    ctx.fillRect(cx + dx, py + 1, 2, 1);
  }

  // Hai góc đầu đao cong vút + chuông đồng cổ nhỏ dưới chóp
  for (const dir of [-1, 1]) {
    const tipX = cx + dir * (botHalfW + 1);
    const tipY = topY + roofH - 5;
    ctx.fillStyle = cOut;
    ctx.fillRect(tipX - 2, tipY - 3, 5, 4);
    ctx.fillStyle = trimCol;
    ctx.fillRect(tipX - 1, tipY - 4, 3, 3);
    ctx.fillStyle = "#cbb07a";
    ctx.fillRect(tipX + (dir > 0 ? 1 : -1), tipY - 4, 1, 1);
    // Chuông đồng rủ dưới góc đao
    ctx.fillStyle = ridgeCol;
    ctx.fillRect(tipX - dir * 2, tipY + 1, 1, 2);
  }

  // Bờ nóc chính võng nhẹ & Chi Vẫn (đầu rồng 2 đầu nóc)
  for (let dx = -topHalfW - 1; dx <= topHalfW + 1; dx++) {
    const arc = topHalfW >= 8 ? Math.round((1 - Math.abs(dx) / Math.max(1, topHalfW)) * 1.4) : 0;
    const ry = topY + arc;
    ctx.fillStyle = cOut;
    ctx.fillRect(cx + dx, ry - 2, 1, 4);
    ctx.fillStyle = ridgeCol;
    ctx.fillRect(cx + dx, ry - 1, 1, 2);
    if (Math.abs(dx) % 4 === 0) {
      ctx.fillStyle = "#cbb07a";
      ctx.fillRect(cx + dx, ry - 1, 1, 1);
    }
  }
  if (finials && topHalfW >= 12) {
    for (const dir of [-1, 1]) {
      const rx = cx + dir * topHalfW;
      ctx.fillStyle = cOut;
      ctx.fillRect(rx - 2, topY - 6, 5, 6);
      ctx.fillStyle = ridgeCol;
      ctx.fillRect(rx - 1, topY - 5, 3, 5);
      ctx.fillStyle = "#cbb07a";
      ctx.fillRect(rx + dir, topY - 6, 1, 2);
    }
  }
}

/** Vẽ hàng đấu củng cổ sẫm màu & bóng hiên dưới mái. */
function drawDouGongFrieze(ctx, x0, x1, y, beamCol = "#26110d", bracketA = "#214d3d", bracketB = "#9c7a3e") {
  ctx.fillStyle = "#0e0806";
  ctx.fillRect(x0, y, x1 - x0, 6);
  ctx.fillStyle = beamCol;
  ctx.fillRect(x0 + 1, y + 4, x1 - x0 - 2, 2);
  for (let bx = x0 + 4; bx <= x1 - 8; bx += 8) {
    ctx.fillStyle = bracketA;
    ctx.fillRect(bx, y + 1, 5, 2);
    ctx.fillStyle = bracketB;
    ctx.fillRect(bx + 1, y + 3, 3, 2);
  }
}

/** Vẽ cửa sổ song gỗ phát ánh đèn ấm bên trong. */
function drawLatticeWindow(ctx, x, y, w, h, frameCol = "#26120c", mullionCol = "#4a2214", bgTop = "#b87f2e", bgBot = "#d9b268") {
  ctx.fillStyle = frameCol;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = bgTop;
  ctx.fillRect(x + 2, y + 2, w - 4, h - 4);
  ctx.fillStyle = bgBot;
  ctx.fillRect(x + 2, y + 2, w - 4, Math.max(3, Math.floor((h - 4) * 0.52)));
  ctx.fillStyle = mullionCol;
  const midX = x + Math.floor(w / 2);
  const midY = y + Math.floor(h / 2);
  ctx.fillRect(midX - 1, y + 2, 2, h - 4);
  ctx.fillRect(x + 2, midY - 1, w - 4, 2);
  if (w >= 16) {
    ctx.fillRect(x + 5, y + 2, 1, h - 4);
    ctx.fillRect(x + w - 6, y + 2, 1, h - 4);
  }
  ctx.fillStyle = "#5c2b1a";
  ctx.fillRect(x - 1, y + h - 1, w + 2, 3);
  ctx.fillStyle = "#a35a38";
  ctx.fillRect(x, y + h - 1, w, 1);
}

export function getPropSprite(kind) {
  if (ATLAS_CACHE.has(kind)) return ATLAS_CACHE.get(kind);

  let result = null;
  const peachBark = ["#1e100c", "#3a2117", "#5c3626", "#804e38"];
  const pineBark = ["#21110d", "#452318", "#6b3826", "#91533b"];

  if (kind === "peach" || kind === "peach_2") {
    const v2 = kind === "peach_2";
    const W = 80;
    const H = 88;
    const { canvas, ctx } = makeCanvas(W, H);
    drawPixelShadow(ctx, 40, 77, 25, 7, 0.28);

    // Rễ nổi uốn lượn 3 nhánh
    paintGnarledSegment(ctx, 40, 68, 28, 77, 5, 2, peachBark, 2);
    paintGnarledSegment(ctx, 40, 68, 52, 77, 5, 2, peachBark, -2);
    paintGnarledSegment(ctx, 40, 69, 41, 78, 5, 2, peachBark, 0);

    // Thân chính uốn cong + cành chĩa 2 bên
    paintGnarledSegment(ctx, 40, 72, v2 ? 36 : 43, 45, 9, 6, peachBark, v2 ? 3 : -3);
    paintGnarledSegment(ctx, v2 ? 36 : 43, 46, 21, 32, 5, 2, peachBark, -2);
    paintGnarledSegment(ctx, v2 ? 36 : 43, 44, 58, 33, 5, 2, peachBark, 2);
    paintGnarledSegment(ctx, 39, 43, 39, 25, 4, 2, peachBark, v2 ? -2 : 2);

    // Tán hoa đào pixel nhiều thùy lộ khe nhánh
    const sakuraShades = ["#3d1022", "#751e43", "#b83b6a", "#eb719f", "#ffb3d0", "#fff0f6"];
    const lobes = v2
      ? [
          { cx: 20, cy: 32, rx: 14, ry: 11, seed: 1.1, bias: -0.05 },
          { cx: 59, cy: 33, rx: 14, ry: 11, seed: 2.3, bias: -0.08 },
          { cx: 29, cy: 23, rx: 15, ry: 12, seed: 0.7, bias: 0.05 },
          { cx: 50, cy: 23, rx: 14, ry: 11, seed: 3.1, bias: 0.02 },
          { cx: 40, cy: 15, rx: 16, ry: 11, seed: 1.9, bias: 0.1 },
          { cx: 36, cy: 34, rx: 11, ry: 9, seed: 2.8, bias: -0.04 },
        ]
      : [
          { cx: 19, cy: 31, rx: 14, ry: 11, seed: 0.4, bias: -0.04 },
          { cx: 60, cy: 31, rx: 14, ry: 11, seed: 1.8, bias: -0.08 },
          { cx: 40, cy: 27, rx: 17, ry: 12, seed: 2.6, bias: 0.02 },
          { cx: 28, cy: 19, rx: 14, ry: 11, seed: 3.4, bias: 0.08 },
          { cx: 52, cy: 20, rx: 14, ry: 11, seed: 0.9, bias: 0.03 },
          { cx: 39, cy: 13, rx: 14, ry: 10, seed: 2.1, bias: 0.12 },
        ];
    paintPixelCanopy(ctx, W, H, lobes, sakuraShades, {
      tuftAmp: 0.17,
      gaps: [{ cx: 39, cy: 38, rx: 4, ry: 3 }],
    });

    // Điểm xuyết từng bông đào 3x3 sáng rực
    const blossoms = v2 ? [[27, 18], [41, 11], [52, 20], [18, 29], [58, 29]] : [[25, 16], [40, 10], [51, 17], [17, 28], [60, 28]];
    for (const [bx, by] of blossoms) {
      ctx.fillStyle = "#ffeaf3";
      ctx.fillRect(bx, by - 1, 1, 3);
      ctx.fillRect(bx - 1, by, 3, 1);
      ctx.fillStyle = "#ffd166";
      ctx.fillRect(bx, by, 1, 1);
    }

    // Cánh hoa rơi quanh gốc
    const petals = [[21, 79], [28, 82], [49, 80], [56, 78], [35, 83]];
    for (const [px, py] of petals) {
      ctx.fillStyle = "#ff99c2";
      ctx.fillRect(px, py, 2, 1);
    }

    result = { canvas, anchorX: 40, anchorY: 77, solidRadius: 10 };
  } else if (kind === "peach_giant") {
    const W = 104;
    const H = 112;
    const { canvas, ctx } = makeCanvas(W, H);
    drawPixelShadow(ctx, 52, 98, 34, 9, 0.28);
    paintGnarledSegment(ctx, 52, 86, 33, 98, 6, 2, peachBark, 3);
    paintGnarledSegment(ctx, 52, 86, 70, 98, 6, 2, peachBark, -3);
    paintGnarledSegment(ctx, 52, 87, 52, 99, 6, 2, peachBark, 0);
    paintGnarledSegment(ctx, 52, 92, 50, 54, 13, 8, peachBark, -4);
    paintGnarledSegment(ctx, 50, 56, 24, 38, 7, 3, peachBark, -3);
    paintGnarledSegment(ctx, 50, 54, 78, 39, 7, 3, peachBark, 3);
    paintGnarledSegment(ctx, 50, 50, 51, 28, 6, 3, peachBark, 2);

    const sakuraShades = ["#3d1022", "#751e43", "#b83b6a", "#eb719f", "#ffb3d0", "#fff0f6"];
    paintPixelCanopy(
      ctx,
      W,
      H,
      [
        { cx: 22, cy: 38, rx: 17, ry: 13, seed: 0.6, bias: -0.05 },
        { cx: 81, cy: 39, rx: 17, ry: 13, seed: 2.1, bias: -0.08 },
        { cx: 52, cy: 36, rx: 20, ry: 13, seed: 1.4, bias: 0.02 },
        { cx: 33, cy: 25, rx: 18, ry: 13, seed: 2.9, bias: 0.07 },
        { cx: 70, cy: 26, rx: 17, ry: 13, seed: 0.8, bias: 0.03 },
        { cx: 51, cy: 17, rx: 18, ry: 12, seed: 1.7, bias: 0.12 },
        { cx: 40, cy: 43, rx: 12, ry: 9, seed: 3.1, bias: -0.04 },
        { cx: 64, cy: 43, rx: 12, ry: 9, seed: 2.5, bias: -0.06 },
      ],
      sakuraShades,
      { tuftAmp: 0.17, gaps: [{ cx: 51, cy: 46, rx: 6, ry: 3 }] }
    );
    for (const [bx, by] of [[31, 21], [52, 13], [69, 22], [20, 34], [80, 35], [47, 29]]) {
      ctx.fillStyle = "#ffeaf3";
      ctx.fillRect(bx, by - 1, 1, 3);
      ctx.fillRect(bx - 1, by, 3, 1);
      ctx.fillStyle = "#ffd166";
      ctx.fillRect(bx, by, 1, 1);
    }
    for (const [px, py] of [[24, 100], [38, 103], [62, 102], [75, 99], [46, 104], [58, 97]]) {
      ctx.fillStyle = "#ff99c2";
      ctx.fillRect(px, py, 2, 1);
    }
    result = { canvas, anchorX: 52, anchorY: 98, solidRadius: 14 };
  } else if (kind === "peach_small") {
    const W = 48;
    const H = 54;
    const { canvas, ctx } = makeCanvas(W, H);
    drawPixelShadow(ctx, 24, 47, 13, 4, 0.24);
    paintGnarledSegment(ctx, 24, 47, 23, 27, 5, 3, peachBark, 2);
    paintGnarledSegment(ctx, 23, 30, 16, 22, 3, 2, peachBark, -1);
    paintGnarledSegment(ctx, 23, 29, 31, 22, 3, 2, peachBark, 1);
    const sakuraShades = ["#3d1022", "#751e43", "#b83b6a", "#eb719f", "#ffb3d0", "#fff0f6"];
    paintPixelCanopy(
      ctx,
      W,
      H,
      [
        { cx: 15, cy: 22, rx: 9, ry: 8, seed: 1.1 },
        { cx: 32, cy: 22, rx: 9, ry: 8, seed: 2.3 },
        { cx: 24, cy: 15, rx: 11, ry: 9, seed: 0.7, bias: 0.08 },
      ],
      sakuraShades,
      { tuftAmp: 0.16 }
    );
    ctx.fillStyle = "#ffeaf3";
    ctx.fillRect(22, 13, 2, 1);
    ctx.fillRect(15, 20, 2, 1);
    result = { canvas, anchorX: 24, anchorY: 47, solidRadius: 4 };
  } else if (kind === "ancient_banyan") {
    // Đa Cổ Thụ Ngàn Năm khổng lồ với rễ phụ buông rủ & đốm linh khí
    const W = 116;
    const H = 126;
    const { canvas, ctx } = makeCanvas(W, H);
    drawPixelShadow(ctx, 58, 110, 40, 11, 0.3);
    const banyanBark = ["#16110d", "#2e2218", "#4d3826", "#705338"];
    paintGnarledSegment(ctx, 58, 96, 30, 110, 8, 3, banyanBark, 4);
    paintGnarledSegment(ctx, 58, 96, 86, 110, 8, 3, banyanBark, -4);
    paintGnarledSegment(ctx, 58, 97, 46, 112, 6, 2, banyanBark, 1);
    paintGnarledSegment(ctx, 58, 97, 70, 112, 6, 2, banyanBark, -1);
    paintGnarledSegment(ctx, 58, 102, 57, 56, 18, 11, banyanBark, -3);
    paintGnarledSegment(ctx, 57, 60, 23, 44, 9, 4, banyanBark, -4);
    paintGnarledSegment(ctx, 57, 58, 92, 45, 9, 4, banyanBark, 4);
    paintGnarledSegment(ctx, 57, 56, 58, 30, 8, 4, banyanBark, 2);

    // Rễ phụ thõng xuống hai bên thân
    for (const [rx, topY, botY] of [[24, 52, 89], [33, 56, 98], [82, 54, 96], [92, 50, 86]]) {
      ctx.fillStyle = "#2b1e14";
      ctx.fillRect(rx, topY, 2, botY - topY);
      ctx.fillStyle = "#543d29";
      ctx.fillRect(rx, topY, 1, botY - topY);
    }

    const jadeCanopy = ["#0a1c12", "#143823", "#235e38", "#3a8c51", "#65bd74", "#b4f5aa"];
    paintPixelCanopy(
      ctx,
      W,
      H,
      [
        { cx: 22, cy: 42, rx: 19, ry: 13, seed: 0.4, bias: -0.05 },
        { cx: 93, cy: 43, rx: 19, ry: 13, seed: 1.9, bias: -0.08 },
        { cx: 40, cy: 31, rx: 21, ry: 14, seed: 2.7, bias: 0.04 },
        { cx: 75, cy: 31, rx: 21, ry: 14, seed: 1.1, bias: 0.02 },
        { cx: 58, cy: 20, rx: 22, ry: 14, seed: 3.2, bias: 0.1 },
        { cx: 58, cy: 39, rx: 21, ry: 13, seed: 0.9, bias: 0.02 },
      ],
      jadeCanopy,
      { tuftAmp: 0.16, gaps: [{ cx: 57, cy: 50, rx: 7, ry: 3 }] }
    );
    // Đốm linh khí xanh ngọc ẩn trên vòm cây cổ thụ
    for (const [mx, my] of [[34, 29], [58, 16], [79, 34], [21, 41], [91, 40]]) {
      ctx.fillStyle = "#7effe0";
      ctx.fillRect(mx, my, 2, 1);
    }
    result = { canvas, anchorX: 58, anchorY: 110, solidRadius: 16 };
  } else if (kind === "maple" || kind === "maple_2") {
    const v2 = kind === "maple_2";
    const W = 84;
    const H = 92;
    const { canvas, ctx } = makeCanvas(W, H);
    drawPixelShadow(ctx, 42, 80, 25, 7, 0.27);
    const mapleBark = ["#1c1311", "#382520", "#593b33", "#785247"];
    paintGnarledSegment(ctx, 42, 70, 31, 80, 5, 2, mapleBark, 2);
    paintGnarledSegment(ctx, 42, 70, 53, 80, 5, 2, mapleBark, -2);
    paintGnarledSegment(ctx, 42, 76, v2 ? 38 : 45, 45, 9, 6, mapleBark, v2 ? 3 : -3);
    paintGnarledSegment(ctx, v2 ? 38 : 45, 46, 22, 32, 5, 2, mapleBark, -2);
    paintGnarledSegment(ctx, v2 ? 38 : 45, 44, 61, 33, 5, 2, mapleBark, 2);

    const flameShades = ["#360d09", "#751c12", "#ba361e", "#ed682b", "#ffa63b", "#ffe380"];
    paintPixelCanopy(
      ctx,
      W,
      H,
      [
        { cx: 21, cy: 32, rx: 14, ry: 11, seed: v2 ? 1.5 : 0.6, bias: -0.05 },
        { cx: 62, cy: 33, rx: 14, ry: 11, seed: 2.4, bias: -0.08 },
        { cx: 42, cy: 27, rx: 17, ry: 12, seed: 1.9, bias: 0.04 },
        { cx: 30, cy: 19, rx: 14, ry: 11, seed: 0.9, bias: 0.08 },
        { cx: 54, cy: 20, rx: 14, ry: 11, seed: 3.1, bias: 0.04 },
        { cx: 42, cy: 13, rx: 14, ry: 10, seed: 2.2, bias: 0.12 },
      ],
      flameShades,
      { tuftAmp: 0.19, gaps: [{ cx: 42, cy: 39, rx: 4, ry: 3 }] }
    );
    for (const [lx, ly] of [[24, 82], [35, 84], [52, 81], [60, 83]]) {
      ctx.fillStyle = "#ed682b";
      ctx.fillRect(lx, ly, 2, 1);
    }
    result = { canvas, anchorX: 42, anchorY: 80, solidRadius: 10 };
  } else if (kind === "maple_small") {
    const W = 50;
    const H = 56;
    const { canvas, ctx } = makeCanvas(W, H);
    drawPixelShadow(ctx, 25, 49, 13, 4, 0.24);
    const mapleBark = ["#1c1311", "#382520", "#593b33", "#785247"];
    paintGnarledSegment(ctx, 25, 49, 25, 29, 5, 3, mapleBark, -2);
    const flameShades = ["#360d09", "#751c12", "#ba361e", "#ed682b", "#ffa63b", "#ffe380"];
    paintPixelCanopy(
      ctx,
      W,
      H,
      [
        { cx: 17, cy: 24, rx: 9, ry: 8, seed: 0.8 },
        { cx: 33, cy: 25, rx: 9, ry: 8, seed: 2.1 },
        { cx: 25, cy: 16, rx: 11, ry: 9, seed: 1.5, bias: 0.09 },
      ],
      flameShades,
      { tuftAmp: 0.19 }
    );
    result = { canvas, anchorX: 25, anchorY: 49, solidRadius: 4 };
  } else if (kind === "golden_osmanthus") {
    const W = 78;
    const H = 86;
    const { canvas, ctx } = makeCanvas(W, H);
    drawPixelShadow(ctx, 39, 75, 24, 6, 0.26);
    paintGnarledSegment(ctx, 39, 67, 29, 75, 4, 2, peachBark, 1);
    paintGnarledSegment(ctx, 39, 67, 49, 75, 4, 2, peachBark, -1);
    paintGnarledSegment(ctx, 39, 73, 39, 41, 8, 5, peachBark, 3);
    paintGnarledSegment(ctx, 39, 44, 22, 31, 4, 2, peachBark, -2);
    paintGnarledSegment(ctx, 39, 42, 56, 31, 4, 2, peachBark, 2);

    const osmShades = ["#1b2911", "#344f1e", "#567d2a", "#99ad32", "#f2c63d", "#fff6bd"];
    paintPixelCanopy(
      ctx,
      W,
      H,
      [
        { cx: 20, cy: 31, rx: 13, ry: 10, seed: 0.7 },
        { cx: 58, cy: 31, rx: 13, ry: 10, seed: 2.0 },
        { cx: 39, cy: 25, rx: 16, ry: 12, seed: 1.3, bias: 0.05 },
        { cx: 29, cy: 17, rx: 12, ry: 10, seed: 2.8, bias: 0.09 },
        { cx: 49, cy: 18, rx: 12, ry: 10, seed: 0.4, bias: 0.06 },
      ],
      osmShades,
      { tuftAmp: 0.17 }
    );
    for (const [gx, gy] of [[28, 16], [42, 13], [52, 22], [20, 29], [57, 28], [38, 25]]) {
      ctx.fillStyle = "#ffe869";
      ctx.fillRect(gx, gy, 2, 2);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(gx, gy, 1, 1);
    }
    result = { canvas, anchorX: 39, anchorY: 75, solidRadius: 10 };
  } else if (kind === "osmanthus_small") {
    const W = 46;
    const H = 52;
    const { canvas, ctx } = makeCanvas(W, H);
    drawPixelShadow(ctx, 23, 45, 12, 4, 0.24);
    paintGnarledSegment(ctx, 23, 45, 23, 27, 4, 2, peachBark, 1);
    const osmShades = ["#1b2911", "#344f1e", "#567d2a", "#99ad32", "#f2c63d", "#fff6bd"];
    paintPixelCanopy(
      ctx,
      W,
      H,
      [
        { cx: 16, cy: 22, rx: 8, ry: 7, seed: 0.9 },
        { cx: 30, cy: 22, rx: 8, ry: 7, seed: 2.2 },
        { cx: 23, cy: 15, rx: 10, ry: 8, seed: 1.4, bias: 0.1 },
      ],
      osmShades,
      { tuftAmp: 0.17 }
    );
    result = { canvas, anchorX: 23, anchorY: 45, solidRadius: 4 };
  } else if (kind === "banana_palm") {
    // Bụi Chuối Rừng Nam Cương tán lá rộng uốn cong
    const W = 64;
    const H = 74;
    const { canvas, ctx } = makeCanvas(W, H);
    drawPixelShadow(ctx, 32, 66, 17, 5, 0.24);
    const trunk = ["#1c2e16", "#375728", "#57803c", "#80ad55"];
    paintGnarledSegment(ctx, 32, 66, 31, 35, 7, 4, trunk, 2);
    paintGnarledSegment(ctx, 25, 66, 22, 44, 4, 2, trunk, -2);
    const frondShades = ["#102b17", "#235c2d", "#459e4b", "#87db76"];
    const fronds = [
      [31, 35, -0.95, -0.25, 24, 4],
      [31, 35, -0.75, -0.65, 22, 4],
      [31, 34, 0.05, -0.95, 20, 4],
      [31, 35, 0.78, -0.62, 22, 4],
      [31, 35, 0.96, -0.2, 24, 4],
      [31, 38, -0.82, 0.25, 20, 3],
      [31, 38, 0.85, 0.25, 20, 3],
    ];
    for (const [fx, fy, dx, dy, len, w] of fronds) {
      paintBroadFrond(ctx, fx, fy, dx, dy, len, w, frondShades);
    }
    result = { canvas, anchorX: 32, anchorY: 66, solidRadius: 7 };
  } else if (kind === "pine" || kind === "pine_2") {
    const v2 = kind === "pine_2";
    const W = 76;
    const H = 88;
    const { canvas, ctx } = makeCanvas(W, H);
    drawPixelShadow(ctx, 38, 78, 22, 6, 0.28);

    // Thân tùng gân guốc nghiêng nhẹ kiểu cổ tùng trên núi
    paintGnarledSegment(ctx, 38, 71, 29, 78, 4, 2, pineBark, 1);
    paintGnarledSegment(ctx, 38, 71, 47, 78, 4, 2, pineBark, -1);
    paintGnarledSegment(ctx, 38, 76, v2 ? 41 : 35, 48, 8, 6, pineBark, v2 ? -2 : 2);
    paintGnarledSegment(ctx, v2 ? 41 : 35, 48, 38, 20, 6, 3, pineBark, v2 ? 2 : -2);
    // Cành khuỷu tùng chìa ra giữa các tầng tán
    paintGnarledSegment(ctx, 37, 50, 20, 48, 3, 2, pineBark, 2);
    paintGnarledSegment(ctx, 38, 39, 56, 37, 3, 2, pineBark, -2);

    // 4 tầng tán lá kim dẹt đáy răng cưa sắc nét
    const pineShades = ["#08150d", "#132e1e", "#214d31", "#387547", "#5ea366", "#8ed48c"];
    const lobes = [
      { cx: 22, cy: 49, rx: 14, ry: 7, seed: 1.2, bias: -0.03 },
      { cx: 54, cy: 50, rx: 14, ry: 7, seed: 2.5, bias: -0.06 },
      { cx: 38, cy: 46, rx: 16, ry: 8, seed: 0.4, bias: 0.04 },
      { cx: 24, cy: 36, rx: 13, ry: 7, seed: 3.1, bias: 0.02 },
      { cx: 51, cy: 37, rx: 13, ry: 7, seed: 1.7, bias: -0.02 },
      { cx: 38, cy: 33, rx: 15, ry: 8, seed: 2.9, bias: 0.07 },
      { cx: 30, cy: 23, rx: 12, ry: 7, seed: 0.8, bias: 0.06 },
      { cx: 47, cy: 24, rx: 11, ry: 6, seed: 2.1, bias: 0.02 },
      { cx: 38, cy: 14, rx: 12, ry: 7, seed: 1.5, bias: 0.12 },
    ];
    paintPixelCanopy(ctx, W, H, lobes, pineShades, {
      tuftAmp: 0.18,
      flatBottom: true,
      hangFringe: true,
      gaps: [
        { cx: 37, cy: 42, rx: 5, ry: 2 },
        { cx: 39, cy: 29, rx: 4, ry: 2 },
      ],
    });

    result = { canvas, anchorX: 38, anchorY: 78, solidRadius: 10 };
  } else if (kind === "pine_giant") {
    const W = 96;
    const H = 112;
    const { canvas, ctx } = makeCanvas(W, H);
    drawPixelShadow(ctx, 48, 99, 28, 8, 0.28);
    paintGnarledSegment(ctx, 48, 88, 35, 99, 6, 2, pineBark, 2);
    paintGnarledSegment(ctx, 48, 88, 61, 99, 6, 2, pineBark, -2);
    paintGnarledSegment(ctx, 48, 95, 46, 56, 12, 8, pineBark, 3);
    paintGnarledSegment(ctx, 46, 56, 49, 20, 8, 4, pineBark, -2);
    paintGnarledSegment(ctx, 47, 58, 23, 55, 4, 2, pineBark, 2);
    paintGnarledSegment(ctx, 48, 44, 73, 42, 4, 2, pineBark, -2);
    const pineShades = ["#08150d", "#132e1e", "#214d31", "#387547", "#5ea366", "#8ed48c"];
    paintPixelCanopy(
      ctx,
      W,
      H,
      [
        { cx: 24, cy: 61, rx: 17, ry: 8, seed: 1.1 },
        { cx: 71, cy: 61, rx: 17, ry: 8, seed: 2.3 },
        { cx: 48, cy: 56, rx: 20, ry: 9, seed: 0.4, bias: 0.04 },
        { cx: 28, cy: 45, rx: 16, ry: 8, seed: 3.1 },
        { cx: 67, cy: 46, rx: 16, ry: 8, seed: 1.7 },
        { cx: 48, cy: 41, rx: 19, ry: 9, seed: 2.9, bias: 0.06 },
        { cx: 33, cy: 30, rx: 14, ry: 7, seed: 0.8 },
        { cx: 62, cy: 31, rx: 14, ry: 7, seed: 2.1 },
        { cx: 48, cy: 26, rx: 16, ry: 8, seed: 1.5, bias: 0.09 },
        { cx: 48, cy: 14, rx: 13, ry: 7, seed: 2.6, bias: 0.14 },
      ],
      pineShades,
      { tuftAmp: 0.18, flatBottom: true, hangFringe: true, gaps: [{ cx: 47, cy: 51, rx: 6, ry: 2 }] }
    );
    result = { canvas, anchorX: 48, anchorY: 99, solidRadius: 13 };
  } else if (kind === "pine_small") {
    const W = 46;
    const H = 54;
    const { canvas, ctx } = makeCanvas(W, H);
    drawPixelShadow(ctx, 23, 47, 12, 4, 0.24);
    paintGnarledSegment(ctx, 23, 47, 23, 24, 5, 3, pineBark, 1);
    const pineShades = ["#08150d", "#132e1e", "#214d31", "#387547", "#5ea366", "#8ed48c"];
    paintPixelCanopy(
      ctx,
      W,
      H,
      [
        { cx: 16, cy: 31, rx: 9, ry: 5, seed: 1.2 },
        { cx: 30, cy: 31, rx: 9, ry: 5, seed: 2.5 },
        { cx: 23, cy: 27, rx: 11, ry: 6, seed: 0.5, bias: 0.04 },
        { cx: 23, cy: 17, rx: 9, ry: 6, seed: 1.8, bias: 0.1 },
      ],
      pineShades,
      { tuftAmp: 0.17, flatBottom: true, hangFringe: true }
    );
    result = { canvas, anchorX: 23, anchorY: 47, solidRadius: 4 };
  } else if (kind === "snow_pine" || kind === "snow_pine_small") {
    const small = kind === "snow_pine_small";
    const W = small ? 48 : 80;
    const H = small ? 54 : 92;
    const { canvas, ctx } = makeCanvas(W, H);
    const cx = Math.floor(W / 2);
    const ay = small ? 47 : 81;
    drawPixelShadow(ctx, cx, ay, small ? 12 : 22, small ? 4 : 6, 0.22);
    paintGnarledSegment(ctx, cx, ay - 2, cx, small ? 24 : 26, small ? 5 : 8, small ? 3 : 4, pineBark, 1);
    const snowPineShades = ["#0f1d24", "#1b3640", "#2f5763", "#568591", "#c2e9f5", "#ffffff"];
    const lobes = small
      ? [
          { cx: cx - 7, cy: 31, rx: 9, ry: 5, seed: 1.2 },
          { cx: cx + 7, cy: 31, rx: 9, ry: 5, seed: 2.3 },
          { cx: cx, cy: 26, rx: 11, ry: 6, seed: 0.5, bias: 0.08 },
          { cx: cx, cy: 15, rx: 9, ry: 6, seed: 1.8, bias: 0.18 },
        ]
      : [
          { cx: cx - 15, cy: 52, rx: 14, ry: 7, seed: 1.1 },
          { cx: cx + 15, cy: 52, rx: 14, ry: 7, seed: 2.2 },
          { cx: cx, cy: 48, rx: 16, ry: 8, seed: 0.4, bias: 0.08 },
          { cx: cx - 13, cy: 36, rx: 13, ry: 7, seed: 3.1 },
          { cx: cx + 13, cy: 36, rx: 13, ry: 7, seed: 1.7 },
          { cx: cx, cy: 32, rx: 15, ry: 8, seed: 2.9, bias: 0.14 },
          { cx: cx, cy: 16, rx: 12, ry: 7, seed: 1.5, bias: 0.22 },
        ];
    paintPixelCanopy(ctx, W, H, lobes, snowPineShades, { tuftAmp: 0.17, flatBottom: true, hangFringe: true });
    result = { canvas, anchorX: cx, anchorY: ay, solidRadius: small ? 4 : 10 };
  } else if (kind === "willow") {
    const W = 84;
    const H = 90;
    const { canvas, ctx } = makeCanvas(W, H);
    drawPixelShadow(ctx, 42, 78, 26, 7, 0.25);

    const willowBark = ["#1f1710", "#3d2d1d", "#5e462d", "#7d6040"];
    paintGnarledSegment(ctx, 42, 70, 32, 78, 4, 2, willowBark, 2);
    paintGnarledSegment(ctx, 42, 70, 52, 78, 4, 2, willowBark, -2);
    paintGnarledSegment(ctx, 42, 76, 40, 36, 9, 5, willowBark, 4);
    paintGnarledSegment(ctx, 40, 39, 22, 26, 4, 2, willowBark, -2);
    paintGnarledSegment(ctx, 40, 39, 60, 26, 4, 2, willowBark, 2);

    const wShades = ["#0c2416", "#19472a", "#2b7040", "#4ea35d", "#84d67c", "#b8f7a6"];
    paintPixelCanopy(
      ctx,
      W,
      H,
      [
        { cx: 21, cy: 27, rx: 15, ry: 11, seed: 0.5, bias: 0.02 },
        { cx: 62, cy: 27, rx: 15, ry: 11, seed: 1.9, bias: -0.05 },
        { cx: 42, cy: 21, rx: 19, ry: 12, seed: 2.7, bias: 0.08 },
        { cx: 33, cy: 14, rx: 13, ry: 9, seed: 1.1, bias: 0.12 },
        { cx: 51, cy: 15, rx: 13, ry: 9, seed: 3.3, bias: 0.06 },
      ],
      wShades,
      { tuftAmp: 0.14 }
    );

    // 22 dải dây liễu rủ mảnh 1-2px buông dọc xuống gần mặt đất
    for (let s = 0; s < 22; s++) {
      const sx = 11 + s * 3 + ((hash(s, 3) % 2) - 1);
      const startY = 26 + (hash(s, 7) % 10);
      const endY = 58 + (hash(s, 13) % 15);
      for (let py = startY; py <= endY; py++) {
        const sway = Math.round(Math.sin(py * 0.14 + s) * 1.1);
        const vx = sx + sway;
        ctx.fillStyle = py % 3 === 0 ? wShades[1] : py > endY - 5 ? wShades[4] : wShades[3];
        ctx.fillRect(vx, py, 1, 1);
        if (py % 4 === 1) {
          ctx.fillStyle = wShades[2];
          ctx.fillRect(vx + (s % 2 === 0 ? 1 : -1), py, 1, 1);
        }
      }
    }

    result = { canvas, anchorX: 42, anchorY: 78, solidRadius: 10 };
  } else if (kind === "willow_small") {
    const W = 54;
    const H = 60;
    const { canvas, ctx } = makeCanvas(W, H);
    drawPixelShadow(ctx, 27, 52, 15, 4, 0.22);
    const willowBark = ["#1f1710", "#3d2d1d", "#5e462d", "#7d6040"];
    paintGnarledSegment(ctx, 27, 52, 26, 26, 5, 3, willowBark, 2);
    const wShades = ["#0c2416", "#19472a", "#2b7040", "#4ea35d", "#84d67c", "#b8f7a6"];
    paintPixelCanopy(
      ctx,
      W,
      H,
      [
        { cx: 17, cy: 21, rx: 10, ry: 8, seed: 0.6 },
        { cx: 36, cy: 21, rx: 10, ry: 8, seed: 1.9 },
        { cx: 27, cy: 14, rx: 12, ry: 8, seed: 2.5, bias: 0.08 },
      ],
      wShades,
      { tuftAmp: 0.14 }
    );
    for (let s = 0; s < 11; s++) {
      const sx = 10 + s * 3;
      const endY = 39 + (hash(s, 9) % 10);
      for (let py = 22; py <= endY; py++) {
        ctx.fillStyle = py % 3 === 0 ? wShades[1] : wShades[3];
        ctx.fillRect(sx + Math.round(Math.sin(py * 0.2 + s)), py, 1, 1);
      }
    }
    result = { canvas, anchorX: 27, anchorY: 52, solidRadius: 5 };
  } else if (kind === "bamboo") {
    const W = 60;
    const H = 86;
    const { canvas, ctx } = makeCanvas(W, H);
    drawPixelShadow(ctx, 30, 76, 17, 5, 0.25);

    const stalks = [
      { x0: 17, x1: 15, top: 20, w: 3 },
      { x0: 23, x1: 24, top: 12, w: 4 },
      { x0: 29, x1: 28, top: 8, w: 4 },
      { x0: 35, x1: 37, top: 14, w: 4 },
      { x0: 41, x1: 43, top: 22, w: 3 },
    ];
    for (let si = 0; si < stalks.length; si++) {
      const st = stalks[si];
      for (let py = st.top; py <= 75; py++) {
        const t = (py - st.top) / Math.max(1, 75 - st.top);
        const cx = Math.round(st.x0 + (st.x1 - st.x0) * (1 - t));
        ctx.fillStyle = "#0e291b";
        ctx.fillRect(cx - 1, py, st.w + 2, 1);
        ctx.fillStyle = "#266341";
        ctx.fillRect(cx, py, st.w, 1);
        ctx.fillStyle = "#52b378";
        ctx.fillRect(cx, py, Math.max(1, st.w - 2), 1);
        if ((py - st.top) % 9 === 0) {
          ctx.fillStyle = "#a4f5c1";
          ctx.fillRect(cx, py, st.w, 1);
          ctx.fillStyle = "#0e291b";
          ctx.fillRect(cx - 1, py + 1, st.w + 2, 1);
        }
      }
    }

    // Măng non dưới gốc
    ctx.fillStyle = "#1b3b21";
    ctx.fillRect(11, 70, 3, 6);
    ctx.fillStyle = "#79c97a";
    ctx.fillRect(12, 69, 1, 5);
    ctx.fillRect(46, 71, 2, 5);

    // Chùm lá trúc nhọn từng phiến tỏa ra sắc sảo (không hình cầu)
    const sprays = [
      [15, 22, -1, 0.35], [16, 20, 0.6, -0.5], [15, 25, -0.9, 0.7],
      [24, 15, -0.95, 0.25], [25, 13, 0.8, -0.35], [24, 19, -0.85, 0.55], [26, 24, 0.9, 0.35],
      [29, 11, -0.7, -0.4], [30, 10, 0.85, -0.3], [29, 17, -1, 0.3], [31, 22, 0.95, 0.4],
      [37, 17, -0.8, 0.4], [38, 15, 0.95, 0.25], [37, 23, 0.85, 0.6],
      [43, 24, 1, 0.35], [42, 27, -0.8, 0.5], [43, 29, 0.85, 0.65],
    ];
    for (const [lx, ly, dx, dy] of sprays) {
      paintSharpLeafBlade(ctx, lx, ly, dx, dy, 8, "#0f3320", "#2f8554", "#86ebb0");
      paintSharpLeafBlade(ctx, lx, ly + 1, dx * 0.9, dy + 0.35, 6, "#0f3320", "#21613d", "#5dc488");
    }

    result = { canvas, anchorX: 30, anchorY: 76, solidRadius: 8 };
  } else if (kind === "bamboo_small") {
    const W = 36;
    const H = 52;
    const { canvas, ctx } = makeCanvas(W, H);
    drawPixelShadow(ctx, 18, 46, 10, 3, 0.22);
    for (const [bx, top] of [[12, 18], [18, 12], [23, 20]]) {
      for (let py = top; py <= 45; py++) {
        ctx.fillStyle = "#0e291b";
        ctx.fillRect(bx - 1, py, 4, 1);
        ctx.fillStyle = "#2b734b";
        ctx.fillRect(bx, py, 2, 1);
        if ((py - top) % 7 === 0) {
          ctx.fillStyle = "#a4f5c1";
          ctx.fillRect(bx, py, 2, 1);
        }
      }
      paintSharpLeafBlade(ctx, bx, top + 3, -0.9, 0.35, 6, "#0f3320", "#2f8554", "#86ebb0");
      paintSharpLeafBlade(ctx, bx + 1, top + 2, 0.9, 0.3, 6, "#0f3320", "#2f8554", "#86ebb0");
    }
    result = { canvas, anchorX: 18, anchorY: 46, solidRadius: 0 };
  } else if (kind === "dead_tree_small") {
    const W = 36;
    const H = 42;
    const { canvas, ctx } = makeCanvas(W, H);
    drawPixelShadow(ctx, 18, 37, 10, 3, 0.24);
    const deadBark = ["#140e0b", "#291d17", "#45332a", "#634b3f"];
    paintGnarledSegment(ctx, 18, 37, 17, 17, 5, 3, deadBark, 2);
    paintGnarledSegment(ctx, 17, 22, 9, 13, 3, 1, deadBark, -1);
    paintGnarledSegment(ctx, 17, 20, 26, 14, 2, 1, deadBark, 1);
    result = { canvas, anchorX: 18, anchorY: 37, solidRadius: 4 };
  } else if (kind === "dead_tree") {
    const W = 58;
    const H = 68;
    const { canvas, ctx } = makeCanvas(W, H);
    drawPixelShadow(ctx, 29, 60, 16, 5, 0.28);
    const deadBark = ["#140e0b", "#291d17", "#45332a", "#634b3f"];
    paintGnarledSegment(ctx, 29, 54, 20, 61, 4, 2, deadBark, 1);
    paintGnarledSegment(ctx, 29, 54, 38, 61, 4, 2, deadBark, -1);
    paintGnarledSegment(ctx, 29, 58, 28, 28, 8, 5, deadBark, 2);
    paintGnarledSegment(ctx, 28, 34, 12, 20, 4, 1, deadBark, -3);
    paintGnarledSegment(ctx, 20, 26, 15, 13, 2, 1, deadBark, 1);
    paintGnarledSegment(ctx, 28, 30, 44, 16, 4, 1, deadBark, 3);
    paintGnarledSegment(ctx, 37, 22, 46, 26, 2, 1, deadBark, 0);
    // Chút rêu đầm lầy bám thân cây
    ctx.fillStyle = "#32633b";
    ctx.fillRect(26, 45, 3, 2);
    ctx.fillRect(30, 52, 2, 3);
    result = { canvas, anchorX: 29, anchorY: 60, solidRadius: 9 };
  } else if (kind === "rock") {
    const W = 46;
    const H = 36;
    const { canvas, ctx } = makeCanvas(W, H);
    drawPixelShadow(ctx, 23, 29, 18, 5, 0.25);
    // Đá tảng góc cạnh pixel nhiều mặt cắt & rêu
    const rockRows = [
      [14, 7, 16, 1, "#1e2226"],
      [11, 8, 23, 3, "#1e2226"],
      [8, 11, 29, 6, "#1e2226"],
      [6, 17, 34, 11, "#1e2226"],
      [15, 8, 14, 3, "#6d7882"],
      [12, 11, 21, 5, "#545e66"],
      [9, 16, 28, 10, "#414952"],
      [14, 9, 12, 4, "#8b98a3"],
      [9, 16, 11, 6, "#66717a"],
      [25, 19, 10, 6, "#2c3338"],
    ];
    for (const [rx, ry, rw, rh, col] of rockRows) {
      ctx.fillStyle = col;
      ctx.fillRect(rx, ry, rw, rh);
    }
    // Vết nứt đá & đám rêu xanh pixel
    ctx.fillStyle = "#1c2124";
    ctx.fillRect(22, 13, 1, 6);
    ctx.fillRect(23, 19, 2, 5);
    ctx.fillStyle = "#3e7a44";
    ctx.fillRect(11, 10, 6, 2);
    ctx.fillRect(13, 12, 3, 1);
    ctx.fillRect(26, 18, 5, 2);
    result = { canvas, anchorX: 23, anchorY: 29, solidRadius: 12 };
  } else if (kind === "boulder_giant") {
    const W = 66;
    const H = 48;
    const { canvas, ctx } = makeCanvas(W, H);
    drawPixelShadow(ctx, 33, 39, 27, 7, 0.28);
    const rows = [
      [18, 7, 26, 2, "#1c2024"],
      [12, 9, 39, 5, "#1c2024"],
      [7, 14, 51, 11, "#1c2024"],
      [5, 25, 56, 14, "#1c2024"],
      [19, 9, 24, 5, "#74808a"],
      [13, 14, 37, 10, "#59636c"],
      [8, 24, 50, 13, "#434b54"],
      [17, 10, 18, 6, "#95a2ad"],
      [10, 23, 16, 9, "#6d7882"],
      [38, 25, 18, 10, "#2c3238"],
    ];
    for (const [rx, ry, rw, rh, col] of rows) {
      ctx.fillStyle = col;
      ctx.fillRect(rx, ry, rw, rh);
    }
    ctx.fillStyle = "#1c2024";
    ctx.fillRect(34, 15, 1, 11);
    ctx.fillRect(35, 26, 2, 7);
    ctx.fillStyle = "#3a7842";
    ctx.fillRect(14, 12, 9, 3);
    ctx.fillRect(42, 23, 8, 3);
    ctx.fillRect(16, 33, 6, 2);
    result = { canvas, anchorX: 33, anchorY: 39, solidRadius: 18 };
  } else if (kind === "rock_small") {
    const W = 24;
    const H = 18;
    const { canvas, ctx } = makeCanvas(W, H);
    drawPixelShadow(ctx, 12, 14, 9, 3, 0.22);
    ctx.fillStyle = "#22272b";
    ctx.fillRect(4, 7, 10, 7);
    ctx.fillRect(13, 9, 7, 5);
    ctx.fillStyle = "#626d75";
    ctx.fillRect(5, 8, 8, 5);
    ctx.fillRect(14, 10, 5, 3);
    ctx.fillStyle = "#8d9aa3";
    ctx.fillRect(6, 8, 5, 2);
    ctx.fillStyle = "#3e7a44";
    ctx.fillRect(8, 8, 3, 1);
    result = { canvas, anchorX: 12, anchorY: 14, solidRadius: 0 };
  } else if (kind === "fallen_log") {
    const W = 54;
    const H = 22;
    const { canvas, ctx } = makeCanvas(W, H);
    drawPixelShadow(ctx, 27, 17, 23, 4, 0.24);
    ctx.fillStyle = "#1c120d";
    ctx.fillRect(5, 8, 44, 10);
    ctx.fillStyle = "#4d3221";
    ctx.fillRect(6, 9, 42, 8);
    ctx.fillStyle = "#6e4931";
    ctx.fillRect(7, 9, 40, 4);
    // Mặt cắt gỗ bên phải + rêu & nấm gỗ
    ctx.fillStyle = "#c9a675";
    ctx.fillRect(45, 10, 3, 6);
    ctx.fillStyle = "#3c7a42";
    ctx.fillRect(14, 8, 9, 3);
    ctx.fillRect(30, 9, 7, 2);
    ctx.fillStyle = "#ffe082";
    ctx.fillRect(25, 8, 3, 2);
    result = { canvas, anchorX: 27, anchorY: 17, solidRadius: 0 };
  } else if (kind === "fern") {
    const W = 28;
    const H = 22;
    const { canvas, ctx } = makeCanvas(W, H);
    drawPixelShadow(ctx, 14, 18, 10, 3, 0.2);
    const fShades = ["#102e19", "#215c31", "#3a8c4a", "#6ed175"];
    for (const [dx, dy, len] of [[-0.95, -0.35, 11], [-0.6, -0.8, 12], [0, -1, 13], [0.6, -0.8, 12], [0.95, -0.35, 11]]) {
      paintBroadFrond(ctx, 14, 17, dx, dy, len, 2, fShades);
    }
    result = { canvas, anchorX: 14, anchorY: 18, solidRadius: 0 };
  } else if (kind === "mushroom_cluster") {
    const W = 22;
    const H = 18;
    const { canvas, ctx } = makeCanvas(W, H);
    drawPixelShadow(ctx, 11, 15, 7, 2, 0.2);
    for (const [mx, my, h, capCol] of [[7, 15, 6, "#d94338"], [12, 15, 8, "#f07b3f"], [16, 15, 5, "#d94338"]]) {
      ctx.fillStyle = "#261b12";
      ctx.fillRect(mx - 1, my - h + 2, 3, h - 2);
      ctx.fillStyle = "#fff1d6";
      ctx.fillRect(mx, my - h + 2, 1, h - 2);
      ctx.fillStyle = "#2e100d";
      ctx.fillRect(mx - 3, my - h, 7, 3);
      ctx.fillStyle = capCol;
      ctx.fillRect(mx - 2, my - h, 5, 2);
      ctx.fillStyle = "#fff7e0";
      ctx.fillRect(mx - 1, my - h, 1, 1);
      ctx.fillRect(mx + 1, my - h + 1, 1, 1);
    }
    result = { canvas, anchorX: 11, anchorY: 15, solidRadius: 0 };
  } else if (kind === "tall_grass_1" || kind === "tall_grass_2" || kind === "tall_grass_flower" || kind === "tall_grass_dry" || kind === "tall_grass_frost") {
    const wide = kind === "tall_grass_2";
    const W = wide ? 30 : 26;
    const H = wide ? 24 : 21;
    const { canvas, ctx } = makeCanvas(W, H);
    const ay = wide ? 20 : 18;
    const cx = Math.floor(W / 2);
    drawPixelShadow(ctx, cx, ay, wide ? 11 : 9, 3, 0.18);

    const cols =
      kind === "tall_grass_dry"
        ? ["#2e2410", "#695324", "#b5913c", "#ebd06e"]
        : kind === "tall_grass_frost"
          ? ["#152b33", "#2b5866", "#589aa8", "#a8e6f0"]
          : ["#0f2b14", "#1f5425", "#3d8c3e", "#76cf61"];

    const bladeCount = wide ? 13 : 9;
    for (let i = 0; i < bladeCount; i++) {
      const bx = cx - (wide ? 10 : 7) + i * 1.7;
      const lean = (i - (bladeCount - 1) * 0.5) * 0.11;
      const len = (wide ? 10 : 8) + (hash(i * 5, bladeCount) % 6);
      paintSharpLeafBlade(ctx, bx, ay, lean, -1, len, cols[0], cols[2], cols[3]);
    }
    if (kind === "tall_grass_flower") {
      for (const [fx, fy, fc] of [[cx - 5, 7, "#ff9ec4"], [cx + 4, 6, "#ffe066"], [cx, 5, "#ffffff"]]) {
        ctx.fillStyle = fc;
        ctx.fillRect(fx, fy, 2, 2);
        ctx.fillStyle = "#f2c14e";
        ctx.fillRect(fx, fy + 1, 1, 1);
      }
    } else if (kind === "tall_grass_2") {
      // Bông lau cỏ cao màu vàng nhạt ở ngọn cỏ
      ctx.fillStyle = "#ebd06e";
      ctx.fillRect(cx - 4, 5, 1, 2);
      ctx.fillRect(cx + 5, 6, 1, 2);
    }
    result = { canvas, anchorX: cx, anchorY: ay, solidRadius: 0 };
  } else if (kind === "tall_grass_night" || kind === "tall_grass_night_tall") {
    const isTall = kind === "tall_grass_night_tall";
    const W = isTall ? 34 : 28;
    const H = isTall ? 30 : 24;
    const { canvas, ctx } = makeCanvas(W, H);
    const ay = isTall ? 26 : 20;
    const cx = Math.floor(W / 2);
    drawPixelShadow(ctx, cx, ay, isTall ? 13 : 10, 3, isTall ? 0.22 : 0.2);

    const cols = isTall
      ? ["#061410", "#12382b", "#21664c", "#48ab7c"]
      : ["#05120f", "#0e2e24", "#1b5440", "#3a8f6a"];
    const bladeCount = isTall ? 16 : 12;
    const spread = isTall ? 24 : 18;
    for (let i = 0; i < bladeCount; i++) {
      const bx = Math.round(cx - spread * 0.5 + (i / Math.max(1, bladeCount - 1)) * spread);
      const lean = (i - (bladeCount - 1) * 0.5) * (isTall ? 0.08 : 0.095);
      const len = (isTall ? 13 : 9) + (hash(i * 7, bladeCount + (isTall ? 11 : 3)) % (isTall ? 10 : 8));
      const litCol = isTall && i % 4 === 1 ? "#7be3ad" : cols[3];
      paintSharpLeafBlade(ctx, bx, ay, lean, -1, len, cols[0], cols[2], litCol);
    }
    if (isTall) {
      // Ngọn bông cỏ đêm ánh vàng nhạt & xanh non
      for (const [fx, fy, fc] of [[cx - 7, 5, "#e8f59a"], [cx - 1, 3, "#ffe68a"], [cx + 5, 6, "#e8f59a"], [cx + 9, 8, "#7be3ad"]]) {
        ctx.fillStyle = fc;
        ctx.fillRect(fx, fy, 1, 2);
      }
    } else {
      // Đốm sương đêm nhẹ trên ngọn lá cỏ
      ctx.fillStyle = "#78e8b8";
      ctx.fillRect(cx - 4, 7, 1, 1);
      ctx.fillRect(cx + 3, 6, 1, 1);
      ctx.fillStyle = "#c8ff9e";
      ctx.fillRect(cx, 5, 1, 1);
    }
    result = { canvas, anchorX: cx, anchorY: ay, solidRadius: 0 };
  } else if (kind === "shore_stone") {
    // Cụm cuội đá tự nhiên bo tròn rêu phong (không phải gạch chữ nhật)
    const { canvas, ctx } = makeCanvas(22, 16);
    ctx.fillStyle = "rgba(6, 18, 18, 0.42)";
    ctx.fillRect(3, 10, 15, 4);
    const stoneRows = [
      [6, 3, 7, 1, "#181e21"],
      [4, 4, 11, 2, "#181e21"],
      [3, 6, 13, 5, "#181e21"],
      [4, 11, 11, 2, "#181e21"],
      [6, 4, 7, 2, "#717d85"],
      [5, 5, 9, 4, "#556066"],
      [4, 8, 11, 3, "#394247"],
      [7, 4, 4, 2, "#87949c"],
      [13, 8, 6, 4, "#181e21"],
      [14, 9, 4, 2, "#556066"],
      [14, 9, 2, 1, "#717d85"],
    ];
    for (const [rx, ry, rw, rh, col] of stoneRows) {
      ctx.fillStyle = col;
      ctx.fillRect(rx, ry, rw, rh);
    }
    ctx.fillStyle = "#2a5432";
    ctx.fillRect(9, 6, 4, 2);
    ctx.fillRect(5, 9, 3, 2);
    ctx.fillStyle = "#3f7344";
    ctx.fillRect(10, 6, 2, 1);
    result = { canvas, anchorX: 11, anchorY: 12, solidRadius: 0 };
  } else if (kind === "shore_stone_2") {
    const { canvas, ctx } = makeCanvas(16, 13);
    ctx.fillStyle = "rgba(6, 18, 18, 0.38)";
    ctx.fillRect(2, 8, 11, 3);
    const rows = [
      [4, 2, 6, 1, "#181e21"],
      [2, 3, 10, 5, "#181e21"],
      [3, 8, 8, 2, "#181e21"],
      [4, 3, 6, 3, "#606c75"],
      [3, 5, 8, 3, "#3f494f"],
      [5, 3, 3, 2, "#828f99"],
      [11, 7, 3, 3, "#181e21"],
      [12, 8, 1, 1, "#556066"],
    ];
    for (const [rx, ry, rw, rh, col] of rows) {
      ctx.fillStyle = col;
      ctx.fillRect(rx, ry, rw, rh);
    }
    ctx.fillStyle = "#32633a";
    ctx.fillRect(4, 6, 3, 2);
    result = { canvas, anchorX: 8, anchorY: 10, solidRadius: 0 };
  } else if (kind === "shore_pebbles") {
    const { canvas, ctx } = makeCanvas(16, 11);
    for (const [px, py, pw, ph, col] of [
      [2, 5, 4, 3, "#3f494f"],
      [8, 3, 3, 2, "#556066"],
      [7, 6, 5, 3, "#49545c"],
      [12, 4, 2, 2, "#637078"],
    ]) {
      ctx.fillStyle = "#181e21";
      ctx.fillRect(px - 1, py, pw + 2, ph);
      ctx.fillStyle = col;
      ctx.fillRect(px, py, pw, ph);
      ctx.fillStyle = "#7a868f";
      ctx.fillRect(px, py, Math.max(1, pw - 1), 1);
    }
    ctx.fillStyle = "#2e5934";
    ctx.fillRect(3, 4, 2, 1);
    ctx.fillRect(9, 6, 2, 1);
    result = { canvas, anchorX: 8, anchorY: 8, solidRadius: 0 };
  } else if (kind === "shrub") {
    const W = 30;
    const H = 22;
    const { canvas, ctx } = makeCanvas(W, H);
    drawPixelShadow(ctx, 15, 18, 11, 3, 0.22);
    const bushShades = ["#122613", "#234a24", "#377337", "#539e4b", "#7cd168", "#fff3b0"];
    paintPixelCanopy(
      ctx,
      W,
      H,
      [
        { cx: 9, cy: 13, rx: 6, ry: 5, seed: 0.8 },
        { cx: 21, cy: 13, rx: 6, ry: 5, seed: 2.1 },
        { cx: 15, cy: 10, rx: 8, ry: 6, seed: 1.4, bias: 0.08 },
      ],
      bushShades,
      { tuftAmp: 0.18, flatBottom: true }
    );
    ctx.fillStyle = "#ffa3c6";
    ctx.fillRect(10, 10, 2, 1);
    ctx.fillRect(19, 11, 2, 1);
    ctx.fillStyle = "#ffe066";
    ctx.fillRect(15, 7, 1, 1);
    result = { canvas, anchorX: 15, anchorY: 18, solidRadius: 0 };
  } else if (kind === "reed_clump") {
    const W = 26;
    const H = 28;
    const { canvas, ctx } = makeCanvas(W, H);
    const blades = [
      [8, 24, -0.35, -0.95, 15],
      [11, 24, -0.1, -1, 18],
      [13, 24, 0.08, -1, 19],
      [15, 24, 0.25, -0.95, 16],
      [18, 24, 0.45, -0.88, 13],
    ];
    for (const [bx, by, dx, dy, len] of blades) {
      paintSharpLeafBlade(ctx, bx, by, dx, dy, len, "#143822", "#2d7545", "#5ec278");
    }
    // Bông lau nâu
    ctx.fillStyle = "#3d2212";
    ctx.fillRect(10, 5, 2, 5);
    ctx.fillRect(15, 7, 2, 5);
    ctx.fillStyle = "#7a4728";
    ctx.fillRect(10, 6, 1, 3);
    ctx.fillRect(15, 8, 1, 3);
    result = { canvas, anchorX: 13, anchorY: 24, solidRadius: 0 };
  } else if (kind === "reed_clump_glow") {
    const W = 28;
    const H = 32;
    const { canvas, ctx } = makeCanvas(W, H);
    drawPixelShadow(ctx, 14, 28, 10, 3, 0.2);
    const blades = [
      [7, 28, -0.34, -0.94, 16],
      [10, 28, -0.18, -0.98, 20],
      [12, 28, -0.05, -1, 22],
      [14, 28, 0.04, -1, 23],
      [16, 28, 0.16, -0.98, 20],
      [18, 28, 0.28, -0.95, 18],
      [21, 28, 0.42, -0.9, 15],
    ];
    for (const [bx, by, dx, dy, len] of blades) {
      paintSharpLeafBlade(ctx, bx, by, dx, dy, len, "#071c18", "#164d3e", "#2e8569");
    }
    ctx.fillStyle = "#68d6a8";
    ctx.fillRect(11, 9, 1, 3);
    ctx.fillRect(14, 7, 1, 3);
    ctx.fillRect(18, 11, 1, 2);
    // Bông lau phát sáng dịu ven suối Nguyên Tuyền
    for (const [px, py, tip] of [[8, 6, "#ffe882"], [13, 4, "#9effe0"], [19, 7, "#ffe882"]]) {
      ctx.fillStyle = "#7d6a2d";
      ctx.fillRect(px, py + 1, 2, 4);
      ctx.fillStyle = tip;
      ctx.fillRect(px, py, 1, 3);
    }
    result = { canvas, anchorX: 14, anchorY: 28, solidRadius: 0 };
  } else if (kind === "stealth_bush") {
    const W = 42;
    const H = 30;
    const { canvas, ctx } = makeCanvas(W, H);
    drawPixelShadow(ctx, 21, 25, 16, 4, 0.25);
    for (let i = 0; i < 16; i++) {
      const bx = 8 + i * 1.7;
      const lean = (i - 7.5) * 0.085;
      const len = 12 + (hash(i, 5) % 8);
      paintSharpLeafBlade(ctx, bx, 25, lean, -1, len, "#0c2419", "#1d573a", "#48ab72");
    }
    // Đốm linh khí ẩn thân nhẹ trên bụi cỏ
    ctx.fillStyle = "#80ffcf";
    ctx.fillRect(14, 12, 1, 1);
    ctx.fillRect(26, 10, 1, 1);
    ctx.fillRect(21, 15, 1, 1);
    result = { canvas, anchorX: 21, anchorY: 25, solidRadius: 0 };
  } else if (kind === "spirit_spring") {
    const W = 64;
    const H = 44;
    const { canvas, ctx } = makeCanvas(W, H);
    drawPixelShadow(ctx, 32, 26, 30, 17, 0.28);
    // Viền đá xanh cổ rêu phong chạm khắc quanh Nguyên Tuyền
    const outer = [
      [10, 12, 44, 20, "#1c2221"],
      [6, 16, 52, 13, "#1c2221"],
      [12, 13, 40, 18, "#4b5452"],
      [8, 17, 48, 11, "#606b68"],
      [14, 15, 36, 14, "#0b4741"],
      [10, 18, 44, 8, "#126e65"],
      [16, 17, 32, 10, "#24baa4"],
      [22, 19, 20, 6, "#87ebdc"],
    ];
    for (const [rx, ry, rw, rh, col] of outer) {
      ctx.fillStyle = col;
      ctx.fillRect(rx, ry, rw, rh);
    }
    ctx.fillStyle = "#294f32";
    ctx.fillRect(14, 13, 8, 2);
    ctx.fillRect(40, 27, 9, 2);
    // Trụ phù văn 4 góc
    for (const [px, py] of [[11, 11], [50, 11], [11, 26], [50, 26]]) {
      ctx.fillStyle = "#323a38";
      ctx.fillRect(px, py, 4, 6);
      ctx.fillStyle = "#5ef2d6";
      ctx.fillRect(px + 1, py + 1, 2, 2);
    }
    result = { canvas, anchorX: 32, anchorY: 28, solidRadius: 0 };
  } else if (kind === "portal_pad") {
    // Bàn Trận Pháp Dịch Chuyển Hắc Thạch Chạm Khắc Bát Quái (Ô tròn chuyển map)
    const W = 68;
    const H = 44;
    const { canvas, ctx } = makeCanvas(W, H);
    ctx.fillStyle = "rgba(6, 10, 14, 0.52)";
    ctx.beginPath();
    ctx.ellipse(34, 24, 32, 18, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#161b20";
    ctx.beginPath();
    ctx.ellipse(34, 22, 30, 17, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#303840";
    ctx.beginPath();
    ctx.ellipse(34, 21, 27, 15, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#102024";
    ctx.beginPath();
    ctx.ellipse(34, 21, 21, 11, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#48cfba";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(34, 21, 21, 11, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = "rgba(156, 122, 62, 0.72)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(34, 21, 13, 6.5, 0, 0, Math.PI * 2);
    ctx.stroke();
    // 8 trụ ngọc quanh vòng tròn trận pháp
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const px = Math.round(34 + Math.cos(a) * 25);
      const py = Math.round(21 + Math.sin(a) * 14);
      ctx.fillStyle = "#14181c";
      ctx.fillRect(px - 2, py - 4, 4, 5);
      ctx.fillStyle = i % 2 === 0 ? "#5ef2d6" : "#b89042";
      ctx.fillRect(px - 1, py - 3, 2, 2);
    }
    ctx.fillStyle = "#8cebe0";
    ctx.fillRect(32, 20, 4, 2);
    ctx.fillRect(33, 19, 2, 4);
    result = { canvas, anchorX: 34, anchorY: 22, solidRadius: 0 };
  } else if (kind === "crystal_cyan" || kind === "crystal_amber") {
    const isCyan = kind === "crystal_cyan";
    const W = 34;
    const H = 42;
    const { canvas, ctx } = makeCanvas(W, H);
    drawPixelShadow(ctx, 17, 36, 12, 4, 0.3);
    const pal = isCyan
      ? { out: "#08292b", dark: "#115e63", mid: "#22a8ab", lit: "#66f7e6", hi: "#e3fffc" }
      : { out: "#2b1206", dark: "#752b0e", mid: "#cf5919", lit: "#ffa938", hi: "#fff2bd" };
    // Cụm tinh thể 3 mũi nhọn
    const prongs = [
      { cx: 10, topY: 16, w: 6, h: 20 },
      { cx: 24, topY: 18, w: 6, h: 18 },
      { cx: 17, topY: 7, w: 8, h: 30 },
    ];
    for (const pr of prongs) {
      for (let y = pr.topY; y < pr.topY + pr.h; y++) {
        const t = (y - pr.topY) / pr.h;
        const hw = Math.max(1, Math.round((pr.w * 0.5) * Math.min(1, t * 2.4 + 0.15)));
        ctx.fillStyle = pal.out;
        ctx.fillRect(pr.cx - hw - 1, y, hw * 2 + 2, 1);
        ctx.fillStyle = pal.mid;
        ctx.fillRect(pr.cx - hw, y, hw * 2, 1);
        ctx.fillStyle = pal.lit;
        ctx.fillRect(pr.cx - hw, y, Math.max(1, hw), 1);
        ctx.fillStyle = pal.dark;
        ctx.fillRect(pr.cx + 1, y, Math.max(1, hw - 1), 1);
      }
      ctx.fillStyle = pal.hi;
      ctx.fillRect(pr.cx - 1, pr.topY + 2, 2, 4);
    }
    result = { canvas, anchorX: 17, anchorY: 36, solidRadius: 8 };
  } else if (kind === "stalagmite") {
    const W = 30;
    const H = 46;
    const { canvas, ctx } = makeCanvas(W, H);
    drawPixelShadow(ctx, 15, 40, 11, 4, 0.28);
    for (let y = 7; y <= 40; y++) {
      const t = (y - 7) / 33;
      const hw = Math.max(1, Math.round(1 + 9 * Math.pow(t, 0.85)));
      ctx.fillStyle = "#191e24";
      ctx.fillRect(15 - hw - 1, y, hw * 2 + 2, 1);
      ctx.fillStyle = "#48535e";
      ctx.fillRect(15 - hw, y, hw * 2, 1);
      ctx.fillStyle = "#7a8896";
      ctx.fillRect(15 - hw, y, Math.max(1, Math.floor(hw * 0.8)), 1);
      ctx.fillStyle = "#2d343d";
      ctx.fillRect(15 + 1, y, Math.max(1, hw - 1), 1);
    }
    ctx.fillStyle = "#3c7852";
    ctx.fillRect(9, 32, 6, 4);
    ctx.fillStyle = "#8ca3b5";
    ctx.fillRect(14, 9, 2, 5);
    result = { canvas, anchorX: 15, anchorY: 40, solidRadius: 8 };
  } else if (kind === "ancient_pillar") {
    // Trụ Đá Cổ Ngữ Khắc Long Vân & Rêu Phong (chi tiết sắc nét 38x64)
    const W = 38;
    const H = 64;
    const { canvas, ctx } = makeCanvas(W, H);
    drawPixelShadow(ctx, 19, 55, 13, 4, 0.34);
    // Chân đế 2 bậc đá sứt mẻ & rêu
    ctx.fillStyle = "#12161a";
    ctx.fillRect(5, 47, 28, 10);
    ctx.fillStyle = "#333940";
    ctx.fillRect(6, 48, 26, 7);
    ctx.fillStyle = "#4d5660";
    ctx.fillRect(8, 46, 22, 4);
    ctx.fillStyle = "#294f32";
    ctx.fillRect(7, 50, 7, 3);
    ctx.fillRect(23, 48, 7, 2);
    // Thân trụ đá khía dọc có cổ văn quấn quanh
    ctx.fillStyle = "#12161a";
    ctx.fillRect(10, 14, 18, 34);
    ctx.fillStyle = "#383f47";
    ctx.fillRect(12, 15, 14, 32);
    ctx.fillStyle = "#525c66";
    ctx.fillRect(12, 15, 5, 31);
    ctx.fillStyle = "#252b30";
    ctx.fillRect(15, 17, 1, 28);
    ctx.fillRect(22, 17, 1, 28);
    // Hoa văn khắc & phù văn thanh ngọc
    ctx.fillStyle = "#5ef2d6";
    ctx.fillRect(17, 21, 4, 2);
    ctx.fillRect(18, 24, 2, 6);
    ctx.fillRect(16, 32, 6, 2);
    ctx.fillRect(18, 36, 2, 5);
    // Đầu trụ chạm hoa văn & vết vỡ cổ
    ctx.fillStyle = "#12161a";
    ctx.fillRect(8, 8, 22, 8);
    ctx.fillStyle = "#48515c";
    ctx.fillRect(10, 9, 18, 5);
    ctx.fillStyle = "#677380";
    ctx.fillRect(10, 9, 11, 2);
    ctx.fillStyle = "#9c7a3e";
    ctx.fillRect(10, 14, 18, 1);
    ctx.fillStyle = "#294f32";
    ctx.fillRect(11, 41, 6, 5);
    result = { canvas, anchorX: 19, anchorY: 55, solidRadius: 9 };
  } else if (kind === "herb_plot_empty" || kind === "herb_plot_growing" || kind === "herb_plot_ready") {
    const W = 42;
    const H = 28;
    const { canvas, ctx } = makeCanvas(W, H);
    ctx.fillStyle = "#24160c";
    ctx.fillRect(2, 6, 38, 18);
    ctx.fillStyle = "#472b17";
    ctx.fillRect(3, 7, 36, 16);
    ctx.fillStyle = "#21150e";
    ctx.fillRect(5, 9, 32, 12);
    // Luống đất cày
    ctx.fillStyle = "#140c08";
    for (const fy of [11, 15, 19]) {
      ctx.fillRect(6, fy, 30, 1);
    }
    if (kind === "herb_plot_growing") {
      for (const sx of [11, 21, 31]) {
        ctx.fillStyle = "#2f6e36";
        ctx.fillRect(sx, 11, 2, 4);
        ctx.fillStyle = "#5fc456";
        ctx.fillRect(sx - 1, 10, 4, 2);
      }
    } else if (kind === "herb_plot_ready") {
      for (const sx of [10, 20, 30]) {
        ctx.fillStyle = "#1f572e";
        ctx.fillRect(sx, 9, 3, 7);
        ctx.fillStyle = "#52c962";
        ctx.fillRect(sx - 2, 8, 7, 3);
        ctx.fillStyle = "#e8c456";
        ctx.fillRect(sx, 6, 3, 2);
        ctx.fillStyle = "#fff1bd";
        ctx.fillRect(sx + 1, 6, 1, 1);
      }
    }
    result = { canvas, anchorX: 21, anchorY: 20, solidRadius: 0 };
  } else if (kind === "pavilion" || kind === "pavilion_gold") {
    // Đình Bát Giác Cổ Tự 2 tầng mái ngói đen sẫm rêu phong (Quảng Trường / Lầu Chân Dương)
    const isGold = kind === "pavilion_gold";
    const { canvas, ctx } = makeCanvas(144, 128);
    drawPixelShadow(ctx, 72, 114, 54, 12, 0.34);

    // 1. Nền đài đá xanh đen giật 2 cấp + rêu phong + bậc tam cấp trung tâm
    ctx.fillStyle = "#191c1e";
    ctx.fillRect(20, 92, 104, 22);
    ctx.fillStyle = isGold ? "#4f483b" : "#3b4045";
    ctx.fillRect(22, 94, 100, 18);
    ctx.fillStyle = isGold ? "#6b6150" : "#4d5359";
    ctx.fillRect(22, 92, 100, 11);
    ctx.fillStyle = isGold ? "#7d7260" : "#5e656b";
    ctx.fillRect(26, 94, 92, 7);
    ctx.fillStyle = "#2b2f33";
    ctx.fillRect(36, 95, 72, 1);
    ctx.fillRect(36, 99, 72, 1);
    for (let sx = 32; sx <= 112; sx += 16) ctx.fillRect(sx, 94, 1, 7);
    // Rêu bám mép thềm
    ctx.fillStyle = "#284a30";
    ctx.fillRect(24, 101, 12, 3);
    ctx.fillRect(108, 100, 11, 4);
    for (let st = 0; st < 4; st++) {
      const sy = 103 + st * 3;
      const sx = 54 - st;
      const sw = 36 + st * 2;
      ctx.fillStyle = "#17191b";
      ctx.fillRect(sx - 1, sy, sw + 2, 3);
      ctx.fillStyle = st % 2 === 0 ? "#6a7075" : "#555a60";
      ctx.fillRect(sx, sy, sw, 2);
      ctx.fillStyle = "#2d3033";
      ctx.fillRect(sx, sy + 2, sw, 1);
    }

    // 2. Bàn trà đá cổ giữa đình
    ctx.fillStyle = "#1a1c1e";
    ctx.fillRect(66, 86, 12, 8);
    ctx.fillStyle = "#5c6166";
    ctx.fillRect(65, 84, 14, 4);
    ctx.fillStyle = "#7a8187";
    ctx.fillRect(66, 84, 12, 2);
    ctx.fillStyle = "#48cfba";
    ctx.fillRect(71, 82, 3, 2);
    ctx.fillStyle = "#494e52";
    ctx.fillRect(58, 88, 5, 5);
    ctx.fillRect(81, 88, 5, 5);

    // 3. Lan can gỗ lim sơn son cổ sẫm
    for (const [lx, lw] of [[24, 24], [96, 24]]) {
      ctx.fillStyle = "#210b08";
      ctx.fillRect(lx, 86, lw, 8);
      ctx.fillStyle = "#541a14";
      ctx.fillRect(lx + 1, 87, lw - 2, 2);
      ctx.fillRect(lx + 1, 91, lw - 2, 2);
      ctx.fillStyle = "#9c7a3e";
      ctx.fillRect(lx, 85, 3, 2);
      ctx.fillRect(lx + lw - 3, 85, 3, 2);
    }

    // 4. 2 cột hậu & 4 cột chính gỗ lim sơn son sẫm
    for (const cx of [44, 100]) {
      ctx.fillStyle = "#1a0907";
      ctx.fillRect(cx - 2, 56, 4, 39);
      ctx.fillStyle = "#3b130f";
      ctx.fillRect(cx - 1, 56, 2, 38);
    }
    for (const cx of [28, 52, 92, 116]) {
      ctx.fillStyle = "#170705";
      ctx.fillRect(cx - 3, 54, 6, 42);
      ctx.fillStyle = "#4d1813";
      ctx.fillRect(cx - 2, 54, 4, 40);
      ctx.fillStyle = "#69221b";
      ctx.fillRect(cx - 2, 54, 1, 40);
      ctx.fillStyle = "#5c6166";
      ctx.fillRect(cx - 4, 93, 8, 3);
      ctx.fillStyle = "#9c7a3e";
      ctx.fillRect(cx - 3, 91, 6, 2);
    }

    // Rèm lụa sẫm & đèn lồng cổ ấm
    for (const [rx, rw] of [[30, 18], [96, 18]]) {
      ctx.fillStyle = isGold ? "#734e15" : "#541612";
      ctx.fillRect(rx, 58, rw, 4);
      ctx.fillStyle = "#9c7a3e";
      ctx.fillRect(rx, 62, rw, 1);
    }
    for (const lx of [36, 108]) {
      ctx.fillStyle = "#24100a";
      ctx.fillRect(lx, 58, 1, 4);
      ctx.fillStyle = "#4a0f0c";
      ctx.fillRect(lx - 4, 62, 9, 10);
      ctx.fillStyle = "#9e2920";
      ctx.fillRect(lx - 3, 63, 7, 8);
      ctx.fillStyle = "#ffcb6b";
      ctx.fillRect(lx - 1, 65, 3, 4);
      ctx.fillStyle = "#9c7a3e";
      ctx.fillRect(lx - 2, 62, 5, 1);
      ctx.fillRect(lx - 2, 71, 5, 1);
      ctx.fillRect(lx, 72, 1, 4);
    }

    // Hoành Phi đồng cổ giữa hiên
    ctx.fillStyle = "#120c09";
    ctx.fillRect(58, 59, 28, 10);
    ctx.fillStyle = "#9c7a3e";
    ctx.fillRect(59, 60, 26, 1);
    ctx.fillRect(59, 67, 26, 1);
    ctx.fillStyle = "#d9b566";
    ctx.fillRect(63, 62, 4, 3);
    ctx.fillRect(70, 62, 4, 3);
    ctx.fillRect(77, 62, 4, 3);

    drawDouGongFrieze(ctx, 24, 120, 54, "#26110d", isGold ? "#6e4814" : "#214d3d", "#9c7a3e");

    const pavShades = isGold
      ? ["#140d04", "#2e1d08", "#4d320e", "#734c16", "#996922", "#bd8935"]
      : ["#070b10", "#0f1722", "#182433", "#233447", "#324861", "#496380"];
    drawLayeredTileRoof(ctx, { cx: 72, topY: 32, topHalfW: 20, botHalfW: 58, roofH: 25, shades: pavShades, finials: false });
    drawDouGongFrieze(ctx, 44, 100, 32, "#26110d", isGold ? "#6e4814" : "#214d3d", "#9c7a3e");
    drawLayeredTileRoof(ctx, { cx: 72, topY: 11, topHalfW: 6, botHalfW: 39, roofH: 22, shades: pavShades, finials: false });

    // Đỉnh Bảo Hồ Lô đồng cổ
    ctx.fillStyle = "#261709";
    ctx.fillRect(69, 4, 6, 9);
    ctx.fillStyle = "#9c7a3e";
    ctx.fillRect(70, 5, 4, 7);
    ctx.fillStyle = "#e0c27e";
    ctx.fillRect(71, 3, 2, 4);

    result = { canvas, anchorX: 72, anchorY: 114, solidRadius: 28 };
  } else if (kind === "hall" || kind === "hall_jade" || kind === "hall_blood") {
    // Đại Điện Cổ Phong 2 tầng (tường đá tro xám ám khói, ngói sẫm rêu phong) 172x142
    const isJade = kind === "hall_jade";
    const isBlood = kind === "hall_blood";
    const { canvas, ctx } = makeCanvas(172, 142);
    drawPixelShadow(ctx, 86, 124, 66, 13, 0.34);

    // 1. Nền thềm đá sẫm & rêu + bậc tam cấp trung tâm
    ctx.fillStyle = isBlood ? "#121014" : "#181817";
    ctx.fillRect(14, 102, 144, 22);
    ctx.fillStyle = isBlood ? "#2f2a33" : "#403e39";
    ctx.fillRect(16, 104, 140, 18);
    ctx.fillStyle = isBlood ? "#433c4a" : "#524f49";
    ctx.fillRect(16, 102, 140, 11);
    ctx.fillStyle = isBlood ? "#554e5c" : "#636058";
    ctx.fillRect(20, 103, 132, 7);
    ctx.fillStyle = isBlood ? "#211d24" : "#33312d";
    for (let px = 28; px < 146; px += 14) ctx.fillRect(px, 103, 1, 7);
    ctx.fillStyle = "#284a30";
    ctx.fillRect(18, 110, 15, 3);
    ctx.fillRect(138, 112, 14, 3);
    for (let st = 0; st < 4; st++) {
      const sy = 113 + st * 3;
      ctx.fillStyle = "#181716";
      ctx.fillRect(60 - st, sy, 52 + st * 2, 3);
      ctx.fillStyle = isBlood ? (st % 2 === 0 ? "#5c5463" : "#49424f") : (st % 2 === 0 ? "#6e6a61" : "#57544c");
      ctx.fillRect(61 - st, sy, 50 + st * 2, 2);
    }

    // 2. Tường điện đá vữa xám cổ sẫm màu + chân tường đá xanh & vết nứt
    const colMain = isBlood ? "#3b141c" : isJade ? "#163b33" : "#571b16";
    const colDark = isBlood ? "#1a080c" : isJade ? "#0a1c18" : "#1f0907";
    const colHi = isBlood ? "#63222e" : isJade ? "#2b6357" : "#7d2b22";
    ctx.fillStyle = "#170e0c";
    ctx.fillRect(24, 58, 124, 48);
    ctx.fillStyle = isBlood ? "#242029" : isJade ? "#495751" : "#575248";
    ctx.fillRect(27, 60, 118, 44);
    ctx.fillStyle = isBlood ? "#312c36" : isJade ? "#596962" : "#696358";
    ctx.fillRect(29, 60, 114, 22);
    ctx.fillStyle = isBlood ? "#18151c" : "#33302b";
    ctx.fillRect(27, 93, 118, 11);
    ctx.fillStyle = "#26472c";
    ctx.fillRect(30, 96, 12, 5);
    ctx.fillRect(128, 95, 13, 6);

    // 3. Cửa sổ song gỗ cổ & Câu đối sẫm
    const winBgTop = isBlood ? "#a33333" : isJade ? "#328f7b" : "#b87f2e";
    const winBgBot = isBlood ? "#d96b52" : isJade ? "#6fd9c4" : "#d9b268";
    drawLatticeWindow(ctx, 34, 67, 20, 19, "#24100c", "#421c14", winBgTop, winBgBot);
    drawLatticeWindow(ctx, 118, 67, 20, 19, "#24100c", "#421c14", winBgTop, winBgBot);

    for (const dx of [64, 105]) {
      ctx.fillStyle = "#5c1411";
      ctx.fillRect(dx, 66, 3, 24);
      ctx.fillStyle = "#b89042";
      ctx.fillRect(dx + 1, 68, 1, 4);
      ctx.fillRect(dx + 1, 74, 1, 4);
      ctx.fillRect(dx + 1, 80, 1, 4);
    }

    // 4. Đại Môn gỗ thiết mộc thụt sâu + đinh đồng cổ
    ctx.fillStyle = "#140806";
    ctx.fillRect(68, 63, 36, 41);
    ctx.fillStyle = "#0a0504";
    ctx.fillRect(70, 65, 32, 39);
    ctx.fillStyle = isBlood ? "#42151b" : "#4d1b15";
    ctx.fillRect(71, 66, 14, 37);
    ctx.fillRect(87, 66, 14, 37);
    ctx.fillStyle = isBlood ? "#5e2028" : "#69251e";
    ctx.fillRect(73, 69, 10, 14);
    ctx.fillRect(89, 69, 10, 14);
    ctx.fillStyle = "#b89042";
    ctx.fillRect(82, 81, 2, 3);
    ctx.fillRect(88, 81, 2, 3);
    for (const dy of [87, 92, 97]) {
      ctx.fillRect(74, dy, 2, 1);
      ctx.fillRect(79, dy, 2, 1);
      ctx.fillRect(91, dy, 2, 1);
      ctx.fillRect(96, dy, 2, 1);
    }

    // 5. 4 trụ gỗ chính sẫm màu & đế đá xám
    for (const cx of [27, 60, 112, 145]) {
      ctx.fillStyle = colDark;
      ctx.fillRect(cx - 2, 60, 6, 44);
      ctx.fillStyle = colMain;
      ctx.fillRect(cx - 1, 60, 4, 43);
      ctx.fillStyle = colHi;
      ctx.fillRect(cx - 1, 60, 1, 43);
      ctx.fillStyle = "#5e5a52";
      ctx.fillRect(cx - 3, 101, 8, 3);
    }

    // Đấu củng hiên tầng 1 & Đèn lồng treo
    drawDouGongFrieze(ctx, 22, 150, 56, "#240f0b", isJade ? "#1f544a" : "#214d3d", "#9c7a3e");
    for (const lx of [52, 120]) {
      ctx.fillStyle = "#4d0f0c";
      ctx.fillRect(lx - 3, 64, 6, 10);
      ctx.fillStyle = isBlood ? "#b82e3f" : "#a82d25";
      ctx.fillRect(lx - 2, 65, 4, 8);
      ctx.fillStyle = "#ffd070";
      ctx.fillRect(lx - 1, 67, 2, 4);
      ctx.fillStyle = "#9c7a3e";
      ctx.fillRect(lx, 74, 1, 3);
    }

    // 6. Vật phẩm trấn điện trước thềm
    for (const gx of [48, 124]) {
      if (isJade) {
        ctx.fillStyle = "#161918";
        ctx.fillRect(gx - 5, 101, 10, 7);
        ctx.fillStyle = "#35544a";
        ctx.fillRect(gx - 4, 101, 8, 5);
        ctx.fillStyle = "#9c7a3e";
        ctx.fillRect(gx - 5, 99, 10, 2);
        ctx.fillStyle = "#5ef2d6";
        ctx.fillRect(gx - 2, 98, 4, 2);
      } else if (isBlood) {
        ctx.fillStyle = "#170e12";
        ctx.fillRect(gx - 5, 101, 10, 7);
        ctx.fillStyle = "#421721";
        ctx.fillRect(gx - 4, 101, 8, 5);
        ctx.fillStyle = "#e0384e";
        ctx.fillRect(gx - 2, 96, 4, 4);
        ctx.fillStyle = "#ffc266";
        ctx.fillRect(gx - 1, 97, 2, 2);
      } else {
        ctx.fillStyle = "#1d1c1a";
        ctx.fillRect(gx - 4, 104, 8, 5);
        ctx.fillStyle = "#57544d";
        ctx.fillRect(gx - 3, 98, 6, 7);
        ctx.fillStyle = "#757068";
        ctx.fillRect(gx - 3, 96, 6, 4);
        ctx.fillStyle = "#8a847b";
        ctx.fillRect(gx - 2, 96, 2, 2);
      }
    }

    // 7. Hai tầng mái ngói âm dương sẫm cổ
    const hallRoof = isJade
      ? ["#061011", "#0d2122", "#163436", "#214b4d", "#2f6668", "#468285"]
      : isBlood
        ? ["#0c0508", "#1f0b12", "#38121e", "#571b2b", "#78263b", "#9e3852"]
        : ["#0f0706", "#210e0c", "#381815", "#52241f", "#6e322b", "#8a453c"];

    drawLayeredTileRoof(ctx, { cx: 86, topY: 34, topHalfW: 48, botHalfW: 76, roofH: 23, shades: hallRoof });

    // Tầng gác giữa hai mái + lan can gỗ + Hoành Phi đồng cổ
    ctx.fillStyle = "#1a0e09";
    ctx.fillRect(42, 26, 88, 15);
    ctx.fillStyle = isBlood ? "#292229" : "#4f463a";
    ctx.fillRect(44, 28, 84, 11);
    for (let bx = 46; bx < 126; bx += 6) {
      ctx.fillStyle = "#33170e";
      ctx.fillRect(bx, 34, 2, 5);
    }
    ctx.fillStyle = "#140d09";
    ctx.fillRect(64, 30, 44, 12);
    ctx.fillStyle = "#9c7a3e";
    ctx.fillRect(65, 31, 42, 1);
    ctx.fillRect(65, 40, 42, 1);
    ctx.fillStyle = "#d9b566";
    ctx.fillRect(72, 34, 6, 3);
    ctx.fillRect(83, 34, 6, 3);
    ctx.fillRect(94, 34, 6, 3);

    drawLayeredTileRoof(ctx, { cx: 86, topY: 10, topHalfW: 28, botHalfW: 56, roofH: 20, shades: hallRoof });

    // Châu đồng cổ đỉnh nóc
    ctx.fillStyle = "#9c7a3e";
    ctx.fillRect(83, 4, 6, 5);
    ctx.fillStyle = "#e0c27e";
    ctx.fillRect(85, 2, 2, 4);

    result = { canvas, anchorX: 86, anchorY: 124, solidRx: 52, solidRy: 20 };
  } else if (kind === "stone_tower") {
    // Lầu Đá Cổ 3 tầng (hắc thạch rêu phong sẫm màu) 148x140
    const { canvas, ctx } = makeCanvas(148, 140);
    drawPixelShadow(ctx, 74, 124, 56, 12, 0.35);

    ctx.fillStyle = "#111417";
    ctx.fillRect(18, 102, 112, 22);
    ctx.fillStyle = "#31373d";
    ctx.fillRect(20, 104, 108, 18);
    ctx.fillStyle = "#485059";
    ctx.fillRect(22, 104, 104, 7);
    for (let st = 0; st < 4; st++) {
      const sy = 113 + st * 3;
      ctx.fillStyle = "#171b1f";
      ctx.fillRect(54 - st, sy, 40 + st * 2, 3);
      ctx.fillStyle = "#5c656e";
      ctx.fillRect(55 - st, sy, 38 + st * 2, 2);
    }

    ctx.fillStyle = "#12151a";
    ctx.fillRect(30, 62, 88, 44);
    ctx.fillStyle = "#343b42";
    ctx.fillRect(33, 64, 82, 40);
    ctx.fillStyle = "#22272e";
    for (let y = 70; y < 102; y += 6) {
      ctx.fillRect(33, y, 82, 1);
      for (let x = 38 + ((y / 6) % 2) * 8; x < 110; x += 16) ctx.fillRect(x, y, 1, 6);
    }
    ctx.fillStyle = "#294d2f";
    ctx.fillRect(34, 92, 13, 6);
    ctx.fillRect(98, 76, 11, 5);

    ctx.fillStyle = "#0e1114";
    ctx.fillRect(62, 72, 24, 32);
    ctx.fillRect(65, 68, 18, 4);
    ctx.fillStyle = "#1a524c";
    ctx.fillRect(66, 74, 16, 30);
    ctx.fillStyle = "#48cfba";
    ctx.fillRect(70, 78, 8, 14);
    for (const wx of [42, 98]) {
      ctx.fillStyle = "#0e1114";
      ctx.fillRect(wx, 74, 8, 13);
      ctx.fillStyle = "#48cfba";
      ctx.fillRect(wx + 2, 76, 4, 9);
    }

    const stoneTile = ["#0a0e14", "#151b24", "#212a36", "#2f3c4a", "#435366", "#5c7087"];
    drawLayeredTileRoof(ctx, { cx: 74, topY: 45, topHalfW: 36, botHalfW: 58, roofH: 19, shades: stoneTile, ridgeCol: "#5f6c78", trimCol: "#6d7d8c" });

    ctx.fillStyle = "#12151a";
    ctx.fillRect(42, 31, 64, 16);
    ctx.fillStyle = "#3a424a";
    ctx.fillRect(44, 33, 60, 12);
    ctx.fillStyle = "#48cfba";
    ctx.fillRect(70, 36, 8, 6);
    drawLayeredTileRoof(ctx, { cx: 74, topY: 18, topHalfW: 24, botHalfW: 45, roofH: 15, shades: stoneTile, ridgeCol: "#5f6c78", trimCol: "#6d7d8c" });

    ctx.fillStyle = "#3a424a";
    ctx.fillRect(56, 12, 36, 8);
    drawLayeredTileRoof(ctx, { cx: 74, topY: 5, topHalfW: 10, botHalfW: 30, roofH: 11, shades: stoneTile, ridgeCol: "#48cfba", trimCol: "#6d7d8c", finials: false });
    ctx.fillStyle = "#5ef2d6";
    ctx.fillRect(72, 2, 4, 4);

    result = { canvas, anchorX: 74, anchorY: 122, solidRx: 46, solidRy: 19 };
  } else if (kind === "clan_house" || kind === "clan_house_herb" || kind === "clan_house_tea") {
    // Tộc Xá / Dược Các / Trà Quán Cổ Phong (vách đá tro sẫm, Mã Đầu Tường rêu phong, ngói than đen)
    const isHerb = kind === "clan_house_herb";
    const isTea = kind === "clan_house_tea";
    const { canvas, ctx } = makeCanvas(128, 108);
    drawPixelShadow(ctx, 64, 94, 49, 10, 0.32);

    // 1. Nền thềm đá xanh đen & 3 bậc tam cấp
    ctx.fillStyle = "#171614";
    ctx.fillRect(14, 78, 100, 17);
    ctx.fillStyle = "#45423d";
    ctx.fillRect(16, 80, 96, 13);
    ctx.fillStyle = "#57534c";
    ctx.fillRect(18, 80, 92, 6);
    for (let st = 0; st < 3; st++) {
      ctx.fillStyle = "#171614";
      ctx.fillRect(50 - st, 86 + st * 3, 28 + st * 2, 3);
      ctx.fillStyle = st % 2 === 0 ? "#66625a" : "#524e47";
      ctx.fillRect(51 - st, 86 + st * 3, 26 + st * 2, 2);
    }

    // 2. Tường vữa xám tro cổ + chân tường đá sẫm + rêu ẩm
    ctx.fillStyle = "#1a1310";
    ctx.fillRect(20, 44, 88, 38);
    ctx.fillStyle = isTea ? "#6b5f50" : "#5e594f";
    ctx.fillRect(22, 46, 84, 34);
    ctx.fillStyle = isTea ? "#786b5b" : "#706a5e";
    ctx.fillRect(22, 46, 84, 15);
    ctx.fillStyle = "#383530";
    ctx.fillRect(22, 71, 84, 9);
    ctx.fillStyle = "#29472e";
    ctx.fillRect(23, 74, 10, 5);
    ctx.fillRect(94, 73, 10, 6);

    // Mã Đầu Tường đá xám rêu phong ôm dốc mái
    for (const [gx, dir] of [[18, 1], [104, -1]]) {
      ctx.fillStyle = "#181a1d";
      ctx.fillRect(gx, 32, 6, 48);
      ctx.fillRect(gx + dir * 4, 24, 6, 12);
      ctx.fillStyle = "#6e6a60";
      ctx.fillRect(gx + 1, 33, 4, 46);
      ctx.fillRect(gx + dir * 4 + 1, 25, 4, 11);
      ctx.fillStyle = "#1a1f26";
      ctx.fillRect(gx - 1, 31, 8, 2);
      ctx.fillRect(gx + dir * 4 - 1, 23, 8, 2);
    }

    // 3. 4 cột gỗ thiết mộc sẫm
    for (const px of [24, 49, 79, 102]) {
      ctx.fillStyle = "#1c0e08";
      ctx.fillRect(px - 1, 46, 4, 34);
      ctx.fillStyle = "#381d10";
      ctx.fillRect(px, 46, 2, 33);
      ctx.fillStyle = "#5c574f";
      ctx.fillRect(px - 2, 79, 6, 2);
    }

    // Lan can gỗ sẫm hiên nhà 2 bên
    for (const [rx, rw] of [[25, 22], [81, 21]]) {
      ctx.fillStyle = "#21110a";
      ctx.fillRect(rx, 72, rw, 7);
      ctx.fillStyle = "#4d2716";
      ctx.fillRect(rx + 1, 73, rw - 2, 2);
      for (let bx = rx + 3; bx < rx + rw - 2; bx += 4) {
        ctx.fillStyle = "#663620";
        ctx.fillRect(bx, 75, 2, 3);
      }
    }

    // 4. Cửa gỗ cổ sẫm thụt sâu có khe đèn ấm
    ctx.fillStyle = "#1a0c08";
    ctx.fillRect(52, 51, 24, 29);
    ctx.fillStyle = "#0d0604";
    ctx.fillRect(54, 53, 20, 27);
    ctx.fillStyle = "#452112";
    ctx.fillRect(55, 54, 8, 25);
    ctx.fillRect(65, 54, 8, 25);
    ctx.fillStyle = "#5c2d19";
    ctx.fillRect(56, 56, 6, 10);
    ctx.fillRect(66, 56, 6, 10);
    ctx.fillStyle = "#e0b35e";
    ctx.fillRect(63, 56, 2, 18);
    ctx.fillStyle = "#9c7a3e";
    ctx.fillRect(61, 66, 1, 2);
    ctx.fillRect(66, 66, 1, 2);

    // 5. Cửa sổ trái & Nguyệt Môn phải
    drawLatticeWindow(ctx, 29, 53, 15, 14, "#24110b", "#451f12", "#b87f2e", "#d9b268");

    const mcx = 92;
    const mcy = 60;
    for (let dy = -7; dy <= 7; dy++) {
      for (let dx = -7; dx <= 7; dx++) {
        const d2 = dx * dx + dy * dy;
        if (d2 <= 52 && d2 >= 36) {
          ctx.fillStyle = "#24110b";
          ctx.fillRect(mcx + dx, mcy + dy, 1, 1);
        } else if (d2 < 36) {
          ctx.fillStyle = dy < 0 ? "#d9b268" : "#b87f2e";
          ctx.fillRect(mcx + dx, mcy + dy, 1, 1);
        }
      }
    }
    ctx.fillStyle = "#451f12";
    ctx.fillRect(mcx - 1, mcy - 5, 2, 10);
    ctx.fillRect(mcx - 5, mcy - 1, 10, 2);

    // 6. Đèn lồng & chi tiết đặc thù từng biến thể nhà
    for (const lx of [43, 85]) {
      ctx.fillStyle = "#9c281e";
      ctx.fillRect(lx - 2, 48, 5, 7);
      ctx.fillStyle = "#ffd070";
      ctx.fillRect(lx - 1, 50, 3, 3);
    }

    if (isHerb) {
      ctx.fillStyle = "#3d2210";
      ctx.fillRect(28, 72, 14, 2);
      ctx.fillRect(30, 74, 2, 6);
      ctx.fillRect(38, 74, 2, 6);
      ctx.fillStyle = "#347842";
      ctx.fillRect(29, 70, 5, 3);
      ctx.fillStyle = "#62ab52";
      ctx.fillRect(36, 70, 5, 3);
      ctx.fillStyle = "#9c6e1b";
      ctx.fillRect(24, 48, 3, 3);
      ctx.fillRect(23, 51, 5, 4);
      ctx.fillStyle = "#d9ad52";
      ctx.fillRect(24, 52, 2, 2);
    } else if (isTea) {
      for (let ax = 48; ax < 80; ax += 4) {
        ctx.fillStyle = ((ax >> 2) & 1) === 0 ? "#782319" : "#9c917d";
        ctx.fillRect(ax, 45, 4, 4);
      }
      ctx.fillStyle = "#3b2313";
      ctx.fillRect(111, 34, 2, 46);
      ctx.fillStyle = "#7a1b14";
      ctx.fillRect(113, 36, 11, 16);
      ctx.fillStyle = "#b89042";
      ctx.fillRect(114, 37, 9, 14);
      ctx.fillStyle = "#54110c";
      ctx.fillRect(116, 40, 5, 7);
      ctx.fillStyle = "#472a15";
      ctx.fillRect(83, 73, 7, 7);
      ctx.fillStyle = "#96291e";
      ctx.fillRect(85, 72, 3, 2);
    } else {
      ctx.fillStyle = "#3d2210";
      ctx.fillRect(32, 74, 6, 6);
      ctx.fillStyle = "#29612d";
      ctx.fillRect(31, 70, 8, 4);
      ctx.fillStyle = "#472a15";
      ctx.fillRect(84, 73, 7, 7);
      ctx.fillStyle = "#96291e";
      ctx.fillRect(86, 72, 3, 2);
    }

    drawDouGongFrieze(ctx, 22, 106, 43, "#26120b", isHerb ? "#1f543d" : "#213342", "#9c7a3e");

    const houseRoof = isHerb
      ? ["#08120e", "#12261d", "#1d3d2e", "#2b5742", "#3e7359", "#589476"]
      : isTea
        ? ["#120b08", "#261711", "#3d251b", "#573628", "#734937", "#91624c"]
        : ["#090c0f", "#141920", "#202833", "#2e3947", "#404e5e", "#566678"];
    drawLayeredTileRoof(ctx, { cx: 64, topY: 16, topHalfW: 34, botHalfW: 56, roofH: 28, shades: houseRoof, ridgeCol: "#5f6870", trimCol: "#707a85" });

    result = { canvas, anchorX: 64, anchorY: 92, solidRx: 40, solidRy: 15 };
  } else if (kind === "table") {
    // Bàn Trà Đá Cổ Bát Giác + 3 Đôn Đá & Bộ Ấm Chén Thanh Ngọc (48x34)
    const { canvas, ctx } = makeCanvas(48, 34);
    drawPixelShadow(ctx, 24, 26, 18, 6, 0.3);
    // 3 đôn đá chạm khắc quanh bàn
    for (const [sx, sy] of [[4, 18], [37, 18], [20, 22]]) {
      ctx.fillStyle = "#16191c";
      ctx.fillRect(sx, sy, 7, 8);
      ctx.fillStyle = "#424950";
      ctx.fillRect(sx + 1, sy + 1, 5, 6);
      ctx.fillStyle = "#626b73";
      ctx.fillRect(sx + 1, sy, 5, 3);
      ctx.fillStyle = "#2b4d32";
      ctx.fillRect(sx + 1, sy + 5, 2, 2);
    }
    // Chân trụ bàn đá & rêu bám
    ctx.fillStyle = "#16191c";
    ctx.fillRect(19, 17, 10, 10);
    ctx.fillStyle = "#3c4248";
    ctx.fillRect(20, 18, 8, 8);
    ctx.fillStyle = "#2b4d32";
    ctx.fillRect(20, 23, 4, 3);
    // Mặt bàn bát giác đá xanh cổ
    ctx.fillStyle = "#16191c";
    ctx.fillRect(12, 9, 24, 10);
    ctx.fillRect(10, 11, 28, 6);
    ctx.fillStyle = "#525a63";
    ctx.fillRect(13, 10, 22, 8);
    ctx.fillRect(11, 12, 26, 4);
    ctx.fillStyle = "#6d7782";
    ctx.fillRect(14, 10, 20, 4);
    ctx.fillStyle = "#343940";
    ctx.fillRect(12, 16, 24, 2);
    // Ấm trà thanh ngọc, 2 chén nhỏ & cuộn thư pháp
    ctx.fillStyle = "#24594c";
    ctx.fillRect(21, 9, 5, 4);
    ctx.fillStyle = "#48b89b";
    ctx.fillRect(22, 8, 3, 3);
    ctx.fillStyle = "#9c7a3e";
    ctx.fillRect(23, 7, 1, 1);
    ctx.fillStyle = "#8a8578";
    ctx.fillRect(16, 12, 2, 2);
    ctx.fillRect(29, 12, 2, 2);
    ctx.fillStyle = "#a69777";
    ctx.fillRect(17, 9, 3, 2);
    result = { canvas, anchorX: 24, anchorY: 26, solidRadius: 10 };
  } else if (kind === "lantern") {
    // Cột Đèn Gỗ Lim Đôi Lồng Cung Đình Có Mái Ngói & Tua Rua Đỏ (42x58)
    const { canvas, ctx } = makeCanvas(42, 58);
    drawPixelShadow(ctx, 21, 51, 10, 3, 0.34);
    // Chân đế đá xanh cổ rêu phong
    ctx.fillStyle = "#14171a";
    ctx.fillRect(15, 45, 12, 8);
    ctx.fillStyle = "#464e56";
    ctx.fillRect(16, 46, 10, 5);
    ctx.fillStyle = "#626c75";
    ctx.fillRect(17, 45, 8, 2);
    ctx.fillStyle = "#294d30";
    ctx.fillRect(16, 49, 4, 2);
    // Trụ gỗ lim sẫm & tay đỡ đấu củng
    ctx.fillStyle = "#1a0b07";
    ctx.fillRect(19, 13, 4, 34);
    ctx.fillStyle = "#472114";
    ctx.fillRect(20, 14, 2, 32);
    // Xà ngang & thanh chống chéo 2 bên
    ctx.fillStyle = "#1a0b07";
    ctx.fillRect(5, 13, 32, 3);
    ctx.fillStyle = "#5c2c1a";
    ctx.fillRect(6, 14, 30, 1);
    for (const [bx, dir] of [[15, 1], [26, -1]]) {
      ctx.fillStyle = "#3d1b0f";
      ctx.fillRect(bx, 16, 2, 2);
      ctx.fillRect(bx + dir * 2, 18, 2, 2);
    }
    // Mái ngói nhỏ che mưa phía trên
    ctx.fillStyle = "#0e1217";
    ctx.fillRect(11, 9, 20, 4);
    ctx.fillStyle = "#2a3542";
    ctx.fillRect(13, 10, 16, 2);
    ctx.fillStyle = "#9c7a3e";
    ctx.fillRect(19, 7, 4, 2);
    // 2 Lồng đèn lục giác khung gỗ & đồng
    for (const lx of [8, 34]) {
      ctx.fillStyle = "#24120c";
      ctx.fillRect(lx, 15, 1, 3);
      ctx.fillStyle = "#9c7a3e";
      ctx.fillRect(lx - 3, 17, 6, 2);
      ctx.fillRect(lx - 3, 28, 6, 2);
      ctx.fillStyle = "#59110d";
      ctx.fillRect(lx - 4, 19, 8, 9);
      ctx.fillStyle = "#b52920";
      ctx.fillRect(lx - 3, 19, 6, 9);
      ctx.fillStyle = "#ffcb6b";
      ctx.fillRect(lx - 1, 21, 2, 5);
      ctx.fillStyle = "#3b1510";
      ctx.fillRect(lx - 3, 22, 6, 1);
      ctx.fillRect(lx - 3, 25, 6, 1);
      // Tua rua lụa đỏ
      ctx.fillStyle = "#8a1c15";
      ctx.fillRect(lx, 30, 1, 5);
    }
    result = { canvas, anchorX: 21, anchorY: 51, solidRadius: 5 };
  } else if (kind === "stone_lamp") {
    // Thạch Đăng Lung Cổ (Đèn Đá Bát Giác Chạm Hoa Sen 32x52)
    const { canvas, ctx } = makeCanvas(32, 52);
    drawPixelShadow(ctx, 16, 46, 10, 3, 0.34);
    // Đế đá bậc giật cấp & đài sen
    ctx.fillStyle = "#14181b";
    ctx.fillRect(8, 39, 16, 8);
    ctx.fillRect(10, 36, 12, 4);
    ctx.fillStyle = "#41484f";
    ctx.fillRect(9, 40, 14, 6);
    ctx.fillStyle = "#5b646d";
    ctx.fillRect(11, 37, 10, 3);
    ctx.fillStyle = "#294d30";
    ctx.fillRect(9, 43, 5, 3);
    ctx.fillRect(19, 41, 4, 2);
    // Thân trụ chạm khắc & đai đồng
    ctx.fillStyle = "#14181b";
    ctx.fillRect(13, 25, 6, 12);
    ctx.fillStyle = "#485058";
    ctx.fillRect(14, 26, 4, 10);
    ctx.fillStyle = "#626d78";
    ctx.fillRect(14, 26, 2, 10);
    ctx.fillStyle = "#9c7a3e";
    ctx.fillRect(13, 30, 6, 1);
    // Đài sen đỡ lồng đèn
    ctx.fillStyle = "#14181b";
    ctx.fillRect(9, 22, 14, 4);
    ctx.fillStyle = "#525b63";
    ctx.fillRect(10, 23, 12, 2);
    // Buồng lửa song sắt & ngọn lửa ấm 3 lớp
    ctx.fillStyle = "#14181b";
    ctx.fillRect(9, 13, 14, 10);
    ctx.fillStyle = "#bd4f14";
    ctx.fillRect(11, 14, 10, 8);
    ctx.fillStyle = "#ff9e2c";
    ctx.fillRect(12, 15, 8, 6);
    ctx.fillStyle = "#fff0a6";
    ctx.fillRect(14, 16, 4, 4);
    // Song đá 2 bên buồng lửa
    ctx.fillStyle = "#363d42";
    ctx.fillRect(10, 14, 2, 8);
    ctx.fillRect(20, 14, 2, 8);
    // Mái đá cong vút 2 tầng & Bảo Châu đỉnh
    ctx.fillStyle = "#14181b";
    ctx.fillRect(4, 9, 24, 5);
    ctx.fillRect(7, 6, 18, 4);
    ctx.fillStyle = "#4a5259";
    ctx.fillRect(5, 10, 22, 3);
    ctx.fillStyle = "#626c75";
    ctx.fillRect(8, 7, 16, 2);
    ctx.fillStyle = "#294d30";
    ctx.fillRect(6, 10, 6, 2);
    ctx.fillRect(21, 11, 4, 1);
    ctx.fillStyle = "#9c7a3e";
    ctx.fillRect(14, 2, 4, 4);
    ctx.fillStyle = "#e0c27e";
    ctx.fillRect(15, 1, 2, 2);
    result = { canvas, anchorX: 16, anchorY: 46, solidRadius: 5 };
  } else if (kind === "banners") {
    // Chiến Kỳ Gia Tộc Cổ Phong (Mũi Kích Đồng & Cờ Thêu Phù Văn 44x58)
    const { canvas, ctx } = makeCanvas(44, 58);
    drawPixelShadow(ctx, 22, 50, 9, 3, 0.3);
    // Chân tảng đá
    ctx.fillStyle = "#16191c";
    ctx.fillRect(16, 44, 12, 7);
    ctx.fillStyle = "#4c545c";
    ctx.fillRect(17, 45, 10, 5);
    // Trụ cờ gỗ lim & mũi thương đồng cổ
    ctx.fillStyle = "#1f0e08";
    ctx.fillRect(20, 9, 4, 37);
    ctx.fillStyle = "#4f2616";
    ctx.fillRect(21, 10, 2, 35);
    ctx.fillStyle = "#9c7a3e";
    ctx.fillRect(21, 2, 2, 7);
    ctx.fillRect(19, 7, 6, 2);
    ctx.fillStyle = "#e0c27e";
    ctx.fillRect(21, 1, 1, 4);
    // Xà ngang treo cờ
    ctx.fillStyle = "#26120b";
    ctx.fillRect(8, 12, 28, 3);
    ctx.fillStyle = "#9c7a3e";
    ctx.fillRect(7, 12, 2, 3);
    ctx.fillRect(35, 12, 2, 3);
    // Lá cờ đỏ sẫm viền đồng cổ đuôi én & dải lụa 2 bên
    ctx.fillStyle = "#240a08";
    ctx.fillRect(11, 15, 22, 24);
    ctx.fillStyle = "#6e1914";
    ctx.fillRect(12, 15, 20, 22);
    ctx.fillStyle = "#8c241d";
    ctx.fillRect(14, 16, 16, 18);
    // Phù văn trăng khuyết vàng cổ giữa cờ
    ctx.fillStyle = "#cfa550";
    ctx.fillRect(18, 20, 8, 2);
    ctx.fillRect(17, 22, 3, 6);
    ctx.fillRect(18, 28, 8, 2);
    // Dải lụa sẫm rủ 2 bên & đuôi cờ rách đôi
    ctx.fillStyle = "#3d120f";
    ctx.fillRect(9, 15, 2, 18);
    ctx.fillRect(33, 15, 2, 18);
    ctx.clearRect(20, 35, 4, 5);
    ctx.fillStyle = "#cfa550";
    ctx.fillRect(12, 36, 2, 2);
    ctx.fillRect(30, 36, 2, 2);
    result = { canvas, anchorX: 22, anchorY: 50, solidRadius: 4 };
  } else if (kind === "incense_burner") {
    // Lư Hương Đồng Cổ Tam Túc (40x50)
    const { canvas, ctx } = makeCanvas(40, 50);
    drawPixelShadow(ctx, 20, 43, 14, 4, 0.34);
    // Bệ đá bát giác rêu phong
    ctx.fillStyle = "#16191c";
    ctx.fillRect(7, 36, 26, 8);
    ctx.fillStyle = "#485058";
    ctx.fillRect(8, 37, 24, 5);
    ctx.fillStyle = "#294d30";
    ctx.fillRect(9, 39, 6, 3);
    // 3 chân vạc đồng cổ gỉ xanh
    for (const lx of [12, 19, 26]) {
      ctx.fillStyle = "#1a140b";
      ctx.fillRect(lx, 31, 3, 7);
      ctx.fillStyle = "#6e5428";
      ctx.fillRect(lx, 31, 2, 6);
    }
    // Bầu lư hương đồng xanh-vàng cổ & tai rồng 2 bên
    ctx.fillStyle = "#1a150c";
    ctx.fillRect(9, 20, 22, 13);
    ctx.fillStyle = "#4a432b";
    ctx.fillRect(10, 21, 20, 10);
    ctx.fillStyle = "#7a612e";
    ctx.fillRect(11, 22, 10, 8);
    ctx.fillStyle = "#3a6e59";
    ctx.fillRect(22, 24, 6, 4);
    // Tai lư hương 2 bên
    ctx.fillStyle = "#7a612e";
    ctx.fillRect(6, 20, 4, 6);
    ctx.fillRect(30, 20, 4, 6);
    // Tro than hồng & nắp chạm lọng
    ctx.fillStyle = "#cf4e1b";
    ctx.fillRect(14, 18, 12, 2);
    ctx.fillStyle = "#ffb84d";
    ctx.fillRect(17, 18, 6, 1);
    ctx.fillStyle = "#3b3019";
    ctx.fillRect(12, 14, 16, 4);
    ctx.fillStyle = "#9c7a3e";
    ctx.fillRect(14, 12, 12, 3);
    ctx.fillRect(18, 9, 4, 3);
    result = { canvas, anchorX: 20, anchorY: 43, solidRadius: 11 };
  } else if (kind === "stone_stele") {
    // Bia Đá Cổ Ghi Công / Độc Mộ Gia Tộc (38x56)
    const { canvas, ctx } = makeCanvas(38, 56);
    drawPixelShadow(ctx, 19, 48, 13, 4, 0.34);
    // Bệ đá quy đế rêu phong
    ctx.fillStyle = "#15181c";
    ctx.fillRect(6, 39, 26, 10);
    ctx.fillStyle = "#434a52";
    ctx.fillRect(7, 40, 24, 7);
    ctx.fillStyle = "#5e6770";
    ctx.fillRect(9, 39, 20, 3);
    ctx.fillStyle = "#294d30";
    ctx.fillRect(8, 43, 8, 4);
    // Tấm bia đá xanh đen cao có vết nứt & cổ tự mờ
    ctx.fillStyle = "#15181c";
    ctx.fillRect(10, 12, 18, 29);
    ctx.fillStyle = "#3b424a";
    ctx.fillRect(11, 13, 16, 27);
    ctx.fillStyle = "#525b66";
    ctx.fillRect(12, 14, 9, 24);
    ctx.fillStyle = "#22272c";
    ctx.fillRect(21, 18, 2, 12);
    ctx.fillRect(19, 30, 2, 5);
    // Dòng cổ tự khắc chìm ánh đồng/ngọc
    ctx.fillStyle = "#b8964c";
    for (let cy = 18; cy <= 33; cy += 3) {
      ctx.fillRect(16, cy, 2, 2);
      if (cy < 30) ctx.fillRect(20, cy + 1, 1, 2);
    }
    // Mũ bia chạm khắc
    ctx.fillStyle = "#15181c";
    ctx.fillRect(8, 7, 22, 6);
    ctx.fillStyle = "#5c656e";
    ctx.fillRect(9, 8, 20, 4);
    ctx.fillStyle = "#9c7a3e";
    ctx.fillRect(16, 6, 6, 2);
    result = { canvas, anchorX: 19, anchorY: 48, solidRadius: 10 };
  } else if (kind === "ancient_well") {
    // Cổ Tỉnh Giếng Đá Rêu Phong Có Mái Che & Gàu Gỗ (48x54)
    const { canvas, ctx } = makeCanvas(48, 54);
    drawPixelShadow(ctx, 24, 45, 18, 5, 0.34);
    // Thành giếng đá bát giác rêu xanh & nước thẫm sâu bên trong
    ctx.fillStyle = "#15181a";
    ctx.fillRect(9, 31, 30, 15);
    ctx.fillStyle = "#485057";
    ctx.fillRect(10, 32, 28, 12);
    ctx.fillStyle = "#626c75";
    ctx.fillRect(11, 31, 26, 6);
    ctx.fillStyle = "#0b2426";
    ctx.fillRect(14, 33, 20, 5);
    ctx.fillStyle = "#19524e";
    ctx.fillRect(16, 35, 14, 2);
    ctx.fillStyle = "#2b4f32";
    ctx.fillRect(11, 40, 8, 4);
    ctx.fillRect(29, 39, 7, 4);
    // Hai trụ gỗ lim & trục quay dây thừng + gàu gỗ
    for (const px of [12, 34]) {
      ctx.fillStyle = "#1c0e08";
      ctx.fillRect(px, 14, 3, 21);
      ctx.fillStyle = "#4d2716";
      ctx.fillRect(px + 1, 15, 1, 19);
    }
    ctx.fillStyle = "#3d2112";
    ctx.fillRect(14, 22, 20, 3);
    ctx.fillStyle = "#8a7554";
    ctx.fillRect(23, 24, 1, 8);
    ctx.fillStyle = "#5c3419";
    ctx.fillRect(21, 30, 5, 4);
    // Mái ngói âm dương nhỏ che giếng
    drawLayeredTileRoof(ctx, { cx: 24, topY: 4, topHalfW: 8, botHalfW: 20, roofH: 12, shades: ["#0a0e12", "#171f29", "#243140", "#334457", "#475c73", "#607791"], finials: false });
    result = { canvas, anchorX: 24, anchorY: 45, solidRadius: 14 };
  } else if (kind === "bridge_stone_h") {
    // Thạch Kiều Vòm Ngang Đá Xanh Cổ: Mố Đá Bờ, Mặt Cầu Vồng 2.5D & Lan Can Lọng Hoa Sen
    const { canvas, ctx } = makeCanvas(124, 68);
    ctx.fillStyle = "rgba(5, 16, 18, 0.44)";
    ctx.fillRect(22, 48, 80, 12);
    // 3 trụ phân thủy hình mũi thuyền ngâm nước + bọt sóng
    for (const px of [31, 58, 85]) {
      ctx.fillStyle = "#14181c";
      ctx.fillRect(px, 47, 8, 13);
      ctx.fillStyle = "#363d45";
      ctx.fillRect(px + 1, 47, 6, 10);
      ctx.fillStyle = "#4d5660";
      ctx.fillRect(px + 2, 47, 3, 8);
      ctx.fillStyle = "#8be0d4";
      ctx.fillRect(px - 2, 58, 12, 2);
    }
    // Mố đá cổ bám rêu & 4 bậc đá lên cầu hai đầu Tây/Đông
    for (const ax of [17, 99]) {
      ctx.fillStyle = "#14171a";
      ctx.fillRect(ax, 13, 8, 40);
      ctx.fillStyle = "#434a52";
      ctx.fillRect(ax + 1, 14, 6, 37);
      ctx.fillStyle = "#294d30";
      ctx.fillRect(ax + 1, 44, 5, 5);
    }
    for (let s = 0; s < 4; s++) {
      const lx = 3 + s * 4;
      const rx = 117 - s * 4;
      ctx.fillStyle = "#16181a";
      ctx.fillRect(lx, 18, 4, 31);
      ctx.fillRect(rx, 18, 4, 31);
      ctx.fillStyle = s % 2 === 0 ? "#5a6066" : "#484d54";
      ctx.fillRect(lx, 19, 3, 29);
      ctx.fillRect(rx + 1, 19, 3, 29);
      ctx.fillStyle = "#292d30";
      ctx.fillRect(lx + 3, 19, 1, 29);
      ctx.fillRect(rx, 19, 1, 29);
    }
    // Mặt cầu đá phiến khum vòm 2.5D (giữa sáng vồng lên, hai đầu sẫm xuống)
    ctx.fillStyle = "#16181a";
    ctx.fillRect(20, 16, 84, 34);
    for (let px = 20; px < 104; px += 7) {
      const archT = 1 - Math.min(1, Math.abs(px + 3 - 62) / 42);
      const cA = archT > 0.55 ? "#6c737a" : archT > 0.25 ? "#5b6269" : "#494f56";
      const cB = archT > 0.55 ? "#60676e" : archT > 0.25 ? "#4f565c" : "#3e434a";
      const rowOff = (px >> 2) & 1;
      ctx.fillStyle = rowOff ? cA : cB;
      ctx.fillRect(px, 18, 6, 11);
      ctx.fillStyle = rowOff ? cB : cA;
      ctx.fillRect(px, 38, 6, 10);
      ctx.fillStyle = "#292d33";
      ctx.fillRect(px + 6, 18, 1, 30);
    }
    // Dải đá hoa văn tâm cầu & rêu khe
    ctx.fillStyle = "#292d33";
    ctx.fillRect(20, 29, 84, 9);
    ctx.fillStyle = "#666e75";
    ctx.fillRect(20, 30, 84, 7);
    ctx.fillStyle = "#2a4f32";
    ctx.fillRect(30, 20, 5, 2);
    ctx.fillRect(86, 44, 6, 2);
    ctx.fillStyle = "#2b3036";
    ctx.fillRect(20, 48, 84, 4);
    // Lan can đá lọng lỗ phía Bắc (y=7..18) với 5 trụ đỉnh hoa sen đồng
    ctx.fillStyle = "#14171a";
    ctx.fillRect(16, 11, 92, 4);
    ctx.fillStyle = "#6b737d";
    ctx.fillRect(17, 12, 90, 2);
    ctx.fillStyle = "#394047";
    ctx.fillRect(16, 16, 92, 3);
    for (let bx = 22; bx < 102; bx += 5) {
      ctx.fillStyle = "#14171a";
      ctx.fillRect(bx, 14, 2, 3);
      ctx.fillStyle = "#565e66";
      ctx.fillRect(bx, 14, 1, 2);
    }
    for (const px of [17, 38, 59, 80, 101]) {
      ctx.fillStyle = "#14171a";
      ctx.fillRect(px, 7, 6, 12);
      ctx.fillStyle = "#77808a";
      ctx.fillRect(px + 1, 8, 4, 10);
      ctx.fillStyle = "#9c7a3e";
      ctx.fillRect(px + 1, 6, 4, 2);
    }
    result = { canvas, anchorX: 62, anchorY: 34, solidRadius: 0 };
  } else if (kind === "bridge_stone_h_front") {
    const { canvas, ctx } = makeCanvas(124, 68);
    ctx.fillStyle = "#14171a";
    ctx.fillRect(16, 46, 92, 4);
    ctx.fillStyle = "#6b737d";
    ctx.fillRect(17, 47, 90, 2);
    ctx.fillStyle = "#394047";
    ctx.fillRect(16, 51, 92, 3);
    for (let bx = 22; bx < 102; bx += 5) {
      ctx.fillStyle = "#14171a";
      ctx.fillRect(bx, 49, 2, 3);
      ctx.fillStyle = "#565e66";
      ctx.fillRect(bx, 49, 1, 2);
    }
    for (const px of [17, 38, 59, 80, 101]) {
      ctx.fillStyle = "#14171a";
      ctx.fillRect(px, 43, 6, 12);
      ctx.fillStyle = "#77808a";
      ctx.fillRect(px + 1, 44, 4, 10);
      ctx.fillStyle = "#9c7a3e";
      ctx.fillRect(px + 1, 42, 4, 2);
    }
    result = { canvas, anchorX: 62, anchorY: 34, solidRadius: 0 };
  } else if (kind === "bridge_stone_v") {
    // Thạch Kiều Vòm Dọc Đá Xanh Cổ: Mố Đá Hai Bờ, Vòm 2.5D & Lan Can Lọng Hoa Sen
    const { canvas, ctx } = makeCanvas(68, 124);
    for (const py of [42, 76]) {
      ctx.fillStyle = "#14181c";
      ctx.fillRect(9, py, 50, 7);
      ctx.fillStyle = "#383f47";
      ctx.fillRect(10, py + 1, 48, 4);
      ctx.fillStyle = "#8be0d4";
      ctx.fillRect(6, py + 5, 6, 2);
      ctx.fillRect(56, py + 5, 6, 2);
    }
    // Mố đá cổ hai đầu Bắc/Nam
    for (const ay of [20, 96]) {
      ctx.fillStyle = "#14171a";
      ctx.fillRect(12, ay, 44, 8);
      ctx.fillStyle = "#434a52";
      ctx.fillRect(13, ay + 1, 42, 6);
      ctx.fillStyle = "#294d30";
      ctx.fillRect(14, ay + 2, 5, 4);
      ctx.fillRect(49, ay + 2, 5, 4);
    }
    for (let s = 0; s < 5; s++) {
      const ty = 3 + s * 4;
      const by = 117 - s * 4;
      ctx.fillStyle = "#16181a";
      ctx.fillRect(16, ty, 36, 4);
      ctx.fillRect(16, by, 36, 4);
      ctx.fillStyle = s % 2 === 0 ? "#5a6066" : "#484d54";
      ctx.fillRect(17, ty, 34, 3);
      ctx.fillRect(17, by, 34, 3);
      ctx.fillStyle = "#292d30";
      ctx.fillRect(17, ty + 3, 34, 1);
      ctx.fillRect(17, by + 3, 34, 1);
    }
    ctx.fillStyle = "#16181a";
    ctx.fillRect(14, 24, 40, 76);
    for (let py = 24; py < 100; py += 7) {
      const archT = 1 - Math.min(1, Math.abs(py + 3 - 62) / 38);
      const cA = archT > 0.55 ? "#6c737a" : archT > 0.25 ? "#5b6269" : "#494f56";
      const cB = archT > 0.55 ? "#60676e" : archT > 0.25 ? "#4f565c" : "#3e434a";
      const sh = Math.min(6, 100 - py);
      ctx.fillStyle = ((py >> 2) & 1) === 0 ? cA : cB;
      ctx.fillRect(16, py, 14, sh);
      ctx.fillStyle = ((py >> 2) & 1) === 0 ? cB : cA;
      ctx.fillRect(38, py, 14, sh);
      ctx.fillStyle = "#292d33";
      ctx.fillRect(16, py + sh, 36, 1);
    }
    // Dải đá tâm cầu dọc
    ctx.fillStyle = "#292d33";
    ctx.fillRect(30, 24, 8, 76);
    ctx.fillStyle = "#666e75";
    ctx.fillRect(31, 24, 6, 76);
    ctx.fillStyle = "#2a4f32";
    ctx.fillRect(18, 34, 4, 4);
    ctx.fillRect(45, 78, 4, 4);
    // Hai dãy lan can đá lọng lỗ & 6 trụ chỏm đồng
    for (const rx of [9, 53]) {
      ctx.fillStyle = "#14171a";
      ctx.fillRect(rx, 15, 6, 94);
      ctx.fillStyle = "#485057";
      ctx.fillRect(rx + 1, 16, 4, 92);
      ctx.fillStyle = "#6b737d";
      ctx.fillRect(rx + 1, 16, 2, 92);
      for (let by = 22; by < 102; by += 6) {
        ctx.fillStyle = "#1c2126";
        ctx.fillRect(rx + 2, by, 2, 3);
      }
      for (const py of [15, 34, 53, 72, 91, 105]) {
        ctx.fillStyle = "#14171a";
        ctx.fillRect(rx - 1, py - 2, 8, 7);
        ctx.fillStyle = "#77808a";
        ctx.fillRect(rx, py - 1, 6, 5);
        ctx.fillStyle = "#9c7a3e";
        ctx.fillRect(rx + 1, py - 3, 4, 2);
      }
    }
    result = { canvas, anchorX: 34, anchorY: 62, solidRadius: 0 };
  } else if (kind === "wood_bridge_h") {
    // Cầu Gỗ Cổ Vòm Ngang: Mố Đá Rêu, Ván Gỗ Sẫm Lên Bóng Vồng 2.5D & Lan Can Chấn Song
    const { canvas, ctx } = makeCanvas(116, 62);
    ctx.fillStyle = "rgba(5, 16, 18, 0.44)";
    ctx.fillRect(20, 44, 76, 10);
    // Cọc gỗ thiết mộc chữ thập ngâm nước + bọt sóng
    for (const px of [30, 56, 82]) {
      ctx.fillStyle = "#140b06";
      ctx.fillRect(px, 43, 6, 12);
      ctx.fillStyle = "#361d10";
      ctx.fillRect(px + 1, 43, 4, 10);
      ctx.fillStyle = "#8be0d4";
      ctx.fillRect(px - 2, 53, 10, 2);
    }
    // Mố cầu đá xanh rêu & bậc gỗ-đá hai đầu
    for (const ax of [14, 96]) {
      ctx.fillStyle = "#14171a";
      ctx.fillRect(ax, 13, 6, 36);
      ctx.fillStyle = "#485057";
      ctx.fillRect(ax + 1, 14, 4, 33);
      ctx.fillStyle = "#294d30";
      ctx.fillRect(ax + 1, 41, 4, 4);
    }
    for (let s = 0; s < 4; s++) {
      ctx.fillStyle = "#140b06";
      ctx.fillRect(2 + s * 3, 16, 3, 30);
      ctx.fillRect(111 - s * 3, 16, 3, 30);
      ctx.fillStyle = s % 2 === 0 ? "#57351d" : "#422714";
      ctx.fillRect(2 + s * 3, 17, 2, 28);
      ctx.fillRect(112 - s * 3, 17, 2, 28);
    }
    // Mặt cầu ván gỗ cổ sẫm shading vồng 2.5D (giữa ấm sáng hơn)
    ctx.fillStyle = "#140b06";
    ctx.fillRect(18, 15, 80, 32);
    for (let px = 19; px < 97; px += 4) {
      const archT = 1 - Math.min(1, Math.abs(px + 2 - 58) / 39);
      const plankA = archT > 0.55 ? "#784b2a" : archT > 0.25 ? "#613a1f" : "#4a2c17";
      const plankB = archT > 0.55 ? "#694022" : archT > 0.25 ? "#523019" : "#3d2312";
      ctx.fillStyle = (px & 4) === 0 ? plankA : plankB;
      ctx.fillRect(px, 16, 3, 30);
      ctx.fillStyle = "#241309";
      ctx.fillRect(px + 3, 16, 1, 30);
      ctx.fillRect(px + 1, 18, 1, 1);
      ctx.fillRect(px + 1, 43, 1, 1);
    }
    // Thanh ván dọc trung tâm cầu
    ctx.fillStyle = "#21120a";
    ctx.fillRect(19, 27, 78, 8);
    ctx.fillStyle = "#6e4324";
    ctx.fillRect(19, 28, 78, 6);
    ctx.fillStyle = "#241309";
    ctx.fillRect(18, 45, 80, 3);
    // Lan can chấn song sơn son thiết mộc phía Bắc (lộ ván/nước giữa các chấn song)
    ctx.fillStyle = "#1f0907";
    ctx.fillRect(15, 8, 86, 3);
    ctx.fillStyle = "#7a251d";
    ctx.fillRect(16, 9, 84, 1);
    ctx.fillStyle = "#241009";
    ctx.fillRect(15, 14, 86, 2);
    for (let bx = 21; bx < 95; bx += 4) {
      ctx.fillStyle = "#3b130f";
      ctx.fillRect(bx, 11, 2, 3);
    }
    for (const px of [16, 36, 56, 76, 96]) {
      ctx.fillStyle = "#1f0907";
      ctx.fillRect(px, 6, 4, 11);
      ctx.fillStyle = "#872b23";
      ctx.fillRect(px + 1, 7, 2, 9);
      ctx.fillStyle = "#b89042";
      ctx.fillRect(px, 4, 4, 2);
      if (px === 56) {
        ctx.fillStyle = "#ffcb6b";
        ctx.fillRect(px + 1, 3, 2, 2);
      }
    }
    result = { canvas, anchorX: 58, anchorY: 31, solidRadius: 0 };
  } else if (kind === "wood_bridge_h_front") {
    const { canvas, ctx } = makeCanvas(116, 62);
    ctx.fillStyle = "#1f0907";
    ctx.fillRect(15, 42, 86, 3);
    ctx.fillStyle = "#7a251d";
    ctx.fillRect(16, 43, 84, 1);
    ctx.fillStyle = "#241009";
    ctx.fillRect(15, 48, 86, 2);
    for (let bx = 21; bx < 95; bx += 4) {
      ctx.fillStyle = "#3b130f";
      ctx.fillRect(bx, 45, 2, 3);
    }
    for (const px of [16, 36, 56, 76, 96]) {
      ctx.fillStyle = "#1f0907";
      ctx.fillRect(px, 40, 4, 11);
      ctx.fillStyle = "#872b23";
      ctx.fillRect(px + 1, 41, 2, 9);
      ctx.fillStyle = "#b89042";
      ctx.fillRect(px, 38, 4, 2);
    }
    result = { canvas, anchorX: 58, anchorY: 31, solidRadius: 0 };
  } else if (kind === "wood_bridge_v") {
    // Cầu Gỗ Cổ Vòm Dọc: Mố Đá Hai Bờ, Ván Gỗ 2.5D Bật Sáng Ở Đỉnh Cầu, Lan Can Chấn Song & Đèn Giữa Cầu
    const { canvas, ctx } = makeCanvas(62, 116);
    // Dầm cọc gỗ dưới gầm cầu & bọt sóng
    for (const py of [39, 71]) {
      ctx.fillStyle = "#140b06";
      ctx.fillRect(10, py, 42, 6);
      ctx.fillStyle = "#361d10";
      ctx.fillRect(11, py + 1, 40, 4);
      ctx.fillStyle = "#8be0d4";
      ctx.fillRect(7, py + 4, 5, 2);
      ctx.fillRect(50, py + 4, 5, 2);
    }
    // Mố cầu đá xanh rêu phong Bắc & Nam
    for (const ay of [15, 95]) {
      ctx.fillStyle = "#14171a";
      ctx.fillRect(12, ay, 38, 6);
      ctx.fillStyle = "#485057";
      ctx.fillRect(13, ay + 1, 36, 4);
      ctx.fillStyle = "#294d30";
      ctx.fillRect(14, ay + 1, 5, 3);
      ctx.fillRect(43, ay + 2, 5, 3);
    }
    // 4 bậc dẫn đá/gỗ hai đầu
    for (let s = 0; s < 4; s++) {
      const ty = 2 + s * 3;
      const by = 111 - s * 3;
      ctx.fillStyle = "#140b06";
      ctx.fillRect(16, ty, 30, 3);
      ctx.fillRect(16, by, 30, 3);
      ctx.fillStyle = s % 2 === 0 ? "#57351d" : "#422714";
      ctx.fillRect(17, ty, 28, 2);
      ctx.fillRect(17, by, 28, 2);
    }
    // Mặt cầu ván gỗ cổ sẫm shading vồng 2.5D
    ctx.fillStyle = "#140b06";
    ctx.fillRect(14, 18, 34, 80);
    for (let py = 19; py < 97; py += 4) {
      const archT = 1 - Math.min(1, Math.abs(py + 2 - 58) / 39);
      const plankA = archT > 0.55 ? "#784b2a" : archT > 0.25 ? "#613a1f" : "#4a2c17";
      const plankB = archT > 0.55 ? "#694022" : archT > 0.25 ? "#523019" : "#3d2312";
      ctx.fillStyle = (py & 4) === 0 ? plankA : plankB;
      ctx.fillRect(15, py, 32, 3);
      ctx.fillStyle = "#241309";
      ctx.fillRect(15, py + 3, 32, 1);
      ctx.fillRect(17, py + 1, 1, 1);
      ctx.fillRect(44, py + 1, 1, 1);
    }
    // Thanh ván dọc dẫn hướng tâm cầu
    ctx.fillStyle = "#21120a";
    ctx.fillRect(27, 19, 8, 78);
    ctx.fillStyle = "#6e4324";
    ctx.fillRect(28, 19, 6, 78);
    // Hai bên lan can gỗ thiết mộc chấn song lọng + 5 trụ chỏm đồng + đèn lồng giữa cầu
    for (const rx of [9, 48]) {
      ctx.fillStyle = "#1f0907";
      ctx.fillRect(rx, 14, 5, 88);
      ctx.fillStyle = "#36130f";
      ctx.fillRect(rx + 1, 15, 3, 86);
      ctx.fillStyle = "#7a251d";
      ctx.fillRect(rx + 1, 15, 2, 86);
      for (let by = 22; by < 94; by += 5) {
        ctx.fillStyle = "#140907";
        ctx.fillRect(rx + 2, by, 2, 2);
      }
      for (const py of [15, 35, 56, 77, 97]) {
        ctx.fillStyle = "#1f0907";
        ctx.fillRect(rx - 1, py - 2, 7, 6);
        ctx.fillStyle = "#872b23";
        ctx.fillRect(rx, py - 1, 5, 4);
        ctx.fillStyle = "#b89042";
        ctx.fillRect(rx, py - 3, 5, 2);
        if (py === 56) {
          ctx.fillStyle = "#ffcb6b";
          ctx.fillRect(rx + 1, py - 4, 3, 2);
        }
      }
    }
    result = { canvas, anchorX: 31, anchorY: 58, solidRadius: 0 };
  } else if (kind === "wood_pier") {
    // Bến Thuyền Câu Cá (Bờ Đông -> Vươn Về Tây Ra Mặt Hồ, Đèn Ở Đầu Bến Phía Nước)
    const { canvas, ctx } = makeCanvas(92, 52);
    // Cọc gỗ thiết mộc ngâm nước & sóng vỗ nhẹ
    for (const [px, py] of [[14, 33], [38, 33], [62, 33], [14, 39], [62, 39]]) {
      ctx.fillStyle = "#140b06";
      ctx.fillRect(px, py, 4, 13);
      ctx.fillStyle = "#382113";
      ctx.fillRect(px + 1, py, 2, 11);
      ctx.fillStyle = "rgba(155, 224, 214, 0.72)";
      ctx.fillRect(px - 2, py + 11, 8, 1);
    }
    // Mố đá rêu 3 bậc ở bờ Đông (x=72..90)
    for (let s = 0; s < 3; s++) {
      const sx = 74 + s * 5;
      ctx.fillStyle = "#14171a";
      ctx.fillRect(sx, 14, 5, 24);
      ctx.fillStyle = s % 2 === 0 ? "#525961" : "#42484f";
      ctx.fillRect(sx, 15, 4, 22);
      ctx.fillStyle = "#294d30";
      ctx.fillRect(sx + 1, 32, 3, 4);
    }
    // Sàn gỗ đóng đinh sắt & dầm viền trên dưới
    ctx.fillStyle = "#170d07";
    ctx.fillRect(6, 13, 72, 24);
    ctx.fillStyle = "#4d2f18";
    ctx.fillRect(8, 15, 68, 20);
    for (let px = 9; px < 74; px += 4) {
      ctx.fillStyle = (px & 4) === 0 ? "#664023" : "#4a2d18";
      ctx.fillRect(px, 16, 3, 18);
      ctx.fillStyle = "#26160b";
      ctx.fillRect(px + 3, 16, 1, 18);
    }
    ctx.fillStyle = "#2b190d";
    ctx.fillRect(8, 14, 68, 2);
    ctx.fillRect(8, 33, 68, 2);
    // 4 cọc buộc dây thừng
    for (const [bx, by] of [[9, 12], [9, 32], [68, 12], [68, 32]]) {
      ctx.fillStyle = "#24140a";
      ctx.fillRect(bx, by, 4, 6);
      ctx.fillStyle = "#9e8456";
      ctx.fillRect(bx, by + 2, 4, 2);
    }
    // Giỏ đan tre tròn đặt trên sàn
    ctx.fillStyle = "#241608";
    ctx.fillRect(54, 18, 8, 8);
    ctx.fillStyle = "#8a682e";
    ctx.fillRect(55, 19, 6, 6);
    ctx.fillStyle = "#5c421a";
    ctx.fillRect(56, 20, 4, 3);
    // Cột đèn gỗ mái nhỏ treo đầu bến phía Tây (trên mặt nước!)
    ctx.fillStyle = "#1a0d07";
    ctx.fillRect(10, 4, 3, 14);
    ctx.fillRect(9, 4, 8, 2);
    ctx.fillStyle = "#87231b";
    ctx.fillRect(13, 7, 5, 8);
    ctx.fillStyle = "#ffcb6b";
    ctx.fillRect(14, 9, 3, 4);
    ctx.fillStyle = "#9c7a3e";
    ctx.fillRect(14, 15, 2, 2);
    result = { canvas, anchorX: 46, anchorY: 26, solidRadius: 0 };
  } else if (kind === "wood_pier_n") {
    // Bến Thuyền Hướng Bắc (Bờ Nam -> Vươn Lên Bắc Vào Hồ, Đèn Ở Đầu Bến Phía Bắc)
    const { canvas, ctx } = makeCanvas(52, 92);
    for (const [px, py] of [[13, 12], [35, 12], [13, 38], [35, 38]]) {
      ctx.fillStyle = "#140b06";
      ctx.fillRect(px, py, 4, 12);
      ctx.fillStyle = "rgba(155, 224, 214, 0.72)";
      ctx.fillRect(px - 2, py + 10, 8, 1);
    }
    // Mố đá rêu 3 bậc ở bờ Nam (y=72..90)
    for (let s = 0; s < 3; s++) {
      const sy = 74 + s * 5;
      ctx.fillStyle = "#14171a";
      ctx.fillRect(14, sy, 24, 5);
      ctx.fillStyle = s % 2 === 0 ? "#525961" : "#42484f";
      ctx.fillRect(15, sy, 22, 4);
    }
    ctx.fillStyle = "#170d07";
    ctx.fillRect(13, 6, 26, 72);
    for (let py = 8; py < 75; py += 4) {
      ctx.fillStyle = (py & 4) === 0 ? "#664023" : "#4a2d18";
      ctx.fillRect(16, py, 20, 3);
      ctx.fillStyle = "#26160b";
      ctx.fillRect(16, py + 3, 20, 1);
    }
    ctx.fillStyle = "#2b190d";
    ctx.fillRect(14, 8, 2, 68);
    ctx.fillRect(36, 8, 2, 68);
    for (const [bx, by] of [[12, 9], [36, 9], [12, 68], [36, 68]]) {
      ctx.fillStyle = "#24140a";
      ctx.fillRect(bx, by, 4, 5);
      ctx.fillStyle = "#9e8456";
      ctx.fillRect(bx, by + 2, 4, 2);
    }
    ctx.fillStyle = "#241608";
    ctx.fillRect(19, 54, 8, 8);
    ctx.fillStyle = "#8a682e";
    ctx.fillRect(20, 55, 6, 6);
    // Đèn ở mũi Bắc
    ctx.fillStyle = "#1a0d07";
    ctx.fillRect(35, 3, 3, 12);
    ctx.fillRect(34, 3, 7, 2);
    ctx.fillStyle = "#87231b";
    ctx.fillRect(36, 6, 5, 7);
    ctx.fillStyle = "#ffcb6b";
    ctx.fillRect(37, 8, 3, 3);
    result = { canvas, anchorX: 26, anchorY: 46, solidRadius: 0 };
  } else if (kind === "wood_pier_s") {
    // Bến Thuyền Hướng Nam (Bờ Bắc -> Vươn Xuống Nam Ra Sông, Đèn Ở Đầu Bến Phía Nam)
    const { canvas, ctx } = makeCanvas(52, 92);
    for (const [px, py] of [[13, 44], [35, 44], [13, 74], [35, 74]]) {
      ctx.fillStyle = "#140b06";
      ctx.fillRect(px, py, 4, 13);
      ctx.fillStyle = "rgba(155, 224, 214, 0.72)";
      ctx.fillRect(px - 2, py + 11, 8, 1);
    }
    // Mố đá rêu 3 bậc ở bờ Bắc (y=2..18)
    for (let s = 0; s < 3; s++) {
      const sy = 4 + s * 5;
      ctx.fillStyle = "#14171a";
      ctx.fillRect(14, sy, 24, 5);
      ctx.fillStyle = s % 2 === 0 ? "#525961" : "#42484f";
      ctx.fillRect(15, sy, 22, 4);
    }
    ctx.fillStyle = "#170d07";
    ctx.fillRect(13, 16, 26, 70);
    for (let py = 18; py < 83; py += 4) {
      ctx.fillStyle = (py & 4) === 0 ? "#664023" : "#4a2d18";
      ctx.fillRect(16, py, 20, 3);
      ctx.fillStyle = "#26160b";
      ctx.fillRect(16, py + 3, 20, 1);
    }
    ctx.fillStyle = "#2b190d";
    ctx.fillRect(14, 18, 2, 66);
    ctx.fillRect(36, 18, 2, 66);
    for (const [bx, by] of [[12, 20], [36, 20], [12, 78], [36, 78]]) {
      ctx.fillStyle = "#24140a";
      ctx.fillRect(bx, by, 4, 5);
      ctx.fillStyle = "#9e8456";
      ctx.fillRect(bx, by + 2, 4, 2);
    }
    ctx.fillStyle = "#241608";
    ctx.fillRect(20, 30, 8, 8);
    ctx.fillStyle = "#8a682e";
    ctx.fillRect(21, 31, 6, 6);
    // Đèn ở mũi Nam
    ctx.fillStyle = "#1a0d07";
    ctx.fillRect(35, 62, 3, 14);
    ctx.fillRect(34, 62, 7, 2);
    ctx.fillStyle = "#87231b";
    ctx.fillRect(36, 65, 5, 7);
    ctx.fillStyle = "#ffcb6b";
    ctx.fillRect(37, 67, 3, 3);
    result = { canvas, anchorX: 26, anchorY: 46, solidRadius: 0 };
  } else if (kind === "mine_entrance") {
    // Cửa Hầm Mỏ Cũ / Động Phủ Cổ Phong (hắc thạch rêu phong)
    const { canvas, ctx } = makeCanvas(112, 86);
    drawPixelShadow(ctx, 56, 71, 43, 11, 0.35);
    ctx.fillStyle = "#111418";
    ctx.fillRect(10, 16, 92, 54);
    ctx.fillStyle = "#2f353b";
    ctx.fillRect(14, 12, 84, 52);
    ctx.fillStyle = "#485059";
    ctx.fillRect(20, 12, 70, 18);
    ctx.fillStyle = "#5b646e";
    ctx.fillRect(28, 14, 46, 8);
    ctx.fillStyle = "#1f2329";
    for (let ry = 22; ry < 60; ry += 10) ctx.fillRect(16, ry, 80, 1);
    ctx.fillStyle = "#284d2e";
    ctx.fillRect(22, 12, 22, 5);
    ctx.fillRect(62, 14, 18, 4);
    ctx.fillStyle = "#060708";
    ctx.fillRect(36, 32, 40, 36);
    ctx.fillStyle = "#361e0f";
    ctx.fillRect(32, 30, 6, 38);
    ctx.fillRect(74, 30, 6, 38);
    ctx.fillRect(28, 28, 56, 6);
    ctx.fillStyle = "#523019";
    ctx.fillRect(33, 31, 4, 36);
    ctx.fillRect(75, 31, 4, 36);
    ctx.fillStyle = "#1f2226";
    ctx.fillRect(46, 66, 2, 14);
    ctx.fillRect(64, 66, 2, 14);
    for (let ry = 67; ry < 79; ry += 4) {
      ctx.fillStyle = "#3d2615";
      ctx.fillRect(43, ry, 26, 2);
    }
    ctx.fillStyle = "#d9a23b";
    ctx.fillRect(54, 34, 4, 5);
    ctx.fillStyle = "#ffe896";
    ctx.fillRect(55, 35, 2, 3);
    ctx.fillStyle = "#26170c";
    ctx.fillRect(12, 56, 18, 12);
    ctx.fillStyle = "#48cfba";
    ctx.fillRect(14, 52, 6, 4);
    ctx.fillStyle = "#b89042";
    ctx.fillRect(21, 53, 6, 3);
    result = { canvas, anchorX: 56, anchorY: 70, solidRx: 40, solidRy: 16 };
  } else if (kind === "stone_arch") {
    // Sơn Môn Cổ Thạch phần TRỤ ĐÁ XANH ĐEN rêu phong
    const { canvas, ctx } = makeCanvas(124, 112);
    ctx.fillStyle = "rgba(0,0,0,0.32)";
    ctx.fillRect(14, 92, 22, 8);
    ctx.fillRect(88, 92, 22, 8);
    for (const px of [18, 92]) {
      ctx.fillStyle = "#161a1f";
      ctx.fillRect(px - 4, 84, 22, 14);
      ctx.fillStyle = "#485059";
      ctx.fillRect(px - 2, 86, 18, 10);
      ctx.fillStyle = "#626c75";
      ctx.fillRect(px, 86, 14, 4);
      ctx.fillStyle = "#161a1f";
      ctx.fillRect(px, 38, 14, 50);
      ctx.fillStyle = "#3f464e";
      ctx.fillRect(px + 2, 38, 10, 48);
      ctx.fillStyle = "#5c656e";
      ctx.fillRect(px + 2, 38, 4, 48);
      ctx.fillStyle = "#294d2f";
      ctx.fillRect(px + 2, 68, 7, 9);
    }
    result = { canvas, anchorX: 62, anchorY: 96, solidRadius: 0 };
  } else if (kind === "stone_arch_top") {
    const { canvas, ctx } = makeCanvas(124, 112);
    ctx.fillStyle = "#14181c";
    ctx.fillRect(10, 28, 104, 14);
    ctx.fillStyle = "#444c54";
    ctx.fillRect(12, 30, 100, 10);
    ctx.fillStyle = "#5f6870";
    ctx.fillRect(12, 30, 100, 3);
    drawDouGongFrieze(ctx, 18, 106, 26, "#1f252b", "#214d3d", "#9c7a3e");
    ctx.fillStyle = "#1c0e08";
    ctx.fillRect(46, 28, 32, 12);
    ctx.fillStyle = "#9c7a3e";
    ctx.fillRect(47, 29, 30, 1);
    ctx.fillRect(47, 38, 30, 1);
    ctx.fillStyle = "#d9b566";
    ctx.fillRect(52, 32, 4, 3);
    ctx.fillRect(60, 32, 4, 3);
    ctx.fillRect(68, 32, 4, 3);

    for (const lx of [38, 86]) {
      ctx.fillStyle = "#9c281e";
      ctx.fillRect(lx - 3, 42, 6, 8);
      ctx.fillStyle = "#ffd070";
      ctx.fillRect(lx - 1, 44, 2, 4);
      ctx.fillStyle = "#9c7a3e";
      ctx.fillRect(lx, 50, 1, 3);
    }

    const archTile = ["#080c12", "#121a24", "#1c2836", "#293b4f", "#3a526e", "#547294"];
    drawLayeredTileRoof(ctx, { cx: 25, topY: 18, topHalfW: 8, botHalfW: 19, roofH: 11, shades: archTile, finials: false });
    drawLayeredTileRoof(ctx, { cx: 99, topY: 18, topHalfW: 8, botHalfW: 19, roofH: 11, shades: archTile, finials: false });
    drawLayeredTileRoof(ctx, { cx: 62, topY: 7, topHalfW: 16, botHalfW: 32, roofH: 17, shades: archTile });
    ctx.fillStyle = "#d9b566";
    ctx.fillRect(61, 4, 2, 4);

    result = { canvas, anchorX: 62, anchorY: 96, solidRadius: 0 };
  } else if (kind === "campfire") {
    // Hỏa Bồn Đồng Cổ 3 Chân Đặt Trên Vòng Đá Rêu (36x34)
    const { canvas, ctx } = makeCanvas(36, 34);
    drawPixelShadow(ctx, 18, 26, 13, 4, 0.3);
    for (const [sx, sy] of [[5, 22], [11, 26], [21, 26], [26, 21], [8, 17], [24, 17]]) {
      ctx.fillStyle = "#16191c";
      ctx.fillRect(sx, sy, 5, 4);
      ctx.fillStyle = "#485057";
      ctx.fillRect(sx + 1, sy, 3, 3);
    }
    // Bồn đồng 3 chân
    for (const lx of [11, 17, 23]) {
      ctx.fillStyle = "#1c150c";
      ctx.fillRect(lx, 22, 2, 5);
    }
    ctx.fillStyle = "#1f170d";
    ctx.fillRect(9, 17, 18, 7);
    ctx.fillStyle = "#5c4522";
    ctx.fillRect(10, 18, 16, 5);
    ctx.fillStyle = "#8a682e";
    ctx.fillRect(9, 17, 18, 2);
    // Than hồng & lửa 3 tầng
    ctx.fillStyle = "#c93818";
    ctx.fillRect(12, 13, 12, 5);
    ctx.fillStyle = "#ff6a26";
    ctx.fillRect(13, 10, 10, 7);
    ctx.fillStyle = "#ffcb47";
    ctx.fillRect(15, 7, 6, 8);
    ctx.fillStyle = "#fff5bd";
    ctx.fillRect(17, 11, 2, 3);
    result = { canvas, anchorX: 18, anchorY: 26, solidRadius: 8 };
  } else if (kind === "fishing_rod_prop") {
    // Bộ Cần Câu Trúc, Ghế Gỗ Sẫm & Giỏ Đựng Cá Đan Tre (28x28)
    const { canvas, ctx } = makeCanvas(28, 28);
    ctx.fillStyle = "rgba(0,0,0,0.24)";
    ctx.fillRect(3, 21, 14, 4);
    // Ghế đẩu gỗ sẫm & giỏ tre đan
    ctx.fillStyle = "#26150a";
    ctx.fillRect(4, 16, 7, 7);
    ctx.fillStyle = "#5c391e";
    ctx.fillRect(5, 16, 5, 3);
    ctx.fillStyle = "#4d3515";
    ctx.fillRect(12, 17, 6, 6);
    ctx.fillStyle = "#8f6b2e";
    ctx.fillRect(13, 18, 4, 4);
    // Cần trúc vươn ra mặt nước
    for (let i = 0; i < 15; i++) {
      ctx.fillStyle = i < 6 ? "#5c431f" : "#876932";
      ctx.fillRect(9 + i, 20 - i, 2, 1);
    }
    ctx.fillStyle = "#d9e8e6";
    ctx.fillRect(24, 5, 1, 11);
    ctx.fillStyle = "#b8362a";
    ctx.fillRect(24, 16, 1, 2);
    result = { canvas, anchorX: 14, anchorY: 22, solidRadius: 0 };
  }

  if (result) ATLAS_CACHE.set(kind, result);
  return result;
}
