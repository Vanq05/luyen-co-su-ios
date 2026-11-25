/**
 * Cơ sở dữ liệu Cổ Trùng, 9 Cổ Phương định danh, Cơ chế Truyền Đạo Tính Vạn Năng
 * và Hệ thống Đạo Lộ Tự Định Hình (Con Đường Bản Thân qua Dung Hợp Cổ).
 */

export const STARTER_GU_IDS = [
  "nguyet_quang",
  "huyet_nha",
  "thanh_doc",
  "thiet_cot",
  "anh_bo",
  "hoa_than",
];

export const GU_CATALOG = {
  // === 6 CỔ TRÙNG KHỞI ĐẦU (NHẤT CHUYỂN) ===
  nguyet_quang: {
    baseId: "nguyet_quang",
    name: "Nguyệt Quang Cổ",
    shortLabel: "Nguyệt Quang",
    tier: 1,
    element: "Quang",
    slotCategory: "active",
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
    pierce: 2,
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
    hpCostPct: 0.02,
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
    armorBonus: 0.3,
    speedMod: -0.1,
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
    corruptionGain: 5,
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

  // === 9 CỔ TRÙNG NHỊ CHUYỂN ĐỊNH DANH (HỢP CỔ ĐỊNH ĐẠO) ===
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
    cooldown: 5.0,
    corruptionGain: 8,
    range: 126,
    arcSpread: (92 * Math.PI) / 180,
    lifesteal: 0.25,
    passiveHpDrainPct: 0.01,
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
    cooldown: 5.5,
    corruptionGain: 9,
    range: 106,
    radius: 44,
    zoneDuration: 3.5,
    zoneDps: 20,
    ignitesPoison: true,
    blocksNormalHeal: true,
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
    cooldown: 2.3,
    corruptionGain: 6,
    range: 52,
    armorBonus: 0.2,
    stunDuration: 0.9,
    description: "Nhị Chuyển: Lướt bọc giáp đâm gai xương làm choáng. -20% tầm lướt.",
  },
  thai_duong_cuc_quang: {
    baseId: "thai_duong_cuc_quang",
    name: "Thái Dương Cực Quang Cổ",
    shortLabel: "Cực Quang",
    tier: 2,
    element: "Quang Viêm",
    slotCategory: "active",
    aimType: "line",
    color: "#ffbe4f",
    vfxKey: "vfx/nguyet-quang",
    damage: 64,
    mpCost: 20,
    hpCostPct: 0,
    cooldown: 2.4,
    corruptionGain: 6,
    range: 148,
    radius: 14,
    pierce: 4,
    ignitesPoison: true,
    description: "Nhị Chuyển: Tia cực quang mặt trời xuyên 3 mục tiêu & kích nổ Vũng Độc!",
  },
  thuc_huyet_doc: {
    baseId: "thuc_huyet_doc",
    name: "Thực Huyết Độc Cổ",
    shortLabel: "Thực Huyết",
    tier: 2,
    element: "Huyết Độc",
    slotCategory: "active",
    aimType: "line",
    color: "#d9387e",
    vfxKey: "vfx/huyet-nha",
    damage: 20,
    projectileCount: 4,
    mpCost: 14,
    hpCostPct: 0.015,
    lifesteal: 0.3,
    poisonDps: 11,
    poisonDuration: 3.5,
    slowFactor: 0.4,
    cooldown: 2.5,
    corruptionGain: 5,
    range: 138,
    radius: 8,
    homing: true,
    description: "Nhị Chuyển: 4 độc nha đuổi mục tiêu, vừa rút kịch độc làm chậm vừa hút máu!",
  },
  huyet_ma_giap: {
    baseId: "huyet_ma_giap",
    name: "Huyết Ma Chiến Giáp Cổ",
    shortLabel: "Huyết Giáp",
    tier: 2,
    element: "Huyết Cốt",
    slotCategory: "passive",
    color: "#ff4769",
    armorBonus: 0.25,
    globalLifesteal: 0.1,
    maxHpBonus: 40,
    description: "Nhị Chuyển Bản Mệnh: +25% Giáp, +10% Hút máu mọi đòn, +40 Huyết Khí.",
  },
  viem_hoang_giap: {
    baseId: "viem_hoang_giap",
    name: "Viêm Hoàng Bá Thể Cổ",
    shortLabel: "Viêm Giáp",
    tier: 2,
    element: "Viêm Cốt",
    slotCategory: "passive",
    color: "#ff8533",
    armorBonus: 0.22,
    firePoisonBonus: 0.22,
    maxHpBonus: 25,
    description: "Nhị Chuyển Bản Mệnh: +22% Giáp, +22% Sát thương Viêm/Độc, +25 Huyết Khí.",
  },
  thanh_linh_tien_the: {
    baseId: "thanh_linh_tien_the",
    name: "Thanh Linh Tiên Thể Cổ",
    shortLabel: "Tiên Thể",
    tier: 2,
    element: "Quang Cốt",
    slotCategory: "passive",
    color: "#6ef7dc",
    armorBonus: 0.14,
    speedMod: 0.16,
    mpRegenBonus: 3.5,
    cooldownMod: -0.14,
    description: "Nhị Chuyển Bản Mệnh: +16% Tốc chạy, +3.5 MP/s, -14% Hồi chiêu, +14% Giáp.",
  },
  hoa_luu_tinh_bo: {
    baseId: "hoa_luu_tinh_bo",
    name: "Hỏa Lưu Tinh Bộ Cổ",
    shortLabel: "Lưu Tinh Bộ",
    tier: 2,
    element: "Viêm Ảnh",
    slotCategory: "move",
    aimType: "dash",
    color: "#ff944d",
    vfxKey: "vfx/hoa-than",
    damage: 36,
    mpCost: 13,
    hpCostPct: 0,
    cooldown: 2.3,
    corruptionGain: 6,
    range: 70,
    decoyDuration: 2.2,
    ignitesPoison: true,
    leaveFireZone: true,
    description: "Nhị Chuyển Di Chuyển: Lướt hóa lưu tinh để lại vùng lửa & phân thân nổ!",
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
    description: "Mảnh xác cổ trùng vỡ do nổ vạc. Dùng làm phụ liệu tăng mạnh tỷ lệ Biến Dị!",
  },
};

export const FUSION_RECIPES = [
  {
    id: "recipe_huyet_nguyet",
    main: "nguyet_quang",
    sub: "huyet_nha",
    result: "huyet_nguyet",
    title: "Nguyệt Quang Cổ + Huyết Nha Cổ = Huyết Nguyệt Cổ (Huyết Quang)",
  },
  {
    id: "recipe_chuong_khi_boc",
    main: "thanh_doc",
    sub: "hoa_than",
    result: "chuong_khi_boc",
    title: "Thanh Độc Trùng + Hỏa Thán Cổ = Chướng Khí Bộc Cổ (Viêm Độc)",
  },
  {
    id: "recipe_bach_cot_don",
    main: "anh_bo",
    sub: "thiet_cot",
    result: "bach_cot_don",
    title: "Ảnh Bộ Cổ + Thiết Cốt Cổ = Bạch Cốt Độn Cổ (Ảnh Cốt)",
  },
  {
    id: "recipe_thai_duong_cuc_quang",
    main: "nguyet_quang",
    sub: "hoa_than",
    result: "thai_duong_cuc_quang",
    title: "Nguyệt Quang Cổ + Hỏa Thán Cổ = Thái Dương Cực Quang Cổ (Quang Viêm)",
  },
  {
    id: "recipe_thuc_huyet_doc",
    main: "huyet_nha",
    sub: "thanh_doc",
    result: "thuc_huyet_doc",
    title: "Huyết Nha Cổ + Thanh Độc Trùng = Thực Huyết Độc Cổ (Huyết Độc)",
  },
  {
    id: "recipe_huyet_ma_giap",
    main: "thiet_cot",
    sub: "huyet_nha",
    result: "huyet_ma_giap",
    title: "Thiết Cốt Cổ + Huyết Nha Cổ = Huyết Ma Chiến Giáp Cổ (Bản Mệnh)",
  },
  {
    id: "recipe_viem_hoang_giap",
    main: "thiet_cot",
    sub: "hoa_than",
    result: "viem_hoang_giap",
    title: "Thiết Cốt Cổ + Hỏa Thán Cổ = Viêm Hoàng Bá Thể Cổ (Bản Mệnh)",
  },
  {
    id: "recipe_thanh_linh_tien_the",
    main: "thiet_cot",
    sub: "nguyet_quang",
    result: "thanh_linh_tien_the",
    title: "Thiết Cốt Cổ + Nguyệt Quang Cổ = Thanh Linh Tiên Thể Cổ (Bản Mệnh)",
  },
  {
    id: "recipe_hoa_luu_tinh_bo",
    main: "anh_bo",
    sub: "hoa_than",
    result: "hoa_luu_tinh_bo",
    title: "Ảnh Bộ Cổ + Hỏa Thán Cổ = Hỏa Lưu Tinh Bộ Cổ (Di Chuyển)",
  },
];

let nextUid = 1;

export function createGuInstance(baseId, overrides = {}) {
  const tpl = GU_CATALOG[baseId] ?? GU_CATALOG.nguyet_quang;
  const inst = {
    ...tpl,
    uid: overrides.uid ?? `gu_${Date.now().toString(36)}_${nextUid++}`,
    isMutated: Boolean(overrides.isMutated),
    customTitle: overrides.customTitle ?? null,
    subElement: overrides.subElement ?? null,
  };

  const directKeys = [
    "name",
    "shortLabel",
    "tier",
    "element",
    "color",
    "lifesteal",
    "globalLifesteal",
    "poisonDps",
    "poisonDuration",
    "slowFactor",
    "ignitesPoison",
    "pierce",
    "range",
    "armorBonus",
    "speedMod",
    "stunDuration",
    "spawnDecoyOnCast",
    "maxHpBonus",
    "mpRegenBonus",
    "firePoisonBonus",
    "cooldownMod",
    "leaveFireZone",
    "passiveCorruptionRate",
    "description",
  ];
  for (const k of directKeys) {
    if (overrides[k] !== undefined) {
      inst[k] = overrides[k];
    }
  }

  if (overrides.damageMult && inst.damage) {
    inst.damage = Math.round(inst.damage * overrides.damageMult);
  }
  if (overrides.cooldownMult && inst.cooldown) {
    inst.cooldown = Number(Math.max(0.45, inst.cooldown * overrides.cooldownMult).toFixed(2));
  }
  if (overrides.corruptionMult && inst.corruptionGain) {
    inst.corruptionGain = Math.round(inst.corruptionGain * overrides.corruptionMult);
  }

  return inst;
}

export function matchRecipe(mainBaseId, subBaseId) {
  return (
    FUSION_RECIPES.find((r) => r.main === mainBaseId && r.sub === subBaseId) ??
    FUSION_RECIPES.find((r) => r.main === subBaseId && r.sub === mainBaseId) ??
    null
  );
}

/**
 * Dung hợp vạn năng: giữ hình thái chiêu của Cổ Chính và truyền Đạo Tính của Cổ Phụ,
 * hỗ trợ nâng từ Nhất Chuyển -> Nhị Chuyển -> Tam Chuyển (hoặc Dị Cổ).
 */
export function fuseUniversalHybrid(mainGu, subGu, isMutation = false) {
  const recipe = mainGu.tier === 1 && subGu.tier === 1 ? matchRecipe(mainGu.baseId, subGu.baseId) : null;
  if (recipe) {
    const baseTpl = GU_CATALOG[recipe.result];
    const created = createGuInstance(
      recipe.result,
      isMutation
        ? {
            isMutated: true,
            name: `Dị · ${baseTpl.name}`,
            shortLabel: `Dị ${baseTpl.shortLabel}`,
            damageMult: 1.42,
            cooldownMult: 0.86,
            corruptionMult: 1.65,
            passiveCorruptionRate: 1.0,
            description: `DỊ CỔ: ${baseTpl.description} (+42% Uy lực, rỉ Phản Phệ)`,
          }
        : {}
    );
    return { created, unlockedRecipeId: recipe.id };
  }

  const newTier = Math.min(3, Math.max(mainGu.tier ?? 1, subGu.tier ?? 1) + 1);
  const tierPrefix = newTier >= 3 ? "Tam Chuyển" : "Nhị Chuyển";
  const subEl = String(subGu.element ?? "");
  const mainEl = String(mainGu.element ?? "");
  const combinedElement = mainEl.includes(subEl) || !subEl || subEl === "Tàn" ? mainEl : `${mainEl} ${subEl}`;

  const traits = [];
  const overrides = {
    isMutated: isMutation,
    tier: newTier,
    element: combinedElement,
    damageMult: isMutation ? 1.48 : 1.3,
    cooldownMult: isMutation ? 0.85 : 0.92,
    corruptionMult: isMutation ? 1.65 : 1.15,
    passiveCorruptionRate: isMutation ? 1.0 : 0,
  };

  if (subEl.includes("Huyết")) {
    if (mainGu.slotCategory === "passive") {
      overrides.globalLifesteal = Number(((mainGu.globalLifesteal ?? 0) + 0.08).toFixed(2));
      overrides.maxHpBonus = (mainGu.maxHpBonus ?? 0) + 30;
      traits.push("+8% Hút máu & +30 HP");
    } else {
      overrides.lifesteal = Number(Math.min(0.45, (mainGu.lifesteal ?? 0) + 0.18).toFixed(2));
      traits.push("Hút máu +18%");
    }
  }
  if (subEl.includes("Độc")) {
    if (mainGu.slotCategory === "passive") {
      overrides.firePoisonBonus = Number(((mainGu.firePoisonBonus ?? 0) + 0.16).toFixed(2));
      traits.push("+16% ST Độc/Viêm");
    } else {
      overrides.poisonDps = (mainGu.poisonDps ?? 0) + 9;
      overrides.poisonDuration = Math.max(mainGu.poisonDuration ?? 0, 3.0);
      overrides.slowFactor = Math.max(mainGu.slowFactor ?? 0, 0.35);
      traits.push("Truyền Độc & Làm chậm");
    }
  }
  if (subEl.includes("Viêm")) {
    if (mainGu.slotCategory === "passive") {
      overrides.firePoisonBonus = Number(((mainGu.firePoisonBonus ?? 0) + 0.18).toFixed(2));
      traits.push("+18% ST Viêm/Độc");
    } else {
      overrides.ignitesPoison = true;
      overrides.damageMult *= 1.12;
      if (mainGu.slotCategory === "move") overrides.leaveFireZone = true;
      traits.push("Viêm Bạo kích nổ Độc");
    }
  }
  if (subEl.includes("Quang")) {
    if (mainGu.slotCategory === "passive") {
      overrides.mpRegenBonus = (mainGu.mpRegenBonus ?? 0) + 2.8;
      overrides.cooldownMod = Number(((mainGu.cooldownMod ?? 0) - 0.1).toFixed(2));
      traits.push("+2.8 MP/s & -10% CD");
    } else {
      overrides.pierce = (mainGu.pierce ?? 1) + 1;
      overrides.range = Math.round((mainGu.range ?? 96) * 1.16);
      overrides.cooldownMult *= 0.9;
      traits.push("Xuyên phá +1 & Giảm CD");
    }
  }
  if (subEl.includes("Ảnh")) {
    if (mainGu.slotCategory === "passive") {
      overrides.speedMod = Number(((mainGu.speedMod ?? 0) + 0.14).toFixed(2));
      traits.push("+14% Tốc chạy");
    } else {
      overrides.spawnDecoyOnCast = true;
      traits.push("Tạo Ảnh Phân Thân khi tung chiêu");
    }
  }
  if (subEl.includes("Cốt")) {
    overrides.armorBonus = Number(Math.min(0.45, (mainGu.armorBonus ?? 0) + 0.1).toFixed(2));
    if (mainGu.slotCategory !== "passive") {
      overrides.stunDuration = Math.max(mainGu.stunDuration ?? 0, 0.55);
      traits.push("+10% Giáp & Choáng 0.55s");
    } else {
      overrides.maxHpBonus = (mainGu.maxHpBonus ?? 0) + 25;
      traits.push("+10% Giáp & +25 HP");
    }
  }
  if (traits.length === 0) {
    traits.push("+35% Uy lực biến hóa");
  }

  const baseClean = mainGu.name.replace(/^(Dị · |Nhị Chuyển · |Tam Chuyển · )+/g, "");
  overrides.name = isMutation ? `Dị · ${tierPrefix} ${baseClean}` : `${tierPrefix} · ${baseClean}`;
  overrides.shortLabel = isMutation ? `Dị ${mainGu.shortLabel}` : `${mainGu.shortLabel} ${newTier === 3 ? "III" : "II"}`;
  overrides.description = `${tierPrefix} (${combinedElement}): ${traits.join(", ")}.`;

  // Giữ toàn bộ chỉ số đang có trên mainGu rồi phủ overrides lên
  const merged = {
    ...mainGu,
    ...createGuInstance(mainGu.baseId, overrides),
  };
  return { created: merged, unlockedRecipeId: null };
}

/**
 * Tự động xác định Con Đường Tu Luyện (Đạo Lộ) dựa trên 5 Cổ Trùng lắp trong Không Khiếu.
 */
export function computeCultivationPath(equippedGuList = []) {
  const counts = { Huyết: 0, Độc: 0, Viêm: 0, Quang: 0, Ảnh: 0, Cốt: 0 };
  let highTierCount = 0;

  for (const gu of equippedGuList) {
    if (!gu) continue;
    const w = (gu.tier ?? 1) >= 2 ? 2 : 1;
    if ((gu.tier ?? 1) >= 2) highTierCount += 1;
    const el = String(gu.element ?? "");
    for (const key of Object.keys(counts)) {
      if (el.includes(key)) counts[key] += w;
    }
  }

  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const [topEl, topScore] = sorted[0];
  const [, secondScore] = sorted[1];

  if (highTierCount >= 2 && secondScore >= 3 && topScore === secondScore) {
    return {
      id: "hon_nguyen",
      name: "Hỗn Nguyên Cổ Đạo",
      badge: "☯️",
      color: "#ffd86e",
      bonusDesc: "+14% Toàn sát thương · +25 HP · +20 Chân Nguyên",
      bonuses: { allDmg: 0.14, maxHp: 25, maxMp: 20 },
    };
  }

  if (topScore >= 3) {
    const PATH_MAP = {
      Huyết: {
        id: "huyet_dao",
        name: "Huyết Ma Đạo",
        badge: "🩸",
        color: "#ff3855",
        bonusDesc: "+35 Huyết Khí · +10% Hút máu toàn phần",
        bonuses: { maxHp: 35, lifesteal: 0.1 },
      },
      Độc: {
        id: "doc_dao",
        name: "Vạn Độc Đạo",
        badge: "🐍",
        color: "#65e858",
        bonusDesc: "+22% Sát thương Độc & Viêm · Độc ăn mòn sâu",
        bonuses: { firePoisonDmg: 0.22, maxMp: 15 },
      },
      Viêm: {
        id: "viem_dao",
        name: "Phần Thiên Viêm Đạo",
        badge: "🔥",
        color: "#ff7b39",
        bonusDesc: "+22% Sát thương Viêm & Độc · Cường hóa hỏa bạo",
        bonuses: { firePoisonDmg: 0.22, allDmg: 0.08 },
      },
      Quang: {
        id: "quang_dao",
        name: "Cực Quang Kiếm Đạo",
        badge: "🌙",
        color: "#5ef2d6",
        bonusDesc: "-15% Hồi chiêu · +2.5 Chân Nguyên/giây",
        bonuses: { cooldownMod: -0.15, mpRegen: 2.5 },
      },
      Ảnh: {
        id: "anh_dao",
        name: "U Minh Ảnh Đạo",
        badge: "🌑",
        color: "#b86bff",
        bonusDesc: "+15% Tốc chạy · +10% Toàn sát thương",
        bonuses: { speed: 0.15, allDmg: 0.1 },
      },
      Cốt: {
        id: "cot_dao",
        name: "Bất Hoại Cốt Đạo",
        badge: "🦴",
        color: "#dce4f2",
        bonusDesc: "+15% Giáp hộ thể · +35 Huyết Khí",
        bonuses: { armor: 0.15, maxHp: 35 },
      },
    };
    return PATH_MAP[topEl];
  }

  return {
    id: "khoi_nguyen",
    name: "Khởi Nguyên Cổ Đạo",
    badge: "✨",
    color: "#4de6b0",
    bonusDesc: "+15 Huyết Khí · +1.5 MP/s · Dung hợp Cổ để tự định Đạo Lộ!",
    bonuses: { maxHp: 15, mpRegen: 1.5 },
  };
}

export function canEquipInSlot(gu, slotId) {
  if (!gu) return false;
  if (slotId === "passive") return gu.slotCategory === "passive";
  if (slotId === "move") return gu.slotCategory === "move";
  return gu.slotCategory === "active";
}
