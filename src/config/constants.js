export const GAME_WIDTH = 960;
export const GAME_HEIGHT = 540;
export const TILE_SIZE = 16;
export const FIXED_DT = 1 / 60;

export const PALETTE = {
  bgVoid: "#0b0d0a",
  stoneDark: "#121018",
  stoneMid: "#1c1926",
  stoneLight: "#2e2a3d",
  mossDark: "#16241d",
  mossMid: "#243b2e",
  earthDark: "#241b16",
  bronze: "#9c7a44",
  bronzeBright: "#d9b25f",
  jadeGlow: "#5fbf8a",
  moonCyan: "#5ef2d6",
  flameOrange: "#ff7b39",
  bloodGlow: "#d0573c",
  cursePurple: "#a84cff",
  textPrimary: "#f1e6c8",
  textMuted: "#a89d86",
};

export const COTIENLO_PALETTE = {
  inkBg: "#0b0d0a",
  inkPanel: "rgba(18, 16, 11, 0.86)",
  parchment: "#efe3c8",
  parchmentDark: "#e2d2b0",
  woodDark: "#3b2818",
  woodMid: "#5b4129",
  gold: "#c89d54",
  goldBright: "#d9b25f",
  jade: "#38a889",
  jadeBright: "#5fbf8a",
  crimson: "#b82b24",
  crimsonBright: "#d0573c",
  textInk: "#261c12",
  textLight: "#f1e6c8",
  textSub: "#b8ad94",
};

export const RANK_ESSENCE_COLORS = {
  1: { name: "Thanh Đồng Chân Nguyên", color: "#3ec99a" },
  2: { name: "Xích Thiết Chân Nguyên", color: "#e63e44" },
  3: { name: "Bạch Ngân Chân Nguyên", color: "#e2efff" },
  4: { name: "Hoàng Kim Chân Nguyên", color: "#ffd047" },
  5: { name: "Tử Tinh Chân Nguyên", color: "#c066ff" },
};

/**
 * Cấu hình 5 ô Không Khiếu mẫu giữ tương thích ngược nếu cần fallback.
 */
export const APERTURE_SLOTS = {
  passive: {
    id: "passive",
    slotType: "Bị Động",
    name: "Thú Bì Cổ",
    shortLabel: "Thú Bì",
    badge: "BỊ ĐỘNG",
    color: "#c89d54",
    description: "Kích hoạt Hướng Thủ · +Giáp",
  },
  skill1: {
    id: "skill1",
    slotType: "Ô 1",
    name: "Nguyệt Quang Cổ",
    shortLabel: "Nguyệt Quang",
    keyHint: "1",
    aimType: "line",
    range: 140,
    radius: 12,
    cooldown: 1.4,
    color: "#5ef2d6",
  },
  skill2: {
    id: "skill2",
    slotType: "Ô 2",
    name: "Hỏa Thán Cổ",
    shortLabel: "Hỏa Thán",
    keyHint: "2",
    aimType: "aoe",
    range: 120,
    radius: 30,
    cooldown: 3.0,
    color: "#ff7b39",
  },
  move: {
    id: "move",
    slotType: "Lướt",
    name: "Ảnh Bộ Cổ",
    shortLabel: "Ảnh Bộ",
    keyHint: "Space",
    aimType: "dash",
    range: 72,
    radius: 12,
    cooldown: 1.8,
    color: "#b36bff",
  },
  ult: {
    id: "ult",
    slotType: "Sát Chiêu",
    name: "Nguyệt Hoa Loạn Vũ",
    shortLabel: "Nguyệt Hoa",
    keyHint: "Q",
    aimType: "arc",
    range: 140,
    arcSpread: (90 * Math.PI) / 180,
    cooldown: 8.0,
    color: "#d9b25f",
  },
};
