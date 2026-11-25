import { AccountManager } from "./account/AccountManager.js";
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
import { GateScreens } from "./ui/GateScreens.js";
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
let gateScreens = null;
let isPaused = true;
let inGameplay = false;
let autoSaveTimer = 0;

function launchCharacterRun({ slotIndex, resumeRun = false, floorNumber = 1 }) {
  const charData = account.selectCharacter(slotIndex);
  if (!charData) return;

  if (resumeRun && charData.active_run) {
    const snap = charData.active_run;
    player = new PlayerController(charData);
    player.restoreFromSnapshot(snap, charData.unlocked_recipes ?? [], charData);
    startRun(snap.floorNumber ?? 1, snap);
    return;
  }

  player = new PlayerController(charData);
  player.unlockedRecipes = new Set(charData.unlocked_recipes ?? []);
  account.recordRunStarted();
  startRun(floorNumber, null);
}

function startRun(floorNum, restoreSnapshot = null) {
  overlayRoot.classList.remove("is-open");
  inGameplay = true;

  world = new WorldSimulation({
    player,
    assets,
    sfx,
    account,
    onStateChange: () => {
      if (world.phase === "victory") {
        inGameplay = false;
        isPaused = true;
        gateScreens?.openResult("victory", {
          kills: player.kills,
          floorName: world.getFloorDef().name,
        });
      } else if (world.phase === "gameover") {
        inGameplay = false;
        isPaused = true;
        gateScreens?.openResult("gameover", {
          kills: player.kills,
          floorName: world.getFloorDef().name,
        });
      }
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

function switchToCharacterSelect() {
  if (world && inGameplay) {
    account.saveActiveRunSnapshot(player, world);
    account.syncCloud();
  }
  modalRoot.classList.remove("is-open");
  accountModalRoot.classList.remove("is-open");
  inGameplay = false;
  isPaused = true;
  gateScreens?.openCharSelect();
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
      if (!world || player.isDead || !inGameplay) return;
      isPaused = true;
      modal?.open("aperture");
    },
    onContextAction: () => {
      if (!world || !inGameplay) return;
      if (world.phase === "cauldron") {
        isPaused = true;
        modal?.open("fusion");
      } else if (world.phase === "floor_clear") {
        world.goToNextFloor();
      }
    },
    onSecondaryAction: () => {
      if (!world || !inGameplay) return;
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
      switchToCharacterSelect();
    },
  });

  accountModal = new AccountModal({
    rootEl: accountModalRoot,
    accountManager: account,
    sfx,
    onClose: () => {
      if (!inGameplay) {
        gateScreens?.render();
      } else if (!modalRoot.classList.contains("is-open")) {
        isPaused = false;
      }
      hud?.syncAccountBadge(account);
    },
  });

  gateScreens = new GateScreens({
    overlayRoot,
    account,
    assets,
    sfx,
    onEnterGame: (opts) => launchCharacterRun(opts),
    onOpenAccountModal: () => accountModal?.open(),
  });

  account.onChange(() => {
    hud?.syncAccountBadge(account);
    if (hud?.muteBtn) {
      const m = Boolean(account.profile.settings?.muted);
      sfx.setMuted(m);
      hud.muteBtn.textContent = m ? "🔇 Tắt" : "🔊 Âm";
    }
    if (!inGameplay && overlayRoot.classList.contains("is-open") && !accountModalRoot.classList.contains("is-open")) {
      if (gateScreens?.screen === "char_select") {
        gateScreens.render();
      }
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

function boot() {
  initUI();
  // Hiển thị ngay cổng Login / Chọn Nhân Vật (không bao giờ treo chờ mạng hoặc PNG!)
  gateScreens.openInitialScreen();

  // Tải sprite PNG dưới nền; tải xong tự động vẽ lại preview nhân vật trên bệ đá
  loadManifestAssets(assets)
    .then(() => {
      if (!inGameplay && gateScreens) {
        gateScreens.render();
      }
    })
    .catch((err) => {
      console.warn("[assets] Background sprite load warning:", err);
    });

  // Đồng bộ Cloud dưới nền nếu đã có phiên đăng nhập từ lần trước
  if (account.isLoggedIn()) {
    account.pullFromCloud().catch(() => {});
  }

  const saveBeforeHide = () => {
    if (world && inGameplay) {
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
      if (!isPaused && world && inGameplay) {
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
      if (world && inGameplay) {
        world.render(renderer, input);
      } else {
        renderer.clear("#0d0c12");
      }
    },
  });

  loop.start();
}

boot();
