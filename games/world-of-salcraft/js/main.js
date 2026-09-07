// Screen management and app wiring.

// --- Pixel-art size standard ---
// Player characters and regular (non-boss/elite) encounters render at 32x32
// for the sharpest detail the current sprite grid supports; Boss/Elite (and
// anything equally "epic" - rare named encounters use the same boss/elite
// flags) render at 64x64 so they visibly loom larger in the same combat
// frame. Only combat/map portraits follow this rule - menu chrome (class
// select cards, the Armory paperdoll portrait, HUD mini-icons) scales
// independently since those aren't "encounters."
const PLAYER_SPRITE_SIZE = 76;
const EPIC_ENEMY_SPRITE_SIZE = 88;
const REGULAR_ENEMY_SPRITE_SIZE = 56;
function epicEnemySize(enemy) {
  return (enemy.boss || enemy.elite) ? EPIC_ENEMY_SPRITE_SIZE : REGULAR_ENEMY_SPRITE_SIZE;
}

// How far into the current act's map the player has traveled (0-1) - drives
// the zone skyline banner's parallax shift (see renderZoneSkyline in
// sprites.js) so the backdrop visibly advances as the run pushes deeper into
// a zone instead of sitting frozen behind every screen.
function zoneProgress() {
  if (!Game.map || !Game.map.nodes) return 0;
  const total = Object.keys(Game.map.nodes).length || 1;
  return Math.min(1, (Game.visitedNodes || []).length / total);
}

const App = {
  root: null,
  selectedClass: null,
  autoCombat: false,
  selectedArmorySlot: null, // transient UI state for the Character tab's paperdoll picker

  init() {
    this.root = document.getElementById('app');
    // The AUTO checkbox lives in the shared HUD (see renderHud) so it's
    // reachable from every in-run screen, not just the combat one - wired
    // once here via delegation instead of re-binding it at each of the many
    // showXyz() call sites that include the HUD in their innerHTML.
    this.root.addEventListener('change', (e) => {
      if (e.target && e.target.id === 'hud-auto-toggle') {
        this.autoCombat = e.target.checked;
        if (!this.autoCombat) {
          // Turning Auto off doesn't otherwise trigger a re-render anywhere -
          // without this, the combat buttons stay however they were last
          // drawn (disabled, from Auto's own render) until some unrelated
          // event happens to redraw the screen, silently locking the player
          // out of manual control in the meantime.
          if (Combat.state && !Combat.state.over && this.currentCombatNode) this.renderCombatScreen(this.currentCombatNode);
          return;
        }
        if (Combat.state && !Combat.state.over) {
          this.performAutoAction(this.currentCombatNode);
        } else {
          // Not mid-combat - if the map itself is what's on screen right
          // now, kick off auto-pathing immediately rather than waiting for
          // the next showMap() call.
          const mapContainer = document.getElementById('map-container');
          if (mapContainer) this.autoPickPath(mapContainer);
        }
      }
    });
    // Same delegation approach for the HUD's Relics button (see renderHud) -
    // reachable from every in-run screen without re-binding it at each one.
    this.root.addEventListener('click', (e) => {
      if (e.target && e.target.closest && e.target.closest('#btn-open-relics')) this.showRunRelicsModal();
    });
    const afkResult = computeAfkProgress();
    if (afkResult) {
      if (afkResult.itemsGained.length && Persistent.getCharacter(afkResult.classId).autoEquip) {
        this.autoEquipBestGear(afkResult.classId);
        Persistent.save();
      }
      this.showWelcomeBack(afkResult);
    } else this.showTitle();
  },

  // Shown once, at launch, only when computeAfkProgress (progression.js)
  // found a meaningful stretch of real time since the last save - reports
  // exactly what accrued while the game was closed before handing off to
  // the normal title screen.
  showWelcomeBack(result) {
    const cls = CLASSES[result.classId];
    const hours = result.elapsedMs / 3600000;
    const timeLabel = hours < 1 ? `${Math.round(hours * 60)} minutes` : `${hours.toFixed(1)} hours`;
    const rec = Persistent.getCharacter(result.classId);
    const materialLines = Object.entries(result.materialsGained).map(([k, v]) => `+${v} ${k}`).join(', ');
    const itemLines = result.itemsGained.map(i => `<div>${i.icon} <span style="color:${RARITIES[i.rarity].color}">${RARITIES[i.rarity].label} ${i.name}</span></div>`).join('');
    this.root.innerHTML = `
      <div class="center-screen">
        <h1 class="result-title victory">Welcome Back!</h1>
        <p class="flavor">${cls.name} kept adventuring while you were away - ${timeLabel} passed.</p>
        <div class="outcome-box">
          <div>✨ +${result.xpGained} XP${result.levelsGained > 0 ? ` - <strong>+${result.levelsGained} level${result.levelsGained > 1 ? 's' : ''}</strong> (now Lv.${rec.level})` : ''}</div>
          <div>🪙 +${result.goldGained} Gold</div>
          ${materialLines ? `<div>📦 ${materialLines}</div>` : ''}
          ${result.professionId && result.professionLevelsGained > 0 ? `<div>${PROFESSIONS[result.professionId].icon} +${result.professionLevelsGained} ${PROFESSIONS[result.professionId].name} level${result.professionLevelsGained > 1 ? 's' : ''}</div>` : ''}
          ${itemLines ? `<div style="margin-top:8px">Items found:${itemLines}</div>` : '<div class="small-text" style="margin-top:8px">No items found this time.</div>'}
        </div>
        <button class="btn-primary" id="btn-welcome-continue">Continue</button>
      </div>`;
    document.getElementById('btn-welcome-continue').addEventListener('click', () => this.showTitle());
  },

  // ---------------- Title / class select ----------------
  showTitle() {
    const meta = Meta.load();
    const pdata = Persistent.load();
    this.root.innerHTML = `
      <div class="center-screen">
        <h1 class="game-title">WORLD OF SALCRAFT</h1>
        <div class="meta-stats">
          <span>Runs played: ${meta.runsPlayed}</span>
          <span>Best act reached: ${meta.bestAct}</span>
          <span>Bank: ${pdata.bankGold} 🪙</span>
        </div>
        <button class="btn-primary title-btn" id="btn-new-run">Begin Adventure</button>
        <button class="btn-secondary title-btn" id="btn-sanctuary">Sanctuary</button>
        <button class="btn-secondary title-btn" id="btn-difficulty">🎚️ Change Difficulty (${DIFFICULTIES[pdata.difficulty].name})</button>
        <button class="btn-secondary title-btn" id="btn-settings">⚙️ Settings</button>
        <button class="btn-secondary title-btn" id="btn-how-to-play">❔ How to Play</button>
        <label class="title-skip-tutorials">
          <input type="checkbox" id="chk-skip-tutorials" ${pdata.skipTutorials ? 'checked' : ''}>
          Skip Tutorials
        </label>
      </div>`;
    document.getElementById('btn-new-run').addEventListener('click', () => this.showClassSelect());
    document.getElementById('btn-sanctuary').addEventListener('click', () => this.showSanctuary());
    document.getElementById('btn-difficulty').addEventListener('click', () => this.showDifficultyModal());
    document.getElementById('btn-settings').addEventListener('click', () => this.showSettingsModal());
    document.getElementById('btn-how-to-play').addEventListener('click', () => this.showTutorialModal());
    document.getElementById('chk-skip-tutorials').addEventListener('change', (e) => {
      pdata.skipTutorials = e.target.checked;
      Persistent.save();
    });
    // A brand-new player (never dismissed it before) gets the walkthrough
    // automatically, once, the first time they ever see the title screen.
    if (!pdata.tutorialSeen) this.showTutorialModal();
  },

  showClassSelect() {
    this.selectedClass = null;
    const bestAct = Meta.load().bestAct;
    const cards = Object.values(CLASSES).map(c => {
      const unlocked = isClassUnlocked(c.id);
      const rec = Persistent.getCharacter(c.id);
      // The character's ACTUAL current stats (level, gear, talents, relics,
      // Gear Set Bonus, everything) - not the class's flat base numbers, so
      // this screen reflects who that character really is right now.
      const stats = unlocked ? previewClassStats(c.id) : null;
      return `
      <button type="button" class="class-card ${unlocked ? '' : 'locked'}" data-class="${c.id}" ${unlocked ? '' : 'disabled'}>
        <div class="class-icon">${characterSpriteFor(c.id, 88)}</div>
        <h3>${c.name} ${unlocked ? `<span class="small-text">Lv.${rec.level}</span>` : ''}</h3>
        ${unlocked ? `
          <p>${c.blurb}</p>
          <div class="class-stat-grid">
            <span>HP ${stats.maxHp}</span><span>ATK ${stats.atk}</span>
            <span>DEF ${stats.def}</span><span>SPD ${stats.speed}</span>
          </div>
        ` : `
          <p class="small-text">🔒 Locked</p>
          <p class="small-text">Win this class's Class Trial (a rare map encounter) to unlock it.</p>
        `}
      </button>`;
    }).join('');

    // "Pick up from your highest act" only makes sense for a returning
    // player who's actually cleared at least Act 1 - omitted entirely for a
    // brand-new account rather than shown disabled.
    const showPickup = bestAct >= 2;
    this.root.innerHTML = `
      <div class="center-screen">
        <h2>Choose your path</h2>
        <div class="class-grid" id="class-grid">${cards}</div>
        <button class="btn-primary venture-forth-fixed" id="btn-confirm-class-fixed" disabled>Venture Forth</button>
        ${showPickup ? `<button class="btn-secondary venture-forth-fixed" id="btn-pickup-act-fixed" disabled>Pick up from your highest act (Act ${bestAct})</button>` : ''}
        <button class="btn-secondary" id="btn-back-title">Back</button>
      </div>`;

    // Two confirm buttons, complementary via CSS (see .venture-forth-fixed/
    // .venture-forth-btn) rather than one button whose behavior is detected
    // in JS: a fixed one below the grid for desktop (where the one-handed-
    // reach problem doesn't exist and a full-width bar breaking a wide
    // multi-column grid read as a glitch), and one inserted right under
    // the selected card - on its own full-width row - for mobile. Both
    // share the same confirm logic and stay in sync on every card click.
    // The "pick up" button follows the exact same fixed/dynamic pairing,
    // always placed directly after its matching Venture Forth button.
    const confirmSelection = (startingAct) => {
      if (!this.selectedClass) return;
      Persistent.load().lastPlayedClassId = this.selectedClass;
      Game.newRun(this.selectedClass, startingAct);
      this.showMap();
    };
    const fixedBtn = document.getElementById('btn-confirm-class-fixed');
    fixedBtn.addEventListener('click', () => confirmSelection());
    const pickupFixedBtn = document.getElementById('btn-pickup-act-fixed');
    if (pickupFixedBtn) pickupFixedBtn.addEventListener('click', () => confirmSelection(bestAct));

    const cardsEls = this.root.querySelectorAll('.class-card:not(.locked)');
    cardsEls.forEach(el => {
      el.addEventListener('click', () => {
        cardsEls.forEach(c => c.classList.remove('selected'));
        el.classList.add('selected');
        this.selectedClass = el.dataset.class;
        fixedBtn.disabled = false;
        if (pickupFixedBtn) pickupFixedBtn.disabled = false;
        let confirmBtn = document.getElementById('btn-confirm-class');
        if (!confirmBtn) {
          confirmBtn = document.createElement('button');
          confirmBtn.id = 'btn-confirm-class';
          confirmBtn.className = 'btn-primary venture-forth-btn';
          confirmBtn.textContent = 'Venture Forth';
          confirmBtn.addEventListener('click', () => confirmSelection());
        }
        el.insertAdjacentElement('afterend', confirmBtn);
        if (showPickup) {
          let pickupBtn = document.getElementById('btn-pickup-act');
          if (!pickupBtn) {
            pickupBtn = document.createElement('button');
            pickupBtn.id = 'btn-pickup-act';
            pickupBtn.className = 'btn-secondary venture-forth-btn';
            pickupBtn.textContent = `Pick up from your highest act (Act ${bestAct})`;
            pickupBtn.addEventListener('click', () => confirmSelection(bestAct));
          }
          confirmBtn.insertAdjacentElement('afterend', pickupBtn);
        }
      });
    });
    document.getElementById('btn-back-title').addEventListener('click', () => this.showTitle());
  },

  // Collapses a run's relic list (which can hold real duplicates - picking
  // the same relic twice legitimately stacks its effect, see
  // applyRelicEffects in data.js) into one row per unique relic with a
  // stack count, so a long run's dozen+ distinct relics show as a readable
  // list instead of spilling the HUD off screen (see showRunRelicsModal).
  // The description recomputes the effect AT that stack count (rather than
  // showing the single-copy desc text) so it always reflects the true
  // total, e.g. "+125% gold" for 5 stacks of a +25% relic.
  renderStackedRelicRows(relicIds) {
    const counts = {};
    relicIds.forEach(id => { counts[id] = (counts[id] || 0) + 1; });
    const ids = Object.keys(counts);
    if (!ids.length) return '<p class="small-text">No relics found yet this run.</p>';
    return ids.map(id => {
      const relic = RELICS[id];
      const count = counts[id];
      const stackedDesc = relic.effect
        ? Object.keys(relic.effect).map(k => describeEffectLever(k, relic.effect[k] * count)).join(', ')
        : relic.desc;
      return `<div class="gear-row"><div class="desc"><span>${relic.icon}</span><div>
        <strong>${relic.name}</strong>${count > 1 ? ` <span class="small-text">×${count}</span>` : ''}
        <div class="small-text">${stackedDesc}</div>
      </div></div></div>`;
    }).join('');
  },

  showRunRelicsModal() {
    this.showListModal(`💠 Relics (${new Set(Game.player.relics).size})`, () => this.renderStackedRelicRows(Game.player.relics), () => {}, null);
  },

  // ---------------- Shared HUD ----------------
  renderHud() {
    const p = Game.player;
    const stats = Game.effectiveStats();
    const hpPct = Math.max(0, Math.round((p.hp / stats.maxHp) * 100));
    const relicCount = new Set(p.relics).size;
    const curses = (p.curses || []).map(id => `<span title="${CURSES[id].name}: ${CURSES[id].desc}">${CURSES[id].icon}</span>`).join('');
    const now = Date.now();
    const buffs = Persistent.load().activeBuffs.filter(b => b.expiresAt > now).map(b => {
      const minsLeft = Math.max(1, Math.round((b.expiresAt - now) / 60000));
      const desc = Object.keys(b.effect || {}).map(k => describeEffectLever(k, b.effect[k])).join(', ');
      return `<span title="${b.label}: ${desc} (${minsLeft}m left)">${b.icon}</span>`;
    }).join('');
    const moralEffects = (p.tempEffects || []).map(e => {
      const desc = Object.keys(e.effect || {}).map(k => describeEffectLever(k, e.effect[k])).join(', ');
      return `<span title="${e.label}: ${desc} (${e.encountersLeft} encounter${e.encountersLeft === 1 ? '' : 's'} left)">${e.icon}</span>`;
    }).join('');
    return `
      <div class="hud">
        <div class="hud-player">
          <div class="sprite-mini">${characterSpriteFor(p.classId, 32)}</div>
          <div>
            <div class="hp-bar-wrap"><div class="hp-bar-fill" style="width:${hpPct}%"></div></div>
            <div class="hp-label">${hpPct}% HP</div>
          </div>
        </div>
        <div class="hud-gold">${p.gold} 🪙</div>
        <button type="button" class="hud-relics-btn" id="btn-open-relics" title="View every relic found this run">💠 Relics (${relicCount})</button>
        ${curses ? `<div class="hud-curses">${curses}</div>` : ''}
        ${buffs ? `<div class="hud-buffs">${buffs}</div>` : ''}
        ${moralEffects ? `<div class="hud-buffs">${moralEffects}</div>` : ''}
        <div class="hud-act">Act ${Game.act} · Lv.${stats.level}</div>
        <label class="auto-toggle" title="Auto-resolves combat and, on the map, always sets out down whichever path looks hardest.">
          <input type="checkbox" id="hud-auto-toggle" ${this.autoCombat ? 'checked' : ''}> AUTO
        </label>
      </div>`;
  },

  // A themed skyline strip shown above every in-run encounter panel (combat,
  // campsite, shop, event, treasure, taming...) so the current act's zone
  // (see ACT_THEMES/ZONE_SKYLINE_STYLE in data.js) is felt everywhere during
  // a run, not just on the map screen. Returns '' outside a run (no Game.act
  // yet) so title/Sanctuary screens are unaffected.
  renderZoneBanner() {
    if (!Game.act) return '';
    const theme = getActTheme(Game.act);
    return `<div class="zone-banner" style="background:${theme.bg}">
      <div class="zone-ground" style="background-image:url('assets/tilesets/${theme.id}.png')"></div>
      ${renderZoneSkyline(theme.id, zoneProgress())}
      <div class="zone-banner-fade"></div>
    </div>`;
  },

  refreshHud() {
    const el = this.root.querySelector('.hud');
    if (el) el.outerHTML = this.renderHud();
  },

  // ---------------- Map ----------------
  showMap() {
    Game.tickTempEffects();
    this.root.innerHTML = `
      ${this.renderHud()}
      <div class="map-container" id="map-container"></div>
      <div class="map-legend">
        <span>⚔️ Battle</span><span>👹 Elite</span><span>❓ Unknown</span>
        <span>🔥 Rest</span><span>💰 Shop</span><span>🎁 Treasure</span>
        <span>🌟 Class Trial</span><span>👑 Legendary</span><span>🐾 Wild Creature</span><span>🐈 Glowing Witch</span>
        <span>🎭 Rare Encounter</span><span>🐕 Legendary Creature</span><span>☠️ Boss</span>
      </div>
      <button class="btn-secondary" id="btn-inrun-inventory">🎒 Inventory</button>
      <button class="btn-secondary btn-abandon-run" id="btn-abandon-run">🏠 Return to Sanctuary</button>`;
    const container = document.getElementById('map-container');
    renderMap(container, Game.map, Game.currentNodeId, Game.visitedNodes, (nodeId) => this.selectNode(nodeId), Game.player.classId);
    document.getElementById('btn-inrun-inventory').addEventListener('click', () => this.showInRunInventory());
    document.getElementById('btn-abandon-run').addEventListener('click', () => this.confirmAbandonRun());
    if (this.autoCombat) this.autoPickPath(container);
    this.maybeShowTutorial('map');
  },

  // With AUTO on, the map picks whichever available node reads as the most
  // dangerous (see NODE_RESISTANCE_RANK in map.js) and walks there itself -
  // a synthetic click on that node's own element, so it reuses the exact
  // same travel-animation/selection logic a real click would trigger rather
  // than duplicating any of it here.
  autoPickPath(container) {
    const availableIds = getAvailableNodeIds(Game.map, Game.currentNodeId, Game.visitedNodes);
    if (!availableIds.length) return;
    let bestId = availableIds[0], bestRank = -1;
    availableIds.forEach(id => {
      const rank = NODE_RESISTANCE_RANK[Game.map.nodes[id].type] ?? 0;
      if (rank > bestRank) { bestRank = rank; bestId = id; }
    });
    const el = container.querySelector(`.map-node[data-node-id="${bestId}"]`);
    if (el) setTimeout(() => el.click(), 400);
  },

  // A stripped-down equip screen reachable mid-adventure - re-gearing between
  // fights without leaving the run. Deliberately NOT wrapped in the full
  // Sanctuary shell (no tab bar), so Shop/Crafting/Gathering/etc. stay
  // reachable only after the run actually ends and the player is back in
  // the Sanctuary proper.
  // Mirrors the Sanctuary Inventory tab exactly (renderInventoryCategories/
  // wireInventoryCategoryClicks) plus its own Armory and Gathering Profession
  // categories, so gearing up and re-equipping never requires bailing out to
  // the Sanctuary mid-run. Crafting/Shop stay Sanctuary-only by design.
  showInRunInventory() {
    const classId = Game.player.classId;
    const extraRows = this.categoryButtonRow('inv-armory', '🎽', 'Armory', 'View and change your equipped gear')
      + this.categoryButtonRow('inv-gathering', '⛏️', 'Gathering Profession', `Lv.1-${PROFESSION_MAX_LEVEL} - switch which one is earning XP`);
    this.root.innerHTML = `
      ${this.renderHud()}
      <div class="panel">
        <h2>Inventory</h2>
        ${this.renderInventoryCategories(classId, extraRows)}
        <button class="btn-secondary" id="btn-inrun-inventory-back">Back to Map</button>
      </div>`;
    this.wireInventoryCategoryClicks(classId, this.root, () => this.showInRunInventory());
    const gatheringBtn = this.root.querySelector('[data-open-category="inv-gathering"]');
    if (gatheringBtn) gatheringBtn.addEventListener('click', () => this.showProfGatheringModal(classId, () => this.showInRunInventory()));
    document.getElementById('btn-inrun-inventory-back').addEventListener('click', () => this.showMap());
  },

  // Lets the player bail out of a run early instead of pushing on until they
  // die. Since XP/loot/materials/tamed pets and mounts/quest progress all
  // save to Persistent immediately as they're earned (not deferred to run
  // end), abandoning has to explicitly roll all of that back - see
  // Game.abandonRun(), which restores the snapshot taken at Game.newRun().
  confirmAbandonRun() {
    this.root.innerHTML = `
      ${this.renderHud()}
      <div class="panel">
        <h2>Return to Sanctuary?</h2>
        <div class="outcome-box">Leaving now abandons this adventure. Everything earned THIS RUN will be lost -
        gold, XP gained, loot, materials, and any pets, mounts, or class unlocks found along the way.
        Your level, gear, and bank gold from before this run started are safe either way.</div>
        <button class="btn-primary" id="btn-confirm-abandon">Yes, Return to Sanctuary</button>
        <button class="btn-secondary" id="btn-cancel-abandon">Keep Adventuring</button>
      </div>`;
    document.getElementById('btn-confirm-abandon').addEventListener('click', () => {
      Game.abandonRun();
      this.showSanctuary();
    });
    document.getElementById('btn-cancel-abandon').addEventListener('click', () => this.showMap());
  },

  selectNode(nodeId) {
    const node = Game.map.nodes[nodeId];
    Game.currentNodeId = nodeId;
    if (!Game.visitedNodes.includes(nodeId)) Game.visitedNodes.push(nodeId);

    if (node.type === 'combat') {
      // Random Rival Ghost encounters (opt-in via the PvP tab checkbox) can
      // replace a normal fight - a genuinely difficult, randomly-geared
      // opponent rather than the safe mirror match from the PvP tab. Real
      // run HP/death rules still apply; only the victory reward differs
      // (see resolveCombatEnd's node.rivalGhost branch).
      if (Persistent.load().randomPvpEnabled && Math.random() < 0.25) {
        node.rivalGhost = true;
        this.enterCombat(node, this.generateRivalGhost(Game.player.classId));
      } else {
        this.enterCombat(node, scaleEnemy(ENEMIES[rand(0, ENEMIES.length - 1)], Game.act));
      }
    }
    else if (node.type === 'elite') this.enterCombat(node, scaleEnemy(ELITES[rand(0, ELITES.length - 1)], Game.act));
    else if (node.type === 'boss') this.enterCombat(node, scaleEnemy(BOSSES[(Game.act - 1) % BOSSES.length], Game.act));
    else if (node.type === 'event') { grantReputation(getActTheme(Game.act).id, 8); this.showEvent(node); }
    else if (node.type === 'rest') { grantReputation(getActTheme(Game.act).id, 8); this.showRest(node); }
    else if (node.type === 'shop') { grantReputation(getActTheme(Game.act).id, 8); this.showShop(node); }
    else if (node.type === 'treasure') { grantReputation(getActTheme(Game.act).id, 12); this.showTreasure(node); }
    else if (node.type === 'classTrial') this.enterClassTrial(node);
    else if (node.type === 'legendary') this.enterLegendaryEncounter(node);
    else if (node.type === 'taming') this.enterTaming(node);
    else if (node.type === 'witchJess') this.enterWitchJess(node);
    else if (node.type === 'rareNpc') this.enterRareNpc(node);
    else if (node.type === 'legendaryTaming') this.enterLegendaryTaming(node);
  },

  // ---------------- Taming (pet/mount) ----------------
  // Presents TAMING_DECISIONS in sequence. Get all 3 right and the creature is
  // tamed on the spot; get any wrong and you must win a follow-up combat to
  // still earn it. Pets/mounts are PERMANENT (Persistent.ownedPets/ownedMounts),
  // unlike the run-only relics from combat rewards.
  enterTaming(node) {
    node.tamingReward = pickTamingReward();
    node.tamingStep = 0;
    node.tamingWrong = 0;
    this.showTamingStep(node);
  },

  showTamingStep(node) {
    const step = TAMING_DECISIONS[node.tamingStep];
    const reward = node.tamingReward;
    this.root.innerHTML = `
      ${this.renderHud()}
      ${this.renderZoneBanner()}
      <div class="panel taming-encounter">
        <h2>${reward.def.icon} A Wild ${reward.def.name}</h2>
        <p class="small-text">Step ${node.tamingStep + 1} of ${TAMING_DECISIONS.length}</p>
        <p class="flavor">${step.prompt}</p>
        <div class="choice-list" id="choice-list">
          ${step.options.map((o, i) => `<button class="choice-btn" data-idx="${i}">${o.label}</button>`).join('')}
        </div>
      </div>`;
    this.root.querySelectorAll('.choice-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.idx, 10);
        if (!step.options[idx].correct) node.tamingWrong += 1;
        node.tamingStep += 1;
        if (node.tamingStep < TAMING_DECISIONS.length) this.showTamingStep(node);
        else this.resolveTamingDecisions(node);
      });
    });
  },

  resolveTamingDecisions(node) {
    if (node.tamingWrong === 0) { this.grantTamingReward(node, true); return; }
    node.tamingCombat = true;
    this.enterCombat(node, scaleEnemy(ENEMIES[rand(0, ENEMIES.length - 1)], Game.act));
  },

  grantTamingReward(node, autoTamed, combatReward) {
    const reward = node.tamingReward;
    const pdata = Persistent.load();
    const owned = reward.kind === 'pet' ? pdata.ownedPets : pdata.ownedMounts;
    const alreadyOwned = owned.includes(reward.id);
    if (!alreadyOwned) owned.push(reward.id);
    Game.grantProfessionXp(rand(4, 9));
    grantReputation(getActTheme(Game.act).id, 15);
    Persistent.save();
    if (this.autoCombat) {
      this.showAutoToast(combatReward ? this.autoToastSummary(`${reward.def.icon} ${reward.def.name} tamed!`, combatReward) : `<strong>${reward.def.icon} ${reward.def.name} tamed!</strong>`);
      this.showMap();
      return;
    }
    const lines = [
      autoTamed
        ? 'Reading its every move perfectly, you win its trust completely - it is tamed without a fight.'
        : `After a hard-fought battle, the ${reward.def.name} accepts you as its companion.`,
      ...(combatReward ? this.rewardLines(combatReward) : []),
      `${reward.def.icon} <strong>${reward.def.name}</strong> (${reward.def.universe}) ${alreadyOwned ? 'reaffirms its bond with you' : `joins you permanently as a ${reward.kind}`}.`,
      reward.def.desc,
      'Visit the Sanctuary to equip it.'
    ];
    this.root.innerHTML = `
      ${this.renderHud()}
      ${this.renderZoneBanner()}
      <div class="panel taming-encounter">
        <h2>Tamed!</h2>
        <div class="outcome-box">${lines.join('<br>')}</div>
        <button class="btn-primary" id="btn-continue">Continue</button>
      </div>`;
    document.getElementById('btn-continue').addEventListener('click', () => this.showMap());
  },

  // ---------------- Jess (rare cat/kitten vendor) ----------------
  // A very rare encounter (see pickType in map.js) - a glowing witch who
  // deals exclusively in her own cats/kittens (JESS_EXCLUSIVE_PETS in
  // data.js), priced in THIS RUN's temporary relics (spent at random, like
  // paying a toll) rather than gold, since relics vanish at the end of the
  // run anyway. The offered stock never changes once generated for this
  // node, but re-renders each purchase so price/afford/owned states update.
  enterWitchJess(node) {
    if (!node.jessStock) node.jessStock = Object.keys(PETS).filter(id => JESS_EXCLUSIVE_PETS.has(id));
    grantReputation(getActTheme(Game.act).id, 10);
    this.renderWitchJessScreen(node);
  },

  renderWitchJessScreen(node) {
    const pdata = Persistent.load();
    const relicCount = Game.player.relics.length;
    const rows = node.jessStock.map(id => {
      const def = PETS[id];
      const price = JESS_PET_PRICE[def.tier];
      const owned = pdata.ownedPets.includes(id);
      const afford = relicCount >= price;
      return `<div class="shop-item">
        <div class="desc"><span>${def.icon}</span><div><strong>${def.name}</strong> <span class="small-text">(${def.tier === 'kitten' ? 'Kitten' : 'Cat'})</span><div class="small-text">${def.desc}</div></div></div>
        <div>
          <span class="price">${price} 💠</span>
          <button class="btn-secondary" data-buy-jess-pet="${id}" ${owned || !afford ? 'disabled' : ''}>${owned ? 'Owned' : (afford ? 'Buy' : 'Need more')}</button>
        </div>
      </div>`;
    }).join('');

    this.root.innerHTML = `
      ${this.renderHud()}
      ${this.renderZoneBanner()}
      <div class="panel witch-jess-encounter">
        <div class="jess-portrait-wrap"><img src="assets/sprites/witchJess.png" class="jess-portrait" alt="Jess"></div>
        <h2>Jess</h2>
        <p class="flavor">A witch steps out from between the trees, hair the color of turned earth, an orange cat winding figure-eights around her ankles - both of them faintly, unmistakably glowing. "Name's Jess. Cats and kittens, that's the trade - and I'll only take relics for 'em. You're carrying ${relicCount}, if you've got the nerve to spend 'em."</p>
        ${rows}
        <button class="btn-primary" id="btn-leave-jess" style="margin-top:6px">Leave</button>
      </div>`;

    this.root.querySelectorAll('[data-buy-jess-pet]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.buyJessPet;
        const def = PETS[id];
        const price = JESS_PET_PRICE[def.tier];
        if (pdata.ownedPets.includes(id) || Game.player.relics.length < price) return;
        for (let i = 0; i < price; i++) Game.player.relics.splice(rand(0, Game.player.relics.length - 1), 1);
        pdata.ownedPets.push(id);
        Persistent.save();
        this.renderWitchJessScreen(node);
      });
    });
    document.getElementById('btn-leave-jess').addEventListener('click', () => this.showMap());
  },

  // ---------------- Rare NPCs ----------------
  // One-time-ever, account-wide (pdata.metRareNpcs) - each NPC (RARE_NPCS in
  // data.js) always hands out their own signature named reward, never a
  // random roll. Falls back to an elite fight, same as Class Trial/Legendary
  // Encounter, once every NPC has already been met.
  enterRareNpc(node) {
    const pdata = Persistent.load();
    const remaining = Object.keys(RARE_NPCS).filter(id => !pdata.metRareNpcs.includes(id));
    if (remaining.length === 0) {
      this.enterCombat(node, scaleEnemy(ELITES[rand(0, ELITES.length - 1)], Game.act));
      return;
    }
    node.rareNpcId = remaining[rand(0, remaining.length - 1)];
    this.renderRareNpcScreen(node);
  },

  renderRareNpcScreen(node) {
    const npc = RARE_NPCS[node.rareNpcId];
    const rewardDef = npc.rewardKind === 'legendary' ? LEGENDARY_ITEMS[npc.rewardId]
      : npc.rewardKind === 'mount' ? MOUNTS[npc.rewardId] : PETS[npc.rewardId];
    this.root.innerHTML = `
      ${this.renderHud()}
      ${this.renderZoneBanner()}
      <div class="panel rare-npc-encounter">
        <div class="npc-portrait-wrap"><img src="assets/sprites/${npc.portrait}.png" class="npc-portrait" alt="${npc.name}"></div>
        <h2>${npc.name}</h2>
        <p class="flavor">${npc.flavor}</p>
        <div class="outcome-box">${rewardDef.icon} <strong>${rewardDef.name}</strong><div class="small-text">${rewardDef.desc}</div></div>
        <button class="btn-primary" id="btn-claim-rare-npc">${npc.rewardKind === 'legendary' ? 'Claim Item' : 'Claim Companion'}</button>
      </div>`;
    document.getElementById('btn-claim-rare-npc').addEventListener('click', () => this.claimRareNpcReward(node));
  },

  claimRareNpcReward(node) {
    const npc = RARE_NPCS[node.rareNpcId];
    const pdata = Persistent.load();
    pdata.metRareNpcs.push(node.rareNpcId);
    if (npc.rewardKind === 'legendary') {
      pdata.ownedLegendaries.push(npc.rewardId);
      const item = instantiateLegendary(npc.rewardId);
      pdata.inventory.push(item);
      if (Persistent.getCharacter(Game.player.classId).autoEquip) this.autoEquipBestGear(Game.player.classId);
    } else if (npc.rewardKind === 'mount') {
      if (!pdata.ownedMounts.includes(npc.rewardId)) pdata.ownedMounts.push(npc.rewardId);
    } else {
      if (!pdata.ownedPets.includes(npc.rewardId)) pdata.ownedPets.push(npc.rewardId);
    }
    Game.grantProfessionXp(rand(4, 9));
    grantReputation(getActTheme(Game.act).id, 15);
    Persistent.save();
    if (this.autoCombat) {
      this.showAutoToast(`<strong>${npc.name} rewards you!</strong>`);
      this.showMap();
      return;
    }
    this.showMap();
  },

  // ---------------- Legendary taming (Robin / Monkey / Chopper) ----------------
  // Same TAMING_DECISIONS flow as a normal 'taming' node (showTamingStep/
  // resolveTamingDecisions/grantTamingReward all work unmodified on whatever
  // node.tamingReward holds) - only the reward itself is forced to one
  // specific, not-yet-owned creature instead of pickTamingReward()'s random
  // pick. One-time-ever per creature; falls back to an elite fight once all
  // three are already owned.
  enterLegendaryTaming(node) {
    const pdata = Persistent.load();
    const remaining = Object.keys(LEGENDARY_TAMINGS).filter(key => {
      const t = LEGENDARY_TAMINGS[key];
      const owned = t.kind === 'pet' ? pdata.ownedPets : pdata.ownedMounts;
      return !owned.includes(t.id);
    });
    if (remaining.length === 0) {
      this.enterCombat(node, scaleEnemy(ELITES[rand(0, ELITES.length - 1)], Game.act));
      return;
    }
    const t = LEGENDARY_TAMINGS[remaining[rand(0, remaining.length - 1)]];
    const pool = t.kind === 'pet' ? PETS : MOUNTS;
    node.tamingReward = { kind: t.kind, id: t.id, def: pool[t.id] };
    node.tamingStep = 0;
    node.tamingWrong = 0;
    this.showTamingStep(node);
  },

  // A rare map encounter that offers to permanently unlock a bonus class. The
  // target class is chosen at visit time (not map-generation time) from whatever
  // is still locked, so a trial is never "wasted" on something already unlocked.
  // The guardian is rendered using the target class's own sprite (tinted) since
  // it's meant to look like a spectral echo of that class.
  enterClassTrial(node) {
    const locked = getLockedClassIds();
    if (locked.length === 0) {
      this.enterCombat(node, scaleEnemy(ELITES[rand(0, ELITES.length - 1)], Game.act));
      return;
    }
    const trialClassId = locked[rand(0, locked.length - 1)];
    node.trialClassId = trialClassId;
    const trial = CLASS_TRIALS[trialClassId];
    this.enterCombat(node, { id: trialClassId, name: trial.name, hp: trial.hp, atk: trial.atk, def: trial.def, speed: trial.speed, gold: trial.gold, elite: true, spectral: true });
  },

  // A very rare gauntlet: 5-10 waves back-to-back (small heal between waves,
  // no fleeing) guarding a single named legendary item. The target legendary
  // is chosen at visit time from whatever's not yet owned; if everything is
  // already owned, it falls back to a tough one-off elite fight for gold/XP.
  enterLegendaryEncounter(node) {
    const available = Object.keys(LEGENDARY_ITEMS).filter(id => !Persistent.load().ownedLegendaries.includes(id));
    if (available.length === 0) {
      this.enterCombat(node, scaleEnemy(ELITES[rand(0, ELITES.length - 1)], Game.act + 1));
      return;
    }
    const legendaryId = available[rand(0, available.length - 1)];
    Game.gauntlet = { legendaryId, waveIndex: 1, totalWaves: rand(5, 10), node };
    this.startGauntletWave();
  },

  startGauntletWave() {
    const g = Game.gauntlet;
    const pool = g.waveIndex >= g.totalWaves ? ELITES : ENEMIES;
    const base = pool[rand(0, pool.length - 1)];
    const scaled = scaleEnemy(base, Game.act + g.waveIndex * 0.35);
    Combat.start(scaled);
    this.renderCombatScreen(g.node);
    if (this.autoCombat) this.performAutoAction(g.node);
  },

  advanceGauntlet() {
    const g = Game.gauntlet;
    const s = Combat.state;
    const goldReward = Game.addGold(rand(s.enemy.gold[0], s.enemy.gold[1]));
    const xpReward = Math.max(4, Math.round(s.enemy.maxHp * 0.6));
    const levelResult = Game.grantXp(xpReward);

    if (g.waveIndex >= g.totalWaves) {
      const pdata = Persistent.load();
      pdata.ownedLegendaries.push(g.legendaryId);
      const legendaryItem = instantiateLegendary(g.legendaryId);
      pdata.inventory.push(legendaryItem);
      if (Persistent.getCharacter(Game.player.classId).autoEquip) this.autoEquipBestGear(Game.player.classId);
      Persistent.save();
      Game.gauntlet = null;
      this.showLegendaryReward(legendaryItem, { goldReward, xpReward, levelResult });
    } else {
      Game.heal(Math.round(Game.effectiveStats().maxHp * 0.08));
      g.waveIndex += 1;
      this.showWaveCleared(g, { goldReward, xpReward, levelResult });
    }
  },

  showWaveCleared(g, reward) {
    const lines = [`Wave ${g.waveIndex - 1} of ${g.totalWaves} cleared.`, ...this.rewardLines(reward), 'A short respite heals you before the next wave.'];
    this.root.innerHTML = `
      ${this.renderHud()}
      ${this.renderZoneBanner()}
      <div class="panel legendary-encounter">
        <h2>Legendary Encounter - Wave ${g.waveIndex} of ${g.totalWaves}</h2>
        <div class="outcome-box">${lines.join('<br>')}</div>
        <button class="btn-primary" id="btn-next-wave">Continue the Gauntlet</button>
      </div>`;
    document.getElementById('btn-next-wave').addEventListener('click', () => this.showRelicChoice(() => this.startGauntletWave()));
  },

  showLegendaryReward(item, reward) {
    const def = LEGENDARY_ITEMS[item.defId];
    const lines = [
      `You have cleared the gauntlet!`,
      ...this.rewardLines(reward),
      `<strong style="color:${RARITIES.legendary.color}">${item.icon} ${item.name}</strong> (${def.universe}) is yours.`,
      def.desc,
      'Visit the Sanctuary to equip it.'
    ];
    this.root.innerHTML = `
      ${this.renderHud()}
      ${this.renderZoneBanner()}
      <div class="panel legendary-encounter">
        <h2>Legendary!</h2>
        <div class="outcome-box">${lines.join('<br>')}</div>
        <button class="btn-primary" id="btn-continue">Continue</button>
      </div>`;
    document.getElementById('btn-continue').addEventListener('click', () => this.showRelicChoice(() => this.showMap()));
  },

  // ---------------- Event ----------------
  showEvent(node) {
    const event = pickRandomEvent();
    node.eventRef = event;
    this.root.innerHTML = `
      ${this.renderHud()}
      ${this.renderZoneBanner()}
      <div class="panel">
        <h2>${event.title}</h2>
        <p class="flavor">${event.text}</p>
        <div class="choice-list" id="choice-list">
          ${event.choices.map((c, i) => `<button class="choice-btn" data-idx="${i}">${c.label}</button>`).join('')}
        </div>
        <div id="outcome-slot"></div>
      </div>`;
    this.root.querySelectorAll('.choice-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.idx, 10);
        const outcome = event.choices[idx].outcome(Game.player);
        const lines = applyOutcome(outcome);
        Game.grantProfessionXp(rand(4, 9));
        this.refreshHud();
        this.root.querySelectorAll('.choice-btn').forEach(b => b.disabled = true);
        document.getElementById('outcome-slot').innerHTML = `
          <div class="outcome-box">${lines.join('<br>')}</div>
          <button class="btn-primary" id="btn-continue" style="margin-top:10px">Continue</button>`;
        this.checkDeathThen(() => this.showMap());
      });
    });
    this.maybeShowTutorial('event');
  },

  // ---------------- Treasure ----------------
  showTreasure(node) {
    const reward = generateTreasureReward();
    const lines = applyOutcome({ text: 'You discover a cache of treasure.', gold: reward.gold, relic: reward.relic, item: reward.item });
    if (reward.bonusRelic) {
      Game.player.relics.push(reward.bonusRelic);
      lines.push(`Your archaeological eye spots something buried deeper: ${RELICS[reward.bonusRelic].name}!`);
    }
    Game.grantProfessionXp(rand(4, 9));
    if (this.autoCombat) {
      const parts = [`+${reward.gold}🪙`];
      if (reward.relic) parts.push(RELICS[reward.relic].name);
      if (reward.item) parts.push(ITEMS[reward.item].name);
      if (reward.bonusRelic) parts.push(RELICS[reward.bonusRelic].name);
      this.showAutoToast(`<strong>Treasure!</strong><div class="small-text">${parts.join(' · ')}</div>`);
      this.showMap();
      return;
    }
    this.root.innerHTML = `
      ${this.renderHud()}
      ${this.renderZoneBanner()}
      <div class="panel">
        <h2>Treasure</h2>
        <div class="outcome-box">${lines.join('<br>')}</div>
        <button class="btn-primary" id="btn-continue">Continue</button>
      </div>`;
    document.getElementById('btn-continue').addEventListener('click', () => this.showMap());
    this.maybeShowTutorial('treasure');
  },

  // ---------------- Rest ----------------
  showRest(node) {
    const stats = Game.effectiveStats();
    const pdata = Persistent.load();
    const rec = Persistent.getCharacter(Game.player.classId);
    // Cooking/Fishing interconnection: Cooking's passive boosts how much HP
    // resting recovers at all (fed adventurers heal better); Fishing's own
    // passive is purely its catch chance below - the fish only become
    // Cooking XP if you actually cook one here.
    const cookingLevel = rec.profession.levels.cooking;
    const restHealMult = 1 + PROFESSION_PASSIVES.cooking.perLevelPct * (cookingLevel - 1);
    const healAmount = Math.round(stats.maxHp * 0.35 * restHealMult);
    const cookHealAmount = Math.round(stats.maxHp * 0.15 * restHealMult);
    const fishOwned = pdata.materials.fish;
    this.root.innerHTML = `
      ${this.renderHud()}
      ${this.renderZoneBanner()}
      <div class="panel">
        <h2>Campfire</h2>
        <p class="flavor">You may rest here before continuing your adventure.</p>
        <div class="rest-option">
          <div class="desc">🔥 Rest and recover ${healAmount} HP</div>
          <button class="btn-secondary" id="btn-rest-heal">Choose</button>
        </div>
        <div class="rest-option">
          <div class="desc">⏱️ Meditate: reduce your skill's cooldown by 1 (min 1) permanently</div>
          <button class="btn-secondary" id="btn-rest-skill">Choose</button>
        </div>
        <div class="rest-option">
          <div class="desc">🍳 Cook a fish over the fire: +${cookHealAmount} HP and bonus Cooking XP ${fishOwned ? `(${fishOwned} 🐟 owned)` : '(no fish owned)'}</div>
          <button class="btn-secondary" id="btn-rest-cook" ${fishOwned ? '' : 'disabled'}>Choose</button>
        </div>
        <div id="outcome-slot"></div>
      </div>`;
    // Picking any option returns straight to the map - no separate Continue
    // click needed. The outcome shows as a self-dismissing toast (see
    // showAutoToast) instead of a full screen.
    const finish = (text) => {
      this.showMap();
      this.showAutoToast(text);
    };
    // Fishing passive: an independent chance to catch a fish whenever you
    // rest at all, regardless of which option you pick.
    const tryCatchFish = () => {
      const fishingLevel = rec.profession.levels.fishing;
      const chance = 0.1 + PROFESSION_PASSIVES.fishing.perLevelPct * (fishingLevel - 1);
      if (Math.random() >= chance) return false;
      pdata.materials.fish += 1;
      Persistent.save();
      return true;
    };
    document.getElementById('btn-rest-heal').addEventListener('click', () => {
      Game.heal(healAmount);
      Game.grantProfessionXp(rand(4, 9));
      const caught = tryCatchFish();
      finish(`You rest by the fire. +${healAmount} HP.${caught ? ' You catch a fish while resting!' : ''}`);
    });
    document.getElementById('btn-rest-skill').addEventListener('click', () => {
      Game.player.skills.forEach(sk => { sk.cooldown = Math.max(1, sk.cooldown - 1); });
      Game.grantProfessionXp(rand(4, 9));
      const caught = tryCatchFish();
      finish(`Every equipped skill's cooldown is reduced by 1.${caught ? ' You catch a fish while resting!' : ''}`);
    });
    const cookBtn = document.getElementById('btn-rest-cook');
    if (cookBtn) cookBtn.addEventListener('click', () => {
      pdata.materials.fish -= 1;
      Game.heal(cookHealAmount);
      Game.grantProfessionXp(rand(4, 9));
      grantSpecificProfessionXp(rec, 'cooking', 15);
      Persistent.save();
      finish(`You cook your catch over the fire. +${cookHealAmount} HP, +15 Cooking XP.`);
    });
    this.maybeShowTutorial('rest');
  },

  // ---------------- Shop ----------------
  showShop(node) {
    if (!node.stock) node.stock = generateShopStock();
    this.renderShopScreen(node);
  },

  renderShopScreen(node) {
    const rows = node.stock.map((entry, idx) => {
      const info = entry.kind === 'item' ? ITEMS[entry.id] : RELICS[entry.id];
      const owned = entry.bought;
      return `
        <div class="shop-item">
          <div class="desc"><span>${info.icon}</span><div><strong>${info.name}</strong><div class="small-text">${info.desc}</div></div></div>
          <div>
            <span class="price">${entry.price} 🪙</span>
            <button class="btn-secondary" data-idx="${idx}" ${owned ? 'disabled' : ''}>${owned ? 'Bought' : 'Buy'}</button>
          </div>
        </div>`;
    }).join('');

    this.root.innerHTML = `
      ${this.renderHud()}
      ${this.renderZoneBanner()}
      <div class="panel">
        <h2>Traveling Shop</h2>
        <p class="flavor">Spend your gold wisely before the adventure continues.</p>
        ${rows}
        <button class="btn-primary" id="btn-leave-shop" style="margin-top:6px">Leave Shop</button>
      </div>`;

    this.root.querySelectorAll('.shop-item button').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.idx, 10);
        const entry = node.stock[idx];
        if (entry.bought || Game.player.gold < entry.price) return;
        Game.player.gold -= entry.price;
        entry.bought = true;
        if (entry.kind === 'item') Game.player.items.push(entry.id);
        else Game.player.relics.push(entry.id);
        this.renderShopScreen(node);
      });
    });
    document.getElementById('btn-leave-shop').addEventListener('click', () => this.showMap());
    this.maybeShowTutorial('shop');
  },

  // ---------------- Combat ----------------
  enterCombat(node, enemyTemplate) {
    this.currentCombatNode = node; // so the shared HUD's AUTO toggle (see init) can resume auto-play from anywhere
    Combat.start(enemyTemplate);
    this.renderCombatScreen(node);
    if (this.autoCombat) this.performAutoAction(node);
  },

  // Which "ability glow" flavor plays on the player's portrait when they use
  // their class Skill (not a basic Attack) - see the anim-skill-<flavor> CSS.
  // Mage/Warlock don't need an entry for their basic Attack here - that's
  // handled separately below by rendering an actual magic-ball projectile
  // instead of the default melee lunge.
  classAbilityVfx: {
    warrior: 'rage', barbarian: 'rage', paladin: 'holy', cleric: 'holy',
    rogue: 'shadow', bard: 'shine', hunter: 'nature', warlock: 'fel', mage: 'arcane'
  },
  magicBallColor: { mage: '#3fa9ff', warlock: '#9b30ff' },

  // `kind` is the plain anim tag from Combat.state.anim ('attack'/'skill'/'hit'/
  // 'death'/'heal'); `isPlayer` layers class-specific flavor on top for the
  // player's own portrait only (skill glow color, and suppressing the normal
  // lunge for Mage/Warlock's basic Attack since they get a projectile instead).
  animClass(kind, isPlayer) {
    if (!kind) return '';
    if (isPlayer && kind === 'attack' && this.magicBallColor[Game.player.classId]) return '';
    let cls = `anim-${kind}`;
    if (isPlayer && kind === 'skill') cls += ` anim-skill-${this.classAbilityVfx[Game.player.classId] || 'default'}`;
    // Basic Attacks get the same class-flavor glow layered onto the lunge
    // (see .portrait[class*="anim-attack-"] in styles.css) so every physical
    // class's own attack reads distinctly, not just their Skill.
    if (isPlayer && kind === 'attack') cls += ` anim-attack-${this.classAbilityVfx[Game.player.classId] || 'default'}`;
    return cls;
  },

  // A recruited companion's portrait (with ITS OWN pet/mount, frozen in at
  // recruit time - see recruitCompanionFromSave) - like renderCompanionRig
  // but takes explicit ids instead of reading Persistent.getCharacter(),
  // since a companion's pet/mount come from someone else's save, not ours.
  renderRecruitedCompanionRig(companion, sizePx, pulsing) {
    const riderSvg = anyCharacterSvg(companion.classId, sizePx);
    const mountSvg = companion.mountId ? anyCharacterSvg(companion.mountId, Math.round(sizePx * 0.8)) : '';
    const petSvg = companion.petId ? anyCharacterSvg(companion.petId, Math.round(sizePx * 0.5)) : '';
    const nameplate = `<span class="nameplate">${escapeHtml(companion.name)}</span>`;
    return `<span class="companion-row">` +
      (mountSvg ? `<span class="companion-mount">${mountSvg}</span>` : '') +
      `<span class="companion-rider ${pulsing ? 'companion-pulse' : ''}">${nameplate}${riderSvg}</span>` +
      (petSvg ? `<span class="companion-pet">${petSvg}</span>` : '') +
      `</span>`;
  },

  // Equipped companions ("in group", up to 4) fight alongside the player in
  // every adventure/dungeon/raid encounter - a flat stat contribution (see
  // companionGroupStatBonus in progression.js), not an independently
  // controlled combatant, so there's nothing for the player to click for
  // them. They still visually act: whenever the player takes any action,
  // every companion portrait pulses in sync (see the .companion-pulse CSS).
  renderCompanionParty(pulsing) {
    if (Game.raid) return ''; // raids render their own party row (ghosts or real companions) below
    const companions = getEquippedCompanions();
    if (!companions.length) return '';
    return `<div class="raid-party">
      ${companions.map(c => `
        <div class="raid-ghost companion-card">
          ${this.renderRecruitedCompanionRig(c, 26, pulsing)}
          <div class="small-text">Lv.${c.level} ${CLASSES[c.classId].name}</div>
        </div>`).join('')}
    </div>`;
  },

  renderCombatScreen(node) {
    const s = Combat.state;
    const p = Game.player;
    const stats = Game.effectiveStats();
    const usableItems = [...new Set(p.items)];
    const inputLocked = s.locked || this.autoCombat;

    const inGauntlet = !!Game.gauntlet;
    const inRaid = !!Game.raid;
    const inDungeon = !!Game.dungeon;
    const inPvp = !!Game.pvp;

    // Consumed-once transients: rendered on this pass, then cleared so a
    // later re-render (e.g. the enemy's reply 700ms later) doesn't repeat
    // them. See Combat.resolveAfterPlayerHit for where these get set.
    const critText = s.critText;
    s.critText = null;
    // The health bar hit-shake/flash (see Combat.resolveAfterPlayerHit and
    // resolveEnemyTurn) - `pct` (how big a bite this hit took out of that
    // side's own max HP) drives --flash-intensity, so a huge crit shakes and
    // flashes noticeably harder than a glancing hit. Floor of 0.4 so even a
    // tiny hit still reads as "something happened."
    const hpFlash = s.hpFlash;
    s.hpFlash = null;
    const hpFlashClass = (side) => (hpFlash && hpFlash.target === side) ? 'hp-bar-hit' : '';
    const hpFlashStyleAttr = (side) => (hpFlash && hpFlash.target === side)
      ? ` style="--flash-intensity:${(0.4 + Math.min(1, hpFlash.pct) * 3).toFixed(2)}"` : '';
    // Which companion(s) landed a hit this round (see
    // Combat.resolveCompanionAttacks) - consumed once so the lunge/glow only
    // plays on the render right after it happens, same pattern as critText.
    const companionAnim = s.companionAnim;
    s.companionAnim = null;
    // Which weapon-bearing slot this Attack swung (see pickAttackWeaponSlot in
    // combat.js) - consumed once, same pattern as critText/hpFlash, so the
    // portrait reverts to the resting mainHand look on the next render.
    const weaponSlot = s.anim.weaponSlot;
    s.anim.weaponSlot = null;
    const isRangedAttack = s.anim.player === 'attack' && weaponSlot === 'ranged';
    const ballColor = s.anim.player === 'attack' ? this.magicBallColor[p.classId] : null;
    // Fireball gets its own fire-colored, flickering projectile (see
    // .fireball-projectile in styles.css) instead of the plain glow every
    // other skill gets - keyed to the SPELL being cast, not the class, since
    // Fireball can be bought and equipped by any class via the Bank Shop.
    const isFireballCast = s.anim.player === 'skill' && s.anim.castSkillId === 'fireball';

    const theme = getActTheme(Game.act || 1);
    this.root.innerHTML = `
      ${this.renderHud()}
      ${this.renderZoneBanner()}
      <div class="panel ${inGauntlet || inRaid || inDungeon || inPvp ? 'legendary-encounter' : ''}">
        ${inGauntlet ? `<div class="gauntlet-banner">👑 Legendary Encounter - Wave ${Game.gauntlet.waveIndex} of ${Game.gauntlet.totalWaves}</div>` : ''}
        ${inPvp ? `<div class="gauntlet-banner">⚔️ PvP Match - Mirror of Yourself</div>` : ''}
        ${s.enemy.rivalGhost ? `<div class="gauntlet-banner">👻 Rival Ghost Encounter - ${s.enemy.flavor}</div>` : ''}
        ${inDungeon ? `<div class="gauntlet-banner">🗝️ Dungeon - ${DUNGEONS.find(d => d.id === Game.dungeon.dungeonId).name}</div>` : ''}
        ${inRaid ? `
          <div class="gauntlet-banner">🏰 Raid - ${RAID_BOSSES.find(b => b.id === Game.raid.bossId).name}</div>
          <div class="raid-party">
            ${Game.raid.ghosts.map(g => `
              <div class="raid-ghost">
                <span class="sprite-mini">${anyCharacterSvg(g.classId, 26)}</span>
                <div class="small-text">👻 ${escapeHtml(g.name)}<br>Lv.${g.level} ${CLASSES[g.classId].name}</div>
              </div>`).join('')}
            ${(Game.raid.companions || []).map(c => `
              <div class="raid-ghost companion-card">
                ${this.renderRecruitedCompanionRig(c, 26, !!s.anim.player)}
                <div class="small-text">Lv.${c.level} ${CLASSES[c.classId].name}</div>
              </div>`).join('')}
          </div>
        ` : ''}
        ${this.renderCompanionParty(!!s.anim.player)}
        <div class="combat-arena">
          <div class="combatant player">
            <div class="portrait ${this.animClass(s.anim.player, true)}">${renderCompanionRig(p.classId, PLAYER_SPRITE_SIZE, companionAnim, weaponSlot)}</div>
            <div class="hp-bar-container">
              <div class="hp-bar-wrap ${hpFlashClass('player')}"${hpFlashStyleAttr('player')}><div class="hp-bar-fill" style="width:${Math.round((p.hp/stats.maxHp)*100)}%"></div></div>
            </div>
            <div class="hp-label">${Math.max(0, Math.round((p.hp/stats.maxHp)*100))}%</div>
          </div>
          <div class="combatant enemy ${s.enemy.elite ? 'elite' : ''} ${s.enemy.boss ? 'boss' : ''} ${s.enemy.spectral ? 'spectral' : ''}">
            <div class="portrait ${this.animClass(s.anim.enemy, false)}" style="${!s.enemy.spectral ? `filter:${theme.enemyTint}` : ''}">
              <span class="nameplate">${escapeHtml(s.enemy.name)}</span>
              ${anyCharacterSvg(s.enemy.id, epicEnemySize(s.enemy))}
            </div>
            <div class="hp-bar-container">
              <div class="hp-bar-wrap ${hpFlashClass('enemy')}"${hpFlashStyleAttr('enemy')}><div class="hp-bar-fill" style="width:${Math.round((s.enemy.hp/s.enemy.maxHp)*100)}%"></div></div>
              ${critText ? `<div class="floating-crit">CRITICAL!<br>-${critText.dmg}</div>` : ''}
            </div>
            <div class="hp-label">${Math.max(0, Math.round((s.enemy.hp/s.enemy.maxHp)*100))}%</div>
          </div>
          ${ballColor ? `<div class="magic-ball" style="--ball-color:${ballColor}"></div>` : ''}
          ${isFireballCast ? `<div class="fireball-projectile"></div>` : ''}
          ${isRangedAttack ? `<div class="arrow-shot"></div>` : ''}
        </div>

        <div class="combat-log" id="combat-log">${s.log.map(l => `<div>${l}</div>`).join('')}</div>

        ${s.over ? (this.autoCombat ? '' : `
          <button class="btn-primary" id="btn-combat-continue">Continue</button>
        `) : `
          <div class="combat-actions">
            <button id="act-attack" ${inputLocked ? 'disabled' : ''}>Attack</button>
            ${p.skills.map((skill, i) => `
              <button data-skill-index="${i}" ${inputLocked || skill.cooldownLeft > 0 ? 'disabled' : ''}>${skill.icon ? `<img src="${skill.icon}" width="18" height="18" alt="" class="btn-icon">` : ''}${skill.name}${skill.level > 1 ? ` <span class="small-text">Lv.${skill.level}</span>` : ''}${skill.cooldownLeft > 0 ? ` (${skill.cooldownLeft})` : ''}</button>
            `).join('')}
            <button id="act-flee" ${inputLocked || s.enemy.boss || inGauntlet || stats.fleeDisabled ? 'disabled' : ''} title="${stats.fleeDisabled ? 'A curse binds your feet' : ''}">Flee</button>
          </div>
          <div class="item-row" id="item-row">
            ${usableItems.length === 0 ? '<span class="small-text">No items</span>' : usableItems.map(id => {
              const info = ITEMS[id] || (id === 'honorPotion' ? HONOR_SHOP.potion : null);
              if (!info) return '';
              return `<button class="item-chip" data-item="${id}" ${inputLocked ? 'disabled' : ''}>${info.icon} ${info.name} (${p.items.filter(i=>i===id).length})</button>`;
            }).join('')}
          </div>
        `}
      </div>`;

    const log = document.getElementById('combat-log');
    if (log) log.scrollTop = log.scrollHeight;

    if (s.anim.enemy === 'attack' && BOSS_ART[s.enemy.id]) {
      const portraitImg = this.root.querySelector('.combatant.enemy .boss-portrait-sprite');
      if (portraitImg) this.playBossAttackAnimation(portraitImg, BOSS_ART[s.enemy.id].attackFrames);
    }

    if (s.over) {
      if (this.autoCombat) setTimeout(() => { if (Game.player && Combat.state === s) this.resolveCombatEnd(node); }, 500);
      else document.getElementById('btn-combat-continue').addEventListener('click', () => this.resolveCombatEnd(node));
      return;
    }

    if (inputLocked) return;

    document.getElementById('act-attack').addEventListener('click', () => this.runPlayerAction(node, () => Combat.playerAttack()));
    this.root.querySelectorAll('[data-skill-index]').forEach(btn => {
      btn.addEventListener('click', () => this.runPlayerAction(node, () => Combat.playerSkill(Number(btn.dataset.skillIndex))));
    });
    document.getElementById('act-flee').addEventListener('click', () => this.runPlayerAction(node, () => Combat.playerFlee()));
    this.root.querySelectorAll('.item-chip').forEach(chip => {
      chip.addEventListener('click', () => this.runPlayerAction(node, () => Combat.playerItem(chip.dataset.item)));
    });
    this.maybeShowTutorial('combat');
  },

  // Resolves one full round in two beats: the player's action renders immediately
  // (locking input), then, if the fight continues, the enemy's reply renders after
  // a short delay so the two animations read as a sequence rather than a jump cut.
  // Every round ends by checking whether Auto should keep going, regardless of
  // whether this particular round was started manually or by Auto itself -
  // otherwise flipping Auto on mid-round (during the enemy-reply pause) would
  // leave combat stuck waiting for input that never comes.
  runPlayerAction(node, actionFn) {
    actionFn();
    this.renderCombatScreen(node);
    const s = Combat.state;
    if (!s.over && s.locked) {
      setTimeout(() => {
        // The run/match this timer belongs to may have already ended (e.g.
        // the player abandoned the run) before this fires - Combat.state is
        // nulled out or replaced by a new combat's state in that case, so
        // bail rather than act on stale state with a null Game.player.
        if (!Game.player || Combat.state !== s) return;
        Combat.resolveEnemyTurn();
        this.renderCombatScreen(node);
        this.continueAutoIfEnabled(node);
      }, 700);
    } else {
      this.continueAutoIfEnabled(node);
    }
  },

  // Plays a boss's PixelLab attack animation (see BOSS_ART in sprites.js)
  // over its enemy portrait during its own turn - recursive setTimeout rather
  // than setInterval so a stray tick after the next re-render (which tears
  // down and rebuilds the whole combat screen) just finds the element
  // detached and quietly stops instead of touching a stale node.
  playBossAttackAnimation(imgEl, frames) {
    let i = 0;
    const step = () => {
      if (!imgEl.isConnected) return;
      imgEl.src = frames[i];
      i++;
      if (i < frames.length) setTimeout(step, 90);
    };
    step();
  },

  continueAutoIfEnabled(node) {
    if (this.autoCombat && Combat.state && !Combat.state.over) {
      setTimeout(() => this.performAutoAction(node), 500);
    }
  },

  decideAutoAction() {
    const p = Game.player;
    const stats = Game.effectiveStats();
    if (p.hp < stats.maxHp * 0.35) {
      if (p.items.includes('bigPotion')) return { type: 'item', id: 'bigPotion' };
      if (p.items.includes('potion')) return { type: 'item', id: 'potion' };
      if (p.items.includes('antidote')) return { type: 'item', id: 'antidote' };
    }
    // Among every equipped skill off cooldown, favor the one with the
    // highest base cooldown as a proxy for "biggest hit" - bigger spells
    // consistently carry longer cooldowns in this game's design.
    let bestIndex = -1, bestCooldown = -1;
    p.skills.forEach((sk, i) => {
      if (sk.cooldownLeft === 0 && sk.cooldown > bestCooldown) { bestIndex = i; bestCooldown = sk.cooldown; }
    });
    if (bestIndex !== -1) return { type: 'skill', index: bestIndex };
    return { type: 'attack' };
  },

  performAutoAction(node) {
    if (!this.autoCombat) return;
    const s = Combat.state;
    if (!s || s.over || s.locked) return;
    const action = this.decideAutoAction();
    const fn = action.type === 'skill' ? () => Combat.playerSkill(action.index)
      : action.type === 'item' ? () => Combat.playerItem(action.id)
      : () => Combat.playerAttack();
    this.runPlayerAction(node, fn);
  },

  // A small self-dismissing toast (not a full-screen panel) - what AUTO
  // shows instead of the normal victory/reward screen, so the run keeps
  // moving without a click. Re-uses one persistent DOM node so back-to-back
  // victories don't stack up a pile of toasts.
  // ---------------- Kyle the Bard (in-run tutorial) ----------------
  // Shows once ever per screen key (see TUTORIALS in data.js), the first
  // time that screen is actually reached - never again after that, and
  // never at all if "Skip Tutorials" is checked on the title screen or
  // AUTO is running (an overlay that only a tap dismisses would just stall
  // automated play). Call this as the LAST line of a screen's render
  // function, after its own content and event wiring are in place.
  maybeShowTutorial(key) {
    if (this.autoCombat) return;
    const pdata = Persistent.load();
    if (pdata.skipTutorials || pdata.kyleTutorialsSeen[key]) return;
    const tut = TUTORIALS[key];
    if (!tut) return;
    pdata.kyleTutorialsSeen[key] = true;
    Persistent.save();
    this.showKyleOverlay(tut);
  },

  // Appended to <body> (like showAutoToast/showSettingsModal) so it survives
  // independently of whatever screen is underneath, including one that
  // re-renders itself (combat) while Kyle is still up. Dismissed by a tap
  // ANYWHERE in the overlay - no close button, no timer.
  showKyleOverlay(tut) {
    const old = document.getElementById('kyle-overlay');
    if (old) old.remove();
    const overlay = document.createElement('div');
    overlay.id = 'kyle-overlay';
    overlay.className = 'kyle-overlay';
    overlay.innerHTML = `
      <div class="kyle-card">
        <img src="assets/sprites/kyle.png" class="kyle-portrait" alt="Kyle">
        <div class="kyle-textbox">
          <div class="kyle-name">Kyle</div>
          ${tut.lines.map(l => `<p>${l}</p>`).join('')}
          <div class="kyle-hint">(tap anywhere to continue)</div>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    overlay.addEventListener('click', () => overlay.remove());
  },

  showAutoToast(html, durationMs) {
    let el = document.getElementById('auto-toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'auto-toast';
      el.className = 'auto-toast';
      document.body.appendChild(el);
    }
    el.classList.remove('auto-toast-hide');
    el.innerHTML = html;
    clearTimeout(this._autoToastTimer);
    this._autoToastTimer = setTimeout(() => { el.classList.add('auto-toast-hide'); }, durationMs || 3200);
  },

  // Compact "what just happened" line for the toast - the same facts
  // rewardLines() spells out in full sentences, just condensed to one row.
  autoToastSummary(title, reward) {
    const parts = [`+${reward.goldReward}🪙`, `+${reward.xpReward}✨`];
    if (reward.levelResult && reward.levelResult.levelsGained > 0) parts.push(`Level ${Persistent.getCharacter(Game.player.classId).level}!`);
    if (reward.loot) parts.push(`${reward.loot.icon} ${reward.loot.name}`);
    if (reward.material) parts.push(`+${reward.material.amount} ${reward.material.kind}`);
    if (reward.recipeItem) parts.push(`📜 ${reward.recipeItem.name}`);
    if (reward.honor) parts.push(`+${reward.honor} Honor`);
    if (reward.bloodyBagAwarded) parts.push(`${CONTAINERS.bloodyBag.icon} Bloody Bag`);
    return `<strong>${title}</strong><div class="small-text">${parts.join(' · ')}</div>`;
  },

  // AUTO's stand-in for showRelicChoice - picks one of the same 3 candidates
  // at random rather than pausing for a click.
  autoRelicChoice(onDone) {
    const choiceIds = pickRelicChoices(Game.player.classId, 3);
    Game.player.relics.push(choiceIds[rand(0, choiceIds.length - 1)]);
    onDone();
  },

  resolveCombatEnd(node) {
    const s = Combat.state;
    if (Game.isDead()) {
      if (Game.pvp) { this.showPvpOutcome(false); return; }
      if (Game.dungeon) { this.showDungeonOutcome(false); return; }
      if (Game.raid) { this.showRaidOutcome(false); return; }
      Game.gauntlet = null;
      Game.recordRunEnd(false);
      this.showGameOver(false);
      return;
    }
    if (s.fled) { Game.gauntlet = null; this.showMap(); return; }
    if (s.victory) {
      if (Game.pvp) { this.showPvpOutcome(true); return; }
      grantReputation(getActTheme(Game.act).id, s.enemy.boss ? 50 : s.enemy.elite ? 25 : 10);
      recordQuestProgress('kills', 1);
      if (s.enemy.boss && !s.enemy.rivalGhost) recordQuestProgress('bossKills', 1);
      else if (s.enemy.elite) recordQuestProgress('eliteKills', 1);
      if (Game.dungeon) { this.showDungeonOutcome(true); return; }
      if (Game.raid) { this.showRaidOutcome(true); return; }
      if (Game.gauntlet) { Game.grantProfessionXp(rand(4, 9)); this.advanceGauntlet(); return; }
      if (node.trialClassId) { Game.grantProfessionXp(rand(4, 9)); this.resolveClassTrialVictory(node); return; }
      if (node.tamingCombat) {
        const goldReward = Game.addGold(rand(s.enemy.gold[0], s.enemy.gold[1]));
        const xpReward = Math.max(4, Math.round(s.enemy.maxHp * 0.6));
        const levelResult = Game.grantXp(xpReward);
        this.grantTamingReward(node, false, { goldReward, xpReward, levelResult });
        return;
      }
      if (node.rivalGhost) {
        Game.grantProfessionXp(rand(4, 9));
        const goldReward = Game.addGold(rand(s.enemy.gold[0], s.enemy.gold[1]));
        const xpReward = Math.max(4, Math.round(s.enemy.maxHp * 0.6));
        const levelResult = Game.grantXp(xpReward);
        const honorReward = rand(30, 55);
        const pdata = Persistent.load();
        pdata.honor += honorReward;
        pdata.inventory.push({
          uid: 'c' + Math.random().toString(36).slice(2, 10), defId: 'bloodyBag', slot: 'container',
          containerId: 'bloodyBag', name: CONTAINERS.bloodyBag.name, icon: CONTAINERS.bloodyBag.icon
        });
        Persistent.save();
        this.showCombatReward({ goldReward, xpReward, levelResult, honor: honorReward, bloodyBagAwarded: true }, s.enemy);
        return;
      }

      Game.grantProfessionXp(rand(4, 9));
      const goldReward = Game.addGold(rand(s.enemy.gold[0], s.enemy.gold[1]));
      const xpReward = Math.max(4, Math.round(s.enemy.maxHp * 0.6));
      const levelResult = Game.grantXp(xpReward);
      const loot = rollLootDrop(s.enemy);
      const material = rollMaterialDrop(s.enemy);
      const recipeItem = rollRecipeDrop();
      if (loot || material || recipeItem) {
        const pdata = Persistent.load();
        if (loot) pdata.inventory.push(loot);
        if (material) pdata.materials[material.kind] += material.amount;
        if (recipeItem) pdata.inventory.push(recipeItem);
        if (loot && Persistent.getCharacter(Game.player.classId).autoEquip) this.autoEquipBestGear(Game.player.classId);
        Persistent.save();
      }
      const reward = { goldReward, xpReward, levelResult, loot, material, recipeItem };

      if (node.type === 'boss') this.showActComplete(reward);
      else this.showCombatReward(reward, s.enemy);
    }
  },

  resolveClassTrialVictory(node) {
    const classId = node.trialClassId;
    const enemy = Combat.state.enemy;
    const pdata = Persistent.load();
    if (!pdata.unlockedClasses.includes(classId)) pdata.unlockedClasses.push(classId);
    const goldReward = Game.addGold(rand(enemy.gold[0], enemy.gold[1]));
    Persistent.save();
    if (this.autoCombat) {
      this.showAutoToast(`<strong>${CLASSES[classId].name} unlocked!</strong><div class="small-text">+${goldReward}🪙</div>`);
      this.autoRelicChoice(() => this.showMap());
      return;
    }
    this.root.innerHTML = `
      ${this.renderHud()}
      ${this.renderZoneBanner()}
      <div class="panel">
        <h2>Trial Complete!</h2>
        <div class="outcome-box">You have proven yourself worthy of the ${CLASSES[classId].name}.<br>
        <strong>${CLASSES[classId].name} unlocked!</strong> Choose it on your next adventure.<br>+${goldReward} Gold.</div>
        <button class="btn-primary" id="btn-continue">Continue</button>
      </div>`;
    document.getElementById('btn-continue').addEventListener('click', () => this.showRelicChoice(() => this.showMap()));
  },

  // Shown after every successful combat encounter (regular fights, bosses,
  // class trials, and each gauntlet wave) - a run-only boon, so it never
  // touches Persistent. `onDone` continues whatever flow was already in
  // progress (map, next act, next wave, etc).
  showRelicChoice(onDone) {
    const choiceIds = pickRelicChoices(Game.player.classId, 3);
    const choices = choiceIds.map(id => RELICS[id]);
    this.root.innerHTML = `
      ${this.renderHud()}
      ${this.renderZoneBanner()}
      <div class="panel relic-choice">
        <h2>Choose a Relic</h2>
        <p class="flavor">A run-bound boon - lost if you fall. Pick one, or move on.</p>
        <div class="relic-choice-grid">
          ${choices.map(r => `
            <button type="button" class="relic-card" data-relic="${r.id}">
              <div class="relic-icon">${r.icon}</div>
              <div class="relic-name">${r.name}</div>
              <div class="small-text">${r.desc}</div>
            </button>`).join('')}
        </div>
        <button class="btn-secondary" id="btn-skip-relic">Skip</button>
      </div>`;
    this.root.querySelectorAll('.relic-card').forEach(btn => {
      btn.addEventListener('click', () => {
        Game.player.relics.push(btn.dataset.relic);
        onDone();
      });
    });
    document.getElementById('btn-skip-relic').addEventListener('click', () => onDone());
    this.maybeShowTutorial('relic');
  },

  rewardLines(reward) {
    const lines = [`+${reward.goldReward} Gold, +${reward.xpReward} XP.`];
    if (reward.levelResult && reward.levelResult.levelsGained > 0) {
      lines.push(`Level up! Now level ${Persistent.getCharacter(Game.player.classId).level}.`);
    }
    if (reward.loot) lines.push(`Found <span style="color:${RARITIES[reward.loot.rarity].color}">${RARITIES[reward.loot.rarity].label} ${reward.loot.name}</span> (${SLOT_LABELS[reward.loot.slot] || reward.loot.slot}) - visit the Sanctuary to equip it.`);
    if (reward.material) lines.push(`Found ${reward.material.amount} ${reward.material.kind}.`);
    if (reward.honor) lines.push(`+${reward.honor} Honor.`);
    if (reward.recipeItem) lines.push(`Found a recipe: <span style="color:${RARITIES[reward.recipeItem.rarity]?.color || 'var(--accent)'}">${reward.recipeItem.name}</span>.`);
    if (reward.bloodyBagAwarded) lines.push(`Looted a ${CONTAINERS.bloodyBag.icon} Bloody Bag - open it from the Inventory tab.`);
    return lines;
  },

  showCombatReward(reward, enemy) {
    if (this.autoCombat) {
      this.showAutoToast(this.autoToastSummary(`Defeated ${enemy.name}`, reward));
      this.autoRelicChoice(() => this.showMap());
      return;
    }
    const lines = [`Defeated ${enemy.name}.`, ...this.rewardLines(reward)];
    this.root.innerHTML = `
      ${this.renderHud()}
      ${this.renderZoneBanner()}
      <div class="panel">
        <h2>Victory</h2>
        <div class="outcome-box">${lines.join('<br>')}</div>
        <button class="btn-primary" id="btn-continue">Continue</button>
      </div>`;
    document.getElementById('btn-continue').addEventListener('click', () => this.showRelicChoice(() => this.showMap()));
  },

  // The adventure is limitless - there's no final act. Every act completed
  // just pushes further into an ever-harder run (scaleEnemy scales
  // unbounded with Game.act) until the player eventually dies. Every 10th
  // act has a chance of inflicting a random curse that lasts the rest of
  // this run, on top of everything else getting harder.
  showActComplete(reward) {
    let cursedThisAct = null;
    if (Game.act % 10 === 0 && Math.random() < 0.7) {
      const curseId = pickNewCurse(Game.player.curses);
      Game.player.curses.push(curseId);
      cursedThisAct = CURSES[curseId];
    }
    const advance = () => {
      this.autoRelicChoice(() => {
        Game.act += 1;
        Game.startAct();
        this.showMap();
      });
    };
    if (this.autoCombat) {
      let toastHtml = this.autoToastSummary(`Act ${Game.act} Complete`, reward);
      if (cursedThisAct) toastHtml += `<div class="small-text" style="color:#c0392b">Cursed: ${cursedThisAct.icon} ${cursedThisAct.name}</div>`;
      this.showAutoToast(toastHtml);
      advance();
      return;
    }
    const lines = ['You struck down the act boss.', ...this.rewardLines(reward)];
    if (cursedThisAct) lines.push(`<strong style="color:#c0392b">A curse falls upon you: ${cursedThisAct.icon} ${cursedThisAct.name}</strong> - ${cursedThisAct.desc}`);
    this.root.innerHTML = `
      ${this.renderHud()}
      ${this.renderZoneBanner()}
      <div class="panel">
        <h2>Act ${Game.act} Complete</h2>
        <div class="outcome-box">${lines.join('<br>')}</div>
        <button class="btn-primary" id="btn-next">Adventure Onward</button>
      </div>`;
    document.getElementById('btn-next').addEventListener('click', () => {
      this.showRelicChoice(() => {
        Game.act += 1;
        Game.startAct();
        this.showMap();
      });
    });
  },

  // ---------------- Game over ----------------
  showGameOver(victory) {
    const pdata = Persistent.load();
    this.root.innerHTML = `
      <div class="center-screen">
        <h1 class="result-title ${victory ? 'victory' : 'defeat'}">${victory ? 'Victory!' : 'You Have Fallen'}</h1>
        <p class="flavor">${victory
          ? 'You survived the adventure and emerged with your legend intact.'
          : `Your journey ends on Act ${Game.act}, having explored ${Game.visitedNodes.length} rooms.`}</p>
        <div class="meta-stats">
          <span>Gold collected: ${Game.player.gold}</span>
          <span>Deposited to bank: ${Game.goldEarnedThisRun} 🪙</span>
          <span>Bank total: ${pdata.bankGold} 🪙</span>
        </div>
        <p class="small-text">Your level, gear, and bank gold all carried over - only this run's in-pocket gold and relics were lost.</p>
        <button class="btn-primary" id="btn-again">Begin New Adventure</button>
        <button class="btn-secondary" id="btn-sanctuary-from-over">Visit Sanctuary</button>
      </div>`;
    document.getElementById('btn-again').addEventListener('click', () => this.showTitle());
    document.getElementById('btn-sanctuary-from-over').addEventListener('click', () => this.showSanctuary());
  },

  // ---------------- Sanctuary (persistent hub: character, inventory, blacksmith, shop) ----------------
  showSanctuary(classId, tab) {
    const unlockedClasses = Object.values(CLASSES).filter(c => isClassUnlocked(c.id));
    classId = classId && isClassUnlocked(classId) ? classId : unlockedClasses[0].id;
    tab = tab || 'character';
    if (tab === 'cheats' && !Persistent.load().showCheats) tab = 'character';
    // Whichever character the player last actually looked at is who the
    // AFK/idle system (computeAfkProgress) advances next time the game opens.
    Persistent.load().lastPlayedClassId = classId;
    if (tab !== 'character') this.selectedArmorySlot = null;
    // Collapsible <details> sections (see the .shop-category convention)
    // re-render from scratch on every interaction, which would otherwise
    // reset them all to closed - capture which ones (by their data-key) are
    // open now so they can be restored below, after the new body is in.
    const openDetailKeys = Array.from(this.root.querySelectorAll('.sanctuary-body details[open]')).map(d => d.dataset.key);
    // Every Sanctuary interaction re-renders the whole screen via innerHTML,
    // which otherwise snaps the page back to the top - capture/restore the
    // scroll position around that swap so clicking anything inside a long
    // tab (or an open dropdown) doesn't visually yank the view. The tab body
    // scrolls internally (.sanctuary-body has its own overflow-y), not the
    // window, so it's that element's scrollTop that needs preserving.
    const prevBodyEl = this.root.querySelector('.sanctuary-body');
    const bodyScrollTop = prevBodyEl ? prevBodyEl.scrollTop : 0;
    const pdata = Persistent.load();
    const rec = Persistent.getCharacter(classId);

    // A button opening a popup list instead of one tab per class - scales to
    // any number of unlocked classes without the row of buttons growing (and
    // wrapping) on narrow/mobile screens.
    const classPicker = `
      <button type="button" class="class-picker" id="btn-open-class-picker">
        <span class="sprite-mini">${characterSpriteFor(classId, 30)}</span>
        <span class="class-picker-label">${CLASSES[classId].name} (Lv.${rec.level})</span>
        <span class="class-picker-caret">▾</span>
      </button>`;

    // The XP bar is for the CURRENTLY SELECTED character specifically (not a
    // sum across characters) - shown once here so every tab has it, instead
    // of only the Character tab.
    const xpNeed = xpForLevel(rec.level);
    const xpPct = rec.level >= MAX_LEVEL ? 100 : Math.min(100, Math.round((rec.xp / xpNeed) * 100));
    const xpBar = `
      <div class="sanctuary-xp-bar">
        <div class="small-text">${CLASSES[classId].name} - Level ${rec.level}</div>
        <div class="xp-bar-wrap"><div class="xp-bar-fill" style="width:${xpPct}%"></div></div>
        <div class="small-text">${rec.level >= MAX_LEVEL ? 'Max level' : `${rec.xp} / ${xpNeed} XP`}</div>
      </div>`;

    // A quiet "something needs your attention" glow on the Quests tab button
    // when there's a ready-to-turn-in or newly-available quest.
    const questsNeedAttention = getAvailableQuests().length > 0 || getActiveQuests().some(q => isQuestReady(q.id));

    let body = '';
    if (tab === 'character') body = this.renderSanctuaryCharacter(classId) + this.renderSanctuaryTalents(classId);
    else if (tab === 'inventory') body = this.renderSanctuaryInventory(classId);
    else if (tab === 'professions') body = this.renderSanctuaryProfessions(classId);
    else if (tab === 'shop') body = this.renderSanctuaryShop();
    else if (tab === 'quests') body = this.renderSanctuaryQuests(classId);
    else if (tab === 'journal') body = this.renderSanctuaryJournal();
    else if (tab === 'raids') body = this.renderSanctuaryRaids(classId);
    else if (tab === 'house') body = this.renderSanctuaryHouse(classId);
    else if (tab === 'cheats') body = this.renderSanctuaryCheats(classId);
    else if (tab === 'pvp') body = this.renderSanctuaryPvp(classId);

    this.root.innerHTML = `
      <div class="sanctuary">
        <div class="sanctuary-header">
          <h2>Sanctuary</h2>
          <div class="bank-summary">
            <span>🎖️ ${pdata.honor} Honor</span>
          </div>
        </div>
        ${classPicker}
        ${xpBar}
        <div class="sanctuary-tabs">
          <button type="button" class="tab-btn ${tab === 'character' ? 'active' : ''}" data-tab="character">Character</button>
          <button type="button" class="tab-btn ${tab === 'pvp' ? 'active' : ''}" data-tab="pvp">PvP</button>
          <button type="button" class="tab-btn ${tab === 'inventory' ? 'active' : ''}" data-tab="inventory">Inventory</button>
          <button type="button" class="tab-btn ${tab === 'professions' ? 'active' : ''}" data-tab="professions">Professions</button>
          <button type="button" class="tab-btn ${tab === 'shop' ? 'active' : ''}" data-tab="shop">Shop</button>
          <button type="button" class="tab-btn ${tab === 'quests' ? 'active' : ''} ${questsNeedAttention ? 'tab-btn-glow' : ''}" data-tab="quests">Quests</button>
          <button type="button" class="tab-btn ${tab === 'journal' ? 'active' : ''}" data-tab="journal">Journal</button>
          <button type="button" class="tab-btn ${tab === 'raids' ? 'active' : ''}" data-tab="raids">Dungeons & Raids</button>
          <button type="button" class="tab-btn ${tab === 'house' ? 'active' : ''}" data-tab="house">🏠 House</button>
          ${pdata.showCheats ? `<button type="button" class="tab-btn tab-btn-cheat ${tab === 'cheats' ? 'active' : ''}" data-tab="cheats">🐞 Cheats</button>` : ''}
        </div>
        <div class="sanctuary-body">${body}</div>
        <button class="btn-secondary" id="btn-sanctuary-back">Back to Title</button>
      </div>`;

    // Restore whichever categories were open before this re-render (a
    // one-time-purchase row just vanishes from inside its still-open
    // section instead of the whole section snapping shut).
    openDetailKeys.forEach(key => {
      const el = this.root.querySelector(`.sanctuary-body details[data-key="${key}"]`);
      if (el) el.open = true;
    });
    const newBodyEl = this.root.querySelector('.sanctuary-body');
    if (newBodyEl) newBodyEl.scrollTop = bodyScrollTop;

    const classPickerBtn = document.getElementById('btn-open-class-picker');
    if (classPickerBtn) classPickerBtn.addEventListener('click', () => this.showClassSwitcherModal(classId, tab, unlockedClasses));
    this.root.querySelectorAll('.tab-btn').forEach(btn => btn.addEventListener('click', () => this.showSanctuary(classId, btn.dataset.tab)));
    document.getElementById('btn-sanctuary-back').addEventListener('click', () => this.showTitle());
    this.wireSanctuaryBodyEvents(classId, tab);
  },

  // One row in a tab's category list - a button opening showListModal for
  // that category, replacing the old inline <details>/<summary> pattern.
  categoryButtonRow(key, icon, label, countText) {
    return `<button type="button" class="category-btn" data-open-category="${key}">
      <span class="category-btn-icon">${icon}</span>
      <span class="category-btn-label">${label}</span>
      <span class="small-text">${countText}</span>
    </button>`;
  },

  // Generic "category" popup - the shared replacement for every inline
  // <details> list the Inventory/Professions/Shop tabs used to expand in
  // place. `renderBody()` returns the modal's inner list HTML; `wireBody`
  // attaches that category's own action handlers scoped to the modal (not
  // this.root) - each one mutates state, saves, then calls the `refresh`
  // it's given to redraw just the popup, so it stays open across multiple
  // actions instead of closing after each one. `onClose` (optional) runs
  // once, when the popup actually closes, to catch up the Sanctuary tab
  // underneath (updated gold/material counts, owned-item counts, etc).
  showListModal(title, renderBody, wireBody, onClose) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    const close = () => { overlay.remove(); if (onClose) onClose(); };
    const refresh = () => {
      overlay.innerHTML = `
        <div class="panel modal-panel">
          <h4>${title}</h4>
          ${renderBody()}
          <button class="btn-secondary" id="btn-close-list-modal" style="margin-top:14px">Close</button>
        </div>`;
      overlay.querySelector('#btn-close-list-modal').addEventListener('click', close);
      wireBody(overlay, refresh);
    };
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
    document.body.appendChild(overlay);
    refresh();
  },

  // Small blocking popup for "you tried to craft/upgrade/enchant/enter
  // something and don't have enough X" - every craft/upgrade click handler
  // that used to silently no-op on insufficient resources now calls this
  // instead so the player actually finds out why nothing happened.
  showInsufficientResourcesAlert(message) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    const close = () => overlay.remove();
    overlay.innerHTML = `
      <div class="panel modal-panel">
        <h4>⚠️ Not Enough Resources</h4>
        <p class="flavor">${message}</p>
        <button class="btn-primary" id="btn-close-insufficient-alert" style="margin-top:14px">OK</button>
      </div>`;
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
    overlay.querySelector('#btn-close-insufficient-alert').addEventListener('click', close);
    document.body.appendChild(overlay);
  },

  // The class-picker button's popup - every unlocked class as a clickable
  // row, replacing the old <select> dropdown. Picking one closes the popup
  // and re-renders the Sanctuary on that character, same tab as before.
  showClassSwitcherModal(currentClassId, tab, unlockedClasses) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    const close = () => overlay.remove();
    const rows = unlockedClasses.map(c => {
      const r = Persistent.getCharacter(c.id);
      const active = c.id === currentClassId;
      return `<div class="gear-row ${active ? 'profession-active' : ''}">
        <div class="desc"><span class="sprite-mini">${characterSpriteFor(c.id, 30)}</span><div>
          <strong>${c.name}</strong> <span class="small-text">Lv.${r.level}${active ? ' - Viewing' : ''}</span>
        </div></div>
        <button class="btn-secondary" data-switch-class="${c.id}" ${active ? 'disabled' : ''}>${active ? 'Current' : 'Switch'}</button>
      </div>`;
    }).join('');
    overlay.innerHTML = `
      <div class="panel modal-panel">
        <h4>Choose a Character</h4>
        ${rows}
        <button class="btn-secondary" id="btn-close-class-picker" style="margin-top:14px">Close</button>
      </div>`;
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
    overlay.querySelectorAll('[data-switch-class]').forEach(btn => {
      btn.addEventListener('click', () => { close(); this.showSanctuary(btn.dataset.switchClass, tab); });
    });
    overlay.querySelector('#btn-close-class-picker').addEventListener('click', close);
    document.body.appendChild(overlay);
  },

  // The House Feed button's popup - every owned food item as a clickable
  // row, replacing the old <select> + Feed button pair. Picking one feeds it
  // immediately and closes the popup.
  showFoodPickerModal(classId, kind, id) {
    const pdata = Persistent.load();
    const def = (kind === 'pet' ? PETS : MOUNTS)[id];
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    const close = () => overlay.remove();
    const render = () => {
      const foodItems = pdata.inventory.filter(i => i.slot === 'food');
      const rows = foodItems.map(food => `
        <div class="gear-row" style="border-left:3px solid ${RARITIES[food.rarity].color}">
          <div class="desc"><span>${food.icon}</span><div><strong style="color:${RARITIES[food.rarity].color}">${food.name}</strong>
          <div class="small-text">${RARITIES[food.rarity].label}</div></div></div>
          <button class="btn-secondary" data-feed-food-uid="${food.uid}">Feed</button>
        </div>`).join('') || '<p class="small-text">No food owned - cook some in Professions first.</p>';
      overlay.innerHTML = `
        <div class="panel modal-panel">
          <h4>Feed ${def.icon} ${def.name}</h4>
          ${rows}
          <button class="btn-secondary" id="btn-close-food-picker" style="margin-top:14px">Close</button>
        </div>`;
      overlay.querySelectorAll('[data-feed-food-uid]').forEach(btn => {
        btn.addEventListener('click', () => {
          const idx = pdata.inventory.findIndex(i => i.uid === btn.dataset.feedFoodUid && i.slot === 'food');
          if (idx === -1) return;
          const food = pdata.inventory[idx];
          pdata.inventory.splice(idx, 1);
          grantCompanionXp(kind, id, Math.round(20 * RARITIES[food.rarity].mult));
          grantTempBuff(`Fed: ${def.name}`, def.icon, def.effect);
          Persistent.save();
          close();
          this.showSanctuary(classId, 'house');
        });
      });
      overlay.querySelector('#btn-close-food-picker').addEventListener('click', close);
    };
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
    document.body.appendChild(overlay);
    render();
  },

  // Character + Armory combined: character summary/customization on top, the
  // WoW-style paperdoll below it. Clicking any paperdoll slot (empty or
  // filled) opens an inline picker of everything in your inventory that
  // could go there; if the slot's already filled, each candidate also shows
  // a stat-by-stat comparison against what's currently equipped.
  // The character info block - name/level, class blurb, live stats, active
  // spell, talent points, the Gear Set Bonus tracker, Customize Appearance,
  // and Auto Equip - sits inside the paperdoll's center column, under the
  // character model but above the weapon row (see renderArmoryPaperdoll),
  // so it reads as "about this character" before the gear slots themselves.
  renderCharInfoBlock(classId) {
    const cls = CLASSES[classId];
    const rec = Persistent.getCharacter(classId);
    const stats = previewClassStats(classId);
    const spells = equippedSpellIds(rec, cls).map(id => SPELLS[id]);
    const maxSpellSlots = maxEquippedSpells(rec.level);
    const custom = rec.customization;
    const setBonusPct = Math.round(stats.setBonusPct * 100);
    return `
      <div class="char-info-bar">
        <h3>${custom.name ? escapeHtml(custom.name) : cls.name} <span class="small-text">Level ${rec.level}</span></h3>
        ${custom.name ? `<div class="small-text">${cls.name}</div>` : ''}
        <p class="small-text">${cls.blurb}</p>
        <div class="stat-grid">
          <span>ATK ${stats.atk}</span><span>DEF ${stats.def}</span>
          <span>HP ${stats.maxHp}</span><span>SPD ${stats.speed}</span>
        </div>
        <div class="small-text">Active Spells (${spells.length}/${maxSpellSlots} slots - equip more from Inventory): ${spells.map(s => `${s.name}${s.level > 1 ? ` Lv.${s.level}` : ''}`).join(', ')}</div>
        <div class="small-text">Talent Points: ${getTalentPointsAvailable(rec)} available - see Talents below</div>
        <div class="small-text" title="Scales with how many equip slots are filled and their rarity - multiplies every stat bonus from items, relics, food, pets, and mounts together. Needs at least 2 equipped items; caps at +100% with every slot filled by a legendary.">⭐ Gear Set Bonus: +${setBonusPct}%</div>
        <label class="customize-row" style="max-width:320px;margin-top:10px">
          <span>Name</span>
          <input type="text" id="char-name-input" maxlength="16" placeholder="${cls.name}" value="${escapeHtml(custom.name || '')}">
        </label>
      </div>
      <label class="customize-row" style="max-width:360px;margin-top:12px" title="Automatically equips the strongest available item (from your inventory) into every slot, and re-checks after any new loot arrives.">
        <span>⚡ Auto Equip Best Gear</span>
        <input type="checkbox" id="chk-auto-equip" ${rec.autoEquip ? 'checked' : ''}>
      </label>
    `;
  },

  renderSanctuaryCharacter(classId) {
    return `
      ${this.renderArmoryPaperdoll(classId, this.renderCharInfoBlock(classId))}
      ${this.selectedArmorySlot ? this.renderSlotPicker(classId, this.selectedArmorySlot) : ''}
    `;
  },

  // A rough, single-number "how good is this item" heuristic used only to
  // decide whether to glow a slot - not real combat math, just enough to
  // compare two items in the same slot consistently.
  gearPower(item) {
    if (!item) return 0;
    let p = (item.atk || 0) * 2 + (item.def || 0) * 2 + (item.hp || 0) * 0.5;
    if (item.effect) Object.keys(item.effect).forEach(k => {
      const v = item.effect[k];
      p += Number.isInteger(v) ? v * 2 : v * 100;
    });
    return p;
  },

  // Does the player's Inventory hold something that could go in `slotKey` and
  // outclasses whatever's equipped there right now? Drives the "better gear
  // available" glow on that Armory slot.
  hasUpgradeAvailable(classId, slotKey) {
    const pdata = Persistent.load();
    const rec = Persistent.getCharacter(classId);
    const currentUid = rec.equipped[slotKey];
    const currentPower = currentUid ? this.gearPower(Persistent.findItem(currentUid)) : 0;
    return pdata.inventory.some(item => {
      if (item.uid === currentUid) return false;
      if (!equipSlotKeysFor(classId, item).includes(slotKey)) return false;
      return this.gearPower(item) > currentPower;
    });
  },

  // Greedily fills every equip slot with the strongest available candidate
  // (same gearPower heuristic the upgrade-glow already uses) - never touches
  // gear equipped by another character, and won't double-assign one physical
  // item to two slots in the same pass (e.g. the same ring into both ring1
  // and ring2). Driven by the Character tab's Auto Equip checkbox, and
  // re-run automatically after any loot-granting moment while it's on
  // (combat victory, AFK/idle catch-up) so a returning player's best-in-bag
  // loadout stays current without manual upkeep.
  autoEquipBestGear(classId) {
    const pdata = Persistent.load();
    const rec = Persistent.getCharacter(classId);
    const equippedByOthers = new Set();
    Object.entries(pdata.characters).forEach(([cid, c]) => {
      if (cid !== classId) Object.values(c.equipped).forEach(uid => { if (uid) equippedByOthers.add(uid); });
    });
    const usableItems = pdata.inventory.filter(item => !equippedByOthers.has(item.uid) && equipSlotKeysFor(classId, item).length);
    const claimed = new Set();
    EQUIP_GEAR_KEYS.forEach(key => {
      const currentUid = rec.equipped[key];
      let best = null;
      let bestPower = currentUid ? this.gearPower(Persistent.findItem(currentUid)) : 0;
      usableItems.forEach(item => {
        if (claimed.has(item.uid) || item.uid === currentUid) return;
        if (!equipSlotKeysFor(classId, item).includes(key)) return;
        const power = this.gearPower(item);
        if (power > bestPower) { bestPower = power; best = item; }
      });
      if (best) {
        Persistent.unequipEverywhere(best.uid);
        equipItemToSlot(rec, best, key);
        claimed.add(best.uid);
      } else if (currentUid) {
        claimed.add(currentUid);
      }
    });
  },

  // The WoW-style paperdoll itself - a 2-column layout flanking a central
  // portrait, with the 3 weapon slots in a row underneath. Every slot is
  // clickable (empty or filled) to open renderSlotPicker for it.
  // `centerExtraHtml` (only passed by the Character tab, not the Enchant
  // modal's reuse of this same layout) renders between the portrait and the
  // weapon row - the character info block (stats/description/customize).
  renderArmoryPaperdoll(classId, centerExtraHtml) {
    const rec = Persistent.getCharacter(classId);
    const cls = CLASSES[classId];
    const slotCell = (key, label) => {
      const uid = rec.equipped[key];
      const item = uid ? Persistent.findItem(uid) : null;
      const color = item ? RARITIES[item.rarity].color : 'var(--border)';
      const selected = this.selectedArmorySlot === key;
      const upgrade = this.hasUpgradeAvailable(classId, key);
      return `<div class="armory-slot ${selected ? 'armory-slot-selected' : ''} ${upgrade ? 'armory-slot-upgrade' : ''}" style="border-color:${color}" data-slot-key="${key}" title="${label}${item ? ': ' + item.name : ' (empty)'}${upgrade ? ' - better gear available!' : ''}">
        <div class="armory-slot-icon">${item ? item.icon : '➕'}</div>
        <div class="armory-slot-label">${label}</div>
      </div>`;
    };
    const leftColumn = ['head', 'neck', 'shoulders', 'back', 'chest', 'shirt', 'tabard', 'wrists'].map(k => slotCell(k, SLOT_LABELS[k])).join('');
    const rightColumn = ['hands', 'waist', 'legs', 'boots', 'ring1', 'ring2', 'trinket1', 'trinket2'].map(k =>
      slotCell(k, k.startsWith('ring') ? 'Ring' : k.startsWith('trinket') ? 'Trinket' : SLOT_LABELS[k])
    ).join('');
    const usesBlessing = CLASS_WEAPON_TYPES[classId].includes('blessing');
    const weaponRow = ['mainHand', 'offHand', 'ranged'].map(k =>
      slotCell(k, k === 'mainHand' ? 'Main Hand' : k === 'offHand' ? 'Off Hand' : (usesBlessing ? 'Blessing' : 'Ranged'))
    ).join('');
    const allowedTypes = CLASS_WEAPON_TYPES[classId].map(t => WEAPON_TYPE_LABELS[t] || t).join(', ');

    return `
      <h4 style="margin-top:16px">Armory <span class="small-text">(click a slot to equip or compare gear)</span></h4>
      <div class="armory-layout">
        <div class="armory-column">${leftColumn}</div>
        <div class="armory-center">
          <div class="armory-portrait">${characterSpriteFor(classId, 172)}</div>
          ${centerExtraHtml || ''}
          <div class="armory-weapon-row">${weaponRow}</div>
        </div>
        <div class="armory-column">${rightColumn}</div>
      </div>
      <p class="small-text">${cls.name} can wield: ${allowedTypes}</p>
    `;
  },

  // The inline picker shown below the paperdoll for whichever slot was just
  // clicked - every inventory item that could go there, each with a live
  // stat comparison against whatever's currently in that slot (if anything).
  renderSlotPicker(classId, key) {
    const pdata = Persistent.load();
    const rec = Persistent.getCharacter(classId);
    const currentUid = rec.equipped[key];
    const currentItem = currentUid ? Persistent.findItem(currentUid) : null;
    const usesBlessing = CLASS_WEAPON_TYPES[classId].includes('blessing');
    const label = key.startsWith('ring') ? 'Ring' : key.startsWith('trinket') ? 'Trinket'
      : key === 'mainHand' ? 'Main Hand' : key === 'offHand' ? 'Off Hand'
      : key === 'ranged' ? (usesBlessing ? 'Blessing' : 'Ranged')
      : (SLOT_LABELS[key] || key);
    // Never list something already doing a job elsewhere - equipped by
    // another character, or by this same character in a different slot
    // (e.g. a ring already worn in ring1 while picking ring2).
    const equippedElsewhereUids = new Set();
    Object.values(pdata.characters).forEach(c => Object.values(c.equipped).forEach(uid => { if (uid && uid !== currentUid) equippedElsewhereUids.add(uid); }));
    const candidates = pdata.inventory.filter(item => item.uid !== currentUid && !equippedElsewhereUids.has(item.uid) && equipSlotKeysFor(classId, item).includes(key));

    const rows = candidates.map(item => `
      <div class="gear-row" style="border-left:3px solid ${RARITIES[item.rarity].color}">
        <div class="desc"><span>${item.icon}</span><div>
          <strong style="color:${RARITIES[item.rarity].color}">${item.name}</strong>
          <div class="small-text">${RARITIES[item.rarity].label} · ${this.describeItemStats(item)}</div>
          ${currentItem ? this.renderItemComparison(currentItem, item) : ''}
        </div></div>
        <button class="btn-secondary" data-picker-uid="${item.uid}" data-picker-key="${key}">Equip</button>
      </div>`).join('');

    return `
      <div class="modal-overlay" id="slot-picker-overlay">
        <div class="panel armory-picker modal-panel">
          <h4>${label}${currentItem ? ` <span class="small-text">- currently ${currentItem.name}</span>` : ''}</h4>
          ${currentItem ? `<div class="gear-row" style="border-left:3px solid ${RARITIES[currentItem.rarity].color}">
            <div class="desc"><span>${currentItem.icon}</span><div><strong style="color:${RARITIES[currentItem.rarity].color}">${currentItem.name}</strong>
            <div class="small-text">${RARITIES[currentItem.rarity].label} · Equipped · ${this.describeItemStats(currentItem)}</div></div></div>
            <button class="btn-secondary" data-picker-uid="${currentItem.uid}" data-picker-key="${key}">Unequip</button>
          </div>` : ''}
          ${rows || '<p class="small-text">Nothing else in your inventory fits this slot.</p>'}
          <button class="btn-secondary" id="btn-close-slot-picker">Close</button>
        </div>
      </div>`;
  },

  // Stat-by-stat diff between what's equipped and a candidate - ▲/▼/= per
  // stat so it's immediately clear which item is actually the upgrade.
  renderItemComparison(current, candidate) {
    const parts = [];
    const compareFlat = (key, label) => {
      const a = current[key] || 0, b = candidate[key] || 0;
      if (!a && !b) return;
      const diff = b - a;
      const cls = diff > 0 ? 'stat-better' : diff < 0 ? 'stat-worse' : 'stat-equal';
      parts.push(`<span class="${cls}">${label} ${a}→${b} ${diff > 0 ? '▲' : diff < 0 ? '▼' : '='}</span>`);
    };
    compareFlat('atk', 'ATK'); compareFlat('def', 'DEF'); compareFlat('hp', 'Max HP');
    const effectKeys = new Set([...(current.effect ? Object.keys(current.effect) : []), ...(candidate.effect ? Object.keys(candidate.effect) : [])]);
    effectKeys.forEach(k => {
      const a = (current.effect && current.effect[k]) || 0, b = (candidate.effect && candidate.effect[k]) || 0;
      const diff = b - a;
      const cls = diff > 0 ? 'stat-better' : diff < 0 ? 'stat-worse' : 'stat-equal';
      parts.push(`<span class="${cls}">${describeEffectLever(k, a)}→${describeEffectLever(k, b)} ${diff > 0 ? '▲' : diff < 0 ? '▼' : '='}</span>`);
    });
    return parts.length ? `<div class="stat-compare">${parts.join('')}</div>` : '';
  },

  // ---------------- Talents ----------------
  // One point per level, 3 trees per class (see TALENT_TREES in data.js).
  // Each tree collapses into its own <details> section (same pattern as the
  // Crafting/Shop/Inventory categories) since 3 trees x 5 talents is a lot
  // of rows to show all at once.
  // Talent trees are buttons opening a popup per tree (see showTalentTreeModal)
  // instead of inline <details> dropdowns - "Reset Talents" stays on the main
  // Character tab body since it applies across every tree at once.
  renderSanctuaryTalents(classId) {
    const rec = Persistent.getCharacter(classId);
    const trees = TALENT_TREES[classId];
    const pointsAvailable = getTalentPointsAvailable(rec);
    const ranksSpent = getTalentRanksSpent(rec);
    const treeButtons = Object.entries(trees).map(([treeKey, tree]) => {
      const spent = getTreeSpentPoints(rec, tree.talents);
      return this.categoryButtonRow(`talent-${treeKey}`, tree.icon, tree.name, `${spent} points spent`);
    }).join('');
    return `
      <h4 style="margin-top:20px">Talents <span class="small-text">(${pointsAvailable} points available)</span></h4>
      <p class="flavor">Earn a talent point every time ${CLASSES[classId].name} levels up. Each tree's later tiers unlock once you've spent enough points earlier in that same tree.</p>
      ${treeButtons}
      <button class="btn-secondary" id="btn-reset-talents" ${ranksSpent > 0 ? '' : 'disabled'}>Reset Talents (50 🪙)</button>
    `;
  },

  renderTalentTreeRows(classId, treeKey) {
    const rec = Persistent.getCharacter(classId);
    const tree = TALENT_TREES[classId][treeKey];
    const pointsAvailable = getTalentPointsAvailable(rec);
    return tree.talents.map((t, tierIndex) => {
      const rank = rec.talents.ranks[t.id] || 0;
      const unlocked = isTalentTierUnlocked(rec, tree.talents, tierIndex);
      const maxed = rank >= t.maxRank;
      const canInvest = unlocked && !maxed && pointsAvailable > 0;
      return `<div class="gear-row talent-row ${!unlocked ? 'talent-locked' : ''}">
        <div class="desc"><span>${t.icon}</span><div>
          <strong>${t.name}</strong> <span class="small-text">${rank}/${t.maxRank}</span>
          <div class="small-text">${t.desc}</div>
          ${!unlocked ? `<div class="small-text">Requires ${tierIndex * TALENT_TIER_SIZE} points spent in ${tree.name}</div>` : ''}
        </div></div>
        <button class="btn-secondary" data-tree="${treeKey}" data-talent="${t.id}" ${canInvest ? '' : 'disabled'}>+</button>
      </div>`;
    }).join('');
  },

  showTalentTreeModal(classId, treeKey, onClose) {
    const tree = TALENT_TREES[classId][treeKey];
    this.showListModal(`${tree.icon} ${tree.name}`, () => this.renderTalentTreeRows(classId, treeKey),
      (container, refresh) => {
        container.querySelectorAll('[data-talent]').forEach(btn => {
          btn.addEventListener('click', () => {
            const rec = Persistent.getCharacter(classId);
            if (investTalentPoint(rec, classId, btn.dataset.tree, btn.dataset.talent)) {
              Persistent.save();
              refresh();
            }
          });
        });
      }, onClose);
  },

  // ---------------- PvP (Ghost mirror matches) ----------------
  // The opponent is built directly from your own effectiveStats() (see
  // enterPvpMatch) - not a separately-simulated character - so it's an exact
  // mirror of your real level, gear, relics, and talents by construction.
  renderSanctuaryPvp(classId) {
    const pdata = Persistent.load();
    const rec = Persistent.getCharacter(classId);

    // Honor Shop: one common-rarity weapon per weaponType this class can
    // legally use, plus a universal armor and trinket. Buying one instantiates
    // a real pvpInventory item (see instantiatePvpGear) rather than a fixed
    // stat block, so it stacks generically with Bloody Bag drops of the same
    // defId at a higher rarity.
    const weaponDefIds = Object.keys(PVP_GEAR_TEMPLATES).filter(id => {
      const t = PVP_GEAR_TEMPLATES[id];
      return t.kind === 'weapon' && canClassUseWeaponType(classId, t.weaponType);
    });
    const shopDefIds = [...weaponDefIds, 'pvpArmor', 'pvpTrinket'];

    const ownedRow = (item) => {
      const equippedKey = ['weapon', 'armor', 'trinket'].find(k => rec.pvpEquipped[k] === item.uid);
      const rarityLabel = item.pvpUnique ? 'Unique' : RARITIES[item.rarity].label;
      const color = item.pvpUnique ? RARITIES.legendary.color : RARITIES[item.rarity].color;
      return `<div class="gear-row ${equippedKey ? 'profession-active' : ''}"><div class="desc"><span>${item.icon}</span>
        <div><strong style="color:${color}">${item.name}</strong> <span class="small-text">(${rarityLabel})</span><div class="small-text">${this.describeItemStats(item)}</div></div></div>
        <button class="btn-secondary" data-equip-pvp="${item.kind}" data-pvp-uid="${item.uid}">${equippedKey ? 'Unequip' : 'Equip'}</button></div>`;
    };

    return `
      <h4>PvP <span class="small-text">(${pdata.honor} Honor)</span></h4>
      <button class="btn-primary" id="btn-find-pvp-match">Find PvP Match</button>
      <label class="customize-row" style="max-width:460px;margin-top:14px">
        <span>Enable random Rival Ghost encounters while adventuring</span>
        <input type="checkbox" id="chk-random-pvp" ${pdata.randomPvpEnabled ? 'checked' : ''}>
      </label>
      <p class="small-text">A Rival Ghost is 1.2x as strong as you and carries its own random gear, relics, and abilities - a genuinely difficult fight, not a mirror. Defeating one grants Honor, Gold, and a Bloody Bag.</p>
      ${this.categoryButtonRow('pvp-honor-shop', '🎖️', 'Honor Shop', `${shopDefIds.length + 1} items - common-rarity baseline, Honor only spends here`)}
      <h4 style="margin-top:16px">Your PvP Gear <span class="small-text">(click to equip/unequip)</span></h4>
      ${pdata.pvpInventory.length ? pdata.pvpInventory.map(ownedRow).join('') : '<p class="small-text">No PvP gear owned yet.</p>'}
    `;
  },

  renderHonorShopRows(classId) {
    const pdata = Persistent.load();
    const weaponDefIds = Object.keys(PVP_GEAR_TEMPLATES).filter(id => {
      const t = PVP_GEAR_TEMPLATES[id];
      return t.kind === 'weapon' && canClassUseWeaponType(classId, t.weaponType);
    });
    const shopDefIds = [...weaponDefIds, 'pvpArmor', 'pvpTrinket'];
    const shopRow = (defId) => {
      const tmpl = PVP_GEAR_TEMPLATES[defId];
      const owned = pdata.pvpInventory.some(i => i.defId === defId && i.rarity === 'common');
      const price = PVP_GEAR_PRICE[tmpl.kind];
      const preview = this.describeItemStats(instantiatePvpGear(defId, 'common'));
      return `<div class="gear-row"><div class="desc"><span>${tmpl.icon}</span><div><strong>${tmpl.name}</strong><div class="small-text">${preview} - PvP matches only</div></div></div>
        <button class="btn-secondary" data-buy-pvp="${defId}" ${owned ? 'disabled' : ''}>${owned ? 'Owned' : `${price} 🎖️`}</button></div>`;
    };
    const potionOwned = pdata.honorPotionCount;
    const potionRow = `<div class="gear-row"><div class="desc"><span>${HONOR_SHOP.potion.icon}</span><div><strong>${HONOR_SHOP.potion.name}</strong><div class="small-text">${HONOR_SHOP.potion.desc}</div></div></div>
      <button class="btn-secondary" data-buy-honor-potion="1">${HONOR_SHOP.potion.price} 🎖️ (own ${potionOwned})</button></div>`;
    return shopDefIds.map(shopRow).join('') + potionRow;
  },

  showPvpHonorShopModal(classId, onClose) {
    this.showListModal('🎖️ Honor Shop', () => this.renderHonorShopRows(classId),
      (container, refresh) => {
        container.querySelectorAll('[data-buy-pvp]').forEach(btn => {
          btn.addEventListener('click', () => {
            const pdata = Persistent.load();
            const defId = btn.dataset.buyPvp;
            const tmpl = PVP_GEAR_TEMPLATES[defId];
            const price = PVP_GEAR_PRICE[tmpl.kind];
            if (pdata.pvpInventory.some(i => i.defId === defId && i.rarity === 'common')) return;
            if (pdata.honor < price) { this.showInsufficientResourcesAlert(`You need ${price} 🎖️ Honor to buy ${tmpl.name}.`); return; }
            pdata.honor -= price;
            pdata.pvpInventory.push(instantiatePvpGear(defId, 'common'));
            Persistent.save();
            refresh();
          });
        });
        container.querySelectorAll('[data-buy-honor-potion]').forEach(btn => {
          btn.addEventListener('click', () => {
            const pdata = Persistent.load();
            if (pdata.honor < HONOR_SHOP.potion.price) { this.showInsufficientResourcesAlert(`You need ${HONOR_SHOP.potion.price} 🎖️ Honor to buy ${HONOR_SHOP.potion.name}.`); return; }
            pdata.honor -= HONOR_SHOP.potion.price;
            pdata.honorPotionCount += 1;
            Persistent.save();
            refresh();
          });
        });
      }, onClose);
  },

  // A random mid-adventure PvP encounter (see the checkbox in renderSanctuaryPvp
  // and its selectNode hook) - unlike the mirror match, this ghost is a
  // DIFFERENT random class with 1.2x the player's own stats, dressed up with
  // a flavor line naming random relics/abilities it "carries" (cosmetic only -
  // the 1.2x multiplier is what actually makes the fight harder). Fought with
  // the player's real run HP/items, so losing is real death like any other
  // encounter; only the reward on victory differs (Honor/Gold/Bloody Bag -
  // see resolveCombatEnd's node.rivalGhost branch).
  generateRivalGhost(classId) {
    const stats = Game.effectiveStats();
    const mult = 1.2;
    const pool = Object.keys(CLASSES).filter(id => id !== classId);
    const ghostClassId = pool.length ? pool[rand(0, pool.length - 1)] : classId;
    const relicCount = rand(1, 3);
    const relicNames = Array.from({ length: relicCount }, () => RELICS[randomRelic()].name);
    const abilityId = SPELLS[CLASSES[ghostClassId].defaultSpell] ? CLASSES[ghostClassId].defaultSpell : null;
    const abilityName = abilityId ? SPELLS[abilityId].name : 'an unknown technique';
    return {
      id: ghostClassId,
      name: `${GHOST_NAME_POOL[rand(0, GHOST_NAME_POOL.length - 1)]} the Rival ${CLASSES[ghostClassId].name}`,
      hp: Math.round(stats.maxHp * mult), atk: Math.round(stats.atk * mult), def: Math.round(stats.def * mult), speed: Math.max(1, Math.round(stats.speed * mult)),
      gold: [Math.round(20 + stats.level * 4), Math.round(40 + stats.level * 6)],
      boss: true, spectral: true, rivalGhost: true,
      flavor: `Wielding ${relicNames.join(', ')} and ${abilityName}.`
    };
  },

  // Builds and enters a PvP match: the ghost's hp/atk/def/speed are a direct
  // snapshot of this character's OWN effectiveStats() (computed with
  // Game.pvp already set, so Honor gear counts for both sides equally) -
  // this is what makes it a true mirror rather than a hand-tuned enemy.
  enterPvpMatch(classId) {
    Game.pvp = { classId };
    Game.player = Game.buildRaidPlayer(classId);
    Game.player.items = Array(Persistent.load().honorPotionCount).fill('honorPotion');
    Game.player.hp = Game.effectiveStats().maxHp;
    const mirror = Game.effectiveStats();
    const rec = Persistent.getCharacter(classId);
    const displayName = (rec.customization && rec.customization.name) || CLASSES[classId].name;
    const ghost = {
      id: classId,
      name: `Ghost of ${displayName}`,
      hp: mirror.maxHp, atk: mirror.atk, def: mirror.def, speed: mirror.speed,
      gold: [40, 70], boss: true, spectral: true, pvpGhost: true // boss:true reuses the "no fleeing" gate, spectral:true the ghostly tint
    };
    this.enterCombat({ type: 'pvpMatch' }, ghost);
  },

  showPvpOutcome(won) {
    const classId = Game.pvp.classId;
    const pdata = Persistent.load();
    // Any unused Honor potions carried into the match are returned - only
    // ones actually drunk during combat are gone (see combat.js).
    pdata.honorPotionCount = Game.player.items.filter(i => i === 'honorPotion').length;
    let lines;
    if (won) {
      const goldReward = Game.addGold(rand(30, 60));
      const xpReward = 40;
      const levelResult = Game.grantXp(xpReward);
      const honorReward = rand(20, 40);
      pdata.honor += honorReward;
      recordQuestProgress('pvpWins', 1);
      Persistent.save();
      lines = ['You defeated your Ghost opponent!', ...this.rewardLines({ goldReward, xpReward, levelResult }), `+${honorReward} Honor.`];
    } else {
      Persistent.save();
      lines = ['Your Ghost opponent bested you.', 'No rewards this time - the mirror match favored them.'];
    }
    Game.pvp = null;
    Game.player = null;
    this.root.innerHTML = `
      <div class="center-screen">
        <h1 class="result-title ${won ? 'victory' : 'defeat'}">${won ? 'Victory!' : 'Defeated'}</h1>
        <p class="flavor">${lines.join('<br>')}</p>
        <button class="btn-primary" id="btn-pvp-continue">Return to Sanctuary</button>
      </div>`;
    document.getElementById('btn-pvp-continue').addEventListener('click', () => this.showSanctuary(classId, 'pvp'));
  },

  // Describes an item's stat contribution generically - flat atk/def/hp/gold
  // for weapons/armor, or its effect{} lever(s) for jewelry/trinkets - since
  // there's no longer just "weapon vs armor" now that there are 18 slots.
  describeItemStats(item) {
    const parts = [];
    if (item.atk) parts.push(`+${item.atk} ATK`);
    if (item.def) parts.push(`+${item.def} DEF`);
    if (item.hp) parts.push(`+${item.hp} Max HP`);
    if (item.goldBonus) parts.push(`+${Math.round(item.goldBonus * 100)}% Gold`);
    if (item.effect) Object.keys(item.effect).forEach(k => parts.push(describeEffectLever(k, item.effect[k])));
    if (item.enchantId && ENCHANTS[item.enchantId]) {
      const enchant = ENCHANTS[item.enchantId];
      Object.keys(enchant.effect).forEach(k => parts.push(`${describeEffectLever(k, enchant.effect[k])} (${enchant.name})`));
    }
    return parts.length ? parts.join(', ') : 'Cosmetic - no combat stats';
  },

  // A sellable item's gold value: rarity-scaled, and 0 (unsellable) for
  // named legendaries and permanent relics - see the Shop's Sell section.
  sellValueFor(item) {
    if (item.legendary) return 0;
    const base = (item.atk || 0) * 6 + (item.def || 0) * 6 + (item.hp || 0) * 2;
    const effectFlat = item.effect ? Object.values(item.effect).reduce((s, v) => s + Math.abs(v) * 40, 0) : 0;
    return Math.max(3, Math.round(base + effectFlat));
  },

  // Shared by the Sanctuary Inventory tab and the mid-adventure Inventory
  // panel (see showInRunInventory) - one item's equip row, resolved against
  // whichever equip-slot key(s) it could go into for this class.
  renderGearRow(classId, item) {
    const pdata = Persistent.load();
    const rec = Persistent.getCharacter(classId);
    const cls = CLASSES[classId];
    const slotKeys = equipSlotKeysFor(classId, item);
    const isEquippedHere = slotKeys.some(k => rec.equipped[k] === item.uid);
    const equippedByOtherId = Object.keys(pdata.characters).find(cid => cid !== classId && Object.values(pdata.characters[cid].equipped).includes(item.uid));
    const universeTag = item.legendary ? ` · ${LEGENDARY_ITEMS[item.defId].universe}` : '';
    const canEquip = slotKeys.length > 0;
    const label = isEquippedHere ? 'Unequip' : (canEquip ? 'Equip' : `${cls.name} can't use this`);
    return `<div class="gear-row" style="border-left:3px solid ${RARITIES[item.rarity].color}">
      <div class="desc"><span>${item.icon}</span><div><strong style="color:${RARITIES[item.rarity].color}">${item.name}</strong>
      <div class="small-text">${RARITIES[item.rarity].label}${universeTag} · ${SLOT_LABELS[item.slot] || item.slot} · ${this.describeItemStats(item)}${equippedByOtherId ? ` · worn by ${CLASSES[equippedByOtherId].name}` : ''}</div></div></div>
      <button class="btn-secondary" data-uid="${item.uid}" ${!canEquip && !isEquippedHere ? 'disabled' : ''}>${label}</button>
    </div>`;
  },

  // Wires every [data-uid] equip/unequip button rendered by renderGearRow -
  // shared by the Sanctuary Inventory tab's category modals and the in-run
  // Inventory panel (which passes this.root directly, not a modal).
  wireGearEquipClicks(classId, root, onChange) {
    const rec = Persistent.getCharacter(classId);
    root.querySelectorAll('[data-uid]').forEach(btn => {
      btn.addEventListener('click', () => {
        const uid = btn.dataset.uid;
        const item = Persistent.findItem(uid);
        if (!item) return;
        const keys = equipSlotKeysFor(classId, item);
        const alreadyKey = keys.find(k => rec.equipped[k] === uid);
        if (alreadyKey) {
          unequipItemEverywhereOnRecord(rec, uid);
        } else if (keys.length) {
          const emptyKey = keys.find(k => !rec.equipped[k]) || keys[0];
          Persistent.unequipEverywhere(uid);
          equipItemToSlot(rec, item, emptyKey);
        } else {
          return;
        }
        Persistent.save();
        onChange();
      });
    });
  },

  armorSlotKeys() {
    return ['chest', 'head', 'neck', 'shoulders', 'back', 'shirt', 'tabard', 'wrists', 'hands', 'waist', 'legs', 'boots', 'ring', 'trinket'];
  },

  // Shared by the Sanctuary Inventory tab AND the mid-adventure Inventory
  // panel (see showInRunInventory) - same categories, same modals, so
  // viewing/equipping gear is one consistent experience whether you're at
  // the Sanctuary or mid-run. `extraRows` lets the in-run panel tack on its
  // own Armory category without duplicating this list.
  renderInventoryCategories(classId, extraRows) {
    const pdata = Persistent.load();
    const cls = CLASSES[classId];
    const weapons = pdata.inventory.filter(i => i.slot === 'weapon');
    const armor = pdata.inventory.filter(i => this.armorSlotKeys().includes(i.slot));
    const containers = pdata.inventory.filter(i => i.slot === 'container');
    const recipeItems = pdata.inventory.filter(i => i.slot === 'recipe');
    const foodItems = pdata.inventory.filter(i => i.slot === 'food');
    return `
      ${extraRows || ''}
      ${this.categoryButtonRow('inv-bank', '🏦', 'Resource Bank', `${pdata.bankGold} gold and every material you've gathered`)}
      ${this.categoryButtonRow('inv-weapons', '⚔️', 'Weapons', `${weapons.length} owned - main hand/off hand/ranged`)}
      ${this.categoryButtonRow('inv-armor', '🛡️', 'Armor & Accessories', `${armor.length} owned - chest, helm, shoulders, cloak, rings, trinkets, and more`)}
      ${this.categoryButtonRow('inv-containers', '🎁', 'Containers', `${containers.length} owned`)}
      ${this.categoryButtonRow('inv-recipes', '📜', 'Recipes', `${recipeItems.length} owned - consumed to permanently upgrade a Crafting recipe`)}
      ${this.categoryButtonRow('inv-food', '🍗', 'Food', `${foodItems.length} owned - eat for a 1-hour buff, or feed to a pet/mount at the House`)}
      ${this.categoryButtonRow('inv-spells', '🔮', 'Spells', `for ${cls.name}`)}
      ${this.categoryButtonRow('inv-relics', '💠', 'Permanent Relics', `${pdata.permanentRelics.length} owned - always active, every run, every class`)}
    `;
  },

  renderSanctuaryInventory(classId) {
    return this.renderInventoryCategories(classId);
  },

  // Dispatches every [data-open-category] button rendered by
  // renderInventoryCategories to its modal - shared by the Sanctuary
  // Inventory tab and the in-run Inventory panel, which only differ in what
  // `onClose` does afterward (redraw the Sanctuary tab vs. the in-run panel).
  wireInventoryCategoryClicks(classId, root, onClose) {
    const modals = {
      'inv-bank': () => this.showInvBankModal(classId, onClose),
      'inv-weapons': () => this.showInvWeaponsModal(classId, onClose),
      'inv-armor': () => this.showInvArmorModal(classId, onClose),
      'inv-containers': () => this.showInvContainersModal(classId, onClose),
      'inv-recipes': () => this.showInvRecipesModal(classId, onClose),
      'inv-food': () => this.showInvFoodModal(classId, onClose),
      'inv-spells': () => this.showInvSpellsModal(classId, onClose),
      'inv-relics': () => this.showInvRelicsModal(classId, onClose),
      'inv-armory': () => this.showInvArmoryModal(classId, onClose)
    };
    root.querySelectorAll('[data-open-category]').forEach(btn => {
      const fn = modals[btn.dataset.openCategory];
      if (fn) btn.addEventListener('click', fn);
    });
  },

  showInvBankModal(classId, onClose) {
    this.showListModal('🏦 Resource Bank', () => {
      const pdata = Persistent.load();
      const rows = [
        ['🪙', 'Gold', pdata.bankGold], ['⛏️', 'Ore', pdata.materials.ore], ['🧵', 'Leather', pdata.materials.leather],
        ['🔮', 'Essence', pdata.materials.essence], ['🌿', 'Herbs', pdata.materials.herbs], ['🪵', 'Wood', pdata.materials.wood],
        ['🐟', 'Fish', pdata.materials.fish], ['✨', 'Dust', pdata.materials.dust], ['🔹', 'Shard', pdata.materials.shard], ['💠', 'Crystal', pdata.materials.crystal]
      ];
      return rows.map(([icon, label, amount]) => `<div class="gear-row"><div class="desc"><span>${icon}</span><div><strong>${label}</strong></div></div><div class="small-text">${amount}</div></div>`).join('');
    }, () => {}, onClose);
  },

  showInvWeaponsModal(classId, onClose) {
    this.showListModal('⚔️ Weapons', () => {
      const weapons = Persistent.load().inventory.filter(i => i.slot === 'weapon');
      return weapons.length ? weapons.map(item => this.renderGearRow(classId, item)).join('') : '<p class="small-text">No weapons owned. Craft or buy one.</p>';
    }, (container, refresh) => this.wireGearEquipClicks(classId, container, refresh), onClose);
  },

  showInvArmorModal(classId, onClose) {
    this.showListModal('🛡️ Armor & Accessories', () => {
      const armor = Persistent.load().inventory.filter(i => this.armorSlotKeys().includes(i.slot));
      return armor.length ? armor.map(item => this.renderGearRow(classId, item)).join('') : '<p class="small-text">None owned yet - find them on your adventures.</p>';
    }, (container, refresh) => this.wireGearEquipClicks(classId, container, refresh), onClose);
  },

  showInvContainersModal(classId, onClose) {
    this.showListModal('🎁 Containers', () => {
      const pdata = Persistent.load();
      const containers = pdata.inventory.filter(i => i.slot === 'container');
      const containerMsg = this.lastContainerResult;
      this.lastContainerResult = null;
      const msgHtml = containerMsg ? `<p class="small-text" style="color:var(--accent)">${containerMsg}</p>` : '';
      return msgHtml + (containers.length ? containers.map(c => `<div class="gear-row"><div class="desc"><span>${c.icon}</span><div><strong>${c.name}</strong><div class="small-text">${CONTAINERS[c.containerId].desc}</div></div></div>
        <button class="btn-secondary" data-open-container="${c.uid}">Open</button></div>`).join('') : '<p class="small-text">None owned yet - defeat a Rival Ghost in PvP to earn one.</p>');
    }, (container, refresh) => {
      container.querySelectorAll('[data-open-container]').forEach(btn => {
        btn.addEventListener('click', () => {
          const pdata = Persistent.load();
          const uid = btn.dataset.openContainer;
          const idx = pdata.inventory.findIndex(i => i.uid === uid);
          if (idx === -1) return;
          const c = pdata.inventory[idx];
          pdata.inventory.splice(idx, 1);
          const result = openContainer(c.containerId);
          if (result.pvpOnly) pdata.pvpInventory.push(result); else pdata.inventory.push(result);
          if (!result.pvpOnly && Persistent.getCharacter(classId).autoEquip) this.autoEquipBestGear(classId);
          Persistent.save();
          this.lastContainerResult = `${c.name} contained: ${result.icon} ${result.name} (${result.pvpUnique ? 'Unique' : RARITIES[result.rarity].label})`;
          refresh();
        });
      });
    }, onClose);
  },

  showInvRecipesModal(classId, onClose) {
    this.showListModal('📜 Recipes', () => {
      const recipeItems = Persistent.load().inventory.filter(i => i.slot === 'recipe');
      return recipeItems.length ? recipeItems.map(r => `<div class="gear-row"><div class="desc"><span>${r.icon}</span><div><strong>${r.name}</strong><div class="small-text">${r.desc || 'Consume in Crafting to upgrade the matching recipe one rarity tier.'}</div></div></div></div>`).join('') : '<p class="small-text">None owned yet - recipes have a small chance to drop from encounters.</p>';
    }, () => {}, onClose);
  },

  showInvFoodModal(classId, onClose) {
    this.showListModal('🍗 Food', () => {
      const foodItems = Persistent.load().inventory.filter(i => i.slot === 'food');
      return foodItems.length ? foodItems.map(f => `<div class="gear-row" style="border-left:3px solid ${RARITIES[f.rarity].color}"><div class="desc"><span>${f.icon}</span><div><strong style="color:${RARITIES[f.rarity].color}">${f.name}</strong><div class="small-text">${RARITIES[f.rarity].label} · ${this.describeItemStats(f)}</div></div></div>
        <button class="btn-secondary" data-eat-food="${f.uid}">Eat</button></div>`).join('') : '<p class="small-text">None owned yet - cook some from the Professions tab.</p>';
    }, (container, refresh) => {
      container.querySelectorAll('[data-eat-food]').forEach(btn => {
        btn.addEventListener('click', () => {
          const pdata = Persistent.load();
          const uid = btn.dataset.eatFood;
          const idx = pdata.inventory.findIndex(i => i.uid === uid && i.slot === 'food');
          if (idx === -1) return;
          const food = pdata.inventory[idx];
          pdata.inventory.splice(idx, 1);
          grantTempBuff(food.name, food.icon, food.effect);
          refresh();
        });
      });
    }, onClose);
  },

  showInvSpellsModal(classId, onClose) {
    this.showListModal(`🔮 Spells for ${CLASSES[classId].name}`, () => {
      const pdata = Persistent.load();
      const rec = Persistent.getCharacter(classId);
      const cls = CLASSES[classId];
      const maxSlots = maxEquippedSpells(rec.level);
      const equipped = equippedSpellIds(rec, cls);
      const spellOptions = [cls.defaultSpell, ...pdata.unlockedSpells].filter((v, i, a) => a.indexOf(v) === i);
      const slotsFull = equipped.length >= maxSlots;
      return `<p class="small-text">${equipped.length} / ${maxSlots} slots filled - more slots unlock at level 10, 30, 60, and ${MAX_LEVEL}.</p>` +
        spellOptions.map(id => {
        const sp = SPELLS[id];
        const level = getSpellLevel(id).level;
        const isDefault = id === cls.defaultSpell;
        const active = equipped.includes(id);
        const disabled = isDefault || (!active && slotsFull);
        const label = isDefault ? 'Always Active' : (active ? 'Unequip' : (slotsFull ? 'Slots Full' : 'Equip'));
        return `<div class="gear-row"><div class="desc"><span class="spell-icon"><img src="${sp.icon}" width="28" height="28" alt=""></span><div><strong>${sp.name}</strong> <span class="small-text">Lv.${level}/${SPELL_MAX_LEVEL}</span><div class="small-text">${sp.desc}</div></div></div>
          <button class="btn-secondary" data-spell="${id}" ${disabled ? 'disabled' : ''}>${label}</button></div>`;
      }).join('');
    }, (container, refresh) => {
      container.querySelectorAll('[data-spell]').forEach(btn => {
        btn.addEventListener('click', () => {
          const rec = Persistent.getCharacter(classId);
          const cls = CLASSES[classId];
          const id = btn.dataset.spell;
          if (id === cls.defaultSpell) return;
          const idx = rec.equipped.spells.indexOf(id);
          if (idx !== -1) {
            rec.equipped.spells.splice(idx, 1);
          } else if (equippedSpellIds(rec, cls).length < maxEquippedSpells(rec.level)) {
            rec.equipped.spells.push(id);
          } else {
            return;
          }
          Persistent.save();
          refresh();
        });
      });
    }, onClose);
  },

  showInvRelicsModal(classId, onClose) {
    this.showListModal('💠 Permanent Relics', () => {
      const pdata = Persistent.load();
      return pdata.permanentRelics.length
        ? pdata.permanentRelics.map(id => `<div class="gear-row"><div class="desc"><span>${RELICS[id].icon}</span><div><strong>${RELICS[id].name}</strong><div class="small-text">${RELICS[id].desc}</div></div></div></div>`).join('')
        : '<p class="small-text">None yet - buy some from the Shop.</p>';
    }, () => {}, onClose);
  },

  // The Armory paperdoll, reachable mid-adventure (not just the Sanctuary
  // Character tab) - same renderArmoryPaperdoll/renderSlotPicker this class
  // uses everywhere else, just inside a popup instead of a full tab.
  showInvArmoryModal(classId, onClose) {
    let selectedSlot = null;
    this.showListModal('🎽 Armory', () => {
      return this.renderArmoryPaperdoll(classId) + (selectedSlot ? this.renderSlotPicker(classId, selectedSlot) : '');
    }, (container, refresh) => {
      const rec = Persistent.getCharacter(classId);
      container.querySelectorAll('[data-slot-key]').forEach(el => {
        el.addEventListener('click', () => {
          selectedSlot = selectedSlot === el.dataset.slotKey ? null : el.dataset.slotKey;
          refresh();
        });
      });
      container.querySelectorAll('[data-picker-uid]').forEach(btn => {
        btn.addEventListener('click', () => {
          const uid = btn.dataset.pickerUid, key = btn.dataset.pickerKey;
          if (rec.equipped[key] === uid) {
            unequipItemEverywhereOnRecord(rec, uid);
          } else {
            const item = Persistent.findItem(uid);
            if (!item) return;
            Persistent.unequipEverywhere(uid);
            equipItemToSlot(rec, item, key);
          }
          Persistent.save();
          selectedSlot = null;
          refresh();
        });
      });
      const closePickerBtn = container.querySelector('#btn-close-slot-picker');
      if (closePickerBtn) closePickerBtn.addEventListener('click', () => { selectedSlot = null; refresh(); });
    }, onClose);
  },

  // Smelting's passive discounts the GOLD half of a recipe's cost (materials
  // are unaffected) - capped at 50% off regardless of level, per its own
  // description ("down to half price").
  craftGoldCost(classId, baseGold) {
    const rec = Persistent.getCharacter(classId);
    const level = rec.profession.levels.smelting;
    const discount = Math.min(0.5, PROFESSION_PASSIVES.smelting.perLevelPct * (level - 1));
    return Math.round(baseGold * (1 - discount));
  },

  renderRecipeRow(classId, r) {
    const pdata = Persistent.load();
    const tmpl = GEAR_TEMPLATES[r.defId];
    const rarity = getRecipeRarity(r.id);
    const cost = scaledRecipeCost(r.id, r.cost);
    const goldCost = this.craftGoldCost(classId, cost.gold);
    const costText = Object.entries(cost).map(([k, v]) => k === 'gold' ? `${goldCost} 🪙` : `${v} ${k}`).join(', ');
    const ownedRecipeItem = pdata.inventory.find(i => i.slot === 'recipe' && i.recipeId === r.id);
    const maxedOut = rarity === 'legendary';
    return `<div class="gear-row" style="border-left:3px solid ${RARITIES[rarity].color}">
      <div class="desc"><span>${tmpl.icon}</span><div><strong style="color:${RARITIES[rarity].color}">${tmpl.name}</strong>
      <div class="small-text">${RARITIES[rarity].label} · Costs ${costText}</div>
      <div class="small-text">Upgrade: ${ownedRecipeItem ? `Consume ${ownedRecipeItem.name}` : 'requires the matching Recipe item (drops rarely from encounters)'}</div></div></div>
      <div style="display:flex;gap:6px">
        <button class="btn-secondary" data-recipe="${r.id}">Craft</button>
        <button class="btn-secondary" data-upgrade-recipe="${r.id}" ${maxedOut ? 'disabled' : ''}>Upgrade</button>
      </div>
    </div>`;
  },

  renderFoodRecipeRow(classId, r) {
    const pdata = Persistent.load();
    const rec = Persistent.getCharacter(classId);
    const cookingLevel = rec.profession.levels.cooking;
    const tmpl = FOOD_TEMPLATES[r.defId];
    const rarity = getFoodRecipeRarity(r.id);
    const cost = scaledRecipeCost(r.id, r.cost);
    const goldCost = this.craftGoldCost(classId, cost.gold);
    const meetsLevel = cookingLevel >= r.levelReq;
    const costText = Object.entries(cost).map(([k, v]) => k === 'gold' ? `${goldCost} 🪙` : `${v} ${k}`).join(', ');
    const ownedRecipeItem = pdata.inventory.find(i => i.slot === 'recipe' && i.recipeId === r.id);
    const maxedOut = rarity === 'legendary';
    const buffText = Object.keys(tmpl.effect).map(k => describeEffectLever(k, instantiateFoodItem(r.defId, rarity).effect[k])).join(', ');
    return `<div class="gear-row" style="border-left:3px solid ${RARITIES[rarity].color}">
      <div class="desc"><span>${tmpl.icon}</span><div><strong style="color:${RARITIES[rarity].color}">${tmpl.name}</strong>
      <div class="small-text">${RARITIES[rarity].label} · 1hr buff: ${buffText} · Costs ${costText}</div>
      ${meetsLevel ? '' : `<div class="small-text" style="color:var(--bad)">Requires Cooking Lv.${r.levelReq}</div>`}
      <div class="small-text">Upgrade: ${ownedRecipeItem ? `Consume ${ownedRecipeItem.name}` : 'requires the matching Recipe item (drops rarely from encounters)'}</div></div></div>
      <div style="display:flex;gap:6px">
        <button class="btn-secondary" data-food-recipe="${r.id}" ${meetsLevel ? '' : 'disabled'}>Cook</button>
        <button class="btn-secondary" data-upgrade-food-recipe="${r.id}" ${maxedOut ? 'disabled' : ''}>Upgrade</button>
      </div>
    </div>`;
  },

  // Crafting (gear + food recipes) and Gathering (professions) combined into
  // one tab - each category is now a button opening showListModal instead of
  // an inline collapsible section.
  renderSanctuaryProfessions(classId) {
    const rec = Persistent.getCharacter(classId);
    const weaponRecipes = RECIPES.filter(r => GEAR_TEMPLATES[r.defId].slot === 'weapon');
    const armorRecipes = RECIPES.filter(r => GEAR_TEMPLATES[r.defId].slot !== 'weapon');
    const disenchanting = rec.disenchanting;
    return `
      <h4>Professions</h4>
      ${this.categoryButtonRow('prof-enchanting', '♻️', 'Enchanting', `Lv.${disenchanting.level}${disenchanting.level >= DISENCHANT_MAX_LEVEL ? ' (max)' : ''} - disenchant gear into materials, then enchant your equipped items`)}
      ${this.categoryButtonRow('prof-weapons', '⚔️', 'Weapon Crafting', `${weaponRecipes.length} recipes`)}
      ${this.categoryButtonRow('prof-armor', '🛡️', 'Armor & Accessory Crafting', `${armorRecipes.length} recipes`)}
      ${this.categoryButtonRow('prof-cooking', '🍳', 'Cooking', `${COOKING_RECIPES.length} recipes - each grants a 1-hour buff when eaten`)}
      ${this.categoryButtonRow('prof-gathering', '⛏️', 'Gathering Professions', `Lv.1-${PROFESSION_MAX_LEVEL} · only one may be actively leveled at a time`)}
    `;
  },

  showProfWeaponsModal(classId, onClose) {
    this.showListModal('⚔️ Weapon Crafting', () => RECIPES.filter(r => GEAR_TEMPLATES[r.defId].slot === 'weapon').map(r => this.renderRecipeRow(classId, r)).join(''),
      (container, refresh) => this.wireRecipeCategoryClicks(classId, container, refresh),
      onClose);
  },

  showProfArmorModal(classId, onClose) {
    this.showListModal('🛡️ Armor & Accessory Crafting', () => RECIPES.filter(r => GEAR_TEMPLATES[r.defId].slot !== 'weapon').map(r => this.renderRecipeRow(classId, r)).join(''),
      (container, refresh) => this.wireRecipeCategoryClicks(classId, container, refresh),
      onClose);
  },

  showProfCookingModal(classId, onClose) {
    this.showListModal('🍳 Cooking', () => COOKING_RECIPES.map(r => this.renderFoodRecipeRow(classId, r)).join(''),
      (container, refresh) => this.wireRecipeCategoryClicks(classId, container, refresh),
      onClose);
  },

  showProfGatheringModal(classId, onClose) {
    this.showListModal('⛏️ Gathering Professions', () => this.renderProfessionRows(classId),
      (container, refresh) => this.wireProfessionClicks(classId, container, refresh),
      onClose);
  },

  // Shared by all three recipe-category modals (Weapons/Armor/Cooking) -
  // scoped to `container` (the modal) rather than this.root.
  wireRecipeCategoryClicks(classId, container, refresh) {
    const pdata = Persistent.load();
    const rec = Persistent.getCharacter(classId);
    container.querySelectorAll('[data-recipe]').forEach(btn => {
      btn.addEventListener('click', () => {
        const recipe = RECIPES.find(r => r.id === btn.dataset.recipe);
        if (!recipe) return;
        const cost = scaledRecipeCost(recipe.id, recipe.cost);
        const goldCost = this.craftGoldCost(classId, cost.gold);
        const canAfford = pdata.bankGold >= goldCost && Object.keys(cost).every(k => k === 'gold' || pdata.materials[k] >= cost[k]);
        if (!canAfford) {
          const costText = Object.entries(cost).map(([k, v]) => k === 'gold' ? `${goldCost} 🪙` : `${v} ${k}`).join(', ');
          this.showInsufficientResourcesAlert(`You need ${costText} to craft ${GEAR_TEMPLATES[recipe.defId].name}.`);
          return;
        }
        pdata.bankGold -= goldCost;
        Object.keys(cost).forEach(k => { if (k !== 'gold') pdata.materials[k] -= cost[k]; });
        pdata.inventory.push(instantiateGear(recipe.defId, getRecipeRarity(recipe.id)));
        Persistent.save();
        refresh();
      });
    });
    container.querySelectorAll('[data-upgrade-recipe]').forEach(btn => {
      btn.addEventListener('click', () => {
        const recipeId = btn.dataset.upgradeRecipe;
        if (getRecipeRarity(recipeId) === 'legendary') return;
        const idx = pdata.inventory.findIndex(i => i.slot === 'recipe' && i.recipeId === recipeId);
        if (idx === -1) {
          this.showInsufficientResourcesAlert('You need the matching Recipe item (drops rarely from encounters) to upgrade this.');
          return;
        }
        pdata.inventory.splice(idx, 1);
        pdata.recipeRarityBoost[recipeId] = (pdata.recipeRarityBoost[recipeId] || 0) + 1;
        Persistent.save();
        refresh();
      });
    });
    container.querySelectorAll('[data-food-recipe]').forEach(btn => {
      btn.addEventListener('click', () => {
        const recipe = COOKING_RECIPES.find(r => r.id === btn.dataset.foodRecipe);
        if (!recipe || rec.profession.levels.cooking < recipe.levelReq) return;
        const cost = scaledRecipeCost(recipe.id, recipe.cost);
        const goldCost = this.craftGoldCost(classId, cost.gold);
        const canAfford = pdata.bankGold >= goldCost && Object.keys(cost).every(k => k === 'gold' || pdata.materials[k] >= cost[k]);
        if (!canAfford) {
          const costText = Object.entries(cost).map(([k, v]) => k === 'gold' ? `${goldCost} 🪙` : `${v} ${k}`).join(', ');
          this.showInsufficientResourcesAlert(`You need ${costText} to cook ${FOOD_TEMPLATES[recipe.defId].name}.`);
          return;
        }
        pdata.bankGold -= goldCost;
        Object.keys(cost).forEach(k => { if (k !== 'gold') pdata.materials[k] -= cost[k]; });
        pdata.inventory.push(instantiateFoodItem(recipe.defId, getFoodRecipeRarity(recipe.id)));
        Persistent.save();
        refresh();
      });
    });
    container.querySelectorAll('[data-upgrade-food-recipe]').forEach(btn => {
      btn.addEventListener('click', () => {
        const recipeId = btn.dataset.upgradeFoodRecipe;
        if (getFoodRecipeRarity(recipeId) === 'legendary') return;
        const idx = pdata.inventory.findIndex(i => i.slot === 'recipe' && i.recipeId === recipeId);
        if (idx === -1) {
          this.showInsufficientResourcesAlert('You need the matching Recipe item (drops rarely from encounters) to upgrade this.');
          return;
        }
        pdata.inventory.splice(idx, 1);
        pdata.recipeRarityBoost[recipeId] = (pdata.recipeRarityBoost[recipeId] || 0) + 1;
        Persistent.save();
        refresh();
      });
    });
  },

  // ---------------- House (pet/mount feeding + leveling) ----------------
  renderActiveBuffsList() {
    const pdata = Persistent.load();
    const now = Date.now();
    const active = pdata.activeBuffs.filter(b => b.expiresAt > now);
    if (!active.length) return '<p class="small-text">No active buffs.</p>';
    return active.map(b => {
      const minsLeft = Math.max(1, Math.round((b.expiresAt - now) / 60000));
      const desc = Object.keys(b.effect || {}).map(k => describeEffectLever(k, b.effect[k])).join(', ');
      return `<div class="gear-row"><div class="desc"><span>${b.icon}</span><div><strong>${b.label}</strong><div class="small-text">${desc} · ${minsLeft}m left</div></div></div></div>`;
    }).join('');
  },

  renderSanctuaryHouse(classId) {
    const pdata = Persistent.load();
    const rec = Persistent.getCharacter(classId);
    const foodItems = pdata.inventory.filter(i => i.slot === 'food');

    // Feed AND Equip live together here now - previously Equip/Unequip was
    // its own separate popup under the Inventory tab, which meant managing
    // one pet meant bouncing between two tabs. One per character, same as
    // any other equip slot.
    const companionSection = (kind, pool, ownedIds) => {
      if (!ownedIds.length) return `<p class="small-text">No ${kind}s tamed yet - find one on a Wild Creature encounter.</p>`;
      return ownedIds.map(id => {
        const def = pool[id];
        const progress = getCompanionProgress(kind, id);
        const maxed = progress.level >= PROFESSION_MAX_LEVEL;
        const xpNeed = maxed ? 0 : professionXpForLevel(progress.level);
        const pct = maxed ? 100 : Math.min(100, Math.round((progress.xp / xpNeed) * 100));
        const buffDesc = Object.keys(def.effect).map(k => describeEffectLever(k, def.effect[k])).join(', ');
        const equipped = rec.equipped[kind] === id;
        const displayName = companionDisplayName(kind, id, def);
        return `<div class="gear-row house-row ${equipped ? 'profession-active' : ''}">
          <div class="desc"><span>${def.icon}</span><div>
            <strong>${displayName}</strong> <span class="small-text">Lv.${progress.level}${maxed ? ' (max)' : ''}${equipped ? ' - Equipped' : ''}</span>
            <div class="small-text">${def.universe} · ${def.desc}</div>
            <input type="text" class="companion-name-input" data-rename-kind="${kind}" data-rename-id="${id}" maxlength="16" placeholder="${def.name} (rename)" value="${escapeHtml(progress.name || '')}" title="Give your ${def.name} a nickname">
            <div class="xp-bar-wrap" style="margin-top:4px;width:180px"><div class="xp-bar-fill" style="width:${pct}%"></div></div>
            <div class="small-text">${maxed ? 'Max level' : `${progress.xp} / ${xpNeed} XP`}</div>
          </div></div>
          <div class="house-feed">
            <button class="btn-secondary" data-companion-kind="${kind}" data-companion-id="${id}">${equipped ? 'Unequip' : 'Equip'}</button>
            <button class="btn-secondary" data-feed-kind="${kind}" data-feed-id="${id}" ${foodItems.length ? '' : 'disabled'} title="Grants ${displayName}'s own bonus (${buffDesc}) to you for 1 hour, plus experience to ${displayName}.">Feed</button>
          </div>
        </div>`;
      }).join('');
    };

    const recruitedRows = pdata.recruitedCompanions.length ? pdata.recruitedCompanions.map(c => {
      const equipped = pdata.equippedCompanionIds.includes(c.id);
      const cls = CLASSES[c.classId];
      const petDef = c.petId ? PETS[c.petId] : null;
      const mountDef = c.mountId ? MOUNTS[c.mountId] : null;
      const groupFull = pdata.equippedCompanionIds.length >= COMPANION_MAX_EQUIPPED;
      return `<div class="gear-row house-row ${equipped ? 'profession-active' : ''}">
        <div class="desc"><span class="sprite-mini">${characterSpriteFor(c.classId, 30)}</span><div>
          <strong>${c.name}</strong> <span class="small-text">Lv.${c.level} ${cls.name}${equipped ? ' - In Group' : ''}</span>
          <div class="small-text">ATK ${c.stats.atk} · DEF ${c.stats.def} · HP ${c.stats.maxHp}${petDef ? ` · ${petDef.icon} ${petDef.name}` : ''}${mountDef ? ` · ${mountDef.icon} ${mountDef.name}` : ''}</div>
        </div></div>
        <div style="display:flex;gap:6px">
          <button class="btn-secondary" data-toggle-companion="${c.id}" ${!equipped && groupFull ? 'disabled' : ''} title="${!equipped && groupFull ? `Group is full (max ${COMPANION_MAX_EQUIPPED})` : ''}">${equipped ? 'Remove from Group' : 'Add to Group'}</button>
          <button class="btn-secondary" data-dismiss-companion="${c.id}" title="Permanently remove this companion">Dismiss</button>
        </div>
      </div>`;
    }).join('') : '<p class="small-text">No companions recruited yet - use Settings on the title screen to Recruit a Companion from another player\'s save.</p>';

    return `
      <h4>🏠 House</h4>
      <details class="shop-category" data-key="pets" open>
        <summary>Pets <span class="small-text">(${pdata.ownedPets.length} tamed)</span></summary>
        ${companionSection('pet', PETS, pdata.ownedPets)}
      </details>
      <details class="shop-category" data-key="mounts" open>
        <summary>Mounts <span class="small-text">(${pdata.ownedMounts.length} tamed)</span></summary>
        ${companionSection('mount', MOUNTS, pdata.ownedMounts)}
      </details>
      ${pdata.recruitedCompanions.length ? `
      <details class="shop-category" data-key="companions" open>
        <summary>Companions <span class="small-text">(${pdata.equippedCompanionIds.length}/${COMPANION_MAX_EQUIPPED} in group - fight alongside you in every adventure, dungeon, and raid)</span></summary>
        ${recruitedRows}
      </details>` : ''}
      <h4 style="margin-top:16px">Active Buffs</h4>
      ${this.renderActiveBuffsList()}
    `;
  },

  // Named legendaries never appear here at all (unsellable), and permanent
  // relics live in a separate list (pdata.permanentRelics) that this never
  // touches - both satisfy "can't be sold" simply by never being sellable
  // inventory. An item currently worn by any character can't be sold
  // either, to avoid silently stripping someone's gear out from under them.
  // Containers/Recipes aren't rarity-scaled gear at all (no .rarity field) -
  // they're consumed via Open/Upgrade instead, not sold.
  sellableItems(pdata) {
    return pdata.inventory.filter(i => !i.legendary && i.slot !== 'recipe' && i.slot !== 'container');
  },

  renderSanctuaryShop() {
    const pdata = Persistent.load();
    const unpurchasedRelics = BANK_SHOP.relics.filter(entry => !pdata.permanentRelics.includes(entry.id));
    return `
      ${this.categoryButtonRow('shop-relics', '🏺', 'Permanent Relics', `${unpurchasedRelics.length} available - apply to every class, every run`)}
      ${this.categoryButtonRow('shop-spells', '📖', 'Spells', 'equip from Inventory')}
      ${this.categoryButtonRow('shop-gear', '🛡️', 'Starter Gear', `${BANK_SHOP.gear.length} items`)}
      ${this.categoryButtonRow('shop-sell', '🪙', 'Sell Items', `${this.sellableItems(pdata).length} sellable - value scales with rarity`)}
    `;
  },

  showShopRelicsModal(classId, tab) {
    this.showListModal('🏺 Permanent Relics', () => {
      const pdata = Persistent.load();
      const unpurchasedRelics = BANK_SHOP.relics.filter(entry => !pdata.permanentRelics.includes(entry.id));
      return unpurchasedRelics.length ? unpurchasedRelics.map(entry => {
        const r = RELICS[entry.id];
        return `<div class="gear-row"><div class="desc"><span>${r.icon}</span><div><strong>${r.name}</strong><div class="small-text">${r.desc}</div></div></div>
          <button class="btn-secondary" data-buy-relic="${entry.id}" ${pdata.bankGold < entry.price ? 'disabled' : ''}>${entry.price} 🪙</button></div>`;
      }).join('') : '<p class="small-text">All permanent relics purchased.</p>';
    }, (container, refresh) => {
      container.querySelectorAll('[data-buy-relic]').forEach(btn => {
        btn.addEventListener('click', () => {
          const pdata = Persistent.load();
          const id = btn.dataset.buyRelic;
          const entry = BANK_SHOP.relics.find(r => r.id === id);
          if (!entry || pdata.permanentRelics.includes(id) || pdata.bankGold < entry.price) return;
          pdata.bankGold -= entry.price;
          pdata.permanentRelics.push(id);
          Persistent.save();
          refresh();
        });
      });
    }, () => this.showSanctuary(classId, tab));
  },

  showShopSpellsModal(classId, tab) {
    this.showListModal('📖 Spells', () => {
      const pdata = Persistent.load();
      return BANK_SHOP.spells.map(entry => {
        const owned = pdata.unlockedSpells.includes(entry.id);
        const sp = SPELLS[entry.id];
        return `<div class="gear-row"><div class="desc"><span class="spell-icon"><img src="${sp.icon}" width="28" height="28" alt=""></span><div><strong>${sp.name}</strong><div class="small-text">${sp.desc}</div></div></div>
          <button class="btn-secondary" data-buy-spell="${entry.id}" ${owned || pdata.bankGold < entry.price ? 'disabled' : ''}>${owned ? 'Owned' : `${entry.price} 🪙`}</button></div>`;
      }).join('');
    }, (container, refresh) => {
      container.querySelectorAll('[data-buy-spell]').forEach(btn => {
        btn.addEventListener('click', () => {
          const pdata = Persistent.load();
          const id = btn.dataset.buySpell;
          const entry = BANK_SHOP.spells.find(sp => sp.id === id);
          if (!entry || pdata.unlockedSpells.includes(id) || pdata.bankGold < entry.price) return;
          pdata.bankGold -= entry.price;
          pdata.unlockedSpells.push(id);
          Persistent.save();
          refresh();
        });
      });
    }, () => this.showSanctuary(classId, tab));
  },

  showShopGearModal(classId, tab) {
    this.showListModal('🛡️ Starter Gear', () => {
      const pdata = Persistent.load();
      return BANK_SHOP.gear.map((entry, idx) => {
        const tmpl = GEAR_TEMPLATES[entry.defId];
        return `<div class="gear-row" style="border-left:3px solid ${RARITIES[entry.rarity].color}"><div class="desc"><span>${tmpl.icon}</span><div><strong style="color:${RARITIES[entry.rarity].color}">${tmpl.name}</strong><div class="small-text">${RARITIES[entry.rarity].label}</div></div></div>
          <button class="btn-secondary" data-buy-gear="${idx}" ${pdata.bankGold < entry.price ? 'disabled' : ''}>${entry.price} 🪙</button></div>`;
      }).join('');
    }, (container, refresh) => {
      container.querySelectorAll('[data-buy-gear]').forEach(btn => {
        btn.addEventListener('click', () => {
          const pdata = Persistent.load();
          const entry = BANK_SHOP.gear[parseInt(btn.dataset.buyGear, 10)];
          if (!entry || pdata.bankGold < entry.price) return;
          pdata.bankGold -= entry.price;
          pdata.inventory.push(instantiateGear(entry.defId, entry.rarity));
          Persistent.save();
          refresh();
        });
      });
    }, () => this.showSanctuary(classId, tab));
  },

  showShopSellModal(classId, tab) {
    this.showListModal('🪙 Sell Items', () => {
      const pdata = Persistent.load();
      const sellable = this.sellableItems(pdata);
      return sellable.length ? sellable.map(item => {
        const equippedBy = Object.keys(pdata.characters).find(cid => Object.values(pdata.characters[cid].equipped).includes(item.uid));
        const value = this.sellValueFor(item);
        return `<div class="gear-row" style="border-left:3px solid ${RARITIES[item.rarity].color}">
          <div class="desc"><span>${item.icon}</span><div><strong style="color:${RARITIES[item.rarity].color}">${item.name}</strong>
          <div class="small-text">${RARITIES[item.rarity].label} · ${SLOT_LABELS[item.slot] || item.slot}${equippedBy ? ` · worn by ${CLASSES[equippedBy].name}` : ''}</div></div></div>
          <button class="btn-secondary" data-sell-uid="${item.uid}" ${equippedBy ? 'disabled' : ''}>${equippedBy ? 'Equipped' : `Sell ${value} 🪙`}</button>
        </div>`;
      }).join('') : '<p class="small-text">Nothing to sell.</p>';
    }, (container, refresh) => {
      container.querySelectorAll('[data-sell-uid]').forEach(btn => {
        btn.addEventListener('click', () => {
          const pdata = Persistent.load();
          const uid = btn.dataset.sellUid;
          const item = Persistent.findItem(uid);
          if (!item || item.legendary) return;
          const equippedBy = Object.keys(pdata.characters).find(cid => Object.values(pdata.characters[cid].equipped).includes(uid));
          if (equippedBy) return;
          pdata.bankGold += this.sellValueFor(item);
          pdata.inventory = pdata.inventory.filter(i => i.uid !== uid);
          Persistent.save();
          refresh();
        });
      });
    }, () => this.showSanctuary(classId, tab));
  },

  // ---------------- Journal (a catalog of everything obtainable) ----------------
  // Weapons/armor count as "obtained" once any copy has ever landed in the
  // Sanctuary inventory (items are never removed, only equipped/unequipped,
  // so that inventory list is a reliable lifetime record); named legendaries
  // and pets/mounts each have their own dedicated owned-list already used
  // elsewhere. Anything not yet obtained shows as a ??? silhouette rather
  // than spoiling its name/art ahead of time.
  renderSanctuaryJournal() {
    const pdata = Persistent.load();
    const ownedDefIds = new Set(pdata.inventory.map(i => i.defId));

    const journalCard = (icon, name, detail, obtained, color) => obtained
      ? `<div class="journal-entry">
          <div class="journal-icon">${icon}</div>
          <div class="journal-name" ${color ? `style="color:${color}"` : ''}>${name}</div>
          ${detail ? `<div class="small-text">${detail}</div>` : ''}
        </div>`
      : `<div class="journal-entry unknown">
          <div class="journal-icon">❓</div>
          <div class="journal-name">???</div>
        </div>`;

    // filterFn takes a template and returns whether it belongs in this
    // group - lets weapons split by weaponType (ranged/wand/staff/...)
    // while armor/accessories still just split by slot.
    const gearCards = (filterFn) => {
      const base = Object.entries(GEAR_TEMPLATES).filter(([, t]) => filterFn(t))
        .map(([id, t]) => journalCard(t.icon, t.name, null, ownedDefIds.has(id)));
      const legendary = Object.entries(LEGENDARY_ITEMS).filter(([, t]) => filterFn(t))
        .map(([id, t]) => journalCard(t.icon, t.name, `${t.universe} · ${t.desc}`, pdata.ownedLegendaries.includes(id), RARITIES.legendary.color));
      return base.concat(legendary).join('');
    };

    const companionCards = (pool, ownedIds) => Object.entries(pool)
      .map(([id, def]) => journalCard(def.icon, def.name, `${def.universe} · ${def.desc}`, ownedIds.includes(id)))
      .join('');

    // Collapsed by default (same convention as the Shop/Inventory/Crafting
    // categories) so this doesn't turn into one enormous scroll - a group's
    // own count shows in its summary without needing to open it.
    const section = (key, label, innerHtml) => `
      <details class="shop-category" data-key="${key}">
        <summary>${label}</summary>
        <div class="journal-grid">${innerHtml}</div>
      </details>`;

    const weaponTypeSections = Object.keys(WEAPON_TYPE_LABELS).map(type =>
      section(`weapon-${type}`, WEAPON_TYPE_LABELS[type], gearCards(t => t.slot === 'weapon' && t.weaponType === type))
    ).join('');
    const armorSlots = ['chest', 'head', 'neck', 'shoulders', 'back', 'shirt', 'tabard', 'wrists', 'hands', 'waist', 'legs', 'boots', 'ring', 'trinket'];
    const armorSections = armorSlots.map(slot => section(`armor-${slot}`, SLOT_LABELS[slot], gearCards(t => t.slot === slot))).join('');

    // Only zones the account has actually reached (Meta.bestAct, the same
    // "highest act" tracker the class-select screen's Pick Up button reads)
    // show up at all - no point in showing a reputation bar (or its bonus)
    // for a zone the player hasn't set foot in yet.
    const reachedThemeCount = this.reachedActThemes().length;

    return `
      ${this.categoryButtonRow('journal-reputation', '🎖️', 'Reputation', `${reachedThemeCount} zone${reachedThemeCount === 1 ? '' : 's'} reached - earned by completing nodes while adventuring there`)}
      <h4 style="margin-top:16px">Weapons</h4>
      ${weaponTypeSections}
      <h4 style="margin-top:16px">Armor & Accessories</h4>
      ${armorSections}
      <h4 style="margin-top:16px">Companions</h4>
      ${section('pets', 'Pets', companionCards(PETS, pdata.ownedPets))}
      ${section('mounts', 'Mounts', companionCards(MOUNTS, pdata.ownedMounts))}
    `;
  },

  // Each ACT_THEMES entry covers 10 acts (see getActTheme in data.js) - a
  // theme counts as "reached" once the account's highest recorded act
  // (Meta.bestAct) falls anywhere in that range, matching the class-select
  // screen's own "Pick up from your highest act" gate.
  reachedActThemes() {
    const bestAct = Meta.load().bestAct;
    return ACT_THEMES.filter((theme, idx) => bestAct >= idx * 10 + 1);
  },

  showJournalReputationModal() {
    this.showListModal('🎖️ Reputation', () => {
      const themes = this.reachedActThemes();
      if (!themes.length) return '<p class="small-text">Reach Act 1\'s end to start earning reputation with Elderglen Forest.</p>';
      return themes.map(theme => {
        const { rep, tier, next, idx } = getReputationProgress(theme.id);
        const pct = next ? Math.min(100, Math.round(((rep - tier.threshold) / (next.threshold - tier.threshold)) * 100)) : 100;
        return `<div class="gear-row">
          <div class="desc"><span>${theme.particle}</span><div>
            <strong style="color:${theme.accent}">${theme.name}</strong> <span class="small-text">${tier.name}${idx > 0 ? ` (+${(idx * REPUTATION_GOLD_BONUS_PER_TIER * 100).toFixed(1)}% gold)` : ''}</span>
            <div class="xp-bar-wrap" style="margin-top:4px;width:180px"><div class="xp-bar-fill" style="width:${pct}%"></div></div>
            <div class="small-text">${next ? `${rep} / ${next.threshold} to ${next.name}` : `${rep} rep - Exalted (max)`}</div>
          </div></div>
        </div>`;
      }).join('');
    }, () => {}, null);
  },

  renderSanctuaryQuests(classId) {
    const active = getActiveQuests();
    const available = getAvailableQuests();

    const rewardText = (reward) => {
      const parts = [];
      if (reward.gold) parts.push(`${reward.gold} 🪙`);
      if (reward.xp) parts.push(`${reward.xp} XP`);
      if (reward.honor) parts.push(`${reward.honor} Honor`);
      if (reward.item) parts.push(`${RARITIES[reward.item.rarity].label} ${GEAR_TEMPLATES[reward.item.defId].name}`);
      if (reward.relic) parts.push(`${RELICS[reward.relic].icon} ${RELICS[reward.relic].name} (permanent)`);
      if (reward.resourceChance) parts.push('a random resource');
      if (reward.epicItem) parts.push('1 random Epic item');
      return parts.join(', ');
    };

    const activeRows = active.length ? active.map(q => {
      const scaled = getScaledQuest(q);
      const progress = Persistent.load().questProgress[q.id] || 0;
      const ready = isQuestReady(q.id);
      const pct = Math.min(100, Math.round((progress / scaled.objective.target) * 100));
      const tierTag = scaled.tier > 0 ? ` <span class="small-text">(Repeat ${scaled.tier + 1})</span>` : '';
      return `<div class="gear-row quest-row">
        <div class="desc"><div><strong>${q.name}</strong>${tierTag}<div class="small-text">${scaled.desc}</div>
        <div class="xp-bar-wrap" style="margin-top:4px"><div class="xp-bar-fill" style="width:${pct}%"></div></div>
        <div class="small-text">${progress} / ${scaled.objective.target} · Reward: ${rewardText(scaled.reward)}</div></div></div>
        <button class="btn-secondary" data-claim-quest="${q.id}" ${ready ? '' : 'disabled'}>${ready ? 'Claim' : 'In Progress'}</button>
      </div>`;
    }).join('') : '<p class="small-text">No active quests. Accept one below.</p>';

    const availableRows = available.length ? available.map(q => {
      const scaled = getScaledQuest(q);
      const tierTag = scaled.tier > 0 ? ` <span class="small-text">(Repeat ${scaled.tier + 1})</span>` : '';
      return `<div class="gear-row quest-row">
        <div class="desc"><div><strong>${q.name}</strong>${tierTag}<div class="small-text">${scaled.desc}</div>
        <div class="small-text">Reward: ${rewardText(scaled.reward)}</div></div></div>
        <button class="btn-secondary" data-accept-quest="${q.id}">Accept</button>
      </div>`;
    }).join('') : '<p class="small-text">No quests available.</p>';

    const anyReady = active.some(q => isQuestReady(q.id));
    return `
      <div class="quest-bulk-actions" style="display:flex;gap:8px;margin-bottom:10px">
        <button class="btn-secondary" data-accept-all-quests ${available.length ? '' : 'disabled'}>Accept All</button>
        <button class="btn-secondary" data-claim-all-quests ${anyReady ? '' : 'disabled'}>Complete All</button>
      </div>
      <h4>Active Quests <span class="small-text">(claiming XP applies to ${CLASSES[classId].name})</span></h4>${activeRows}
      <h4>Available Quests</h4>${availableRows}
    `;
  },

  // ---------------- Gathering professions ----------------
  // Only the equipped ("active") profession actually gains XP - see
  // grantProfessionXpToCharacter in progression.js and its call sites
  // throughout this file (every resolved encounter grants a little).
  // Shared by the Sanctuary Gathering tab and the mid-adventure Inventory
  // panel (see showInRunInventory) - lets a profession be switched during a
  // run the same way gear can be.
  renderProfessionRows(classId) {
    const rec = Persistent.getCharacter(classId);
    const prof = rec.profession;
    return Object.values(PROFESSIONS).map(p => {
      const level = prof.levels[p.id];
      const xp = prof.xp[p.id];
      const active = prof.active === p.id;
      const maxed = level >= PROFESSION_MAX_LEVEL;
      const xpNeed = maxed ? 0 : professionXpForLevel(level);
      const pct = maxed ? 100 : Math.min(100, Math.round((xp / xpNeed) * 100));
      const passive = PROFESSION_PASSIVES[p.id];
      return `<div class="gear-row profession-row ${active ? 'profession-active' : ''}">
        <div class="desc"><span>${p.icon}</span><div>
          <strong>${p.name}</strong> <span class="small-text">Lv.${level}${maxed ? ' (max)' : ''}${active ? ' - Equipped' : ''}</span>
          <div class="small-text">${p.desc}</div>
          <div class="small-text">${passive.desc}</div>
          <div class="xp-bar-wrap" style="margin-top:4px; width:180px;"><div class="xp-bar-fill" style="width:${pct}%"></div></div>
          <div class="small-text">${maxed ? 'Max level' : `${xp} / ${xpNeed} XP`}</div>
        </div></div>
        <button class="btn-secondary" data-profession="${p.id}">${active ? 'Unequip' : 'Equip'}</button>
      </div>`;
    }).join('');
  },

  wireProfessionClicks(classId, root, onChange) {
    const rec = Persistent.getCharacter(classId);
    root.querySelectorAll('[data-profession]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.profession;
        rec.profession.active = rec.profession.active === id ? null : id;
        Persistent.save();
        onChange();
      });
    });
  },

  // ---------------- Disenchanting ----------------
  // Weapons/armor/accessories only (recipes/containers/food aren't gear),
  // never a named legendary (irreplaceable, like the Shop's Sell won't touch
  // them either), and never anything any character currently has equipped.
  disenchantableItems(pdata) {
    const equippedUids = new Set();
    Object.values(pdata.characters).forEach(c => Object.values(c.equipped).forEach(uid => { if (uid) equippedUids.add(uid); }));
    const gearSlots = new Set(['weapon', 'chest', 'head', 'neck', 'shoulders', 'back', 'shirt', 'tabard', 'wrists', 'hands', 'waist', 'legs', 'boots', 'ring', 'trinket']);
    return pdata.inventory.filter(i => gearSlots.has(i.slot) && !i.legendary && !equippedUids.has(i.uid));
  },

  // Same "would this beat what's currently in that slot" heuristic as the
  // Armory's upgrade-glow (hasUpgradeAvailable), just for an arbitrary item
  // rather than one already in the inventory list - drives Auto Disenchant.
  isUpgradeFor(classId, item) {
    const keys = equipSlotKeysFor(classId, item);
    if (!keys.length) return false;
    const rec = Persistent.getCharacter(classId);
    return keys.some(key => {
      const currentUid = rec.equipped[key];
      const currentPower = currentUid ? this.gearPower(Persistent.findItem(currentUid)) : 0;
      return this.gearPower(item) > currentPower;
    });
  },

  // Appended to <body> (like showSettingsModal) so it survives independently
  // of the Sanctuary underneath - `render()` redraws just the modal's own
  // content on every action instead of re-running the whole Sanctuary
  // template, and closing it does one showSanctuary refresh so the header's
  // material counts and the Disenchanting level catch up.
  // ---------------- Enchanting (combined Disenchant + Enchant screen) ----------------
  // One screen, two sections: break unwanted gear down into Dust/Shard/Crystal
  // up top, then spend those materials enchanting your equipped items below
  // via the same paperdoll-based picker enchanting always used. Reuses
  // renderArmoryPaperdoll as-is (a "mirror of the Armory screen") - clicking a
  // filled slot opens an enchant list for whatever's equipped there instead
  // of a gear-swap picker; an empty slot is a no-op since there's nothing to
  // enchant.
  showEnchantingModal(classId, onClose) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    let selectedSlot = null;
    const closeModal = () => { overlay.remove(); if (onClose) onClose(); };
    const render = () => {
      const pdata = Persistent.load();
      const rec = Persistent.getCharacter(classId);
      const d = rec.disenchanting;
      const maxed = d.level >= DISENCHANT_MAX_LEVEL;
      const xpNeed = maxed ? 0 : professionXpForLevel(d.level);
      const items = this.disenchantableItems(pdata);
      const disenchantRows = items.map(item => {
        const yieldAmounts = disenchantYieldFor(item.rarity, d.level);
        const yieldText = Object.entries(yieldAmounts).map(([k, v]) => `${v} ${k}`).join(', ');
        const upgrade = this.isUpgradeFor(classId, item);
        return `<div class="gear-row" style="border-left:3px solid ${RARITIES[item.rarity].color}">
          <div class="desc"><span>${item.icon}</span><div>
            <strong style="color:${RARITIES[item.rarity].color}">${item.name}</strong>
            <div class="small-text">${RARITIES[item.rarity].label} · ${SLOT_LABELS[item.slot] || item.slot}${upgrade ? ` · <span style="color:var(--good)">upgrade for ${CLASSES[classId].name}</span>` : ''}</div>
            <div class="small-text">Yields ${yieldText}</div>
          </div></div>
          <button class="btn-secondary" data-disenchant-uid="${item.uid}">Disenchant</button>
        </div>`;
      }).join('') || '<p class="small-text">Nothing in your inventory can be disenchanted right now.</p>';

      overlay.innerHTML = `
        <div class="panel modal-panel" style="max-width:640px">
          <h4>♻️ Enchanting <span class="small-text">Disenchanting Lv.${d.level}${maxed ? ' (max)' : ''}</span></h4>
          ${maxed ? '' : `<div class="xp-bar-wrap"><div class="xp-bar-fill" style="width:${Math.min(100, Math.round(d.xp / xpNeed * 100))}%"></div></div><div class="small-text">${d.xp} / ${xpNeed} XP</div>`}
          <div class="small-text" style="margin:8px 0">✨ ${pdata.materials.dust} Dust · 🔹 ${pdata.materials.shard} Shard · 💠 ${pdata.materials.crystal} Crystal</div>
          <button class="btn-primary" id="btn-auto-disenchant" ${items.length ? '' : 'disabled'}>Auto Disenchant Non-Upgrades</button>
          <div style="margin-top:10px;display:flex;flex-direction:column;gap:8px;max-height:220px;overflow-y:auto">${disenchantRows}</div>
          <hr style="margin:16px 0;border-color:var(--border)">
          <h4 style="margin-top:0">Enchant <span class="small-text">- select an equipped item, then choose an enchant</span></h4>
          ${this.renderArmoryPaperdoll(classId)}
          ${selectedSlot && rec.equipped[selectedSlot] ? this.renderEnchantPicker(classId, selectedSlot) : ''}
          <button class="btn-secondary" id="btn-close-enchanting" style="margin-top:14px">Close</button>
        </div>`;

      overlay.querySelectorAll('[data-disenchant-uid]').forEach(btn => {
        btn.addEventListener('click', () => {
          const idx = pdata.inventory.findIndex(i => i.uid === btn.dataset.disenchantUid);
          if (idx === -1) return;
          const item = pdata.inventory[idx];
          pdata.inventory.splice(idx, 1);
          disenchantItem(rec, pdata, item);
          Persistent.save();
          render();
        });
      });
      const autoBtn = document.getElementById('btn-auto-disenchant');
      if (autoBtn) autoBtn.addEventListener('click', () => {
        this.disenchantableItems(pdata).filter(i => !this.isUpgradeFor(classId, i)).forEach(item => {
          const idx = pdata.inventory.findIndex(i => i.uid === item.uid);
          if (idx === -1) return;
          pdata.inventory.splice(idx, 1);
          disenchantItem(rec, pdata, item);
        });
        Persistent.save();
        render();
      });
      overlay.querySelectorAll('[data-slot-key]').forEach(el => {
        el.addEventListener('click', () => {
          const key = el.dataset.slotKey;
          if (!rec.equipped[key]) return;
          selectedSlot = selectedSlot === key ? null : key;
          render();
        });
      });
      overlay.querySelectorAll('[data-apply-enchant]').forEach(btn => {
        btn.addEventListener('click', () => {
          const enchant = ENCHANTS[btn.dataset.applyEnchant];
          const item = Persistent.findItem(rec.equipped[selectedSlot]);
          if (!enchant || !item) return;
          const canAfford = Object.keys(enchant.cost).every(k => (pdata.materials[k] || 0) >= enchant.cost[k]);
          if (!canAfford) {
            const costText = Object.entries(enchant.cost).map(([k, v]) => `${v} ${k}`).join(', ');
            this.showInsufficientResourcesAlert(`You need ${costText} to apply this enchant.`);
            return;
          }
          Object.keys(enchant.cost).forEach(k => { pdata.materials[k] -= enchant.cost[k]; });
          item.enchantId = enchant.id;
          Persistent.save();
          render();
        });
      });
      document.getElementById('btn-close-enchanting').addEventListener('click', closeModal);
    };
    overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });
    document.body.appendChild(overlay);
    render();
  },

  // The enchant list shown below the paperdoll once a filled slot is picked -
  // only this class's own flavored enchant plus the universal one (see
  // enchantsFor in progression.js). One enchant per item, same as WoW - a
  // new Apply replaces whatever was there before (its materials aren't
  // refunded, matching how re-equipping different gear works everywhere else).
  renderEnchantPicker(classId, slotKey) {
    const pdata = Persistent.load();
    const rec = Persistent.getCharacter(classId);
    const item = Persistent.findItem(rec.equipped[slotKey]);
    if (!item) return '';
    const rows = enchantsFor(classId).map(e => {
      const costText = Object.entries(e.cost).map(([k, v]) => `${v} ${k}`).join(', ');
      const effectText = Object.keys(e.effect).map(k => describeEffectLever(k, e.effect[k])).join(', ');
      const isCurrent = item.enchantId === e.id;
      return `<div class="gear-row" style="${isCurrent ? 'border-left:3px solid var(--accent)' : ''}">
        <div class="desc"><span>${e.icon}</span><div>
          <strong>${e.name}</strong>${isCurrent ? ' <span class="small-text">(active)</span>' : ''}
          <div class="small-text">${e.desc} - ${effectText}</div>
          <div class="small-text">Costs ${costText}</div>
        </div></div>
        <button class="btn-secondary" data-apply-enchant="${e.id}" ${isCurrent ? 'disabled' : ''}>${isCurrent ? 'Active' : 'Apply'}</button>
      </div>`;
    }).join('');
    return `
      <div class="char-customize" style="margin-top:12px">
        <h4>Enchant ${item.icon} ${item.name}</h4>
        ${rows}
      </div>`;
  },


  // ---------------- Dungeons & Raids ----------------
  // Both entered straight from the Sanctuary rather than mid-adventure.
  // Dungeons are solo (tuned so the first is a fair fight around the listed
  // level and the last demands a high-level character); raids additionally
  // require a full party of 3 - real matchmaking isn't wired up yet, so the
  // other two are always filled by Ghosts (see generateGhostCompanion in
  // data.js) - and are scaled harder than a dungeon at a comparable level.
  raidEntryRow(entry, cost, dataAttr) {
    return `
      <div class="gear-row raid-row">
        <div class="desc"><span>${entry.icon}</span><div><strong>${entry.name}</strong>
        <div class="small-text">Recommended: Lv.${entry.recommendedLevel} · HP ${entry.hp} · ATK ${entry.atk} · DEF ${entry.def}</div></div></div>
        <button class="btn-secondary" ${dataAttr}="${entry.id}">Enter (${cost} 🪙)</button>
      </div>`;
  },

  renderSanctuaryRaids(classId) {
    return `
      ${this.categoryButtonRow('raids-dungeons', '🗝️', 'Dungeons', `${DUNGEONS.length} tiers - solo, level 5 through level 90`)}
      ${this.categoryButtonRow('raids-raids', '🐲', 'Raids', `${RAID_BOSSES.length} tiers - requires a full party of ${RAID_PARTY_SIZE}, a well-geared level 60 through a well-geared level 99`)}
    `;
  },

  showRaidsDungeonsModal(classId) {
    this.showListModal('🗝️ Dungeons', () => DUNGEONS.map(d => this.raidEntryRow(d, DUNGEON_COST, 'data-dungeon')).join(''),
      (container) => {
        container.querySelectorAll('[data-dungeon]').forEach(btn => {
          btn.addEventListener('click', () => {
            const pdata = Persistent.load();
            if (pdata.bankGold < DUNGEON_COST) { this.showInsufficientResourcesAlert(`You need ${DUNGEON_COST} 🪙 to enter this dungeon.`); return; }
            pdata.bankGold -= DUNGEON_COST;
            Persistent.save();
            container.remove();
            this.enterDungeon(classId, btn.dataset.dungeon);
          });
        });
      }, null);
  },

  showRaidsRaidsModal(classId) {
    this.showListModal('🐲 Raids', () => RAID_BOSSES.map(r => this.raidEntryRow(r, RAID_COST, 'data-raid')).join(''),
      (container) => {
        container.querySelectorAll('[data-raid]').forEach(btn => {
          btn.addEventListener('click', () => {
            const pdata = Persistent.load();
            if (pdata.bankGold < RAID_COST) { this.showInsufficientResourcesAlert(`You need ${RAID_COST} 🪙 to enter this raid.`); return; }
            pdata.bankGold -= RAID_COST;
            Persistent.save();
            container.remove();
            this.enterRaid(classId, btn.dataset.raid);
          });
        });
      }, null);
  },

  enterDungeon(classId, dungeonId) {
    const dungeon = DUNGEONS.find(d => d.id === dungeonId);
    Game.dungeon = { classId, dungeonId };
    Game.player = Game.buildRaidPlayer(classId);
    Game.player.hp = Game.effectiveStats().maxHp;
    // Same location-vs-boss naming split as enterRaid above.
    this.enterCombat({ type: 'dungeonBoss' }, { ...dungeon, name: BOSS_ART[dungeon.id] ? BOSS_ART[dungeon.id].name : dungeon.name });
  },

  showDungeonOutcome(won) {
    const classId = Game.dungeon.classId;
    const dungeon = DUNGEONS.find(d => d.id === Game.dungeon.dungeonId);
    let lines;
    if (won) {
      const goldReward = Game.addGold(rand(dungeon.gold[0], dungeon.gold[1]));
      const xpReward = Math.max(10, Math.round(dungeon.hp * 0.3));
      const levelResult = Game.grantXp(xpReward);
      recordQuestProgress(`dungeon:${dungeon.id}`, 1);
      lines = [`You clear ${dungeon.name}!`, ...this.rewardLines({ goldReward, xpReward, levelResult })];
    } else {
      lines = [`${dungeon.name} proves too much for you.`, `The ${DUNGEON_COST} 🪙 entry fee is not refunded.`];
    }
    Game.dungeon = null;
    Game.player = null;
    this.root.innerHTML = `
      <div class="center-screen">
        <h1 class="result-title ${won ? 'victory' : 'defeat'}">${won ? 'Dungeon Cleared!' : 'Defeated'}</h1>
        <p class="flavor">${lines.join('<br>')}</p>
        <button class="btn-primary" id="btn-dungeon-continue">Return to Sanctuary</button>
      </div>`;
    document.getElementById('btn-dungeon-continue').addEventListener('click', () => this.showSanctuary(classId, 'raids'));
  },

  enterRaid(classId, bossId) {
    const boss = RAID_BOSSES.find(b => b.id === bossId);
    // Equipped companions (real, recruited player characters - see the
    // House tab) automatically stand in for the 2 anonymous Ghosts whenever
    // any are equipped - their stat contribution already comes through
    // companionGroupStatBonus generically, so this only needs to skip the
    // old flat placeholder bonus and swap what the raid party displays.
    const equippedCompanions = getEquippedCompanions();
    const usingRealCompanions = equippedCompanions.length > 0;
    Game.raid = {
      classId, bossId,
      ghosts: usingRealCompanions ? [] : [generateGhostCompanion(classId), generateGhostCompanion(classId)],
      companions: usingRealCompanions ? equippedCompanions : []
    };
    Game.player = Game.buildRaidPlayer(classId);
    if (!usingRealCompanions) Game.player.raidGhostBonus = { atk: 6, def: 4, maxHp: 16 };
    Game.player.hp = Game.effectiveStats().maxHp;
    // The raid tab lists the location (e.g. "Icecrown Citadel"); the fight
    // itself names whichever individual boss the location's BOSS_ART entry
    // gives it (e.g. "Vaelkorath, the Hollow King"), same as the dungeon
    // equivalent below - falls back to the location name for any boss that
    // doesn't have full PixelLab art yet.
    this.enterCombat({ type: 'raidBoss' }, { ...boss, name: BOSS_ART[boss.id] ? BOSS_ART[boss.id].name : boss.name });
  },

  // Win or wipe, a raid always ends back at the Sanctuary Raids tab - there's
  // no map/node to return to since raids don't happen mid-adventure.
  showRaidOutcome(won) {
    const boss = RAID_BOSSES.find(b => b.id === Game.raid.bossId);
    const ghosts = Game.raid.ghosts;
    const classId = Game.raid.classId;
    let lines;
    if (won) {
      const goldReward = Game.addGold(rand(boss.gold[0], boss.gold[1]));
      const xpReward = Math.max(15, Math.round(boss.hp * 0.35));
      const levelResult = Game.grantXp(xpReward);
      recordQuestProgress(`raid:${boss.id}`, 1);
      lines = [
        `Your raid party brings down ${boss.name}!`,
        ...ghosts.map(g => `👻 ${g.name} nods approvingly.`),
        ...this.rewardLines({ goldReward, xpReward, levelResult })
      ];
    } else {
      lines = [
        `${boss.name} overwhelms your raid party.`,
        ...ghosts.map(g => `👻 ${g.name} fades from the field.`),
        `The ${RAID_COST} 🪙 entry fee is not refunded.`
      ];
    }
    Game.raid = null;
    Game.player = null;
    this.root.innerHTML = `
      <div class="center-screen">
        <h1 class="result-title ${won ? 'victory' : 'defeat'}">${won ? 'Raid Cleared!' : 'Raid Wipe'}</h1>
        <p class="flavor">${lines.join('<br>')}</p>
        <button class="btn-primary" id="btn-raid-continue">Return to Sanctuary</button>
      </div>`;
    document.getElementById('btn-raid-continue').addEventListener('click', () => this.showSanctuary(classId, 'raids'));
  },

  // ---------------- Save ----------------
  // A tiny reusable Yes/No popup, appended straight to <body> (not this.root)
  // so it survives independently of whatever Sanctuary re-render happens
  // while the user is deciding, and while the (async) save itself runs.
  showConfirmModal(title, message, yesLabel, noLabel, onYes, onNo) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="panel modal-panel">
        <h4>${title}</h4>
        <p class="flavor">${message}</p>
        <div style="display:flex;gap:10px;margin-top:14px">
          <button class="btn-primary" id="modal-yes">${yesLabel}</button>
          <button class="btn-secondary" id="modal-no">${noLabel}</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    const close = () => overlay.remove();
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
    overlay.querySelector('#modal-yes').addEventListener('click', () => { close(); if (onYes) onYes(); });
    overlay.querySelector('#modal-no').addEventListener('click', () => { close(); if (onNo) onNo(); });
  },

  // Opens a native file picker and hands the parsed JSON to `onLoaded` - used
  // both by "Import Save" (overwrite) and "Recruit Companion" (import as a
  // companion) in the Settings popup, since both start the same way.
  importSaveFile(onLoaded) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json';
    input.addEventListener('change', () => {
      const file = input.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try { onLoaded(JSON.parse(reader.result)); }
        catch (e) { window.alert("That file couldn't be read as a save file."); }
      };
      reader.readAsText(file);
    });
    input.click();
  },

  // The title screen's Settings popup - cheat-tab visibility, a quick Save,
  // and the two file-import flows (overwrite your own save / recruit a
  // companion from someone else's). Appended to <body> like showConfirmModal
  // so it's independent of the title screen underneath it.
  // A short, five-step walkthrough of the whole gameplay loop - shown
  // automatically once for a brand-new player (see showTitle), and
  // reachable anytime after via the title screen's "How to Play" button.
  showTutorialModal() {
    const step = (icon, title, text) => `
      <div class="tutorial-step">
        <span class="tutorial-step-icon">${icon}</span>
        <div><strong>${title}</strong><div class="small-text">${text}</div></div>
      </div>`;
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="panel modal-panel">
        <h4>Welcome to World of Salcraft!</h4>
        <div class="tutorial-steps">
          ${step('⚔️', '1. Choose a class, begin an adventure', "Each class fights differently and can only use certain weapon types. Once you set out, you'll walk a branching path of encounters.")}
          ${step('🗺️', '2. Pick your path', 'Battles, elites, rest sites, shops, treasure, and stranger things all wait on different nodes. Reach the act boss at the end to push into a new, harder zone.')}
          ${step('💀', '3. Fight smart', "Attack or use your class's Skill each round. Watch your HP - use an item or flee if a fight turns against you. Dying ends the run.")}
          ${step('🏠', '4. Build your Sanctuary', 'Character level, gear, gold, professions, reputation, and companions are all PERMANENT, stored in your Sanctuary - only what you carried in-pocket for that one run is lost on death.')}
          ${step('🤖', '5. Let AUTO take over', "Check the AUTO box (top of the screen, any time) to have your character fight and explore on its own, picking the toughest path forward - even keep progressing while you're away from the game.")}
        </div>
        <button class="btn-primary" id="tutorial-close" style="width:100%;margin-top:12px">Got it, let's go!</button>
      </div>`;
    document.body.appendChild(overlay);
    const close = () => {
      overlay.remove();
      const pdata = Persistent.load();
      if (!pdata.tutorialSeen) { pdata.tutorialSeen = true; Persistent.save(); }
    };
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
    overlay.querySelector('#tutorial-close').addEventListener('click', close);
  },

  // Account-wide, not per-character (see DIFFICULTIES in data.js and
  // currentDifficulty in progression.js) - takes effect immediately on
  // whatever's happening next (gold/XP/materials gained, and any fight
  // started after this point), not retroactively on the current HP/loot.
  showDifficultyModal() {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    const close = () => { overlay.remove(); this.showTitle(); };
    const render = () => {
      const pdata = Persistent.load();
      const rows = Object.values(DIFFICULTIES).map(d => {
        const active = pdata.difficulty === d.id;
        return `<div class="gear-row ${active ? 'profession-active' : ''}">
          <div class="desc"><div>
            <strong>${d.name}</strong>${active ? ' <span class="small-text">(current)</span>' : ''}
            <div class="small-text">${d.desc}</div>
          </div></div>
          <button class="btn-secondary" data-set-difficulty="${d.id}" ${active ? 'disabled' : ''}>${active ? 'Active' : 'Select'}</button>
        </div>`;
      }).join('');
      overlay.innerHTML = `
        <div class="panel modal-panel">
          <h4>🎚️ Change Difficulty</h4>
          ${rows}
          <button class="btn-secondary" id="btn-close-difficulty" style="margin-top:14px">Close</button>
        </div>`;
      overlay.querySelectorAll('[data-set-difficulty]').forEach(btn => {
        btn.addEventListener('click', () => {
          Persistent.load().difficulty = btn.dataset.setDifficulty;
          Persistent.save();
          render();
        });
      });
      overlay.querySelector('#btn-close-difficulty').addEventListener('click', close);
    };
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
    document.body.appendChild(overlay);
    render();
  },

  showSettingsModal() {
    const pdata = Persistent.load();
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="panel modal-panel">
        <h4>⚙️ Settings</h4>
        <label class="customize-row" style="max-width:100%">
          <span>Show Cheats tab (debugging)</span>
          <input type="checkbox" id="settings-show-cheats" ${pdata.showCheats ? 'checked' : ''}>
        </label>
        <button class="btn-primary" id="settings-save" style="margin-top:14px;width:100%">💾 Save Game</button>
        <div class="save-status" id="settings-save-status"></div>
        <button class="btn-secondary" id="settings-import-save" style="margin-top:10px;width:100%">📂 Import Save (overwrites your current save)</button>
        <button class="btn-secondary" id="settings-recruit" style="margin-top:10px;width:100%">🤝 Recruit Companion (import another player's save)</button>
        <div class="small-text" id="settings-recruit-status" style="margin-top:6px"></div>
        <button class="btn-secondary" id="settings-reset-progress" style="margin-top:14px;width:100%;border-color:var(--danger,#a83232);color:var(--danger,#e08080)">🗑️ Reset Progress</button>
        <button class="btn-secondary" id="settings-close" style="margin-top:14px;width:100%">Close</button>
      </div>`;
    document.body.appendChild(overlay);
    const close = () => overlay.remove();
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
    overlay.querySelector('#settings-close').addEventListener('click', close);

    overlay.querySelector('#settings-show-cheats').addEventListener('change', (e) => {
      pdata.showCheats = e.target.checked;
      Persistent.save();
    });

    overlay.querySelector('#settings-save').addEventListener('click', () => {
      this.showConfirmModal(
        'Save Game',
        "Save to the default location (your browser's Downloads folder)? Choose \"No\" to pick a custom file location instead.",
        'Yes, Default Location', 'No, Choose Location',
        () => this.performSaveGame(false, 'settings-save-status'),
        () => this.performSaveGame(true, 'settings-save-status')
      );
    });

    overlay.querySelector('#settings-import-save').addEventListener('click', () => {
      this.showConfirmModal(
        'Import Save',
        "This will permanently OVERWRITE your current save with the imported file - your current progress cannot be recovered afterward unless you've exported it first. Continue?",
        'Yes, Overwrite', 'Cancel',
        () => this.importSaveFile((data) => {
          if (!data || !data.persistent) { window.alert('That file is not a valid World of Salcraft save.'); return; }
          localStorage.setItem(Persistent.key, JSON.stringify(data.persistent));
          if (data.meta) localStorage.setItem(Meta.key, JSON.stringify(data.meta));
          Persistent.data = null;
          close();
          this.showTitle();
        })
      );
    });

    overlay.querySelector('#settings-recruit').addEventListener('click', () => {
      this.importSaveFile((data) => {
        const statusEl = document.getElementById('settings-recruit-status');
        if (!data || !data.persistent) { if (statusEl) statusEl.textContent = 'That file is not a valid save.'; return; }
        const result = recruitCompanionFromSave(data.persistent);
        if (statusEl) {
          statusEl.textContent = result.error || `Recruited ${result.companion.name} (Lv.${result.companion.level} ${CLASSES[result.companion.classId].name})! Equip them from the House tab.`;
        }
      });
    });

    overlay.querySelector('#settings-reset-progress').addEventListener('click', () => {
      this.showConfirmModal(
        'Reset Progress',
        "This will PERMANENTLY erase your entire Sanctuary - every character, gear, gold, profession, quest, and companion - and start over as if this were a brand-new save. This cannot be undone unless you've exported a save file first. Continue?",
        'Yes, Reset Everything', 'Cancel',
        () => { close(); this.resetProgress(); }
      );
    });
  },

  // Wipes both localStorage keys the game ever writes (see Persistent.key/
  // Meta.key) and drops back to the title screen fresh, as if this were a
  // brand-new save - the "start over" counterpart to Import Save.
  resetProgress() {
    localStorage.removeItem(Persistent.key);
    localStorage.removeItem(Meta.key);
    Persistent.data = null;
    Game.player = null;
    this.showTitle();
  },

  // Exports the whole persistent save as a downloadable JSON file. `useFilePicker`
  // routes through the File System Access API (a real native "choose where to
  // save" dialog - Chromium browsers only) instead of the default Downloads
  // folder. `statusElId` is updated directly (not via showSanctuary) so the
  // spinner/checkmark animate smoothly without a full re-render interrupting
  // them - defaults to the Sanctuary Save tab's element, but the title
  // screen's Settings popup passes its own so the two never collide.
  async performSaveGame(useFilePicker, statusElId) {
    const statusEl = document.getElementById(statusElId || 'save-status');
    const setStatus = (html) => { if (statusEl) statusEl.innerHTML = html; };
    setStatus('<span class="save-spinner">💾</span> <span class="small-text">Saving...</span>');
    const payload = JSON.stringify({ persistent: Persistent.load(), meta: Meta.load(), savedAt: new Date().toISOString() }, null, 2);
    const filename = `world-of-salcraft-save-${new Date().toISOString().slice(0, 10)}.json`;
    try {
      if (useFilePicker && window.showSaveFilePicker) {
        const handle = await window.showSaveFilePicker({
          suggestedName: filename,
          types: [{ description: 'World of Salcraft Save', accept: { 'application/json': ['.json'] } }]
        });
        const writable = await handle.createWritable();
        await writable.write(payload);
        await writable.close();
      } else {
        if (useFilePicker) setStatus('<span class="small-text">Your browser can\'t open a folder picker directly - saving to your default Downloads location instead.</span>');
        await new Promise(r => setTimeout(r, 350));
        const blob = new Blob([payload], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = filename;
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
      setStatus('<span class="save-done">✅ Saved!</span>');
      setTimeout(() => setStatus(''), 2200);
    } catch (e) {
      if (e.name === 'AbortError') { setStatus(''); return; }
      setStatus(`<span style="color:var(--bad)">Save failed: ${escapeHtml(e.message)}</span>`);
    }
  },

  // ---------------- Cheats (debugging only) ----------------
  renderSanctuaryCheats(classId) {
    const cheatRow = (id, label, desc) => `
      <div class="gear-row"><div class="desc"><div><strong>${label}</strong><div class="small-text">${desc}</div></div></div>
        <button class="btn-secondary" data-cheat="${id}">Run</button></div>`;
    return `
      <h4>🐞 Cheats <span class="small-text">(debugging only)</span></h4>
      <p class="flavor">These bypass normal progression instantly and permanently - there's no confirmation and no undo.</p>
      ${cheatRow('gold', 'Add 1000 Gold', 'Adds 1000 bank gold.')}
      ${cheatRow('resources', 'Add 1000 of All Resources', 'Adds 1000 ore, leather, essence, herbs, wood, and fish.')}
      ${cheatRow('maxLevelChars', 'Max Level All Characters', `Sets every character to level ${MAX_LEVEL}.`)}
      ${cheatRow('maxProfessions', 'Max Level All Gathering Professions', `Sets every profession to level ${PROFESSION_MAX_LEVEL} for every character.`)}
      ${cheatRow('maxTalents', 'Max Level All Class Talents', 'Maxes every talent rank in every tree for every class.')}
      ${cheatRow('allEquipment', 'Add All Equipment to Inventory', 'Adds a Legendary-rarity copy of every gear template, plus every named Legendary item.')}
      ${cheatRow('allRelics', 'Add All Permanent Relics', 'Grants every permanent relic.')}
      ${cheatRow('upgradeRecipes', 'Upgrade All Recipes', "Raises every Crafting recipe to its maximum rarity ceiling.")}
      ${cheatRow('completeQuests', 'Complete All Quests', `Accepts, completes, and claims every quest once (XP applies to ${CLASSES[classId].name}).`)}
      ${cheatRow('completeJournal', 'Complete Journal', 'Reveals every gear template, Legendary item, pet, and mount in the Journal.')}
    `;
  },

  wireSanctuaryBodyEvents(classId, tab) {
    const pdata = Persistent.load();
    const rec = Persistent.getCharacter(classId);

    if (tab === 'character') {
      // 'change' rather than 'input' - commits once the field is left (text)
      // or the picker closes (color), instead of re-rendering the whole
      // Sanctuary (and losing focus/cursor position) on every keystroke.
      const nameInput = document.getElementById('char-name-input');
      if (nameInput) nameInput.addEventListener('change', () => {
        rec.customization.name = nameInput.value.trim().slice(0, 16);
        Persistent.save();
        this.showSanctuary(classId, tab);
      });
      const autoEquipChk = document.getElementById('chk-auto-equip');
      if (autoEquipChk) autoEquipChk.addEventListener('change', () => {
        rec.autoEquip = autoEquipChk.checked;
        if (rec.autoEquip) this.autoEquipBestGear(classId);
        Persistent.save();
        this.showSanctuary(classId, tab);
      });
      // Clicking a paperdoll slot toggles the inline picker for it (see
      // renderSlotPicker); clicking the same slot again closes it.
      this.root.querySelectorAll('[data-slot-key]').forEach(el => {
        el.addEventListener('click', () => {
          this.selectedArmorySlot = this.selectedArmorySlot === el.dataset.slotKey ? null : el.dataset.slotKey;
          this.showSanctuary(classId, tab);
        });
      });
      this.root.querySelectorAll('[data-picker-uid]').forEach(btn => {
        btn.addEventListener('click', () => {
          const uid = btn.dataset.pickerUid, key = btn.dataset.pickerKey;
          if (rec.equipped[key] === uid) {
            unequipItemEverywhereOnRecord(rec, uid);
          } else {
            const item = Persistent.findItem(uid);
            if (!item) return;
            Persistent.unequipEverywhere(uid);
            equipItemToSlot(rec, item, key);
          }
          Persistent.save();
          // Equipping (or unequipping) closes the picker automatically -
          // clicking Close afterward was a redundant extra step.
          this.selectedArmorySlot = null;
          this.showSanctuary(classId, tab);
        });
      });
      const closePickerBtn = document.getElementById('btn-close-slot-picker');
      if (closePickerBtn) closePickerBtn.addEventListener('click', () => {
        this.selectedArmorySlot = null;
        this.showSanctuary(classId, tab);
      });
      const pickerOverlay = document.getElementById('slot-picker-overlay');
      if (pickerOverlay) pickerOverlay.addEventListener('click', (e) => {
        if (e.target !== pickerOverlay) return;
        this.selectedArmorySlot = null;
        this.showSanctuary(classId, tab);
      });
      // Talents now render as part of this same Character tab (see the
      // showSanctuary body dispatch) - its click handlers live here too.
      this.root.querySelectorAll('[data-open-category^="talent-"]').forEach(btn => {
        const treeKey = btn.dataset.openCategory.slice('talent-'.length);
        btn.addEventListener('click', () => this.showTalentTreeModal(classId, treeKey, () => this.showSanctuary(classId, tab)));
      });
      const resetTalentsBtn = document.getElementById('btn-reset-talents');
      if (resetTalentsBtn) resetTalentsBtn.addEventListener('click', () => {
        if (pdata.bankGold < 50) { this.showInsufficientResourcesAlert('You need 50 🪙 to reset your talents.'); return; }
        pdata.bankGold -= 50;
        resetTalents(rec);
        Persistent.save();
        this.showSanctuary(classId, tab);
      });
    } else if (tab === 'inventory') {
      this.wireInventoryCategoryClicks(classId, this.root, () => this.showSanctuary(classId, tab));
    } else if (tab === 'professions') {
      const profModals = { 'prof-enchanting': 'showEnchantingModal', 'prof-weapons': 'showProfWeaponsModal', 'prof-armor': 'showProfArmorModal', 'prof-cooking': 'showProfCookingModal', 'prof-gathering': 'showProfGatheringModal' };
      this.root.querySelectorAll('[data-open-category]').forEach(btn => {
        btn.addEventListener('click', () => this[profModals[btn.dataset.openCategory]](classId, () => this.showSanctuary(classId, tab)));
      });
    } else if (tab === 'shop') {
      const shopModals = { 'shop-relics': 'showShopRelicsModal', 'shop-spells': 'showShopSpellsModal', 'shop-gear': 'showShopGearModal', 'shop-sell': 'showShopSellModal' };
      this.root.querySelectorAll('[data-open-category]').forEach(btn => {
        btn.addEventListener('click', () => this[shopModals[btn.dataset.openCategory]](classId, tab));
      });
    } else if (tab === 'quests') {
      this.root.querySelectorAll('[data-accept-quest]').forEach(btn => {
        btn.addEventListener('click', () => {
          acceptQuest(btn.dataset.acceptQuest);
          this.showSanctuary(classId, tab);
        });
      });
      this.root.querySelectorAll('[data-claim-quest]').forEach(btn => {
        btn.addEventListener('click', () => {
          claimQuest(btn.dataset.claimQuest, classId);
          if (Persistent.getCharacter(classId).autoEquip) this.autoEquipBestGear(classId);
          this.showSanctuary(classId, tab);
        });
      });
      const acceptAllBtn = this.root.querySelector('[data-accept-all-quests]');
      if (acceptAllBtn) acceptAllBtn.addEventListener('click', () => {
        acceptAllQuests();
        this.showSanctuary(classId, tab);
      });
      const claimAllBtn = this.root.querySelector('[data-claim-all-quests]');
      if (claimAllBtn) claimAllBtn.addEventListener('click', () => {
        completeAllQuests(classId);
        if (Persistent.getCharacter(classId).autoEquip) this.autoEquipBestGear(classId);
        this.showSanctuary(classId, tab);
      });
    } else if (tab === 'pvp') {
      const findBtn = document.getElementById('btn-find-pvp-match');
      if (findBtn) findBtn.addEventListener('click', () => this.enterPvpMatch(classId));
      const randomPvpChk = document.getElementById('chk-random-pvp');
      if (randomPvpChk) randomPvpChk.addEventListener('change', () => {
        pdata.randomPvpEnabled = randomPvpChk.checked;
        Persistent.save();
      });
      this.root.querySelectorAll('[data-equip-pvp]').forEach(btn => {
        btn.addEventListener('click', () => {
          const kind = btn.dataset.equipPvp, uid = btn.dataset.pvpUid;
          rec.pvpEquipped[kind] = rec.pvpEquipped[kind] === uid ? null : uid;
          Persistent.save();
          this.showSanctuary(classId, tab);
        });
      });
      const honorShopBtn = this.root.querySelector('[data-open-category="pvp-honor-shop"]');
      if (honorShopBtn) honorShopBtn.addEventListener('click', () => this.showPvpHonorShopModal(classId, () => this.showSanctuary(classId, tab)));
    } else if (tab === 'journal') {
      const repBtn = this.root.querySelector('[data-open-category="journal-reputation"]');
      if (repBtn) repBtn.addEventListener('click', () => this.showJournalReputationModal());
    } else if (tab === 'raids') {
      const raidsModals = { 'raids-dungeons': 'showRaidsDungeonsModal', 'raids-raids': 'showRaidsRaidsModal' };
      this.root.querySelectorAll('[data-open-category]').forEach(btn => {
        btn.addEventListener('click', () => this[raidsModals[btn.dataset.openCategory]](classId));
      });
    } else if (tab === 'house') {
      this.root.querySelectorAll('[data-feed-kind]').forEach(btn => {
        btn.addEventListener('click', () => {
          this.showFoodPickerModal(classId, btn.dataset.feedKind, btn.dataset.feedId);
        });
      });
      // 'change' (not 'input') - same reasoning as the character name field
      // above: commits once the field is left, rather than re-rendering (and
      // losing focus/cursor) on every keystroke.
      this.root.querySelectorAll('[data-rename-kind]').forEach(input => {
        input.addEventListener('change', () => {
          const progress = getCompanionProgress(input.dataset.renameKind, input.dataset.renameId);
          progress.name = input.value.trim().slice(0, 16);
          Persistent.save();
          this.showSanctuary(classId, tab);
        });
      });
      this.root.querySelectorAll('[data-companion-kind]').forEach(btn => {
        btn.addEventListener('click', () => {
          const k = btn.dataset.companionKind, id = btn.dataset.companionId;
          rec.equipped[k] = rec.equipped[k] === id ? null : id;
          Persistent.save();
          this.showSanctuary(classId, tab);
        });
      });
      this.root.querySelectorAll('[data-toggle-companion]').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.dataset.toggleCompanion;
          const idx = pdata.equippedCompanionIds.indexOf(id);
          if (idx !== -1) pdata.equippedCompanionIds.splice(idx, 1);
          else if (pdata.equippedCompanionIds.length < COMPANION_MAX_EQUIPPED) pdata.equippedCompanionIds.push(id);
          Persistent.save();
          this.showSanctuary(classId, tab);
        });
      });
      this.root.querySelectorAll('[data-dismiss-companion]').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.dataset.dismissCompanion;
          pdata.recruitedCompanions = pdata.recruitedCompanions.filter(c => c.id !== id);
          pdata.equippedCompanionIds = pdata.equippedCompanionIds.filter(cid => cid !== id);
          Persistent.save();
          this.showSanctuary(classId, tab);
        });
      });
    } else if (tab === 'cheats') {
      const cheatActions = {
        gold: () => { pdata.bankGold += 1000; },
        resources: () => { Object.keys(pdata.materials).forEach(k => { pdata.materials[k] += 1000; }); },
        maxLevelChars: () => { Object.keys(CLASSES).forEach(id => { const r = Persistent.getCharacter(id); r.level = MAX_LEVEL; r.xp = 0; }); },
        maxProfessions: () => { Object.keys(CLASSES).forEach(id => { const r = Persistent.getCharacter(id); Object.keys(PROFESSIONS).forEach(p => { r.profession.levels[p] = PROFESSION_MAX_LEVEL; r.profession.xp[p] = 0; }); }); },
        maxTalents: () => { Object.keys(CLASSES).forEach(id => { const r = Persistent.getCharacter(id); const trees = TALENT_TREES[id]; Object.values(trees).forEach(tree => tree.talents.forEach(t => { r.talents.ranks[t.id] = t.maxRank; })); }); },
        allEquipment: () => {
          Object.keys(GEAR_TEMPLATES).forEach(id => pdata.inventory.push(instantiateGear(id, 'legendary')));
          Object.keys(LEGENDARY_ITEMS).forEach(id => {
            pdata.inventory.push(instantiateLegendary(id));
            if (!pdata.ownedLegendaries.includes(id)) pdata.ownedLegendaries.push(id);
          });
        },
        allRelics: () => { Object.keys(RELICS).forEach(id => { if (!pdata.permanentRelics.includes(id)) pdata.permanentRelics.push(id); }); },
        upgradeRecipes: () => { RECIPES.forEach(r => { pdata.recipeRarityBoost[r.id] = RARITY_ORDER.length - 1 - RARITY_ORDER.indexOf(r.rarity); }); },
        completeQuests: () => {
          QUESTS.forEach(q => {
            if (!pdata.activeQuestIds.includes(q.id)) acceptQuest(q.id);
            pdata.questProgress[q.id] = getScaledQuest(q).objective.target;
            claimQuest(q.id, classId);
          });
        },
        completeJournal: () => {
          const ownedDefIds = new Set(pdata.inventory.map(i => i.defId));
          Object.keys(GEAR_TEMPLATES).forEach(id => { if (!ownedDefIds.has(id)) pdata.inventory.push(instantiateGear(id, 'common')); });
          Object.keys(LEGENDARY_ITEMS).forEach(id => { if (!pdata.ownedLegendaries.includes(id)) pdata.ownedLegendaries.push(id); });
          Object.keys(PETS).forEach(id => { if (!pdata.ownedPets.includes(id)) pdata.ownedPets.push(id); });
          Object.keys(MOUNTS).forEach(id => { if (!pdata.ownedMounts.includes(id)) pdata.ownedMounts.push(id); });
        }
      };
      this.root.querySelectorAll('[data-cheat]').forEach(btn => {
        btn.addEventListener('click', () => {
          const fn = cheatActions[btn.dataset.cheat];
          if (!fn) return;
          fn();
          Persistent.save();
          this.showSanctuary(classId, tab);
        });
      });
    }
  },

  checkDeathThen(fn) {
    const btn = document.getElementById('btn-continue');
    if (!btn) return;
    btn.addEventListener('click', () => {
      if (Game.isDead()) {
        Game.recordRunEnd(false);
        this.showGameOver(false);
      } else {
        fn();
      }
    });
  }
};

function scaleEnemy(template, act) {
  const mult = 1 + (act - 1) * 0.22;
  return { ...template, hp: Math.round(template.hp * mult), atk: Math.round(template.atk * mult) };
}

window.addEventListener('DOMContentLoaded', () => App.init());
