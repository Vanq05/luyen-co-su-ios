import { SUPABASE_KEY, SUPABASE_URL } from "../config/supabaseConfig.js";

const STORAGE_KEY = "luyen_co_su_save_v1";

export const REALM_TIERS = [
  { level: 1, minExp: 0, title: "Nhất Chuyển Sơ Kỳ" },
  { level: 2, minExp: 120, title: "Nhất Chuyển Trung Kỳ" },
  { level: 3, minExp: 300, title: "Nhất Chuyển Đỉnh Phong" },
  { level: 4, minExp: 600, title: "Nhị Chuyển Cổ Sư" },
  { level: 5, minExp: 1100, title: "Tam Chuyển Trưởng Lão" },
  { level: 6, minExp: 2000, title: "Ngũ Chuyển Cổ Tiên" },
  { level: 7, minExp: 3500, title: "Cửu Chuyển Cổ Tôn" },
];

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

function createDefaultProfile() {
  return {
    username: null,
    login_email: null,
    dao_hieu: "Vô Danh Cổ Sư",
    realm_level: 1,
    cultivation_exp: 0,
    nguyen_thach: 0,
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
    discovered_gu: [
      "nguyet_quang",
      "huyet_nha",
      "thanh_doc",
      "thiet_cot",
      "anh_bo",
      "hoa_than",
    ],
    fusion_history: [],
    active_run: null,
    settings: { muted: false },
    save_version: 1,
    updated_at: null,
  };
}

/**
 * Quản lý Tài khoản, Offline Save (localStorage) và Cloud Save (Supabase REST + Edge Function).
 */
export class AccountManager {
  constructor() {
    this.session = null; // { access_token, refresh_token, expires_at, user }
    this.profile = createDefaultProfile();
    this.syncStatus = "offline"; // "offline" | "syncing" | "synced" | "error"
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

  isConfigured() {
    return Boolean(SUPABASE_URL && SUPABASE_KEY && !SUPABASE_URL.includes("YOUR_PROJECT"));
  }

  loadLocal() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed.session) this.session = parsed.session;
      if (parsed.profile) {
        this.profile = { ...createDefaultProfile(), ...parsed.profile };
      }
      if (this.isLoggedIn()) {
        this.syncStatus = "synced";
      }
    } catch {
      // Bỏ qua lỗi dữ liệu cục bộ hỏng
    }
  }

  saveLocal() {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          session: this.session,
          profile: this.profile,
        })
      );
    } catch {
      // Bỏ qua nếu bộ nhớ đầy
    }
  }

  getSyncPayload() {
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
      settings: this.profile.settings,
      save_version: this.profile.save_version,
    };
  }

  _applyCloudRow(row) {
    if (!row) return;
    this.profile = {
      ...createDefaultProfile(),
      ...row,
      unlocked_recipes: Array.isArray(row.unlocked_recipes) ? row.unlocked_recipes : [],
      discovered_gu: Array.isArray(row.discovered_gu) ? row.discovered_gu : [],
      fusion_history: Array.isArray(row.fusion_history) ? row.fusion_history : [],
      settings: row.settings ?? { muted: false },
    };
    this.saveLocal();
    this._emit();
  }

  async _callAuthFunction(payload) {
    if (!this.isConfigured()) {
      throw new Error("Chưa cấu hình kết nối Supabase.");
    }
    const res = await fetch(`${SUPABASE_URL}/functions/v1/account-auth`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
      },
      body: JSON.stringify(payload),
    });
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
      daoHieu: daoHieu ? String(daoHieu).trim() : cleanUser,
      snapshot: this.getSyncPayload(),
    });

    this.session = res.session;
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

    this.session = res.session;
    this._applyCloudRow(res.account);
    this.syncStatus = "synced";
    this.lastSyncAt = new Date();
    this.lastError = "";
    this._emit();
    return res.account;
  }

  logout() {
    this.session = null;
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
      const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_KEY,
        },
        body: JSON.stringify({ refresh_token: this.session.refresh_token }),
      });
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
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/player_accounts?user_id=eq.${uid}&select=*`,
        {
          headers: {
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${this.session.access_token}`,
          },
        }
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
      this.lastError = err.message;
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
      const res = await fetch(
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
        }
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
      this.lastError = err.message;
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

  // === CÁC HÀM GHI NHẬN TIẾN TRÌNH ĐẦY ĐỦ CỦA ACC ===

  setDaoHieu(newName) {
    const trimmed = String(newName ?? "").trim().slice(0, 32);
    if (!trimmed) return;
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
      this.profile.total_playtime_sec += whole;
    }
  }

  recordRunStarted() {
    this.profile.total_runs += 1;
    this.scheduleSync(800);
  }

  recordEnemyKill() {
    this.profile.total_kills += 1;
    this.profile.cultivation_exp += 8;
    this.profile.nguyen_thach += 2;
    this.profile.realm_level = getRealmInfo(this.profile.cultivation_exp).level;
    this.saveLocal();
  }

  recordBossKill(floorNum) {
    this.profile.bosses_slain += 1;
    this.profile.cultivation_exp += 80;
    this.profile.nguyen_thach += 35;
    this.profile.highest_floor_unlocked = Math.max(
      this.profile.highest_floor_unlocked,
      Math.min(3, floorNum + 1)
    );
    if (floorNum >= 3) {
      this.profile.floors_cleared += 1;
    }
    this.profile.realm_level = getRealmInfo(this.profile.cultivation_exp).level;
    this.syncCloud();
  }

  recordDiscoveredGu(baseId) {
    if (!baseId) return;
    if (!this.profile.discovered_gu.includes(baseId)) {
      this.profile.discovered_gu.push(baseId);
    }
  }

  recordUnlockedRecipes(recipesSet) {
    if (!recipesSet) return;
    const merged = new Set([...(this.profile.unlocked_recipes ?? []), ...recipesSet]);
    this.profile.unlocked_recipes = [...merged];
  }

  recordFusion({ mainName, subName, resultGu, outcome }) {
    if (outcome === "mutation") {
      this.profile.fusions_mutated += 1;
      this.profile.cultivation_exp += 35;
    } else if (outcome === "success") {
      this.profile.fusions_success += 1;
      this.profile.cultivation_exp += 25;
    } else {
      this.profile.fusions_failed += 1;
      this.profile.cultivation_exp += 8;
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
    this.profile.fusion_history = [entry, ...(this.profile.fusion_history ?? [])].slice(0, 20);
    this.profile.realm_level = getRealmInfo(this.profile.cultivation_exp).level;
    this.syncCloud();
  }

  saveActiveRunSnapshot(player, world) {
    if (!player || !world || player.isDead || world.phase === "victory" || world.phase === "gameover") {
      this.profile.active_run = null;
      this.saveLocal();
      return;
    }

    this.recordUnlockedRecipes(player.unlockedRecipes);
    for (const g of player.bag) {
      this.recordDiscoveredGu(g.baseId);
    }

    this.profile.active_run = {
      floorNumber: world.floorNumber,
      phase: world.phase === "boss" ? "cauldron" : world.phase, // Nếu thoát giữa trận boss -> quay về trước Trạm Luyện Cổ của tầng đó
      waveIndex: world.waveIndex,
      hp: Math.max(1, Math.round(player.hp)),
      maxHp: player.maxHp,
      mp: Math.round(player.mp),
      maxMp: player.maxMp,
      corruption: Math.round(player.corruption),
      kills: player.kills,
      bag: player.bag.map((g) => ({ ...g })),
      equipped: { ...player.equipped },
      savedAt: new Date().toISOString(),
    };
    this.saveLocal();
  }

  clearActiveRunSnapshot(syncNow = false) {
    this.profile.active_run = null;
    if (syncNow) this.syncCloud();
    else this.saveLocal();
  }
}
