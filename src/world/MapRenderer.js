import {
  drawCrispPixelText,
  fillPixelEllipse,
  getArenaArtSet,
  getDitherGlowSprite,
  getPortalGateSprite,
  plotPixelEllipse,
  plotPixelLine,
  plotRect,
} from "../engine/PixelSpriteBaker.js";
import { getGuPixelCanvas } from "../ui/PixelGuIcons.js";
import {
  getBanLongFloorTileSet,
  getBanLongFormationDais,
  getBanLongGateSprite,
  getBanLongMistSprite,
  getBanLongPropFrames,
} from "./BanLongAssets.js";
import { getBiomeTerrainSet, getPropSprite } from "./PixelMapArt.js";
import {
  distToSegment,
  getWaterRadiusScale,
  isBridgeKind,
  isPointOnBridgeDeck,
  sampleStreamPoints,
} from "./WorldGeometry.js";

export { getWaterRadiusScale };

/**
 * Trình vẽ Bản đồ Thế giới Mở 3/4 Top-Down Pixel Art cho Cổ Tiên Lộ (Ánh sáng Tĩnh U Tịch):
 * - Cổng chuyển vùng 128x160 Sơn Môn / Rừng Cổ / Hang Thạch Nhũ (tuyệt đối 0 vòng tròn dưới đất!).
 * - Lôi Đài Tỷ Thí đá xanh đen 64x64 + Trận Pháp Bát Quái + 4 trụ đầu thú lửa linh hồn & Cờ Cổ Nguyệt.
 * - Sông suối, hồ nước, thềm đá bậc thang & toàn bộ chữ dùng Pixel Bitmap sắc cạnh viền đen 1px.
 */

const BIOME_PALETTES = {
  village: {
    grass1: "#253b1f", grass2: "#1c2d17", grass3: "#2f4a27", grassDark: "#0f1c0c",
    grassShort: "#2c4524", grassDeep: "#142611",
    dirt1: "#574a38", dirt2: "#3d3326", moss1: "#182e18", moss2: "#0e1c0e",
    path: "#594e3c", pathEdge: "#383024",
  },
  lakeside: {
    grass1: "#243d20", grass2: "#1a2e17", grass3: "#2f4d29", grassDark: "#0f1f0e",
    grassShort: "#2a4525", grassDeep: "#142913",
    dirt1: "#594d3b", dirt2: "#3d3427", moss1: "#163017", moss2: "#0e1f0e",
    path: "#5c503e", pathEdge: "#3a3226",
  },
  forest: {
    grass1: "#1d3018", grass2: "#142410", grass3: "#26401f", grassDark: "#0a1708",
    grassShort: "#22381c", grassDeep: "#10210c",
    dirt1: "#473a29", dirt2: "#2e2418", moss1: "#112413", moss2: "#08140a",
    path: "#4a3d2b", pathEdge: "#2e2519",
  },
  port_arena: {
    grass1: "#23381d", grass2: "#192914", grass3: "#2d4726", grassDark: "#0f1e0c",
    grassShort: "#294022", grassDeep: "#152611",
    dirt1: "#544836", dirt2: "#383022", moss1: "#162b16", moss2: "#0d1a0d",
    path: "#574b39", pathEdge: "#362e22",
  },
  highland: {
    grass1: "#384026", grass2: "#2b331d", grass3: "#444f2e", grassDark: "#1b2110",
    grassShort: "#404a2b", grassDeep: "#222914",
    dirt1: "#594b36", dirt2: "#3d3222", moss1: "#222b16", moss2: "#161c0e",
    path: "#594c37", pathEdge: "#3b3122",
  },
  swamp: {
    grass1: "#1d2e24", grass2: "#14211a", grass3: "#273d30", grassDark: "#0c1711",
    grassShort: "#263b2e", grassDeep: "#111f17",
    dirt1: "#474036", dirt2: "#2e2921", moss1: "#162b21", moss2: "#0d1c15",
    path: "#4f483d", pathEdge: "#302b24",
  },
  bamboo: {
    grass1: "#213d30", grass2: "#182e24", grass3: "#2b4f3e", grassDark: "#0e1f17",
    grassShort: "#284a39", grassDeep: "#13291e",
    dirt1: "#575043", dirt2: "#3b362d", moss1: "#152b22", moss2: "#0c1c16",
    path: "#5c5547", pathEdge: "#3d372e",
  },
  volcanic: {
    grass1: "#331a17", grass2: "#24110e", grass3: "#45221e", grassDark: "#170907",
    grassShort: "#42221d", grassDeep: "#210e0b",
    dirt1: "#543b32", dirt2: "#36241d", moss1: "#2e1b17", moss2: "#1c0e0b",
    path: "#573d34", pathEdge: "#33221c",
  },
  snow: {
    grass1: "#6d8191", grass2: "#5b6e7d", grass3: "#7d92a3", grassDark: "#3e4e5c",
    grassShort: "#788d9c", grassDeep: "#4a5c6b",
    dirt1: "#4a545c", dirt2: "#343d42", moss1: "#43525c", moss2: "#2e3b42",
    path: "#56636b", pathEdge: "#39444c",
  },
  stone_dream: {
    grass1: "#191f1c", grass2: "#111613", grass3: "#222925", grassDark: "#0a0e0c",
    grassShort: "#1e2421", grassDeep: "#0f1411",
    dirt1: "#3d3a35", dirt2: "#262421", moss1: "#131c17", moss2: "#0a100c",
    path: "#423f3a", pathEdge: "#292622",
  },
  spirit_cave: {
    grass1: "#10241f", grass2: "#0a1a16", grass3: "#18362c", grassDark: "#06100e",
    grassShort: "#152e27", grassDeep: "#081713",
    dirt1: "#1f2e30", dirt2: "#121e20", moss1: "#12362d", moss2: "#091f1a",
    path: "#213236", pathEdge: "#111e20",
  },
  stalactite_cave: {
    grass1: "#131720", grass2: "#0c0f16", grass3: "#1a202b", grassDark: "#07090e",
    grassShort: "#161b24", grassDeep: "#0a0d14",
    dirt1: "#2c313b", dirt2: "#1b1e26", moss1: "#112b28", moss2: "#0a1c19",
    path: "#313642", pathEdge: "#1b1e26",
  },
  abyss: {
    grass1: "#141b24", grass2: "#0e131a", grass3: "#1d2633", grassDark: "#080b10",
    grassShort: "#19222e", grassDeep: "#0b1017",
    dirt1: "#232b38", dirt2: "#151b24", moss1: "#13291f", moss2: "#0b1913",
    path: "#263040", pathEdge: "#141a24",
  },
};

const TERRACE_THEMES = {
  warm: {
    slabs: ["#5c5850", "#504c45", "#666259", "#47443d"],
    mortar: "#2b2924",
    hi: "#7a746a",
    curb: "#615c53",
    curbDark: "#24221e",
    wallTop: "#5c574e",
    wallFaceA: "#3d3a34",
    wallFaceB: "#302d29",
    wallOut: "#171614",
    tread: "#69645b",
    riser: "#24221f",
    inlay: "#736345",
  },
  slate: {
    slabs: ["#3f444a", "#35393e", "#494f57", "#2e3236"],
    mortar: "#1b1e21",
    hi: "#5c636b",
    curb: "#4c5259",
    curbDark: "#15181b",
    wallTop: "#4f565e",
    wallFaceA: "#30353b",
    wallFaceB: "#25292e",
    wallOut: "#101214",
    tread: "#525861",
    riser: "#181b1f",
    inlay: "#736545",
  },
  frost: {
    slabs: ["#6f7f8c", "#61707d", "#7d8e9c", "#54636e"],
    mortar: "#34404a",
    hi: "#96a7b5",
    curb: "#7d8d99",
    curbDark: "#242f38",
    wallTop: "#758594",
    wallFaceA: "#4a5966",
    wallFaceB: "#3b4954",
    wallOut: "#1a2229",
    tread: "#8192a1",
    riser: "#2c3842",
    inlay: "#4f7c8c",
  },
  mossy: {
    slabs: ["#4b524c", "#404741", "#565e57", "#363b37"],
    mortar: "#212622",
    hi: "#677068",
    curb: "#565e57",
    curbDark: "#161a17",
    wallTop: "#525953",
    wallFaceA: "#333834",
    wallFaceB: "#272b28",
    wallOut: "#111412",
    tread: "#5b635c",
    riser: "#1c211d",
    inlay: "#2f5233",
  },
  abyss: {
    slabs: ["#1d2738", "#161e2c", "#253247", "#111824"],
    mortar: "#080c12",
    hi: "#394b66",
    curb: "#2c3b52",
    curbDark: "#090d14",
    wallTop: "#2f3f57",
    wallFaceA: "#1a2333",
    wallFaceB: "#121926",
    wallOut: "#06090e",
    tread: "#2b3a50",
    riser: "#0b1018",
    inlay: "#785729",
  },
};

export class MapRenderer {
  constructor() {
    this._terrainCache = new Map();
    this._minimapCache = new Map();
    this._fireflyGlowCache = new Map();
  }

  _getFireflyGlowSprite(color) {
    return getDitherGlowSprite(color, 7, 0.78);
  }

  _hash(x, y) {
    let h = ((x | 0) * 374761393 + (y | 0) * 668265263) ^ 0x5bf03635;
    h = (h ^ (h >> 13)) * 1274126177;
    return Math.abs(h ^ (h >> 16));
  }

  _smoothNoise(x, y, seed = 0) {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const fx = x - xi;
    const fy = y - yi;
    const u = fx * fx * (3 - 2 * fx);
    const v = fy * fy * (3 - 2 * fy);
    const n00 = (this._hash(xi + seed * 17, yi + seed * 31) % 1000) / 1000;
    const n10 = (this._hash(xi + 1 + seed * 17, yi + seed * 31) % 1000) / 1000;
    const n01 = (this._hash(xi + seed * 17, yi + 1 + seed * 31) % 1000) / 1000;
    const n11 = (this._hash(xi + 1 + seed * 17, yi + 1 + seed * 31) % 1000) / 1000;
    const nx0 = n00 * (1 - u) + n10 * u;
    const nx1 = n01 * (1 - u) + n11 * u;
    return nx0 * (1 - v) + nx1 * v;
  }

  _fbm(x, y, seed = 0) {
    return this._smoothNoise(x, y, seed) * 0.65 + this._smoothNoise(x * 2.4, y * 2.4, seed + 5) * 0.35;
  }

  _resolveCellZone(mapDef, wx, wy, seed) {
    const dither = (((wx >> 2) + (wy >> 2)) & 1) === 0 ? 0.045 : -0.045;
    for (const z of mapDef.terrainZones ?? []) {
      if (z.kind === "stone_plaza" || z.kind === "packed_dirt") continue;
      const wob = (this._smoothNoise(wx * 0.032, wy * 0.032, seed + 3) - 0.5) * 18;
      const dx = wx - z.x;
      const dy = wy - z.y;
      if (z.shape === "rect") {
        if (Math.abs(dx) <= z.rx + wob * 0.35 && Math.abs(dy) <= z.ry + wob * 0.35) {
          return z.kind;
        }
      } else {
        const d = Math.hypot(dx / Math.max(1, z.rx + wob), dy / Math.max(1, z.ry + wob));
        if (d <= 1.0 + dither * 0.45) return z.kind;
      }
    }

    if (mapDef.biome === "abyss") return "mid_grass";
    const n = this._fbm(wx * 0.011, wy * 0.011, seed) + dither * 0.42;
    if (n < 0.34) return "short_grass";
    if (n < 0.63) return "mid_grass";
    if (n < 0.82) return "tall_grass";
    return "flower_meadow";
  }

  _drawCliffLedge(ctx, ledge, pal) {
    const h = ledge.height ?? 14;
    const x1 = Math.round(ledge.x1);
    const x2 = Math.round(ledge.x2);
    const y1 = Math.round(ledge.y1);
    const y2 = Math.round(ledge.y2);
    const steps = Math.max(8, Math.ceil(Math.abs(x2 - x1) / 4));
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const px = Math.round(x1 + (x2 - x1) * t);
      const topY = Math.round(y1 + (y2 - y1) * t + Math.sin(t * 9 + x1) * 3);
      ctx.fillStyle = "rgba(8, 12, 8, 0.34)";
      ctx.fillRect(px, topY + h, 5, 3);
      ctx.fillStyle = "#262b30";
      ctx.fillRect(px, topY, 5, h + 1);
      ctx.fillStyle = i % 2 === 0 ? "#4e5761" : "#3f474f";
      ctx.fillRect(px + 1, topY + 2, 3, h - 2);
      ctx.fillStyle = "#77838f";
      ctx.fillRect(px + 1, topY + 2, 2, 3);
      ctx.fillStyle = pal.grassDark || "#2d5222";
      ctx.fillRect(px, topY - 1, 5, 3);
      ctx.fillStyle = pal.grass1;
      ctx.fillRect(px, topY - 2, 5, 2);
    }
  }

  _drawOrganicPolygon(ctx, cx, cy, rx, ry, seed, steps = 72) {
    ctx.beginPath();
    for (let i = 0; i <= steps; i++) {
      const a = (i / steps) * Math.PI * 2;
      const sc = getWaterRadiusScale(a, seed);
      const px = cx + Math.cos(a) * rx * sc;
      const py = cy + Math.sin(a) * ry * sc;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
  }

  _drawRoads(ctx, mapDef, pal) {
    const isPavedDefault = ["village", "port_arena", "stone_dream", "snow"].includes(mapDef.biome);
    const pavedPaths = [];
    const dirtPaths = [];
    for (const p of mapDef.paths ?? []) {
      const paved = p.style ? p.style === "paved" : isPavedDefault;
      if (paved) pavedPaths.push(p);
      else dirtPaths.push(p);
    }

    // 1. Đường đất mòn đồng quê / đường rừng lát sỏi & đá bước dither pixel 2px
    for (const p of dirtPaths) {
      const dx = p.x2 - p.x1;
      const dy = p.y2 - p.y1;
      const len = Math.max(1, Math.hypot(dx, dy));
      const ux = dx / len;
      const uy = dy / len;
      const nx = -uy;
      const ny = ux;
      const hw = Math.round((p.w ?? 52) * 0.44);
      const steps = Math.ceil(len / 2);

      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const wob = Math.sin(t * len * 0.025 + p.x1 * 0.1) * 3.5;
        const cx = p.x1 + dx * t + nx * wob;
        const cy = p.y1 + dy * t + ny * wob;
        for (let off = -hw - 5; off <= hw + 5; off += 2) {
          const px = Math.round((cx + nx * off) / 2) * 2;
          const py = Math.round((cy + ny * off) / 2) * 2;
          const absO = Math.abs(off);
          if (absO > hw) {
            if (this._hash(px, py) % 3 === 0) {
              ctx.fillStyle = pal.pathEdge;
              ctx.fillRect(px, py, 2, 2);
            }
          } else if (absO > hw - 4) {
            ctx.fillStyle = this._hash(px + 5, py) % 4 === 0 ? pal.grassDark : pal.pathEdge;
            ctx.fillRect(px, py, 2, 2);
          } else {
            const isTrack = Math.abs(absO - Math.round(hw * 0.42)) <= 2;
            ctx.fillStyle = isTrack ? pal.pathEdge : this._hash(px, py + 7) % 7 === 0 ? pal.dirt2 : pal.path;
            ctx.fillRect(px, py, 2, 2);
          }
        }
        // Đá bước mòn & sỏi nhỏ dọc đường đất
        if (i > 4 && i < steps - 4 && i % 15 === 0) {
          const sOff = ((this._hash(i, p.y1) % 3) - 1) * 8;
          const sx = Math.round(cx + nx * sOff);
          const sy = Math.round(cy + ny * sOff);
          ctx.fillStyle = "#524c42";
          ctx.fillRect(sx - 5, sy - 3, 10, 6);
          ctx.fillStyle = "#ada596";
          ctx.fillRect(sx - 4, sy - 2, 8, 4);
          ctx.fillStyle = "#ccc5b6";
          ctx.fillRect(sx - 4, sy - 2, 5, 2);
        }
      }
    }

    // 2. Đại lộ lát đá phiến cổ rêu phong (Pass A bó vỉa -> Pass B nền đá hợp nhất ngã tư)
    const isAbyss = mapDef.biome === "abyss";
    const isBluestone = mapDef.biome === "stone_dream" || mapDef.biome === "snow";
    const slabs = isAbyss
      ? ["#1e293b", "#172030", "#26344a", "#121926"]
      : isBluestone
        ? ["#485159", "#3f474f", "#535c66", "#373e45"]
        : ["#635f56", "#57534b", "#6e6a60", "#4d4a43"];
    const mortar = isAbyss ? "#080c12" : isBluestone ? "#21272e" : "#2b2a26";
    const curbA = isAbyss ? "#314259" : isBluestone ? "#5e6770" : "#5c574e";
    const curbB = isAbyss ? "#222f42" : isBluestone ? "#485059" : "#4a463f";
    const curbOut = isAbyss ? "#070a0f" : isBluestone ? "#191e24" : "#21201d";
    const runnerCol = isAbyss ? "#2b3b52" : isBluestone ? "#636f7a" : "#706b60";

    // Pass A: Đổ bóng cỏ & dải bó vỉa đá 2 bên đường
    for (const p of pavedPaths) {
      const dx = p.x2 - p.x1;
      const dy = p.y2 - p.y1;
      const hw = Math.round((p.w ?? 64) * 0.5);
      const isHoriz = Math.abs(dy) <= Math.abs(dx);

      if (Math.abs(dy) < 2) {
        const lx = Math.round(Math.min(p.x1, p.x2));
        const rx = Math.round(Math.max(p.x1, p.x2));
        const cy = Math.round(p.y1);
        ctx.fillStyle = "rgba(12, 18, 10, 0.34)";
        ctx.fillRect(lx, cy - hw - 5, rx - lx, 2);
        ctx.fillRect(lx, cy + hw + 3, rx - lx, 3);
        ctx.fillStyle = curbOut;
        ctx.fillRect(lx, cy - hw - 4, rx - lx, 5);
        ctx.fillRect(lx, cy + hw - 1, rx - lx, 5);
        for (let px = lx; px < rx; px += 10) {
          const bw = Math.min(9, rx - px);
          const col = ((px / 10) | 0) % 2 === 0 ? curbA : curbB;
          ctx.fillStyle = col;
          ctx.fillRect(px, cy - hw - 3, bw, 3);
          ctx.fillRect(px, cy + hw, bw, 3);
        }
      } else if (Math.abs(dx) < 2) {
        const ty = Math.round(Math.min(p.y1, p.y2));
        const by = Math.round(Math.max(p.y1, p.y2));
        const cx = Math.round(p.x1);
        ctx.fillStyle = "rgba(12, 18, 10, 0.34)";
        ctx.fillRect(cx - hw - 5, ty, 2, by - ty);
        ctx.fillRect(cx + hw + 3, ty, 3, by - ty);
        ctx.fillStyle = curbOut;
        ctx.fillRect(cx - hw - 4, ty, 5, by - ty);
        ctx.fillRect(cx + hw - 1, ty, 5, by - ty);
        for (let py = ty; py < by; py += 10) {
          const bh = Math.min(9, by - py);
          const col = ((py / 10) | 0) % 2 === 0 ? curbA : curbB;
          ctx.fillStyle = col;
          ctx.fillRect(cx - hw - 3, py, 3, bh);
          ctx.fillRect(cx + hw, py, 3, bh);
        }
      } else {
        const len = Math.max(1, Math.hypot(dx, dy));
        const nx = -dy / len;
        const ny = dx / len;
        const steps = Math.ceil(len / 2);
        for (let i = 0; i <= steps; i++) {
          const t = i / steps;
          const cx = p.x1 + dx * t;
          const cy = p.y1 + dy * t;
          for (const side of [-1, 1]) {
            const bx = Math.round(cx + nx * side * (hw + 1));
            const by = Math.round(cy + ny * side * (hw + 1));
            ctx.fillStyle = curbOut;
            ctx.fillRect(bx - 2, by - 2, 5, 5);
            ctx.fillStyle = (i >> 2) % 2 === 0 ? curbA : curbB;
            ctx.fillRect(bx - 1, by - 1, 3, 3);
          }
          if (isHoriz) {
            ctx.fillStyle = mortar;
            ctx.fillRect(Math.round(cx) - 1, Math.round(cy) - hw, 3, hw * 2);
          }
        }
      }
    }

    // Pass B: Lát đá phiến so le bên trong lòng tất cả đại lộ (che kín bó vỉa tại giao lộ)
    for (const p of pavedPaths) {
      const dx = p.x2 - p.x1;
      const dy = p.y2 - p.y1;
      const hw = Math.round((p.w ?? 64) * 0.5) - 1;
      if (Math.abs(dy) < 2 || Math.abs(dx) < 2) {
        const x0 = Math.round(Math.abs(dy) < 2 ? Math.min(p.x1, p.x2) : p.x1 - hw);
        const y0 = Math.round(Math.abs(dy) < 2 ? p.y1 - hw : Math.min(p.y1, p.y2));
        const rw = Math.round(Math.abs(dy) < 2 ? Math.abs(dx) : hw * 2);
        const rh = Math.round(Math.abs(dy) < 2 ? hw * 2 : Math.abs(dy));

        ctx.fillStyle = mortar;
        ctx.fillRect(x0, y0, rw, rh);

        const slabW = 12;
        const slabH = 8;
        for (let py = y0; py < y0 + rh; py += slabH) {
          const row = ((py - y0) / slabH) | 0;
          const stagger = (row & 1) * 6;
          const sh = Math.min(slabH - 1, y0 + rh - py);
          if (sh <= 0) continue;
          for (let px = x0 - stagger; px < x0 + rw; px += slabW) {
            const drawX = Math.max(x0, px);
            const drawEnd = Math.min(x0 + rw, px + slabW - 1);
            const sw = drawEnd - drawX;
            if (sw <= 0) continue;
            const col = slabs[this._hash(px, py) % slabs.length];
            ctx.fillStyle = col;
            ctx.fillRect(drawX, py, sw, sh);
            if (sh >= 3 && sw >= 3) {
              ctx.fillStyle = "rgba(255, 250, 235, 0.1)";
              ctx.fillRect(drawX, py, sw, 1);
            }
            if ((row === 0 || py + slabH >= y0 + rh) && this._hash(drawX, py + 9) % 5 === 0) {
              ctx.fillStyle = pal.grassDark || "#233d1b";
              ctx.fillRect(drawX + 1, py + (row === 0 ? 0 : Math.max(0, sh - 2)), 3, 2);
            } else if (this._hash(drawX + 3, py) % 13 === 0) {
              ctx.fillStyle = "#2a472e";
              ctx.fillRect(drawX + 1, py + 1, 2, 1);
            }
          }
        }

        // Dải đá trung tâm cho trục chính rộng >= 62px
        if ((p.w ?? 64) >= 62) {
          if (Math.abs(dy) < 2) {
            const cy = Math.round(p.y1);
            ctx.fillStyle = mortar;
            ctx.fillRect(x0, cy - 8, rw, 16);
            for (let px = x0; px < x0 + rw; px += 14) {
              const sw = Math.min(13, x0 + rw - px);
              ctx.fillStyle = runnerCol;
              ctx.fillRect(px, cy - 7, sw, 14);
              ctx.fillStyle = "rgba(255,255,255,0.1)";
              ctx.fillRect(px, cy - 7, sw, 1);
            }
          } else {
            const cx = Math.round(p.x1);
            ctx.fillStyle = mortar;
            ctx.fillRect(cx - 8, y0, 16, rh);
            for (let py = y0; py < y0 + rh; py += 14) {
              const sh = Math.min(13, y0 + rh - py);
              ctx.fillStyle = runnerCol;
              ctx.fillRect(cx - 7, py, 14, sh);
              ctx.fillStyle = "rgba(255,255,255,0.1)";
              ctx.fillRect(cx - 7, py, 1, sh);
            }
          }
        }
      } else {
        const len = Math.max(1, Math.hypot(dx, dy));
        const nx = -dy / len;
        const ny = dx / len;
        const steps = Math.ceil(len / 2);
        for (let i = 0; i <= steps; i++) {
          const t = i / steps;
          const cx = p.x1 + dx * t;
          const cy = p.y1 + dy * t;
          for (let off = -hw; off <= hw; off += 4) {
            const px = Math.round((cx + nx * off) / 4) * 4;
            const py = Math.round((cy + ny * off) / 4) * 4;
            ctx.fillStyle = slabs[this._hash(px, py) % slabs.length];
            ctx.fillRect(px, py, 4, 4);
          }
        }
      }
    }

    // Pass C: Khóm cỏ nhỏ mọc lấn nhẹ ngoài mép bó vỉa (tránh ngã tư)
    for (const p of pavedPaths) {
      const dx = p.x2 - p.x1;
      const dy = p.y2 - p.y1;
      const len = Math.max(1, Math.hypot(dx, dy));
      const hw = Math.round((p.w ?? 64) * 0.5) + 4;
      const nx = -dy / len;
      const ny = dx / len;
      for (let d = 18; d < len - 18; d += 34) {
        const t = d / len;
        const cx = p.x1 + dx * t;
        const cy = p.y1 + dy * t;
        for (const side of [-1, 1]) {
          const gx = Math.round(cx + nx * side * hw);
          const gy = Math.round(cy + ny * side * hw);
          let insideOther = false;
          for (const op of pavedPaths) {
            if (op === p) continue;
            if (distToSegment(gx, gy, op.x1, op.y1, op.x2, op.y2) <= (op.w ?? 64) * 0.5 + 4) {
              insideOther = true;
              break;
            }
          }
          if (!insideOther) {
            ctx.fillStyle = pal.grassDark || "#386b24";
            ctx.fillRect(gx - 1, gy, 3, 2);
            ctx.fillStyle = pal.grass3;
            ctx.fillRect(gx, gy - 1, 2, 2);
          }
        }
      }
    }
  }

  _drawRiversStatic(ctx, mapDef) {
    const stone1 = getPropSprite("shore_stone");
    const stone2 = getPropSprite("shore_stone_2");
    const pebbles = getPropSprite("shore_pebbles");
    const reedSpr = getPropSprite("reed_clump");
    const isCave = mapDef.biome === "stalactite_cave";

    for (let si = 0; si < (mapDef.streams ?? []).length; si++) {
      const st = mapDef.streams[si];
      const samples = sampleStreamPoints(st);
      if (samples.length < 2) continue;
      const baseHalfW = (st.width ?? 42) * 0.5;

      // Tính bề rộng biến thiên tự nhiên theo khúc uốn (thu gọn vừa khít tại vị trí cầu)
      const halfWidths = samples.map((s, idx) => {
        const nearBridge = isPointOnBridgeDeck(mapDef, s.x, s.y, 18);
        const mod = 1 + 0.14 * Math.sin(idx * 0.34 + si * 1.7) + 0.08 * Math.cos(idx * 0.72 - si);
        return Math.max(8, baseHalfW * (nearBridge ? 1.0 : mod));
      });

      const traceBand = (extraHalf, offsetY = 0, shiftThalweg = 0) => {
        ctx.beginPath();
        for (let i = 0; i < samples.length; i++) {
          const s = samples[i];
          const nx = -s.ty;
          const ny = s.tx;
          const hw = Math.max(3, halfWidths[i] + extraHalf);
          const thalweg = shiftThalweg ? Math.sin(i * 0.25 + si) * shiftThalweg : 0;
          const px = s.x + nx * (hw + thalweg);
          const py = s.y + ny * (hw + thalweg) + offsetY;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        for (let i = samples.length - 1; i >= 0; i--) {
          const s = samples[i];
          const nx = -s.ty;
          const ny = s.tx;
          const hw = Math.max(3, halfWidths[i] + extraHalf);
          const thalweg = shiftThalweg ? Math.sin(i * 0.25 + si) * shiftThalweg : 0;
          const px = s.x - nx * (hw - thalweg);
          const py = s.y - ny * (hw - thalweg) + offsetY;
          ctx.lineTo(px, py);
        }
        ctx.closePath();
      };

      // 1. Bờ rêu ẩm tối & viền đất đá gọn (2 tầng)
      ctx.fillStyle = isCave ? "#0d141e" : "#142617";
      traceBand(9, 0);
      ctx.fill();

      ctx.fillStyle = isCave ? "#1c222e" : "#26221c";
      traceBand(4, 0);
      ctx.fill();

      // 2. Vách bờ lõm 2.5D lộ ra dọc mép trên/Bắc + 4 tầng độ sâu dòng chảy ngọc u tối
      ctx.fillStyle = isCave ? "#252c3b" : "#363027";
      traceBand(0, 0);
      ctx.fill();

      ctx.save();
      traceBand(0, 0);
      ctx.clip();

      ctx.fillStyle = isCave ? "#164459" : "#1b5e57";
      traceBand(0, 3.5);
      ctx.fill();

      ctx.fillStyle = isCave ? "#103547" : "#124846";
      traceBand(-4, 3.5);
      ctx.fill();

      ctx.fillStyle = isCave ? "#0b2636" : "#0b3336";
      traceBand(-9, 3.5, 2.5);
      ctx.fill();

      ctx.fillStyle = isCave ? "#061824" : "#062126";
      traceBand(-14, 3.5, 3.2);
      ctx.fill();

      // Đá cuội chìm mờ ven lòng suối
      for (let i = 3; i < samples.length - 3; i += 4) {
        const s = samples[i];
        const nx = -s.ty;
        const ny = s.tx;
        const side = this._hash(i, si + 3) % 2 === 0 ? 1 : -1;
        const offset = (halfWidths[i] - 5) * side;
        const cx = Math.round(s.x + nx * offset);
        const cy = Math.round(s.y + ny * offset + 2);
        ctx.fillStyle = "rgba(8, 22, 24, 0.55)";
        ctx.fillRect(cx - 2, cy - 1, 5, 3);
      }
      ctx.restore();

      // 3. Ngọn cỏ rủ ven hai bờ sông
      if (!isCave) {
        for (let i = 2; i < samples.length - 2; i += 2) {
          const s = samples[i];
          const nx = -s.ty;
          const ny = s.tx;
          for (const side of [-1, 1]) {
            if (this._hash(i + 7, side + si) % 3 !== 0) continue;
            const gx = Math.round(s.x + nx * side * (halfWidths[i] + 2));
            const gy = Math.round(s.y + ny * side * (halfWidths[i] + 2));
            if (isPointOnBridgeDeck(mapDef, gx, gy, 18)) continue;
            ctx.fillStyle = i % 4 === 0 ? "#244720" : "#38612b";
            ctx.fillRect(gx, gy - 1, 2, 2);
          }
        }
      }

      // 4. Cụm đá cuội rêu & khóm lau sậy tự nhiên dọc bờ (né vùng cầu)
      for (let i = 6; i < samples.length - 6; i += 11) {
        const s = samples[i];
        const nx = -s.ty;
        const ny = s.tx;
        const side = ((i / 11) | 0) % 2 === 0 ? 1 : -1;
        const anchorDist = halfWidths[i] + 5;
        const bx = Math.round(s.x + nx * side * anchorDist);
        const by = Math.round(s.y + ny * side * anchorDist);
        if (isPointOnBridgeDeck(mapDef, bx, by, 26)) continue;

        if (((i / 11) | 0) % 3 === 1 && reedSpr && !isCave) {
          ctx.drawImage(reedSpr.canvas, bx - reedSpr.anchorX, by - reedSpr.anchorY);
          if (pebbles) {
            ctx.drawImage(pebbles.canvas, bx + 9 - pebbles.anchorX, by + 2 - pebbles.anchorY);
          }
        } else {
          const rockPick = ((i / 11) | 0) % 2 === 0 ? stone1 : stone2;
          if (rockPick) {
            ctx.drawImage(rockPick.canvas, bx - rockPick.anchorX, by - rockPick.anchorY);
          }
          if (pebbles) {
            const px = Math.round(bx + s.tx * 9);
            const py = Math.round(by + s.ty * 9);
            if (!isPointOnBridgeDeck(mapDef, px, py, 24)) {
              ctx.drawImage(pebbles.canvas, px - pebbles.anchorX, py - pebbles.anchorY);
            }
          }
        }
      }
    }
  }

  _drawStoneTerraces(ctx, mapDef, pal) {
    const theme =
      mapDef.biome === "stone_dream" || mapDef.biome === "volcanic"
        ? TERRACE_THEMES.slate
        : mapDef.biome === "snow"
          ? TERRACE_THEMES.frost
          : mapDef.biome === "forest" || mapDef.biome === "bamboo"
            ? TERRACE_THEMES.mossy
            : TERRACE_THEMES.warm;

    for (const t of mapDef.stoneTerraces ?? []) {
      const left = Math.round(t.x - t.rx);
      const right = Math.round(t.x + t.rx);
      const top = Math.round(t.y - t.ry);
      const deckBot = Math.round(t.y + t.ry);
      const w = right - left;
      const dH = deckBot - top;

      // Sân tập võ / Vườn dược viền đá & gỗ phẳng
      if (t.style === "courtyard") {
        ctx.fillStyle = "rgba(10, 14, 9, 0.24)";
        ctx.fillRect(left - 2, top - 2, w + 6, dH + 6);
        ctx.fillStyle = theme.wallOut;
        ctx.fillRect(left - 1, top - 1, w + 2, dH + 2);
        ctx.fillStyle = pal.dirt1 || "#ccb27e";
        ctx.fillRect(left + 3, top + 3, w - 6, dH - 6);
        // Vân đất cát & gạch viền sân
        for (let py = top + 4; py < deckBot - 4; py += 4) {
          for (let px = left + 4; px < right - 4; px += 4) {
            if (this._hash(px, py) % 5 === 0) {
              ctx.fillStyle = pal.dirt2 || "#a18553";
              ctx.fillRect(px, py, 2, 2);
            }
          }
        }
        // Vòng tròn sân võ pixel trung tâm
        plotPixelEllipse(ctx, t.x, t.y, Math.min(48, Math.round(t.rx * 0.55)), Math.min(28, Math.round(t.ry * 0.55)), "rgba(120, 88, 52, 0.38)", 2, 0);

        // Bó vỉa đá 4 cạnh (chừa lối vào ở stairs)
        ctx.fillStyle = theme.curb;
        ctx.fillRect(left, top, w, 4);
        ctx.fillRect(left, deckBot - 4, w, 4);
        ctx.fillRect(left, top, 4, dH);
        ctx.fillRect(right - 4, top, 4, dH);
        for (const s of t.stairs ?? []) {
          const sw = s.width ?? 44;
          if (s.side === "north" || s.side === "south") {
            const sx = Math.round(t.x + (s.offset ?? 0) - sw * 0.5);
            const sy = s.side === "north" ? top - 1 : deckBot - 5;
            ctx.fillStyle = theme.tread;
            ctx.fillRect(sx, sy, sw, 6);
            ctx.fillStyle = theme.riser;
            ctx.fillRect(sx, sy + 5, sw, 1);
          } else {
            const sx = s.side === "west" ? left - 1 : right - 5;
            const sy = Math.round(t.y + (s.offset ?? 0) - sw * 0.5);
            ctx.fillStyle = theme.tread;
            ctx.fillRect(sx, sy, 6, sw);
          }
        }
        for (const [cx, cy] of [[left - 2, top - 2], [right - 5, top - 2], [left - 2, deckBot - 5], [right - 5, deckBot - 5]]) {
          ctx.fillStyle = theme.wallOut;
          ctx.fillRect(cx, cy, 7, 7);
          ctx.fillStyle = theme.hi;
          ctx.fillRect(cx + 1, cy + 1, 5, 5);
        }
        continue;
      }

      // Thềm Đá Giật Cấp 2.5D: Mặt đá phiến + Tường chắn đá + Trụ góc + Bậc đá tam cấp
      const h = t.height ?? 12;
      ctx.fillStyle = "rgba(8, 12, 8, 0.34)";
      ctx.fillRect(left + 2, deckBot + h, w + 3, 5);
      ctx.fillRect(right, top + 4, 5, dH + h);

      // Lát đá phiến mặt trên thềm (16x10 so le)
      ctx.fillStyle = theme.mortar;
      ctx.fillRect(left, top, w, dH);
      for (let py = top; py < deckBot; py += 10) {
        const row = ((py - top) / 10) | 0;
        const stag = (row & 1) * 8;
        const sh = Math.min(9, deckBot - py);
        for (let px = left - stag; px < right; px += 16) {
          const dx = Math.max(left, px);
          const dw = Math.min(right, px + 15) - dx;
          if (dw <= 0) continue;
          ctx.fillStyle = theme.slabs[this._hash(px, py) % theme.slabs.length];
          ctx.fillRect(dx, py, dw, sh);
          if (sh >= 3) {
            ctx.fillStyle = "rgba(255,255,255,0.16)";
            ctx.fillRect(dx, py, dw, 1);
          }
        }
      }
      // Đường khảm đá trang trí bên trong thềm
      ctx.strokeStyle = theme.inlay;
      ctx.lineWidth = 1;
      ctx.strokeRect(left + 9.5, top + 9.5, w - 19, dH - 19);

      // Tường chắn đá dựng đứng mặt Nam
      ctx.fillStyle = theme.wallOut;
      ctx.fillRect(left, deckBot, w, h + 1);
      ctx.fillStyle = theme.wallTop;
      ctx.fillRect(left, deckBot, w, 3);
      for (let px = left; px < right; px += 14) {
        const bw = Math.min(13, right - px);
        ctx.fillStyle = ((px / 14) | 0) % 2 === 0 ? theme.wallFaceA : theme.wallFaceB;
        ctx.fillRect(px, deckBot + 3, bw, Math.max(2, h - 3));
        ctx.fillStyle = theme.wallOut;
        ctx.fillRect(px + bw, deckBot + 3, 1, Math.max(2, h - 3));
        if (this._hash(px, deckBot) % 4 === 0) {
          ctx.fillStyle = "#3f7342";
          ctx.fillRect(px + 2, deckBot + h - 3, 5, 3);
        }
      }

      // Viền đá lan can thấp 3 mặt Bắc / Tây / Đông
      ctx.fillStyle = theme.wallOut;
      ctx.fillRect(left - 2, top - 3, w + 4, 5);
      ctx.fillRect(left - 2, top - 2, 5, dH + h + 2);
      ctx.fillRect(right - 3, top - 2, 5, dH + h + 2);
      ctx.fillStyle = theme.curb;
      ctx.fillRect(left - 1, top - 2, w + 2, 3);
      ctx.fillRect(left - 1, top - 1, 3, dH + h);
      ctx.fillRect(right - 2, top - 1, 3, dH + h);

      // Vẽ Bậc Đá Tam Cấp & Tay Vịn Đá từng hướng
      for (const s of t.stairs ?? []) {
        const sw = Math.round(s.width ?? 48);
        if (s.side === "south") {
          const sx = Math.round(t.x + (s.offset ?? 0) - sw * 0.5);
          // Bậc đá 5 cấp đi từ mặt thềm (deckBot - 2) xuống mặt đất (deckBot + h + 6)
          const totalRise = h + 8;
          const steps = 5;
          const stepH = Math.ceil(totalRise / steps);
          ctx.fillStyle = theme.wallOut;
          ctx.fillRect(sx - 5, deckBot - 3, sw + 10, totalRise + 3);
          for (let st = 0; st < steps; st++) {
            const sy = deckBot - 2 + st * stepH;
            ctx.fillStyle = st % 2 === 0 ? theme.tread : theme.slabs[1];
            ctx.fillRect(sx, sy, sw, Math.max(2, stepH - 1));
            ctx.fillStyle = theme.riser;
            ctx.fillRect(sx, sy + Math.max(2, stepH - 1), sw, 1);
          }
          // Hai tay vịn đá & trụ đầu bậc
          for (const railX of [sx - 5, sx + sw]) {
            ctx.fillStyle = theme.wallOut;
            ctx.fillRect(railX, deckBot - 4, 5, totalRise + 4);
            ctx.fillStyle = theme.hi;
            ctx.fillRect(railX + 1, deckBot - 3, 3, totalRise + 1);
            ctx.fillStyle = theme.wallOut;
            ctx.fillRect(railX - 1, deckBot + totalRise - 6, 7, 7);
            ctx.fillStyle = theme.tread;
            ctx.fillRect(railX, deckBot + totalRise - 5, 5, 5);
          }
        } else if (s.side === "north") {
          const sx = Math.round(t.x + (s.offset ?? 0) - sw * 0.5);
          ctx.fillStyle = theme.wallOut;
          ctx.fillRect(sx - 4, top - 10, sw + 8, 13);
          for (let st = 0; st < 4; st++) {
            const sy = top - 9 + st * 3;
            ctx.fillStyle = st % 2 === 0 ? theme.tread : theme.slabs[1];
            ctx.fillRect(sx, sy, sw, 2);
            ctx.fillStyle = theme.riser;
            ctx.fillRect(sx, sy + 2, sw, 1);
          }
          for (const railX of [sx - 4, sx + sw]) {
            ctx.fillStyle = theme.hi;
            ctx.fillRect(railX + 1, top - 9, 2, 11);
          }
        } else if (s.side === "west" || s.side === "east") {
          const sy = Math.round(t.y + (s.offset ?? 0) - sw * 0.5);
          const isWest = s.side === "west";
          const startX = isWest ? left - 12 : right - 1;
          ctx.fillStyle = theme.wallOut;
          ctx.fillRect(startX, sy - 4, 13, sw + 8);
          for (let st = 0; st < 4; st++) {
            const sx = startX + st * 3;
            ctx.fillStyle = st % 2 === 0 ? theme.tread : theme.slabs[1];
            ctx.fillRect(sx, sy, 2, sw);
            ctx.fillStyle = theme.riser;
            ctx.fillRect(sx + 2, sy, 1, sw);
          }
          for (const railY of [sy - 4, sy + sw]) {
            ctx.fillStyle = theme.hi;
            ctx.fillRect(startX + 1, railY + 1, 11, 2);
          }
        }
      }

      // 4 trụ đá chạm khắc ở góc thềm
      for (const [cx, cy] of [
        [left - 3, top - 6],
        [right - 5, top - 6],
        [left - 3, deckBot - 5],
        [right - 5, deckBot - 5],
      ]) {
        ctx.fillStyle = theme.wallOut;
        ctx.fillRect(cx, cy, 8, 10);
        ctx.fillStyle = theme.hi;
        ctx.fillRect(cx + 1, cy + 1, 6, 7);
        ctx.fillStyle = "#e0b95e";
        ctx.fillRect(cx + 2, cy, 4, 2);
      }
    }
  }

  _getTerrainCanvas(mapDef) {
    if (this._terrainCache.has(mapDef.id)) {
      return this._terrainCache.get(mapDef.id);
    }

    const canvas = document.createElement("canvas");
    canvas.width = mapDef.width;
    canvas.height = mapDef.height;
    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = false;

    const pal = BIOME_PALETTES[mapDef.biome] ?? BIOME_PALETTES.lakeside;
    const terrainSet = getBiomeTerrainSet(mapDef.biome, pal);
    const seed = mapDef.id.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);

    // 1. Nền địa hình (Khu Bàn Long ghép từ tileset đá cổ 64x64 6 sắc độ + rêu trầm)
    if (mapDef.biome === "abyss") {
      const banLongTiles = getBanLongFloorTileSet();
      const cols = Math.ceil(mapDef.width / 64);
      const rows = Math.ceil(mapDef.height / 64);
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const tile = banLongTiles[this._hash(c + seed, r + seed) % banLongTiles.length];
          ctx.drawImage(tile, c * 64, r * 64);
        }
      }
    } else {
      const midCols = Math.ceil(mapDef.width / 16);
      const midRows = Math.ceil(mapDef.height / 16);
      for (let r = 0; r < midRows; r++) {
        for (let c = 0; c < midCols; c++) {
          ctx.drawImage(terrainSet.midGrass[this._hash(c, r) % terrainSet.midGrass.length], c * 16, r * 16);
        }
      }
    }

    const pickBucket = (kind) => {
      if (kind === "short_grass") return terrainSet.shortGrass;
      if (kind === "tall_grass") return terrainSet.tallGrassFloor;
      if (kind === "flower_meadow") return terrainSet.flowerMeadow;
      if (kind === "moss_glade") return terrainSet.mossFloor;
      return terrainSet.midGrass;
    };

    // 1b. Hòa trộn vùng cỏ tự nhiên bằng lưới 2x2 mượt mà (không loang lổ vuông 16x16)
    if (mapDef.biome !== "abyss") {
      const step = 2;
      for (let gy = 0; gy < mapDef.height; gy += step) {
        const tileR = gy >> 4;
        const subY = gy & 15;
        for (let gx = 0; gx < mapDef.width; gx += step) {
          const kind = this._resolveCellZone(mapDef, gx + 1, gy + 1, seed);
          if (kind === "mid_grass") continue;
          const bucket = pickBucket(kind);
          const tile = bucket[this._hash(gx >> 4, tileR) % bucket.length];
          ctx.drawImage(tile, gx & 15, subY, step, step, gx, gy, step, step);
        }
      }
      for (let i = 0; i < 160; i++) {
        const px = this._hash(i * 13, seed) % (mapDef.width - 8);
        const py = this._hash(seed, i * 19) % (mapDef.height - 8);
        const k = this._resolveCellZone(mapDef, px, py, seed);
        if (k === "tall_grass" || k === "flower_meadow") {
          ctx.fillStyle = pal.grass3;
          ctx.fillRect(px, py, 1, 3);
          ctx.fillRect(px + 2, py + 1, 1, 2);
        }
      }
    }

    // 1c. Vách đá tầng bậc 2.5D
    for (const ledge of mapDef.cliffLedges ?? []) {
      this._drawCliffLedge(ctx, ledge, pal);
    }

    // 2. Đường lát đá có bó vỉa & Đường đất mòn
    this._drawRoads(ctx, mapDef, pal);

    // 2a. Suối Nguyên Tuyền uốn lượn tự nhiên Nghi Thức Khai Khiếu (bờ rêu, cuội & đá bước 45 bước)
    if (mapDef.ritualSpring) {
      const rs = mapDef.ritualSpring;
      const sx0 = rs.startX - 24;
      const sx1 = rs.endX + 36;
      const span = Math.max(1, sx1 - sx0);
      const topY = (x) => {
        const t = Math.max(0, Math.min(1, (x - sx0) / span));
        const endTaper = (t < 0.08 ? (1 - t / 0.08) * 14 : 0) + (t > 0.9 ? ((t - 0.9) / 0.1) * 12 : 0);
        return rs.centerY - rs.halfH + Math.sin(x * 0.017) * 7 + Math.cos(x * 0.043) * 3 + endTaper;
      };
      const botY = (x) => {
        const t = Math.max(0, Math.min(1, (x - sx0) / span));
        const endTaper = (t < 0.08 ? (1 - t / 0.08) * 14 : 0) + (t > 0.9 ? ((t - 0.9) / 0.1) * 12 : 0);
        return rs.centerY + rs.halfH + Math.cos(x * 0.019 + 0.8) * 7 + Math.sin(x * 0.039) * 3 - endTaper;
      };
      const fillBrookBand = (padTop, padBot, fillStyle) => {
        ctx.fillStyle = fillStyle;
        ctx.beginPath();
        for (let x = sx0; x <= sx1; x += 12) {
          const py = topY(x) - padTop;
          if (x === sx0) ctx.moveTo(x - padTop * 0.6, rs.centerY);
          ctx.lineTo(x, py);
        }
        ctx.lineTo(sx1 + padTop * 0.7, rs.centerY);
        for (let x = sx1; x >= sx0; x -= 12) {
          ctx.lineTo(x, botY(x) + padBot);
        }
        ctx.closePath();
        ctx.fill();
      };

      // 4 lớp bờ rêu ẩm, sỏi ướt, mép nước ngọc và lòng suối Nguyên Tuyền
      fillBrookBand(9, 9, "#081a17");
      fillBrookBand(4, 4, "#13332f");
      fillBrookBand(1, 1, "#2b8a82");

      const sg = ctx.createLinearGradient(sx0, 0, sx1, 0);
      sg.addColorStop(0, "#0b3238");
      sg.addColorStop(0.24, "#12545c");
      sg.addColorStop(0.55, "#1a7574");
      sg.addColorStop(0.84, "#28968a");
      sg.addColorStop(1, "#3db89f");
      fillBrookBand(0, 0, sg);

      // Chấm ánh thủy tinh & cuội ngầm dưới lòng suối
      for (let i = 0; i < 140; i++) {
        const px = sx0 + 18 + (this._hash(i * 17, 91) % Math.max(10, span - 36));
        const ty = topY(px) + 5;
        const by = botY(px) - 5;
        if (by <= ty + 4) continue;
        const py = ty + (this._hash(91, i * 29) % Math.max(2, Math.floor(by - ty)));
        ctx.fillStyle = i % 5 === 0 ? "rgba(150, 255, 232, 0.35)" : "rgba(8, 28, 30, 0.45)";
        ctx.fillRect(Math.round(px), Math.round(py), i % 3 === 0 ? 3 : 2, 1);
      }

      // Đá cuội ven hai bờ suối uốn lượn
      const brookStone = getPropSprite("shore_stone");
      if (brookStone) {
        for (let bx = sx0 + 26; bx <= sx1 - 22; bx += 46) {
          const h = this._hash(bx, 17);
          const nY = topY(bx + (h % 14) - 7) - 3;
          const sY = botY(bx - (h % 12) + 6) + 2;
          if (h % 3 !== 0) {
            ctx.drawImage(brookStone.canvas, Math.round(bx - brookStone.anchorX), Math.round(nY - brookStone.anchorY));
          }
          if (h % 2 === 0) {
            ctx.drawImage(brookStone.canvas, Math.round(bx + 18 - brookStone.anchorX), Math.round(sY - brookStone.anchorY));
          }
        }
      }

      // Đá bước mòn rêu xanh nối tiếp theo từng bước Khai Khiếu (19px/bước)
      const milestones = new Set([10, 20, 27, 30, 40, 45]);
      for (let st = 0; st <= 45; st++) {
        const mx = Math.round(rs.startX + st * 19);
        const my = Math.round(rs.centerY + Math.sin(st * 0.55) * 4);
        const isMile = milestones.has(st);
        const sw = isMile ? 13 : 9;
        const sh = isMile ? 8 : 6;
        ctx.fillStyle = "#081c1a";
        ctx.fillRect(mx - Math.floor(sw * 0.5) - 1, my - Math.floor(sh * 0.5) - 1, sw + 2, sh + 2);
        ctx.fillStyle = isMile ? "#2d6e66" : "#244743";
        ctx.fillRect(mx - Math.floor(sw * 0.5), my - Math.floor(sh * 0.5), sw, sh);
        ctx.fillStyle = isMile ? "#69d6c2" : "#40736b";
        ctx.fillRect(mx - Math.floor(sw * 0.5) + 1, my - Math.floor(sh * 0.5) + 1, sw - 3, Math.max(2, sh - 3));
        if (isMile) {
          ctx.fillStyle = st === 27 ? "#a6fff2" : "#ffe680";
          ctx.fillRect(mx - 1, my - 1, 2, 2);
        }
      }
    }

    // 2b. Sông & Suối 2.5D
    this._drawRiversStatic(ctx, mapDef);

    // 3. Thềm đá giật cấp có bậc đá lên xuống & Sân tập
    this._drawStoneTerraces(ctx, mapDef, pal);

    // 4. Mặt hồ tự nhiên bờ rêu giật cấp 2.5D, 4 tầng độ sâu & cụm đá cuội ngẫu nhiên
    const stoneSpr1 = getPropSprite("shore_stone");
    const stoneSpr2 = getPropSprite("shore_stone_2");
    const pebbleSpr = getPropSprite("shore_pebbles");
    const shoreReedSpr = getPropSprite("reed_clump");
    for (let wi = 0; wi < (mapDef.waterRegions ?? []).length; wi++) {
      const w = mapDef.waterRegions[wi];
      const wSeed = wi * 1.7 + 0.5;
      const isLava = w.kind === "lava_pool";
      const isIce = w.kind === "ice_lake";
      const isSwamp = w.kind === "swamp_lake";

      // Bờ rêu ẩm tối & viền đất đá gọn (bỏ vành cát vàng +30px thô)
      ctx.fillStyle = isLava ? "#3b1d14" : isIce ? "#586e7d" : isSwamp ? "#212920" : "#1c361c";
      this._drawOrganicPolygon(ctx, w.x, w.y, w.rx + 9, w.ry + 7, wSeed);
      ctx.fill();

      ctx.fillStyle = isLava ? "#542a1d" : isIce ? "#738fa1" : isSwamp ? "#383428" : "#2e2920";
      this._drawOrganicPolygon(ctx, w.x, w.y, w.rx + 4, w.ry + 3, wSeed);
      ctx.fill();

      // Vách đất bờ lõm 2.5D lộ ra dọc mép Bắc mặt hồ
      ctx.fillStyle = isLava ? "#6e2916" : isIce ? "#3b515e" : isSwamp ? "#2b2720" : "#3b352a";
      this._drawOrganicPolygon(ctx, w.x, w.y, w.rx, w.ry, wSeed);
      ctx.fill();

      ctx.save();
      this._drawOrganicPolygon(ctx, w.x, w.y, w.rx, w.ry, wSeed);
      ctx.clip();

      if (isLava) {
        ctx.fillStyle = "#9e2314";
        this._drawOrganicPolygon(ctx, w.x, w.y + 3, w.rx - 1, w.ry - 2, wSeed);
        ctx.fill();
        ctx.fillStyle = "#d9571e";
        this._drawOrganicPolygon(ctx, w.x, w.y + 2, w.rx * 0.78, w.ry * 0.76, wSeed + 0.3);
        ctx.fill();
        ctx.fillStyle = "#ffaa33";
        this._drawOrganicPolygon(ctx, w.x, w.y + 1, w.rx * 0.45, w.ry * 0.42, wSeed + 0.6);
        ctx.fill();
      } else if (isIce) {
        ctx.fillStyle = "#4d89ad";
        this._drawOrganicPolygon(ctx, w.x, w.y + 3, w.rx - 1, w.ry - 2, wSeed);
        ctx.fill();
        ctx.fillStyle = "#69add1";
        this._drawOrganicPolygon(ctx, w.x, w.y + 3, w.rx * 0.75, w.ry * 0.75, wSeed + 0.4);
        ctx.fill();
      } else if (isSwamp) {
        ctx.fillStyle = "#18473f";
        this._drawOrganicPolygon(ctx, w.x, w.y + 3, w.rx - 1, w.ry - 2, wSeed);
        ctx.fill();
        ctx.fillStyle = "#0f332e";
        this._drawOrganicPolygon(ctx, w.x, w.y + 4, w.rx * 0.72, w.ry * 0.7, wSeed + 0.4);
        ctx.fill();
        ctx.fillStyle = "#08211f";
        this._drawOrganicPolygon(ctx, w.x, w.y + 4, w.rx * 0.46, w.ry * 0.45, wSeed + 0.7);
        ctx.fill();
      } else {
        // 4 tầng độ sâu ngọc bích -> huyền thanh cổ (0 radialGradient)
        ctx.fillStyle = "#1b6357";
        this._drawOrganicPolygon(ctx, w.x, w.y + 4, w.rx - 1, w.ry - 2, wSeed);
        ctx.fill();

        ctx.fillStyle = "#124d48";
        this._drawOrganicPolygon(ctx, w.x, w.y + 4, w.rx * 0.88, w.ry * 0.86, wSeed + 0.3);
        ctx.fill();

        ctx.fillStyle = "#0b3b3b";
        this._drawOrganicPolygon(ctx, w.x, w.y + 4, w.rx * 0.72, w.ry * 0.7, wSeed + 0.6);
        ctx.fill();

        ctx.fillStyle = "#07282b";
        this._drawOrganicPolygon(ctx, w.x, w.y + 4, w.rx * 0.52, w.ry * 0.5, wSeed + 0.9);
        ctx.fill();
      }
      ctx.restore();

      // Ngọn cỏ rủ lấm tấm ven mép bờ (không tạo hình tròn cứng)
      if (!isLava && !isIce) {
        for (let gi = 0; gi < 90; gi++) {
          const a = ((this._hash(gi * 29, wi + 13) % 360) * Math.PI) / 180;
          const sc = getWaterRadiusScale(a, wSeed);
          const gx = Math.round(w.x + Math.cos(a) * (w.rx + 2) * sc);
          const gy = Math.round(w.y + Math.sin(a) * (w.ry + 1) * sc);
          if (isPointOnBridgeDeck(mapDef, gx, gy, 18)) continue;
          ctx.fillStyle = gi % 2 === 0 ? "#2b5225" : "#457335";
          ctx.fillRect(gx, gy - 1, gi % 3 === 0 ? 2 : 1, 2);
        }
      }

      // Rải đá cuội & lau sậy theo cụm tự nhiên quanh hồ (tránh xếp thành vòng gạch đều)
      const clusterCount = w.rx > 160 ? 9 : 5;
      for (let ci = 0; ci < clusterCount; ci++) {
        const baseAng = (ci / clusterCount) * Math.PI * 2 + 0.35 + ((this._hash(ci, wi + 5) % 40) - 20) * 0.01;
        const members = 2 + (ci % 2);
        for (let mi = 0; mi < members; mi++) {
          const ang = baseAng + (mi - 0.5) * 0.12;
          const sc = getWaterRadiusScale(ang, wSeed);
          const radOff = 4 + (mi % 2) * 3;
          const sx = w.x + Math.cos(ang) * (w.rx + radOff) * sc;
          const sy = w.y + Math.sin(ang) * (w.ry + radOff * 0.75) * sc;
          if (isPointOnBridgeDeck(mapDef, sx, sy, 22)) continue;
          const sprPick = mi === 0 ? stoneSpr1 : mi === 1 ? stoneSpr2 : pebbleSpr;
          if (sprPick) {
            ctx.drawImage(sprPick.canvas, Math.round(sx - sprPick.anchorX), Math.round(sy - sprPick.anchorY));
          }
        }
        if (shoreReedSpr && !isLava && !isIce && ci % 2 === 1) {
          const sc = getWaterRadiusScale(baseAng, wSeed);
          const rx = w.x + Math.cos(baseAng) * (w.rx + 6) * sc;
          const ry = w.y + Math.sin(baseAng) * (w.ry + 4) * sc;
          if (!isPointOnBridgeDeck(mapDef, rx, ry, 24)) {
            ctx.drawImage(shoreReedSpr.canvas, Math.round(rx - shoreReedSpr.anchorX), Math.round(ry - shoreReedSpr.anchorY));
          }
        }
      }
    }

    // 5. Lôi Đài Tỷ Thí Cổ Điển (Gạch đá xanh đen 64x64 nứt/rêu/vết kiếm + Bát Quái Thái Cực pixel)
    const arenaArt = getArenaArtSet();
    for (const b of mapDef.buildings ?? []) {
      if (b.kind !== "arena_ring") continue;
      const rad = b.r ?? 120;
      const rx = Math.min(132, Math.round(rad * 0.94));
      const ry = Math.min(84, Math.round(rad * 0.62));
      const left = Math.round(b.x - rx);
      const top = Math.round(b.y - ry);
      const w = rx * 2;
      const h = ry * 2;

      // Bệ tường đá giật cấp bên ngoài Lôi Đài + bóng đổ
      plotRect(ctx, left - 6, top - 6, w + 14, h + 20, "rgba(5, 8, 12, 0.48)");
      plotRect(ctx, left - 4, top - 4, w + 8, h + 14, "#0d1117");
      plotRect(ctx, left - 2, top - 2, w + 4, h + 10, "#384352");
      // Tường đứng phía Nam của Lôi Đài
      plotRect(ctx, left - 2, top + h, w + 4, 8, "#1c232d");
      for (let sx = left; sx < left + w; sx += 16) {
        plotRect(ctx, sx, top + h + 1, 14, 6, ((sx >> 4) & 1) === 0 ? "#2b3544" : "#222a36");
      }

      // Lát gạch đá xanh đen 64x64 khắp mặt Lôi Đài
      ctx.save();
      ctx.beginPath();
      ctx.rect(left, top, w, h);
      ctx.clip();
      for (let py = top; py < top + h; py += 64) {
        for (let px = left; px < left + w; px += 64) {
          ctx.drawImage(arenaArt.tile64, px, py);
        }
      }
      ctx.restore();

      // Viền đồng cổ nạm góc Lôi Đài & 4 bậc đá lên xuống
      ctx.strokeStyle = "#8a682e";
      ctx.lineWidth = 2;
      ctx.strokeRect(left + 1, top + 1, w - 2, h - 2);
      for (const [cx, cy] of [[left - 3, top - 3], [left + w - 5, top - 3], [left - 3, top + h - 5], [left + w - 5, top + h - 5]]) {
        plotRect(ctx, cx, cy, 8, 8, "#0d1117");
        plotRect(ctx, cx + 1, cy + 1, 6, 6, "#9c7a3e");
      }
      // Bậc đá phía Nam & Tây
      for (let st = 0; st < 3; st++) {
        plotRect(ctx, b.x - 24, top + h + 1 + st * 3, 48, 2, st % 2 === 0 ? "#4c5869" : "#384352");
        plotRect(ctx, left - 3 - st * 3, b.y - 18, 2, 36, st % 2 === 0 ? "#4c5869" : "#384352");
      }

      // Trận Pháp Bát Quái Thái Cực ở chính giữa Lôi Đài
      const bg = arenaArt.baguaCenter;
      ctx.drawImage(bg, Math.round(b.x - bg.width * 0.5), Math.round(b.y - bg.height * 0.5));
    }

    this._terrainCache.set(mapDef.id, canvas);
    return canvas;
  }

  getMinimapSnapshot(mapDef) {
    if (this._minimapCache.has(mapDef.id)) {
      return this._minimapCache.get(mapDef.id);
    }
    const terrain = this._getTerrainCanvas(mapDef);
    const mw = 156;
    const mh = 100;
    const c = document.createElement("canvas");
    c.width = mw;
    c.height = mh;
    const mctx = c.getContext("2d");
    mctx.imageSmoothingEnabled = true;
    mctx.drawImage(terrain, 0, 0, mw, mh);
    mctx.imageSmoothingEnabled = false;

    const sx = mw / mapDef.width;
    const sy = mh / mapDef.height;

    for (const b of mapDef.buildings ?? []) {
      if (b.kind === "arena_ring") continue;
      if (b.kind === "pavilion" || b.kind === "hall" || b.kind === "stone_tower" || b.kind === "mine_entrance" || b.kind === "clan_house") {
        const bw = b.kind === "hall" ? 11 : b.kind === "clan_house" ? 9 : 8;
        const bh = b.kind === "hall" ? 8 : 6;
        mctx.fillStyle = "#2b1610";
        mctx.fillRect(Math.round(b.x * sx - bw * 0.5) - 1, Math.round(b.y * sy - bh * 0.5) - 1, bw + 2, bh + 2);
        mctx.fillStyle =
          b.kind === "pavilion"
            ? "#36506e"
            : b.kind === "clan_house"
              ? "#526985"
              : b.kind === "mine_entrance"
                ? "#7a858f"
                : "#a8382c";
        mctx.fillRect(Math.round(b.x * sx - bw * 0.5), Math.round(b.y * sy - bh * 0.5), bw, bh);
        mctx.fillStyle = "#e3bc6b";
        mctx.fillRect(Math.round(b.x * sx - 1), Math.round(b.y * sy - 1), 2, 2);
      } else if (b.kind === "bridge_stone_h" || b.kind === "wood_bridge_h") {
        mctx.fillStyle = b.kind === "bridge_stone_h" ? "#dfd8c8" : "#b86339";
        mctx.fillRect(Math.round(b.x * sx - 5), Math.round(b.y * sy - 2), 10, 4);
      } else if (b.kind === "bridge_stone_v" || b.kind === "wood_bridge_v") {
        mctx.fillStyle = b.kind === "bridge_stone_v" ? "#dfd8c8" : "#b86339";
        mctx.fillRect(Math.round(b.x * sx - 2), Math.round(b.y * sy - 5), 4, 10);
      }
    }

    for (const wf of mapDef.waterfalls ?? []) {
      mctx.fillStyle = "#85fff0";
      mctx.fillRect(Math.round(wf.x * sx - 3), Math.round(wf.y * sy - 4), 6, 8);
    }

    for (const t of mapDef.trees ?? []) {
      if (t.kind.startsWith("tall_grass") || t.kind === "fern" || t.kind === "mushroom_cluster" || t.kind.startsWith("reed_clump")) continue;
      const col = t.kind.startsWith("peach")
        ? "#f085b0"
        : t.kind.startsWith("maple")
          ? "#e05b2b"
          : t.kind.includes("osmanthus")
            ? "#f2c641"
            : t.kind.includes("snow")
              ? "#cceeff"
              : "#1a4523";
      const rad = t.kind.includes("giant") || t.kind === "ancient_banyan" ? 3 : 2;
      mctx.fillStyle = "rgba(0,0,0,0.4)";
      mctx.fillRect(Math.round(t.x * sx - rad * 0.5) + 1, Math.round(t.y * sy - rad * 0.5) + 1, rad, rad);
      mctx.fillStyle = col;
      mctx.fillRect(Math.round(t.x * sx - rad * 0.5), Math.round(t.y * sy - rad * 0.5), rad, rad);
    }

    this._minimapCache.set(mapDef.id, c);
    return c;
  }

  renderMapBase(ctx, mapDef, time, runtimeNodes = null, playerGarden = null, highlightGuId = null, breathWarn = 0) {
    const terrain = this._getTerrainCanvas(mapDef);
    ctx.drawImage(terrain, 0, 0);

    // Cổ Trận Bàn Long Bát Giác (384x244, 4 frame hoạt ảnh mạch linh khí)
    if (mapDef.biome === "abyss") {
      const fIdx = Math.floor(time * 4.5) % 4;
      const dais = getBanLongFormationDais(fIdx, breathWarn > 0);
      if (dais) {
        ctx.drawImage(dais.canvas, Math.round(640 - dais.anchorX), Math.round(295 - dais.anchorY));
      }
    }

    // Gợn sóng & tia sáng ngầm lăn tăn trên mặt Suối Nguyên Tuyền
    if (mapDef.ritualSpring) {
      const rs = mapDef.ritualSpring;
      const span = Math.max(40, rs.endX - rs.startX + 40);
      ctx.save();
      for (let i = 0; i < 55; i++) {
        const seedX = rs.startX - 10 + ((i * 89 + Math.floor(time * 22)) % span);
        const seedY = rs.centerY - rs.halfH + 10 + (this._hash(i, 47) % Math.max(8, rs.halfH * 2 - 20));
        const glint = Math.sin(time * 2.6 + i * 1.1);
        ctx.globalAlpha = 0.25 + Math.max(0, glint) * 0.4;
        ctx.fillStyle = i % 3 === 0 ? "#a6fff2" : "#52ccb5";
        ctx.fillRect(Math.round(seedX), Math.round(seedY + Math.sin(time * 1.8 + i) * 1.5), i % 2 === 0 ? 3 : 2, 1);
      }
      ctx.restore();
    }

    // Dải gợn sóng pixel chảy xuôi dòng sông (chia đoạn nguyên pixel sắc nét)
    for (let si = 0; si < (mapDef.streams ?? []).length; si++) {
      const st = mapDef.streams[si];
      const samples = sampleStreamPoints(st);
      if (samples.length < 4) continue;
      const halfW = (st.width ?? 42) * 0.5;
      const phase = time * 14;
      ctx.save();
      for (let i = 2; i < samples.length - 3; i += 4) {
        const s = samples[i];
        const s2 = samples[Math.min(samples.length - 1, i + 2)];
        const lane = Math.sin(i * 0.9 + si * 1.4) * (halfW * 0.45);
        const shift = ((phase + i * 5) % 14) - 7;
        const x1 = Math.round(s.x - s.ty * lane + s.tx * shift);
        const y1 = Math.round(s.y + s.tx * lane + s.ty * shift + 3);
        const x2 = Math.round(s2.x - s2.ty * (lane * 0.85) + s2.tx * shift);
        const y2 = Math.round(s2.y + s2.tx * (lane * 0.85) + s2.ty * shift + 3);
        if (isPointOnBridgeDeck(mapDef, x1, y1, -2) || isPointOnBridgeDeck(mapDef, x2, y2, -2)) continue;
        const shimmer = 0.24 + 0.16 * Math.sin(time * 2.4 + i);
        const col = i % 8 === 2 ? `rgba(175, 245, 232, ${shimmer.toFixed(2)})` : `rgba(92, 200, 185, ${shimmer.toFixed(2)})`;
        plotPixelLine(ctx, x1, y1, x2, y2, col, 1);
      }
      ctx.restore();
    }

    // Thác nước vách đá chảy động & bọt tung pixel trắng xóa
    for (const wf of mapDef.waterfalls ?? []) {
      const wx = Math.round(wf.x - (wf.w ?? 40) * 0.5);
      const wy = Math.round(wf.y);
      const ww = wf.w ?? 40;
      const wh = wf.h ?? 48;
      ctx.save();
      plotRect(ctx, wx - 8, wy - 4, 10, wh + 4, "#2b3036");
      plotRect(ctx, wx + ww - 2, wy - 4, 10, wh + 4, "#2b3036");
      plotRect(ctx, wx - 6, wy - 2, 6, wh, "#525c66");
      plotRect(ctx, wx + ww, wy - 2, 6, wh, "#525c66");

      plotRect(ctx, wx, wy, ww, wh, "#19a89a");
      const scroll = Math.floor(time * 54) % 12;
      for (let py = 0; py < wh; py += 4) {
        for (let px = 2; px < ww - 2; px += 5) {
          const streakY = wy + ((py + scroll + (px % 7)) % Math.max(4, wh - 4));
          plotRect(ctx, wx + px, streakY, 2, 5, px % 10 === 2 ? "#e8ffff" : "#78f5e1");
        }
      }
      const pulse = Math.round(1 + Math.sin(time * 6) * 1.5);
      fillPixelEllipse(ctx, wf.x, wy + wh, Math.round(ww * 0.62) + pulse, 7, "rgba(225, 255, 250, 0.72)", true);
      ctx.restore();
    }

    // Điểm Bãi Thú trên mặt đất (pixel ellipse dithered + chữ pixel sắc cạnh)
    for (const sp of mapDef.beastSpots ?? []) {
      ctx.save();
      const col = sp.tier === "boss" ? "#b86bff" : sp.tier === "elite" ? "#d0573c" : "#5fbf8a";
      ctx.globalAlpha = 0.55;
      plotPixelEllipse(ctx, sp.x, sp.y, sp.r, Math.round(sp.r * 0.58), col, 4, 0);
      ctx.globalAlpha = 0.9;
      ctx.font = "700 8px 'Be Vietnam Pro', sans-serif";
      drawCrispPixelText(ctx, sp.label, sp.x, sp.y - Math.round(sp.r * 0.58) - 4, col, "#07090d");
      ctx.restore();
    }

    // Mặt hồ lấp lánh, bong bóng dung nham / đầm lầy, tinh băng & lá sen (100% Pixel Nguyên)
    for (const w of mapDef.waterRegions ?? []) {
      ctx.save();
      if (w.kind === "lava_pool") {
        for (let i = 0; i < 12; i++) {
          const a = i * 0.55;
          const sx = w.x + Math.cos(a + time * 0.18) * (w.rx * 0.58);
          const sy = w.y + Math.sin(a * 1.15 - time * 0.12) * (w.ry * 0.48);
          const pop = Math.abs(Math.sin(time * 2.5 + i));
          plotRect(ctx, sx, sy - pop * 4, 4, 4, pop > 0.6 ? "#fff099" : "#ff9b26");
        }
        ctx.restore();
        continue;
      }
      if (w.kind === "swamp_lake") {
        for (let i = 0; i < 14; i++) {
          const a = i * 0.47;
          const sx = Math.round(w.x + Math.cos(a + time * 0.08) * (w.rx * 0.62));
          const sy = Math.round(w.y + Math.sin(a * 1.2 + time * 0.07) * (w.ry * 0.54));
          const bub = (time * 1.3 + i * 0.4) % 1;
          plotPixelEllipse(ctx, sx, sy - bub * 6, Math.round(2 + bub * 3), Math.round(2 + bub * 3), `rgba(130, 255, 160, ${((1 - bub) * 0.72).toFixed(2)})`);
        }
        ctx.restore();
        continue;
      }
      if (w.kind === "ice_lake") {
        for (let i = 0; i < 12; i++) {
          const a = i * 0.52;
          const sx = Math.round(w.x + Math.cos(a) * (w.rx * 0.62));
          const sy = Math.round(w.y + Math.sin(a * 1.1) * (w.ry * 0.52));
          if (Math.sin(time * 3 + i) > 0.25) {
            plotRect(ctx, sx - 2, sy, 5, 1, "#ffffff");
            plotRect(ctx, sx, sy - 2, 1, 5, "#ffffff");
          }
        }
        ctx.restore();
        continue;
      }
      for (let i = 0; i < 14; i++) {
        const a = i * 0.52;
        const sx = Math.round(w.x + Math.cos(a + time * 0.09) * (w.rx * 0.62));
        const sy = Math.round(w.y + 4 + Math.sin(a * 1.2 + time * 0.07) * (w.ry * 0.5));
        plotRect(ctx, sx, sy, i % 3 === 0 ? 4 : 2, 1, "rgba(165, 245, 232, 0.34)");
        if (Math.sin(time * 2.5 + i * 1.6) > 0.45) {
          plotRect(ctx, sx + 8, sy - 5, 1, 1, "rgba(235, 255, 248, 0.7)");
        }
      }

      if (w.kind === "pond" || w.kind === "lake") {
        const koiCount = w.kind === "lake" ? 5 : 3;
        for (let fi = 0; fi < koiCount; fi++) {
          const ang = time * (0.28 + fi * 0.06) + fi * 1.9;
          const fx = w.x - (w.kind === "pond" ? w.rx * 0.14 : 0) + Math.cos(ang) * (w.rx * 0.42);
          const fy = w.y + 4 + Math.sin(ang * 1.4) * (w.ry * 0.36);
          const dirX = -Math.sin(ang) >= 0 ? 1 : -1;
          plotRect(ctx, fx - dirX, fy, 4, 2, fi % 2 === 0 ? "#e06838" : "#d98c3b");
          plotRect(ctx, fx, fy, 2, 1, "#ffd470");
          const tailWag = Math.round(Math.sin(time * 9 + fi));
          plotRect(ctx, fx - dirX * 3, fy + tailWag, 2, 1, "#b84523");
        }

        const pads =
          w.kind === "lake"
            ? [
                [w.x - w.rx * 0.52, w.y + w.ry * 0.42, true],
                [w.x - w.rx * 0.44, w.y + w.ry * 0.48, false],
                [w.x + w.rx * 0.55, w.y + w.ry * 0.34, true],
                [w.x + w.rx * 0.66, w.y - w.ry * 0.14, true],
              ]
            : [
                [w.x - w.rx * 0.52, w.y - w.ry * 0.18, true],
                [w.x - w.rx * 0.36, w.y - w.ry * 0.28, false],
                [w.x - w.rx * 0.46, w.y + w.ry * 0.36, true],
                [w.x - w.rx * 0.28, w.y + w.ry * 0.44, false],
                [w.x + w.rx * 0.12, w.y + w.ry * 0.48, false],
              ];
        for (let pi = 0; pi < pads.length; pi++) {
          const [px0, py0, hasFlower] = pads[pi];
          const px = Math.round(px0);
          const py = Math.round(py0 + Math.sin(time * 1.8 + pi) * 0.8);
          fillPixelEllipse(ctx, px, py + 1, 9, 5, "#184222");
          fillPixelEllipse(ctx, px, py, 8, 4, "#347d43");
          plotRect(ctx, px - 4, py - 2, 5, 2, "#52ab5e");
          if (hasFlower) {
            plotRect(ctx, px - 3, py - 4, 6, 4, "#d96b96");
            plotRect(ctx, px - 2, py - 5, 4, 3, "#ffc4dc");
            plotRect(ctx, px - 1, py - 4, 2, 1, "#ffe066");
          }
        }
      }
      ctx.restore();
    }

    // Mặt cầu & bến câu cá nằm dưới chân nhân vật (vẽ sau mặt sông để bắc ngang phía trên nước)
    for (const b of mapDef.buildings ?? []) {
      if (!isBridgeKind(b.kind)) continue;
      const spr = getPropSprite(b.kind);
      if (spr) ctx.drawImage(spr.canvas, Math.round(b.x - spr.anchorX), Math.round(b.y - spr.anchorY));
      const glowPts =
        b.kind === "wood_pier"
          ? [[-34, -15]]
          : b.kind === "wood_pier_n"
            ? [[11, -35]]
            : b.kind === "wood_pier_s"
              ? [[11, 26]]
              : b.kind === "wood_bridge_v"
                ? [[-20, -4], [20, -4]]
                : b.kind === "wood_bridge_h"
                  ? [[0, -18]]
                  : [];
      if (glowPts.length > 0) {
        const glowSpr = getDitherGlowSprite("#ffcb6b", 12, 0.36);
        for (const [lx, ly] of glowPts) {
          ctx.drawImage(glowSpr, Math.round(b.x + lx - glowSpr.width * 0.5), Math.round(b.y + ly - glowSpr.height * 0.5));
        }
      }
      if (b.label && (b.kind === "bridge_stone_v" || b.kind === "wood_bridge_v")) {
        ctx.save();
        ctx.font = "700 8px 'Be Vietnam Pro', sans-serif";
        drawCrispPixelText(ctx, b.label, b.x, b.y + 3, "#e4ebf5", "#07090d");
        ctx.restore();
      }
    }

    // Cổng 128x160 được Y-sort trong collectDrawableProps (không vẽ vòng tròn dưới đất)

    // Điểm thu thập
    const nodes = runtimeNodes ?? mapDef.gatherNodes ?? [];
    for (const g of nodes) {
      if (g.cooldown > 0 && g.kind !== "spirit_spring" && g.kind !== "herb_plot") continue;
      ctx.save();
      if (g.kind === "spirit_spring") {
        const spr = getPropSprite("spirit_spring");
        if (spr) ctx.drawImage(spr.canvas, Math.round(g.x - spr.anchorX), Math.round(g.y - spr.anchorY));
        for (let i = 0; i < 4; i++) {
          const px = Math.round(g.x - 10 + i * 7 + Math.sin(time * 2.4 + i) * 3);
          const py = Math.round(g.y - 6 - ((time * 12 + i * 7) % 14));
          plotRect(ctx, px, py, 2, 2, i % 2 === 0 ? "#a6fff2" : "#ffd97d");
        }
        ctx.font = "700 8px 'Be Vietnam Pro', sans-serif";
        drawCrispPixelText(ctx, g.label, g.x, g.y - 26, "#5ef2d6", "#06090d");
      } else if (g.kind === "herb_plot") {
        const plot = playerGarden?.[g.plotIndex] ?? { state: "empty", timer: 0, watered: false };
        const sprName = plot.state === "ready" ? "herb_plot_ready" : plot.state === "growing" ? "herb_plot_growing" : "herb_plot_empty";
        const spr = getPropSprite(sprName);
        if (spr) ctx.drawImage(spr.canvas, Math.round(g.x - spr.anchorX), Math.round(g.y - spr.anchorY));
        if (plot.state === "growing" && plot.watered) {
          plotRect(ctx, g.x - 16, g.y - 11, 32, 12, "rgba(18, 66, 78, 0.28)");
        }
        ctx.font = "700 8px 'Be Vietnam Pro', sans-serif";
        if (plot.state === "growing") {
          drawCrispPixelText(ctx, `${Math.ceil(plot.timer)}s`, g.x, g.y - 13, plot.watered ? "#7ee8f7" : "#d8e3f0", "#06090d");
        } else if (plot.state === "ready") {
          drawCrispPixelText(ctx, "Thu hoạch", g.x, g.y - 14, "#7effb0", "#06090d");
        }
      } else if (g.kind === "fish") {
        const rx = Math.round(11 + Math.sin(time * 3) * 2);
        plotPixelEllipse(ctx, g.x, g.y, rx, 5, "rgba(255, 248, 204, 0.85)");
        plotRect(ctx, g.x - 1, g.y - 4, 3, 5, "#d0573c");
        plotRect(ctx, g.x - 1, g.y - 4, 3, 2, "#ffffff");
      } else if (g.kind === "herb") {
        plotRect(ctx, g.x - 6, g.y - 3, 12, 6, "#22572e");
        plotRect(ctx, g.x - 4, g.y - 7, 3, 5, "#73eb5e");
        plotRect(ctx, g.x + 1, g.y - 6, 3, 4, "#73eb5e");
        plotRect(ctx, g.x - 1, g.y - 8, 2, 2, "#fff3b0");
      } else if (g.kind === "mine") {
        plotRect(ctx, g.x - 10, g.y - 7, 20, 12, "#3f464d");
        plotRect(ctx, g.x - 8, g.y - 9, 15, 9, "#626d78");
        plotRect(ctx, g.x - 4, g.y - 5, 4, 4, "#d9b25f");
        plotRect(ctx, g.x + 2, g.y - 3, 3, 3, "#d9b25f");
      } else if (g.kind === "wild_gu") {
        const isTarget = Boolean(highlightGuId && g.guId === highlightGuId);
        const bobX = Math.round(Math.sin(time * 2.8 + g.x) * 3);
        const bobY = Math.round(Math.cos(time * 3.4 + g.y) * 2);
        plotPixelEllipse(ctx, g.x, g.y + 4, Math.round(12 + Math.sin(time * 5) * 1.5), 6, isTarget ? "#ffe15c" : "#5ef2d6", 2, Math.floor(time * 4));
        const guCanvas = getGuPixelCanvas(g.guId);
        ctx.drawImage(guCanvas, Math.round(g.x + bobX - 12), Math.round(g.y + bobY - 14), 24, 24);
        ctx.font = "700 8px 'Be Vietnam Pro', sans-serif";
        drawCrispPixelText(ctx, g.label, g.x, g.y - 16, isTarget ? "#ffe15c" : "#80ffcf", "#06090d");
      }
      ctx.restore();
    }
  }

  /**
   * Trả về danh sách công trình, cổng 128x160, trụ lửa & cờ Lôi Đài, lan can cầu Nam & cây cối để Y-sort.
   */
  collectDrawableProps(mapDef) {
    const list = [];
    for (const b of mapDef.buildings ?? []) {
      if (b.kind === "arena_ring") {
        const rad = b.r ?? 120;
        const rx = Math.min(132, Math.round(rad * 0.94));
        const ry = Math.min(84, Math.round(rad * 0.62));
        for (const [cx, cy] of [
          [b.x - rx - 6, b.y - ry + 6],
          [b.x + rx + 6, b.y - ry + 6],
          [b.x - rx - 6, b.y + ry + 6],
          [b.x + rx + 6, b.y + ry + 6],
        ]) {
          list.push({ kind: "arena_brazier", x: cx, y: cy, sortY: cy });
        }
        list.push({ kind: "clan_banner", x: b.x - rx + 24, y: b.y - ry + 2, sortY: b.y - ry + 2 });
        list.push({ kind: "clan_banner", x: b.x + rx - 24, y: b.y - ry + 2, sortY: b.y - ry + 2 });
        if (b.label) {
          list.push({ kind: "arena_label", x: b.x, y: b.y - ry - 10, label: b.label, sortY: b.y - ry - 10 });
        }
        continue;
      }
      if (b.kind.startsWith("wood_pier") || b.kind === "bridge_stone_v" || b.kind === "wood_bridge_v") continue;
      if (b.kind === "bridge_stone_h" || b.kind === "wood_bridge_h") {
        list.push({ kind: `${b.kind}_front`, x: b.x, y: b.y, label: b.label, sortY: b.y + 18 });
        continue;
      }
      list.push({ kind: b.kind, x: b.x, y: b.y, label: b.label, sortY: b.y });
    }
    for (const p of mapDef.portals ?? []) {
      const defaultGate =
        mapDef.biome === "stalactite_cave" || mapDef.biome === "volcanic" || mapDef.biome === "abyss"
          ? "gate_cave"
          : mapDef.biome === "forest" || mapDef.biome === "bamboo" || mapDef.biome === "swamp"
            ? "gate_forest"
            : "gate_mountain";
      const style = p.gateStyle || defaultGate;
      const gateDir =
        p.x < 240
          ? "west"
          : p.x > mapDef.width - 240 || mapDef.id === "giac_mo"
            ? "east"
            : p.y < 240
              ? "north"
              : "south";
      if (gateDir === "west" || gateDir === "east") {
        list.push({
          kind: style,
          x: p.x,
          y: p.y,
          gateDir,
          gateLayer: "back",
          mapW: mapDef.width,
          sortY: p.y - 26,
        });
        list.push({
          kind: style,
          x: p.x,
          y: p.y,
          gateDir,
          gateLayer: "front",
          label: p.label,
          mapW: mapDef.width,
          sortY: p.y + 30,
        });
      } else {
        list.push({
          kind: style,
          x: p.x,
          y: p.y,
          gateDir: "ns",
          gateLayer: "full",
          label: p.label,
          mapW: mapDef.width,
          sortY: p.y + 2,
        });
      }
    }
    for (const t of mapDef.trees ?? []) {
      list.push({ kind: t.kind, x: t.x, y: t.y, sortY: t.y });
    }
    return list;
  }

  _resolveBuildingSpriteKind(prop) {
    const k = prop.kind;
    const lbl = prop.label || "";
    if (k === "clan_house") {
      if (/Dược|Thợ Săn/i.test(lbl)) return "clan_house_herb";
      if (/Trà|Tửu|Kho/i.test(lbl)) return "clan_house_tea";
      return "clan_house";
    }
    if (k === "hall") {
      if (/Tàng Kinh|Thương Hội/i.test(lbl)) return "hall_jade";
      if (/Huyết Lô/i.test(lbl)) return "hall_blood";
      return "hall";
    }
    if (k === "pavilion") {
      if (/Chân Dương/i.test(lbl)) return "pavilion_gold";
      return "pavilion";
    }
    return k;
  }

  drawSingleProp(ctx, prop, time = 0) {
    if (prop.kind === "arena_label") {
      ctx.save();
      ctx.font = "700 8.5px 'Be Vietnam Pro', sans-serif";
      drawCrispPixelText(ctx, prop.label, prop.x, prop.y, "#ffd257", "#06090d");
      ctx.restore();
      return;
    }

    if (prop.kind === "arena_brazier") {
      const art = getArenaArtSet();
      const fIdx = Math.floor(time * 7 + prop.x * 0.1) % art.braziers.length;
      const spr = art.braziers[fIdx];
      if (spr) ctx.drawImage(spr.canvas, Math.round(prop.x - spr.anchorX), Math.round(prop.y - spr.anchorY));
      return;
    }

    if (prop.kind === "clan_banner") {
      const art = getArenaArtSet();
      const fIdx = Math.floor(time * 6 + prop.x * 0.1) % art.banners.length;
      const spr = art.banners[fIdx];
      if (spr) ctx.drawImage(spr.canvas, Math.round(prop.x - spr.anchorX), Math.round(prop.y - spr.anchorY));
      return;
    }

    if (prop.kind === "gate_mountain" || prop.kind === "gate_forest" || prop.kind === "gate_cave" || prop.kind === "gate_ban_long") {
      const fIdx = Math.floor(time * 4 + prop.x * 0.05) % 4;
      const gateSpr =
        prop.kind === "gate_ban_long"
          ? getBanLongGateSprite(fIdx)
          : getPortalGateSprite(prop.kind, fIdx, prop.gateDir || "ns", prop.gateLayer || "full");
      if (gateSpr) {
        const dx = Math.round(prop.x - gateSpr.anchorX);
        const dy = Math.round(prop.y - gateSpr.anchorY);
        ctx.drawImage(gateSpr.canvas, dx, dy);
        if (prop.label) {
          ctx.save();
          ctx.font = "700 8px 'Be Vietnam Pro', sans-serif";
          const tw = Math.ceil(ctx.measureText(prop.label).width);
          const pw = tw + 12;
          const maxMapW = prop.mapW || 1280;
          const bx = Math.max(6, Math.min(maxMapW - pw - 6, Math.round(prop.x - pw * 0.5)));
          const by = Math.max(4, dy + (prop.gateDir === "west" || prop.gateDir === "east" ? 0 : -6));
          plotRect(ctx, bx - 1, by - 1, pw + 2, 14, "#06080d");
          plotRect(ctx, bx, by, pw, 12, "#141a21");
          plotRect(ctx, bx, by, pw, 1, "#9c7a44");
          plotRect(ctx, bx, by + 11, pw, 1, "#594322");
          drawCrispPixelText(ctx, prop.label, bx + Math.round(pw * 0.5), by + 9, "#a6fff2", "#06080d");
          ctx.restore();
        }
      }
      return;
    }

    if (
      prop.kind === "ban_long_statue" ||
      prop.kind === "ban_long_brazier" ||
      prop.kind === "ban_long_cloud_pillar" ||
      prop.kind === "ban_long_ruin_wall"
    ) {
      const frames = getBanLongPropFrames(prop.kind);
      const fIdx = Math.floor(time * 4.5 + prop.x * 0.05) % Math.max(1, frames.length);
      const spr = frames[fIdx] ?? frames[0];
      if (!spr) return;
      ctx.drawImage(spr.canvas, Math.round(prop.x - spr.anchorX), Math.round(prop.y - spr.anchorY));
      if (prop.kind === "ban_long_brazier") {
        const glow = getDitherGlowSprite("#5ef2d6", 15, 0.34);
        ctx.drawImage(glow, Math.round(prop.x - glow.width * 0.5), Math.round(prop.y - 58 - glow.height * 0.5));
      } else if (prop.kind === "ban_long_statue") {
        const glow = getDitherGlowSprite("#ffd06b", 10, 0.24);
        ctx.drawImage(glow, Math.round(prop.x - glow.width * 0.5), Math.round(prop.y - 100 - glow.height * 0.5));
      }
      return;
    }

    let kind = this._resolveBuildingSpriteKind(prop);
    if ((kind === "peach" || kind === "pine" || kind === "maple") && Math.round(prop.x + prop.y) % 2 === 1) {
      kind = `${kind}_2`;
    }
    const spr = getPropSprite(kind);
    if (!spr) return;
    const drawX = Math.round(prop.x - spr.anchorX);
    const drawY = Math.round(prop.y - spr.anchorY);
    ctx.drawImage(spr.canvas, drawX, drawY);

    // Ánh đèn lồng ấm & khói pixel tĩnh u tịch (ánh sáng hoàng hôn cố định)
    const isArch =
      kind.startsWith("hall") ||
      kind.startsWith("pavilion") ||
      kind.startsWith("clan_house") ||
      kind === "stone_tower" ||
      kind === "mine_entrance";
    if (isArch) {
      const lanterns = kind.startsWith("hall")
        ? [[-34, -52], [34, -52]]
        : kind.startsWith("pavilion")
          ? [[-36, -42], [36, -42]]
          : kind.startsWith("clan_house")
            ? [[-21, -37], [21, -37]]
            : kind === "mine_entrance"
              ? [[0, -32]]
              : [];
      if (lanterns.length > 0) {
        const glowSpr = getDitherGlowSprite("#ffd06b", 12, 0.36);
        for (const [lx, ly] of lanterns) {
          ctx.drawImage(glowSpr, Math.round(prop.x + lx - glowSpr.width * 0.5), Math.round(prop.y + ly - glowSpr.height * 0.5));
        }
      }
      if (kind === "hall_jade" || kind === "clan_house_herb") {
        ctx.save();
        const smokeCol = kind === "hall_jade" ? "#9fffe8" : "#e8f5df";
        for (let s = 0; s < 3; s++) {
          const ph = ((time * 0.55 + s * 0.33 + prop.x * 0.01) % 1);
          const sx = Math.round(prop.x + (kind === "hall_jade" ? 0 : -24) + Math.sin(ph * 6 + s) * 2.5);
          const sy = Math.round(prop.y - (kind === "hall_jade" ? 14 : 20) - ph * 14);
          ctx.globalAlpha = (1 - ph) * 0.52;
          plotRect(ctx, sx, sy, 2, 2, smokeCol);
        }
        ctx.restore();
      }
    }

    if (kind === "stone_lamp" || kind === "lantern" || kind === "campfire") {
      const glowSpr = getDitherGlowSprite("#ffd06b", kind === "campfire" ? 16 : 12, 0.38);
      const pts =
        kind === "stone_lamp"
          ? [[0, -28]]
          : kind === "lantern"
            ? [[-13, -31], [13, -31]]
            : [[0, -14]];
      for (const [lx, ly] of pts) {
        ctx.drawImage(glowSpr, Math.round(prop.x + lx - glowSpr.width * 0.5), Math.round(prop.y + ly - glowSpr.height * 0.5));
      }
    } else if (kind === "incense_burner") {
      ctx.save();
      for (let s = 0; s < 3; s++) {
        const ph = (time * 0.48 + s * 0.33 + prop.x * 0.02) % 1;
        const sx = Math.round(prop.x + Math.sin(ph * 6.2 + s * 2) * 2.5);
        const sy = Math.round(prop.y - 34 - ph * 16);
        ctx.globalAlpha = (1 - ph) * 0.48;
        plotRect(ctx, sx, sy, 2, 2, s % 2 === 0 ? "#c8dbd5" : "#9be0d4");
      }
      ctx.restore();
    }

    if (prop.label) {
      ctx.save();
      ctx.font = "700 8px 'Be Vietnam Pro', sans-serif";
      if (kind === "bridge_stone_h_front" || kind === "wood_bridge_h_front") {
        drawCrispPixelText(ctx, prop.label, prop.x, prop.y + 28, "#e4ebf5", "#06090d");
      } else if (isArch) {
        const labelY = Math.round(prop.y - spr.anchorY - 5);
        const tw = Math.ceil(ctx.measureText(prop.label).width);
        const pw = tw + 12;
        const px = Math.round(prop.x - pw * 0.5);
        const py = labelY - 9;
        plotRect(ctx, px - 1, py - 1, pw + 2, 14, "#06080d");
        plotRect(ctx, px, py, pw, 12, "rgba(12, 16, 24, 0.92)");
        plotRect(ctx, px, py, pw, 1, "#6b552e");
        drawCrispPixelText(ctx, prop.label, prop.x, labelY, "#e4ebf5", "#06090d");
      } else {
        drawCrispPixelText(ctx, prop.label, prop.x, prop.y + 12, "#e4ebf5", "#06090d");
      }
      ctx.restore();
    }
  }

  /**
   * Vẽ lớp tiền cảnh (mái cổng Sơn Môn Paifang & đốm sáng đom đóm nhỏ bay trên thảm cỏ/suối).
   */
  renderMapForeground(ctx, mapDef, time = 0) {
    const glowLamp = getDitherGlowSprite("#ffd06b", 10, 0.34);
    for (const b of mapDef.buildings ?? []) {
      if (b.kind !== "stone_arch") continue;
      const topSpr = getPropSprite("stone_arch_top");
      if (topSpr) {
        ctx.drawImage(topSpr.canvas, Math.round(b.x - topSpr.anchorX), Math.round(b.y - topSpr.anchorY));
        for (const lx of [-24, 24]) {
          ctx.drawImage(glowLamp, Math.round(b.x + lx - glowLamp.width * 0.5), Math.round(b.y - 52 - glowLamp.height * 0.5));
        }
      }
    }

    if (mapDef.ritualSpring) {
      const rs = mapDef.ritualSpring;
      const glowGold = this._getFireflyGlowSprite("#ffe875");
      const glowLime = this._getFireflyGlowSprite("#d4ff7a");
      const glowJade = this._getFireflyGlowSprite("#85ffe0");
      const springAura = getDitherGlowSprite("#5ef2d6", 72, 0.16);

      ctx.save();
      ctx.drawImage(springAura, Math.round(rs.endX + 10 - springAura.width * 0.5), Math.round(rs.centerY - springAura.height * 0.5));

      const drawTinyFirefly = (fx, fy, pulse, idx) => {
        if (pulse < 0.08) return;
        const isJade = idx % 5 === 0;
        const glowSpr = isJade ? glowJade : idx % 2 === 0 ? glowGold : glowLime;
        const coreCol = isJade ? "#e8fff7" : "#fffbe0";
        ctx.globalAlpha = pulse * 0.55;
        ctx.drawImage(glowSpr, Math.round(fx - glowSpr.width * 0.5), Math.round(fy - glowSpr.height * 0.5));
        ctx.globalAlpha = Math.min(1, 0.35 + pulse * 0.65);
        ctx.fillStyle = coreCol;
        const coreW = pulse > 0.78 && idx % 4 === 0 ? 2 : 1;
        ctx.fillRect(Math.round(fx), Math.round(fy), coreW, 1);
      };

      for (let i = 0; i < 210; i++) {
        const bx = 38 + (this._hash(i * 19, 103) % Math.max(40, mapDef.width - 76));
        const band = i % 10;
        let by;
        if (band < 4) by = 88 + (this._hash(107, i * 23) % 94);
        else if (band < 8) by = 294 + (this._hash(113, i * 29) % 156);
        else by = 92 + (this._hash(127, i * 31) % Math.max(40, mapDef.height - 170));
        const ph = i * 1.37;
        const fx = bx + Math.sin(time * (0.75 + (i % 5) * 0.18) + ph) * (6 + (i % 4) * 2);
        const fy = by + Math.cos(time * (0.9 + (i % 4) * 0.22) + ph * 1.3) * 5 - ((time * (0.6 + (i % 3) * 0.35) + i * 7) % 14) * 0.4;
        const pulse = Math.pow(0.5 + 0.5 * Math.sin(time * (1.4 + (i % 5) * 0.35) + i * 2.1), 2.3);
        drawTinyFirefly(fx, fy, pulse, i);
      }

      const streamSpan = Math.max(40, rs.endX - rs.startX + 48);
      for (let i = 0; i < 145; i++) {
        const biasT = Math.pow((this._hash(i * 37, 211) % 1000) / 1000, 0.85);
        const bx = rs.startX - 10 + biasT * streamSpan;
        const by = rs.centerY - rs.halfH - 8 + (this._hash(223, i * 41) % (rs.halfH * 2 + 16));
        const ph = i * 1.91;
        const fx = bx + Math.sin(time * (1.05 + (i % 4) * 0.25) + ph) * 8;
        const fy = by + Math.cos(time * (1.25 + (i % 3) * 0.3) + ph * 1.2) * 5 - ((time * 0.9 + i * 5) % 12) * 0.35;
        const rawPulse = Math.pow(0.5 + 0.5 * Math.sin(time * (1.6 + (i % 5) * 0.32) + i * 1.7), 2.1);
        drawTinyFirefly(fx, fy, Math.min(1, rawPulse * (0.85 + biasT * 0.35)), i + (biasT > 0.65 ? 5 : 2));
      }
      ctx.restore();

      const sx0 = rs.startX - 24;
      const sx1 = rs.endX + 36;
      const span = Math.max(1, sx1 - sx0);
      const marks = [
        [10, "10 · Đinh", "#c9b091"],
        [20, "20 · Bính", "#5ef2d6"],
        [27, "27 · Phương Nguyên", "#a6fff2"],
        [30, "30 · Ất", "#7be3ad"],
        [40, "40 · Giáp", "#f2c14e"],
        [45, "45", "#ffe680"],
      ];
      ctx.save();
      ctx.font = "700 8px 'Be Vietnam Pro', sans-serif";
      for (const [st, lbl, col] of marks) {
        const mx = Math.round(rs.startX + st * 19);
        const t = Math.max(0, Math.min(1, (mx - sx0) / span));
        const endTaper = (t < 0.08 ? (1 - t / 0.08) * 14 : 0) + (t > 0.9 ? ((t - 0.9) / 0.1) * 12 : 0);
        const bankTopY = rs.centerY - rs.halfH + Math.sin(mx * 0.017) * 7 + Math.cos(mx * 0.043) * 3 + endTaper;
        const labelY = Math.round(bankTopY - 11);
        const tw = Math.ceil(ctx.measureText(lbl).width);
        const bw = tw + 6;
        const bx = mx - Math.ceil(tw * 0.5) - 3;
        plotRect(ctx, bx, labelY - 8, bw, 11, "rgba(6, 16, 15, 0.9)");
        plotRect(ctx, bx, labelY - 8, bw, 1, "rgba(94, 242, 214, 0.45)");
        drawCrispPixelText(ctx, lbl, mx, labelY, col, "#040a09");
      }
      ctx.restore();
    }

    // Sương mù pixel nhẹ trôi dưới chân tại Cổ Đàn Bàn Long
    if (mapDef.biome === "abyss") {
      ctx.save();
      for (let i = 0; i < 12; i++) {
        const spr = getBanLongMistSprite(i % 3);
        const baseY = 175 + ((i * 53) % 520);
        const speed = 9 + (i % 3) * 4;
        const rawX = ((this._hash(i * 17, 31) % mapDef.width) + time * speed) % (mapDef.width + 160) - 80;
        const mx = Math.round(rawX - spr.width * 0.5);
        const my = Math.round(baseY + Math.sin(time * 0.65 + i) * 4 - spr.height * 0.5);
        ctx.globalAlpha = 0.6;
        ctx.drawImage(spr, mx, my);
      }
      ctx.restore();
    }
  }
}
