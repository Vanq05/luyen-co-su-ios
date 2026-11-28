/**
 * Bộ sinh Sprite Nhân Vật Pixel Art Chibi Cổ Phong (32x32 mỗi frame, chuẩn Cổ Tiên Lộ).
 * Hỗ trợ tùy chỉnh đa lớp và xuất 9 bộ animation:
 * `idle` (4f), `run` (6f), `attack` (4f), `dash` (3f), `sit` (2f), `fish` (2f), `hurt` (2f), `death` (4f), `tau-hoa` (4f).
 * Ngoài ra cung cấp `drawCharacterPortrait()` cho khung Avatar góc trên-trái HUD (0 ellipse/arc/gradient mượt).
 */
import { fillPixelEllipse, plotPixelEllipse, plotRect } from "../engine/PixelSpriteBaker.js";
import { drawSheetFrame, getSheetFrameIndex } from "../engine/SpriteSheet.js";

export const SKIN_TONES = [
  { id: "bach_ngoc", name: "Bạch Ngọc", base: "#f5dec8", shadow: "#cfa888", highlight: "#fff3e6" },
  { id: "phan_hong", name: "Phấn Hồng", base: "#f2cabe", shadow: "#c49084", highlight: "#ffe6de" },
  { id: "dong_co", name: "Đồng Cổ", base: "#d49e72", shadow: "#9c6b43", highlight: "#ebbc94" },
  { id: "bang_tuyet", name: "Băng Tuyết", base: "#dfe8f4", shadow: "#a1b3cc", highlight: "#f6faff" },
  { id: "huyen_mach", name: "Huyền Mạch", base: "#8c7268", shadow: "#59453e", highlight: "#b3968a" },
];

export const HAIR_STYLES = [
  { id: "hiep_khach", name: "Tóc Buộc Cao" },
  { id: "tien_phong", name: "Trường Phát Xõa" },
  { id: "kiem_khach", name: "Tóc Ngắn Kiếm Khách" },
  { id: "linh_dong", name: "Song Hoàn Linh Đồng" },
  { id: "cuong_ma", name: "Cuồng Phát Tà Vương" },
  { id: "kho_tu", name: "Đầu Trần Chu Sa" },
];

export const HAIR_COLORS = [
  { id: "den_huyen", name: "Đen Huyền", base: "#1f1d29", dark: "#0f0e16", light: "#3f3b52" },
  { id: "bach_phat", name: "Bạch Phát", base: "#dde4f0", dark: "#96a2b8", light: "#ffffff" },
  { id: "do_huyet", name: "Đỏ Huyết", base: "#c92845", dark: "#781326", light: "#ff6680" },
  { id: "xanh_bang", name: "Xanh Băng", base: "#3db8d9", dark: "#1d6b87", light: "#94ecff" },
  { id: "tim_u_minh", name: "Tím U Minh", base: "#8c42d6", dark: "#4c1d82", light: "#c88cff" },
  { id: "vang_kim", name: "Hoàng Kim", base: "#e0b038", dark: "#8f6814", light: "#ffe484" },
  { id: "luc_doc", name: "Lục Độc", base: "#47bd6b", dark: "#206e39", light: "#8ff2ab" },
  { id: "hong_dao", name: "Hồng Đào", base: "#e374a8", dark: "#913863", light: "#ffb8d9" },
];

export const HEADGEARS = [
  { id: "none", name: "Không Đội" },
  { id: "ngoc_quan", name: "Ngọc Quán Đạo Sư" },
  { id: "dau_lap", name: "Đấu Lạp Giang Hồ" },
  { id: "anh_sat", name: "Khăn Bịt Mặt Ảnh" },
  { id: "sung_ma", name: "Sừng Huyết Ma" },
  { id: "kim_co", name: "Vòng Kim Cô" },
];

export const OUTFIT_STYLES = [
  { id: "truong_bao", name: "Trường Bào Cổ Sư" },
  { id: "doan_y", name: "Đoản Y Thích Khách" },
  { id: "chien_giap", name: "Chiến Giáp Thiết Cốt" },
  { id: "ta_tu", name: "Áo Choàng Tà Tu" },
];

export const OUTFIT_COLORS = [
  { id: "huyen_hac", name: "Huyền Hắc", base: "#22202b", dark: "#121018", light: "#3f3b4f" },
  { id: "thanh_ngoc", name: "Thanh Ngọc", base: "#216e5a", dark: "#123d32", light: "#42a88c" },
  { id: "huyet_sat", name: "Huyết Sát", base: "#8a1c33", dark: "#4d0d1b", light: "#c93856" },
  { id: "xich_viem", name: "Xích Viêm", base: "#a84419", dark: "#5e2209", light: "#e37036" },
  { id: "bach_tuyet", name: "Bạch Tuyết", base: "#cfd6e6", dark: "#8792ab", light: "#f4f7ff" },
  { id: "tu_linh", name: "Tử Linh", base: "#5b2c87", dark: "#32154f", light: "#8e52c7" },
  { id: "hoang_kim", name: "Hoàng Kim", base: "#9e7624", dark: "#59400e", light: "#d9ab45" },
  { id: "lam_bang", name: "Lam Băng", base: "#235c8f", dark: "#123354", light: "#4791cf" },
];

export const TRIM_COLORS = [
  { id: "vang_dong", name: "Vàng Đồng", base: "#d9b25f", light: "#ffe6a6" },
  { id: "ngoc_bich", name: "Ngọc Bích", base: "#5fbf8a", light: "#b5ffe4" },
  { id: "do_tham", name: "Chu Đỏ", base: "#d0573c", light: "#ff9e8a" },
  { id: "bac_sang", name: "Bạc Sáng", base: "#dce4f2", light: "#ffffff" },
  { id: "tim_ma", name: "Tử Tinh", base: "#b84dff", light: "#e2b3ff" },
  { id: "cam_lua", name: "Cam Hỏa", base: "#ff8c3a", light: "#ffd0a6" },
];

export const EYE_COLORS = [
  { id: "ngoc_bich", name: "Mắt Ngọc Bích", hex: "#5fbf8a" },
  { id: "huyet_dong", name: "Mắt Huyết Đồng", hex: "#d0573c" },
  { id: "ho_phach", name: "Mắt Hổ Phách", hex: "#ffd15c" },
  { id: "bang_lam", name: "Mắt Băng Lam", hex: "#5ce1ff" },
  { id: "tu_quang", name: "Mắt Tử Quang", hex: "#d46bff" },
];

export const BACK_ITEMS = [
  { id: "none", name: "Không Đeo" },
  { id: "ho_lo", name: "Hồ Lô Luyện Cổ" },
  { id: "co_kiem", name: "Trường Kiếm Cổ" },
  { id: "nguyet_luan", name: "Nguyệt Luân Hoàn" },
  { id: "huyet_duc", name: "Huyết Dực Linh" },
];

const byId = (list, id) => list.find((item) => item.id === id) ?? list[0];

export function createDefaultAppearance() {
  return {
    skin: "bach_ngoc",
    hairStyle: "hiep_khach",
    hairColor: "den_huyen",
    headgear: "none",
    outfitStyle: "truong_bao",
    outfitColor: "huyen_hac",
    trimColor: "vang_dong",
    eyeColor: "ngoc_bich",
    backItem: "co_kiem",
  };
}

export function normalizeAppearance(raw) {
  const def = createDefaultAppearance();
  if (!raw || typeof raw !== "object") return def;
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

function makeSurface(width, height) {
  if (typeof document !== "undefined" && typeof document.createElement === "function") {
    const c = document.createElement("canvas");
    c.width = width;
    c.height = height;
    const ctx = c.getContext("2d");
    ctx.imageSmoothingEnabled = false;
    return { canvas: c, ctx };
  }
  return { canvas: { width, height, isHeadlessMock: true }, ctx: null };
}

function drawCharacterFrame(ctx, ox, oy, resolved, state, frameIdx) {
  if (!ctx) return;

  const { skin, hairStyle, hairColor, headgear, outfitStyle, outfitColor, trimColor, eyeColor, backItem } =
    resolved;

  const px = (x, y, col, w = 1, h = 1) => {
    ctx.fillStyle = col;
    ctx.fillRect(ox + x, oy + y, w, h);
  };

  const outline = "#100d14";

  let bobY = 0;
  let leanX = 0;
  let leftLegY = 0;
  let rightLegY = 0;
  let leftArmY = 0;
  let rightArmY = 0;
  let capeSway = 0;

  if (state === "idle") {
    bobY = frameIdx === 1 || frameIdx === 2 ? 1 : 0;
    capeSway = frameIdx === 2 ? 1 : 0;
  } else if (state === "run") {
    const cycle = [
      { b: 0, ll: -2, rl: 1, la: 1, ra: -1, sw: 1 },
      { b: -1, ll: -1, rl: 0, la: 0, ra: -1, sw: 1 },
      { b: 0, ll: 1, rl: -1, la: -1, ra: 1, sw: 0 },
      { b: 0, ll: 1, rl: -2, la: -1, ra: 1, sw: -1 },
      { b: -1, ll: 0, rl: -1, la: 0, ra: 0, sw: -1 },
      { b: 0, ll: -1, rl: 1, la: 1, ra: -1, sw: 0 },
    ][frameIdx % 6];
    bobY = cycle.b;
    leftLegY = cycle.ll;
    rightLegY = cycle.rl;
    leftArmY = cycle.la;
    rightArmY = cycle.ra;
    capeSway = cycle.sw;
    leanX = 1;
  } else if (state === "attack") {
    leanX = frameIdx === 1 || frameIdx === 2 ? 2 : 0;
    bobY = frameIdx === 1 ? 1 : 0;
    rightArmY = frameIdx === 1 ? -3 : frameIdx === 2 ? -1 : 0;
    capeSway = frameIdx === 1 ? -1 : 0;
  } else if (state === "sit") {
    bobY = frameIdx === 1 ? 3 : 4;
  } else if (state === "fish") {
    bobY = frameIdx === 1 ? 1 : 0;
    rightArmY = -1;
  } else if (state === "dash") {
    leanX = 2;
    bobY = 1;
    capeSway = -2;
    ctx.save();
    ctx.globalAlpha = 0.35;
    px(4 - frameIdx, 10, trimColor.base, 5, 12);
    px(2 - frameIdx, 13, outfitColor.light, 4, 8);
    ctx.restore();
  } else if (state === "hurt") {
    leanX = -1;
    bobY = frameIdx === 0 ? -1 : 0;
  } else if (state === "death") {
    if (frameIdx === 0) bobY = 2;
    else if (frameIdx === 1) bobY = 5;
    else {
      px(7, 23, outline, 18, 5);
      px(8, 24, outfitColor.dark, 15, 3);
      px(10, 23, outfitColor.base, 11, 3);
      px(13, 24, trimColor.base, 5, 2);
      px(19, 23, skin.base, 4, 3);
      if (frameIdx === 3) {
        px(15, 16, eyeColor.hex, 2, 3);
        px(16, 13, "#ffffff", 1, 2);
      }
      return;
    }
  } else if (state === "tau-hoa") {
    bobY = frameIdx % 2 === 0 ? -1 : 0;
    capeSway = frameIdx % 2 === 0 ? 1 : -1;
  }

  const bx = leanX;
  const by = bobY;

  // Bóng đổ bầu dục dưới chân chuẩn chibi
  ctx.save();
  ctx.globalAlpha = 0.38;
  px(9, 26, "#060807", 14, 2);
  px(11, 25, "#060807", 10, 4);
  ctx.restore();

  // Vòng linh khí pixel khi ngồi thiền Bế quan
  if (state === "sit") {
    ctx.save();
    ctx.globalAlpha = frameIdx === 0 ? 0.5 : 0.72;
    plotPixelEllipse(ctx, ox + 16, oy + 26, 11, 4, "#5fbf8a", 2, frameIdx);
    ctx.restore();
  }

  // === 1. PHÁP KHÍ ĐEO LƯNG ===
  if (backItem === "nguyet_luan") {
    px(7, 6 + by, trimColor.base, 18, 1);
    px(7, 19 + by, trimColor.base, 18, 1);
    px(6, 7 + by, trimColor.light, 1, 12);
    px(25, 7 + by, trimColor.light, 1, 12);
  } else if (backItem === "huyet_duc") {
    const wingLift = frameIdx % 2 === 0 ? 0 : -1;
    px(4, 9 + by + wingLift, "#5e0f24", 6, 8);
    px(5, 10 + by + wingLift, "#d0573c", 4, 5);
    px(22, 9 + by + wingLift, "#5e0f24", 6, 8);
    px(23, 10 + by + wingLift, "#d0573c", 4, 5);
  } else if (backItem === "co_kiem") {
    px(8, 4 + by, outline, 3, 18);
    px(9, 5 + by, trimColor.light, 1, 3);
    px(7, 7 + by, trimColor.base, 5, 1);
    px(9, 8 + by, "#8fa0b8", 1, 13);
  } else if (backItem === "ho_lo") {
    px(6, 11 + by, outline, 5, 9);
    px(7, 12 + by, "#d4943b", 3, 3);
    px(7, 15 + by, "#d0573c", 3, 1);
    px(6, 16 + by, "#c27d29", 5, 3);
  }

  // Tà áo choàng sau
  if (outfitStyle === "ta_tu" || outfitStyle === "truong_bao") {
    px(8 + capeSway, 16 + by, outline, 16, 9);
    px(9 + capeSway, 17 + by, outfitColor.dark, 14, 7);
    px(10 + capeSway, 23 + by, trimColor.base, 2, 1);
    px(20 + capeSway, 23 + by, trimColor.base, 2, 1);
  }

  // === 2. CHÂN & GIÀY (hoặc xếp bằng khi sit) ===
  if (state === "sit") {
    px(10 + bx, 22 + by, outline, 12, 4);
    px(11 + bx, 23 + by, outfitColor.base, 10, 2);
  } else {
    px(11 + bx, 23 + leftLegY, outline, 4, 4);
    px(12 + bx, 23 + leftLegY, "#231e30", 2, 3);
    px(17 + bx, 23 + rightLegY, outline, 4, 4);
    px(18 + bx, 23 + rightLegY, "#231e30", 2, 3);
  }

  // === 3. THÂN ĐẠO BÀO ===
  px(10 + bx, 15 + by, outline, 12, 9);
  px(11 + bx, 16 + by, outfitColor.base, 10, 7);
  px(11 + bx, 16 + by, outfitColor.light, 3, 6);
  px(18 + bx, 16 + by, outfitColor.dark, 3, 6);

  if (outfitStyle === "truong_bao") {
    px(10 + bx, 21 + by, outline, 12, 3);
    px(11 + bx, 21 + by, outfitColor.base, 10, 2);
    px(14 + bx, 16 + by, trimColor.base, 2, 7);
    px(11 + bx, 19 + by, trimColor.base, 10, 2);
    px(15 + bx, 19 + by, trimColor.light, 2, 2);
  } else if (outfitStyle === "doan_y") {
    px(11 + bx, 18 + by, trimColor.base, 10, 2);
    px(13 + bx, 16 + by, trimColor.light, 1, 2);
    px(18 + bx, 16 + by, trimColor.light, 1, 2);
  } else if (outfitStyle === "chien_giap") {
    px(8 + bx, 15 + by, outline, 4, 4);
    px(20 + bx, 15 + by, outline, 4, 4);
    px(9 + bx, 16 + by, trimColor.base, 3, 2);
    px(20 + bx, 16 + by, trimColor.base, 3, 2);
    px(13 + bx, 17 + by, "#b8c2d6", 6, 4);
    px(15 + bx, 18 + by, trimColor.light, 2, 2);
  } else {
    px(12 + bx, 16 + by, trimColor.base, 2, 7);
    px(18 + bx, 16 + by, trimColor.base, 2, 7);
    px(14 + bx, 18 + by, trimColor.light, 4, 2);
  }

  // Hai tay
  px(8 + bx, 17 + by + leftArmY, outline, 3, 5);
  px(9 + bx, 17 + by + leftArmY, outfitColor.dark, 2, 3);
  px(9 + bx, 20 + by + leftArmY, skin.base, 2, 2);

  px(21 + bx, 17 + by + rightArmY, outline, 3, 5);
  px(21 + bx, 17 + by + rightArmY, outfitColor.light, 2, 3);
  px(21 + bx, 20 + by + rightArmY, skin.base, 2, 2);

  // Cần câu trúc khi đang câu cá
  if (state === "fish") {
    px(23 + bx, 14 + by, "#8f6532", 7, 1);
    px(28 + bx, 12 + by, "#b08046", 4, 1);
    px(31 + bx, 13 + by, "#ffffff", 1, 9);
  }

  // Vệt chém khi attack
  if (state === "attack" && (frameIdx === 1 || frameIdx === 2)) {
    ctx.save();
    ctx.globalAlpha = 0.85;
    px(23 + bx, 12 + by, trimColor.light, 3, 9);
    px(25 + bx, 14 + by, "#ffffff", 2, 6);
    ctx.restore();
  }

  // === 4. ĐẦU CHIBI TO & MẶT CÓ HỒN ===
  if (hairStyle === "tien_phong" || hairStyle === "cuong_ma") {
    px(8 + bx - capeSway, 8 + by, outline, 16, 10);
    px(9 + bx - capeSway, 9 + by, hairColor.dark, 14, 8);
  }

  // Đầu tròn Chibi (rộng 14px, cao 11px)
  px(9 + bx, 5 + by, outline, 14, 11);
  px(10 + bx, 6 + by, skin.base, 12, 9);
  px(10 + bx, 6 + by, skin.highlight, 4, 6);
  px(20 + bx, 7 + by, skin.shadow, 2, 7);

  // Đôi mắt Chibi 2x3 long lanh
  const eyeHex = state === "tau-hoa" ? "#ff244c" : eyeColor.hex;
  px(12 + bx, 10 + by, "#120f1a", 2, 3);
  px(18 + bx, 10 + by, "#120f1a", 2, 3);
  px(13 + bx, 11 + by, eyeHex, 1, 2);
  px(19 + bx, 11 + by, eyeHex, 1, 2);
  px(12 + bx, 10 + by, "#ffffff", 1, 1);
  px(18 + bx, 10 + by, "#ffffff", 1, 1);

  if (headgear === "anh_sat") {
    px(10 + bx, 12 + by, "#1a1726", 12, 3);
    px(11 + bx, 13 + by, trimColor.base, 10, 1);
  }

  // === 5. KIỂU TÓC ===
  if (hairStyle === "kho_tu") {
    px(15 + bx, 8 + by, trimColor.base, 2, 1);
  } else {
    px(9 + bx, 4 + by, outline, 14, 5);
    px(10 + bx, 5 + by, hairColor.base, 12, 4);
    px(11 + bx, 5 + by, hairColor.light, 6, 1);
    px(9 + bx, 8 + by, hairColor.dark, 2, 6);
    px(21 + bx, 8 + by, hairColor.dark, 2, 6);

    if (hairStyle === "hiep_khach") {
      px(13 + bx, 1 + by, outline, 6, 4);
      px(14 + bx, 2 + by, hairColor.base, 4, 3);
      px(14 + bx, 4 + by, trimColor.base, 4, 1);
      px(11 + bx - capeSway, 2 + by, hairColor.dark, 3, 3);
    } else if (hairStyle === "linh_dong") {
      px(7 + bx, 4 + by, outline, 4, 4);
      px(8 + bx, 5 + by, hairColor.base, 2, 2);
      px(21 + bx, 4 + by, outline, 4, 4);
      px(22 + bx, 5 + by, hairColor.base, 2, 2);
    } else if (hairStyle === "cuong_ma") {
      px(8 + bx, 2 + by, hairColor.base, 3, 3);
      px(14 + bx, 1 + by, hairColor.light, 4, 4);
      px(21 + bx, 2 + by, hairColor.base, 3, 3);
    } else if (hairStyle === "kiem_khach") {
      px(11 + bx, 3 + by, hairColor.light, 10, 2);
    }
  }

  // === 6. MŨ / QUÁN ===
  if (headgear === "ngoc_quan") {
    px(13 + bx, 1 + by, outline, 6, 4);
    px(14 + bx, 2 + by, trimColor.base, 4, 3);
    px(15 + bx, 2 + by, "#5fbf8a", 2, 2);
    px(12 + bx, 3 + by, trimColor.light, 8, 1);
  } else if (headgear === "dau_lap") {
    px(4 + bx, 5 + by, outline, 24, 3);
    px(7 + bx, 3 + by, outline, 18, 3);
    px(12 + bx, 1 + by, outline, 8, 3);
    px(5 + bx, 6 + by, "#b89352", 22, 1);
    px(8 + bx, 4 + by, "#d9b25f", 16, 2);
    px(13 + bx, 2 + by, trimColor.base, 6, 2);
  } else if (headgear === "sung_ma") {
    px(8 + bx, 1 + by, "#5c0f22", 3, 4);
    px(7 + bx, 0 + by, "#d0573c", 2, 3);
    px(21 + bx, 1 + by, "#5c0f22", 3, 4);
    px(23 + bx, 0 + by, "#d0573c", 2, 3);
  } else if (headgear === "kim_co") {
    px(9 + bx, 6 + by, "#ffd86e", 14, 2);
    px(15 + bx, 5 + by, "#d0573c", 2, 2);
  }

  if (state === "hurt" && frameIdx === 0) {
    ctx.save();
    ctx.globalAlpha = 0.45;
    px(8 + bx, 4 + by, "#ff4a66", 16, 21);
    ctx.restore();
  } else if (state === "tau-hoa") {
    const sparkCol = frameIdx % 2 === 0 ? "#d45eff" : "#ff244c";
    px(5, 8 + (frameIdx % 3) * 3, sparkCol, 2, 3);
    px(25, 10 + ((frameIdx + 1) % 3) * 3, sparkCol, 2, 3);
  }
}

function buildStateSheet(resolved, state, frameCount, fps, loop) {
  const fw = 32;
  const fh = 32;
  const { canvas, ctx } = makeSurface(fw * frameCount, fh);
  const frames = [];

  for (let i = 0; i < frameCount; i++) {
    drawCharacterFrame(ctx, i * fw, 0, resolved, state, i);
    frames.push({ frame: { x: i * fw, y: 0, w: fw, h: fh } });
  }

  return {
    key: `custom/${state}`,
    image: canvas,
    frames,
    meta: { size: { w: fw * frameCount, h: fh } },
    pixelfx: { fps, loop, pivot: [16, 26] },
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
    idle: buildStateSheet(resolved, "idle", 4, 6, true),
    run: buildStateSheet(resolved, "run", 6, 11, true),
    attack: buildStateSheet(resolved, "attack", 4, 14, false),
    dash: buildStateSheet(resolved, "dash", 3, 14, false),
    sit: buildStateSheet(resolved, "sit", 2, 3, true),
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
 * Vẽ nhân vật Chibi lên `<canvas>` UI (bệ chọn nhân vật, Tạo nhân vật, Bảng Nhân Vật).
 */
export function drawCustomCharacterPreview(canvas, appearance, opts = {}) {
  if (!canvas || typeof canvas.getContext !== "function") return;
  const ctx = canvas.getContext("2d");
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  ctx.imageSmoothingEnabled = false;

  const cx = Math.floor(w * 0.5);
  const footY = Math.floor(h * 0.82);

  if (!appearance) {
    fillPixelEllipse(ctx, cx, footY, 20, 6, "rgba(217, 178, 95, 0.14)");
    plotPixelEllipse(ctx, cx, footY, 20, 6, "rgba(217, 178, 95, 0.45)");
    return;
  }

  const sheets = getCharacterSheets(appearance);
  const norm = sheets.appearance;
  const trim = byId(TRIM_COLORS, norm.trimColor);
  const auraColor = opts.pathColor || trim.base;
  const state = opts.animState || "idle";
  const timeSec = opts.timeSec ?? 0;
  const scale = opts.scale ?? Math.max(2, Math.floor(w / 34));

  fillPixelEllipse(ctx, cx, footY, 20, 6, "rgba(18, 22, 18, 0.88)");
  plotPixelEllipse(ctx, cx, footY, 20, 6, auraColor);

  const sheet = sheets[state] ?? sheets.idle;
  const fi = getSheetFrameIndex(sheet, timeSec, true);
  drawSheetFrame(ctx, sheet, fi, cx, footY - 2, { scale });
}

/**
 * Vẽ Chân Dung Cận Cảnh Sắc Nét (Avatar góc trên-trái HUD, lưới 44x44 chi tiết, 0 ellipse/arc/gradient mượt).
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
  const trim = byId(TRIM_COLORS, norm.trimColor);
  const eye = byId(EYE_COLORS, norm.eyeColor);

  // Nền ngọc bích đậm phân dải pixel sắc nét
  plotRect(ctx, 0, 0, w, h, "#090c09");
  plotRect(ctx, 4, 4, w - 8, h - 8, "#111b15");
  plotRect(ctx, 10, 8, w - 20, h - 16, opts.bgTint || "#20392c");

  const sx = w / 44;
  const sy = h / 44;
  const r = (x, y, rw, rh, col) => {
    ctx.fillStyle = col;
    ctx.fillRect(Math.round(x * sx), Math.round(y * sy), Math.max(1, Math.round(rw * sx)), Math.max(1, Math.round(rh * sy)));
  };

  // Vòng sáng huyền ngọc pixel phía sau nhân vật
  plotPixelEllipse(ctx, Math.round(w * 0.5), Math.round(h * 0.46), Math.round(w * 0.34), Math.round(h * 0.34), "rgba(217, 178, 95, 0.35)");

  // Tóc dài xõa sau vai
  if (norm.hairStyle !== "kho_tu") {
    r(11, 10, 22, 26, "#0d0c12");
    r(12, 11, 20, 24, hair.dark);
    r(10, 15, 3, 18, hair.dark);
    r(31, 15, 3, 18, hair.dark);
  }

  // Cổ & vai áo giao lĩnh nhiều lớp
  r(8, 31, 28, 13, "#0e0c12");
  r(9, 32, 26, 12, outfit.base);
  r(10, 32, 8, 12, outfit.light);
  r(26, 32, 8, 12, outfit.dark);
  // Cổ áo V giao lĩnh viền vàng đồng
  r(15, 31, 14, 5, skin.shadow);
  r(18, 30, 8, 4, skin.base);
  r(14, 32, 3, 11, trim.base);
  r(27, 32, 3, 11, trim.base);
  r(16, 35, 3, 8, trim.light);
  r(25, 35, 3, 8, trim.light);
  r(19, 37, 6, 7, outfit.dark);

  // Khuôn mặt Chibi thon gọn (có má bầu và cằm)
  r(13, 12, 18, 19, "#120f18");
  r(14, 13, 16, 16, skin.base);
  r(16, 29, 12, 2, skin.base);
  r(18, 30, 8, 1, skin.shadow);
  // Highlight má & bóng đổ sống mũi
  r(14, 14, 5, 13, skin.highlight);
  r(27, 14, 3, 14, skin.shadow);
  r(15, 24, 3, 2, "#f0a8a0");
  r(26, 24, 3, 2, "#f0a8a0");
  r(20, 26, 4, 1, "#c47e74");

  // Đôi mắt Chibi cổ phong to có chiều sâu
  r(15, 19, 5, 5, "#100e17");
  r(24, 19, 5, 5, "#100e17");
  r(16, 20, 4, 4, "#ffffff");
  r(24, 20, 4, 4, "#ffffff");
  r(17, 20, 3, 4, eye.hex);
  r(24, 20, 3, 4, eye.hex);
  r(18, 21, 2, 2, "#120f1a");
  r(25, 21, 2, 2, "#120f1a");
  r(16, 20, 1, 1, "#ffffff");
  r(24, 20, 1, 1, "#ffffff");
  // Chân mày thanh tú
  r(15, 17, 5, 1, hair.dark);
  r(24, 17, 5, 1, hair.dark);

  // Tóc mái nhiều lớp rủ xuống trán & hai bên mai
  if (norm.hairStyle !== "kho_tu") {
    r(12, 7, 20, 9, "#0d0c12");
    r(13, 8, 18, 7, hair.base);
    r(15, 9, 12, 2, hair.light);
    // Lọn tóc mái rẽ ngôi tự nhiên
    r(14, 13, 3, 5, hair.base);
    r(19, 12, 4, 5, hair.base);
    r(26, 13, 4, 5, hair.base);
    r(12, 15, 2, 12, hair.dark);
    r(30, 15, 2, 12, hair.dark);
    if (norm.hairStyle === "hiep_khach") {
      r(18, 2, 8, 6, "#0d0c12");
      r(19, 3, 6, 5, hair.base);
      r(18, 6, 8, 2, trim.base);
    }
  } else {
    r(21, 14, 2, 2, trim.base);
  }

  if (norm.headgear === "ngoc_quan") {
    r(18, 3, 8, 5, trim.base);
    r(20, 4, 4, 3, "#5fbf8a");
  } else if (norm.headgear === "kim_co") {
    r(13, 12, 18, 2, "#ffd86e");
    r(21, 11, 2, 2, "#d0573c");
  }
}
