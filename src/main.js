import { AccountManager } from "./account/AccountManager.js";
import { PlayerController } from "./combat/PlayerController.js";
import { WorldSimulation } from "./combat/WorldSimulation.js";
import { STARTER_GU_HABITATS } from "./data/QuestsAndEvents.js";
import { AssetLoader } from "./engine/AssetLoader.js";
import { GameLoop } from "./engine/GameLoop.js";
import { PixelRenderer } from "./engine/PixelRenderer.js";
import { SoundFX } from "./engine/SoundFX.js";
import { loadManifestAssets } from "./engine/SpriteSheet.js";
import { InputManager } from "./input/InputManager.js";
import { OnlineHubClient } from "./online/OnlineHubClient.js";
import { AccountModal } from "./ui/AccountModal.js";
import { CotienloHUD } from "./ui/CotienloHUD.js";
import { GameModals } from "./ui/GameModals.js";
import { GateScreens } from "./ui/GateScreens.js";
import { MinigameOverlay } from "./ui/MinigameOverlay.js";

const canvas = document.getElementById("game-canvas");
const hudLayer = document.getElementById("hud-layer");
const minigameRoot = document.getElementById("minigame-root");
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
let modals = null;
let minigame = null;
let accountModal = null;
let gateScreens = null;
let inGameplay = false;
let autoSaveTimer = 0;

function enterWorldForCharacter(slotIndex) {
  const charData = account.selectCharacter(slotIndex);
  if (!charData) return;

  gateScreens?.close();
  player = new PlayerController(charData);
  inGameplay = true;

  world = new WorldSimulation({
    player,
    assets,
    sfx,
    account,
    onlineHub,
    onStateChange: () => {
      if (world && hud) hud.syncState(player, world, onlineHub);
    },
    onNpcTalk: (npc) => {
      hud?.pushSystemMessage(npc.name, npc.dialog, "sys");
      world?.addFloatingText(npc.x, npc.y - 34, npc.name, "#5fbf8a");
      if (npc.action === "start_dieu_hoi") world.startDieuHoiEvent();
      else if (npc.action === "open_char") modals?.open("char");
      else if (npc.action === "open_cultivate") modals?.open("cultivate");
      else if (npc.action === "open_quests") modals?.open("quests", "story");
      else if (npc.action === "open_gu") modals?.open("gu", "paths");
      else if (npc.action === "open_gamble") modals?.open("bag", "gamble");
      else if (npc.action === "open_shop") modals?.open("bag", "shop");
      else if (npc.action === "open_dungeons") modals?.open("world", "dungeons");
      else if (npc.action === "open_world") modals?.open("world", "daily");
      else if (npc.action === "open_arena") world.startShadowArena(onlineHub.leaderboard?.[0]);
      else if (npc.action === "open_clan_arena") modals?.open("clan_arena");
      else if (npc.action === "revive_gu") {
        for (const g of player.guBag) g.hunger = 100;
        hud?.pushSystemMessage("Cửu Bà", "Đã hồi phục độ no 100% cho toàn bộ Cổ trùng!", "sys");
      }
      hud?.syncState(player, world, onlineHub);
    },
    onQuestCompleted: (doneQ, nextQ) => {
      const ch = doneQ.chapter ? `Chương ${doneQ.chapter}` : "Chính tuyến";
      hud?.pushSystemMessage("Chính Tuyến", `Hoàn thành [${ch}: ${doneQ.title}] (+${doneQ.rewards?.stones ?? 0} Nguyên Thạch, +${doneQ.rewards?.exp ?? 0} Tu Vi)!`, "sys");
      if (nextQ) {
        hud?.pushSystemMessage("Chương Mới", `Mở khóa Chương ${nextQ.chapter}: ${nextQ.title} — ${nextQ.objectiveText}`, "sys");
        if (nextQ.act !== doneQ.act) {
          hud?.showCeremonyBanner(
            `MỞ KHÓA HỒI ${nextQ.act}`,
            `Chương ${nextQ.chapter}: ${nextQ.title}`,
            `${nextQ.loreQuote || ""} ${nextQ.objectiveText}`,
            "#ffd257"
          );
        }
      } else {
        hud?.showCeremonyBanner(
          "ĐỘC BỘ NGŨ VỰC · THÔNG TUYẾN!",
          "Hoàn Tất 18/18 Chương Chính Tuyến Cổ Chân Nhân",
          "Ngươi đã trảm Vạn Thủ Bàn Long, danh chấn Bắc Nguyên & Ngũ Vực! Tiếp tục luyện Cổ Ngũ Chuyển, chinh phục Tháp Thí Luyện & Lôi Đài!",
          "#5ef2d6"
        );
      }
      account.persistPlayerState(player);
      hud?.syncState(player, world, onlineHub);
    },
    onStartMinigame: (kind, opts) => {
      minigame?.open(kind, opts);
    },
    onOpenModal: (panel, subTab) => {
      modals?.open(panel, subTab);
    },
    onAwakenCeremony: (ev) => {
      if (ev.type === "awakened") {
        const apt = ev.aptitudeInfo;
        const info = ev.evalInfo || {};
        const pctTxt = info.seaPct ?? player.apertureSeaPct ?? apt.defaultSeaPct ?? 48;
        const stepsTxt = info.steps ?? player.awakeningSteps ?? 27;
        hud?.pushSystemMessage(
          "Khai Khiếu Đại Điển",
          `Bước được ${stepsTxt}/45 bước Hy Vọng Cổ! Đạt Tư chất: ${apt.name} (${pctTxt}% Chân Nguyên Hải).`,
          "sys"
        );
        hud?.showCeremonyBanner(
          "KHAI KHIẾU ĐẠI ĐIỂN THÀNH CÔNG",
          `${apt.name} · ${pctTxt}% Chân Nguyên Hải`,
          `Vượt ${stepsTxt}/45 bước Đom Đóm Hy Vọng Cổ! Hãy chọn 1 trong 5 Cổ Trùng Bản Mệnh khởi đầu bên dưới...`,
          apt.color
        );
        hud?.openStarterGuModal(player);
      } else if (ev.type === "ritual_failed") {
        hud?.showRitualFailPrompt(ev.evalInfo);
      } else if (ev.type === "open_choose_gu") {
        hud?.openStarterGuModal(player);
      } else if (ev.type === "gu_refined") {
        const gName = ev.worm?.name ?? "Cổ Trùng";
        hud?.pushSystemMessage("Luyện Cổ", ev.boundAsVital ? `Luyện hóa thành công Cổ Bản Mệnh [${gName}]!` : `Thu phục thành công [${gName}]!`, "sys");
        if (ev.boundAsVital) {
          hud?.showCeremonyBanner(
            "LUYỆN HÓA CỔ BẢN MỆNH",
            gName,
            "Đã tự động gắn vào Ô Cổ Bản Mệnh (RMB)! Hãy rèn thân hoặc sang Khê Cốc / Vụ Lĩnh Hạ!",
            ev.worm?.color || "#5ef2d6"
          );
        }
      }
      account.persistPlayerState(player);
    },
  });

  modals = new GameModals({
    rootEl: modalRoot,
    player,
    world,
    account,
    onlineHub,
    sfx,
    minigame,
    onClose: () => hud?.syncState(player, world, onlineHub),
    onStateChanged: () => {
      account.persistPlayerState(player);
      hud?.syncState(player, world, onlineHub);
      onlineHub.pushPresence(player, world);
    },
    onOpenMirror: () => gateScreens?.openMirror(account.getActiveCharacter()),
    onOpenAccountModal: () => accountModal?.open(),
    getUiMode: () => hud?.getUiMode?.() || "auto",
    onCycleUiMode: () => hud?.cycleUiMode?.(),
    getHudLayout: () => hud?.getHudLayout?.(),
    onUpdateHudLayout: (patch) => hud?.updateHudLayout?.(patch),
    onSwapHudHands: () => hud?.swapHudHands?.(),
    onResetHudLayout: () => hud?.resetHudLayout?.(),
    onOpenHudEditor: () => hud?.openHudEditor?.(),
    onSwitchCharacter: () => {
      account.persistPlayerState(player);
      account.syncCloud();
      inGameplay = false;
      gateScreens?.openCharSelect();
    },
  });

  account.persistPlayerState(player);
  hud?.syncState(player, world, onlineHub);
  onlineHub.pushPresence(player, world);
  onlineHub.pollAll();
}

function initUI() {
  minigame = new MinigameOverlay(minigameRoot, sfx);

  hud = new CotienloHUD({
    hudRoot: hudLayer,
    getDefaultAngle: () => (input ? input.getAimAngle() : player.facing),
    worldToClient: (wx, wy, cam) => renderer.worldToClient(wx, wy, cam),
    onBasicAttack: () => world?.performBasicAttack(),
    onCast: (payload) => world?.castSkill(payload),
    onUseQuickItem: (idx) => world?.useQuickItem(idx),
    onAbsorbStart: () => {
      if (world && !player.isDead) {
        player.isAbsorbingStone = true;
        player.isMeditating = false;
      }
    },
    onAbsorbEnd: () => {
      player.isAbsorbingStone = false;
    },
    onInteract: () => world?.interactNearest(),
    onCycleTarget: () => world?.cycleTarget(),
    onTriggerSurge: () => world?.triggerWillpowerSurge(),
    onRitualChoice: (action) => {
      if (!world) return;
      if (action === "retry") world.retryAwakeningRitual();
      else if (action === "mortal") world.confirmAwakeningAtCurrentStep(true);
    },
    onQuestClick: (q, opts) => world?.startAutoPathToQuest(q, opts),
    onOpenPanel: (panel, subTab) => modals?.open(panel, subTab),
    onStartEvent: (ev) => {
      if (!world) return;
      if (ev === "tower") world.startTrialTower(1);
      else if (ev === "arena") world.startShadowArena(onlineHub.leaderboard?.[0]);
      else if (ev === "dieu_hoi") world.startDieuHoiEvent();
      else if (ev === "ban_long") world.loadMap("vuc_van_thu");
    },
    onExitInstance: () => world?.exitInstance(),
    onTogglePvp: () => {
      const order = ["peace", "self_defense", "flag"];
      player.pvpFlag = order[(order.indexOf(player.pvpFlag) + 1) % order.length];
      hud?.syncState(player, world, onlineHub);
    },
    onToggleAutoCombat: () => {
      if (!world || player.isDead) return;
      player.autoCombat = !player.autoCombat;
      world.addFloatingText(player.x, player.y - 26, player.autoCombat ? "Bật Tự Đánh Bãi Thú" : "Tắt Tự Đánh", player.autoCombat ? "#5fbf8a" : "#b8ad94");
      hud?.syncState(player, world, onlineHub);
    },
    onRespawn: (where) => {
      world?.respawnPlayer(where);
    },
    onPickTargetGu: (buildId) => {
      if (!world) return;
      const res = player.chooseStarterVitalBuild(buildId);
      if (!res) return;
      world.loadMap("ta_gia_trai", { x: 360, y: 368 });
      world._advanceQuest("choose_target_gu", {});
      account.persistPlayerState(player);
      hud?.pushSystemMessage(
        "Cổ Bản Mệnh",
        `Đã luyện hóa [${res.vitalWorm.name}] (${res.build.archetype})${res.bonusWorm ? ` + [${res.bonusWorm.name}]` : ""}! Bấm K mở Buồng Tu Luyện, J mở Nhiệm Vụ Đường.`,
        "sys"
      );
      hud?.showCeremonyBanner(
        "CỔ BẢN MỆNH NHẬP KHIẾU",
        `${res.vitalWorm.name} · ${res.build.archetype}`,
        "Đã bước ra khỏi Hang Ngầm lên Cổ Nguyệt Sơn Trại! Gắn Cổ (RMB / phím 1), mở K Tĩnh Tọa hoặc J nhận Nhiệm Vụ!",
        res.vitalWorm.color || "#5ef2d6"
      );
      hud?.syncState(player, world, onlineHub);
    },
    onMinimapClick: (wx, wy) => {
      if (!world || player.isDead) return;
      world.navigateTo(wx, wy, "move");
      world.addFloatingText(player.x, player.y - 24, `Đi tới (${wx}, ${wy})`, "#5ef2d6");
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
      if (!inGameplay) gateScreens?.render();
    },
  });

  gateScreens = new GateScreens({
    overlayRoot,
    account,
    onlineHub,
    sfx,
    onEnterWorld: (slotIdx) => enterWorldForCharacter(slotIdx),
    onAppearanceUpdated: (updatedChar) => {
      if (updatedChar) {
        player.characterName = updatedChar.name;
        player.setAppearance(updatedChar.appearance);
        onlineHub.pushPresence(player, world);
      }
      hud?.syncState(player, world, onlineHub);
    },
    onCloseToWorld: () => {},
    onOpenAccountModal: () => accountModal?.open(),
  });

  onlineHub.onChange(() => {
    hud?.syncOnlineFeed(onlineHub);
  });

  input = new InputManager({
    joystick: hud.joystick,
    skillPad: hud.skillPad,
    renderer,
    getOriginGamePos: () => ({
      x: player.x - (world ? world.camera.x : 0),
      y: player.y - 6 - (world ? world.camera.y : 0),
    }),
    getCamera: () => (world ? world.camera : { x: 0, y: 0 }),
    callbacks: {
      onCanvasClick: (wx, wy, isRight) => {
        if (inGameplay && !modals?.isOpen() && !minigame?.active) {
          world?.handleWorldClick(wx, wy, isRight);
        }
      },
      onCast: (payload) => {
        if (!inGameplay || modals?.isOpen()) return;
        if (payload?.slotId === "dash" && world?.currentMapId === "hang_ngam_khai_khieu" && !player.hasAwakened) {
          world.triggerWillpowerSurge();
          return;
        }
        world?.castSkill(payload);
      },
      onQuickItem: (idx) => {
        if (inGameplay && !modals?.isOpen()) world?.useQuickItem(idx);
      },
      onAbsorbStart: () => {
        if (inGameplay && !minigame?.active) {
          player.isAbsorbingStone = true;
          player.isMeditating = false;
        }
      },
      onAbsorbEnd: () => {
        player.isAbsorbingStone = false;
      },
      onInteract: () => {
        if (inGameplay && !modals?.isOpen()) world?.interactNearest();
      },
      onToggleMeditate: () => {
        if (inGameplay && !modals?.isOpen()) {
          player.isMeditating = !player.isMeditating;
          if (player.isMeditating) world?.addFloatingText(player.x, player.y - 26, "Ngồi Thiền Bế Quan...", "#5fbf8a");
        }
      },
      onToggleAutoCombat: () => {
        if (inGameplay && !modals?.isOpen() && !player.isDead) {
          player.autoCombat = !player.autoCombat;
          world?.addFloatingText(player.x, player.y - 26, player.autoCombat ? "Bật Tự Đánh Bãi Thú" : "Tắt Tự Đánh", player.autoCombat ? "#5fbf8a" : "#b8ad94");
        }
      },
      onCycleTarget: () => {
        if (inGameplay) world?.cycleTarget();
      },
      onOpenPanel: (panel) => {
        if (inGameplay) modals?.open(panel);
      },
      onSwitchAperture: () => {
        if (inGameplay && player.switchAperture()) {
          world?.addFloatingText(player.x, player.y - 28, `Chuyển Không Khiếu #${player.activeAperture + 1}`, "#d9b25f");
          hud?.syncState(player, world, onlineHub);
        } else if (inGameplay) {
          world?.addFloatingText(player.x, player.y - 26, "Cần Ngũ Chuyển để mở Đệ Nhị Không Khiếu!", "#b8ad94");
        }
      },
      onFocusChat: () => {
        if (inGameplay) hud?.focusChatInput();
      },
      onZoom: (delta) => {
        renderer.setZoom(renderer.zoom + delta);
      },
      onEscape: () => {
        if (minigame?.active) minigame.close();
        else if (modals?.isOpen()) modals.close();
        else if (accountModalRoot.classList.contains("is-open")) accountModal.close();
      },
    },
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
      if (!inGameplay && gateScreens?.screen === "char_select") gateScreens.render();
    });
    onlineHub.pollAll();
  }

  document.addEventListener("contextmenu", (e) => {
    if (!["INPUT", "TEXTAREA"].includes(e.target?.tagName)) e.preventDefault();
  });
  document.addEventListener("gesturestart", (e) => e.preventDefault());

  const saveBeforeHide = () => {
    if (world && inGameplay) {
      account.persistPlayerState(player);
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
        account.tickPlaytime(dt);
        world.update(dt, input, renderer);
        hud.syncState(player, world, onlineHub);

        autoSaveTimer += dt;
        if (autoSaveTimer >= 15) {
          autoSaveTimer = 0;
          account.persistPlayerState(player);
        }
      }
    },
    onRender: () => {
      if (world && inGameplay) {
        world.render(renderer, input);
      } else {
        renderer.clear("#0b0d0a");
      }
    },
  });

  loop.start();
}

boot();
