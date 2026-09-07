// Game state: current run, player, meta stats (persisted, display-only).

const Meta = {
  key: 'browserRpg_meta',
  load() {
    try {
      const raw = localStorage.getItem(this.key);
      if (raw) return JSON.parse(raw);
    } catch (e) { /* ignore corrupt storage */ }
    return { runsPlayed: 0, bestAct: 0, bestFloor: 0, victories: 0 };
  },
  save(data) {
    try { localStorage.setItem(this.key, JSON.stringify(data)); } catch (e) { /* storage unavailable */ }
  }
};

const Game = {
  player: null,
  act: 1,
  map: null,
  currentNodeId: null,
  visitedNodes: [],
  goldEarnedThisRun: 0,
  gauntlet: null,
  raid: null,
  dungeon: null,
  pvp: null,
  log: [],
  runSnapshot: null,

  // startingAct: normally 1 - "Pick up from your highest act" (class-select
  // screen) passes the account's Meta.bestAct instead, so a returning player
  // (or a fresh alt) can skip straight back to the frontier act instead of
  // re-walking every earlier one.
  newRun(classId, startingAct) {
    const cls = CLASSES[classId];
    const charRecord = Persistent.getCharacter(classId);
    this.gauntlet = null;
    this.player = {
      classId,
      className: cls.name,
      maxHp: cls.maxHp,
      hp: cls.maxHp,
      baseAtk: cls.atk,
      baseDef: cls.def,
      baseSpeed: cls.speed,
      skills: buildSkillInstances(classId, charRecord),
      gold: 20,
      items: [...cls.startItems],
      relics: [],
      curses: [],
      // Short-lived buffs/debuffs from moral-choice encounters (see the
      // EVENTS entries with a `moralChoice` field and applyOutcome in
      // events.js) - counts down by encounters played, not real time, and
      // vanishes with the run like curses/relics do. See tickTempEffects.
      tempEffects: []
    };
    this.goldEarnedThisRun = 0;
    this.act = startingAct || 1;
    this.log = [];
    this.player.hp = this.effectiveStats().maxHp;
    // Persistent side-effects (XP/levels, loot, materials, tamed pets/mounts,
    // trial unlocks, quest progress) all save immediately as they happen
    // mid-run rather than waiting for the run to end - see grantXp() and the
    // reward-handling in main.js. Snapshotting the whole persistent store
    // here is what lets abandonRun() cleanly undo all of that in one shot.
    this.runSnapshot = JSON.parse(JSON.stringify(Persistent.load()));
    this.startAct();
  },

  // Raids are entered straight from the Sanctuary, not mid-adventure, so there's
  // no run to attach to - this builds a standalone player object (same shape
  // as newRun()'s, minus consumable items/relics/curses, which are run-only
  // concepts) using the character's permanent Sanctuary gear/level/companions
  // directly. See enterRaid() in main.js.
  buildRaidPlayer(classId) {
    const cls = CLASSES[classId];
    const charRecord = Persistent.getCharacter(classId);
    return {
      classId,
      className: cls.name,
      maxHp: cls.maxHp,
      hp: cls.maxHp,
      baseAtk: cls.atk,
      baseDef: cls.def,
      baseSpeed: cls.speed,
      skills: buildSkillInstances(classId, charRecord),
      gold: 0,
      items: [],
      relics: [],
      curses: [],
      tempEffects: []
    };
  },

  // Called when the player chooses "Return to Sanctuary" from the map
  // instead of continuing the run - discards every persistent change made
  // since newRun() (XP/levels, loot, materials, curses/relics are already
  // run-only and vanish with `player`, but pets/mounts/trial unlocks/quest
  // progress/materials/loot are otherwise permanent and need explicit
  // rollback) by restoring the pre-run snapshot.
  abandonRun() {
    if (this.runSnapshot) {
      Persistent.data = this.runSnapshot;
      Persistent.save();
    }
    this.player = null;
    this.map = null;
    this.gauntlet = null;
    this.runSnapshot = null;
  },

  startAct() {
    this.map = generateMap(this.act);
    this.currentNodeId = null;
    this.visitedNodes = [];
  },

  // Sums every active moral-choice buff/debuff (see grantTempEffect) - kept
  // as its own source (not boosted by the Gear Set Bonus, which only covers
  // items/relics/food/pets/mounts) so a narrative choice's effect stays a
  // flat, predictable size regardless of how geared up the character is.
  moralEffectStatBonus() {
    const base = {};
    RELIC_EFFECT_KEYS.forEach(k => { base[k] = 0; });
    if (this.player) this.player.tempEffects.forEach(e => {
      Object.keys(e.effect || {}).forEach(key => { base[key] = (base[key] || 0) + e.effect[key]; });
    });
    return base;
  },

  // Combines: class base stats, persistent character level (+10% HP/ATK per level,
  // linear rather than compounding - see progression.js), equipped gear from the
  // Sanctuary, this run's found relics, and permanently-purchased bank relics.
  effectiveStats() {
    const p = this.player;
    const charRecord = Persistent.getCharacter(p.classId);
    // Sums every equipped slot (3 weapon + 15 armor/accessory) - see
    // gearStatBonus in progression.js. Replaces the old single weapon+armor
    // lookup now that there are 19 equippable gear slots.
    const gear = gearStatBonus(charRecord);

    const relicIds = [...p.relics, ...Persistent.load().permanentRelics];
    const bonus = applyRelicEffects(relicIds);
    const companion = companionStatBonus(charRecord);
    const curse = applyCurseEffects(p.curses);
    const talent = talentStatBonus(p.classId, charRecord);
    const title = titleStatBonus(charRecord);
    const profession = professionStatBonus(charRecord);
    // Raid-only: a flat support bonus representing the two Ghost party
    // members (see buildRaidPlayer/enterRaid in main.js) - undefined outside
    // a raid, so this never touches normal adventure/Sanctuary stats.
    const ghost = p.raidGhostBonus || { atk: 0, def: 0, maxHp: 0 };
    // PvP-only: Honor-shop gear (see pvpGearStatBonus in progression.js) -
    // only applies while an actual PvP match is in progress (Game.pvp set),
    // so it never touches adventure/raid/Sanctuary stats.
    const pvpGear = this.pvp ? pvpGearStatBonus(charRecord) : { atk: 0, def: 0, maxHp: 0, critBonus: 0, lifesteal: 0 };
    // Temporary buffs from Cooking food or House feeding (see activeBuffStatBonus
    // in progression.js) - apply everywhere (adventure, raid, PvP, Sanctuary
    // preview) for as long as they're active, same as any other stat source.
    const buff = activeBuffStatBonus();
    // Permanent, account-wide - +0.5% gold per reputation tier reached, per
    // zone (see reputationStatBonus in progression.js).
    const reputation = reputationStatBonus();
    // Recruited companions "in group" (up to 4, imported from other players'
    // saves) - a flat support contribution exactly like a raid Ghost's, not
    // an independently-controlled combatant (see companionGroupStatBonus in
    // progression.js). Separate from `companion` above, which is this
    // character's own equipped PET/MOUNT.
    const party = companionGroupStatBonus();
    // Moral-choice buffs/debuffs (see grantTempEffect/tickTempEffects) - a
    // flat, run-scoped source like curses/talents, untouched by the Gear
    // Set Bonus below.
    const moral = this.moralEffectStatBonus();
    const lvlMult = levelStatMultiplier(charRecord.level);
    // The Gear Set Bonus (see gearSetBonusPct in progression.js) multiplies
    // every stat contribution from items/relics/food/pets-mounts together -
    // curses, talents, raid Ghosts, PvP-only gear, and the recruited-
    // companion party bonus are deliberately untouched by it.
    const setBonusPct = gearSetBonusPct(charRecord);
    const boost = (v) => v * (1 + setBonusPct);
    // Change Difficulty's playerStatMult (only Extreme sets this below 1) -
    // a final across-the-board haircut on top of everything else, applied
    // last so it scales the character's true fully-built stats rather than
    // any one contributing source.
    const diffStatMult = currentDifficulty().playerStatMult;

    return {
      atk: Math.round(Math.max(0, Math.round((p.baseAtk + boost(gear.atk)) * lvlMult) + boost(bonus.atk + companion.atk + buff.atk) + curse.atk + ghost.atk + talent.atk + title.atk + pvpGear.atk + party.atk + moral.atk) * diffStatMult),
      def: Math.round(Math.max(0, p.baseDef + boost(gear.def + bonus.def + companion.def + buff.def) + curse.def + ghost.def + talent.def + title.def + pvpGear.def + party.def + moral.def) * diffStatMult),
      maxHp: Math.max(1, Math.round((Math.round((p.maxHp + boost(gear.maxHp)) * lvlMult) + boost(bonus.maxHp + companion.maxHp + buff.maxHp) + curse.maxHp + ghost.maxHp + talent.maxHp + title.maxHp + pvpGear.maxHp + party.maxHp + moral.maxHp) * diffStatMult)),
      speed: Math.max(1, Math.round(Math.max(1, p.baseSpeed + boost(gear.speed + bonus.speed + companion.speed + buff.speed) + curse.speed + talent.speed + title.speed + moral.speed) * diffStatMult)),
      critBonus: boost(gear.critBonus + bonus.critBonus + companion.critBonus + buff.critBonus) + curse.critBonus + talent.critBonus + title.critBonus + pvpGear.critBonus + moral.critBonus,
      goldBonus: boost(gear.goldBonus + bonus.goldBonus + companion.goldBonus + buff.goldBonus) + curse.goldBonus + talent.goldBonus + title.goldBonus + reputation.goldBonus + moral.goldBonus,
      lifesteal: boost(gear.lifesteal + bonus.lifesteal + companion.lifesteal + buff.lifesteal) + curse.lifesteal + talent.lifesteal + title.lifesteal + pvpGear.lifesteal + moral.lifesteal,
      hpRegen: boost(gear.hpRegen + bonus.hpRegen + companion.hpRegen + buff.hpRegen) + curse.hpRegen + talent.hpRegen + title.hpRegen + moral.hpRegen,
      executeBonus: boost(gear.executeBonus + bonus.executeBonus + companion.executeBonus + buff.executeBonus) + curse.executeBonus + talent.executeBonus + title.executeBonus + moral.executeBonus,
      eliteSlayerAtk: boost(gear.eliteSlayerAtk + bonus.eliteSlayerAtk + companion.eliteSlayerAtk + buff.eliteSlayerAtk) + curse.eliteSlayerAtk + talent.eliteSlayerAtk + title.eliteSlayerAtk + moral.eliteSlayerAtk,
      potionHealBonus: boost(gear.potionHealBonus + bonus.potionHealBonus + companion.potionHealBonus + buff.potionHealBonus) + curse.potionHealBonus + talent.potionHealBonus + title.potionHealBonus + profession.potionHealBonus + moral.potionHealBonus,
      spellPower: boost(gear.spellPower + bonus.spellPower + companion.spellPower + buff.spellPower) + curse.spellPower + talent.spellPower + title.spellPower + moral.spellPower,
      // Gear-enchant only for now (see Combat.comboChanceFor, ENCHANTS.savageMomentum) -
      // stacks on top of the speed-derived combo chance every class already has.
      comboChance: boost(gear.comboChance || 0),
      setBonusPct,
      enemyAtkMult: curse.enemyAtkMult,
      enemyHpMult: curse.enemyHpMult,
      fleeDisabled: curse.fleeDisabled,
      noPotions: curse.noPotions,
      level: charRecord.level
    };
  },

  addGold(amount) {
    if (amount <= 0) { this.player.gold = Math.max(0, this.player.gold + amount); return amount; }
    const bonus = this.effectiveStats().goldBonus + groupBonusPct();
    const total = Math.max(0, Math.round(amount * (1 + bonus) * currentDifficulty().resourceMult));
    this.player.gold += total;
    this.goldEarnedThisRun += total;
    recordQuestProgress('goldEarned', total);
    return total;
  },

  // XP is granted immediately (not deferred to run end) and saved straight to
  // persistent storage, so it survives permadeath even mid-run. Scaled up
  // by groupBonusPct (+5% per equipped companion) before it ever reaches the
  // level-up curve, so a full party of 4 companions is a real +20% boost.
  // Also scaled by the account's Change Difficulty pick (see DIFFICULTIES).
  grantXp(amount) {
    const charRecord = Persistent.getCharacter(this.player.classId);
    const scaled = Math.round(amount * (1 + groupBonusPct()) * currentDifficulty().resourceMult);
    const result = grantXpToCharacter(charRecord, scaled);
    // Whichever pet/mount is equipped rides along on the player's own
    // leveling - it gains the same XP amount, on top of anything separately
    // fed to it at the House (see grantCompanionXp/instantiateFoodItem).
    if (charRecord.equipped.pet) grantCompanionXp('pet', charRecord.equipped.pet, scaled);
    if (charRecord.equipped.mount) grantCompanionXp('mount', charRecord.equipped.mount, scaled);
    Persistent.save();
    return result;
  },

  // Grants XP to whichever gathering profession the player currently has
  // equipped (a no-op if none is equipped) - called on every resolved
  // encounter during an adventure, see the call sites in main.js.
  grantProfessionXp(amount) {
    if (!this.player) return { levelsGained: 0 };
    const charRecord = Persistent.getCharacter(this.player.classId);
    const result = grantProfessionXpToCharacter(charRecord, amount);
    Persistent.save();
    return result;
  },

  // Grants a moral-choice buff/debuff that lasts `encounters` more resolved
  // encounters (not real time - see tickTempEffects) rather than a fixed
  // duration, so a slow explorer and a fast one get the same number of
  // fights out of it either way.
  grantTempEffect(label, icon, effect, encounters) {
    if (!this.player) return;
    this.player.tempEffects.push({ id: 'tmp' + Math.random().toString(36).slice(2, 10), label, icon, effect, encountersLeft: encounters });
  },

  // Ticks every active moral-choice effect down by one encounter, dropping
  // any that expire - called once per resolved encounter (see showMap in
  // main.js, the common return-to-path point after every encounter type).
  tickTempEffects() {
    if (!this.player) return;
    this.player.tempEffects.forEach(e => { e.encountersLeft -= 1; });
    this.player.tempEffects = this.player.tempEffects.filter(e => e.encountersLeft > 0);
  },

  heal(amount) {
    const stats = this.effectiveStats();
    this.player.hp = Math.min(stats.maxHp, this.player.hp + Math.max(0, amount));
  },

  damage(amount) {
    this.player.hp = Math.max(0, this.player.hp - Math.max(0, amount));
    return this.player.hp <= 0;
  },

  isDead() { return this.player.hp <= 0; },

  recordRunEnd(victory) {
    const meta = Meta.load();
    meta.runsPlayed += 1;
    meta.bestAct = Math.max(meta.bestAct, this.act);
    meta.bestFloor = Math.max(meta.bestFloor, this.visitedNodes.length);
    if (victory) meta.victories += 1;
    Meta.save(meta);

    const pdata = Persistent.load();
    pdata.bankGold += this.goldEarnedThisRun;
    Persistent.save();
  }
};
