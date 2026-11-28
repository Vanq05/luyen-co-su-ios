/**
 * Hệ thống Cảnh Giới (20 tiểu giai từ Nhất Chuyển -> Ngũ Chuyển),
 * Tư Chất (Bính / Ất / Giáp + Huyết Lô Tế Huyết), 4 Tiềm Năng, 16 Lưu Phái & Thú Lực Hư Ảnh.
 */
import { RANK_ESSENCE_COLORS } from "../config/constants.js";

const STAGE_SUFFIXES = ["sơ giai", "trung giai", "cao giai", "đỉnh phong"];
const RANK_NAMES = ["Nhất chuyển", "Nhị chuyển", "Tam chuyển", "Tứ chuyển", "Ngũ chuyển"];

export const REALM_STAGES = [];
{
  let expCursor = 0;
  for (let r = 1; r <= 5; r++) {
    for (let s = 0; s < 4; s++) {
      const idx = (r - 1) * 4 + s;
      const stepExp = Math.round(90 * Math.pow(1.42, idx));
      if (idx > 0) expCursor += stepExp;
      const ess = RANK_ESSENCE_COLORS[r];
      REALM_STAGES.push({
        level: idx + 1,
        rank: r,
        stageIndex: s,
        isPeak: s === 3,
        title: `${RANK_NAMES[r - 1]} ${STAGE_SUFFIXES[s]}`,
        shortRank: RANK_NAMES[r - 1],
        expReq: expCursor,
        nextStageGain: Math.round(90 * Math.pow(1.42, idx + 1)),
        essenceColor: ess.color,
        essenceName: ess.name,
        baseHp: 220 + idx * 140 + (r - 1) * 260,
        baseMp: 120 + idx * 45 + (r - 1) * 110,
        baseStamina: 100 + (r - 1) * 20,
        activeSlotsUnlocked: Math.min(7, 3 + r), // 4, 5, 6, 7, 7
        passiveSlotsUnlocked: r, // 1, 2, 3, 4, 5
        requiresInsight: false,
      });
    }
  }
}

export function getStageInfo(stageLevel = 1) {
  const clamped = Math.max(1, Math.min(REALM_STAGES.length, Number(stageLevel) || 1));
  const current = REALM_STAGES[clamped - 1];
  const next = REALM_STAGES[clamped] ?? null;
  return { ...current, next };
}

export function getStageProgress(stageLevel = 1, currentExp = 0) {
  const info = getStageInfo(stageLevel);
  if (!info.next) return { pct: 1, need: 0, readyForBreakthrough: false };
  const need = info.nextStageGain;
  const pct = Math.max(0, Math.min(1, currentExp / Math.max(1, need)));
  const isPeak = info.stageIndex === 3;
  return {
    pct,
    need,
    isPeak,
    canAutoAdvance: !isPeak && currentExp >= need,
    readyForBreakthrough: isPeak && currentExp >= need,
  };
}

export const BREAKTHROUGH_REQUIREMENTS = {
  1: {
    fromRank: 1,
    toRank: 2,
    title: "Đột Phá Nhị Chuyển (Xích Thiết Chân Nguyên)",
    stones: 50,
    bonusItemId: "ruou_trang",
    bonusItemLabel: "Rượu Trắng",
    materials: [],
  },
  2: {
    fromRank: 2,
    toRank: 3,
    title: "Đột Phá Tam Chuyển (Bạch Ngân Chân Nguyên)",
    stones: 180,
    bonusItemId: "thao_duoc_tram_nam",
    bonusItemLabel: "Thảo Dược Trăm Năm",
    materials: [],
  },
  3: {
    fromRank: 3,
    toRank: 4,
    title: "Đột Phá Tứ Chuyển (Hoàng Kim Chân Nguyên)",
    stones: 520,
    bonusItemId: "suong_truc_linh_lo",
    bonusItemLabel: "Sương Trúc Linh Lộ",
    materials: [],
  },
  4: {
    fromRank: 4,
    toRank: 5,
    title: "Đột Phá Ngũ Chuyển (Tử Tinh Chân Nguyên)",
    stones: 1200,
    bonusItemId: "xich_nham_hoa_tuy",
    bonusItemLabel: "Xích Nham Hỏa Tủy",
    materials: [],
  },
};

export const APTITUDES = {
  PhamNhan: {
    id: "PhamNhan",
    name: "Phàm Nhân Nghịch Mệnh",
    short: "Phàm Nhân",
    seaRange: [10, 19],
    defaultSeaPct: 15,
    mpMult: 0.45,
    mpRegenMult: 0.5,
    stoneAbsorbMult: 0.55,
    stoneCostPerCycle: 4,
    expMult: 0.85,
    rareEncounterBonus: 0.5,
    meleeBonus: 0.35,
    color: "#9e9284",
    desc: "Khai khiếu dưới 10 bước — Không khiếu phàm thai nhưng mở nhánh ẩn Nghịch Mệnh (+35% sát thương cận chiến, +50% kỳ ngộ Cổ hiếm).",
  },
  Dinh: {
    id: "Dinh",
    name: "Đinh Đẳng Tư Chất",
    short: "Đinh Đẳng",
    seaRange: [20, 39],
    defaultSeaPct: 30,
    mpMult: 0.65,
    mpRegenMult: 0.65,
    stoneAbsorbMult: 0.65,
    stoneCostPerCycle: 3,
    expMult: 0.9,
    rareEncounterBonus: 0.35,
    meleeBonus: 0,
    color: "#b59b7c",
    desc: "Không Khiếu chứa 20%–39% Chân Nguyên. Hồi phục chậm, tốn Nguyên Thạch nhưng mở cơ duyên Nghịch Thiên (+35% tỉ lệ kỳ ngộ & nhặt Cổ hiếm)!",
  },
  Binh: {
    id: "Binh",
    name: "Bính Đẳng Tư Chất",
    short: "Bính Đẳng",
    seaRange: [40, 59],
    defaultSeaPct: 54,
    mpMult: 1.0,
    mpRegenMult: 1.0,
    stoneAbsorbMult: 1.0,
    stoneCostPerCycle: 2,
    expMult: 1.05,
    rareEncounterBonus: 0.15,
    meleeBonus: 0,
    color: "#5ef2d6",
    desc: "Không Khiếu chứa 40%–59% Chân Nguyên (chuẩn con đường 27 bước của Cổ Nguyệt Phương Nguyên). Cân bằng giữa sinh tồn và tiềm năng đột biến.",
  },
  At: {
    id: "At",
    name: "Ất Đẳng Tư Chất",
    short: "Ất Đẳng",
    seaRange: [60, 79],
    defaultSeaPct: 70,
    mpMult: 1.38,
    mpRegenMult: 1.35,
    stoneAbsorbMult: 1.4,
    stoneCostPerCycle: 2,
    expMult: 1.25,
    rareEncounterBonus: 0.05,
    meleeBonus: 0,
    color: "#5fbf8a",
    desc: "Không Khiếu chứa 60%–79% Chân Nguyên. Tư chất tinh anh gia tộc, Chân Nguyên dồi dào, tu luyện thuận lợi.",
  },
  Giap: {
    id: "Giap",
    name: "Giáp Đẳng Tư Chất",
    short: "Giáp Đẳng",
    seaRange: [80, 99],
    defaultSeaPct: 90,
    mpMult: 1.8,
    mpRegenMult: 1.8,
    stoneAbsorbMult: 1.85,
    stoneCostPerCycle: 1,
    expMult: 1.55,
    rareEncounterBonus: 0,
    meleeBonus: 0,
    color: "#f2c14e",
    desc: "Không Khiếu chứa 80%–99% Chân Nguyên. Tư chất thiên tài tuyệt đỉnh, Chân Nguyên cực lớn, tự hồi phục và hấp thu Nguyên Thạch nhanh vượt trội!",
  },
};

export const APERTURE_WALL_NAMES = [
  "Màng Ánh Sáng (Sơ Giai)",
  "Thủy Mạc (Trung Giai)",
  "Băng Mạc (Cao Giai)",
  "Tinh Mạc (Đỉnh Phong)",
];

export function evaluateAwakeningSteps(rawSteps = 0) {
  const steps = Math.max(0, Math.min(45, Math.floor(Number(rawSteps) || 0)));
  let aptitude = "Giap";
  let seaPct = 80 + Math.min(19, Math.round(((steps - 40) / 5) * 19));
  let failed = false;

  if (steps < 10) {
    failed = true;
    aptitude = "PhamNhan";
    seaPct = Math.max(12, Math.min(19, steps + 10));
  } else if (steps <= 19) {
    aptitude = "Dinh";
    seaPct = 20 + Math.min(19, Math.round(((steps - 10) / 9) * 19));
  } else if (steps <= 29) {
    aptitude = "Binh";
    seaPct = steps === 27 ? 54 : 40 + Math.min(19, Math.round(((steps - 20) / 9) * 19));
  } else if (steps <= 39) {
    aptitude = "At";
    seaPct = 60 + Math.min(19, Math.round(((steps - 30) / 9) * 19));
  }

  const def = APTITUDES[aptitude];
  return {
    ok: !failed,
    failed,
    steps,
    aptitude,
    aptitudeKey: aptitude,
    aptitudeLabel: def.name,
    color: def.color,
    seaPct,
    flavor: steps === 27 ? "Chuẩn 27 bước Cổ Nguyệt Phương Nguyên!" : `${def.seaRange[0]}%–${def.seaRange[1]}% Chân Nguyên Hải`,
    isFangYuan27: steps === 27,
  };
}

/**
 * Xác định giới hạn bước Khai Khiếu bẩm sinh của từng người dựa trên tên & hạt giống số mệnh.
 */
export function rollInnateAwakeningLimit(name = "", seed = 1) {
  const cleanName = String(name || "").trim();
  const numericSeed = Math.max(1, Number(seed) || 1);
  if (/phương nguyên|phuong nguyen/i.test(cleanName) && numericSeed === 1) {
    return { baseSteps: 25, maxSteps: 27 };
  }
  const key = `${cleanName}:${numericSeed}`;
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const hash = Math.abs(h | 0);
  const roll = hash % 1000;
  let baseSteps;
  let maxSteps;
  if (roll < 180) {
    baseSteps = 13 + (hash % 5);
    maxSteps = Math.min(19, baseSteps + 2);
  } else if (roll < 630) {
    baseSteps = 20 + (hash % 7);
    maxSteps = Math.min(29, baseSteps + 3);
  } else if (roll < 890) {
    baseSteps = 29 + (hash % 8);
    maxSteps = Math.min(39, baseSteps + 3);
  } else {
    baseSteps = 38 + (hash % 5);
    maxSteps = Math.min(45, baseSteps + 3);
  }
  return { baseSteps, maxSteps };
}

export const POTENTIAL_STATS = [
  {
    key: "can_cot",
    name: "Căn Cốt",
    desc: "Tăng Sinh lực tối đa (+1.5%/điểm ở 1-35, +1% ở 36-75, +0.6% từ 76+).",
  },
  {
    key: "luc",
    name: "Lực",
    desc: "Tăng sát thương Đánh thường và uy lực Cổ Trùng thuộc Lực Đạo.",
  },
  {
    key: "than_thuc",
    name: "Thần Thức",
    desc: "Tăng Chân nguyên tối đa và nới nhẹ độ ổn định khi Luyện Cổ.",
  },
  {
    key: "than_phap",
    name: "Thân Pháp",
    desc: "Tăng Tốc chạy (tối đa +35%), tốc độ hồi Thể lực và tỷ lệ Né tránh.",
  },
];

export function computeDiminishingPct(points = 0) {
  const p = Math.max(0, points);
  const t1 = Math.min(35, p);
  const t2 = Math.max(0, Math.min(40, p - 35));
  const t3 = Math.max(0, p - 75);
  return t1 * 0.015 + t2 * 0.01 + t3 * 0.006;
}

export const CULTIVATION_PATHS = {
  nguyet_dao: {
    id: "nguyet_dao",
    name: "Nguyệt Đạo",
    color: "#5ef2d6",
    trait: "Chiêu Nguyệt Đạo tầm xa xuyên mục tiêu & +10% chí mạng",
  },
  luc_dao: {
    id: "luc_dao",
    name: "Lực Đạo",
    color: "#e69b45",
    trait: "Đánh thường & cổ Lực Đạo cộng thêm sát thương theo Lực, gọi Thú Lực Hư Ảnh",
  },
  huyet_dao: {
    id: "huyet_dao",
    name: "Huyết Đạo",
    color: "#d0573c",
    trait: "Hút máu trên đòn đánh & tích Huyết Tuyền nhanh hơn",
  },
  viem_dao: {
    id: "viem_dao",
    name: "Viêm Đạo",
    color: "#ff7b39",
    trait: "Gây Thiêu Đốt liên tục & kích nổ hiệu ứng Độc",
  },
  doc_dao: {
    id: "doc_dao",
    name: "Độc Đạo",
    color: "#73eb5e",
    trait: "Rút Độc cộng dồn làm suy yếu giáp mục tiêu",
  },
  bang_tuyet_dao: {
    id: "bang_tuyet_dao",
    name: "Băng Tuyết Đạo",
    color: "#78dcff",
    trait: "Làm chậm sâu và có xác suất đóng băng kẻ địch",
  },
  loi_dao: {
    id: "loi_dao",
    name: "Lôi Đạo",
    color: "#ffe15c",
    trait: "Tia sét nhảy lan giữa các mục tiêu khi trời mưa giông càng mạnh",
  },
  kiem_dao: {
    id: "kiem_dao",
    name: "Kiếm Đạo",
    color: "#c7e8ff",
    trait: "Xuyên giáp mục tiêu & giảm hồi chiêu đánh thường",
  },
  cot_dao: {
    id: "cot_dao",
    name: "Cốt Đạo",
    color: "#e2ded4",
    trait: "Gia cố Giáp Cốt & phản gai xương khi lướt né",
  },
  anh_dao: {
    id: "anh_dao",
    name: "Ảnh Đạo",
    color: "#b36bff",
    trait: "Tăng tốc độ di chuyển & tạo Ảnh Phân Thân đánh lạc hướng",
  },
  thuy_dao: {
    id: "thuy_dao",
    name: "Thủy Đạo",
    color: "#3aa8e8",
    trait: "Tạo Thủy Tráo hấp thụ sát thương & hồi phục Chân nguyên",
  },
  moc_dao: {
    id: "moc_dao",
    name: "Mộc Đạo",
    color: "#5fbf8a",
    trait: "Hồi phục Sinh lực bền bỉ trong giao tranh",
  },
  tho_dao: {
    id: "tho_dao",
    name: "Thổ Đạo",
    color: "#b58b4c",
    trait: "Kháng khống chế & tăng sức chịu đựng đòn nặng",
  },
  phong_dao: {
    id: "phong_dao",
    name: "Phong Đạo",
    color: "#80ffd4",
    trait: "Tăng Né tránh & đánh dấu kẻ địch chịu thêm sát thương",
  },
  hon_dao: {
    id: "hon_dao",
    name: "Hồn Đạo",
    color: "#c280ff",
    trait: "Đốt Chân nguyên & gây Hoảng Sợ quái thường",
  },
  no_dao: {
    id: "no_dao",
    name: "Nô Đạo",
    color: "#d9b25f",
    trait: "Cường hóa sức mạnh Thú Nhà & Thú Lực Hư Ảnh",
  },
};

export function getPathMasteryTier(pathExp = 0) {
  if (pathExp >= 2000) {
    return { tierName: "Đại sư", bonusPct: 0.16, color: "#d9b25f" };
  }
  if (pathExp >= 500) {
    return { tierName: "Chuẩn đại sư", bonusPct: 0.08, color: "#5fbf8a" };
  }
  return { tierName: "Phổ thông", bonusPct: 0, color: "#b8ad94" };
}

export const BEAST_PHANTOMS = [
  { id: "phantom_boar", name: "Hư Ảnh Lợn Rừng", color: "#e69b45", dmgMult: 0.85, desc: "Húc thẳng gây choáng nhẹ" },
  { id: "phantom_bear", name: "Hư Ảnh Hùng Bi", color: "#a66b38", dmgMult: 1.05, desc: "Vả nặng phá giáp" },
  { id: "phantom_wolf", name: "Hư Ảnh Hào Điện Lang", color: "#ffe15c", dmgMult: 0.95, desc: "Vồ nhanh kèm tia sét" },
  { id: "phantom_serpent", name: "Hư Ảnh Thủy Mãng", color: "#3aa8e8", dmgMult: 1.0, desc: "Quất sóng nước diện rộng" },
  { id: "phantom_flame", name: "Hư Ảnh Xích Viêm Thú", color: "#ff7b39", dmgMult: 1.15, desc: "Phun lửa thiêu đốt" },
  { id: "phantom_snowwolf", name: "Hư Ảnh Tuyết Lang Vương", color: "#9ee8ff", dmgMult: 1.25, desc: "Gầm băng làm chậm 50%" },
];
