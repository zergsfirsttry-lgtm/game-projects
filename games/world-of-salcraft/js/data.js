// Static game content: classes, enemies, events, items, relics, shop.

// Account-wide (not per-character) - set from the title screen's Change
// Difficulty popup, persists until changed again. `resourceMult` scales
// gold/XP/materials gained (Game.addGold/grantXp in state.js,
// rollMaterialDrop/computeAfkProgress in progression.js); `enemyMult` scales
// every enemy's hp/atk/def at the moment a fight starts (Combat.start in
// combat.js, so it applies uniformly to every encounter type - regular,
// elite, boss, gauntlet, raid, PvP mirror - rather than special-casing
// each); `playerStatMult` (only Extreme touches this) scales the player's
// own final atk/def/maxHp/speed down (see the end of effectiveStats()).
const DIFFICULTIES = {
  easy: { id: 'easy', name: 'Easy', resourceMult: 1.5, enemyMult: 1, playerStatMult: 1, desc: '+50% resources, experience, and gold gained.' },
  normal: { id: 'normal', name: 'Normal', resourceMult: 1, enemyMult: 1, playerStatMult: 1, desc: 'The game as designed - no modifiers.' },
  hard: { id: 'hard', name: 'Hard', resourceMult: 0.5, enemyMult: 1.5, playerStatMult: 1, desc: '-50% resources, experience, and gold gained. Enemies get +50% health, damage, and defense.' },
  extreme: { id: 'extreme', name: 'Extreme', resourceMult: 0.25, enemyMult: 2, playerStatMult: 0.85, desc: '-75% resources, experience, and gold gained. Your stats are reduced by 15%. Enemies get +100% health, damage, and defense.' }
};

// Spell catalog. `type` drives the generic damage-resolution formula in combat.js:
//  - flat:       fixed magic damage, ignores ATK/DEF entirely
//  - cleave:     (ATK - DEF, with `power` DEF ignored) + power bonus damage
//  - multiplier: normal hit multiplied by `power`
//  - drain:      normal hit + power bonus damage, then heals for half of that
//  - rage:       normal hit + power bonus damage, +50% more if caster is below half HP
// `icon` is a PixelLab-generated asset path (assets/icons/spells/<id>.png) -
// every spell had no icon at all before (just name/desc text); see
// showInvSpellsModal and the combat Skill button in main.js for where this
// actually renders.
const SPELLS = {
  cleave: { id: 'cleave', name: 'Cleave', desc: '+8 damage, ignores 2 DEF', cooldown: 2, type: 'cleave', power: 8, ignoreDef: 2, icon: 'assets/icons/spells/cleave.png' },
  backstab: { id: 'backstab', name: 'Backstab', desc: 'Deal 2.2x damage', cooldown: 3, type: 'multiplier', power: 2.2, icon: 'assets/icons/spells/backstab.png' },
  fireball: { id: 'fireball', name: 'Fireball', desc: 'Deal 14 magic damage', cooldown: 2, type: 'flat', power: 14, icon: 'assets/icons/spells/fireball.png' },
  holyStrike: { id: 'holyStrike', name: 'Holy Strike', desc: 'Deal damage and heal for half', cooldown: 2, type: 'drain', power: 6, icon: 'assets/icons/spells/holyStrike.png' },
  aimedShot: { id: 'aimedShot', name: 'Aimed Shot', desc: '+7 damage, ignores 3 DEF', cooldown: 2, type: 'cleave', power: 7, ignoreDef: 3, icon: 'assets/icons/spells/aimedShot.png' },
  lifeDrain: { id: 'lifeDrain', name: 'Life Drain', desc: 'Deal damage and heal for half', cooldown: 3, type: 'drain', power: 8, icon: 'assets/icons/spells/lifeDrain.png' },
  recklessRage: { id: 'recklessRage', name: 'Reckless Rage', desc: '+9 damage, 50% more if below half HP', cooldown: 2, type: 'rage', power: 9, icon: 'assets/icons/spells/recklessRage.png' },
  divineLight: { id: 'divineLight', name: 'Divine Light', desc: 'Deal damage and heal for half', cooldown: 2, type: 'drain', power: 10, icon: 'assets/icons/spells/divineLight.png' },
  viciousMockery: { id: 'viciousMockery', name: 'Vicious Mockery', desc: 'Deal 1.8x damage', cooldown: 2, type: 'multiplier', power: 1.8, icon: 'assets/icons/spells/viciousMockery.png' },
  // Bank-shop-only extras, purchasable by any class with bank gold.
  frostbolt: { id: 'frostbolt', name: 'Frostbolt', desc: 'Deal 17 frost damage', cooldown: 3, type: 'flat', power: 17, icon: 'assets/icons/spells/frostbolt.png' },
  execute: { id: 'execute', name: 'Execute', desc: 'Deal 3x damage', cooldown: 4, type: 'multiplier', power: 3, icon: 'assets/icons/spells/execute.png' },
  chainLightning: { id: 'chainLightning', name: 'Chain Lightning', desc: '+10 damage, ignores 3 DEF', cooldown: 2, type: 'cleave', power: 10, ignoreDef: 3, icon: 'assets/icons/spells/chainLightning.png' },
  inspire: { id: 'inspire', name: 'Inspire', desc: 'Deal damage and heal for half', cooldown: 2, type: 'drain', power: 7, icon: 'assets/icons/spells/inspire.png' },
  // 36 more bank-shop-only spells (see BANK_SHOP.spells) - same 5 damage
  // types as above, no class restriction, so the shop reads as one big
  // shared grimoire every class can shop from.
  iceLance: { id: 'iceLance', name: 'Ice Lance', desc: 'Deal 16 frost damage', cooldown: 2, type: 'flat', power: 16, icon: 'assets/icons/spells/iceLance.png' },
  shadowBolt: { id: 'shadowBolt', name: 'Shadow Bolt', desc: 'Deal 15 shadow damage', cooldown: 2, type: 'flat', power: 15, icon: 'assets/icons/spells/shadowBolt.png' },
  arcaneBlast: { id: 'arcaneBlast', name: 'Arcane Blast', desc: 'Deal 18 arcane damage', cooldown: 3, type: 'flat', power: 18, icon: 'assets/icons/spells/arcaneBlast.png' },
  earthShatter: { id: 'earthShatter', name: 'Earth Shatter', desc: '+9 damage, ignores 2 DEF', cooldown: 2, type: 'cleave', power: 9, ignoreDef: 2, icon: 'assets/icons/spells/earthShatter.png' },
  moonfire: { id: 'moonfire', name: 'Moonfire', desc: 'Deal 13 arcane damage', cooldown: 2, type: 'flat', power: 13, icon: 'assets/icons/spells/moonfire.png' },
  sinisterStrike: { id: 'sinisterStrike', name: 'Sinister Strike', desc: '+8 damage, ignores 1 DEF', cooldown: 2, type: 'cleave', power: 8, ignoreDef: 1, icon: 'assets/icons/spells/sinisterStrike.png' },
  eviscerate: { id: 'eviscerate', name: 'Eviscerate', desc: 'Deal 2.0x damage', cooldown: 3, type: 'multiplier', power: 2.0, icon: 'assets/icons/spells/eviscerate.png' },
  ambush: { id: 'ambush', name: 'Ambush', desc: 'Deal 2.4x damage', cooldown: 3, type: 'multiplier', power: 2.4, icon: 'assets/icons/spells/ambush.png' },
  crusaderStrike: { id: 'crusaderStrike', name: "Crusader's Strike", desc: '+10 damage, ignores 2 DEF', cooldown: 2, type: 'cleave', power: 10, ignoreDef: 2, icon: 'assets/icons/spells/crusaderStrike.png' },
  consecration: { id: 'consecration', name: 'Consecration', desc: 'Deal damage and heal for half', cooldown: 3, type: 'drain', power: 9, icon: 'assets/icons/spells/consecration.png' },
  flashHeal: { id: 'flashHeal', name: 'Flash Heal', desc: 'Deal damage and heal for half', cooldown: 2, type: 'drain', power: 7, icon: 'assets/icons/spells/flashHeal.png' },
  hammerOfJustice: { id: 'hammerOfJustice', name: 'Hammer of Justice', desc: '+11 damage, ignores 3 DEF', cooldown: 3, type: 'cleave', power: 11, ignoreDef: 3, icon: 'assets/icons/spells/hammerOfJustice.png' },
  whirlwind: { id: 'whirlwind', name: 'Whirlwind', desc: 'Deal 1.7x damage', cooldown: 2, type: 'multiplier', power: 1.7, icon: 'assets/icons/spells/whirlwind.png' },
  bloodlust: { id: 'bloodlust', name: 'Bloodlust', desc: '+12 damage, 50% more if below half HP', cooldown: 3, type: 'rage', power: 12, icon: 'assets/icons/spells/bloodlust.png' },
  rampage: { id: 'rampage', name: 'Rampage', desc: '+14 damage, 50% more if below half HP', cooldown: 3, type: 'rage', power: 14, icon: 'assets/icons/spells/rampage.png' },
  mortalStrike: { id: 'mortalStrike', name: 'Mortal Strike', desc: 'Deal 2.6x damage', cooldown: 4, type: 'multiplier', power: 2.6, icon: 'assets/icons/spells/mortalStrike.png' },
  serpentSting: { id: 'serpentSting', name: 'Serpent Sting', desc: 'Deal 12 nature damage', cooldown: 2, type: 'flat', power: 12, icon: 'assets/icons/spells/serpentSting.png' },
  multiShot: { id: 'multiShot', name: 'Multi-Shot', desc: '+9 damage, ignores 2 DEF', cooldown: 2, type: 'cleave', power: 9, ignoreDef: 2, icon: 'assets/icons/spells/multiShot.png' },
  voidBolt: { id: 'voidBolt', name: 'Void Bolt', desc: 'Deal 19 shadow damage', cooldown: 3, type: 'flat', power: 19, icon: 'assets/icons/spells/voidBolt.png' },
  drainLife: { id: 'drainLife', name: 'Drain Life', desc: 'Deal damage and heal for half', cooldown: 3, type: 'drain', power: 11, icon: 'assets/icons/spells/drainLife.png' },
  hellfireBlast: { id: 'hellfireBlast', name: 'Hellfire Blast', desc: 'Deal 20 fire damage', cooldown: 3, type: 'flat', power: 20, icon: 'assets/icons/spells/hellfireBlast.png' },
  curseOfAgony: { id: 'curseOfAgony', name: 'Curse of Agony', desc: 'Deal 10 shadow damage', cooldown: 2, type: 'flat', power: 10, icon: 'assets/icons/spells/curseOfAgony.png' },
  penanceStrike: { id: 'penanceStrike', name: 'Penance', desc: 'Deal damage and heal for half', cooldown: 2, type: 'drain', power: 9, icon: 'assets/icons/spells/penanceStrike.png' },
  smite: { id: 'smite', name: 'Smite', desc: 'Deal 14 holy damage', cooldown: 2, type: 'flat', power: 14, icon: 'assets/icons/spells/smite.png' },
  judgment: { id: 'judgment', name: 'Judgment', desc: '+12 damage, ignores 3 DEF', cooldown: 3, type: 'cleave', power: 12, ignoreDef: 3, icon: 'assets/icons/spells/judgment.png' },
  holyWrath: { id: 'holyWrath', name: 'Holy Wrath', desc: 'Deal 16 holy damage', cooldown: 3, type: 'flat', power: 16, icon: 'assets/icons/spells/holyWrath.png' },
  slam: { id: 'slam', name: 'Slam', desc: 'Deal 1.9x damage', cooldown: 2, type: 'multiplier', power: 1.9, icon: 'assets/icons/spells/slam.png' },
  heroicStrike: { id: 'heroicStrike', name: 'Heroic Strike', desc: '+8 damage, ignores 1 DEF', cooldown: 2, type: 'cleave', power: 8, ignoreDef: 1, icon: 'assets/icons/spells/heroicStrike.png' },
  overpower: { id: 'overpower', name: 'Overpower', desc: 'Deal 2.1x damage', cooldown: 3, type: 'multiplier', power: 2.1, icon: 'assets/icons/spells/overpower.png' },
  shieldSlam: { id: 'shieldSlam', name: 'Shield Slam', desc: '+10 damage, ignores 2 DEF', cooldown: 2, type: 'cleave', power: 10, ignoreDef: 2, icon: 'assets/icons/spells/shieldSlam.png' },
  soulFire: { id: 'soulFire', name: 'Soul Fire', desc: 'Deal 22 fire damage', cooldown: 4, type: 'flat', power: 22, icon: 'assets/icons/spells/soulFire.png' },
  chaosBolt: { id: 'chaosBolt', name: 'Chaos Bolt', desc: 'Deal 24 chaos damage', cooldown: 4, type: 'flat', power: 24, icon: 'assets/icons/spells/chaosBolt.png' },
  starfall: { id: 'starfall', name: 'Starfall', desc: 'Deal 15 arcane damage', cooldown: 3, type: 'flat', power: 15, icon: 'assets/icons/spells/starfall.png' },
  wildStrike: { id: 'wildStrike', name: 'Wild Strike', desc: '+10 damage, 50% more if below half HP', cooldown: 2, type: 'rage', power: 10, icon: 'assets/icons/spells/wildStrike.png' },
  rejuvenation: { id: 'rejuvenation', name: 'Rejuvenation', desc: 'Deal damage and heal for half', cooldown: 2, type: 'drain', power: 6, icon: 'assets/icons/spells/rejuvenation.png' },
  avengingWrath: { id: 'avengingWrath', name: 'Avenging Wrath', desc: '+16 damage, 50% more if below half HP', cooldown: 4, type: 'rage', power: 16, icon: 'assets/icons/spells/avengingWrath.png' }
};

const CLASSES = {
  // --- Starter classes (always available) ---
  warrior: {
    id: 'warrior', name: 'Warrior', icon: '⚔️', starter: true,
    maxHp: 32, atk: 6, def: 3, speed: 4,
    defaultSpell: 'cleave',
    startItems: ['potion'],
    blurb: 'Tough and simple. High HP, strong melee hits.'
  },
  rogue: {
    id: 'rogue', name: 'Rogue', icon: '🗡️', starter: true,
    maxHp: 24, atk: 5, def: 1, speed: 8,
    defaultSpell: 'backstab',
    startItems: ['potion', 'bomb'],
    blurb: 'Fragile but fast. Finds more gold, hits hard when it counts.'
  },
  mage: {
    id: 'mage', name: 'Mage', icon: '🧙', starter: true,
    maxHp: 20, atk: 4, def: 0, speed: 5,
    defaultSpell: 'fireball',
    startItems: ['potion', 'potion'],
    blurb: 'Low HP, low defense, but the strongest burst damage.'
  },

  // --- Unlockable classes (WoW-flavored) - won via a rare Class Trial encounter ---
  paladin: {
    id: 'paladin', name: 'Paladin', icon: '🛡️',
    maxHp: 30, atk: 5, def: 3, speed: 4,
    defaultSpell: 'holyStrike',
    startItems: ['potion'],
    blurb: 'Holy warrior who heals as he fights. Unlocked via Class Trial.'
  },
  hunter: {
    id: 'hunter', name: 'Hunter', icon: '🏹',
    maxHp: 26, atk: 6, def: 1, speed: 7,
    defaultSpell: 'aimedShot',
    startItems: ['potion', 'bomb'],
    blurb: 'Precise ranged damage that pierces armor. Unlocked via Class Trial.'
  },
  warlock: {
    id: 'warlock', name: 'Warlock', icon: '😈',
    maxHp: 22, atk: 5, def: 0, speed: 5,
    defaultSpell: 'lifeDrain',
    startItems: ['potion', 'potion'],
    blurb: 'Trades safety for damage that heals itself. Unlocked via Class Trial.'
  },

  // --- Unlockable classes (D&D-flavored) - won via a rare Class Trial encounter ---
  barbarian: {
    id: 'barbarian', name: 'Barbarian', icon: '🪓',
    maxHp: 36, atk: 7, def: 2, speed: 4,
    defaultSpell: 'recklessRage',
    startItems: ['potion'],
    blurb: 'Reckless melee fury, hits hardest when wounded. Unlocked via Class Trial.'
  },
  cleric: {
    id: 'cleric', name: 'Cleric', icon: '✝️',
    maxHp: 26, atk: 4, def: 2, speed: 4,
    defaultSpell: 'divineLight',
    startItems: ['potion', 'potion'],
    blurb: 'Devoted healer, sturdy and self-sustaining. Unlocked via Class Trial.'
  },
  bard: {
    id: 'bard', name: 'Bard', icon: '🎻',
    maxHp: 24, atk: 5, def: 1, speed: 8,
    defaultSpell: 'viciousMockery',
    startItems: ['potion'],
    blurb: 'Quick and cutting, more gold-savvy than most. Unlocked via Class Trial.'
  }
};

const ITEMS = {
  potion: { id: 'potion', name: 'Health Potion', icon: '🧪', desc: 'Heal 12 HP', price: 25 },
  bigPotion: { id: 'bigPotion', name: 'Greater Potion', icon: '🍷', desc: 'Heal 24 HP', price: 45 },
  bomb: { id: 'bomb', name: 'Bomb', icon: '💣', desc: 'Deal 15 damage to enemy', price: 30 },
  antidote: { id: 'antidote', name: 'Antidote', icon: '🧉', desc: 'Cure poison, heal 6 HP', price: 15 }
};

// Relics are entirely data-driven: `effect` is a bag of numeric levers that
// applyRelicEffects() below just sums up, so adding new relics never needs
// new code. Universal relics (no `forClass`) can appear for any class; the
// rest are "optimized" for one class and only show up in that class's
// reward choices (see pickRelicChoices in progression.js). All relics here
// are RUN-ONLY - they live in Game.player.relics and are lost on death/new
// run, unlike the separately-purchased permanent bank relics.
const RELICS = {
  luckyCoin: { id: 'luckyCoin', name: 'Lucky Coin', icon: '🪙', desc: '+25% gold from all sources', effect: { goldBonus: 0.25 } },
  ironSkin: { id: 'ironSkin', name: 'Iron Skin Charm', icon: '🛡️', desc: '+2 DEF', effect: { def: 2 } },
  berserkerHeart: { id: 'berserkerHeart', name: "Berserker's Heart", icon: '❤️‍🔥', desc: '+4 ATK, -5 Max HP', effect: { atk: 4, maxHp: -5 } },
  vampiricFang: { id: 'vampiricFang', name: 'Vampiric Fang', icon: '🦇', desc: 'Heal 2 HP whenever you deal damage', effect: { lifesteal: 2 } },
  swiftBoots: { id: 'swiftBoots', name: 'Swift Boots', icon: '👢', desc: '+3 Speed, better flee odds', effect: { speed: 3 } },
  eagleEye: { id: 'eagleEye', name: "Eagle's Eye", icon: '🦅', desc: '+10% critical hit chance', effect: { critBonus: 0.10 } },

  // --- Warrior (10) ---
  ironWillCharm: { id: 'ironWillCharm', name: 'Iron Will Charm', icon: '🛡️', desc: '+3 DEF', forClass: 'warrior', effect: { def: 3 } },
  bloodragePendant: { id: 'bloodragePendant', name: 'Bloodrage Pendant', icon: '🩸', desc: '+5 ATK, -8 Max HP', forClass: 'warrior', effect: { atk: 5, maxHp: -8 } },
  towerShieldFragment: { id: 'towerShieldFragment', name: 'Tower Shield Fragment', icon: '🛡️', desc: '+4 DEF, -1 Speed', forClass: 'warrior', effect: { def: 4, speed: -1 } },
  veteransGrit: { id: 'veteransGrit', name: "Veteran's Grit", icon: '❤️', desc: '+10 Max HP', forClass: 'warrior', effect: { maxHp: 10 } },
  weaponmastersWhetstone: { id: 'weaponmastersWhetstone', name: "Weaponmaster's Whetstone", icon: '🗡️', desc: '+3 ATK', forClass: 'warrior', effect: { atk: 3 } },
  bulwarkTotem: { id: 'bulwarkTotem', name: 'Bulwark Totem', icon: '🗿', desc: '+2 DEF, +5 Max HP', forClass: 'warrior', effect: { def: 2, maxHp: 5 } },
  berserkersTusk: { id: 'berserkersTusk', name: "Berserker's Tusk", icon: '🦷', desc: '+2 ATK, heal 1 HP per round', forClass: 'warrior', effect: { atk: 2, hpRegen: 1 } },
  guardiansOath: { id: 'guardiansOath', name: "Guardian's Oath", icon: '⚜️', desc: '+2 DEF, +2 damage vs elites/bosses', forClass: 'warrior', effect: { def: 2, eliteSlayerAtk: 2 } },
  secondWindFlask: { id: 'secondWindFlask', name: 'Second Wind Flask', icon: '🧪', desc: 'Heal 2 HP per round', forClass: 'warrior', effect: { hpRegen: 2 } },
  juggernautsBoots: { id: 'juggernautsBoots', name: "Juggernaut's Boots", icon: '👢', desc: '+2 Speed, +2 DEF', forClass: 'warrior', effect: { speed: 2, def: 2 } },

  // --- Rogue (10) ---
  shadowstepAmulet: { id: 'shadowstepAmulet', name: 'Shadowstep Amulet', icon: '🌑', desc: '+2 Speed', forClass: 'rogue', effect: { speed: 2 } },
  assassinsEdge: { id: 'assassinsEdge', name: "Assassin's Edge", icon: '🗡️', desc: '+8% critical hit chance', forClass: 'rogue', effect: { critBonus: 0.08 } },
  gildedLockpick: { id: 'gildedLockpick', name: 'Gilded Lockpick', icon: '🔑', desc: '+10% gold from all sources', forClass: 'rogue', effect: { goldBonus: 0.10 } },
  venomcoatedDagger: { id: 'venomcoatedDagger', name: 'Venom-Coated Dagger', icon: '🧪', desc: '+3 damage vs wounded (<30% HP) enemies', forClass: 'rogue', effect: { executeBonus: 3 } },
  cutpursesLuck: { id: 'cutpursesLuck', name: "Cutpurse's Luck", icon: '🪙', desc: '+12% gold from all sources', forClass: 'rogue', effect: { goldBonus: 0.12 } },
  nightstalkersHood: { id: 'nightstalkersHood', name: "Nightstalker's Hood", icon: '🥷', desc: '+1 Speed, +5% critical hit chance', forClass: 'rogue', effect: { speed: 1, critBonus: 0.05 } },
  bleedingEdgeBlade: { id: 'bleedingEdgeBlade', name: 'Bleeding Edge Blade', icon: '🩸', desc: '+2 ATK, +2 damage vs wounded enemies', forClass: 'rogue', effect: { atk: 2, executeBonus: 2 } },
  silkenGloves: { id: 'silkenGloves', name: 'Silken Gloves', icon: '🧤', desc: '+3 Speed', forClass: 'rogue', effect: { speed: 3 } },
  duelistsFlourish: { id: 'duelistsFlourish', name: "Duelist's Flourish", icon: '🎭', desc: '+1 ATK, +5% critical hit chance', forClass: 'rogue', effect: { atk: 1, critBonus: 0.05 } },
  smugglersPouch: { id: 'smugglersPouch', name: "Smuggler's Pouch", icon: '👜', desc: '+8% gold from all sources, +3 Max HP', forClass: 'rogue', effect: { goldBonus: 0.08, maxHp: 3 } },

  // --- Mage (10) ---
  arcaneFocusShard: { id: 'arcaneFocusShard', name: 'Arcane Focus Shard', icon: '🔮', desc: '+15% spell damage', forClass: 'mage', effect: { spellPower: 0.15 } },
  emberCoreGem: { id: 'emberCoreGem', name: 'Ember Core Gem', icon: '💎', desc: '+10% spell damage, +5% critical hit chance', forClass: 'mage', effect: { spellPower: 0.10, critBonus: 0.05 } },
  frostboundRing: { id: 'frostboundRing', name: 'Frostbound Ring', icon: '💍', desc: '+2 DEF', forClass: 'mage', effect: { def: 2 } },
  manaWellCharm: { id: 'manaWellCharm', name: 'Mana Well Charm', icon: '🌀', desc: 'Heal 1 HP per round', forClass: 'mage', effect: { hpRegen: 1 } },
  sorcerersSash: { id: 'sorcerersSash', name: "Sorcerer's Sash", icon: '🎗️', desc: '+10 Max HP', forClass: 'mage', effect: { maxHp: 10 } },
  runeEtchedWand: { id: 'runeEtchedWand', name: 'Rune-Etched Wand', icon: '🪄', desc: '+8% spell damage, +1 ATK', forClass: 'mage', effect: { spellPower: 0.08, atk: 1 } },
  arcaneBattery: { id: 'arcaneBattery', name: 'Arcane Battery', icon: '🔋', desc: '+20% spell damage, -5 Max HP', forClass: 'mage', effect: { spellPower: 0.20, maxHp: -5 } },
  scholarsMonocle: { id: 'scholarsMonocle', name: "Scholar's Monocle", icon: '🧐', desc: '+6% critical hit chance', forClass: 'mage', effect: { critBonus: 0.06 } },
  temporalHourglass: { id: 'temporalHourglass', name: 'Temporal Hourglass', icon: '⏳', desc: '+2 Speed', forClass: 'mage', effect: { speed: 2 } },
  phoenixDownFeather: { id: 'phoenixDownFeather', name: 'Phoenix Down Feather', icon: '🪶', desc: 'Heal 2 HP per round, +5 Max HP', forClass: 'mage', effect: { hpRegen: 2, maxHp: 5 } },

  // --- Paladin (10) ---
  sacredAegis: { id: 'sacredAegis', name: 'Sacred Aegis', icon: '🛡️', desc: '+3 DEF', forClass: 'paladin', effect: { def: 3 } },
  lightsBlessing: { id: 'lightsBlessing', name: "Light's Blessing", icon: '✨', desc: 'Heal 2 HP per round', forClass: 'paladin', effect: { hpRegen: 2 } },
  holyAvengerShard: { id: 'holyAvengerShard', name: 'Holy Avenger Shard', icon: '⚔️', desc: '+2 ATK, +2 DEF', forClass: 'paladin', effect: { atk: 2, def: 2 } },
  templarsResolve: { id: 'templarsResolve', name: "Templar's Resolve", icon: '❤️', desc: '+8 Max HP', forClass: 'paladin', effect: { maxHp: 8 } },
  consecratedBand: { id: 'consecratedBand', name: 'Consecrated Band', icon: '💍', desc: '+15% healing from items', forClass: 'paladin', effect: { potionHealBonus: 0.15 } },
  divineBulwark: { id: 'divineBulwark', name: 'Divine Bulwark', icon: '🛡️', desc: '+3 DEF, heal 1 HP per round', forClass: 'paladin', effect: { def: 3, hpRegen: 1 } },
  crusadersFaith: { id: 'crusadersFaith', name: "Crusader's Faith", icon: '⚜️', desc: '+2 damage vs elites/bosses', forClass: 'paladin', effect: { eliteSlayerAtk: 2 } },
  auroraPendant: { id: 'auroraPendant', name: 'Aurora Pendant', icon: '🌟', desc: '+5% spell damage', forClass: 'paladin', effect: { spellPower: 0.05 } },
  oathstoneOfValor: { id: 'oathstoneOfValor', name: 'Oathstone of Valor', icon: '💠', desc: '+2 ATK', forClass: 'paladin', effect: { atk: 2 } },
  guardianAngelCharm: { id: 'guardianAngelCharm', name: 'Guardian Angel Charm', icon: '👼', desc: '+6 Max HP, heal 1 HP per round', forClass: 'paladin', effect: { maxHp: 6, hpRegen: 1 } },

  // --- Hunter (10) ---
  eagleEyeLens: { id: 'eagleEyeLens', name: 'Eagle-Eye Lens', icon: '🔭', desc: '+6% critical hit chance', forClass: 'hunter', effect: { critBonus: 0.06 } },
  huntersMark: { id: 'huntersMark', name: "Hunter's Mark", icon: '🎯', desc: '+3 damage vs wounded (<30% HP) enemies', forClass: 'hunter', effect: { executeBonus: 3 } },
  swiftwindQuiver: { id: 'swiftwindQuiver', name: 'Swiftwind Quiver', icon: '🏹', desc: '+2 Speed', forClass: 'hunter', effect: { speed: 2 } },
  camouflageCloak: { id: 'camouflageCloak', name: 'Camouflage Cloak', icon: '🧥', desc: '+1 Speed, +1 DEF', forClass: 'hunter', effect: { speed: 1, def: 1 } },
  beastcallersHorn: { id: 'beastcallersHorn', name: "Beastcaller's Horn", icon: '📯', desc: 'Heal 1 HP per round', forClass: 'hunter', effect: { hpRegen: 1 } },
  piercingBroadhead: { id: 'piercingBroadhead', name: 'Piercing Broadhead', icon: '🏹', desc: '+2 ATK', forClass: 'hunter', effect: { atk: 2 } },
  trackersInstinct: { id: 'trackersInstinct', name: "Tracker's Instinct", icon: '🐾', desc: '+2 damage vs wounded enemies, +1 Speed', forClass: 'hunter', effect: { executeBonus: 2, speed: 1 } },
  longshotScope: { id: 'longshotScope', name: 'Longshot Scope', icon: '🔎', desc: '+5% critical hit chance, +1 ATK', forClass: 'hunter', effect: { critBonus: 0.05, atk: 1 } },
  quickdrawHolster: { id: 'quickdrawHolster', name: 'Quickdraw Holster', icon: '🎒', desc: '+3 Speed', forClass: 'hunter', effect: { speed: 3 } },
  predatorsFocus: { id: 'predatorsFocus', name: "Predator's Focus", icon: '🐺', desc: '+2 damage vs elites/bosses', forClass: 'hunter', effect: { eliteSlayerAtk: 2 } },

  // --- Warlock (10) ---
  soulsiphonRing: { id: 'soulsiphonRing', name: 'Soulsiphon Ring', icon: '💍', desc: 'Heal 2 HP whenever you deal damage', forClass: 'warlock', effect: { lifesteal: 2 } },
  felboundGrimoire: { id: 'felboundGrimoire', name: 'Felbound Grimoire', icon: '📕', desc: '+12% spell damage', forClass: 'warlock', effect: { spellPower: 0.12 } },
  demonicPact: { id: 'demonicPact', name: 'Demonic Pact', icon: '😈', desc: '+5 ATK, -6 Max HP', forClass: 'warlock', effect: { atk: 5, maxHp: -6 } },
  voidtouchedAmulet: { id: 'voidtouchedAmulet', name: 'Voidtouched Amulet', icon: '🔮', desc: '+8% spell damage, heal 1 HP on hit', forClass: 'warlock', effect: { spellPower: 0.08, lifesteal: 1 } },
  cursedTome: { id: 'cursedTome', name: 'Cursed Tome', icon: '📖', desc: '+15% spell damage, -3 DEF', forClass: 'warlock', effect: { spellPower: 0.15, def: -3 } },
  bloodwardenSigil: { id: 'bloodwardenSigil', name: 'Bloodwarden Sigil', icon: '🩸', desc: 'Heal 1 HP on hit, +5 Max HP', forClass: 'warlock', effect: { lifesteal: 1, maxHp: 5 } },
  shadowflameCore: { id: 'shadowflameCore', name: 'Shadowflame Core', icon: '🔥', desc: '+10% spell damage', forClass: 'warlock', effect: { spellPower: 0.10 } },
  impsLoyalty: { id: 'impsLoyalty', name: "Imp's Loyalty", icon: '👹', desc: 'Heal 1 HP per round', forClass: 'warlock', effect: { hpRegen: 1 } },
  darkPactBand: { id: 'darkPactBand', name: 'Dark Pact Band', icon: '⛓️', desc: 'Heal 2 HP on hit, -2 DEF', forClass: 'warlock', effect: { lifesteal: 2, def: -2 } },
  abyssalFocus: { id: 'abyssalFocus', name: 'Abyssal Focus', icon: '🌌', desc: '+6% critical hit chance', forClass: 'warlock', effect: { critBonus: 0.06 } },

  // --- Barbarian (10) ---
  raginBloodline: { id: 'raginBloodline', name: 'Raging Bloodline', icon: '🩸', desc: '+4 ATK', forClass: 'barbarian', effect: { atk: 4 } },
  thickHide: { id: 'thickHide', name: 'Thick Hide', icon: '🐗', desc: '+4 DEF', forClass: 'barbarian', effect: { def: 4 } },
  wardrumTotem: { id: 'wardrumTotem', name: 'War-Drum Totem', icon: '🥁', desc: '+2 ATK, +5 Max HP', forClass: 'barbarian', effect: { atk: 2, maxHp: 5 } },
  bonecrusherFist: { id: 'bonecrusherFist', name: 'Bonecrusher Fist', icon: '👊', desc: '+3 ATK', forClass: 'barbarian', effect: { atk: 3 } },
  primalScars: { id: 'primalScars', name: 'Primal Scars', icon: '❤️‍🔥', desc: '+10 Max HP', forClass: 'barbarian', effect: { maxHp: 10 } },
  howlingRage: { id: 'howlingRage', name: 'Howling Rage', icon: '🐺', desc: '+2 ATK, +1 Speed', forClass: 'barbarian', effect: { atk: 2, speed: 1 } },
  ironJawAmulet: { id: 'ironJawAmulet', name: 'Iron Jaw Amulet', icon: '🦴', desc: '+3 DEF', forClass: 'barbarian', effect: { def: 3 } },
  bloodfuryTusks: { id: 'bloodfuryTusks', name: 'Bloodfury Tusks', icon: '🦷', desc: 'Heal 2 HP whenever you deal damage', forClass: 'barbarian', effect: { lifesteal: 2 } },
  unbreakableWill: { id: 'unbreakableWill', name: 'Unbreakable Will', icon: '💪', desc: '+8 Max HP, +1 DEF', forClass: 'barbarian', effect: { maxHp: 8, def: 1 } },
  avalancheStomp: { id: 'avalancheStomp', name: 'Avalanche Stomp', icon: '⛰️', desc: '+2 damage vs elites/bosses', forClass: 'barbarian', effect: { eliteSlayerAtk: 2 } },

  // --- Cleric (10) ---
  blessedChalice: { id: 'blessedChalice', name: 'Blessed Chalice', icon: '🏆', desc: 'Heal 2 HP per round', forClass: 'cleric', effect: { hpRegen: 2 } },
  sanctifiedShield: { id: 'sanctifiedShield', name: 'Sanctified Shield', icon: '🛡️', desc: '+3 DEF', forClass: 'cleric', effect: { def: 3 } },
  healersDevotion: { id: 'healersDevotion', name: "Healer's Devotion", icon: '💚', desc: '+15% healing from items', forClass: 'cleric', effect: { potionHealBonus: 0.15 } },
  radiantHalo: { id: 'radiantHalo', name: 'Radiant Halo', icon: '😇', desc: '+5 Max HP', forClass: 'cleric', effect: { maxHp: 5 } },
  penitentsChain: { id: 'penitentsChain', name: "Penitent's Chain", icon: '⛓️', desc: '+2 DEF, -1 Speed', forClass: 'cleric', effect: { def: 2, speed: -1 } },
  mercyStone: { id: 'mercyStone', name: 'Mercy Stone', icon: '💎', desc: 'Heal 1 HP whenever you deal damage', forClass: 'cleric', effect: { lifesteal: 1 } },
  faithboundLocket: { id: 'faithboundLocket', name: 'Faithbound Locket', icon: '📿', desc: '+6 Max HP, heal 1 HP per round', forClass: 'cleric', effect: { maxHp: 6, hpRegen: 1 } },
  templeBell: { id: 'templeBell', name: 'Temple Bell', icon: '🔔', desc: '+5% spell damage', forClass: 'cleric', effect: { spellPower: 0.05 } },
  serenityBeads: { id: 'serenityBeads', name: 'Serenity Beads', icon: '📿', desc: '+1 Speed, +2 DEF', forClass: 'cleric', effect: { speed: 1, def: 2 } },
  lastRitesCharm: { id: 'lastRitesCharm', name: 'Last Rites Charm', icon: '🕯️', desc: '+2 damage vs elites/bosses', forClass: 'cleric', effect: { eliteSlayerAtk: 2 } },

  // --- Bard (10) ---
  luckyLute: { id: 'luckyLute', name: 'Lucky Lute', icon: '🎻', desc: '+10% gold from all sources', forClass: 'bard', effect: { goldBonus: 0.10 } },
  minstrelsCharm: { id: 'minstrelsCharm', name: "Minstrel's Charm", icon: '🎭', desc: '+5% critical hit chance', forClass: 'bard', effect: { critBonus: 0.05 } },
  silverTongueRing: { id: 'silverTongueRing', name: 'Silver Tongue Ring', icon: '💍', desc: '+8% gold from all sources', forClass: 'bard', effect: { goldBonus: 0.08 } },
  dancersSlippers: { id: 'dancersSlippers', name: "Dancer's Slippers", icon: '🩰', desc: '+2 Speed', forClass: 'bard', effect: { speed: 2 } },
  inspiringBallad: { id: 'inspiringBallad', name: 'Inspiring Ballad', icon: '🎶', desc: 'Heal 1 HP per round', forClass: 'bard', effect: { hpRegen: 1 } },
  fortunesFavor: { id: 'fortunesFavor', name: "Fortune's Favor", icon: '🍀', desc: '+12% gold from all sources, -2 DEF', forClass: 'bard', effect: { goldBonus: 0.12, def: -2 } },
  crowdPleaserBand: { id: 'crowdPleaserBand', name: "Crowd-Pleaser's Band", icon: '👏', desc: '+1 ATK, +5% critical hit chance', forClass: 'bard', effect: { atk: 1, critBonus: 0.05 } },
  wanderersPack: { id: 'wanderersPack', name: "Wanderer's Pack", icon: '🎒', desc: '+5 Max HP, +5% gold from all sources', forClass: 'bard', effect: { maxHp: 5, goldBonus: 0.05 } },
  echoingHarpstring: { id: 'echoingHarpstring', name: 'Echoing Harpstring', icon: '🎵', desc: '+6% spell damage', forClass: 'bard', effect: { spellPower: 0.06 } },
  showstoppersFlourish: { id: 'showstoppersFlourish', name: "Showstopper's Flourish", icon: '🎪', desc: '+2 ATK', forClass: 'bard', effect: { atk: 2 } }
};

const RELIC_EFFECT_KEYS = ['atk', 'def', 'maxHp', 'speed', 'critBonus', 'goldBonus', 'lifesteal', 'hpRegen', 'executeBonus', 'eliteSlayerAtk', 'potionHealBonus', 'spellPower'];

function applyRelicEffects(relicIds) {
  const base = {};
  RELIC_EFFECT_KEYS.forEach(k => { base[k] = 0; });
  relicIds.forEach(id => {
    const relic = RELICS[id];
    if (!relic || !relic.effect) return;
    Object.keys(relic.effect).forEach(key => { base[key] = (base[key] || 0) + relic.effect[key]; });
  });
  return base;
}

// The 3 relic choices offered after a combat victory: a shuffled sample from
// that class's 10 optimized relics plus the 6 universal ones (16 candidates,
// so 3 distinct picks are always possible without repeats).
function pickRelicChoices(classId, count) {
  const pool = Object.keys(RELICS).filter(id => !RELICS[id].forClass || RELICS[id].forClass === classId);
  const shuffled = pool.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

// --- Pets & Mounts ---
// Unlike relics these are PERSISTENT (stored in Persistent, survive death) and
// use the same effect{} lever bag as relics/gear, summed in via companionStatBonus()
// in progression.js. Won only from rare 'taming' map encounters (see TAMING_DECISIONS
// below and Game logic in map.js/main.js), except the JESS_EXCLUSIVE_PETS below,
// which only Jess's rare witchJess encounter sells. `icon` is still a compact
// emoji badge for list rows (House, tooltips) alongside the real PixelLab
// sprite used everywhere the companion is actually drawn (see CREATURE_ART_IDS
// in sprites.js) - every id below has a matching assets/sprites/<id>.png.
const PETS = {
  dragonWhelpling: { id: 'dragonWhelpling', name: 'Dragon Whelpling', icon: '🐲', universe: 'WoW', desc: 'A bonded baby dragon. +2 ATK, +5% spell damage.', effect: { atk: 2, spellPower: 0.05 } },
  direwolfPup: { id: 'direwolfPup', name: 'Direwolf Pup', icon: '🐺', universe: 'WoW', desc: 'Loyal and vicious. +2 ATK, +1 Speed.', effect: { atk: 2, speed: 1 } },
  pseudodragon: { id: 'pseudodragon', name: 'Pseudodragon', icon: '🐉', universe: 'D&D', desc: 'A tiny, telepathic dragon-kin. +5% critical hit chance, +1 Speed.', effect: { critBonus: 0.05, speed: 1 } },
  impFamiliar: { id: 'impFamiliar', name: 'Imp Familiar', icon: '👿', universe: 'D&D', desc: 'A cackling fiendish servant. +5% spell damage, heal 1 HP whenever you deal damage.', effect: { spellPower: 0.05, lifesteal: 1 } },
  moonkinHatchling: { id: 'moonkinHatchling', name: 'Moonkin Hatchling', icon: '🐣', universe: 'WoW', desc: 'An owlbeast chick attuned to the moon. +3 Max HP, +3% spell damage.', effect: { maxHp: 3, spellPower: 0.03 } },
  mechanicalSquirrel: { id: 'mechanicalSquirrel', name: 'Mechanical Squirrel', icon: '🐿️', universe: 'WoW', desc: 'A clockwork tinker\'s toy. +2 Speed, +5% gold from all sources.', effect: { speed: 2, goldBonus: 0.05 } },
  owlFamiliar: { id: 'owlFamiliar', name: 'Owl Familiar', icon: '🦉', universe: 'D&D', desc: 'A wise arcane companion. +4% critical hit chance.', effect: { critBonus: 0.04 } },
  pixieSprite: { id: 'pixieSprite', name: 'Pixie Sprite', icon: '🧚', universe: 'D&D', desc: 'A mischievous fey friend. Heal 1 HP per round.', effect: { hpRegen: 1 } },
  // Three dedicated "support" pets (see COMPANION_COMBAT_SCALE/role handling
  // in combat.js) - every pet/mount already fights alongside you for a cut
  // of your own ATK, but these three layer a WoW/D&D-style role on top:
  // Tank blunts the enemy's next reply, DPS hits noticeably harder than a
  // plain pet, Healer mends you a little each round it acts.
  ironshellTortle: { id: 'ironshellTortle', name: 'Ironshell Tortle', icon: '🐢', universe: 'D&D', desc: 'A stalwart tortle hatchling, shell hardened like plate. +4 DEF. In battle: braces before the enemy\'s reply, blunting the next hit.', effect: { def: 4 }, role: 'tank' },
  direhornRaptor: { id: 'direhornRaptor', name: 'Direhorn Raptor', icon: '🦖', universe: 'WoW', desc: 'A vicious hatchling bred for the pit fights of Pandaria. +3 ATK. In battle: strikes noticeably harder than an ordinary pet.', effect: { atk: 3 }, role: 'dps' },
  faerieDragonling: { id: 'faerieDragonling', name: 'Faerie Dragonling', icon: '🦚', universe: 'D&D', desc: 'A tiny prismatic dragon, more mischief than menace. +3% healing from items. In battle: mends a little HP each round it acts.', effect: { potionHealBonus: 0.03 }, role: 'healer' },
  // Jess's own stock (see JESS_EXCLUSIVE_PETS/JESS_PET_PRICE below and
  // enterWitchJess in main.js) - cats and kittens only, bought with THIS
  // RUN's temporary relics (spent at random) rather than tamed in the wild.
  // Kittens cost double a cat's price, so their effect is tuned a notch
  // above the cats' rather than below - "kitten" is rarity/cost here, not
  // power tier.
  emberTabby: { id: 'emberTabby', name: 'Ember Tabby', icon: '🐱', universe: 'D&D', desc: 'A hearth-warmed familiar out of Jess\'s cottage, orange as the coals it naps in. +4% spell damage, +1 Speed.', effect: { spellPower: 0.04, speed: 1 }, tier: 'cat' },
  shadowPouncer: { id: 'shadowPouncer', name: 'Shadow Pouncer', icon: '🐈‍⬛', universe: 'D&D', desc: 'Silent, quick, and always one pounce behind you in the dark. +5% critical hit chance.', effect: { critBonus: 0.05 }, tier: 'cat' },
  luckyCalico: { id: 'luckyCalico', name: 'Lucky Calico', icon: '🐈', universe: 'WoW', desc: 'Three-colored and thrice-lucky, or so Jess swears. +2 Max HP, +6% gold from all sources.', effect: { maxHp: 2, goldBonus: 0.06 }, tier: 'cat' },
  starlitKitten: { id: 'starlitKitten', name: 'Starlit Kitten', icon: '✨', universe: 'D&D', desc: 'Still small, but already humming with borrowed starlight. +2 hp regen per round, +2% spell damage.', effect: { hpRegen: 2, spellPower: 0.02 }, tier: 'kitten' },
  witchlightKitten: { id: 'witchlightKitten', name: 'Witchlight Kitten', icon: '🐾', universe: 'WoW', desc: 'Raised on Jess\'s own hearthfire magic. +4% healing from items. In battle: mends a little HP each round it acts.', effect: { potionHealBonus: 0.04 }, role: 'healer', tier: 'kitten' },
  // Signature companions from RARE_NPCS/LEGENDARY_TAMINGS below - each tied
  // to one specific one-time-ever encounter (see enterRareNpc/
  // enterLegendaryTaming in main.js), never randomly tamed in the wild.
  ryker: { id: 'ryker', name: 'Ryker', icon: '🐕‍🦺', universe: 'Original', desc: "George's giant black dog - as ruthless in a fight as his owner. +4 ATK. In battle: strikes noticeably harder than an ordinary pet.", effect: { atk: 4 }, role: 'dps' },
  landryDuckling: { id: 'landryDuckling', name: "Landry's Deputy", icon: '🦆', universe: 'Original', desc: "Sheriff Landry's giant yellow duckling - tougher than it looks. +3 DEF, +4 Max HP.", effect: { def: 3, maxHp: 4 } },
  monkey: { id: 'monkey', name: 'Monkey', icon: '🐱', universe: 'Original', desc: 'A giant grey cat in a strawhat, captain of the largest pirate gang in the world. +6% gold from all sources, +1 Speed.', effect: { goldBonus: 0.06, speed: 1 } },
  chopper: { id: 'chopper', name: 'Chopper', icon: '🐱', universe: 'Original', desc: "A giant grey cat and a renowned doctor. +5% healing from items. In battle: mends a little HP each round it acts.", effect: { potionHealBonus: 0.05 }, role: 'healer' }
};

// The 3 cats (5 relics each) and 2 kittens (10 relics each) only Jess sells -
// excluded from pickTamingReward()'s wild-encounter pool below so they're
// never randomly tamed instead. Kitten price is tuned to their effect, not
// the other way around - see the comment above.
const JESS_EXCLUSIVE_PETS = new Set(['emberTabby', 'shadowPouncer', 'luckyCalico', 'starlitKitten', 'witchlightKitten']);
const JESS_PET_PRICE = { cat: 5, kitten: 10 };

// Every pet/mount id that's a signature reward of ONE specific rare
// encounter rather than a random wild find - excluded from both
// pickTamingReward()'s pool and, for the pets, Jess's stock.
const SIGNATURE_PET_IDS = new Set(['ryker', 'landryDuckling', 'monkey', 'chopper']);
const SIGNATURE_MOUNT_IDS = new Set(['izzoCorvette', 'robin']);

const MOUNTS = {
  netherdrake: { id: 'netherdrake', name: 'Netherdrake', icon: '🐉', universe: 'WoW', desc: 'A drake bred in the Twisting Nether. +4 ATK, +5 Max HP.', effect: { atk: 4, maxHp: 5 } },
  griffonMount: { id: 'griffonMount', name: 'Griffon', icon: '🦅', universe: 'D&D', desc: 'A proud, noble mount of sky and stone. +3 Speed, +2 DEF.', effect: { speed: 3, def: 2 } },
  frostwolfMount: { id: 'frostwolfMount', name: 'Frostwolf', icon: '🐺', universe: 'WoW', desc: 'A clan-bonded war wolf. +3 ATK, +2 Speed.', effect: { atk: 3, speed: 2 } },
  warKodo: { id: 'warKodo', name: 'War Kodo', icon: '🦏', universe: 'WoW', desc: 'A thundering beast of burden. +6 DEF, +10 Max HP, -1 Speed.', effect: { def: 6, maxHp: 10, speed: -1 } },
  hippogriffMount: { id: 'hippogriffMount', name: 'Hippogriff', icon: '🐎', universe: 'D&D', desc: 'Half eagle, half horse, all fury. +2 Speed, +3 ATK.', effect: { speed: 2, atk: 3 } },
  nightmareSteed: { id: 'nightmareSteed', name: 'Nightmare', icon: '🐴', universe: 'D&D', desc: 'A fiendish steed wreathed in smoke. +4 ATK, +3% spell damage.', effect: { atk: 4, spellPower: 0.03 } },
  unicornMount: { id: 'unicornMount', name: 'Unicorn', icon: '🦄', universe: 'D&D', desc: 'A radiant, healing presence. +3 hp regen per round, +5 Max HP.', effect: { hpRegen: 3, maxHp: 5 } },
  spectralTiger: { id: 'spectralTiger', name: 'Spectral Tiger', icon: '🐯', universe: 'WoW', desc: 'A ghostly, impossibly fast hunting cat. +3 Speed, +6% critical hit chance.', effect: { speed: 3, critBonus: 0.06 } },
  // Signature mounts - see SIGNATURE_MOUNT_IDS above.
  izzoCorvette: { id: 'izzoCorvette', name: "Izzo's Corvette", icon: '🏎️', universe: 'Original', desc: 'Race King Izzo\'s own racecar, keys and all. +4 Speed, +2 ATK.', effect: { speed: 4, atk: 2 } },
  robin: { id: 'robin', name: 'Robin', icon: '🐕', universe: 'Original', desc: 'A giant brindle pitbull, sweet as often as vicious. +3 ATK, +3 DEF.', effect: { atk: 3, def: 3 } }
};

// An equipped pet/mount doesn't just grant a passive stat (see
// companionStatBonus in progression.js) - it also joins every one of your
// own Attack/Skill actions with a bonus hit of its own, scaled off your
// current ATK: a pet fights at 30% of you, a mount (bigger, more
// battle-trained) at 50%. See Combat.resolveCompanionAttacks in combat.js.
const COMPANION_COMBAT_SCALE = { pet: 0.3, mount: 0.5 };
// A `role` pet's combat contribution goes further than a plain pet's flat
// hit: DPS hits harder, Tank blunts the enemy's next reply, Healer mends a
// little HP - see the role branch in Combat.resolveCompanionAttacks.
const COMPANION_ROLE_GLOW = { tank: '#4a8fe8', dps: '#e8522f', healer: '#5cae6e' };

// --- Act themes ---
// Every 10 acts moves the adventure into a new WoW-flavored backdrop - purely
// cosmetic (map background gradient + a drifting particle effect + an enemy
// portrait lighting grade, see map.js's renderMap and main.js's
// renderCombatScreen), layered on top of the existing encounter/loot systems
// which don't change. After the 9 curated stretches (90 acts) run out,
// getActTheme reuses one of them - picked by a fixed hash of the act number
// so it doesn't re-roll (and visually flicker) on every re-render, but still
// reads as "random" act to act.
// enemyTint used to be a strong hue-rotate (able to reskin a monster's whole
// color, e.g. green->blue) back when every monster shared a handful of flat
// recolored silhouettes - now that each monster/pet/mount has its own
// PixelLab-generated art with deliberately chosen colors (see
// CREATURE_ART_IDS in sprites.js), a full hue swap fights the art instead of
// setting a mood. These are now gentle "ambient lighting" grades (mild
// saturate/brightness/contrast, a few degrees of hue-rotate at most) that
// still shift the same reused monster pool per zone without recoloring it.
const ACT_THEMES = [
  { id: 'forest', name: 'Elderglen Forest', bg: 'linear-gradient(180deg, #2c4a30 0%, #1c3320 55%, #0f1f13 100%)', particle: '🍃', motion: 'drift-down', accent: '#6fbf73', enemyTint: 'saturate(1.08) brightness(1.02)' },
  { id: 'swamp', name: 'Murkfen Swamp', bg: 'linear-gradient(180deg, #313d2c 0%, #202a1c 55%, #0d150f 100%)', particle: '🦟', motion: 'drift-side', accent: '#7a9a5a', enemyTint: 'saturate(0.85) brightness(0.92) hue-rotate(-5deg)' },
  { id: 'desert', name: 'Sunscar Wastes', bg: 'linear-gradient(180deg, #6b4a2a 0%, #4a3018 55%, #2a1a0d 100%)', particle: '✨', motion: 'drift-side', accent: '#e0a458', enemyTint: 'sepia(0.15) saturate(1.1) brightness(1.05)' },
  { id: 'hellfire', name: 'Shattered Hellscape', bg: 'linear-gradient(180deg, #5a1f14 0%, #3a1310 55%, #1a0a08 100%)', particle: '🔥', motion: 'drift-up', accent: '#e0522f', enemyTint: 'sepia(0.2) saturate(1.3) hue-rotate(-8deg) brightness(1.05)' },
  { id: 'emerald', name: 'The Emerald Dream', bg: 'linear-gradient(180deg, #1f5c3f 0%, #14402c 55%, #0a2418 100%)', particle: '🌿', motion: 'drift-down', accent: '#5fe6a0', enemyTint: 'saturate(1.15) brightness(1.08) hue-rotate(6deg)' },
  { id: 'silvermoon', name: 'Silvermoon Spires', bg: 'linear-gradient(180deg, #3a2a5c 0%, #281c40 55%, #140e24 100%)', particle: '🔮', motion: 'drift-up', accent: '#c48aff', enemyTint: 'saturate(1.1) hue-rotate(12deg) brightness(1.03)' },
  { id: 'blacktemple', name: 'The Black Bastion', bg: 'linear-gradient(180deg, #3a1030 0%, #260a20 55%, #120410 100%)', particle: '💀', motion: 'drift-up', accent: '#a13ce0', enemyTint: 'saturate(1.2) hue-rotate(-10deg) brightness(0.92)' },
  { id: 'northrend', name: 'Northrend Wastes', bg: 'linear-gradient(180deg, #1a2e3d 0%, #14212c 55%, #0a1218 100%)', particle: '❄️', motion: 'drift-down', accent: '#8fd8f0', enemyTint: 'saturate(0.95) hue-rotate(8deg) brightness(1.08)' },
  { id: 'nether', name: 'The Twisting Nether', bg: 'linear-gradient(180deg, #1a1030 0%, #100a20 55%, #050310 100%)', particle: '⭐', motion: 'drift-up', accent: '#7a5cff', enemyTint: 'saturate(1.3) hue-rotate(15deg) brightness(0.95)' }
];

// Per-zone procedural backdrop art (see renderZoneSkyline in sprites.js) - a
// silhouette skyline shown in a themed banner above every encounter screen
// (map, combat, campsite, shop, event, treasure...) during a run, so each
// zone reads as an actual place instead of just a color gradient. 'units'
// draws repeated discrete silhouettes (trees, spires...); 'ridge' draws one
// continuous mountain/dune line. `disc` adds a moon/sun; `glow` adds a soft
// ambient light matching the zone's danger/magic (lava, fel, starlight...).
const ZONE_SKYLINE_STYLE = {
  forest: { family: 'units', shape: 'tree', color: '#0b1c0d' },
  swamp: { family: 'units', shape: 'gnarled', color: '#0a130c' },
  desert: { family: 'ridge', shape: 'dune', color: '#3a2410' },
  hellfire: { family: 'ridge', shape: 'jagged', color: '#200b08', glow: '#e0522f' },
  emerald: { family: 'units', shape: 'mushroom', color: '#0c2417', glow: '#5fe6a0' },
  silvermoon: { family: 'units', shape: 'spire', color: '#160f28', disc: '#c48aff' },
  blacktemple: { family: 'units', shape: 'arch', color: '#170518' },
  northrend: { family: 'ridge', shape: 'peak', color: '#0b161e', disc: '#e8f4fa' },
  nether: { family: 'units', shape: 'asteroid', color: '#0a0618', glow: '#7a5cff' }
};

function getActTheme(act) {
  const idx = Math.floor((act - 1) / 10);
  if (idx < ACT_THEMES.length) return ACT_THEMES[idx];
  return ACT_THEMES[(act * 7 + 3) % ACT_THEMES.length];
}

// --- Reputation (WoW-inspired) ---
// One reputation track per zone (see ACT_THEMES) - every node completed
// while adventuring in that zone's act range nudges it up (see
// grantReputation in progression.js, called from selectNode/resolveCombatEnd/
// grantTamingReward in main.js). Thresholds roughly mirror WoW's real
// per-tier costs (3000/6000/12000/21000, cumulative). Each tier reached
// grants a small permanent +gold bonus (reputationStatBonus in progression.js) -
// standing with a zone quite literally pays off, same idea as a vendor discount.
const REPUTATION_TIERS = [
  { name: 'Neutral', threshold: 0 },
  { name: 'Friendly', threshold: 3000 },
  { name: 'Honored', threshold: 9000 },
  { name: 'Revered', threshold: 21000 },
  { name: 'Exalted', threshold: 42000 }
];
const REPUTATION_GOLD_BONUS_PER_TIER = 0.005; // +0.5% gold per tier, per zone

// --- Titles (WoW-inspired) ---
// Account-wide unlocks, like unlockedClasses/ownedLegendaries - any
// character can equip any title this account has earned (see
// isTitleUnlocked/titleStatBonus in progression.js). `position` controls
// whether it renders before ("the Undying Aldric") or after ("Aldric the
// Undying") the character's name - see renderedTitleName in progression.js.
// `effect` is a small flat passive bonus (same RELIC_EFFECT_KEYS shape as a
// relic/talent) folded into effectiveStats in state.js - a thematic
// keepsake, not a min-maxing lever, so these stay modest. `check` is
// evaluated live (not cached) against Persistent/Meta state, so a title can
// go from locked to unlocked mid-session without any extra bookkeeping.
const TITLES = {
  // Dungeon clears - one per DUNGEONS entry, named after that dungeon's own
  // boss (see BOSS_ART in sprites.js).
  d_deadmines: { name: 'the Shipwrecker', position: 'suffix', source: 'Clear The Deadmines', effect: { atk: 1 }, check: () => (Persistent.load().questProgress['dungeon:deadmines'] || 0) > 0 },
  d_shadowfangKeep: { name: 'Wolfsbane', position: 'suffix', source: 'Clear Shadowfang Keep', effect: { critBonus: 0.01 }, check: () => (Persistent.load().questProgress['dungeon:shadowfangKeep'] || 0) > 0 },
  d_blackfathomDeeps: { name: 'Tidebreaker', position: 'suffix', source: 'Clear Blackfathom Deeps', effect: { speed: 1 }, check: () => (Persistent.load().questProgress['dungeon:blackfathomDeeps'] || 0) > 0 },
  d_razorfenDowns: { name: 'Boarbane', position: 'suffix', source: 'Clear Razorfen Downs', effect: { def: 1 }, check: () => (Persistent.load().questProgress['dungeon:razorfenDowns'] || 0) > 0 },
  d_scarletMonastery: { name: 'the Heretic', position: 'suffix', source: 'Clear Scarlet Monastery', effect: { spellPower: 0.01 }, check: () => (Persistent.load().questProgress['dungeon:scarletMonastery'] || 0) > 0 },
  d_zulFarrak: { name: 'Sandwalker', position: 'suffix', source: "Clear Zul'Farrak", effect: { speed: 1 }, check: () => (Persistent.load().questProgress['dungeon:zulFarrak'] || 0) > 0 },
  d_maraudon: { name: 'Stormrender', position: 'suffix', source: 'Clear Maraudon', effect: { atk: 1 }, check: () => (Persistent.load().questProgress['dungeon:maraudon'] || 0) > 0 },
  d_direMaul: { name: 'Kingsbane', position: 'suffix', source: 'Clear Dire Maul', effect: { def: 1 }, check: () => (Persistent.load().questProgress['dungeon:direMaul'] || 0) > 0 },
  d_scholomance: { name: 'Gravebane', position: 'suffix', source: 'Clear Scholomance', effect: { hpRegen: 1 }, check: () => (Persistent.load().questProgress['dungeon:scholomance'] || 0) > 0 },
  d_cullingOfStratholme: { name: 'Ashwalker', position: 'suffix', source: 'Clear The Culling of Stratholme', effect: { atk: 1, def: 1 }, check: () => (Persistent.load().questProgress['dungeon:cullingOfStratholme'] || 0) > 0 },

  // Raid clears - one per RAID_BOSSES entry, stronger bonuses to match the
  // endgame difficulty.
  r_moltenCore: { name: 'Emberfall', position: 'suffix', source: 'Defeat Cindermaw, the Molten Titan', effect: { atk: 2 }, check: () => (Persistent.load().questProgress['raid:moltenCore'] || 0) > 0 },
  r_blackwingLair: { name: 'Wyrmbane', position: 'suffix', source: 'Defeat Nightscale, the Black Wyrm', effect: { def: 2 }, check: () => (Persistent.load().questProgress['raid:blackwingLair'] || 0) > 0 },
  r_ahnQiraj: { name: 'Hivebane', position: 'suffix', source: "Defeat Queen Anub'khepra", effect: { speed: 2 }, check: () => (Persistent.load().questProgress['raid:ahnQiraj'] || 0) > 0 },
  r_naxxramas: { name: 'the Plaguebreaker', position: 'suffix', source: 'Defeat The Plaguebound Countess', effect: { hpRegen: 2 }, check: () => (Persistent.load().questProgress['raid:naxxramas'] || 0) > 0 },
  r_karazhan: { name: 'the Curtain Call', position: 'suffix', source: 'Defeat Maestro Nightwhisper', effect: { critBonus: 0.02 }, check: () => (Persistent.load().questProgress['raid:karazhan'] || 0) > 0 },
  r_blackTemple: { name: "the Betrayer's Bane", position: 'suffix', source: "Defeat Xal'gorath the Betrayer", effect: { atk: 2, def: 1 }, check: () => (Persistent.load().questProgress['raid:blackTemple'] || 0) > 0 },
  r_sunwellPlateau: { name: 'Sunbound', position: 'suffix', source: 'Defeat Radiant Malvexis', effect: { spellPower: 0.02 }, check: () => (Persistent.load().questProgress['raid:sunwellPlateau'] || 0) > 0 },
  r_icecrownCitadel: { name: 'the Hollowbane', position: 'suffix', source: 'Defeat Vaelkorath, the Hollow King', effect: { atk: 2, maxHp: 10 }, check: () => (Persistent.load().questProgress['raid:icecrownCitadel'] || 0) > 0 },
  r_ulduar: { name: 'the Forgebreaker', position: 'suffix', source: 'Defeat The Forgewarden Prime', effect: { def: 2, maxHp: 10 }, check: () => (Persistent.load().questProgress['raid:ulduar'] || 0) > 0 },
  r_burningThrone: { name: 'the Void-Ender', position: 'suffix', source: "Defeat Xoth'rath, the Void King", effect: { atk: 3, def: 3, maxHp: 15 }, check: () => (Persistent.load().questProgress['raid:burningThrone'] || 0) > 0 },

  // Reputation - Exalted (tier index 4) with each zone.
  rep_forest: { name: 'Warden of Elderglen', position: 'prefix', source: 'Reach Exalted with Elderglen Forest', effect: { hpRegen: 1 }, check: () => getReputationTierIndex('forest') >= 4 },
  rep_swamp: { name: 'Murkfen-Blessed', position: 'prefix', source: 'Reach Exalted with Murkfen Swamp', effect: { potionHealBonus: 0.03 }, check: () => getReputationTierIndex('swamp') >= 4 },
  rep_desert: { name: 'Wastewalker', position: 'prefix', source: 'Reach Exalted with Sunscar Wastes', effect: { speed: 1 }, check: () => getReputationTierIndex('desert') >= 4 },
  rep_hellfire: { name: 'Hellforged', position: 'prefix', source: 'Reach Exalted with Shattered Hellscape', effect: { atk: 1 }, check: () => getReputationTierIndex('hellfire') >= 4 },
  rep_emerald: { name: 'Dreamwarden', position: 'prefix', source: 'Reach Exalted with the Emerald Dream', effect: { maxHp: 8 }, check: () => getReputationTierIndex('emerald') >= 4 },
  rep_silvermoon: { name: 'Spire-Blessed', position: 'prefix', source: 'Reach Exalted with Silvermoon Spires', effect: { spellPower: 0.01 }, check: () => getReputationTierIndex('silvermoon') >= 4 },
  rep_blacktemple: { name: 'Bastion-Sworn', position: 'prefix', source: 'Reach Exalted with The Black Bastion', effect: { def: 1 }, check: () => getReputationTierIndex('blacktemple') >= 4 },
  rep_northrend: { name: 'Frostbound', position: 'prefix', source: 'Reach Exalted with Northrend Wastes', effect: { critBonus: 0.01 }, check: () => getReputationTierIndex('northrend') >= 4 },
  rep_nether: { name: 'Netherwalker', position: 'prefix', source: 'Reach Exalted with the Twisting Nether', effect: { goldBonus: 0.02 }, check: () => getReputationTierIndex('nether') >= 4 },

  // Misc - broad account-wide milestones.
  misc_dungeoneer: { name: 'the Dungeoneer', position: 'suffix', source: 'Clear all 10 dungeons', effect: { goldBonus: 0.03 }, check: () => DUNGEONS.every(d => (Persistent.load().questProgress['dungeon:' + d.id] || 0) > 0) },
  misc_worldRender: { name: 'the World-Render', position: 'suffix', source: 'Defeat all 10 raid bosses', effect: { atk: 3, def: 3 }, check: () => RAID_BOSSES.every(b => (Persistent.load().questProgress['raid:' + b.id] || 0) > 0) },
  misc_ambassador: { name: 'the Ambassador', position: 'prefix', source: 'Reach Exalted with every zone', effect: { goldBonus: 0.05 }, check: () => ACT_THEMES.every(t => getReputationTierIndex(t.id) >= 4) },
  misc_legend: { name: 'the Legend', position: 'suffix', source: 'Own 10 legendary items', effect: { atk: 2, def: 2 }, check: () => Persistent.load().ownedLegendaries.length >= 10 },
  misc_adaptable: { name: 'the Adaptable', position: 'suffix', source: 'Unlock every class', effect: { speed: 2 }, check: () => Object.values(CLASSES).every(c => c.starter || Persistent.load().unlockedClasses.includes(c.id)) },
  misc_beastmaster: { name: 'the Beastmaster', position: 'prefix', source: 'Own 5 pets and 5 mounts', effect: { maxHp: 12 }, check: () => Persistent.load().ownedPets.length >= 5 && Persistent.load().ownedMounts.length >= 5 },
  misc_goldbound: { name: 'Goldbinder', position: 'suffix', source: 'Bank 50,000 gold', effect: { goldBonus: 0.04 }, check: () => Persistent.load().bankGold >= 50000 },
  misc_undying: { name: 'the Undying', position: 'suffix', source: 'Reach Act 50 in a single run', effect: { maxHp: 20 }, check: () => Meta.load().bestAct >= 50 },

  // PvP ladder - each rank stays equippable once earned, same as real WoW's
  // rank titles. Keyed off a permanent cumulative win counter (see
  // pdata.pvpWinsTotal, incremented in main.js next to the existing
  // pvpWins quest progress).
  pvp_private: { name: 'Private', position: 'prefix', source: 'Win 1 PvP match', effect: { critBonus: 0.005 }, check: () => (Persistent.load().pvpWinsTotal || 0) >= 1 },
  pvp_corporal: { name: 'Corporal', position: 'prefix', source: 'Win 3 PvP matches', effect: { critBonus: 0.01 }, check: () => (Persistent.load().pvpWinsTotal || 0) >= 3 },
  pvp_sergeant: { name: 'Sergeant', position: 'prefix', source: 'Win 6 PvP matches', effect: { atk: 1 }, check: () => (Persistent.load().pvpWinsTotal || 0) >= 6 },
  pvp_knight: { name: 'Knight', position: 'prefix', source: 'Win 10 PvP matches', effect: { atk: 1, def: 1 }, check: () => (Persistent.load().pvpWinsTotal || 0) >= 10 },
  pvp_knightCaptain: { name: 'Knight-Captain', position: 'prefix', source: 'Win 15 PvP matches', effect: { atk: 2, def: 1 }, check: () => (Persistent.load().pvpWinsTotal || 0) >= 15 },
  pvp_champion: { name: 'Champion', position: 'prefix', source: 'Win 25 PvP matches', effect: { atk: 2, def: 2 }, check: () => (Persistent.load().pvpWinsTotal || 0) >= 25 },
  pvp_marshal: { name: 'Marshal', position: 'prefix', source: 'Win 40 PvP matches', effect: { atk: 3, def: 2, critBonus: 0.02 }, check: () => (Persistent.load().pvpWinsTotal || 0) >= 40 },
  pvp_grandMarshal: { name: 'Grand Marshal', position: 'prefix', source: 'Win 60 PvP matches', effect: { atk: 4, def: 3, critBonus: 0.03 }, check: () => (Persistent.load().pvpWinsTotal || 0) >= 60 }
};

// --- Curses ---
// The adventure is limitless - there's no final boss, only how deep you can go
// before you die. Every 10th act completed has a CHANCE (not a guarantee) of
// inflicting one of these, permanently worsening the rest of THIS run (they
// reset with everything else on death, like relics). Most are flat/percent
// stat penalties using the same effect{} levers as relics; `enemyAtkMult`/
// `enemyHpMult` scale the next enemy up at combat start (see Combat.start),
// and `fleeDisabled`/`noPotions` are boolean gameplay restrictions handled
// directly in combat.js.
const CURSES = {
  witheringFlesh: { id: 'witheringFlesh', name: 'Curse of Withering Flesh', icon: '💀', desc: '-3 Max HP', effect: { maxHp: -3 } },
  rustedEdge: { id: 'rustedEdge', name: 'Curse of the Rusted Edge', icon: '🗡️', desc: '-2 ATK', effect: { atk: -2 } },
  brittleBone: { id: 'brittleBone', name: 'Curse of Brittle Bone', icon: '🦴', desc: '-2 DEF', effect: { def: -2 } },
  leadenFeet: { id: 'leadenFeet', name: 'Curse of Leaden Feet', icon: '⛓️', desc: '-2 Speed', effect: { speed: -2 } },
  emptyPurse: { id: 'emptyPurse', name: 'Curse of the Empty Purse', icon: '🕳️', desc: '-15% gold from all sources', effect: { goldBonus: -0.15 } },
  fadingLight: { id: 'fadingLight', name: 'Curse of Fading Light', icon: '🕯️', desc: '-10% healing from items', effect: { potionHealBonus: -0.10 } },
  crackedFocus: { id: 'crackedFocus', name: 'Curse of the Cracked Focus', icon: '🔮', desc: '-10% spell damage', effect: { spellPower: -0.10 } },
  clumsyHands: { id: 'clumsyHands', name: 'Curse of Clumsy Hands', icon: '✋', desc: '-5% critical hit chance', effect: { critBonus: -0.05 } },
  bleedingWound: { id: 'bleedingWound', name: 'Curse of the Bleeding Wound', icon: '🩸', desc: 'Lose 1 HP every round', effect: { hpRegen: -1 } },
  savageFoes: { id: 'savageFoes', name: 'Curse of Savage Foes', icon: '👹', desc: 'Enemies deal +12% damage', effect: { enemyAtkMult: 0.12 } },
  hardenedFoes: { id: 'hardenedFoes', name: 'Curse of Hardened Foes', icon: '🛡️', desc: 'Enemies have +15% Max HP', effect: { enemyHpMult: 0.15 } },
  boundFeet: { id: 'boundFeet', name: 'Curse of the Bound Feet', icon: '⛓️', desc: 'You can no longer flee combat', effect: { fleeDisabled: true } },
  sealedSatchel: { id: 'sealedSatchel', name: 'Curse of the Sealed Satchel', icon: '🎒', desc: 'Items no longer provide healing', effect: { noPotions: true } },
  witheredFrame: { id: 'witheredFrame', name: 'Curse of the Withered Frame', icon: '💀', desc: '-4 Max HP, -1 DEF', effect: { maxHp: -4, def: -1 } },
  wearyMarch: { id: 'wearyMarch', name: 'Curse of the Weary March', icon: '🥾', desc: '-3 Speed, -1 ATK', effect: { speed: -3, atk: -1 } }
};

const CURSE_NUMERIC_KEYS = ['atk', 'def', 'maxHp', 'speed', 'critBonus', 'goldBonus', 'lifesteal', 'hpRegen', 'executeBonus', 'eliteSlayerAtk', 'potionHealBonus', 'spellPower', 'enemyAtkMult', 'enemyHpMult'];

function applyCurseEffects(curseIds) {
  const base = {};
  CURSE_NUMERIC_KEYS.forEach(k => { base[k] = 0; });
  base.fleeDisabled = false;
  base.noPotions = false;
  (curseIds || []).forEach(id => {
    const curse = CURSES[id];
    if (!curse || !curse.effect) return;
    Object.keys(curse.effect).forEach(key => {
      if (key === 'fleeDisabled' || key === 'noPotions') base[key] = base[key] || curse.effect[key];
      else base[key] = (base[key] || 0) + curse.effect[key];
    });
  });
  return base;
}

// Prefers a curse the player hasn't already suffered this run; only repeats
// one if all 15 have already been inflicted (a very long run indeed).
function pickNewCurse(existingIds) {
  const pool = Object.keys(CURSES).filter(id => !(existingIds || []).includes(id));
  const ids = pool.length ? pool : Object.keys(CURSES);
  return ids[rand(0, ids.length - 1)];
}

// A taming encounter always presents these 3 decisions in order, regardless of
// which creature is being tamed - the wording is generic enough to fit any
// beast while still reading as a real approach-and-earn-trust sequence.
// Exactly one option per step is "correct"; getting one wrong doesn't fail the
// encounter outright, it just means a combat must be won afterward to still
// claim the creature (see Game.tamingWrongCount handling in main.js).
const TAMING_DECISIONS = [
  {
    prompt: 'The creature notices you and tenses, ready to bolt or fight. How do you approach?',
    options: [
      { label: 'Move slowly and low, avoiding direct eye contact', correct: true },
      { label: 'Walk straight up to it with confidence', correct: false },
      { label: 'Toss a rock to see how it reacts', correct: false }
    ]
  },
  {
    prompt: 'It lets you close the distance, watching your every move. What next?',
    options: [
      { label: 'Offer food from an open, outstretched hand', correct: true },
      { label: 'Reach out and touch it immediately', correct: false },
      { label: 'Speak loudly to assert dominance', correct: false }
    ]
  },
  {
    prompt: 'It sniffs at you cautiously, still deciding whether to trust you.',
    options: [
      { label: 'Sit down and wait patiently for it to come closer', correct: true },
      { label: 'Grab for it before it changes its mind', correct: false },
      { label: 'Back away slowly to give it space, then leave', correct: false }
    ]
  }
];

// Picks what a taming encounter offers - roughly even odds of a pet or a
// mount. Jess's own cats/kittens (JESS_EXCLUSIVE_PETS) and every signature
// companion (SIGNATURE_PET_IDS/SIGNATURE_MOUNT_IDS) are filtered out of the
// pool - those are only ever earned from their own specific encounter.
function pickTamingReward() {
  const pool = Math.random() < 0.5 ? PETS : MOUNTS;
  const exclusive = pool === PETS ? JESS_EXCLUSIVE_PETS : null;
  const signature = pool === PETS ? SIGNATURE_PET_IDS : SIGNATURE_MOUNT_IDS;
  const ids = Object.keys(pool).filter(id => !(exclusive && exclusive.has(id)) && !signature.has(id));
  const id = ids[rand(0, ids.length - 1)];
  return { kind: pool === PETS ? 'pet' : 'mount', id, def: pool[id] };
}

// --- Rare NPC encounters (see enterRareNpc in main.js) ---
// One-time-ever, account-wide (pdata.metRareNpcs) - each NPC always hands
// out their OWN signature named reward (a LEGENDARY_ITEMS weapon/armor, or a
// SIGNATURE_PET_IDS/SIGNATURE_MOUNT_IDS companion), never a random roll. A
// portrait (assets/sprites/<portrait>.png) and a line of flavor stand in for
// the multi-step taming/shop flow those other rare encounters use - this one
// is simpler: meet them, take what they offer, move on.
const RARE_NPCS = {
  george: {
    name: 'George',
    portrait: 'george',
    flavor: "A mountain of a man steps out from the treeline, knuckles dark with old blood, a huge black dog padding silent at his heel. \"Name's George,\" he grunts. \"Don't need a blade. Never have.\" He nods at the dog. \"This is Ryker. Reckon he likes you.\"",
    rewardKind: 'pet', rewardId: 'ryker'
  },
  landry: {
    name: 'Sheriff Landry',
    portrait: 'landry',
    flavor: "A broad-shouldered sheriff tips his hat, shotgun resting easy on one shoulder, mustache twitching as a duckling the size of a wagon wheel waddles up beside him. \"Sheriff Landry,\" he drawls. \"This here's my deputy. Don't let the size fool you - toughest bird in three counties.\"",
    rewardKind: 'pet', rewardId: 'landryDuckling'
  },
  william: {
    name: 'Combat Master Williams',
    portrait: 'william',
    flavor: "A tall, composed man watches you approach without a flicker of concern, hands loose at his sides. \"Every style, every school, every discipline,\" he says simply. \"I've mastered them all. You've earned a lesson - and a gift.\" He offers a wrapped bundle without another word.",
    rewardKind: 'legendary', rewardId: 'williamsFists'
  },
  mcclures: {
    name: 'The McClure Brothers',
    portrait: 'mcclures',
    flavor: "Two red-haired brothers lean against a still half-hidden in the brush, cigarette smoke curling between them - one wiry and sharp-eyed, the other built like a barrel. \"Well now,\" the bigger one grins, \"a payin' customer.\" His brother tosses you something wrapped in burlap. \"On the house. Don't tell the revenuers.\"",
    rewardKind: 'legendary', rewardId: 'mcclureReserve'
  },
  izzo: {
    name: 'Race King Izzo',
    portrait: 'izzo',
    flavor: "An engine roars somewhere close before a gleaming racecar skids to a stop beside you, a bald, broad-shouldered man vaulting over the door without opening it. \"Izzo,\" he says, flashing a grin sharp enough to cut glass. \"Race King, three years running.\" He tosses you a set of keys. \"She's fast. Try not to wreck her.\"",
    rewardKind: 'mount', rewardId: 'izzoCorvette'
  },
  dylinator: {
    name: 'Dylinator 2000',
    portrait: 'dylinator',
    flavor: "Something huge and half-metal unfolds from the shadows, servos whining, a bank of cyan lights flickering across its chest like a heartbeat. \"I built myself better,\" it says, voice layered with static. \"Better than they ever could have.\" A panel hisses open, offering you a slab of gleaming plating.",
    rewardKind: 'legendary', rewardId: 'dylinatorChassis'
  },
  tina: {
    name: 'DJ Tina',
    portrait: 'tina',
    flavor: "Bass thumps out of nowhere as a woman spins into view behind a floating set of turntables, mic in hand, grinning like she's already won you over. \"DJ Tina,\" she says over the beat. \"You've got main character energy. Here - this'll help you sound as good as you look.\" She tosses you her spare mic.",
    rewardKind: 'legendary', rewardId: 'tinasEncoreMic'
  }
};

// --- Legendary taming encounters (see enterLegendaryTaming in main.js) ---
// The exact same 3-decision approach-and-earn-trust flow as a normal
// 'taming' node (TAMING_DECISIONS), but guarantees ONE SPECIFIC named
// creature instead of a random pet/mount - one-time-ever, account-wide.
const LEGENDARY_TAMINGS = {
  robin: { kind: 'mount', id: 'robin' },
  monkey: { kind: 'pet', id: 'monkey' },
  chopper: { kind: 'pet', id: 'chopper' }
};

const ENEMIES = [
  { id: 'slime', name: 'Slime', icon: '🟢', hp: 14, atk: 3, def: 0, speed: 2, gold: [5, 10] },
  { id: 'rat', name: 'Giant Rat', icon: '🐀', hp: 10, atk: 4, def: 0, speed: 6, gold: [3, 8] },
  { id: 'goblin', name: 'Goblin', icon: '👺', hp: 18, atk: 5, def: 1, speed: 5, gold: [8, 14] },
  { id: 'wolf', name: 'Wild Wolf', icon: '🐺', hp: 20, atk: 6, def: 1, speed: 7, gold: [8, 14] },
  { id: 'bandit', name: 'Bandit', icon: '🥷', hp: 22, atk: 6, def: 2, speed: 5, gold: [12, 20] },
  { id: 'skeleton', name: 'Skeleton', icon: '💀', hp: 24, atk: 7, def: 2, speed: 3, gold: [10, 18] },
  { id: 'cultist', name: 'Cultist', icon: '🕯️', hp: 20, atk: 8, def: 0, speed: 4, gold: [12, 22] },
  { id: 'spider', name: 'Cave Spider', icon: '🕷️', hp: 16, atk: 6, def: 1, speed: 6, gold: [8, 15] },
  { id: 'zombie', name: 'Zombie', icon: '🧟', hp: 26, atk: 5, def: 2, speed: 2, gold: [10, 16] },
  { id: 'imp', name: 'Imp', icon: '👿', hp: 12, atk: 6, def: 0, speed: 7, gold: [8, 14] },
  { id: 'harpy', name: 'Harpy', icon: '🦅', hp: 16, atk: 5, def: 0, speed: 8, gold: [8, 15] },
  { id: 'boar', name: 'Wild Boar', icon: '🐗', hp: 20, atk: 6, def: 2, speed: 5, gold: [9, 16] }
];

const ELITES = [
  { id: 'ogre', name: 'Ogre', icon: '👹', hp: 46, atk: 9, def: 3, speed: 2, gold: [30, 45], elite: true },
  { id: 'darkKnight', name: 'Dark Knight', icon: '🖤', hp: 40, atk: 10, def: 4, speed: 4, gold: [30, 45], elite: true },
  { id: 'witch', name: 'Witch', icon: '🧙‍♀️', hp: 34, atk: 11, def: 1, speed: 6, gold: [30, 45], elite: true },
  { id: 'minotaur', name: 'Minotaur', icon: '🐂', hp: 44, atk: 10, def: 2, speed: 3, gold: [30, 45], elite: true },
  { id: 'vampire', name: 'Vampire', icon: '🧛', hp: 36, atk: 9, def: 2, speed: 7, gold: [30, 45], elite: true }
];

const BOSSES = [
  { id: 'rotWarden', name: 'The Rot Warden', icon: '🧟', hp: 70, atk: 10, def: 4, speed: 3, gold: [60, 60], boss: true },
  { id: 'banditKing', name: 'Bandit King', icon: '👑', hp: 90, atk: 12, def: 5, speed: 5, gold: [90, 90], boss: true },
  { id: 'lich', name: 'The Lich', icon: '☠️', hp: 110, atk: 14, def: 3, speed: 6, gold: [120, 120], boss: true }
];

// Each event: text, and choices with a resolve(player) -> {text, effects} used by events.js
const EVENTS = [
  {
    id: 'shrine',
    title: 'Strange Shrine',
    text: 'You find a moss-covered shrine humming with faint light. A bowl of dark liquid rests atop it.',
    choices: [
      { label: 'Drink the liquid', outcome: (p) => {
          if (Math.random() < 0.5) return { text: 'Warmth spreads through you. You feel stronger.', hp: 0, statBoost: { atk: 1 } };
          return { text: 'It burns! You take damage.', hp: -8 };
        }
      },
      { label: 'Leave an offering of gold', outcome: (p) => {
          if (p.gold >= 15) return { text: 'The shrine glows and mends your wounds.', gold: -15, hp: 12 };
          return { text: "You don't have enough gold. Nothing happens.", hp: 0 };
        }
      },
      { label: 'Walk away', outcome: () => ({ text: 'You leave the shrine undisturbed.', hp: 0 }) }
    ]
  },
  {
    id: 'peddler',
    title: 'Wounded Peddler',
    text: 'A wounded peddler begs for help, offering a trinket in exchange for healing supplies.',
    choices: [
      { label: 'Give a potion (if you have one)', outcome: (p) => {
          if (p.items.some(i => i === 'potion')) {
            return { text: 'Grateful, he hands you a strange relic.', removeItem: 'potion', relic: randomRelic() };
          }
          return { text: "You have no potion to give. He shuffles away disappointed.", hp: 0 };
        }
      },
      { label: 'Give gold instead', outcome: (p) => {
          if (p.gold >= 10) return { text: 'He thanks you and shares a travel tip. You feel prepared.', gold: -10, hp: 6 };
          return { text: 'You have no gold to spare.', hp: 0 };
        }
      },
      { label: 'Ignore him', outcome: () => ({ text: 'You walk past. He curses your name.', hp: 0 }) }
    ]
  },
  {
    id: 'chest',
    title: 'Suspicious Chest',
    text: 'A chest sits in the open, slightly too clean for a dungeon floor. It might be trapped.',
    choices: [
      { label: 'Open it carefully', outcome: () => {
          if (Math.random() < 0.7) return { text: 'Inside: gold and a small trinket!', gold: rand(15, 30), relic: Math.random() < 0.4 ? randomRelic() : null };
          return { text: 'A dart trap fires! You take damage.', hp: -10 };
        }
      },
      { label: 'Kick it open from a distance', outcome: () => {
          if (Math.random() < 0.9) return { text: 'Safely sprung. You grab the gold inside.', gold: rand(10, 20) };
          return { text: 'It explodes anyway. Ouch.', hp: -6 };
        }
      },
      { label: 'Leave it', outcome: () => ({ text: 'Not worth the risk. You move on.', hp: 0 }) }
    ]
  },
  {
    id: 'campfire',
    title: 'Abandoned Campfire',
    text: 'Embers still glow in an abandoned camp. Whoever was here left in a hurry.',
    choices: [
      { label: 'Rest by the fire', outcome: (p) => ({ text: 'You rest and recover.', hp: Math.round(p.maxHp * 0.2) }) },
      { label: 'Search their belongings', outcome: () => {
          if (Math.random() < 0.6) return { text: 'You find supplies!', item: 'potion' };
          return { text: 'A hidden snare catches your leg.', hp: -8 };
        }
      },
      { label: 'Move on quickly', outcome: () => ({ text: 'You press onward.', hp: 0 }) }
    ]
  },
  {
    id: 'gambler',
    title: 'Ghostly Gambler',
    text: 'A translucent figure offers a game of dice for gold, "double or nothing."',
    choices: [
      { label: 'Bet 20 gold', outcome: (p) => {
          if (p.gold < 20) return { text: "You don't have enough gold to play.", hp: 0 };
          return Math.random() < 0.5 ? { text: 'You win! The ghost doubles your bet.', gold: 20 } : { text: 'You lose the bet.', gold: -20 };
        }
      },
      { label: 'Decline and leave', outcome: () => ({ text: 'The ghost fades away, disappointed.', hp: 0 }) }
    ]
  },
  {
    id: 'altar',
    title: 'Blood Altar',
    text: 'An altar promises power in exchange for vitality.',
    choices: [
      { label: 'Sacrifice HP for a relic', outcome: (p) => {
          if (p.hp <= 8) return { text: "You're too weak to risk this.", hp: 0 };
          return { text: 'Power surges into you.', hp: -8, relic: randomRelic() };
        }
      },
      { label: 'Refuse', outcome: () => ({ text: 'You step back from the altar.', hp: 0 }) }
    ]
  },
  {
    id: 'traveler',
    title: 'Lost Traveler',
    text: 'A lost traveler asks to share your path in exchange for coin.',
    choices: [
      { label: 'Escort them for a fee', outcome: (p) => {
          if (Math.random() < 0.75) return { text: 'They paid well and shared useful gear along the way.', gold: rand(10, 15), item: 'antidote' };
          return { text: 'Bandits ambush you both! You fight them off, but take a hit.', hp: -10 };
        }
      },
      { label: 'Send them away', outcome: () => ({ text: 'You continue on alone.', hp: 0 }) }
    ]
  },
  {
    id: 'mirror',
    title: 'Cracked Mirror',
    text: 'A tall mirror stands alone in the dark, its surface cracked. The reflection moves a beat too slowly.',
    choices: [
      { label: 'Touch the mirror', outcome: () => {
          if (Math.random() < 0.5) return { text: 'Your reflection nods and steps back. You feel sharper.', statBoost: { atk: 1 } };
          return { text: 'Cold fingers grip your wrist! You wrench free, shaken.', hp: -9 };
        }
      },
      { label: 'Shatter it', outcome: () => ({ text: 'The glass falls away, leaving useful shards.', gold: rand(8, 16) }) },
      { label: 'Walk away', outcome: () => ({ text: 'You leave the mirror to its silence.', hp: 0 }) }
    ]
  },
  {
    id: 'hermit',
    title: "Hermit's Riddle",
    text: 'A cave hermit offers to trade knowledge, if you can answer a riddle.',
    choices: [
      { label: 'Answer the riddle', outcome: () => {
          if (Math.random() < 0.5) return { text: 'Correct! The hermit rewards your wit.', gold: rand(15, 25) };
          return { text: 'Wrong. The hermit laughs and waves you off.', hp: 0 };
        }
      },
      { label: 'Trade a relic for a potion (if you have one)', outcome: (p) => {
          if (p.relics.length === 0) return { text: 'You have no relic to trade.', hp: 0 };
          return { text: 'The hermit takes your relic and hands you a potion.', removeRelic: p.relics[0], item: 'bigPotion' };
        }
      },
      { label: 'Leave', outcome: () => ({ text: 'You leave the hermit to his cave.', hp: 0 }) }
    ]
  },
  {
    id: 'puzzle',
    title: 'Ancient Puzzle Box',
    text: 'A carved box hums faintly. It looks valuable, and dangerous.',
    choices: [
      { label: 'Solve it', outcome: () => {
          if (Math.random() < 0.5) return { text: 'The box clicks open, spilling gold.', gold: rand(20, 35) };
          return { text: 'A hidden needle pricks your hand.', hp: -10 };
        }
      },
      { label: 'Sell it unopened', outcome: () => ({ text: 'A passing trader buys it off you, no questions asked.', gold: rand(10, 15) }) },
      { label: 'Ignore it', outcome: () => ({ text: 'You leave the box untouched.', hp: 0 }) }
    ]
  },
  {
    id: 'crossroads',
    title: 'Crossroads Marker',
    text: 'A weathered stone marker splits the path ahead into shadow.',
    choices: [
      { label: 'Push forward recklessly', outcome: (p) => ({ text: 'You charge on, adrenaline sharpening your strikes but draining you.', hp: -6, statBoost: { atk: 1 } }) },
      { label: 'Rest at the marker', outcome: (p) => ({ text: 'You take a short, quiet rest.', hp: Math.round(p.maxHp * 0.12) }) },
      { label: 'Study the map', outcome: () => ({ text: 'You find a shortcut and some coin along the way.', gold: rand(8, 14) }) }
    ]
  },
  {
    id: 'wyrmling',
    title: 'Sleeping Wyrmling',
    text: 'A small dragon dozes atop a modest hoard. It looks young. It also looks like it could wake up.',
    choices: [
      { label: 'Steal from its hoard', outcome: () => {
          if (Math.random() < 0.45) return { text: 'You make off with a fortune before it stirs!', gold: rand(35, 55) };
          return { text: 'It wakes with a snarl and singes you before you escape.', hp: -14 };
        }
      },
      { label: 'Leave it be', outcome: () => ({ text: 'You quietly back away.', hp: 0 }) }
    ]
  },
  // Moral-choice encounters: a good/evil/neutral option each, deliberately
  // NOT about which choice is "correct" numerically - each grants its own
  // small buff or debuff (see Game.grantTempEffect) lasting a few
  // encounters, so a run can pick up a short streak of consequences from
  // the character's own choices rather than every event resolving the same
  // stat-optimal way.
  {
    id: 'cornered-child',
    title: 'Cornered',
    text: 'A starving beast has a terrified child backed into a dead end. The beast is thin, scarred, and clearly desperate - not cruel, just hungry.',
    choices: [
      { label: 'Drive off the beast, save the child (Good)', outcome: (p) => ({
          text: 'The child scrambles free. The beast flees, snarling but unharmed.',
          hp: -6,
          tempEffect: { label: 'Clear Conscience', icon: '🕊️', effect: { def: 2, hpRegen: 1 }, encounters: 3 }
        })
      },
      { label: 'Let the beast eat, take the child\'s coin purse (Evil)', outcome: () => ({
          text: 'You slip away with coin while the child screams behind you.',
          gold: rand(15, 25),
          tempEffect: { label: 'Guilty Conscience', icon: '🩸', effect: { atk: 3, def: -2 }, encounters: 3 }
        })
      },
      { label: 'Walk away - not your problem (Neutral)', outcome: () => ({
          text: 'You keep moving. Whatever happens next, happens without you.',
          hp: 0
        })
      }
    ]
  },
  {
    id: 'hunted-cub',
    title: 'The Hunted',
    text: 'A mob of villagers with torches surrounds a den, calling the creature inside a monster. Through the entrance you can see it\'s just a cub, alone and shaking.',
    choices: [
      { label: 'Hide the den, mislead the mob (Good)', outcome: () => ({
          text: 'You point the mob down the wrong trail. The cub lives to see another day.',
          tempEffect: { label: 'Kindred Spirit', icon: '🐾', effect: { hpRegen: 2, potionHealBonus: 0.05 }, encounters: 3 }
        })
      },
      { label: 'Reveal the den for a reward (Evil)', outcome: () => ({
          text: 'The mob pays well for the tip. You don\'t look back to see what happens.',
          gold: rand(20, 30),
          tempEffect: { label: 'Cold-Blooded', icon: '⚔️', effect: { atk: 3, potionHealBonus: -0.05 }, encounters: 3 }
        })
      },
      { label: 'Slip away before either side notices (Neutral)', outcome: () => ({
          text: 'You leave the mob and the den behind, uninvolved.',
          hp: 0
        })
      }
    ]
  }
];

function randomRelic() {
  const keys = Object.keys(RELICS);
  return keys[Math.floor(Math.random() * keys.length)];
}

function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

const HTML_ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
function escapeHtml(str) { return String(str).replace(/[&<>"']/g, c => HTML_ESCAPES[c]); }

// Human-readable labels for weapon `weaponType`s - used by the Armory to
// show which types a class can wield.
const WEAPON_TYPE_LABELS = {
  oneHanded: 'One-Handed', mainHandOnly: 'Main-Hand', twoHanded: 'Two-Handed', staff: 'Staff',
  shield: 'Shield', ranged: 'Ranged', thrown: 'Thrown', wand: 'Wand', instrument: 'Instrument', blessing: 'Blessing'
};

// Human-readable labels for every equippable item `slot` - used anywhere an
// item's slot needs to show as text (Inventory, Armory, Journal).
const SLOT_LABELS = {
  weapon: 'Weapon', chest: 'Chest', head: 'Helmet', neck: 'Necklace', shoulders: 'Shoulders', back: 'Cape',
  shirt: 'Shirt', tabard: 'Tabard', wrists: 'Bracers', hands: 'Gloves', waist: 'Belt', legs: 'Legs', boots: 'Boots',
  ring: 'Ring', trinket: 'Trinket'
};

// Human-readable labels for the same effect{} levers relics/curses/talents/
// jewelry all share - used to describe a ring/trinket/curse's bonus as text.
const EFFECT_LEVER_LABELS = {
  atk: 'ATK', def: 'DEF', maxHp: 'Max HP', speed: 'Speed', critBonus: '% critical hit chance',
  goldBonus: '% gold from all sources', lifesteal: ' lifesteal per hit', hpRegen: ' HP per round',
  executeBonus: ' damage vs wounded enemies', eliteSlayerAtk: ' damage vs elites/bosses',
  potionHealBonus: '% healing from items', spellPower: '% spell damage'
};
const EFFECT_LEVER_IS_PERCENT = { critBonus: true, goldBonus: true, potionHealBonus: true, spellPower: true };
function describeEffectLever(key, value) {
  const label = EFFECT_LEVER_LABELS[key] || key;
  const shown = EFFECT_LEVER_IS_PERCENT[key] ? Math.round(value * 100) : value;
  return `${shown >= 0 ? '+' : ''}${shown}${label}`;
}

// ============================================================================
// Multiplayer prep: Raids and the Chatroom.
// There's no live server behind this yet, so both features are built around
// simulated stand-ins rather than real other players - "Ghosts", the way
// Dark Souls bones or NetHack ghosts work: an asynchronous echo of another
// adventurer rather than someone actually online with you right now. The
// data shapes here (a party roster, a chat log keyed by sender) are exactly
// what a real multiplayer backend would need to fill in later - swapping the
// generateGhostCompanion()/canned chat-line calls for a real network feed is
// the only change a future live version would require.
// ============================================================================

const RAID_PARTY_SIZE = 3; // you + 2 ghosts, until real matchmaking exists
const DUNGEON_COST = 40;
const RAID_COST = 100;

// 10 dungeons, each tougher than the last - tuned so the first is a fair
// fight around level 5 and the last demands a high level-90 character. 10
// raids follow the same escalating shape but hit harder at every comparable
// level (bigger baseline + a steeper per-tier kicker below), starting at a
// well-geared level 60 and running to a well-geared level 99. Both scale off
// the same +10%-per-level curve the player's own stats use
// (levelStatMultiplier in progression.js) so "recommended level" tracks real
// player power, not an arbitrary number - duplicated here as a local
// constant since data.js loads before progression.js.
function _levelPowerMult(level) { return 1 + 0.10 * (level - 1); }

function _scaleTier(level, tierIndex, baseHp, baseAtk, baseDef, baseSpeed, kickerStep, goldLowMult, goldHighMult) {
  const mult = _levelPowerMult(level) * (1 + tierIndex * kickerStep);
  const hp = Math.round(baseHp * mult);
  return {
    hp, atk: Math.round(baseAtk * mult), def: Math.round(baseDef * mult),
    speed: Math.round(baseSpeed + tierIndex * 0.7),
    gold: [Math.round(hp * goldLowMult), Math.round(hp * goldHighMult)],
    recommendedLevel: level, boss: true
  };
}

const DUNGEONS = [
  { id: 'deadmines', name: 'The Deadmines', icon: '⚓' },
  { id: 'shadowfangKeep', name: 'Shadowfang Keep', icon: '🐺' },
  { id: 'blackfathomDeeps', name: 'Blackfathom Deeps', icon: '🌊' },
  { id: 'razorfenDowns', name: 'Razorfen Downs', icon: '🐗' },
  { id: 'scarletMonastery', name: 'Scarlet Monastery', icon: '⛪' },
  { id: 'zulFarrak', name: "Zul'Farrak", icon: '🏺' },
  { id: 'maraudon', name: 'Maraudon', icon: '🌀' },
  { id: 'direMaul', name: 'Dire Maul', icon: '👹' },
  { id: 'scholomance', name: 'Scholomance', icon: '💀' },
  { id: 'cullingOfStratholme', name: 'The Culling of Stratholme', icon: '🔥' }
].map((d, i) => ({
  ...d,
  ...(_scaleTier([5, 12, 20, 28, 38, 48, 58, 68, 78, 90][i], i, 30, 6, 2, 4, 0.05, 0.6, 0.9))
}));

const RAID_BOSSES = [
  { id: 'moltenCore', name: 'Molten Core', icon: '🌋' },
  { id: 'blackwingLair', name: 'Blackwing Lair', icon: '🐉' },
  { id: 'ahnQiraj', name: "Ruins of Ahn'Qiraj", icon: '🏜️' },
  { id: 'naxxramas', name: 'Naxxramas', icon: '☠️' },
  { id: 'karazhan', name: 'Karazhan', icon: '🕯️' },
  { id: 'blackTemple', name: 'Black Temple', icon: '😈' },
  { id: 'sunwellPlateau', name: 'Sunwell Plateau', icon: '☀️' },
  { id: 'icecrownCitadel', name: 'Icecrown Citadel', icon: '❄️' },
  { id: 'ulduar', name: 'Ulduar', icon: '⚙️' },
  { id: 'burningThrone', name: 'The Burning Throne', icon: '👑' }
].map((r, i) => ({
  ...r,
  ...(_scaleTier([60, 65, 70, 75, 80, 85, 90, 94, 97, 99][i], i, 50, 10, 4, 5, 0.08, 0.7, 1.0))
}));

const GHOST_NAME_POOL = ['Aldric', 'Brenna', 'Corvin', 'Dessa', 'Eamon', 'Fiora', 'Gareth', 'Halla', 'Ivor', 'Junie', 'Kael', 'Lyra', 'Magnus', 'Nyra', 'Osric', 'Petra', 'Quill', 'Rowan', 'Sylas', 'Torren'];

// A ghost stands in for one of the two other required raid members - a
// randomly-rolled class/name/level, rendered with the same character sprite
// system as a real player (see anyCharacterSvg). `excludeClassId` just keeps
// a ghost from sharing your own class, purely for variety.
function generateGhostCompanion(excludeClassId) {
  const classIds = Object.keys(CLASSES).filter(id => id !== excludeClassId);
  const classId = classIds[rand(0, classIds.length - 1)];
  const name = GHOST_NAME_POOL[rand(0, GHOST_NAME_POOL.length - 1)];
  return { classId, name, level: rand(3, 40) };
}


// --- Gathering professions ---
// Equipped like the spell/pet/mount slots (see Persistent.getCharacter) - only
// ONE profession can be the active, leveling one per character at a time, but
// every profession keeps its own independent level/xp so switching back to
// one you've already worked on picks up right where you left it. Leveling
// happens passively: completing any encounter on an adventure grants the
// currently-equipped profession XP (see Game.grantProfessionXp in state.js
// and its call sites in main.js).
const PROFESSIONS = {
  herbalism: { id: 'herbalism', name: 'Herbalism', icon: '🌿', desc: 'Gather herbs while exploring the adventure.' },
  mining: { id: 'mining', name: 'Mining', icon: '⛏️', desc: 'Chip ore from the walls as you delve.' },
  logging: { id: 'logging', name: 'Logging', icon: '🪵', desc: 'Fell timber along your path.' },
  smelting: { id: 'smelting', name: 'Smelting', icon: '🔥', desc: 'Refine raw ore into usable metal.' },
  archaeology: { id: 'archaeology', name: 'Archaeology', icon: '🏺', desc: 'Unearth relics of a bygone age.' },
  fishing: { id: 'fishing', name: 'Fishing', icon: '🎣', desc: 'Cast a line at every quiet moment.' },
  cooking: { id: 'cooking', name: 'Cooking', icon: '🍳', desc: 'Prepare meals from your gathered goods.' },
  firstAid: { id: 'firstAid', name: 'First Aid', icon: '🩹', desc: 'Patch wounds after every fight.' }
};

// Every profession level grants a small passive that makes sense for its
// theme - most boost how much of their own gathered resource you find (see
// rollMaterialDrop in progression.js), a couple boost something else
// specific. `perLevelPct` is the per-level percentage - level 1 grants none
// (bonuses start accruing from level 2), consistent with how the talent
// system's own per-rank levers work. Fishing and Cooking are deliberately
// interconnected: Fishing's passive is its CATCH CHANCE at a campfire, but
// the fish it catches only turn into XP (and a bonus heal) if you also cook
// them there - see showRest in main.js.
const PROFESSION_PASSIVES = {
  herbalism: { resource: 'herbs', perLevelPct: 0.02, desc: 'Each level: +2% herbs found while exploring.' },
  mining: { resource: 'ore', perLevelPct: 0.02, desc: 'Each level: +2% ore found while exploring.' },
  logging: { resource: 'wood', perLevelPct: 0.02, desc: 'Each level: +2% wood found while exploring.' },
  smelting: { effect: 'craftCostReduction', perLevelPct: 0.01, desc: 'Each level: -1% gold cost to craft gear (down to half price).' },
  archaeology: { effect: 'relicFindChance', perLevelPct: 0.01, desc: 'Each level: +1% chance a Treasure cache also yields a relic.' },
  fishing: { effect: 'fishCatchChance', perLevelPct: 0.02, desc: 'Each level: +2% chance to catch a fish while resting.' },
  cooking: { effect: 'restHealBonus', perLevelPct: 0.01, desc: "Each level: +1% HP recovered when resting - cook any fish you've caught for bonus Cooking XP." },
  firstAid: { effect: 'potionHealBonus', perLevelPct: 0.02, desc: 'Each level: +2% healing from items.' }
};

// ============================================================================
// Cooking - food items eaten for a 1-hour temporary buff (see
// FEED_BUFF_DURATION_MS/activeBuffStatBonus in progression.js), the same
// buff mechanism the House tab's pet/mount feeding uses. One recipe roughly
// every 10 Cooking levels, spanning 1-99, each with its own unique effect.
// Like gear Recipes, these craft at a base rarity only - own the matching
// Recipe item (see COOKING_RECIPES below + the shared Recipe/Upgrade system
// in progression.js) to permanently raise a dish's ceiling one tier, which
// makes its buff stronger the same way a rarer piece of gear hits harder.
// ============================================================================
const FOOD_TEMPLATES = {
  travelBread: { name: 'Travel Bread', icon: '🍞', levelReq: 1, effect: { maxHp: 10 } },
  roastedBoar: { name: 'Roasted Boar', icon: '🍖', levelReq: 10, effect: { atk: 3 } },
  herbStew: { name: 'Herb Stew', icon: '🍲', levelReq: 20, effect: { def: 3 } },
  spicedFish: { name: 'Spiced Fish', icon: '🐟', levelReq: 30, effect: { speed: 2 } },
  honeyedCakes: { name: 'Honeyed Cakes', icon: '🍯', levelReq: 40, effect: { goldBonus: 0.05 } },
  dragonPepperChili: { name: 'Dragon Pepper Chili', icon: '🌶️', levelReq: 50, effect: { critBonus: 0.04 } },
  mooncrestSalad: { name: 'Mooncrest Salad', icon: '🥗', levelReq: 60, effect: { hpRegen: 2 } },
  smokedDelicacy: { name: 'Smoked Delicacy', icon: '🍢', levelReq: 70, effect: { lifesteal: 2 } },
  feastOfKings: { name: 'Feast of Kings', icon: '🍗', levelReq: 80, effect: { atk: 6, def: 6 } },
  ambrosiaOfAncients: { name: 'Ambrosia of the Ancients', icon: '✨', levelReq: 90, effect: { spellPower: 0.08, maxHp: 15 } }
};
const COOKING_RECIPES = [
  { id: 'cookTravelBread', defId: 'travelBread', rarity: 'common', levelReq: 1, cost: { gold: 10, fish: 1 } },
  { id: 'cookRoastedBoar', defId: 'roastedBoar', rarity: 'common', levelReq: 10, cost: { gold: 20, fish: 2 } },
  { id: 'cookHerbStew', defId: 'herbStew', rarity: 'common', levelReq: 20, cost: { gold: 30, fish: 2, herbs: 2 } },
  { id: 'cookSpicedFish', defId: 'spicedFish', rarity: 'common', levelReq: 30, cost: { gold: 40, fish: 3 } },
  { id: 'cookHoneyedCakes', defId: 'honeyedCakes', rarity: 'common', levelReq: 40, cost: { gold: 55, fish: 2, herbs: 3 } },
  { id: 'cookDragonPepperChili', defId: 'dragonPepperChili', rarity: 'common', levelReq: 50, cost: { gold: 70, fish: 4 } },
  { id: 'cookMooncrestSalad', defId: 'mooncrestSalad', rarity: 'common', levelReq: 60, cost: { gold: 85, fish: 3, herbs: 4 } },
  { id: 'cookSmokedDelicacy', defId: 'smokedDelicacy', rarity: 'common', levelReq: 70, cost: { gold: 100, fish: 5 } },
  { id: 'cookFeastOfKings', defId: 'feastOfKings', rarity: 'common', levelReq: 80, cost: { gold: 130, fish: 6, herbs: 4 } },
  { id: 'cookAmbrosiaOfAncients', defId: 'ambrosiaOfAncients', rarity: 'common', levelReq: 90, cost: { gold: 170, fish: 8, essence: 4 } }
];
// A fed/eaten food's buff lasts this long (real time) regardless of source.
const FEED_BUFF_DURATION_MS = 60 * 60 * 1000;

// ============================================================================
// Talents - WoW-style: 3 trees per class, 5 tiers per tree (one talent per
// tier here, rather than WoW's several choices per tier, to keep this
// tractable across 9 classes). Tiers 1-4 hold small talents worth up to 5
// ranks each; tier 5 is a single-rank capstone. A tier unlocks once you've
// already spent `tierIndex * TALENT_TIER_SIZE` points earlier in that SAME
// tree - classic WoW gating - so a fully-maxed tree costs 4*5 + 1 = 21
// points, 63 to max a whole class. One point is earned per character level
// (see getTalentPointsAvailable in progression.js). Every effect reuses the
// same lever bag relics/curses/companions already use (RELIC_EFFECT_KEYS),
// summed in by talentStatBonus() - so investing a point takes effect the
// moment it's spent, no separate combat.js wiring needed.
// ============================================================================
const TALENT_TREES = {
  warrior: {
    arms: { name: 'Arms', icon: '⚔️', talents: [
      { id: 'deepWounds', name: 'Deep Wounds', icon: '🩸', desc: '+1 ATK per rank', maxRank: 5, effect: { atk: 1 } },
      { id: 'improvedRend', name: 'Improved Rend', icon: '🎯', desc: '+1 damage vs wounded enemies per rank', maxRank: 5, effect: { executeBonus: 1 } },
      { id: 'weaponMastery', name: 'Weapon Mastery', icon: '🗡️', desc: '+2% critical hit chance per rank', maxRank: 5, effect: { critBonus: 0.02 } },
      { id: 'suddenDeath', name: 'Sudden Death', icon: '☠️', desc: '+1 damage vs elites/bosses per rank', maxRank: 5, effect: { eliteSlayerAtk: 1 } },
      { id: 'bladestorm', name: 'Bladestorm', icon: '🌪️', desc: '+6 ATK, +5% critical hit chance', maxRank: 1, effect: { atk: 6, critBonus: 0.05 } }
    ]},
    fury: { name: 'Fury', icon: '🔥', talents: [
      { id: 'cruelty', name: 'Cruelty', icon: '😈', desc: '+1% critical hit chance per rank', maxRank: 5, effect: { critBonus: 0.01 } },
      { id: 'unbridledWrath', name: 'Unbridled Wrath', icon: '💢', desc: '+1 ATK per rank', maxRank: 5, effect: { atk: 1 } },
      { id: 'flurry', name: 'Flurry', icon: '💨', desc: '+1 Speed per rank', maxRank: 5, effect: { speed: 1 } },
      { id: 'bloodthirst', name: 'Bloodthirst', icon: '🦇', desc: '+1 lifesteal per rank', maxRank: 5, effect: { lifesteal: 1 } },
      { id: 'titansGrip', name: "Titan's Grip", icon: '💪', desc: '+8 ATK', maxRank: 1, effect: { atk: 8 } }
    ]},
    protection: { name: 'Protection', icon: '🛡️', talents: [
      { id: 'toughness', name: 'Toughness', icon: '🛡️', desc: '+1 DEF per rank', maxRank: 5, effect: { def: 1 } },
      { id: 'lastStand', name: 'Last Stand', icon: '❤️', desc: '+3 Max HP per rank', maxRank: 5, effect: { maxHp: 3 } },
      { id: 'shieldMastery', name: 'Shield Mastery', icon: '🔰', desc: 'Heal 1 HP per round per rank', maxRank: 5, effect: { hpRegen: 1 } },
      { id: 'vitality', name: 'Vitality', icon: '💗', desc: '+3 Max HP per rank', maxRank: 5, effect: { maxHp: 3 } },
      { id: 'shieldWall', name: 'Shield Wall', icon: '🏰', desc: '+6 DEF, +15 Max HP', maxRank: 1, effect: { def: 6, maxHp: 15 } }
    ]}
  },
  rogue: {
    assassination: { name: 'Assassination', icon: '🗡️', talents: [
      { id: 'malice', name: 'Malice', icon: '🔪', desc: '+2% critical hit chance per rank', maxRank: 5, effect: { critBonus: 0.02 } },
      { id: 'vilePoisons', name: 'Vile Poisons', icon: '🧪', desc: '+1 damage vs wounded enemies per rank', maxRank: 5, effect: { executeBonus: 1 } },
      { id: 'improvedEviscerate', name: 'Improved Eviscerate', icon: '⚔️', desc: '+1 ATK per rank', maxRank: 5, effect: { atk: 1 } },
      { id: 'coldBlood', name: 'Cold Blood', icon: '❄️', desc: '+2% critical hit chance per rank', maxRank: 5, effect: { critBonus: 0.02 } },
      { id: 'mutilate', name: 'Mutilate', icon: '🩸', desc: '+5 damage vs wounded enemies, +5% critical hit chance', maxRank: 1, effect: { executeBonus: 5, critBonus: 0.05 } }
    ]},
    combat: { name: 'Combat', icon: '⚔️', talents: [
      { id: 'precision', name: 'Precision', icon: '🎯', desc: '+1 ATK per rank', maxRank: 5, effect: { atk: 1 } },
      { id: 'dualWieldSpec', name: 'Dual Wield Spec', icon: '🗡️', desc: '+1 ATK per rank', maxRank: 5, effect: { atk: 1 } },
      { id: 'lightningReflexes', name: 'Lightning Reflexes', icon: '⚡', desc: '+2 Speed per rank', maxRank: 5, effect: { speed: 2 } },
      { id: 'bladeFlurry', name: 'Blade Flurry', icon: '🌀', desc: '+1 ATK per rank', maxRank: 5, effect: { atk: 1 } },
      { id: 'adrenalineRush', name: 'Adrenaline Rush', icon: '💉', desc: '+5 Speed, +4 ATK', maxRank: 1, effect: { speed: 5, atk: 4 } }
    ]},
    subtlety: { name: 'Subtlety', icon: '🌑', talents: [
      { id: 'masterOfDeception', name: 'Master of Deception', icon: '🎭', desc: '+1 Speed per rank', maxRank: 5, effect: { speed: 1 } },
      { id: 'sleightOfHand', name: 'Sleight of Hand', icon: '🪙', desc: '+2% gold from all sources per rank', maxRank: 5, effect: { goldBonus: 0.02 } },
      { id: 'elusiveness', name: 'Elusiveness', icon: '🥷', desc: '+1 DEF per rank', maxRank: 5, effect: { def: 1 } },
      { id: 'serratedBlades', name: 'Serrated Blades', icon: '🔪', desc: '+1 damage vs wounded enemies per rank', maxRank: 5, effect: { executeBonus: 1 } },
      { id: 'shadowstep', name: 'Shadowstep', icon: '👤', desc: '+6 Speed, +10% gold from all sources', maxRank: 1, effect: { speed: 6, goldBonus: 0.1 } }
    ]}
  },
  mage: {
    fire: { name: 'Fire', icon: '🔥', talents: [
      { id: 'improvedFireball', name: 'Improved Fireball', icon: '☄️', desc: '+2% spell damage per rank', maxRank: 5, effect: { spellPower: 0.02 } },
      { id: 'pyroblast', name: 'Pyroblast', icon: '🔥', desc: '+2% spell damage per rank', maxRank: 5, effect: { spellPower: 0.02 } },
      { id: 'criticalMass', name: 'Critical Mass', icon: '💥', desc: '+2% critical hit chance per rank', maxRank: 5, effect: { critBonus: 0.02 } },
      { id: 'burningSoul', name: 'Burning Soul', icon: '🔆', desc: '+1 DEF per rank', maxRank: 5, effect: { def: 1 } },
      { id: 'combustion', name: 'Combustion', icon: '🌋', desc: '+15% spell damage', maxRank: 1, effect: { spellPower: 0.15 } }
    ]},
    frost: { name: 'Frost', icon: '❄️', talents: [
      { id: 'iceShards', name: 'Ice Shards', icon: '🧊', desc: '+2% spell damage per rank', maxRank: 5, effect: { spellPower: 0.02 } },
      { id: 'frostbite', name: 'Frostbite', icon: '❄️', desc: '+1 damage vs wounded enemies per rank', maxRank: 5, effect: { executeBonus: 1 } },
      { id: 'shatter', name: 'Shatter', icon: '💎', desc: '+2% critical hit chance per rank', maxRank: 5, effect: { critBonus: 0.02 } },
      { id: 'iceBarrier', name: 'Ice Barrier', icon: '🛡️', desc: '+3 Max HP per rank', maxRank: 5, effect: { maxHp: 3 } },
      { id: 'icyVeins', name: 'Icy Veins', icon: '🥶', desc: '+10% spell damage, +3 Speed', maxRank: 1, effect: { spellPower: 0.1, speed: 3 } }
    ]},
    arcane: { name: 'Arcane', icon: '🔮', talents: [
      { id: 'arcaneFocus', name: 'Arcane Focus', icon: '🔮', desc: '+2% spell damage per rank', maxRank: 5, effect: { spellPower: 0.02 } },
      { id: 'arcaneMeditation', name: 'Arcane Meditation', icon: '🧘', desc: 'Heal 1 HP per round per rank', maxRank: 5, effect: { hpRegen: 1 } },
      { id: 'presenceOfMind', name: 'Presence of Mind', icon: '✨', desc: '+2% critical hit chance per rank', maxRank: 5, effect: { critBonus: 0.02 } },
      { id: 'arcaneFortitude', name: 'Arcane Fortitude', icon: '🛡️', desc: '+1 DEF per rank', maxRank: 5, effect: { def: 1 } },
      { id: 'arcanePower', name: 'Arcane Power', icon: '🌟', desc: '+15% spell damage, +5% critical hit chance', maxRank: 1, effect: { spellPower: 0.15, critBonus: 0.05 } }
    ]}
  },
  paladin: {
    holy: { name: 'Holy', icon: '✨', talents: [
      { id: 'spiritualFocus', name: 'Spiritual Focus', icon: '🕯️', desc: '+2% healing from items per rank', maxRank: 5, effect: { potionHealBonus: 0.02 } },
      { id: 'divineFavor', name: 'Divine Favor', icon: '🙏', desc: 'Heal 1 HP per round per rank', maxRank: 5, effect: { hpRegen: 1 } },
      { id: 'blessedRecovery', name: 'Blessed Recovery', icon: '💫', desc: '+2% healing from items per rank', maxRank: 5, effect: { potionHealBonus: 0.02 } },
      { id: 'holyPower', name: 'Holy Power', icon: '⚡', desc: '+2% spell damage per rank', maxRank: 5, effect: { spellPower: 0.02 } },
      { id: 'beaconOfLight', name: 'Beacon of Light', icon: '🔆', desc: 'Heal 3 HP per round, +10% healing from items', maxRank: 1, effect: { hpRegen: 3, potionHealBonus: 0.1 } }
    ]},
    protection: { name: 'Protection', icon: '🛡️', talents: [
      { id: 'toughness', name: 'Toughness', icon: '🛡️', desc: '+1 DEF per rank', maxRank: 5, effect: { def: 1 } },
      { id: 'guardiansFavor', name: "Guardian's Favor", icon: '❤️', desc: '+3 Max HP per rank', maxRank: 5, effect: { maxHp: 3 } },
      { id: 'anticipation', name: 'Anticipation', icon: '🔰', desc: '+1 DEF per rank', maxRank: 5, effect: { def: 1 } },
      { id: 'reckoning', name: 'Reckoning', icon: '⚔️', desc: '+1 damage vs elites/bosses per rank', maxRank: 5, effect: { eliteSlayerAtk: 1 } },
      { id: 'ardentDefender', name: 'Ardent Defender', icon: '🏰', desc: '+6 DEF, +15 Max HP', maxRank: 1, effect: { def: 6, maxHp: 15 } }
    ]},
    retribution: { name: 'Retribution', icon: '⚖️', talents: [
      { id: 'improvedJudgement', name: 'Improved Judgement', icon: '⚖️', desc: '+1 ATK per rank', maxRank: 5, effect: { atk: 1 } },
      { id: 'vengeance', name: 'Vengeance', icon: '🗡️', desc: '+1 damage vs elites/bosses per rank', maxRank: 5, effect: { eliteSlayerAtk: 1 } },
      { id: 'sanctifiedWrath', name: 'Sanctified Wrath', icon: '☀️', desc: '+2% critical hit chance per rank', maxRank: 5, effect: { critBonus: 0.02 } },
      { id: 'twoHandedWeaponSpec', name: 'Two-Handed Weapon Spec', icon: '⚔️', desc: '+1 ATK per rank', maxRank: 5, effect: { atk: 1 } },
      { id: 'avengingWrath', name: 'Avenging Wrath', icon: '🔥', desc: '+6 ATK, +5% critical hit chance', maxRank: 1, effect: { atk: 6, critBonus: 0.05 } }
    ]}
  },
  hunter: {
    beastMastery: { name: 'Beast Mastery', icon: '🐺', talents: [
      { id: 'improvedAspect', name: 'Improved Aspect', icon: '🦅', desc: '+1 Speed per rank', maxRank: 5, effect: { speed: 1 } },
      { id: 'ferocity', name: 'Ferocity', icon: '🐾', desc: '+1 ATK per rank', maxRank: 5, effect: { atk: 1 } },
      { id: 'frenzy', name: 'Frenzy', icon: '💢', desc: '+2% critical hit chance per rank', maxRank: 5, effect: { critBonus: 0.02 } },
      { id: 'bestialDiscipline', name: 'Bestial Discipline', icon: '🦴', desc: 'Heal 1 HP per round per rank', maxRank: 5, effect: { hpRegen: 1 } },
      { id: 'bestialWrath', name: 'Bestial Wrath', icon: '🐻', desc: '+6 ATK, +3 Speed', maxRank: 1, effect: { atk: 6, speed: 3 } }
    ]},
    marksmanship: { name: 'Marksmanship', icon: '🎯', talents: [
      { id: 'improvedAimedShot', name: 'Improved Aimed Shot', icon: '🏹', desc: '+1 ATK per rank', maxRank: 5, effect: { atk: 1 } },
      { id: 'lethalShots', name: 'Lethal Shots', icon: '🎯', desc: '+2% critical hit chance per rank', maxRank: 5, effect: { critBonus: 0.02 } },
      { id: 'barrage', name: 'Barrage', icon: '💨', desc: '+1 damage vs wounded enemies per rank', maxRank: 5, effect: { executeBonus: 1 } },
      { id: 'rangedWeaponSpec', name: 'Ranged Weapon Spec', icon: '🏹', desc: '+1 ATK per rank', maxRank: 5, effect: { atk: 1 } },
      { id: 'chimeraShot', name: 'Chimera Shot', icon: '🐍', desc: '+5 damage vs wounded enemies, +5% critical hit chance', maxRank: 1, effect: { executeBonus: 5, critBonus: 0.05 } }
    ]},
    survival: { name: 'Survival', icon: '🏕️', talents: [
      { id: 'survivalist', name: 'Survivalist', icon: '❤️', desc: '+3 Max HP per rank', maxRank: 5, effect: { maxHp: 3 } },
      { id: 'trapMastery', name: 'Trap Mastery', icon: '🪤', desc: '+1 DEF per rank', maxRank: 5, effect: { def: 1 } },
      { id: 'deflection', name: 'Deflection', icon: '🛡️', desc: '+1 DEF per rank', maxRank: 5, effect: { def: 1 } },
      { id: 'killerInstinct', name: 'Killer Instinct', icon: '🐆', desc: '+1 damage vs elites/bosses per rank', maxRank: 5, effect: { eliteSlayerAtk: 1 } },
      { id: 'lockAndLoad', name: 'Lock and Load', icon: '🔫', desc: '+5 ATK, +3 damage vs wounded enemies', maxRank: 1, effect: { atk: 5, executeBonus: 3 } }
    ]}
  },
  warlock: {
    affliction: { name: 'Affliction', icon: '💀', talents: [
      { id: 'improvedCorruption', name: 'Improved Corruption', icon: '🕷️', desc: '+2% spell damage per rank', maxRank: 5, effect: { spellPower: 0.02 } },
      { id: 'suppression', name: 'Suppression', icon: '😖', desc: '+2% critical hit chance per rank', maxRank: 5, effect: { critBonus: 0.02 } },
      { id: 'siphonLife', name: 'Siphon Life', icon: '🩸', desc: '+1 lifesteal per rank', maxRank: 5, effect: { lifesteal: 1 } },
      { id: 'shadowMastery', name: 'Shadow Mastery', icon: '🌑', desc: '+2% spell damage per rank', maxRank: 5, effect: { spellPower: 0.02 } },
      { id: 'haunt', name: 'Haunt', icon: '👻', desc: '+15% spell damage, +2 lifesteal', maxRank: 1, effect: { spellPower: 0.15, lifesteal: 2 } }
    ]},
    demonology: { name: 'Demonology', icon: '👹', talents: [
      { id: 'demonicEmbrace', name: 'Demonic Embrace', icon: '❤️', desc: '+3 Max HP per rank', maxRank: 5, effect: { maxHp: 3 } },
      { id: 'felVitality', name: 'Fel Vitality', icon: '💚', desc: 'Heal 1 HP per round per rank', maxRank: 5, effect: { hpRegen: 1 } },
      { id: 'masterSummoner', name: 'Master Summoner', icon: '👿', desc: '+1 ATK per rank', maxRank: 5, effect: { atk: 1 } },
      { id: 'demonicAegis', name: 'Demonic Aegis', icon: '🛡️', desc: '+1 DEF per rank', maxRank: 5, effect: { def: 1 } },
      { id: 'metamorphosis', name: 'Metamorphosis', icon: '😈', desc: '+6 ATK, +12 Max HP', maxRank: 1, effect: { atk: 6, maxHp: 12 } }
    ]},
    destruction: { name: 'Destruction', icon: '🔥', talents: [
      { id: 'improvedImmolate', name: 'Improved Immolate', icon: '🔥', desc: '+2% spell damage per rank', maxRank: 5, effect: { spellPower: 0.02 } },
      { id: 'devastation', name: 'Devastation', icon: '💥', desc: '+2% critical hit chance per rank', maxRank: 5, effect: { critBonus: 0.02 } },
      { id: 'emberstorm', name: 'Emberstorm', icon: '🌋', desc: '+2% spell damage per rank', maxRank: 5, effect: { spellPower: 0.02 } },
      { id: 'backlash', name: 'Backlash', icon: '⚡', desc: '+2% critical hit chance per rank', maxRank: 5, effect: { critBonus: 0.02 } },
      { id: 'chaosBolt', name: 'Chaos Bolt', icon: '☄️', desc: '+20% spell damage', maxRank: 1, effect: { spellPower: 0.2 } }
    ]}
  },
  barbarian: {
    berserker: { name: 'Berserker', icon: '😤', talents: [
      { id: 'recklessAbandon', name: 'Reckless Abandon', icon: '💢', desc: '+1 ATK per rank', maxRank: 5, effect: { atk: 1 } },
      { id: 'bloodlust', name: 'Bloodlust', icon: '🩸', desc: '+2% critical hit chance per rank', maxRank: 5, effect: { critBonus: 0.02 } },
      { id: 'frenzy', name: 'Frenzy', icon: '💨', desc: '+1 Speed per rank', maxRank: 5, effect: { speed: 1 } },
      { id: 'savageFury', name: 'Savage Fury', icon: '👊', desc: '+1 ATK per rank', maxRank: 5, effect: { atk: 1 } },
      { id: 'rampage', name: 'Rampage', icon: '🌋', desc: '+8 ATK', maxRank: 1, effect: { atk: 8 } }
    ]},
    bloodrage: { name: 'Bloodrage', icon: '🩸', talents: [
      { id: 'bloodPact', name: 'Blood Pact', icon: '🩸', desc: '+1 lifesteal per rank', maxRank: 5, effect: { lifesteal: 1 } },
      { id: 'scarredHide', name: 'Scarred Hide', icon: '🛡️', desc: '+1 DEF per rank', maxRank: 5, effect: { def: 1 } },
      { id: 'warbringer', name: 'Warbringer', icon: '❤️', desc: '+3 Max HP per rank', maxRank: 5, effect: { maxHp: 3 } },
      { id: 'undyingRage', name: 'Undying Rage', icon: '💗', desc: 'Heal 1 HP per round per rank', maxRank: 5, effect: { hpRegen: 1 } },
      { id: 'bloodbath', name: 'Bloodbath', icon: '🦇', desc: '+3 lifesteal, +4 ATK', maxRank: 1, effect: { lifesteal: 3, atk: 4 } }
    ]},
    warlord: { name: 'Warlord', icon: '🪓', talents: [
      { id: 'ironConstitution', name: 'Iron Constitution', icon: '❤️', desc: '+3 Max HP per rank', maxRank: 5, effect: { maxHp: 3 } },
      { id: 'battleTrance', name: 'Battle Trance', icon: '🛡️', desc: '+1 DEF per rank', maxRank: 5, effect: { def: 1 } },
      { id: 'enduringCry', name: 'Enduring Cry', icon: '📯', desc: 'Heal 1 HP per round per rank', maxRank: 5, effect: { hpRegen: 1 } },
      { id: 'juggernaut', name: 'Juggernaut', icon: '🗿', desc: '+1 damage vs elites/bosses per rank', maxRank: 5, effect: { eliteSlayerAtk: 1 } },
      { id: 'unstoppableForce', name: 'Unstoppable Force', icon: '💥', desc: '+5 DEF, +15 Max HP', maxRank: 1, effect: { def: 5, maxHp: 15 } }
    ]}
  },
  cleric: {
    discipline: { name: 'Discipline', icon: '📿', talents: [
      { id: 'improvedPowerWord', name: 'Improved Power Word', icon: '📖', desc: '+2% healing from items per rank', maxRank: 5, effect: { potionHealBonus: 0.02 } },
      { id: 'meditation', name: 'Meditation', icon: '🧘', desc: 'Heal 1 HP per round per rank', maxRank: 5, effect: { hpRegen: 1 } },
      { id: 'focusedWill', name: 'Focused Will', icon: '🛡️', desc: '+1 DEF per rank', maxRank: 5, effect: { def: 1 } },
      { id: 'enlightenment', name: 'Enlightenment', icon: '💡', desc: '+3 Max HP per rank', maxRank: 5, effect: { maxHp: 3 } },
      { id: 'painSuppression', name: 'Pain Suppression', icon: '✋', desc: '+6 DEF, +10% healing from items', maxRank: 1, effect: { def: 6, potionHealBonus: 0.1 } }
    ]},
    holy: { name: 'Holy', icon: '✨', talents: [
      { id: 'spiritualGuidance', name: 'Spiritual Guidance', icon: '🕊️', desc: '+2% spell damage per rank', maxRank: 5, effect: { spellPower: 0.02 } },
      { id: 'healingFocus', name: 'Healing Focus', icon: '💫', desc: '+2% healing from items per rank', maxRank: 5, effect: { potionHealBonus: 0.02 } },
      { id: 'holySpecialization', name: 'Holy Specialization', icon: '⭐', desc: '+2% critical hit chance per rank', maxRank: 5, effect: { critBonus: 0.02 } },
      { id: 'spiritOfRedemption', name: 'Spirit of Redemption', icon: '👼', desc: 'Heal 1 HP per round per rank', maxRank: 5, effect: { hpRegen: 1 } },
      { id: 'guardianSpirit', name: 'Guardian Spirit', icon: '🔆', desc: '+15% healing from items, heal 3 HP per round', maxRank: 1, effect: { potionHealBonus: 0.15, hpRegen: 3 } }
    ]},
    shadow: { name: 'Shadow', icon: '🌑', talents: [
      { id: 'shadowAffinity', name: 'Shadow Affinity', icon: '🌘', desc: '+2% spell damage per rank', maxRank: 5, effect: { spellPower: 0.02 } },
      { id: 'darkness', name: 'Darkness', icon: '🖤', desc: '+2% critical hit chance per rank', maxRank: 5, effect: { critBonus: 0.02 } },
      { id: 'shadowWeaving', name: 'Shadow Weaving', icon: '🕸️', desc: '+2% spell damage per rank', maxRank: 5, effect: { spellPower: 0.02 } },
      { id: 'vampiricEmbrace', name: 'Vampiric Embrace', icon: '🦇', desc: '+1 lifesteal per rank', maxRank: 5, effect: { lifesteal: 1 } },
      { id: 'shadowform', name: 'Shadowform', icon: '👤', desc: '+15% spell damage, +2 lifesteal', maxRank: 1, effect: { spellPower: 0.15, lifesteal: 2 } }
    ]}
  },
  bard: {
    melody: { name: 'Melody', icon: '🎵', talents: [
      { id: 'perfectPitch', name: 'Perfect Pitch', icon: '🎶', desc: '+2% critical hit chance per rank', maxRank: 5, effect: { critBonus: 0.02 } },
      { id: 'resonance', name: 'Resonance', icon: '🔊', desc: '+2% spell damage per rank', maxRank: 5, effect: { spellPower: 0.02 } },
      { id: 'encore', name: 'Encore', icon: '👏', desc: 'Heal 1 HP per round per rank', maxRank: 5, effect: { hpRegen: 1 } },
      { id: 'virtuoso', name: 'Virtuoso', icon: '🎻', desc: '+1 ATK per rank', maxRank: 5, effect: { atk: 1 } },
      { id: 'crescendo', name: 'Crescendo', icon: '🎼', desc: '+10% spell damage, +5% critical hit chance', maxRank: 1, effect: { spellPower: 0.1, critBonus: 0.05 } }
    ]},
    valor: { name: 'Valor', icon: '🛡️', talents: [
      { id: 'battleHymn', name: 'Battle Hymn', icon: '⚔️', desc: '+1 ATK per rank', maxRank: 5, effect: { atk: 1 } },
      { id: 'rallyingCry', name: 'Rallying Cry', icon: '❤️', desc: '+3 Max HP per rank', maxRank: 5, effect: { maxHp: 3 } },
      { id: 'inspiringPresence', name: 'Inspiring Presence', icon: '🛡️', desc: '+1 DEF per rank', maxRank: 5, effect: { def: 1 } },
      { id: 'heroicBallad', name: 'Heroic Ballad', icon: '📯', desc: '+1 damage vs elites/bosses per rank', maxRank: 5, effect: { eliteSlayerAtk: 1 } },
      { id: 'anthemOfHeroes', name: 'Anthem of Heroes', icon: '🏆', desc: '+5 ATK, +10 Max HP', maxRank: 1, effect: { atk: 5, maxHp: 10 } }
    ]},
    trickery: { name: 'Trickery', icon: '🃏', talents: [
      { id: 'silverTongue', name: 'Silver Tongue', icon: '👅', desc: '+2% gold from all sources per rank', maxRank: 5, effect: { goldBonus: 0.02 } },
      { id: 'quickFingers', name: 'Quick Fingers', icon: '🤹', desc: '+1 Speed per rank', maxRank: 5, effect: { speed: 1 } },
      { id: 'luckyCharm', name: 'Lucky Charm', icon: '🍀', desc: '+2% critical hit chance per rank', maxRank: 5, effect: { critBonus: 0.02 } },
      { id: 'cutpurse', name: 'Cutpurse', icon: '💰', desc: '+2% gold from all sources per rank', maxRank: 5, effect: { goldBonus: 0.02 } },
      { id: 'grandFinale', name: 'Grand Finale', icon: '🎆', desc: '+15% gold from all sources, +3 Speed', maxRank: 1, effect: { goldBonus: 0.15, speed: 3 } }
    ]}
  }
};

const TALENT_TIER_SIZE = 5;

// ============================================================================
// PvP - fought from the Sanctuary's PvP tab against a "Ghost" opponent built
// directly from your own effectiveStats()/previewClassStats(), so it's an
// exact mirror of your real gear, relics, talents, and level rather than a
// separately-simulated character (see enterPvpMatch in main.js). Winning
// grants gold/XP as normal plus Honor, a currency that ONLY the Honor Shop
// below accepts - the gear it sells only ever applies its bonus while a PvP
// match is in progress (see pvpGearStatBonus in progression.js).
// ============================================================================
// Honor Shop gear templates - one per weaponType so every class (see
// CLASS_WEAPON_TYPES) has at least one legal PvP weapon to buy, plus a
// universal armor and trinket. Sold at 'common' rarity only via
// instantiatePvpGear (progression.js) - higher rarities only drop from the
// Bloody Bag (see CONTAINERS below), which is what makes those drops feel
// like an upgrade over the guaranteed shop baseline.
const PVP_GEAR_TEMPLATES = {
  pvpOneHanded: { kind: 'weapon', weaponType: 'oneHanded', name: "Gladiator's Blade", icon: '⚔️', baseAtk: 8 },
  pvpTwoHanded: { kind: 'weapon', weaponType: 'twoHanded', name: "Gladiator's Greatsword", icon: '🗡️', baseAtk: 11 },
  pvpMainHandOnly: { kind: 'weapon', weaponType: 'mainHandOnly', name: "Gladiator's Shiv", icon: '🔪', baseAtk: 7 },
  pvpStaff: { kind: 'weapon', weaponType: 'staff', name: "Gladiator's Staff", icon: '🔮', baseAtk: 9 },
  pvpRanged: { kind: 'weapon', weaponType: 'ranged', name: "Gladiator's Longbow", icon: '🏹', baseAtk: 8 },
  pvpWand: { kind: 'weapon', weaponType: 'wand', name: "Gladiator's Wand", icon: '🪄', baseAtk: 7 },
  pvpThrown: { kind: 'weapon', weaponType: 'thrown', name: "Gladiator's Javelin", icon: '🔱', baseAtk: 7 },
  pvpBlessing: { kind: 'weapon', weaponType: 'blessing', name: "Gladiator's Blessing", icon: '🕊️', baseAtk: 7 },
  pvpInstrument: { kind: 'weapon', weaponType: 'instrument', name: "Gladiator's Lute", icon: '🎻', baseAtk: 7 },
  pvpShield: { kind: 'weapon', weaponType: 'shield', name: "Gladiator's Bulwark", icon: '🛡️', baseDef: 6 },
  pvpArmor: { kind: 'armor', name: "Gladiator's Armor", icon: '🥋', baseDef: 6, baseHp: 20 },
  pvpTrinket: { kind: 'trinket', name: "Gladiator's Insignia", icon: '🔯', effect: { critBonus: 0.05 } }
};
const PVP_GEAR_PRICE = { weapon: 150, armor: 150, trinket: 100 };

// A handful of named, fixed-stat PvP uniques - the rarest possible Bloody Bag
// roll (see CONTAINERS.bloodyBag), distinct from the rarity-scaled
// PVP_GEAR_TEMPLATES above the same way LEGENDARY_ITEMS are distinct from
// GEAR_TEMPLATES.
const PVP_UNIQUE_ITEMS = {
  duelistsEdge: { kind: 'weapon', weaponType: 'oneHanded', name: "The Duelist's Edge", icon: '🗡️', atk: 16, desc: 'Never misses its mark in the arena.' },
  warlordsMaul: { kind: 'weapon', weaponType: 'twoHanded', name: "Warlord's Maul", icon: '🔨', atk: 20, desc: 'Ends duels in a single swing.' },
  arenaMastersBow: { kind: 'weapon', weaponType: 'ranged', name: "Arena Master's Bow", icon: '🏹', atk: 15, desc: 'Strung with the sinew of champions.' },
  soulReaperStaff: { kind: 'weapon', weaponType: 'staff', name: 'Soul Reaper Staff', icon: '🔮', atk: 17, desc: 'Hungers for honor.' },
  championsAegis: { kind: 'armor', name: "Champion's Aegis", icon: '🛡️', def: 12, hp: 35, desc: 'Worn by the arena undefeated.' },
  bloodthirstyCharm: { kind: 'trinket', name: 'Bloodthirsty Charm', icon: '🔯', effect: { critBonus: 0.1, lifesteal: 2 }, desc: 'Thirsts alongside its wearer.' }
};

const HONOR_SHOP = {
  potion: { id: 'honorPotion', name: 'Vial of Battle', icon: '🧪', price: 40, heal: 20, desc: 'Heal 20 HP - usable only in a PvP match' }
};

// ============================================================================
// Generic loot containers - a reusable "open this item, roll a rarity
// rarest-first, hand back one generated reward" pattern (see
// rollContainerRarity/openContainer in progression.js). To add a new
// container later: give it a rarityChances table and a generate(rarity) fn -
// nothing else in the system needs to change.
// ============================================================================
const CONTAINERS = {
  bloodyBag: {
    id: 'bloodyBag',
    name: 'Bloody Bag',
    icon: '🩸',
    desc: 'A grisly trophy looted from a defeated Rival Ghost. Contains a single piece of PvP gear.',
    // Checked rarest-first with common as the guaranteed floor: unique 1%,
    // legendary 5%, epic 15%, rare 30%, uncommon 50%, else common.
    rarityChances: { unique: 0.01, legendary: 0.05, epic: 0.15, rare: 0.30, uncommon: 0.50 },
    generate(rarity) {
      if (rarity === 'unique') {
        const ids = Object.keys(PVP_UNIQUE_ITEMS);
        return instantiatePvpUnique(ids[rand(0, ids.length - 1)]);
      }
      const ids = Object.keys(PVP_GEAR_TEMPLATES);
      return instantiatePvpGear(ids[rand(0, ids.length - 1)], rarity);
    }
  }
};

// --- Tutorial system (Kyle the Bard) ---
// Keyed by screen id (see maybeShowTutorial in main.js) - each shows once
// EVER, account-wide (pdata.kyleTutorialsSeen), the first time that screen
// is reached, unless the player checked "Skip Tutorials" on the title
// screen. Kyle only leaves when the player taps anywhere on screen - no
// auto-dismiss, no separate close button.
const TUTORIALS = {
  map: {
    lines: [
      "Kyle! Bard, raconteur, and - as of about four seconds ago - your personal tour guide. Try to contain your excitement.",
      "See those glowing circles ahead? Tap one. That's it, that's the whole trick. Battles, campfires, shops, and things I'm legally required to call \"stranger encounters\" all wait down different roads - choose with the wisdom of someone who's read the brochure, which, conveniently, you now have.",
      "Mind your HP, gold, and Relics up top - and if you'd rather nap through the adventuring part, that AUTO toggle does the fighting and walking for you. No judgment. I do my best work from a hammock too."
    ]
  },
  combat: {
    lines: [
      "Ah, violence! My favorite spectator sport. Attack swings whatever pointy or blunt thing you're holding; your Skill is the fancy class trick that needs a nap between uses, much like myself after a big performance.",
      "Watch that HP bar - it's rude, but it will absolutely hit zero without asking permission. An item can bail you out, and fleeing is always on the table. I've fled from worse. Mostly angry husbands.",
      "Pro tip from a professional bystander: Skills hit harder than plain Attacks. Use it like you mean it."
    ]
  },
  relic: {
    lines: [
      "Ooh, shiny. A relic - yours for exactly one adventure, then poof, gone, same as your gold and whatever curses you've been collecting like a very unlucky stamp album.",
      "Grab whichever one flatters your current strategy, or skip them all with your dignity intact. There's no wrong pick here - only the pick that keeps you breathing a little longer, which I'm told is generally the goal."
    ]
  },
  shop: {
    lines: [
      "A traveling shop, and look, an actual merchant instead of me pretending to sell things I clearly don't own. Spend your gold here - none of it comes home with you if you don't.",
      "Prices climb the deeper you go, same as my asking price for a second song. Spend it like you mean it."
    ]
  },
  rest: {
    lines: [
      "A campfire! Sit, rest, mend those wounds - or meditate and permanently shave a round off your Skill's cooldown, which is the closest thing to actual magic I've ever seen that isn't just a card trick.",
      "Got a fish? Cook it. Extra healing, extra Cooking experience, and frankly, better hygiene than the last three taverns I've played. Pick one option and you're back on the road."
    ]
  },
  event: {
    lines: [
      "Now THIS is where the good stories come from - the ones I turn into songs later, occasionally with your name changed to protect the reckless.",
      "Every choice below goes somewhere different - kind, cruel, or delightfully both. There's no correct answer, only the kind of legend you're trying to be. Choose accordingly, and try to give me something good to rhyme with."
    ]
  },
  treasure: {
    lines: [
      "Treasure! Gold, gear, maybe a relic if the universe is feeling generous - all yours, no strings, no fine print, no suspicious merchant lurking nearby. Suspicious of that? Good instincts.",
      "Always worth a peek before you move on. I've never once regretted checking a treasure chest. The same cannot be said for every door I've opened in my life."
    ]
  }
};
