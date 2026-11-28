/**
 * HerbGardenArt.js — Đại Tu Khu Trồng Trọt / Dược Viên Cổ Phong 100% Pixel Art
 * - Sân Dược Viên lát đá bước chữ thập, hàng rào tre/gỗ cổ chừa lối đi mở, chum nước gốm, đèn đá rêu & giá phơi thuốc.
 * - Luống đất 56x42 viền đá rêu & cọc gỗ góc, đất tơi xốp 5 sắc độ nâu ấm / ẩm sẫm bóng khi tưới.
 * - 4 giai đoạn sinh trưởng rõ rệt: Trống -> Mầm non (seedling) -> Vươn cành lá (sapling) -> Nở hoa/kết quả tỏa linh quang (ready).
 */
import {
  applySelectiveOutline,
  bayerThreshold,
  createPixelCanvas,
  fillPixelEllipse,
  plotPixel,
  plotPixelLine,
  plotRect,
} from "../engine/PixelSpriteBaker.js";

const PLOT_CACHE = new Map();
const PROP_CACHE = new Map();

function hash2(x, y) {
  let h = ((x | 0) * 374761393 + (y | 0) * 668265263) ^ 0x5bf03635;
  h = (h ^ (h >> 13)) * 1274126177;
  return Math.abs(h ^ (h >> 16));
}

/** Vẽ nền sân Dược Viên (thay thế sân đất phẳng viền chữ nhật & vòng tròn sân võ). */
export function drawHerbGardenTerrace(ctx, t, pal) {
  const left = Math.round(t.x - t.rx);
  const right = Math.round(t.x + t.rx);
  const top = Math.round(t.y - t.ry);
  const bot = Math.round(t.y + t.ry);
  const w = right - left;
  const h = bot - top;

  // Nền đất rêu & cỏ trầm ấm dưới khu vườn
  ctx.fillStyle = "rgba(8, 12, 8, 0.36)";
  ctx.fillRect(left - 2, top - 2, w + 4, h + 4);
  ctx.fillStyle = "#192917";
  ctx.fillRect(left, top, w, h);

  // Dải đất tơi trung tâm Dược Điền & phiến đá rêu dither
  for (let py = top + 2; py < bot - 2; py += 2) {
    for (let px = left + 2; px < right - 2; px += 2) {
      const n = hash2(px >> 1, py >> 1);
      const isWalkCross = Math.abs(px - t.x) <= 9 || Math.abs(py - t.y) <= 7;
      if (isWalkCross) {
        ctx.fillStyle = n % 5 === 0 ? "#4a473f" : n % 2 === 0 ? "#635e53" : "#565249";
      } else {
        ctx.fillStyle = n % 7 === 0 ? "#243b1e" : n % 3 === 0 ? "#45331e" : "#382817";
      }
      ctx.fillRect(px, py, 2, 2);
    }
  }

  // Lối lát phiến đá bước dẫn từ cầu thang Bắc và Đông vào giữa vườn
  for (let py = top + 2; py < bot - 6; py += 9) {
    const sx = Math.round(t.x - 7);
    ctx.fillStyle = "#222624";
    ctx.fillRect(sx - 1, py - 1, 16, 7);
    ctx.fillStyle = "#6c695f";
    ctx.fillRect(sx, py, 14, 5);
    ctx.fillStyle = "#878377";
    ctx.fillRect(sx + 1, py, 10, 2);
  }
  for (let px = Math.round(t.x - 10); px < right - 6; px += 11) {
    const sy = Math.round(t.y - 3);
    ctx.fillStyle = "#222624";
    ctx.fillRect(px - 1, sy - 1, 9, 8);
    ctx.fillStyle = "#6c695f";
    ctx.fillRect(px, sy, 7, 6);
    ctx.fillStyle = "#878377";
    ctx.fillRect(px + 1, sy, 4, 2);
  }

  // Viền đá rêu xám xanh quanh chu vi (chừa cửa Bắc & Đông)
  const drawBorderStone = (bx, by) => {
    ctx.fillStyle = "#121714";
    ctx.fillRect(bx, by, 7, 6);
    ctx.fillStyle = "#48524b";
    ctx.fillRect(bx + 1, by + 1, 5, 4);
    ctx.fillStyle = "#6a756b";
    ctx.fillRect(bx + 1, by + 1, 3, 2);
    if ((bx + by) % 14 === 0) {
      ctx.fillStyle = "#2c5e35";
      ctx.fillRect(bx + 3, by + 3, 3, 2);
    }
  };
  for (let px = left - 1; px <= right - 6; px += 7) {
    if (Math.abs(px - t.x) > 22) drawBorderStone(px, top - 2);
    drawBorderStone(px, bot - 3);
  }
  for (let py = top; py <= bot - 5; py += 6) {
    drawBorderStone(left - 2, py);
    if (Math.abs(py - t.y) > 19) drawBorderStone(right - 4, py);
  }

  // Hàng rào tre/gỗ cổ dọc mép Tây và mép Nam (không che lối vào Bắc/Đông)
  for (let px = left + 4; px <= right - 10; px += 14) {
    // Hàng rào Nam thấp thoáng giữ rõ luống cây
    ctx.fillStyle = "#1c120a";
    ctx.fillRect(px, bot - 6, 4, 7);
    ctx.fillStyle = "#6b4c28";
    ctx.fillRect(px + 1, bot - 5, 2, 5);
    ctx.fillStyle = "#916b3b";
    ctx.fillRect(px + 1, bot - 5, 1, 2);
    if (px + 14 <= right - 10) {
      ctx.fillStyle = "#2b1b0e";
      ctx.fillRect(px + 4, bot - 4, 10, 2);
      ctx.fillStyle = "#7a572f";
      ctx.fillRect(px + 4, bot - 3, 10, 1);
    }
  }
  for (let py = top + 6; py <= bot - 10; py += 12) {
    ctx.fillStyle = "#1c120a";
    ctx.fillRect(left - 2, py, 4, 7);
    ctx.fillStyle = "#6b4c28";
    ctx.fillRect(left - 1, py + 1, 2, 5);
  }

  // Chốt đá nhỏ 4 góc vườn
  for (const [cx, cy] of [[left - 2, top - 2], [right - 5, top - 2], [left - 2, bot - 5], [right - 5, bot - 5]]) {
    ctx.fillStyle = "#141816";
    ctx.fillRect(cx, cy, 7, 7);
    ctx.fillStyle = "#616e63";
    ctx.fillRect(cx + 1, cy + 1, 5, 5);
    ctx.fillStyle = "#2c5e35";
    ctx.fillRect(cx + 3, cy + 4, 3, 2);
  }

  // Giữ pal reference tránh lint nếu truyền vào
  if (pal?.grassDark) {
    ctx.fillStyle = pal.grassDark;
    ctx.fillRect(left + 5, bot - 8, 3, 2);
  }
}

// ----------------------------------------------------------------------------
// LUỐNG ĐẤT & CÂY TRỒNG 56x42 (4 giai đoạn x 3 giống linh thảo)
// ----------------------------------------------------------------------------
export function getHerbPlotSprite(stage = "empty", watered = false, seedId = "hat_linh_thao", frameIdx = 0) {
  const f = frameIdx % 2;
  const key = `${stage}_${watered ? 1 : 0}_${seedId || "hat_linh_thao"}_${f}`;
  if (PLOT_CACHE.has(key)) return PLOT_CACHE.get(key);

  const W = 56;
  const H = 42;
  const { canvas, ctx } = createPixelCanvas(W, H);
  if (!ctx) return { canvas, anchorX: 28, anchorY: 28, solidRadius: 0 };

  const soilRamp = watered
    ? ["#120c08", "#21160e", "#302014", "#402b1c", "#523824"]
    : ["#1a110a", "#332114", "#4a311e", "#634329", "#7d5738"];
  const stoneCols = ["#161a18", "#3e4742", "#58635b", "#77857a"];

  // Bóng đổ luống đất
  fillPixelEllipse(ctx, 28, 29, 24, 11, "rgba(7, 10, 7, 0.34)", true);

  // Bờ đất nhô & đá rêu chặn 4 cạnh (không dùng khay hộp đen phẳng)
  for (let y = 16; y <= 37; y++) {
    for (let x = 6; x <= 49; x++) {
      const edge = x === 6 || x === 49 || y === 16 || y === 37;
      if (edge && ((x + y) % 3 === 0)) continue; // Mép rìa sứt tự nhiên
      const isBorder = x <= 8 || x >= 47 || y <= 18 || y >= 35;
      if (isBorder) {
        const sc = hash2(x, y) % 5 === 0 ? "#285430" : stoneCols[1 + ((x + y) % 3)];
        plotPixel(ctx, x, y, sc);
      } else {
        // Rãnh cày tơi xốp 3 luống nổi khối sáng-tối
        const furrowBand = (y - 19) % 5;
        let shade = furrowBand === 0 ? 1 : furrowBand === 1 ? 4 : furrowBand === 2 ? 3 : 2;
        if (bayerThreshold(x, y) > 0.68 && shade > 1) shade -= 1;
        plotPixel(ctx, x, y, soilRamp[shade]);
      }
    }
  }

  // 4 cọc gỗ cổ nhỏ giữ mép đất ở 4 góc
  for (const [px, py] of [[5, 14], [47, 14], [5, 33], [47, 33]]) {
    plotRect(ctx, px, py, 4, 6, "#1f140c");
    plotRect(ctx, px + 1, py + 1, 2, 4, "#6e4c28");
    plotPixel(ctx, px + 1, py + 1, "#9c703e");
  }

  // Giọt ẩm sáng trên mặt luống khi đã tưới
  if (watered) {
    plotPixel(ctx, 14, 22, "#7be8ff");
    plotPixel(ctx, 28, 27, "#5ef2d6");
    plotPixel(ctx, 39, 23, "#7be8ff");
  } else if (stage === "empty") {
    // Vài hạt sỏi / rơm rạ nhỏ trên đất mới cuốc
    plotPixel(ctx, 17, 23, "#9c876c");
    plotPixel(ctx, 34, 29, "#9c876c");
  }

  const sway = f === 1 ? 1 : 0;
  const xs = [15, 28, 40];
  const ys = [24, 29, 24];

  if (stage === "seedling") {
    // Giai đoạn 1: Hạt nứt mầm & 2 lá mầm xanh non
    for (let i = 0; i < 3; i++) {
      const cx = xs[i];
      const cy = ys[i];
      plotRect(ctx, cx, cy - 3, 2, 4, "#246b31");
      plotRect(ctx, cx - 2 + sway, cy - 5, 3, 2, "#70e368");
      plotRect(ctx, cx + 1 + sway, cy - 4, 2, 2, "#a3ff8f");
    }
  } else if (stage === "sapling") {
    // Giai đoạn 2: Thân lá vươn cao nhiều tầng + nụ hoa
    const isBlood = seedId === "hat_huyet_thao";
    const isRare = seedId === "hat_tram_nam";
    const leafDark = isRare ? "#16474d" : "#1d572c";
    const leafMid = isRare ? "#2b8a82" : "#3ca84d";
    const leafHi = isRare ? "#6cf2d8" : "#80f073";
    const budCol = isBlood ? "#e3545e" : isRare ? "#c98eff" : "#ffe066";

    for (let i = 0; i < 3; i++) {
      const cx = xs[i];
      const cy = ys[i];
      plotRect(ctx, cx - 1, cy - 8, 2, 9, leafDark);
      plotRect(ctx, cx - 5 + sway, cy - 7, 5, 3, leafMid);
      plotRect(ctx, cx + 1 + sway, cy - 6, 5, 3, leafMid);
      plotRect(ctx, cx - 3 + sway, cy - 10, 6, 3, leafHi);
      plotRect(ctx, cx - 1 + sway, cy - 12, 3, 2, budCol);
    }
  } else if (stage === "ready") {
    // Giai đoạn 3: Cây trưởng thành tán rậm nở hoa / kết quả tỏa linh quang
    const isBlood = seedId === "hat_huyet_thao";
    const isRare = seedId === "hat_tram_nam";
    const leafDark = isRare ? "#133f47" : "#184d25";
    const leafMid = isRare ? "#24877d" : "#329c46";
    const leafHi = isRare ? "#5cf2d6" : "#74e868";
    const petalA = isBlood ? "#ff385c" : isRare ? "#b36bff" : "#ffd659";
    const petalB = isBlood ? "#ff9e5e" : isRare ? "#6ef7ff" : "#fff7bd";

    for (let i = 0; i < 3; i++) {
      const cx = xs[i];
      const cy = ys[i];
      // Thân rễ & tán lá 3 tầng sắc độ
      plotRect(ctx, cx - 1, cy - 11, 3, 12, leafDark);
      plotRect(ctx, cx - 6, cy - 7, 12, 5, leafDark);
      plotRect(ctx, cx - 7 + sway, cy - 10, 14, 5, leafMid);
      plotRect(ctx, cx - 5 + sway, cy - 13, 10, 4, leafHi);
      // Bông hoa / quả linh thảo nổi bật
      plotRect(ctx, cx - 3 + sway, cy - 17, 6, 5, petalA);
      plotRect(ctx, cx - 1 + sway, cy - 18, 2, 2, petalB);
      plotPixel(ctx, cx - 4 + sway, cy - 15, petalB);
      plotPixel(ctx, cx + 3 + sway, cy - 15, petalB);
      plotPixel(ctx, cx + sway, cy - 15, "#ffffff");
    }
    // Hạt linh quang lơ lửng phía trên hoa
    plotRect(ctx, 18 + sway, 5, 2, 2, petalB);
    plotRect(ctx, 35 - sway, 4, 2, 2, "#ffffff");
  }

  applySelectiveOutline(ctx, W, H, "#162417", "#0a0d0a");
  const res = { canvas, anchorX: 28, anchorY: 28, solidRadius: 0 };
  PLOT_CACHE.set(key, res);
  return res;
}

// ----------------------------------------------------------------------------
// ĐẠO CỤ DƯỢC VIÊN & ĐIỂM THU THẬP ĐẸP SẮC NÉT
// ----------------------------------------------------------------------------
export function getGardenAndGatherPropSprite(kind) {
  if (PROP_CACHE.has(kind)) return PROP_CACHE.get(kind);

  let res = null;
  if (kind === "garden_water_jar") {
    // Chum nước gốm cổ rêu bám + gáo gỗ & bình tưới đồng (32x34)
    const W = 32;
    const H = 34;
    const { canvas, ctx } = createPixelCanvas(W, H);
    fillPixelEllipse(ctx, 16, 28, 12, 4, "rgba(6, 10, 8, 0.36)", true);
    // Thân chum gốm sẫm bóng
    fillPixelEllipse(ctx, 13, 21, 8, 9, "#3d2619");
    fillPixelEllipse(ctx, 12, 20, 6, 7, "#633f2a");
    plotRect(ctx, 8, 12, 10, 3, "#87593b");
    plotRect(ctx, 9, 13, 8, 3, "#278ba1"); // Mặt nước trong chum
    plotPixel(ctx, 12, 14, "#b8ffff");
    plotRect(ctx, 6, 22, 4, 5, "#2a542f"); // Rêu bám thành chum
    // Gáo gỗ tựa cạnh chum & bình tưới đồng nhỏ
    plotPixelLine(gSafe(ctx), 16, 14, 22, 8, "#8f6532", 2);
    plotRect(ctx, 21, 22, 7, 7, "#6e5126");
    plotRect(ctx, 22, 23, 4, 4, "#b8893c");
    plotPixelLine(ctx, 27, 24, 30, 20, "#b8893c", 2);
    applySelectiveOutline(ctx, W, H, "#241911", "#090706");
    res = { canvas, anchorX: 16, anchorY: 28, solidRadius: 0 };
  } else if (kind === "garden_herb_rack") {
    // Giá tre phơi thảo dược + cuốc nhỏ (34x38)
    const W = 34;
    const H = 38;
    const { canvas, ctx } = createPixelCanvas(W, H);
    fillPixelEllipse(ctx, 17, 33, 13, 4, "rgba(6, 10, 8, 0.34)", true);
    // Hai cột tre & thanh ngang
    plotRect(ctx, 7, 9, 3, 24, "#5c431f");
    plotRect(ctx, 24, 9, 3, 24, "#5c431f");
    plotRect(ctx, 6, 11, 22, 2, "#8c6932");
    plotRect(ctx, 6, 21, 22, 2, "#8c6932");
    // Bó thảo dược treo rủ
    for (const bx of [11, 16, 21]) {
      plotRect(ctx, bx - 1, 13, 3, 7, "#2a6e38");
      plotRect(ctx, bx, 14, 2, 5, "#59bd5e");
      plotPixel(ctx, bx, 12, "#d0573c");
    }
    // Cuốc sắt tựa bên phải
    plotPixelLine(ctx, 27, 14, 29, 32, "#785328", 2);
    plotRect(ctx, 24, 13, 5, 2, "#8c99a8");
    applySelectiveOutline(ctx, W, H, "#261c10", "#090705");
    res = { canvas, anchorX: 17, anchorY: 32, solidRadius: 0 };
  } else if (kind === "garden_stone_lantern") {
    // Đèn đá rêu cổ phong có ánh lửa ấm (26x38)
    const W = 26;
    const H = 38;
    const { canvas, ctx } = createPixelCanvas(W, H);
    fillPixelEllipse(ctx, 13, 33, 9, 4, "rgba(6, 10, 8, 0.38)", true);
    plotRect(ctx, 7, 29, 12, 5, "#424a46");
    plotRect(ctx, 10, 18, 6, 12, "#525c57");
    plotRect(ctx, 8, 12, 10, 7, "#3e4642");
    plotRect(ctx, 10, 13, 6, 5, "#ffae38");
    plotRect(ctx, 11, 14, 4, 3, "#fff4bd");
    // Mái đèn đá 2 tầng & rêu
    plotRect(ctx, 6, 9, 14, 4, "#4b544f");
    plotRect(ctx, 9, 6, 8, 3, "#69756d");
    plotRect(ctx, 12, 4, 2, 2, "#89998e");
    plotRect(ctx, 8, 25, 4, 4, "#295732");
    applySelectiveOutline(ctx, W, H, "#1f2421", "#080a09");
    res = { canvas, anchorX: 13, anchorY: 32, solidRadius: 0 };
  } else if (kind === "wild_herb_bush") {
    // Khóm thảo dược hoang sắc nét (28x26)
    const W = 28;
    const H = 26;
    const { canvas, ctx } = createPixelCanvas(W, H);
    fillPixelEllipse(ctx, 14, 21, 9, 3, "rgba(5, 10, 7, 0.36)", true);
    plotRect(ctx, 7, 13, 14, 8, "#184723");
    plotRect(ctx, 9, 9, 10, 8, "#319645");
    plotRect(ctx, 11, 7, 6, 5, "#6de364");
    plotRect(ctx, 8, 10, 3, 3, "#ffe46b");
    plotRect(ctx, 16, 9, 3, 3, "#5ef2d6");
    applySelectiveOutline(ctx, W, H, "#16331b", "#071009");
    res = { canvas, anchorX: 14, anchorY: 20, solidRadius: 0 };
  } else if (kind === "wild_ore_node") {
    // Mỏ khoáng thạch nguyên sinh (32x26)
    const W = 32;
    const H = 26;
    const { canvas, ctx } = createPixelCanvas(W, H);
    fillPixelEllipse(ctx, 16, 21, 12, 4, "rgba(5, 8, 10, 0.4)", true);
    plotRect(ctx, 6, 12, 20, 9, "#2d333b");
    plotRect(ctx, 8, 8, 15, 9, "#4d5763");
    plotRect(ctx, 11, 6, 8, 5, "#6b798a");
    // Tinh thể vàng / ngọc găm trong đá
    plotRect(ctx, 11, 11, 4, 5, "#e6b84c");
    plotPixel(ctx, 12, 12, "#fff5b8");
    plotRect(ctx, 18, 13, 4, 4, "#5ef2d6");
    plotPixel(ctx, 19, 14, "#ffffff");
    applySelectiveOutline(ctx, W, H, "#1c2128", "#07090d");
    res = { canvas, anchorX: 16, anchorY: 20, solidRadius: 0 };
  }

  function gSafe(c) { return c; }
  if (res) PROP_CACHE.set(kind, res);
  return res;
}
