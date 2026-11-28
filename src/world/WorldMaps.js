import { isPointOnBridgeDeck } from "./WorldGeometry.js";

/**
 * Định nghĩa 11 Bản đồ Thế giới Mở, Thị trấn An Toàn, Thương Cảng, Thú Quật & Vực Vạn Thủ
 * cùng bảng Quái Vật (15+ loài) và NPC tương tác của Cổ Tiên Lộ.
 */

export const MONSTER_CATALOG = {
  // Mộng cảnh mở đầu & Mục tiêu tập luyện
  mong_canh_ma_anh: {
    id: "mong_canh_ma_anh",
    name: "Mộng Cảnh Ma Ảnh",
    rank: 5,
    tier: "Thường",
    hp: 420,
    speed: 44,
    radius: 12,
    damage: 10,
    exp: 35,
    stones: 15,
    dropItems: ["thao_duoc"],
    ai: "chaser",
    temperament: "aggressive",
    spriteKey: "enemies/oan-linh-co-trung",
    color: "#b36bff",
  },
  coc_thao_nhan: {
    id: "coc_thao_nhan",
    name: "Cọc Thảo Nhân",
    rank: 1,
    tier: "Thường",
    hp: 110,
    speed: 0,
    radius: 11,
    damage: 0,
    exp: 14,
    stones: 4,
    dropItems: ["thao_duoc"],
    ai: "dummy",
    color: "#d9b25f",
  },
  lon_rung: {
    id: "lon_rung",
    name: "Lợn Rừng · Dã Trư",
    rank: 1,
    tier: "Thường",
    hp: 95,
    speed: 44,
    radius: 15,
    damage: 14,
    exp: 18,
    stones: 8,
    dropItems: ["thit_thu", "mat_ong"],
    ai: "charger",
    temperament: "passive",
    spriteKey: "enemies/doc-nhan-thiem",
    color: "#c97a3a",
  },
  ong_mat_rung: {
    id: "ong_mat_rung",
    name: "Huyết Phong Đàn",
    rank: 1,
    tier: "Thường",
    hp: 70,
    speed: 62,
    radius: 13,
    damage: 11,
    exp: 15,
    stones: 6,
    dropItems: ["mat_ong", "thao_duoc"],
    ai: "swarmer",
    temperament: "mixed",
    spriteKey: "enemies/huyet-phong-dan",
    color: "#f2c14e",
  },
  lon_rung_vuong: {
    id: "lon_rung_vuong",
    name: "Lợn Rừng Vương · Bách Thú Vương",
    rank: 1,
    tier: "Bách thú vương",
    hp: 620,
    speed: 50,
    radius: 20,
    damage: 28,
    exp: 140,
    stones: 60,
    dropItems: ["nanh_lon_rung_vuong", "thit_thu", "hoi_huyet_thao"],
    ai: "charger",
    temperament: "aggressive",
    spriteKey: "enemies/thiet-giap-bo-cap",
    color: "#e69b45",
  },

  // Nhị chuyển
  thiet_giap_bo_cap: {
    id: "thiet_giap_bo_cap",
    name: "Thiết Giáp Bọ Cạp",
    rank: 2,
    tier: "Tinh anh",
    hp: 210,
    speed: 48,
    radius: 15,
    damage: 24,
    exp: 36,
    stones: 15,
    dropItems: ["ngoc_vun", "thit_thu"],
    ai: "charger",
    temperament: "mixed",
    spriteKey: "enemies/thiet-giap-bo-cap",
    color: "#9aa8c4",
  },
  thiet_giap_hat_vuong: {
    id: "thiet_giap_hat_vuong",
    name: "Thiết Giáp Hạt Vương · Bách Thú Vương",
    rank: 2,
    tier: "Bách thú vương",
    hp: 1080,
    speed: 52,
    radius: 20,
    damage: 38,
    exp: 220,
    stones: 110,
    dropItems: ["ngoc_vun", "mao_thach_trung"],
    ai: "charger",
    temperament: "aggressive",
    spriteKey: "enemies/thiet-giap-bo-cap",
    color: "#7ca8f0",
  },
  hao_dien_lang: {
    id: "hao_dien_lang",
    name: "Thanh Mao Điện Lang",
    rank: 2,
    tier: "Thường",
    hp: 220,
    speed: 64,
    radius: 15,
    damage: 26,
    exp: 44,
    stones: 20,
    dropItems: ["bom_hao_dien_lang", "thit_thu"],
    ai: "charger",
    temperament: "mixed",
    spriteKey: "enemies/oan-linh-co-trung",
    color: "#ffe15c",
  },
  tam_nha_dien_lang: {
    id: "tam_nha_dien_lang",
    name: "Tam Nha Điện Lang · Bách Thú Vương",
    rank: 2,
    tier: "Bách thú vương",
    hp: 1150,
    speed: 66,
    radius: 20,
    damage: 42,
    exp: 260,
    stones: 120,
    dropItems: ["bom_hao_dien_lang", "mao_thach_trung"],
    ai: "charger",
    spriteKey: "enemies/boss-ngo-cong",
    color: "#ffe15c",
  },
  thach_hau: {
    id: "thach_hau",
    name: "Ngọc Nhãn Thạch Hầu",
    rank: 2,
    tier: "Thường",
    hp: 250,
    speed: 58,
    radius: 15,
    damage: 28,
    exp: 52,
    stones: 22,
    dropItems: ["thit_thu", "ngoc_vun"],
    ai: "charger",
    temperament: "passive",
    spriteKey: "enemies/thach-hau",
    color: "#b6c2cf",
  },
  thach_hau_vuong: {
    id: "thach_hau_vuong",
    name: "Thạch Hầu Vương · Bách Thú Vương",
    rank: 2,
    tier: "Bách thú vương",
    hp: 1350,
    speed: 62,
    radius: 21,
    damage: 48,
    exp: 320,
    stones: 145,
    dropItems: ["mao_thach_trung", "ngoc_vun"],
    ai: "charger",
    spriteKey: "enemies/thach-hau-vuong",
    color: "#e6b85c",
  },
  coc_doc_hac_thuy: {
    id: "coc_doc_hac_thuy",
    name: "Độc Thiềm Thừ",
    rank: 2,
    tier: "Thường",
    hp: 195,
    speed: 42,
    radius: 14,
    damage: 22,
    exp: 40,
    stones: 18,
    dropItems: ["thao_duoc", "ca_linh"],
    ai: "hopper",
    temperament: "passive",
    projColor: "#73eb5e",
    spriteKey: "enemies/doc-nhan-thiem",
    color: "#73eb5e",
  },
  thiem_thu_vuong: {
    id: "thiem_thu_vuong",
    name: "Độc Thiềm Thừ Vương · Bách Thú Vương",
    rank: 3,
    tier: "Bách thú vương",
    hp: 1950,
    speed: 46,
    radius: 21,
    damage: 56,
    exp: 440,
    stones: 190,
    dropItems: ["thao_duoc_tram_nam", "hoang_tho_tinh_sa"],
    ai: "caster",
    projColor: "#73eb5e",
    spriteKey: "enemies/thiem-thu-vuong",
    color: "#80ff66",
  },
  thuy_mang: {
    id: "thuy_mang",
    name: "Hắc Thủy Mãng",
    rank: 2,
    tier: "Tinh anh",
    hp: 310,
    speed: 52,
    radius: 13,
    damage: 30,
    exp: 68,
    stones: 26,
    dropItems: ["vay_thuy_mang", "ca_linh"],
    ai: "orbiter",
    temperament: "aggressive",
    spriteKey: "enemies/ngo-cong-dot",
    color: "#3aa8e8",
  },
  thuy_mang_vuong: {
    id: "thuy_mang_vuong",
    name: "Thủy Mãng Vương",
    rank: 2,
    tier: "Bách thú vương",
    hp: 1480,
    speed: 54,
    radius: 18,
    damage: 48,
    exp: 340,
    stones: 150,
    dropItems: ["vay_thuy_mang", "bang_tuyen_dan"],
    ai: "caster",
    projColor: "#3aa8e8",
    spriteKey: "enemies/boss-ngo-cong",
    color: "#3aa8e8",
  },

  // Tam & Tứ chuyển
  kiem_truc_yeu: {
    id: "kiem_truc_yeu",
    name: "Sương Trúc Khôi Lỗi",
    rank: 3,
    tier: "Thường",
    hp: 420,
    speed: 54,
    radius: 12,
    damage: 44,
    exp: 95,
    stones: 38,
    dropItems: ["suong_truc_linh_lo", "thao_duoc_tram_nam"],
    ai: "chaser",
    temperament: "mixed",
    spriteKey: "enemies/bach-cot-khoi-loi",
    color: "#9fffe8",
  },
  mac_vo_tam: {
    id: "mac_vo_tam",
    name: "Lang Phu Độc Sư · Mạc Vô Tâm",
    rank: 3,
    tier: "Bách thú vương",
    hp: 2400,
    speed: 44,
    radius: 17,
    damage: 62,
    exp: 520,
    stones: 220,
    dropItems: ["suong_truc_linh_lo", "hoang_tho_tinh_sa"],
    ai: "caster",
    projColor: "#b36bff",
    spriteKey: "enemies/boss-mac-vo-tam",
    color: "#b36bff",
  },
  xich_viem_thu: {
    id: "xich_viem_thu",
    name: "Dung Nham Giáp Trùng",
    rank: 4,
    tier: "Tinh anh",
    hp: 760,
    speed: 52,
    radius: 13,
    damage: 68,
    exp: 180,
    stones: 72,
    dropItems: ["xich_nham_hoa_tuy", "da_cuong_hoa"],
    ai: "charger",
    temperament: "mixed",
    spriteKey: "enemies/dung-nham-giap-trung",
    color: "#ff5c2b",
  },
  xich_viem_vuong: {
    id: "xich_viem_vuong",
    name: "Địa Thử Vương · Xích Viêm",
    rank: 4,
    tier: "Bách thú vương",
    hp: 3600,
    speed: 56,
    radius: 18,
    damage: 85,
    exp: 880,
    stones: 360,
    dropItems: ["xich_nham_hoa_tuy", "mao_thach_cao"],
    ai: "caster",
    projColor: "#ff7b39",
    spriteKey: "enemies/ta-hoa-luyen-su",
    color: "#ff7b39",
  },

  // Ngũ chuyển & Boss Thế Giới
  soi_tuyet: {
    id: "soi_tuyet",
    name: "Tuyết Lang",
    rank: 5,
    tier: "Tinh anh",
    hp: 1180,
    speed: 68,
    radius: 12,
    damage: 92,
    exp: 290,
    stones: 115,
    dropItems: ["bang_tuyen_tinh", "thit_thu"],
    ai: "charger",
    temperament: "mixed",
    spriteKey: "enemies/oan-linh-co-trung",
    color: "#9ef0ff",
  },
  soi_tuyet_vuong: {
    id: "soi_tuyet_vuong",
    name: "Tuyết Lang Vương · Bách Thú Vương",
    rank: 5,
    tier: "Bách thú vương",
    hp: 5800,
    speed: 70,
    radius: 19,
    damage: 125,
    exp: 1500,
    stones: 650,
    dropItems: ["bang_tuyen_tinh", "mao_thach_cao"],
    ai: "charger",
    spriteKey: "enemies/boss-ngo-cong",
    color: "#9ef0ff",
  },
  thien_tri_ngu_vuong: {
    id: "thien_tri_ngu_vuong",
    name: "Thiên Trì Ngư Vương",
    rank: 2,
    tier: "Thiên thú vương",
    hp: 4000,
    speed: 22,
    radius: 22,
    damage: 18,
    exp: 420,
    stones: 250,
    dropItems: ["ca_linh", "thao_duoc_tram_nam", "mao_thach_trung"],
    ai: "aquatic",
    color: "#5ef2d6",
  },
  van_thu_ban_long: {
    id: "van_thu_ban_long",
    name: "VẠN THỦ BÀN LONG",
    rank: 5,
    tier: "Thiên thú vương",
    hp: 18000,
    speed: 0,
    radius: 42,
    damage: 145,
    exp: 4500,
    stones: 2200,
    dropItems: ["bang_tuyen_tinh", "xich_nham_hoa_tuy", "mao_thach_cao"],
    ai: "ban_long_boss",
    color: "#19f0c8",
  },
};

export const WORLD_MAPS = {
  hang_ngam_khai_khieu: {
    id: "hang_ngam_khai_khieu",
    name: "Hang Ngầm Sơn Trại · Dòng Suối Nguyên Tuyền",
    subtitle: "Nghi Thức Khai Khiếu Đại Điển · Đom Đóm Hy Vọng Cổ",
    biome: "spirit_cave",
    pvpZoneType: "safe",
    recommendedRealm: "Phàm nhân → Nhất chuyển",
    width: 1120,
    height: 560,
    spawn: { x: 145, y: 240 },
    waterRegions: [],
    streams: [],
    ritualSpring: {
      startX: 145,
      endX: 1000,
      centerY: 240,
      halfH: 50,
    },
    terrainZones: [
      { kind: "tall_grass", x: 560, y: 138, rx: 460, ry: 52 },
      { kind: "tall_grass", x: 560, y: 365, rx: 470, ry: 78 },
      { kind: "moss_glade", x: 120, y: 240, rx: 85, ry: 95 },
      { kind: "moss_glade", x: 1015, y: 240, rx: 80, ry: 110 },
      { kind: "flower_meadow", x: 380, y: 360, rx: 120, ry: 45 },
      { kind: "flower_meadow", x: 760, y: 142, rx: 125, ry: 38 },
      { kind: "flower_meadow", x: 820, y: 375, rx: 130, ry: 48 },
    ],
    cliffLedges: [
      { x1: 50, y1: 78, x2: 1070, y2: 78, height: 16 },
      { x1: 50, y1: 456, x2: 1070, y2: 456, height: 16 },
    ],
    paths: [
      { x1: 60, y1: 240, x2: 148, y2: 240, w: 54, style: "dirt" },
    ],
    buildings: [
      { kind: "stone_lamp", x: 135, y: 148 },
      { kind: "stone_lamp", x: 350, y: 146 },
      { kind: "stone_lamp", x: 565, y: 148 },
      { kind: "stone_lamp", x: 780, y: 146 },
      { kind: "stone_lamp", x: 985, y: 148 },
      { kind: "stone_lamp", x: 135, y: 338 },
      { kind: "stone_lamp", x: 565, y: 340 },
      { kind: "stone_lamp", x: 985, y: 338 },
      { kind: "ancient_pillar", x: 245, y: 128 },
      { kind: "ancient_pillar", x: 880, y: 128 },
      { kind: "ancient_pillar", x: 310, y: 368 },
      { kind: "ancient_pillar", x: 845, y: 368 },
      { kind: "incense_burner", x: 1042, y: 185 },
      { kind: "stone_stele", x: 460, y: 132 },
      { kind: "stone_stele", x: 675, y: 132 },
    ],
    trees: [
      { kind: "boulder_giant", x: 82, y: 72 },
      { kind: "boulder_giant", x: 1038, y: 72 },
      { kind: "crystal_cyan", x: 195, y: 76 },
      { kind: "stalagmite", x: 305, y: 78 },
      { kind: "rock", x: 430, y: 76 },
      { kind: "crystal_cyan", x: 585, y: 74 },
      { kind: "stalagmite", x: 705, y: 78 },
      { kind: "rock_small", x: 815, y: 78 },
      { kind: "crystal_cyan", x: 945, y: 75 },
      { kind: "boulder_giant", x: 145, y: 472 },
      { kind: "crystal_cyan", x: 355, y: 470 },
      { kind: "stalagmite", x: 495, y: 474 },
      { kind: "rock", x: 645, y: 472 },
      { kind: "crystal_cyan", x: 805, y: 470 },
      { kind: "rock_small", x: 965, y: 472 },
    ],
    npcs: [
      {
        id: "truong_lao_khai_khieu",
        name: "Gia Tộc Túc Lão",
        title: "Chủ Trì Khai Khiếu Đại Điển",
        x: 96,
        y: 206,
        dialog: "Hãy bước thẳng về phía Đông theo Dòng Suối Nguyên Tuyền (phím D / →). Đom đóm Hy Vọng Cổ sẽ tự nhập thể khai mở Không Khiếu! Nhấn Space để bộc phát ý chí vượt ngưỡng, hoặc nhấn F để dừng lại chốt Tư Chất (tối đa 45 bước).",
        action: "open_char",
      },
    ],
    gatherNodes: [],
    monsterSpawns: [],
    portals: [],
  },

  giac_mo: {
    id: "giac_mo",
    name: "Giấc Mơ · Lầu Đá",
    subtitle: "Vùng An Toàn · Khởi Đầu",
    biome: "stone_dream",
    pvpZoneType: "safe",
    recommendedRealm: "Nhất chuyển",
    width: 960,
    height: 560,
    spawn: { x: 235, y: 226 },
    waterRegions: [],
    terrainZones: [
      { kind: "short_grass", x: 430, y: 250, rx: 145, ry: 80 },
      { kind: "tall_grass", x: 140, y: 390, rx: 105, ry: 65 },
      { kind: "tall_grass", x: 610, y: 380, rx: 120, ry: 75 },
    ],
    stoneTerraces: [
      {
        x: 185,
        y: 195,
        rx: 88,
        ry: 58,
        height: 12,
        stairs: [
          { side: "south", offset: 0, width: 48 },
          { side: "east", offset: 30, width: 44 },
        ],
      },
    ],
    cliffLedges: [
      { x1: 60, y1: 128, x2: 295, y2: 122, height: 12 },
      { x1: 470, y1: 126, x2: 710, y2: 132, height: 12 },
    ],
    paths: [
      { x1: 273, y1: 250, x2: 560, y2: 250, w: 66, style: "paved" },
      { x1: 185, y1: 262, x2: 185, y2: 330, w: 46, style: "paved" },
    ],
    buildings: [
      { kind: "stone_tower", x: 180, y: 170, label: "Lầu Đá Cổ" },
      { kind: "ancient_pillar", x: 315, y: 165 },
      { kind: "ancient_pillar", x: 455, y: 165 },
      { kind: "lantern", x: 350, y: 195 },
      { kind: "lantern", x: 350, y: 315 },
      { kind: "incense_burner", x: 385, y: 172 },
      { kind: "stone_stele", x: 255, y: 345 },
      { kind: "stone_lamp", x: 485, y: 318 },
    ],
    trees: [
      { kind: "pine_giant", x: 92, y: 112 },
      { kind: "pine", x: 640, y: 120 },
      { kind: "pine_small", x: 585, y: 126 },
      { kind: "dead_tree", x: 660, y: 370 },
      { kind: "dead_tree_small", x: 615, y: 395 },
      { kind: "boulder_giant", x: 110, y: 375 },
      { kind: "crystal_cyan", x: 165, y: 345 },
      { kind: "crystal_cyan", x: 595, y: 350 },
      { kind: "rock_small", x: 165, y: 385 },
      { kind: "shrub", x: 295, y: 185 },
      { kind: "fern", x: 465, y: 185 },
    ],
    npcs: [
      {
        id: "tri_thu",
        name: "Trí Thu",
        title: "Người Dẫn Đường",
        x: 310,
        y: 235,
        dialog: "Đây là Giấc Mơ Cổ Tiên! Ngươi đang tạm mượn sức mạnh Ngũ Chuyển: hãy phóng chiêu (RMB, 1-5, Q/E) đánh tan Mộng Cảnh Ma Ảnh rồi bước vào Cổng Thức Tỉnh!",
        action: "quest",
      },
    ],
    gatherNodes: [],
    monsterSpawns: [
      { type: "mong_canh_ma_anh", x: 395, y: 240, respawn: 5 },
      { type: "mong_canh_ma_anh", x: 445, y: 290, respawn: 5 },
      { type: "mong_canh_ma_anh", x: 480, y: 215, respawn: 5 },
    ],
    portals: [
      { id: "to_ta_gia", label: "Thức Tỉnh → Tạ Gia Trại", targetMap: "ta_gia_trai", x: 560, y: 250, spawnX: 360, spawnY: 360 },
    ],
  },

  ta_gia_trai: {
    id: "ta_gia_trai",
    name: "Cổ Nguyệt Sơn Trại",
    subtitle: "Thanh Mao Sơn · Học Đường & Nhiệm Vụ Đường",
    biome: "village",
    pvpZoneType: "safe",
    recommendedRealm: "Nhất – Tam chuyển",
    width: 1320,
    height: 860,
    spawn: { x: 640, y: 460 },
    waterRegions: [{ kind: "pond", x: 196, y: 742, rx: 104, ry: 56 }],
    streams: [
      {
        width: 44,
        points: [
          [0, 532],
          [115, 540],
          [235, 558],
          [355, 548],
          [495, 536],
          [640, 548],
          [785, 562],
          [910, 558],
          [1015, 549],
          [1145, 538],
          [1300, 552],
        ],
      },
    ],
    terrainZones: [
      { kind: "short_grass", x: 500, y: 500, rx: 145, ry: 60 },
      { kind: "short_grass", x: 790, y: 500, rx: 145, ry: 60 },
      { kind: "tall_grass", x: 145, y: 260, rx: 105, ry: 95 },
      { kind: "flower_meadow", x: 1120, y: 665, rx: 145, ry: 115 },
      { kind: "tall_grass", x: 1150, y: 255, rx: 115, ry: 105 },
      { kind: "flower_meadow", x: 430, y: 725, rx: 125, ry: 75 },
    ],
    stoneTerraces: [
      {
        x: 360,
        y: 220,
        rx: 106,
        ry: 60,
        height: 12,
        stairs: [
          { side: "south", offset: 0, width: 52 },
          { side: "east", offset: 8, width: 38 },
        ],
      },
      {
        x: 640,
        y: 368,
        rx: 118,
        ry: 64,
        height: 10,
        stairs: [
          { side: "south", offset: 0, width: 56 },
          { side: "north", offset: 0, width: 48 },
          { side: "west", offset: 0, width: 44 },
          { side: "east", offset: 0, width: 44 },
        ],
      },
      {
        x: 930,
        y: 208,
        rx: 106,
        ry: 56,
        height: 12,
        stairs: [{ side: "south", offset: 0, width: 52 }],
      },
      {
        x: 920,
        y: 356,
        rx: 110,
        ry: 62,
        height: 4,
        style: "courtyard",
        stairs: [
          { side: "north", offset: 0, width: 52 },
          { side: "south", offset: 0, width: 52 },
          { side: "west", offset: 0, width: 42 },
          { side: "east", offset: 0, width: 42 },
        ],
      },
      {
        x: 202,
        y: 492,
        rx: 76,
        ry: 38,
        height: 4,
        style: "courtyard",
        stairs: [
          { side: "north", offset: 0, width: 42 },
          { side: "east", offset: 0, width: 36 },
        ],
      },
    ],
    cliffLedges: [
      { x1: 75, y1: 108, x2: 520, y2: 102, height: 12 },
      { x1: 760, y1: 102, x2: 1220, y2: 112, height: 12 },
    ],
    paths: [
      { x1: 85, y1: 450, x2: 1225, y2: 450, w: 68, style: "paved" },
      { x1: 640, y1: 80, x2: 640, y2: 785, w: 66, style: "paved" },
      { x1: 360, y1: 282, x2: 360, y2: 450, w: 48, style: "paved" },
      { x1: 930, y1: 266, x2: 930, y2: 450, w: 48, style: "paved" },
      { x1: 1015, y1: 450, x2: 1015, y2: 640, w: 46, style: "paved" },
      { x1: 355, y1: 450, x2: 355, y2: 640, w: 44, style: "dirt" },
      { x1: 355, y1: 640, x2: 1015, y2: 640, w: 46, style: "dirt" },
      { x1: 355, y1: 640, x2: 332, y2: 738, w: 34, style: "dirt" },
    ],
    buildings: [
      { kind: "pavilion", x: 640, y: 355, label: "Quảng Trường Gia Tộc" },
      { kind: "arena_ring", x: 920, y: 356, r: 94, label: "Cổ Nguyệt Lôi Đài" },
      { kind: "hall", x: 360, y: 200, label: "Học Đường Khai Khiếu" },
      { kind: "hall", x: 930, y: 192, label: "Tàng Kinh Các & Luyện Cổ" },
      { kind: "clan_house", x: 495, y: 632, label: "Tộc Xá Tây" },
      { kind: "clan_house", x: 815, y: 632, label: "Tộc Xá Đông" },
      { kind: "clan_house", x: 185, y: 368, label: "Dược Các" },
      { kind: "bridge_stone_v", x: 640, y: 548, label: "Bạch Ngọc Kiều" },
      { kind: "wood_bridge_v", x: 1015, y: 549, label: "Thanh Phong Kiều" },
      { kind: "wood_bridge_v", x: 355, y: 548, label: "Liễu Khê Kiều" },
      { kind: "wood_pier", x: 288, y: 738 },
      { kind: "fishing_rod_prop", x: 256, y: 734 },
      { kind: "campfire", x: 1058, y: 395 },
      { kind: "table", x: 555, y: 502 },
      { kind: "table", x: 725, y: 502 },
      { kind: "lantern", x: 580, y: 360 },
      { kind: "lantern", x: 700, y: 360 },
      { kind: "stone_lamp", x: 440, y: 410 },
      { kind: "stone_lamp", x: 840, y: 410 },
      { kind: "stone_lamp", x: 485, y: 498 },
      { kind: "stone_lamp", x: 795, y: 498 },
      { kind: "lantern", x: 580, y: 610 },
      { kind: "lantern", x: 700, y: 610 },
      { kind: "incense_burner", x: 582, y: 392 },
      { kind: "incense_burner", x: 698, y: 392 },
      { kind: "stone_stele", x: 432, y: 245 },
      { kind: "stone_stele", x: 858, y: 245 },
      { kind: "ancient_well", x: 552, y: 698 },
      { kind: "ancient_well", x: 255, y: 382 },
      { kind: "banners", x: 640, y: 282 },
    ],
    trees: [
      { kind: "ancient_banyan", x: 495, y: 280 },
      { kind: "peach_giant", x: 215, y: 265 },
      { kind: "peach", x: 485, y: 175 },
      { kind: "peach_small", x: 235, y: 315 },
      { kind: "golden_osmanthus", x: 790, y: 178 },
      { kind: "osmanthus_small", x: 745, y: 210 },
      { kind: "maple", x: 1075, y: 335 },
      { kind: "maple_small", x: 1120, y: 360 },
      { kind: "peach", x: 420, y: 715 },
      { kind: "peach_small", x: 375, y: 735 },
      { kind: "willow", x: 78, y: 696 },
      { kind: "willow_small", x: 342, y: 696 },
      { kind: "pine_giant", x: 135, y: 180 },
      { kind: "pine", x: 1155, y: 185 },
      { kind: "pine_small", x: 1095, y: 210 },
      { kind: "pine", x: 1120, y: 695 },
      { kind: "osmanthus_small", x: 1065, y: 725 },
      { kind: "reed_clump", x: 122, y: 684 },
      { kind: "reed_clump", x: 258, y: 794 },
      { kind: "fern", x: 270, y: 285 },
      { kind: "shrub", x: 785, y: 395 },
      { kind: "rock_small", x: 295, y: 505 },
    ],
    npcs: [
      {
        id: "truong_lao_hoc_duong",
        name: "Trưởng Lão Học Đường",
        title: "Tĩnh Tọa Tu Luyện",
        x: 360,
        y: 254,
        dialog: "Không khiếu đã mở! Hãy nhấn phím K mở Buồng Tĩnh Tọa Tu Luyện để dùng Nguyên Thạch hồi Chân Nguyên Hải và cọ rửa Khiếu Bích đột phá cảnh giới.",
        action: "open_cultivate",
      },
      {
        id: "cao_thi_quan",
        name: "Bảng Nhiệm Vụ Gia Tộc",
        title: "Nhiệm Vụ Đường (Phím J)",
        x: 640,
        y: 405,
        dialog: "Nhấn phím J để mở Gia Tộc Nhiệm Vụ Đường: nhận nhiệm vụ săn quái kiếm Nguyên Thạch và tự chọn Cổ Trùng Nhất – Tam Chuyển theo Lưu Phái của ngươi!",
        action: "open_quests",
      },
      {
        id: "tang_kinh_truong_lao",
        name: "Trưởng Lão Tàng Kinh Các",
        title: "Luyện Cổ & Hợp Luyện",
        x: 930,
        y: 246,
        dialog: "Mở Túi Cổ Trùng (phím V) để hợp luyện Bạch Thỉ, Hắc Thỉ, Ngọc Bì, Tửu Trùng Tứ Vị hay ghép Sát Chiêu độc môn!",
        action: "open_gu",
      },
      {
        id: "co_nguyet_giao_dau",
        name: "Giáo Đầu Lôi Đài",
        title: "Tỷ Thí Gia Tộc & Boss",
        x: 822,
        y: 326,
        dialog: "Cổ Nguyệt Lôi Đài luôn mở! Chọn đối thủ đồng tộc (Phương Chính, Mạc Bắc, Xích Thành, Bạch Ngưng Băng) hoặc Thú Vương để kiểm chứng thực lực!",
        action: "open_clan_arena",
      },
    ],
    gatherNodes: [
      { id: "nguyen_tuyen_khai_khieu", kind: "spirit_spring", label: "Nguyên Tuyền Khai Khiếu", x: 360, y: 336 },
      { id: "garden_0", kind: "herb_plot", plotIndex: 0, label: "Ô Gia Viên 1", x: 172, y: 478 },
      { id: "garden_1", kind: "herb_plot", plotIndex: 1, label: "Ô Gia Viên 2", x: 226, y: 478 },
      { id: "garden_2", kind: "herb_plot", plotIndex: 2, label: "Ô Gia Viên 3", x: 172, y: 506 },
      { id: "garden_3", kind: "herb_plot", plotIndex: 3, label: "Ô Gia Viên 4", x: 226, y: 506 },
      { id: "herb_tagia_1", kind: "herb", label: "Khóm Thảo Dược", item: "thao_duoc", x: 256, y: 492 },
      { id: "wild_gu_tuu_trung", kind: "wild_gu", label: "Ổ Dã Cổ: Tửu Trùng", guId: "tuu_trung", x: 1085, y: 285 },
      { id: "wild_gu_hoa_than", kind: "wild_gu", label: "Ổ Dã Cổ: Hỏa Thán Cổ", guId: "dan_khieu_hoa_than", x: 205, y: 235 },
      { id: "wild_gu_thanh_doc", kind: "wild_gu", label: "Ổ Dã Cổ: Thanh Độc Trùng", guId: "thanh_doc", x: 336, y: 758 },
      { id: "fish_tagia_1", kind: "fish", label: "Điểm Câu Ao Liễu", x: 226, y: 738 },
      { id: "wild_gu_sinh_co", kind: "wild_gu", label: "Ổ Dã Cổ: Tiểu Sinh Cơ Thảo", guId: "tieu_sinh_co", x: 465, y: 745 },
    ],
    beastSpots: [
      { x: 1138, y: 356, r: 58, tier: "afk", label: "Bãi Cọc Rèn Thân" },
    ],
    monsterSpawns: [
      { type: "coc_thao_nhan", x: 1110, y: 340, respawn: 4 },
      { type: "coc_thao_nhan", x: 1140, y: 374, respawn: 4 },
      { type: "coc_thao_nhan", x: 1170, y: 340, respawn: 4 },
    ],
    portals: [
      { id: "to_khe_coc", label: "← Khê Cốc · Thiên Trì", targetMap: "khe_coc", x: 96, y: 450, spawnX: 1165, spawnY: 585, gateStyle: "gate_forest" },
      { id: "to_vu_linh", label: "Rừng Cây Thanh Mao (Dã Trư) →", targetMap: "vu_linh_ha", x: 1220, y: 450, spawnX: 155, spawnY: 450, gateStyle: "gate_forest" },
      { id: "to_ben_thuong", label: "Bến Thương (Chợ & Đổ Thạch) ↓", targetMap: "ben_thuong", x: 640, y: 785, spawnX: 640, spawnY: 185, gateStyle: "gate_mountain" },
      { id: "to_bac_linh", label: "↑ Bắc Lĩnh (Thiết Hạt)", targetMap: "bac_linh", x: 640, y: 146, spawnX: 640, spawnY: 745, gateStyle: "gate_mountain" },
    ],
  },

  khe_coc: {
    id: "khe_coc",
    name: "Khê Cốc · Thiên Trì",
    subtitle: "Hồ Ngọc Bích · Câu Cá & Cứu Cổ",
    biome: "lakeside",
    pvpZoneType: "safe",
    recommendedRealm: "Nhất chuyển",
    width: 1320,
    height: 860,
    spawn: { x: 640, y: 610 },
    // Hồ Thiên Trì rộng lớn kèm dòng Thanh Thiên Khê thoát nước qua phía Đông
    waterRegions: [{ kind: "lake", x: 640, y: 300, rx: 410, ry: 225 }],
    waterfalls: [{ x: 640, y: 54, w: 54, h: 54 }],
    streams: [
      {
        width: 42,
        points: [
          [995, 360],
          [1036, 468],
          [1048, 585],
          [1028, 715],
          [1054, 860],
        ],
      },
    ],
    terrainZones: [
      { kind: "short_grass", x: 470, y: 595, rx: 115, ry: 68 },
      { kind: "short_grass", x: 820, y: 595, rx: 115, ry: 68 },
      { kind: "flower_meadow", x: 640, y: 785, rx: 240, ry: 65 },
      { kind: "tall_grass", x: 165, y: 530, rx: 135, ry: 120 },
      { kind: "tall_grass", x: 1155, y: 475, rx: 115, ry: 105 },
      { kind: "moss_glade", x: 140, y: 210, rx: 125, ry: 115 },
      { kind: "moss_glade", x: 1180, y: 210, rx: 125, ry: 115 },
    ],
    stoneTerraces: [
      {
        x: 640,
        y: 712,
        rx: 98,
        ry: 56,
        height: 12,
        stairs: [
          { side: "north", offset: 0, width: 50 },
          { side: "west", offset: 0, width: 38 },
          { side: "east", offset: 0, width: 38 },
        ],
      },
    ],
    cliffLedges: [
      { x1: 60, y1: 110, x2: 265, y2: 125, height: 15 },
      { x1: 490, y1: 58, x2: 790, y2: 58, height: 16 },
      { x1: 1055, y1: 125, x2: 1260, y2: 110, height: 15 },
    ],
    paths: [
      { x1: 920, y1: 585, x2: 1225, y2: 585, w: 54, style: "paved" },
      { x1: 640, y1: 585, x2: 920, y2: 585, w: 50, style: "dirt" },
      { x1: 180, y1: 635, x2: 640, y2: 585, w: 50, style: "dirt" },
      { x1: 640, y1: 530, x2: 640, y2: 658, w: 48, style: "paved" },
    ],
    buildings: [
      { kind: "pavilion", x: 640, y: 704, label: "Thiên Trì Đình" },
      { kind: "clan_house", x: 325, y: 695, label: "Trà Quán Thiên Trì" },
      { kind: "bridge_stone_h", x: 1048, y: 585, label: "Thiên Trì Kiều" },
      { kind: "wood_pier_n", x: 640, y: 508 },
      { kind: "fishing_rod_prop", x: 560, y: 536 },
      { kind: "fishing_rod_prop", x: 842, y: 518 },
      { kind: "table", x: 470, y: 580 },
      { kind: "table", x: 820, y: 580 },
      { kind: "table", x: 250, y: 490 },
      { kind: "lantern", x: 480, y: 665 },
      { kind: "lantern", x: 800, y: 665 },
      { kind: "lantern", x: 1110, y: 548 },
      { kind: "lantern", x: 935, y: 530 },
      { kind: "stone_lamp", x: 910, y: 645 },
      { kind: "ancient_well", x: 390, y: 715 },
      { kind: "incense_burner", x: 582, y: 725 },
      { kind: "stone_stele", x: 700, y: 725 },
      { kind: "banners", x: 960, y: 615 },
    ],
    trees: [
      { kind: "peach_giant", x: 485, y: 765 },
      { kind: "peach", x: 785, y: 765 },
      { kind: "peach_small", x: 535, y: 785 },
      { kind: "golden_osmanthus", x: 1165, y: 660 },
      { kind: "maple", x: 155, y: 655 },
      { kind: "maple_small", x: 115, y: 685 },
      { kind: "willow", x: 220, y: 450 },
      { kind: "willow", x: 1115, y: 395 },
      { kind: "willow_small", x: 345, y: 550 },
      { kind: "bamboo", x: 155, y: 235 },
      { kind: "bamboo_small", x: 205, y: 255 },
      { kind: "bamboo", x: 1165, y: 205 },
      { kind: "boulder_giant", x: 105, y: 160 },
      { kind: "boulder_giant", x: 1215, y: 165 },
      { kind: "reed_clump", x: 300, y: 495 },
      { kind: "reed_clump", x: 960, y: 495 },
      { kind: "reed_clump", x: 485, y: 530 },
      { kind: "fern", x: 545, y: 635 },
      { kind: "shrub", x: 735, y: 635 },
      { kind: "pine_giant", x: 95, y: 325 },
      { kind: "pine", x: 1205, y: 315 },
      { kind: "pine_small", x: 350, y: 755 },
      { kind: "osmanthus_small", x: 940, y: 755 },
    ],
    npcs: [
      {
        id: "cuu_ba",
        name: "Cửu Bà",
        title: "Cứu Cổ & Giữ Cổ",
        x: 410,
        y: 625,
        dialog: "Nếu Cổ trùng của cháu bị đói kiệt sức, bà có thể hồi sinh chúng. Hoặc ra mép nước bấm F để tham gia Điếu Ngư!",
        action: "revive_gu",
      },
      {
        id: "su_gia_dieu_hoi",
        name: "Sứ Giả Điếu Hội",
        title: "Triệu Hồi Cá Vương",
        x: 740,
        y: 590,
        dialog: "Thiên Trì Điếu Hội đã sẵn sàng! Đứng sát mép hồ bấm F để thả câu, hoặc khiêu chiến Thiên Trì Ngư Vương ngay trong hồ!",
        action: "start_dieu_hoi",
      },
    ],
    gatherNodes: [
      { id: "fish_spot_1", kind: "fish", label: "Điểm Câu Cá Thiên Trì", x: 640, y: 482 },
      { id: "fish_spot_2", kind: "fish", label: "Điểm Câu Cá Bờ Đông", x: 860, y: 510 },
      { id: "herb_kc_1", kind: "herb", label: "Bụi Thảo Dược", item: "thao_duoc", x: 260, y: 610 },
      { id: "wild_gu_nguyet_quang", kind: "wild_gu", label: "Ổ Dã Cổ: Nguyệt Quang Cổ", guId: "nguyet_quang", x: 520, y: 545 },
      { id: "wild_gu_thinh_phong", kind: "wild_gu", label: "Ổ Dã Cổ: Thính Phong Cổ", guId: "thinh_phong", x: 170, y: 375 },
    ],
    monsterSpawns: [
      { type: "thien_tri_ngu_vuong", x: 640, y: 420, respawn: 25, isEventBoss: true },
    ],
    portals: [
      { id: "back_ta_gia", label: "Cổ Nguyệt Sơn Trại →", targetMap: "ta_gia_trai", x: 1220, y: 585, spawnX: 160, spawnY: 450, gateStyle: "gate_mountain" },
      { id: "to_hac_thuy", label: "← Hắc Thủy Hồ (Độc Thiềm)", targetMap: "hac_thuy_ho", x: 96, y: 420, spawnX: 1165, spawnY: 450, gateStyle: "gate_forest" },
    ],
  },

  vu_linh_ha: {
    id: "vu_linh_ha",
    name: "Rừng Cây Thanh Mao · Dã Trư Lâm",
    subtitle: "Khu Sinh Thái 1 · Độc Quyền Dã Trư (Nhất Chuyển)",
    biome: "forest",
    pvpZoneType: "safe",
    recommendedRealm: "Nhất chuyển",
    width: 1320,
    height: 860,
    spawn: { x: 160, y: 450 },
    waterRegions: [],
    waterfalls: [{ x: 690, y: 72, w: 46, h: 48 }],
    streams: [
      {
        width: 44,
        points: [
          [690, 118],
          [706, 245],
          [734, 345],
          [718, 450],
          [694, 645],
          [718, 860],
        ],
      },
    ],
    terrainZones: [
      { kind: "short_grass", x: 245, y: 450, rx: 140, ry: 95 },
      { kind: "short_grass", x: 970, y: 350, rx: 120, ry: 85 },
      { kind: "tall_grass", x: 510, y: 370, rx: 155, ry: 120 },
      { kind: "tall_grass", x: 525, y: 640, rx: 160, ry: 115 },
      { kind: "moss_glade", x: 455, y: 165, rx: 270, ry: 95 },
      { kind: "flower_meadow", x: 250, y: 685, rx: 140, ry: 90 },
    ],
    stoneTerraces: [
      {
        x: 985,
        y: 335,
        rx: 76,
        ry: 48,
        height: 10,
        stairs: [{ side: "south", offset: 0, width: 44 }],
      },
    ],
    cliffLedges: [
      { x1: 110, y1: 108, x2: 510, y2: 102, height: 13 },
      { x1: 600, y1: 72, x2: 780, y2: 72, height: 16 },
      { x1: 790, y1: 518, x2: 860, y2: 518, height: 15 },
      { x1: 930, y1: 518, x2: 1210, y2: 515, height: 15 },
    ],
    paths: [
      { x1: 100, y1: 450, x2: 1210, y2: 450, w: 58, style: "dirt" },
      { x1: 895, y1: 450, x2: 895, y2: 615, w: 46, style: "dirt" },
      { x1: 985, y1: 385, x2: 985, y2: 450, w: 42, style: "dirt" },
    ],
    buildings: [
      { kind: "wood_bridge_h", x: 718, y: 450, label: "Vụ Lĩnh Kiều" },
      { kind: "wood_bridge_h", x: 706, y: 245 },
      { kind: "clan_house", x: 985, y: 312, label: "Trạm Thợ Săn" },
      { kind: "mine_entrance", x: 1035, y: 505, label: "Hầm Mỏ Cũ" },
      { kind: "campfire", x: 885, y: 395 },
      { kind: "stone_lamp", x: 300, y: 410 },
      { kind: "lantern", x: 235, y: 405 },
      { kind: "ancient_well", x: 910, y: 335 },
      { kind: "stone_stele", x: 642, y: 400 },
      { kind: "incense_burner", x: 1095, y: 505 },
      { kind: "banners", x: 895, y: 315 },
    ],
    trees: [
      { kind: "ancient_banyan", x: 465, y: 175 },
      { kind: "pine_giant", x: 235, y: 195 },
      { kind: "pine_small", x: 290, y: 215 },
      { kind: "maple", x: 785, y: 185 },
      { kind: "maple_small", x: 830, y: 205 },
      { kind: "pine", x: 1095, y: 205 },
      { kind: "banana_palm", x: 365, y: 215 },
      { kind: "banana_palm", x: 615, y: 195 },
      { kind: "golden_osmanthus", x: 315, y: 695 },
      { kind: "osmanthus_small", x: 265, y: 715 },
      { kind: "boulder_giant", x: 915, y: 650 },
      { kind: "rock", x: 1045, y: 665 },
      { kind: "rock_small", x: 875, y: 675 },
      { kind: "fallen_log", x: 390, y: 285 },
      { kind: "mushroom_cluster", x: 430, y: 265 },
      { kind: "fern", x: 625, y: 270 },
      { kind: "shrub", x: 410, y: 495 },
      { kind: "stealth_bush", x: 455, y: 430 },
      { kind: "stealth_bush", x: 785, y: 445 },
      { kind: "stealth_bush", x: 550, y: 585 },
    ],
    beastSpots: [
      { x: 560, y: 400, r: 125, tier: "afk", label: "Lãnh Địa Dã Trư (Chỉ Lợn Rừng)" },
      { x: 890, y: 555, r: 85, tier: "boss", label: "Ổ Lợn Rừng Vương" },
    ],
    npcs: [
      {
        id: "tho_san_vu_linh",
        name: "Thợ Săn Lão Trương",
        title: "Cửa Hang Dã Trư",
        x: 985,
        y: 358,
        dialog: "Khu rừng này chỉ có đàn Lợn Rừng · Dã Trư và Lợn Rừng Vương trấn giữ. Chuẩn bị đủ Thảo Dược rồi hãy bước vào Hầm Mỏ Cũ hoặc đi sang Rừng Trúc!",
        action: "open_dungeons",
      },
    ],
    gatherNodes: [
      { id: "herb_vl_1", kind: "herb", label: "Khóm Thảo Dược", item: "thao_duoc", x: 360, y: 310 },
      { id: "herb_vl_2", kind: "herb", label: "Thảo Dược Trăm Năm", item: "thao_duoc_tram_nam", x: 790, y: 290 },
      { id: "mine_vl_1", kind: "mine", label: "Mạch Ngọc Vụn", item: "ngoc_vun", x: 960, y: 650 },
      { id: "mine_vl_2", kind: "mine", label: "Mạch Mao Thạch", item: "mao_thach_so", x: 1080, y: 600 },
      { id: "wild_gu_bach_thi", kind: "wild_gu", label: "Ổ Dã Cổ: Bạch Thỉ Cổ", guId: "bach_thi", x: 390, y: 365 },
      { id: "wild_gu_huyet_nha", kind: "wild_gu", label: "Ổ Dã Cổ: Huyết Nha Cổ", guId: "huyet_nha", x: 855, y: 605 },
    ],
    monsterSpawns: [
      { type: "lon_rung", x: 460, y: 360, respawn: 7 },
      { type: "lon_rung", x: 540, y: 470, respawn: 7 },
      { type: "lon_rung", x: 590, y: 325, respawn: 7 },
      { type: "lon_rung", x: 495, y: 595, respawn: 7 },
      { type: "lon_rung", x: 605, y: 635, respawn: 7 },
      { type: "lon_rung_vuong", x: 890, y: 555, respawn: 16 },
    ],
    portals: [
      { id: "back_ta_gia_vl", label: "← Cổ Nguyệt Sơn Trại", targetMap: "ta_gia_trai", x: 96, y: 450, spawnX: 1140, spawnY: 450, gateStyle: "gate_forest" },
      { id: "to_suong_truc", label: "Rừng Trúc Thanh Mao (Thanh Mao Lang) →", targetMap: "suong_truc_lam", x: 1220, y: 450, spawnX: 165, spawnY: 450, gateStyle: "gate_forest" },
    ],
  },

  ben_thuong: {
    id: "ben_thuong",
    name: "Bến Thương · Đấu Cổ Trường",
    subtitle: "Thương Cảng An Toàn · Đổ Thạch & Lôi Đài",
    biome: "port_arena",
    pvpZoneType: "safe",
    recommendedRealm: "Mọi cảnh giới",
    width: 1320,
    height: 860,
    spawn: { x: 640, y: 210 },
    waterRegions: [{ kind: "river_south", x: 640, y: 790, rx: 660, ry: 95 }],
    terrainZones: [
      { kind: "short_grass", x: 640, y: 430, rx: 220, ry: 185 },
      { kind: "flower_meadow", x: 190, y: 540, rx: 120, ry: 95 },
      { kind: "tall_grass", x: 1125, y: 550, rx: 120, ry: 100 },
    ],
    stoneTerraces: [
      {
        x: 310,
        y: 285,
        rx: 105,
        ry: 64,
        height: 12,
        stairs: [{ side: "south", offset: 0, width: 52 }],
      },
      {
        x: 980,
        y: 285,
        rx: 105,
        ry: 64,
        height: 12,
        stairs: [{ side: "south", offset: 0, width: 52 }],
      },
    ],
    paths: [
      { x1: 200, y1: 420, x2: 1120, y2: 420, w: 68, style: "paved" },
      { x1: 640, y1: 95, x2: 640, y2: 690, w: 68, style: "paved" },
      { x1: 310, y1: 350, x2: 310, y2: 420, w: 48, style: "paved" },
      { x1: 980, y1: 350, x2: 980, y2: 420, w: 48, style: "paved" },
    ],
    buildings: [
      { kind: "arena_ring", x: 640, y: 430, r: 155, label: "Đấu Cổ Trường" },
      { kind: "hall", x: 310, y: 270, label: "Phường Đổ Thạch" },
      { kind: "hall", x: 980, y: 270, label: "Thương Hội Bến Thương" },
      { kind: "clan_house", x: 185, y: 375, label: "Tửu Lâu Bến Cảng" },
      { kind: "clan_house", x: 1095, y: 375, label: "Kho Nguyên Thạch" },
      { kind: "wood_pier_s", x: 640, y: 712 },
      { kind: "fishing_rod_prop", x: 650, y: 732 },
      { kind: "table", x: 245, y: 465 },
      { kind: "table", x: 1035, y: 465 },
      { kind: "lantern", x: 470, y: 310 },
      { kind: "lantern", x: 810, y: 310 },
      { kind: "stone_lamp", x: 565, y: 655 },
      { kind: "stone_lamp", x: 715, y: 655 },
      { kind: "incense_burner", x: 525, y: 270 },
      { kind: "incense_burner", x: 755, y: 270 },
      { kind: "stone_stele", x: 435, y: 485 },
      { kind: "stone_stele", x: 845, y: 485 },
      { kind: "ancient_well", x: 115, y: 390 },
      { kind: "banners", x: 640, y: 230 },
    ],
    trees: [
      { kind: "peach_giant", x: 180, y: 580 },
      { kind: "golden_osmanthus", x: 1110, y: 580 },
      { kind: "osmanthus_small", x: 1055, y: 605 },
      { kind: "maple", x: 160, y: 170 },
      { kind: "pine_giant", x: 1155, y: 170 },
      { kind: "willow", x: 380, y: 665 },
      { kind: "willow_small", x: 890, y: 665 },
      { kind: "reed_clump", x: 525, y: 690 },
      { kind: "reed_clump", x: 755, y: 690 },
    ],
    npcs: [
      {
        id: "chuong_quay_do_thach",
        name: "Chưởng Quầy Đổ Thạch",
        title: "Cắt Mao Thạch",
        x: 310,
        y: 330,
        dialog: "Một dao nghèo khổ, một dao phất lên! Mở Bảng Túi & Đổ Thạch (B) để cắt Mao Thạch ngay!",
        action: "open_gamble",
      },
      {
        id: "thuong_nhan_ben_thuong",
        name: "Đại Chưởng Quầy Thương Hội",
        title: "Mua Bán Nguyên Liệu & Hộ Cụ",
        x: 980,
        y: 330,
        dialog: "Tại đây có bán đủ Thảo dược, Đan dược, Mồi câu, và Mao Thạch các phẩm.",
        action: "open_shop",
      },
      {
        id: "trong_tai_loi_dai",
        name: "Trọng Tài Lôi Đài",
        title: "Khiêu Chiến Lôi Đài Bóng",
        x: 640,
        y: 335,
        dialog: "Bước lên đài tranh phong cùng Bóng của các Thiên Kiêu đứng đầu bảng!",
        action: "open_arena",
      },
    ],
    gatherNodes: [{ id: "fish_bt_1", kind: "fish", label: "Bến Câu Bến Thương", x: 640, y: 744 }],
    monsterSpawns: [],
    portals: [
      { id: "back_ta_gia_bt", label: "↑ Cổ Nguyệt Sơn Trại", targetMap: "ta_gia_trai", x: 640, y: 146, spawnX: 640, spawnY: 710, gateStyle: "gate_mountain" },
    ],
  },

  bac_linh: {
    id: "bac_linh",
    name: "Bắc Lĩnh · Gò Thiết Hạt",
    subtitle: "Độc Quyền Thiết Giáp Bọ Cạp (Nhị Chuyển · Cờ Tự Chọn)",
    biome: "highland",
    pvpZoneType: "flag",
    recommendedRealm: "Nhị chuyển",
    width: 1320,
    height: 860,
    spawn: { x: 640, y: 740 },
    waterRegions: [],
    terrainZones: [
      { kind: "short_grass", x: 640, y: 640, rx: 155, ry: 115 },
      { kind: "tall_grass", x: 390, y: 340, rx: 170, ry: 135 },
      { kind: "tall_grass", x: 890, y: 340, rx: 170, ry: 135 },
      { kind: "packed_dirt", x: 640, y: 210, rx: 120, ry: 75 },
      { kind: "moss_glade", x: 240, y: 200, rx: 120, ry: 95 },
    ],
    stoneTerraces: [
      {
        x: 300,
        y: 600,
        rx: 86,
        ry: 54,
        height: 12,
        stairs: [{ side: "east", offset: 0, width: 44 }],
      },
    ],
    cliffLedges: [
      { x1: 160, y1: 270, x2: 460, y2: 265, height: 15 },
      { x1: 820, y1: 265, x2: 1130, y2: 272, height: 15 },
    ],
    paths: [
      { x1: 640, y1: 100, x2: 640, y2: 780, w: 68 },
      { x1: 388, y1: 600, x2: 640, y2: 600, w: 46, style: "paved" },
    ],
    buildings: [
      { kind: "pavilion", x: 300, y: 592, label: "Phong Hầu Đình" },
      { kind: "ancient_pillar", x: 470, y: 205 },
      { kind: "ancient_pillar", x: 810, y: 205 },
      { kind: "banners", x: 565, y: 550 },
      { kind: "banners", x: 715, y: 550 },
      { kind: "stone_lamp", x: 560, y: 620 },
      { kind: "stone_lamp", x: 720, y: 620 },
      { kind: "lantern", x: 580, y: 710 },
      { kind: "lantern", x: 700, y: 710 },
      { kind: "incense_burner", x: 375, y: 550 },
      { kind: "stone_stele", x: 585, y: 150 },
      { kind: "stone_stele", x: 695, y: 150 },
      { kind: "table", x: 355, y: 650 },
    ],
    trees: [
      { kind: "pine_giant", x: 240, y: 200 },
      { kind: "pine_small", x: 185, y: 230 },
      { kind: "maple", x: 1040, y: 220 },
      { kind: "maple_small", x: 990, y: 240 },
      { kind: "boulder_giant", x: 380, y: 420 },
      { kind: "rock", x: 900, y: 420 },
      { kind: "rock_small", x: 430, y: 445 },
      { kind: "shrub", x: 520, y: 540 },
      { kind: "stealth_bush", x: 560, y: 460 },
      { kind: "stealth_bush", x: 730, y: 450 },
      { kind: "stealth_bush", x: 640, y: 310 },
    ],
    beastSpots: [
      { x: 645, y: 345, r: 145, tier: "afk", label: "Bãi Thiết Giáp Bọ Cạp (Chỉ Bọ Cạp)" },
      { x: 640, y: 210, r: 75, tier: "boss", label: "Lãnh Địa Thiết Giáp Hạt Vương" },
    ],
    npcs: [],
    gatherNodes: [
      { id: "mine_bl_1", kind: "mine", label: "Mỏ Đá Bắc Lĩnh", item: "mao_thach_trung", x: 350, y: 460 },
      { id: "herb_bl_1", kind: "herb", label: "Linh Thảo Trăm Năm", item: "thao_duoc_tram_nam", x: 920, y: 480 },
    ],
    monsterSpawns: [
      { type: "thiet_giap_bo_cap", x: 460, y: 360, respawn: 7 },
      { type: "thiet_giap_bo_cap", x: 580, y: 280, respawn: 7 },
      { type: "thiet_giap_bo_cap", x: 740, y: 320, respawn: 7 },
      { type: "thiet_giap_bo_cap", x: 850, y: 390, respawn: 7 },
      { type: "thiet_giap_hat_vuong", x: 640, y: 210, respawn: 20 },
    ],
    portals: [
      { id: "back_ta_gia_bl", label: "↓ Cổ Nguyệt Sơn Trại", targetMap: "ta_gia_trai", x: 640, y: 785, spawnX: 640, spawnY: 185, gateStyle: "gate_mountain" },
      { id: "to_xich_nham", label: "↑ Xích Nham Cốc (Tứ Chuyển)", targetMap: "xich_nham_coc", x: 640, y: 146, spawnX: 640, spawnY: 740, gateStyle: "gate_cave" },
    ],
  },

  hac_thuy_ho: {
    id: "hac_thuy_ho",
    name: "Đầm Lầy Độc Khí · Độc Thiềm Chiểu",
    subtitle: "Khu Sinh Thái 4 · Độc Quyền Độc Thiềm Thừ (Nhị – Tam Chuyển)",
    biome: "swamp",
    pvpZoneType: "flag",
    recommendedRealm: "Nhị – Tam chuyển",
    width: 1320,
    height: 860,
    spawn: { x: 1160, y: 450 },
    waterRegions: [{ kind: "swamp_lake", x: 560, y: 430, rx: 280, ry: 170 }],
    terrainZones: [
      { kind: "short_grass", x: 1080, y: 450, rx: 120, ry: 85 },
      { kind: "moss_glade", x: 260, y: 320, rx: 165, ry: 210 },
      { kind: "tall_grass", x: 930, y: 280, rx: 145, ry: 120 },
      { kind: "tall_grass", x: 720, y: 675, rx: 195, ry: 95 },
      { kind: "packed_dirt", x: 540, y: 205, rx: 150, ry: 75 },
    ],
    stoneTerraces: [
      {
        x: 1085,
        y: 225,
        rx: 82,
        ry: 50,
        height: 10,
        stairs: [{ side: "south", offset: 0, width: 44 }],
      },
    ],
    paths: [
      { x1: 860, y1: 450, x2: 1240, y2: 450, w: 62 },
      { x1: 1085, y1: 278, x2: 1085, y2: 450, w: 44, style: "dirt" },
    ],
    buildings: [
      { kind: "clan_house", x: 1085, y: 215, label: "Độc Dược Thảo Lư" },
      { kind: "wood_pier", x: 830, y: 430 },
      { kind: "ancient_pillar", x: 355, y: 215 },
      { kind: "ancient_pillar", x: 415, y: 695 },
      { kind: "stone_lamp", x: 980, y: 410 },
      { kind: "stone_lamp", x: 915, y: 500 },
      { kind: "campfire", x: 1120, y: 320 },
      { kind: "ancient_well", x: 1005, y: 235 },
      { kind: "stone_stele", x: 995, y: 510 },
      { kind: "incense_burner", x: 1165, y: 240 },
      { kind: "table", x: 1020, y: 310 },
    ],
    trees: [
      { kind: "ancient_banyan", x: 230, y: 225 },
      { kind: "dead_tree", x: 290, y: 660 },
      { kind: "dead_tree_small", x: 245, y: 690 },
      { kind: "willow", x: 960, y: 195 },
      { kind: "boulder_giant", x: 960, y: 660 },
      { kind: "crystal_amber", x: 215, y: 350 },
      { kind: "crystal_amber", x: 875, y: 675 },
      { kind: "fallen_log", x: 220, y: 525 },
      { kind: "mushroom_cluster", x: 270, y: 515 },
      { kind: "reed_clump", x: 825, y: 390 },
      { kind: "reed_clump", x: 825, y: 470 },
      { kind: "stealth_bush", x: 900, y: 365 },
      { kind: "stealth_bush", x: 760, y: 625 },
    ],
    beastSpots: [
      { x: 945, y: 450, r: 140, tier: "afk", label: "Lãnh Địa Độc Thiềm Thừ (Chỉ Độc Thiềm)" },
      { x: 520, y: 220, r: 80, tier: "boss", label: "Đầm Lầy Độc Thiềm Thừ Vương" },
    ],
    npcs: [],
    gatherNodes: [
      { id: "fish_ht_1", kind: "fish", label: "Bãi Câu Đầm Hắc Thủy", x: 840, y: 430 },
      { id: "wild_gu_thuy_trao", kind: "wild_gu", label: "Ổ Dã Cổ (Thủy Tráo)", guId: "thuy_trao", x: 240, y: 430 },
    ],
    monsterSpawns: [
      { type: "coc_doc_hac_thuy", x: 950, y: 310, respawn: 7 },
      { type: "coc_doc_hac_thuy", x: 940, y: 580, respawn: 7 },
      { type: "coc_doc_hac_thuy", x: 640, y: 635, respawn: 7 },
      { type: "coc_doc_hac_thuy", x: 760, y: 645, respawn: 7 },
      { type: "thiem_thu_vuong", x: 520, y: 220, respawn: 20 },
    ],
    portals: [
      { id: "back_khe_coc_ht", label: "Khê Cốc →", targetMap: "khe_coc", x: 1230, y: 450, spawnX: 150, spawnY: 420, gateStyle: "gate_forest" },
      { id: "to_hang_thach_nhu_ht", label: "← Hang Động Thạch Nhũ", targetMap: "hang_thach_nhu", x: 105, y: 450, spawnX: 1140, spawnY: 430, gateStyle: "gate_cave" },
    ],
  },

  suong_truc_lam: {
    id: "suong_truc_lam",
    name: "Rừng Trúc Thanh Mao · Lang Đàn",
    subtitle: "Khu Sinh Thái 2 · Độc Quyền Thanh Mao Điện Lang (Nhị Chuyển)",
    biome: "bamboo",
    pvpZoneType: "flag",
    recommendedRealm: "Nhị – Tam chuyển",
    width: 1320,
    height: 860,
    spawn: { x: 160, y: 450 },
    waterRegions: [{ kind: "pond", x: 168, y: 192, rx: 76, ry: 46 }],
    streams: [
      {
        width: 38,
        points: [
          [310, 0],
          [326, 240],
          [335, 450],
          [312, 675],
          [334, 860],
        ],
      },
    ],
    terrainZones: [
      { kind: "short_grass", x: 640, y: 460, rx: 195, ry: 100 },
      { kind: "moss_glade", x: 350, y: 230, rx: 220, ry: 135 },
      { kind: "tall_grass", x: 960, y: 260, rx: 185, ry: 135 },
      { kind: "tall_grass", x: 380, y: 660, rx: 210, ry: 115 },
    ],
    stoneTerraces: [
      {
        x: 640,
        y: 280,
        rx: 96,
        ry: 58,
        height: 12,
        stairs: [{ side: "south", offset: 0, width: 50 }],
      },
    ],
    paths: [
      { x1: 90, y1: 450, x2: 1220, y2: 450, w: 60, style: "dirt" },
      { x1: 640, y1: 342, x2: 640, y2: 450, w: 46, style: "paved" },
    ],
    buildings: [
      { kind: "pavilion", x: 640, y: 270, label: "Sương Trúc Đài" },
      { kind: "bridge_stone_h", x: 335, y: 450, label: "Hàn Trúc Kiều" },
      { kind: "lantern", x: 575, y: 285 },
      { kind: "lantern", x: 705, y: 285 },
      { kind: "stone_lamp", x: 400, y: 400 },
      { kind: "stone_lamp", x: 900, y: 400 },
      { kind: "stone_lamp", x: 580, y: 510 },
      { kind: "lantern", x: 765, y: 395 },
      { kind: "incense_burner", x: 575, y: 325 },
      { kind: "stone_stele", x: 705, y: 325 },
      { kind: "ancient_well", x: 515, y: 390 },
    ],
    trees: [
      { kind: "bamboo", x: 262, y: 232 },
      { kind: "bamboo_small", x: 238, y: 256 },
      { kind: "bamboo", x: 420, y: 200 },
      { kind: "bamboo", x: 245, y: 615 },
      { kind: "bamboo_small", x: 410, y: 685 },
      { kind: "pine_giant", x: 860, y: 210 },
      { kind: "bamboo", x: 1050, y: 260 },
      { kind: "bamboo_small", x: 1005, y: 280 },
      { kind: "bamboo", x: 340, y: 660 },
      { kind: "bamboo", x: 1110, y: 605 },
      { kind: "pine_small", x: 940, y: 650 },
      { kind: "boulder_giant", x: 805, y: 620 },
      { kind: "fern", x: 485, y: 255 },
      { kind: "stealth_bush", x: 560, y: 430 },
      { kind: "stealth_bush", x: 770, y: 500 },
    ],
    beastSpots: [
      { x: 655, y: 450, r: 155, tier: "afk", label: "Đàn Thanh Mao Điện Lang (Chỉ Sói Điện)" },
      { x: 1040, y: 450, r: 85, tier: "boss", label: "Lãnh Địa Tam Nha Điện Lang Vương" },
    ],
    npcs: [],
    gatherNodes: [
      { id: "herb_st_1", kind: "herb", label: "Sương Trúc Linh Lộ", item: "suong_truc_linh_lo", x: 480, y: 310 },
      { id: "mine_st_1", kind: "mine", label: "Hoàng Thổ Tinh Sa", item: "hoang_tho_tinh_sa", x: 880, y: 590 },
    ],
    monsterSpawns: [
      { type: "hao_dien_lang", x: 480, y: 450, respawn: 7 },
      { type: "hao_dien_lang", x: 640, y: 500, respawn: 7 },
      { type: "hao_dien_lang", x: 760, y: 410, respawn: 7 },
      { type: "hao_dien_lang", x: 560, y: 615, respawn: 7 },
      { type: "tam_nha_dien_lang", x: 1040, y: 450, respawn: 18 },
    ],
    portals: [
      { id: "back_vu_linh_st", label: "← Rừng Cây Thanh Mao", targetMap: "vu_linh_ha", x: 96, y: 450, spawnX: 1140, spawnY: 450, gateStyle: "gate_forest" },
      { id: "to_hang_thach_nhu", label: "↓ Hang Động Thạch Nhũ (Thạch Hầu)", targetMap: "hang_thach_nhu", x: 640, y: 790, spawnX: 640, spawnY: 185, gateStyle: "gate_cave" },
      { id: "to_xich_nham_st", label: "Xích Nham Cốc →", targetMap: "xich_nham_coc", x: 1230, y: 450, spawnX: 150, spawnY: 450, gateStyle: "gate_cave" },
    ],
  },

  hang_thach_nhu: {
    id: "hang_thach_nhu",
    name: "Hang Động Thạch Nhũ · Thạch Hầu Quật",
    subtitle: "Khu Sinh Thái 3 · Độc Quyền Ngọc Nhãn Thạch Hầu (Nhị – Tam Chuyển)",
    biome: "stalactite_cave",
    pvpZoneType: "flag",
    recommendedRealm: "Nhị – Tam chuyển",
    width: 1320,
    height: 860,
    spawn: { x: 160, y: 430 },
    waterRegions: [{ kind: "pond", x: 235, y: 195, rx: 85, ry: 50 }],
    streams: [
      {
        width: 40,
        points: [
          [510, 0],
          [528, 220],
          [525, 430],
          [506, 650],
          [524, 860],
        ],
      },
    ],
    terrainZones: [
      { kind: "packed_dirt", x: 300, y: 430, rx: 145, ry: 95 },
      { kind: "moss_glade", x: 760, y: 545, rx: 195, ry: 120 },
      { kind: "moss_glade", x: 255, y: 660, rx: 130, ry: 85 },
    ],
    stoneTerraces: [
      {
        x: 940,
        y: 265,
        rx: 108,
        ry: 68,
        height: 14,
        stairs: [
          { side: "south", offset: 0, width: 52 },
          { side: "west", offset: 0, width: 44 },
        ],
      },
    ],
    cliffLedges: [
      { x1: 80, y1: 125, x2: 430, y2: 120, height: 16 },
      { x1: 590, y1: 120, x2: 1210, y2: 130, height: 16 },
    ],
    paths: [
      { x1: 100, y1: 430, x2: 1210, y2: 430, w: 62, style: "paved" },
      { x1: 940, y1: 336, x2: 940, y2: 430, w: 48, style: "paved" },
      { x1: 640, y1: 100, x2: 640, y2: 430, w: 46, style: "dirt" },
    ],
    buildings: [
      { kind: "bridge_stone_h", x: 525, y: 430, label: "Thạch Nhũ Kiều" },
      { kind: "mine_entrance", x: 940, y: 245, label: "Động Phủ Thạch Hầu Vương" },
      { kind: "ancient_pillar", x: 390, y: 235 },
      { kind: "ancient_pillar", x: 720, y: 220 },
      { kind: "stone_lamp", x: 260, y: 365 },
      { kind: "stone_lamp", x: 430, y: 365 },
      { kind: "stone_lamp", x: 760, y: 365 },
      { kind: "stone_lamp", x: 1080, y: 365 },
      { kind: "lantern", x: 245, y: 495 },
      { kind: "lantern", x: 1140, y: 495 },
      { kind: "incense_burner", x: 860, y: 300 },
      { kind: "stone_stele", x: 585, y: 365 },
      { kind: "stone_stele", x: 1025, y: 300 },
    ],
    trees: [
      { kind: "crystal_cyan", x: 155, y: 165 },
      { kind: "crystal_cyan", x: 340, y: 185 },
      { kind: "boulder_giant", x: 225, y: 270 },
      { kind: "stalagmite", x: 345, y: 265 },
      { kind: "crystal_amber", x: 1045, y: 210 },
      { kind: "stalagmite", x: 825, y: 230 },
      { kind: "rock_small", x: 290, y: 280 },
      { kind: "boulder_giant", x: 1075, y: 615 },
      { kind: "crystal_cyan", x: 960, y: 650 },
      { kind: "stalagmite", x: 1125, y: 655 },
      { kind: "rock_small", x: 1015, y: 675 },
      { kind: "mushroom_cluster", x: 715, y: 545 },
      { kind: "mushroom_cluster", x: 815, y: 595 },
      { kind: "boulder_giant", x: 220, y: 660 },
      { kind: "crystal_cyan", x: 420, y: 685 },
    ],
    beastSpots: [
      { x: 760, y: 540, r: 140, tier: "afk", label: "Động Thạch Hầu (Chỉ Thạch Hầu)" },
      { x: 940, y: 265, r: 78, tier: "boss", label: "Vương Tọa Thạch Hầu Vương" },
    ],
    npcs: [],
    gatherNodes: [
      { id: "mine_tn_1", kind: "mine", label: "Mạch Nhũ Thạch", item: "mao_thach_trung", x: 350, y: 615 },
      { id: "mine_tn_2", kind: "mine", label: "Ngọc Khoáng Tinh", item: "ngoc_vun", x: 1085, y: 520 },
      { id: "wild_gu_ngoc_bi", kind: "wild_gu", label: "Ổ Dã Cổ: Ngọc Bì Cổ", guId: "ngoc_bi", x: 245, y: 295 },
    ],
    monsterSpawns: [
      { type: "thach_hau", x: 675, y: 505, respawn: 7 },
      { type: "thach_hau", x: 785, y: 590, respawn: 7 },
      { type: "thach_hau", x: 865, y: 495, respawn: 7 },
      { type: "thach_hau", x: 320, y: 520, respawn: 7 },
      { type: "thach_hau_vuong", x: 940, y: 265, respawn: 18 },
    ],
    portals: [
      { id: "back_suong_truc_tn", label: "↑ Rừng Trúc Thanh Mao", targetMap: "suong_truc_lam", x: 640, y: 146, spawnX: 640, spawnY: 720, gateStyle: "gate_cave" },
      { id: "to_hac_thuy_tn", label: "Đầm Lầy Độc Khí (Độc Thiềm) →", targetMap: "hac_thuy_ho", x: 1220, y: 430, spawnX: 165, spawnY: 450, gateStyle: "gate_cave" },
      { id: "to_xich_nham_tn", label: "↓ Xích Nham Cốc", targetMap: "xich_nham_coc", x: 640, y: 790, spawnX: 640, spawnY: 740, gateStyle: "gate_cave" },
    ],
  },

  xich_nham_coc: {
    id: "xich_nham_coc",
    name: "Xích Nham Cốc",
    subtitle: "Hẻm Núi Hỏa Diệm · Tứ Chuyển",
    biome: "volcanic",
    pvpZoneType: "flag",
    recommendedRealm: "Tứ chuyển",
    width: 1320,
    height: 860,
    spawn: { x: 640, y: 740 },
    waterRegions: [
      { kind: "lava_pool", x: 300, y: 290, rx: 120, ry: 75 },
      { kind: "lava_pool", x: 1075, y: 320, rx: 95, ry: 62 },
    ],
    terrainZones: [
      { kind: "tall_grass", x: 270, y: 620, rx: 160, ry: 115 },
      { kind: "tall_grass", x: 1030, y: 620, rx: 155, ry: 115 },
    ],
    stoneTerraces: [
      {
        x: 860,
        y: 240,
        rx: 102,
        ry: 66,
        height: 14,
        stairs: [
          { side: "south", offset: 0, width: 52 },
          { side: "west", offset: 0, width: 48 },
        ],
      },
    ],
    cliffLedges: [
      { x1: 120, y1: 155, x2: 495, y2: 150, height: 15 },
      { x1: 775, y1: 145, x2: 1180, y2: 155, height: 15 },
    ],
    paths: [
      { x1: 120, y1: 450, x2: 1200, y2: 450, w: 62 },
      { x1: 640, y1: 100, x2: 640, y2: 780, w: 62 },
    ],
    buildings: [
      { kind: "mine_entrance", x: 860, y: 222, label: "Hỏa Viêm Cổ Động" },
      { kind: "ancient_pillar", x: 470, y: 205 },
      { kind: "ancient_pillar", x: 560, y: 580 },
      { kind: "stone_lamp", x: 720, y: 580 },
      { kind: "campfire", x: 575, y: 390 },
      { kind: "campfire", x: 710, y: 390 },
      { kind: "stone_lamp", x: 575, y: 510 },
      { kind: "stone_lamp", x: 705, y: 510 },
      { kind: "incense_burner", x: 790, y: 295 },
      { kind: "stone_stele", x: 575, y: 155 },
      { kind: "stone_stele", x: 705, y: 155 },
    ],
    trees: [
      { kind: "boulder_giant", x: 260, y: 600 },
      { kind: "crystal_amber", x: 195, y: 365 },
      { kind: "crystal_amber", x: 430, y: 375 },
      { kind: "crystal_amber", x: 1020, y: 405 },
      { kind: "crystal_amber", x: 960, y: 620 },
      { kind: "rock", x: 980, y: 260 },
      { kind: "rock_small", x: 935, y: 295 },
      { kind: "dead_tree", x: 1060, y: 640 },
      { kind: "dead_tree_small", x: 1005, y: 660 },
      { kind: "stealth_bush", x: 520, y: 495 },
      { kind: "stealth_bush", x: 745, y: 490 },
    ],
    beastSpots: [
      { x: 640, y: 380, r: 135, tier: "elite", label: "Bãi Dung Nham Giáp Trùng" },
      { x: 860, y: 240, r: 78, tier: "boss", label: "Huyệt Địa Thử Vương" },
    ],
    npcs: [],
    gatherNodes: [
      { id: "mine_xn_1", kind: "mine", label: "Mạch Xích Nham Hỏa Tủy", item: "xich_nham_hoa_tuy", x: 460, y: 280 },
      { id: "mine_xn_2", kind: "mine", label: "Mao Thạch Thái Cổ", item: "mao_thach_cao", x: 980, y: 340 },
    ],
    monsterSpawns: [
      { type: "xich_viem_thu", x: 500, y: 420, respawn: 8 },
      { type: "xich_viem_thu", x: 780, y: 420, respawn: 8 },
      { type: "xich_viem_thu", x: 640, y: 300, respawn: 8 },
      { type: "xich_viem_vuong", x: 860, y: 240, respawn: 24 },
    ],
    portals: [
      { id: "back_bac_linh_xn", label: "↓ Bắc Lĩnh", targetMap: "bac_linh", x: 640, y: 790, spawnX: 640, spawnY: 185, gateStyle: "gate_cave" },
      { id: "back_suong_truc_xn", label: "← Sương Trúc Lâm", targetMap: "suong_truc_lam", x: 96, y: 450, spawnX: 1150, spawnY: 450, gateStyle: "gate_forest" },
      { id: "to_vuong_dinh", label: "↑ Bắc Nguyên · Vương Đình (Tuyết Lang)", targetMap: "vuong_dinh", x: 640, y: 146, spawnX: 640, spawnY: 740, gateStyle: "gate_mountain" },
    ],
  },

  vuong_dinh: {
    id: "vuong_dinh",
    name: "Sườn Núi Tuyết · Tuyết Lang Lĩnh",
    subtitle: "Khu Sinh Thái 5 · Độc Quyền Tuyết Lang (Ngũ Chuyển · Chân Dương Lầu)",
    biome: "snow",
    pvpZoneType: "flag",
    recommendedRealm: "Tứ – Ngũ chuyển",
    width: 1320,
    height: 860,
    spawn: { x: 640, y: 740 },
    waterRegions: [{ kind: "ice_lake", x: 260, y: 280, rx: 145, ry: 95 }],
    terrainZones: [
      { kind: "short_grass", x: 640, y: 620, rx: 175, ry: 110 },
      { kind: "tall_grass", x: 240, y: 580, rx: 155, ry: 115 },
      { kind: "tall_grass", x: 1050, y: 580, rx: 155, ry: 115 },
    ],
    stoneTerraces: [
      {
        x: 640,
        y: 420,
        rx: 116,
        ry: 74,
        height: 12,
        stairs: [
          { side: "south", offset: 0, width: 52 },
          { side: "north", offset: 0, width: 48 },
          { side: "west", offset: 0, width: 44 },
          { side: "east", offset: 0, width: 44 },
        ],
      },
      {
        x: 980,
        y: 305,
        rx: 98,
        ry: 64,
        height: 12,
        stairs: [
          { side: "south", offset: 0, width: 48 },
          { side: "west", offset: 0, width: 42 },
        ],
      },
    ],
    paths: [
      { x1: 640, y1: 110, x2: 640, y2: 780, w: 68, style: "paved" },
      { x1: 758, y1: 420, x2: 980, y2: 420, w: 48, style: "paved" },
      { x1: 980, y1: 372, x2: 980, y2: 420, w: 48, style: "paved" },
    ],
    buildings: [
      { kind: "pavilion", x: 640, y: 420, label: "Lầu Chân Dương" },
      { kind: "hall", x: 980, y: 290, label: "Tế Đàn Huyết Lô" },
      { kind: "ancient_pillar", x: 490, y: 340 },
      { kind: "ancient_pillar", x: 790, y: 340 },
      { kind: "stone_lamp", x: 585, y: 540 },
      { kind: "stone_lamp", x: 695, y: 540 },
      { kind: "banners", x: 560, y: 340 },
      { kind: "banners", x: 720, y: 340 },
      { kind: "lantern", x: 575, y: 145 },
      { kind: "lantern", x: 705, y: 145 },
      { kind: "incense_burner", x: 565, y: 475 },
      { kind: "incense_burner", x: 715, y: 475 },
      { kind: "stone_stele", x: 915, y: 350 },
      { kind: "ancient_well", x: 535, y: 620 },
    ],
    trees: [
      { kind: "snow_pine", x: 180, y: 600 },
      { kind: "snow_pine_small", x: 230, y: 625 },
      { kind: "snow_pine", x: 1080, y: 580 },
      { kind: "snow_pine_small", x: 1030, y: 610 },
      { kind: "snow_pine", x: 155, y: 400 },
      { kind: "snow_pine", x: 1145, y: 260 },
      { kind: "crystal_cyan", x: 135, y: 225 },
      { kind: "crystal_cyan", x: 390, y: 205 },
      { kind: "boulder_giant", x: 420, y: 220 },
      { kind: "rock_small", x: 470, y: 245 },
      { kind: "stealth_bush", x: 550, y: 560 },
      { kind: "stealth_bush", x: 740, y: 555 },
    ],
    beastSpots: [
      { x: 640, y: 495, r: 155, tier: "elite", label: "Thảo Nguyên Sói Tuyết" },
      { x: 320, y: 480, r: 80, tier: "boss", label: "Đàn Sói Tuyết Vương" },
    ],
    npcs: [
      {
        id: "huyet_lo_su",
        name: "Đàn Chủ Huyết Lô",
        title: "Tế Huyết Thăng Tư Chất",
        x: 980,
        y: 350,
        dialog: "Khi đạt Tứ Chuyển và tích đủ Huyết Tuyền, có thể tế huyết tại đây (mở bảng Nhân Vật C) để thăng hoa Tư Chất Bính → Ất → Giáp!",
        action: "open_char",
      },
    ],
    gatherNodes: [
      { id: "mine_vd_1", kind: "mine", label: "Băng Tuyền Tinh", item: "bang_tuyen_tinh", x: 420, y: 280 },
    ],
    monsterSpawns: [
      { type: "soi_tuyet", x: 460, y: 520, respawn: 8 },
      { type: "soi_tuyet", x: 820, y: 520, respawn: 8 },
      { type: "soi_tuyet", x: 640, y: 260, respawn: 8 },
      { type: "soi_tuyet_vuong", x: 320, y: 480, respawn: 26 },
    ],
    portals: [
      { id: "back_xich_nham_vd", label: "↓ Xích Nham Cốc", targetMap: "xich_nham_coc", x: 640, y: 790, spawnX: 640, spawnY: 185, gateStyle: "gate_mountain" },
      { id: "to_vuc_van_thu", label: "⚔ Vực Vạn Thủ (Boss Bàn Long) ↑", targetMap: "vuc_van_thu", x: 640, y: 146, spawnX: 640, spawnY: 560, gateStyle: "gate_mountain" },
    ],
  },

  vuc_van_thu: {
    id: "vuc_van_thu",
    name: "Vực Vạn Thủ",
    subtitle: "Thiên Thú Vương · Vạn Thủ Bàn Long (5 Đầu)",
    biome: "abyss",
    pvpZoneType: "safe",
    recommendedRealm: "Ngũ chuyển / Tổ đội",
    width: 1280,
    height: 760,
    spawn: { x: 640, y: 560 },
    waterRegions: [
      { kind: "swamp_lake", x: 135, y: 380, rx: 95, ry: 185 },
      { kind: "swamp_lake", x: 1145, y: 380, rx: 95, ry: 185 },
    ],
    cliffLedges: [
      { x1: 180, y1: 95, x2: 1100, y2: 95, height: 18 },
    ],
    paths: [
      { x1: 640, y1: 350, x2: 640, y2: 710, w: 72, style: "paved" },
    ],
    buildings: [
      { kind: "ancient_pillar", x: 340, y: 250 },
      { kind: "ancient_pillar", x: 940, y: 250 },
      { kind: "ancient_pillar", x: 330, y: 520 },
      { kind: "ancient_pillar", x: 950, y: 520 },
      { kind: "stone_lamp", x: 565, y: 600 },
      { kind: "stone_lamp", x: 715, y: 600 },
      { kind: "stone_lamp", x: 420, y: 560 },
      { kind: "stone_lamp", x: 860, y: 560 },
      { kind: "incense_burner", x: 500, y: 605 },
      { kind: "incense_burner", x: 780, y: 605 },
      { kind: "stone_stele", x: 495, y: 540 },
      { kind: "stone_stele", x: 785, y: 540 },
    ],
    trees: [
      { kind: "crystal_cyan", x: 265, y: 190 },
      { kind: "crystal_cyan", x: 1015, y: 190 },
      { kind: "crystal_cyan", x: 270, y: 590 },
      { kind: "crystal_cyan", x: 1010, y: 590 },
      { kind: "boulder_giant", x: 290, y: 120 },
      { kind: "boulder_giant", x: 990, y: 120 },
    ],
    npcs: [],
    gatherNodes: [],
    monsterSpawns: [
      { type: "van_thu_ban_long", x: 640, y: 265, respawn: 45 },
    ],
    portals: [
      { id: "back_vuong_dinh", label: "↓ Rời Vực Vạn Thủ", targetMap: "vuong_dinh", x: 640, y: 690, spawnX: 640, spawnY: 190, gateStyle: "gate_cave" },
    ],
  },
};

function _mapHash(a, b) {
  let h = ((a | 0) * 374761393 + (b | 0) * 668265263) ^ 0x5bf03635;
  h = (h ^ (h >> 13)) * 1274126177;
  return Math.abs(h ^ (h >> 16));
}

function _distToSegment(px, py, x1, y1, x2, y2) {
  const vx = x2 - x1;
  const vy = y2 - y1;
  const wx = px - x1;
  const wy = py - y1;
  const c1 = vx * wx + vy * wy;
  if (c1 <= 0) return Math.hypot(px - x1, py - y1);
  const c2 = vx * vx + vy * vy;
  if (c2 <= c1) return Math.hypot(px - x2, py - y2);
  const b = c1 / c2;
  return Math.hypot(px - (x1 + b * vx), py - (y1 + b * vy));
}

function _isClearOnMap(mapDef, x, y, checkSolid = false) {
  if (x < 55 || x > mapDef.width - 55 || y < 55 || y > mapDef.height - 55) return false;
  if (Math.hypot(x - mapDef.spawn.x, y - mapDef.spawn.y) < 55) return false;
  for (const p of mapDef.paths ?? []) {
    if (_distToSegment(x, y, p.x1, p.y1, p.x2, p.y2) < p.w * 0.56 + (checkSolid ? 18 : 6)) return false;
  }
  if (mapDef.ritualSpring) {
    const sp = mapDef.ritualSpring;
    if (
      x >= sp.startX - 30 &&
      x <= sp.endX + 30 &&
      y >= sp.centerY - sp.halfH - 45 &&
      y <= sp.centerY + sp.halfH + 45
    ) {
      return false;
    }
  }
  for (const w of mapDef.waterRegions ?? []) {
    if (Math.hypot((x - w.x) / Math.max(1, w.rx + 28), (y - w.y) / Math.max(1, w.ry + 24)) < 1.04) return false;
  }
  for (const st of mapDef.streams ?? []) {
    const pts = st.points ?? [];
    for (let i = 1; i < pts.length; i++) {
      if (_distToSegment(x, y, pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1]) < (st.width ?? 34) * 0.8 + 18) return false;
    }
  }
  for (const b of mapDef.buildings ?? []) {
    const r = b.kind === "arena_ring" ? (b.r ?? 150) + 22 : b.kind === "hall" || b.kind === "stone_tower" ? 78 : 54;
    if (Math.hypot(x - b.x, y - b.y) < r) return false;
  }
  if (isPointOnBridgeDeck(mapDef, x, y, 26)) return false;
  for (const st of mapDef.stoneTerraces ?? []) {
    if (Math.abs(x - st.x) < st.rx + 24 && Math.abs(y - st.y) < st.ry + 28) return false;
  }
  for (const n of [...(mapDef.portals ?? []), ...(mapDef.npcs ?? []), ...(mapDef.gatherNodes ?? [])]) {
    if (Math.hypot(x - n.x, y - n.y) < 56) return false;
  }
  if (checkSolid) {
    for (const sp of mapDef.beastSpots ?? []) {
      if (Math.hypot(x - sp.x, y - sp.y) < sp.r * 0.72) return false;
    }
    for (const t of mapDef.trees ?? []) {
      if (Math.hypot(x - t.x, y - t.y) < 44) return false;
    }
  }
  return true;
}

function enrichWorldMaps() {
  for (const mapDef of Object.values(WORLD_MAPS)) {
    if (mapDef.id === "vuc_van_thu") continue;

    if (mapDef.id === "hang_ngam_khai_khieu") {
      const rs = mapDef.ritualSpring;
      const sx0 = rs.startX - 24;
      const sx1 = rs.endX + 36;
      const span = Math.max(1, sx1 - sx0);
      const isNearBuildingOrSpawn = (px, py) => {
        if (Math.hypot(px - mapDef.spawn.x, py - mapDef.spawn.y) < 38) return true;
        for (const npc of mapDef.npcs ?? []) {
          if (Math.hypot(px - npc.x, py - npc.y) < 34) return true;
        }
        for (const b of mapDef.buildings ?? []) {
          if (Math.hypot(px - b.x, py - b.y) < 22) return true;
        }
        for (const t of mapDef.trees ?? []) {
          if (!t.kind.startsWith("tall_grass") && !t.kind.startsWith("reed_clump") && t.kind !== "fern" && t.kind !== "stealth_bush") {
            if (Math.hypot(px - t.x, py - t.y) < 24) return true;
          }
        }
        return false;
      };

      // Bờ suối mọc dày lau sậy phát sáng & cỏ cao đêm uốn theo đường suối
      const bankKinds = ["reed_clump_glow", "tall_grass_night_tall", "tall_grass_night"];
      let bIdx = 0;
      for (let x = 155; x <= 1010; x += 21) {
        const t = Math.max(0, Math.min(1, (x - sx0) / span));
        const endTaper = (t < 0.08 ? (1 - t / 0.08) * 14 : 0) + (t > 0.9 ? ((t - 0.9) / 0.1) * 12 : 0);
        const topBankY = rs.centerY - rs.halfH + Math.sin(x * 0.017) * 7 + Math.cos(x * 0.043) * 3 + endTaper - 7;
        const botBankY = rs.centerY + rs.halfH + Math.cos(x * 0.019 + 0.8) * 7 + Math.sin(x * 0.039) * 3 - endTaper + 8;

        const nx = x + ((_mapHash(x, 11) % 7) - 3);
        const ny = Math.round(topBankY - (_mapHash(11, x) % 7));
        if (!isNearBuildingOrSpawn(nx, ny)) {
          mapDef.trees.push({ kind: bankKinds[bIdx % bankKinds.length], x: nx, y: ny });
        }
        const sx = x + ((_mapHash(x, 23) % 7) - 3);
        const sy = Math.round(botBankY + (_mapHash(23, x) % 8));
        if (!isNearBuildingOrSpawn(sx, sy)) {
          mapDef.trees.push({ kind: bankKinds[(bIdx + 1) % bankKinds.length], x: sx, y: sy });
        }
        bIdx++;
      }

      // Phủ kín đồng cỏ cao ban đêm & dương xỉ khắp các bãi Bắc, Nam, Tây, Đông
      const meadowKinds = ["tall_grass_night_tall", "tall_grass_night_tall", "tall_grass_night", "tall_grass_night", "fern", "stealth_bush"];
      const pushMeadowPatch = (count, xMin, xMax, yMin, yMax, seedTag) => {
        for (let i = 0; i < count; i++) {
          const px = xMin + (_mapHash(i * 31 + seedTag, seedTag * 17 + i) % Math.max(8, xMax - xMin));
          const py = yMin + (_mapHash(seedTag * 19 + i, i * 29 + seedTag) % Math.max(8, yMax - yMin));
          if (isNearBuildingOrSpawn(px, py)) continue;
          const kind = meadowKinds[_mapHash(px + i, py) % meadowKinds.length];
          mapDef.trees.push({ kind, x: px, y: py });
        }
      };
      pushMeadowPatch(68, 75, 1055, 102, 178, 301); // Đồng cỏ Bắc
      pushMeadowPatch(82, 75, 1055, 304, 444, 409); // Đồng cỏ Nam rộng hơn
      pushMeadowPatch(24, 58, 132, 115, 190, 503);  // Trảng Tây-Bắc
      pushMeadowPatch(26, 58, 132, 275, 430, 607);  // Trảng Tây-Nam
      pushMeadowPatch(22, 1018, 1085, 120, 420, 709); // Rìa Đông
      continue;
    }
    const seed = mapDef.id.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);

    // 1. Rải dày các khóm cỏ cao Y-sort (tall_grass_1/2/flower/dry/frost + fern) trong khu cỏ cao & đồng hoa
    const grassKinds =
      mapDef.biome === "highland" || mapDef.biome === "volcanic"
        ? ["tall_grass_dry", "tall_grass_1", "tall_grass_dry", "shrub"]
        : mapDef.biome === "snow" || mapDef.biome === "bamboo"
          ? ["tall_grass_frost", "tall_grass_1", "fern", "tall_grass_frost"]
          : ["tall_grass_1", "tall_grass_2", "tall_grass_flower", "fern"];

    for (let zi = 0; zi < (mapDef.terrainZones ?? []).length; zi++) {
      const z = mapDef.terrainZones[zi];
      if (z.kind !== "tall_grass" && z.kind !== "flower_meadow") continue;
      const count = z.kind === "tall_grass" ? 26 : 14;
      for (let k = 0; k < count; k++) {
        const ang = ((_mapHash(seed + zi * 13, k * 19) % 360) * Math.PI) / 180;
        const rad = 0.18 + ((_mapHash(k * 7, seed + zi) % 80) / 100);
        const px = Math.round(z.x + Math.cos(ang) * z.rx * rad);
        const py = Math.round(z.y + Math.sin(ang) * z.ry * rad);
        if (!_isClearOnMap(mapDef, px, py, false)) continue;
        const kind =
          z.kind === "flower_meadow" && k % 2 === 0
            ? "tall_grass_flower"
            : grassKinds[_mapHash(px, py) % grassKinds.length];
        mapDef.trees.push({ kind, x: px, y: py });
      }
    }

    // 2. Bổ sung cụm cây đa kích thước (to / vừa / cây non) ở rìa bản đồ và bãi rêu
    const treePool =
      mapDef.biome === "village" || mapDef.biome === "lakeside" || mapDef.biome === "port_arena"
        ? ["peach", "peach_small", "golden_osmanthus", "osmanthus_small", "maple", "maple_small", "pine_small", "shrub", "rock_small"]
        : mapDef.biome === "forest"
          ? ["pine", "pine_small", "maple", "banana_palm", "fallen_log", "fern", "mushroom_cluster", "rock_small"]
          : mapDef.biome === "bamboo"
            ? ["bamboo", "bamboo_small", "pine", "pine_small", "fern", "rock_small"]
            : mapDef.biome === "snow"
              ? ["snow_pine", "snow_pine_small", "crystal_cyan", "rock_small"]
              : mapDef.biome === "swamp"
                ? ["dead_tree", "dead_tree_small", "willow_small", "crystal_amber", "mushroom_cluster", "fallen_log"]
                : mapDef.biome === "stalactite_cave"
                  ? ["stalagmite", "crystal_cyan", "rock", "rock_small", "mushroom_cluster"]
                  : mapDef.biome === "volcanic"
                    ? ["crystal_amber", "rock", "dead_tree_small", "rock_small"]
                    : ["pine", "pine_small", "maple_small", "dead_tree_small", "rock_small"];

    const extraSpots = mapDef.id === "giac_mo" ? 6 : 20;
    for (let i = 0; i < extraSpots; i++) {
      const px = 68 + (_mapHash(seed + i * 37, i * 17) % (mapDef.width - 136));
      const py = 72 + (_mapHash(i * 23, seed + i * 41) % (mapDef.height - 144));
      if (!_isClearOnMap(mapDef, px, py, true)) continue;
      const kind = treePool[i % treePool.length];
      mapDef.trees.push({ kind, x: px, y: py });
      // Nếu là cây lớn/vừa, thỉnh thoảng mọc kèm 1 cây non hoặc bụi dương xỉ sát gốc
      if (!kind.includes("small") && i % 3 === 0) {
        const subX = px + (i % 2 === 0 ? 22 : -22);
        const subY = py + 12;
        if (_isClearOnMap(mapDef, subX, subY, false)) {
          mapDef.trees.push({ kind: mapDef.biome === "forest" ? "fern" : "shrub", x: subX, y: subY });
        }
      }
    }
  }
}

enrichWorldMaps();
