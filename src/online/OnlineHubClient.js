import { fetchWithTimeout } from "../account/AccountManager.js";
import { normalizeAppearance } from "../character/CharacterSpriteBuilder.js";
import { SUPABASE_KEY, SUPABASE_URL } from "../config/supabaseConfig.js";

/**
 * Kết nối trực tuyến Vạn Cổ Thành (Online Multiplayer Presence, Bảng Thiên Kiêu & Kênh Truyền Âm):
 * - Đồng bộ vị trí, ngoại hình tùy chỉnh, Đạo Lộ & 5 Cổ trang bị lên `public.online_characters`.
 * - Nội suy mượt 60 FPS vị trí các người chơi khác đang dạo bước trong Vạn Cổ Thành.
 * - Quản lý Kênh Truyền Âm Thế Giới (`public.world_chat`) & phát loa toàn cõi khi Hợp Cổ Đại Thành.
 */
export class OnlineHubClient {
  constructor({ account }) {
    this.account = account;
    this.remotePlayers = new Map(); // char_key -> player state
    this.leaderboard = [];
    this.messages = [];
    this.onlineCount = 1;
    this.listeners = new Set();

    this._heartbeatTimer = 0;
    this._pollTimer = 0;
    this._busyPoll = false;
    this._busyPush = false;
  }

  onChange(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  _emit() {
    for (const fn of this.listeners) fn(this);
  }

  getMyCharKey() {
    if (!this.account.isLoggedIn() || this.account.activeSlotIndex === null) return null;
    return `${this.account.session.user.id}:${this.account.activeSlotIndex}`;
  }

  tick(dt, { player, world }) {
    // Nội suy mượt chuyển động các đạo hữu khác trên quảng trường
    for (const rp of this.remotePlayers.values()) {
      rp.animTime = (rp.animTime ?? 0) + dt;
      const dx = rp.targetX - rp.x;
      const dy = rp.targetY - rp.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 140) {
        rp.x = rp.targetX;
        rp.y = rp.targetY;
      } else if (dist > 0.8) {
        rp.x += dx * Math.min(1, dt * 6.5);
        rp.y += dy * Math.min(1, dt * 6.5);
        rp.facing = Math.atan2(dy, dx);
        rp.isWalking = true;
      } else {
        rp.isWalking = Boolean(rp.moving);
      }
    }

    if (!world || !player) return;

    this._heartbeatTimer += dt;
    this._pollTimer += dt;

    if (this._heartbeatTimer >= 2.6) {
      this._heartbeatTimer = 0;
      this.pushPresence(player, world);
    }

    if (this._pollTimer >= 3.4) {
      this._pollTimer = 0;
      this.pollAll();
    }
  }

  async pushPresence(player, world) {
    if (this._busyPush || !this.account.isLoggedIn() || !this.account.isConfigured()) return;
    const ch = this.account.getActiveCharacter();
    if (!ch) return;

    this._busyPush = true;
    try {
      await this.account.ensureFreshToken();
      const uid = this.account.session.user.id;
      const slotIdx = this.account.activeSlotIndex ?? 0;
        const pInfo = player.getPathInfo ? player.getPathInfo() : player.pathInfo;
        const payload = {
        char_key: `${uid}:${slotIdx}`,
        user_id: uid,
        slot_index: slotIdx,
        name: ch.name,
        appearance: normalizeAppearance(player.appearance),
        path_name: pInfo?.name ?? ch.path_name ?? "Nguyệt Đạo",
        path_color: pInfo?.color ?? ch.path_color ?? "#5ef2d6",
        realm_level: player.stageLevel ?? ch.realm_level ?? 1,
        cultivation_exp: player.cultivationExp ?? ch.cultivation_exp ?? 0,
        bosses_slain: player.bossesSlain ?? ch.bosses_slain ?? 0,
        equipped_summary: player.getEquippedSummary(),
        scene: world.currentMapId || "ta_gia_trai",
        x: Math.round(player.x),
        y: Math.round(player.y),
        facing: Number((player.facing ?? 0).toFixed(2)),
        moving: Boolean(player.moving),
      };

      await fetchWithTimeout(
        `${SUPABASE_URL}/rest/v1/online_characters?on_conflict=char_key`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${this.account.session.access_token}`,
            Prefer: "resolution=merge-duplicates,return=minimal",
          },
          body: JSON.stringify(payload),
        },
        4500
      );
    } catch {
      // Bỏ qua lỗi mạng tạm thời để không ảnh hưởng FPS
    } finally {
      this._busyPush = false;
    }
  }

  async pollAll() {
    if (this._busyPoll || !this.account.isConfigured()) return;
    this._busyPoll = true;
    const authToken = this.account.session?.access_token || SUPABASE_KEY;
    const headers = {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${authToken}`,
    };

    try {
      const activeSinceIso = new Date(Date.now() - 120 * 1000).toISOString();
      const [activeRes, rankRes, chatRes] = await Promise.all([
        fetchWithTimeout(
          `${SUPABASE_URL}/rest/v1/online_characters?updated_at=gte.${encodeURIComponent(activeSinceIso)}&select=*&limit=32`,
          { headers },
          4500
        ),
        fetchWithTimeout(
          `${SUPABASE_URL}/rest/v1/online_characters?order=cultivation_exp.desc,bosses_slain.desc&limit=12&select=*`,
          { headers },
          4500
        ),
        fetchWithTimeout(
          `${SUPABASE_URL}/rest/v1/world_chat?order=created_at.desc&limit=24&select=*`,
          { headers },
          4500
        ),
      ]);

      const myKey = this.getMyCharKey();

      if (activeRes.ok) {
        const rows = await activeRes.json();
        const seenKeys = new Set();
        this.onlineCount = Math.max(1, Array.isArray(rows) ? rows.length : 1);

        for (const r of rows ?? []) {
          if (r.char_key === myKey) continue;
          seenKeys.add(r.char_key);
          const existing = this.remotePlayers.get(r.char_key);
          if (existing) {
            existing.name = r.name;
            existing.appearance = normalizeAppearance(r.appearance);
            existing.path_name = r.path_name;
            existing.path_color = r.path_color;
            existing.realm_level = r.realm_level;
            existing.cultivation_exp = r.cultivation_exp;
            existing.bosses_slain = r.bosses_slain;
            existing.scene = r.scene;
            existing.equipped_summary = Array.isArray(r.equipped_summary) ? r.equipped_summary : [];
            existing.targetX = Number(r.x ?? 640);
            existing.targetY = Number(r.y ?? 450);
            existing.moving = Boolean(r.moving);
          } else {
            this.remotePlayers.set(r.char_key, {
              char_key: r.char_key,
              name: r.name,
              appearance: normalizeAppearance(r.appearance),
              path_name: r.path_name || "Nguyệt Đạo",
              path_color: r.path_color || "#5ef2d6",
              realm_level: r.realm_level ?? 1,
              cultivation_exp: r.cultivation_exp ?? 0,
              bosses_slain: r.bosses_slain ?? 0,
              scene: r.scene || "ta_gia_trai",
              equipped_summary: Array.isArray(r.equipped_summary) ? r.equipped_summary : [],
              x: Number(r.x ?? 640),
              y: Number(r.y ?? 450),
              targetX: Number(r.x ?? 640),
              targetY: Number(r.y ?? 450),
              facing: Number(r.facing ?? 0),
              moving: Boolean(r.moving),
              isWalking: Boolean(r.moving),
              animTime: Math.random() * 2,
            });
          }
        }
        for (const key of this.remotePlayers.keys()) {
          if (!seenKeys.has(key)) this.remotePlayers.delete(key);
        }
      }

      if (rankRes.ok) {
        const rankRows = await rankRes.json();
        if (Array.isArray(rankRows)) {
          this.leaderboard = rankRows;
        }
      }

      if (chatRes.ok) {
        const chatRows = await chatRes.json();
        if (Array.isArray(chatRows)) {
          this.messages = chatRows.slice().reverse();
        }
      }

      this._emit();
    } catch {
      // Offline graceful fallback
    } finally {
      this._busyPoll = false;
    }
  }

  async sendChat(rawMessage) {
    if (!this.account.isLoggedIn()) {
      throw new Error("Hãy đăng nhập tài khoản Online để chat Kênh Thế Giới!");
    }
    const ch = this.account.getActiveCharacter();
    const clean = String(rawMessage ?? "").trim().slice(0, 140);
    if (!clean) return;

    await this.account.ensureFreshToken();
    const res = await fetchWithTimeout(
      `${SUPABASE_URL}/rest/v1/world_chat`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${this.account.session.access_token}`,
          Prefer: "return=minimal",
        },
        body: JSON.stringify({
          user_id: this.account.session.user.id,
          sender_name: ch?.name ?? this.account.profile.dao_hieu ?? "Cổ Sư",
          path_name: ch?.path_name ?? "Tán Tu",
          path_color: ch?.path_color ?? "#4de6b0",
          kind: "chat",
          message: clean,
        }),
      },
      5000
    );
    if (!res.ok) {
      throw new Error(`Không gửi được tin nhắn (${res.status}).`);
    }
    await this.pollAll();
  }

  async broadcastFusion(charName, pathInfo, createdGu, isMutation) {
    if (!this.account.isLoggedIn()) return;
    try {
      await this.account.ensureFreshToken();
      const msg = isMutation
        ? `luyện ra DỊ CỔ [${createdGu.name}] chấn động Vạn Cổ Thành!`
        : `dung hợp Đại Thành [${createdGu.name}] (${createdGu.element})!`;
      await fetchWithTimeout(
        `${SUPABASE_URL}/rest/v1/world_chat`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${this.account.session.access_token}`,
            Prefer: "return=minimal",
          },
          body: JSON.stringify({
            user_id: this.account.session.user.id,
            sender_name: charName || "Cổ Sư",
            path_name: pathInfo?.name ?? "Tán Tu",
            path_color: pathInfo?.color ?? "#ffd86e",
            kind: "fusion",
            message: msg.slice(0, 140),
          }),
        },
        4500
      );
      this.pollAll();
    } catch {
      // Bỏ qua nếu mất mạng
    }
  }
}
