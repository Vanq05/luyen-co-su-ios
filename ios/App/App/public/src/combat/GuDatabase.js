/**
 * Cơ sở dữ liệu Cổ Trùng, Công thức Hợp Cổ và Hệ thống Không Khiếu của "Luyện Cổ Sư".
 */

export const GU_CATALOG = {
  // === 6 CỔ TRÙNG KHỞI ĐẦU (NHẤT CHUYỂN) ===
  nguyet_quang: {
    baseId: "nguyet_quang",
    name: "Nguyệt Quang Cổ",
    shortLabel: "Nguyệt Quang",
    tier: 1,
    element: "Quang",
    slotCategory: "active", // lắp vào skill1, skill2, ult
    aimType: "line",
    color: "#5ef2d6",
    vfxKey: "vfx/nguyet-quang",
    damage: 28,
    mpCost: 12,
    hpCostPct: 0,
    cooldown: 1.3,
    corruptionGain: 2,
    range: 118,
    radius: 11,
    pierce: 2, // xuyên 1 mục tiêu -> trúng tối đa 2
    description: "Bắn lưỡi liềm ánh sáng xanh xuyên 1 mục tiêu.",
  },
  huyet_nha: {
    baseId: "huyet_nha",
    name: "Huyết Nha Cổ",
    shortLabel: "Huyết Nha",
    tier: 1,
    element: "Huyết",
    slotCategory: "active",
    aimType: "line",
    color: "#ff4769",
    vfxKey: "vfx/huyet-nha",
    damage: 13,
    projectileCount: 3,
    mpCost: 8,
    hpCostPct: 0.02, // tốn 2% Max HP
    lifesteal: 0.35,
    cooldown: 2.1,
    corruptionGain: 3,
    range: 130,
    radius: 7,
    homing: true,
    description: "Phóng 3 giọt máu bay đuổi địch, tốn 2% HP để hút máu.",
  },
  thanh_doc: {
    baseId: "thanh_doc",
    name: "Thanh Độc Trùng",
    shortLabel: "Thanh Độc",
    tier: 1,
    element: "Độc",
    slotCategory: "active",
    aimType: "arc",
    color: "#73eb5e",
    vfxKey: "vfx/thanh-doc",
    damage: 20,
    mpCost: 14,
    hpCostPct: 0,
    cooldown: 2.3,
    corruptionGain: 2,
    range: 88,
    arcSpread: (65 * Math.PI) / 180,
    poisonDps: 7,
    poisonDuration: 3.0,
    slowFactor: 0.45,
    description: "Phun sương độc hình nón, rút độc và làm chậm địch.",
  },
  thiet_cot: {
    baseId: "thiet_cot",
    name: "Thiết Cốt Cổ",
    shortLabel: "Thiết Cốt",
    tier: 1,
    element: "Cốt",
    slotCategory: "passive",
    color: "#c7ccd9",
    armorBonus: 0.3, // +30% giáp
    speedMod: -0.1, // -10% tốc chạy
    description: "Bản Mệnh Cổ: +30% Giáp, -10% Tốc chạy.",
  },
  anh_bo: {
    baseId: "anh_bo",
    name: "Ảnh Bộ Cổ",
    shortLabel: "Ảnh Bộ",
    tier: 1,
    element: "Ảnh",
    slotCategory: "move",
    aimType: "dash",
    color: "#b36bff",
    vfxKey: "vfx/anh-bo",
    damage: 18,
    mpCost: 10,
    hpCostPct: 0,
    cooldown: 2.2,
    corruptionGain: 5, // +5% Phản Phệ mỗi lần dùng
    range: 64,
    decoyDuration: 2.0,
    description: "Lướt để lại phân thân bóng mờ dụ địch, +5% Phản Phệ.",
  },
  hoa_than: {
    baseId: "hoa_than",
    name: "Hỏa Thán Cổ",
    shortLabel: "Hỏa Thán",
    tier: 1,
    element: "Viêm",
    slotCategory: "active",
    aimType: "aoe",
    color: "#ff7b39",
    vfxKey: "vfx/hoa-than",
    damage: 38,
    mpCost: 18,
    hpCostPct: 0,
    cooldown: 3.0,
    corruptionGain: 4,
    range: 98,
    radius: 30,
    ignitesPoison: true,
    description: "Ném cầu than nổ lan hệ Viêm. Kích nổ Vũng Độc!",
  },

  // === 3 CỔ TRÙNG NHỊ CHUYỂN (HỢP CỔ MẪU) ===
  huyet_nguyet: {
    baseId: "huyet_nguyet",
    name: "Huyết Nguyệt Cổ",
    shortLabel: "Huyết Nguyệt",
    tier: 2,
    element: "Huyết Quang",
    slotCategory: "active",
    aimType: "arc",
    color: "#ff3358",
    vfxKey: "vfx/huyet-nguyet",
    damage: 78,
    mpCost: 26,
    hpCostPct: 0,
    cooldown: 5.2,
    corruptionGain: 8,
    range: 126,
    arcSpread: (92 * Math.PI) / 180,
    lifesteal: 0.25,
    passiveHpDrainPct: 0.01, // Đánh đổi: đốt 1% HP/giây khi mang
    description: "Nhị Chuyển: Trăng khuyết đỏ diện rộng hút máu. Đốt 1% HP/giây!",
  },
  chuong_khi_boc: {
    baseId: "chuong_khi_boc",
    name: "Chướng Khí Bộc Cổ",
    shortLabel: "Chướng Bộc",
    tier: 2,
    element: "Viêm Độc",
    slotCategory: "active",
    aimType: "aoe",
    color: "#a8ff52",
    vfxKey: "vfx/chuong-khi-boc",
    damage: 55,
    mpCost: 28,
    hpCostPct: 0,
    cooldown: 5.8,
    corruptionGain: 9,
    range: 106,
    radius: 44,
    zoneDuration: 3.5,
    zoneDps: 20,
    ignitesPoison: true,
    blocksNormalHeal: true, // Đánh đổi: không hồi máu bằng đồ hồi máu thường
    description: "Nhị Chuyển: Biển lửa độc đốt lan. Cấm hồi máu bằng Linh Thảo thường!",
  },
  bach_cot_don: {
    baseId: "bach_cot_don",
    name: "Bạch Cốt Độn Cổ",
    shortLabel: "Bạch Cốt Độn",
    tier: 2,
    element: "Ảnh Cốt",
    slotCategory: "move",
    aimType: "dash",
    color: "#e6dfe8",
    vfxKey: "vfx/bach-cot-don",
    damage: 42,
    mpCost: 12,
    hpCostPct: 0,
    cooldown: 2.4,
    corruptionGain: 6,
    range: 51, // Giảm 20% tầm lướt so với 64px
    armorBonus: 0.2,
    stunDuration: 0.9,
    description: "Nhị Chuyển: Lướt bọc giáp đâm gai xương làm choáng. -20% tầm lướt.",
  },

  // === TÀN CỔ (KHI NỔ VẠC) ===
  tan_co: {
    baseId: "tan_co",
    name: "Tàn Cổ Vỡ Nát",
    shortLabel: "Tàn Cổ",
    tier: 0,
    element: "Tàn",
    slotCategory: "active",
    aimType: "line",
    color: "#7a7085",
    vfxKey: "vfx/hit-spark",
    damage: 10,
    mpCost: 6,
    hpCostPct: 0,
    cooldown: 1.5,
    corruptionGain: 4,
    range: 72,
    radius: 8,
    isRemnant: true,
    description: "Mảnh xác cổ trùng vỡ do nổ vạc. Có thể dùng làm phụ liệu kích biến dị.",
  },
};

export const FUSION_RECIPES = [
  {
    id: "recipe_huyet_nguyet",
    main: "nguyet_quang",
    sub: "huyet_nha",
    result: "huyet_nguyet",
    title: "Nguyệt Quang Cổ + Huyết Nha Cổ = Huyết Nguyệt Cổ",
  },
  {
    id: "recipe_chuong_khi_boc",
    main: "thanh_doc",
    sub: "hoa_than",
    result: "chuong_khi_boc",
    title: "Thanh Độc Trùng + Hỏa Thán Cổ = Chướng Khí Bộc Cổ",
  },
  {
    id: "recipe_bach_cot_don",
    main: "anh_bo",
    sub: "thiet_cot",
    result: "bach_cot_don",
    title: "Ảnh Bộ Cổ + Thiết Cốt Cổ = Bạch Cốt Độn Cổ",
  },
];

let nextUid = 1;

export function createGuInstance(baseId, overrides = {}) {
  const tpl = GU_CATALOG[baseId];
  if (!tpl) {
    throw new Error(`Không tìm thấy Cổ Trùng: ${baseId}`);
  }
  const inst = {
    ...tpl,
    uid: `gu_${nextUid++}`,
    isMutated: Boolean(overrides.isMutated),
    customTitle: overrides.customTitle ?? null,
    subElement: overrides.subElement ?? null,
  };

  if (overrides.name) inst.name = overrides.name;
  if (overrides.shortLabel) inst.shortLabel = overrides.shortLabel;
  if (overrides.tier) inst.tier = overrides.tier;
  if (overrides.damageMult) inst.damage = Math.round(inst.damage * overrides.damageMult);
  if (overrides.cooldownMult) inst.cooldown = Number((inst.cooldown * overrides.cooldownMult).toFixed(2));
  if (overrides.corruptionMult) inst.corruptionGain = Math.round(inst.corruptionGain * overrides.corruptionMult);
  if (overrides.passiveCorruptionRate) inst.passiveCorruptionRate = overrides.passiveCorruptionRate;
  if (overrides.description) inst.description = overrides.description;

  return inst;
}

/**
 * Tìm công thức Nhị Chuyển khớp với Cổ Chính + Cổ Phụ (tôn trọng thứ tự chính/phụ cho 3 công thức mẫu,
 * đồng thời cho phép đảo chiều nếu đúng cặp chuẩn).
 */
export function matchRecipe(mainBaseId, subBaseId) {
  return (
    FUSION_RECIPES.find((r) => r.main === mainBaseId && r.sub === subBaseId) ??
    FUSION_RECIPES.find((r) => r.main === subBaseId && r.sub === mainBaseId) ??
    null
  );
}

export function canEquipInSlot(gu, slotId) {
  if (!gu) return false;
  if (slotId === "passive") return gu.slotCategory === "passive";
  if (slotId === "move") return gu.slotCategory === "move";
  return gu.slotCategory === "active";
}
