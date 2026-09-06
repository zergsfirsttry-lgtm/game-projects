// Turn-based, decision-driven combat. Each round is staged in two beats so
// attack/counter-attack animations can play in sequence: the player's action
// resolves immediately (locking input), then the enemy's reply resolves after
// a short delay driven by main.js.

// Hard ceiling on how many extra swings a single Attack's combo chain can
// rack up (see Combat.comboChanceFor/playerAttack) - without this, a very
// high-speed late-game build could roll an absurdly long (if increasingly
// unlikely) chain.
const COMBO_MAX_EXTRA_HITS = 5;

const Combat = {
  state: null,

  start(enemyTemplate) {
    // Curses like Savage Foes/Hardened Foes scale the enemy up once, right at
    // the start of the fight, rather than hooking every damage calc. The
    // Change Difficulty enemyMult (see DIFFICULTIES in data.js) stacks on
    // top the same way - applied once here, so it uniformly covers every
    // encounter type (regular, elite, boss, gauntlet, raid, PvP mirror)
    // without needing a special case at each one's own call site.
    const stats = Game.effectiveStats();
    const diffMult = currentDifficulty().enemyMult;
    const hp = Math.round(enemyTemplate.hp * (1 + (stats.enemyHpMult || 0)) * diffMult);
    const atk = Math.round(enemyTemplate.atk * (1 + (stats.enemyAtkMult || 0)) * diffMult);
    const def = Math.round((enemyTemplate.def || 0) * diffMult);
    this.state = {
      enemy: {
        ...enemyTemplate,
        atk,
        def,
        maxHp: hp,
        hp
      },
      log: [`A ${enemyTemplate.name} appears!`],
      over: false,
      victory: false,
      fled: false,
      locked: false,
      anim: { player: null, enemy: null }
    };
    Game.player.skill.cooldownLeft = 0;
    return this.state;
  },

  addLog(text) {
    this.state.log.push(text);
    if (this.state.log.length > 40) this.state.log.shift();
  },

  rollCrit(critBonus) {
    return Math.random() < (0.05 + critBonus);
  },

  // Bonus damage levers that apply on top of a computed hit: executeBonus
  // (target below 30% HP) and eliteSlayerAtk (target is an elite/boss).
  // Centralized here so both basic attacks and skills apply them identically.
  bonusDamageAgainst(enemy, stats) {
    let bonus = 0;
    if (stats.executeBonus && enemy.hp > 0 && enemy.hp < enemy.maxHp * 0.3) bonus += stats.executeBonus;
    if (stats.eliteSlayerAtk && (enemy.elite || enemy.boss)) bonus += stats.eliteSlayerAtk;
    return bonus;
  },

  // An equipped pet/mount joins in on every one of the player's own offensive
  // actions (see the call sites in playerAttack/playerSkill), each landing
  // its own hit scaled off the player's current ATK (COMPANION_COMBAT_SCALE
  // in data.js: 30% for a pet, 50% for a mount). A `role` pet (Tank/DPS/
  // Healer - see PETS in data.js) goes further: DPS hits harder still, Tank
  // sets up a guard that blunts the enemy's next reply (consumed in
  // resolveEnemyTurn), Healer mends a little HP right when it acts. Sets
  // s.companionAnim so renderCombatScreen can flash each acting companion
  // with a role-colored lunge.
  resolveCompanionAttacks(stats) {
    const s = this.state;
    if (s.over) return;
    const rec = Persistent.getCharacter(Game.player.classId);
    const anim = {};
    [['pet', rec.equipped.pet, PETS], ['mount', rec.equipped.mount, MOUNTS]].forEach(([kind, id, pool]) => {
      if (!id || s.enemy.hp <= 0) return;
      const def = pool[id];
      if (!def) return;
      let scale = COMPANION_COMBAT_SCALE[kind];
      if (def.role === 'dps') scale *= 1.5;
      const dmg = Math.max(1, Math.round(stats.atk * scale));
      s.enemy.hp = Math.max(0, s.enemy.hp - dmg);
      anim[kind] = def.role || 'attack';
      this.addLog(`${def.icon} ${def.name} strikes for ${dmg} damage.`);
      if (def.role === 'healer') {
        const healAmt = Math.max(1, Math.round(stats.maxHp * 0.05));
        Game.heal(healAmt);
        this.addLog(`${def.icon} ${def.name} mends ${healAmt} HP.`);
      } else if (def.role === 'tank') {
        s.tankGuardPct = 0.3;
      }
    });
    s.companionAnim = anim;
  },

  // `crit`/`dmg` drive the floating "CRITICAL!" combat text over the enemy's
  // health bar (see renderCombatScreen in main.js) - only playerAttack
  // actually rolls a crit chance today, so skills/items just pass crit:false.
  resolveAfterPlayerHit(lifesteal, crit, dmg) {
    const s = this.state;
    s.critText = crit ? { dmg } : null;
    // Drives the health bar's hit-shake/red-flash (see renderCombatScreen) -
    // scaled by how big a bite this hit took out of the enemy's own max HP,
    // so a huge crit against a fresh boss flashes harder than the same raw
    // damage number would against a much beefier one.
    s.hpFlash = { target: 'enemy', pct: Math.min(1, dmg / s.enemy.maxHp) };
    if (s.enemy.hp <= 0) {
      s.enemy.hp = 0;
      s.over = true;
      s.victory = true;
      s.anim.enemy = 'death';
      this.addLog(`You defeated the ${s.enemy.name}!`);
    } else {
      s.anim.enemy = 'hit';
      s.locked = true;
    }
    if (lifesteal) { Game.heal(lifesteal); this.addLog(`You drain ${lifesteal} HP.`); }
  },

  // Speed's second job besides turn order: it also raises the chance a basic
  // Attack chains into another swing before the enemy replies - a "combo".
  // Each successful roll re-rolls at the same chance for the next swing, so
  // expected chain length (p/(1-p)) grows with speed rather than being a
  // flat "sometimes get 2 hits" - a very fast build can occasionally rattle
  // off a long chain, capped at COMBO_MAX_EXTRA_HITS so it can't run away.
  comboChanceFor(stats) {
    return clamp(stats.speed * 0.03 + (stats.comboChance || 0), 0, 0.75);
  },

  // Which equipped weapon-bearing slot this Attack visibly swings - see
  // characterSpriteFor in progression.js, which resolves the body art from
  // whichever slot this returns. A character carrying both a melee weapon
  // (mainHand) and a bow (ranged) has each Attack randomly pick one, so
  // consecutive attacks can visibly alternate; carrying only one of the two
  // always uses that one, and an item with no `visual` (wand/blessing/shield)
  // never gets picked since there's no body art for it.
  pickAttackWeaponSlot() {
    const rec = Persistent.getCharacter(Game.player.classId);
    const eq = rec.equipped;
    const mainHand = eq.mainHand ? Persistent.findItem(eq.mainHand) : null;
    const ranged = eq.ranged ? Persistent.findItem(eq.ranged) : null;
    const mainVisual = mainHand && mainHand.visual;
    const rangedVisual = ranged && ranged.visual;
    if (mainVisual && rangedVisual) return Math.random() < 0.5 ? 'mainHand' : 'ranged';
    return rangedVisual ? 'ranged' : 'mainHand';
  },

  playerAttack() {
    const s = this.state;
    if (s.over || s.locked) return;
    const stats = Game.effectiveStats();
    const comboChance = this.comboChanceFor(stats);
    let totalDmg = 0, hits = 0, lastCrit = false;
    do {
      const crit = this.rollCrit(stats.critBonus);
      let dmg = Math.max(1, stats.atk - s.enemy.def) + this.bonusDamageAgainst(s.enemy, stats);
      if (crit) dmg = Math.round(dmg * 1.5);
      s.enemy.hp = Math.max(0, s.enemy.hp - dmg);
      totalDmg += dmg;
      hits += 1;
      lastCrit = crit;
      if (s.enemy.hp <= 0) break;
    } while (hits <= COMBO_MAX_EXTRA_HITS && Math.random() < comboChance);
    s.anim.player = 'attack';
    s.anim.weaponSlot = this.pickAttackWeaponSlot();
    s.comboHits = hits > 1 ? hits : null;
    const comboText = hits > 1 ? ` - a ${hits}-hit combo!` : '';
    this.addLog(`You attack for ${totalDmg} damage${lastCrit ? ' (critical!)' : ''}${comboText}.`);
    this.resolveCompanionAttacks(stats);
    this.resolveAfterPlayerHit(stats.lifesteal ? stats.lifesteal * hits : stats.lifesteal, lastCrit, totalDmg);
  },

  // Generic spell resolution - see the SPELLS catalog in data.js for what each
  // `type` means. This is what lets every class (and any bank-shop spell) share
  // one damage formula instead of a name-matched special case per skill.
  resolveSkillDamage(skill, stats, enemyDef) {
    const baseHit = Math.max(1, stats.atk - enemyDef);
    let dmg;
    if (skill.type === 'flat') dmg = skill.power;
    else if (skill.type === 'cleave') dmg = Math.max(1, stats.atk - Math.max(0, enemyDef - skill.ignoreDef)) + skill.power;
    else if (skill.type === 'multiplier') dmg = Math.round(baseHit * skill.power);
    else if (skill.type === 'drain') dmg = baseHit + skill.power;
    else if (skill.type === 'rage') {
      const base = baseHit + skill.power;
      const wounded = Game.player.hp < Game.effectiveStats().maxHp * 0.5;
      dmg = wounded ? Math.round(base * 1.5) : base;
    } else dmg = baseHit;
    // spellPower is a flat % bonus on top of the computed skill damage - this is
    // what makes ATK-bypassing 'flat' type spells (Fireball, etc.) still benefit
    // from caster-class relics, since they'd otherwise ignore ATK entirely.
    // Curses can push this negative, so floor it at 1 rather than letting a
    // heavily-cursed cast deal zero or negative damage.
    if (stats.spellPower) dmg = Math.max(1, Math.round(dmg * (1 + stats.spellPower)));
    return dmg;
  },

  playerSkill() {
    const s = this.state;
    if (s.over || s.locked) return;
    const skill = Game.player.skill;
    if (skill.cooldownLeft > 0) return;
    const stats = Game.effectiveStats();
    const dmg = this.resolveSkillDamage(skill, stats, s.enemy.def) + this.bonusDamageAgainst(s.enemy, stats);
    s.enemy.hp = Math.max(0, s.enemy.hp - dmg);
    skill.cooldownLeft = skill.cooldown;
    s.anim.player = 'skill';
    this.addLog(`You use ${skill.name} for ${dmg} damage!`);
    if (skill.type === 'drain') {
      const healed = Math.round(dmg * 0.5);
      Game.heal(healed);
      this.addLog(`You drain ${healed} HP.`);
    }
    this.resolveCompanionAttacks(stats);
    this.resolveAfterPlayerHit(stats.lifesteal, false, dmg);
  },

  playerItem(itemId) {
    const s = this.state;
    if (s.over || s.locked) return;
    const idx = Game.player.items.indexOf(itemId);
    if (idx === -1) return;
    Game.player.items.splice(idx, 1);
    s.anim.player = 'heal';
    s.anim.enemy = null;
    const curseStats = Game.effectiveStats();
    const healBonus = curseStats.noPotions ? 0 : Math.max(0, 1 + (curseStats.potionHealBonus || 0));
    const heal = (amount, label) => {
      const total = Math.round(amount * healBonus);
      Game.heal(total);
      this.addLog(curseStats.noPotions ? `${label} A curse saps its power - no effect.` : `${label} +${total} HP.`);
    };
    if (itemId === 'potion') heal(12, 'You drink a Health Potion.');
    else if (itemId === 'bigPotion') heal(24, 'You drink a Greater Potion.');
    else if (itemId === 'antidote') heal(6, 'You drink an Antidote.');
    else if (itemId === 'honorPotion') heal(HONOR_SHOP.potion.heal, 'You drink a Vial of Battle.');
    else if (itemId === 'bomb') {
      s.enemy.hp = Math.max(0, s.enemy.hp - 15);
      s.anim.player = 'attack';
      this.addLog('You throw a Bomb for 15 damage!');
      this.resolveAfterPlayerHit(0, false, 15);
      return;
    }
    s.locked = true;
  },

  playerFlee() {
    const s = this.state;
    if (s.over || s.locked) return;
    const stats = Game.effectiveStats();
    if (stats.fleeDisabled) { this.addLog('A curse binds your feet - you cannot flee!'); return; }
    if (s.enemy.boss) { this.addLog('You cannot flee from a boss!'); return; }
    const chance = clamp(0.35 + (stats.speed - s.enemy.speed) * 0.04, 0.1, 0.9);
    if (Math.random() < chance) {
      s.over = true;
      s.fled = true;
      this.addLog('You flee from battle.');
    } else {
      this.addLog('You failed to flee!');
      this.resolveEnemyTurn();
    }
  },

  resolveEnemyTurn() {
    const s = this.state;
    if (s.over) return;
    s.locked = false;
    s.anim = { player: null, enemy: 'attack' };
    if (Game.player.skill.cooldownLeft > 0) Game.player.skill.cooldownLeft--;
    const stats = Game.effectiveStats();
    // Positive hpRegen (relics/pets/mounts) heals as usual; negative hpRegen
    // (the Bleeding Wound curse) actually damages - Game.heal() never hurts,
    // so that direction has to go through Game.damage() instead, and can end
    // the run right here just like the enemy's own attack can below.
    if (stats.hpRegen > 0) {
      Game.heal(stats.hpRegen);
      this.addLog(`You regenerate ${stats.hpRegen} HP.`);
    } else if (stats.hpRegen < 0) {
      const drainDead = Game.damage(-stats.hpRegen);
      this.addLog(`A curse drains ${-stats.hpRegen} HP from you.`);
      if (drainDead) {
        s.over = true;
        s.victory = false;
        s.anim.player = 'death';
        this.addLog('You have fallen...');
        return;
      }
    }
    const useSpecial = s.enemy.elite || s.enemy.boss ? Math.random() < 0.35 : Math.random() < 0.15;
    let dmg = Math.max(1, s.enemy.atk - stats.def);
    if (useSpecial) dmg = Math.round(dmg * 1.6);
    // A Tank-role pet's guard (see resolveCompanionAttacks) blunts exactly
    // one incoming hit, then clears - it doesn't stack across rounds.
    if (s.tankGuardPct) {
      dmg = Math.max(1, Math.round(dmg * (1 - s.tankGuardPct)));
      this.addLog(`Your pet's guard softens the blow!`);
      s.tankGuardPct = 0;
    }
    const dead = Game.damage(dmg);
    s.hpFlash = { target: 'player', pct: Math.min(1, dmg / stats.maxHp) };
    this.addLog(`${s.enemy.name} ${useSpecial ? 'unleashes a fierce strike' : 'attacks'} for ${dmg} damage.`);
    if (dead) {
      s.over = true;
      s.victory = false;
      s.anim.player = 'death';
      this.addLog('You have fallen...');
    } else {
      s.anim.player = 'hit';
    }
  }
};
