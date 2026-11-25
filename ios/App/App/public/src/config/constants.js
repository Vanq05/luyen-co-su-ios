export const GAME_WIDTH = 384;
export const GAME_HEIGHT = 216;
export const TILE_SIZE = 16;
export const FIXED_DT = 1 / 60;

export const PALETTE = {
  bgVoid: "#0d0c12",
  stoneDark: "#121018",
  stoneMid: "#1c1926",
  stoneLight: "#2e2a3d",
  mossDark: "#16241d",
  mossMid: "#243b2e",
  earthDark: "#241b16",
  bronze: "#9c7a44",
  bronzeBright: "#d6b16a",
  jadeGlow: "#4de6b0",
  moonCyan: "#5ef2d6",
  flameOrange: "#ff7b39",
  bloodGlow: "#ff3855",
  cursePurple: "#a84cff",
  textPrimary: "#ece6d8",
  textMuted: "#968fa3",
};

/**
 * 5 ô Không Khiếu mẫu cho Bước 1 (Sandbox điều khiển cảm ứng & vệt ngắm).
 */
export const APERTURE_SLOTS = {
  passive: {
    id: "passive",
    slotType: "Bản Mệnh Cổ",
    name: "Thiết Cốt Cổ",
    shortLabel: "Thiết Cốt",
    badge: "BỊ ĐỘNG",
    color: "#b4b8c8",
    description: "+30% Giáp · -10% Tốc chạy",
  },
  skill1: {
    id: "skill1",
    slotType: "Chủ Động 1",
    name: "Nguyệt Quang Cổ",
    shortLabel: "Nguyệt Quang",
    keyHint: "J",
    aimType: "line",
    range: 112,
    radius: 10,
    cooldown: 1.6,
    color: "#5ef2d6",
  },
  skill2: {
    id: "skill2",
    slotType: "Chủ Động 2",
    name: "Hỏa Thán Cổ",
    shortLabel: "Hỏa Thán",
    keyHint: "K",
    aimType: "aoe",
    range: 96,
    radius: 26,
    cooldown: 3.2,
    color: "#ff7b39",
  },
  move: {
    id: "move",
    slotType: "Di Chuyển Cổ",
    name: "Ảnh Bộ Cổ",
    shortLabel: "Ảnh Bộ",
    keyHint: "Space",
    aimType: "dash",
    range: 64,
    radius: 12,
    cooldown: 2.2,
    color: "#b36bff",
  },
  ult: {
    id: "ult",
    slotType: "Sát Chiêu Cổ",
    name: "Huyết Nguyệt Cổ",
    shortLabel: "Huyết Nguyệt",
    keyHint: "L",
    aimType: "arc",
    range: 122,
    arcSpread: (75 * Math.PI) / 180,
    cooldown: 7.5,
    color: "#ff3358",
  },
};
