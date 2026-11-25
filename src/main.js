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
import { OnlineHubClient } from "./online/OnlineHubClient.js";
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
const onlineHub = new OnlineHubClient({ account });

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

function mountWorldForCharacter(floorNum, restoreSnapshot = null) {
  gateScreens?.close();
  inGameplay = true;

  world = new WorldSimulation({
    player,
    assets,
    sfx,
    account,
    onlineHub,
    onStateChange: (activeWorld) => {
      const w = activeWorld ?? world;
      if (!w) return;
      if (w.phase === "victory") {
        account.persistCharacterLoadout(player);
        account.clearActiveRunSnapshot(true);
        inGameplay = false;
        isPaused = true;
        gateScreens?.openResult("victory", {
          kills: player.kills,
          floorName: w.getFloorDef().name,
        });
      } else if (w.phase === "gameover") {
        account.persistCharacterLoadout(player);
        account.clearActiveRunSnapshot(true);
        inGameplay = false;
        isPaused = true;
        gateScreens?.openResult("gameover", {
          kills: player.kills,
          floorName: w.getFloorDef().name,
        });
      }
      hud?.syncAccountBadge(account, w);
      hud?.syncState(player, w, onlineHub);
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
    onlineHub,
    onClose: () => {
      isPaused = false;
      hud?.syncState(player, world, onlineHub);
    },
    onEquipmentChanged: () => {
      account.persistCharacterLoadout(player);
      hud?.refreshSlots(player);
      hud?.syncState(player, world, onlineHub);
      onlineHub.pushPresence(player, world);
    },
  });

  hud.refreshSlots(player);
  hud.syncAccountBadge(account, world);
  hud.syncState(player, world, onlineHub);
  isPaused = false;

  onlineHub.pushPresence(player, world);
  onlineHub.pollAll();
}

function enterVanCoThanh(slotIndex) {
  const charData = account.selectCharacter(slotIndex);
  if (!charData) return;
  player = new PlayerController(charData);
  account.persistCharacterLoadout(player);
  mountWorldForCharacter(0, null);
}

function enterDungeonFloor(floorNum) {
  const charData = account.getActiveCharacter();
  if (!charData) return;
  // Giữ nguyên toàn bộ Cổ Nang & Đạo Lộ đã luyện của nhân vật, nạp đầy HP/MP trước khi vào Bí Cảnh
  account.persistCharacterLoadout(player);
  player.isDead = false;
  player.corruption = 0;
  player.tauHoaTimer = 0;
  player.recalculatePathStats(true);
  account.recordRunStarted();
  mountWorldForCharacter(floorNum, null);
}

function resumeDungeonRun(slotIndex) {
  const charData = account.selectCharacter(slotIndex);
  if (!charData || !charData.active_run) {
    enterVanCoThanh(slotIndex);
    return;
  }
  const snap = charData.active_run;
  player = new PlayerController(charData);
  player.restoreFromSnapshot(snap, charData.unlocked_recipes ?? [], charData);
  mountWorldForCharacter(snap.floorNumber ?? 1, snap);
}

function handleTopRightAction() {
  if (world && inGameplay && world.floorNumber > 0) {
    // Đang ở trong Bí Cảnh -> Rút lui an toàn về Vạn Cổ Thành giữ nguyên thu hoạch!
    account.persistCharacterLoadout(player);
    account.clearActiveRunSnapshot(true);
    modalRoot.classList.remove("is-open");
    player.isDead = false;
    player.recalculatePathStats(true);
    mountWorldForCharacter(0, null);
    return;
  }

  // Đang ở Vạn Cổ Thành -> Lưu và quay ra bệ 3 nhân vật
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
      if (world.phase === "town") {
        const act = hud.ctxBtn?.dataset.townAct || "fusion";
        isPaused = true;
        if (act === "mirror") {
          gateScreens?.openMirror(account.getActiveCharacter());
        } else if (act === "stele") {
          gateScreens?.openLeaderboard();
        } else {
          modal?.open("fusion");
        }
      } else if (world.phase === "cauldron") {
        isPaused = true;
        modal?.open("fusion");
      } else if (world.phase === "floor_clear") {
        world.goToNextFloor();
      }
    },
    onSecondaryAction: () => {
      if (!world || !inGameplay) return;
      if (world.phase === "town") {
        isPaused = true;
        gateScreens?.openDungeonSelect();
      } else if (world.phase === "cauldron") {
        world.summonBossNow();
      }
    },
    onToggleMute: (btn) => {
      sfx.setMuted(!sfx.muted);
      account.setMuted(sfx.muted);
      btn.textContent = sfx.muted ? "🔇 Tắt" : "🔊 Âm";
    },
    onOpenAccount: () => {
      handleTopRightAction();
    },
    onSendChat: async (msg) => {
      await onlineHub.sendChat(msg);
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
      hud?.syncAccountBadge(account, world);
    },
  });

  gateScreens = new GateScreens({
    overlayRoot,
    account,
    onlineHub,
    sfx,
    onEnterTown: (slotIdx) => enterVanCoThanh(slotIdx),
    onEnterDungeon: (floorNum) => enterDungeonFloor(floorNum),
    onResumeRun: (slotIdx) => resumeDungeonRun(slotIdx),
    onAppearanceUpdated: (updatedChar) => {
      if (updatedChar) {
        player.characterName = updatedChar.name;
        player.setAppearance(updatedChar.appearance);
        onlineHub.pushPresence(player, world);
      }
      isPaused = false;
      hud?.syncAccountBadge(account, world);
    },
    onCloseToWorld: () => {
      isPaused = false;
    },
    onOpenAccountModal: () => accountModal?.open(),
  });

  onlineHub.onChange(() => {
    hud?.syncOnlineFeed(onlineHub);
    if (world && inGameplay && world.phase === "town") {
      hud?.syncState(player, world, onlineHub);
    }
    if (!inGameplay && gateScreens?.screen === "leaderboard") {
      gateScreens.render();
    }
  });

  account.onChange(() => {
    hud?.syncAccountBadge(account, world);
    if (hud?.muteBtn) {
      const m = Boolean(account.profile.settings?.muted);
      sfx.setMuted(m);
      hud.muteBtn.textContent = m ? "🔇 Tắt" : "🔊 Âm";
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
  gateScreens.openInitialScreen();

  loadManifestAssets(assets).catch((err) => {
    console.warn("[assets] Background sprite load warning:", err);
  });

  if (account.isLoggedIn()) {
    account.pullFromCloud().then(() => {
      if (!inGameplay && gateScreens?.screen === "char_select") {
        gateScreens.render();
      }
    });
  }
  onlineHub.pollAll();

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
      if (world && inGameplay) {
        onlineHub.tick(dt, { player, world });
      }
      if (!isPaused && world && inGameplay) {
        account.tickPlaytime(dt);
        world.update(dt, input);
        hud.syncState(player, world, onlineHub);

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
