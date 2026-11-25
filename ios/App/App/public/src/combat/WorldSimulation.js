import { GAME_HEIGHT, GAME_WIDTH, PALETTE } from "../config/constants.js";
import { drawSheetFrame, getSheetFrameIndex } from "../engine/SpriteSheet.js";
import { createGuInstance } from "./GuDatabase.js";
import { ENEMY_TYPES, FLOOR_DEFS, WORLD_HEIGHT, WORLD_WIDTH } from "./FloorConfig.js";

const STARTER_POOL = ["nguyet_quang", "huyet_nha", "thanh_doc", "thiet_cot", "anh_bo", "hoa_than"];

/**
 * Toàn bộ mô phỏng chiến đấu thời gian thực:
 * - Bản đồ 576x352 theo từng Tầng (Đợt quái -> Trạm Luyện Cổ -> Boss -> Cổng sang tầng).
 * - Tương tác nguyên tố (Viêm kích nổ Vũng Độc), 3 Boss với cơ chế khắc chế riêng.
 * - Hệ thống đạn, AoE, gai xương, phân thân, hiệu ứng VFX pixelfx.
 */
export class WorldSimulation {
  constructor({ player, assets, sfx, account, onStateChange }) {
    this.player = player;
    this.assets = assets;
    this.sfx = sfx;
    this.account = account;
    this.onStateChange = onStateChange;

    this.floorNumber = 1;
    this.phase = "waves"; // "waves" | "cauldron" | "boss" | "floor_clear" | "victory" | "gameover"
    this.waveIndex = 0;

    this.time = 0;
    this.hitStopTimer = 0;
    this.shakeTimer = 0;
    this.shakeAmp = 0;
    this.camera = { x: 0, y: 0 };

    this.cauldron = { x: WORLD_WIDTH * 0.5, y: WORLD_HEIGHT * 0.5, radius: 22, active: false };
    this.portal = { x: WORLD_WIDTH * 0.5, y: 64, radius: 20, active: false };

    this.hazards = [];
    this.obstacles = [];
    this.enemies = [];
    this.boss = null;
    this.playerProjectiles = [];
    this.enemyProjectiles = [];
    this.zones = [];
    this.decoys = [];
    this.pickups = [];
    this.energyCores = [];
    this.vfxEffects = [];
    this.floatingTexts = [];
    this.telegraphs = [];

    this.loadFloor(1);
  }

  getFloorDef() {
    return FLOOR_DEFS[this.floorNumber];
  }

  loadFloor(num) {
    this.floorNumber = num;
    const def = FLOOR_DEFS[num];
    this.phase = "waves";
    this.waveIndex = 0;

    this.player.x = WORLD_WIDTH * 0.5;
    this.player.y = WORLD_HEIGHT - 56;
    this.player.dashTimer = 0;

    this.hazards = def.hazards.map((h) => ({ ...h, cooldown: 0, activeTimer: 0, warnTimer: 0 }));
    this.obstacles = def.obstacles.map((o) => ({ ...o }));
    this.enemies = [];
    this.boss = null;
    this.playerProjectiles = [];
    this.enemyProjectiles = [];
    this.zones = [];
    this.decoys = [];
    this.pickups = [];
    this.energyCores = [];
    this.vfxEffects = [];
    this.telegraphs = [];

    this.cauldron.active = false;
    this.portal.active = false;

    this._spawnWave(0);
    this.onStateChange?.();
  }

  restoreFromSnapshot(snap) {
    if (!snap) return;
    const floorNum = Math.min(3, Math.max(1, Number(snap.floorNumber ?? 1)));
    this.floorNumber = floorNum;
    const def = FLOOR_DEFS[floorNum];
    this.phase = snap.phase || "waves";
    this.waveIndex = Math.max(0, Math.min(def.waves.length - 1, Number(snap.waveIndex ?? 0)));

    this.player.x = WORLD_WIDTH * 0.5;
    this.player.y = WORLD_HEIGHT - 56;
    this.player.dashTimer = 0;

    this.hazards = def.hazards.map((h) => ({ ...h, cooldown: 0, activeTimer: 0, warnTimer: 0 }));
    this.obstacles = def.obstacles.map((o) => ({ ...o }));
    this.enemies = [];
    this.boss = null;
    this.playerProjectiles = [];
    this.enemyProjectiles = [];
    this.zones = [];
    this.decoys = [];
    this.pickups = [];
    this.energyCores = [];
    this.vfxEffects = [];
    this.telegraphs = [];

    this.cauldron.active = this.phase === "cauldron";
    this.portal.active = this.phase === "floor_clear";

    if (this.phase === "waves") {
      this._spawnWave(this.waveIndex);
    }
    this.addFloatingText(this.player.x, this.player.y - 28, "Khôi Phục Hành Trình!", "#4de6b0");
    this.onStateChange?.();
  }

  _spawnWave(idx) {
    const def = this.getFloorDef();
    const groups = def.waves[idx] ?? [];
    for (const grp of groups) {
      for (let i = 0; i < grp.count; i++) {
        this._spawnEnemy(grp.type);
      }
    }
    this.addFloatingText(this.player.x, this.player.y - 28, `${def.name} · Đợt ${idx + 1}`, "#d6b16a");
  }

  _spawnEnemy(typeId, customPos = null) {
    const tpl = ENEMY_TYPES[typeId];
    if (!tpl) return null;

    let x = customPos?.x;
    let y = customPos?.y;
    if (x === undefined || y === undefined) {
      const edge = Math.floor(Math.random() * 4);
      if (edge === 0) {
        x = 48 + Math.random() * (WORLD_WIDTH - 96);
        y = 44;
      } else if (edge === 1) {
        x = WORLD_WIDTH - 48;
        y = 48 + Math.random() * (WORLD_HEIGHT - 96);
      } else if (edge === 2) {
        x = 48 + Math.random() * (WORLD_WIDTH - 96);
        y = WORLD_HEIGHT - 44;
      } else {
        x = 48;
        y = 48 + Math.random() * (WORLD_HEIGHT - 96);
      }
    }

    const scaleHp = 1 + (this.floorNumber - 1) * 0.12;
    const enemy = {
      id: `e_${Math.random().toString(36).slice(2, 8)}`,
      typeId,
      ...tpl,
      maxHp: Math.round(tpl.hp * scaleHp),
      hp: Math.round(tpl.hp * scaleHp),
      x,
      y,
      vx: 0,
      vy: 0,
      facingLeft: false,
      animTime: Math.random() * 2,
      aiTimer: 0.6 + Math.random() * 1.1,
      chargeTimer: 0,
      chargeVx: 0,
      chargeVy: 0,
      poisonTimer: 0,
      poisonDps: 0,
      slowTimer: 0,
      slowFactor: 0,
      stunTimer: 0,
      hurtFlash: 0,
    };
    this.enemies.push(enemy);
    return enemy;
  }

  summonBossNow() {
    if (this.phase !== "cauldron") return;
    this.cauldron.active = false;
    this.phase = "boss";
    this.enemies = [];
    this.enemyProjectiles = [];
    this.zones = [];
    this.telegraphs = [];

    const def = this.getFloorDef();
    if (def.bossId === "ngo_cong") {
      // Tầng 1: Bách Độc Ngô Công Vương với 6 đốt thân phát sáng xanh
      const bx = WORLD_WIDTH * 0.5;
      const by = 92;
      const segments = [];
      for (let i = 0; i < 6; i++) {
        segments.push({
          index: i,
          x: bx,
          y: by - (i + 1) * 14,
          hp: 48,
          maxHp: 48,
          alive: true,
          radius: 9,
        });
      }
      this.boss = {
        id: "ngo_cong",
        name: def.bossName,
        x: bx,
        y: by,
        radius: 16,
        hp: 420,
        maxHp: 420,
        angle: Math.PI * 0.5,
        speed: 52,
        state: "roam", // roam | burrow_warn | burrow_hide | coil | spray
        stateTimer: 2.2,
        coilRadius: 0,
        segments,
        hurtFlash: 0,
        stunTimer: 0,
        animTime: 0,
      };
    } else if (def.bossId === "mac_vo_tam") {
      // Tầng 2: Thi Khôi Cổ Sư Mạc Vô Tâm
      this.boss = {
        id: "mac_vo_tam",
        name: def.bossName,
        x: WORLD_WIDTH * 0.5,
        y: 96,
        radius: 16,
        hp: 560,
        maxHp: 560,
        state: "cast", // cast | spikes | corruption_zone | summoning | stunned
        stateTimer: 1.8,
        summonShield: 0,
        summonMaxShield: 110,
        stunTimer: 0,
        hurtFlash: 0,
        animTime: 0,
      };
    } else {
      // Tầng 3: Vạn Cổ Tà Lô (4 chân xoay được)
      const bx = WORLD_WIDTH * 0.5;
      const by = WORLD_HEIGHT * 0.5;
      const legs = [0, 1, 2, 3].map((i) => ({
        index: i,
        angleOffset: (i * Math.PI) / 2 + Math.PI / 4,
        hp: 75,
        maxHp: 75,
        alive: true,
        radius: 8,
        x: bx,
        y: by,
      }));
      this.boss = {
        id: "van_co_ta_lo",
        name: def.bossName,
        x: bx,
        y: by,
        radius: 22,
        hp: 760,
        maxHp: 760,
        state: "spin_fire", // spin_fire | suction | closed_shell | core_exposed | stunned
        stateTimer: 3.4,
        rotAngle: 0,
        fireTick: 0,
        legs,
        exposedTimer: 0,
        stunTimer: 0,
        hurtFlash: 0,
        animTime: 0,
      };
    }

    this.addFloatingText(this.boss.x, this.boss.y - 30, this.boss.name, "#ff5c7a");
    this.sfx?.play("ult");
    this.onStateChange?.();
  }

  goToNextFloor() {
    if (this.phase !== "floor_clear") return;
    if (this.floorNumber < 3) {
      this.loadFloor(this.floorNumber + 1);
    }
  }

  getNearbyInteractable() {
    if (this.phase === "cauldron" && this.cauldron.active) {
      const dCauldron = Math.hypot(this.player.x - this.cauldron.x, this.player.y - this.cauldron.y);
      return {
        nearCauldron: dCauldron <= 44,
        canSummonBoss: true,
      };
    }
    if (this.phase === "floor_clear" && this.portal.active) {
      const dPortal = Math.hypot(this.player.x - this.portal.x, this.player.y - this.portal.y);
      return { nearPortal: dPortal <= 42 };
    }
    return {};
  }

  castSkill({ slotId, angle, distanceRatio }) {
    if (this.player.isDead) return false;
    const gu = this.player.getEquippedGu(slotId);
    if (!gu) return false;

    this.player.facing = angle;
    const events = this._playerEvents();
    this.player.paySkillCost(gu, events);

    const dmgScale = this.player.getDamageMultiplier();
    const ox = this.player.x;
    const oy = this.player.y - 8;

    if (gu.aimType === "dash") {
      // Di Chuyển Cổ: Ảnh Bộ Cổ hoặc Bạch Cốt Độn Cổ
      const dist = gu.range * Math.max(0.65, distanceRatio);
      const dashDur = 0.17;
      this.player.dashTimer = dashDur;
      this.player.dashVx = (Math.cos(angle) * dist) / dashDur;
      this.player.dashVy = (Math.sin(angle) * dist) / dashDur;
      this.player.dashGu = gu;
      this.player.dashSpikeTick = 0;

      if (gu.decoyDuration) {
        this.decoys.push({
          x: ox,
          y: this.player.y,
          life: gu.decoyDuration,
          maxLife: gu.decoyDuration,
          damage: Math.round((gu.damage ?? 18) * dmgScale),
        });
      }

      this.spawnVfx(gu.vfxKey ?? "vfx/anh-bo", ox, this.player.y, { scale: 0.75 });
      this.sfx?.play("dash");
      return true;
    }

    if (gu.baseId === "huyet_nha") {
      // 3 giọt máu bay đuổi
      const count = gu.projectileCount ?? 3;
      for (let i = 0; i < count; i++) {
        const spread = (i - 1) * 0.28;
        const a = angle + spread;
        this.playerProjectiles.push({
          kind: "homing",
          gu,
          x: ox + Math.cos(a) * 8,
          y: oy + Math.sin(a) * 8,
          vx: Math.cos(a) * 145,
          vy: Math.sin(a) * 145,
          speed: 150,
          radius: gu.radius ?? 7,
          damage: Math.round(gu.damage * dmgScale),
          pierceLeft: 1,
          hitIds: new Set(),
          life: 1.5,
          homing: true,
          lifesteal: gu.lifesteal ?? 0,
          color: gu.color,
          vfxKey: gu.vfxKey,
          animTime: i * 0.1,
        });
      }
      this.sfx?.play("blood");
      return true;
    }

    if (gu.aimType === "line") {
      // Nguyệt Quang Cổ / Tàn Cổ: tia xuyên mục tiêu
      const speed = 210;
      this.playerProjectiles.push({
        kind: "beam",
        gu,
        x: ox + Math.cos(angle) * 10,
        y: oy + Math.sin(angle) * 10,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        speed,
        angle,
        radius: gu.radius ?? 10,
        damage: Math.round(gu.damage * dmgScale),
        pierceLeft: gu.pierce ?? 1,
        hitIds: new Set(),
        life: (gu.range ?? 110) / speed + 0.08,
        color: gu.color,
        vfxKey: gu.vfxKey,
        animTime: 0,
      });
      this.spawnVfx(gu.vfxKey ?? "vfx/nguyet-quang", ox + Math.cos(angle) * 18, oy + Math.sin(angle) * 18, {
        angle,
        scale: 0.6,
      });
      this.sfx?.play("slash");
      return true;
    }

    if (gu.aimType === "arc") {
      // Thanh Độc Trùng (nón độc) hoặc Huyết Nguyệt Cổ (trăng khuyết đỏ diện rộng)
      const range = gu.range ?? 96;
      const spread = gu.arcSpread ?? Math.PI * 0.45;
      const dmg = Math.round(gu.damage * dmgScale);

      this.spawnVfx(gu.vfxKey, ox + Math.cos(angle) * 24, oy + Math.sin(angle) * 24, {
        angle,
        scale: gu.tier >= 2 ? 0.95 : 0.72,
      });
      this.sfx?.play(gu.tier >= 2 ? "ult" : "poison");
      if (gu.tier >= 2) this.triggerShake(0.18, 3);

      this._damageInCone(ox, oy, angle, spread, range, dmg, gu);
      return true;
    }

    if (gu.aimType === "aoe") {
      // Hỏa Thán Cổ hoặc Chướng Khí Bộc Cổ
      const dist = Math.max(18, (gu.range ?? 98) * Math.max(0.28, distanceRatio));
      const tx = Math.max(24, Math.min(WORLD_WIDTH - 24, ox + Math.cos(angle) * dist));
      const ty = Math.max(24, Math.min(WORLD_HEIGHT - 24, oy + Math.sin(angle) * dist));
      const radius = gu.radius ?? 30;
      const dmg = Math.round(gu.damage * dmgScale);

      this.spawnVfx(gu.vfxKey ?? "vfx/hoa-than", tx, ty, { scale: gu.tier >= 2 ? 0.65 : 0.55 });
      this.sfx?.play("fire");
      this.triggerShake(0.16, gu.tier >= 2 ? 3.5 : 2.2);

      this._damageInCircle(tx, ty, radius, dmg, gu);

      if (gu.ignitesPoison) {
        this._ignitePoisonPools(tx, ty, radius + 12, dmgScale);
      }

      if (gu.zoneDuration) {
        this.zones.push({
          kind: "player_fire",
          x: tx,
          y: ty,
          radius: radius * 0.95,
          life: gu.zoneDuration,
          dps: Math.round((gu.zoneDps ?? 18) * dmgScale),
          tick: 0,
          color: gu.color,
        });
      }
      return true;
    }

    return false;
  }

  _ignitePoisonPools(x, y, radius, dmgScale) {
    for (const h of this.hazards) {
      if (h.kind !== "poison_pool" || h.cooldown > 0) continue;
      if (Math.hypot(h.x - x, h.y - y) <= radius + h.r) {
        h.cooldown = 6.0;
        const blastDmg = Math.round(92 * dmgScale);
        this.spawnVfx("vfx/hoa-than", h.x, h.y, { scale: 0.72 });
        this.addFloatingText(h.x, h.y - 18, "ĐỘC BẠO!", "#ff9933");
        this.triggerShake(0.24, 4);
        this._damageInCircle(h.x, h.y, h.r + 30, blastDmg, { element: "Viêm", baseId: "poison_blast" });
      }
    }
  }

  _damageInCone(ox, oy, angle, spread, range, dmg, gu) {
    const half = spread * 0.5;
    const hitTargets = [];

    const checkPoint = (tx, ty, tr) => {
      const dx = tx - ox;
      const dy = ty - oy;
      const d = Math.hypot(dx, dy);
      if (d > range + tr) return false;
      if (d < 10) return true;
      const diff = Math.abs(Math.atan2(Math.sin(Math.atan2(dy, dx) - angle), Math.cos(Math.atan2(dy, dx) - angle)));
      return diff <= half;
    };

    for (const e of this.enemies) {
      if (checkPoint(e.x, e.y, e.radius)) {
        this._hitEnemy(e, dmg, gu);
        hitTargets.push(e);
      }
    }
    this._checkBossHit((tx, ty, tr) => checkPoint(tx, ty, tr), dmg, gu);

    if (hitTargets.length > 0 && gu.lifesteal) {
      const healAmt = Math.max(1, Math.round(dmg * hitTargets.length * gu.lifesteal * 0.5));
      const healed = this.player.heal(healAmt, false);
      if (healed > 0) this.addFloatingText(this.player.x, this.player.y - 24, `+${healed}`, "#4de6b0");
    }
  }

  _damageInCircle(cx, cy, radius, dmg, gu) {
    for (const e of this.enemies) {
      if (Math.hypot(e.x - cx, e.y - cy) <= radius + e.radius) {
        this._hitEnemy(e, dmg, gu);
      }
    }
    this._checkBossHit((tx, ty, tr) => Math.hypot(tx - cx, ty - cy) <= radius + tr, dmg, gu);
  }

  _hitEnemy(enemy, rawDmg, gu) {
    const armor = enemy.armor ?? 0;
    const dmg = Math.max(1, Math.round(rawDmg * (1 - armor)));
    enemy.hp -= dmg;
    enemy.hurtFlash = 0.14;

    if (gu.poisonDps) {
      enemy.poisonDps = Math.max(enemy.poisonDps, gu.poisonDps);
      enemy.poisonTimer = Math.max(enemy.poisonTimer, gu.poisonDuration ?? 3);
    }
    if (gu.slowFactor) {
      enemy.slowFactor = Math.max(enemy.slowFactor, gu.slowFactor);
      enemy.slowTimer = Math.max(enemy.slowTimer, 2.8);
    }
    if (gu.stunDuration) {
      enemy.stunTimer = Math.max(enemy.stunTimer, gu.stunDuration);
    }

    this.spawnVfx("vfx/hit-spark", enemy.x, enemy.y - 6, { scale: 0.45 });
    this.addFloatingText(enemy.x, enemy.y - 16, `-${dmg}`, "#ffe082");
    this.sfx?.play("hit");
  }

  _checkBossHit(predicate, rawDmg, gu) {
    const b = this.boss;
    if (!b || b.hp <= 0) return;
    if (b.id === "ngo_cong" && b.state === "burrow_hide") return;

    // Ưu tiên kiểm tra đốt thân Ngô Công Vương
    if (b.id === "ngo_cong") {
      for (const seg of b.segments) {
        if (!seg.alive) continue;
        if (predicate(seg.x, seg.y, seg.radius + 4)) {
          seg.hp -= rawDmg;
          b.hp = Math.max(1, b.hp - Math.round(rawDmg * 0.65));
          b.hurtFlash = 0.12;
          this.spawnVfx("vfx/hit-spark", seg.x, seg.y, { scale: 0.45 });
          this.addFloatingText(seg.x, seg.y - 12, `-${rawDmg}`, "#9eff82");
          this.sfx?.play("hit");
          if (seg.hp <= 0) {
            seg.alive = false;
            b.stunTimer = Math.max(b.stunTimer, 0.9);
            this.triggerHitStop(0.06);
            this.triggerShake(0.2, 3);
            this.pickups.push({ kind: "blood_crystal", x: seg.x, y: seg.y, life: 16 });
            this.addFloatingText(seg.x, seg.y - 18, "Vỡ Đốt · Rơi Huyết Tinh!", "#ff5c7a");
          }
          return;
        }
      }
    }

    // Ưu tiên kiểm tra 4 chân Vạn Cổ Tà Lô khi chưa sập
    if (b.id === "van_co_ta_lo" && b.exposedTimer <= 0) {
      for (const leg of b.legs) {
        if (!leg.alive) continue;
        if (predicate(leg.x, leg.y, leg.radius + 4)) {
          leg.hp -= rawDmg;
          b.hp = Math.max(1, b.hp - Math.round(rawDmg * 0.45));
          b.hurtFlash = 0.12;
          this.spawnVfx("vfx/hit-spark", leg.x, leg.y, { scale: 0.45 });
          this.addFloatingText(leg.x, leg.y - 12, `Chân -${rawDmg}`, "#ffae42");
          this.sfx?.play("hit");
          if (leg.hp <= 0) {
            leg.alive = false;
            this.addFloatingText(leg.x, leg.y - 18, "Gãy 1 Chân Vạc!", "#ffd066");
            if (b.legs.every((l) => !l.alive)) {
              b.exposedTimer = 8.0;
              b.state = "core_exposed";
              b.stateTimer = 8.0;
              this.triggerHitStop(0.08);
              this.triggerShake(0.25, 4);
              this.addFloatingText(b.x, b.y - 34, "LỘ LÕI YẾU! (+50% ST)", "#ff3855");
            }
          }
          return;
        }
      }
    }

    if (!predicate(b.x, b.y, b.radius + 4)) return;

    let mult = 1.0;
    if (b.id === "mac_vo_tam" && b.stunTimer > 0) mult = 1.25;
    if (b.id === "van_co_ta_lo") {
      if (b.state === "closed_shell" && b.exposedTimer <= 0) {
        mult = 0.2; // Đóng nắp giảm 80% sát thương
      } else if (b.exposedTimer > 0 || b.stunTimer > 0) {
        mult = 1.5; // Lộ lõi yếu hoặc choáng nhận +50% sát thương
      }
    }

    const dmg = Math.max(1, Math.round(rawDmg * mult));
    b.hp -= dmg;
    b.hurtFlash = 0.12;
    this.spawnVfx("vfx/hit-spark", b.x, b.y - 8, { scale: 0.5 });
    this.addFloatingText(b.x, b.y - 24, `-${dmg}`, mult < 0.5 ? "#8b8599" : "#ffe082");
    this.sfx?.play("hit");

    // Ngắt nhịp Mạc Vô Tâm khi đang vận công gọi đệ
    if (b.id === "mac_vo_tam" && b.state === "summoning") {
      b.summonShield -= dmg;
      if (b.summonShield <= 0) {
        b.state = "stunned";
        b.stunTimer = 3.0;
        b.stateTimer = 3.0;
        this.triggerHitStop(0.09);
        this.triggerShake(0.26, 4);
        this.sfx?.play("stun");
        this.addFloatingText(b.x, b.y - 36, "NGẮT NHỊP · CHOÁNG 3s!", "#5ef2d6");
      }
    }

    if (b.hp <= 0) {
      this._onBossDefeated();
    }
  }

  _onBossDefeated() {
    const b = this.boss;
    this.spawnVfx("vfx/no-vac", b.x, b.y, { scale: 0.8 });
    this.triggerHitStop(0.14);
    this.triggerShake(0.45, 5);
    this.sfx?.play("fusionSuccess");
    this.addFloatingText(b.x, b.y - 32, `${b.name} Bị Trảm!`, "#ffd86e");

    this.boss = null;
    this.enemies = [];
    this.enemyProjectiles = [];
    this.zones = [];
    this.telegraphs = [];

    // Thưởng Phôi Cổ & Huyết Tinh
    const rewardId = STARTER_POOL[(this.floorNumber + 1) % STARTER_POOL.length];
    const rewardGu = createGuInstance(rewardId);
    this.player.addGu(rewardGu);
    this.account?.recordDiscoveredGu(rewardGu.baseId);
    this.account?.recordBossKill(this.floorNumber);

    if (this.floorNumber >= 3) {
      this.phase = "victory";
      this.account?.clearActiveRunSnapshot(true);
    } else {
      this.phase = "floor_clear";
      this.portal.active = true;
      this.account?.saveActiveRunSnapshot(this.player, this);
      this.account?.syncCloud();
    }
    this.onStateChange?.();
  }

  triggerHitStop(sec) {
    this.hitStopTimer = Math.max(this.hitStopTimer, sec);
  }

  triggerShake(sec, amp) {
    this.shakeTimer = Math.max(this.shakeTimer, sec);
    this.shakeAmp = Math.max(this.shakeAmp, amp);
  }

  spawnVfx(key, x, y, opts = {}) {
    const sheet = this.assets.get(key);
    const fps = sheet?.pixelfx?.fps ?? 15;
    const count = sheet?.frames?.length ?? 8;
    const duration = count / fps;
    this.vfxEffects.push({
      key,
      x,
      y,
      t: 0,
      duration,
      angle: opts.angle ?? 0,
      scale: opts.scale ?? 1,
      flipX: Boolean(opts.flipX),
    });
  }

  addFloatingText(x, y, text, color = "#ffffff") {
    this.floatingTexts.push({ x, y, text, color, life: 1.0, maxLife: 1.0 });
  }

  _playerEvents() {
    return {
      onFloatingText: (x, y, text, color) => this.addFloatingText(x, y, text, color),
      onHurt: () => {
        this.sfx?.play("hurt");
        this.triggerShake(0.18, 3);
      },
      onTauHoaStart: () => {
        this.sfx?.play("tauHoa");
        this.triggerShake(0.3, 4);
        this.addFloatingText(this.player.x, this.player.y - 30, "TẨU HỎA NHẬP MA!", "#d45eff");
      },
      onDeath: () => {
        this.phase = "gameover";
        this.sfx?.play("fusionFail");
        this.account?.clearActiveRunSnapshot(true);
        this.onStateChange?.();
      },
    };
  }

  update(dt, input) {
    this.time += dt;
    input.update(dt);

    if (this.shakeTimer > 0) this.shakeTimer = Math.max(0, this.shakeTimer - dt);
    if (this.hitStopTimer > 0) {
      this.hitStopTimer = Math.max(0, this.hitStopTimer - dt);
      return;
    }

    const moveVec = input.getMoveVector();
    const events = this._playerEvents();

    // Kiểm tra nhân vật đứng trong vùng Phản Phệ (Vũng độc hoặc Tà trận Boss 2)
    let inCorZone = false;
    let corMult = 1;
    for (const h of this.hazards) {
      if (h.kind === "poison_pool" && h.cooldown <= 0 && Math.hypot(this.player.x - h.x, this.player.y - h.y) <= h.r) {
        inCorZone = true;
      }
      if (h.kind === "lava_trap") {
        if (h.activeTimer > 0 && Math.hypot(this.player.x - h.x, this.player.y - h.y) <= h.r) {
          this.player.takeDamage(14, events);
        }
      }
    }
    for (const z of this.zones) {
      if (z.kind === "boss_corruption" && Math.hypot(this.player.x - z.x, this.player.y - z.y) <= z.radius) {
        inCorZone = true;
        corMult = 2; // Vùng x2 tốc độ tăng Phản Phệ của Mạc Vô Tâm
      }
    }

    this.player.update(dt, { moveVec, inCorruptionZone: inCorZone, zoneMult: corMult }, events);

    // Bạch Cốt Độn Cổ: rải gai xương dọc đường lướt
    if (this.player.dashTimer > 0 && this.player.dashGu?.stunDuration) {
      this.player.dashSpikeTick -= dt;
      if (this.player.dashSpikeTick <= 0) {
        this.player.dashSpikeTick = 0.06;
        const dmg = Math.round(this.player.dashGu.damage * this.player.getDamageMultiplier());
        this.spawnVfx("vfx/bach-cot-don", this.player.x, this.player.y, { scale: 0.42 });
        this._damageInCircle(this.player.x, this.player.y, 20, dmg, this.player.dashGu);
      }
    }

    // Lực hút của Boss Vạn Cổ Tà Lô (Tầng 3)
    if (this.boss && this.boss.id === "van_co_ta_lo" && this.boss.state === "suction" && !this.player.isDead) {
      const dx = this.boss.x - this.player.x;
      const dy = this.boss.y - this.player.y;
      const dist = Math.max(1, Math.hypot(dx, dy));
      if (dist > 22) {
        this.player.x += (dx / dist) * 52 * dt;
        this.player.y += (dy / dist) * 52 * dt;
      }
    }

    // Giữ nhân vật trong biên bản đồ & tránh xuyên vạc/vật cản
    this.player.x = Math.max(24, Math.min(WORLD_WIDTH - 24, this.player.x));
    this.player.y = Math.max(32, Math.min(WORLD_HEIGHT - 22, this.player.y));
    for (const obs of this.obstacles) {
      this._pushOut(this.player, obs.x, obs.y, obs.r + this.player.radius);
    }
    if (this.cauldron.active) {
      this._pushOut(this.player, this.cauldron.x, this.cauldron.y, this.cauldron.radius + 4);
    }

    // Cập nhật bẫy môi trường
    for (const h of this.hazards) {
      if (h.cooldown > 0) h.cooldown = Math.max(0, h.cooldown - dt);
      if (h.kind === "lava_trap") {
        if (h.warnTimer > 0) {
          h.warnTimer -= dt;
          if (h.warnTimer <= 0) {
            h.activeTimer = 1.2;
            this.spawnVfx("vfx/hoa-than", h.x, h.y, { scale: 0.45 });
          }
        } else if (h.activeTimer > 0) {
          h.activeTimer -= dt;
        } else if (h.cooldown <= 0) {
          h.cooldown = 4.5;
          h.warnTimer = 1.0;
        }
      }
    }

    this._updateDecoys(dt);
    this._updatePlayerProjectiles(dt);
    this._updateZones(dt);
    this._updateEnemies(dt, events);
    this._updateBoss(dt, events);
    this._updateEnemyProjectiles(dt, events);
    this._updatePickups(dt);
    this._updateEnergyCores(dt);
    this._updateVfxAndText(dt);

    // Chuyển pha đợt quái -> Trạm Luyện Cổ
    if (this.phase === "waves" && this.enemies.length === 0) {
      if (this.waveIndex + 1 < this.getFloorDef().waves.length) {
        this.waveIndex += 1;
        this._spawnWave(this.waveIndex);
        this.account?.saveActiveRunSnapshot(this.player, this);
        this.account?.scheduleSync(1000);
      } else {
        this.phase = "cauldron";
        this.cauldron.active = true;
        this.addFloatingText(this.cauldron.x, this.cauldron.y - 34, "Trạm Luyện Cổ Khai Mở!", "#4de6b0");
        this.sfx?.play("pickup");
        this.account?.saveActiveRunSnapshot(this.player, this);
        this.account?.syncCloud();
        this.onStateChange?.();
      }
    }

    // Camera bám theo nhân vật
    const targetCamX = Math.max(0, Math.min(WORLD_WIDTH - GAME_WIDTH, this.player.x - GAME_WIDTH * 0.5));
    const targetCamY = Math.max(0, Math.min(WORLD_HEIGHT - GAME_HEIGHT, this.player.y - GAME_HEIGHT * 0.5));
    this.camera.x += (targetCamX - this.camera.x) * Math.min(1, dt * 8);
    this.camera.y += (targetCamY - this.camera.y) * Math.min(1, dt * 8);
  }

  _pushOut(entity, ox, oy, minDist) {
    const dx = entity.x - ox;
    const dy = entity.y - oy;
    const dist = Math.hypot(dx, dy);
    if (dist > 0 && dist < minDist) {
      const push = minDist - dist;
      entity.x += (dx / dist) * push;
      entity.y += (dy / dist) * push;
    }
  }

  _updateDecoys(dt) {
    for (let i = this.decoys.length - 1; i >= 0; i--) {
      const d = this.decoys[i];
      d.life -= dt;
      if (d.life <= 0) {
        this.spawnVfx("vfx/anh-bo", d.x, d.y, { scale: 0.6 });
        this._damageInCircle(d.x, d.y, 26, d.damage, { element: "Ảnh" });
        this.decoys.splice(i, 1);
      }
    }
  }

  _updatePlayerProjectiles(dt) {
    for (let i = this.playerProjectiles.length - 1; i >= 0; i--) {
      const pr = this.playerProjectiles[i];
      pr.life -= dt;
      pr.animTime += dt;

      if (pr.homing) {
        const target = this._findNearestTarget(pr.x, pr.y);
        if (target) {
          const desired = Math.atan2(target.y - pr.y, target.x - pr.x);
          const cur = Math.atan2(pr.vy, pr.vx);
          const diff = Math.atan2(Math.sin(desired - cur), Math.cos(desired - cur));
          const nextAngle = cur + Math.max(-5.5 * dt, Math.min(5.5 * dt, diff));
          pr.vx = Math.cos(nextAngle) * pr.speed;
          pr.vy = Math.sin(nextAngle) * pr.speed;
        }
      }

      pr.x += pr.vx * dt;
      pr.y += pr.vy * dt;

      if (pr.gu?.ignitesPoison) {
        this._ignitePoisonPools(pr.x, pr.y, pr.radius + 8, this.player.getDamageMultiplier());
      }

      for (const e of this.enemies) {
        if (pr.hitIds.has(e.id)) continue;
        if (Math.hypot(e.x - pr.x, e.y - 6 - pr.y) <= e.radius + pr.radius) {
          pr.hitIds.add(e.id);
          pr.pierceLeft -= 1;
          this._hitEnemy(e, pr.damage, pr.gu);
          if (pr.lifesteal) {
            const healed = this.player.heal(Math.max(1, Math.round(pr.damage * pr.lifesteal)), false);
            if (healed > 0) this.addFloatingText(this.player.x, this.player.y - 22, `+${healed}`, "#4de6b0");
          }
          if (pr.pierceLeft <= 0) break;
        }
      }

      if (pr.pierceLeft > 0 && this.boss && !pr.hitIds.has("boss")) {
        let hitSomething = false;
        this._checkBossHit(
          (tx, ty, tr) => {
            const ok = Math.hypot(tx - pr.x, ty - pr.y) <= tr + pr.radius;
            if (ok) hitSomething = true;
            return ok;
          },
          pr.damage,
          pr.gu
        );
        if (hitSomething) {
          pr.hitIds.add("boss");
          pr.pierceLeft -= 1;
          if (pr.lifesteal) {
            this.player.heal(Math.max(1, Math.round(pr.damage * pr.lifesteal)), false);
          }
        }
      }

      if (pr.pierceLeft <= 0 || pr.life <= 0) {
        this.playerProjectiles.splice(i, 1);
      }
    }
  }

  _findNearestTarget(x, y) {
    let best = null;
    let bestD = Infinity;
    for (const e of this.enemies) {
      const d = Math.hypot(e.x - x, e.y - y);
      if (d < bestD) {
        bestD = d;
        best = { x: e.x, y: e.y - 6 };
      }
    }
    if (this.boss && this.boss.state !== "burrow_hide") {
      const d = Math.hypot(this.boss.x - x, this.boss.y - y);
      if (d < bestD) {
        best = { x: this.boss.x, y: this.boss.y - 6 };
      }
    }
    return best;
  }

  _updateZones(dt) {
    for (let i = this.zones.length - 1; i >= 0; i--) {
      const z = this.zones[i];
      z.life -= dt;
      z.tick -= dt;
      if (z.kind === "player_fire" && z.tick <= 0) {
        z.tick = 0.45;
        const tickDmg = Math.max(4, Math.round(z.dps * 0.45));
        this._damageInCircle(z.x, z.y, z.radius, tickDmg, { element: "Viêm" });
        this._ignitePoisonPools(z.x, z.y, z.radius, this.player.getDamageMultiplier());
      }
      if (z.life <= 0) this.zones.splice(i, 1);
    }
  }

  _updateEnemies(dt, events) {
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      e.animTime += dt;
      if (e.hurtFlash > 0) e.hurtFlash = Math.max(0, e.hurtFlash - dt);

      if (e.poisonTimer > 0) {
        e.poisonTimer -= dt;
        e.hp -= e.poisonDps * dt;
      }
      if (e.slowTimer > 0) e.slowTimer -= dt;
      else e.slowFactor = 0;

      if (e.hp <= 0) {
        this._onEnemyKilled(e);
        this.enemies.splice(i, 1);
        continue;
      }

      if (e.stunTimer > 0) {
        e.stunTimer -= dt;
        continue;
      }

      // Ưu tiên mục tiêu là Phân Thân Ảnh Bộ nếu có gần đó
      let target = this.player;
      for (const d of this.decoys) {
        if (Math.hypot(d.x - e.x, d.y - e.y) < 120) {
          target = d;
          break;
        }
      }

      const dx = target.x - e.x;
      const dy = target.y - e.y;
      const dist = Math.max(1, Math.hypot(dx, dy));
      e.facingLeft = dx < 0;
      const spd = e.speed * (1 - (e.slowFactor ?? 0));

      if (e.chargeTimer > 0) {
        e.chargeTimer -= dt;
        e.x += e.chargeVx * dt;
        e.y += e.chargeVy * dt;
      } else if (e.ai === "caster") {
        if (dist > 118) {
          e.x += (dx / dist) * spd * dt;
          e.y += (dy / dist) * spd * dt;
        } else if (dist < 64) {
          e.x -= (dx / dist) * spd * 0.7 * dt;
          e.y -= (dy / dist) * spd * 0.7 * dt;
        }
        e.aiTimer -= dt;
        if (e.aiTimer <= 0) {
          e.aiTimer = 2.0;
          const a = Math.atan2(dy, dx);
          this.enemyProjectiles.push({
            x: e.x,
            y: e.y - 6,
            vx: Math.cos(a) * 105,
            vy: Math.sin(a) * 105,
            radius: 4,
            damage: e.damage,
            color: e.projColor ?? "#ff5e6c",
            life: 2.2,
          });
        }
      } else if (e.ai === "hopper") {
        e.aiTimer -= dt;
        if (e.aiTimer <= 0) {
          e.aiTimer = 1.65;
          e.chargeTimer = 0.25;
          e.chargeVx = (dx / dist) * spd * 3.1;
          e.chargeVy = (dy / dist) * spd * 3.1;
          const a = Math.atan2(dy, dx);
          this.enemyProjectiles.push({
            x: e.x,
            y: e.y - 4,
            vx: Math.cos(a) * 95,
            vy: Math.sin(a) * 95,
            radius: 4,
            damage: Math.round(e.damage * 0.8),
            color: e.projColor ?? "#7eff54",
            life: 1.8,
          });
        }
      } else if (e.ai === "charger") {
        e.aiTimer -= dt;
        if (e.aiTimer <= 0 && dist < 130) {
          e.aiTimer = 2.5;
          e.chargeTimer = 0.32;
          e.chargeVx = (dx / dist) * 145;
          e.chargeVy = (dy / dist) * 145;
        } else {
          e.x += (dx / dist) * spd * dt;
          e.y += (dy / dist) * spd * dt;
        }
      } else if (e.ai === "orbiter") {
        const perpX = -dy / dist;
        const perpY = dx / dist;
        const pull = dist > 42 ? 0.85 : -0.35;
        e.x += ((dx / dist) * pull + perpX * 0.75) * spd * dt;
        e.y += ((dy / dist) * pull + perpY * 0.75) * spd * dt;
      } else {
        e.x += (dx / dist) * spd * dt;
        e.y += (dy / dist) * spd * dt;
      }

      e.x = Math.max(22, Math.min(WORLD_WIDTH - 22, e.x));
      e.y = Math.max(28, Math.min(WORLD_HEIGHT - 20, e.y));

      if (target === this.player && Math.hypot(this.player.x - e.x, this.player.y - e.y) <= this.player.radius + e.radius) {
        this.player.takeDamage(e.damage, events);
      }
    }
  }

  _onEnemyKilled(e) {
    this.player.kills += 1;
    this.account?.recordEnemyKill();
    this.spawnVfx("vfx/hit-spark", e.x, e.y - 6, { scale: 0.65 });

    // Dị Cổ chết gần Vạn Cổ Tà Lô rơi Lõi Năng Lượng
    if (e.dropsCore) {
      this.energyCores.push({ x: e.x, y: e.y, life: 12 });
      this.addFloatingText(e.x, e.y - 16, "Rơi Lõi Năng Lượng!", "#c86bff");
      return;
    }

    const roll = Math.random();
    if (roll < 0.28) {
      this.pickups.push({ kind: "herb", x: e.x, y: e.y, life: 14 });
    } else if (roll < 0.44) {
      const guId = STARTER_POOL[Math.floor(Math.random() * STARTER_POOL.length)];
      this.pickups.push({ kind: "gu", guId, x: e.x, y: e.y, life: 18 });
    }
  }

  _updateBoss(dt, events) {
    const b = this.boss;
    if (!b || b.hp <= 0) return;

    b.animTime += dt;
    if (b.hurtFlash > 0) b.hurtFlash = Math.max(0, b.hurtFlash - dt);

    if (b.stunTimer > 0) {
      b.stunTimer -= dt;
      if (b.stunTimer <= 0 && b.state === "stunned") {
        b.state = b.id === "mac_vo_tam" ? "cast" : b.id === "van_co_ta_lo" ? "spin_fire" : "roam";
        b.stateTimer = 1.6;
      }
      return;
    }

    if (b.id === "ngo_cong") {
      this._updateBossNgoCong(b, dt, events);
    } else if (b.id === "mac_vo_tam") {
      this._updateBossMacVoTam(b, dt, events);
    } else if (b.id === "van_co_ta_lo") {
      this._updateBossVanCoTaLo(b, dt, events);
    }
  }

  _updateBossNgoCong(b, dt, events) {
    b.stateTimer -= dt;

    if (b.state === "roam") {
      const targetAngle = Math.atan2(this.player.y - b.y, this.player.x - b.x);
      const diff = Math.atan2(Math.sin(targetAngle - b.angle), Math.cos(targetAngle - b.angle));
      b.angle += Math.max(-2.2 * dt, Math.min(2.2 * dt, diff));
      b.x += Math.cos(b.angle) * b.speed * dt;
      b.y += Math.sin(b.angle) * b.speed * dt;
      b.x = Math.max(36, Math.min(WORLD_WIDTH - 36, b.x));
      b.y = Math.max(36, Math.min(WORLD_HEIGHT - 36, b.y));

      if (b.stateTimer <= 0) {
        const pick = Math.random();
        if (pick < 0.38) {
          b.state = "burrow_warn";
          b.stateTimer = 1.05;
          b.burrowTarget = { x: this.player.x, y: this.player.y };
          this.telegraphs.push({ kind: "circle", x: b.burrowTarget.x, y: b.burrowTarget.y, r: 28, life: 1.05, color: "#70ff6b" });
        } else if (pick < 0.72) {
          b.state = "spray";
          b.stateTimer = 1.1;
          // Phun sương tăng Phản Phệ
          const base = Math.atan2(this.player.y - b.y, this.player.x - b.x);
          for (let k = -2; k <= 2; k++) {
            const a = base + k * 0.22;
            this.enemyProjectiles.push({
              x: b.x,
              y: b.y,
              vx: Math.cos(a) * 110,
              vy: Math.sin(a) * 110,
              radius: 5,
              damage: 14,
              corruptionHit: 10,
              color: "#7eff6b",
              life: 2.2,
            });
          }
        } else {
          b.state = "coil";
          b.stateTimer = 3.2;
          b.coilRadius = 115;
          this.addFloatingText(b.x, b.y - 26, "CUỘN TRÒN ĐỘC VỰC!", "#7eff6b");
        }
      }
    } else if (b.state === "burrow_warn") {
      if (b.stateTimer <= 0) {
        b.x = b.burrowTarget.x;
        b.y = b.burrowTarget.y;
        this.spawnVfx("vfx/chuong-khi-boc", b.x, b.y, { scale: 0.5 });
        this.triggerShake(0.2, 3);
        if (Math.hypot(this.player.x - b.x, this.player.y - b.y) <= 32) {
          this.player.takeDamage(24, events);
        }
        b.state = "roam";
        b.stateTimer = 2.4;
      }
    } else if (b.state === "coil") {
      // Thu hẹp vòng độc quanh tâm phòng
      const cx = WORLD_WIDTH * 0.5;
      const cy = WORLD_HEIGHT * 0.5;
      b.x += (cx - b.x) * 3 * dt;
      b.y += (cy - b.y) * 3 * dt;
      b.coilRadius = Math.max(76, b.coilRadius - 14 * dt);
      if (Math.hypot(this.player.x - cx, this.player.y - cy) > b.coilRadius) {
        this.player.addCorruption(12 * dt, events);
        if (Math.floor(this.time * 4) !== Math.floor((this.time - dt) * 4)) {
          this.player.takeDamage(6, events);
        }
      }
      if (b.stateTimer <= 0) {
        b.state = "roam";
        b.stateTimer = 2.6;
      }
    } else if (b.state === "spray") {
      if (b.stateTimer <= 0) {
        b.state = "roam";
        b.stateTimer = 2.2;
      }
    }

    // Kéo 6 đốt thân nối đuôi mượt mà theo đầu Boss
    let prevX = b.x;
    let prevY = b.y;
    for (const seg of b.segments) {
      const dx = seg.x - prevX;
      const dy = seg.y - prevY;
      const dist = Math.max(0.01, Math.hypot(dx, dy));
      const spacing = 13;
      if (dist > spacing) {
        seg.x = prevX + (dx / dist) * spacing;
        seg.y = prevY + (dy / dist) * spacing;
      }
      prevX = seg.x;
      prevY = seg.y;
    }

    if (Math.hypot(this.player.x - b.x, this.player.y - b.y) <= this.player.radius + b.radius) {
      this.player.takeDamage(18, events);
    }
  }

  _updateBossMacVoTam(b, dt, events) {
    b.stateTimer -= dt;

    if (b.state === "cast") {
      // Giữ khoảng cách nhẹ với người chơi
      const dx = this.player.x - b.x;
      const dy = this.player.y - b.y;
      const dist = Math.max(1, Math.hypot(dx, dy));
      if (dist < 76) {
        b.x -= (dx / dist) * 36 * dt;
        b.y -= (dy / dist) * 36 * dt;
      } else if (dist > 140) {
        b.x += (dx / dist) * 32 * dt;
        b.y += (dy / dist) * 32 * dt;
      }
      b.x = Math.max(40, Math.min(WORLD_WIDTH - 40, b.x));
      b.y = Math.max(44, Math.min(WORLD_HEIGHT - 44, b.y));

      if (b.stateTimer <= 0) {
        const roll = Math.random();
        if (roll < 0.42) {
          // Triệu hồi gai xương tại vị trí người chơi
          b.state = "spikes";
          b.stateTimer = 1.1;
          const sx = this.player.x;
          const sy = this.player.y;
          b.spikeTarget = { x: sx, y: sy };
          this.telegraphs.push({ kind: "circle", x: sx, y: sy, r: 26, life: 0.75, color: "#ded8dc" });
        } else if (roll < 0.72) {
          // Tạo vùng x2 tốc độ tăng Phản Phệ
          this.zones.push({
            kind: "boss_corruption",
            x: this.player.x,
            y: this.player.y,
            radius: 44,
            life: 6.5,
            tick: 0,
            color: "#a84cff",
          });
          this.addFloatingText(this.player.x, this.player.y - 24, "Tà Trận x2 Phản Phệ!", "#c86bff");
          b.stateTimer = 1.9;
        } else {
          // Cắt 10% HP vận công gọi 2 Bạch Cốt Khôi Lỗi
          b.state = "summoning";
          b.stateTimer = 2.8;
          b.summonShield = b.summonMaxShield;
          const selfCut = Math.round(b.maxHp * 0.1);
          b.hp = Math.max(1, b.hp - selfCut);
          this.addFloatingText(b.x, b.y - 34, "HUYẾT TẾ VẬN CÔNG! (NGẮT NGAY)", "#ff4769");
        }
      }
    } else if (b.state === "spikes") {
      if (b.stateTimer <= 0.35 && b.spikeTarget) {
        const { x: sx, y: sy } = b.spikeTarget;
        b.spikeTarget = null;
        this.spawnVfx("vfx/bach-cot-don", sx, sy, { scale: 0.5 });
        this.sfx?.play("hit");
        if (Math.hypot(this.player.x - sx, this.player.y - sy) <= 28) {
          this.player.takeDamage(24, events);
        }
      }
      if (b.stateTimer <= 0) {
        b.state = "cast";
        b.stateTimer = 1.6;
      }
    } else if (b.state === "summoning") {
      // Hết 2.8s mà không bị phá thanh vận công -> gọi 2 Bạch Cốt Khôi Lỗi
      if (b.stateTimer <= 0) {
        this._spawnEnemy("bach_cot_khoi_loi", { x: b.x - 28, y: b.y + 18 });
        this._spawnEnemy("bach_cot_khoi_loi", { x: b.x + 28, y: b.y + 18 });
        this.addFloatingText(b.x, b.y - 30, "Triệu Hồi 2 Khôi Lỗi!", "#ff5c7a");
        b.state = "cast";
        b.stateTimer = 2.2;
      }
    }
  }

  _updateBossVanCoTaLo(b, dt, events) {
    b.stateTimer -= dt;
    if (b.exposedTimer > 0) b.exposedTimer = Math.max(0, b.exposedTimer - dt);

    // Cập nhật vị trí 4 chân vạc xoay quanh thân vạc
    for (const leg of b.legs) {
      const a = b.rotAngle + leg.angleOffset;
      leg.x = b.x + Math.cos(a) * 24;
      leg.y = b.y + Math.sin(a) * 18;
    }

    if (b.state === "spin_fire") {
      b.rotAngle += 1.45 * dt;
      b.fireTick -= dt;
      if (b.fireTick <= 0) {
        b.fireTick = 0.28;
        for (let k = 0; k < 4; k++) {
          const a = b.rotAngle + (k * Math.PI) / 2;
          this.enemyProjectiles.push({
            x: b.x + Math.cos(a) * 20,
            y: b.y - 6 + Math.sin(a) * 20,
            vx: Math.cos(a) * 112,
            vy: Math.sin(a) * 112,
            radius: 5,
            damage: 16,
            color: "#ff7b39",
            life: 2.3,
          });
        }
      }
      if (b.stateTimer <= 0) {
        b.state = "suction";
        b.stateTimer = 3.2;
        this.addFloatingText(b.x, b.y - 38, "MỞ NẮP HÚT LINH!", "#ff9e3d");
      }
    } else if (b.state === "suction") {
      // Hút cả Lõi Năng Lượng từ Dị Cổ vào miệng vạc gây Nổ Vạc (-15% Max HP + Choáng 4s)!
      if (b.stateTimer <= 0) {
        if (b.exposedTimer > 0) {
          b.state = "spin_fire";
          b.stateTimer = 3.2;
        } else {
          b.state = "closed_shell";
          b.stateTimer = 3.6;
          this._spawnEnemy("di_co", { x: b.x - 42, y: b.y + 10 });
          this._spawnEnemy("di_co", { x: b.x + 42, y: b.y + 10 });
          this.addFloatingText(b.x, b.y - 38, "ĐÓNG NẮP (-80% ST) · THẢ DỊ CỔ!", "#a84cff");
        }
      }
    } else if (b.state === "closed_shell") {
      if (b.stateTimer <= 0) {
        b.state = "spin_fire";
        b.stateTimer = 3.2;
      }
    } else if (b.state === "core_exposed") {
      b.rotAngle += 0.8 * dt;
      if (b.stateTimer <= 0) {
        // Phục hồi 4 chân sau thời gian lộ lõi
        for (const leg of b.legs) {
          leg.alive = true;
          leg.hp = leg.maxHp;
        }
        b.state = "spin_fire";
        b.stateTimer = 3.2;
      }
    }
  }

  _updateEnemyProjectiles(dt, events) {
    for (let i = this.enemyProjectiles.length - 1; i >= 0; i--) {
      const pr = this.enemyProjectiles[i];
      pr.life -= dt;
      pr.x += pr.vx * dt;
      pr.y += pr.vy * dt;

      if (Math.hypot(this.player.x - pr.x, this.player.y - 6 - pr.y) <= this.player.radius + pr.radius) {
        this.player.takeDamage(pr.damage, events);
        if (pr.corruptionHit) {
          this.player.addCorruption(pr.corruptionHit, events);
        }
        this.enemyProjectiles.splice(i, 1);
        continue;
      }

      if (pr.life <= 0 || pr.x < 0 || pr.y < 0 || pr.x > WORLD_WIDTH || pr.y > WORLD_HEIGHT) {
        this.enemyProjectiles.splice(i, 1);
      }
    }
  }

  _updatePickups(dt) {
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const p = this.pickups[i];
      p.life -= dt;
      if (Math.hypot(this.player.x - p.x, this.player.y - p.y) <= 18) {
        if (p.kind === "blood_crystal") {
          const heal = Math.round(this.player.maxHp * 0.18);
          const got = this.player.heal(heal, false);
          this.addFloatingText(p.x, p.y - 16, `Huyết Tinh +${got} HP`, "#ff4769");
          this.sfx?.play("pickup");
        } else if (p.kind === "herb") {
          const got = this.player.heal(26, true);
          if (got > 0) {
            this.addFloatingText(p.x, p.y - 16, `Linh Thảo +${got} HP`, "#4de6b0");
          } else {
            this.addFloatingText(p.x, p.y - 16, "Cấm hồi đồ thường!", "#a8ff52");
          }
          this.sfx?.play("pickup");
        } else if (p.kind === "gu") {
          const inst = createGuInstance(p.guId);
          this.player.addGu(inst);
          this.addFloatingText(p.x, p.y - 18, `Nhặt ${inst.name}`, "#ffd86e");
          this.sfx?.play("pickup");
        }
        this.pickups.splice(i, 1);
        this.onStateChange?.();
        continue;
      }
      if (p.life <= 0) this.pickups.splice(i, 1);
    }
  }

  _updateEnergyCores(dt) {
    const b = this.boss;
    for (let i = this.energyCores.length - 1; i >= 0; i--) {
      const c = this.energyCores[i];
      c.life -= dt;

      if (b && b.id === "van_co_ta_lo" && b.state === "suction") {
        const dx = b.x - c.x;
        const dy = b.y - c.y;
        const dist = Math.max(1, Math.hypot(dx, dy));
        c.x += (dx / dist) * 125 * dt;
        c.y += (dy / dist) * 125 * dt;

        if (dist <= b.radius + 6) {
          // NỔ VẠC: -15% Max HP Boss + Choáng 4 giây!
          const burst = Math.round(b.maxHp * 0.15);
          b.hp -= burst;
          b.stunTimer = 4.0;
          b.state = "stunned";
          b.stateTimer = 4.0;
          this.spawnVfx("vfx/no-vac", b.x, b.y, { scale: 0.78 });
          this.triggerHitStop(0.12);
          this.triggerShake(0.38, 5);
          this.sfx?.play("fusionFail");
          this.addFloatingText(b.x, b.y - 36, `NỔ VẠC -${burst} HP · CHOÁNG 4s!`, "#ff823a");
          this.energyCores.splice(i, 1);
          if (b.hp <= 0) this._onBossDefeated();
          continue;
        }
      }

      if (c.life <= 0) this.energyCores.splice(i, 1);
    }
  }

  _updateVfxAndText(dt) {
    for (let i = this.vfxEffects.length - 1; i >= 0; i--) {
      const v = this.vfxEffects[i];
      v.t += dt;
      if (v.t >= v.duration) this.vfxEffects.splice(i, 1);
    }
    for (let i = this.telegraphs.length - 1; i >= 0; i--) {
      this.telegraphs[i].life -= dt;
      if (this.telegraphs[i].life <= 0) this.telegraphs.splice(i, 1);
    }
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.life -= dt;
      ft.y -= 18 * dt;
      if (ft.life <= 0) this.floatingTexts.splice(i, 1);
    }
  }

  render(renderer, input) {
    const ctx = renderer.ctx;
    const def = this.getFloorDef();

    renderer.clear(def.ambientColor);

    const shakeX = this.shakeTimer > 0 ? Math.round((Math.random() * 2 - 1) * this.shakeAmp) : 0;
    const shakeY = this.shakeTimer > 0 ? Math.round((Math.random() * 2 - 1) * this.shakeAmp) : 0;

    ctx.save();
    ctx.translate(-Math.round(this.camera.x) + shakeX, -Math.round(this.camera.y) + shakeY);

    this._renderFloorMap(ctx, def);
    this._renderHazardsAndZones(ctx);
    this._renderTelegraphs(ctx);
    this._renderCauldronAndPortal(ctx);

    // Aim telegraph của người chơi
    const aim = input.skillPad.activeAim;
    if (aim.active && aim.slotId) {
      const slotGu = this.player.getEquippedGu(aim.slotId);
      if (slotGu) {
        renderer.drawAimTelegraph(this.player.x, this.player.y - 6, aim, slotGu);
      }
    }

    this._renderPickupsAndDecoys(ctx);
    this._renderEntities(ctx);
    this._renderProjectiles(ctx);
    this._renderVfxAndFloatingText(ctx);

    ctx.restore();
  }

  _renderFloorMap(ctx, def) {
    const tileset = this.assets.get(def.tilesetKey);
    const cols = Math.ceil(WORLD_WIDTH / 32);
    const rows = Math.ceil(WORLD_HEIGHT / 32);

    for (let gy = 0; gy < rows; gy++) {
      for (let gx = 0; gx < cols; gx++) {
        const x = gx * 32;
        const y = gy * 32;
        if (tileset) {
          const tileIdx = Math.abs((gx * 37 + gy * 19) % 7) === 0 ? 3 : Math.abs((gx + gy * 3) % 3);
          drawSheetFrame(ctx, tileset, tileIdx, x, y, { pivotOverride: [0, 0] });
        } else {
          ctx.fillStyle = PALETTE.stoneMid;
          ctx.fillRect(x, y, 32, 32);
        }
      }
    }

    // Viền tường đá bí cảnh
    ctx.strokeStyle = PALETTE.bronze;
    ctx.lineWidth = 2;
    ctx.strokeRect(14, 18, WORLD_WIDTH - 28, WORLD_HEIGHT - 32);

    // Vật cản (cây khô, bia mộ, cột đá)
    for (const obs of this.obstacles) {
      if (tileset) {
        drawSheetFrame(ctx, tileset, obs.frame, obs.x, obs.y, { pivotOverride: [16, 22] });
      }
    }
  }

  _renderHazardsAndZones(ctx) {
    const tileset = this.assets.get(this.getFloorDef().tilesetKey);

    for (const h of this.hazards) {
      if (h.kind === "poison_pool" && h.cooldown > 0) continue;
      if (tileset) {
        drawSheetFrame(ctx, tileset, 4, h.x, h.y, { pivotOverride: [16, 16] });
      }
      if (h.kind === "lava_trap" && h.warnTimer > 0) {
        ctx.save();
        ctx.strokeStyle = "#ffd066";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(h.x, h.y, h.r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
    }

    for (const z of this.zones) {
      ctx.save();
      ctx.globalAlpha = 0.25 + Math.sin(this.time * 6) * 0.08;
      ctx.fillStyle = z.color;
      ctx.beginPath();
      ctx.arc(z.x, z.y, z.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.7;
      ctx.strokeStyle = z.color;
      ctx.stroke();
      ctx.restore();
    }

    // Vòng độc thu hẹp map của Ngô Công Vương
    if (this.boss && this.boss.id === "ngo_cong" && this.boss.state === "coil") {
      ctx.save();
      ctx.strokeStyle = "#7eff6b";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(WORLD_WIDTH * 0.5, WORLD_HEIGHT * 0.5, this.boss.coilRadius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  _renderTelegraphs(ctx) {
    for (const t of this.telegraphs) {
      ctx.save();
      ctx.strokeStyle = t.color;
      ctx.globalAlpha = 0.75;
      ctx.beginPath();
      ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  _renderCauldronAndPortal(ctx) {
    if (this.cauldron.active) {
      const sheet = this.assets.get("tilesets/tram-luyen-co");
      if (sheet) {
        const fi = getSheetFrameIndex(sheet, this.time, true);
        drawSheetFrame(ctx, sheet, fi, this.cauldron.x, this.cauldron.y);
      }
    }
    if (this.portal.active) {
      ctx.save();
      ctx.strokeStyle = "#5ef2d6";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(this.portal.x, this.portal.y, 16 + Math.sin(this.time * 5) * 2, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = "rgba(94, 242, 214, 0.25)";
      ctx.fill();
      ctx.restore();
    }
  }

  _renderPickupsAndDecoys(ctx) {
    for (const d of this.decoys) {
      const sheet = this.assets.get("characters/co-su-dash");
      if (sheet) {
        drawSheetFrame(ctx, sheet, 2, d.x, d.y, { alpha: 0.55 });
      }
    }

    for (const p of this.pickups) {
      if (p.kind === "blood_crystal") {
        const sheet = this.assets.get("vfx/huyet-tinh");
        if (sheet) {
          drawSheetFrame(ctx, sheet, getSheetFrameIndex(sheet, this.time, true), p.x, p.y, { scale: 0.6 });
          continue;
        }
      }
      ctx.save();
      ctx.fillStyle = p.kind === "herb" ? "#4de6b0" : "#ffd86e";
      ctx.fillRect(Math.round(p.x - 3), Math.round(p.y - 3 + Math.sin(this.time * 5) * 2), 6, 6);
      ctx.restore();
    }

    for (const c of this.energyCores) {
      ctx.save();
      ctx.fillStyle = "#c86bff";
      ctx.beginPath();
      ctx.arc(c.x, c.y, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#ffffff";
      ctx.stroke();
      ctx.restore();
    }
  }

  _renderEntities(ctx) {
    // Quái thường
    for (const e of this.enemies) {
      const sheet = this.assets.get(e.spriteKey);
      if (sheet) {
        const fi = getSheetFrameIndex(sheet, e.animTime, true);
        drawSheetFrame(ctx, sheet, fi, e.x, e.y, {
          flipX: e.facingLeft,
          scale: sheet.frames[0].frame.w > 70 ? 0.55 : 0.8,
          alpha: e.hurtFlash > 0 ? 0.65 : 1,
        });
      }
      // Thanh máu quái nhỏ gọn
      const bw = 16;
      ctx.fillStyle = "#0b0a10";
      ctx.fillRect(Math.round(e.x - bw * 0.5), Math.round(e.y - 20), bw, 2);
      ctx.fillStyle = e.poisonTimer > 0 ? "#85ff59" : "#ff4a66";
      ctx.fillRect(
        Math.round(e.x - bw * 0.5),
        Math.round(e.y - 20),
        Math.max(1, Math.round((bw * e.hp) / e.maxHp)),
        2
      );
    }

    // Boss
    const b = this.boss;
    if (b && b.hp > 0) {
      if (b.id === "ngo_cong") {
        if (b.state !== "burrow_hide") {
          const segSheet = this.assets.get("enemies/ngo-cong-dot");
          for (let i = b.segments.length - 1; i >= 0; i--) {
            const seg = b.segments[i];
            if (segSheet) {
              const fi = seg.alive ? (Math.floor(this.time * 6 + i) % 2) : 2;
              drawSheetFrame(ctx, segSheet, fi, seg.x, seg.y, { scale: 0.78 });
            }
          }
          const headSheet = this.assets.get("enemies/boss-ngo-cong");
          if (headSheet) {
            drawSheetFrame(ctx, headSheet, getSheetFrameIndex(headSheet, b.animTime, true), b.x, b.y, {
              rotation: b.angle,
              scale: 0.85,
            });
          }
        }
      } else if (b.id === "mac_vo_tam") {
        const sheet = this.assets.get("enemies/boss-mac-vo-tam");
        if (sheet) {
          drawSheetFrame(ctx, sheet, getSheetFrameIndex(sheet, b.animTime, true), b.x, b.y, {
            scale: 1.0,
            alpha: b.hurtFlash > 0 ? 0.7 : 1,
          });
        }
        if (b.state === "summoning") {
          ctx.save();
          ctx.strokeStyle = "#ff4769";
          ctx.beginPath();
          ctx.arc(b.x, b.y - 12, 22, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }
      } else if (b.id === "van_co_ta_lo") {
        for (const leg of b.legs) {
          if (!leg.alive) continue;
          ctx.fillStyle = "#d6b16a";
          ctx.fillRect(Math.round(leg.x - 3), Math.round(leg.y - 3), 6, 6);
          ctx.strokeStyle = "#ff5924";
          ctx.strokeRect(Math.round(leg.x - 4), Math.round(leg.y - 4), 8, 8);
        }
        const sheet = this.assets.get("enemies/boss-van-co-ta-lo");
        if (sheet) {
          drawSheetFrame(ctx, sheet, getSheetFrameIndex(sheet, b.animTime, true), b.x, b.y, {
            scale: 1.0,
            alpha: b.state === "closed_shell" ? 0.85 : 1,
          });
        }
        if (b.state === "closed_shell" && b.exposedTimer <= 0) {
          ctx.save();
          ctx.strokeStyle = "#a84cff";
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(b.x, b.y - 14, 28, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }
      }
    }

    // Nhân vật chính Cổ Sư
    const heroKey = `characters/co-su-${this.player.animState}`;
    const heroSheet = this.assets.get(heroKey) ?? this.assets.get("characters/co-su-idle");
    if (heroSheet) {
      const loop = !["dash", "hurt", "death"].includes(this.player.animState);
      const t = this.player.isDead ? this.player.deathTimer : this.player.animTime;
      const fi = getSheetFrameIndex(heroSheet, t, loop);
      const flip = Math.cos(this.player.facing) < -0.15;
      drawSheetFrame(ctx, heroSheet, fi, this.player.x, this.player.y, { flipX: flip });
    }
  }

  _renderProjectiles(ctx) {
    for (const pr of this.playerProjectiles) {
      const sheet = this.assets.get(pr.vfxKey);
      if (sheet && pr.kind === "homing") {
        const fi = getSheetFrameIndex(sheet, pr.animTime, true);
        drawSheetFrame(ctx, sheet, fi, pr.x, pr.y, {
          rotation: Math.atan2(pr.vy, pr.vx),
          scale: 0.35,
        });
      } else {
        ctx.save();
        ctx.fillStyle = pr.color;
        ctx.beginPath();
        ctx.arc(pr.x, pr.y, pr.radius * 0.45, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    for (const pr of this.enemyProjectiles) {
      ctx.save();
      ctx.fillStyle = pr.color;
      ctx.beginPath();
      ctx.arc(pr.x, pr.y, pr.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(Math.round(pr.x - 1), Math.round(pr.y - 1), 2, 2);
      ctx.restore();
    }
  }

  _renderVfxAndFloatingText(ctx) {
    for (const v of this.vfxEffects) {
      const sheet = this.assets.get(v.key);
      if (!sheet) continue;
      const fi = getSheetFrameIndex(sheet, v.t, false);
      drawSheetFrame(ctx, sheet, fi, v.x, v.y, {
        rotation: v.angle,
        scale: v.scale,
        flipX: v.flipX,
      });
    }

    ctx.save();
    ctx.font = "bold 7px monospace";
    ctx.textAlign = "center";
    for (const ft of this.floatingTexts) {
      ctx.globalAlpha = Math.max(0, ft.life / ft.maxLife);
      ctx.fillStyle = "#09080d";
      ctx.fillText(ft.text, Math.round(ft.x) + 1, Math.round(ft.y) + 1);
      ctx.fillStyle = ft.color;
      ctx.fillText(ft.text, Math.round(ft.x), Math.round(ft.y));
    }
    ctx.restore();
  }
}
