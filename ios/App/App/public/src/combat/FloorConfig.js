/**
 * Cấu hình 3 Tầng Bí Cảnh, Quái thường và Boss của "Luyện Cổ Sư".
 */

export const WORLD_WIDTH = 576;
export const WORLD_HEIGHT = 352;

export const FLOOR_DEFS = {
  1: {
    floor: 1,
    name: "Tầng 1 · Rừng Chướng Khí",
    tilesetKey: "tilesets/tang1-rung-chuong-khi",
    ambientColor: "#151d18",
    bossId: "ngo_cong",
    bossName: "Bách Độc Ngô Công Vương",
    bossSubtitle: "Phá 6 đốt sáng rơi Huyết Tinh · Dùng Viêm kích nổ Vũng Độc",
    waves: [
      [
        { type: "doc_nhan_thiem", count: 4 },
        { type: "huyet_phong_dan", count: 3 },
      ],
      [
        { type: "doc_nhan_thiem", count: 3 },
        { type: "huyet_phong_dan", count: 3 },
        { type: "thiet_giap_bo_cap", count: 2 },
      ],
    ],
    hazards: [
      { kind: "poison_pool", x: 168, y: 120, r: 22 },
      { kind: "poison_pool", x: 408, y: 120, r: 22 },
      { kind: "poison_pool", x: 184, y: 244, r: 24 },
      { kind: "poison_pool", x: 392, y: 244, r: 24 },
    ],
    obstacles: [
      { x: 124, y: 92, r: 12, frame: 5 },
      { x: 452, y: 92, r: 12, frame: 5 },
      { x: 124, y: 260, r: 12, frame: 6 },
      { x: 452, y: 260, r: 12, frame: 6 },
    ],
  },
  2: {
    floor: 2,
    name: "Tầng 2 · Bạch Cốt Mộ Địa",
    tilesetKey: "tilesets/tang2-bach-cot-mo-dia",
    ambientColor: "#171421",
    bossId: "mac_vo_tam",
    bossName: "Thi Khôi Cổ Sư · Mạc Vô Tâm",
    bossSubtitle: "Dồn sát thương ngắt nhịp khi Boss vận công gọi đệ để làm choáng 3s",
    waves: [
      [
        { type: "bach_cot_khoi_loi", count: 4 },
        { type: "oan_linh_co_trung", count: 3 },
      ],
      [
        { type: "bach_cot_khoi_loi", count: 3 },
        { type: "oan_linh_co_trung", count: 3 },
        { type: "huyet_y_quy_co_su", count: 2 },
      ],
    ],
    hazards: [
      { kind: "wisp_crack", x: 170, y: 132, r: 20 },
      { kind: "wisp_crack", x: 406, y: 132, r: 20 },
      { kind: "wisp_crack", x: 288, y: 256, r: 22 },
    ],
    obstacles: [
      { x: 140, y: 98, r: 12, frame: 5 },
      { x: 436, y: 98, r: 12, frame: 5 },
      { x: 140, y: 254, r: 12, frame: 6 },
      { x: 436, y: 254, r: 12, frame: 6 },
    ],
  },
  3: {
    floor: 3,
    name: "Tầng 3 · Xích Viêm Cổ Quật",
    tilesetKey: "tilesets/tang3-xich-viem-co-quat",
    ambientColor: "#1f1417",
    bossId: "van_co_ta_lo",
    bossName: "Vạn Cổ Tà Lô",
    bossSubtitle: "Phá 4 chân vạc lộ lõi · Giết Dị Cổ gần vạc khi hút để gây Nổ Vạc (-15% HP)",
    waves: [
      [
        { type: "dung_nham_giap_trung", count: 4 },
        { type: "viem_linh_co", count: 3 },
      ],
      [
        { type: "dung_nham_giap_trung", count: 3 },
        { type: "viem_linh_co", count: 3 },
        { type: "ta_hoa_luyen_su", count: 2 },
      ],
    ],
    hazards: [
      { kind: "lava_trap", x: 168, y: 128, r: 22 },
      { kind: "lava_trap", x: 408, y: 128, r: 22 },
      { kind: "lava_trap", x: 168, y: 236, r: 22 },
      { kind: "lava_trap", x: 408, y: 236, r: 22 },
    ],
    obstacles: [
      { x: 112, y: 94, r: 12, frame: 5 },
      { x: 464, y: 94, r: 12, frame: 5 },
      { x: 112, y: 262, r: 12, frame: 6 },
      { x: 464, y: 262, r: 12, frame: 6 },
    ],
  },
};

export const ENEMY_TYPES = {
  // Tầng 1
  doc_nhan_thiem: {
    name: "Độc Nhãn Thiềm",
    spriteKey: "enemies/doc-nhan-thiem",
    hp: 62,
    speed: 36,
    radius: 10,
    damage: 14,
    ai: "hopper",
    projColor: "#8dff54",
  },
  huyet_phong_dan: {
    name: "Huyết Phong Đàn",
    spriteKey: "enemies/huyet-phong-dan",
    hp: 40,
    speed: 64,
    radius: 8,
    damage: 11,
    ai: "swarmer",
  },
  thiet_giap_bo_cap: {
    name: "Thiết Giáp Bọ Cạp",
    spriteKey: "enemies/thiet-giap-bo-cap",
    hp: 95,
    speed: 44,
    radius: 11,
    damage: 19,
    armor: 0.25,
    ai: "charger",
  },
  // Tầng 2
  bach_cot_khoi_loi: {
    name: "Bạch Cốt Khôi Lỗi",
    spriteKey: "enemies/bach-cot-khoi-loi",
    hp: 86,
    speed: 48,
    radius: 10,
    damage: 18,
    ai: "chaser",
  },
  huyet_y_quy_co_su: {
    name: "Huyết Y Quỷ Cổ Sư",
    spriteKey: "enemies/huyet-y-quy-co-su",
    hp: 78,
    speed: 34,
    radius: 10,
    damage: 17,
    ai: "caster",
    projColor: "#ff4769",
  },
  oan_linh_co_trung: {
    name: "Oán Linh Cổ Trùng",
    spriteKey: "enemies/oan-linh-co-trung",
    hp: 58,
    speed: 58,
    radius: 9,
    damage: 15,
    ai: "orbiter",
  },
  // Tầng 3
  dung_nham_giap_trung: {
    name: "Dung Nham Giáp Trùng",
    spriteKey: "enemies/dung-nham-giap-trung",
    hp: 115,
    speed: 40,
    radius: 11,
    damage: 22,
    armor: 0.2,
    ai: "charger",
  },
  viem_linh_co: {
    name: "Viêm Linh Cổ",
    spriteKey: "enemies/viem-linh-co",
    hp: 68,
    speed: 62,
    radius: 9,
    damage: 18,
    ai: "orbiter",
  },
  ta_hoa_luyen_su: {
    name: "Tà Hỏa Luyện Sư",
    spriteKey: "enemies/ta-hoa-luyen-su",
    hp: 94,
    speed: 36,
    radius: 10,
    damage: 21,
    ai: "caster",
    projColor: "#ff7b39",
  },
  // Dị Cổ do Vạn Cổ Tà Lô thả ra
  di_co: {
    name: "Dị Cổ",
    spriteKey: "enemies/di-co",
    hp: 58,
    speed: 52,
    radius: 9,
    damage: 16,
    ai: "chaser",
    dropsCore: true,
  },
};
