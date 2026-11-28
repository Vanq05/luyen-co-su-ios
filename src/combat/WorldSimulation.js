import { getCharacterSheets } from "../character/CharacterSpriteBuilder.js";
import { GAME_HEIGHT, GAME_WIDTH, RANK_ESSENCE_COLORS } from "../config/constants.js";
import { BEAST_PHANTOMS } from "../data/CultivationData.js";
import { getStageProgress } from "../data/CultivationData.js";
import { ITEMS_CATALOG, createArmorPiece } from "../data/EquipmentAndItems.js";
import { GU_CATALOG, KILLER_MOVES, createGuWorm, getGuWildSpawnConfig } from "../data/GuCatalog.js";
import { STARTER_GU_HABITATS, MAIN_QUESTS } from "../data/QuestsAndEvents.js";
import {
  bakeEssenceAuraFrames,
  drawCrispPixelText,
  fillPixelEllipse,
  plotPixelEllipse,
  plotPixelLine,
  plotRect,
} from "../engine/PixelSpriteBaker.js";
import { drawSheetFrame, getSheetFrameIndex } from "../engine/SpriteSheet.js";
import { drawBanLongMechanicPillar } from "../world/BanLongAssets.js";
import { MapRenderer } from "../world/MapRenderer.js";
import { getPropSprite } from "../world/PixelMapArt.js";
import { findNavigationPath, resolveWorldMovement } from "../world/WorldGeometry.js";
import { MONSTER_CATALOG, WORLD_MAPS } from "../world/WorldMaps.js";
import { drawBanLongBossPixelArt, getMonsterSpriteFrames } from "./MonsterSpriteBuilder.js";

/**
 * Mô phỏng Thế Giới Mở & Chiến Đấu Thời Gian Thực của "Cổ Tiên Lộ":
 * - Hỗ trợ 11 bản đồ liên thông + Phó bản Thú Huyệt + Tháp Thí Luyện + Lôi Đài Bóng + Vực Vạn Thủ (Boss 5 đầu).
 * - Đánh thường (LMB), Cổ Bản Mệnh (RMB), 7 Ô Chủ Động (1-7), Sát Chiêu (Q/E), Đan Dược (Z/G), Hấp Thu (R), Bế Quan (X), Tương tác (F).
 * - Thiên Trì Điếu Hội (hồ cá Khê Cốc) & Boss 5 đầu VẠN THỦ BÀN LONG với 3 loại cột đá cơ chế.
 */
export class WorldSimulation {
  constructor({ player, assets, sfx, account, onlineHub, onStateChange, onNpcTalk, onStartMinigame, onOpenModal, onAwakenCeremony, onQuestCompleted }) {
    this.player = player;
    this.assets = assets;
    this.sfx = sfx;
    this.account = account;
    this.onlineHub = onlineHub;
    this.onStateChange = onStateChange;
    this.onNpcTalk = onNpcTalk;
    this.onStartMinigame = onStartMinigame;
    this.onOpenModal = onOpenModal;
    this.onAwakenCeremony = onAwakenCeremony;
    this.onQuestCompleted = onQuestCompleted;

    this.mapRenderer = new MapRenderer();
    this.currentMapId = player.currentMapId || "giac_mo";
    this.mode = "world"; // "world" | "dungeon" | "tower" | "arena"
    this.activeInstance = null;

    this.time = 0;
    this.weather = "clear"; // "clear" | "rain" | "storm" | "fog" | "snow"
    this.weatherTimer = 0;

    this.camera = { x: 0, y: 0 };
    this.shakeTimer = 0;
    this.shakeAmp = 0;
    this.hitStopTimer = 0;

    this.spawners = [];
    this.enemies = [];
    this.gatherNodes = [];
    this.selectedTargetId = null;
    this.pendingAutoTravel = null;

    this.playerProjectiles = [];
    this.enemyProjectiles = [];
    this.enemyTelegraphs = [];
    this.zones = [];
    this.decoys = [];
    this.phantoms = [];
    this.vfxEffects = [];
    this.floatingTexts = [];

    // Sự kiện Thiên Trì Điếu Hội
    this.dieuHoi = { active: false, timer: 420, score: 0 };

    // Vạn Thủ Bàn Long (5 đầu + cột đá)
    this.banLongPillars = [];
    this.banLongBreathTimer = 28;
    this.banLongBreathWarn = 0;

    this.loadMap(this.currentMapId);
  }

  getMapDef() {
    if (this.mode === "dungeon" && this.activeInstance?.mapDef) return this.activeInstance.mapDef;
    if (this.mode === "tower" && this.activeInstance?.mapDef) return this.activeInstance.mapDef;
    return WORLD_MAPS[this.currentMapId] ?? WORLD_MAPS.ta_gia_trai;
  }

  loadMap(mapId, customSpawn = null) {
    const mapDef = WORLD_MAPS[mapId] ?? WORLD_MAPS.ta_gia_trai;
    this.mode = "world";
    this.activeInstance = null;
    this.currentMapId = mapDef.id;
    this.player.currentMapId = mapDef.id;

    const sp = customSpawn ?? mapDef.spawn;
    this.player.x = sp.x;
    this.player.y = sp.y;
    this.player.isDead = false;
    this.player.isMeditating = false;
    this.player.isFishing = false;
    this.player.autoPathTarget = null;
    this.player.autoPathWaypoints = [];

    this.enemies = [];
    this.playerProjectiles = [];
    this.enemyProjectiles = [];
    this.enemyTelegraphs = [];
    this.zones = [];
    this.decoys = [];
    this.phantoms = [];
    this.vfxEffects = [];
    this.selectedTargetId = null;
    this.banLongPillars = [];
    if (mapDef.id !== "khe_coc") {
      this.dieuHoi.active = false;
    }

    const rareBonus = this.player.getAptitudeInfo().rareEncounterBonus ?? 0;
    this.gatherNodes = (mapDef.gatherNodes ?? []).map((g) => {
      if (g.kind === "wild_gu") {
        const guRank = GU_CATALOG[g.guId]?.rank ?? 1;
        const cfg = getGuWildSpawnConfig(guRank);
        const forceStarter = !this.player.vitalUid && guRank === 1 && this._isQuestRequiredWildGu(g);
        if (!forceStarter) {
          const chance = Math.min(0.82, cfg.spawnChance * (1 + rareBonus * 0.45));
          const active = Math.random() < chance;
          return { ...g, cooldown: active ? 0 : cfg.respawnSec + Math.floor(Math.random() * 60) };
        }
      }
      return { ...g, cooldown: 0 };
    });
    this.spawners = (mapDef.monsterSpawns ?? []).map((s, idx) => ({
      ...s,
      spawnerId: `sp_${idx}`,
      timer: 0,
      enemyRef: null,
    }));

    for (const spawner of this.spawners) {
      this._spawnFromSpawner(spawner);
    }

    if (mapDef.id === "vuc_van_thu") {
      this._setupBanLongPillars();
    }

    if (mapDef.biome === "snow") this.weather = "snow";
    else if (mapDef.biome === "swamp") this.weather = "fog";
    else this.weather = "clear";

    this._advanceQuest("enter_map", { mapId: mapDef.id });
    this.syncMainQuestState();
    this.addFloatingText(this.player.x, this.player.y - 28, mapDef.name, "#d9b25f");
    if (this.pendingAutoTravel) {
      this._continuePendingAutoTravel();
    }
    this.onStateChange?.(this);
  }

  startDungeon(dungeonDef) {
    const baseMap = WORLD_MAPS[dungeonDef.mapId] ?? WORLD_MAPS.vu_linh_ha;
    const mapDef = {
      ...baseMap,
      id: `inst_${dungeonDef.id}`,
      name: `Phó Bản · ${dungeonDef.name}`,
      subtitle: `${dungeonDef.recRank} · Boss: ${dungeonDef.bossName}`,
      pvpZoneType: "safe",
      portals: [{ id: "exit_inst", label: "Thoát Phó Bản", targetMap: dungeonDef.mapId, x: 640, y: 740 }],
    };
    this.mode = "dungeon";
    this.activeInstance = { dungeonDef, mapDef, cleared: false };
    this.player.x = 640;
    this.player.y = 640;
    this.enemies = [];
    this.spawners = [];
    this.gatherNodes = [];
    this.playerProjectiles = [];
    this.enemyProjectiles = [];

    // Quái hộ vệ theo đúng khu sinh thái biệt lập + Boss
    const minionMap = {
      vu_linh_ha: "lon_rung",
      bac_linh: "thiet_giap_bo_cap",
      suong_truc_lam: "hao_dien_lang",
      hang_thach_nhu: "thach_hau",
      hac_thuy_ho: "coc_doc_hac_thuy",
      xich_nham_coc: "xich_viem_thu",
      vuong_dinh: "soi_tuyet",
      vuc_van_thu: "ban_long_thach_ve",
    };
    const minionType = minionMap[dungeonDef.mapId] ?? "lon_rung";
    this._spawnMonster(minionType, 520, 440);
    this._spawnMonster(minionType, 760, 440);
    this._spawnMonster(dungeonDef.bossType, 640, 290, { isInstanceBoss: true });
    this.addFloatingText(this.player.x, this.player.y - 30, `Vào Phó Bản: ${dungeonDef.name}`, "#5fbf8a");
    this.onStateChange?.(this);
  }

  startTrialTower(floor = 1) {
    const mapDef = {
      ...WORLD_MAPS.giac_mo,
      id: `tower_${floor}`,
      name: `Tháp Thí Luyện · Tầng ${floor}`,
      subtitle: "Khiêu chiến Tàn Hồn Cổ Sư",
      width: 820,
      height: 540,
      portals: [],
    };
    this.mode = "tower";
    this.activeInstance = { floor, mapDef, returnMap: this.currentMapId };
    this.player.x = 410;
    this.player.y = 400;
    this.enemies = [];
    this.spawners = [];
    const eType = floor <= 3 ? "lon_rung_vuong" : floor <= 8 ? "tam_nha_dien_lang" : floor <= 15 ? "mac_vo_tam" : "soi_tuyet_vuong";
    const m = this._spawnMonster(eType, 410, 190, { isInstanceBoss: true });
    if (m) {
      m.name = `Thủ Vệ Tầng ${floor} (${m.name})`;
      m.maxHp = Math.round(m.maxHp * (0.7 + floor * 0.2));
      m.hp = m.maxHp;
    }
    this.addFloatingText(this.player.x, this.player.y - 30, `Tháp Thí Luyện Tầng ${floor}`, "#d9b25f");
    this.onStateChange?.(this);
  }

  startShadowArena(opponent) {
    const returnMap = this.currentMapId === "ta_gia_trai" ? "ta_gia_trai" : "ben_thuong";
    const baseArena = WORLD_MAPS[returnMap] ?? WORLD_MAPS.ben_thuong;
    const isClan = returnMap === "ta_gia_trai";
    const arenaX = isClan ? 920 : 640;
    const arenaY = isClan ? 356 : 430;
    const mapDef = {
      ...baseArena,
      id: isClan ? "arena_clan" : "arena_shadow",
      name: `Lôi Đài Tỷ Thí · ${opponent?.name ?? "Cổ Nguyệt Phương Chính"}`,
      subtitle: `${opponent?.realmLabel ?? "So tài trực tiếp trên Lôi Đài"}`,
      portals: [],
    };
    this.mode = "arena";
    this.activeInstance = { opponent, mapDef, returnMap };
    this.player.x = arenaX - 45;
    this.player.y = arenaY + 25;
    this.enemies = [];
    this.spawners = [];
    const enemyType = opponent?.monsterType || "mac_vo_tam";
    const boss = this._spawnMonster(enemyType, arenaX + 45, arenaY - 25, { isInstanceBoss: true });
    if (boss) {
      boss.name = opponent?.name ? `Lôi Đài · ${opponent.name}` : "Bóng · Thiên Kiêu";
      const rankScale = opponent?.hpMult ?? 1.45;
      boss.maxHp = Math.max(opponent?.baseHp ?? 380, Math.round(this.player.maxHp * rankScale));
      boss.hp = boss.maxHp;
      boss.damage = Math.max(opponent?.baseDmg ?? 18, Math.round(this.player.maxHp * (opponent?.dmgRatio ?? 0.075)));
      boss.stones = opponent?.stones ?? 150;
    }
    this.addFloatingText(arenaX, arenaY - 30, "Lôi Đài Khai Chiến!", "#ffd257");
    this.onStateChange?.(this);
  }

  startDieuHoiEvent() {
    if (this.currentMapId !== "khe_coc") {
      this.loadMap("khe_coc", { x: 640, y: 580 });
    }
    this.dieuHoi = { active: true, timer: 420, score: 0 };
    const hasKing = this.enemies.some((e) => e.typeId === "thien_tri_ngu_vuong");
    if (!hasKing) {
      this._spawnMonster("thien_tri_ngu_vuong", 640, 420, { isEventBoss: true });
    }
    this.addFloatingText(640, 500, "Thiên Trì Điếu Hội Khai Mở!", "#5ef2d6");
    this.onStateChange?.(this);
  }

  exitInstance() {
    const ret = this.activeInstance?.returnMap || this.activeInstance?.dungeonDef?.mapId || "ta_gia_trai";
    this.loadMap(ret);
  }

  respawnPlayer(where = "station") {
    this.player.isDead = false;
    this.player.deathTimer = 0;
    this.player.autoCombat = false;
    this.player.invulnTimer = 1.6;
    if (where === "town" || this.mode !== "world") {
      this.loadMap("ta_gia_trai");
      this.player.recalculateStats(true);
    } else {
      const sp = this.getMapDef().spawn ?? { x: 640, y: 460 };
      this.player.x = sp.x;
      this.player.y = sp.y;
      this.player.recalculateStats(true);
      this.addFloatingText(this.player.x, this.player.y - 26, "Hồi Sinh Tại Trạm!", "#5fbf8a");
    }
    this.onStateChange?.(this);
  }

  _setupBanLongPillars() {
    this.banLongPillars = [
      { id: "p_blood_1", kind: "blood", label: "Huyết Mạch", x: 430, y: 360, hp: 900, maxHp: 900, alive: true },
      { id: "p_blood_2", kind: "blood", label: "Huyết Mạch", x: 850, y: 360, hp: 900, maxHp: 900, alive: true },
      { id: "p_gold_1", kind: "gold", label: "Hoàng Kim Trụ", x: 490, y: 480, hp: 1100, maxHp: 1100, alive: true },
      { id: "p_gold_2", kind: "gold", label: "Hoàng Kim Trụ", x: 790, y: 480, hp: 1100, maxHp: 1100, alive: true },
      { id: "p_stone_1", kind: "stone", label: "Cột Đá Che Chắn", x: 585, y: 505, hp: 99999, maxHp: 99999, alive: true },
      { id: "p_stone_2", kind: "stone", label: "Cột Đá Che Chắn", x: 695, y: 505, hp: 99999, maxHp: 99999, alive: true },
    ];
    this.banLongBreathTimer = 26;
    this.banLongBreathWarn = 0;
  }

  _spawnFromSpawner(spawner) {
    const e = this._spawnMonster(spawner.type, spawner.x, spawner.y, { isEventBoss: spawner.isEventBoss });
    if (e) {
      e.spawnerId = spawner.spawnerId;
      spawner.enemyRef = e;
    }
  }

  _isQuestRequiredWildGu(g) {
    if (!g || g.kind !== "wild_gu") return false;
    if (this.player.activeGuQuest?.guId === g.guId) return true;
    const tId = !this.player.vitalUid ? this.player.targetStarterGuId : null;
    if (!tId) return false;
    return (
      g.guId === tId ||
      (tId === "hac_thi" && g.guId === "bach_thi") ||
      (tId === "dong_bi" && g.guId === "ngoc_bi") ||
      (tId === "thanh_phong_luan" && g.guId === "thinh_phong")
    );
  }

  _spawnMonster(typeId, x, y, extra = {}) {
    const tpl = MONSTER_CATALOG[typeId];
    if (!tpl) return null;
    const isBossOrInst =
      Boolean(extra.isInstanceBoss) ||
      Boolean(extra.isEventBoss) ||
      this.mode !== "world" ||
      tpl.tier === "Bách thú vương" ||
      tpl.tier === "Thiên thú vương";
    const passive = isBossOrInst
      ? false
      : tpl.temperament === "passive"
        ? true
        : tpl.temperament === "mixed"
          ? Math.random() < 0.55
          : false;
    const enemy = {
      id: `m_${Math.random().toString(36).slice(2, 9)}`,
      typeId,
      ...tpl,
      maxHp: tpl.hp,
      hp: tpl.hp,
      x,
      y,
      homeX: x,
      homeY: y,
      facingLeft: false,
      animTime: Math.random() * 2,
      aiTimer: 0.8 + Math.random(),
      passive,
      provoked: !passive,
      provokedTimer: 0,
      wanderTimer: 0.6 + Math.random() * 2,
      wanderVx: 0,
      wanderVy: 0,
      chargeTimer: 0,
      chargeVx: 0,
      chargeVy: 0,
      poisonTimer: 0,
      poisonDps: 0,
      burnTimer: 0,
      burnDps: 0,
      slowTimer: 0,
      slowFactor: 0,
      stunTimer: 0,
      hurtFlash: 0,
      ...extra,
    };
    if (typeId === "van_thu_ban_long") {
      enemy.heads = [
        { name: "Đầu Tả Hạ", dx: -92, dy: -22, hp: 3600, maxHp: 3600, alive: true },
        { name: "Đầu Tả Thượng", dx: -52, dy: -66, hp: 3600, maxHp: 3600, alive: true },
        { name: "Đầu Trung Tâm", dx: 0, dy: -82, hp: 4200, maxHp: 4200, alive: true },
        { name: "Đầu Hữu Thượng", dx: 52, dy: -66, hp: 3600, maxHp: 3600, alive: true },
        { name: "Đầu Hữu Hạ", dx: 92, dy: -22, hp: 3600, maxHp: 3600, alive: true },
      ];
    }
    this.enemies.push(enemy);
    return enemy;
  }

  getSelectedTarget() {
    if (!this.selectedTargetId) return null;
    return this.enemies.find((e) => e.id === this.selectedTargetId) ?? null;
  }

  cycleTarget() {
    if (this.enemies.length === 0) {
      this.selectedTargetId = null;
      return;
    }
    const sorted = [...this.enemies].sort(
      (a, b) => Math.hypot(a.x - this.player.x, a.y - this.player.y) - Math.hypot(b.x - this.player.x, b.y - this.player.y)
    );
    const curIdx = sorted.findIndex((e) => e.id === this.selectedTargetId);
    const next = sorted[(curIdx + 1) % sorted.length];
    this.selectedTargetId = next.id;
    this.onStateChange?.(this);
  }

  navigateTo(goalX, goalY, action = "move", id = null) {
    const mapDef = this.getMapDef();
    const waypoints = findNavigationPath(mapDef, this.player.x, this.player.y, goalX, goalY, (k) => getPropSprite(k));
    const last = waypoints[waypoints.length - 1] ?? { x: goalX, y: goalY };
    this.player.autoPathWaypoints = waypoints.slice(0, -1);
    this.player.autoPathTarget = { x: last.x, y: last.y, action, id };
  }

  handleWorldClick(worldX, worldY, isRightClick = false) {
    if (isRightClick) {
      const ang = Math.atan2(worldY - this.player.y, worldX - this.player.x);
      this.castSkill({ slotId: "vital", angle: ang, distanceRatio: 0.75 });
      return;
    }
    this.pendingAutoTravel = null;

    // Kiểm tra click trúng quái / cột Bàn Long / NPC / Cổng
    for (const e of this.enemies) {
      if (Math.hypot(worldX - e.x, worldY - (e.y - 10)) <= e.radius + 16) {
        this.selectedTargetId = e.id;
        const dist = Math.hypot(e.x - this.player.x, e.y - this.player.y);
        if (dist <= 135) {
          this.performBasicAttack(Math.atan2(e.y - this.player.y, e.x - this.player.x));
        } else {
          this.navigateTo(e.x, e.y, "attack", e.id);
        }
        this.onStateChange?.(this);
        return;
      }
    }

    const mapDef = this.getMapDef();
    if (this.currentMapId === "vuc_van_thu") {
      for (const p of this.banLongPillars) {
        if (!p.alive || p.kind === "stone") continue;
        if (Math.hypot(worldX - p.x, worldY - (p.y - 16)) <= 26) {
          const dist = Math.hypot(p.x - this.player.x, p.y - this.player.y);
          if (dist <= 135) {
            this.performBasicAttack(Math.atan2(p.y - this.player.y, p.x - this.player.x));
          } else {
            this.navigateTo(p.x, p.y + 18, "move");
          }
          return;
        }
      }
    }

    for (const p of mapDef.portals ?? []) {
      if (Math.hypot(worldX - p.x, worldY - p.y) <= 44) {
        if (Math.hypot(this.player.x - p.x, this.player.y - p.y) <= 76) {
          this.interactNearest();
        } else {
          this.navigateTo(p.x, p.y, "portal", p.id);
          this.addFloatingText(p.x, p.y - 24, `Đi tới ${p.label}`, "#5ef2d6");
        }
        return;
      }
    }

    for (const npc of mapDef.npcs ?? []) {
      if (Math.hypot(worldX - npc.x, worldY - npc.y) <= 26) {
        this.navigateTo(npc.x, npc.y + 22, "npc", npc.id);
        return;
      }
    }

    for (const g of this.gatherNodes) {
      if (g.cooldown > 0 && g.kind !== "spirit_spring" && g.kind !== "herb_plot") continue;
      if (Math.hypot(worldX - g.x, worldY - g.y) <= 30) {
        if (Math.hypot(this.player.x - g.x, this.player.y - g.y) <= 48) {
          this.interactNearest();
        } else {
          this.navigateTo(g.x, g.y, "gather", g.id);
        }
        return;
      }
    }

    // Không trúng thực thể -> Đánh thường theo hướng trỏ chuột (hoặc click giữ di chuyển)
    const ang = Math.atan2(worldY - this.player.y, worldX - this.player.x);
    this.performBasicAttack(ang);
  }

  _findPortalTowardMap(fromMapId, goalMapId) {
    if (!fromMapId || !goalMapId || fromMapId === goalMapId) return null;
    const queue = [{ mapId: fromMapId, firstPortal: null }];
    const visited = new Set([fromMapId]);
    while (queue.length > 0) {
      const cur = queue.shift();
      const portals = WORLD_MAPS[cur.mapId]?.portals ?? [];
      for (const p of portals) {
        const fp = cur.firstPortal ?? p;
        if (p.targetMap === goalMapId) return fp;
        if (p.targetMap && !visited.has(p.targetMap) && WORLD_MAPS[p.targetMap]) {
          visited.add(p.targetMap);
          queue.push({ mapId: p.targetMap, firstPortal: fp });
        }
      }
    }
    return null;
  }

  _continuePendingAutoTravel() {
    const dest = this.pendingAutoTravel;
    if (!dest) return;
    if (this.currentMapId !== dest.mapId) {
      const portal = this._findPortalTowardMap(this.currentMapId, dest.mapId);
      if (portal) {
        this.navigateTo(portal.x, portal.y, "portal", portal.id);
        this.addFloatingText(
          this.player.x,
          this.player.y - 26,
          `Tự động đi tới: ${WORLD_MAPS[dest.mapId]?.name || dest.mapId}...`,
          "#4de0c9"
        );
        return;
      }
      if (this.player.hasAwakened && WORLD_MAPS[dest.mapId]) {
        this.loadMap(dest.mapId);
        return;
      }
      this.pendingAutoTravel = null;
      return;
    }

    this.pendingAutoTravel = null;
    if (dest.action === "enemy" || dest.action === "boss") {
      let best = null;
      let bestD = Infinity;
      for (const e of this.enemies) {
        if (e.hp <= 0) continue;
        if (dest.targetId && e.typeId !== dest.targetId) continue;
        if (!dest.targetId && e.ai === "dummy") continue;
        const d = Math.hypot(e.x - this.player.x, e.y - this.player.y);
        if (d < bestD) {
          bestD = d;
          best = e;
        }
      }
      if (best) {
        this.selectedTargetId = best.id;
        this.navigateTo(best.x, best.y, "attack", best.id);
      } else {
        this.navigateTo(dest.x, dest.y, "move");
      }
    } else if (dest.action === "npc") {
      this.navigateTo(dest.x, dest.y + 18, "npc", dest.targetId);
    } else if (dest.action === "gather") {
      let bestG = null;
      let bestD = Infinity;
      for (const g of this.gatherNodes) {
        if (g.cooldown > 0 || g.kind === "spirit_spring" || g.kind === "herb_plot") continue;
        if (dest.targetId && g.id === dest.targetId) {
          bestG = g;
          break;
        }
        const d = Math.hypot(g.x - this.player.x, g.y - this.player.y);
        if (d < bestD) {
          bestD = d;
          bestG = g;
        }
      }
      if (bestG) {
        this.navigateTo(bestG.x, bestG.y, "gather", bestG.id);
      } else {
        this.navigateTo(dest.x, dest.y, "move");
      }
    } else {
      this.navigateTo(dest.x, dest.y, "move");
    }
    this.addFloatingText(this.player.x, this.player.y - 26, `Tự động tới: ${dest.title || "Mục tiêu"}`, "#5ef2d6");
  }

  navigateToMap(targetMapId, goalX = null, goalY = null) {
    this.pendingAutoTravel = {
      mapId: targetMapId,
      x: goalX ?? 640,
      y: goalY ?? 450,
      action: "move",
      targetId: null,
      title: WORLD_MAPS[targetMapId]?.name || targetMapId,
    };
    this._continuePendingAutoTravel();
  }

  startAutoPathToQuest(quest, opts = {}) {
    if (!quest?.target) return;
    if (quest.goal?.type === "choose_target_gu") {
      if (this.player.hasAwakened) {
        this.onAwakenCeremony?.({ type: "open_choose_gu" });
        return;
      }
      this.addFloatingText(this.player.x, this.player.y - 26, "Hãy bước xuống Nguyên Tuyền Khai Khiếu trước!", "#f2c14e");
    }

    // Nhiệm vụ Tự Thân Tầm Cổ: Chỉ chỉ cổng hoặc mách hướng Linh Giác, KHÔNG tự đi tới tận chỗ Cổ trùng!
    if (quest.goal?.type === "refine_first_gu") {
      const hab = STARTER_GU_HABITATS[this.player.targetStarterGuId] ?? STARTER_GU_HABITATS.nguyet_quang;
      const guName = GU_CATALOG[hab.guId]?.name ?? "Cổ Bản Mệnh";
      if (this.currentMapId !== hab.mapId) {
        const portal = this._findPortalTowardMap(this.currentMapId, hab.mapId);
        if (portal) {
          this.navigateTo(portal.x, portal.y, "portal", portal.id);
          this.addFloatingText(this.player.x, this.player.y - 28, `Đi tới cổng sang ${hab.areaName}!`, "#4de0c9");
        } else {
          this.addFloatingText(this.player.x, this.player.y - 28, hab.hint, "#ffe15c");
        }
        return;
      }
      const dx = hab.x - this.player.x;
      const dy = hab.y - this.player.y;
      const dist = Math.round(Math.hypot(dx, dy) / 14);
      const ns = Math.abs(dy) > 40 ? (dy < 0 ? "Bắc" : "Nam") : "";
      const ew = Math.abs(dx) > 40 ? (dx > 0 ? "Đông" : "Tây") : "";
      const dir = [ns, ew].filter(Boolean).join(" ") || "ngay đây";
      this.addFloatingText(this.player.x, this.player.y - 30, `Linh Giác: [${guName}] hướng ${dir} (~${dist} bước)!`, "#ffe15c");
      return;
    }

    const t = quest.target;
    if (!opts.autoTravel) {
      if (quest.goal?.type === "reach_rank") {
        const prog = getStageProgress(this.player.stageLevel, this.player.cultivationExp);
        if (prog.readyForBreakthrough) {
          this.onOpenModal?.("char", "main");
          this.addFloatingText(this.player.x, this.player.y - 26, "Khiếu Bích đã mãn! Bấm Xung Kích Đột Phá!", "#5ef2d6");
        } else {
          this.onOpenModal?.("cultivate", "main");
          this.addFloatingText(this.player.x, this.player.y - 26, "Dùng Nguyên Thạch cọ rửa Khiếu Bích tu luyện!", "#5ef2d6");
        }
        return;
      }
      if (quest.goal?.type === "compound_gu") {
        this.onOpenModal?.("gu", "refine");
        this.addFloatingText(this.player.x, this.player.y - 26, "Hợp Luyện Cổ Phương để hoàn tất Chương!", "#ffd257");
        return;
      }
      if (quest.goal?.type === "gamble_stone") {
        const hasRawStone =
          this.player.getItemCount("mao_thach_so") > 0 ||
          this.player.getItemCount("mao_thach_trung") > 0 ||
          this.player.getItemCount("mao_thach_cao") > 0;
        if (hasRawStone) {
          this.onOpenModal?.("bag", "gamble");
          this.addFloatingText(this.player.x, this.player.y - 26, "Mở Đổ Thạch cắt Mao Thạch!", "#ffd257");
          return;
        }
      }
    }

    if (
      opts.autoTravel &&
      this.currentMapId === t.mapId &&
      Math.hypot(this.player.x - t.x, this.player.y - t.y) <= 44 &&
      t.panel
    ) {
      this.onOpenModal?.(t.panel, t.subTab || "main");
      return;
    }

    this.pendingAutoTravel = {
      mapId: t.mapId,
      x: t.x,
      y: t.y,
      action: t.type || "move",
      targetId: t.targetId || null,
      title: quest.title,
    };
    this._continuePendingAutoTravel();
  }

  getNearbyInteractable() {
    const mapDef = this.getMapDef();
    let bestPortal = null;
    let bestDist = Infinity;
    for (const p of mapDef.portals ?? []) {
      const d = Math.hypot(this.player.x - p.x, this.player.y - p.y);
      if (d <= 76 && d < bestDist) {
        bestDist = d;
        bestPortal = p;
      }
    }
    if (bestPortal) {
      return { kind: "portal", label: `F · Chuyển: ${bestPortal.label}`, data: bestPortal };
    }
    for (const n of mapDef.npcs ?? []) {
      if (Math.hypot(this.player.x - n.x, this.player.y - n.y) <= 44) {
        return { kind: "npc", label: `F · Trò chuyện ${n.name}`, data: n };
      }
    }
    for (const g of this.gatherNodes) {
      if (g.kind === "spirit_spring" && Math.hypot(this.player.x - g.x, this.player.y - g.y) <= 48) {
        return {
          kind: "gather",
          label: !this.player.hasAwakened ? "F · Bước xuống Nguyên Tuyền Khai Khiếu" : "F · Hấp Thu Linh Khí Nguyên Tuyền",
          data: g,
        };
      }
      if (g.kind === "herb_plot" && Math.hypot(this.player.x - g.x, this.player.y - g.y) <= 36) {
        const plot = this.player.gardenPlots[g.plotIndex] ?? { state: "empty" };
        let lbl = "F · Ô Dược Điền Trống (Cần Hạt Giống)";
        if (plot.state === "empty") {
          const seed = this.player.getBestAvailableSeed();
          lbl = seed ? `F · Gieo ${seed.itemDef.name} (${seed.count})` : "F · Ô Dược Điền Trống (Cần Hạt Giống)";
        } else if (plot.state === "growing") {
          const seedName = ITEMS_CATALOG[plot.seedId]?.name ?? "Linh Thảo";
          lbl = plot.watered
            ? `Đang mọc: ${seedName} (${Math.ceil(plot.timer)}s)`
            : `F · Tưới Linh Tuyền (${seedName})`;
        } else {
          const seedName = ITEMS_CATALOG[plot.seedId]?.name ?? "Linh Thảo";
          lbl = `F · Thu Hoạch ${seedName}`;
        }
        return { kind: "gather", label: lbl, data: g };
      }
      if (g.cooldown <= 0 && Math.hypot(this.player.x - g.x, this.player.y - g.y) <= 44) {
        let prefix = g.kind === "fish" ? "F · Câu cá" : g.kind === "mine" ? "F · Khai mỏ" : "F · Hái thảo dược";
        if (g.kind === "wild_gu") {
          const gu = GU_CATALOG[g.guId];
          const cfg = getGuWildSpawnConfig(gu?.rank ?? 1);
          const costTag = `${cfg.baitCost} Mồi${cfg.stoneCost ? ` · ${cfg.stoneCost} Thạch` : ""}`;
          prefix = `F · Bắt [C${gu?.rank ?? 1}] ${gu?.shortLabel ?? "Dã Cổ"} (${costTag})`;
        }
        return { kind: "gather", label: prefix, data: g };
      }
    }
    return null;
  }

  interactNearest() {
    if (this.currentMapId === "hang_ngam_khai_khieu" && !this.player.hasAwakened) {
      this.confirmAwakeningAtCurrentStep(false);
      return true;
    }
    const near = this.getNearbyInteractable();
    if (!near) return false;
    if (near.kind === "portal") {
      if (near.data.id === "exit_inst") {
        this.exitInstance();
      } else {
        if (near.data.id === "to_ta_gia" && this.player.isDreamTrial) {
          this.player.completeDreamTransitionToYouth();
          this.onAwakenCeremony?.({ type: "dream_end" });
        }
        this.loadMap(near.data.targetMap, near.data.spawnX ? { x: near.data.spawnX, y: near.data.spawnY } : null);
      }
      return true;
    }
    if (near.kind === "npc") {
      this._advanceQuest("talk_npc", { npcId: near.data.id });
      this.onNpcTalk?.(near.data);
      return true;
    }
    if (near.kind === "gather") {
      const g = near.data;
      if (g.kind === "spirit_spring") {
        if (!this.player.hasAwakened) {
          const res = this.player.awakenApertureOnly();
          this._advanceQuest("awaken_aperture", {});
          this.sfx?.play("fusionSuccess");
          this.spawnVfx("vfx/nguyet-quang", g.x, g.y, { scale: 0.9 });
          this.onAwakenCeremony?.({ type: "awakened", ...res });
          this.onStateChange?.(this);
          return true;
        }
        if (!this.player.hasChosenTargetGu) {
          this.onAwakenCeremony?.({ type: "open_choose_gu" });
          return true;
        }
        if (g.cooldown > 0) {
          this.addFloatingText(this.player.x, this.player.y - 26, `Nguyên Tuyền đang tụ khí (${Math.ceil(g.cooldown)}s)`, "#b8ad94");
          return false;
        }
        g.cooldown = 20;
        this.player.mp = this.player.maxMp;
        this.player.addCultivationExp(35, this._playerEvents());
        this.sfx?.play("pickup");
        this.addFloatingText(this.player.x, this.player.y - 28, "Tắm Nguyên Tuyền: Đầy Chân Nguyên +35 Tu Vi!", "#5ef2d6");
        this.onStateChange?.(this);
        return true;
      }

      if (g.kind === "herb_plot") {
        const plot = this.player.gardenPlots[g.plotIndex];
        if (!plot) return false;
        if (plot.state === "empty") {
          const seed = this.player.getBestAvailableSeed();
          if (!seed) {
            this.addFloatingText(g.x, g.y - 20, "Cần Hạt Giống! Hãy hái thảo dược, săn thú hoặc mua ở Thương Hội (B)!", "#d94854");
            return false;
          }
          this.player.consumeItem(seed.id, 1);
          plot.state = "growing";
          plot.seedId = seed.id;
          plot.timer = seed.itemDef.growTime ?? 32;
          plot.watered = false;
          this.sfx?.play("pickup");
          this.addFloatingText(g.x, g.y - 18, `Đã gieo ${seed.itemDef.name}! (${plot.timer}s)`, "#4de0c9");
        } else if (plot.state === "growing") {
          if (plot.watered) {
            this.addFloatingText(g.x, g.y - 18, `Đã tưới rồi — chờ ${Math.ceil(plot.timer)}s nữa!`, "#8b9bb0");
            return false;
          }
          plot.watered = true;
          plot.timer = Math.max(4, Math.round(plot.timer * 0.65));
          this.sfx?.play("pickup");
          this.addFloatingText(g.x, g.y - 18, `Tưới Linh Tuyền: còn ${Math.ceil(plot.timer)}s!`, "#5ef2d6");
        } else {
          const seedDef = ITEMS_CATALOG[plot.seedId] ?? ITEMS_CATALOG.hat_linh_thao;
          for (const hi of seedDef.harvestItems ?? [{ id: "thao_duoc", count: 2 }]) {
            this.player.addItem(hi.id, hi.count);
          }
          let bonusMsg = "";
          if (seedDef.bonusSeedId && Math.random() < (seedDef.bonusSeedChance ?? 0)) {
            this.player.addItem(seedDef.bonusSeedId, 1);
            bonusMsg = ` +1 ${ITEMS_CATALOG[seedDef.bonusSeedId]?.name ?? "Hạt hiếm"}`;
          }
          this.player.addCultivationExp(seedDef.exp ?? 22, this._playerEvents());
          this._advanceQuest("gather_any", {});
          this._advanceSideAndClanQuests("gather_any", {});
          plot.state = "empty";
          plot.seedId = null;
          plot.timer = 0;
          plot.watered = false;
          this.sfx?.play("fusionSuccess");
          this.addFloatingText(g.x, g.y - 20, `Thu hoạch ${seedDef.name}${bonusMsg}!`, "#4de0c9");
        }
        this.onStateChange?.(this);
        return true;
      }
      if (g.kind === "fish") {
        if (!this.player.consumeItem("moi_cau_thuong", 1)) {
          this.addFloatingText(this.player.x, this.player.y - 26, "Hết Mồi Câu Thường (mua tại Chợ B)!", "#d0573c");
          return false;
        }
        this.player.isFishing = true;
        this.onStartMinigame?.("fishing", {
          node: g,
          onSuccess: (bonus) => {
            this.player.isFishing = false;
            this.player.addItem("ca_linh", bonus ? 2 : 1);
            this.player.nguyenThach += bonus ? 18 : 8;
            this.player.addCultivationExp(22, this._playerEvents());
            this._advanceQuest("gather_any", {});
            this._advanceSideAndClanQuests("gather_any", {});
            if (this.dieuHoi.active) {
              this.dieuHoi.score += 1;
              const fishBoss = this.enemies.find((e) => e.typeId === "thien_tri_ngu_vuong");
              if (fishBoss) this._damageEnemy(fishBoss, 380, { path: "thuy_dao" });
            }
            this.addFloatingText(this.player.x, this.player.y - 28, `Câu được Cá Linh! (+${bonus ? 18 : 8} 💎)`, "#5ef2d6");
            this.sfx?.play("pickup");
            this.onStateChange?.(this);
          },
          onFail: () => {
            this.player.isFishing = false;
            this.addFloatingText(this.player.x, this.player.y - 26, "Cá sổng mất rồi!", "#b8ad94");
          },
        });
        return true;
      }

      if (g.kind === "wild_gu") {
        if (!this.player.hasAwakened) {
          this.addFloatingText(this.player.x, this.player.y - 26, "Cần Khai Khiếu tại Nguyên Tuyền trước khi luyện Cổ!", "#f2c14e");
          return false;
        }
        const guDef = GU_CATALOG[g.guId];
        const guRank = guDef?.rank ?? 1;
        const cfg = getGuWildSpawnConfig(guRank);
        const isFirstVitalSeek = !this.player.vitalUid && guRank === 1 && this._isQuestRequiredWildGu(g);
        const maxCap = this.player.getMaxGuCapacity();
        if (this.player.vitalUid && this.player.guBag.length >= maxCap) {
          this.addFloatingText(
            this.player.x,
            this.player.y - 26,
            `Không Khiếu đạt giới hạn (${this.player.guBag.length}/${maxCap} Cổ)! Hãy Hợp Luyện hoặc Thăng Chuyển!`,
            "#f2c14e"
          );
          return false;
        }
        if (!isFirstVitalSeek && (this.player.stageLevel ?? 1) < cfg.minStageLevel) {
          this.addFloatingText(
            this.player.x,
            this.player.y - 26,
            `[${guDef?.name || "Dã Cổ"} C${guRank}] áp lực quá mạnh! Cần tu vi tối thiểu Chuyển ${guRank}!`,
            "#ff8570"
          );
          return false;
        }
        if (cfg.guardRadius > 0) {
          const guardian = this.enemies.find(
            (e) => e.hp > 0 && e.ai !== "dummy" && Math.hypot(e.x - g.x, e.y - g.y) <= cfg.guardRadius
          );
          if (guardian) {
            guardian.provoked = true;
            guardian.provokedTimer = 10;
            this.addFloatingText(
              this.player.x,
              this.player.y - 26,
              `Có [${guardian.name}] canh giữ ${guDef?.shortLabel || "Dã Cổ"}! Phải diệt trước!`,
              "#ff6b78"
            );
            return false;
          }
        }
        if (!isFirstVitalSeek) {
          if (this.player.getItemCount("moi_bat_co") < cfg.baitCost) {
            this.addFloatingText(
              this.player.x,
              this.player.y - 26,
              `Cần ${cfg.baitCost} Mồi Bắt Dã Cổ (mua tại Chợ B)!`,
              "#d0573c"
            );
            return false;
          }
          if (cfg.stoneCost > 0 && this.player.nguyenThach < cfg.stoneCost) {
            this.addFloatingText(
              this.player.x,
              this.player.y - 26,
              `Cần ${cfg.stoneCost} Nguyên Thạch để áp chế Dã Cổ Chuyển ${guRank}!`,
              "#d0573c"
            );
            return false;
          }
          this.player.consumeItem("moi_bat_co", cfg.baitCost);
          this.player.nguyenThach -= cfg.stoneCost;
        }
        this.onStartMinigame?.("refine", {
          guName: `${guDef?.name ?? "Dã Cổ"} (Chuyển ${guRank})`,
          guRank,
          onSuccess: () => {
            g.cooldown = cfg.respawnSec;
            const res = this.player.acquireRefinedWildGu(g.guId);
            this._advanceQuest("refine_first_gu", {});
            this.sfx?.play("fusionSuccess");
            this.addFloatingText(
              this.player.x,
              this.player.y - 30,
              res.boundAsVital ? `Luyện Hóa Cổ Bản Mệnh: ${res.worm.name}!` : `Thu phục hiếm: ${res.worm.name} (C${guRank})!`,
              "#ffd257"
            );
            this.onAwakenCeremony?.({ type: "gu_refined", ...res });
            this.onStateChange?.(this);
          },
          onFail: () => {
            g.cooldown = Math.round(cfg.respawnSec * 0.55);
            if (guRank >= 4) {
              const backlash = Math.round(this.player.maxHp * 0.12);
              this.player.hp = Math.max(1, this.player.hp - backlash);
              this.addFloatingText(this.player.x, this.player.y - 26, `Luyện Cổ C${guRank} phản phệ -${backlash} HP! Dã Cổ độn mất!`, "#ff4d6a");
            } else {
              this.addFloatingText(this.player.x, this.player.y - 26, `Dã Cổ kinh động lẩn trốn (${g.cooldown}s)!`, "#d0573c");
            }
          },
        });
        return true;
      }

      // Thảo dược / Mỏ đá
      g.cooldown = 14;
      const itemId = g.item || (g.kind === "mine" ? "ngoc_vun" : "thao_duoc");
      this.player.addItem(itemId, 2);
      this.player.nguyenThach += g.kind === "mine" ? 12 : 4;
      this.player.addCultivationExp(15, this._playerEvents());
      let seedMsg = "";
      if (g.kind === "herb") {
        if (Math.random() < 0.55) {
          this.player.addItem("hat_linh_thao", 1);
          seedMsg = " +1 Hạt Âm Thảo";
        } else if (Math.random() < 0.25) {
          this.player.addItem("hat_huyet_thao", 1);
          seedMsg = " +1 Hạt Huyết Thảo";
        }
      }
      this._advanceQuest("gather_any", {});
      this._advanceSideAndClanQuests("gather_any", {});
      this.sfx?.play("pickup");
      this.addFloatingText(this.player.x, this.player.y - 24, `+2 ${itemId === "thao_duoc" ? "Thảo Dược" : "Tài Nguyên"}${seedMsg}`, "#4de0c9");
      this.onStateChange?.(this);
      return true;
    }
    return false;
  }

  performBasicAttack(angle = null) {
    if (this.player.isDead || this.player.basicAttackCd > 0) return false;
    const target = this.getSelectedTarget();
    const ang = angle ?? (target ? Math.atan2(target.y - this.player.y, target.x - this.player.x) : this.player.facing);
    this.player.facing = ang;
    this.player.attackAnimTimer = 0.24;
    this.player.basicAttackCd = this.player.getBasicAttackCooldown();
    this.player.isMeditating = false;
    this.player.isFishing = false;
    this.player.isStealthed = false;
    this.player.stealthBreakTimer = 1.2;

    const dmg = this.player.getBasicAttackDamage();
    const vital = this.player.getVitalGu();
    const isRanged = vital && (vital.path === "nguyet_dao" || vital.path === "kiem_dao" || vital.aimType === "line");
    const basicLifesteal = this.player.chosenPath === "huyet_dao" ? 0.08 : 0;

    if (isRanged) {
      this.playerProjectiles.push({
        x: this.player.x + Math.cos(ang) * 10,
        y: this.player.y - 8 + Math.sin(ang) * 10,
        vx: Math.cos(ang) * 230,
        vy: Math.sin(ang) * 230,
        radius: 10,
        damage: dmg,
        pierceLeft: 1,
        hitIds: new Set(),
        life: 0.65,
        color: vital.color || "#5ef2d6",
        gu: { ...vital, lifesteal: vital.lifesteal ?? basicLifesteal },
      });
      this.spawnVfx("vfx/nguyet-quang", this.player.x + Math.cos(ang) * 18, this.player.y - 8 + Math.sin(ang) * 18, { angle: ang, scale: 0.45 });
    } else {
      this._damageInCone(this.player.x, this.player.y - 6, ang, Math.PI * 0.55, 62, dmg, {
        ...(vital ?? { path: "luc_dao" }),
        lifesteal: vital?.lifesteal ?? basicLifesteal,
      });
      this.spawnVfx("vfx/hit-spark", this.player.x + Math.cos(ang) * 24, this.player.y - 6 + Math.sin(ang) * 24, { scale: 0.5 });
    }
    this.player.thoughtGauge = Math.min(100, this.player.thoughtGauge + 10);
    this.sfx?.play("slash");
    return true;
  }

  castSkill({ slotId, angle, distanceRatio = 0.7 }) {
    if (this.player.isDead) return false;
    this.player.isMeditating = false;
    this.player.isFishing = false;

    const cdInfo = this.player.getCooldownInfo(slotId);
    if (cdInfo.rem > 0) {
      this.addFloatingText(this.player.x, this.player.y - 24, `Hồi chiêu (${cdInfo.rem.toFixed(1)}s)`, "#b8ad94");
      return false;
    }

    // Lướt né Space
    if (slotId === "dash") {
      if (this.player.stamina < 22) {
        this.addFloatingText(this.player.x, this.player.y - 24, "Cạn Thể Lực!", "#f2c14e");
        return false;
      }
      this.player.stamina -= 22;
      this.player.startCooldown("dash", 1.1);
      const moveGu = this.player.getEquippedGu("move");
      const dist = moveGu?.range ?? 78;
      const dur = 0.17;
      const ang = angle ?? this.player.facing;
      this.player.facing = ang;
      this.player.dashTimer = dur;
      this.player.dashVx = (Math.cos(ang) * dist) / dur;
      this.player.dashVy = (Math.sin(ang) * dist) / dur;
      this.player.dashGu = moveGu;
      if (this.player.hasGuardStance()) {
        // Hướng Thủ: Húc lướt gây choáng 1s & 2x sát thương cơ bản!
        this._damageInCircle(this.player.x + Math.cos(ang) * 32, this.player.y + Math.sin(ang) * 32, 34, this.player.getBasicAttackDamage() * 2, { stunDuration: 1.0, path: "tho_dao" });
      }
      if (moveGu?.decoyDuration) {
        this.decoys.push({ x: this.player.x, y: this.player.y, life: moveGu.decoyDuration, damage: 35 });
      }
      this.spawnVfx("vfx/anh-bo", this.player.x, this.player.y, { scale: 0.7 });
      this.sfx?.play("dash");
      this.onStateChange?.(this);
      return true;
    }

    // Sát Chiêu Q / E
    if (slotId === "km1" || slotId === "km2") {
      const kmId = this.player.killerMoveIds[slotId === "km1" ? 0 : 1];
      const km = KILLER_MOVES.find((k) => k.id === kmId) ?? KILLER_MOVES[0];
      if (this.player.thoughtGauge < km.thoughtCost || this.player.mp < km.mpCost) {
        this.addFloatingText(this.player.x, this.player.y - 26, "Chưa đủ Thanh Niệm / Chân Nguyên!", "#d9b25f");
        return false;
      }
      this.player.thoughtGauge -= km.thoughtCost;
      this.player.mp -= km.mpCost;
      this.player.isStealthed = false;
      this.player.stealthBreakTimer = 1.2;
      this.player.startCooldown(slotId, (km.cooldown ?? 8) * this.player.getCooldownMult());
      const target = this.getSelectedTarget();
      const ang = angle ?? (target ? Math.atan2(target.y - this.player.y, target.x - this.player.x) : this.player.facing);
      const baseDmg = Math.round(this.player.getBasicAttackDamage() * km.damageMult * this.player.getDamageMultiplier({ path: km.path }));

      if (km.kind === "burst_projectiles") {
        const cnt = km.count ?? 7;
        for (let i = 0; i < cnt; i++) {
          const a = ang + (i - (cnt - 1) / 2) * 0.16;
          this.playerProjectiles.push({
            x: this.player.x,
            y: this.player.y - 8,
            vx: Math.cos(a) * 235,
            vy: Math.sin(a) * 235,
            radius: 13,
            damage: Math.round(baseDmg * 0.52),
            pierceLeft: 3,
            hitIds: new Set(),
            life: 0.9,
            color: km.color,
            gu: { path: km.path },
          });
        }
      } else if (km.kind === "phantom_stampede") {
        for (let i = 0; i < 3; i++) {
          const ph = BEAST_PHANTOMS[i % BEAST_PHANTOMS.length];
          const a = ang + (i - 1) * 0.25;
          this.phantoms.push({
            x: this.player.x,
            y: this.player.y,
            vx: Math.cos(a) * 190,
            vy: Math.sin(a) * 190,
            life: 0.9,
            damage: Math.round(baseDmg * 0.7),
            color: ph.color,
            name: ph.name,
            hitIds: new Set(),
          });
        }
      } else {
        this.spawnVfx("vfx/huyet-nguyet", this.player.x, this.player.y - 6, { scale: 1.0 });
        this._damageInCircle(this.player.x, this.player.y, km.range ?? 125, baseDmg, {
          path: km.path,
          stunDuration: km.stunDuration,
          lifesteal: km.lifesteal,
        });
      }
      this.triggerShake(0.22, 4);
      this.sfx?.play("ult");
      this.addFloatingText(this.player.x, this.player.y - 34, `Sát Chiêu: ${km.name}!`, km.color);
      this.onStateChange?.(this);
      return true;
    }

    // Cổ Trùng (vital hoặc slot_0..6)
    const gu = this.player.getEquippedGu(slotId);
    if (!gu) return false;
    if ((gu.hunger ?? 100) <= 0) {
      this.addFloatingText(this.player.x, this.player.y - 26, `${gu.shortLabel} bị đói suy kiệt!`, "#d0573c");
      return false;
    }
    const stageRank = this.player.getStage().rank;
    const effectiveMpCost = Math.round((gu.mpCost ?? 0) * ((gu.rank ?? 1) > stageRank ? 1.5 : 1.0));
    if (this.player.mp < effectiveMpCost) {
      this.addFloatingText(this.player.x, this.player.y - 26, "Chân nguyên không đủ! (Giữ R Hấp thu)", "#5ef2d6");
      return false;
    }

    this.player.mp -= effectiveMpCost;
    this.player.thoughtGauge = Math.min(100, this.player.thoughtGauge + 14);
    gu.mastery = (gu.mastery ?? 0) + 2;
    this.player.pathExps[gu.path] = (this.player.pathExps[gu.path] ?? 0) + 4;
    this.player.startCooldown(slotId, (gu.cooldown ?? 1.5) * this.player.getCooldownMult());

    const target = this.getSelectedTarget();
    const ang = angle ?? (target ? Math.atan2(target.y - this.player.y, target.x - this.player.x) : this.player.facing);
    this.player.facing = ang;

    if (gu.mpRestore) {
      this.player.mp = Math.min(this.player.maxMp, this.player.mp + gu.mpRestore);
      this.addFloatingText(this.player.x, this.player.y - 26, `+${gu.mpRestore} Chân nguyên`, "#5ef2d6");
    }
    if (gu.healAmount) {
      const h = this.player.heal(gu.healAmount);
      this.addFloatingText(this.player.x, this.player.y - 26, `+${h} Sinh lực`, "#5fbf8a");
    }
    if (gu.shieldAmount) {
      this.player.shield += gu.shieldAmount;
      this.addFloatingText(this.player.x, this.player.y - 26, `Hộ Thuẫn +${gu.shieldAmount}`, "#dce8ff");
    }
    if (gu.resetsBasicSlotsCd) {
      this.player.cooldowns.slot_0 = 0;
      this.player.cooldowns.slot_1 = 0;
      this.player.cooldowns.slot_2 = 0;
      this.addFloatingText(this.player.x, this.player.y - 34, "Nghịch Lưu Thời Gian: Xóa Hồi Chiêu Ô 1–3!", "#ffd978");
    }

    const dmg = Math.round((gu.damage ?? 0) * this.player.getDamageMultiplier(gu));
    if (gu.aimType === "dash") {
      const dist = gu.range ?? 80;
      const dur = 0.16;
      this.player.dashTimer = dur;
      this.player.dashVx = (Math.cos(ang) * dist) / dur;
      this.player.dashVy = (Math.sin(ang) * dist) / dur;
      this.player.dashGu = gu;
      if (gu.decoyDuration) {
        this.decoys.push({ x: this.player.x, y: this.player.y, life: gu.decoyDuration, damage: Math.max(24, dmg) });
      }
      if (dmg > 0) {
        this._damageInCircle(this.player.x + Math.cos(ang) * 32, this.player.y + Math.sin(ang) * 32, 34, dmg, gu);
      }
      this.spawnVfx(gu.vfxKey ?? "vfx/anh-bo", this.player.x, this.player.y, { scale: 0.7 });
      this.sfx?.play("dash");
    } else if (dmg > 0) {
      this.player.isStealthed = false;
      this.player.stealthBreakTimer = 1.2;
      if (gu.summonsPhantom) {
        const ph = BEAST_PHANTOMS[Math.floor(Math.random() * Math.min(BEAST_PHANTOMS.length, this.player.unlockedPhantoms.length + 2))];
        this.phantoms.push({
          x: this.player.x,
          y: this.player.y,
          vx: Math.cos(ang) * 195,
          vy: Math.sin(ang) * 195,
          life: 0.75,
          damage: Math.round(dmg * 0.65),
          color: ph.color,
          name: ph.name,
          hitIds: new Set(),
        });
      }

      if (gu.aimType === "line") {
        const count = gu.projectileCount ?? 1;
        for (let i = 0; i < count; i++) {
          const a = ang + (i - (count - 1) / 2) * 0.22;
          this.playerProjectiles.push({
            x: this.player.x + Math.cos(a) * 10,
            y: this.player.y - 8 + Math.sin(a) * 10,
            vx: Math.cos(a) * 215,
            vy: Math.sin(a) * 215,
            speed: 215,
            radius: gu.radius ?? 11,
            damage: dmg,
            pierceLeft: gu.pierce ?? 1,
            homing: Boolean(gu.homing),
            hitIds: new Set(),
            life: (gu.range ?? 150) / 215 + 0.1,
            color: gu.color,
            gu,
          });
        }
        this.spawnVfx(gu.vfxKey ?? "vfx/nguyet-quang", this.player.x + Math.cos(ang) * 20, this.player.y - 8 + Math.sin(ang) * 20, { angle: ang, scale: 0.55 });
        this.sfx?.play(gu.homing ? "blood" : "slash");
      } else if (gu.aimType === "arc") {
        this.spawnVfx(gu.vfxKey ?? "vfx/huyet-nguyet", this.player.x + Math.cos(ang) * 24, this.player.y - 6 + Math.sin(ang) * 24, { angle: ang, scale: 0.75 });
        this._damageInCone(this.player.x, this.player.y - 6, ang, gu.arcSpread ?? Math.PI * 0.5, gu.range ?? 100, dmg, gu);
        this.sfx?.play("fire");
      } else if (gu.aimType === "aoe") {
        const dist = Math.max(24, (gu.range ?? 120) * Math.max(0.35, distanceRatio));
        const tx = this.player.x + Math.cos(ang) * dist;
        const ty = this.player.y + Math.sin(ang) * dist;
        this.spawnVfx(gu.vfxKey ?? "vfx/hoa-than", tx, ty, { scale: 0.65 });
        this._damageInCircle(tx, ty, gu.radius ?? 36, dmg, gu);
        this.sfx?.play("fire");
      }
    } else {
      this.spawnVfx("vfx/hit-spark", this.player.x, this.player.y - 10, { scale: 0.55 });
      this.sfx?.play("pickup");
    }

    this.onStateChange?.(this);
    return true;
  }

  useQuickItem(idx) {
    const slotKey = `qi_${idx}`;
    const cdInfo = this.player.getCooldownInfo(slotKey);
    if (cdInfo.rem > 0) return false;
    const itemId = this.player.quickItemIds[idx];
    if (!itemId) return false;
    if (!this.player.consumeItem(itemId, 1)) {
      this.addFloatingText(this.player.x, this.player.y - 24, "Hết vật phẩm!", "#d0573c");
      return false;
    }
    this.player.startCooldown(slotKey, 3.0);
    const it = ITEMS_CATALOG[itemId];
    if (it?.healHp || it?.healMp) {
      const h = it.healHp ? this.player.heal(it.healHp) : 0;
      if (it.healMp) this.player.mp = Math.min(this.player.maxMp, this.player.mp + it.healMp);
      const parts = [];
      if (h > 0) parts.push(`+${h} HP`);
      if (it.healMp) parts.push(`+${it.healMp} MP`);
      this.addFloatingText(this.player.x, this.player.y - 26, parts.join(" · ") || "Đã dùng!", it.color || "#5fbf8a");
    } else {
      this.player.mp = Math.min(this.player.maxMp, this.player.mp + 120);
      this.addFloatingText(this.player.x, this.player.y - 26, "+120 Chân nguyên", "#5ef2d6");
    }
    this.sfx?.play("pickup");
    this.onStateChange?.(this);
    return true;
  }

  _damageInCone(ox, oy, angle, spread, range, dmg, gu) {
    const half = spread * 0.5;
    const hitFn = (tx, ty, tr) => {
      const dx = tx - ox;
      const dy = ty - oy;
      const d = Math.hypot(dx, dy);
      if (d > range + tr) return false;
      if (d < 14) return true;
      const diff = Math.abs(Math.atan2(Math.sin(Math.atan2(dy, dx) - angle), Math.cos(Math.atan2(dy, dx) - angle)));
      return diff <= half;
    };
    this._applyAreaPredicate(hitFn, dmg, gu);
  }

  _damageInCircle(cx, cy, radius, dmg, gu) {
    this._applyAreaPredicate((tx, ty, tr) => Math.hypot(tx - cx, ty - cy) <= radius + tr, dmg, gu);
  }

  _applyAreaPredicate(pred, dmg, gu) {
    for (const p of this.banLongPillars) {
      if (p.alive && p.kind !== "stone" && pred(p.x, p.y, 18)) {
        p.hp -= dmg;
        this.addFloatingText(p.x, p.y - 24, `-${dmg}`, "#d9b25f");
        if (p.hp <= 0) {
          p.alive = false;
          this.addFloatingText(p.x, p.y - 34, `Phá vỡ ${p.label}!`, "#5fbf8a");
        }
      }
    }
    for (const e of this.enemies) {
      if (pred(e.x, e.y, e.radius)) {
        this._damageEnemy(e, dmg, gu);
      }
    }
  }

  _damageEnemy(e, rawDmg, gu = {}) {
    if (!e || e.hp <= 0) return;
    let mult = 1.0;
    if (e.typeId === "van_thu_ban_long") {
      const goldAlive = this.banLongPillars.filter((p) => p.alive && p.kind === "gold").length;
      if (goldAlive > 0) mult -= goldAlive * 0.2; // Mỗi cột Hoàng Kim giảm 20% ST
    }
    if (e.poisonTimer > 0 && this.player.chosenPath === "doc_dao") {
      mult += 0.15;
    }
    const sets = this.player.getSetCounts();
    const critChance = 0.08 + (this.player.chosenPath === "nguyet_dao" ? 0.1 : 0) + ((sets.dien_lang_bo ?? 0) >= 2 ? 0.1 : 0);
    const isCrit = Math.random() < critChance;
    if (isCrit) mult *= 1.55;

    const dmg = Math.max(1, Math.round(rawDmg * mult));
    e.hp -= dmg;
    e.hurtFlash = 0.14;
    this.selectedTargetId = e.id;
    if (e.passive) {
      if (!e.provoked) {
        e.provoked = true;
        this.addFloatingText(e.x, e.y - 28, "⚡ Bị Kích Nộ!", "#ff6b6b");
      }
      e.provokedTimer = 22;
    }

    if (e.heads) {
      const aliveHead = e.heads.find((h) => h.alive);
      if (aliveHead) {
        aliveHead.hp -= dmg;
        if (aliveHead.hp <= 0) {
          aliveHead.hp = 0;
          aliveHead.alive = false;
          this.addFloatingText(e.x + aliveHead.dx, e.y + aliveHead.dy, `Trảm ${aliveHead.name}!`, "#5ef2d6");
        }
      }
    }

    if (gu.ignitesPoison && e.poisonTimer > 0) {
      const detonate = Math.max(12, Math.round(e.poisonDps * e.poisonTimer * 1.6));
      e.hp -= detonate;
      e.poisonTimer = 0;
      e.poisonDps = 0;
      this.spawnVfx("vfx/hoa-than", e.x, e.y - 6, { scale: 0.55 });
      this.addFloatingText(e.x, e.y - 28, `Độc Hỏa Bạo Nổ -${detonate}!`, "#ff7b39");
    }

    if (gu.lifesteal) {
      const healed = this.player.heal(Math.round(dmg * gu.lifesteal));
      if (healed > 0) this.addFloatingText(this.player.x, this.player.y - 26, `+${healed}`, "#5fbf8a");
    }
    if (gu.poisonDps) {
      e.poisonDps = Math.max(e.poisonDps, gu.poisonDps);
      e.poisonTimer = 3.5;
    }
    if (gu.burnDps) {
      e.burnDps = Math.max(e.burnDps, gu.burnDps);
      e.burnTimer = 3.0;
    }
    if (gu.slowFactor) {
      e.slowFactor = Math.max(e.slowFactor, gu.slowFactor);
      e.slowTimer = 2.8;
    }
    if (gu.stunDuration) {
      e.stunTimer = Math.max(e.stunTimer, gu.stunDuration);
    }

    this.spawnVfx("vfx/hit-spark", e.x, e.y - 8, { scale: 0.45 });
    this.addFloatingText(e.x, e.y - 18, isCrit ? `Chí Mạng -${dmg}!` : `-${dmg}`, isCrit ? "#ff9e5e" : "#ffe082");
    this.sfx?.play("hit");

    if (e.typeId === "coc_thao_nhan" && e.hp <= 0) {
      this._onEnemyKilled(e);
      e.hp = e.maxHp;
      this.player.bodyTemperCount += 1;
      this.player.bodyTemperBonusForce += 1;
      this.player.bodyTemperBonusHp += 15;
      this.player.recalculateStats(false);
      this.addFloatingText(this.player.x, this.player.y - 32, "Rèn Thân +1 Lực · +15 HP!", "#d9b25f");
    }
  }

  _onEnemyKilled(e) {
    this.player.kills += 1;
    this.player.nguyenThach += e.stones ?? 6;
    this.player.addCultivationExp(e.exp ?? 18, this._playerEvents());
    this.player.bloodSpring = Math.min(100, this.player.bloodSpring + 8);
    this._advanceQuest("kill_type", { enemyType: e.typeId });
    this._advanceQuest("kill_any", {});
    this._advanceSideAndClanQuests("kill_type", { enemyType: e.typeId });
    this._advanceSideAndClanQuests("kill_any", {});

    if (e.dropItems?.length) {
      const picked = e.dropItems[Math.floor(Math.random() * e.dropItems.length)];
      this.player.addItem(picked, 1);
    }
    if (e.ai !== "dummy") {
      if (e.tier === "Bách thú vương" || e.tier === "Thiên thú vương" || e.isInstanceBoss) {
        this.player.addItem(Math.random() < 0.35 ? "hat_tram_nam" : "hat_huyet_thao", 1);
      } else if (Math.random() < 0.28) {
        this.player.addItem(e.tier === "Tinh anh" && Math.random() < 0.45 ? "hat_huyet_thao" : "hat_linh_thao", 1);
      }
    }
    if (e.tier === "Bách thú vương" || e.tier === "Thiên thú vương" || e.isInstanceBoss) {
      this.player.bossesSlain += 1;
      this.account?.recordBossKill?.(e.rank ?? 1);
      const setId = this.activeInstance?.dungeonDef?.setDrop || "dien_lang_bo";
      const piece = createArmorPiece(setId, ["ao", "giay", "bao_tay", "boi_suc"][Math.floor(Math.random() * 4)], e.rank >= 4 ? "tim" : "lam");
      this.player.armorBag.push(piece);
      this.addFloatingText(e.x, e.y - 30, `Rơi ${piece.name}!`, piece.rarityColor);
      if (this.mode === "tower" && this.activeInstance) {
        const nextF = (this.activeInstance.floor ?? 1) + 1;
        this.player.nguyenThach += 60 * (this.activeInstance.floor ?? 1);
        this.addFloatingText(this.player.x, this.player.y - 40, `Thông Tháp Tầng ${this.activeInstance.floor}!`, "#5fbf8a");
        setTimeout(() => {
          if (this.mode === "tower") this.startTrialTower(nextF);
        }, 1400);
      } else if (this.mode === "arena") {
        this.player.honorPoints += 120;
        this.player.nguyenThach += 150;
        this._advanceQuest("win_arena", { opponent: this.activeInstance?.opponent });
        this.addFloatingText(this.player.x, this.player.y - 36, "Thắng Lôi Đài! +120 Vinh Dự · +150 💎", "#d9b25f");
        setTimeout(() => {
          if (this.mode === "arena") this.exitInstance();
        }, 1600);
      } else if (this.mode === "dungeon" && this.activeInstance?.dungeonDef && e.isInstanceBoss && !this.activeInstance.cleared) {
        const d = this.activeInstance.dungeonDef;
        this.activeInstance.cleared = true;
        this.player.nguyenThach += d.stones ?? 180;
        if (d.rewardMat) this.player.addItem(d.rewardMat, 1);
        this.player.addItem("hat_huyet_thao", 1);
        this.sfx?.play("fusionSuccess");
        this.addFloatingText(this.player.x, this.player.y - 42, `Thông Quan ${d.name}! +${d.stones} Nguyên Thạch`, "#4de0c9");
      }
    }
    if (this.selectedTargetId === e.id) this.selectedTargetId = null;
    this.onStateChange?.(this);
  }

  syncMainQuestState() {
    let safety = 0;
    while (safety++ < MAIN_QUESTS.length) {
      const q = MAIN_QUESTS[this.player.mainQuestIndex];
      if (!q) break;
      if (q.goal?.type === "awaken_aperture" && this.player.hasAwakened) {
        this._advanceQuest("awaken_aperture", { silent: true });
      } else if (q.goal?.type === "choose_target_gu" && this.player.hasChosenTargetGu) {
        this._advanceQuest("choose_target_gu", { silent: true });
      } else if (q.goal?.type === "reach_rank" && this.player.getStage().rank >= (q.goal.rank ?? 1)) {
        this._advanceQuest("reach_rank", { silent: true });
      } else {
        break;
      }
    }
  }

  _advanceQuest(type, payload = {}) {
    const q = MAIN_QUESTS[this.player.mainQuestIndex];
    if (!q || q.goal.type !== type) return;
    if (type === "enter_map" && payload.mapId !== q.goal.mapId) return;
    if (type === "talk_npc" && payload.npcId !== q.goal.npcId) return;
    if (type === "kill_type" && payload.enemyType !== q.goal.enemyType) return;
    if (type === "reach_rank" && this.player.getStage().rank < q.goal.rank) return;

    this.player.questProgress = (this.player.questProgress ?? 0) + 1;
    const need = q.goal.count ?? 1;
    if (this.player.questProgress >= need) {
      this.player.questProgress = 0;
      this.player.mainQuestIndex += 1;
      this.player.nguyenThach += q.rewards?.stones ?? 50;
      this.player.insightCount += q.rewards?.insight ?? 0;
      for (const it of q.rewards?.items ?? []) {
        this.player.addItem(it.id, it.count);
      }
      this.player.addCultivationExp(q.rewards?.exp ?? 100, this._playerEvents());
      const nextQ = MAIN_QUESTS[this.player.mainQuestIndex] ?? null;
      if (!payload.silent) {
        this.addFloatingText(this.player.x, this.player.y - 38, `Hoàn Thành Chương ${q.chapter ?? ""}: ${q.title}!`, "#ffd257");
        this.sfx?.play("fusionSuccess");
        this.onQuestCompleted?.(q, nextQ);
      }
      this.syncMainQuestState();
    }
    this.onStateChange?.(this);
  }

  _advanceSideAndClanQuests(type, payload = {}) {
    for (const m of this.player.clanBoard ?? []) {
      if (m.claimed || !m.goal || m.goal.type !== type) continue;
      if (type === "kill_type" && payload.enemyType !== m.goal.enemyType) continue;
      const need = m.goal.count ?? 1;
      if ((m.progress ?? 0) < need) {
        m.progress = (m.progress ?? 0) + 1;
        if (m.progress >= need) {
          this.addFloatingText(this.player.x, this.player.y - 42, `Hoàn Tất Nhiệm Vụ Gia Tộc (Mở J nhận Nguyên Thạch!)`, "#5ef2d6");
          this.sfx?.play("pickup");
        }
      }
    }
    const gq = this.player.activeGuQuest;
    if (gq && !gq.completed && gq.goal?.type === type) {
      if (type !== "kill_type" || payload.enemyType === gq.goal.enemyType) {
        const need = gq.goal.count ?? 1;
        gq.progress = Math.min(need, (gq.progress ?? 0) + 1);
        if (gq.progress >= need) {
          gq.completed = true;
          this.addFloatingText(this.player.x, this.player.y - 46, `Thu Thập Đủ Cho Cổ Nhiệm Vụ (Mở J Luyện Cổ!)`, "#ffd047");
          this.sfx?.play("fusionSuccess");
        }
      }
    }
  }

  triggerWillpowerSurge() {
    if (this.currentMapId !== "hang_ngam_khai_khieu" || this.player.hasAwakened) return false;
    if (this.player.willpowerBoostTimer > 0.4) return false;
    const maxSteps = this.player.innateMaxSteps || 27;
    const maxAllowedX = 145 + maxSteps * 19;
    if ((this.player.awakeningSteps ?? 0) >= maxSteps || this.player.x >= maxAllowedX - 2) {
      this.spawnVfx("vfx/hit-spark", this.player.x, this.player.y - 8, { scale: 0.45 });
      this.addFloatingText(this.player.x, this.player.y - 30, `Đã chạm Cực Hạn Thiên Phú (${maxSteps} bước)! Nhấn F Mở Không Khiếu!`, "#ffd047");
      return false;
    }
    this.player.willpowerBoostTimer = 1.65;
    this.player.x = Math.min(maxAllowedX, this.player.x + 38);
    this.spawnVfx("vfx/nguyet-quang", this.player.x, this.player.y - 6, { scale: 0.55 });
    this.addFloatingText(this.player.x, this.player.y - 28, "Ý Chí Phản Kháng! +2 Bước Hy Vọng", "#5ef2d6");
    this.sfx?.play("pickup");
    this.onStateChange?.(this);
    return true;
  }

  retryAwakeningRitual() {
    this.player.rerollAwakeningLimit();
    this.player.currentMapId = "hang_ngam_khai_khieu";
    this.currentMapId = "hang_ngam_khai_khieu";
    this.loadMap("hang_ngam_khai_khieu", { x: 145, y: 240 });
    this.player.awakeningSteps = 0;
    this.player.apertureSeaPct = 0;
    this.player.hasAwakened = false;
    this.addFloatingText(145, 210, "Tái Thử Nghi Thức Khai Khiếu!", "#ffd047");
    this.onStateChange?.(this);
  }

  confirmAwakeningAtCurrentStep(forceAccept = false) {
    if (this.player.hasAwakened) return null;
    const maxSteps = this.player.innateMaxSteps || 27;
    const rawSteps = Math.max(0, Math.min(maxSteps, Math.floor((this.player.x - 145) / 19)));
    this.player.awakeningSteps = rawSteps;
    const res = this.player.finalizeAwakeningSteps(rawSteps, {
      onAwaken: (ev) => {
        this.spawnVfx("vfx/nguyet-quang", this.player.x, this.player.y, { scale: 1.05 });
        this.addFloatingText(this.player.x, this.player.y - 34, `Khai Khiếu ${ev.aptitudeLabel} · ${ev.seaPct}% Chân Nguyên!`, ev.color);
      },
    }, { forceAccept });
    if (!res.ok) {
      this.onAwakenCeremony?.({ type: "ritual_failed", ...res });
      this.onStateChange?.(this);
      return res;
    }
    this._advanceQuest("awaken_aperture", {});
    this.sfx?.play("fusionSuccess");
    this.onAwakenCeremony?.({ type: "awakened", ...res });
    this.onStateChange?.(this);
    return res;
  }

  _updateAwakeningRitual(dt) {
    if (this.currentMapId !== "hang_ngam_khai_khieu" || this.player.hasAwakened) return;
    if (this.player.willpowerBoostTimer > 0) {
      this.player.willpowerBoostTimer = Math.max(0, this.player.willpowerBoostTimer - dt);
    }
    if (this._limitWarnCd > 0) {
      this._limitWarnCd = Math.max(0, this._limitWarnCd - dt);
    }
    const maxSteps = this.player.innateMaxSteps || 27;
    const maxAllowedX = 145 + maxSteps * 19;
    if (this.player.x > maxAllowedX) {
      this.player.x = maxAllowedX;
      if (this._limitWarnCd <= 0) {
        this._limitWarnCd = 1.8;
        this.addFloatingText(this.player.x, this.player.y - 30, `Chạm giới hạn bản thân (${maxSteps} bước)! Nhấn F để Mở Không Khiếu`, "#ffd047");
      }
    } else if ((this.player.x - 145) / 19 >= (this.player.innateBaseSteps || 24) - 0.05 && this.player.moving && this._limitWarnCd <= 0 && maxSteps > (this.player.innateBaseSteps || 24)) {
      this._limitWarnCd = 2.4;
      this.addFloatingText(this.player.x, this.player.y - 28, "Áp lực Hy Vọng Cổ! Nhấn Space để bứt phá thêm!", "#5ef2d6");
    }
    const prevSteps = this.player.awakeningSteps ?? 0;
    const curSteps = Math.max(0, Math.min(maxSteps, Math.floor((this.player.x - 145) / 19)));
    this.player.awakeningSteps = curSteps;
    if (curSteps > prevSteps && curSteps % 5 === 0) {
      this.addFloatingText(this.player.x, this.player.y - 26, `Bước ${curSteps}/${maxSteps} · Hy Vọng Cổ Nhập Thể`, "#5ef2d6");
      this.sfx?.play("pickup");
    }
    if (curSteps >= 45) {
      this.confirmAwakeningAtCurrentStep(false);
    }
  }

  _playerEvents() {
    return {
      onFloatingText: (x, y, text, color) => this.addFloatingText(x, y, text, color),
      onHurt: () => {
        this.sfx?.play("hurt");
        this.triggerShake(0.15, 2.5);
      },
      onDeath: () => {
        this.player.autoCombat = false;
        this.addFloatingText(this.player.x, this.player.y - 30, "Trọng Thương Hôn Mê!", "#ff4757");
        this.onStateChange?.(this);
      },
      onAutoPathArrived: (arrived) => {
        if (arrived.action === "npc" || arrived.action === "portal" || arrived.action === "gather") {
          this.interactNearest();
        } else if (arrived.action === "attack") {
          const e = this.enemies.find((x) => x.id === arrived.id && x.hp > 0) || this.enemies.find((x) => x.hp > 0 && x.ai !== "dummy");
          if (e) {
            this.selectedTargetId = e.id;
            this.performBasicAttack(Math.atan2(e.y - this.player.y, e.x - this.player.x));
          }
        }
      },
    };
  }

  triggerShake(sec, amp) {
    this.shakeTimer = Math.max(this.shakeTimer, sec);
    this.shakeAmp = Math.max(this.shakeAmp, amp);
  }

  spawnVfx(key, x, y, opts = {}) {
    const sheet = this.assets.get(key);
    const fps = sheet?.pixelfx?.fps ?? 15;
    const count = sheet?.frames?.length ?? 8;
    this.vfxEffects.push({
      key,
      x,
      y,
      t: 0,
      duration: count / fps,
      angle: opts.angle ?? 0,
      scale: opts.scale ?? 1,
      flipX: Boolean(opts.flipX),
    });
  }

  addFloatingText(x, y, text, color = "#f1e6c8") {
    this.floatingTexts.push({ x, y, text, color, life: 1.0, maxLife: 1.0 });
  }

  update(dt, input, renderer) {
    this.time += dt;
    input.update(dt);
    if (this.shakeTimer > 0) this.shakeTimer = Math.max(0, this.shakeTimer - dt);

    if (this.dieuHoi.active) {
      this.dieuHoi.timer = Math.max(0, this.dieuHoi.timer - dt);
      if (this.dieuHoi.timer <= 0) this.dieuHoi.active = false;
    }

    const mapDef = this.getMapDef();
    const moveVec = input.getMoveVector();
    if (moveVec.magnitude > 0) this.pendingAutoTravel = null;
    const events = this._playerEvents();
    const inCombat = this.enemies.some((e) => (!e.passive || e.provoked) && Math.hypot(e.x - this.player.x, e.y - this.player.y) < 160);

    // Nếu người chơi đang bật Tự Đánh (T) và không điều khiển tay -> Tự tìm quái bãi thú
    let effectiveMove = moveVec;
    if (this.player.autoCombat && !this.player.isDead && moveVec.magnitude === 0 && !this.player.autoPathTarget) {
      effectiveMove = this._updateAutoCombat(dt);
    }

    this.player.update(dt, { moveVec: effectiveMove, safeZone: mapDef.pvpZoneType === "safe", inCombat }, events);
    const resolvedPlayer = resolveWorldMovement(mapDef, this.player.x, this.player.y, this.player.radius, (k) => getPropSprite(k));
    this.player.x = resolvedPlayer.x;
    this.player.y = resolvedPlayer.y;
    this._updateAwakeningRitual(dt);

    // Bụi cỏ ẩn thân (Stealth Bush): Đứng trong bụi cỏ khi không vừa ra đòn -> Ẩn Thân
    const inStealthBush = (mapDef.trees ?? []).some(
      (t) => t.kind === "stealth_bush" && Math.hypot(this.player.x - t.x, this.player.y - (t.y - 4)) <= 22
    );
    this.player.isStealthed = Boolean(inStealthBush && this.player.stealthBreakTimer <= 0 && !this.player.isDead);

    // Kiểm tra tiến độ đạt cảnh giới nếu nhiệm vụ đang đợi
    if (MAIN_QUESTS[this.player.mainQuestIndex]?.goal?.type === "reach_rank") {
      this._advanceQuest("reach_rank");
    }

    for (const g of this.gatherNodes) {
      if (g.cooldown > 0) g.cooldown = Math.max(0, g.cooldown - dt);
    }

    // Respawn bãi quái thế giới mở
    for (const sp of this.spawners) {
      if (sp.enemyRef && sp.enemyRef.hp > 0) continue;
      sp.timer += dt;
      if (sp.timer >= (sp.respawn ?? 8)) {
        sp.timer = 0;
        this._spawnFromSpawner(sp);
      }
    }

    // Cập nhật Hư Ảnh Thú Lực & Phân Thân
    for (let i = this.phantoms.length - 1; i >= 0; i--) {
      const ph = this.phantoms[i];
      ph.life -= dt;
      ph.x += ph.vx * dt;
      ph.y += ph.vy * dt;
      for (const e of this.enemies) {
        if (!ph.hitIds.has(e.id) && Math.hypot(e.x - ph.x, e.y - ph.y) <= e.radius + 18) {
          ph.hitIds.add(e.id);
          this._damageEnemy(e, ph.damage, { stunDuration: 0.45, path: "luc_dao" });
        }
      }
      if (ph.life <= 0) this.phantoms.splice(i, 1);
    }

    for (let i = this.decoys.length - 1; i >= 0; i--) {
      const d = this.decoys[i];
      d.life -= dt;
      if (d.life <= 0) {
        this._damageInCircle(d.x, d.y, 32, d.damage, { path: "anh_dao" });
        this.decoys.splice(i, 1);
      }
    }

    // Đạn người chơi
    for (let i = this.playerProjectiles.length - 1; i >= 0; i--) {
      const pr = this.playerProjectiles[i];
      pr.life -= dt;
      if (pr.homing && this.enemies.length > 0) {
        const nearest = this.enemies[0];
        const des = Math.atan2(nearest.y - pr.y, nearest.x - pr.x);
        const spd = pr.speed ?? 215;
        pr.vx = Math.cos(des) * spd;
        pr.vy = Math.sin(des) * spd;
      }
      pr.x += pr.vx * dt;
      pr.y += pr.vy * dt;

      for (const p of this.banLongPillars) {
        if (p.alive && p.kind !== "stone" && !pr.hitIds.has(p.id) && Math.hypot(p.x - pr.x, p.y - pr.y) <= 22) {
          pr.hitIds.add(p.id);
          pr.pierceLeft -= 1;
          p.hp -= pr.damage;
          this.addFloatingText(p.x, p.y - 24, `-${pr.damage}`, "#d9b25f");
          if (p.hp <= 0) p.alive = false;
        }
      }

      for (const e of this.enemies) {
        if (pr.hitIds.has(e.id)) continue;
        if (Math.hypot(e.x - pr.x, e.y - 6 - pr.y) <= e.radius + pr.radius) {
          pr.hitIds.add(e.id);
          pr.pierceLeft -= 1;
          this._damageEnemy(e, pr.damage, pr.gu);
          if (pr.pierceLeft <= 0) break;
        }
      }
      if (pr.pierceLeft <= 0 || pr.life <= 0) this.playerProjectiles.splice(i, 1);
    }

    // Cập nhật Quái vật & Boss Vạn Thủ Bàn Long
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      e.animTime += dt;
      if (e.hurtFlash > 0) e.hurtFlash = Math.max(0, e.hurtFlash - dt);
      if (e.poisonTimer > 0) { e.poisonTimer -= dt; e.hp -= e.poisonDps * dt; }
      if (e.burnTimer > 0) { e.burnTimer -= dt; e.hp -= e.burnDps * dt; }
      if (e.slowTimer > 0) e.slowTimer -= dt; else e.slowFactor = 0;

      if (e.hp <= 0) {
        this._onEnemyKilled(e);
        this.enemies.splice(i, 1);
        continue;
      }
      if (e.stunTimer > 0) { e.stunTimer -= dt; continue; }
      if (e.ai === "dummy") continue;

      if (e.ai === "ban_long_boss") {
        this._updateBanLongBoss(e, dt, events);
        continue;
      }
      if (e.ai === "aquatic") {
        e.x = e.homeX + Math.sin(this.time * 0.8) * 45;
        e.y = e.homeY + Math.cos(this.time * 0.6) * 20;
        continue;
      }

      if (e.passive && e.provoked) {
        e.provokedTimer = (e.provokedTimer ?? 0) - dt;
        if (e.provokedTimer <= 0 && Math.hypot(this.player.x - e.x, this.player.y - e.y) > 150) {
          e.provoked = false;
        }
      }
      if (e.passive && !e.provoked) {
        e.wanderTimer = (e.wanderTimer ?? 0) - dt;
        if (e.wanderTimer <= 0) {
          if (Math.random() < 0.45) {
            e.wanderVx = 0;
            e.wanderVy = 0;
            e.wanderTimer = 1.2 + Math.random() * 1.6;
          } else {
            const ang = Math.random() * Math.PI * 2;
            const r = 10 + Math.random() * 18;
            const tx = e.homeX + Math.cos(ang) * r;
            const ty = e.homeY + Math.sin(ang) * r;
            const wd = Math.max(1, Math.hypot(tx - e.x, ty - e.y));
            const wspd = (e.speed || 42) * 0.36;
            e.wanderVx = ((tx - e.x) / wd) * wspd;
            e.wanderVy = ((ty - e.y) / wd) * wspd;
            e.wanderTimer = 1.4 + Math.random() * 1.6;
          }
        }
        if (e.wanderVx || e.wanderVy) {
          e.facingLeft = e.wanderVx < 0;
          e.x += e.wanderVx * dt;
          e.y += e.wanderVy * dt;
          const resWander = resolveWorldMovement(mapDef, e.x, e.y, e.radius, (k) => getPropSprite(k));
          e.x = resWander.x;
          e.y = resWander.y;
        }
        e.hp = Math.min(e.maxHp, e.hp + e.maxHp * 0.04 * dt);
        continue;
      }

      const dx = this.player.x - e.x;
      const dy = this.player.y - e.y;
      const dist = Math.max(1, Math.hypot(dx, dy));
      const distFromHome = Math.hypot(e.x - e.homeX, e.y - e.homeY);
      const aggroRange = e.passive && e.provoked ? 265 : 185;
      if (dist > aggroRange || distFromHome > 155 || (this.player.isStealthed && dist > 42)) {
        // Giữ nghiêm ngặt lãnh thổ sinh thái: quay về bãi gốc
        const hx = e.homeX - e.x;
        const hy = e.homeY - e.y;
        const hd = Math.hypot(hx, hy);
        if (hd > 12) {
          e.x += (hx / hd) * e.speed * 0.72 * dt;
          e.y += (hy / hd) * e.speed * 0.72 * dt;
          const resHome = resolveWorldMovement(mapDef, e.x, e.y, e.radius, (k) => getPropSprite(k));
          e.x = resHome.x;
          e.y = resHome.y;
        } else if (e.passive) {
          e.provoked = false;
        }
        continue;
      }

      e.facingLeft = dx < 0;
      const spd = e.speed * (1 - (e.slowFactor ?? 0));
      if (e.ai === "caster") {
        if (dist > 130) {
          e.x += (dx / dist) * spd * dt;
          e.y += (dy / dist) * spd * dt;
        }
        e.aiTimer -= dt;
        if (e.aiTimer <= 0) {
          e.aiTimer = 2.0;
          const a = Math.atan2(dy, dx);
          this.enemyProjectiles.push({ x: e.x, y: e.y - 6, vx: Math.cos(a) * 125, vy: Math.sin(a) * 125, radius: 5, damage: e.damage, color: e.projColor ?? "#ff5e6c", life: 2.2 });
        }
      } else {
        e.x += (dx / dist) * spd * dt;
        e.y += (dy / dist) * spd * dt;
      }
      const resEnemy = resolveWorldMovement(mapDef, e.x, e.y, e.radius, (k) => getPropSprite(k));
      e.x = resEnemy.x;
      e.y = resEnemy.y;
      // Tinh anh / Thú vương thỉnh thoảng tụ chiêu vùng đỏ cảnh báo
      if ((e.tier === "Tinh anh" || e.tier === "Bách thú vương") && dist < 120) {
        e.slamTimer = (e.slamTimer ?? 4.2) - dt;
        if (e.slamTimer <= 0) {
          e.slamTimer = 5.4;
          this.enemyTelegraphs.push({ x: this.player.x, y: this.player.y, r: 32, t: 0, dur: 1.05, damage: Math.round(e.damage * 1.45) });
        }
      }
      if (dist <= this.player.radius + e.radius) {
        const dealt = this.player.takeDamage(e.damage, events);
        if (dealt > 0) {
          const thorns = this.player.getThornsRatio();
          if (thorns > 0) {
            const refDmg = Math.max(2, Math.round(e.damage * thorns));
            e.hp -= refDmg;
            this.addFloatingText(e.x, e.y - 24, `Phản Giáp -${refDmg}`, "#ffd047");
          }
        }
      }
    }

    // Cảnh báo chiêu đỏ dưới đất của Quái Tinh Anh / Thú Vương
    for (let i = this.enemyTelegraphs.length - 1; i >= 0; i--) {
      const tg = this.enemyTelegraphs[i];
      tg.t += dt;
      if (tg.t >= tg.dur) {
        if (Math.hypot(this.player.x - tg.x, this.player.y - tg.y) <= tg.r) {
          this.player.takeDamage(tg.damage, events);
        }
        this.spawnVfx("vfx/hoa-than", tg.x, tg.y, { scale: 0.65 });
        this.enemyTelegraphs.splice(i, 1);
      }
    }

    // Đạn quái
    for (let i = this.enemyProjectiles.length - 1; i >= 0; i--) {
      const pr = this.enemyProjectiles[i];
      pr.life -= dt;
      pr.x += pr.vx * dt;
      pr.y += pr.vy * dt;
      if (Math.hypot(this.player.x - pr.x, this.player.y - 6 - pr.y) <= this.player.radius + pr.radius) {
        this.player.takeDamage(pr.damage, events);
        this.enemyProjectiles.splice(i, 1);
        continue;
      }
      if (pr.life <= 0) this.enemyProjectiles.splice(i, 1);
    }

    for (let i = this.vfxEffects.length - 1; i >= 0; i--) {
      this.vfxEffects[i].t += dt;
      if (this.vfxEffects[i].t >= this.vfxEffects[i].duration) this.vfxEffects.splice(i, 1);
    }
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.life -= dt;
      ft.y -= 18 * dt;
      if (ft.life <= 0) this.floatingTexts.splice(i, 1);
    }

    // Camera bám theo nhân vật (căn giữa nếu map nhỏ hơn viewport)
    const viewW = GAME_WIDTH / (renderer?.zoom || 1);
    const viewH = GAME_HEIGHT / (renderer?.zoom || 1);
    const maxCamX = mapDef.width - viewW;
    const maxCamY = mapDef.height - viewH;
    const targetCamX = maxCamX <= 0 ? maxCamX * 0.5 : Math.max(0, Math.min(maxCamX, this.player.x - viewW * 0.5));
    const targetCamY = maxCamY <= 0 ? maxCamY * 0.5 : Math.max(0, Math.min(maxCamY, this.player.y - viewH * 0.5));
    this.camera.x += (targetCamX - this.camera.x) * Math.min(1, dt * 8);
    this.camera.y += (targetCamY - this.camera.y) * Math.min(1, dt * 8);
  }

  _updateAutoCombat(dt) {
    const candidates = this.enemies.filter((e) => e.hp > 0 && e.ai !== "aquatic");
    if (candidates.length === 0) return { x: 0, y: 0, magnitude: 0, angle: this.player.facing };

    let target = candidates.find((e) => e.id === this.selectedTargetId);
    if (!target) {
      candidates.sort(
        (a, b) => Math.hypot(a.x - this.player.x, a.y - this.player.y) - Math.hypot(b.x - this.player.x, b.y - this.player.y)
      );
      target = candidates[0];
      this.selectedTargetId = target.id;
    }

    const dx = target.x - this.player.x;
    const dy = target.y - this.player.y;
    const dist = Math.hypot(dx, dy);
    const ang = Math.atan2(dy, dx);

    if (this.player.hp < this.player.maxHp * 0.4) {
      this.useQuickItem(0);
    }

    if (dist <= 135) {
      // Tự dùng Sát Chiêu hoặc Cổ Chủ Động / Bản Mệnh khi hết CD
      if (this.player.thoughtGauge >= 60 && this.player.getCooldownInfo("km1").rem <= 0) {
        this.castSkill({ slotId: "km1", angle: ang });
      } else {
        let castOk = false;
        const order = ["vital", "slot_0", "slot_1", "slot_2", "slot_3", "slot_4", "slot_5", "slot_6"];
        for (const sId of order) {
          const gu = this.player.getEquippedGu(sId);
          if (!gu) continue;
          if (gu.role === "heal" && this.player.hp > this.player.maxHp * 0.78) continue;
          if (gu.role === "support" && gu.mpRestore && this.player.mp > this.player.maxMp * 0.7) continue;
          if (gu.aimType === "dash") continue;
          if (this.player.getCooldownInfo(sId).rem <= 0 && this.player.mp >= (gu.mpCost ?? 0)) {
            castOk = this.castSkill({ slotId: sId, angle: ang, distanceRatio: Math.min(1, dist / Math.max(40, gu.range ?? 110)) });
            if (castOk) break;
          }
        }
        if (!castOk) this.performBasicAttack(ang);
      }
    }

    const vital = this.player.getVitalGu();
    const stopDist = vital && (vital.aimType === "line" || vital.path === "nguyet_dao") ? 92 : 44;
    if (dist > stopDist && dist < 380) {
      this._autoCombatPathTimer = (this._autoCombatPathTimer ?? 0) - dt;
      if (this._autoCombatPathTimer <= 0 || this._autoCombatTargetId !== target.id || !this._autoCombatWaypoints?.length) {
        this._autoCombatPathTimer = 0.4;
        this._autoCombatTargetId = target.id;
        this._autoCombatWaypoints = findNavigationPath(this.getMapDef(), this.player.x, this.player.y, target.x, target.y, (k) => getPropSprite(k));
      }
      while (
        this._autoCombatWaypoints.length > 1 &&
        Math.hypot(this._autoCombatWaypoints[0].x - this.player.x, this._autoCombatWaypoints[0].y - this.player.y) <= 14
      ) {
        this._autoCombatWaypoints.shift();
      }
      const wp = this._autoCombatWaypoints[0] ?? target;
      const wdx = wp.x - this.player.x;
      const wdy = wp.y - this.player.y;
      const wdist = Math.max(1, Math.hypot(wdx, wdy));
      return { x: wdx / wdist, y: wdy / wdist, magnitude: 1, angle: Math.atan2(wdy, wdx) };
    }
    return { x: 0, y: 0, magnitude: 0, angle: ang };
  }

  _updateBanLongBoss(b, dt, events) {
    // Cột Huyết Mạch hồi máu cho rồng nếu còn sống
    const bloodCount = this.banLongPillars.filter((p) => p.alive && p.kind === "blood").length;
    if (bloodCount > 0 && b.hp < b.maxHp) {
      b.hp = Math.min(b.maxHp, b.hp + bloodCount * 28 * dt);
    }

    b.aiTimer -= dt;
    if (b.aiTimer <= 0) {
      b.aiTimer = 2.4;
      const a = Math.atan2(this.player.y - b.y, this.player.x - b.x);
      for (let k = -1; k <= 1; k++) {
        this.enemyProjectiles.push({
          x: b.x,
          y: b.y - 20,
          vx: Math.cos(a + k * 0.25) * 140,
          vy: Math.sin(a + k * 0.25) * 140,
          radius: 6,
          damage: 65,
          color: "#19f0c8",
          life: 2.8,
        });
      }
    }

    this.banLongBreathTimer -= dt;
    if (this.banLongBreathTimer <= 4 && this.banLongBreathWarn <= 0) {
      this.banLongBreathWarn = 4.0;
      this.addFloatingText(b.x, b.y - 90, "⚠ LONG TỨC SẮP PHUN! NẤP SAU CỘT ĐÁ!", "#ff4757");
    }
    if (this.banLongBreathTimer <= 0) {
      this.banLongBreathTimer = 28;
      this.banLongBreathWarn = 0;
      const behindStone = this.banLongPillars.some(
        (p) => p.kind === "stone" && Math.hypot(this.player.x - p.x, this.player.y - (p.y + 18)) <= 40
      );
      this.triggerShake(0.4, 5);
      this.spawnVfx("vfx/hoa-than", this.player.x, this.player.y, { scale: 1.1 });
      if (!behindStone) {
        this.player.takeDamage(Math.round(this.player.maxHp * 0.45), events);
      } else {
        this.addFloatingText(this.player.x, this.player.y - 28, "Cột Đá Che Chắn Long Tức!", "#5fbf8a");
      }
    }
  }

  render(renderer, input) {
    const ctx = renderer.ctx;
    const mapDef = this.getMapDef();
    renderer.clear("#0b0d0a");

    const z = renderer.zoom || 1;
    const shakeX = this.shakeTimer > 0 ? Math.round((Math.random() * 2 - 1) * this.shakeAmp) : 0;
    const shakeY = this.shakeTimer > 0 ? Math.round((Math.random() * 2 - 1) * this.shakeAmp) : 0;

    ctx.save();
    ctx.translate(GAME_WIDTH * 0.5, GAME_HEIGHT * 0.5);
    ctx.scale(z, z);
    ctx.translate(-GAME_WIDTH * 0.5 - Math.round(this.camera.x) + shakeX, -GAME_HEIGHT * 0.5 - Math.round(this.camera.y) + shakeY);

    this.mapRenderer.renderMapBase(
      ctx,
      mapDef,
      this.time,
      this.gatherNodes,
      this.player.gardenPlots,
      !this.player.vitalUid ? this.player.targetStarterGuId : null,
      this.banLongBreathWarn
    );

    // Vùng cảnh báo đỏ pixel của Tinh Anh / Boss (0 ctx.ellipse)
    for (const tg of this.enemyTelegraphs) {
      const pct = Math.min(1, tg.t / tg.dur);
      ctx.save();
      ctx.globalAlpha = 0.2 + pct * 0.25;
      fillPixelEllipse(ctx, tg.x, tg.y, tg.r, Math.round(tg.r * 0.68), "#ff4757", true);
      ctx.globalAlpha = 0.92;
      plotPixelEllipse(ctx, tg.x, tg.y, tg.r, Math.round(tg.r * 0.68), "#ff4757", 3, 0);
      plotPixelEllipse(ctx, tg.x, tg.y, Math.max(4, Math.round(tg.r * pct)), Math.max(3, Math.round(tg.r * 0.68 * pct)), "#ffd15c");
      ctx.restore();
    }

    // Đường dẫn tự động tìm đường qua cầu & bậc thang (chấm pixel)
    if (this.player.autoPathTarget) {
      ctx.save();
      const pts = [{ x: this.player.x, y: this.player.y }, ...(this.player.autoPathWaypoints ?? []), this.player.autoPathTarget];
      for (let i = 1; i < pts.length; i++) {
        plotPixelLine(ctx, pts[i - 1].x, pts[i - 1].y, pts[i].x, pts[i].y, "rgba(95, 191, 138, 0.72)", 2);
      }
      plotRect(ctx, this.player.autoPathTarget.x - 3, this.player.autoPathTarget.y - 3, 6, 6, "#5ef2d6");
      ctx.restore();
    }

    // Aim telegraph
    const aim = input.skillPad?.activeAim;
    if (aim?.active && aim.slotId) {
      const slotGu = this.player.getEquippedGu(aim.slotId);
      if (slotGu) renderer.drawAimTelegraph(this.player.x, this.player.y - 14, aim, slotGu);
    }

    // Y-Sorting chuẩn xác toàn bộ kiến trúc, cổng 128x160, cây cối, trụ lửa Lôi Đài, NPC, quái 64x64 & người chơi 64x64
    const drawQueue = [];
    for (const prop of this.mapRenderer.collectDrawableProps(mapDef)) {
      drawQueue.push({ sortY: prop.sortY, draw: () => this.mapRenderer.drawSingleProp(ctx, prop, this.time) });
    }
    if (mapDef.id === "vuc_van_thu") {
      const boss = this.enemies.find((e) => e.typeId === "van_thu_ban_long");
      for (const p of this.banLongPillars) {
        if (!p.alive) continue;
        drawQueue.push({ sortY: p.y, draw: () => this._renderSingleBanLongPillar(ctx, p, boss) });
      }
    }
    for (const npc of mapDef.npcs ?? []) {
      drawQueue.push({ sortY: npc.y, draw: () => this._renderSingleNpc(ctx, npc) });
    }
    for (const ph of this.phantoms) {
      drawQueue.push({ sortY: ph.y, draw: () => this._renderSinglePhantom(ctx, ph) });
    }
    for (const e of this.enemies) {
      drawQueue.push({ sortY: e.y, draw: () => this._renderSingleEnemy(ctx, e) });
    }
    if (this.onlineHub?.remotePlayers) {
      for (const rp of this.onlineHub.remotePlayers.values()) {
        if (rp.scene && rp.scene !== this.currentMapId) continue;
        drawQueue.push({ sortY: rp.y, draw: () => this._renderRemotePlayer(ctx, rp) });
      }
    }
    drawQueue.push({ sortY: this.player.y, draw: () => this._renderMainPlayer(ctx) });

    drawQueue.sort((a, b) => a.sortY - b.sortY);
    for (const item of drawQueue) item.draw();

    this.mapRenderer.renderMapForeground(ctx, mapDef, this.time);

    this._renderProjectiles(ctx);
    this._renderVfxAndFloatingText(ctx);

    ctx.restore();

    renderer.drawEnvironmentOverlay(this.time, {
      weather: this.weather,
      biome: mapDef.biome,
    });
  }

  _renderSingleBanLongPillar(ctx, p, boss) {
    drawBanLongMechanicPillar(ctx, p, boss, this.time, this.banLongBreathWarn);
  }

  _renderSingleNpc(ctx, npc) {
    const sheets = getCharacterSheets({ hairColor: "bach_phat", outfitColor: "thanh_ngoc", trimColor: "vang_dong" });
    const fi = getSheetFrameIndex(sheets.idle, this.time, true);
    drawSheetFrame(ctx, sheets.idle, fi, npc.x, npc.y);

    ctx.save();
    ctx.font = "700 8.5px 'Be Vietnam Pro', sans-serif";
    drawCrispPixelText(ctx, npc.name, npc.x, npc.y - 31, "#5fbf8a", "#06080d");
    drawCrispPixelText(ctx, "!", npc.x, npc.y - 40, "#ffd15c", "#06080d");
    ctx.restore();
  }

  _renderSinglePhantom(ctx, ph) {
    ctx.save();
    ctx.globalAlpha = 0.78;
    fillPixelEllipse(ctx, ph.x, ph.y - 12, 12, 10, ph.color, true);
    plotPixelEllipse(ctx, ph.x, ph.y - 12, 12, 10, "#ffffff");
    ctx.restore();
  }

  _renderSingleEnemy(ctx, e) {
    const isSelected = e.id === this.selectedTargetId;
    if (isSelected) {
      plotPixelEllipse(ctx, e.x, e.y + 3, e.radius + 7, 7, "#ffd257", 3, Math.floor(this.time * 6));
    }

    if (e.typeId === "van_thu_ban_long") {
      drawBanLongBossPixelArt(ctx, e, this.time, this.banLongBreathWarn);
      return;
    }

    const frames = getMonsterSpriteFrames(e.typeId);
    const frameIdx = Math.floor(e.animTime * 5) % frames.length;
    const frm = frames[frameIdx] ?? frames[0];
    if (frm) {
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      if (e.hurtFlash > 0) ctx.globalAlpha = 0.65;
      ctx.translate(Math.round(e.x), Math.round(e.y));
      if (e.facingLeft) ctx.scale(-1, 1);
      ctx.drawImage(frm.canvas, -frm.anchorX, -frm.anchorY);
      ctx.restore();
    }

    const pct = Math.max(0, Math.min(1, e.hp / e.maxHp));
    const bw = Math.max(32, e.radius * 2 + 4);
    const barY = Math.round(e.y - (frm?.barOffsetY ?? 52));
    const isCalmPassive = Boolean(e.passive && !e.provoked);
    plotRect(ctx, Math.round(e.x - bw * 0.5) - 1, barY - 1, bw + 2, 5, "#06080d");
    const barCol =
      e.tier === "Thiên thú vương"
        ? "#5ef2d6"
        : e.tier === "Bách thú vương"
          ? "#b86bff"
          : isCalmPassive
            ? "#b89748"
            : "#d94538";
    plotRect(ctx, Math.round(e.x - bw * 0.5), barY, Math.max(1, Math.round(bw * pct)), 3, barCol);
    ctx.font = "700 8px 'Be Vietnam Pro', sans-serif";
    const nameCol = e.tier === "Bách thú vương" || e.tier === "Thiên thú vương" ? "#ff9e5e" : isCalmPassive ? "#cbd5e1" : "#ffffff";
    drawCrispPixelText(ctx, e.name, Math.round(e.x), barY - 4, nameCol, "#06080d");
  }

  _renderRemotePlayer(ctx, rp) {
    const rpSheets = getCharacterSheets(rp.appearance);
    const rpSheet = rp.isWalking ? rpSheets.run : rpSheets.idle;
    const fi = getSheetFrameIndex(rpSheet, rp.animTime ?? this.time, true);
    drawSheetFrame(ctx, rpSheet, fi, rp.x, rp.y, { flipX: Math.cos(rp.facing ?? 0) < -0.15 });
    ctx.save();
    ctx.font = "700 8.5px 'Be Vietnam Pro', sans-serif";
    drawCrispPixelText(ctx, rp.name, rp.x, rp.y - 31, "#e4ebf5", "#06080d");
    ctx.restore();
  }

  _renderMainPlayer(ctx) {
    const stage = this.player.getStage();
    const apt = this.player.getAptitudeInfo();
    const auraColor = this.player.hasAwakened ? (RANK_ESSENCE_COLORS[stage.rank]?.color || "#3ec99a") : "#6f808c";

    // Hào quang Chân Nguyên Hải Pixel dưới chân Cổ Sư (Thanh Đồng -> Xích Thiết -> Bạch Ngân -> Hoàng Kim -> Tử Tinh)
    const auraFrames = bakeEssenceAuraFrames(auraColor);
    const af = auraFrames[Math.floor(this.time * 6) % auraFrames.length];
    if (af) {
      ctx.drawImage(af, Math.round(this.player.x - af.width * 0.5), Math.round(this.player.y - af.height * 0.5 + 2));
    }

    const sheets = this.player.characterSheets;
    const sheet = sheets?.[this.player.animState] ?? sheets?.idle;
    if (sheet) {
      const loop = !["dash", "hurt", "death", "attack"].includes(this.player.animState);
      const t = this.player.isDead ? this.player.deathTimer : this.player.animTime;
      const fi = getSheetFrameIndex(sheet, t, loop);
      drawSheetFrame(ctx, sheet, fi, this.player.x, this.player.y, {
        flipX: Math.cos(this.player.facing) < -0.15,
        alpha: this.player.isStealthed ? 0.45 : 1,
      });
    }

    if (this.player.isStealthed) {
      ctx.save();
      ctx.font = "700 8px 'Be Vietnam Pro', sans-serif";
      drawCrispPixelText(ctx, "Ẩn Thân", this.player.x, this.player.y - 44, "#80ffcf", "#06080d");
      ctx.restore();
    }

    // Cổ Bản Mệnh bay cạnh vai trái nhân vật (pixel diamond + core)
    const vital = this.player.getVitalGu();
    if (vital) {
      const gx = Math.round(this.player.x - 13 + Math.sin(this.time * 3) * 1.5);
      const gy = Math.round(this.player.y - 20 + Math.cos(this.time * 4) * 1.5);
      plotRect(ctx, gx - 3, gy - 3, 6, 6, "#07090d");
      plotRect(ctx, gx - 2, gy - 2, 4, 4, vital.color || "#5ef2d6");
      plotRect(ctx, gx - 1, gy - 1, 2, 2, "#ffffff");
    }

    const mpRatio = this.player.mp / Math.max(1, this.player.maxMp);
    this._renderPlayerArc(ctx, mpRatio, this.player.isAbsorbingStone ? "#5ef2d6" : auraColor);

    // Chỉ hiển thị tên nhân vật sắc nét trên đầu (0 danh hiệu gây rối/đè chữ)
    const px = Math.round(this.player.x);
    const py = Math.round(this.player.y);
    ctx.save();
    ctx.font = "700 9px 'Be Vietnam Pro', sans-serif";
    drawCrispPixelText(ctx, this.player.characterName, px, py - 30, "#f1ebd8", "#05070b");
    ctx.restore();
  }

  _renderPlayerArc(ctx, ratio, color) {
    // 5 nấc Chân Nguyên dọc bên phải nhân vật bằng pixel nguyên (0 ctx.arc)
    const bx = Math.round(this.player.x + 20);
    const by = Math.round(this.player.y - 26);
    for (let i = 0; i < 5; i++) {
      const segY = by + (4 - i) * 5;
      const segX = bx + (i === 2 ? 2 : i === 1 || i === 3 ? 1 : 0);
      plotRect(ctx, segX - 1, segY - 1, 5, 4, "#07090d");
      plotRect(ctx, segX, segY, 3, 2, ratio > i / 5 ? color : "#1b2430");
    }
  }

  _renderBanLongSprite(ctx, boss) {
    drawBanLongBossPixelArt(ctx, boss, this.time, this.banLongBreathWarn);
  }

  _renderProjectiles(ctx) {
    for (const pr of this.playerProjectiles) {
      const px = Math.round(pr.x);
      const py = Math.round(pr.y);
      const ang = Math.atan2(pr.vy, pr.vx);
      const nx = -Math.sin(ang);
      const ny = Math.cos(ang);
      const c = pr.color || "#5ef2d6";
      // Lưỡi liềm / mũi tên pixel 3 tầng sắc nét
      plotPixelLine(ctx, px - nx * 6, py - ny * 6, px + nx * 6, py + ny * 6, "#06080d", 4);
      plotPixelLine(ctx, px - nx * 5, py - ny * 5, px + nx * 5, py + ny * 5, c, 2);
      plotRect(ctx, px - 1, py - 1, 2, 2, "#ffffff");
    }
    for (const pr of this.enemyProjectiles) {
      const px = Math.round(pr.x);
      const py = Math.round(pr.y);
      const r = Math.max(3, Math.round(pr.radius * 0.75));
      fillPixelEllipse(ctx, px, py, r + 1, r + 1, "#06080d");
      fillPixelEllipse(ctx, px, py, r, r, pr.color || "#ff4757");
      plotRect(ctx, px - 1, py - 1, 2, 2, "#fff5cc");
    }
  }

  _renderVfxAndFloatingText(ctx) {
    for (const v of this.vfxEffects) {
      const sheet = this.assets.get(v.key);
      if (!sheet) continue;
      const fi = getSheetFrameIndex(sheet, v.t, false);
      drawSheetFrame(ctx, sheet, fi, v.x, v.y, { rotation: v.angle, scale: v.scale, flipX: v.flipX });
    }
    ctx.save();
    ctx.font = "700 8.5px 'Be Vietnam Pro', sans-serif";
    for (const ft of this.floatingTexts) {
      ctx.globalAlpha = Math.max(0, ft.life / ft.maxLife);
      drawCrispPixelText(ctx, ft.text, Math.round(ft.x), Math.round(ft.y), ft.color || "#ffe082", "#05070b", "center");
    }
    ctx.restore();
  }
}
