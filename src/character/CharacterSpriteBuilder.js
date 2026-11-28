/**
 * Bộ sinh Sprite Nhân Vật Pixel Art Chibi Cổ Phong 64x64 (Chuẩn Cổ Tiên Lộ · Mẫu Hắc Bào Trâm Ngọc).
 * - Lưới 64x64 nguyên pixel (pivot [32, 59]), viền Dark Selective Outline (#0d0a10 / #141018), đầu ~43% chiều cao.
 * - Xuất 9 bộ animation: `idle` (4f), `run` (6f), `attack` (4f), `dash` (3f), `sit` (4f), `fish` (2f), `hurt` (2f), `death` (4f), `tau-hoa` (4f).
 * - Tôn trọng imageSmoothingEnabled = false, 0 SVG, 0 ctx.arc / ctx.ellipse / đường cong mượt.
 */
import {
  applySelectiveOutline,
  createPixelCanvas,
  fillPixelEllipse,
  plotPixelEllipse,
  plotRect,
} from "../engine/PixelSpriteBaker.js";
import { drawSheetFrame, getSheetFrameIndex } from "../engine/SpriteSheet.js";

export const SKIN_TONES = [
  { id: "tai_bach", name: "Tái Bạch Cổ Phong", base: "#f6e4dc", mid: "#e4dad3", shadow: "#cda39a", highlight: "#ffffff" },
  { id: "bach_ngoc", name: "Bạch Ngọc", base: "#f5dec8", mid: "#e6c7ad", shadow: "#cfa888", highlight: "#fff3e6" },
  { id: "phan_hong", name: "Phấn Hồng", base: "#f2cabe", mid: "#deae9e", shadow: "#c49084", highlight: "#ffe6de" },
  { id: "dong_co", name: "Đồng Cổ", base: "#d49e72", mid: "#ba855a", shadow: "#9c6b43", highlight: "#ebbc94" },
  { id: "bang_tuyet", name: "Băng Tuyết", base: "#dfe8f4", mid: "#c1cfe3", shadow: "#a1b3cc", highlight: "#f6faff" },
  { id: "huyen_mach", name: "Huyền Mạch", base: "#8c7268", mid: "#735b52", shadow: "#59453e", highlight: "#b3968a" },
];

export const HAIR_STYLES = [
  { id: "co_nguyet_phat", name: "Trường Phát Xõa Rối (Nguyên Tác)" },
  { id: "tien_phong", name: "Trường Phát Xõa" },
  { id: "hiep_khach", name: "Tóc Buộc Cao" },
  { id: "kiem_khach", name: "Tóc Ngắn Kiếm Khách" },
  { id: "linh_dong", name: "Song Hoàn Linh Đồng" },
  { id: "cuong_ma", name: "Cuồng Phát Tà Vương" },
  { id: "kho_tu", name: "Đầu Trần Chu Sa" },
];

export const HAIR_COLORS = [
  { id: "den_huyen", name: "Đen Huyền Mặc", base: "#24232d", dark: "#13121a", light: "#3b3847", tip: "#4d495c" },
  { id: "bach_phat", name: "Bạch Phát", base: "#dde4f0", dark: "#96a2b8", light: "#f4f7ff", tip: "#ffffff" },
  { id: "do_huyet", name: "Đỏ Huyết", base: "#c92845", dark: "#781326", light: "#eb4c68", tip: "#ff8096" },
  { id: "xanh_bang", name: "Xanh Băng", base: "#3db8d9", dark: "#1d6b87", light: "#6fd4f0", tip: "#b0f2ff" },
  { id: "tim_u_minh", name: "Tím U Minh", base: "#8c42d6", dark: "#4c1d82", light: "#ad69f0", tip: "#d6adff" },
  { id: "vang_kim", name: "Hoàng Kim", base: "#e0b038", dark: "#8f6814", light: "#f2ca5e", tip: "#ffeaa3" },
  { id: "luc_doc", name: "Lục Độc", base: "#47bd6b", dark: "#206e39", light: "#6dd98e", tip: "#a8f7c0" },
  { id: "hong_dao", name: "Hồng Đào", base: "#e374a8", dark: "#913863", light: "#f59bc5", tip: "#ffcce4" },
];

export const HEADGEARS = [
  { id: "none", name: "Không Đội" },
  { id: "tram_ngoc", name: "Trâm Ngọc Bích Nhạt" },
  { id: "ngoc_quan", name: "Ngọc Quán Đạo Sư" },
  { id: "dau_lap", name: "Đấu Lạp Giang Hồ" },
  { id: "anh_sat", name: "Khăn Bịt Mặt Ảnh" },
  { id: "sung_ma", name: "Sừng Huyết Ma" },
  { id: "kim_co", name: "Vòng Kim Cô" },
];

export const OUTFIT_STYLES = [
  { id: "hac_bao_co", name: "Hắc Bào Xẻ Vạt Cổ Trang" },
  { id: "truong_bao", name: "Trường Bào Cổ Sư" },
  { id: "doan_y", name: "Đoản Y Thích Khách" },
  { id: "chien_giap", name: "Chiến Giáp Thiết Cốt" },
  { id: "ta_tu", name: "Áo Choàng Tà Tu" },
];

export const OUTFIT_COLORS = [
  { id: "huyen_hac", name: "Huyền Hắc Cổ Trang", base: "#282730", dark: "#15141c", light: "#3b3947" },
  { id: "thanh_ngoc", name: "Thanh Ngọc", base: "#216e5a", dark: "#123d32", light: "#42a88c" },
  { id: "huyet_sat", name: "Huyết Sát", base: "#8a1c33", dark: "#4d0d1b", light: "#c93856" },
  { id: "xich_viem", name: "Xích Viêm", base: "#a84419", dark: "#5e2209", light: "#e37036" },
  { id: "bach_tuyet", name: "Bạch Tuyết", base: "#cfd6e6", dark: "#8792ab", light: "#f4f7ff" },
  { id: "tu_linh", name: "Tử Linh", base: "#5b2c87", dark: "#32154f", light: "#8e52c7" },
  { id: "hoang_kim", name: "Hoàng Kim", base: "#9e7624", dark: "#59400e", light: "#d9ab45" },
  { id: "lam_bang", name: "Lam Băng", base: "#235c8f", dark: "#123354", light: "#4791cf" },
];

export const TRIM_COLORS = [
  { id: "bac_sang", name: "Bạc Sáng & Bạch Ngọc", base: "#d6d8de", light: "#f6f6f7" },
  { id: "vang_dong", name: "Vàng Đồng", base: "#d9b25f", light: "#ffe6a6" },
  { id: "ngoc_bich", name: "Ngọc Bích", base: "#5fbf8a", light: "#b5ffe4" },
  { id: "do_tham", name: "Chu Đỏ", base: "#d0573c", light: "#ff9e8a" },
  { id: "tim_ma", name: "Tử Tinh", base: "#b84dff", light: "#e2b3ff" },
  { id: "cam_lua", name: "Cam Hỏa", base: "#ff8c3a", light: "#ffd0a6" },
];

export const EYE_COLORS = [
  { id: "han_mac", name: "Hàn Mặc U Sầu", hex: "#857d66" },
  { id: "ngoc_bich", name: "Mắt Ngọc Bích", hex: "#5fbf8a" },
  { id: "huyet_dong", name: "Mắt Huyết Đồng", hex: "#d0573c" },
  { id: "ho_phach", name: "Mắt Hổ Phách", hex: "#ffd15c" },
  { id: "bang_lam", name: "Mắt Băng Lam", hex: "#5ce1ff" },
  { id: "tu_quang", name: "Mắt Tử Quang", hex: "#d46bff" },
];

export const BACK_ITEMS = [
  { id: "none", name: "Không Đeo" },
  { id: "co_kiem", name: "Trường Kiếm Cổ" },
  { id: "ho_lo", name: "Hồ Lô Luyện Cổ" },
  { id: "nguyet_luan", name: "Nguyệt Luân Hoàn" },
  { id: "huyet_duc", name: "Huyết Dực Linh" },
];

const byId = (list, id) => list.find((item) => item.id === id) ?? list[0];

export function createDefaultAppearance() {
  return {
    skin: "tai_bach",
    hairStyle: "co_nguyet_phat",
    hairColor: "den_huyen",
    headgear: "tram_ngoc",
    outfitStyle: "hac_bao_co",
    outfitColor: "huyen_hac",
    trimColor: "bac_sang",
    eyeColor: "han_mac",
    backItem: "none",
    appearanceVersion: 2,
  };
}

export function normalizeAppearance(raw) {
  const def = createDefaultAppearance();
  if (!raw || typeof raw !== "object") return def;
  // Tự nâng cấp nhân vật mặc định v1 cũ sang mẫu chuẩn Cổ Phong mới
  if (
    !raw.appearanceVersion &&
    raw.hairStyle === "hiep_khach" &&
    raw.outfitStyle === "truong_bao" &&
    raw.outfitColor === "huyen_hac"
  ) {
    return def;
  }
  return {
    skin: byId(SKIN_TONES, raw.skin).id,
    hairStyle: byId(HAIR_STYLES, raw.hairStyle).id,
    hairColor: byId(HAIR_COLORS, raw.hairColor).id,
    headgear: byId(HEADGEARS, raw.headgear).id,
    outfitStyle: byId(OUTFIT_STYLES, raw.outfitStyle).id,
    outfitColor: byId(OUTFIT_COLORS, raw.outfitColor).id,
    trimColor: byId(TRIM_COLORS, raw.trimColor).id,
    eyeColor: byId(EYE_COLORS, raw.eyeColor).id,
    backItem: byId(BACK_ITEMS, raw.backItem).id,
    appearanceVersion: 2,
  };
}

export function randomizeAppearance() {
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)].id;
  return {
    skin: pick(SKIN_TONES),
    hairStyle: pick(HAIR_STYLES),
    hairColor: pick(HAIR_COLORS),
    headgear: pick(HEADGEARS),
    outfitStyle: pick(OUTFIT_STYLES),
    outfitColor: pick(OUTFIT_COLORS),
    trimColor: pick(TRIM_COLORS),
    eyeColor: pick(EYE_COLORS),
    backItem: pick(BACK_ITEMS),
    appearanceVersion: 2,
  };
}

export function getAppearanceKey(appearance) {
  const a = normalizeAppearance(appearance);
  return [
    a.skin,
    a.hairStyle,
    a.hairColor,
    a.headgear,
    a.outfitStyle,
    a.outfitColor,
    a.trimColor,
    a.eyeColor,
    a.backItem,
  ].join("|");
}

function drawCharacterFrame64(targetCtx, ox, oy, resolved, state, frameIdx) {
  if (!targetCtx) return;

  const { skin, hairStyle, hairColor, headgear, outfitStyle, outfitColor, trimColor, eyeColor, backItem } =
    resolved;

  const outlineDark = "#0d0a10";
  const outlineLit = "#141018";
  const isClassicHair = hairStyle === "co_nguyet_phat" || hairStyle === "tien_phong" || hairStyle === "cuong_ma";
  const isClassicRobe = outfitStyle === "hac_bao_co" || outfitStyle === "truong_bao" || outfitStyle === "ta_tu";

  let bobY = 0;
  let headBob = 0;
  let leanX = 0;
  let leftLegY = 0;
  let rightLegY = 0;
  let leftArmY = 0;
  let rightArmY = 0;
  let hairSway = 0;
  let robeSway = 0;

  if (state === "idle") {
    bobY = frameIdx === 1 || frameIdx === 2 ? 1 : 0;
    headBob = frameIdx === 2 ? 1 : 0;
    hairSway = frameIdx === 2 ? 1 : 0;
    robeSway = frameIdx === 1 ? -1 : frameIdx === 3 ? 1 : 0;
  } else if (state === "run") {
    const cycle = [
      { b: 0, ll: -2, rl: 1, la: 2, ra: -2, sw: -1 },
      { b: -1, ll: -1, rl: 0, la: 1, ra: -1, sw: -2 },
      { b: 0, ll: 1, rl: -1, la: -1, ra: 1, sw: -1 },
      { b: 0, ll: 1, rl: -2, la: -2, ra: 2, sw: 0 },
      { b: -1, ll: 0, rl: -1, la: -1, ra: 1, sw: -1 },
      { b: 0, ll: -1, rl: 1, la: 1, ra: -1, sw: -1 },
    ][frameIdx % 6];
    bobY = cycle.b;
    headBob = cycle.b;
    leftLegY = cycle.ll;
    rightLegY = cycle.rl;
    leftArmY = cycle.la;
    rightArmY = cycle.ra;
    hairSway = cycle.sw;
    robeSway = cycle.sw;
    leanX = 1;
  } else if (state === "attack") {
    leanX = frameIdx === 1 || frameIdx === 2 ? 2 : 0;
    bobY = frameIdx === 1 ? 1 : 0;
    headBob = bobY;
    rightArmY = frameIdx === 1 ? -5 : frameIdx === 2 ? -3 : 0;
    leftArmY = frameIdx === 1 ? 1 : 0;
    hairSway = frameIdx === 1 ? -2 : 0;
    robeSway = frameIdx === 1 ? -1 : 0;
  } else if (state === "sit") {
    bobY = frameIdx === 1 || frameIdx === 2 ? 6 : 7;
    headBob = bobY;
    hairSway = frameIdx % 2 === 0 ? 0 : 1;
  } else if (state === "fish") {
    bobY = frameIdx === 1 ? 1 : 0;
    headBob = bobY;
    rightArmY = -3;
  } else if (state === "dash") {
    leanX = 3;
    bobY = 1;
    headBob = 1;
    hairSway = -3;
    robeSway = -2;
  } else if (state === "hurt") {
    leanX = -2;
    bobY = frameIdx === 0 ? -1 : 0;
    headBob = bobY;
  } else if (state === "death") {
    if (frameIdx === 0) {
      bobY = 3;
      headBob = 3;
    } else if (frameIdx === 1) {
      bobY = 9;
      headBob = 9;
    } else {
      // Nằm gục trên mặt đất khi trọng thương
      const tmp = createPixelCanvas(64, 64);
      const g = tmp.ctx;
      const dp = (x, y, col, w = 1, h = 1) => {
        g.fillStyle = col;
        g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
      };
      dp(15, 49, outfitColor.dark, 28, 7);
      dp(17, 50, outfitColor.base, 22, 5);
      dp(24, 51, "#e4dad3", 5, 3);
      dp(39, 46, hairColor.dark, 11, 10);
      dp(41, 47, skin.base, 6, 7);
      dp(43, 46, hairColor.base, 6, 3);
      applySelectiveOutline(g, 64, 64, outlineLit, outlineDark);
      fillPixelEllipse(targetCtx, ox + 32, oy + 57, 18, 4, "rgba(4, 6, 10, 0.46)", true);
      targetCtx.drawImage(tmp.canvas, ox, oy);
      if (frameIdx === 3) {
        plotRect(targetCtx, ox + 30, oy + 40, 2, 4, "#8ebbae");
        plotRect(targetCtx, ox + 31, oy + 35, 1, 3, "#ffffff");
      }
      return;
    }
  } else if (state === "tau-hoa") {
    bobY = frameIdx % 2 === 0 ? -1 : 0;
    headBob = bobY;
    hairSway = frameIdx % 2 === 0 ? 1 : -1;
  }

  // Bóng đổ pixel dưới chân (vẽ trước khi vẽ sprite chính)
  fillPixelEllipse(targetCtx, ox + 32, oy + 59, state === "sit" ? 15 : 12, 4, "rgba(5, 7, 12, 0.45)", true);

  // Vòng linh khí pixel dưới chân khi ngồi thiền (Meditate)
  if (state === "sit") {
    targetCtx.save();
    targetCtx.globalAlpha = frameIdx % 2 === 0 ? 0.52 : 0.78;
    plotPixelEllipse(targetCtx, ox + 32, oy + 58, 18, 6, "#8ebbae", 3, frameIdx);
    targetCtx.restore();
  }

  // Vệt tàn ảnh khi Lướt (Dash)
  if (state === "dash") {
    targetCtx.save();
    targetCtx.globalAlpha = 0.34;
    plotRect(targetCtx, ox + 12 - frameIdx * 2, oy + 20, 12, 26, outfitColor.light);
    plotRect(targetCtx, ox + 10 - frameIdx * 2, oy + 26, 8, 16, "#8ebbae");
    targetCtx.restore();
  }

  // Tạo buffer tạm 64x64 để chạy Dark Selective Outlining chuẩn xác 1px toàn thân
  const tmp = createPixelCanvas(64, 64);
  const g = tmp.ctx;
  const p = (x, y, col, w = 1, h = 1) => {
    if (!g || w <= 0 || h <= 0) return;
    g.fillStyle = col;
    g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  };

  const bx = leanX;
  const by = bobY;
  const hx = leanX;
  const hy = headBob;
  const innerWhite = "#f6f6f7";
  const innerSoft = "#e4dad3";
  const innerShade = "#a7a08d";
  const sashDark = "#121118";
  const sashMid = "#22202b";

  // === 1. PHÁP KHÍ ĐEO LƯNG (NẾU CHỌN) ===
  if (backItem === "co_kiem") {
    p(19 + bx, 14 + by, trimColor.light, 2, 4);
    p(17 + bx, 18 + by, trimColor.base, 6, 2);
    p(19 + bx, 20 + by, "#8fa0b8", 2, 22);
  } else if (backItem === "ho_lo") {
    p(16 + bx, 24 + by, "#b87a2e", 5, 5);
    p(15 + bx, 29 + by, "#8c571d", 7, 7);
    p(16 + bx, 28 + by, "#d0573c", 5, 2);
  } else if (backItem === "nguyet_luan") {
    p(16 + bx, 16 + by, trimColor.base, 32, 2);
    p(16 + bx, 38 + by, trimColor.base, 32, 2);
    p(15 + bx, 18 + by, trimColor.light, 2, 20);
    p(47 + bx, 18 + by, trimColor.light, 2, 20);
  } else if (backItem === "huyet_duc") {
    const wl = frameIdx % 2 === 0 ? 0 : -2;
    p(11 + bx, 22 + by + wl, "#75172e", 9, 14);
    p(13 + bx, 24 + by + wl, "#cf3852", 5, 9);
    p(44 + bx, 22 + by + wl, "#75172e", 9, 14);
    p(46 + bx, 24 + by + wl, "#cf3852", 5, 9);
  }

  // === 2. TÓC DÀI XÕA SAU LƯNG (VẼ LỚP SAU VAI VÀ ÁO) ===
  if (hairStyle !== "kho_tu") {
    if (isClassicHair) {
      // Mái tóc đen dài xõa rối quá vai giống ảnh mẫu (nhấp nhô 1px theo hairSway)
      p(21 + hx + hairSway, 13 + hy, hairColor.dark, 22, 18);
      p(19 + hx + hairSway, 17 + hy, hairColor.dark, 5, 19);
      p(40 + hx + hairSway, 17 + hy, hairColor.dark, 5, 19);
      p(20 + hx + hairSway, 24 + hy, hairColor.base, 3, 12);
      p(41 + hx + hairSway, 24 + hy, hairColor.base, 3, 12);
      // Lọn tóc tua rua ở đuôi tóc
      p(20 + hx + hairSway, 36 + hy, hairColor.dark, 2, 3);
      p(23 + hx + hairSway, 35 + hy, hairColor.dark, 2, 3);
      p(41 + hx + hairSway, 36 + hy, hairColor.dark, 2, 4);
      p(39 + hx + hairSway, 35 + hy, hairColor.dark, 2, 3);
      // Sợi tóc rối rủ ở rìa ngoài
      p(18 + hx + hairSway, 16 + hy, hairColor.base, 2, 2);
      p(44 + hx + hairSway, 18 + hy, hairColor.base, 2, 2);
      p(19 + hx + hairSway, 27 + hy, hairColor.base, 1, 3);
      p(44 + hx + hairSway, 28 + hy, hairColor.base, 1, 3);
    } else {
      p(22 + hx + hairSway, 13 + hy, hairColor.dark, 20, 11);
    }
  }

  // === 3. CHÂN & HÀI ĐEN (HOẶC XẾP BẰNG KHI TĨNH TỌA) ===
  if (state === "sit") {
    // Tà áo và hai ống quần xếp bằng tỏa rộng gọn gàng
    p(21 + bx, 46 + by, outfitColor.dark, 22, 6);
    p(23 + bx, 47 + by, outfitColor.base, 18, 4);
    p(25 + bx, 49 + by, innerSoft, 3, 2);
    p(36 + bx, 49 + by, innerSoft, 3, 2);
    p(26 + bx, 50 + by, "#1b1a24", 12, 2);
  } else {
    // Đôi ủng/hài đen cổ phong ở dưới vạt áo
    p(25 + bx, 53 + leftLegY, "#191822", 5, 6);
    p(24 + bx, 56 + leftLegY, "#23212e", 6, 3);
    p(25 + bx, 58 + leftLegY, "#111017", 5, 1);

    p(34 + bx, 53 + rightLegY, "#191822", 5, 6);
    p(34 + bx, 56 + rightLegY, "#23212e", 6, 3);
    p(34 + bx, 58 + rightLegY, "#111017", 5, 1);
  }

  // === 4. THÂN HẮC BÀO CỔ TRANG XẺ VẠT ===
  if (state !== "sit") {
    // Tà váy áo choàng dài rủ xuống (y = 39..54)
    p(24 + bx + robeSway, 39 + by, outfitColor.dark, 16, 15);
    p(25 + bx + robeSway, 40 + by, outfitColor.base, 14, 13);
    p(26 + bx + robeSway, 40 + by, outfitColor.light, 4, 12);

    if (isClassicRobe) {
      // Hai đường xẻ vạt dọc lộ lớp lót trắng/ngà đặc trưng trong hình mẫu
      // Đường xẻ trái gọn
      p(27 + bx + robeSway, 46 + by, innerShade, 1, 7);
      p(28 + bx + robeSway, 48 + by, innerSoft, 1, 5);
      // Đường xẻ phải dài nổi bật kèm viền sáng
      p(35 + bx + robeSway, 43 + by, innerWhite, 1, 11);
      p(36 + bx + robeSway, 45 + by, innerSoft, 2, 8);
      p(37 + bx + robeSway, 48 + by, innerShade, 1, 5);
      // Mép lai sáng trắng dưới vạt tà
      p(25 + bx + robeSway, 53 + by, innerSoft, 3, 1);
      p(33 + bx + robeSway, 53 + by, innerSoft, 4, 1);
    } else if (outfitStyle === "doan_y") {
      p(25 + bx, 40 + by, outfitColor.base, 14, 7);
      p(27 + bx, 45 + by, trimColor.base, 10, 2);
    } else if (outfitStyle === "chien_giap") {
      p(25 + bx, 40 + by, "#4f5666", 14, 9);
      p(29 + bx, 41 + by, trimColor.base, 6, 7);
    }
  }

  // Thân áo trên & ngực áo cổ V trắng giao lĩnh (y = 28..39)
  p(25 + bx, 28 + by, outfitColor.dark, 14, 12);
  p(26 + bx, 28 + by, outfitColor.base, 12, 11);
  p(26 + bx, 29 + by, outfitColor.light, 4, 7);

  // Cổ người nhợt & Cổ áo trong màu trắng vắt chéo chữ V
  p(30 + bx, 27 + by, skin.shadow, 4, 2);
  p(31 + bx, 27 + by, skin.base, 2, 2);

  if (isClassicRobe) {
    // Cổ áo V trắng sắc nét
    p(29 + bx, 28 + by, innerWhite, 2, 2);
    p(33 + bx, 28 + by, innerWhite, 2, 2);
    p(30 + bx, 30 + by, innerSoft, 4, 2);
    p(31 + bx, 32 + by, innerWhite, 2, 2);
    p(32 + bx, 31 + by, "#16151e", 1, 1);
    // Hai khuy/khớp bạc nhỏ trên ngực áo bên phải màn hình
    p(35 + bx, 31 + by, "#c9c8c6", 3, 1);
    p(35 + bx, 33 + by, "#9da0a8", 3, 1);
    // Đai thắt lưng tối màu nhiều lớp ở eo
    p(25 + bx, 36 + by, sashDark, 14, 4);
    p(26 + bx, 37 + by, sashMid, 12, 2);
    p(28 + bx, 37 + by, outfitColor.light, 7, 1);
  } else {
    p(29 + bx, 28 + by, trimColor.light, 6, 2);
    p(31 + bx, 30 + by, trimColor.base, 2, 6);
    p(25 + bx, 36 + by, trimColor.base, 14, 3);
  }

  // === 5. HAI TAY ÁO RỘNG CÓ VIỀN TRẮNG & TÀ LỤA RỦ ===
  const drawSleeve = (isLeft, armDy) => {
    const sx = isLeft ? 20 + bx : 38 + bx;
    const sy = 29 + by + armDy;
    const widen = isLeft ? -1 : 1;
    // Vai & ống tay áo rộng buông thõng
    p(sx + (isLeft ? 2 : 0), sy, outfitColor.base, 4, 6);
    p(sx + (isLeft ? 1 : 0), sy + 5, outfitColor.dark, 5, 5);
    p(sx + (isLeft ? 0 : 1), sy + 9, outfitColor.base, 6, 4);
    p(sx + (isLeft ? 1 : 2), sy + 6, outfitColor.light, 2, 6);
    // Viền cổ tay áo trắng lấm tấm tương phản
    p(sx + (isLeft ? 0 : 1), sy + 13, innerWhite, 2, 1);
    p(sx + (isLeft ? 3 : 4), sy + 13, innerWhite, 2, 1);
    p(sx + (isLeft ? 2 : 3), sy + 13, outfitColor.dark, 1, 1);
    // Bàn tay nhỏ nhợt lộ ra ở mép cổ tay
    p(sx + (isLeft ? 2 : 2), sy + 14, skin.base, 2, 2);
    p(sx + (isLeft ? 2 : 3), sy + 15, skin.shadow, 1, 1);
    // Lớp lụa lót tay áo trong rủ nhọn xuống dưới bàn tay giống ảnh mẫu
    p(sx + (isLeft ? 0 : 3), sy + 15, innerSoft, 3, 2);
    p(sx + (isLeft ? 0 : 3) + widen * 0, sy + 17, innerShade, 2, 2);
    p(sx + (isLeft ? 1 : 4), sy + 19, innerShade, 1, 1);
  };

  if (state === "sit") {
    // Hai tay áo thu gọn vào trước đan điền khi tĩnh tọa
    p(22 + bx, 31 + by, outfitColor.base, 5, 11);
    p(37 + bx, 31 + by, outfitColor.base, 5, 11);
    p(25 + bx, 40 + by, outfitColor.dark, 14, 5);
    p(26 + bx, 42 + by, innerWhite, 3, 1);
    p(35 + bx, 42 + by, innerWhite, 3, 1);
    p(29 + bx, 41 + by, skin.base, 6, 3);
    p(30 + bx, 42 + by, frameIdx % 2 === 0 ? "#8ebbae" : "#b8d9ca", 4, 2); // Đan điền / Nguyên Thạch phát sáng nhẹ
  } else {
    drawSleeve(true, leftArmY);
    drawSleeve(false, rightArmY);
  }

  // Cần câu trúc khi câu cá
  if (state === "fish") {
    p(42 + bx, 34 + by, "#8f6532", 14, 2);
    p(54 + bx, 31 + by, "#b88a4a", 5, 2);
    p(58 + bx, 33 + by, "#e6f5f0", 1, 17);
  }

  // === 6. ĐẦU CHIBI (~43% CHIỀU CAO), MẶT TÁI BẠCH & ĐÔI MẮT LẠNH LÙNG ===
  // Tai lộ nhẹ ở hai bên má
  p(22 + hx, 18 + hy, skin.shadow, 2, 3);
  p(23 + hx, 18 + hy, skin.base, 1, 2);
  p(40 + hx, 18 + hy, skin.shadow, 2, 3);
  p(40 + hx, 18 + hy, skin.base, 1, 2);

  // Khuôn mặt cổ phong (rộng 16px, vát cằm gọn)
  p(24 + hx, 14 + hy, skin.base, 16, 11);
  p(25 + hx, 25 + hy, skin.base, 14, 1);
  p(27 + hx, 26 + hy, skin.base, 10, 1);
  p(29 + hx, 27 + hy, skin.mid, 6, 1);
  // Tạo khối bóng thái dương & gò má hơi tái
  p(24 + hx, 15 + hy, skin.mid, 2, 9);
  p(38 + hx, 15 + hy, skin.mid, 2, 9);
  p(25 + hx, 22 + hy, skin.shadow, 2, 3);
  p(37 + hx, 22 + hy, skin.shadow, 2, 3);
  p(28 + hx, 15 + hy, skin.highlight, 8, 2);

  // Đôi mắt ngang tầm lạnh lùng u sầu sắc nét (5x3 mỗi mắt, không biến dạng qua các frame)
  const isCrimsonFrenzy = state === "tau-hoa";
  const irisCol = isCrimsonFrenzy ? "#ff2e4c" : eyeColor.hex;
  // Lông mày sắc xếch nhẹ vào trong
  p(25 + hx, 17 + hy, "#382c2c", 4, 1);
  p(35 + hx, 17 + hy, "#382c2c", 4, 1);
  // Mi mắt trên dày đậm (5px)
  p(25 + hx, 18 + hy, outlineDark, 5, 1);
  p(34 + hx, 18 + hy, outlineDark, 5, 1);
  // Tròng mắt & đồng tử hẹp nửa mi
  p(25 + hx, 19 + hy, skin.shadow, 1, 1);
  p(26 + hx, 19 + hy, irisCol, 2, 1);
  p(28 + hx, 19 + hy, "#181620", 1, 1);
  p(29 + hx, 19 + hy, irisCol, 1, 1);

  p(34 + hx, 19 + hy, irisCol, 1, 1);
  p(35 + hx, 19 + hy, "#181620", 1, 1);
  p(36 + hx, 19 + hy, irisCol, 2, 1);
  p(38 + hx, 19 + hy, skin.shadow, 1, 1);
  // Củng mạc trắng sắc dưới đáy mắt giúp ánh mắt nổi bật ở mọi kích thước
  p(26 + hx, 20 + hy, innerWhite, 3, 1);
  p(35 + hx, 20 + hy, innerWhite, 3, 1);
  p(25 + hx, 21 + hy, skin.shadow, 2, 1);
  p(37 + hx, 21 + hy, skin.shadow, 2, 1);

  if (headgear === "anh_sat") {
    p(24 + hx, 21 + hy, "#181622", 16, 5);
    p(25 + hx, 23 + hy, trimColor.base, 14, 1);
  }

  // === 7. MÁI TÓC RỐI CỔ PHONG & KẸP/TRÂM NGỌC XANH NHẠT ===
  if (hairStyle === "kho_tu") {
    p(31 + hx, 14 + hy, "#c93842", 2, 2);
  } else {
    // Vòm tóc đỉnh đầu hơi rối
    p(26 + hx, 5 + hy, hairColor.dark, 12, 2);
    p(23 + hx, 7 + hy, hairColor.dark, 18, 2);
    p(21 + hx, 9 + hy, hairColor.base, 22, 6);
    p(20 + hx, 11 + hy, hairColor.dark, 2, 6);
    p(42 + hx, 11 + hy, hairColor.dark, 2, 6);
    // Điểm sáng than chì phân lớp trên vòm tóc
    p(25 + hx, 8 + hy, hairColor.light, 5, 2);
    p(33 + hx, 8 + hy, hairColor.light, 4, 2);
    p(23 + hx, 10 + hy, hairColor.tip, 2, 2);
    p(30 + hx, 10 + hy, hairColor.light, 3, 1);
    p(36 + hx, 11 + hy, hairColor.tip, 2, 1);

    // Tóc mái lưa thưa rủ qua trán & mai tóc ôm má
    p(23 + hx, 13 + hy, hairColor.base, 4, 4);
    p(24 + hx, 16 + hy, hairColor.dark, 2, 3);
    p(28 + hx, 13 + hy, hairColor.dark, 2, 3);
    p(31 + hx, 12 + hy, hairColor.base, 2, 6); // Lọn mái giữa rủ xuống giữa hai chân mày
    p(31 + hx, 18 + hy, hairColor.dark, 1, 1);
    p(34 + hx, 13 + hy, hairColor.base, 3, 4);
    p(38 + hx, 13 + hy, hairColor.base, 3, 5);
    // Mai tóc ôm sát 2 bên gò má
    p(22 + hx, 15 + hy, hairColor.dark, 2, 11);
    p(40 + hx, 15 + hy, hairColor.dark, 2, 11);
    p(20 + hx + hairSway, 13 + hy, hairColor.base, 2, 2);
    p(42 + hx + hairSway, 14 + hy, hairColor.base, 2, 2);

    if (hairStyle === "hiep_khach") {
      p(28 + hx, 2 + hy, hairColor.base, 8, 4);
      p(27 + hx, 5 + hy, trimColor.base, 10, 1);
    } else if (hairStyle === "linh_dong") {
      p(19 + hx, 7 + hy, hairColor.base, 4, 4);
      p(41 + hx, 7 + hy, hairColor.base, 4, 4);
    } else if (hairStyle === "cuong_ma") {
      p(22 + hx, 4 + hy, hairColor.light, 3, 3);
      p(30 + hx, 2 + hy, hairColor.tip, 4, 4);
      p(39 + hx, 4 + hy, hairColor.light, 3, 3);
    }
  }

  // === 8. TRÂM / KẸP NGỌC XANH NHẠT & PHỤ KIỆN ĐẦU ===
  if (headgear === "tram_ngoc" || (headgear === "none" && hairStyle === "co_nguyet_phat")) {
    // Cụm kẹp ngọc bích nhạt cài bên tóc phải (trái mắt người xem bên góc trên-phải đầu)
    p(38 + hx, 9 + hy, "#334c4f", 4, 4);
    p(38 + hx, 9 + hy, "#b8d9ca", 2, 2); // Đỉnh ngọc sáng
    p(39 + hx, 10 + hy, "#8ebbae", 2, 2);
    p(40 + hx, 11 + hy, "#72a193", 2, 2);
    p(41 + hx, 9 + hy, "#b8d9ca", 1, 1); // Hai chấu ngọc chĩa ra rìa tóc
    p(41 + hx, 12 + hy, "#8ebbae", 1, 1);
  } else if (headgear === "ngoc_quan") {
    p(28 + hx, 2 + hy, trimColor.base, 8, 4);
    p(30 + hx, 3 + hy, "#72a193", 4, 2);
    p(27 + hx, 4 + hy, trimColor.light, 10, 1);
  } else if (headgear === "dau_lap") {
    p(17 + hx, 8 + hy, "#8a6d3b", 30, 3);
    p(22 + hx, 5 + hy, "#b89352", 20, 3);
    p(27 + hx, 3 + hy, "#d9b25f", 10, 2);
  } else if (headgear === "sung_ma") {
    p(21 + hx, 3 + hy, "#631426", 3, 5);
    p(19 + hx, 1 + hy, "#d0573c", 2, 3);
    p(40 + hx, 3 + hy, "#631426", 3, 5);
    p(43 + hx, 1 + hy, "#d0573c", 2, 3);
  } else if (headgear === "kim_co") {
    p(22 + hx, 10 + hy, "#ffd86e", 20, 2);
    p(31 + hx, 9 + hy, "#d0573c", 2, 2);
  }

  // Chạy viền Selective Outline sắc nét bao quanh toàn bộ nhân vật (không nhòe, tương phản cao trên mọi nền)
  applySelectiveOutline(g, 64, 64, outlineLit, outlineDark);

  // Chuyển frame sắc nét lên sprite sheet đích
  targetCtx.drawImage(tmp.canvas, ox, oy);

  // Hiệu ứng pixel khi tung chiêu (Attack/Cast), Ngồi Thiền (Meditate), Thụ Thương, Tẩu Hỏa
  if (state === "attack" && (frameIdx === 1 || frameIdx === 2)) {
    const aura = trimColor.light === "#f6f6f7" ? "#8ebbae" : trimColor.light;
    plotRect(targetCtx, ox + 45 + bx, oy + 26 + by, 4, 14, "#133330");
    plotRect(targetCtx, ox + 46 + bx, oy + 27 + by, 4, 11, aura);
    plotRect(targetCtx, ox + 48 + bx, oy + 29 + by, 3, 7, "#ffffff");
    plotRect(targetCtx, ox + 51 + bx, oy + 31 + by, 2, 3, "#b8d9ca");
  } else if (state === "sit") {
    const moteY = 46 - frameIdx * 4;
    plotRect(targetCtx, ox + 20, oy + moteY, 2, 2, "#b8d9ca");
    plotRect(targetCtx, ox + 42, oy + moteY - 2, 2, 2, "#5ef2d6");
    if (frameIdx % 2 === 1) {
      plotRect(targetCtx, ox + 31, oy + 38 - frameIdx, 2, 2, "#ffffff");
    }
  } else if (state === "hurt" && frameIdx === 0) {
    targetCtx.save();
    targetCtx.globalAlpha = 0.4;
    plotRect(targetCtx, ox + 20, oy + 10, 24, 44, "#ff4a66");
    targetCtx.restore();
  } else if (state === "tau-hoa") {
    const spCol = frameIdx % 2 === 0 ? "#d45eff" : "#ff244c";
    plotRect(targetCtx, ox + 15, oy + 16 + (frameIdx % 3) * 6, 3, 4, spCol);
    plotRect(targetCtx, ox + 46, oy + 20 + ((frameIdx + 1) % 3) * 6, 3, 4, spCol);
  }
}

function buildStateSheet(resolved, state, frameCount, fps, loop) {
  const fw = 64;
  const fh = 64;
  const { canvas, ctx } = createPixelCanvas(fw * frameCount, fh);
  const frames = [];

  for (let i = 0; i < frameCount; i++) {
    drawCharacterFrame64(ctx, i * fw, 0, resolved, state, i);
    frames.push({ frame: { x: i * fw, y: 0, w: fw, h: fh } });
  }

  return {
    key: `custom64/${state}`,
    image: canvas,
    frames,
    meta: { size: { w: fw * frameCount, h: fh } },
    pixelfx: { fps, loop, pivot: [32, 59] },
  };
}

const SHEET_CACHE = new Map();
const MAX_CACHE = 56;

export function getCharacterSheets(rawAppearance) {
  const norm = normalizeAppearance(rawAppearance);
  const cacheKey = getAppearanceKey(norm);
  if (SHEET_CACHE.has(cacheKey)) return SHEET_CACHE.get(cacheKey);

  const resolved = {
    skin: byId(SKIN_TONES, norm.skin),
    hairStyle: norm.hairStyle,
    hairColor: byId(HAIR_COLORS, norm.hairColor),
    headgear: norm.headgear,
    outfitStyle: norm.outfitStyle,
    outfitColor: byId(OUTFIT_COLORS, norm.outfitColor),
    trimColor: byId(TRIM_COLORS, norm.trimColor),
    eyeColor: byId(EYE_COLORS, norm.eyeColor),
    backItem: norm.backItem,
  };

  const bundle = {
    appearance: norm,
    cacheKey,
    idle: buildStateSheet(resolved, "idle", 4, 5, true),
    run: buildStateSheet(resolved, "run", 6, 10, true),
    attack: buildStateSheet(resolved, "attack", 4, 14, false),
    dash: buildStateSheet(resolved, "dash", 3, 14, false),
    sit: buildStateSheet(resolved, "sit", 4, 4, true),
    fish: buildStateSheet(resolved, "fish", 2, 3, true),
    hurt: buildStateSheet(resolved, "hurt", 2, 10, false),
    death: buildStateSheet(resolved, "death", 4, 6, false),
    "tau-hoa": buildStateSheet(resolved, "tau-hoa", 4, 10, true),
  };

  if (SHEET_CACHE.size >= MAX_CACHE) {
    SHEET_CACHE.delete(SHEET_CACHE.keys().next().value);
  }
  SHEET_CACHE.set(cacheKey, bundle);
  return bundle;
}

/**
 * Vẽ nhân vật Chibi 64x64 lên `<canvas>` UI (Sảnh chọn nhân vật, Xưởng tạo hình, Bảng Nhân Vật).
 */
export function drawCustomCharacterPreview(canvas, appearance, opts = {}) {
  if (!canvas || typeof canvas.getContext !== "function") return;
  const ctx = canvas.getContext("2d");
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  ctx.imageSmoothingEnabled = false;

  const cx = Math.floor(w * 0.5);
  const footY = Math.floor(h * 0.89);

  if (!appearance) {
    fillPixelEllipse(ctx, cx, footY, 22, 6, "rgba(217, 178, 95, 0.14)");
    plotPixelEllipse(ctx, cx, footY, 22, 6, "rgba(217, 178, 95, 0.45)");
    return;
  }

  const sheets = getCharacterSheets(appearance);
  const norm = sheets.appearance;
  const trim = byId(TRIM_COLORS, norm.trimColor);
  const auraColor = opts.pathColor || trim.base;
  const state = opts.animState || "idle";
  const timeSec = opts.timeSec ?? 0;
  const maxFitScale = Math.max(1, Math.floor((h - 10) / 56));
  const scale = Math.max(1, Math.min(maxFitScale, Math.floor(opts.scale ?? maxFitScale)));

  fillPixelEllipse(ctx, cx, footY, 22, 6, "rgba(18, 22, 18, 0.88)");
  plotPixelEllipse(ctx, cx, footY, 22, 6, auraColor);

  const sheet = sheets[state] ?? sheets.idle;
  const fi = getSheetFrameIndex(sheet, timeSec, true);
  drawSheetFrame(ctx, sheet, fi, cx, footY - 2, { scale });
}

/**
 * Vẽ Chân Dung Cận Cảnh Chuẩn Hình Mẫu (Avatar góc trên-trái HUD, lưới 44x44 sắc nét, 0 ellipse/arc/gradient mượt).
 */
export function drawCharacterPortrait(canvas, rawAppearance, opts = {}) {
  if (!canvas || typeof canvas.getContext !== "function") return;
  const ctx = canvas.getContext("2d");
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  ctx.imageSmoothingEnabled = false;

  const norm = normalizeAppearance(rawAppearance);
  const skin = byId(SKIN_TONES, norm.skin);
  const hair = byId(HAIR_COLORS, norm.hairColor);
  const outfit = byId(OUTFIT_COLORS, norm.outfitColor);
  const eye = byId(EYE_COLORS, norm.eyeColor);

  // Nền hắc ngọc cổ phong phân tầng pixel
  plotRect(ctx, 0, 0, w, h, "#090c0f");
  plotRect(ctx, 4, 4, w - 8, h - 8, "#101720");
  plotRect(ctx, 9, 7, w - 18, h - 14, opts.bgTint || "#19292e");

  const sx = w / 44;
  const sy = h / 44;
  const r = (x, y, rw, rh, col) => {
    ctx.fillStyle = col;
    ctx.fillRect(Math.round(x * sx), Math.round(y * sy), Math.max(1, Math.round(rw * sx)), Math.max(1, Math.round(rh * sy)));
  };

  plotPixelEllipse(ctx, Math.round(w * 0.5), Math.round(h * 0.46), Math.round(w * 0.36), Math.round(h * 0.36), "rgba(142, 187, 174, 0.32)");

  // Tóc dài xõa sau lưng & hai bên vai
  if (norm.hairStyle !== "kho_tu") {
    r(10, 9, 24, 28, "#0d0a10");
    r(11, 10, 22, 26, hair.dark);
    r(9, 15, 3, 19, hair.dark);
    r(32, 15, 3, 19, hair.dark);
  }

  // Thân Hắc Bào + Cổ áo chữ V màu trắng + Khuy bạc
  r(8, 31, 28, 13, "#0d0a10");
  r(9, 32, 26, 12, outfit.base);
  r(10, 32, 7, 12, outfit.light);
  r(27, 32, 7, 12, outfit.dark);
  r(18, 30, 8, 5, skin.base);
  r(17, 32, 3, 7, "#f6f6f7");
  r(24, 32, 3, 7, "#f6f6f7");
  r(19, 36, 6, 5, "#eceae7");
  r(21, 38, 2, 6, "#14131b");
  r(28, 36, 4, 1, "#c9c8c6");
  r(28, 39, 4, 1, "#9da0a8");

  // Khuôn mặt tái bạch cổ phong
  r(13, 12, 18, 19, "#0d0a10");
  r(14, 13, 16, 16, skin.base);
  r(16, 29, 12, 2, skin.base);
  r(18, 30, 8, 1, skin.shadow);
  r(14, 14, 2, 13, skin.mid || skin.shadow);
  r(28, 14, 2, 14, skin.mid || skin.shadow);
  r(15, 24, 2, 3, skin.shadow);
  r(27, 24, 2, 3, skin.shadow);

  // Đôi mắt lạnh lùng u sầu nửa mi (mi trên đậm, tròng trầm, mí dưới trắng)
  r(15, 18, 5, 1, "#382c2c");
  r(24, 18, 5, 1, "#382c2c");
  r(15, 19, 5, 1, "#0d0a10");
  r(24, 19, 5, 1, "#0d0a10");
  r(16, 20, 3, 1, eye.hex);
  r(17, 20, 1, 1, "#14121c");
  r(25, 20, 3, 1, eye.hex);
  r(26, 20, 1, 1, "#14121c");
  r(16, 21, 3, 1, "#f6f6f7");
  r(25, 21, 3, 1, "#f6f6f7");

  // Tóc mái rối + Trâm kẹp ngọc xanh nhạt bên tóc
  if (norm.hairStyle !== "kho_tu") {
    r(11, 6, 22, 10, "#0d0a10");
    r(12, 7, 20, 8, hair.base);
    r(15, 8, 6, 2, hair.light);
    r(24, 8, 5, 2, hair.light);
    r(13, 13, 3, 5, hair.base);
    r(20, 12, 3, 6, hair.base);
    r(27, 13, 4, 5, hair.base);
    r(12, 15, 2, 12, hair.dark);
    r(30, 15, 2, 12, hair.dark);

    if (norm.headgear === "tram_ngoc" || (norm.headgear === "none" && norm.hairStyle === "co_nguyet_phat")) {
      r(29, 8, 4, 5, "#334c4f");
      r(29, 8, 2, 2, "#b8d9ca");
      r(30, 9, 2, 3, "#8ebbae");
      r(32, 8, 2, 1, "#b8d9ca");
      r(32, 11, 2, 1, "#72a193");
    } else if (norm.headgear === "ngoc_quan") {
      r(18, 2, 8, 5, "#d9b25f");
      r(20, 3, 4, 3, "#72a193");
    }
  } else {
    r(21, 14, 2, 2, "#d0573c");
  }
}
