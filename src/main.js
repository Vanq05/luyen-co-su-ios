import { AssetLoader } from "./engine/AssetLoader.js";
import { GameLoop } from "./engine/GameLoop.js";
import { PixelRenderer } from "./engine/PixelRenderer.js";
import { SoundFX } from "./engine/SoundFX.js";
import { loadManifestAssets } from "./engine/SpriteSheet.js";
import { InputManager } from "./input/InputManager.js";
import { PlayerController } from "./combat/PlayerController.js";
import { WorldSimulation } from "./combat/WorldSimulation.js";
import { GuFusionModal } from "./fusion/GuFusionModal.js";
import { TouchControlsHUD } from "./ui/TouchControlsHUD.js";

const canvas = document.getElementById("game-canvas");
const hudLayer = document.getElementById("hud-layer");
const modalRoot = document.getElementById("fusion-modal-root");
const overlayRoot = document.getElementById("overlay-screen");

const renderer = new PixelRenderer(canvas);
const assets = new AssetLoader();
const sfx = new SoundFX();

let player = new PlayerController();
let world = null;
let hud = null;
let input = null;
let modal = null;
let isPaused = true;

function showOverlay(kind) {
  isPaused = true;
  overlayRoot.classList.add("is-open");

  if (kind === "loading") {
    overlayRoot.innerHTML = `
      <div class="overlay-card">
        <div class="overlay-title">LUYỆN CỔ SƯ</div>
        <div class="overlay-sub">Đang triệu hồi tài nguyên Cổ Trùng & Bí Cảnh...</div>
      </div>
    `;
    return;
  }

  if (kind === "start") {
    overlayRoot.innerHTML = `
      <div class="overlay-card">
        <div class="overlay-title">LUYỆN CỔ SƯ</div>
        <div class="overlay-sub">
          Roguelike Cổ Phong · Vượt 3 tầng Bí Cảnh, thu thập Cổ Trùng, rèn Nhị Chuyển tại Trạm Luyện Cổ.<br/>
          <b>Trái:</b> Joystick 360° (hoặc WASD) · <b>Phải:</b> Kéo-thả ngắm chiêu (hoặc Space/J/K/L).
        </div>
        <div class="overlay-btn-row">
          <button type="button" class="overlay-btn" data-start-floor="1">⚔️ Nhập Tầng 1 · Rừng Chướng Khí</button>
          <button type="button" class="overlay-btn" data-start-floor="2">💀 Thử Tầng 2</button>
          <button type="button" class="overlay-btn" data-start-floor="3">🔥 Thử Tầng 3</button>
        </div>
      </div>
    `;
  } else if (kind === "victory") {
    overlayRoot.innerHTML = `
      <div class="overlay-card">
        <div class="overlay-title" style="color:#4de6b0">ĐẠI THÀNH CỔ TÔN!</div>
        <div class="overlay-sub">
          Ngươi đã phá nát Vạn Cổ Tà Lô, chinh phục Tam Tầng Bí Cảnh.<br/>
          Số quái đã trảm: ${player.kills} · Cổ Phương đã mở: ${player.unlockedRecipes.size}/3.
        </div>
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
          Cổ Phương đã ngộ (${player.unlockedRecipes.size}/3) sẽ được lưu truyền sang kiếp sau!
        </div>
        <div class="overlay-btn-row">
          <button type="button" class="overlay-btn" data-start-floor="1">🔄 Tái Nhập Bí Cảnh</button>
        </div>
      </div>
    `;
  }

  overlayRoot.querySelectorAll("[data-start-floor]").forEach((btn) => {
    btn.addEventListener("click", () => {
      sfx.unlock();
      const startFloor = Number(btn.dataset.startFloor) || 1;
      const savedRecipes = new Set(player.unlockedRecipes);
      player = new PlayerController();
      player.unlockedRecipes = savedRecipes;
      startRun(startFloor);
    });
  });
}

function startRun(floorNum) {
  overlayRoot.classList.remove("is-open");
  world = new WorldSimulation({
    player,
    assets,
    sfx,
    onStateChange: () => {
      if (world.phase === "victory") showOverlay("victory");
      else if (world.phase === "gameover") showOverlay("gameover");
      hud?.syncState(player, world);
    },
  });
  world.loadFloor(floorNum);

  modal = new GuFusionModal({
    rootEl: modalRoot,
    player,
    world,
    sfx,
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
      btn.textContent = sfx.muted ? "🔇 Tắt" : "🔊 Âm";
    },
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
  await loadManifestAssets(assets, "./assets/manifest.json");
  showOverlay("start");

  const loop = new GameLoop({
    onUpdate: (dt) => {
      if (!isPaused && world) {
        world.update(dt, input);
        hud.syncState(player, world);
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
