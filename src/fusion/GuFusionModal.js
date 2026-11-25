import {
  FUSION_RECIPES,
  GU_CATALOG,
  canEquipInSlot,
  createGuInstance,
  matchRecipe,
} from "../combat/GuDatabase.js";

/**
 * Giao diện Trạm Luyện Cổ & Quản lý Không Khiếu:
 * - Tab 1: Hợp Cổ (chọn Cổ Chính + Cổ Phụ + tùy chọn nhỏ 15% Max HP xúc tác + Mini-game 5 giây cân bằng nhiệt).
 * - Tab 2: Không Khiếu (trang bị 5 ô: Bản Mệnh, Chủ Động 1, Chủ Động 2, Di Chuyển, Sát Chiêu).
 * - Tab 3: Sổ Cổ Phương (theo dõi các công thức Nhị Chuyển đã mở khóa).
 */
export class GuFusionModal {
  constructor({ rootEl, player, world, sfx, onClose, onEquipmentChanged }) {
    this.rootEl = rootEl;
    this.player = player;
    this.world = world;
    this.sfx = sfx;
    this.onClose = onClose;
    this.onEquipmentChanged = onEquipmentChanged;

    this.activeTab = "fusion";
    this.selectedMainUid = null;
    this.selectedSubUid = null;
    this.useBloodCatalyst = false;
    this.selectedBagUid = null;
    this.lastResult = null;

    // Trạng thái mini-game 5 giây cân bằng nhiệt
    this.minigame = {
      running: false,
      timer: 5.0,
      heat: 50,
      holdingFlame: false,
      zoneCenter: 52,
      zoneHalfWidth: 16,
      greenTime: 0,
      rafId: 0,
      lastTs: 0,
    };
  }

  open(defaultTab = "fusion") {
    this.activeTab = defaultTab;
    this.lastResult = null;
    this.rootEl.classList.add("is-open");
    this.render();
  }

  close() {
    this._stopMinigame();
    this.rootEl.classList.remove("is-open");
    this.onClose?.();
  }

  _stopMinigame() {
    if (this.minigame.rafId) {
      cancelAnimationFrame(this.minigame.rafId);
      this.minigame.rafId = 0;
    }
    this.minigame.running = false;
    this.minigame.holdingFlame = false;
  }

  _startMinigame() {
    if (!this.selectedMainUid || !this.selectedSubUid) return;
    if (this.selectedMainUid === this.selectedSubUid) return;

    if (this.useBloodCatalyst) {
      const hpCost = Math.round(this.player.maxHp * 0.15);
      if (this.player.hp <= hpCost) {
        this.lastResult = {
          kind: "error",
          title: "Huyết Khí không đủ!",
          detail: `Cần hơn ${hpCost} HP để nhỏ máu làm xúc tác.`,
        };
        this.render();
        return;
      }
      this.player.hp -= hpCost;
    }

    this.lastResult = null;
    this.minigame.running = true;
    this.minigame.timer = 5.0;
    this.minigame.heat = 48;
    this.minigame.holdingFlame = false;
    this.minigame.zoneCenter = 55;
    this.minigame.greenTime = 0;
    this.minigame.lastTs = performance.now();

    this.render();

    const step = (now) => {
      if (!this.minigame.running) return;
      const dt = Math.min(0.05, Math.max(0.001, (now - this.minigame.lastTs) / 1000));
      this.minigame.lastTs = now;

      this.minigame.timer = Math.max(0, this.minigame.timer - dt);
      // Vùng xanh dao động nhẹ
      this.minigame.zoneCenter = 54 + Math.sin((5 - this.minigame.timer) * 2.1) * 14;

      // Giữ thổi lửa -> nhiệt tăng; buông -> nhiệt hạ
      if (this.minigame.holdingFlame) {
        this.minigame.heat = Math.min(100, this.minigame.heat + 54 * dt);
      } else {
        this.minigame.heat = Math.max(0, this.minigame.heat - 36 * dt);
      }

      const inGreen =
        Math.abs(this.minigame.heat - this.minigame.zoneCenter) <= this.minigame.zoneHalfWidth;
      if (inGreen) {
        this.minigame.greenTime += dt;
      }

      this._updateMinigameDom(inGreen);

      if (this.minigame.timer <= 0) {
        this._resolveFusion();
        return;
      }
      this.minigame.rafId = requestAnimationFrame(step);
    };
    this.minigame.rafId = requestAnimationFrame(step);
  }

  _updateMinigameDom(inGreen) {
    const timerEl = this.rootEl.querySelector("#mg-timer");
    const ptrEl = this.rootEl.querySelector("#mg-pointer");
    const zoneEl = this.rootEl.querySelector("#mg-zone");
    const scoreEl = this.rootEl.querySelector("#mg-score");

    if (timerEl) timerEl.textContent = `${this.minigame.timer.toFixed(1)}s`;
    if (ptrEl) {
      ptrEl.style.left = `${this.minigame.heat}%`;
      ptrEl.classList.toggle("is-green", inGreen);
    }
    if (zoneEl) {
      zoneEl.style.left = `${this.minigame.zoneCenter - this.minigame.zoneHalfWidth}%`;
      zoneEl.style.width = `${this.minigame.zoneHalfWidth * 2}%`;
    }
    if (scoreEl) {
      const pct = Math.round((this.minigame.greenTime / 5.0) * 100);
      scoreEl.textContent = `Ổn định hỏa hầu: ${pct}%`;
    }
  }

  _resolveFusion() {
    this._stopMinigame();
    const mainGu = this.player.getGu(this.selectedMainUid);
    const subGu = this.player.getGu(this.selectedSubUid);
    if (!mainGu || !subGu) {
      this.render();
      return;
    }

    const stability = this.minigame.greenTime / 5.0; // 0..1
    let successRate = 0.25 + stability * 0.55;
    if (this.useBloodCatalyst) successRate += 0.22;
    if (subGu.isRemnant) successRate -= 0.1;

    const mutationChance = Math.min(0.45, 0.12 + (subGu.isRemnant ? 0.22 : 0) + (stability > 0.65 ? 0.12 : 0));
    const roll = Math.random();

    const mainWasSlot = this.player.getEquippedSlotOf(mainGu.uid);

    if (roll < successRate) {
      // ĐẠI THÀNH hoặc BIẾN DỊ
      const isMutation = Math.random() < mutationChance;
      const recipe = matchRecipe(mainGu.baseId, subGu.baseId);
      this.player.removeGu(mainGu.uid);
      this.player.removeGu(subGu.uid);

      let created = null;
      if (recipe) {
        this.player.unlockedRecipes.add(recipe.id);
        created = createGuInstance(recipe.result, isMutation ? {
          isMutated: true,
          name: `Dị · ${GU_CATALOG[recipe.result].name}`,
          shortLabel: `Dị ${GU_CATALOG[recipe.result].shortLabel}`,
          damageMult: 1.45,
          cooldownMult: 0.85,
          corruptionMult: 1.8,
          passiveCorruptionRate: 1.2,
          description: `BIẾN DỊ: +45% Sát thương, -15% CD, rỉ +1.2% Phản Phệ/s!`,
        } : {});
      } else {
        created = createGuInstance(mainGu.baseId, {
          isMutated: isMutation,
          tier: Math.min(3, mainGu.tier + 1),
          name: isMutation ? `Dị · ${mainGu.name}` : `Nhị Chuyển · ${mainGu.name}`,
          shortLabel: isMutation ? `Dị ${mainGu.shortLabel}` : `${mainGu.shortLabel}+`,
          damageMult: isMutation ? 1.5 : 1.32,
          cooldownMult: isMutation ? 0.85 : 0.92,
          corruptionMult: isMutation ? 1.8 : 1.2,
          passiveCorruptionRate: isMutation ? 1.2 : 0,
          description: isMutation
            ? `DỊ CỔ (${mainGu.element}+${subGu.element}): Sát thương bùng nổ, Phản Phệ nặng!`
            : `Cường hóa từ ${subGu.name}: +32% Sát thương, -8% Hồi chiêu.`,
        });
      }

      this.player.addGu(created);
      if (mainWasSlot && canEquipInSlot(created, mainWasSlot)) {
        this.player.equipGu(mainWasSlot, created.uid);
      }
      this.sfx?.play("fusionSuccess");
      this.lastResult = {
        kind: isMutation ? "mutation" : "success",
        title: isMutation ? "BIẾN DỊ DỊ CỔ!" : "LUYỆN CỔ ĐẠI THÀNH!",
        detail: `Thu được [${created.name}] — ${created.description}`,
      };
    } else {
      // THẤT BẠI / NỔ VẠC: mất 2 cổ, nhận sát thương nổ và 1 Tàn Cổ
      this.player.removeGu(mainGu.uid);
      this.player.removeGu(subGu.uid);
      const remnant = createGuInstance("tan_co");
      this.player.addGu(remnant);

      // Bảo toàn không để người chơi kẹt tay trắng không có skill tấn công nào
      const hasAnyActive = this.player.bag.some((g) => g.slotCategory === "active" && !g.isRemnant);
      if (!hasAnyActive) {
        const backup = createGuInstance("nguyet_quang");
        this.player.addGu(backup);
        this.player.equipGu("skill1", backup.uid);
      } else if (!this.player.getEquippedGu("skill1")) {
        const firstActive = this.player.bag.find((g) => g.slotCategory === "active");
        if (firstActive) this.player.equipGu("skill1", firstActive.uid);
      }

      const blastDmg = Math.round(this.player.maxHp * 0.14);
      this.player.hp = Math.max(1, this.player.hp - blastDmg);
      this.player.addCorruption(12);
      this.world.spawnVfx("vfx/no-vac", this.world.cauldron.x, this.world.cauldron.y, { scale: 0.7 });
      this.world.triggerShake(0.35, 5);
      this.sfx?.play("fusionFail");

      this.lastResult = {
        kind: "fail",
        title: "THẤT BẠI · NỔ VẠC!",
        detail: `Mất 2 Cổ Trùng, chịu ${blastDmg} sát thương nổ & +12% Phản Phệ. Thu được 1 [Tàn Cổ].`,
      };
    }

    this.selectedMainUid = null;
    this.selectedSubUid = null;
    this.onEquipmentChanged?.();
    this.render();
  }

  render() {
    const p = this.player;
    const slotDefs = [
      { id: "passive", label: "Bản Mệnh Cổ" },
      { id: "skill1", label: "Chủ Động 1" },
      { id: "skill2", label: "Chủ Động 2" },
      { id: "move", label: "Di Chuyển Cổ" },
      { id: "ult", label: "Sát Chiêu Cổ" },
    ];

    let bodyHtml = "";

    if (this.activeTab === "fusion") {
      const mainGu = p.getGu(this.selectedMainUid);
      const subGu = p.getGu(this.selectedSubUid);
      const recipePreview =
        mainGu && subGu ? matchRecipe(mainGu.baseId, subGu.baseId) : null;
      const previewText = recipePreview
        ? this.player.unlockedRecipes.has(recipePreview.id)
          ? `Công thức: ${GU_CATALOG[recipePreview.result].name}`
          : "Cảm ứng được Huyền Cơ Hợp Cổ! (Có Cổ Phương ẩn)"
        : mainGu && subGu
          ? `Dự kiến: Cường hóa ${mainGu.shortLabel} (+nguy cơ Biến Dị)`
          : "Chọn 1 Cổ Chính (giữ dạng skill) và 1 Cổ Phụ";

      const bagCards = p.bag
        .map((g) => {
          const isMain = g.uid === this.selectedMainUid;
          const isSub = g.uid === this.selectedSubUid;
          const cls = isMain ? "is-main" : isSub ? "is-sub" : "";
          const tag = isMain ? "CHÍNH" : isSub ? "PHỤ" : `Bậc ${g.tier}`;
          return `
            <button type="button" class="gu-card ${cls}" data-pick-fusion="${g.uid}" style="--gu-col:${g.color}">
              <span class="gu-name">${g.name}</span>
              <span class="gu-meta">${g.element} · ${tag}</span>
            </button>
          `;
        })
        .join("");

      bodyHtml = `
        <div class="fusion-grid">
          <div class="fusion-bag-col">
            <div class="section-title">Cổ Nang (${p.bag.length} cổ trùng)</div>
            <div class="gu-card-list">${bagCards}</div>
          </div>
          <div class="fusion-altar-col">
            <div class="fusion-slots-row">
              <div class="fusion-slot-box">
                <div class="slot-cap">Cổ Chính</div>
                <div class="slot-val">${mainGu ? mainGu.name : "Chưa chọn"}</div>
              </div>
              <div class="fusion-plus">+</div>
              <div class="fusion-slot-box">
                <div class="slot-cap">Cổ Phụ</div>
                <div class="slot-val">${subGu ? subGu.name : "Chưa chọn"}</div>
              </div>
            </div>
            <div class="fusion-preview">${previewText}</div>
            <label class="catalyst-toggle">
              <input id="chk-catalyst" type="checkbox" ${this.useBloodCatalyst ? "checked" : ""} ${this.minigame.running ? "disabled" : ""} />
              <span>🩸 Nhỏ 15% Max HP (${Math.round(p.maxHp * 0.15)} HP) làm xúc tác (+22% Đại Thành)</span>
            </label>

            ${
              this.minigame.running
                ? `
              <div class="minigame-box">
                <div class="mg-header">
                  <span>Giữ ngọn lửa trong vùng xanh!</span>
                  <span id="mg-timer">${this.minigame.timer.toFixed(1)}s</span>
                </div>
                <div class="mg-bar">
                  <div id="mg-zone" class="mg-zone"></div>
                  <div id="mg-pointer" class="mg-pointer"></div>
                </div>
                <div id="mg-score" class="mg-score">Ổn định hỏa hầu: 0%</div>
                <button id="btn-flame-hold" type="button" class="flame-hold-btn">🔥 GIỮ ĐỂ THỔI LỬA</button>
              </div>
            `
                : `
              <button id="btn-start-fusion" type="button" class="primary-action-btn" ${
                mainGu && subGu ? "" : "disabled"
              }>🔥 KHAI LÔ LUYỆN CỔ (5s)</button>
            `
            }

            ${
              this.lastResult
                ? `<div class="fusion-result is-${this.lastResult.kind}">
                    <strong>${this.lastResult.title}</strong>
                    <div>${this.lastResult.detail}</div>
                  </div>`
                : ""
            }
          </div>
        </div>
      `;
    } else if (this.activeTab === "aperture") {
      const selectedGu = p.getGu(this.selectedBagUid);
      const slotHtml = slotDefs
        .map((s) => {
          const eq = p.getEquippedGu(s.id);
          const compatible = selectedGu && canEquipInSlot(selectedGu, s.id);
          return `
            <button type="button" class="aperture-slot-btn ${compatible ? "is-compatible" : ""}" data-equip-slot="${s.id}">
              <div class="slot-cap">${s.label}</div>
              <div class="slot-val" style="color:${eq ? eq.color : "#968fa3"}">${eq ? eq.name : "Trống"}</div>
            </button>
          `;
        })
        .join("");

      const bagHtml = p.bag
        .map((g) => {
          const eqSlot = p.getEquippedSlotOf(g.uid);
          return `
            <button type="button" class="gu-card ${this.selectedBagUid === g.uid ? "is-main" : ""}" data-pick-bag="${g.uid}" style="--gu-col:${g.color}">
              <span class="gu-name">${g.name}</span>
              <span class="gu-meta">${eqSlot ? `Đang lắp: ${eqSlot}` : g.slotCategory.toUpperCase()} · ${g.description}</span>
            </button>
          `;
        })
        .join("");

      bodyHtml = `
        <div class="aperture-layout">
          <div class="aperture-slots-col">
            <div class="section-title">5 Ô Không Khiếu (chạm cổ rồi chạm ô)</div>
            ${slotHtml}
          </div>
          <div class="aperture-bag-col">
            <div class="section-title">Cổ Nang</div>
            <div class="gu-card-list">${bagHtml}</div>
          </div>
        </div>
      `;
    } else {
      const recipesHtml = FUSION_RECIPES.map((r) => {
        const unlocked = p.unlockedRecipes.has(r.id);
        const res = GU_CATALOG[r.result];
        return `
          <div class="recipe-row ${unlocked ? "is-unlocked" : ""}">
            <div class="recipe-title">${unlocked ? r.title : `${GU_CATALOG[r.main].name} + ${GU_CATALOG[r.sub].name} = ???`}</div>
            <div class="recipe-desc">${unlocked ? res.description : "Luyện thành công một lần để khai mở Cổ Phương này."}</div>
          </div>
        `;
      }).join("");

      bodyHtml = `<div class="recipes-list">${recipesHtml}</div>`;
    }

    this.rootEl.innerHTML = `
      <div class="modal-card">
        <div class="modal-header">
          <div class="modal-tabs">
            <button type="button" class="tab-btn ${this.activeTab === "fusion" ? "is-active" : ""}" data-tab="fusion">🔥 Hợp Cổ</button>
            <button type="button" class="tab-btn ${this.activeTab === "aperture" ? "is-active" : ""}" data-tab="aperture">🎒 Không Khiếu</button>
            <button type="button" class="tab-btn ${this.activeTab === "recipes" ? "is-active" : ""}" data-tab="recipes">📜 Cổ Phương</button>
          </div>
          <button type="button" id="btn-close-modal" class="close-btn">✕ Đóng</button>
        </div>
        <div class="modal-body">${bodyHtml}</div>
      </div>
    `;

    this._bindEvents();
  }

  _bindEvents() {
    this.rootEl.querySelector("#btn-close-modal")?.addEventListener("click", () => this.close());

    this.rootEl.querySelectorAll("[data-tab]").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (this.minigame.running) return;
        this.activeTab = btn.dataset.tab;
        this.render();
      });
    });

    this.rootEl.querySelectorAll("[data-pick-fusion]").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (this.minigame.running) return;
        const uid = btn.dataset.pickFusion;
        if (this.selectedMainUid === uid) {
          this.selectedMainUid = null;
        } else if (this.selectedSubUid === uid) {
          this.selectedSubUid = null;
        } else if (!this.selectedMainUid) {
          this.selectedMainUid = uid;
        } else {
          this.selectedSubUid = uid;
        }
        this.render();
      });
    });

    this.rootEl.querySelector("#chk-catalyst")?.addEventListener("change", (e) => {
      this.useBloodCatalyst = Boolean(e.target.checked);
    });

    this.rootEl.querySelector("#btn-start-fusion")?.addEventListener("click", () => {
      this._startMinigame();
    });

    const holdBtn = this.rootEl.querySelector("#btn-flame-hold");
    if (holdBtn) {
      const onDown = (e) => {
        e.preventDefault();
        this.minigame.holdingFlame = true;
        holdBtn.classList.add("is-pressed");
      };
      const onUp = (e) => {
        e.preventDefault();
        this.minigame.holdingFlame = false;
        holdBtn.classList.remove("is-pressed");
      };
      holdBtn.addEventListener("pointerdown", onDown);
      holdBtn.addEventListener("pointerup", onUp);
      holdBtn.addEventListener("pointercancel", onUp);
      holdBtn.addEventListener("pointerleave", onUp);
    }

    this.rootEl.querySelectorAll("[data-pick-bag]").forEach((btn) => {
      btn.addEventListener("click", () => {
        this.selectedBagUid = btn.dataset.pickBag;
        this.render();
      });
    });

    this.rootEl.querySelectorAll("[data-equip-slot]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const slotId = btn.dataset.equipSlot;
        const gu = this.player.getGu(this.selectedBagUid);
        if (!gu || !canEquipInSlot(gu, slotId)) return;
        this.player.equipGu(slotId, gu.uid);
        this.sfx?.play("pickup");
        this.onEquipmentChanged?.();
        this.render();
      });
    });
  }
}
