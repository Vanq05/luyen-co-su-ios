import {
  createDefaultAppearance,
  normalizeAppearance,
} from "../character/CharacterSpriteBuilder.js";
import { getStageInfo } from "../data/CultivationData.js";
import { SUPABASE_KEY, SUPABASE_URL } from "../config/supabaseConfig.js";

const STORAGE_KEY = "cotienlo_save_v1";

export function fetchWithTimeout(url, options = {}, timeoutMs = 5000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timer));
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
    starterGuId,
    path_name: "Nguyệt Đạo",
    path_color: "#5ef2d6",
    realm_level: 1,
    cultivation_exp: 0,
    nguyen_thach: 180,
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
    discovered_gu: [starterGuId],
    fusion_history: [],
    ctl_state: null,
    created_at: new Date().toISOString(),
  };
}

function normalizeCharactersArray(raw) {
  const arr = Array.isArray(raw) ? raw.slice(0, 3) : [];
  while (arr.length < 3) arr.push(null);
  return arr.map((item, idx) => {
    if (!item || typeof item !== "object") return null;
    const appearance = normalizeAppearance(item.appearance);
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
    nguyen_thach: 180,
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
    discovered_gu: [],
    fusion_history: [],
    active_run: null,
    characters: [null, null, null],
    last_slot: 0,
    settings: { muted: false },
    save_version: 4,
    updated_at: null,
  };
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
    this.profile.realm_level = ch.realm_level ?? 1;
    this.profile.cultivation_exp = ch.cultivation_exp ?? 0;
    this.profile.nguyen_thach = ch.nguyen_thach ?? 180;
    this.profile.total_kills = ch.total_kills ?? 0;
    this.profile.bosses_slain = ch.bosses_slain ?? 0;
    this.profile.total_playtime_sec = ch.total_playtime_sec ?? 0;
    this.profile.characters = this.characters;
    this.profile.last_slot = this.activeSlotIndex;
  }

  loadLocal() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed.session) this.session = parsed.session;
      if (parsed.guestMode) this.guestMode = Boolean(parsed.guestMode);
      if (parsed.profile) {
        this.profile = { ...createDefaultProfile(), ...parsed.profile };
        this.characters = normalizeCharactersArray(parsed.profile.characters);
        this.profile.characters = this.characters;
      }
      if (this.isLoggedIn()) this.syncStatus = "synced";
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
        JSON.stringify({ session: this.session, guestMode: this.guestMode, profile: this.profile })
      );
    } catch {
      // Ignore storage quota
    }
  }

  getSyncPayload() {
    this._mirrorActiveCharacterToProfile();
    return {
      dao_hieu: this.profile.dao_hieu || "Vô Danh Cổ Sư",
      realm_level: Math.max(1, this.profile.realm_level || 1),
      cultivation_exp: Math.max(0, this.profile.cultivation_exp || 0),
      nguyen_thach: Math.max(0, this.profile.nguyen_thach || 0),
      highest_floor_unlocked: Math.min(3, Math.max(1, this.profile.highest_floor_unlocked || 1)),
      floors_cleared: Math.max(0, this.profile.floors_cleared || 0),
      total_kills: Math.max(0, this.profile.total_kills || 0),
      bosses_slain: Math.max(0, this.profile.bosses_slain || 0),
      total_runs: Math.max(0, this.profile.total_runs || 0),
      fusions_success: Math.max(0, this.profile.fusions_success || 0),
      fusions_mutated: Math.max(0, this.profile.fusions_mutated || 0),
      fusions_failed: Math.max(0, this.profile.fusions_failed || 0),
      total_playtime_sec: Math.floor(this.profile.total_playtime_sec || 0),
      unlocked_recipes: this.profile.unlocked_recipes ?? [],
      discovered_gu: this.profile.discovered_gu ?? [],
      fusion_history: this.profile.fusion_history ?? [],
      active_run: null,
      characters: this.characters,
      last_slot: Math.min(2, Math.max(0, Number(this.profile.last_slot ?? 0))),
      settings: this.profile.settings ?? { muted: false },
      save_version: 4,
    };
  }

  _applyCloudRow(row) {
    if (!row) return;
    this.profile = { ...createDefaultProfile(), ...row };
    this.characters = normalizeCharactersArray(row.characters);
    this.profile.characters = this.characters;
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
    const charData = createCharacterRecord({ slotIndex: idx, name: cleanName, appearance, starterGuId });
    this.characters[idx] = charData;
    this.activeSlotIndex = idx;
    this.profile.last_slot = idx;
    this._mirrorActiveCharacterToProfile();
    this.syncCloud();
    this._emit();
    return charData;
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

  deleteCharacter(slotIndex) {
    const idx = Math.min(2, Math.max(0, Number(slotIndex) || 0));
    this.characters[idx] = null;
    if (this.activeSlotIndex === idx) this.activeSlotIndex = null;
    this.profile.characters = this.characters;
    this.syncCloud();
    this._emit();
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

  persistPlayerState(player) {
    const ch = this.getActiveCharacter();
    if (!ch || !player) return;
    ch.ctl_state = player.serializeState();
    ch.name = player.characterName;
    ch.realm_level = getStageInfo(player.stageLevel).level;
    ch.cultivation_exp = player.cultivationExp;
    ch.nguyen_thach = player.nguyenThach;
    ch.total_kills = player.kills;
    ch.bosses_slain = player.bossesSlain;
    const pInfo = player.getPathInfo();
    ch.path_name = pInfo.name;
    ch.path_color = pInfo.color;
    this._mirrorActiveCharacterToProfile();
    this.scheduleSync(800);
  }

  recordBossKill() {
    this.scheduleSync(600);
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

  async _callAuthFunction(payload) {
    if (!this.isConfigured()) throw new Error("Chưa cấu hình kết nối Supabase.");
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
    if (!res.ok || data.error) throw new Error(data.error || `Lỗi xác thực (${res.status})`);
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
    this._emit();
    return res.account;
  }

  async login({ identifier, password }) {
    const cleanId = String(identifier ?? "").trim();
    if (!cleanId || !password) throw new Error("Vui lòng nhập Tên tài khoản và Mật khẩu.");
    const res = await this._callAuthFunction({ action: "login", identifier: cleanId, password });
    this.guestMode = false;
    this.session = res.session;
    this.activeSlotIndex = null;
    this._applyCloudRow(res.account);
    this.syncStatus = "synced";
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
    this.saveLocal();
    this._emit();
  }

  async ensureFreshToken() {
    if (!this.session?.refresh_token) return false;
    const nowSec = Math.floor(Date.now() / 1000);
    if (this.session.expires_at && this.session.expires_at - 90 > nowSec) return true;
    try {
      const res = await fetchWithTimeout(
        `${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", apikey: SUPABASE_KEY },
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
    try {
      await this.ensureFreshToken();
      const uid = encodeURIComponent(this.session.user.id);
      const res = await fetchWithTimeout(
        `${SUPABASE_URL}/rest/v1/player_accounts?user_id=eq.${uid}&select=*`,
        { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${this.session.access_token}` } },
        5000
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const rows = await res.json();
      if (Array.isArray(rows) && rows[0]) this._applyCloudRow(rows[0]);
      this.syncStatus = "synced";
      this._emit();
      return true;
    } catch (err) {
      this.syncStatus = "error";
      this.lastError = err.message;
      return false;
    }
  }

  async syncCloud() {
    this.saveLocal();
    if (!this.isLoggedIn() || !this.isConfigured()) {
      this.syncStatus = "offline";
      return false;
    }
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
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      this.syncStatus = "synced";
      this.saveLocal();
      this._emit();
      return true;
    } catch (err) {
      this.syncStatus = "error";
      this.lastError = err.message;
      return false;
    }
  }

  scheduleSync(delayMs = 1200) {
    this.saveLocal();
    if (!this.isLoggedIn()) return;
    clearTimeout(this._syncTimer);
    this._syncTimer = setTimeout(() => this.syncCloud(), delayMs);
  }
}
