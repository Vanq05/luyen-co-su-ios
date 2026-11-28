import {
  getCharacterSheets,
  normalizeAppearance,
} from "../character/CharacterSpriteBuilder.js";
import {
  APERTURE_WALL_NAMES,
  APTITUDES,
  BREAKTHROUGH_REQUIREMENTS,
  CULTIVATION_PATHS,
  computeDiminishingPct,
  evaluateAwakeningSteps,
  getPathMasteryTier,
  getStageInfo,
  getStageProgress,
  rollInnateAwakeningLimit,
} from "../data/CultivationData.js";
import { ARMOR_SETS, ITEMS_CATALOG, createArmorPiece } from "../data/EquipmentAndItems.js";
import { GU_CATALOG, KILLER_MOVES, STARTER_VITAL_BUILDS, createGuWorm } from "../data/GuCatalog.js";
import { CLAN_MISSION_POOL } from "../data/QuestsAndEvents.js";
import { resolveMultiGuKillerMove } from "./SkillVfxAndCombos.js";

/**
 * Trạng thái Cổ Sư hoàn chỉnh chuẩn Cổ Tiên Lộ (cotienlo.com):
 * - 20 tiểu cảnh giới (Nhất -> Ngũ chuyển), Tư chất (Bính/Ất/Giáp), 4 Tiềm năng, 16 Lưu phái.
 * - Cổ Bản Mệnh (RMB), 7 Ô Cổ Chủ Động (1-7), Ô Bị Động (Hướng Thủ), 2 Sát Chiêu (Q/E), 2 Ô Thuốc (Z/G).
 * - Hộ Cụ 4 ô, Túi Vật Phẩm, Thú Lực Hư Ảnh, Không Khiếu Thứ Hai (H), Tự động dẫn đường.
 */
export class PlayerController {
  constructor(charData = null) {
    this.x = 240;
    this.y = 260;
    this.radius = 8;
    this.baseSpeed = 96;
    this.facing = 0;
    this.moving = false;

    this.characterName = "Vô Danh Cổ Sư";
    this.appearance = normalizeAppearance(null);
    this.characterSheets = getCharacterSheets(this.appearance);

    this.currentMapId = "ta_gia_trai";
    this.stageLevel = 1;
    this.cultivationExp = 0;
    this.aptitude = "Binh";
    this.insightCount = 3; // Cảm ngộ
    this.bloodSpring = 0; // Huyết tuyền tích lũy cho Huyết Lô Cổ (0..100)
    this.nguyenThach = 180;
    this.honorPoints = 0;
    this.clanContrib = 0;

    this.potentials = { can_cot: 2, luc: 2, than_thuc: 2, than_phap: 2 };
    this.freePoints = 5;
    this.bodyTemperCount = 0;
    this.bodyTemperBonusForce = 0;
    this.bodyTemperBonusHp = 0;

    this.chosenPath = "nguyet_dao";
    this.pathExps = { nguyet_dao: 0 };
    this.unlockedPhantoms = ["phantom_boar"];

    // Không Khiếu 1 & Không Khiếu 2
    this.secondApertureUnlocked = false;
    this.activeAperture = 0;
    this.secondAperture = {
      stageLevel: 1,
      cultivationExp: 0,
      chosenPath: "huyet_dao",
      vitalUid: null,
      activeUids: [null, null, null, null, null, null, null],
      passiveUid: null,
    };

    this.guBag = [];
    this.vitalUid = null;
    this.activeUids = [null, null, null, null, null, null, null];
    this.passiveUid = null;
    this.killerMoveIds = ["km_nguyet_hoa", "km_van_thu"];
    this.customKillerMoves = [null, null];
    this.quickItemIds = ["hoi_huyet_thao", "tu_nguyen_dan"];
    this.autoFeed = true;

    this.hotTimer = 0;
    this.hotRate = 0;
    this.armorBuffTimer = 0;
    this.armorBuffBonus = 0;
    this.thornsBuffBonus = 0;
    this.armorBuffColor = "#d49548";
    this.refineBuffTimer = 0;
    this.refineDmgBonus = 0;
    this.refineCdBonus = 0;
    this.refineMpSave = 0;
    this.speedBuffTimer = 0;
    this.speedBuffBonus = 0;
    this.lastBacklashNotice = "";

    this.itemBag = {
      hoi_huyet_thao: 6,
      tu_nguyen_dan: 3,
      thao_duoc: 8,
      thit_thu: 4,
      ruou_trang: 2,
      moi_cau_thuong: 8,
      moi_bat_co: 3,
      mao_thach_so: 2,
      da_cuong_hoa: 3,
    };

    this.armorBag = [];
    this.armorEquipped = { ao: null, giay: null, bao_tay: null, boi_suc: null };

    // Tiến độ nhiệm vụ & quà
    this.mainQuestIndex = 0;
    this.questProgress = 0;
    this.dailyClaimed = false;
    this.mailClaimed = false;
    this.pvpFlag = "peace";

    // Trạng thái chiến đấu thời gian thực
    this.maxHp = 240;
    this.hp = 240;
    this.maxMp = 120;
    this.mp = 120;
    this.mpRegen = 5.5;
    this.maxStamina = 100;
    this.stamina = 100;
    this.staminaRegen = 22;
    this.thoughtGauge = 45;
    this.shield = 0;

    this.isAbsorbingStone = false;
    this.absorbProgress = 0;
    this.isMeditating = false;
    this.isFishing = false;
    this.autoPathTarget = null;
    this.autoPathWaypoints = [];
    this.autoPathQueue = [];

    this.invulnTimer = 0;
    this.hurtTimer = 0;
    this.attackAnimTimer = 0;
    this.basicAttackCd = 0;
    this.dashTimer = 0;
    this.dashVx = 0;
    this.dashVy = 0;
    this.dashGu = null;
    this.dashSpikeTick = 0;
    this.tauHoaTimer = 0;
    this.isDead = false;
    this.deathTimer = 0;

    // Trạng thái cơ chế cotienlo.com: Hồi chiêu từng ô, Tự đánh bãi thú, Ẩn thân bụi cỏ, Khai khiếu & Gia Viên
    this.cooldowns = {};
    this.maxCooldowns = {};
    this.autoCombat = false;
    this.isStealthed = false;
    this.stealthBreakTimer = 0;
    this.hasAwakened = false;
    this.hasChosenTargetGu = false;
    this.targetStarterGuId = null;
    this.isDreamTrial = false;
    this.starterGuChoice = "nguyet_quang";
    this.awakeningSteps = 0;
    this.apertureSeaPct = 0;
    this.willpowerBoostTimer = 0;
    this.awakeningSeed = 1;
    this.innateBaseSteps = 24;
    this.innateMaxSteps = 27;
    this.clanBoard = [];
    this.activeGuQuest = null;
    this.claimedGuQuestIds = [];
    this.gardenPlots = Array.from({ length: 4 }, () => ({
      state: "empty",
      timer: 0,
      seedId: null,
      watered: false,
    }));

    this.animState = "idle";
    this.animTime = 0;
    this.kills = 0;
    this.bossesSlain = 0;
    this.feedTick = 0;

    this.applyCharacterSetup(charData);
  }

  setAppearance(rawAppearance) {
    this.appearance = normalizeAppearance(rawAppearance);
    this.characterSheets = getCharacterSheets(this.appearance);
  }

  applyCharacterSetup(charData = null) {
    if (!charData) {
      this._initStarterLoadout("nguyet_quang");
      this.hasAwakened = true;
      this.hasChosenTargetGu = true;
      this.recalculateStats(true);
      return;
    }

    this.characterName = charData.name ?? "Vô Danh Cổ Sư";
    this.setAppearance(charData.appearance);

    const st = charData.ctl_state;
    if (st && typeof st === "object") {
      this.applySerializedState(st);
    } else {
      // Nhân vật mới: Khởi đầu tại Hang Ngầm Sơn Trại (Dòng Suối Nguyên Tuyền) để Khai Khiếu Đại Điển
      this.chosenPath = charData.starterPath || "nguyet_dao";
      this.starterGuChoice = charData.starterGuId || "nguyet_quang";
      this.nguyenThach = Math.max(200, Number(charData.nguyen_thach ?? 200));
      this.currentMapId = "hang_ngam_khai_khieu";
      this.x = 145;
      this.y = 240;
      this.stageLevel = 1;
      this.cultivationExp = 0;
      this.aptitude = "PhamNhan";
      this.awakeningSteps = 0;
      this.apertureSeaPct = 0;
      this.awakeningSeed = Number(charData.awakeningSeed ?? 1);
      const lim = rollInnateAwakeningLimit(this.characterName, this.awakeningSeed);
      this.innateBaseSteps = lim.baseSteps;
      this.innateMaxSteps = lim.maxSteps;
      this.hasAwakened = false;
      this.hasChosenTargetGu = false;
      this.targetStarterGuId = null;
      this.isDreamTrial = false;
      this.guBag = [];
      this.vitalUid = null;
      this.activeUids = [null, null, null, null, null, null, null];
      this.passiveUid = null;
      this.itemBag.moi_bat_co = Math.max(5, this.itemBag.moi_bat_co ?? 5);
      const starterAo = createArmorPiece("thu_bi_bo", "ao", "luc");
      const starterGiay = createArmorPiece("thu_bi_bo", "giay", "pham");
      this.armorBag = [starterAo, starterGiay];
      this.armorEquipped = { ao: starterAo.uid, giay: starterGiay.uid, bao_tay: null, boi_suc: null };
      this.refreshClanMissions();
      this.recalculateStats(true);
    }
  }

  awakenApertureOnly() {
    return this.finalizeAwakeningSteps(27, null, { forceAccept: true });
  }

  rerollAwakeningLimit() {
    this.awakeningSeed = (this.awakeningSeed || 1) + 1;
    const lim = rollInnateAwakeningLimit(this.characterName, this.awakeningSeed);
    this.innateBaseSteps = lim.baseSteps;
    this.innateMaxSteps = lim.maxSteps;
    return lim;
  }

  getMaxGuCapacity() {
    const stage = this.getStage();
    const aptBonus = this.aptitude === "Giap" ? 4 : this.aptitude === "At" ? 3 : this.aptitude === "Binh" ? 2 : 1;
    return 4 + stage.rank * 3 + aptBonus + (this.secondApertureUnlocked ? 6 : 0);
  }

  finalizeAwakeningSteps(rawSteps, events = null, opts = {}) {
    const evalInfo = evaluateAwakeningSteps(rawSteps);
    if (!evalInfo.ok && !opts.forceAccept) {
      return { ok: false, reason: "under_ten_steps", evalInfo };
    }
    this.awakeningSteps = evalInfo.steps;
    this.aptitude = evalInfo.aptitudeKey;
    this.apertureSeaPct = evalInfo.seaPct;
    this.hasAwakened = true;
    this.isDreamTrial = false;
    this.cooldowns = {};
    this.maxCooldowns = {};
    this.addItem("moi_bat_co", 3);
    this.addItem("xa_loi_thanh_dong", 1);
    if (!this.clanBoard || this.clanBoard.length === 0) this.refreshClanMissions();
    this.recalculateStats(true);
    events?.onAwaken?.(evalInfo);
    return {
      ok: true,
      aptitude: this.aptitude,
      aptitudeInfo: this.getAptitudeInfo(),
      evalInfo,
    };
  }

  chooseStarterVitalBuild(buildId) {
    const build = STARTER_VITAL_BUILDS.find((b) => b.id === buildId) || STARTER_VITAL_BUILDS[0];
    const vitalId = build?.vitalGuId || build?.id;
    if (!build || !vitalId || !GU_CATALOG[vitalId]) return null;

    this.guBag = [];
    this.vitalUid = null;
    this.activeUids = [null, null, null, null, null, null, null];
    this.passiveUid = null;

    const vitalWorm = createGuWorm(vitalId);
    this.guBag.push(vitalWorm);
    this.vitalUid = vitalWorm.uid;
    this.targetStarterGuId = vitalId;
    this.starterGuChoice = vitalId;
    this.chosenPath = build.path || vitalWorm.path || this.chosenPath;
    this.hasChosenTargetGu = true;

    let bonusWorm = null;
    if (build.bonusGuId && GU_CATALOG[build.bonusGuId]) {
      bonusWorm = createGuWorm(build.bonusGuId);
      this.guBag.push(bonusWorm);
      this.activeUids[0] = bonusWorm.uid;
    }

    this.addItem("hoi_huyet_thao", 4);
    this.addItem("moi_bat_co", 2);
    this.currentMapId = "ta_gia_trai";
    this.x = 360;
    this.y = 368;
    this.autoPathTarget = null;
    this.autoPathWaypoints = [];
    this.recalculateStats(true);
    return { build, vitalWorm, bonusWorm };
  }

  refreshClanMissions() {
    const rank = this.getStage().rank;
    const eligible = CLAN_MISSION_POOL.filter((m) => (m.rankReq ?? 1) <= Math.max(1, rank + 1));
    const pool = [...eligible].sort((a, b) => {
      const da = Math.abs((a.rankReq ?? 1) - rank);
      const db = Math.abs((b.rankReq ?? 1) - rank);
      return da - db + (Math.random() - 0.5) * 2.5;
    });
    this.clanBoard = pool.slice(0, 4).map((m) => ({
      ...m,
      goal: { ...m.goal },
      rewards: { ...m.rewards, items: m.rewards.items ? m.rewards.items.map((x) => ({ ...x })) : [] },
      progress: 0,
      claimed: false,
    }));
    return this.clanBoard;
  }

  selectGuQuest(questDef) {
    if (!questDef) return null;
    this.activeGuQuest = {
      id: questDef.id,
      rank: questDef.rank,
      pathLabel: questDef.pathLabel,
      guId: questDef.guId,
      title: questDef.title,
      desc: questDef.desc,
      mapId: questDef.mapId,
      x: questDef.x,
      y: questDef.y,
      goal: { ...questDef.goal },
      rewards: { ...questDef.rewards },
      progress: 0,
      completed: false,
    };
    return this.activeGuQuest;
  }

  absorbStoneRefillMp() {
    if (!this.hasAwakened) return { ok: false, reason: "Cần Khai Khiếu trước!" };
    if (this.mp >= this.maxMp) return { ok: false, reason: "Chân Nguyên Hải đã sung mãn!" };
    const apt = this.getAptitudeInfo();
    if (this.nguyenThach < 1) return { ok: false, reason: "Không đủ Nguyên Thạch!" };
    this.nguyenThach -= 1;
    const gain = Math.max(12, Math.round(this.maxMp * 0.36 * (apt.stoneAbsorbMult ?? 1)));
    this.mp = Math.min(this.maxMp, this.mp + gain);
    return { ok: true, gain };
  }

  washApertureWallsWithStones(cycles = 1, events = null) {
    if (!this.hasAwakened) return { ok: false, reason: "Cần Khai Khiếu trước khi tĩnh tọa!" };
    const stage = this.getStage();
    if (!stage.next) {
      return { ok: false, reason: "Đã đạt Ngũ Chuyển Đỉnh Phong tối thượng!" };
    }
    const prog = getStageProgress(this.stageLevel, this.cultivationExp);
    if (prog.readyForBreakthrough) {
      return {
        ok: false,
        readyForBreakthrough: true,
        reason: "Tinh Mạc Đỉnh Phong đã viên mãn (100%)! Hãy bấm [Xung Kích Phá Vách] để đột phá Chuyển mới!",
      };
    }

    const apt = this.getAptitudeInfo();
    const costPer = apt.stoneCostPerCycle ?? 2;
    let actualCycles = Math.max(1, cycles);
    if (stage.isPeak && actualCycles > 1) {
      const expPerCycle = Math.max(15, Math.round(28 * (apt.stoneAbsorbMult ?? 1) * (apt.expMult ?? 1)));
      const remaining = Math.max(1, prog.need - this.cultivationExp);
      actualCycles = Math.min(actualCycles, Math.max(1, Math.ceil(remaining / Math.max(1, expPerCycle))));
    }

    const totalCost = Math.max(1, actualCycles * costPer);
    if (this.nguyenThach < totalCost) {
      return { ok: false, reason: `Cần ${totalCost} Nguyên Thạch cho ${actualCycles} chu kỳ cọ rửa Khiếu Bích!` };
    }
    this.nguyenThach -= totalCost;
    const gainExp = Math.max(15, Math.round(28 * actualCycles * (apt.stoneAbsorbMult ?? 1)));
    const gainMp = Math.round(this.maxMp * 0.25 * actualCycles);
    this.mp = Math.min(this.maxMp, this.mp + gainMp);
    this.addCultivationExp(gainExp, events);
    const updatedStage = this.getStage();
    const wallName = APERTURE_WALL_NAMES[updatedStage.stageIndex] || "Khiếu Bích";
    return { ok: true, totalCost, gainExp, wallName, actualCycles };
  }

  getEffectiveBreakthroughStoneCost() {
    const stage = this.getStage();
    const req = BREAKTHROUGH_REQUIREMENTS[stage.rank];
    if (!req) return 0;
    const prog = getStageProgress(this.stageLevel, this.cultivationExp);
    if (stage.isPeak && this.cultivationExp > prog.need) {
      const discount = Math.floor((this.cultivationExp - prog.need) / 8);
      return Math.max(0, req.stones - discount);
    }
    return req.stones;
  }

  getBestAvailableSeed() {
    for (const id of ["hat_tram_nam", "hat_huyet_thao", "hat_linh_thao"]) {
      const count = this.getItemCount(id);
      if (count > 0 && ITEMS_CATALOG[id]) {
        return { id, itemDef: ITEMS_CATALOG[id], count };
      }
    }
    return null;
  }

  selectTargetStarterGu(guId) {
    if (!GU_CATALOG[guId]) return null;
    this.targetStarterGuId = guId;
    this.starterGuChoice = guId;
    this.hasChosenTargetGu = true;
    this.chosenPath = GU_CATALOG[guId].path || this.chosenPath;
    this.addItem("moi_bat_co", 2);
    return GU_CATALOG[guId];
  }

  acquireRefinedWildGu(guId) {
    const worm = createGuWorm(guId);
    this.guBag.push(worm);
    let boundAsVital = false;
    if (!this.vitalUid) {
      this.vitalUid = worm.uid;
      this.chosenPath = worm.path || this.chosenPath;
      boundAsVital = true;
    } else if (worm.guardStance && !this.passiveUid) {
      this.passiveUid = worm.uid;
    } else {
      const stage = this.getStage();
      const emptyIdx = this.activeUids.findIndex((u, i) => !u && i < stage.activeSlotsUnlocked);
      if (emptyIdx >= 0) this.activeUids[emptyIdx] = worm.uid;
    }
    this.recalculateStats(false);
    return { worm, boundAsVital };
  }

  useRelicGu(itemDef) {
    if (!itemDef?.relicRank) return { ok: false, reason: "Vật phẩm không phải Xá Lợi Cổ." };
    const stage = this.getStage();
    if (stage.rank !== itemDef.relicRank) {
      return { ok: false, reason: `Cần ở cảnh giới Chuyển ${itemDef.relicRank} mới luyện hóa được ${itemDef.name}!` };
    }
    if (stage.isPeak) {
      return { ok: false, reason: "Đã đạt Đỉnh Phong chuyển này! Hãy Xung Kích Khiếu Bích để lên Chuyển mới." };
    }
    if (!this.consumeItem(itemDef.id, 1)) {
      return { ok: false, reason: "Không có Xá Lợi Cổ trong túi!" };
    }
    this.cultivationExp = 0;
    this.stageLevel += 1;
    this.freePoints += 5;
    this.recalculateStats(true);
    return { ok: true, stageTitle: this.getStage().title };
  }

  startCooldown(slotKey, duration) {
    if (!slotKey || duration <= 0) return;
    this.cooldowns[slotKey] = duration;
    this.maxCooldowns[slotKey] = duration;
  }

  getCooldownInfo(slotKey) {
    const rem = Math.max(0, this.cooldowns[slotKey] ?? 0);
    const max = Math.max(0.01, this.maxCooldowns[slotKey] ?? 1);
    return { rem, max, pct: rem > 0 ? Math.min(1, rem / max) : 0 };
  }

  _initStarterLoadout(starterGuId = "nguyet_quang") {
    const gVital = createGuWorm(GU_CATALOG[starterGuId] ? starterGuId : "nguyet_quang");
    const g1 = createGuWorm("dan_khieu_hoa_than");
    const g2 = createGuWorm("thanh_doc");
    const g3 = createGuWorm("tieu_sinh_co");
    const g4 = createGuWorm("tuu_trung");
    const gPassive = createGuWorm("thu_bi");
    const gMove = createGuWorm("anh_bo");

    this.guBag = [gVital, g1, g2, g3, g4, gPassive, gMove];
    this.vitalUid = gVital.uid;
    this.activeUids = [g1.uid, g2.uid, g3.uid, g4.uid, gMove.uid, null, null];
    this.passiveUid = gPassive.uid;

    const starterAo = createArmorPiece("thu_bi_bo", "ao", "luc");
    const starterGiay = createArmorPiece("thu_bi_bo", "giay", "pham");
    this.armorBag = [starterAo, starterGiay];
    this.armorEquipped = { ao: starterAo.uid, giay: starterGiay.uid, bao_tay: null, boi_suc: null };
  }

  serializeState() {
    return {
      currentMapId: this.currentMapId,
      x: Math.round(this.x),
      y: Math.round(this.y),
      stageLevel: this.stageLevel,
      cultivationExp: this.cultivationExp,
      aptitude: this.aptitude,
      insightCount: this.insightCount,
      bloodSpring: this.bloodSpring,
      nguyenThach: this.nguyenThach,
      honorPoints: this.honorPoints,
      clanContrib: this.clanContrib,
      potentials: { ...this.potentials },
      freePoints: this.freePoints,
      bodyTemperCount: this.bodyTemperCount,
      bodyTemperBonusForce: this.bodyTemperBonusForce,
      bodyTemperBonusHp: this.bodyTemperBonusHp,
      chosenPath: this.chosenPath,
      pathExps: { ...this.pathExps },
      unlockedPhantoms: [...this.unlockedPhantoms],
      secondApertureUnlocked: this.secondApertureUnlocked,
      activeAperture: this.activeAperture,
      secondAperture: JSON.parse(JSON.stringify(this.secondAperture)),
      guBag: this.guBag.map((g) => ({ ...g })),
      vitalUid: this.vitalUid,
      activeUids: [...this.activeUids],
      passiveUid: this.passiveUid,
      killerMoveIds: [...this.killerMoveIds],
      customKillerMoves: (this.customKillerMoves ?? [null, null]).map((c) => (c ? { ...c, guIds: [...(c.guIds || [])] } : null)),
      quickItemIds: [...this.quickItemIds],
      autoFeed: this.autoFeed,
      itemBag: { ...this.itemBag },
      armorBag: this.armorBag.map((a) => ({ ...a })),
      armorEquipped: { ...this.armorEquipped },
      mainQuestIndex: this.mainQuestIndex,
      questProgress: this.questProgress,
      dailyClaimed: this.dailyClaimed,
      mailClaimed: this.mailClaimed,
      pvpFlag: this.pvpFlag,
      kills: this.kills,
      bossesSlain: this.bossesSlain,
      hasAwakened: this.hasAwakened,
      hasChosenTargetGu: this.hasChosenTargetGu,
      targetStarterGuId: this.targetStarterGuId,
      isDreamTrial: this.isDreamTrial,
      starterGuChoice: this.starterGuChoice,
      awakeningSteps: this.awakeningSteps,
      apertureSeaPct: this.apertureSeaPct,
      awakeningSeed: this.awakeningSeed,
      innateBaseSteps: this.innateBaseSteps,
      innateMaxSteps: this.innateMaxSteps,
      clanBoard: this.clanBoard,
      activeGuQuest: this.activeGuQuest,
      claimedGuQuestIds: [...this.claimedGuQuestIds],
      gardenPlots: this.gardenPlots.map((p) => ({ ...p })),
    };
  }

  applySerializedState(st) {
    this.currentMapId = st.currentMapId || "ta_gia_trai";
    this.x = Number(st.x ?? 640);
    this.y = Number(st.y ?? 460);
    this.stageLevel = Math.max(1, Math.min(20, Number(st.stageLevel ?? 1)));
    this.cultivationExp = Math.max(0, Number(st.cultivationExp ?? 0));
    this.aptitude = APTITUDES[st.aptitude] ? st.aptitude : "Binh";
    this.insightCount = Number(st.insightCount ?? 2);
    this.bloodSpring = Number(st.bloodSpring ?? 0);
    this.nguyenThach = Math.max(0, Number(st.nguyenThach ?? 180));
    this.honorPoints = Number(st.honorPoints ?? 0);
    this.clanContrib = Number(st.clanContrib ?? 0);
    this.potentials = { can_cot: 2, luc: 2, than_thuc: 2, than_phap: 2, ...(st.potentials ?? {}) };
    this.freePoints = Number(st.freePoints ?? 0);
    this.bodyTemperCount = Number(st.bodyTemperCount ?? 0);
    this.bodyTemperBonusForce = Number(st.bodyTemperBonusForce ?? 0);
    this.bodyTemperBonusHp = Number(st.bodyTemperBonusHp ?? 0);
    this.chosenPath = st.chosenPath || "nguyet_dao";
    this.pathExps = { ...(st.pathExps ?? {}) };
    this.unlockedPhantoms = Array.isArray(st.unlockedPhantoms) ? [...st.unlockedPhantoms] : ["phantom_boar"];
    this.secondApertureUnlocked = Boolean(st.secondApertureUnlocked);
    this.activeAperture = Number(st.activeAperture ?? 0);
    if (st.secondAperture) this.secondAperture = st.secondAperture;
    this.guBag = Array.isArray(st.guBag) ? st.guBag.map((g) => ({ ...GU_CATALOG[g.id], ...g })) : [];
    this.vitalUid = st.vitalUid ?? null;
    this.activeUids = Array.isArray(st.activeUids) ? st.activeUids.slice(0, 7) : [null, null, null, null, null, null, null];
    while (this.activeUids.length < 7) this.activeUids.push(null);
    this.passiveUid = st.passiveUid ?? null;
    if (!Array.isArray(st.guBag)) this._initStarterLoadout("nguyet_quang");
    this.killerMoveIds = Array.isArray(st.killerMoveIds) ? st.killerMoveIds : ["km_nguyet_hoa", "km_van_thu"];
    this.customKillerMoves = Array.isArray(st.customKillerMoves)
      ? [0, 1].map((idx) => {
          const c = st.customKillerMoves[idx];
          return c && Array.isArray(c.guIds) && c.guIds.length >= 2 ? { guIds: c.guIds.slice(0, 3), customName: c.customName || null } : null;
        })
      : [null, null];
    this.quickItemIds = Array.isArray(st.quickItemIds) ? st.quickItemIds : ["hoi_huyet_thao", "tu_nguyen_dan"];
    this.autoFeed = st.autoFeed !== false;
    this.itemBag = { ...(st.itemBag ?? {}) };
    this.armorBag = Array.isArray(st.armorBag) ? st.armorBag : [];
    this.armorEquipped = { ao: null, giay: null, bao_tay: null, boi_suc: null, ...(st.armorEquipped ?? {}) };
    this.mainQuestIndex = Number(st.mainQuestIndex ?? 0);
    this.questProgress = Number(st.questProgress ?? 0);
    this.dailyClaimed = Boolean(st.dailyClaimed);
    this.mailClaimed = Boolean(st.mailClaimed);
    this.pvpFlag = st.pvpFlag || "peace";
    this.kills = Number(st.kills ?? 0);
    this.bossesSlain = Number(st.bossesSlain ?? 0);
    this.hasAwakened = st.hasAwakened !== undefined ? Boolean(st.hasAwakened) : this.guBag.length > 0;
    this.hasChosenTargetGu = st.hasChosenTargetGu !== undefined ? Boolean(st.hasChosenTargetGu) : this.guBag.length > 0;
    this.targetStarterGuId = st.targetStarterGuId ?? null;
    this.isDreamTrial = Boolean(st.isDreamTrial);
    this.starterGuChoice = st.starterGuChoice || "nguyet_quang";
    this.awakeningSteps = Number(st.awakeningSteps ?? (this.hasAwakened ? 27 : 0));
    this.awakeningSeed = Number(st.awakeningSeed ?? 1);
    const limFallback = rollInnateAwakeningLimit(this.characterName, this.awakeningSeed);
    this.innateBaseSteps = Number(st.innateBaseSteps ?? limFallback.baseSteps);
    this.innateMaxSteps = Number(st.innateMaxSteps ?? limFallback.maxSteps);
    if (!this.hasAwakened && this.awakeningSteps > this.innateMaxSteps) {
      this.awakeningSteps = this.innateMaxSteps;
      this.x = Math.min(this.x, 145 + this.innateMaxSteps * 19);
    }
    const aptDef = APTITUDES[this.aptitude] ?? APTITUDES.Binh;
    this.apertureSeaPct = Number(st.apertureSeaPct ?? (this.hasAwakened ? (aptDef.defaultSeaPct ?? 48) : 0));
    this.clanBoard = Array.isArray(st.clanBoard) && st.clanBoard.length > 0 ? st.clanBoard : [];
    if (this.clanBoard.length === 0) this.refreshClanMissions();
    this.activeGuQuest = st.activeGuQuest ?? null;
    this.claimedGuQuestIds = Array.isArray(st.claimedGuQuestIds) ? [...st.claimedGuQuestIds] : [];
    if (Array.isArray(st.gardenPlots) && st.gardenPlots.length === 4) {
      this.gardenPlots = st.gardenPlots.map((p) => {
        const hasSeed = Boolean(p?.seedId);
        if ((p?.state === "ready" || p?.state === "growing") && !hasSeed) {
          return { state: "empty", timer: 0, seedId: null, watered: false };
        }
        return {
          state: p?.state || "empty",
          timer: Number(p?.timer ?? 0),
          seedId: p?.seedId ?? null,
          watered: Boolean(p?.watered),
        };
      });
    }
    this.recalculateStats(true);
  }

  getStage() {
    return getStageInfo(this.activeAperture === 1 ? this.secondAperture.stageLevel : this.stageLevel);
  }

  getAptitudeInfo() {
    return APTITUDES[this.aptitude] ?? APTITUDES.Binh;
  }

  getPathInfo() {
    const pId = this.activeAperture === 1 ? this.secondAperture.chosenPath : this.chosenPath;
    return CULTIVATION_PATHS[pId] ?? CULTIVATION_PATHS.nguyet_dao;
  }

  getGu(uid) {
    return this.guBag.find((g) => g.uid === uid) ?? null;
  }

  getVitalGu() {
    const uid = this.activeAperture === 1 ? this.secondAperture.vitalUid : this.vitalUid;
    return this.getGu(uid);
  }

  getPassiveGu() {
    const uid = this.activeAperture === 1 ? this.secondAperture.passiveUid : this.passiveUid;
    return this.getGu(uid);
  }

  getActiveGu(slotIdx) {
    const arr = this.activeAperture === 1 ? this.secondAperture.activeUids : this.activeUids;
    return this.getGu(arr[slotIdx]);
  }

  getResolvedKillerMove(slotIdx = 0) {
    const custom = this.customKillerMoves?.[slotIdx];
    if (custom && Array.isArray(custom.guIds) && custom.guIds.length >= 2) {
      const pool = [...this.guBag];
      const matched = [];
      for (const id of custom.guIds) {
        const idx = pool.findIndex((g) => g.id === id);
        if (idx >= 0) {
          matched.push(pool[idx]);
          pool.splice(idx, 1);
        }
      }
      if (matched.length >= 2) {
        return resolveMultiGuKillerMove(matched, this, custom.customName);
      }
    }
    const kmId = this.killerMoveIds[slotIdx === 1 ? 1 : 0];
    return KILLER_MOVES.find((k) => k.id === kmId) ?? KILLER_MOVES[slotIdx === 1 ? 1 : 0] ?? KILLER_MOVES[0];
  }

  getEquippedGu(slotId) {
    if (slotId === "vital") return this.getVitalGu();
    if (slotId === "passive") return this.getPassiveGu();
    if (slotId === "move") return this.getAllEquipped().find((g) => g.role === "move") ?? null;
    if (slotId === "dash") {
      const moveGu = this.getAllEquipped().find((g) => g.role === "move");
      return { aimType: "dash", range: moveGu?.range ?? 78, color: moveGu?.color ?? "#5ef2d6" };
    }
    if (slotId === "km1" || slotId === "km2") {
      const km = this.getResolvedKillerMove(slotId === "km1" ? 0 : 1);
      return {
        aimType: km.kind === "combo_aura_nova" || km.kind === "nova" ? "aoe" : km.kind === "combo_shockwave" ? "arc" : "line",
        range: km.range ?? 150,
        radius: km.kind === "nova" || km.kind === "combo_aura_nova" ? km.range : 18,
        color: km.color ?? "#ffd257",
      };
    }
    if (slotId?.startsWith("slot_")) {
      const idx = Number(slotId.replace("slot_", ""));
      return this.getActiveGu(idx);
    }
    return this.getVitalGu();
  }

  getAllEquipped() {
    const arr = this.activeAperture === 1 ? this.secondAperture.activeUids : this.activeUids;
    const list = [this.getVitalGu(), this.getPassiveGu(), ...arr.map((u) => this.getGu(u))];
    return list.filter(Boolean);
  }

  getEquippedSummary() {
    return this.getAllEquipped()
      .slice(0, 5)
      .map((g) => ({ name: g.name, shortLabel: g.shortLabel, tier: g.rank ?? 1, color: g.color }));
  }

  hasGuardStance() {
    const p = this.getPassiveGu();
    const v = this.getVitalGu();
    return Boolean((p && p.guardStance) || (v && v.guardStance));
  }

  getArmorPieces() {
    return Object.values(this.armorEquipped)
      .map((uid) => this.armorBag.find((a) => a.uid === uid))
      .filter(Boolean);
  }

  getSetCounts() {
    const counts = {};
    for (const a of this.getArmorPieces()) {
      counts[a.setId] = (counts[a.setId] || 0) + 1;
    }
    return counts;
  }

  recalculateStats(refill = false) {
    const stage = this.getStage();
    const apt = this.getAptitudeInfo();
    const hpMult = 1 + computeDiminishingPct(this.potentials.can_cot);
    const mpMult = 1 + computeDiminishingPct(this.potentials.than_thuc);

    let armorHp = 0;
    let armorMp = 0;
    for (const a of this.getArmorPieces()) {
      const enh = 1 + (a.enhanceLevel ?? 0) * 0.08;
      armorHp += Math.round(a.hpBonus * enh);
    }
    const sets = this.getSetCounts();
    if ((sets.thu_bi_bo ?? 0) >= 2) armorHp += 120;
    if ((sets.thuy_truc_bo ?? 0) >= 4) armorHp += 200;
    if ((sets.suong_truc_bo ?? 0) >= 4) armorHp += 380;
    if ((sets.chan_duong_bo ?? 0) >= 2) armorMp += 250;
    if ((sets.chan_duong_bo ?? 0) >= 4) armorHp += 600;

    let guHpBonusPct = 0;
    for (const g of this.getAllEquipped()) {
      if (g.hpBonusPct) guHpBonusPct += g.hpBonusPct;
    }

    const prevMaxHp = this.maxHp || stage.baseHp;
    const hpRatio = prevMaxHp > 0 ? this.hp / prevMaxHp : 1;

    this.maxHp = Math.round((stage.baseHp + armorHp + this.bodyTemperBonusHp) * hpMult * (1 + guHpBonusPct));
    if (!this.hasAwakened) {
      this.maxMp = 0;
      this.mp = 0;
      this.mpRegen = 0;
    } else {
      const seaFactor = this.apertureSeaPct > 0 ? 0.45 + (this.apertureSeaPct / 100) * 1.15 : apt.mpMult;
      this.maxMp = Math.round((stage.baseMp + armorMp) * seaFactor * mpMult);
      this.mpRegen = Number(
        ((4.2 + stage.rank * 2.1 + (this.getVitalGu()?.id === "thien_thanh_lien" ? 8 : 0)) * (apt.mpRegenMult ?? 1)).toFixed(2)
      );
    }
    this.maxStamina = stage.baseStamina;
    this.staminaRegen = 22 + this.potentials.than_phap * 0.8;

    if (refill) {
      this.hp = this.maxHp;
      this.mp = this.maxMp;
      this.stamina = this.maxStamina;
    } else {
      this.hp = Math.min(this.maxHp, Math.max(1, Math.round(this.maxHp * hpRatio)));
      this.mp = Math.min(this.maxMp, this.mp);
    }
  }

  getMoveSpeed() {
    const speedBonus = Math.min(0.35, this.potentials.than_phap * 0.012);
    const sets = this.getSetCounts();
    const setSpeed = (sets.thuy_truc_bo ?? 0) >= 4 ? 0.1 : (sets.dien_lang_bo ?? 0) >= 4 ? 0.12 : 0;
    let guSpeed = 0;
    for (const g of this.getAllEquipped()) {
      if (g.moveSpeedBonus) guSpeed += g.moveSpeedBonus;
    }
    const tempSpeed = this.speedBuffTimer > 0 ? this.speedBuffBonus : 0;
    return this.baseSpeed * (1 + speedBonus + setSpeed + guSpeed + tempSpeed);
  }

  getThornsRatio() {
    let thorns = 0;
    for (const g of this.getAllEquipped()) {
      if (g.thornsPct) thorns += g.thornsPct;
    }
    if (this.armorBuffTimer > 0) thorns += this.thornsBuffBonus;
    return Math.min(0.6, thorns);
  }

  getArmorRatio() {
    let armor = 0;
    for (const a of this.getArmorPieces()) {
      armor += a.armorBonus * (1 + (a.enhanceLevel ?? 0) * 0.05);
    }
    for (const g of this.getAllEquipped()) {
      if (g.armorBonus) armor += g.armorBonus;
    }
    if (this.armorBuffTimer > 0) armor += this.armorBuffBonus;
    const sets = this.getSetCounts();
    if ((sets.thu_bi_bo ?? 0) >= 4) armor += 0.08;
    return Math.min(0.72, armor);
  }

  getBasicAttackCooldown() {
    return this.chosenPath === "kiem_dao" ? 0.29 : 0.36;
  }

  getDodgeChance() {
    let dodge = this.potentials.than_phap * 0.0035;
    for (const g of this.getAllEquipped()) {
      if (g.dodgeBonus) dodge += g.dodgeBonus;
    }
    if (this.chosenPath === "phong_dao") dodge += 0.06;
    return Math.min(0.38, dodge);
  }

  getBasicAttackDamage() {
    const stage = this.getStage();
    const force = this.potentials.luc + this.bodyTemperBonusForce;
    let armorDmg = 0;
    for (const a of this.getArmorPieces()) {
      armorDmg += a.dmgBonus * (1 + (a.enhanceLevel ?? 0) * 0.08);
    }
    let dmg = 20 + stage.rank * 14 + force * 2.4 + armorDmg;
    const vital = this.getVitalGu();
    const isRanged = vital && (vital.path === "nguyet_dao" || vital.path === "kiem_dao" || vital.aimType === "line");
    let meleeBonus = isRanged ? 0 : (this.getAptitudeInfo().meleeBonus ?? 0);
    for (const g of this.getAllEquipped()) {
      if (g.meleeDmgBonus) meleeBonus += g.meleeDmgBonus;
      else if (g.id === "hac_thi" || g.id === "bach_thi") meleeBonus += 0.25;
    }
    dmg *= 1 + meleeBonus;
    if (this.hasGuardStance()) dmg *= 1.65; // Hướng Thủ cường hóa đánh thường!
    return Math.round(dmg);
  }

  getDamageMultiplier(gu = null) {
    const stage = this.getStage();
    let mult = 1 + (stage.rank - 1) * 0.28;
    const pId = gu?.path ?? this.chosenPath;
    const tier = getPathMasteryTier(this.pathExps[pId] ?? 0);
    mult += tier.bonusPct;
    if (gu && gu.path === "luc_dao") {
      mult += (this.potentials.luc + this.bodyTemperBonusForce) * 0.015;
    }
    if (gu?.lowHpBerserk && this.maxHp > 0) {
      const missingPct = Math.max(0, 1 - this.hp / this.maxHp);
      mult += missingPct * gu.lowHpBerserk;
    }
    const sets = this.getSetCounts();
    if ((sets.dien_lang_bo ?? 0) >= 4) mult += 0.16;
    if ((sets.chan_duong_bo ?? 0) >= 4) mult += 0.25;
    if (this.refineBuffTimer > 0) mult += this.refineDmgBonus;
    return mult;
  }

  getCooldownMult() {
    const sameCount = this.getAllEquipped().filter((g) => g.path === this.chosenPath).length;
    let mod = sameCount >= 4 ? -0.1 : 0;
    const sets = this.getSetCounts();
    if ((sets.suong_truc_bo ?? 0) >= 2) mod -= 0.1;
    if (this.refineBuffTimer > 0) mod -= this.refineCdBonus;
    return Math.max(0.58, 1 + mod);
  }

  getItemCount(itemId) {
    return this.itemBag[itemId] ?? 0;
  }

  addItem(itemId, count = 1) {
    if (!itemId || count <= 0) return;
    this.itemBag[itemId] = (this.itemBag[itemId] ?? 0) + count;
  }

  consumeItem(itemId, count = 1) {
    const cur = this.getItemCount(itemId);
    if (cur < count) return false;
    this.itemBag[itemId] = cur - count;
    if (this.itemBag[itemId] <= 0) delete this.itemBag[itemId];
    return true;
  }

  addCultivationExp(amount, events) {
    if (amount <= 0) return;
    const apt = this.getAptitudeInfo();
    const gain = Math.round(amount * apt.expMult);
    if (this.activeAperture === 1) {
      this.secondAperture.cultivationExp += gain;
      return;
    }
    this.cultivationExp += gain;

    // Tự động đột phá tiểu cảnh giới nếu chưa ở Đỉnh Phong
    let guard = 0;
    while (guard < 4) {
      guard += 1;
      const prog = getStageProgress(this.stageLevel, this.cultivationExp);
      if (!prog.canAutoAdvance) break;
      this.cultivationExp -= prog.need;
      this.stageLevel += 1;
      this.freePoints += 5;
      this.recalculateStats(true);
      const nextInfo = getStageInfo(this.stageLevel);
      events?.onFloatingText?.(this.x, this.y - 34, `Đột phá: ${nextInfo.title}!`, "#4de0c9");
    }
  }

  heal(amount) {
    if (this.isDead || amount <= 0) return 0;
    const vitalBonus = this.getVitalGu()?.id === "tieu_sinh_co" ? 1.2 : 1.0;
    const finalAmt = Math.round(amount * vitalBonus);
    const before = this.hp;
    this.hp = Math.min(this.maxHp, this.hp + finalAmt);
    return Math.round(this.hp - before);
  }

  takeDamage(rawAmount, events) {
    if (this.isDead || this.invulnTimer > 0 || this.dashTimer > 0) return 0;
    if (Math.random() < this.getDodgeChance()) {
      this.invulnTimer = 0.22;
      events?.onFloatingText?.(this.x, this.y - 24, "Né Tránh!", "#80ffd4");
      return 0;
    }
    // Gián đoạn hấp thu Nguyên Thạch khi trúng đòn (không mất Nguyên Thạch)
    if (this.isAbsorbingStone) {
      this.isAbsorbingStone = false;
      this.absorbProgress = 0;
      events?.onFloatingText?.(this.x, this.y - 26, "Ngắt Hấp Thu!", "#d0573c");
    }

    const armor = this.getArmorRatio();
    let dmg = Math.max(1, Math.round(rawAmount * (1 - armor)));

    if (this.shield > 0) {
      const absorbed = Math.min(this.shield, dmg);
      this.shield -= absorbed;
      dmg -= absorbed;
      if (dmg <= 0) {
        events?.onFloatingText?.(this.x, this.y - 22, "Hộ Thuẫn Đỡ!", "#5ef2d6");
        return 0;
      }
    }

    this.hp = Math.max(0, this.hp - dmg);
    this.invulnTimer = 0.25;
    this.hurtTimer = 0.25;
    events?.onFloatingText?.(this.x, this.y - 22, `-${dmg}`, "#ff4a66");
    events?.onHurt?.(dmg);

    if (this.hp <= 0) {
      this.isDead = true;
      this.deathTimer = 0;
      events?.onDeath?.();
    }
    return dmg;
  }

  switchAperture() {
    if (!this.secondApertureUnlocked) return false;
    this.activeAperture = this.activeAperture === 0 ? 1 : 0;
    this.recalculateStats(false);
    return true;
  }

  update(dt, { moveVec, safeZone = false, inCombat = false }, events) {
    this.animTime += dt;
    if (this.invulnTimer > 0) this.invulnTimer = Math.max(0, this.invulnTimer - dt);
    if (this.hurtTimer > 0) this.hurtTimer = Math.max(0, this.hurtTimer - dt);
    if (this.attackAnimTimer > 0) this.attackAnimTimer = Math.max(0, this.attackAnimTimer - dt);
    if (this.basicAttackCd > 0) this.basicAttackCd = Math.max(0, this.basicAttackCd - dt);
    if (this.stealthBreakTimer > 0) this.stealthBreakTimer = Math.max(0, this.stealthBreakTimer - dt);
    if (this.armorBuffTimer > 0) this.armorBuffTimer = Math.max(0, this.armorBuffTimer - dt);
    if (this.refineBuffTimer > 0) this.refineBuffTimer = Math.max(0, this.refineBuffTimer - dt);
    if (this.speedBuffTimer > 0) this.speedBuffTimer = Math.max(0, this.speedBuffTimer - dt);
    if (this.hotTimer > 0) {
      this.hotTimer = Math.max(0, this.hotTimer - dt);
      if (!this.isDead && this.hotRate > 0) {
        this.heal(this.hotRate * dt);
      }
    }

    for (const k of Object.keys(this.cooldowns)) {
      if (this.cooldowns[k] > 0) {
        this.cooldowns[k] = Math.max(0, this.cooldowns[k] - dt);
      }
    }
    for (const plot of this.gardenPlots) {
      if (plot.state === "growing" && plot.timer > 0) {
        plot.timer = Math.max(0, plot.timer - dt);
        if (plot.timer <= 0) plot.state = "ready";
      }
    }

    if (this.isDead) {
      this.deathTimer += dt;
      this.animState = "death";
      return;
    }

    // Hồi Thể lực & Chân nguyên
    this.stamina = Math.min(this.maxStamina, this.stamina + this.staminaRegen * dt);
    this.mp = Math.min(this.maxMp, this.mp + this.mpRegen * dt);

    if (safeZone) {
      this.hp = Math.min(this.maxHp, this.hp + this.maxHp * 0.08 * dt);
    } else {
      let regenPct = 0;
      for (const g of this.getAllEquipped()) {
        if (g.combatRegenPct) regenPct += g.combatRegenPct;
      }
      if (regenPct > 0) {
        this.hp = Math.min(this.maxHp, this.hp + this.maxHp * regenPct * dt);
      }
    }

    // Ngồi thiền Bế Quan (X)
    if (this.isMeditating) {
      this.hp = Math.min(this.maxHp, this.hp + this.maxHp * 0.1 * dt);
      this.mp = Math.min(this.maxMp, this.mp + this.maxMp * 0.14 * dt);
      this.addCultivationExp(8 * dt, events);
    }

    // Hấp thu Nguyên Thạch (giữ R) -> tốc độ phụ thuộc Tư Chất!
    if (this.isAbsorbingStone) {
      if (this.mp >= this.maxMp) {
        this.isAbsorbingStone = false;
        this.absorbProgress = 0;
      } else if (this.nguyenThach > 0) {
        const apt = this.getAptitudeInfo();
        const absMult = apt.stoneAbsorbMult ?? 1;
        const refillRate = this.maxMp * 0.14 * absMult;
        this.mp = Math.min(this.maxMp, this.mp + refillRate * dt);
        this.absorbProgress += dt * absMult;
        if (this.absorbProgress >= 2.2) {
          this.absorbProgress -= 2.2;
          this.nguyenThach = Math.max(0, this.nguyenThach - 1);
          this.addCultivationExp(Math.round(12 * absMult), events);
        }
      } else {
        this.isAbsorbingStone = false;
      }
    }

    // Tự động cho Cổ ăn định kỳ (mỗi 15s giảm nhẹ độ đói; nếu autoFeed bật thì tự dùng thức ăn trong túi)
    this.feedTick += dt;
    if (this.feedTick >= 15) {
      this.feedTick = 0;
      for (const g of this.getAllEquipped()) {
        if (!g.foodItemId) continue;
        g.hunger = Math.max(0, (g.hunger ?? 100) - 2);
        if (this.autoFeed && g.hunger < 60 && this.consumeItem(g.foodItemId, 1)) {
          g.hunger = 100;
        }
      }
    }

    // Di chuyển / Dash / Tự tìm đường
    if (this.dashTimer > 0) {
      this.dashTimer = Math.max(0, this.dashTimer - dt);
      this.x += this.dashVx * dt;
      this.y += this.dashVy * dt;
      this.moving = true;
    } else if (moveVec.magnitude > 0) {
      this.autoPathTarget = null;
      this.autoPathWaypoints = [];
      this.isMeditating = false;
      this.isFishing = false;
      this.isAbsorbingStone = false;
      this.moving = true;
      let effVx = moveVec.x;
      if (this.currentMapId === "hang_ngam_khai_khieu" && !this.hasAwakened && effVx > 0) {
        const curStepFloat = (this.x - 145) / 19;
        const baseLim = this.innateBaseSteps || 24;
        let eastMult = 1;
        if (curStepFloat >= baseLim) {
          eastMult = 0;
        } else if (curStepFloat >= baseLim - 4) {
          eastMult = Math.max(0.2, 1 - ((curStepFloat - (baseLim - 4)) / 4) * 0.8);
        }
        effVx *= eastMult;
      }
      this.facing = moveVec.angle;
      const spd = this.getMoveSpeed();
      this.x += effVx * spd * dt;
      this.y += moveVec.y * spd * dt;
    } else if (this.autoPathTarget) {
      while (
        this.autoPathWaypoints?.length > 0 &&
        Math.hypot(this.autoPathWaypoints[0].x - this.x, this.autoPathWaypoints[0].y - this.y) <= 12
      ) {
        this.autoPathWaypoints.shift();
      }
      const nextPt = this.autoPathWaypoints?.length > 0 ? this.autoPathWaypoints[0] : this.autoPathTarget;
      const isFinalTarget = nextPt === this.autoPathTarget;
      const dx = nextPt.x - this.x;
      const dy = nextPt.y - this.y;
      const dist = Math.hypot(dx, dy);
      const stopDist =
        this.autoPathTarget.action === "attack"
          ? 36
          : this.autoPathTarget.action === "npc" ||
              this.autoPathTarget.action === "gather" ||
              this.autoPathTarget.action === "portal"
            ? 26
            : 12;
      if (isFinalTarget && dist <= stopDist) {
        const arrived = this.autoPathTarget;
        this.autoPathTarget = null;
        this.autoPathWaypoints = [];
        this.moving = false;
        events?.onAutoPathArrived?.(arrived);
      } else if (dist > 0.01) {
        this.isMeditating = false;
        this.isFishing = false;
        this.moving = true;
        this.facing = Math.atan2(dy, dx);
        const spd = this.getMoveSpeed();
        this.x += (dx / dist) * spd * dt;
        this.y += (dy / dist) * spd * dt;
      } else {
        this.autoPathTarget = null;
        this.autoPathWaypoints = [];
        this.moving = false;
      }
    } else {
      this.moving = false;
    }

    if (this.dashTimer > 0) this.animState = "dash";
    else if (this.attackAnimTimer > 0) this.animState = "attack";
    else if (this.hurtTimer > 0) this.animState = "hurt";
    else if (this.isFishing) this.animState = "fish";
    else if (this.isMeditating) this.animState = "sit";
    else if (this.moving) this.animState = "run";
    else this.animState = "idle";
  }
}
