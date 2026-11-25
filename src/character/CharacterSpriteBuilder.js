/**
 * Bộ sinh Sprite Nhân Vật Pixel Art Đa Lớp (32x32 mỗi frame, chuẩn Dark Fantasy Cổ Phong).
 * Hỗ trợ tùy chỉnh tự do 7 lớp ngoại hình và xuất trực tiếp 6 bộ animation:
 * `idle` (4f), `run` (6f), `dash` (3f), `hurt` (2f), `death` (4f), `tau-hoa` (4f)
 * tương thích hoàn toàn với `drawSheetFrame()` trên cả Chiến Trường lẫn Sảnh Online.
 */
import { drawSheetFrame, getSheetFrameIndex } from "../engine/SpriteSheet.js";

export const SKIN_TONES = [
  { id: "bach_ngoc", name: "Bạch Ngọc", base: "#f3dcc4", shadow: "#c9a585", highlight: "#fff0e0" },
  { id: "phan_hong", name: "Phấn Hồng", base: "#f0c8be", shadow: "#c28f84", highlight: "#ffe4dc" },
  { id: "dong_co", name: "Đồng Cổ", base: "#d49e72", shadow: "#9c6b43", highlight: "#ebbc94" },
  { id: "bang_tuyet", name: "Băng Tuyết", base: "#dce6f2", shadow: "#9fb1c9", highlight: "#f5f9ff" },
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
  { id: "den_huyen", name: "Đen Huyền", base: "#23202e", dark: "#12101a", light: "#454059" },
  { id: "bach_phat", name: "Bạch Phát", base: "#d9e0ec", dark: "#96a2b8", light: "#ffffff" },
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
  { id: "thanh_ngoc", name: "Thanh Ngọc", base: "#216e5a", dark: "#123d32", light: "#42a88c" },
  { id: "huyen_hac", name: "Huyền Hắc", base: "#2b273b", dark: "#161321", light: "#4c4666" },
  { id: "huyet_sat", name: "Huyết Sát", base: "#8a1c33", dark: "#4d0d1b", light: "#c93856" },
  { id: "xich_viem", name: "Xích Viêm", base: "#a84419", dark: "#5e2209", light: "#e37036" },
  { id: "bach_tuyet", name: "Bạch Tuyết", base: "#cfd6e6", dark: "#8792ab", light: "#f4f7ff" },
  { id: "tu_linh", name: "Tử Linh", base: "#5b2c87", dark: "#32154f", light: "#8e52c7" },
  { id: "hoang_kim", name: "Hoàng Kim", base: "#9e7624", dark: "#59400e", light: "#d9ab45" },
  { id: "lam_bang", name: "Lam Băng", base: "#235c8f", dark: "#123354", light: "#4791cf" },
];

export const TRIM_COLORS = [
  { id: "vang_dong", name: "Vàng Đồng", base: "#d6b16a", light: "#ffe39e" },
  { id: "ngoc_bich", name: "Ngọc Bích", base: "#4de6b0", light: "#b5ffe4" },
  { id: "do_tham", name: "Chu Đỏ", base: "#ff4769", light: "#ff9eb0" },
  { id: "bac_sang", name: "Bạc Sáng", base: "#dce4f2", light: "#ffffff" },
  { id: "tim_ma", name: "Tử Tinh", base: "#b84dff", light: "#e2b3ff" },
  { id: "cam_lua", name: "Cam Hỏa", base: "#ff8c3a", light: "#ffd0a6" },
];

export const EYE_COLORS = [
  { id: "ngoc_bich", name: "Mắt Ngọc Bích", hex: "#4de6b0" },
  { id: "huyet_dong", name: "Mắt Huyết Đồng", hex: "#ff3855" },
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
    headgear: "ngoc_quan",
    outfitStyle: "truong_bao",
    outfitColor: "thanh_ngoc",
    trimColor: "vang_dong",
    eyeColor: "ngoc_bich",
    backItem: "ho_lo",
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
  // Fallback cho môi trường test Node không có DOM
  return {
    canvas: { width, height, isHeadlessMock: true },
    ctx: null,
  };
}

function drawCharacterFrame(ctx, ox, oy, resolved, state, frameIdx) {
  if (!ctx) return;

  const { skin, hairStyle, hairColor, headgear, outfitStyle, outfitColor, trimColor, eyeColor, backItem } =
    resolved;

  const px = (x, y, col, w = 1, h = 1) => {
    ctx.fillStyle = col;
    ctx.fillRect(ox + x, oy + y, w, h);
  };

  const outline = "#110e18";

  // Animation offsets
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
  } else if (state === "dash") {
    leanX = 2;
    bobY = 1;
    capeSway = -2;
    // Vệt tàn ảnh phía sau lưng khi lướt
    ctx.save();
    ctx.globalAlpha = 0.35;
    px(4 - frameIdx, 10, trimColor.base, 5, 12);
    px(2 - frameIdx, 13, outfitColor.light, 4, 8);
    ctx.restore();
  } else if (state === "hurt") {
    leanX = -1;
    bobY = frameIdx === 0 ? -1 : 0;
  } else if (state === "death") {
    if (frameIdx === 0) {
      bobY = 2;
    } else if (frameIdx === 1) {
      bobY = 5;
    } else {
      // Nằm gục hóa thành đốm linh hồn & y phục trên đất
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

  // Bóng đổ dưới chân
  ctx.save();
  ctx.globalAlpha = 0.35;
  px(10, 26, "#06050a", 12, 2);
  ctx.restore();

  // === 1. PHÁP KHÍ ĐEO LƯNG (BACK LAYER) ===
  if (backItem === "nguyet_luan") {
    px(7, 6 + by, trimColor.base, 18, 1);
    px(7, 19 + by, trimColor.base, 18, 1);
    px(6, 7 + by, trimColor.light, 1, 12);
    px(25, 7 + by, trimColor.light, 1, 12);
  } else if (backItem === "huyet_duc") {
    const wingLift = frameIdx % 2 === 0 ? 0 : -1;
    px(4, 9 + by + wingLift, "#5e0f24", 6, 8);
    px(5, 10 + by + wingLift, "#ff3855", 4, 5);
    px(22, 9 + by + wingLift, "#5e0f24", 6, 8);
    px(23, 10 + by + wingLift, "#ff3855", 4, 5);
  } else if (backItem === "co_kiem") {
    px(8, 4 + by, outline, 3, 18);
    px(9, 5 + by, trimColor.light, 1, 3);
    px(7, 7 + by, trimColor.base, 5, 1);
    px(9, 8 + by, "#6a748a", 1, 13);
  } else if (backItem === "ho_lo") {
    px(6, 11 + by, outline, 5, 9);
    px(7, 12 + by, "#d4943b", 3, 3);
    px(7, 15 + by, "#ff4769", 3, 1);
    px(6, 16 + by, "#c27d29", 5, 3);
  }

  // Tà áo choàng sau (nếu mặc Áo Choàng Tà Tu hoặc Trường Bào)
  if (outfitStyle === "ta_tu") {
    px(8 + capeSway, 14 + by, outline, 16, 11);
    px(9 + capeSway, 15 + by, outfitColor.dark, 14, 9);
    px(10 + capeSway, 23 + by, trimColor.base, 3, 2);
    px(19 + capeSway, 23 + by, trimColor.base, 3, 2);
  }

  // === 2. CHÂN & GIÀY (LEGS / BOOTS) ===
  px(11 + bx, 23 + leftLegY, outline, 4, 4);
  px(12 + bx, 23 + leftLegY, "#231e30", 2, 3);
  px(17 + bx, 23 + rightLegY, outline, 4, 4);
  px(18 + bx, 23 + rightLegY, "#231e30", 2, 3);

  // === 3. THÂN ĐẠO BÀO / CHIẾN GIÁP (TORSO & ROBE) ===
  px(10 + bx, 14 + by, outline, 12, 10);
  px(11 + bx, 15 + by, outfitColor.base, 10, 8);
  px(11 + bx, 15 + by, outfitColor.light, 3, 7);
  px(18 + bx, 15 + by, outfitColor.dark, 3, 7);

  if (outfitStyle === "truong_bao") {
    // Vạt chéo cổ phong + đai ngọc
    px(10 + bx, 21 + by, outline, 12, 4);
    px(11 + bx, 21 + by, outfitColor.base, 10, 3);
    px(14 + bx, 15 + by, trimColor.base, 2, 9);
    px(11 + bx, 19 + by, trimColor.base, 10, 2);
    px(15 + bx, 19 + by, trimColor.light, 2, 2);
  } else if (outfitStyle === "doan_y") {
    // Đoản y gọn gàng lộ đai lưng rộng
    px(11 + bx, 18 + by, trimColor.base, 10, 2);
    px(13 + bx, 15 + by, trimColor.light, 1, 3);
    px(18 + bx, 15 + by, trimColor.light, 1, 3);
  } else if (outfitStyle === "chien_giap") {
    // Giáp vai + hộ tâm kính
    px(8 + bx, 14 + by, outline, 4, 4);
    px(20 + bx, 14 + by, outline, 4, 4);
    px(9 + bx, 15 + by, trimColor.base, 3, 2);
    px(20 + bx, 15 + by, trimColor.base, 3, 2);
    px(13 + bx, 16 + by, "#b8c2d6", 6, 4);
    px(15 + bx, 17 + by, trimColor.light, 2, 2);
  } else if (outfitStyle === "ta_tu") {
    // Viền tà ấn giữa ngực
    px(12 + bx, 15 + by, trimColor.base, 2, 8);
    px(18 + bx, 15 + by, trimColor.base, 2, 8);
    px(14 + bx, 18 + by, trimColor.light, 4, 2);
  }

  // Hai tay & cổ tay áo
  px(8 + bx, 16 + by + leftArmY, outline, 3, 6);
  px(9 + bx, 16 + by + leftArmY, outfitColor.dark, 2, 4);
  px(9 + bx, 20 + by + leftArmY, skin.base, 2, 2);

  px(21 + bx, 16 + by + rightArmY, outline, 3, 6);
  px(21 + bx, 16 + by + rightArmY, outfitColor.light, 2, 4);
  px(21 + bx, 20 + by + rightArmY, skin.base, 2, 2);

  // === 4. ĐẦU, KHUÔN MẶT & MẮT ===
  // Tóc xõa sau gáy
  if (hairStyle === "tien_phong" || hairStyle === "cuong_ma") {
    px(9 + bx - capeSway, 9 + by, outline, 14, 9);
    px(10 + bx - capeSway, 10 + by, hairColor.dark, 12, 7);
  }

  // Viền đầu & khuôn mặt
  px(10 + bx, 6 + by, outline, 12, 10);
  px(11 + bx, 7 + by, skin.base, 10, 8);
  px(11 + bx, 7 + by, skin.highlight, 3, 6);
  px(19 + bx, 8 + by, skin.shadow, 2, 6);

  // Đôi mắt phát sáng theo linh hồn
  const eyeHex = state === "tau-hoa" ? "#ff244c" : eyeColor.hex;
  px(13 + bx, 11 + by, "#120f1a", 2, 2);
  px(18 + bx, 11 + by, "#120f1a", 2, 2);
  px(14 + bx, 11 + by, eyeHex, 1, 2);
  px(19 + bx, 11 + by, eyeHex, 1, 2);

  // Khăn bịt mặt Ảnh Sát (che nửa dưới mặt)
  if (headgear === "anh_sat") {
    px(11 + bx, 12 + by, "#1a1726", 10, 3);
    px(12 + bx, 13 + by, trimColor.base, 8, 1);
  }

  // === 5. KIỂU TÓC (HAIRSTYLE) ===
  if (hairStyle === "kho_tu") {
    // Đầu trần + ấn chu sa giữa trán
    px(15 + bx, 9 + by, trimColor.base, 2, 1);
  } else {
    // Mái tóc trước trán & hai mai
    px(10 + bx, 5 + by, outline, 12, 4);
    px(11 + bx, 6 + by, hairColor.base, 10, 3);
    px(12 + bx, 6 + by, hairColor.light, 5, 1);
    px(10 + bx, 8 + by, hairColor.dark, 2, 5);
    px(20 + bx, 8 + by, hairColor.dark, 2, 5);

    if (hairStyle === "hiep_khach") {
      // Búi tóc đuôi ngựa cao
      px(13 + bx, 2 + by, outline, 6, 4);
      px(14 + bx, 3 + by, hairColor.base, 4, 3);
      px(14 + bx, 5 + by, trimColor.base, 4, 1);
      px(11 + bx - capeSway, 3 + by, hairColor.dark, 3, 3);
    } else if (hairStyle === "linh_dong") {
      // Hai búi tròn hai bên
      px(8 + bx, 5 + by, outline, 4, 4);
      px(9 + bx, 6 + by, hairColor.base, 2, 2);
      px(20 + bx, 5 + by, outline, 4, 4);
      px(21 + bx, 6 + by, hairColor.base, 2, 2);
    } else if (hairStyle === "cuong_ma") {
      // Tóc dựng gai cuồng dã
      px(9 + bx, 3 + by, hairColor.base, 3, 3);
      px(14 + bx, 2 + by, hairColor.light, 4, 4);
      px(20 + bx, 3 + by, hairColor.base, 3, 3);
    } else if (hairStyle === "kiem_khach") {
      px(12 + bx, 4 + by, hairColor.light, 8, 2);
    }
  }

  // === 6. MŨ / QUÁN / SỪNG (HEADGEAR) ===
  if (headgear === "ngoc_quan") {
    px(13 + bx, 2 + by, outline, 6, 4);
    px(14 + bx, 3 + by, trimColor.base, 4, 3);
    px(15 + bx, 3 + by, "#4de6b0", 2, 2);
    px(12 + bx, 4 + by, trimColor.light, 8, 1);
  } else if (headgear === "dau_lap") {
    // Nón lá hiệp khách rộng vành
    px(5 + bx, 6 + by, outline, 22, 3);
    px(8 + bx, 4 + by, outline, 16, 3);
    px(12 + bx, 2 + by, outline, 8, 3);
    px(6 + bx, 7 + by, "#b89352", 20, 1);
    px(9 + bx, 5 + by, "#d4af6a", 14, 2);
    px(13 + bx, 3 + by, trimColor.base, 6, 2);
  } else if (headgear === "sung_ma") {
    px(9 + bx, 2 + by, "#5c0f22", 3, 4);
    px(8 + bx, 1 + by, "#ff3855", 2, 3);
    px(20 + bx, 2 + by, "#5c0f22", 3, 4);
    px(22 + bx, 1 + by, "#ff3855", 2, 3);
  } else if (headgear === "kim_co") {
    px(10 + bx, 7 + by, "#ffd86e", 12, 2);
    px(15 + bx, 6 + by, "#ff3855", 2, 2);
  }

  // === 7. HIỆU ỨNG TRẠNG THÁI (HURT / TẨU HỎA NHẬP MA) ===
  if (state === "hurt" && frameIdx === 0) {
    ctx.save();
    ctx.globalAlpha = 0.45;
    px(9 + bx, 5 + by, "#ff4a66", 14, 20);
    ctx.restore();
  } else if (state === "tau-hoa") {
    const sparkCol = frameIdx % 2 === 0 ? "#d45eff" : "#ff244c";
    px(6, 8 + (frameIdx % 3) * 3, sparkCol, 2, 3);
    px(24, 10 + ((frameIdx + 1) % 3) * 3, sparkCol, 2, 3);
    px(9 + (frameIdx % 2) * 12, 3, "#ff7af5", 2, 2);
  }
}

function buildStateSheet(resolved, state, frameCount, fps, loop) {
  const fw = 32;
  const fh = 32;
  const { canvas, ctx } = makeSurface(fw * frameCount, fh);
  const frames = [];

  for (let i = 0; i < frameCount; i++) {
    drawCharacterFrame(ctx, i * fw, 0, resolved, state, i);
    frames.push({
      frame: { x: i * fw, y: 0, w: fw, h: fh },
    });
  }

  return {
    key: `custom/${state}`,
    image: canvas,
    frames,
    meta: { size: { w: fw * frameCount, h: fh } },
    pixelfx: {
      fps,
      loop,
      pivot: [16, 26],
    },
  };
}

const SHEET_CACHE = new Map();
const MAX_CACHE = 56;

export function getCharacterSheets(rawAppearance) {
  const norm = normalizeAppearance(rawAppearance);
  const cacheKey = getAppearanceKey(norm);

  if (SHEET_CACHE.has(cacheKey)) {
    return SHEET_CACHE.get(cacheKey);
  }

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
    dash: buildStateSheet(resolved, "dash", 3, 14, false),
    hurt: buildStateSheet(resolved, "hurt", 2, 10, false),
    death: buildStateSheet(resolved, "death", 4, 6, false),
    "tau-hoa": buildStateSheet(resolved, "tau-hoa", 4, 10, true),
  };

  if (SHEET_CACHE.size >= MAX_CACHE) {
    const oldest = SHEET_CACHE.keys().next().value;
    SHEET_CACHE.delete(oldest);
  }
  SHEET_CACHE.set(cacheKey, bundle);
  return bundle;
}

/**
 * Vẽ nhân vật tùy chỉnh lên một `<canvas>` UI (bệ đá, màn hình Tạo Nhân Vật, Gương Hóa Hình, Bảng Xếp Hạng).
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
    ctx.fillStyle = "rgba(156, 122, 68, 0.16)";
    ctx.beginPath();
    ctx.ellipse(cx, footY, 22, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(156, 122, 68, 0.45)";
    ctx.stroke();
    return;
  }

  const sheets = getCharacterSheets(appearance);
  const norm = sheets.appearance;
  const trim = byId(TRIM_COLORS, norm.trimColor);
  const auraColor = opts.pathColor || trim.base;
  const state = opts.animState || "idle";
  const timeSec = opts.timeSec ?? 0;
  const scale = opts.scale ?? Math.max(2, Math.floor(w / 34));

  // Đế trận pháp dưới chân
  ctx.save();
  ctx.fillStyle = "rgba(26, 22, 38, 0.85)";
  ctx.beginPath();
  ctx.ellipse(cx, footY, 22, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = auraColor;
  ctx.stroke();
  ctx.restore();

  const sheet = sheets[state] ?? sheets.idle;
  const fi = getSheetFrameIndex(sheet, timeSec, true);
  drawSheetFrame(ctx, sheet, fi, cx, footY - 2, { scale });
}
