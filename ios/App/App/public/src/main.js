import { AccountManager, getRealmInfo } from "./account/AccountManager.js";
import { AssetLoader } from "./engine/AssetLoader.js";
import { GameLoop } from "./engine/GameLoop.js";
import { PixelRenderer } from "./engine/PixelRenderer.js";
import { SoundFX } from "./engine/SoundFX.js";
import { loadManifestAssets } from "./engine/SpriteSheet.js";
import { InputManager } from "./input/InputManager.js";
import { PlayerController } from "./combat/PlayerController.js";
import { WorldSimulation } from "./combat/WorldSimulation.js";
import { GuFusionModal } from "./fusion/GuFusionModal.js";
import { AccountModal } from "./ui/AccountModal.js";
import { TouchControlsHUD } from "./ui/TouchControlsHUD.js";

const canvas = document.getElementById("game-canvas");
const hudLayer = document.getElementById("hud-layer");
const modalRoot = document.getElementById("fusion-modal-root");
const accountModalRoot = document.getElementById("account-modal-root");
const overlayRoot = document.getElementById("overlay-screen");

const renderer = new PixelRenderer(canvas);
const assets = new AssetLoader();
const sfx = new SoundFX();
const account = new AccountManager();

sfx.setMuted(Boolean(account.profile.settings?.muted));

let player = new PlayerController();
let world = null;
let hud = null;
let input = null;
let modal = null;
let accountModal = null;
let isPaused = true;
let currentOverlayKind = "loading";
let autoSaveTimer = 0;

function renderAccountStatusBar() {
  const realm = getRealmInfo(account.profile.cultivation_exp);
  if (account.isLoggedIn()) {
    const syncLabel =
      account.syncStatus === "syncing"
        ? "Đang đồng bộ..."
        : account.syncStatus === "error"
          ? "Lỗi đồng bộ (đã lưu máy)"
          : "Đã đồng bộ Cloud";
    return `
      <div class="overlay-account-pill">
        <div style="text-align:left">
          <strong style="color:#4de6b0">☁️ ${account.profile.dao_hieu}</strong> · ${realm.title}<br/>
          <span style="font-size:10px;color:#968fa3">💎 ${account.profile.nguyen_thach} Nguyên Thạch · ${syncLabel}</span>
        </div>
        <button id="btn-overlay-account" type="button" class="mini-hud-btn">Hồ Sơ / Đổi Acc</button>
      </div>
    `;
  }
  return `
    <div class="overlay-account-pill">
      <div style="text-align:left">
        <strong style="color:#d6b16a">📴 Chế Độ Khách (Lưu Cục Bộ)</strong><br/>
        <span style="font-size:10px;color:#968fa3">Đăng nhập để sao lưu Cloud vĩnh viễn khi đổi máy</span>
      </div>
      <button id="btn-overlay-account" type="button" class="mini-hud-btn">🔑 Đăng Nhập / ĐK</button>
    </div>
  `;
}

function showOverlay(kind) {
  currentOverlayKind = kind;
  isPaused = true;
  overlayRoot.classList.add("is-open");

  if (kind === "loading") {
    overlayRoot.innerHTML = `
      <div class="overlay-card">
        <div class="overlay-title">LUYỆN CỔ SƯ</div>
        <div class="overlay-sub">Đang triệu hồi tài nguyên Cổ Trùng & kết nối Đạo Tịch...</div>
      </div>
    `;
    return;
  }

  const maxFloor = account.profile.highest_floor_unlocked ?? 1;
  const activeRun = account.profile.active_run;

  if (kind === "start") {
    const continueBtn = activeRun
      ? `<button id="btn-continue-run" type="button" class="overlay-btn" style="border-color:#ffd86e;background:#332612">▶️ Tiếp Tục (Tầng ${activeRun.floorNumber} · HP ${activeRun.hp}/${activeRun.maxHp})</button>`
      : "";

    overlayRoot.innerHTML = `
      <div class="overlay-card">
        <div class="overlay-title">LUYỆN CỔ SƯ</div>
        <div class="overlay-sub">
          Roguelike Cổ Phong · Vượt 3 tầng Bí Cảnh, thu thập Cổ Trùng, rèn Nhị Chuyển tại Trạm Luyện Cổ.<br/>
          <b>Trái:</b> Joystick 360° (hoặc WASD) · <b>Phải:</b> Kéo-thả ngắm chiêu (hoặc Space/J/K/L).
        </div>
        ${renderAccountStatusBar()}
        <div class="overlay-btn-row">
          ${continueBtn}
          <button type="button" class="overlay-btn" data-start-floor="1">⚔️ Tầng 1 · Rừng Chướng Khí</button>
          <button type="button" class="overlay-btn" data-start-floor="2" ${maxFloor < 2 ? "disabled" : ""}>${maxFloor < 2 ? "🔒 Tầng 2" : "💀 Tầng 2 · Mộ Địa"}</button>
          <button type="button" class="overlay-btn" data-start-floor="3" ${maxFloor < 3 ? "disabled" : ""}>${maxFloor < 3 ? "🔒 Tầng 3" : "🔥 Tầng 3 · Cổ Quật"}</button>
        </div>
      </div>
    `;
  } else if (kind === "victory") {
    overlayRoot.innerHTML = `
      <div class="overlay-card">
        <div class="overlay-title" style="color:#4de6b0">ĐẠI THÀNH CỔ TÔN!</div>
        <div class="overlay-sub">
          Ngươi đã phá nát Vạn Cổ Tà Lô, chinh phục Tam Tầng Bí Cảnh.<br/>
          Quái đã trảm trận này: ${player.kills} · Cổ Phương đã mở: ${account.profile.unlocked_recipes.length}/3.
        </div>
        ${renderAccountStatusBar()}
        <div class="overlay-btn-row">
          <button type="button" class="overlay-btn" data-start-floor="1">🔄 Luân Hồi Chinh Phục Lại</button>
        </div>
      </div>
    `;
  } else if (kind === "gameover") {
    overlayRoot.innerHTML = `
      <div class="overlay-card">
        <div class="overlay-title" style="color:#ff3855">ĐẠO TÂM TAN VỠ</div>
        <div class="overlay-sub">
          Huyết Khí đã cạn tại ${world.getFloorDef().name}.<br/>
          Tu Vi, Nguyên Thạch & Cổ Phương (${account.profile.unlocked_recipes.length}/3) đã được bảo toàn trong tài khoản!
        </div>
        ${renderAccountStatusBar()}
        <div class="overlay-btn-row">
          <button type="button" class="overlay-btn" data-start-floor="1">🔄 Tái Nhập Bí Cảnh</button>
        </div>
      </div>
    `;
  }

  overlayRoot.querySelector("#btn-overlay-account")?.addEventListener("click", () => {
    accountModal?.open();
  });

  overlayRoot.querySelector("#btn-continue-run")?.addEventListener("click", () => {
    sfx.unlock();
    resumeActiveRun();
  });

  overlayRoot.querySelectorAll("[data-start-floor]").forEach((btn) => {
    btn.addEventListener("click", () => {
      sfx.unlock();
      const startFloor = Number(btn.dataset.startFloor) || 1;
      player = new PlayerController();
      player.unlockedRecipes = new Set(account.profile.unlocked_recipes ?? []);
      account.recordRunStarted();
      startRun(startFloor, null);
    });
  });
}

function resumeActiveRun() {
  const snap = account.profile.active_run;
  if (!snap) return;
  player = new PlayerController();
  player.restoreFromSnapshot(snap, account.profile.unlocked_recipes ?? []);
  startRun(snap.floorNumber ?? 1, snap);
}

function startRun(floorNum, restoreSnapshot = null) {
  overlayRoot.classList.remove("is-open");
  currentOverlayKind = "playing";

  world = new WorldSimulation({
    player,
    assets,
    sfx,
    account,
    onStateChange: () => {
      if (world.phase === "victory") showOverlay("victory");
      else if (world.phase === "gameover") showOverlay("gameover");
      hud?.syncState(player, world);
    },
  });

  if (restoreSnapshot) {
    world.restoreFromSnapshot(restoreSnapshot);
  } else {
    world.loadFloor(floorNum);
    account.saveActiveRunSnapshot(player, world);
  }

  modal = new GuFusionModal({
    rootEl: modalRoot,
    player,
    world,
    sfx,
    account,
    onClose: () => {
      isPaused = false;
      hud?.syncState(player, world);
    },
    onEquipmentChanged: () => {
      hud?.refreshSlots(player);
      hud?.syncState(player, world);
    },
  });

  hud.refreshSlots(player);
  hud.syncState(player, world);
  hud.syncAccountBadge(account);
  isPaused = false;
}

function initUI() {
  hud = new TouchControlsHUD({
    hudRoot: hudLayer,
    slots: {
      passive: player.getEquippedGu("passive"),
      skill1: { ...player.getEquippedGu("skill1"), slotType: "Chủ Động 1" },
      skill2: { ...player.getEquippedGu("skill2"), slotType: "Chủ Động 2" },
      move: { ...player.getEquippedGu("move"), slotType: "Di Chuyển" },
      ult: { ...player.getEquippedGu("ult"), slotType: "Sát Chiêu" },
    },
    getDefaultAngle: () => (input ? input.getAimAngle() : 0),
    onCast: (payload) => {
      if (!isPaused && world) {
        world.castSkill(payload);
      }
    },
    onCancel: () => {},
    onOpenBag: () => {
      if (!world || player.isDead) return;
      isPaused = true;
      modal?.open("aperture");
    },
    onContextAction: () => {
      if (!world) return;
      if (world.phase === "cauldron") {
        isPaused = true;
        modal?.open("fusion");
      } else if (world.phase === "floor_clear") {
        world.goToNextFloor();
      }
    },
    onSecondaryAction: () => {
      if (!world) return;
      if (world.phase === "cauldron") {
        world.summonBossNow();
      }
    },
    onToggleMute: (btn) => {
      sfx.setMuted(!sfx.muted);
      account.setMuted(sfx.muted);
      btn.textContent = sfx.muted ? "🔇 Tắt" : "🔊 Âm";
    },
    onOpenAccount: () => {
      isPaused = true;
      accountModal?.open();
    },
  });

  accountModal = new AccountModal({
    rootEl: accountModalRoot,
    accountManager: account,
    sfx,
    onClose: () => {
      if (currentOverlayKind === "playing" && !modalRoot.classList.contains("is-open")) {
        isPaused = false;
      } else if (currentOverlayKind !== "playing") {
        showOverlay(currentOverlayKind);
      }
      hud?.syncAccountBadge(account);
    },
  });

  account.onChange(() => {
    hud?.syncAccountBadge(account);
    if (hud?.muteBtn) {
      const m = Boolean(account.profile.settings?.muted);
      sfx.setMuted(m);
      hud.muteBtn.textContent = m ? "🔇 Tắt" : "🔊 Âm";
    }
    if (currentOverlayKind !== "playing" && !accountModalRoot.classList.contains("is-open")) {
      showOverlay(currentOverlayKind);
    }
  });

  input = new InputManager({
    joystick: hud.joystick,
    skillPad: hud.skillPad,
    renderer,
    getOriginGamePos: () => ({
      x: player.x - (world ? world.camera.x : 0),
      y: player.y - 6 - (world ? world.camera.y : 0),
    }),
  });
}

async function boot() {
  showOverlay("loading");
  initUI();

  if (account.isLoggedIn()) {
    await account.pullFromCloud();
  }

  await loadManifestAssets(assets, "./assets/manifest.json");
  showOverlay("start");

  // Tự lưu khi chuyển app xuống nền trên iPhone hoặc ẩn tab
  const saveBeforeHide = () => {
    if (world && currentOverlayKind === "playing") {
      account.saveActiveRunSnapshot(player, world);
      account.syncCloud();
    }
  };
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") saveBeforeHide();
  });
  window.addEventListener("pagehide", saveBeforeHide);

  const loop = new GameLoop({
    onUpdate: (dt) => {
      if (!isPaused && world) {
        account.tickPlaytime(dt);
        world.update(dt, input);
        hud.syncState(player, world);

        autoSaveTimer += dt;
        if (autoSaveTimer >= 20) {
          autoSaveTimer = 0;
          account.saveActiveRunSnapshot(player, world);
          account.scheduleSync(500);
        }
      }
    },
    onRender: () => {
      if (world) {
        world.render(renderer, input);
      } else {
        renderer.clear("#0d0c12");
      }
    },
  });

  loop.start();
}

boot();
