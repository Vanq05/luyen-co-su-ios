/**
 * MonsterArtRegular.js — Bộ Đại Tu Quái Vật Thường & Tinh Anh 64x64 Đa Trạng Thái (Idle / Move / Attack)
 * - 100% Pixel Art sắc nét (imageSmoothingEnabled = false, tọa độ nguyên, Bayer Dithering, Selective Outline).
 * - Tối thiểu 5-6 sắc độ theo từng loài, có cấu trúc giải phẫu & bóng đổ mềm dither dưới chân.
 * - Tuyệt đối không dùng vòng nét mảnh đứt đoạn dưới chân quái hay khối bầu dục ghép đôi đơn điệu.
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

const REGULAR_CACHE = new Map();

function hash2(x, y) {
  let h = ((x | 0) * 374761393 + (y | 0) * 668265263) ^ 0x5bf03635;
  h = (h ^ (h >> 13)) * 1274126177;
  return Math.abs(h ^ (h >> 16));
}

/** Vẽ mảng hữu cơ đa điểm kèm Bayer dithering & texture theo vật liệu. */
function paintAnatomy(ctx, W, H, parts, ramp, opts = {}) {
  const mask = new Uint8Array(W * H);
  const owner = new Int16Array(W * H);
  owner.fill(-1);
  const mode = opts.texture || "smooth";

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
          dist -= 0.09 * Math.sin(ang * 8 + i * 1.7) + (hash2(px, py) % 3) * 0.028;
        } else if (mode === "rock") {
          dist = dist * 0.62 + (Math.abs(dx) + Math.abs(dy)) * 0.28;
        } else if (mode === "chitin") {
          dist = dist * 0.8 + Math.max(Math.abs(dx), Math.abs(dy)) * 0.2;
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
      if (mode === "fur") {
        lum += ((hash2(px >> 1, py) % 5) - 2) * 0.06;
      } else if (mode === "rock") {
        lum += ((px + py) >> 2) % 2 === 0 ? 0.07 : -0.07;
      } else if (mode === "wart") {
        if (hash2(px >> 1, py >> 1) % 7 === 0) lum += 0.24;
      } else if (mode === "scales") {
        const sc = ((px >> 2) + (py >> 1)) & 1;
        lum += sc ? 0.08 : -0.09;
      } else if (mode === "chitin") {
        if (((py >> 2) & 1) === 0) lum += 0.1;
      }
      const dith = (bayerThreshold(px, py) - 0.5) * 0.16;
      const val = Math.max(0.05, Math.min(0.99, lum + dith));
      const si = Math.min(ramp.length - 1, Math.max(1, Math.floor(val * (ramp.length - 1)) + 1));
      ctx.fillStyle = ramp[si];
      ctx.fillRect(px, py, 1, 1);
    }
  }
}

function finalizeFrame64(tmpCtx, W, H, topOut, botOut, shadowRx = 14, shadowY = 56, noShadow = false) {
  applySelectiveOutline(tmpCtx, W, H, topOut, botOut);
  const { canvas, ctx } = createPixelCanvas(W, H);
  if (ctx) {
    if (!noShadow) {
      fillPixelEllipse(ctx, Math.round(W * 0.5), shadowY, shadowRx, 4, "rgba(6, 8, 12, 0.38)", true);
    }
    ctx.drawImage(tmpCtx.canvas, 0, 0);
  }
  return {
    canvas,
    anchorX: Math.round(W * 0.5),
    anchorY: shadowY,
    barOffsetY: shadowY - 2,
  };
}

function makeThreeStates(buildFrameFn) {
  return {
    idle: [0, 1, 2, 3].map((f) => buildFrameFn("idle", f)),
    move: [0, 1, 2, 3].map((f) => buildFrameFn("move", f)),
    attack: [0, 1, 2, 3].map((f) => buildFrameFn("attack", f)),
  };
}

// ----------------------------------------------------------------------------
// 1. MỘNG CẢNH MA ẢNH — Bóng ma cổ phong áo choàng rách rưới & vuốt linh khí
// ----------------------------------------------------------------------------
function buildWraith64() {
  const ramp = ["#0b0c1c", "#181d42", "#2b3570", "#4658ab", "#778ee0", "#c9dcff"];
  return makeThreeStates((state, f) => {
    const tmp = createPixelCanvas(64, 64);
    const g = tmp.ctx;
    const hover = state === "idle" ? (f === 1 || f === 2 ? -2 : 0) : state === "move" ? (f % 2 === 0 ? -3 : -1) : -2;
    const lunge = state === "attack" ? (f === 1 || f === 2 ? 7 : -2) : state === "move" ? 3 : 0;
    const ox = 31 + lunge;
    const oy = 31 + hover;

    // Vệt tàn ảnh sương khói pixel phía sau khi lướt hoặc tấn công
    if (state === "move" || state === "attack") {
      for (let t = 0; t < 12; t++) {
        const tx = ox - 11 - (t % 4) * 3 - (hash2(t, f) % 3);
        const ty = oy - 6 + (t * 3) % 24;
        if (bayerThreshold(tx, ty + f) > 0.36) {
          plotRect(g, tx, ty, 2, 2, t % 2 === 0 ? "#4658ab" : "#8fb3ff");
        }
      }
    }

    // Dải khói u linh bay phần phật dưới đáy (lơ lửng không chân)
    for (let s = -10; s <= 10; s += 2) {
      const len = 10 + Math.round(Math.sin((s + f * 3) * 0.45) * 4);
      const col = Math.abs(s) > 6 ? ramp[1] : Math.abs(s) > 2 ? ramp[2] : ramp[3];
      for (let k = 0; k < len; k++) {
        const sx = ox + s - Math.round((k * (lunge > 0 ? 0.45 : 0.2)) + Math.sin(k * 0.5 + f) * 1.4);
        const sy = oy + 12 + k;
        if (sy < 60 && (k < len - 3 || ((s + k + f) & 1) === 0)) {
          plotRect(g, sx, sy, 2, 1, k > len - 4 ? "#6878cf" : col);
        }
      }
    }

    // Áo choàng rách rưới & vai rộng u ám
    for (let y = oy - 8; y <= oy + 13; y++) {
      const t = (y - (oy - 8)) / 21;
      const hw = Math.round(7 + t * 7);
      for (let x = ox - hw; x <= ox + hw; x++) {
        const relX = (x - ox) / Math.max(1, hw);
        const fold = Math.sin(relX * 7 + f * 0.5) * 0.14;
        const lum = 0.54 - relX * 0.2 - t * 0.16 + fold + (bayerThreshold(x, y) - 0.5) * 0.15;
        const si = Math.max(1, Math.min(5, Math.floor(lum * 5) + 1));
        plotPixel(g, x, y, ramp[si]);
      }
    }
    // Khăn cổ & đai tà tím ma mị rủ trước ngực
    plotPixelLine(g, ox - 7, oy - 6, ox + 7, oy - 6, "#8862db", 2);
    plotPixelLine(g, ox - 1, oy - 5, ox - 3, oy + 7, "#b48cff", 2);

    // Mũ trùm nhọn rách & Mặt nạ cốt ma góc cạnh
    paintAnatomy(
      g,
      64,
      64,
      [
        { cx: ox, cy: oy - 13, rx: 9, ry: 8, bias: 0.04 },
        { cx: ox - 1, cy: oy - 21, rx: 4, ry: 3, bias: 0.1 },
      ],
      ramp,
      { texture: "smooth" }
    );
    // Khoảng tối sâu trong mũ trùm + mặt nạ xương xám
    plotRect(g, ox - 5, oy - 15, 11, 8, "#080914");
    plotRect(g, ox - 4, oy - 14, 9, 6, "#b9c4db");
    plotRect(g, ox - 2, oy - 9, 5, 2, "#8c99b5");
    // Đôi mắt lam-tím phát sáng sắc bén
    plotRect(g, ox - 4, oy - 12, 3, 2, "#6ef7ff");
    plotRect(g, ox + 2, oy - 12, 3, 2, "#6ef7ff");
    plotPixel(g, ox - 3, oy - 12, "#ffffff");
    plotPixel(g, ox + 3, oy - 12, "#ffffff");

    // Bàn tay vuốt linh khí vươn ra (Attack vung vuốt sắc chém về trước)
    const clawReach = state === "attack" && (f === 1 || f === 2) ? 9 : state === "move" ? 4 : 1;
    const clawY = oy - 1 + (state === "attack" && f === 1 ? -4 : 0);
    // Tay sau
    plotPixelLine(g, ox - 8, oy - 3, ox - 12, oy + 4, ramp[2], 3);
    plotPixelLine(g, ox - 12, oy + 4, ox - 15, oy + 6, "#7af5ff", 1);
    // Tay trước vươn vuốt
    plotPixelLine(g, ox + 6, oy - 4, ox + 13 + clawReach, clawY, ramp[3], 3);
    for (let c = -1; c <= 1; c++) {
      plotPixelLine(
        g,
        ox + 13 + clawReach,
        clawY + c * 2,
        ox + 19 + clawReach,
        clawY + c * 3,
        c === 0 ? "#e6ffff" : "#80b8ff",
        1
      );
    }

    // Vệt chém linh khí khi tấn công
    if (state === "attack" && (f === 1 || f === 2)) {
      plotPixelLine(g, ox + 16, oy - 14, ox + 26, oy - 2, "#b496ff", 2);
      plotPixelLine(g, ox + 26, oy - 2, ox + 18, oy + 12, "#80ffff", 2);
    }

    return finalizeFrame64(g, 64, 64, "#242c5c", "#070812", 12, 56, true);
  });
}

// ----------------------------------------------------------------------------
// 2. HUYẾT PHONG ĐÀN — Ong bắp cày khổng lồ sọc đen-vàng, cánh dither & ngòi độc
// ----------------------------------------------------------------------------
function buildHornetSwarm64() {
  const bodyRamp = ["#170f06", "#3b230a", "#6e4212", "#b36f1c", "#ebb134", "#ffea8a"];
  const wingRamp = ["#33546b", "#77b5cf", "#c7f2ff"];
  return makeThreeStates((state, f) => {
    const tmp = createPixelCanvas(64, 64);
    const g = tmp.ctx;
    const bob = (f % 2 === 0 ? -1 : 1) + (state === "move" ? -2 : 0);
    const fwd = state === "attack" && (f === 1 || f === 2) ? 6 : 0;
    const ox = 31 + fwd;
    const oy = 32 + bob;

    // 2 con ong vệ tinh nhỏ bay quanh tạo cảm giác cả đàn ong
    for (let m = 0; m < 2; m++) {
      const mx = ox + (m === 0 ? -19 : 16) + ((f + m) % 2) * 2;
      const my = oy + (m === 0 ? -14 : -17) + (f % 2 === 0 ? 1 : -1);
      plotRect(g, mx - 2, my, 5, 3, "#c47d1c");
      plotPixel(g, mx, my, "#170f06");
      plotRect(g, mx - 1, my - 2, 3, 2, "#c7f2ff");
    }

    // Cánh trên & cánh dưới đập 4 frame bằng pixel mờ dither
    const wSpan = f % 2 === 0 ? 13 : 9;
    const wLift = f === 0 || f === 2 ? -10 : -5;
    for (let x = ox - 10; x <= ox + 2; x++) {
      for (let y = oy + wLift - wSpan; y <= oy - 4; y++) {
        const d = Math.hypot((x - (ox - 4)) / 7, (y - (oy + wLift - 4)) / wSpan);
        if (d <= 1.0 && (bayerThreshold(x, y) > 0.3 || d > 0.82)) {
          plotPixel(g, x, y, d > 0.8 ? wingRamp[0] : d > 0.45 ? wingRamp[1] : wingRamp[2]);
        }
      }
    }

    // Bụng ong cong vút xuống + sọc đen-vàng rõ ràng + Ngòi độc nhọn
    for (let i = 0; i < 14; i++) {
      const t = i / 13;
      const bx = ox - 4 - Math.round(t * 14);
      const by = oy + Math.round(Math.sin(t * Math.PI * 0.8) * 6);
      const r = Math.max(2, Math.round(Math.sin(t * Math.PI) * 6.5) + 1);
      const stripe = i % 3 === 0 ? bodyRamp[1] : i % 3 === 1 ? bodyRamp[4] : bodyRamp[3];
      for (let dy = -r; dy <= r; dy++) {
        plotPixel(g, bx, by + dy, dy < -1 ? bodyRamp[5] : stripe);
      }
    }
    // Ngòi độc cong về trước khi Attack
    const stingerLen = state === "attack" && (f === 1 || f === 2) ? 10 : 5;
    plotPixelLine(g, ox - 18, oy + 5, ox - 18 - stingerLen, oy + 8, "#ff2e4c", 2);
    plotPixel(g, ox - 19 - stingerLen, oy + 8, "#ffffff");

    // 6 chân ong gấp khúc
    for (let l = 0; l < 3; l++) {
      const lx = ox - 2 + l * 4;
      const s = ((f + l) % 2) * 2;
      plotPixelLine(g, lx, oy + 3, lx - 3, oy + 10 + s, "#3b230a", 1);
      plotPixelLine(g, lx - 3, oy + 10 + s, lx + 1, oy + 14 + s, "#6e4212", 1);
    }

    // Ngực giáp & Đầu mắt kép đỏ rực + Râu
    paintAnatomy(
      g,
      64,
      64,
      [
        { cx: ox + 2, cy: oy - 1, rx: 8, ry: 7, bias: 0.08 },
        { cx: ox + 12, cy: oy + 1, rx: 6, ry: 6, bias: 0.05 },
      ],
      bodyRamp,
      { texture: "chitin" }
    );
    // Mắt kép đỏ huyết & Hàm kìm
    plotRect(g, ox + 13, oy - 2, 4, 4, "#a81327");
    plotRect(g, ox + 14, oy - 1, 2, 2, "#ff4d66");
    plotPixel(g, ox + 15, oy - 1, "#ffffff");
    plotPixelLine(g, ox + 15, oy + 6, ox + 20, oy + 8, "#ffe4b5", 1);
    plotPixelLine(g, ox + 13, oy - 5, ox + 19, oy - 10 + (f % 2), "#3b230a", 1);

    if (state === "attack" && (f === 1 || f === 2)) {
      plotPixelLine(g, ox + 18, oy + 1, ox + 27, oy + 2, "#ffea8a", 2);
      plotPixel(g, ox + 28, oy + 2, "#ffffff");
    }

    return finalizeFrame64(g, 64, 64, "#3b230a", "#0d0803", 12, 55);
  });
}

// ----------------------------------------------------------------------------
// 3. LỢN RỪNG · DÃ TRƯ — Cơ bắp, bờm gai lưng, mõm dài, cặp răng nanh cong
// ----------------------------------------------------------------------------
function buildBoar64() {
  const ramp = ["#120906", "#26140b", "#452414", "#6b3b20", "#965831", "#c27d4a"];
  return makeThreeStates((state, f) => {
    const tmp = createPixelCanvas(64, 64);
    const g = tmp.ctx;
    const isAtk = state === "attack";
    const bob = isAtk ? (f === 1 ? 2 : -1) : state === "move" ? (f % 2 === 1 ? -2 : 0) : f === 2 ? 1 : 0;
    const fwd = isAtk ? (f === 1 || f === 2 ? 7 : -2) : 0;
    const ox = 31 + fwd;
    const oy = 37 + bob;

    const legF = state === "move" ? (f === 1 ? -4 : f === 3 ? 3 : 0) : isAtk ? 3 : 0;
    const legB = state === "move" ? (f === 2 ? -4 : f === 0 ? 3 : 0) : isAtk ? -3 : 0;

    // 4 chân + móng guốc đen
    plotRect(g, ox - 15 + legB, oy + 7, 5, 10, ramp[1]);
    plotRect(g, ox - 7 - legB, oy + 8, 5, 10, ramp[2]);
    plotRect(g, ox + 6 + legF, oy + 8, 5, 10, ramp[2]);
    plotRect(g, ox + 13 - legF, oy + 7, 5, 9, ramp[1]);
    plotRect(g, ox - 15 + legB, oy + 15, 5, 3, "#090708");
    plotRect(g, ox + 6 + legF, oy + 16, 5, 3, "#090708");

    // Thân Dã Trư vai u cao & đầu húc thấp
    paintAnatomy(
      g,
      64,
      64,
      [
        { cx: ox - 9, cy: oy + 1, rx: 12, ry: 9, bias: -0.05 },
        { cx: ox + 2, cy: oy - 3, rx: 13, ry: 12, bias: 0.1 },
        { cx: ox + 14, cy: oy + (isAtk ? 4 : 1), rx: 9, ry: 8, bias: 0.08 },
        { cx: ox + 21, cy: oy + (isAtk ? 6 : 4), rx: 5, ry: 3.5, bias: 0.06 },
      ],
      ramp,
      { texture: "fur" }
    );

    // Mũi dẹt hồng sẫm
    plotRect(g, ox + 24, oy + (isAtk ? 4 : 2), 3, 5, "#9e5352");
    plotPixel(g, ox + 25, oy + (isAtk ? 5 : 3), "#381214");

    // Bờm gai dọc sống lưng
    for (let s = 0; s < 6; s++) {
      const sx = ox - 12 + s * 5;
      const sy = oy - 10 - Math.round(Math.sin(s * 0.55) * 5);
      plotPixelLine(g, sx, sy + 4, sx - 2, sy - 3, ramp[1], 2);
      plotPixel(g, sx - 2, sy - 3, "#ad6e42");
    }

    // Tai nhọn, mắt đỏ hung & cặp răng nanh trắng cong vút
    plotRect(g, ox + 9, oy - 7, 4, 5, ramp[2]);
    plotRect(g, ox + 14, oy - 1 + (isAtk ? 2 : 0), 4, 2, "#ff2a40");
    plotPixel(g, ox + 17, oy - 1 + (isAtk ? 2 : 0), "#ffe6ea");
    plotPixelLine(g, ox + 19, oy + 7, ox + 26, oy - 1, "#fff5db", 2);
    plotPixel(g, ox + 26, oy - 2, "#ffffff");
    plotPixelLine(g, ox - 20, oy - 1, ox - 25, oy - 5 + (f % 2) * 3, ramp[3], 2);

    if (isAtk && (f === 1 || f === 2)) {
      plotPixelLine(g, ox + 24, oy - 4, ox + 30, oy + 4, "#ffffff", 2);
      plotPixelLine(g, ox + 22, oy + 8, ox + 29, oy + 10, "#ffd15c", 1);
    }

    return finalizeFrame64(g, 64, 64, "#29150b", "#080506", 17, 56);
  });
}

// ----------------------------------------------------------------------------
// 4. THANH MAO ĐIỆN LANG & TUYẾT LANG — Dáng sói rạp thấp, bờm điện / băng tinh
// ----------------------------------------------------------------------------
function buildWolf64(isSnow) {
  const ramp = isSnow
    ? ["#0f1824", "#283f57", "#4c6d8f", "#7aa0c4", "#b2d3eb", "#ebfbff"]
    : ["#081915", "#10332b", "#1a5444", "#2a7d63", "#49b08a", "#7ef7c7"];
  const auraCol = isSnow ? "#94f2ff" : "#5cf2ff";
  const eyeCol = isSnow ? "#6bf4ff" : "#40ffec";

  return makeThreeStates((state, f) => {
    const tmp = createPixelCanvas(64, 64);
    const g = tmp.ctx;
    const isAtk = state === "attack";
    const bob = isAtk ? (f === 1 ? -5 : -1) : state === "move" ? (f % 2 === 1 ? -2 : 0) : 0;
    const fwd = isAtk ? (f === 1 || f === 2 ? 7 : -2) : 0;
    const ox = 31 + fwd;
    const oy = 37 + bob;

    // Đuôi sói xù vẫy theo frame
    const wag = state === "move" ? (f % 2 === 0 ? -4 : 2) : [-1, -4, 1, -2][f];
    plotPixelLine(g, ox - 14, oy + 1, ox - 25, oy - 5 + wag, ramp[2], 4);
    plotPixelLine(g, ox - 20, oy - 2 + Math.round(wag * 0.5), ox - 26, oy - 6 + wag, ramp[4], 2);

    // 4 chân thon có móng vuốt
    const sA = state === "move" ? [-4, -1, 3, 1][f] : isAtk ? -4 : 0;
    const sB = state === "move" ? [3, 1, -4, -1][f] : isAtk ? 5 : 0;
    plotPixelLine(g, ox - 12, oy + 3, ox - 14 + sA, oy + 15, ramp[1], 3);
    plotPixelLine(g, ox - 7, oy + 4, ox - 7 + sB, oy + 15, ramp[2], 3);
    plotPixelLine(g, ox + 6, oy + 3, ox + 9 + sB, oy + 14 + (isAtk ? -3 : 0), ramp[3], 3);
    plotPixelLine(g, ox + 11, oy + 3, ox + 15 + sA, oy + 14 + (isAtk ? -3 : 0), ramp[2], 3);

    // Thân sói thon, lồng ngực nở, cổ vươn, mõm dài
    paintAnatomy(
      g,
      64,
      64,
      [
        { cx: ox - 10, cy: oy + 2, rx: 9, ry: 6, bias: -0.06 },
        { cx: ox + 2, cy: oy - 1, rx: 11, ry: 8.5, bias: 0.08 },
        { cx: ox + 13, cy: oy - 4, rx: 7.5, ry: 6.5, bias: 0.08 },
        { cx: ox + 21, cy: oy - 1, rx: 5, ry: 3, bias: 0.05 },
      ],
      ramp,
      { texture: "fur" }
    );

    // Tai nhọn & Bờm điện / Bờm tinh băng
    plotPixelLine(g, ox + 9, oy - 8, ox + 7, oy - 15, ramp[3], 3);
    plotPixelLine(g, ox + 13, oy - 8, ox + 12, oy - 15, ramp[4], 3);
    plotPixelLine(g, ox - 2, oy - 7, ox + 6, oy - 11 - (f % 2), auraCol, 2);
    plotPixelLine(g, ox + 3, oy - 3, ox - 5, oy + 2, auraCol, 1);
    if (isSnow) {
      plotPixelLine(g, ox - 7, oy - 8, ox - 11, oy - 13, "#d9fbff", 2);
    }

    // Mắt sáng & Nanh sói
    plotRect(g, ox + 14, oy - 5, 4, 2, eyeCol);
    plotPixel(g, ox + 17, oy - 5, "#ffffff");
    plotRect(g, ox + 19, oy + 1, 2, 3, "#ffffff");
    plotRect(g, ox + 23, oy + 1, 2, 2, "#ffffff");

    if (isAtk && (f === 1 || f === 2)) {
      plotPixelLine(g, ox + 22, oy - 10, ox + 30, oy - 2, auraCol, 2);
      plotPixelLine(g, ox + 23, oy - 6, ox + 31, oy + 2, "#ffffff", 1);
    }

    return finalizeFrame64(g, 64, 64, isSnow ? "#1c3347" : "#112b24", "#060b0a", 18, 56);
  });
}

// ----------------------------------------------------------------------------
// 5. NGỌC NHÃN THẠCH HẦU — Khỉ đá vát khối lục giác, khe nứt ngọc & nắm đấm đá
// ----------------------------------------------------------------------------
function buildStoneMonkey64() {
  const ramp = ["#0e1116", "#232830", "#3a424d", "#55606e", "#768394", "#9eadbf"];
  return makeThreeStates((state, f) => {
    const tmp = createPixelCanvas(64, 64);
    const g = tmp.ctx;
    const isAtk = state === "attack";
    const bob = isAtk ? (f === 1 ? -4 : f === 2 ? 2 : 0) : state === "move" ? (f % 2 === 0 ? -2 : 0) : 0;
    const ox = 32;
    const oy = 33 + bob;

    // Đuôi đá cong
    plotPixelLine(g, ox - 9, oy + 8, ox - 19, oy + 3, ramp[2], 3);
    plotPixelLine(g, ox - 19, oy + 3, ox - 21, oy - 7 + (f % 2) * 2, ramp[4], 2);

    // Chân đá khuỵu vững
    const lStep = state === "move" ? (f === 1 ? -2 : 2) : 0;
    plotRect(g, ox - 10, oy + 9 + lStep, 7, 11, ramp[2]);
    plotRect(g, ox + 3, oy + 9 - lStep, 7, 11, ramp[1]);
    plotRect(g, ox - 10, oy + 17 + lStep, 7, 3, "#1f242b");

    // Thân & Đầu Khỉ Đá vát cạnh (không tròn trơn)
    paintAnatomy(
      g,
      64,
      64,
      [
        { cx: ox, cy: oy + 1, rx: 13, ry: 11, bias: 0.06 },
        { cx: ox, cy: oy - 12, rx: 9, ry: 7.5, bias: 0.1 },
      ],
      ramp,
      { texture: "rock" }
    );

    // Tai vểnh & Rêu bám vai
    plotRect(g, ox - 11, oy - 14, 3, 5, ramp[3]);
    plotRect(g, ox + 8, oy - 14, 3, 5, ramp[3]);
    plotRect(g, ox - 10, oy - 8, 5, 3, "#2a5e39");
    plotRect(g, ox + 5, oy - 7, 4, 3, "#2a5e39");

    // Đường nứt phát sáng ngọc bích & Ngọc Nhãn
    plotPixelLine(g, ox - 5, oy - 4, ox + 1, oy + 2, "#42f5c5", 1);
    plotPixelLine(g, ox + 1, oy + 2, ox + 6, oy - 2, "#42f5c5", 1);
    plotRect(g, ox - 5, oy - 14, 3, 2, "#5ef2d6");
    plotRect(g, ox + 2, oy - 14, 3, 2, "#5ef2d6");
    plotPixel(g, ox - 4, oy - 14, "#ffffff");
    plotPixel(g, ox + 3, oy - 14, "#ffffff");

    // Cánh tay đá vươn dài kiểu vượn (Attack giơ cao đập xuống)
    for (const dir of [-1, 1]) {
      const slam = isAtk ? (f === 1 ? -12 : f === 2 ? 7 : 0) : state === "move" ? (dir > 0 ? lStep : -lStep) : 0;
      const sx = ox + dir * 12;
      const fx = ox + dir * 17;
      const fy = oy + 10 + slam;
      plotPixelLine(g, sx, oy - 4, fx, fy, ramp[2], 6);
      plotRect(g, fx - 5, fy - 4, 10, 9, ramp[3]);
      plotRect(g, fx - 3, fy - 2, 5, 4, ramp[4]);
      plotRect(g, fx - 2, fy, 4, 2, "#5ef2d6");
    }

    if (isAtk && f === 2) {
      plotPixelLine(g, ox - 20, oy + 19, ox - 10, oy + 21, "#80ffe0", 2);
      plotPixelLine(g, ox + 10, oy + 21, ox + 20, oy + 19, "#80ffe0", 2);
    }

    return finalizeFrame64(g, 64, 64, "#1c242e", "#07090d", 17, 56);
  });
}

// ----------------------------------------------------------------------------
// 6. ĐỘC THIỀM THỪ — Cóc độc đầu tam giác, u độc lưng, túi cổ phình & bọt độc
// ----------------------------------------------------------------------------
function buildPoisonToad64() {
  const ramp = ["#0a190c", "#183b1a", "#2a6328", "#448f38", "#6ec24f", "#a3f26b"];
  return makeThreeStates((state, f) => {
    const tmp = createPixelCanvas(64, 64);
    const g = tmp.ctx;
    const isAtk = state === "attack";
    const hop = state === "move" ? (f === 1 ? -6 : f === 2 ? -3 : 0) : isAtk ? (f === 1 ? -3 : 0) : 0;
    const ox = 32;
    const oy = 40 + hop;
    const swell = isAtk && (f === 1 || f === 2) ? 1.3 : f === 2 || f === 3 ? 1.15 : 1.0;

    // 2 chân sau gập & bàn chân có màng
    paintAnatomy(
      g,
      64,
      64,
      [
        { cx: ox - 14, cy: oy + 5, rx: 7, ry: 5, rot: -0.35 },
        { cx: ox + 14, cy: oy + 5, rx: 7, ry: 5, rot: 0.35 },
      ],
      ramp,
      { texture: "wart" }
    );
    plotRect(g, ox - 12, oy + 7, 5, 7, ramp[2]);
    plotRect(g, ox + 7, oy + 7, 5, 7, ramp[2]);

    // Thân cóc bè tam giác + bướu mắt
    paintAnatomy(
      g,
      64,
      64,
      [
        { cx: ox, cy: oy, rx: 17, ry: 11, bias: 0.04 },
        { cx: ox - 7, cy: oy - 11, rx: 5, ry: 4, bias: 0.14 },
        { cx: ox + 7, cy: oy - 11, rx: 5, ry: 4, bias: 0.14 },
      ],
      ramp,
      { texture: "wart" }
    );

    // Túi cổ phình xanh độc dither
    fillPixelEllipse(g, ox, oy + 6, Math.round(11 * swell), Math.round(5 * swell), "#7be866", true);
    // U độc tím trên lưng
    plotRect(g, ox - 10, oy - 7, 4, 3, "#8f3ec4");
    plotRect(g, ox + 6, oy - 6, 4, 3, "#8f3ec4");
    plotRect(g, ox - 2, oy - 9, 5, 3, "#bf66ff");

    // Mắt lồi vàng đồng tử dọc
    plotRect(g, ox - 9, oy - 12, 4, 3, "#ffe15c");
    plotRect(g, ox + 5, oy - 12, 4, 3, "#ffe15c");
    plotRect(g, ox - 8, oy - 11, 1, 2, "#0a080c");
    plotRect(g, ox + 6, oy - 11, 1, 2, "#0a080c");

    // Bọt khí độc pixel bay lên
    for (let b = 0; b < 3; b++) {
      const bx = ox + (b - 1) * 9 + ((f + b) % 2) * 2;
      const by = oy - 16 - ((f * 4 + b * 5) % 13);
      plotRect(g, bx - 1, by - 1, 3, 3, "#9cff78");
      plotPixel(g, bx - 1, by - 1, "#ffffff");
    }

    if (isAtk && (f === 1 || f === 2)) {
      plotPixelLine(g, ox, oy + 4, ox + 12, oy + 2, "#a3ff75", 3);
      plotRect(g, ox + 12, oy, 5, 5, "#d8ffbd");
    }

    return finalizeFrame64(g, 64, 64, "#1e381c", "#070b07", 19, 56);
  });
}

// ----------------------------------------------------------------------------
// 7. THIẾT GIÁP BỌ CẠP — Giáp đốt sắt, 6 chân khớp, 2 càng kìm & đuôi ngòi cong
// ----------------------------------------------------------------------------
function buildScorpion64() {
  const ramp = ["#0e1117", "#232a36", "#3a4557", "#586780", "#7d8fa8", "#b0c3db"];
  return makeThreeStates((state, f) => {
    const tmp = createPixelCanvas(64, 64);
    const g = tmp.ctx;
    const isAtk = state === "attack";
    const bob = state === "move" && f % 2 === 1 ? -1 : 0;
    const ox = 31 + (isAtk && (f === 1 || f === 2) ? 4 : 0);
    const oy = 38 + bob;

    // 6 chân khớp bò so le
    for (let l = 0; l < 3; l++) {
      const lx = ox - 10 + l * 7;
      const step = state === "move" ? ((f + l) % 2) * 3 : (f % 2);
      plotPixelLine(g, lx, oy + 4, lx - 5, oy + 12 + step, ramp[2], 2);
      plotPixelLine(g, lx, oy - 3, lx - 3, oy - 9 - step, ramp[1], 2);
    }

    // Đuôi giáp đốt uốn cong lên đầu & ngòi lam ngọc
    const strikeX = isAtk && (f === 1 || f === 2) ? 11 : f === 1 ? -2 : 0;
    const strikeY = isAtk && (f === 1 || f === 2) ? 6 : 0;
    plotPixelLine(g, ox - 13, oy, ox - 21, oy - 13, ramp[3], 5);
    plotPixelLine(g, ox - 21, oy - 13, ox - 8 + strikeX, oy - 21 + strikeY, ramp[4], 4);
    plotPixelLine(g, ox - 8 + strikeX, oy - 21 + strikeY, ox + 5 + strikeX, oy - 16 + strikeY, "#5ef2d6", 3);
    plotPixel(g, ox + 6 + strikeX, oy - 15 + strikeY, "#ffffff");

    // Thân đốt & 2 càng kìm kẹp mở
    const snap = isAtk && f === 2 ? -2 : 0;
    paintAnatomy(
      g,
      64,
      64,
      [
        { cx: ox - 3, cy: oy, rx: 13, ry: 7.5, bias: 0.05 },
        { cx: ox + 16, cy: oy - 4 - snap, rx: 6.5, ry: 3.5, rot: -0.25, bias: 0.1 },
        { cx: ox + 16, cy: oy + 6 + snap, rx: 6.5, ry: 3.5, rot: 0.25, bias: 0.1 },
      ],
      ramp,
      { texture: "chitin" }
    );
    // Răng cưa càng & Mắt đỏ
    plotRect(g, ox + 7, oy - 2, 3, 2, "#ff385c");
    plotRect(g, ox + 7, oy + 2, 3, 2, "#ff385c");
    plotPixel(g, ox + 20, oy - 3 - snap, "#cbd5e1");
    plotPixel(g, ox + 20, oy + 5 + snap, "#cbd5e1");

    return finalizeFrame64(g, 64, 64, "#1c2536", "#07090d", 19, 56);
  });
}

// ----------------------------------------------------------------------------
// 8. HẮC THỦY MÃNG — Mãng xà uốn chữ S vảy lam-ngọc, mang vây xòe & lưỡi chẻ
// ----------------------------------------------------------------------------
function buildWaterSerpent64() {
  const ramp = ["#061924", "#0c384f", "#156380", "#269cb8", "#5ad4e6", "#b8fbff"];
  return makeThreeStates((state, f) => {
    const tmp = createPixelCanvas(64, 64);
    const g = tmp.ctx;
    const isAtk = state === "attack";
    const sway = state === "move" ? [0, 3, 0, -3][f] : [0, 2, 0, -2][f];
    const strike = isAtk && (f === 1 || f === 2) ? 8 : 0;
    const ox = 31;
    const oy = 42;

    // Thân rắn uốn lượn chữ S với vảy bụng ngà nhạt
    const segs = 28;
    for (let i = 0; i < segs; i++) {
      const t = i / (segs - 1);
      const sx = ox - 18 + Math.round(t * 28 + Math.sin(t * 4.8 + f * 0.6) * (6 + sway * 0.5)) + Math.round(t * strike);
      const sy = oy + 8 - Math.round(Math.pow(t, 1.35) * 24 + Math.cos(t * 5.2 + f * 0.6) * 4);
      const r = t < 0.25 ? 2 + Math.round(t * 10) : t > 0.85 ? 4 : 5;
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          if (dx * dx + dy * dy <= r * r) {
            const belly = dy > r * 0.35;
            const scaleSpot = (((sx >> 1) + (sy >> 1)) & 1) === 0;
            const col = belly ? "#8cdbe3" : dy < -1 ? ramp[4] : scaleSpot ? ramp[3] : ramp[2];
            plotPixel(g, sx + dx, sy + dy, col);
          }
        }
      }
    }

    // Mang vây thủy xòe sau gáy & Đầu rắn góc cạnh
    const hx = ox + 11 + strike;
    const hy = oy - 16 + (isAtk ? 2 : 0);
    plotPixelLine(g, hx - 5, hy - 3, hx - 11, hy - 11, "#4de8d9", 3);
    plotPixelLine(g, hx - 4, hy + 2, hx - 11, hy + 8, "#3aa8e8", 3);

    paintAnatomy(
      g,
      64,
      64,
      [
        { cx: hx, cy: hy, rx: 7, ry: 5, bias: 0.1 },
        { cx: hx + 6, cy: hy + 1, rx: 4, ry: 2.5, bias: 0.14 },
      ],
      ramp,
      { texture: "scales" }
    );
    // Mắt vàng sắc & Lưỡi rắn đỏ chẻ đôi thò thụt
    plotRect(g, hx + 2, hy - 2, 3, 2, "#ffe15c");
    plotPixel(g, hx + 3, hy - 2, "#07090d");
    if (f % 2 === 1 || isAtk) {
      plotPixelLine(g, hx + 10, hy + 1, hx + 16, hy + 1, "#ff385c", 1);
      plotPixel(g, hx + 17, hy, "#ff385c");
      plotPixel(g, hx + 17, hy + 2, "#ff385c");
    }

    return finalizeFrame64(g, 64, 64, "#124259", "#051017", 16, 56);
  });
}

// ----------------------------------------------------------------------------
// 9. SƯƠNG TRÚC KHÔI LỖI — Nón trúc cổ, giáp đốt trúc buộc dây đỏ & Trúc Kiếm
// ----------------------------------------------------------------------------
function buildBambooPuppet64() {
  const ramp = ["#0b2117", "#184732", "#297552", "#42ab78", "#74e0a8", "#ccffea"];
  return makeThreeStates((state, f) => {
    const tmp = createPixelCanvas(64, 64);
    const g = tmp.ctx;
    const isAtk = state === "attack";
    const bob = state === "move" && f % 2 === 1 ? -1 : 0;
    const ox = 32;
    const oy = 34 + bob;

    // Chân ống trúc bước đi
    const lS = state === "move" ? (f === 1 ? -3 : f === 3 ? 3 : 0) : 0;
    plotRect(g, ox - 6, oy + 11 + lS, 4, 10, ramp[2]);
    plotRect(g, ox + 2, oy + 11 - lS, 4, 10, ramp[1]);
    plotRect(g, ox - 6, oy + 15 + lS, 4, 1, "#c93838");
    plotRect(g, ox + 2, oy + 15 - lS, 4, 1, "#c93838");

    // Thân giáp đốt trúc + dây đỏ buộc ngực
    paintAnatomy(
      g,
      64,
      64,
      [
        { cx: ox, cy: oy + 2, rx: 8, ry: 10, bias: 0.06 },
        { cx: ox, cy: oy - 10, rx: 6, ry: 6, bias: 0.08 },
      ],
      ramp,
      { texture: "chitin" }
    );
    plotRect(g, ox - 7, oy - 1, 14, 2, "#b82e3c");
    plotRect(g, ox - 3, oy + 3, 6, 3, "#5ef2d6"); // Ấn phù văn lõi khôi lỗi

    // Nón lá trúc rộng che mặt lộ đôi mắt ngọc phát sáng
    plotPixelLine(g, ox - 14, oy - 12, ox, oy - 21, "#4e6b3d", 3);
    plotPixelLine(g, ox + 14, oy - 12, ox, oy - 21, "#6c9152", 3);
    plotRect(g, ox - 12, oy - 14, 24, 3, "#364f2a");
    plotRect(g, ox - 4, oy - 9, 2, 2, "#80ffdb");
    plotRect(g, ox + 2, oy - 9, 2, 2, "#80ffdb");

    // Thanh Trúc Kiếm hàn quang vung chém
    const swAng = isAtk && (f === 1 || f === 2) ? 1 : 0;
    if (swAng) {
      plotPixelLine(g, ox + 7, oy + 2, ox + 26, oy - 2, "#b8fff0", 3);
      plotPixelLine(g, ox + 20, oy - 13, ox + 28, oy + 1, "#5ef2d6", 2);
      plotPixelLine(g, ox + 28, oy + 1, ox + 20, oy + 13, "#ffffff", 1);
    } else {
      plotPixelLine(g, ox + 8, oy + 4, ox + 20, oy - 12, "#8be8ba", 2);
      plotPixel(g, ox + 20, oy - 12, "#ffffff");
    }

    return finalizeFrame64(g, 64, 64, "#153626", "#06120c", 13, 56);
  });
}

// ----------------------------------------------------------------------------
// 10. DUNG NHAM GIÁP TRÙNG — Bọ hung hắc thạch có sừng tê giác & khe dung nham
// ----------------------------------------------------------------------------
function buildLavaBeetle64() {
  const ramp = ["#120908", "#2b120e", "#4f1d14", "#7d2d1a", "#c95322", "#ffa438"];
  return makeThreeStates((state, f) => {
    const tmp = createPixelCanvas(64, 64);
    const g = tmp.ctx;
    const isAtk = state === "attack";
    const fwd = isAtk && (f === 1 || f === 2) ? 6 : 0;
    const bob = state === "move" && f % 2 === 1 ? -1 : 0;
    const ox = 30 + fwd;
    const oy = 38 + bob;

    // 6 chân bọ giáp bấu đất
    for (let l = 0; l < 3; l++) {
      const lx = ox - 11 + l * 8;
      const sh = state === "move" ? ((f + l) % 2) * 3 : 0;
      plotPixelLine(g, lx, oy + 5, lx - 4, oy + 14 + sh, ramp[2], 2);
    }

    // Mai đá hắc thạch + khe dung nham rực sáng
    paintAnatomy(
      g,
      64,
      64,
      [
        { cx: ox - 3, cy: oy, rx: 15, ry: 10, bias: 0.04 },
        { cx: ox + 12, cy: oy + 2, rx: 8, ry: 7, bias: 0.08 },
      ],
      ramp,
      { texture: "rock" }
    );
    // Khe nứt dung nham phát sáng cam-vàng trên mai
    plotPixelLine(g, ox - 12, oy - 2, ox - 3, oy - 6, "#ff9924", 2);
    plotPixelLine(g, ox - 3, oy - 6, ox + 5, oy - 1, "#ffe86b", 1);
    plotPixelLine(g, ox - 6, oy + 2, ox + 3, oy + 4, "#ff621f", 1);

    // Sừng bọ hung cong lớn & mắt rực
    plotPixelLine(g, ox + 16, oy + 4, ox + 26, oy - 3, "#4a1b12", 4);
    plotPixelLine(g, ox + 26, oy - 3, ox + 23, oy - 10, "#ff7b29", 2);
    plotPixel(g, ox + 23, oy - 11, "#fff29c");
    plotRect(g, ox + 13, oy - 2, 3, 2, "#fff066");

    // Tàn lửa bay lên
    plotRect(g, ox - 4 + (f % 3) * 3, oy - 14 - f * 2, 2, 2, "#ffe066");
    if (isAtk && (f === 1 || f === 2)) {
      plotPixelLine(g, ox + 24, oy - 5, ox + 31, oy + 2, "#ffaa33", 2);
    }

    return finalizeFrame64(g, 64, 64, "#3b150e", "#0a0404", 18, 56);
  });
}

export function getRegularMonsterFrames(typeId, state = "idle") {
  let bundle = REGULAR_CACHE.get(typeId);
  if (!bundle) {
    if (typeId === "mong_canh_ma_anh") bundle = buildWraith64();
    else if (typeId === "ong_mat_rung") bundle = buildHornetSwarm64();
    else if (typeId === "lon_rung") bundle = buildBoar64();
    else if (typeId === "hao_dien_lang") bundle = buildWolf64(false);
    else if (typeId === "soi_tuyet") bundle = buildWolf64(true);
    else if (typeId === "thach_hau") bundle = buildStoneMonkey64();
    else if (typeId === "coc_doc_hac_thuy") bundle = buildPoisonToad64();
    else if (typeId === "thiet_giap_bo_cap") bundle = buildScorpion64();
    else if (typeId === "thuy_mang") bundle = buildWaterSerpent64();
    else if (typeId === "kiem_truc_yeu") bundle = buildBambooPuppet64();
    else if (typeId === "xich_viem_thu") bundle = buildLavaBeetle64();
    else bundle = buildWraith64();
    REGULAR_CACHE.set(typeId, bundle);
  }
  return bundle[state] ?? bundle.idle;
}
