import {
  createDefaultAppearance,
  normalizeAppearance,
} from "../character/CharacterSpriteBuilder.js";
import {
  createGuInstance,
  STARTER_GU_IDS,
} from "../combat/GuDatabase.js";
import { SUPABASE_KEY, SUPABASE_URL } from "../config/supabaseConfig.js";

const STORAGE_KEY = "luyen_co_su_save_v3";
const LEGACY_KEYS = ["luyen_co_su_save_v2", "luyen_co_su_save_v1"];

export const REALM_TIERS = [
  { level: 1, minExp: 0, title: "Nhất Chuyển Sơ Kỳ" },
  { level: 2, minExp: 120, title: "Nhất Chuyển Trung Kỳ" },
  { level: 3, minExp: 300, title: "Nhất Chuyển Đỉnh Phong" },
  { level: 4, minExp: 600, title: "Nhị Chuyển Cổ Sư" },
  { level: 5, minExp: 1100, title: "Tam Chuyển Trưởng Lão" },
  { level: 6, minExp: 2000, title: "Ngũ Chuyển Cổ Tiên" },
  { level: 7, minExp: 3500, title: "Cửu Chuyển Cổ Tôn" },
];

export const DEFAULT_DISCOVERED_GU = [...STARTER_GU_IDS];

export function getRealmInfo(exp = 0) {
  let current = REALM_TIERS[0];
  let next = REALM_TIERS[1];
  for (let i = 0; i < REALM_TIERS.length; i++) {
    if (exp >= REALM_TIERS[i].minExp) {
      current = REALM_TIERS[i];
      next = REALM_TIERS[i + 1] ?? null;
    }
  }
  return { ...current, next };
}

function migrateLegacyAppearance(item) {
  if (item?.appearance && typeof item.appearance === "object") {
    return normalizeAppearance(item.appearance);
  }
  const def = createDefaultAppearance();
  if (item?.sectId === "huyet_ma") {
    def.outfitColor = "huyet_sat";
    def.trimColor = "do_tham";
    def.eyeColor = "huyet_dong";
    def.outfitStyle = "ta_tu";
  } else if (item?.sectId === "xich_viem") {
    def.outfitColor = "xich_viem";
    def.trimColor = "cam_lua";
    def.eyeColor = "ho_phach";
    def.outfitStyle = "chien_giap";
  }
  return normalizeAppearance(def);
}

export function createCharacterRecord({
  slotIndex,
  name,
  appearance = null,
  starterGuId = "nguyet_quang",
}) {
  return {
    id: `char_${Date.now()}_${slotIndex}`,
    slotIndex,
    name: String(name ?? "").trim().slice(0, 18) || "Vô Danh Cổ Sư",
    appearance: normalizeAppearance(appearance),
    starterGuId: STARTER_GU_IDS.includes(starterGuId) ? starterGuId : "nguyet_quang",
    path_name: "Khởi Nguyên Cổ Đạo",
    path_color: "#4de6b0",
    realm_level: 1,
    cultivation_exp: 0,
    nguyen_thach: 36, // Tặng 36 Nguyên Thạch khởi đầu để thử Tụ Bảo Cổ Các & Hợp Cổ ngay!
    highest_floor_unlocked: 1,
    floors_cleared: 0,
    total_kills: 0,
    bosses_slain: 0,
    total_runs: 0,
    fusions_success: 0,
    fusions_mutated: 0,
    fusions_failed: 0,
    total_playtime_sec: 0,
    unlocked_recipes: [],
    discovered_gu: [...DEFAULT_DISCOVERED_GU],
    fusion_history: [],
    saved_bag: null,
    saved_equipped: null,
    active_run: null,
    created_at: new Date().toISOString(),
  };
}

function normalizeCharactersArray(raw) {
  const arr = Array.isArray(raw) ? raw.slice(0, 3) : [];
  while (arr.length < 3) arr.push(null);
  return arr.map((item, idx) => {
    if (!item || typeof item !== "object") return null;
    const appearance = migrateLegacyAppearance(item);
    return {
      ...createCharacterRecord({
        slotIndex: idx,
        name: item.name ?? item.dao_hieu ?? `Cổ Sư ${idx + 1}`,
        appearance,
        starterGuId: item.starterGuId ?? "nguyet_quang",
      }),
      ...item,
      slotIndex: idx,
      appearance,
      path_name: item.path_name || "Khởi Nguyên Cổ Đạo",
      path_color: item.path_color || "#4de6b0",
      unlocked_recipes: Array.isArray(item.unlocked_recipes) ? item.unlocked_recipes : [],
      discovered_gu: Array.isArray(item.discovered_gu) ? item.discovered_gu : [...DEFAULT_DISCOVERED_GU],
      fusion_history: Array.isArray(item.fusion_history) ? item.fusion_history : [],
      saved_bag: Array.isArray(item.saved_bag) ? item.saved_bag : null,
      saved_equipped: item.saved_equipped ?? null,
    };
  });
}

function createDefaultProfile() {
  return {
    username: null,
    login_email: null,
    dao_hieu: "Vô Danh Cổ Sư",
    realm_level: 1,
    cultivation_exp: 0,
    nguyen_thach: 36,
    highest_floor_unlocked: 1,
    floors_cleared: 0,
    total_kills: 0,
    bosses_slain: 0,
    total_runs: 0,
    fusions_success: 0,
    fusions_mutated: 0,
    fusions_failed: 0,
    total_playtime_sec: 0,
    unlocked_recipes: [],
    discovered_gu: [...DEFAULT_DISCOVERED_GU],
    fusion_history: [],
    active_run: null,
    characters: [null, null, null],
    last_slot: 0,
    settings: { muted: false },
    save_version: 3,
    updated_at: null,
  };
}

export function fetchWithTimeout(url, options = {}, timeoutMs = 5000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timer));
}

export class AccountManager {
  constructor() {
    this.session = null;
    this.guestMode = false;
    this.profile = createDefaultProfile();
    this.characters = [null, null, null];
    this.activeSlotIndex = null;
    this.syncStatus = "offline";
    this.lastSyncAt = null;
    this.lastError = "";
    this.listeners = new Set();
    this._syncTimer = null;
    this._playtimeBuffer = 0;

    this.loadLocal();
  }

  onChange(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  _emit() {
    for (const fn of this.listeners) fn(this);
  }

  isLoggedIn() {
    return Boolean(this.session?.access_token && this.session?.user?.id);
  }

  canEnterLobby() {
    return this.isLoggedIn() || this.guestMode;
  }

  isConfigured() {
    return Boolean(SUPABASE_URL && SUPABASE_KEY && !SUPABASE_URL.includes("YOUR_PROJECT"));
  }

  getActiveCharacter() {
    if (this.activeSlotIndex === null || this.activeSlotIndex === undefined) return null;
    return this.characters[this.activeSlotIndex] ?? null;
  }

  _mirrorActiveCharacterToProfile() {
    const ch = this.getActiveCharacter();
    if (!ch) return;
    this.profile.dao_hieu = ch.name;
    this.profile.realm_level = getRealmInfo(ch.cultivation_exp).level;
    this.profile.cultivation_exp = ch.cultivation_exp;
    this.profile.nguyen_thach = ch.nguyen_thach;
    this.profile.highest_floor_unlocked = ch.highest_floor_unlocked;
    this.profile.floors_cleared = ch.floors_cleared;
    this.profile.total_kills = ch.total_kills;
    this.profile.bosses_slain = ch.bosses_slain;
    this.profile.total_runs = ch.total_runs;
    this.profile.fusions_success = ch.fusions_success;
    this.profile.fusions_mutated = ch.fusions_mutated;
    this.profile.fusions_failed = ch.fusions_failed;
    this.profile.total_playtime_sec = ch.total_playtime_sec;
    this.profile.unlocked_recipes = [...ch.unlocked_recipes];
    this.profile.discovered_gu = [...ch.discovered_gu];
    this.profile.fusion_history = [...ch.fusion_history];
    this.profile.active_run = ch.active_run;
    this.profile.characters = this.characters;
    this.profile.last_slot = this.activeSlotIndex;
  }

  _maybeMigrateLegacyToSlotZero() {
    if (this.characters.some(Boolean)) return;
    const hasLegacyProgress =
      (this.profile.dao_hieu && this.profile.dao_hieu !== "Vô Danh Cổ Sư") ||
      (this.profile.total_kills ?? 0) > 0 ||
      (this.profile.cultivation_exp ?? 0) > 0 ||
      Boolean(this.profile.active_run);

    if (hasLegacyProgress) {
      this.characters[0] = {
        ...createCharacterRecord({
          slotIndex: 0,
          name: this.profile.dao_hieu || "Vô Danh Cổ Sư",
          appearance: createDefaultAppearance(),
        }),
        realm_level: this.profile.realm_level ?? 1,
        cultivation_exp: this.profile.cultivation_exp ?? 0,
        nguyen_thach: Math.max(36, this.profile.nguyen_thach ?? 0),
        highest_floor_unlocked: this.profile.highest_floor_unlocked ?? 1,
        floors_cleared: this.profile.floors_cleared ?? 0,
        total_kills: this.profile.total_kills ?? 0,
        bosses_slain: this.profile.bosses_slain ?? 0,
        total_runs: this.profile.total_runs ?? 0,
        fusions_success: this.profile.fusions_success ?? 0,
        fusions_mutated: this.profile.fusions_mutated ?? 0,
        fusions_failed: this.profile.fusions_failed ?? 0,
        total_playtime_sec: this.profile.total_playtime_sec ?? 0,
        unlocked_recipes: [...(this.profile.unlocked_recipes ?? [])],
        discovered_gu: [...(this.profile.discovered_gu ?? DEFAULT_DISCOVERED_GU)],
        fusion_history: [...(this.profile.fusion_history ?? [])],
        active_run: this.profile.active_run ?? null,
      };
      this.profile.characters = this.characters;
    }
  }

  loadLocal() {
    try {
      let raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        for (const k of LEGACY_KEYS) {
          raw = localStorage.getItem(k);
          if (raw) break;
        }
      }
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed.session) this.session = parsed.session;
      if (parsed.guestMode) this.guestMode = Boolean(parsed.guestMode);
      if (parsed.profile) {
        this.profile = { ...createDefaultProfile(), ...parsed.profile };
        this.characters = normalizeCharactersArray(parsed.profile.characters ?? parsed.characters);
        this.profile.characters = this.characters;
      } else if (Array.isArray(parsed.characters)) {
        this.characters = normalizeCharactersArray(parsed.characters);
        this.profile.characters = this.characters;
      }
      this._maybeMigrateLegacyToSlotZero();
      if (this.isLoggedIn()) {
        this.syncStatus = "synced";
      }
    } catch {
      // Ignore corrupt local state
    }
  }

  saveLocal() {
    try {
      this._mirrorActiveCharacterToProfile();
      this.profile.characters = this.characters;
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          session: this.session,
          guestMode: this.guestMode,
          profile: this.profile,
        })
      );
    } catch {
      // Ignore storage quota
    }
  }

  getSyncPayload() {
    this._mirrorActiveCharacterToProfile();
    const realm = getRealmInfo(this.profile.cultivation_exp);
    this.profile.realm_level = realm.level;
    return {
      dao_hieu: this.profile.dao_hieu || "Vô Danh Cổ Sư",
      realm_level: this.profile.realm_level,
      cultivation_exp: this.profile.cultivation_exp,
      nguyen_thach: this.profile.nguyen_thach,
      highest_floor_unlocked: this.profile.highest_floor_unlocked,
      floors_cleared: this.profile.floors_cleared,
      total_kills: this.profile.total_kills,
      bosses_slain: this.profile.bosses_slain,
      total_runs: this.profile.total_runs,
      fusions_success: this.profile.fusions_success,
      fusions_mutated: this.profile.fusions_mutated,
      fusions_failed: this.profile.fusions_failed,
      total_playtime_sec: Math.floor(this.profile.total_playtime_sec),
      unlocked_recipes: this.profile.unlocked_recipes,
      discovered_gu: this.profile.discovered_gu,
      fusion_history: this.profile.fusion_history,
      active_run: this.profile.active_run,
      characters: this.characters,
      last_slot: Math.min(2, Math.max(0, Number(this.profile.last_slot ?? 0))),
      settings: this.profile.settings,
      save_version: 3,
    };
  }

  _applyCloudRow(row) {
    if (!row) return;
    this.profile = {
      ...createDefaultProfile(),
      ...row,
      unlocked_recipes: Array.isArray(row.unlocked_recipes) ? row.unlocked_recipes : [],
      discovered_gu: Array.isArray(row.discovered_gu) ? row.discovered_gu : [...DEFAULT_DISCOVERED_GU],
      fusion_history: Array.isArray(row.fusion_history) ? row.fusion_history : [],
      settings: row.settings ?? { muted: false },
    };
    this.characters = normalizeCharactersArray(row.characters);
    this._maybeMigrateLegacyToSlotZero();
    this.profile.characters = this.characters;
    if (this.activeSlotIndex !== null && !this.characters[this.activeSlotIndex]) {
      this.activeSlotIndex = null;
    }
    this._mirrorActiveCharacterToProfile();
    this.saveLocal();
    this._emit();
  }

  playOfflineGuest() {
    this.guestMode = true;
    this.session = null;
    this.syncStatus = "offline";
    this.saveLocal();
    this._emit();
  }

  createCharacter(slotIndex, { name, appearance, starterGuId = "nguyet_quang" }) {
    const idx = Math.min(2, Math.max(0, Number(slotIndex) || 0));
    const cleanName = String(name ?? "").trim().slice(0, 18);
    if (cleanName.length < 2) {
      throw new Error("Đạo hiệu nhân vật phải từ 2 đến 18 ký tự.");
    }
    const charData = createCharacterRecord({
      slotIndex: idx,
      name: cleanName,
      appearance,
      starterGuId,
    });
    this.characters[idx] = charData;
    this.activeSlotIndex = idx;
    this.profile.last_slot = idx;
    this._mirrorActiveCharacterToProfile();
    this.syncCloud();
    this._emit();
    return charData;
  }

  updateCharacterAppearance(newAppearance, newName = null) {
    const ch = this.getActiveCharacter();
    if (!ch) return null;
    ch.appearance = normalizeAppearance(newAppearance);
    if (newName && String(newName).trim().length >= 2) {
      ch.name = String(newName).trim().slice(0, 18);
    }
    this._mirrorActiveCharacterToProfile();
    this.scheduleSync(400);
    this._emit();
    return ch;
  }

  persistCharacterLoadout(player) {
    const ch = this.getActiveCharacter();
    if (!ch || !player) return;
    ch.saved_bag = player.bag.map((g) => ({ ...g }));
    ch.saved_equipped = { ...player.equipped };
    if (player.pathInfo) {
      ch.path_name = player.pathInfo.name;
      ch.path_color = player.pathInfo.color;
    }
    this.recordUnlockedRecipes(player.unlockedRecipes);
    for (const g of player.bag) {
      this.recordDiscoveredGu(g.baseId);
    }
    this._mirrorActiveCharacterToProfile();
    this.scheduleSync(600);
  }

  drawTreasureGu(player, cost = 18) {
    const ch = this.getActiveCharacter();
    const effectiveCost = player && player.bag.length < 3 ? 0 : cost;
    const curStone = ch ? ch.nguyen_thach : this.profile.nguyen_thach;
    if (curStone < effectiveCost) {
      throw new Error(`Cần ${effectiveCost} 💎 Nguyên Thạch để chiêu mộ Cổ Trùng mới.`);
    }
    if (ch) ch.nguyen_thach -= effectiveCost;
    else this.profile.nguyen_thach -= effectiveCost;

    const pickedId = STARTER_GU_IDS[Math.floor(Math.random() * STARTER_GU_IDS.length)];
    const gu = createGuInstance(pickedId);
    if (player) {
      player.addGu(gu);
      this.persistCharacterLoadout(player);
    } else {
      this.scheduleSync(500);
    }
    this._emit();
    return { gu, spent: effectiveCost };
  }

  deleteCharacter(slotIndex) {
    const idx = Math.min(2, Math.max(0, Number(slotIndex) || 0));
    this.characters[idx] = null;
    if (this.activeSlotIndex === idx) {
      this.activeSlotIndex = null;
    }
    this.profile.characters = this.characters;
    if (this.activeSlotIndex === null) {
      this.profile.active_run = null;
    }
    this.syncCloud();
    this._emit();
  }

  selectCharacter(slotIndex) {
    const idx = Math.min(2, Math.max(0, Number(slotIndex) || 0));
    if (!this.characters[idx]) return null;
    this.activeSlotIndex = idx;
    this.profile.last_slot = idx;
    this._mirrorActiveCharacterToProfile();
    this.saveLocal();
    this._emit();
    return this.characters[idx];
  }

  deselectCharacter() {
    this.activeSlotIndex = null;
    this._emit();
  }

  async _callAuthFunction(payload) {
    if (!this.isConfigured()) {
      throw new Error("Chưa cấu hình kết nối Supabase.");
    }
    const res = await fetchWithTimeout(
      `${SUPABASE_URL}/functions/v1/account-auth`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
        },
        body: JSON.stringify(payload),
      },
      7000
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.error) {
      throw new Error(data.error || `Lỗi xác thực (${res.status})`);
    }
    return data;
  }

  async register({ username, email, password, daoHieu }) {
    const cleanUser = String(username ?? "").trim().toLowerCase();
    if (!/^[a-z0-9_.-]{3,24}$/.test(cleanUser)) {
      throw new Error("Tên tài khoản 3–24 ký tự (a-z, 0-9, _, ., -).");
    }
    if (!password || password.length < 6) {
      throw new Error("Mật khẩu phải từ 6 ký tự trở lên.");
    }

    const res = await this._callAuthFunction({
      action: "register",
      username: cleanUser,
      email: email ? String(email).trim() : "",
      password,
      daoHieu: daoHieu ? String(daoHieu).trim() : "Vô Danh Cổ Sư",
      snapshot: this.getSyncPayload(),
    });

    this.guestMode = false;
    this.session = res.session;
    this.activeSlotIndex = null;
    this._applyCloudRow(res.account);
    this.syncStatus = "synced";
    this.lastSyncAt = new Date();
    this.lastError = "";
    this._emit();
    return res.account;
  }

  async login({ identifier, password }) {
    const cleanId = String(identifier ?? "").trim();
    if (!cleanId || !password) {
      throw new Error("Vui lòng nhập Tên tài khoản (hoặc Email) và Mật khẩu.");
    }

    const res = await this._callAuthFunction({
      action: "login",
      identifier: cleanId,
      password,
    });

    this.guestMode = false;
    this.session = res.session;
    this.activeSlotIndex = null;
    this._applyCloudRow(res.account);
    this.syncStatus = "synced";
    this.lastSyncAt = new Date();
    this.lastError = "";
    this._emit();
    return res.account;
  }

  logout() {
    this.session = null;
    this.guestMode = false;
    this.activeSlotIndex = null;
    this.characters = [null, null, null];
    this.profile = createDefaultProfile();
    this.syncStatus = "offline";
    this.lastError = "";
    this.saveLocal();
    this._emit();
  }

  async ensureFreshToken() {
    if (!this.session?.refresh_token) return false;
    const nowSec = Math.floor(Date.now() / 1000);
    if (this.session.expires_at && this.session.expires_at - 90 > nowSec) {
      return true;
    }
    try {
      const res = await fetchWithTimeout(
        `${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: SUPABASE_KEY,
          },
          body: JSON.stringify({ refresh_token: this.session.refresh_token }),
        },
        5000
      );
      if (!res.ok) return false;
      const data = await res.json();
      if (data.access_token) {
        this.session = {
          access_token: data.access_token,
          refresh_token: data.refresh_token ?? this.session.refresh_token,
          expires_at: data.expires_at ?? nowSec + (data.expires_in ?? 3600),
          user: data.user ?? this.session.user,
        };
        this.saveLocal();
        return true;
      }
    } catch {
      return false;
    }
    return false;
  }

  async pullFromCloud() {
    if (!this.isLoggedIn() || !this.isConfigured()) return false;
    this.syncStatus = "syncing";
    this._emit();
    try {
      await this.ensureFreshToken();
      const uid = encodeURIComponent(this.session.user.id);
      const res = await fetchWithTimeout(
        `${SUPABASE_URL}/rest/v1/player_accounts?user_id=eq.${uid}&select=*`,
        {
          headers: {
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${this.session.access_token}`,
          },
        },
        5000
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const rows = await res.json();
      if (Array.isArray(rows) && rows[0]) {
        this._applyCloudRow(rows[0]);
      }
      this.syncStatus = "synced";
      this.lastSyncAt = new Date();
      this.lastError = "";
      this._emit();
      return true;
    } catch (err) {
      this.syncStatus = "error";
      this.lastError = err?.name === "AbortError" ? "Quá thời gian kết nối" : err.message;
      this._emit();
      return false;
    }
  }

  async syncCloud() {
    this.saveLocal();
    if (!this.isLoggedIn() || !this.isConfigured()) {
      this.syncStatus = "offline";
      this._emit();
      return false;
    }

    this.syncStatus = "syncing";
    this._emit();
    try {
      await this.ensureFreshToken();
      const uid = encodeURIComponent(this.session.user.id);
      const payload = this.getSyncPayload();
      const res = await fetchWithTimeout(
        `${SUPABASE_URL}/rest/v1/player_accounts?user_id=eq.${uid}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${this.session.access_token}`,
            Prefer: "return=representation",
          },
          body: JSON.stringify(payload),
        },
        6000
      );
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`HTTP ${res.status}: ${txt}`);
      }
      const rows = await res.json();
      if (Array.isArray(rows) && rows[0]) {
        this.profile.updated_at = rows[0].updated_at;
      }
      this.syncStatus = "synced";
      this.lastSyncAt = new Date();
      this.lastError = "";
      this.saveLocal();
      this._emit();
      return true;
    } catch (err) {
      this.syncStatus = "error";
      this.lastError = err?.name === "AbortError" ? "Quá thời gian kết nối" : err.message;
      this._emit();
      return false;
    }
  }

  scheduleSync(delayMs = 1200) {
    this.saveLocal();
    if (!this.isLoggedIn()) return;
    clearTimeout(this._syncTimer);
    this._syncTimer = setTimeout(() => {
      this.syncCloud();
    }, delayMs);
  }

  setDaoHieu(newName) {
    const trimmed = String(newName ?? "").trim().slice(0, 18);
    if (trimmed.length < 2) return;
    const ch = this.getActiveCharacter();
    if (ch) ch.name = trimmed;
    this.profile.dao_hieu = trimmed;
    this.scheduleSync(400);
    this._emit();
  }

  setMuted(muted) {
    this.profile.settings = { ...(this.profile.settings ?? {}), muted: Boolean(muted) };
    this.scheduleSync(800);
  }

  tickPlaytime(dt) {
    this._playtimeBuffer += dt;
    if (this._playtimeBuffer >= 1) {
      const whole = Math.floor(this._playtimeBuffer);
      this._playtimeBuffer -= whole;
      const ch = this.getActiveCharacter();
      if (ch) ch.total_playtime_sec += whole;
      this.profile.total_playtime_sec += whole;
    }
  }

  recordRunStarted() {
    const ch = this.getActiveCharacter();
    if (ch) ch.total_runs += 1;
    this.profile.total_runs += 1;
    this.scheduleSync(800);
  }

  recordEnemyKill() {
    const ch = this.getActiveCharacter();
    if (ch) {
      ch.total_kills += 1;
      ch.cultivation_exp += 8;
      ch.nguyen_thach += 3;
      ch.realm_level = getRealmInfo(ch.cultivation_exp).level;
    }
    this._mirrorActiveCharacterToProfile();
    this.saveLocal();
  }

  recordBossKill(floorNum) {
    const ch = this.getActiveCharacter();
    if (ch) {
      ch.bosses_slain += 1;
      ch.cultivation_exp += 90;
      ch.nguyen_thach += 45;
      ch.highest_floor_unlocked = Math.max(
        ch.highest_floor_unlocked,
        Math.min(3, floorNum + 1)
      );
      if (floorNum >= 3) {
        ch.floors_cleared += 1;
      }
      ch.realm_level = getRealmInfo(ch.cultivation_exp).level;
    }
    this._mirrorActiveCharacterToProfile();
    this.syncCloud();
  }

  recordDiscoveredGu(baseId) {
    if (!baseId) return;
    const ch = this.getActiveCharacter();
    if (ch && !ch.discovered_gu.includes(baseId)) {
      ch.discovered_gu.push(baseId);
    }
    if (!this.profile.discovered_gu.includes(baseId)) {
      this.profile.discovered_gu.push(baseId);
    }
  }

  recordUnlockedRecipes(recipesSet) {
    if (!recipesSet) return;
    const ch = this.getActiveCharacter();
    if (ch) {
      ch.unlocked_recipes = [...new Set([...(ch.unlocked_recipes ?? []), ...recipesSet])];
    }
    this.profile.unlocked_recipes = [...new Set([...(this.profile.unlocked_recipes ?? []), ...recipesSet])];
  }

  recordFusion({ mainName, subName, resultGu, outcome }) {
    const ch = this.getActiveCharacter();
    const expGain = outcome === "mutation" ? 40 : outcome === "success" ? 28 : 10;

    if (ch) {
      if (outcome === "mutation") ch.fusions_mutated += 1;
      else if (outcome === "success") ch.fusions_success += 1;
      else ch.fusions_failed += 1;
      ch.cultivation_exp += expGain;
      ch.realm_level = getRealmInfo(ch.cultivation_exp).level;
    }

    if (resultGu?.baseId) {
      this.recordDiscoveredGu(resultGu.baseId);
    }

    const entry = {
      at: new Date().toISOString(),
      main: mainName,
      sub: subName,
      result: resultGu?.name ?? "Tàn Cổ",
      outcome,
    };
    if (ch) {
      ch.fusion_history = [entry, ...(ch.fusion_history ?? [])].slice(0, 20);
    }
    this._mirrorActiveCharacterToProfile();
    this.syncCloud();
  }

  saveActiveRunSnapshot(player, world) {
    const ch = this.getActiveCharacter();
    if (player) {
      this.persistCharacterLoadout(player);
    }
    // Ở Vạn Cổ Thành (floor 0) hoặc đã kết thúc trận thì không cần đánh dấu dở Bí Cảnh
    if (
      !player ||
      !world ||
      world.floorNumber === 0 ||
      player.isDead ||
      world.phase === "victory" ||
      world.phase === "gameover"
    ) {
      if (ch) ch.active_run = null;
      this.profile.active_run = null;
      this.saveLocal();
      return;
    }

    const snap = {
      floorNumber: world.floorNumber,
      phase: world.phase === "boss" ? "cauldron" : world.phase,
      waveIndex: world.waveIndex,
      hp: Math.max(1, Math.round(player.hp)),
      maxHp: player.maxHp,
      mp: Math.round(player.mp),
      maxMp: player.maxMp,
      corruption: Math.round(player.corruption),
      kills: player.kills,
      appearance: player.appearance,
      bag: player.bag.map((g) => ({ ...g })),
      equipped: { ...player.equipped },
      savedAt: new Date().toISOString(),
    };
    if (ch) ch.active_run = snap;
    this.profile.active_run = snap;
    this.saveLocal();
  }

  clearActiveRunSnapshot(syncNow = false) {
    const ch = this.getActiveCharacter();
    if (ch) ch.active_run = null;
    this.profile.active_run = null;
    if (syncNow) this.syncCloud();
    else this.saveLocal();
  }
}
