import {
  getCharacterSheets,
  normalizeAppearance,
} from "../character/CharacterSpriteBuilder.js";
import {
  computeCultivationPath,
  createGuInstance,
  STARTER_GU_IDS,
} from "./GuDatabase.js";

/**
 * Trạng thái nhân vật Cổ Sư:
 * - Ngoại hình Pixel Art đa lớp tùy chỉnh tự do (`appearance` -> `characterSheets`).
 * - Con Đường Tu Luyện (`pathInfo`) tự động định hình từ 5 Cổ Trùng trang bị trong Không Khiếu.
 * - Lưu trữ bền vững Túi Cổ (`bag`) và Trang bị (`equipped`) xuyên suốt các tầng & phiên online.
 */
export class PlayerController {
  constructor(charData = null) {
    this.x = 288;
    this.y = 220;
    this.radius = 8;
    this.baseSpeed = 82;
    this.facing = 0;
    this.moving = false;

    this.characterName = "Vô Danh Cổ Sư";
    this.appearance = normalizeAppearance(null);
    this.characterSheets = getCharacterSheets(this.appearance);

    this.baseMaxHp = 180;
    this.baseMaxMp = 100;
    this.baseMpRegen = 7.2;

    this.maxHp = 180;
    this.hp = 180;
    this.maxMp = 100;
    this.mp = 100;
    this.mpRegen = 7.2;

    this.pathInfo = computeCultivationPath([]);
    this.totalLifesteal = 0;
    this.firePoisonBonus = 0;
    this.allDmgBonus = 0;
    this.cooldownMult = 1.0;

    this.corruption = 0;
    this.tauHoaTimer = 0;
    this.tauHoaTickTimer = 0;
    this.passiveDrainTick = 0;

    this.invulnTimer = 0;
    this.hurtTimer = 0;
    this.dashTimer = 0;
    this.dashVx = 0;
    this.dashVy = 0;
    this.dashGu = null;
    this.dashSpikeTick = 0;
    this.deathTimer = 0;
    this.isDead = false;

    this.animState = "idle";
    this.animTime = 0;

    this.bag = [];
    this.equipped = {
      passive: null,
      skill1: null,
      skill2: null,
      move: null,
      ult: null,
    };

    this.unlockedRecipes = new Set();
    this.kills = 0;

    this.applyCharacterSetup(charData);
  }

  setAppearance(rawAppearance) {
    this.appearance = normalizeAppearance(rawAppearance);
    this.characterSheets = getCharacterSheets(this.appearance);
  }

  applyCharacterSetup(charData = null) {
    this.characterName = charData?.name ?? "Vô Danh Cổ Sư";
    this.setAppearance(charData?.appearance);
    this.unlockedRecipes = new Set(charData?.unlocked_recipes ?? []);

    if (Array.isArray(charData?.saved_bag) && charData.saved_bag.length > 0) {
      this.bag = charData.saved_bag.map((g) => ({ ...g }));
      this.equipped = {
        passive: null,
        skill1: null,
        skill2: null,
        move: null,
        ult: null,
        ...(charData.saved_equipped ?? {}),
      };
    } else {
      // Khởi tạo túi 6 Cổ Trùng Nhất Chuyển, ưu tiên Cổ ưa thích đầu tiên vào Chủ Động 1
      const fav = STARTER_GU_IDS.includes(charData?.starterGuId)
        ? charData.starterGuId
        : "nguyet_quang";

      const initPassive = createGuInstance("thiet_cot");
      const initMove = createGuInstance("anh_bo");
      const activePool = ["nguyet_quang", "huyet_nha", "thanh_doc", "hoa_than"];
      const orderedActives = [fav, ...activePool.filter((id) => id !== fav)];

      const s1 = createGuInstance(orderedActives[0]);
      const s2 = createGuInstance(orderedActives[1]);
      const ult = createGuInstance(orderedActives[2]);
      const spare = createGuInstance(orderedActives[3]);

      this.bag = [initPassive, s1, s2, initMove, ult, spare];
      this.equipped = {
        passive: initPassive.uid,
        skill1: s1.uid,
        skill2: s2.uid,
        move: initMove.uid,
        ult: ult.uid,
      };
    }

    this.recalculatePathStats(true);
  }

  recalculatePathStats(refillVitals = false) {
    const equippedList = this.getAllEquipped();
    this.pathInfo = computeCultivationPath(equippedList);
    const pb = this.pathInfo.bonuses ?? {};

    let hpBonus = pb.maxHp ?? 0;
    let mpBonus = pb.maxMp ?? 0;
    let regenBonus = pb.mpRegen ?? 0;
    let lifesteal = pb.lifesteal ?? 0;
    let firePoison = pb.firePoisonDmg ?? 0;
    let cdMod = pb.cooldownMod ?? 0;

    for (const g of equippedList) {
      if (g.maxHpBonus) hpBonus += g.maxHpBonus;
      if (g.mpRegenBonus) regenBonus += g.mpRegenBonus;
      if (g.globalLifesteal) lifesteal += g.globalLifesteal;
      if (g.firePoisonBonus) firePoison += g.firePoisonBonus;
      if (g.cooldownMod) cdMod += g.cooldownMod;
    }

    const prevMaxHp = this.maxHp || 180;
    const hpRatio = prevMaxHp > 0 ? this.hp / prevMaxHp : 1;

    this.maxHp = Math.max(100, Math.round(this.baseMaxHp + hpBonus));
    this.maxMp = Math.max(60, Math.round(this.baseMaxMp + mpBonus));
    this.mpRegen = Number((this.baseMpRegen + regenBonus).toFixed(2));
    this.totalLifesteal = Number(Math.min(0.45, lifesteal).toFixed(2));
    this.firePoisonBonus = Number(firePoison.toFixed(2));
    this.allDmgBonus = pb.allDmg ?? 0;
    this.cooldownMult = Math.max(0.55, Number((1 + cdMod).toFixed(2)));

    if (refillVitals) {
      this.hp = this.maxHp;
      this.mp = this.maxMp;
    } else {
      this.hp = Math.min(this.maxHp, Math.max(1, Math.round(this.maxHp * hpRatio)));
      this.mp = Math.min(this.maxMp, this.mp);
    }
  }

  restoreFromSnapshot(snap, unlockedRecipes = [], charData = null) {
    if (charData) this.applyCharacterSetup(charData);
    if (!snap) return;
    if (snap.appearance) {
      this.setAppearance(snap.appearance);
    }
    if (Array.isArray(snap.bag) && snap.bag.length > 0) {
      this.bag = snap.bag.map((g) => ({ ...g }));
    }
    if (snap.equipped) {
      this.equipped = { ...this.equipped, ...snap.equipped };
    }
    if (Array.isArray(unlockedRecipes)) {
      this.unlockedRecipes = new Set(unlockedRecipes);
    }
    this.recalculatePathStats(false);
    this.hp = Math.max(1, Math.min(this.maxHp, snap.hp ?? this.maxHp));
    this.mp = Math.max(0, Math.min(this.maxMp, snap.mp ?? this.maxMp));
    this.corruption = Math.max(0, Math.min(99, snap.corruption ?? 0));
    this.kills = snap.kills ?? 0;
  }

  getGu(uid) {
    return this.bag.find((g) => g.uid === uid) ?? null;
  }

  getEquippedGu(slotId) {
    return this.getGu(this.equipped[slotId]);
  }

  getAllEquipped() {
    return ["passive", "skill1", "skill2", "move", "ult"]
      .map((s) => this.getEquippedGu(s))
      .filter(Boolean);
  }

  getEquippedSummary() {
    return this.getAllEquipped().map((g) => ({
      name: g.name,
      shortLabel: g.shortLabel,
      tier: g.tier ?? 1,
      element: g.element,
      color: g.color,
    }));
  }

  getEquippedSlotOf(uid) {
    for (const [slot, eqUid] of Object.entries(this.equipped)) {
      if (eqUid === uid) return slot;
    }
    return null;
  }

  equipGu(slotId, uid) {
    const prevSlot = this.getEquippedSlotOf(uid);
    if (prevSlot && prevSlot !== slotId) {
      const oldUid = this.equipped[slotId];
      this.equipped[prevSlot] = oldUid;
    }
    this.equipped[slotId] = uid;
    this.recalculatePathStats(false);
  }

  addGu(gu) {
    this.bag.push(gu);
    return gu;
  }

  removeGu(uid) {
    for (const slot of Object.keys(this.equipped)) {
      if (this.equipped[slot] === uid) {
        this.equipped[slot] = null;
      }
    }
    this.bag = this.bag.filter((g) => g.uid !== uid);
    this.recalculatePathStats(false);
  }

  getMoveSpeed() {
    let mult = 1 + (this.pathInfo.bonuses?.speed ?? 0);
    for (const g of this.getAllEquipped()) {
      if (g.speedMod) mult += g.speedMod;
    }
    return this.baseSpeed * Math.max(0.58, mult);
  }

  getArmorRatio() {
    let armor = this.pathInfo.bonuses?.armor ?? 0;
    for (const g of this.getAllEquipped()) {
      if (g.armorBonus) armor += g.armorBonus;
    }
    return Math.min(0.68, armor);
  }

  getDamageMultiplier(gu = null) {
    let mult = (this.corruption >= 50 || this.tauHoaTimer > 0 ? 1.25 : 1.0) + (this.allDmgBonus ?? 0);
    if (gu && (this.firePoisonBonus ?? 0) > 0) {
      const el = String(gu.element ?? "");
      if (el.includes("Viêm") || el.includes("Độc")) {
        mult += this.firePoisonBonus;
      }
    }
    return mult;
  }

  getIncomingDamageMultiplier() {
    return this.corruption >= 50 || this.tauHoaTimer > 0 ? 1.15 : 1.0;
  }

  blocksNormalHeal() {
    return this.getAllEquipped().some((g) => g.blocksNormalHeal);
  }

  addCorruption(amount, events) {
    if (amount <= 0 || this.tauHoaTimer > 0 || this.isDead) return;
    this.corruption = Math.min(100, this.corruption + amount);
    if (this.corruption >= 100) {
      this.tauHoaTimer = 5.0;
      this.tauHoaTickTimer = 0.2;
      events?.onTauHoaStart?.();
    }
  }

  paySkillCost(gu, events) {
    const mpNeed = gu.mpCost ?? 0;
    if (this.mp >= mpNeed) {
      this.mp -= mpNeed;
    } else {
      const deficit = mpNeed - this.mp;
      this.mp = 0;
      const hpPenalty = Math.ceil(deficit * 1.4);
      this.hp = Math.max(1, this.hp - hpPenalty);
      this.addCorruption(4, events);
      events?.onFloatingText?.(this.x, this.y - 24, `Huyết Tế -${hpPenalty}`, "#ff3855");
    }

    if (gu.hpCostPct > 0) {
      const sac = Math.max(1, Math.round(this.maxHp * gu.hpCostPct));
      this.hp = Math.max(1, this.hp - sac);
    }

    const gain = gu.corruptionGain ?? 0;
    this.addCorruption(gain, events);
  }

  heal(amount, isNormalItem = false) {
    if (this.isDead || amount <= 0) return 0;
    if (isNormalItem && this.blocksNormalHeal()) {
      return 0;
    }
    const before = this.hp;
    this.hp = Math.min(this.maxHp, this.hp + amount);
    return Math.round(this.hp - before);
  }

  takeDamage(rawAmount, events) {
    if (this.isDead || this.invulnTimer > 0 || this.dashTimer > 0) return 0;
    const armor = this.getArmorRatio();
    const corMult = this.getIncomingDamageMultiplier();
    const dmg = Math.max(1, Math.round(rawAmount * (1 - armor) * corMult));
    this.hp = Math.max(0, this.hp - dmg);
    this.invulnTimer = 0.35;
    this.hurtTimer = 0.32;

    events?.onFloatingText?.(this.x, this.y - 22, `-${dmg}`, "#ff4a66");
    events?.onHurt?.(dmg);

    if (this.hp <= 0) {
      this.isDead = true;
      this.deathTimer = 0;
      events?.onDeath?.();
    }
    return dmg;
  }

  update(dt, { moveVec, inCorruptionZone = false, zoneMult = 1, safeZone = false }, events) {
    this.animTime += dt;

    if (this.isDead) {
      this.deathTimer += dt;
      this.animState = "death";
      return;
    }

    if (this.invulnTimer > 0) this.invulnTimer = Math.max(0, this.invulnTimer - dt);
    if (this.hurtTimer > 0) this.hurtTimer = Math.max(0, this.hurtTimer - dt);

    if (safeZone) {
      // Ở Vạn Cổ Thành (khu an toàn online): tự hồi đầy HP/MP, thanh tẩy Phản Phệ
      this.hp = Math.min(this.maxHp, this.hp + this.maxHp * 0.25 * dt);
      this.mp = Math.min(this.maxMp, this.mp + this.maxMp * 0.35 * dt);
      this.corruption = Math.max(0, this.corruption - 15 * dt);
      this.tauHoaTimer = 0;
    } else {
      this.mp = Math.min(this.maxMp, this.mp + this.mpRegen * dt);

      let passiveCorRate = 0;
      for (const g of this.getAllEquipped()) {
        if (g.tier >= 2) passiveCorRate += 0.35;
        if (g.passiveCorruptionRate) passiveCorRate += g.passiveCorruptionRate;
      }
      if (inCorruptionZone) {
        passiveCorRate = Math.max(2.5, passiveCorRate * zoneMult + 2.5);
      }
      if (passiveCorRate > 0 && this.tauHoaTimer <= 0) {
        this.addCorruption(passiveCorRate * dt, events);
      } else if (!inCorruptionZone && this.tauHoaTimer <= 0 && this.corruption > 0) {
        const hasHighTier = this.getAllEquipped().some((g) => g.tier >= 2 || g.isMutated);
        if (!hasHighTier) {
          this.corruption = Math.max(0, this.corruption - 0.6 * dt);
        }
      }

      if (this.tauHoaTimer > 0) {
        this.tauHoaTimer -= dt;
        this.tauHoaTickTimer -= dt;
        if (this.tauHoaTickTimer <= 0) {
          this.tauHoaTickTimer = 0.5;
          const burn = Math.max(2, Math.round(this.maxHp * 0.025));
          this.hp = Math.max(1, this.hp - burn);
          events?.onFloatingText?.(this.x, this.y - 24, `Tẩu Hỏa -${burn}`, "#d45eff");
        }
        if (this.tauHoaTimer <= 0) {
          this.tauHoaTimer = 0;
          this.corruption = 0;
          events?.onFloatingText?.(this.x, this.y - 26, "Phản Phệ Quy Linh", "#4de6b0");
        }
      }

      const hasBloodMoon = this.getAllEquipped().some((g) => (g.passiveHpDrainPct ?? 0) > 0);
      if (hasBloodMoon) {
        this.passiveDrainTick += dt;
        if (this.passiveDrainTick >= 1.0) {
          this.passiveDrainTick -= 1.0;
          const minFloor = Math.max(1, Math.round(this.maxHp * 0.05));
          if (this.hp > minFloor) {
            const drain = Math.max(1, Math.round(this.maxHp * 0.01));
            this.hp = Math.max(minFloor, this.hp - drain);
          }
        }
      }
    }

    if (this.dashTimer > 0) {
      this.dashTimer = Math.max(0, this.dashTimer - dt);
      this.x += this.dashVx * dt;
      this.y += this.dashVy * dt;
      this.moving = true;
    } else {
      this.moving = moveVec.magnitude > 0;
      if (this.moving) {
        this.facing = moveVec.angle;
        const spd = this.getMoveSpeed();
        this.x += moveVec.x * spd * dt;
        this.y += moveVec.y * spd * dt;
      }
    }

    if (this.tauHoaTimer > 0) this.animState = "tau-hoa";
    else if (this.dashTimer > 0) this.animState = "dash";
    else if (this.hurtTimer > 0) this.animState = "hurt";
    else if (this.moving) this.animState = "run";
    else this.animState = "idle";
  }
}
