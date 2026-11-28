import {
  applySelectiveOutline,
  bayerThreshold,
  createPixelCanvas,
  fillPixelEllipse,
  plotPixel,
  plotPixelEllipse,
  plotPixelLine,
  plotRect,
  shadeHex,
} from "../engine/PixelSpriteBaker.js";

/**
 * HỆ THỐNG SÁT CHIÊU KẾT HỢP 2–3 CỔ TRÙNG & ĐẠN/VFX PIXEL ART NHIỀU FRAME
 * - Tuyệt đối 0 ctx.arc / ctx.ellipse / gradient mờ / SVG.
 * - Mỗi chiêu thức đơn lẻ, chiêu kết hợp 2+ Cổ và chiêu Boss đều render theo Sprite Pixel nhiều frame
 *   có viền tối 1px sắc nét, tàn ảnh (trail), mảnh vỡ va chạm và Telegraph cảnh báo dễ đọc hướng né.
 */

const PROJ_SHEET_CACHE = new Map();

const OPPOSING_PATH_PAIRS = [
  ["viem_dao", "thuy_dao"],
  ["viem_dao", "bang_tuyet_dao"],
  ["quang_dao", "anh_dao"],
  ["quang_dao", "huyet_dao"],
  ["doc_dao", "moc_dao"],
];

function samePathPair(a, b, p1, p2) {
  return (a === p1 && b === p2) || (a === p2 && b === p1);
}

const GU_FAMILY_ALIAS = {
  tieu_sinh_co: "sinh_co",
  cuu_diep_sinh_co: "sinh_co",
  quang_vu: "quang_vu",
  nguyet_quang: "nguyet",
  nguyet_nghe: "nguyet",
  ngan_trung_nguyet: "nguyet",
  hoang_kim_nguyet: "nguyet",
  thanh_phong_luan: "phong",
  thinh_phong: "phong",
  truy_phong: "phong",
  tuu_trung: "tuu",
  tu_vi_tuu_trung: "tuu",
  thuc_tinh: "tuu",
  hac_thi: "thi",
  bach_thi: "thi",
  hung_luc: "luc",
  toan_luc_ung_pho: "luc",
  long_tuong_luc: "luc",
  bat_son: "luc",
  van_nga_huyen_anh: "luc",
  dong_bi: "bi",
  thu_bi: "bi",
  ngoc_bi: "bi",
  bach_ngoc: "bi",
  thien_bong: "bi",
  kim_chung_trao: "bi",
  thiet_cot: "bi",
  huyen_cot_giap: "bi",
  huyet_nha: "huyet",
  huyet_nguyet: "huyet",
  huyet_cuong: "huyet",
  huyet_ha_xa: "huyet",
  huyet_lo: "huyet",
  huyet_tich_tu: "huyet",
  kiem_anh: "kiem",
  suong_truc_kiem: "kiem",
  van_kiem_quy_tong: "kiem",
  thien_kiem_tuyet_anh: "kiem",
  dan_khieu_hoa_than: "viem",
  xich_viem_long_tuc: "viem",
  liet_diem_phan_thanh: "viem",
  thai_co_long_tuc: "viem",
  han_bang_tien: "bang",
  bang_co: "bang",
  bang_phach_tuyet_hoa: "bang",
  bang_phong_thien_ly: "bang",
  dien_nhan: "loi",
  loi_khieu: "loi",
  loi_duc: "loi",
  cuu_tieu_loi_nguc: "loi",
  thanh_doc: "doc",
  chuong_khi_boc: "doc",
  doc_hat: "doc",
  phe_hon_thiem: "doc",
  van_doc_vuong: "doc",
  bach_cot_don: "cot",
  xoan_oc_cot_thuong: "cot",
  cot_thuong: "cot",
};

function matchesRecipeFamilies(guList, famReq) {
  const fams = guList.map((g) => GU_FAMILY_ALIAS[g.id] || g.path || g.id);
  const pool = [...fams];
  for (const req of famReq) {
    const idx = pool.findIndex((f) => f === req || (req === "luc" && f === "thi") || (req === "bi" && f === "bang"));
    if (idx < 0) return false;
    pool.splice(idx, 1);
  }
  return true;
}

export const COMBO_SYNERGY_RECIPES = [
  {
    id: "combo_tam_tuyet_phong_nguyet",
    families: ["nguyet", "phong", "tuu"],
    name: "Tam Tuyệt Phong Nguyệt Phá",
    path: "nguyet_dao",
    color: "#7effeb",
    secondaryColor: "#ffd15c",
    tertiaryColor: "#80ffd4",
    kind: "combo_projectile_wave",
    projStyle: "combo_wind_moon",
    count: 3,
    pierce: 5,
    damageMult: 3.15,
    mpCostMult: 1.45,
    cooldown: 9.5,
    range: 205,
    dashBackOrSide: 42,
    speedBuffBonus: 0.28,
    speedBuffDuration: 2.5,
    refineDmgBonus: 0.2,
    refineBuffDuration: 5.0,
    desc: "Nguyệt Đạo + Phong Đạo + Tửu Trùng: Lướt nhẹ xoay mình tung 3 lưỡi liềm trăng xoáy gió & tinh luyện chân nguyên.",
  },
  {
    id: "combo_tam_luc_kim_than",
    families: ["thi", "thi", "bi"],
    name: "Tam Lực Kim Thân Bá Kích",
    path: "luc_dao",
    color: "#f2c14e",
    secondaryColor: "#d49548",
    tertiaryColor: "#fff0b8",
    kind: "combo_shockwave",
    projStyle: "combo_armor_shockwave",
    damageMult: 3.25,
    mpCostMult: 1.4,
    cooldown: 10.0,
    range: 120,
    shieldAmount: 145,
    buffDuration: 5.5,
    buffArmorBonus: 0.2,
    stunDuration: 1.1,
    knockback: 38,
    desc: "Song Thỉ Lực + Giáp Bì Cổ: Tụ giáp đồng hộ thể xông lên nện chấn động mặt đất làm choáng 1.1s & vỡ mảnh giáp!",
  },
  {
    id: "combo_phong_nguyet_toan_tram",
    families: ["nguyet", "phong"],
    name: "Phong Nguyệt Toàn Trảm",
    path: "nguyet_dao",
    color: "#6fffe9",
    secondaryColor: "#98ffda",
    kind: "combo_projectile_wave",
    projStyle: "combo_wind_moon",
    count: 2,
    pierce: 4,
    damageMult: 2.45,
    mpCostMult: 1.35,
    cooldown: 7.5,
    range: 195,
    dashForward: 54,
    speedBuffBonus: 0.22,
    speedBuffDuration: 2.2,
    desc: "Nguyệt Quang + Thanh Phong Luân: Lướt né đồng thời chém đôi trăng khuyết quấn lốc xoáy gió xanh.",
  },
  {
    id: "combo_tinh_nguyet_lien_kich",
    families: ["nguyet", "tuu"],
    name: "Tinh Nguyệt Liên Kích",
    path: "nguyet_dao",
    color: "#ffd86e",
    secondaryColor: "#5ef2d6",
    kind: "combo_projectile_wave",
    projStyle: "combo_triple_moon",
    count: 5,
    pierce: 4,
    damageMult: 2.6,
    mpCostMult: 1.3,
    cooldown: 8.0,
    range: 190,
    refineDmgBonus: 0.18,
    refineBuffDuration: 5.0,
    desc: "Nguyệt Quang + Tửu Trùng: Tửu khí tinh luyện hóa thành 5 lưỡi liềm ngân nguyệt viền vàng bay tỏa quạt.",
  },
  {
    id: "combo_nguyet_hoa_sinh_linh",
    families: ["nguyet", "sinh_co"],
    name: "Nguyệt Hoa Sinh Linh Khúc",
    path: "nguyet_dao",
    color: "#7effc2",
    secondaryColor: "#5ef2d6",
    kind: "combo_projectile_wave",
    projStyle: "combo_spirit_ring",
    count: 3,
    pierce: 3,
    damageMult: 2.15,
    mpCostMult: 1.35,
    cooldown: 8.5,
    range: 185,
    healAmount: 85,
    hotTotal: 65,
    hotDuration: 4.5,
    desc: "Nguyệt Quang + Sinh Cơ Thảo: Vừa phóng 3 trăng ngọc vừa nở vòng linh khí hồi sinh lực quanh thân.",
  },
  {
    id: "combo_nguyet_quang_vu",
    families: ["nguyet", "quang_vu"],
    name: "Minh Nguyệt Quang Vũ Trận",
    path: "nguyet_dao",
    color: "#fff099",
    secondaryColor: "#5ef2d6",
    kind: "combo_projectile_wave",
    projStyle: "combo_spirit_ring",
    count: 4,
    pierce: 4,
    damageMult: 2.4,
    mpCostMult: 1.35,
    cooldown: 8.5,
    range: 195,
    healAmount: 140,
    cleanseSlow: true,
    desc: "Nguyệt Đạo + Quang Vũ Cổ: Phóng mưa trăng sáng rực đồng thời chữa trị tức thời & giải làm chậm.",
  },
  {
    id: "combo_thiet_giap_bao_tru",
    families: ["thi", "bi"],
    name: "Thiết Giáp Bạo Trư Xung",
    path: "luc_dao",
    color: "#e69b45",
    secondaryColor: "#d49548",
    kind: "combo_shockwave",
    projStyle: "combo_armor_shockwave",
    damageMult: 2.65,
    mpCostMult: 1.35,
    cooldown: 8.5,
    range: 112,
    dashForward: 68,
    shieldAmount: 115,
    buffDuration: 5.0,
    buffArmorBonus: 0.16,
    stunDuration: 0.9,
    knockback: 34,
    desc: "Hắc/Bạch Thỉ + Đồng/Ngọc Bì: Bật giáp đồng thau lao húc cận chiến nổ sóng xung kích hất tung địch!",
  },
  {
    id: "combo_song_thi_hop_luc",
    families: ["thi", "thi"],
    name: "Song Thỉ Bá Lực Oanh",
    path: "luc_dao",
    color: "#ffaa44",
    secondaryColor: "#f2dfc4",
    kind: "combo_shockwave",
    projStyle: "combo_armor_shockwave",
    damageMult: 2.8,
    mpCostMult: 1.38,
    cooldown: 8.5,
    range: 118,
    stunDuration: 1.0,
    knockback: 42,
    desc: "Hắc Thỉ + Bạch Thỉ: Song trư hợp lực nện đôi nắm đấm ngàn cân làm choáng & đẩy lùi toàn vùng trước mặt.",
  },
  {
    id: "combo_cuong_tru_tinh_nguyen",
    families: ["thi", "tuu"],
    name: "Cuồng Trư Tinh Nguyên Phá",
    path: "luc_dao",
    color: "#ffbe5c",
    secondaryColor: "#e69b45",
    kind: "combo_shockwave",
    projStyle: "combo_armor_shockwave",
    damageMult: 2.75,
    mpCostMult: 1.3,
    cooldown: 8.0,
    range: 115,
    refineDmgBonus: 0.22,
    refineBuffDuration: 5.5,
    knockback: 30,
    desc: "Lực Đạo + Tửu Trùng: Rượu kích cuồng lực bộc phát sóng oanh kích nặng nề & tăng 22% uy lực chiêu sau.",
  },
  {
    id: "combo_kim_ngoc_sinh_sinh",
    families: ["bi", "sinh_co"],
    name: "Kim Ngọc Sinh Sinh Trận",
    path: "tho_dao",
    color: "#a8ffe2",
    secondaryColor: "#5fbf8a",
    kind: "combo_aura_nova",
    projStyle: "combo_spirit_ring",
    damageMult: 1.75,
    mpCostMult: 1.32,
    cooldown: 9.0,
    range: 110,
    shieldAmount: 140,
    healAmount: 105,
    hotTotal: 80,
    hotDuration: 5.0,
    buffDuration: 6.0,
    buffArmorBonus: 0.22,
    buffThornsPct: 0.3,
    desc: "Giáp Bì + Sinh Cơ/Quang Vũ: Vòng trận đồng ngọc hộ thể + hồi máu liên tục & phản chấn kẻ địch xung quanh.",
  },
  {
    id: "combo_van_kiem_loi_duc",
    families: ["kiem", "loi"],
    name: "Lôi Đình Vạn Kiếm Trảm",
    path: "kiem_dao",
    color: "#ffe15c",
    secondaryColor: "#c7e8ff",
    kind: "combo_projectile_wave",
    projStyle: "combo_dual_element",
    count: 6,
    pierce: 4,
    damageMult: 2.85,
    mpCostMult: 1.4,
    cooldown: 9.0,
    range: 205,
    stunDuration: 0.75,
    desc: "Kiếm Đạo + Lôi Đạo: Phóng 6 thanh phi kiếm quấn sấm sét giật tê liệt & xuyên giáp địch.",
  },
  {
    id: "combo_bang_viem_nghich_loan",
    families: ["viem", "bang"],
    name: "Băng Viêm Nghịch Loạn Phá",
    path: "viem_dao",
    color: "#ff7b39",
    secondaryColor: "#78dcff",
    kind: "combo_aura_nova",
    projStyle: "combo_dual_element",
    damageMult: 3.1,
    mpCostMult: 1.5,
    cooldown: 10.5,
    range: 138,
    burnDps: 20,
    slowFactor: 0.5,
    desc: "Viêm Đạo + Băng Đạo (Nghịch Xung): Sát thương cực đại gây Bỏng & Đóng Băng, nhưng rất dễ gây phản phệ!",
  },
  {
    id: "combo_huyet_cot_ma_thuong",
    families: ["huyet", "cot"],
    name: "Huyết Cốt Ma Thương",
    path: "huyet_dao",
    color: "#ff3358",
    secondaryColor: "#ede6da",
    kind: "combo_projectile_wave",
    projStyle: "combo_dual_element",
    count: 4,
    pierce: 4,
    damageMult: 2.65,
    mpCostMult: 1.38,
    cooldown: 8.5,
    range: 190,
    lifesteal: 0.34,
    stunDuration: 0.5,
    desc: "Huyết Đạo + Cốt Đạo: Phóng 4 thương cốt tẩm máu xuyên địch, làm choáng & hút 34% sinh lực.",
  },
  {
    id: "combo_doc_hoa_lieu_nguyen",
    families: ["doc", "viem"],
    name: "Độc Hỏa Liêu Nguyên Bộc",
    path: "doc_dao",
    color: "#a8ff52",
    secondaryColor: "#ff7b39",
    kind: "combo_aura_nova",
    projStyle: "combo_dual_element",
    damageMult: 2.75,
    mpCostMult: 1.4,
    cooldown: 9.0,
    range: 135,
    poisonDps: 18,
    burnDps: 16,
    ignitesPoison: true,
    desc: "Độc Đạo + Viêm Đạo: Kích nổ mây độc thành biển lửa xanh thiêu đốt dữ dội!",
  },
];

/**
 * Đánh giá độ ổn định (Stability %) khi kết hợp 2+ Cổ Trùng:
 * - Cùng lưu phái hoặc có Tửu Trùng điều hòa: 96%–100%.
 * - Đạo xung khắc (Viêm vs Thủy/Băng, Quang vs Ám/Huyết): -20%.
 * - Cổ đói (<30%) hoặc vượt Chuyển của Cổ Sư: -14% mỗi Cổ.
 */
export function evaluateComboStability(guList, player = null) {
  if (!Array.isArray(guList) || guList.length < 2) {
    return { stabilityPct: 0, warnings: ["Cần ít nhất 2 Cổ Trùng để kết hợp Sát Chiêu."], harmonious: false };
  }
  const stageRank = player?.getStage?.()?.rank ?? 1;
  const warnings = [];
  let stability = 98 - (guList.length - 2) * 4;

  const hasWine = guList.some((g) => GU_FAMILY_ALIAS[g.id] === "tuu" || g.path === "thuc_dao");
  const samePathCount = guList.filter((g) => g.path === guList[0].path).length;
  if (samePathCount === guList.length) stability += 4;
  if (hasWine) stability += 6;

  let hasConflict = false;
  for (let i = 0; i < guList.length; i++) {
    for (let j = i + 1; j < guList.length; j++) {
      for (const [p1, p2] of OPPOSING_PATH_PAIRS) {
        if (samePathPair(guList[i].path, guList[j].path, p1, p2)) {
          hasConflict = true;
        }
      }
    }
  }
  if (hasConflict) {
    const penalty = hasWine ? 10 : 22;
    stability -= penalty;
    warnings.push(
      hasWine
        ? "Có đạo xung khắc nhưng được Tửu Trùng điều hòa bớt rủi ro."
        : "Đạo ngân xung khắc (Thủy/Băng-Viêm hoặc Độc-Mộc)! Dễ phản phệ nhẹ khi thi triển."
    );
  }

  for (const g of guList) {
    if ((g.hunger ?? 100) <= 0) {
      stability -= 32;
      warnings.push(`${g.shortLabel || g.name} đang đói kiệt (0%)!`);
    } else if ((g.hunger ?? 100) < 35) {
      stability -= 14;
      warnings.push(`${g.shortLabel || g.name} sắp đói (${Math.round(g.hunger)}%).`);
    }
    if ((g.rank ?? 1) > stageRank) {
      stability -= 14;
      warnings.push(`${g.shortLabel || g.name} (Chuyển ${g.rank}) vượt cảnh giới hiện tại.`);
    }
  }

  if ((player?.thoughtGauge ?? 45) >= 60) {
    stability += 6;
  }

  const clamped = Math.max(48, Math.min(100, Math.round(stability)));
  return {
    stabilityPct: clamped,
    warnings,
    harmonious: !hasConflict && clamped >= 92,
  };
}

/**
 * Tổng hợp chiêu thức Sát Chiêu từ 2 hoặc 3 Cổ Trùng người chơi tự chọn.
 */
export function resolveMultiGuKillerMove(guList, player = null, customName = null) {
  if (!Array.isArray(guList) || guList.length < 2) return null;
  const rank = player?.getStage?.()?.rank ?? 1;
  const stab = evaluateComboStability(guList, player);

  // Tìm công thức nguyên tác khớp trước (ưu tiên công thức 3 Cổ rồi đến 2 Cổ)
  const sortedRecipes = [...COMBO_SYNERGY_RECIPES].sort((a, b) => b.families.length - a.families.length);
  const matched = sortedRecipes.find(
    (r) => guList.length >= r.families.length && matchesRecipeFamilies(guList, r.families)
  );

  const sumMp = guList.reduce((acc, g) => acc + Math.max(8, g.mpCost ?? 12), 0);
  const avgCd = guList.reduce((acc, g) => acc + Math.max(1.5, g.cooldown ?? 2.5), 0) / guList.length;
  const c1 = guList[0]?.color || "#5ef2d6";
  const c2 = guList[1]?.color || "#ffd257";
  const c3 = guList[2]?.color || c2;

  if (matched) {
    return {
      id: `custom_${matched.id}`,
      isMultiGu: true,
      guIds: guList.map((g) => g.id),
      guUids: guList.map((g) => g.uid).filter(Boolean),
      guNames: guList.map((g) => g.shortLabel || g.name),
      name: customName || matched.name,
      path: matched.path || guList[0].path,
      color: matched.color || c1,
      secondaryColor: matched.secondaryColor || c2,
      tertiaryColor: matched.tertiaryColor || c3,
      thoughtCost: 0,
      mpCost: Math.max(20, Math.round(sumMp * (matched.mpCostMult ?? 1.35))),
      cooldown: matched.cooldown ?? 8.5,
      damageMult: Number(((matched.damageMult ?? 2.4) + (guList.length - matched.families.length) * 0.45).toFixed(2)),
      range: matched.range ?? 165,
      kind: matched.kind,
      projStyle: matched.projStyle,
      count: matched.count ?? 3,
      pierce: matched.pierce ?? 3,
      dashForward: matched.dashForward ?? 0,
      dashBackOrSide: matched.dashBackOrSide ?? 0,
      shieldAmount: matched.shieldAmount ?? 0,
      healAmount: matched.healAmount ?? 0,
      hotTotal: matched.hotTotal ?? 0,
      hotDuration: matched.hotDuration ?? 0,
      cleanseSlow: Boolean(matched.cleanseSlow),
      buffDuration: matched.buffDuration ?? 0,
      buffArmorBonus: matched.buffArmorBonus ?? 0,
      buffThornsPct: matched.buffThornsPct ?? 0,
      speedBuffBonus: matched.speedBuffBonus ?? 0,
      speedBuffDuration: matched.speedBuffDuration ?? 0,
      refineDmgBonus: matched.refineDmgBonus ?? 0,
      refineBuffDuration: matched.refineBuffDuration ?? 0,
      stunDuration: matched.stunDuration ?? 0,
      slowFactor: matched.slowFactor ?? 0,
      burnDps: matched.burnDps ?? 0,
      poisonDps: matched.poisonDps ?? 0,
      lifesteal: matched.lifesteal ?? 0,
      knockback: matched.knockback ?? 0,
      ignitesPoison: Boolean(matched.ignitesPoison),
      stabilityPct: stab.stabilityPct,
      stabilityWarnings: stab.warnings,
      desc: `${matched.desc} [Độ ổn định: ${stab.stabilityPct}%]`,
    };
  }

  // Tổng hợp động cho bất kỳ tổ hợp 2–3 Cổ nào khác
  const hasLine = guList.some((g) => g.aimType === "line");
  const hasArcOrMelee = guList.some((g) => g.aimType === "arc" || g.path === "luc_dao");
  const hasHeal = guList.some((g) => g.role === "heal" || g.healAmount);
  const hasDef = guList.some((g) => g.role === "defense" || g.shieldAmount);
  const hasMove = guList.some((g) => g.role === "move" || g.aimType === "dash");
  const hasSupport = guList.some((g) => g.mpRestore || g.refineBuffDuration);

  const count = guList.length;
  const namePrefix = guList.map((g) => (g.shortLabel || g.name).split(" ")[0]).slice(0, 3).join("-");
  const style = hasLine && hasMove
    ? "combo_wind_moon"
    : hasArcOrMelee && hasDef
      ? "combo_armor_shockwave"
      : (hasHeal || hasDef) && !hasLine
        ? "combo_spirit_ring"
        : "combo_dual_element";

  const kind = hasLine ? "combo_projectile_wave" : hasArcOrMelee ? "combo_shockwave" : "combo_aura_nova";

  return {
    id: `custom_dyn_${guList.map((g) => g.id).join("_")}`,
    isMultiGu: true,
    guIds: guList.map((g) => g.id),
    guUids: guList.map((g) => g.uid).filter(Boolean),
    guNames: guList.map((g) => g.shortLabel || g.name),
    name: customName || `Hợp Kích · ${namePrefix} (${count} Cổ)`,
    path: guList[0].path,
    color: c1,
    secondaryColor: c2,
    tertiaryColor: c3,
    thoughtCost: 0,
    mpCost: Math.max(18, Math.round(sumMp * 1.35 + (rank - 1) * 4)),
    cooldown: Number(Math.max(7.0, Math.min(12.5, avgCd * 1.65 + (count - 2) * 1.4)).toFixed(1)),
    damageMult: Number((1.95 + (count - 2) * 0.65).toFixed(2)),
    range: hasLine ? 185 : 125,
    kind,
    projStyle: style,
    count: count + 1,
    pierce: hasLine ? 3 : 2,
    dashForward: hasMove ? 56 : 0,
    shieldAmount: guList.reduce((acc, g) => acc + Math.round((g.shieldAmount ?? 0) * 0.9), 0),
    healAmount: guList.reduce((acc, g) => acc + Math.round((g.healAmount ?? 0) * 0.85), 0),
    hotTotal: guList.reduce((acc, g) => acc + (g.hotTotal ?? 0), 0),
    hotDuration: guList.some((g) => g.hotDuration) ? 4.5 : 0,
    buffDuration: hasDef ? 5.0 : 0,
    buffArmorBonus: hasDef ? 0.16 : 0,
    buffThornsPct: hasDef ? 0.2 : 0,
    speedBuffBonus: hasMove ? 0.2 : 0,
    speedBuffDuration: hasMove ? 2.2 : 0,
    refineDmgBonus: hasSupport ? 0.18 : 0,
    refineBuffDuration: hasSupport ? 5.0 : 0,
    stunDuration: Math.max(...guList.map((g) => g.stunDuration ?? 0), hasArcOrMelee ? 0.65 : 0),
    slowFactor: Math.max(...guList.map((g) => g.slowFactor ?? 0)),
    burnDps: Math.max(...guList.map((g) => g.burnDps ?? 0)),
    poisonDps: Math.max(...guList.map((g) => g.poisonDps ?? 0)),
    lifesteal: Math.max(...guList.map((g) => g.lifesteal ?? 0)),
    knockback: hasArcOrMelee ? 28 : 0,
    ignitesPoison: guList.some((g) => g.ignitesPoison),
    stabilityPct: stab.stabilityPct,
    stabilityWarnings: stab.warnings,
    desc: `Tổ hợp tự sáng tạo (${guList.map((g) => g.shortLabel).join(" + ")}). [Độ ổn định: ${stab.stabilityPct}%]`,
  };
}

// ============================================================================
// 2. KHO SPRITE ĐẠN & CHIÊU THỨC PIXEL ART NHIỀU FRAME (0 ctx.arc / ctx.ellipse)
// ============================================================================

function paintCrescentBlade(ctx, cx, cy, col, coreCol, frame, scale = 1) {
  const dark = shadeHex(col, 0.42);
  const bright = shadeHex(col, 1.38);
  const pulse = (frame % 2 === 0 ? 1 : 0);
  // Lưỡi liềm ánh trăng cong sắc cạnh quay về phải (+X)
  for (let dy = -9; dy <= 9; dy++) {
    const t = Math.abs(dy) / 9;
    const xFront = Math.round((1 - t * t) * 7 * scale) + pulse;
    const thickness = Math.max(1, Math.round((1 - t * 0.72) * 4.2 * scale));
    const xBack = xFront - thickness;
    for (let px = xBack; px <= xFront; px++) {
      const rel = (px - xBack) / Math.max(1, thickness);
      const pxColor =
        rel >= 0.78 ? coreCol : rel >= 0.45 ? bright : rel >= 0.18 ? col : dark;
      plotRect(ctx, cx + px, cy + dy * scale, 1, Math.max(1, Math.round(scale)), pxColor);
    }
  }
}

function paintSpriteFrameForStyle(ctx, w, h, style, col, c2, c3, f) {
  const cx = Math.floor(w * 0.5);
  const cy = Math.floor(h * 0.5);
  const dark = shadeHex(col, 0.38);
  const bright = shadeHex(col, 1.38);

  if (style === "crescent_moon" || style === "combo_triple_moon") {
    paintCrescentBlade(ctx, cx + 1, cy, col, "#ffffff", f, style === "combo_triple_moon" ? 1.2 : 1.0);
    // Tàn ảnh lấp lánh sau lưỡi liềm
    const tx = cx - 8 - (f % 2) * 2;
    plotRect(ctx, tx, cy - 3, 2, 2, bright);
    plotRect(ctx, tx - 3, cy + 2, 2, 1, c2 || col);
    if (style === "combo_triple_moon") {
      plotRect(ctx, cx - 5, cy - 7, 3, 2, c2);
      plotRect(ctx, cx - 5, cy + 6, 3, 2, c2);
    }
    applySelectiveOutline(ctx, w, h, dark, "#06080d");
    return;
  }

  if (style === "combo_wind_moon") {
    // Trăng khuyết bạc xanh ở tâm quấn vòng gió xoáy Thanh Phong 4 frame
    paintCrescentBlade(ctx, cx + 3, cy, col, "#ffffff", f, 1.25);
    const spin = (f / 4) * Math.PI * 2;
    for (let k = 0; k < 10; k++) {
      const a = spin + k * 0.62;
      const r = 10 + (k % 3) * 3;
      const gx = Math.round(cx + Math.cos(a) * r);
      const gy = Math.round(cy + Math.sin(a) * (r * 0.75));
      plotRect(ctx, gx - 1, gy - 1, 3, 2, k % 2 === 0 ? c2 : bright);
      if (k % 3 === 0) plotPixel(ctx, gx, gy, "#ffffff");
    }
    applySelectiveOutline(ctx, w, h, "#0a2a24", "#06080d");
    return;
  }

  if (style === "combo_dual_element") {
    // Lõi tinh cầu song/tam hệ xoay năng lượng góc cạnh
    const rot = (f / 4) * Math.PI * 2;
    fillPixelEllipse(ctx, cx, cy, 11, 11, dark, false);
    fillPixelEllipse(ctx, cx, cy, 8, 8, col, false);
    fillPixelEllipse(ctx, cx, cy, 4, 4, "#ffffff", false);
    for (let arm = 0; arm < 4; arm++) {
      const a = rot + (arm * Math.PI) / 2;
      const armCol = arm % 2 === 0 ? c2 : c3;
      for (let s = 5; s <= 18; s += 2) {
        const px = Math.round(cx + Math.cos(a + s * 0.06) * s);
        const py = Math.round(cy + Math.sin(a + s * 0.06) * s);
        plotRect(ctx, px - 1, py - 1, 3, 3, armCol);
      }
    }
    applySelectiveOutline(ctx, w, h, dark, "#06080d");
    return;
  }

  if (style === "sword_qi") {
    // Phi Kiếm Cổ Phong (mũi nhọn + sống kiếm + đốc kiếm + vệt khí)
    const ox = (f % 2) * 1;
    plotRect(ctx, cx - 10, cy - 1, 16, 3, bright);
    plotRect(ctx, cx - 8, cy, 17, 1, "#ffffff");
    plotRect(ctx, cx + 6, cy - 2, 5, 5, col);
    plotRect(ctx, cx + 9, cy - 1, 4, 3, bright);
    plotRect(ctx, cx + 12, cy, 2, 1, "#ffffff");
    plotRect(ctx, cx - 11, cy - 4, 2, 9, "#d4a64a"); // Đốc kiếm đồng
    plotRect(ctx, cx - 14 - ox, cy - 2, 3, 1, col);
    plotRect(ctx, cx - 14 - ox, cy + 2, 3, 1, col);
    applySelectiveOutline(ctx, w, h, "#162d3d", "#06080d");
    return;
  }

  if (style === "bone_spear") {
    // Thương bạch cốt xoắn ốc 4 frame
    const sw = (f % 2 === 0 ? 1 : -1);
    plotRect(ctx, cx - 11, cy - 1, 18, 3, "#c4baab");
    plotRect(ctx, cx - 9, cy - 1, 17, 1, "#fff8eb");
    for (let x = -8; x <= 6; x += 4) {
      plotRect(ctx, cx + x, cy + (sw * ((x / 4) % 2 === 0 ? 2 : -2)), 2, 2, "#8f8374");
    }
    plotRect(ctx, cx + 6, cy - 3, 5, 7, "#ece4d8");
    plotRect(ctx, cx + 10, cy - 1, 4, 3, "#ffffff");
    applySelectiveOutline(ctx, w, h, "#2e2721", "#06080d");
    return;
  }

  if (style === "fire_orb") {
    // Hỏa Cầu Hỏa Diệm kéo đuôi lửa xoắn
    fillPixelEllipse(ctx, cx + 2, cy, 7, 6, "#b82d0f", false);
    fillPixelEllipse(ctx, cx + 3, cy, 5, 4, "#ff7b39", false);
    plotRect(ctx, cx + 3, cy - 2, 4, 4, "#ffe66d");
    plotRect(ctx, cx + 4, cy - 1, 2, 2, "#ffffff");
    const wy = f % 2 === 0 ? -2 : 2;
    plotRect(ctx, cx - 7, cy - 3 + wy, 5, 3, "#ff5c2b");
    plotRect(ctx, cx - 11, cy - 1 - wy, 5, 2, "#ffd15c");
    applySelectiveOutline(ctx, w, h, "#451006", "#06080d");
    return;
  }

  if (style === "frost_lance") {
    // Băng Thương Đa Diện
    plotRect(ctx, cx - 10, cy - 2, 16, 4, "#3ba4d9");
    plotRect(ctx, cx - 8, cy - 1, 18, 2, "#b8f7ff");
    plotRect(ctx, cx + 6, cy - 3, 4, 6, "#78dcff");
    plotRect(ctx, cx + 9, cy - 1, 5, 2, "#ffffff");
    plotRect(ctx, cx - 12, cy - 4 + (f % 2), 2, 2, "#e0fbff");
    plotRect(ctx, cx - 12, cy + 3 - (f % 2), 2, 2, "#78dcff");
    applySelectiveOutline(ctx, w, h, "#0e3147", "#06080d");
    return;
  }

  if (style === "thunder_bolt") {
    // Tia Sét Gấp Khúc Lôi Đạo 4 frame nhấp nháy
    const j = f % 2 === 0 ? -2 : 2;
    plotPixelLine(ctx, cx - 12, cy + j, cx - 3, cy - 4, col, 3);
    plotPixelLine(ctx, cx - 3, cy - 4, cx + 3, cy + 4, "#ffffff", 3);
    plotPixelLine(ctx, cx + 3, cy + 4, cx + 12, cy - j, col, 3);
    plotPixelLine(ctx, cx - 3, cy - 4, cx + 3, cy + 4, "#ffffff", 1);
    applySelectiveOutline(ctx, w, h, "#5e4908", "#06080d");
    return;
  }

  if (style === "venom_glob") {
    // Độc Đạn Sủi Bọt
    fillPixelEllipse(ctx, cx + 1, cy, 6, 5, "#2b6e1c", false);
    fillPixelEllipse(ctx, cx + 2, cy - 1, 4, 3, col, false);
    plotRect(ctx, cx + 2, cy - 2, 2, 2, "#ebff9c");
    plotRect(ctx, cx - 8, cy + (f % 2 ? 2 : -2), 3, 2, col);
    plotRect(ctx, cx - 5, cy - 4, 2, 2, "#a8ff52");
    applySelectiveOutline(ctx, w, h, "#102e0b", "#06080d");
    return;
  }

  if (style === "blood_crescent") {
    // Huyết Nhận / Huyết Nha Sắc Lẹm
    paintCrescentBlade(ctx, cx + 1, cy, "#eb2646", "#ffd6de", f, 1.0);
    plotRect(ctx, cx - 9, cy - 3 + (f % 2), 3, 2, "#ff3358");
    plotRect(ctx, cx - 11, cy + 2 - (f % 2), 3, 2, "#9e142b");
    applySelectiveOutline(ctx, w, h, "#3d0811", "#06080d");
    return;
  }

  if (style === "boar_cleave" || style === "boss_claw_wave") {
    // Sóng Trảo Lực Đạo / Móng Vuốt 3 vạch cong
    const isBoss = style === "boss_claw_wave";
    for (const offY of [-7, 0, 7]) {
      plotPixelLine(ctx, cx - 6, cy + offY - 2, cx + 6, cy + offY, col, isBoss ? 3 : 2);
      plotPixelLine(ctx, cx + 2, cy + offY, cx + 9, cy + offY + 1, "#fff6d6", 2);
    }
    applySelectiveOutline(ctx, w, h, shadeHex(col, 0.35), "#06080d");
    return;
  }

  if (style === "boss_tidal_wave") {
    // Sóng Thủy Triều Pixel Cuộn Trào (96x56) cho Thiên Trì Ngư Vương
    for (let y = 8; y < h - 6; y++) {
      const t = (y - 8) / (h - 14);
      const crest = Math.round(Math.sin(t * Math.PI) * 14) + ((f % 2) * 2);
      const xStart = Math.max(8, cx - 10 + crest - Math.round(t * 8));
      const xEnd = Math.min(w - 8, cx + 14 + crest);
      plotRect(ctx, xStart, y, xEnd - xStart, 1, t < 0.35 ? "#5ef2d6" : t < 0.7 ? "#208c99" : "#0e4d61");
      plotRect(ctx, xEnd - 4, y, 4, 1, "#e6fffb"); // Bọt sóng đỉnh trắng
    }
    // Cuộn bọt nước trên ngọn sóng
    for (let k = 0; k < 5; k++) {
      const fx = cx + 12 + ((k + f) % 3) * 3;
      const fy = 10 + k * 8;
      plotRect(ctx, fx, fy, 4, 3, "#ffffff");
    }
    applySelectiveOutline(ctx, w, h, "#082936", "#05070b");
    return;
  }

  if (style === "boss_scale_lance") {
    // Lân Quang Thủy Kình (Ngư Vương)
    plotRect(ctx, cx - 9, cy - 2, 16, 4, "#24a8a2");
    plotRect(ctx, cx - 7, cy - 1, 17, 2, "#87ffeb");
    plotRect(ctx, cx + 5, cy - 3, 5, 6, "#ffe15c");
    plotRect(ctx, cx + 9, cy - 1, 4, 2, "#ffffff");
    applySelectiveOutline(ctx, w, h, "#0a3338", "#05070b");
    return;
  }

  // Mặc định: Phi Tiễn Lực / Thủy Nhận Góc Cạnh (chưa từng dùng chấm tròn đơn sắc)
  plotRect(ctx, cx - 8, cy - 2, 14, 4, col);
  plotRect(ctx, cx + 4, cy - 3, 4, 6, bright);
  plotRect(ctx, cx + 7, cy - 1, 3, 2, "#ffffff");
  applySelectiveOutline(ctx, w, h, dark, "#06080d");
}

export function getProjectileFrames(style = "crescent_moon", color = "#5ef2d6", secondaryColor = "#ffffff", tertiaryColor = "#ffd257") {
  const dims =
    style === "boss_tidal_wave"
      ? [72, 52]
      : style === "combo_wind_moon"
        ? [44, 44]
        : style === "combo_dual_element" || style === "combo_triple_moon" || style === "boss_claw_wave"
          ? [38, 38]
          : [32, 32];
  const key = `${style}_${color}_${secondaryColor}_${tertiaryColor}`;
  if (PROJ_SHEET_CACHE.has(key)) return PROJ_SHEET_CACHE.get(key);

  const frames = [];
  for (let f = 0; f < 4; f++) {
    const { canvas, ctx } = createPixelCanvas(dims[0], dims[1], true);
    if (ctx) paintSpriteFrameForStyle(ctx, dims[0], dims[1], style, color, secondaryColor, tertiaryColor, f);
    frames.push(canvas);
  }
  if (PROJ_SHEET_CACHE.size > 90) PROJ_SHEET_CACHE.delete(PROJ_SHEET_CACHE.keys().next().value);
  PROJ_SHEET_CACHE.set(key, frames);
  return frames;
}

export function drawPixelProjectile(ctx, pr, time = 0) {
  const style = pr.projStyle || pr.gu?.projStyle || "crescent_moon";
  const color = pr.color || pr.gu?.color || "#5ef2d6";
  const c2 = pr.secondaryColor || "#ffffff";
  const c3 = pr.tertiaryColor || "#ffd257";
  const frames = getProjectileFrames(style, color, c2, c3);
  const fi = Math.floor(time * 12 + (pr.animOffset || 0)) % frames.length;
  const frm = frames[fi] ?? frames[0];
  const ang = Math.atan2(pr.vy || 0, pr.vx || 1);

  // Vẽ tối đa 3 tàn ảnh pixel lướt theo quỹ đạo (trail)
  if (Array.isArray(pr.trail) && pr.trail.length > 0) {
    for (let i = 0; i < pr.trail.length; i++) {
      const tr = pr.trail[i];
      const alpha = ((i + 1) / (pr.trail.length + 1)) * 0.34;
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.globalAlpha = alpha;
      ctx.translate(Math.round(tr.x), Math.round(tr.y));
      ctx.rotate(ang);
      ctx.drawImage(frm, -Math.round(frm.width * 0.5), -Math.round(frm.height * 0.5));
      ctx.restore();
    }
  }

  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.translate(Math.round(pr.x), Math.round(pr.y));
  ctx.rotate(ang);
  ctx.drawImage(frm, -Math.round(frm.width * 0.5), -Math.round(frm.height * 0.5));
  ctx.restore();
}

/**
 * Vẽ vòng hào quang chiêu thức Sát Chiêu / Giáp Bì / Sinh Cơ Thảo / Tửu Trùng quanh nhân vật (0 ctx.arc).
 */
export function drawPlayerActiveBuffAuras(ctx, player, time = 0) {
  const px = Math.round(player.x);
  const py = Math.round(player.y);

  // 1. Giáp Đồng Bì / Ngọc Bì Cổ (khi còn Shield hoặc armorBuffTimer > 0)
  if ((player.armorBuffTimer ?? 0) > 0 || (player.shield ?? 0) > 0) {
    const isJade = player.armorBuffColor === "#a8ffe2" || (player.getAllEquipped?.() ?? []).some((g) => g.id === "ngoc_bi" || g.id === "bach_ngoc");
    const cMain = isJade ? "#9effdf" : "#d49548";
    const cDark = isJade ? "#166b58" : "#5c3b16";
    plotPixelEllipse(ctx, px, py - 8, 17, 13, cDark, 2, 0);
    plotPixelEllipse(ctx, px, py - 8, 16, 12, cMain, 3, Math.floor(time * 5));
    for (let i = 0; i < 4; i++) {
      const a = time * 2.4 + (i * Math.PI) / 2;
      const sx = Math.round(px + Math.cos(a) * 16);
      const sy = Math.round(py - 12 + Math.sin(a) * 8);
      plotRect(ctx, sx - 2, sy - 2, 5, 5, "#080b10");
      plotRect(ctx, sx - 1, sy - 1, 3, 3, cMain);
      plotPixel(ctx, sx, sy, "#ffffff");
    }
  }

  // 2. Sinh Cơ Thảo / Quang Vũ (hồi máu HoT)
  if ((player.hotTimer ?? 0) > 0) {
    for (let i = 0; i < 5; i++) {
      const a = -time * 2.8 + i * 1.25;
      const lx = Math.round(px + Math.cos(a) * 15);
      const ly = Math.round(py - 10 + Math.sin(a) * 7 - ((time * 16 + i * 5) % 12));
      plotRect(ctx, lx - 1, ly - 1, 3, 3, "#143d24");
      plotRect(ctx, lx, ly, 2, 2, "#7affad");
    }
  }

  // 3. Tửu Trùng (Tinh luyện Chân nguyên)
  if ((player.refineBuffTimer ?? 0) > 0) {
    for (let i = 0; i < 4; i++) {
      const ly = Math.round(py - 6 - ((time * 24 + i * 11) % 34));
      const lx = Math.round(px + Math.sin(time * 4 + i * 1.9) * 12);
      plotRect(ctx, lx - 1, ly - 1, 3, 3, "#6b470c");
      plotRect(ctx, lx, ly, 2, 2, "#ffe169");
    }
  }
}

/**
 * Vẽ Telegraph cảnh báo chiêu Boss sắc nét (circle / wave_rect / cone) bằng pixel dither.
 */
export function renderBossTelegraphPixel(ctx, tg, time = 0) {
  const pct = Math.max(0, Math.min(1, tg.t / Math.max(0.05, tg.dur)));
  const col = tg.color || "#ff4757";
  const warnCol = Math.floor(time * 10) % 2 === 0 ? "#ffd257" : "#ffffff";

  ctx.save();
  if (tg.shape === "wave_rect") {
    const ang = tg.angle ?? 0;
    const len = tg.length ?? 160;
    const hw = Math.round((tg.width ?? 44) * 0.5);
    ctx.translate(Math.round(tg.x), Math.round(tg.y));
    ctx.rotate(ang);
    // Nền cảnh báo dither
    ctx.globalAlpha = 0.24 + pct * 0.24;
    plotRect(ctx, 0, -hw, len, hw * 2, col);
    // Sóng tiến độ tụ lực
    ctx.globalAlpha = 0.42;
    plotRect(ctx, 0, -hw + 2, Math.round(len * pct), Math.max(2, hw * 2 - 4), warnCol);
    // Viền nét đứt pixel sắc
    ctx.globalAlpha = 0.94;
    for (let x = 0; x < len; x += 6) {
      plotRect(ctx, x, -hw, 4, 2, warnCol);
      plotRect(ctx, x, hw - 2, 4, 2, warnCol);
    }
    plotRect(ctx, len - 2, -hw, 2, hw * 2, col);
  } else if (tg.shape === "cone") {
    const ang = tg.angle ?? 0;
    const spread = tg.spread ?? Math.PI * 0.5;
    const r = tg.r ?? 120;
    const a0 = ang - spread * 0.5;
    const a1 = ang + spread * 0.5;
    ctx.globalAlpha = 0.26 + pct * 0.22;
    for (let step = 0; step <= 8; step++) {
      const a = a0 + (a1 - a0) * (step / 8);
      plotPixelLine(ctx, tg.x, tg.y, tg.x + Math.cos(a) * r, tg.y + Math.sin(a) * r, col, 3);
    }
    ctx.globalAlpha = 0.95;
    plotPixelLine(ctx, tg.x, tg.y, tg.x + Math.cos(a0) * r, tg.y + Math.sin(a0) * r, warnCol, 2);
    plotPixelLine(ctx, tg.x, tg.y, tg.x + Math.cos(a1) * r, tg.y + Math.sin(a1) * r, warnCol, 2);
    const progR = Math.round(r * pct);
    for (let i = 0; i <= 14; i++) {
      const a = a0 + (a1 - a0) * (i / 14);
      plotRect(ctx, Math.round(tg.x + Math.cos(a) * r - 1), Math.round(tg.y + Math.sin(a) * r - 1), 3, 3, col);
      plotRect(ctx, Math.round(tg.x + Math.cos(a) * progR - 1), Math.round(tg.y + Math.sin(a) * progR - 1), 2, 2, warnCol);
    }
  } else {
    const rx = tg.r ?? 36;
    const ry = Math.round(rx * 0.68);
    ctx.globalAlpha = 0.22 + pct * 0.26;
    fillPixelEllipse(ctx, tg.x, tg.y, rx, ry, col, true);
    ctx.globalAlpha = 0.92;
    plotPixelEllipse(ctx, tg.x, tg.y, rx, ry, col, 3, 0);
    plotPixelEllipse(ctx, tg.x, tg.y, Math.max(4, Math.round(rx * pct)), Math.max(3, Math.round(ry * pct)), warnCol);
  }
  ctx.restore();
}

export function createHitSparks(x, y, color = "#ffd257", count = 8, kind = "spark") {
  const list = [];
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.45;
    const spd = kind === "shatter" ? 45 + Math.random() * 65 : 35 + Math.random() * 55;
    list.push({
      x: Math.round(x),
      y: Math.round(y),
      vx: Math.cos(a) * spd,
      vy: Math.sin(a) * spd - 12,
      life: 0.24 + Math.random() * 0.16,
      maxLife: 0.4,
      size: kind === "shatter" ? 3 : 2,
      color: i % 3 === 0 ? "#ffffff" : color,
      darkColor: shadeHex(color, 0.35),
    });
  }
  return list;
}

export function renderHitSparks(ctx, sparks) {
  for (const s of sparks) {
    const sx = Math.round(s.x);
    const sy = Math.round(s.y);
    plotRect(ctx, sx - 1, sy - 1, s.size + 2, s.size + 2, s.darkColor);
    plotRect(ctx, sx, sy, s.size, s.size, s.color);
  }
}

export { bayerThreshold };
