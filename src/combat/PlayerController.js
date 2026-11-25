import { createGuInstance } from "./GuDatabase.js";

/**
 * Trạng thái nhân vật Cổ Sư:
 * - Hệ thống Không Khiếu (5 ô: passive, skill1, skill2, move, ult) + Cổ Nang.
 * - 3 Chỉ số sống còn: Huyết Khí (HP), Chân Nguyên (MP), Độ Phản Phệ (0..100%).
 * - Mốc Phản Phệ >= 50%: +25% sát thương gây ra, +15% sát thương nhận vào.
 * - Mốc Phản Phệ 100%: Tẩu Hỏa Nhập Ma 5s (mất máu liên tục mỗi giây, sau đó reset về 0%).
 */
export class PlayerController {
  constructor() {
    this.x = 288;
    this.y = 220;
    this.radius = 8;
    this.baseSpeed = 80;
    this.facing = 0;
    this.moving = false;

    this.maxHp = 180;
    this.hp = 180;
    this.maxMp = 100;
    this.mp = 100;
    this.mpRegen = 7.0;

    this.corruption = 0; // 0 .. 100
    this.tauHoaTimer = 0; // > 0 khi đang Tẩu Hỏa Nhập Ma (5s)
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

    // 6 Cổ Trùng Nhất Chuyển khởi đầu + 5 ô Không Khiếu
    const initPassive = createGuInstance("thiet_cot");
    const initS1 = createGuInstance("nguyet_quang");
    const initS2 = createGuInstance("thanh_doc");
    const initMove = createGuInstance("anh_bo");
    const initUlt = createGuInstance("hoa_than");
    const initSpare = createGuInstance("huyet_nha");

    this.bag = [initPassive, initS1, initS2, initMove, initUlt, initSpare];
    this.equipped = {
      passive: initPassive.uid,
      skill1: initS1.uid,
      skill2: initS2.uid,
      move: initMove.uid,
      ult: initUlt.uid,
    };

    this.unlockedRecipes = new Set();
    this.kills = 0;
  }

  restoreFromSnapshot(snap, unlockedRecipes = []) {
    if (!snap) return;
    this.maxHp = snap.maxHp ?? 180;
    this.hp = Math.max(1, Math.min(this.maxHp, snap.hp ?? this.maxHp));
    this.maxMp = snap.maxMp ?? 100;
    this.mp = Math.max(0, Math.min(this.maxMp, snap.mp ?? this.maxMp));
    this.corruption = Math.max(0, Math.min(99, snap.corruption ?? 0));
    this.kills = snap.kills ?? 0;

    if (Array.isArray(snap.bag) && snap.bag.length > 0) {
      this.bag = snap.bag.map((g) => ({ ...g }));
    }
    if (snap.equipped) {
      this.equipped = { ...this.equipped, ...snap.equipped };
    }
    if (Array.isArray(unlockedRecipes)) {
      this.unlockedRecipes = new Set(unlockedRecipes);
    }
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

  getEquippedSlotOf(uid) {
    for (const [slot, eqUid] of Object.entries(this.equipped)) {
      if (eqUid === uid) return slot;
    }
    return null;
  }

  equipGu(slotId, uid) {
    const prevSlot = this.getEquippedSlotOf(uid);
    if (prevSlot && prevSlot !== slotId) {
      // Hoán đổi nếu cùng nhóm
      const oldUid = this.equipped[slotId];
      this.equipped[prevSlot] = oldUid;
    }
    this.equipped[slotId] = uid;
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
  }

  getMoveSpeed() {
    let mult = 1;
    for (const g of this.getAllEquipped()) {
      if (g.speedMod) mult += g.speedMod;
    }
    return this.baseSpeed * Math.max(0.55, mult);
  }

  getArmorRatio() {
    let armor = 0;
    for (const g of this.getAllEquipped()) {
      if (g.armorBonus) armor += g.armorBonus;
    }
    return Math.min(0.65, armor);
  }

  getDamageMultiplier() {
    return this.corruption >= 50 || this.tauHoaTimer > 0 ? 1.25 : 1.0;
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

  /**
   * Trừ MP khi thi triển chiêu; nếu cạn MP tự động trừ thẳng vào HP (Huyết Tế).
   */
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

  update(dt, { moveVec, inCorruptionZone = false, zoneMult = 1 }, events) {
    this.animTime += dt;

    if (this.isDead) {
      this.deathTimer += dt;
      this.animState = "death";
      return;
    }

    if (this.invulnTimer > 0) this.invulnTimer = Math.max(0, this.invulnTimer - dt);
    if (this.hurtTimer > 0) this.hurtTimer = Math.max(0, this.hurtTimer - dt);

    // Hồi Chân Nguyên chậm
    this.mp = Math.min(this.maxMp, this.mp + this.mpRegen * dt);

    // Độ phản phệ từ trang bị cấp cao / Dị Cổ / vùng tà trận Boss
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
      // Giảm nhẹ tự nhiên khi đứng ngoài vùng ô nhiễm và chỉ mang Nhất Chuyển
      const hasHighTier = this.getAllEquipped().some((g) => g.tier >= 2 || g.isMutated);
      if (!hasHighTier) {
        this.corruption = Math.max(0, this.corruption - 0.6 * dt);
      }
    }

    // Mốc 100%: Tẩu Hỏa Nhập Ma trong 5 giây -> mất máu liên tục -> reset 0%
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

    // Đánh đổi Huyết Nguyệt Cổ: đốt 1% Max HP/giây khi mang
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

    // Di chuyển / Dash
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

    // Chọn sprite state
    if (this.tauHoaTimer > 0) this.animState = "tau-hoa";
    else if (this.dashTimer > 0) this.animState = "dash";
    else if (this.hurtTimer > 0) this.animState = "hurt";
    else if (this.moving) this.animState = "run";
    else this.animState = "idle";
  }
}
