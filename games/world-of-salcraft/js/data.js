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
  easy: { id: 'easy', name: 'Easy', resourceMult: 1.25, enemyMult: 1, playerStatMult: 1, desc: '+25% resources, experience, and gold gained.' },
  normal: { id: 'normal', name: 'Normal', resourceMult: 1, enemyMult: 1, playerStatMult: 1, desc: 'The game as designed - no modifiers.' },
  hard: { id: 'hard', name: 'Hard', resourceMult: 1.5, enemyMult: 1.5, playerStatMult: 1, desc: '+50% resources, experience, and gold gained. Enemies get +50% health, damage, and defense.' },
  extreme: { id: 'extreme', name: 'Extreme', resourceMult: 1.75, enemyMult: 2, playerStatMult: 0.85, desc: '+75% resources, experience, and gold gained. Your stats are reduced by 15%. Enemies get +100% health, damage, and defense.' }
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
  avengingWrath: { id: 'avengingWrath', name: 'Avenging Wrath', desc: '+16 damage, 50% more if below half HP', cooldown: 4, type: 'rage', power: 16, icon: 'assets/icons/spells/avengingWrath.png' },
  // --- Legendary classes' signature spells (see CLASSES below) ---
  deathCoil: { id: 'deathCoil', name: 'Death Coil', desc: 'Deal damage and heal for half', cooldown: 2, type: 'drain', power: 9, icon: 'assets/icons/spells/deathCoil.png' },
  flyingKick: { id: 'flyingKick', name: 'Flying Kick', desc: '+7 damage, ignores 2 DEF', cooldown: 2, type: 'cleave', power: 7, ignoreDef: 2, icon: 'assets/icons/spells/flyingKick.png' },
  wrath: { id: 'wrath', name: 'Wrath', desc: 'Deal 14 nature damage', cooldown: 2, type: 'flat', power: 14, icon: 'assets/icons/spells/wrath.png' },
  lightningBolt: { id: 'lightningBolt', name: 'Lightning Bolt', desc: 'Deal 15 nature damage', cooldown: 2, type: 'flat', power: 15, icon: 'assets/icons/spells/lightningBolt.png' },
  shadowWordPain: { id: 'shadowWordPain', name: 'Shadow Word: Pain', desc: 'Deal damage and heal for half', cooldown: 2, type: 'drain', power: 8, icon: 'assets/icons/spells/shadowWordPain.png' }
};

const CLASSES = {
  // --- Starter classes (always available) ---
  // Base stats are deliberately archetype-driven rather than flat/even -
  // see the per-class comment for the lore reasoning. Rogue carries the
  // single highest base ATK in the game (fast, precise, glass-cannon);
  // Warrior is a tank first, not the hardest hitter, so its ATK sits in the
  // middle of the pack even though its HP/DEF lead the starter trio.
  warrior: {
    id: 'warrior', name: 'Warrior', icon: '⚔️', starter: true,
    maxHp: 34, atk: 5, def: 4, speed: 3,
    defaultSpell: 'cleave',
    startItems: ['potion'],
    blurb: 'Tough and simple. High HP and defense, dependable melee hits.'
  },
  rogue: {
    id: 'rogue', name: 'Rogue', icon: '🗡️', starter: true,
    maxHp: 20, atk: 8, def: 1, speed: 9,
    defaultSpell: 'backstab',
    startItems: ['potion', 'bomb'],
    blurb: 'Fragile but fast, with the sharpest attack of any class. Finds more gold too.'
  },
  mage: {
    id: 'mage', name: 'Mage', icon: '🧙', starter: true,
    maxHp: 20, atk: 3, def: 0, speed: 5,
    defaultSpell: 'fireball',
    startItems: ['potion', 'potion'],
    blurb: 'Lowest HP and defense in the game, weak in a straight fight - but its spells burst hardest of all.'
  },

  // --- Unlockable classes (WoW-flavored) - won via a rare Class Trial encounter ---
  paladin: {
    id: 'paladin', name: 'Paladin', icon: '🛡️',
    maxHp: 32, atk: 4, def: 4, speed: 4,
    defaultSpell: 'holyStrike',
    startItems: ['potion'],
    blurb: 'Holy warrior who heals as he fights - tanky and steady rather than hard-hitting. Unlocked via Class Trial.'
  },
  hunter: {
    id: 'hunter', name: 'Hunter', icon: '🏹',
    maxHp: 24, atk: 6, def: 2, speed: 7,
    defaultSpell: 'aimedShot',
    startItems: ['potion', 'bomb'],
    blurb: 'Precise ranged damage that pierces armor. Unlocked via Class Trial.'
  },
  warlock: {
    id: 'warlock', name: 'Warlock', icon: '😈',
    maxHp: 30, atk: 5, def: 0, speed: 5,
    defaultSpell: 'lifeDrain',
    startItems: ['potion', 'potion'],
    blurb: 'Dark pacts grant surprisingly high HP, but no defense to speak of. Damage that heals itself. Unlocked via Class Trial.'
  },

  // --- Unlockable classes (D&D-flavored) - won via a rare Class Trial encounter ---
  barbarian: {
    id: 'barbarian', name: 'Barbarian', icon: '🪓',
    maxHp: 38, atk: 7, def: 1, speed: 4,
    defaultSpell: 'recklessRage',
    startItems: ['potion'],
    blurb: 'The most HP in the game and reckless melee fury, but no armor to lean on. Hits hardest when wounded. Unlocked via Class Trial.'
  },
  cleric: {
    id: 'cleric', name: 'Cleric', icon: '✝️',
    maxHp: 27, atk: 3, def: 5, speed: 3,
    defaultSpell: 'divineLight',
    startItems: ['potion', 'potion'],
    blurb: 'Devoted healer with the best defense in the game and medium HP, but soft-hitting. Unlocked via Class Trial.'
  },
  bard: {
    id: 'bard', name: 'Bard', icon: '🎻',
    maxHp: 22, atk: 4, def: 1, speed: 8,
    defaultSpell: 'viciousMockery',
    startItems: ['potion'],
    blurb: 'Quick and cutting, more gold-savvy than most. Unlocked via Class Trial.'
  },

  // --- Legendary classes - unlocked by leveling ANY character to a
  // threshold (see LEGENDARY_CLASS_UNLOCK_LEVEL, progression.js), not via
  // Class Trial. Each borrows an existing class's weapon/armor competency
  // (see CLASS_WEAPON_TYPES, progression.js) with class-specific carve-outs.
  deathKnight: {
    id: 'deathKnight', name: 'Death Knight', icon: '💀',
    maxHp: 36, atk: 5, def: 5, speed: 3,
    defaultSpell: 'deathCoil',
    startItems: ['potion'],
    blurb: "A human risen back to unlife, wielding a paladin's arsenal without a shield to hide behind. Fuels its strikes with Sigils instead of Blessings. Legendary class - unlocks at level 65 on any character."
  },
  monk: {
    id: 'monk', name: 'Monk', icon: '🐼',
    maxHp: 24, atk: 7, def: 2, speed: 8,
    defaultSpell: 'flyingKick',
    startItems: ['potion', 'bomb'],
    blurb: 'A panda martial artist who fights bare-handed or with a staff - nothing else. Legendary class - unlocks at level 85 on any character.'
  },
  druid: {
    id: 'druid', name: 'Druid', icon: '🌿',
    maxHp: 22, atk: 6, def: 2, speed: 6,
    defaultSpell: 'wrath',
    startItems: ['potion', 'potion'],
    blurb: 'An elf shaped by nature magic, restricted to the staff alone. Shares its Blessings with Paladins and Shamans. Legendary class - unlocks at level 15 on any character.'
  },
  shaman: {
    id: 'shaman', name: 'Shaman', icon: '⚡',
    maxHp: 26, atk: 6, def: 3, speed: 6,
    defaultSpell: 'lightningBolt',
    startItems: ['potion', 'bomb'],
    blurb: "An orc elementalist with a hunter's gear pool, minus the bow. Shares its Blessings with Paladins and Druids. Legendary class - unlocks at level 25 on any character."
  },
  priest: {
    id: 'priest', name: 'Priest', icon: '👻',
    maxHp: 20, atk: 3, def: 0, speed: 5,
    defaultSpell: 'shadowWordPain',
    startItems: ['potion', 'potion'],
    blurb: 'An undead shadow caster with a mage\'s exact gear pool. Legendary class - unlocks at level 45 on any character.'
  }
};

const ITEMS = {
  potion: { id: 'potion', name: 'Health Potion', icon: 'assets/icons/items/potion.png', desc: 'Heal 12 HP', price: 25 },
  bigPotion: { id: 'bigPotion', name: 'Greater Potion', icon: 'assets/icons/items/bigPotion.png', desc: 'Heal 24 HP', price: 45 },
  bomb: { id: 'bomb', name: 'Bomb', icon: 'assets/icons/items/bomb.png', desc: 'Deal 15 damage to enemy', price: 30 },
  antidote: { id: 'antidote', name: 'Antidote', icon: 'assets/icons/items/antidote.png', desc: 'Cure poison, heal 6 HP', price: 15 }
};

// Relics are entirely data-driven: `effect` is a bag of numeric levers that
// applyRelicEffects() below just sums up, so adding new relics never needs
// new code. Universal relics (no `forClass`) can appear for any class; the
// rest are "optimized" for one class and only show up in that class's
// reward choices (see pickRelicChoices in progression.js). All relics here
// are RUN-ONLY - they live in Game.player.relics and are lost on death/new
// run, unlike the separately-purchased permanent bank relics. Each `icon`
// is a real PixelLab-generated image at assets/icons/relics/<id>.png.
const RELICS = {
  luckyCoin: { id: 'luckyCoin', name: 'Lucky Coin', icon: 'assets/icons/relics/luckyCoin.png', desc: '+25% gold from all sources', effect: { goldBonus: 0.25 } },
  ironSkin: { id: 'ironSkin', name: 'Iron Skin Charm', icon: 'assets/icons/relics/ironSkin.png', desc: '+2 DEF', effect: { def: 2 } },
  berserkerHeart: { id: 'berserkerHeart', name: "Berserker's Heart", icon: 'assets/icons/relics/berserkerHeart.png', desc: '+4 ATK, -5 Max HP', effect: { atk: 4, maxHp: -5 } },
  vampiricFang: { id: 'vampiricFang', name: 'Vampiric Fang', icon: 'assets/icons/relics/vampiricFang.png', desc: 'Heal 2 HP whenever you deal damage', effect: { lifesteal: 2 } },
  swiftBoots: { id: 'swiftBoots', name: 'Swift Boots', icon: 'assets/icons/relics/swiftBoots.png', desc: '+3 Speed, better flee odds', effect: { speed: 3 } },
  eagleEye: { id: 'eagleEye', name: "Eagle's Eye", icon: 'assets/icons/relics/eagleEye.png', desc: '+10% critical hit chance', effect: { critBonus: 0.10 } },

  // --- Warrior (10) ---
  ironWillCharm: { id: 'ironWillCharm', name: 'Iron Will Charm', icon: 'assets/icons/relics/ironWillCharm.png', desc: '+3 DEF', forClass: 'warrior', effect: { def: 3 } },
  bloodragePendant: { id: 'bloodragePendant', name: 'Bloodrage Pendant', icon: 'assets/icons/relics/bloodragePendant.png', desc: '+5 ATK, -8 Max HP', forClass: 'warrior', effect: { atk: 5, maxHp: -8 } },
  towerShieldFragment: { id: 'towerShieldFragment', name: 'Tower Shield Fragment', icon: 'assets/icons/relics/towerShieldFragment.png', desc: '+4 DEF, -1 Speed', forClass: 'warrior', effect: { def: 4, speed: -1 } },
  veteransGrit: { id: 'veteransGrit', name: "Veteran's Grit", icon: 'assets/icons/relics/veteransGrit.png', desc: '+10 Max HP', forClass: 'warrior', effect: { maxHp: 10 } },
  weaponmastersWhetstone: { id: 'weaponmastersWhetstone', name: "Weaponmaster's Whetstone", icon: 'assets/icons/relics/weaponmastersWhetstone.png', desc: '+3 ATK', forClass: 'warrior', effect: { atk: 3 } },
  bulwarkTotem: { id: 'bulwarkTotem', name: 'Bulwark Totem', icon: 'assets/icons/relics/bulwarkTotem.png', desc: '+2 DEF, +5 Max HP', forClass: 'warrior', effect: { def: 2, maxHp: 5 } },
  berserkersTusk: { id: 'berserkersTusk', name: "Berserker's Tusk", icon: 'assets/icons/relics/berserkersTusk.png', desc: '+2 ATK, heal 1 HP per round', forClass: 'warrior', effect: { atk: 2, hpRegen: 1 } },
  guardiansOath: { id: 'guardiansOath', name: "Guardian's Oath", icon: 'assets/icons/relics/guardiansOath.png', desc: '+2 DEF, +2 damage vs elites/bosses', forClass: 'warrior', effect: { def: 2, eliteSlayerAtk: 2 } },
  secondWindFlask: { id: 'secondWindFlask', name: 'Second Wind Flask', icon: 'assets/icons/relics/secondWindFlask.png', desc: 'Heal 2 HP per round', forClass: 'warrior', effect: { hpRegen: 2 } },
  juggernautsBoots: { id: 'juggernautsBoots', name: "Juggernaut's Boots", icon: 'assets/icons/relics/juggernautsBoots.png', desc: '+2 Speed, +2 DEF', forClass: 'warrior', effect: { speed: 2, def: 2 } },

  // --- Rogue (10) ---
  shadowstepAmulet: { id: 'shadowstepAmulet', name: 'Shadowstep Amulet', icon: 'assets/icons/relics/shadowstepAmulet.png', desc: '+2 Speed', forClass: 'rogue', effect: { speed: 2 } },
  assassinsEdge: { id: 'assassinsEdge', name: "Assassin's Edge", icon: 'assets/icons/relics/assassinsEdge.png', desc: '+8% critical hit chance', forClass: 'rogue', effect: { critBonus: 0.08 } },
  gildedLockpick: { id: 'gildedLockpick', name: 'Gilded Lockpick', icon: 'assets/icons/relics/gildedLockpick.png', desc: '+10% gold from all sources', forClass: 'rogue', effect: { goldBonus: 0.10 } },
  venomcoatedDagger: { id: 'venomcoatedDagger', name: 'Venom-Coated Dagger', icon: 'assets/icons/relics/venomcoatedDagger.png', desc: '+3 damage vs wounded (<30% HP) enemies', forClass: 'rogue', effect: { executeBonus: 3 } },
  cutpursesLuck: { id: 'cutpursesLuck', name: "Cutpurse's Luck", icon: 'assets/icons/relics/cutpursesLuck.png', desc: '+12% gold from all sources', forClass: 'rogue', effect: { goldBonus: 0.12 } },
  nightstalkersHood: { id: 'nightstalkersHood', name: "Nightstalker's Hood", icon: 'assets/icons/relics/nightstalkersHood.png', desc: '+1 Speed, +5% critical hit chance', forClass: 'rogue', effect: { speed: 1, critBonus: 0.05 } },
  bleedingEdgeBlade: { id: 'bleedingEdgeBlade', name: 'Bleeding Edge Blade', icon: 'assets/icons/relics/bleedingEdgeBlade.png', desc: '+2 ATK, +2 damage vs wounded enemies', forClass: 'rogue', effect: { atk: 2, executeBonus: 2 } },
  silkenGloves: { id: 'silkenGloves', name: 'Silken Gloves', icon: 'assets/icons/relics/silkenGloves.png', desc: '+3 Speed', forClass: 'rogue', effect: { speed: 3 } },
  duelistsFlourish: { id: 'duelistsFlourish', name: "Duelist's Flourish", icon: 'assets/icons/relics/duelistsFlourish.png', desc: '+1 ATK, +5% critical hit chance', forClass: 'rogue', effect: { atk: 1, critBonus: 0.05 } },
  smugglersPouch: { id: 'smugglersPouch', name: "Smuggler's Pouch", icon: 'assets/icons/relics/smugglersPouch.png', desc: '+8% gold from all sources, +3 Max HP', forClass: 'rogue', effect: { goldBonus: 0.08, maxHp: 3 } },

  // --- Mage (10) ---
  arcaneFocusShard: { id: 'arcaneFocusShard', name: 'Arcane Focus Shard', icon: 'assets/icons/relics/arcaneFocusShard.png', desc: '+15% spell damage', forClass: 'mage', effect: { spellPower: 0.15 } },
  emberCoreGem: { id: 'emberCoreGem', name: 'Ember Core Gem', icon: 'assets/icons/relics/emberCoreGem.png', desc: '+10% spell damage, +5% critical hit chance', forClass: 'mage', effect: { spellPower: 0.10, critBonus: 0.05 } },
  frostboundRing: { id: 'frostboundRing', name: 'Frostbound Ring', icon: 'assets/icons/relics/frostboundRing.png', desc: '+2 DEF', forClass: 'mage', effect: { def: 2 } },
  manaWellCharm: { id: 'manaWellCharm', name: 'Mana Well Charm', icon: 'assets/icons/relics/manaWellCharm.png', desc: 'Heal 1 HP per round', forClass: 'mage', effect: { hpRegen: 1 } },
  sorcerersSash: { id: 'sorcerersSash', name: "Sorcerer's Sash", icon: 'assets/icons/relics/sorcerersSash.png', desc: '+10 Max HP', forClass: 'mage', effect: { maxHp: 10 } },
  runeEtchedWand: { id: 'runeEtchedWand', name: 'Rune-Etched Wand', icon: 'assets/icons/relics/runeEtchedWand.png', desc: '+8% spell damage, +1 ATK', forClass: 'mage', effect: { spellPower: 0.08, atk: 1 } },
  arcaneBattery: { id: 'arcaneBattery', name: 'Arcane Battery', icon: 'assets/icons/relics/arcaneBattery.png', desc: '+20% spell damage, -5 Max HP', forClass: 'mage', effect: { spellPower: 0.20, maxHp: -5 } },
  scholarsMonocle: { id: 'scholarsMonocle', name: "Scholar's Monocle", icon: 'assets/icons/relics/scholarsMonocle.png', desc: '+6% critical hit chance', forClass: 'mage', effect: { critBonus: 0.06 } },
  temporalHourglass: { id: 'temporalHourglass', name: 'Temporal Hourglass', icon: 'assets/icons/relics/temporalHourglass.png', desc: '+2 Speed', forClass: 'mage', effect: { speed: 2 } },
  phoenixDownFeather: { id: 'phoenixDownFeather', name: 'Phoenix Down Feather', icon: 'assets/icons/relics/phoenixDownFeather.png', desc: 'Heal 2 HP per round, +5 Max HP', forClass: 'mage', effect: { hpRegen: 2, maxHp: 5 } },

  // --- Paladin (10) ---
  sacredAegis: { id: 'sacredAegis', name: 'Sacred Aegis', icon: 'assets/icons/relics/sacredAegis.png', desc: '+3 DEF', forClass: 'paladin', effect: { def: 3 } },
  lightsBlessing: { id: 'lightsBlessing', name: "Light's Blessing", icon: 'assets/icons/relics/lightsBlessing.png', desc: 'Heal 2 HP per round', forClass: 'paladin', effect: { hpRegen: 2 } },
  holyAvengerShard: { id: 'holyAvengerShard', name: 'Holy Avenger Shard', icon: 'assets/icons/relics/holyAvengerShard.png', desc: '+2 ATK, +2 DEF', forClass: 'paladin', effect: { atk: 2, def: 2 } },
  templarsResolve: { id: 'templarsResolve', name: "Templar's Resolve", icon: 'assets/icons/relics/templarsResolve.png', desc: '+8 Max HP', forClass: 'paladin', effect: { maxHp: 8 } },
  consecratedBand: { id: 'consecratedBand', name: 'Consecrated Band', icon: 'assets/icons/relics/consecratedBand.png', desc: '+15% healing from items', forClass: 'paladin', effect: { potionHealBonus: 0.15 } },
  divineBulwark: { id: 'divineBulwark', name: 'Divine Bulwark', icon: 'assets/icons/relics/divineBulwark.png', desc: '+3 DEF, heal 1 HP per round', forClass: 'paladin', effect: { def: 3, hpRegen: 1 } },
  crusadersFaith: { id: 'crusadersFaith', name: "Crusader's Faith", icon: 'assets/icons/relics/crusadersFaith.png', desc: '+2 damage vs elites/bosses', forClass: 'paladin', effect: { eliteSlayerAtk: 2 } },
  auroraPendant: { id: 'auroraPendant', name: 'Aurora Pendant', icon: 'assets/icons/relics/auroraPendant.png', desc: '+5% spell damage', forClass: 'paladin', effect: { spellPower: 0.05 } },
  oathstoneOfValor: { id: 'oathstoneOfValor', name: 'Oathstone of Valor', icon: 'assets/icons/relics/oathstoneOfValor.png', desc: '+2 ATK', forClass: 'paladin', effect: { atk: 2 } },
  guardianAngelCharm: { id: 'guardianAngelCharm', name: 'Guardian Angel Charm', icon: 'assets/icons/relics/guardianAngelCharm.png', desc: '+6 Max HP, heal 1 HP per round', forClass: 'paladin', effect: { maxHp: 6, hpRegen: 1 } },

  // --- Hunter (10) ---
  eagleEyeLens: { id: 'eagleEyeLens', name: 'Eagle-Eye Lens', icon: 'assets/icons/relics/eagleEyeLens.png', desc: '+6% critical hit chance', forClass: 'hunter', effect: { critBonus: 0.06 } },
  huntersMark: { id: 'huntersMark', name: "Hunter's Mark", icon: 'assets/icons/relics/huntersMark.png', desc: '+3 damage vs wounded (<30% HP) enemies', forClass: 'hunter', effect: { executeBonus: 3 } },
  swiftwindQuiver: { id: 'swiftwindQuiver', name: 'Swiftwind Quiver', icon: 'assets/icons/relics/swiftwindQuiver.png', desc: '+2 Speed', forClass: 'hunter', effect: { speed: 2 } },
  camouflageCloak: { id: 'camouflageCloak', name: 'Camouflage Cloak', icon: 'assets/icons/relics/camouflageCloak.png', desc: '+1 Speed, +1 DEF', forClass: 'hunter', effect: { speed: 1, def: 1 } },
  beastcallersHorn: { id: 'beastcallersHorn', name: "Beastcaller's Horn", icon: 'assets/icons/relics/beastcallersHorn.png', desc: 'Heal 1 HP per round', forClass: 'hunter', effect: { hpRegen: 1 } },
  piercingBroadhead: { id: 'piercingBroadhead', name: 'Piercing Broadhead', icon: 'assets/icons/relics/piercingBroadhead.png', desc: '+2 ATK', forClass: 'hunter', effect: { atk: 2 } },
  trackersInstinct: { id: 'trackersInstinct', name: "Tracker's Instinct", icon: 'assets/icons/relics/trackersInstinct.png', desc: '+2 damage vs wounded enemies, +1 Speed', forClass: 'hunter', effect: { executeBonus: 2, speed: 1 } },
  longshotScope: { id: 'longshotScope', name: 'Longshot Scope', icon: 'assets/icons/relics/longshotScope.png', desc: '+5% critical hit chance, +1 ATK', forClass: 'hunter', effect: { critBonus: 0.05, atk: 1 } },
  quickdrawHolster: { id: 'quickdrawHolster', name: 'Quickdraw Holster', icon: 'assets/icons/relics/quickdrawHolster.png', desc: '+3 Speed', forClass: 'hunter', effect: { speed: 3 } },
  predatorsFocus: { id: 'predatorsFocus', name: "Predator's Focus", icon: 'assets/icons/relics/predatorsFocus.png', desc: '+2 damage vs elites/bosses', forClass: 'hunter', effect: { eliteSlayerAtk: 2 } },

  // --- Warlock (10) ---
  soulsiphonRing: { id: 'soulsiphonRing', name: 'Soulsiphon Ring', icon: 'assets/icons/relics/soulsiphonRing.png', desc: 'Heal 2 HP whenever you deal damage', forClass: 'warlock', effect: { lifesteal: 2 } },
  felboundGrimoire: { id: 'felboundGrimoire', name: 'Felbound Grimoire', icon: 'assets/icons/relics/felboundGrimoire.png', desc: '+12% spell damage', forClass: 'warlock', effect: { spellPower: 0.12 } },
  demonicPact: { id: 'demonicPact', name: 'Demonic Pact', icon: 'assets/icons/relics/demonicPact.png', desc: '+5 ATK, -6 Max HP', forClass: 'warlock', effect: { atk: 5, maxHp: -6 } },
  voidtouchedAmulet: { id: 'voidtouchedAmulet', name: 'Voidtouched Amulet', icon: 'assets/icons/relics/voidtouchedAmulet.png', desc: '+8% spell damage, heal 1 HP on hit', forClass: 'warlock', effect: { spellPower: 0.08, lifesteal: 1 } },
  cursedTome: { id: 'cursedTome', name: 'Cursed Tome', icon: 'assets/icons/relics/cursedTome.png', desc: '+15% spell damage, -3 DEF', forClass: 'warlock', effect: { spellPower: 0.15, def: -3 } },
  bloodwardenSigil: { id: 'bloodwardenSigil', name: 'Bloodwarden Sigil', icon: 'assets/icons/relics/bloodwardenSigil.png', desc: 'Heal 1 HP on hit, +5 Max HP', forClass: 'warlock', effect: { lifesteal: 1, maxHp: 5 } },
  shadowflameCore: { id: 'shadowflameCore', name: 'Shadowflame Core', icon: 'assets/icons/relics/shadowflameCore.png', desc: '+10% spell damage', forClass: 'warlock', effect: { spellPower: 0.10 } },
  impsLoyalty: { id: 'impsLoyalty', name: "Imp's Loyalty", icon: 'assets/icons/relics/impsLoyalty.png', desc: 'Heal 1 HP per round', forClass: 'warlock', effect: { hpRegen: 1 } },
  darkPactBand: { id: 'darkPactBand', name: 'Dark Pact Band', icon: 'assets/icons/relics/darkPactBand.png', desc: 'Heal 2 HP on hit, -2 DEF', forClass: 'warlock', effect: { lifesteal: 2, def: -2 } },
  abyssalFocus: { id: 'abyssalFocus', name: 'Abyssal Focus', icon: 'assets/icons/relics/abyssalFocus.png', desc: '+6% critical hit chance', forClass: 'warlock', effect: { critBonus: 0.06 } },

  // --- Barbarian (10) ---
  raginBloodline: { id: 'raginBloodline', name: 'Raging Bloodline', icon: 'assets/icons/relics/raginBloodline.png', desc: '+4 ATK', forClass: 'barbarian', effect: { atk: 4 } },
  thickHide: { id: 'thickHide', name: 'Thick Hide', icon: 'assets/icons/relics/thickHide.png', desc: '+4 DEF', forClass: 'barbarian', effect: { def: 4 } },
  wardrumTotem: { id: 'wardrumTotem', name: 'War-Drum Totem', icon: 'assets/icons/relics/wardrumTotem.png', desc: '+2 ATK, +5 Max HP', forClass: 'barbarian', effect: { atk: 2, maxHp: 5 } },
  bonecrusherFist: { id: 'bonecrusherFist', name: 'Bonecrusher Fist', icon: 'assets/icons/relics/bonecrusherFist.png', desc: '+3 ATK', forClass: 'barbarian', effect: { atk: 3 } },
  primalScars: { id: 'primalScars', name: 'Primal Scars', icon: 'assets/icons/relics/primalScars.png', desc: '+10 Max HP', forClass: 'barbarian', effect: { maxHp: 10 } },
  howlingRage: { id: 'howlingRage', name: 'Howling Rage', icon: 'assets/icons/relics/howlingRage.png', desc: '+2 ATK, +1 Speed', forClass: 'barbarian', effect: { atk: 2, speed: 1 } },
  ironJawAmulet: { id: 'ironJawAmulet', name: 'Iron Jaw Amulet', icon: 'assets/icons/relics/ironJawAmulet.png', desc: '+3 DEF', forClass: 'barbarian', effect: { def: 3 } },
  bloodfuryTusks: { id: 'bloodfuryTusks', name: 'Bloodfury Tusks', icon: 'assets/icons/relics/bloodfuryTusks.png', desc: 'Heal 2 HP whenever you deal damage', forClass: 'barbarian', effect: { lifesteal: 2 } },
  unbreakableWill: { id: 'unbreakableWill', name: 'Unbreakable Will', icon: 'assets/icons/relics/unbreakableWill.png', desc: '+8 Max HP, +1 DEF', forClass: 'barbarian', effect: { maxHp: 8, def: 1 } },
  avalancheStomp: { id: 'avalancheStomp', name: 'Avalanche Stomp', icon: 'assets/icons/relics/avalancheStomp.png', desc: '+2 damage vs elites/bosses', forClass: 'barbarian', effect: { eliteSlayerAtk: 2 } },

  // --- Cleric (10) ---
  blessedChalice: { id: 'blessedChalice', name: 'Blessed Chalice', icon: 'assets/icons/relics/blessedChalice.png', desc: 'Heal 2 HP per round', forClass: 'cleric', effect: { hpRegen: 2 } },
  sanctifiedShield: { id: 'sanctifiedShield', name: 'Sanctified Shield', icon: 'assets/icons/relics/sanctifiedShield.png', desc: '+3 DEF', forClass: 'cleric', effect: { def: 3 } },
  healersDevotion: { id: 'healersDevotion', name: "Healer's Devotion", icon: 'assets/icons/relics/healersDevotion.png', desc: '+15% healing from items', forClass: 'cleric', effect: { potionHealBonus: 0.15 } },
  radiantHalo: { id: 'radiantHalo', name: 'Radiant Halo', icon: 'assets/icons/relics/radiantHalo.png', desc: '+5 Max HP', forClass: 'cleric', effect: { maxHp: 5 } },
  penitentsChain: { id: 'penitentsChain', name: "Penitent's Chain", icon: 'assets/icons/relics/penitentsChain.png', desc: '+2 DEF, -1 Speed', forClass: 'cleric', effect: { def: 2, speed: -1 } },
  mercyStone: { id: 'mercyStone', name: 'Mercy Stone', icon: 'assets/icons/relics/mercyStone.png', desc: 'Heal 1 HP whenever you deal damage', forClass: 'cleric', effect: { lifesteal: 1 } },
  faithboundLocket: { id: 'faithboundLocket', name: 'Faithbound Locket', icon: 'assets/icons/relics/faithboundLocket.png', desc: '+6 Max HP, heal 1 HP per round', forClass: 'cleric', effect: { maxHp: 6, hpRegen: 1 } },
  templeBell: { id: 'templeBell', name: 'Temple Bell', icon: 'assets/icons/relics/templeBell.png', desc: '+5% spell damage', forClass: 'cleric', effect: { spellPower: 0.05 } },
  serenityBeads: { id: 'serenityBeads', name: 'Serenity Beads', icon: 'assets/icons/relics/serenityBeads.png', desc: '+1 Speed, +2 DEF', forClass: 'cleric', effect: { speed: 1, def: 2 } },
  lastRitesCharm: { id: 'lastRitesCharm', name: 'Last Rites Charm', icon: 'assets/icons/relics/lastRitesCharm.png', desc: '+2 damage vs elites/bosses', forClass: 'cleric', effect: { eliteSlayerAtk: 2 } },

  // --- Bard (10) ---
  luckyLute: { id: 'luckyLute', name: 'Lucky Lute', icon: 'assets/icons/relics/luckyLute.png', desc: '+10% gold from all sources', forClass: 'bard', effect: { goldBonus: 0.10 } },
  minstrelsCharm: { id: 'minstrelsCharm', name: "Minstrel's Charm", icon: 'assets/icons/relics/minstrelsCharm.png', desc: '+5% critical hit chance', forClass: 'bard', effect: { critBonus: 0.05 } },
  silverTongueRing: { id: 'silverTongueRing', name: 'Silver Tongue Ring', icon: 'assets/icons/relics/silverTongueRing.png', desc: '+8% gold from all sources', forClass: 'bard', effect: { goldBonus: 0.08 } },
  dancersSlippers: { id: 'dancersSlippers', name: "Dancer's Slippers", icon: 'assets/icons/relics/dancersSlippers.png', desc: '+2 Speed', forClass: 'bard', effect: { speed: 2 } },
  inspiringBallad: { id: 'inspiringBallad', name: 'Inspiring Ballad', icon: 'assets/icons/relics/inspiringBallad.png', desc: 'Heal 1 HP per round', forClass: 'bard', effect: { hpRegen: 1 } },
  fortunesFavor: { id: 'fortunesFavor', name: "Fortune's Favor", icon: 'assets/icons/relics/fortunesFavor.png', desc: '+12% gold from all sources, -2 DEF', forClass: 'bard', effect: { goldBonus: 0.12, def: -2 } },
  crowdPleaserBand: { id: 'crowdPleaserBand', name: "Crowd-Pleaser's Band", icon: 'assets/icons/relics/crowdPleaserBand.png', desc: '+1 ATK, +5% critical hit chance', forClass: 'bard', effect: { atk: 1, critBonus: 0.05 } },
  wanderersPack: { id: 'wanderersPack', name: "Wanderer's Pack", icon: 'assets/icons/relics/wanderersPack.png', desc: '+5 Max HP, +5% gold from all sources', forClass: 'bard', effect: { maxHp: 5, goldBonus: 0.05 } },
  echoingHarpstring: { id: 'echoingHarpstring', name: 'Echoing Harpstring', icon: 'assets/icons/relics/echoingHarpstring.png', desc: '+6% spell damage', forClass: 'bard', effect: { spellPower: 0.06 } },
  showstoppersFlourish: { id: 'showstoppersFlourish', name: "Showstopper's Flourish", icon: 'assets/icons/relics/showstoppersFlourish.png', desc: '+2 ATK', forClass: 'bard', effect: { atk: 2 } },

  // Not purchasable (no BANK_SHOP.relics entry) and no numeric `effect` -
  // auto-granted the moment any character first reaches max level (see
  // maybeGrantSoulboundEcho, progression.js), and read explicitly inside
  // Game.grantXp (state.js) rather than folded into applyRelicEffects,
  // since sharing XP isn't a stat bonus RELIC_EFFECT_KEYS can express.
  soulboundEcho: { id: 'soulboundEcho', name: 'Soulbound Echo', icon: 'assets/icons/relics/soulboundEcho.png', desc: 'Unlocked by reaching max level on any character. Every character, pet, and mount now also earns 50% of any experience granted elsewhere.' }
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
  chopper: { id: 'chopper', name: 'Chopper', icon: '🐱', universe: 'Original', desc: "A giant grey cat and a renowned doctor. +5% healing from items. In battle: mends a little HP each round it acts.", effect: { potionHealBonus: 0.05 }, role: 'healer' },
  // World Event rewards (see WORLD_EVENTS below) - one-time-ever, account-
  // wide, same idea as the RARE_NPCS/LEGENDARY_TAMINGS signature companions
  // above, just earned by letting an event play out instead of a fight.
  witherbarkSprite: { id: 'witherbarkSprite', name: 'Witherbark Sprite', icon: '🍂', universe: 'Original', desc: "Born from a dying tree's last breath. +5% critical hit chance, +2 ATK.", effect: { critBonus: 0.05, atk: 2 } },
  cinderWhelp: { id: 'cinderWhelp', name: 'Cinder Whelp', icon: '🥚', universe: 'Original', desc: "Hatched from a volcano's own ember. +5% spell damage, +1 ATK.", effect: { spellPower: 0.05, atk: 1 } },
  emeraldSapling: { id: 'emeraldSapling', name: 'Emerald Sapling', icon: '🌱', universe: 'Original', desc: 'A living seedling from a vale left to overgrow. +2 hp regen per round, +4 Max HP.', effect: { hpRegen: 2, maxHp: 4 } },
  frostwyrmling: { id: 'frostwyrmling', name: 'Frostwyrmling', icon: '🥶', universe: 'Original', desc: 'A wyrm hatchling, woken early from centuries of ice. +2 DEF, +5 Max HP.', effect: { def: 2, maxHp: 5 } }
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
const SIGNATURE_PET_IDS = new Set(['ryker', 'landryDuckling', 'monkey', 'chopper', 'witherbarkSprite', 'cinderWhelp', 'emeraldSapling', 'frostwyrmling']);
const SIGNATURE_MOUNT_IDS = new Set(['izzoCorvette', 'robin', 'murkfenDireleech', 'felstrider', 'starlitHawkstrider', 'shadowmaneCharger', 'voidstrider']);

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
  robin: { id: 'robin', name: 'Robin', icon: '🐕', universe: 'Original', desc: 'A giant brindle pitbull, sweet as often as vicious. +3 ATK, +3 DEF.', effect: { atk: 3, def: 3 } },
  // World Event rewards - see the note above PETS' equivalent entries.
  murkfenDireleech: { id: 'murkfenDireleech', name: 'Murkfen Direleech', icon: '🪱', universe: 'Original', desc: 'A bloated swamp leech grown mount-sized, gorged on old magic. Heal 2 HP whenever you deal damage, +6 Max HP.', effect: { lifesteal: 2, maxHp: 6 } },
  felstrider: { id: 'felstrider', name: 'Felstrider', icon: '🐐', universe: 'Original', desc: 'A demonic steed pulled through a widening rift. +4 ATK, +1 Speed.', effect: { atk: 4, speed: 1 } },
  starlitHawkstrider: { id: 'starlitHawkstrider', name: 'Starlit Hawkstrider', icon: '🦩', universe: 'Original', desc: 'A hawkstrider touched by wild arcane overflow. +3 Speed, +3% critical hit chance.', effect: { speed: 3, critBonus: 0.03 } },
  shadowmaneCharger: { id: 'shadowmaneCharger', name: 'Shadowmane Charger', icon: '🐴', universe: 'Original', desc: 'A warhorse bound by a completed dark ritual. +3 ATK, +2 DEF.', effect: { atk: 3, def: 2 } },
  voidstrider: { id: 'voidstrider', name: 'Voidstrider', icon: '🦑', universe: 'Original', desc: 'A creature of the Twisting Nether, given form by a widening tear. +2 ATK, +2 DEF, +1 Speed.', effect: { atk: 2, def: 2, speed: 1 } }
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

// --- World Events ---
// A one-per-act, zone-themed encounter (see NODE_TYPES.worldEvent in
// map.js and enterWorldEvent in main.js) - a single large decision, not a
// fight. Each zone has 3 potential events (WORLD_EVENTS[zoneId] is an
// array); one is picked at random when the node is visited. `prevent`
// stops the event and only grants reputation, no loot; `allow` lets it
// play out and grants a unique, never-randomly-found title (see the
// matching TITLES entry named by `titleKey`) plus a pet or mount. The
// first event per zone rewards one of the 9 signature World Event
// companions (see PETS/MOUNTS above); the other two reuse an existing
// wild pet/mount reward instead of inventing a new creature for every
// single event - still a real, useful reward, just not exclusive art.
// Art lives at assets/sprites/events/<artKey>_idle.png (+ _anim_0..5 frames
// looped ambiently) - see WORLD_EVENT_ART in sprites.js; `artKey` matches
// the zone id for each zone's first event (pre-existing art) and
// `<zoneId>_2` / `<zoneId>_3` for the two new ones.
const WORLD_EVENTS = {
  forest: [
    {
      artKey: 'forest', titleKey: 'we_forest',
      name: 'The Withering Elder',
      flavor: "Elderglen's oldest tree - vast enough to have its own weather - has begun to blacken and wither from the inside out, as if something ancient within it is finally dying. The forest around it has gone completely silent.",
      preventLabel: 'Perform the old rite to save it',
      allowLabel: 'Let the old tree fall',
      allowFlavor: 'The tree groans and comes down like a mountain collapsing, root-hollows exhaling centuries of dust. Something small and withered crawls free of the wreckage and looks up at you.',
      rewardKind: 'pet', rewardId: 'witherbarkSprite'
    },
    {
      artKey: 'forest_2', titleKey: 'we_forest_2',
      name: 'The Migrating Herd',
      flavor: "A herd of massive antlered beasts has broken from its ancient migration path, stampeding straight toward a druid grove that's stood undisturbed for a thousand years.",
      preventLabel: 'Redirect the herd around the grove',
      allowLabel: 'Let the herd run its course',
      allowFlavor: "The grove is flattened in minutes, centuries of growth gone in a single thundering pass. In the churned-up earth left behind, a young wolf pup - separated from its own pack somewhere in the chaos - trots up and refuses to leave your side.",
      rewardKind: 'pet', rewardId: 'direwolfPup'
    },
    {
      artKey: 'forest_3', titleKey: 'we_forest_3',
      name: 'The Singing Grove',
      flavor: 'A stand of trees near the road has begun singing in a low, wordless harmony, and every traveler who hears it seems to wander a little closer, a little more willing to stay forever.',
      preventLabel: 'Silence the grove',
      allowLabel: 'Let the song play on',
      allowFlavor: "You stay and listen until the song finally ends on its own, hours later. Where you stood, the grass is worn away in a perfect circle - and a small winged shape, drawn by the same song, has been waiting there with you the whole time.",
      rewardKind: 'pet', rewardId: 'pixieSprite'
    }
  ],
  swamp: [
    {
      artKey: 'swamp', titleKey: 'we_swamp',
      name: 'The Sunken Idol',
      flavor: "A bloated, half-sunk idol in the deepest part of the Murkfen has begun to glow a sick green, and every creature in the swamp has gone still, gathering around it in a silence that feels deliberate.",
      preventLabel: 'Shatter the idol',
      allowLabel: 'Let the ritual complete',
      allowFlavor: 'The glow collapses inward with a sound like a held breath finally released. The muck around the idol churns, and something enormous and leech-like surfaces, docile, and looks to you as if waiting for orders.',
      rewardKind: 'mount', rewardId: 'murkfenDireleech'
    },
    {
      artKey: 'swamp_2', titleKey: 'we_swamp_2',
      name: 'The Drowned Caravan',
      flavor: "A merchant caravan sank into the bog decades ago, and tonight its ghostly occupants have resurfaced, still hawking wares that dissolve into mud the moment coin changes hands.",
      preventLabel: 'Lay the drowned merchants to rest',
      allowLabel: 'Loot the drowned caravan',
      allowFlavor: "The ghosts scatter into mist the instant you touch their cargo, but the crates themselves are real enough. Half-sunk in the wreckage, something huge and armored trudges free of the muck - a beast of burden nobody thought to claim.",
      rewardKind: 'mount', rewardId: 'warKodo'
    },
    {
      artKey: 'swamp_3', titleKey: 'we_swamp_3',
      name: 'The Croaking Chorus',
      flavor: 'Every frog in the Murkfen has begun croaking in perfect, eerie unison, a rhythm that feels less like nature and more like a summons older than the swamp itself.',
      preventLabel: 'Break up the chorus',
      allowLabel: 'Let the chorus finish',
      allowFlavor: "The croaking builds to a single sustained note, then stops all at once - and the silence afterward is somehow louder. A shelled shape that had been keeping perfect time with its own shell throughout wanders over once the ritual ends.",
      rewardKind: 'pet', rewardId: 'ironshellTortle'
    }
  ],
  desert: [
    {
      artKey: 'desert', titleKey: 'we_desert',
      name: 'The Rumbling Peak',
      flavor: 'A volcano at the edge of the Sunscar Wastes has started rumbling, ash sifting down over a village built too close to its base. The villagers are already arguing about whether to run.',
      preventLabel: 'Climb up and stop the eruption',
      allowLabel: 'Let it erupt',
      allowFlavor: 'The mountain splits open in a column of fire and ash, the village below gone within minutes. In the cooling black rock at the crater\'s lip, something small stirs and cracks its way out of a heat-blackened egg.',
      rewardKind: 'pet', rewardId: 'cinderWhelp'
    },
    {
      artKey: 'desert_2', titleKey: 'we_desert_2',
      name: 'The Buried City',
      flavor: "A sandstorm has scoured away centuries of dunes overnight, revealing the spire of an entire city that shouldn't be there - one no map has ever recorded.",
      preventLabel: 'Let the sands reclaim it',
      allowLabel: 'Excavate the buried city',
      allowFlavor: "You dig for hours before the wind picks back up, threatening to bury it all again by morning - but not before something fast and ghostly-striped slips out of the ruins, keeping perfect pace with you across the sand.",
      rewardKind: 'mount', rewardId: 'spectralTiger'
    },
    {
      artKey: 'desert_3', titleKey: 'we_desert_3',
      name: 'The Mirage Caravan',
      flavor: 'A trade caravan shimmers on the horizon, close enough to make out individual merchants and far enough that it never seems to get any closer - offering deals too good to be real.',
      preventLabel: 'Warn nearby travelers away from the mirage',
      allowLabel: 'Trade with the mirage',
      allowFlavor: "You walk toward it for what feels like an hour and arrive in a single step, the merchants real enough to haggle with after all. One of them presses a parting gift into your hands before the whole caravan fades - a watchful, wide-eyed companion.",
      rewardKind: 'pet', rewardId: 'owlFamiliar'
    }
  ],
  hellfire: [
    {
      artKey: 'hellfire', titleKey: 'we_hellfire',
      name: 'The Widening Rift',
      flavor: 'A tear to the Shattered Hellscape\'s demonic depths has torn open beside a refugee camp, fel-green light spilling across the sand and something enormous breathing on the other side.',
      preventLabel: 'Seal the rift',
      allowLabel: 'Let it widen',
      allowFlavor: "The rift tears open fully, and the refugees scatter into the dunes. From the widening dark, something four-legged and burning steps through, and - unexpectedly - kneels.",
      rewardKind: 'mount', rewardId: 'felstrider'
    },
    {
      artKey: 'hellfire_2', titleKey: 'we_hellfire_2',
      name: 'The Ashen Choir',
      flavor: 'A cluster of fel-touched refugees has begun chanting in unnerving unison, their voices layering into something with far too many harmonies for the number of throats present.',
      preventLabel: 'Break the chant',
      allowLabel: 'Let the choir finish',
      allowFlavor: "The chant crescendos into a single unbroken tone that seems to come from everywhere at once, then cuts to silence. Something small, horned, and grinning steps out of the ash left behind, entirely unbothered by the whole affair.",
      rewardKind: 'pet', rewardId: 'impFamiliar'
    },
    {
      artKey: 'hellfire_3', titleKey: 'we_hellfire_3',
      name: 'The Bonepyre',
      flavor: 'A mountain of bleached bones at the wasteland\'s edge has begun to smolder from within, fragments knitting themselves together into something that hasn\'t decided what it wants to be yet.',
      preventLabel: 'Scatter the bonepyre',
      allowLabel: 'Let it reassemble',
      allowFlavor: 'The bones finish their slow climb into a shape too large and too fast to be anything born naturally - and then, impossibly, it lowers its burning head for a saddle.',
      rewardKind: 'mount', rewardId: 'nightmareSteed'
    }
  ],
  emerald: [
    {
      artKey: 'emerald', titleKey: 'we_emerald',
      name: 'The Overgrowing Vale',
      flavor: "A single seedling in the Emerald Dream has begun blooming at an impossible speed, vines already swallowing the vale around it whole, threatening to bury it entirely by nightfall.",
      preventLabel: "Contain the seedling's growth",
      allowLabel: 'Let the vale be consumed',
      allowFlavor: "By morning the vale is gone entirely, replaced by a forest that shouldn't exist yet. At its heart, one small sapling pulls its roots free of the ground to walk alongside you.",
      rewardKind: 'pet', rewardId: 'emeraldSapling'
    },
    {
      artKey: 'emerald_2', titleKey: 'we_emerald_2',
      name: 'The Sleeping Titan',
      flavor: "A hill that has never once moved in living memory has begun to breathe, slow and enormous, an ancient nature-spirit stirring for the first time in an age.",
      preventLabel: 'Sing the titan back to sleep',
      allowLabel: 'Wake the titan',
      allowFlavor: "The hill rises fully, shedding centuries of soil and root, and looks down at you with something like curiosity before settling back into a smaller, calmer shape. Perched on its shoulder the whole time, unbothered, an owlbeast chick blinks awake with it.",
      rewardKind: 'pet', rewardId: 'moonkinHatchling'
    },
    {
      artKey: 'emerald_3', titleKey: 'we_emerald_3',
      name: 'The Dreaming Pool',
      flavor: 'A still pool deep in the Dream has begun reflecting visions of a world that almost - but not quite - matches the one you\'re standing in.',
      preventLabel: 'Seal the pool',
      allowLabel: 'Step into the dream',
      allowFlavor: "The reflection swallows you whole for a heartbeat that feels like hours, and when you surface, gasping, something small, prismatic, and delighted has followed you back out.",
      rewardKind: 'pet', rewardId: 'faerieDragonling'
    }
  ],
  silvermoon: [
    {
      artKey: 'silvermoon', titleKey: 'we_silvermoon',
      name: 'The Unstable Spire',
      flavor: "One of Silvermoon's arcane spires has gone unstable, arcing raw magic into the sky in wild, colorful bursts that are starting to draw a very nervous crowd below.",
      preventLabel: 'Stabilize the spire',
      allowLabel: 'Let it overload',
      allowFlavor: 'The spire discharges everything at once in a silent, blinding flash, arcane fire raining harmlessly down as light rather than flame. Something feathered and glowing drifts down out of it and lands near your feet, waiting.',
      rewardKind: 'mount', rewardId: 'starlitHawkstrider'
    },
    {
      artKey: 'silvermoon_2', titleKey: 'we_silvermoon_2',
      name: 'The Floating Archive',
      flavor: "A library has come unmoored from its own foundations and is drifting slowly skyward, shelves and scrolls trailing loose behind it like a ship dragging its anchor chain.",
      preventLabel: 'Tether the archive back down',
      allowLabel: 'Loot its secrets before it drifts away',
      allowFlavor: "You climb aboard and grab everything you can carry before the archive rises out of reach for good. A small clockwork creature, dislodged from its post as a shelf-tender, rides down with you rather than be left behind.",
      rewardKind: 'pet', rewardId: 'mechanicalSquirrel'
    },
    {
      artKey: 'silvermoon_3', titleKey: 'we_silvermoon_3',
      name: 'The Mirrored Duel',
      flavor: "A tall standing mirror in the plaza has begun producing a perfect magical duplicate of any champion who stands before it, and the duplicate is currently challenging everyone in sight.",
      preventLabel: 'Shatter the mirror',
      allowLabel: 'Let the duel happen',
      allowFlavor: "The duplicate fights with everything you have and none of your restraint, and the crowd loves every second of it. When the mirror finally cracks from the strain, a proud, feathered mount steps out of the shards as if it had been waiting its whole life for an entrance.",
      rewardKind: 'mount', rewardId: 'griffonMount'
    }
  ],
  blacktemple: [
    {
      artKey: 'blacktemple', titleKey: 'we_blacktemple',
      name: 'The Forbidden Circle',
      flavor: 'A ritual circle beneath the Black Bastion has been uncovered mid-ceremony, still humming with the kind of power that makes torches gutter and shadows stretch the wrong direction.',
      preventLabel: 'Destroy the circle',
      allowLabel: 'Let the ritual complete',
      allowFlavor: 'The circle flares black, then goes dark and cold all at once. Where its center burned brightest, a warhorse stands wreathed in shadow, utterly silent, utterly yours.',
      rewardKind: 'mount', rewardId: 'shadowmaneCharger'
    },
    {
      artKey: 'blacktemple_2', titleKey: 'we_blacktemple_2',
      name: 'The Weeping Statues',
      flavor: 'Every stone statue in the Bastion\'s lower halls has begun weeping thick black tears at once, an ill omen even by this place\'s usual standards.',
      preventLabel: 'Cleanse the statues',
      allowLabel: 'Collect the tears',
      allowFlavor: "The tears pool into a single dark vial by the time you're done collecting, and the statues fall still and dry again as if nothing happened. Something low and horned, drawn by the smell of old grief, has been trailing the puddles the whole time.",
      rewardKind: 'pet', rewardId: 'direhornRaptor'
    },
    {
      artKey: 'blacktemple_3', titleKey: 'we_blacktemple_3',
      name: 'The Hollow Choir',
      flavor: 'Ghostly monks have filled an abandoned chapel with a slow, layered chant, calling toward something on the other side of the Bastion\'s walls that hasn\'t answered yet.',
      preventLabel: 'Silence the choir',
      allowLabel: 'Join the chant',
      allowFlavor: "Your voice joins theirs and the chant finally resolves into something almost like a name. The monks fade with the dawn, but a small, curious dragon-kin - drawn in by the sound - stays behind long after they're gone.",
      rewardKind: 'pet', rewardId: 'pseudodragon'
    }
  ],
  northrend: [
    {
      artKey: 'northrend', titleKey: 'we_northrend',
      name: 'The Cracking Glacier',
      flavor: "An ancient wyrm frozen deep in Northrend's ice has begun to stir, spiderweb cracks spreading across the glacier above it with every slow, freezing breath.",
      preventLabel: 'Re-freeze the glacier',
      allowLabel: 'Let it wake',
      allowFlavor: 'The glacier shatters outward in a wave of frost. What claws its way free is far smaller than the cracks suggested - barely more than a hatchling, blinking up at the sun for the first time in centuries.',
      rewardKind: 'pet', rewardId: 'frostwyrmling'
    },
    {
      artKey: 'northrend_2', titleKey: 'we_northrend_2',
      name: 'The Frozen Legion',
      flavor: "An entire army lies perfectly preserved beneath the ice, frost-armor still gleaming after centuries - and something is beginning, slowly, to thaw them.",
      preventLabel: 'Re-freeze the legion',
      allowLabel: 'Let them thaw',
      allowFlavor: "The ice groans and gives way row by row, but whatever animated the legion left it centuries ago - they crumble to frost the moment they're free. Only one loyal war-wolf, bonded too deep to fully fade, digs itself out and lives.",
      rewardKind: 'mount', rewardId: 'frostwolfMount'
    },
    {
      artKey: 'northrend_3', titleKey: 'we_northrend_3',
      name: 'The Aurora Rift',
      flavor: "The northern lights overhead have torn open into something that clearly isn't light at all - a rift shot through with colors that have no names.",
      preventLabel: 'Close the rift',
      allowLabel: 'Step through',
      allowFlavor: "You step through and back in what feels like seconds but leaves frost in your hair regardless. Something with wings woven from the same impossible colors follows you back out before the rift seals itself shut.",
      rewardKind: 'mount', rewardId: 'hippogriffMount'
    }
  ],
  nether: [
    {
      artKey: 'nether', titleKey: 'we_nether',
      name: 'The Tear in Reality',
      flavor: 'A tear in the Twisting Nether itself has opened without warning, void-touched shapes drifting through the gap and dissolving into the air like ink in water.',
      preventLabel: 'Close the tear',
      allowLabel: 'Let it widen',
      allowFlavor: 'The tear yawns fully open, and for one long moment the sky itself seems to hold its breath. Then it snaps shut - and something that was never quite there to begin with remains behind, waiting on you.',
      rewardKind: 'mount', rewardId: 'voidstrider'
    },
    {
      artKey: 'nether_2', titleKey: 'we_nether_2',
      name: 'The Drifting Fleet',
      flavor: 'A ghostly armada drifts silent through the void nearby, sails full of a wind that doesn\'t exist, crewed by shapes that never quite resolve into faces.',
      preventLabel: 'Guide the fleet to rest',
      allowLabel: 'Board the fleet',
      allowFlavor: "You walk the drifting decks until dawn - or whatever passes for it out here - and the fleet dissolves around you plank by plank as the void reclaims it. One drake, apparently native to these currents, stays behind and lets you approach.",
      rewardKind: 'mount', rewardId: 'netherdrake'
    },
    {
      artKey: 'nether_3', titleKey: 'we_nether_3',
      name: 'The Star-Eaten Sky',
      flavor: 'Stars are vanishing overhead one by one, swallowed by something vast, patient, and utterly silent moving through the space between them.',
      preventLabel: 'Drive it away',
      allowLabel: 'Witness the devouring',
      allowFlavor: "You watch until the last star in view winks out, and the silence afterward is the loudest thing you've ever heard. When it finally passes on, a single small dragon whelp - spat out rather than swallowed - tumbles down out of the dark toward you.",
      rewardKind: 'pet', rewardId: 'dragonWhelpling'
    }
  ]
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

// --- Reputation Shop ---
// One curated 4-item vendor per zone (see ACT_THEMES) - a weapon, a piece
// of armor, a pet, and a mount, each gated behind a reputation tier (see
// REPUTATION_TIERS) on top of its gold cost, escalating rep tier by tier
// (weapon at Friendly, armor at Honored, pet at Revered, mount as the
// Exalted capstone - the priciest, most prestigious item, same convention
// real faction vendors use). Reuses the existing hand-authored gear
// templates and the wild pet/mount pools rather than inventing
// zone-exclusive items, so every reward is a real, equippable item - later
// zones offer higher rarity as the run's own gear power scales up.
const REPUTATION_SHOP = {
  forest: [
    { type: 'gear', defId: 'huntersBow', rarity: 'rare', repTier: 1, price: 150 },
    { type: 'gear', defId: 'leatherVest', rarity: 'rare', repTier: 2, price: 180 },
    { type: 'pet', id: 'direwolfPup', repTier: 3, price: 320 },
    { type: 'mount', id: 'hippogriffMount', repTier: 4, price: 550 }
  ],
  swamp: [
    { type: 'gear', defId: 'ironSword', rarity: 'rare', repTier: 1, price: 165 },
    { type: 'gear', defId: 'chainmail', rarity: 'rare', repTier: 2, price: 195 },
    { type: 'pet', id: 'ironshellTortle', repTier: 3, price: 340 },
    { type: 'mount', id: 'warKodo', repTier: 4, price: 580 }
  ],
  desert: [
    { type: 'gear', defId: 'steelGreataxe', rarity: 'rare', repTier: 1, price: 180 },
    { type: 'gear', defId: 'clothRobe', rarity: 'rare', repTier: 2, price: 210 },
    { type: 'pet', id: 'direhornRaptor', repTier: 3, price: 360 },
    { type: 'mount', id: 'spectralTiger', repTier: 4, price: 610 }
  ],
  hellfire: [
    { type: 'gear', defId: 'steelGreataxe', rarity: 'epic', repTier: 1, price: 200 },
    { type: 'gear', defId: 'plateArmor', rarity: 'epic', repTier: 2, price: 230 },
    { type: 'pet', id: 'impFamiliar', repTier: 3, price: 380 },
    { type: 'mount', id: 'nightmareSteed', repTier: 4, price: 640 }
  ],
  emerald: [
    { type: 'gear', defId: 'runedStaff', rarity: 'epic', repTier: 1, price: 210 },
    { type: 'gear', defId: 'clothRobe', rarity: 'epic', repTier: 2, price: 240 },
    { type: 'pet', id: 'moonkinHatchling', repTier: 3, price: 400 },
    { type: 'mount', id: 'unicornMount', repTier: 4, price: 670 }
  ],
  silvermoon: [
    { type: 'gear', defId: 'runedStaff', rarity: 'epic', repTier: 1, price: 220 },
    { type: 'gear', defId: 'clothRobe', rarity: 'epic', repTier: 2, price: 250 },
    { type: 'pet', id: 'pseudodragon', repTier: 3, price: 420 },
    { type: 'mount', id: 'griffonMount', repTier: 4, price: 700 }
  ],
  blacktemple: [
    { type: 'gear', defId: 'rustedBlade', rarity: 'legendary', repTier: 1, price: 230 },
    { type: 'gear', defId: 'plateArmor', rarity: 'legendary', repTier: 2, price: 260 },
    { type: 'pet', id: 'faerieDragonling', repTier: 3, price: 440 },
    { type: 'mount', id: 'nightmareSteed', repTier: 4, price: 730 }
  ],
  northrend: [
    { type: 'gear', defId: 'ironSword', rarity: 'legendary', repTier: 1, price: 240 },
    { type: 'gear', defId: 'plateArmor', rarity: 'legendary', repTier: 2, price: 270 },
    { type: 'pet', id: 'dragonWhelpling', repTier: 3, price: 460 },
    { type: 'mount', id: 'frostwolfMount', repTier: 4, price: 760 }
  ],
  nether: [
    { type: 'gear', defId: 'huntersBow', rarity: 'legendary', repTier: 1, price: 250 },
    { type: 'gear', defId: 'chainmail', rarity: 'legendary', repTier: 2, price: 280 },
    { type: 'pet', id: 'owlFamiliar', repTier: 3, price: 480 },
    { type: 'mount', id: 'netherdrake', repTier: 4, price: 800 }
  ]
};

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
  pvp_grandMarshal: { name: 'Grand Marshal', position: 'prefix', source: 'Win 60 PvP matches', effect: { atk: 4, def: 3, critBonus: 0.03 }, check: () => (Persistent.load().pvpWinsTotal || 0) >= 60 },

  // World Event titles - granted the moment that specific event is let
  // play out (see resolveWorldEventAllow in main.js, which pushes the
  // event's own titleKey into pdata.worldEventTitlesEarned). Never
  // re-earnable if declined or prevented - each event only offers this
  // once, ever. Each zone has 3 possible events (WORLD_EVENTS in data.js),
  // so 3 titles per zone below.
  we_forest: { name: 'the Elderfallen', position: 'suffix', source: 'Let the Withering Elder fall (Elderglen Forest World Event)', effect: { hpRegen: 1 }, check: () => Persistent.load().worldEventTitlesEarned.includes('we_forest') },
  we_forest_2: { name: 'the Trampled Path', position: 'suffix', source: 'Let the Migrating Herd run its course (Elderglen Forest World Event)', effect: { speed: 1 }, check: () => Persistent.load().worldEventTitlesEarned.includes('we_forest_2') },
  we_forest_3: { name: 'the Grove-Touched', position: 'suffix', source: 'Listen to the Singing Grove (Elderglen Forest World Event)', effect: { critBonus: 0.01 }, check: () => Persistent.load().worldEventTitlesEarned.includes('we_forest_3') },
  we_swamp: { name: 'the Bogsworn', position: 'suffix', source: 'Let the Sunken Idol\'s ritual complete (Murkfen Swamp World Event)', effect: { lifesteal: 1 }, check: () => Persistent.load().worldEventTitlesEarned.includes('we_swamp') },
  we_swamp_2: { name: 'the Bogpicker', position: 'suffix', source: 'Loot the Drowned Caravan (Murkfen Swamp World Event)', effect: { goldBonus: 0.02 }, check: () => Persistent.load().worldEventTitlesEarned.includes('we_swamp_2') },
  we_swamp_3: { name: 'the Frogsong', position: 'suffix', source: 'Let the Croaking Chorus finish (Murkfen Swamp World Event)', effect: { def: 1 }, check: () => Persistent.load().worldEventTitlesEarned.includes('we_swamp_3') },
  we_desert: { name: 'the Ashbringer', position: 'suffix', source: 'Let the Rumbling Peak erupt (Sunscar Wastes World Event)', effect: { spellPower: 0.01 }, check: () => Persistent.load().worldEventTitlesEarned.includes('we_desert') },
  we_desert_2: { name: 'the Sanddigger', position: 'suffix', source: 'Excavate the Buried City (Sunscar Wastes World Event)', effect: { atk: 1, speed: 1 }, check: () => Persistent.load().worldEventTitlesEarned.includes('we_desert_2') },
  we_desert_3: { name: 'the Mirage-Walker', position: 'suffix', source: 'Trade with the Mirage Caravan (Sunscar Wastes World Event)', effect: { goldBonus: 0.02 }, check: () => Persistent.load().worldEventTitlesEarned.includes('we_desert_3') },
  we_hellfire: { name: 'the Doomherald', position: 'suffix', source: 'Let the Widening Rift tear open (Shattered Hellscape World Event)', effect: { atk: 1 }, check: () => Persistent.load().worldEventTitlesEarned.includes('we_hellfire') },
  we_hellfire_2: { name: 'the Ashen Voice', position: 'suffix', source: 'Let the Ashen Choir finish (Shattered Hellscape World Event)', effect: { spellPower: 0.01 }, check: () => Persistent.load().worldEventTitlesEarned.includes('we_hellfire_2') },
  we_hellfire_3: { name: "the Bonepyre's Kin", position: 'suffix', source: 'Let the Bonepyre reassemble (Shattered Hellscape World Event)', effect: { atk: 1, def: 1 }, check: () => Persistent.load().worldEventTitlesEarned.includes('we_hellfire_3') },
  we_emerald: { name: 'the Wildsower', position: 'suffix', source: 'Let the Overgrowing Vale be consumed (Emerald Dream World Event)', effect: { maxHp: 6 }, check: () => Persistent.load().worldEventTitlesEarned.includes('we_emerald') },
  we_emerald_2: { name: 'the Titan-Waker', position: 'suffix', source: 'Wake the Sleeping Titan (Emerald Dream World Event)', effect: { maxHp: 5, def: 1 }, check: () => Persistent.load().worldEventTitlesEarned.includes('we_emerald_2') },
  we_emerald_3: { name: 'the Dream-Walker', position: 'suffix', source: 'Step into the Dreaming Pool (Emerald Dream World Event)', effect: { hpRegen: 1, spellPower: 0.01 }, check: () => Persistent.load().worldEventTitlesEarned.includes('we_emerald_3') },
  we_silvermoon: { name: 'the Spireshatterer', position: 'suffix', source: 'Let the Unstable Spire overload (Silvermoon Spires World Event)', effect: { critBonus: 0.01 }, check: () => Persistent.load().worldEventTitlesEarned.includes('we_silvermoon') },
  we_silvermoon_2: { name: 'the Archive-Keeper', position: 'suffix', source: 'Loot the Floating Archive (Silvermoon Spires World Event)', effect: { spellPower: 0.01 }, check: () => Persistent.load().worldEventTitlesEarned.includes('we_silvermoon_2') },
  we_silvermoon_3: { name: 'the Mirror-Breaker', position: 'suffix', source: 'Let the Mirrored Duel happen (Silvermoon Spires World Event)', effect: { atk: 1, critBonus: 0.01 }, check: () => Persistent.load().worldEventTitlesEarned.includes('we_silvermoon_3') },
  we_blacktemple: { name: 'the Ritualbound', position: 'suffix', source: 'Let the Forbidden Circle complete (The Black Bastion World Event)', effect: { def: 1 }, check: () => Persistent.load().worldEventTitlesEarned.includes('we_blacktemple') },
  we_blacktemple_2: { name: 'the Tear-Collector', position: 'suffix', source: 'Collect the Weeping Statues\' tears (The Black Bastion World Event)', effect: { lifesteal: 1 }, check: () => Persistent.load().worldEventTitlesEarned.includes('we_blacktemple_2') },
  we_blacktemple_3: { name: 'the Hollow Voice', position: 'suffix', source: 'Join the Hollow Choir (The Black Bastion World Event)', effect: { spellPower: 0.01, def: 1 }, check: () => Persistent.load().worldEventTitlesEarned.includes('we_blacktemple_3') },
  we_northrend: { name: 'the Glacierwaker', position: 'suffix', source: 'Let the Cracking Glacier wake (Northrend Wastes World Event)', effect: { def: 1, maxHp: 3 }, check: () => Persistent.load().worldEventTitlesEarned.includes('we_northrend') },
  we_northrend_2: { name: 'the Legion-Waker', position: 'suffix', source: 'Let the Frozen Legion thaw (Northrend Wastes World Event)', effect: { atk: 1, def: 1 }, check: () => Persistent.load().worldEventTitlesEarned.includes('we_northrend_2') },
  we_northrend_3: { name: 'the Aurora-Touched', position: 'suffix', source: 'Step through the Aurora Rift (Northrend Wastes World Event)', effect: { speed: 1, critBonus: 0.01 }, check: () => Persistent.load().worldEventTitlesEarned.includes('we_northrend_3') },
  we_nether: { name: 'the Voidtouched', position: 'suffix', source: 'Let the Tear in Reality widen (The Twisting Nether World Event)', effect: { speed: 1 }, check: () => Persistent.load().worldEventTitlesEarned.includes('we_nether') },
  we_nether_2: { name: 'the Fleet-Walker', position: 'suffix', source: 'Board the Drifting Fleet (The Twisting Nether World Event)', effect: { maxHp: 4, speed: 1 }, check: () => Persistent.load().worldEventTitlesEarned.includes('we_nether_2') },
  we_nether_3: { name: 'the Star-Eaten', position: 'suffix', source: 'Witness the Star-Eaten Sky (The Twisting Nether World Event)', effect: { spellPower: 0.01, maxHp: 3 }, check: () => Persistent.load().worldEventTitlesEarned.includes('we_nether_3') }
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

// Cross-run rarity gate shared by World Event, Witch Jess, and every named
// Rare NPC (see generateMap in map.js and enterRareNpc in main.js) - each
// keeps its OWN cooldown (keyed by whatever string the caller passes: e.g.
// 'worldEvent', 'witchJess', or a RARE_NPCS id) rather than sharing one, so
// a lucky run can still surface several at once. `ready` just compares run
// numbers; `markSeen` is called once the encounter is actually placed on
// the map (generation time, same convention Game.worldEventPlacedThisRun
// already used), not when the player happens to walk there.
function isRareEncounterReady(key, cooldownRuns) {
  const pdata = Persistent.load();
  const last = pdata.rareEncounterLastRun[key];
  return last === undefined || (pdata.totalRunsStarted - last) >= cooldownRuns;
}
function markRareEncounterSeen(key) {
  const pdata = Persistent.load();
  pdata.rareEncounterLastRun[key] = pdata.totalRunsStarted;
  Persistent.save();
}

// --- Rare NPC encounters (see enterRareNpc in main.js) ---
// Gated by isRareEncounterReady (5-run cooldown per NPC, see generateMap) -
// each NPC always hands out their OWN signature named reward (a
// LEGENDARY_ITEMS weapon/armor, or a
// SIGNATURE_PET_IDS/SIGNATURE_MOUNT_IDS companion), never a random roll. A
// portrait (assets/sprites/<portrait>.png) and a line of flavor stand in for
// the multi-step taming/shop flow those other rare encounters use - this one
// is simpler: meet them, take what they offer, move on.
const RARE_NPCS = {
  george: {
    name: 'George',
    portrait: 'george',
    flavor: "A mountain of a man crashes out from the treeline, knuckles dark with old blood, a huge black dog padding silent at his heel. He squints at you a long moment, like the thought is heavy work. \"Me George,\" he finally manages, thumping his own chest. He points at the dog. \"This Ryker.\" A longer pause. \"Ryker like you.\" He beams, proud of getting that many words out in a row.",
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

// --- Rare NPC follow-up storylines (see renderRareNpcStoryScreen/
// resolveRareNpcStageChoice/enterRareNpcStageCombat in main.js) ---
// Once a rare NPC's one-time signature reward (RARE_NPCS above) has been
// claimed (tracked in pdata.metRareNpcs), every LATER visit advances
// through this NPC's own array of stages instead of re-showing the same
// flavor text - one stage per visit (still gated by the same 5-run
// cooldown, see isRareEncounterReady), cycling back to stage 0 after the
// last one so the well never runs dry. An NPC absent from this table (or
// with an empty array) keeps the old repeat-the-signature-flavor behavior
// unchanged - see the hasStoryline check in enterRareNpc.
//
// Stage shape: { type: 'choice'|'quest'|'challenge'|'combat', text, ... }.
// 'choice'/'quest'/'challenge' differ only in framing (a snap decision vs.
// a favor asked of you vs. a harder ask) - all three render identically and
// resolve via `choices: [{ label, outcome }]`, where `outcome` is the same
// object shape applyOutcome (events.js) already understands (text/hp/gold/
// item/relic/statBoost), extended by applyRareNpcStageOutcome with
// permanentStatBoost/permanentRelicId/companionPet/companionMount/gear for
// the reward categories a one-off narrative moment needs that a run-scoped
// event never did. 'combat' stages instead carry `enemy` (a scaleEnemy-
// ready template) and `victoryOutcome` (same outcome shape, granted only on
// a win - a loss already ends the run via the normal permadeath path
// before this ever resolves, so there's no separate defeat branch to write).
const RARE_NPC_STORYLINES = {
  george: [
    { // 1
      type: 'choice',
      text: "George is crouched by the trail, turning a lump of quartz over in his huge hands like it might do something. \"Rock,\" he says, holding it up proudly. \"Shiny rock.\" Ryker sniffs it once and loses interest immediately.",
      choices: [
        { label: 'Tell him it\'s a nice rock', outcome: { text: 'George beams and presses it into your hand.', gold: 15, item: 'potion' } },
        { label: 'Ask if you can trade for it', outcome: { text: 'George trades without a second thought - he was never attached to it, just the shine.', gold: 25 } }
      ]
    },
    { // 2
      type: 'quest',
      text: "\"Help George?\" he asks, pointing at a fallen log blocking the trail. It's the size of a small house. \"Heavy.\" He does not appear to be joking about needing help.",
      choices: [
        { label: 'Help him lift it', outcome: { text: 'Between the two of you (mostly him) the log rolls clear. George pats your shoulder hard enough to stagger you.', xp: 25, gold: 10 } },
        { label: 'Let him handle it alone', outcome: { text: 'George shrugs and heaves it aside himself, grunting with effort. "Was fine," he insists, clearly not fine.', gold: 15 } }
      ]
    },
    { // 3
      type: 'choice',
      text: "Ryker has treed something and won't stop barking about it. George squints up into the branches. \"Something up there,\" he reports, unhelpfully.",
      choices: [
        { label: 'Climb up and look', outcome: { text: 'Just a very startled owl. It leaves a single dropped feather behind - and, wedged in the same branch, a coin pouch someone lost long ago.', gold: 20 } },
        { label: 'Call Ryker off', outcome: { text: 'Ryker abandons the tree with visible reluctance. George scratches his ears in apology.', xp: 15 } }
      ]
    },
    { // 4
      type: 'challenge',
      text: "George plants his fist on a flat boulder. \"Arm thing,\" he says. \"Rogue did it once. Lost bad.\" He looks hopeful anyway.",
      choices: [
        { label: 'Take the challenge', outcome: { text: 'You do not win. You did not expect to win. George insists on a rematch someday and gives you a consolation potion for your trouble.', item: 'potion', xp: 20 } },
        { label: 'Decline politely', outcome: { text: '"Smart," George says, nodding slowly, like he\'s impressed you saw that one coming.', gold: 15 } }
      ]
    },
    { // 5
      type: 'choice',
      text: "You find George mid-meal, gnawing on something that used to be an entire roasted boar. He notices you watching and, without hesitation, tears off a leg the size of your torso and holds it out.",
      choices: [
        { label: 'Accept the meal', outcome: { text: 'It is enormous and somehow perfectly cooked. You eat well.', hp: 14 } },
        { label: 'Say you already ate', outcome: { text: 'George shrugs and eats your portion too, without missing a beat.', gold: 10 } }
      ]
    },
    { // 6
      type: 'quest',
      text: "\"Word,\" George says, very seriously, holding up one finger. \"Big word. Heard it. Forgot it.\" He looks at you like you might personally be storing his vocabulary for him.",
      choices: [
        { label: 'Teach him a new word', outcome: { text: 'You settle on "magnificent." George repeats it eleven times, delighted, and gets it right by the ninth.', xp: 20 } },
        { label: 'Tell him small words work fine', outcome: { text: 'George considers this genuinely profound. "Small words," he agrees. "Good words."', gold: 15 } }
      ]
    },
    { // 7
      type: 'combat',
      text: "A trio of bandits has George's camp surrounded, laughing about \"the big dumb one\" - right up until Ryker snarls and George's expression goes flat and cold. He nods you toward the nearest one without a word.",
      enemy: { id: 'georgeBandit', name: 'Overconfident Bandit', icon: '🥷', hp: 26, atk: 9, def: 2, speed: 5, gold: [25, 40] },
      victoryOutcome: { text: 'The bandits reconsider their life choices and scatter. George helps himself to what they dropped and hands you half.', gold: 30, xp: 30 }
    },
    { // 8
      type: 'choice',
      text: "George has built something out of sticks and vine. It might be a birdhouse. It might be a very small, very crooked hut. \"For Ryker,\" he explains, unhelpfully clarifying nothing.",
      choices: [
        { label: 'Admire the craftsmanship', outcome: { text: 'George glows with pride and gives you a little whittled figure from his pocket - lopsided, clearly meant to be you.', gold: 15, item: 'potion' } },
        { label: 'Offer to help fix the lean', outcome: { text: 'You straighten a support beam. George looks at the now-slightly-less-crooked hut like you\'ve performed real magic.', xp: 20 } }
      ]
    },
    { // 9
      type: 'challenge',
      text: "Thunder rolls somewhere distant and Ryker, giant fearsome war-dog, immediately wedges himself behind George's leg, shaking. George pats him with enormous gentleness. \"Loud,\" he explains, as if that settles it.",
      choices: [
        { label: 'Sit with them until it passes', outcome: { text: 'You wait out the storm together. George hums something almost like a tune, badly, the whole time.', hp: 10 } },
        { label: 'Offer Ryker a treat to distract him', outcome: { text: 'It works instantly. George looks at you like you\'ve solved an ancient mystery.', xp: 15, item: 'potion' } }
      ]
    },
    { // 10 - milestone
      type: 'quest',
      text: "George rolls up a sleeve to show you a long, old scar across his forearm. \"Bad fight,\" he says. \"Long time.\" He doesn't elaborate, but he holds his arm out toward you like he wants you to understand something about how he holds it up when he blocks. \"Like this,\" he says. \"You try.\"",
      choices: [
        { label: 'Learn his guard', outcome: { text: 'George walks you through it, over and over, patient in a way his size never suggests. Something about how you brace lands - permanently.', permanentStatBoost: { def: 1 }, xp: 25 } },
        { label: 'Just listen', outcome: { text: 'George seems glad just to have told someone. "Don\'t remember who won," he admits. "Just remember it hurt."', gold: 25 } }
      ]
    },
    { // 11
      type: 'choice',
      text: "Ryker comes trotting back from the treeline dragging something - a very old, very large bone, clearly not from any animal George recognizes, based on the way he's frowning at it.",
      choices: [
        { label: 'Take a closer look', outcome: { text: 'Whatever it was, it was big, and whoever it belonged to left something valuable buried nearby.', gold: 35 } },
        { label: 'Let Ryker keep his prize', outcome: { text: 'Ryker looks extremely pleased with himself. George looks extremely fond.', xp: 20 } }
      ]
    },
    { // 12
      type: 'choice',
      text: "\"Mushroom,\" George says, holding out a handful of them, clearly proud of the find. Some of them are, you're fairly sure, not the kind you eat.",
      choices: [
        { label: 'Eat one to be polite', outcome: { text: 'That was a mistake. A small, forgivable, extremely uncomfortable mistake.', hp: -8, xp: 15 } },
        { label: 'Suggest he checks with Jess first', outcome: { text: '"Jess," George repeats, nodding slowly, filing this away as excellent advice.', gold: 15 } }
      ]
    },
    { // 13
      type: 'combat',
      text: "Something huge has been stalking the treeline near George's camp for two nights running. He's been waiting up with his club just in case. Tonight, it shows itself.",
      enemy: { id: 'georgeStalker', name: 'Stalking Wildcat', icon: '🐆', hp: 40, atk: 11, def: 3, speed: 7, gold: [35, 50] },
      victoryOutcome: { text: 'Between you, Ryker, and George\'s club, it doesn\'t stand a chance. George sleeps easy for the first time in days.', gold: 40, xp: 35 }
    },
    { // 14
      type: 'quest',
      text: "George is trying to say something complicated and failing spectacularly. \"The... the thing where... you say sorry but you don't...\" He gives up. \"Word for that?\"",
      choices: [
        { label: 'Suggest "insincere"', outcome: { text: 'George tries the word out three times, gets close enough, and looks enormously satisfied with himself.', xp: 25 } },
        { label: 'Ask who he\'s talking about', outcome: { text: 'Turns out it was a merchant who shortchanged him last season. George is still, quietly, a little annoyed about it.', gold: 20 } }
      ]
    },
    { // 15
      type: 'choice',
      text: "You find George very carefully, very slowly, trying to pet a butterfly that's landed on Ryker's nose without startling either of them. He is failing, adorably.",
      choices: [
        { label: 'Watch quietly', outcome: { text: 'The moment holds for almost a full minute before Ryker sneezes and ruins everything. Worth it.', hp: 8 } },
        { label: 'Try to help', outcome: { text: 'Your combined effort scares it off immediately. George is unbothered. "Tried," he says, satisfied with the attempt alone.', gold: 15 } }
      ]
    },
    { // 16
      type: 'challenge',
      text: "\"Race,\" George announces, pointing at a distant dead tree. \"Me and Ryker. You watch.\" This does not appear to be a challenge extended to you, exactly, more a performance he'd like witnessed.",
      choices: [
        { label: 'Watch and cheer', outcome: { text: 'Ryker wins by a landslide. George insists he "let him," visibly lying, deliriously happy about it anyway.', xp: 20 } },
        { label: 'Bet on George', outcome: { text: 'You lose the bet badly, but George is so touched someone believed in him that he pays you back double anyway.', gold: 25 } }
      ]
    },
    { // 17
      type: 'combat',
      text: "A trapper's snare has half-caught Ryker's paw, and the trapper himself is stupid enough to come check it while George is standing right there, murder in his eyes.",
      enemy: { id: 'georgeTrapper', name: 'Careless Trapper', icon: '🪤', hp: 30, atk: 8, def: 4, speed: 4, gold: [30, 45] },
      victoryOutcome: { text: 'The trapper flees without his gear. Ryker\'s paw is fine - George checks it four separate times to be sure.', gold: 35, xp: 30 }
    },
    { // 18
      type: 'choice',
      text: "George has found a very small, very lost baby bird and is holding it in his enormous cupped hands like it's made of glass. \"Little one,\" he whispers, terrified of his own strength.",
      choices: [
        { label: 'Help find the nest', outcome: { text: 'You spot it two branches up. George lifts the chick back home with a gentleness that doesn\'t match anything else about him.', xp: 30 } },
        { label: 'Suggest he keep it safe overnight', outcome: { text: 'He does, cupping it all night by the fire. It flies off fine in the morning. George looks like he might cry a little.', hp: 10 } }
      ]
    },
    { // 19
      type: 'quest',
      text: "\"Tina,\" George says, frowning. \"Loud lady. Music lady. She say George dance funny.\" He does not seem offended, exactly, more confused about the correct response.",
      choices: [
        { label: 'Teach him a simple dance move', outcome: { text: 'It is, in fact, still very funny. George does not care and does it anyway, proudly, forever now.', xp: 20 } },
        { label: 'Tell him his dancing is great as-is', outcome: { text: '"Great as-is," George repeats, delighted, and demonstrates immediately, several times.', gold: 15 } }
      ]
    },
    { // 20 - milestone
      type: 'choice',
      text: "George pulls a small carved charm off his own belt - Ryker's old puppy collar-tag, kept all these years - and holds it out to you, suddenly nervous in a way you haven't seen from him before. \"For you,\" he says. \"Keep you safe. Like Ryker.\"",
      choices: [
        { label: 'Accept it', outcome: { text: 'Whatever ward George believes lives in that little charm, something about it genuinely settles into your bones.', permanentRelicId: 'vampiricFang', xp: 30 } },
        { label: 'Tell him to keep it', outcome: { text: 'George insists, gently but immovably. There is no version of this where you leave without it. You take it.', permanentRelicId: 'vampiricFang', gold: 20 } }
      ]
    },
    { // 21
      type: 'choice',
      text: "George is stacking rocks into a small, wobbly tower, one on top of another, tongue between his teeth in fierce concentration. It is, currently, four rocks tall and about to fall.",
      choices: [
        { label: 'Steady it for him', outcome: { text: 'Five rocks. A new record. George treats this like a genuine architectural triumph.', xp: 15 } },
        { label: 'Let it fall and laugh', outcome: { text: 'It topples spectacularly. George laughs so hard Ryker starts barking in solidarity.', gold: 20 } }
      ]
    },
    { // 22
      type: 'quest',
      text: "\"Help George write?\" he asks, holding out a stick and a patch of dirt. \"Want to write name. Just... George.\" He has clearly been trying and getting frustrated.",
      choices: [
        { label: 'Teach him to write his name', outcome: { text: 'It takes a while and looks more like a small battle occurred in the dirt, but by the end, it says GEORGE. He stares at it for a long time.', xp: 35 } },
        { label: 'Write it for him as an example', outcome: { text: 'George copies it letter by letter, painstakingly, and is prouder of the copy than you\'ve ever seen him be of anything.', gold: 20 } }
      ]
    },
    { // 23
      type: 'challenge',
      text: "\"Bet you can't carry Ryker,\" George says, grinning, absolutely certain of this. Ryker, for the record, is the size of a small pony.",
      choices: [
        { label: 'Try anyway', outcome: { text: 'You cannot, in fact, carry Ryker. You both end up on the ground. George laughs until he wheezes.', hp: -6, gold: 25 } },
        { label: 'Concede immediately', outcome: { text: '"Smart," George says again, using his favorite compliment, patting your shoulder hard enough to nearly knock you down anyway.', gold: 15 } }
      ]
    },
    { // 24
      type: 'combat',
      text: "A rival pack of wild dogs has been circling, testing whether Ryker's the toughest thing in these woods. George steps back with his club ready but lets Ryker's own fight play out first - until it clearly needs backup.",
      enemy: { id: 'georgePack', name: 'Pack Alpha', icon: '🐕', hp: 44, atk: 12, def: 3, speed: 8, gold: [30, 50] },
      victoryOutcome: { text: 'The pack yields and slinks off. Ryker struts for the rest of the day like he won it single-handed. George doesn\'t correct him.', gold: 45, xp: 40 }
    },
    { // 25
      type: 'choice',
      text: "George has found a shivering, half-starved wolf pup, clearly abandoned by whatever pack it came from. He looks at you, then at the pup, then at you again - the question obvious even unspoken.",
      choices: [
        { label: 'Take the pup in', outcome: { text: 'It takes to you almost instantly, like it already knew. George looks profoundly relieved someone else said yes first.', companionPet: 'direwolfPup', xp: 25 } },
        { label: 'Suggest George keep it too', outcome: { text: 'George scoops it up without a second thought. "Ryker\'s friend now," he decides, and that\'s apparently that.', gold: 25 } }
      ]
    },
    { // 26
      type: 'choice',
      text: "\"Made you thing,\" George announces, holding out a crudely carved wooden charm shaped - approximately - like a sword. \"From tree. Good tree. Strong.\"",
      choices: [
        { label: 'Wear it proudly', outcome: { text: 'It\'s lopsided and a little splintery, and somehow one of the nicer things anyone\'s given you.', gold: 15, item: 'bomb' } },
        { label: 'Ask him to teach you the carving', outcome: { text: 'His huge hands make it look easy. Yours do not. He\'s endlessly patient about the difference.', xp: 25 } }
      ]
    },
    { // 27
      type: 'quest',
      text: "\"Landry,\" George says, working through a complicated thought. \"Duck-man. He say his duck bigger than Ryker.\" He looks at you, genuinely troubled by this claim. \"Not true. Right?\"",
      choices: [
        { label: 'Reassure him Ryker is bigger', outcome: { text: 'George relaxes completely, crisis averted. "Knew it," he says, patting Ryker with enormous relief.', gold: 20 } },
        { label: 'Suggest a friendly measuring contest', outcome: { text: 'Nothing is resolved, but George has a wonderful time arguing about it with you all afternoon.', xp: 20 } }
      ]
    },
    { // 28
      type: 'challenge',
      text: "George is quiet for once, watching the sunset with Ryker's head in his lap. \"Simple is good,\" he says, out of nowhere. \"Don't need much. Ryker. Food. Sun.\" He looks at you like he's offering something real.",
      choices: [
        { label: 'Sit with him a while', outcome: { text: 'You don\'t say much. You don\'t need to. It\'s a good evening.', hp: 16 } },
        { label: 'Ask if he\'s ever wanted more', outcome: { text: 'George thinks about it for a long time. "Wanted friend," he finally says. "Got one now. Enough."', xp: 30 } }
      ]
    },
    { // 29
      type: 'combat',
      text: "Something ancient and enormous has been displacing whole trees at the edge of George's territory - a beast even he won't face without backup, and he says as much, plainly, no shame in it at all.",
      enemy: { id: 'georgeBeast', name: 'Ridgeback Behemoth', icon: '🦣', hp: 60, atk: 15, def: 6, speed: 3, gold: [50, 70], elite: true },
      victoryOutcome: { text: 'It takes everything you\'ve both got, but the beast finally retreats deeper into the wild. George looks at you like you\'ve personally moved a mountain.', gold: 60, xp: 55, gear: { defId: 'ironShield', rarity: 'rare' } }
    },
    { // 30 - finale milestone
      type: 'choice',
      text: "George stops you before you leave, uncharacteristically serious, Ryker sitting alert at his side like he knows something's coming. \"You,\" George says, searching for the word, and finding it clean and whole for once. \"Friend. Real friend. Not many. You, one of them.\" He holds out a huge, scarred hand.",
      choices: [
        { label: 'Shake his hand', outcome: { text: 'His grip could crush stone and he holds it like glass. Whatever George just decided about you, it\'s permanent.', permanentStatBoost: { atk: 2 }, gold: 60, xp: 60 } },
        { label: 'Hug him instead', outcome: { text: 'You\'re fairly sure George has never been hugged by anything that survived it. He goes very still, then, carefully, hugs back.', permanentStatBoost: { maxHp: 6 }, gold: 40, xp: 60 } }
      ]
    }
  ],
  landry: [
    { // 1
      type: 'choice',
      text: "Sheriff Landry's got a wanted poster nailed to a post, squinting between it and you like he's doing math. \"Reckon you favor this fella some,\" he says, tapping a crude sketch that looks like absolutely no one. \"Ain't you, though. Wrong color hat.\"",
      choices: [
        { label: "Point out the sketch is terrible", outcome: { text: "\"Artist owed me a favor,\" Landry admits. \"Didn't say he could draw.\" He tears it down anyway.", gold: 20 } },
        { label: "Ask who the real culprit is", outcome: { text: "Landry gives you the actual description - and a small reward for the tip-off when it pans out.", gold: 30, xp: 15 } }
      ]
    },
    { // 2
      type: 'choice',
      text: "The duckling has gotten into the general store and is currently wearing a barrel like a hat, utterly delighted with itself, while the shopkeep glares at Landry from the doorway.",
      choices: [
        { label: "Help corral the duckling", outcome: { text: "It takes both of you and a dropped biscuit. Landry pays the shopkeep double, muttering about \"deputy expenses.\"", xp: 20 } },
        { label: "Let it enjoy the barrel a while longer", outcome: { text: "Landry sighs, tips the shopkeep for the trouble out of his own pocket, and watches the duckling parade around like royalty.", gold: 15 } }
      ]
    },
    { // 3
      type: 'quest',
      text: "Raised voices from the saloon - a card game gone sideways. Landry doesn't rush in, just leans on the doorframe. \"Give it a minute,\" he drawls. \"Or don't, if you're the impatient type.\"",
      choices: [
        { label: "Step in and calm things down", outcome: { text: "You talk the table down before fists fly. Landry looks mildly impressed. \"Didn't even need my shotgun. Nice change.\"", xp: 25 } },
        { label: "Wait it out with him", outcome: { text: "It fizzles on its own in about a minute, exactly like he said. \"Told you,\" Landry says, insufferably smug.", gold: 20 } }
      ]
    },
    { // 4
      type: 'combat',
      text: "Cattle rustlers, working the herd at the edge of town under cover of dusk. Landry checks his shotgun's load without any particular hurry. \"Same folks every season,\" he sighs. \"You'd think they'd learn.\"",
      enemy: { id: 'landryRustler', name: 'Cattle Rustler', icon: '🤠', hp: 28, atk: 9, def: 3, speed: 5, gold: [25, 40] },
      victoryOutcome: { text: "One less rustler working these parts. Landry tips his hat. \"Buy you a drink for that, if the saloon wasn't already a mess.\"", gold: 35, xp: 30 }
    },
    { // 5
      type: 'challenge',
      text: "\"Quick-draw contest,\" Landry proposes, setting up two bottles on a fence rail. \"Loser buys the coffee. Winner still buys the coffee, on account of I already know how this goes.\"",
      choices: [
        { label: "Take the contest", outcome: { text: "You lose, predictably, and badly. Landry buys the coffee anyway, true to his word.", hp: 8, gold: 10 } },
        { label: "Ask him to teach you the stance instead", outcome: { text: "He walks you through it slow, patient as a man who's taught this a hundred times. Something about your footing sticks.", xp: 25 } }
      ]
    },
    { // 6
      type: 'quest',
      text: "\"Fella's cheating at cards,\" Landry murmurs, not looking up from his own hand. \"Third table this week. Bottom-dealing, if you know what to look for.\" He doesn't seem eager to make a scene over it.",
      choices: [
        { label: "Call the cheater out yourself", outcome: { text: "The table erupts, the cheater bolts, and Landry collects the pot \"for evidence.\" He splits it with you.", gold: 30 } },
        { label: "Let Landry handle it his way", outcome: { text: "He waits for the man to overplay his hand, then cleans him out fair and square with a smile. \"Patience,\" Landry says. \"Works better than shouting.\"", xp: 20 } }
      ]
    },
    { // 7
      type: 'choice',
      text: "The duckling has taken an enormous, immediate liking to whatever companion you've got with you, following it around at a respectful, adoring distance. \"Made a friend,\" Landry observes, mustache twitching.",
      choices: [
        { label: "Let them play a while", outcome: { text: "It's a genuinely good afternoon. Even Landry cracks a real smile watching them.", hp: 12 } },
        { label: "Ask Landry about raising a deputy bird", outcome: { text: "He tells you the whole ridiculous story with real fondness. Found it half-drowned in a creek, three years back, and never looked back.", xp: 20 } }
      ]
    },
    { // 8
      type: 'combat',
      text: "The afternoon train's been flagged down by masked riders three miles out. Landry's already saddled up by the time you catch wind of it. \"Company'd be appreciated,\" he says, which for him counts as an emergency.",
      enemy: { id: 'landryTrainRobber', name: 'Train Robber', icon: '🎭', hp: 32, atk: 10, def: 3, speed: 6, gold: [30, 45] },
      victoryOutcome: { text: "The robbers scatter without their haul. The rail company sends Landry a thank-you fee, and he splits it down the middle without being asked.", gold: 40, xp: 35 }
    },
    { // 9
      type: 'quest',
      text: "Landry's quiet for a stretch, watching the sunset from the jailhouse porch. \"Had a partner, once,\" he says eventually. \"Before the duckling. Good man. Bad day.\" He doesn't finish the thought, and you don't push.",
      choices: [
        { label: "Sit with him quietly", outcome: { text: "Neither of you says much else. Sometimes that's the whole point of sitting with someone.", hp: 14 } },
        { label: "Ask what happened", outcome: { text: "He tells you, plainly, without drama. It's not a happy story, but he seems lighter for having said it out loud.", xp: 30 } }
      ]
    },
    { // 10 - milestone
      type: 'quest',
      text: "Landry unpins a spare deputy's star from his desk drawer, turning it over once before holding it out. \"Ain't official-official,\" he admits, \"but town's better with more eyes on it. You in?\"",
      choices: [
        { label: "Accept the deputy star", outcome: { text: "Something about wearing it changes how you carry yourself - a steadier hand, a calmer nerve.", permanentStatBoost: { speed: 1 }, xp: 30 } },
        { label: "Ask what the job actually pays", outcome: { text: "\"Pays in coffee and goodwill,\" Landry says, dead serious, then laughs and presses real coin into your hand anyway.", gold: 35 } }
      ]
    },
    { // 11
      type: 'choice',
      text: "Two ranchers are squared off over a well that's run dry on one side of the property line and not the other. Landry's mediating with the patience of a man who's done this exact argument a dozen times.",
      choices: [
        { label: "Suggest they share the water", outcome: { text: "It takes some convincing, but they shake on it. Landry looks relieved not to have to arrest anyone over a well.", xp: 25 } },
        { label: "Let Landry work it out his way", outcome: { text: "He talks them both down to a sensible schedule inside ten minutes. \"Mostly folks just want to be heard,\" he tells you after.", gold: 20 } }
      ]
    },
    { // 12
      type: 'choice',
      text: "\"Got a real crime for you,\" Landry says, entirely straight-faced. \"Someone stole a pie off Miss Ardell's windowsill. Second time this month. Town's in an uproar.\"",
      choices: [
        { label: "Take the case seriously", outcome: { text: "You stake out the windowsill and catch the culprit red-handed - a raccoon with excellent taste. Miss Ardell rewards your detective work.", gold: 25 } },
        { label: "Suggest she just move the pie", outcome: { text: "\"Groundbreaking,\" Landry deadpans, and closes the case on the spot.", xp: 15 } }
      ]
    },
    { // 13
      type: 'combat',
      text: "A whole gang's set up camp in the dry gulch outside town, bold enough to be spotted from the road. Landry counts heads from a distance and exhales slowly. \"More'n I'd like. Could use the extra gun.\"",
      enemy: { id: 'landryGangLeader', name: 'Gulch Gang Leader', icon: '🏴‍☠️', hp: 40, atk: 12, def: 4, speed: 5, gold: [35, 55] },
      victoryOutcome: { text: "The gang breaks and runs once their leader goes down. Landry cuffs what's left of them without breaking a sweat.", gold: 45, xp: 40 }
    },
    { // 14
      type: 'challenge',
      text: "\"Hand of poker,\" Landry offers, already shuffling. \"Nothing serious. Small stakes.\" His idea of small stakes and yours may not match up.",
      choices: [
        { label: "Play the hand", outcome: { text: "He wins, of course he wins, but he's gracious about it and buys the next round.", gold: -10, xp: 15 } },
        { label: "Fold before it starts", outcome: { text: "\"Smartest move you'll make all week,\" Landry admits, putting the cards away without complaint.", gold: 10 } }
      ]
    },
    { // 15
      type: 'combat',
      text: "A stagecoach comes barreling into town with no driver at the reins - spooked horses, and something chasing them that isn't natural. Landry's already running for his horse.",
      enemy: { id: 'landryPredator', name: 'Nightprowler', icon: '🐺', hp: 36, atk: 12, def: 3, speed: 9, gold: [30, 50] },
      victoryOutcome: { text: "You run it off before it catches the coach. The passengers are shaken but unharmed, and more than happy to show their gratitude.", gold: 40, xp: 35 }
    },
    { // 16
      type: 'choice',
      text: "The duckling has laid an egg roughly the size of a bowling ball, and is sitting on it with fierce, quiet pride, daring anyone to comment. Landry has, wisely, said nothing.",
      choices: [
        { label: "Congratulate the proud parent", outcome: { text: "The duckling puffs up even further. Landry looks faintly terrified of what might hatch.", hp: 10 } },
        { label: "Ask Landry if he's ready for a second deputy", outcome: { text: "\"Absolutely not,\" he says, already resigned to the fact that he definitely will be.", gold: 20 } }
      ]
    },
    { // 17
      type: 'combat',
      text: "A gunslinger's ridden in specifically looking for Landry's reputation, itching for a name-making duel. Landry looks more tired than worried. \"Every few years, one of these,\" he mutters, and nods you toward him instead.",
      enemy: { id: 'landryGunslinger', name: 'Reputation-Seeking Gunslinger', icon: '🔫', hp: 38, atk: 13, def: 3, speed: 6, gold: [35, 55] },
      victoryOutcome: { text: "He leaves town considerably humbler than he arrived. Landry buys you the good coffee for handling it so he didn't have to.", gold: 45, xp: 40 }
    },
    { // 18
      type: 'choice',
      text: "Landry pours two mugs of coffee thick as tar and slides one across the jailhouse desk without a word - about as close as he gets to a formal thank-you for anything.",
      choices: [
        { label: "Drink it", outcome: { text: "It's terrible. You drink it anyway. He nods once, satisfied, like you've passed some kind of test.", hp: 10 } },
        { label: "Ask for something to cut the bitterness", outcome: { text: "\"Now you're just insulting the coffee,\" Landry says, but hands over the sugar tin anyway.", gold: 10 } }
      ]
    },
    { // 19
      type: 'quest',
      text: "\"Folks been avoiding the old Hollis place,\" Landry says. \"Say it's haunted. I say it's just empty and creepy, but I ain't been inside in a while to be sure.\"",
      choices: [
        { label: "Check it out together", outcome: { text: "No ghosts - just an owl, a lot of dust, and a strongbox someone forgot about decades back. Landry splits the find with you.", gold: 35 } },
        { label: "Let the rumor stand", outcome: { text: "\"Keeps folks from squatting there,\" Landry admits, unbothered. \"Rumor's doing honest work.\"", xp: 20 } }
      ]
    },
    { // 20 - milestone
      type: 'quest',
      text: "Landry unpins his OWN badge this time - not a spare, the real one, worn smooth from years of wear - and sets it on the desk between you. \"Got a spare in the drawer for me,\" he says. \"This one's earned its rest. Figure it's earned a good home, too.\"",
      choices: [
        { label: "Accept the badge", outcome: { text: "It doesn't do anything magical. It doesn't need to. Wearing it just feels like standing a little straighter.", permanentRelicId: 'swiftBoots', xp: 35 } },
        { label: "Tell him it belongs with him", outcome: { text: "Landry insists, immovable about it in a way that brooks no argument. You wear it out of the jailhouse whether you meant to or not.", permanentRelicId: 'swiftBoots', gold: 25 } }
      ]
    },
    { // 21
      type: 'quest',
      text: "A farming family got raided overnight - stores gone, a fence torn down, nobody hurt but plenty scared. Landry's already out there by the time you hear about it, boots deep in the mud, taking it seriously.",
      choices: [
        { label: "Help rebuild the fence", outcome: { text: "A long, honest day's work. The family feeds you both supper after, refusing to let you leave hungry.", hp: 16, xp: 20 } },
        { label: "Help track who did it", outcome: { text: "The trail's cold but not dead. Landry makes a note and promises the family he won't forget it - and he doesn't forget things.", gold: 25 } }
      ]
    },
    { // 22
      type: 'choice',
      text: "The duckling has wandered off - not unusual, except it's been three hours and Landry's trying very hard not to look worried about it in front of you.",
      choices: [
        { label: "Help search for it", outcome: { text: "You find it happily terrorizing a family of raccoons by the creek, completely fine. Landry's relief is enormous and entirely unspoken.", xp: 25 } },
        { label: "Reassure him it can handle itself", outcome: { text: "It wanders back an hour later, unbothered, having apparently just wanted some alone time. Landry pretends he wasn't pacing.", gold: 15 } }
      ]
    },
    { // 23
      type: 'combat',
      text: "The rustler from a few seasons back - the one Landry sighed about, remember - has finally overplayed his hand and is holed up at the edge of town, cornered and desperate.",
      enemy: { id: 'landryOutlaw', name: 'Cornered Outlaw', icon: '🤠', hp: 34, atk: 11, def: 4, speed: 5, gold: [35, 50] },
      victoryOutcome: { text: "Justice, eventually, if slowly. Landry looks almost sentimental about closing out a case this old.", gold: 45, xp: 35 }
    },
    { // 24
      type: 'quest',
      text: "\"Newcomers keep tripping over the same three rules,\" Landry says, counting on his fingers. \"No guns drawn in the saloon, no racing horses down Main, and don't feed the deputy table scraps. Mind giving folks the tour?\"",
      choices: [
        { label: "Take on the job", outcome: { text: "You spend the day steering wagons and greenhorns straight. Landry's grateful for the quiet it buys him.", xp: 30 } },
        { label: "Suggest he just post a sign", outcome: { text: "\"Radical idea,\" Landry says, and actually goes and does it, visibly pleased with himself the whole time.", gold: 20 } }
      ]
    },
    { // 25 - companion
      type: 'choice',
      text: "Landry's old posse-bird - a big, weathered griffon he rode before his knees started complaining about it - has been standing saddled and restless for want of a rider. \"Getting too old for the long patrols,\" he admits. \"She ain't, though. Feels a waste, letting her go stir-crazy in the stable.\"",
      choices: [
        { label: "Offer to ride with her", outcome: { text: "She takes to you fast, like she'd been waiting for someone to ask. Landry watches you go with something between pride and relief.", companionMount: 'griffonMount', xp: 30 } },
        { label: "Suggest he keeps riding her himself", outcome: { text: "\"Knees say no. Heart says yes,\" Landry admits, and hands over the reins anyway - some fights you don't win against a sheriff's stubbornness.", companionMount: 'griffonMount', gold: 25 } }
      ]
    },
    { // 26
      type: 'combat',
      text: "A lamp's tipped in the saloon and the whole back room's caught - not an enemy exactly, but Landry's shouting for a bucket line and the fire's spreading like it means to fight you for the building.",
      enemy: { id: 'landryFire', name: 'Spreading Blaze', icon: '🔥', hp: 30, atk: 8, def: 0, speed: 4, gold: [20, 30] },
      victoryOutcome: { text: "Between the bucket line and some very undignified stomping, the fire's out before it takes the whole saloon. Landry buys everyone a round, on the house he doesn't own.", gold: 30, xp: 30 }
    },
    { // 27
      type: 'choice',
      text: "\"Found her half-drowned in a creek after a flash flood,\" Landry says, nodding at the duckling, telling the story properly for once. \"Wasn't bigger than my boot. Fed her scraps for a month before I realized she wasn't stopping growing.\"",
      choices: [
        { label: "Ask if he regrets it", outcome: { text: "\"Not for one single day,\" he says, and you believe every word of it.", hp: 10 } },
        { label: "Ask what he named her before \"Deputy\"", outcome: { text: "\"Bathsheba,\" he admits, a little embarrassed. \"Don't tell the town council.\"", xp: 20 } }
      ]
    },
    { // 28
      type: 'challenge',
      text: "\"Justice ain't about winning,\" Landry says, out of nowhere, watching the sun go down over the jailhouse roof. \"It's about the same rules applying Tuesday as they did Monday. Simple as that, mostly.\"",
      choices: [
        { label: "Ask if it's ever that simple", outcome: { text: "\"Almost never,\" he admits, \"but it's a real fine thing to aim at anyway.\"", xp: 30 } },
        { label: "Just nod and watch the sunset with him", outcome: { text: "You don't need to say anything. He seems glad of the company either way.", hp: 14 } }
      ]
    },
    { // 29
      type: 'combat',
      text: "The name on the wanted poster nobody in three counties wanted to touch has finally ridden into town, bold as anything, daring somebody to try. Landry loads his shotgun without a flicker of hesitation. \"Reckon that's us, then.\"",
      enemy: { id: 'landryLegend', name: 'The Ridgeline Killer', icon: '💀', hp: 55, atk: 15, def: 5, speed: 6, gold: [50, 75], elite: true },
      victoryOutcome: { text: "Three counties' worth of trouble, ended in one afternoon. Landry doesn't say much, but the handshake after says plenty.", gold: 65, xp: 55, gear: { defId: 'towerShield', rarity: 'rare' } }
    },
    { // 30 - finale milestone
      type: 'choice',
      text: "Landry calls a meeting of exactly one person - you - in the empty jailhouse, and slides a second, permanent star across the desk, the twin of his own. \"Ain't temporary this time,\" he says. \"Town trusts you. I trust you. Figure that's worth making official.\"",
      choices: [
        { label: "Pin on the permanent star", outcome: { text: "It sits different than the spare did. Heavier, somehow, in the good way. Landry shakes your hand like he means it, because he does.", permanentStatBoost: { def: 2 }, gold: 70, xp: 65 } },
        { label: "Ask if the duckling gets a vote", outcome: { text: "\"She voted yes three towns ago,\" Landry says, dead serious, and the duckling honks in what you choose to take as agreement.", permanentStatBoost: { speed: 2 }, gold: 50, xp: 65 } }
      ]
    }
  ],
  william: [
    { // 1
      type: "choice",
      text: "You find Combat Master Williams standing perfectly still in an empty courtyard, eyes closed, breathing slow. \"You're early,\" he says, without opening his eyes. \"Or I'm predictable. Sit if you like.\"",
      choices: [
        { label: "Sit and meditate with him", outcome: { text: "Ten silent minutes pass. You're not sure what changed, but something did.", hp: 12 } },
        { label: "Ask what he's thinking about", outcome: { text: "\"Nothing,\" he says. \"That's rather the point.\" He seems pleased you asked anyway.", xp: 20 } }
      ]
    },
    { // 2
      type: "challenge",
      text: "Williams balances on a narrow fence post, one leg tucked, utterly motionless. \"Balance isn't about the leg,\" he says. \"Try it.\" You suspect this will not go well for you.",
      choices: [
        { label: "Attempt the pose", outcome: { text: "You fall almost immediately. Twice. Williams doesn't laugh, which somehow feels worse than if he had.", hp: -5, xp: 20 } },
        { label: "Ask him to explain the principle instead", outcome: { text: "\"Balance is attention,\" he says. \"The leg just tells you when you've lost it.\" You're not sure you understand, but it sounds true.", gold: 20 } }
      ]
    },
    { // 3
      type: "combat",
      text: "A brash young student is loudly insisting Williams has gotten \"slow in his old age\" and demanding a match. Williams considers the young man for a long moment, then looks at you instead. \"You take this one. I've nothing to prove today.\"",
      enemy: { id: "williamsStudent", name: "Overeager Student", icon: "🥋", hp: 30, atk: 10, def: 3, speed: 7, gold: [25, 40] },
      victoryOutcome: { text: "The student leaves considerably humbler. Williams nods once - from him, that's practically applause.", gold: 35, xp: 30 }
    },
    { // 4
      type: "choice",
      text: "Williams splits a stack of roof tiles with one open palm, without any particular ceremony about it, like he's swatting a fly. \"Focus,\" he says, \"not force,\" and doesn't elaborate further.",
      choices: [
        { label: "Try it yourself", outcome: { text: "You mostly hurt your hand. Williams watches with something almost like sympathy.", hp: -6, xp: 20 } },
        { label: "Ask him to explain the difference", outcome: { text: "He spends a genuinely patient hour on it. You still can't split a tile, but you understand why you can't, which he insists is progress.", xp: 30 } }
      ]
    },
    { // 5
      type: "quest",
      text: "\"A saying, from my own teacher,\" Williams offers, unprompted. \"'The fist that never opens holds nothing.' Sit with that a while.\" He goes back to his tea, apparently done explaining for the day.",
      choices: [
        { label: "Ask him to explain it plainly", outcome: { text: "\"Grip too tight on anything - a technique, a grudge, a plan - and you can't hold what comes next,\" he says. Simple, once said aloud.", xp: 25 } },
        { label: "Just nod and think on it yourself", outcome: { text: "You turn it over for days afterward. Williams seems to approve of the extended silence more than any answer would have earned.", gold: 20 } }
      ]
    },
    { // 6
      type: "quest",
      text: "\"Training,\" Williams says, handing you two heavy buckets of water and pointing at a hill. \"Up. Down. Don't spill.\" There is no visible connection between this task and combat mastery, and he offers none.",
      choices: [
        { label: "Do it without complaint", outcome: { text: "Your arms are jelly by the end. Somehow, your stance feels steadier than it did this morning.", xp: 30 } },
        { label: "Ask what this actually teaches", outcome: { text: "\"Patience. Also, my garden needed watering,\" he admits, entirely unbothered by the double duty.", gold: 20 } }
      ]
    },
    { // 7
      type: "combat",
      text: "A rival dojo has sent their best to test Williams's reputation, the way they apparently do every few years. Williams sighs, the closest he comes to visible annoyance. \"Again. Go on, I'll watch.\"",
      enemy: { id: "williamsRivalDojo", name: "Rival Dojo Champion", icon: "🥊", hp: 36, atk: 12, def: 4, speed: 6, gold: [30, 50] },
      victoryOutcome: { text: "The champion bows, genuinely respectful in defeat. Williams looks satisfied, though whether at the win or at not having to fight himself is unclear.", gold: 40, xp: 35 }
    },
    { // 8
      type: "quest",
      text: "\"What are you afraid of?\" Williams asks, apropos of nothing, studying you like the answer matters more than you'd think.",
      choices: [
        { label: "Answer honestly", outcome: { text: "He listens without judgment, then nods slowly. \"Naming it is most of the work,\" he says. \"The rest is just practice.\"", xp: 30 } },
        { label: "Deflect the question", outcome: { text: "\"Fair,\" he says, letting it go without pressing - though you suspect he's filed the deflection away as an answer of its own.", gold: 20 } }
      ]
    },
    { // 9
      type: "choice",
      text: "Williams demonstrates a breathing technique, slow and deliberate, each inhale timed like a metronome. \"Breath before technique,\" he says. \"Always. No exceptions.\"",
      choices: [
        { label: "Practice along with him", outcome: { text: "It's harder than it looks. By the end you're at least breathing ON PURPOSE, which he calls a start.", hp: 14 } },
        { label: "Ask why breath matters so much", outcome: { text: "\"Panic breathes shallow. Calm breathes deep. Your body decides which one it is before your mind catches up,\" he explains.", xp: 25 } }
      ]
    },
    { // 10 - milestone
      type: "quest",
      text: "Williams sets your feet himself, adjusting your stance with small, precise touches. \"This is the stance under every stance,\" he says. \"Learn it once, properly, and your body remembers for you.\"",
      choices: [
        { label: "Drill the stance until it's second nature", outcome: { text: "It takes hours. Somewhere in there, something genuinely changes about how you hold yourself in a fight.", permanentStatBoost: { def: 1 }, xp: 30 } },
        { label: "Ask him to show you once more, slower", outcome: { text: "He does, without a trace of impatience. \"Everyone learns at their own pace,\" he says. \"Mine was slower than yours, if it helps.\"", gold: 30 } }
      ]
    },
    { // 11
      type: "choice",
      text: "\"Your guard drops on the left when you're tired,\" Williams observes, watching you shadow-spar. \"Everyone has a tell. That's yours.\"",
      choices: [
        { label: "Ask him to help correct it", outcome: { text: "A tedious, repetitive drill later, and the tell is - not gone, but smaller. \"Smaller is honest progress,\" he says.", xp: 25 } },
        { label: "Ask what his own tell is", outcome: { text: "He actually laughs, briefly. \"I stopped having one. Eventually.\" He doesn't say how long it took.", gold: 20 } }
      ]
    },
    { // 12
      type: "combat",
      text: "A pickpocket, apparently unaware whose pocket he's just tried to pick, finds himself facing Combat Master Williams's utterly serene, utterly unimpressed stare. Williams gestures for you to handle the actual apprehending.",
      enemy: { id: "williamsPickpocket", name: "Unlucky Pickpocket", icon: "🥷", hp: 20, atk: 6, def: 1, speed: 8, gold: [15, 25] },
      victoryOutcome: { text: "He returns everything he took, plus an apology he clearly means. Williams looks almost fond of the whole absurd episode.", gold: 25, xp: 20 }
    },
    { // 13
      type: "quest",
      text: "\"Strength or technique - which matters more?\" Williams asks, testing you the way he tests everyone, with a question that has no clean answer.",
      choices: [
        { label: "Argue for technique", outcome: { text: "\"A fair case,\" he allows. \"Though I've met very strong men who never needed to make it.\" He seems to enjoy the debate regardless of your answer.", xp: 25 } },
        { label: "Argue for strength", outcome: { text: "\"Also fair,\" he says, \"though I've beaten stronger men than myself more times than I can count.\" He grins, just slightly.", gold: 20 } }
      ]
    },
    { // 14
      type: "choice",
      text: "It's raining hard enough to flood the courtyard, and Williams is training in it anyway, entirely unbothered, form as crisp as ever. \"Weather doesn't ask permission,\" he says. \"Neither should your training.\"",
      choices: [
        { label: "Join him in the rain", outcome: { text: "You're both soaked and freezing within minutes. Neither of you stops. It's oddly satisfying.", hp: 10 } },
        { label: "Watch from somewhere dry", outcome: { text: "\"Wise,\" he calls out, not remotely offended. \"I'm just stubborn, not smart.\"", gold: 15 } }
      ]
    },
    { // 15
      type: "challenge",
      text: "\"Stand there,\" Williams says, pointing at a spot in the courtyard. \"Don't move. I'll tell you when you're done.\" He does not specify how long this will take, and you get the distinct sense that's deliberate.",
      choices: [
        { label: "Stand and wait it out", outcome: { text: "It's nearly an hour before he says anything. \"Patience,\" he finally says, \"is a technique too. Most people forget that.\"", xp: 30 } },
        { label: "Ask how long this will take", outcome: { text: "\"As long as it takes you to stop asking,\" he says, and you have the distinct feeling you just failed a test you didn't know you were taking.", gold: 15 } }
      ]
    },
    { // 16
      type: "combat",
      text: "Williams tosses a padded practice weapon your way without warning, testing your reflexes the moment your hand closes on the grip. \"Catch,\" he says, a full second too late to be useful advice.",
      enemy: { id: "williamsSparringDummy", name: "Sparring Partner", icon: "🥋", hp: 26, atk: 9, def: 5, speed: 6, gold: [20, 35] },
      victoryOutcome: { text: "You hold your own better than expected. Williams looks like he's recalibrating his estimate of you, slightly upward.", gold: 30, xp: 30 }
    },
    { // 17
      type: "quest",
      text: "\"My own teacher used to say mastery isn't a destination,\" Williams tells you, unusually reflective. \"Just a direction you keep walking. I didn't understand it until I was much older than you.\"",
      choices: [
        { label: "Ask if he understands it now", outcome: { text: "\"Some days,\" he admits, which from a man this composed feels like real vulnerability.", xp: 30 } },
        { label: "Ask about his teacher", outcome: { text: "He talks for a long while, warmly, about someone who's clearly been gone a long time but never really left.", gold: 20 } }
      ]
    },
    { // 18
      type: "choice",
      text: "A student's grown insufferably arrogant after one too many easy wins, and Williams asks you, diplomatically, to \"help recalibrate his confidence\" through a friendly demonstration.",
      choices: [
        { label: "Spar with the arrogant student", outcome: { text: "It's a short, humbling lesson. The student thanks you afterward, more graciously than expected.", xp: 25 } },
        { label: "Suggest Williams handle it himself", outcome: { text: "\"Wouldn't be humbling, coming from me,\" Williams says. \"He already expects to lose to me. Losing to you means something different.\"", gold: 20 } }
      ]
    },
    { // 19
      type: "quest",
      text: "\"Discipline is easy when you feel like it,\" Williams says, watching you struggle through a drill you clearly don't want to be doing. \"The version that counts is the one you keep when you don't.\"",
      choices: [
        { label: "Push through the drill anyway", outcome: { text: "You finish it, badly, but you finish it. Williams seems entirely uninterested in the quality and very interested in the completion.", xp: 30 } },
        { label: "Admit you want to quit", outcome: { text: "\"Good,\" he says, unexpectedly. \"Admitting it honestly is its own discipline. Now finish anyway.\" You do.", gold: 20 } }
      ]
    },
    { // 20 - milestone
      type: "quest",
      text: "Williams presses a small, worn stone into your palm - smooth from decades of being turned over in someone's hand while thinking. \"Carried this since my own first real lesson,\" he says. \"Time it moved on.\"",
      choices: [
        { label: "Accept the stone", outcome: { text: "It doesn't do anything you can point to. It just feels like carrying a very old, very patient kind of focus.", permanentRelicId: "eagleEye", xp: 35 } },
        { label: "Ask if he's sure he wants to give it up", outcome: { text: "\"Certain,\" he says, and presses it into your hand anyway, the matter apparently already settled in his mind days ago.", permanentRelicId: "eagleEye", gold: 30 } }
      ]
    },
    { // 21
      type: "quest",
      text: "\"People ask which style I fight in,\" Williams says. \"There isn't one. There's just what works, borrowed from wherever it lives.\" He seems to enjoy how much this annoys the traditionalists.",
      choices: [
        { label: "Ask him to teach a borrowed technique", outcome: { text: "He shows you something he picked up decades ago from a fighter whose name he's long since forgotten. It works beautifully anyway.", xp: 30 } },
        { label: "Ask if any style annoyed him to learn", outcome: { text: "He lists three, with visible, lingering irritation at each, which is somehow the funniest thing you've seen him do.", gold: 20 } }
      ]
    },
    { // 22
      type: "combat",
      text: "A gang, mistaking the quiet dojo for an easy target, has decided to make trouble. Williams looks less angry than mildly disappointed at their reading comprehension.",
      enemy: { id: "williamsGang", name: "Overconfident Thug", icon: "👊", hp: 32, atk: 11, def: 3, speed: 6, gold: [25, 40] },
      victoryOutcome: { text: "The rest of the gang reconsiders and leaves quietly. Williams doesn't even stand up from his tea for this one.", gold: 35, xp: 30 }
    },
    { // 23
      type: "quest",
      text: "\"I'm not young anymore,\" Williams says, matter-of-fact rather than mournful, stretching a shoulder that clearly aches. \"Figuring out what that means for how I train is its own discipline.\"",
      choices: [
        { label: "Ask what's changed", outcome: { text: "\"Less force, more precision. Same as it should've always been, honestly. Age just removes the option to cheat with strength.\"", xp: 25 } },
        { label: "Offer to train alongside him at his pace", outcome: { text: "It's a slower, quieter session than usual, and you both leave it feeling like you learned more than the fast ones.", hp: 16 } }
      ]
    },
    { // 24
      type: "challenge",
      text: "\"One meal today. Sunup to sundown, nothing else,\" Williams says. \"Not a punishment. Just a chance to notice how much of your focus goes to appetite instead of anything else.\"",
      choices: [
        { label: "Take on the fast", outcome: { text: "It's genuinely hard, and by evening you notice exactly what he meant. Small, uncomfortable, useful lesson.", xp: 30 } },
        { label: "Politely decline", outcome: { text: "\"No shame in it,\" Williams says. \"I still hate this exercise, every single time I do it myself.\"", gold: 15 } }
      ]
    },
    { // 25 - companion
      type: "choice",
      text: "A small, patient tortle Williams has been training as a demonstration partner for balance drills has taken a real liking to you. \"She's better at stillness than most of my human students,\" he admits. \"Might do you good to keep training with her.\"",
      choices: [
        { label: "Take her on as a training partner", outcome: { text: "She settles in beside you like she'd already decided this before you did. Williams looks quietly pleased.", companionPet: "ironshellTortle", xp: 30 } },
        { label: "Ask Williams to keep training her instead", outcome: { text: "\"She's made her choice already,\" he says, nodding at her firmly planted beside you. \"Wasn't really up to either of us.\"", companionPet: "ironshellTortle", gold: 25 } }
      ]
    },
    { // 26
      type: "combat",
      text: "\"Spar with me,\" Williams says, and for once it isn't a lesson dressed up as a favor - it's a genuine, serious match, the first he's offered you outright. \"Show me what's stuck.\"",
      enemy: { id: "williamsHimself", name: "Combat Master Williams", icon: "🥋", hp: 48, atk: 14, def: 6, speed: 7, gold: [35, 55], elite: true },
      victoryOutcome: { text: "You don't beat him, not really - but you land enough that he stops mid-match and actually smiles, which apparently almost never happens.", gold: 50, xp: 45 }
    },
    { // 27
      type: "choice",
      text: "Williams pours tea with the same unhurried precision he brings to everything else, setting a second cup across from him without asking if you want one. \"Sit,\" he says. \"No lesson today. Just tea.\"",
      choices: [
        { label: "Enjoy the quiet with him", outcome: { text: "It's the most relaxed you've ever seen him - which, for Williams, is barely different from usual, but you notice it anyway.", hp: 18 } },
        { label: "Ask if he ever gets tired of teaching", outcome: { text: "\"Never,\" he says, without hesitation. \"Teaching is just training I get to watch happen to someone else.\"", xp: 25 } }
      ]
    },
    { // 28
      type: "challenge",
      text: "\"What is mastery, actually?\" Williams asks, the same question he's apparently asked every serious student he's ever had, watching for how you answer as much as what you say.",
      choices: [
        { label: "Answer: never being satisfied", outcome: { text: "\"Close,\" he says. \"I'd say never PRETENDING to be satisfied. Some difference in there, if you look for it.\"", xp: 30 } },
        { label: "Answer: making the hard thing look easy", outcome: { text: "\"Also close,\" he allows. \"Though the making-it-look part is the least important part of that sentence.\"", gold: 20 } }
      ]
    },
    { // 29
      type: "combat",
      text: "The rival dojo, humbled once already, has sent their actual master this time - no student, no test, a real challenge aimed squarely at Williams's reputation. Williams, for once, looks genuinely alert. \"This one's earned. Let's not disappoint them.\"",
      enemy: { id: "williamsRivalMaster", name: "Rival Grandmaster", icon: "🐉", hp: 58, atk: 16, def: 6, speed: 7, gold: [50, 75], elite: true },
      victoryOutcome: { text: "A genuinely hard-fought match, decided by inches. The rival master bows deeply on the way out - to both of you, equally.", gold: 65, xp: 55, gear: { defId: "bucklerShield", rarity: "rare" } }
    },
    { // 30 - finale milestone
      type: "choice",
      text: "Williams sets down whatever he's holding and looks at you properly, the way he looks at almost nothing else. \"I don't say this often,\" he says. \"There's nothing left I need to teach you that you can't now find yourself. That's rather the whole point of a teacher, in the end.\"",
      choices: [
        { label: "Thank him for everything", outcome: { text: "He inclines his head, the closest thing to a bow he's ever given you. Whatever just changed between you, it's permanent.", permanentStatBoost: { atk: 1, def: 1 }, gold: 60, xp: 65 } },
        { label: "Ask what comes after mastery", outcome: { text: "\"You find out,\" he says, \"and then, if you're any good at all, you teach it to someone else.\" He means you, obviously.", permanentStatBoost: { maxHp: 5 }, gold: 45, xp: 65 } }
      ]
    }
  ],
  mcclures: [
    { // 1
      type: "choice",
      text: "The wiry brother is squinting at a copper still that's hissing in a way he clearly doesn't like. \"Pressure's off,\" he mutters. \"Big fella, you touch the valve last?\" The big one looks extremely guilty.",
      choices: [
        { label: "Help them fix the valve", outcome: { text: "Between the three of you, disaster is narrowly avoided. \"Owe you a bottle,\" the wiry one says, meaning it as the highest compliment he owns.", xp: 25 } },
        { label: "Step back and let them sort it out", outcome: { text: "They bicker it out themselves in about a minute flat, clearly a well-worn routine. The still hisses back to normal.", gold: 20 } }
      ]
    },
    { // 2
      type: "choice",
      text: "\"Taste-test,\" the big brother announces, holding out a jar of something clear enough to see through and strong enough to see stars. \"Batch seventeen. Might be the one.\"",
      choices: [
        { label: "Take the taste test", outcome: { text: "It is, emphatically, not the one. Your eyes water for a full minute. Both brothers find this hilarious.", hp: -6, gold: 15 } },
        { label: "Politely decline", outcome: { text: "\"Smart,\" the wiry one says. \"Batch sixteen near took my eyebrows off.\"", gold: 15 } }
      ]
    },
    { // 3
      type: "quest",
      text: "\"Revenuers sniffing round the county again,\" the wiry brother says, not remotely panicked about it. \"Mostly want someone to watch the ridge road, holler if a wagon with badges shows up.\"",
      choices: [
        { label: "Keep watch for them", outcome: { text: "No wagon shows, but you spend a pleasant afternoon on the ridge anyway. They pay you in cash AND liquor, against your better judgment.", gold: 30 } },
        { label: "Suggest they just relocate the still", outcome: { text: "\"Did that twice already this year,\" the big one sighs. \"Runs out of ridge eventually.\"", xp: 20 } }
      ]
    },
    { // 4
      type: "combat",
      text: "A rival bootlegging outfit has been raiding the McClures' hidden caches, and the brothers have finally had enough. \"Time somebody taught 'em property lines,\" the wiry one says, cracking his knuckles.",
      enemy: { id: "mcclureRival", name: "Rival Bootlegger", icon: "🥃", hp: 30, atk: 10, def: 3, speed: 5, gold: [25, 40] },
      victoryOutcome: { text: "The rival outfit packs up and finds somewhere else to be. The brothers split a bottle in celebration, and generously don't make you drink any of it.", gold: 35, xp: 30 }
    },
    { // 5
      type: "quest",
      text: "\"Secret's in the corn,\" the big brother confides, like he's handing you a state secret. \"Also the water. Also - don't tell him I said this - probably mostly the water.\"",
      choices: [
        { label: "Ask for the actual recipe", outcome: { text: "They argue about the \"actual\" recipe for a genuinely long time before settling on a version that's probably 60% true.", xp: 25 } },
        { label: "Pretend you already knew", outcome: { text: "\"Now THAT'S a real moonshiner's answer,\" the wiry one grins, delighted, and slips you a jar for your trouble.", gold: 20 } }
      ]
    },
    { // 6
      type: "choice",
      text: "The brothers are mid-argument about whose turn it is to check the traps out back - a genuinely old, genuinely petty dispute that's clearly been running for years.",
      choices: [
        { label: "Offer to check the traps yourself", outcome: { text: "Full of good rabbit and one extremely offended raccoon. Both brothers seem relieved not to have to lose the argument.", xp: 20, hp: 8 } },
        { label: "Referee the argument", outcome: { text: "You rule in the wiry one's favor. The big one sulks for exactly thirty seconds before offering you a drink anyway.", gold: 20 } }
      ]
    },
    { // 7
      type: "quest",
      text: "\"Family recipe's older'n both of us,\" the wiry brother says, unusually sentimental. \"Granddad's granddad's, way back. Feels wrong, some days, sellin' it for coin instead of just... sharin' it.\"",
      choices: [
        { label: "Suggest it can be both", outcome: { text: "\"Huh,\" he says, chewing on that. \"Reckon it can be, at that.\" He seems genuinely moved by the reframe.", xp: 30 } },
        { label: "Ask to hear the family history", outcome: { text: "A long, meandering, probably-25%-exaggerated story follows. It's a great afternoon regardless of accuracy.", gold: 20 } }
      ]
    },
    { // 8
      type: "combat",
      text: "Something's been raiding the corn stores meant for the next batch - tracks too big for a raccoon, too small for a bear, and both brothers are equal parts nervous and thrilled about the mystery.",
      enemy: { id: "mcclureCornRaider", name: "Corn Raider", icon: "🦝", hp: 26, atk: 8, def: 2, speed: 7, gold: [20, 30] },
      victoryOutcome: { text: "Turns out to be an unusually large, unusually bold raccoon. The brothers are almost disappointed it wasn't a bear, and almost proud of the raccoon's ambition.", gold: 25, xp: 25 }
    },
    { // 9
      type: "choice",
      text: "\"Cigarette?\" the big brother offers, holding out a hand-rolled one that smells faintly of the still itself. Neither brother seems to notice or mind the overlap.",
      choices: [
        { label: "Accept and sit a while", outcome: { text: "You don't really smoke, but the sitting-a-while part is genuinely nice. The brothers tell stories that may or may not be true.", hp: 10 } },
        { label: "Decline but stay for the stories", outcome: { text: "\"Suit yourself,\" he shrugs, and launches into a story about a bear, a canoe, and a batch of bad moonshine that you suspect gets taller every telling.", xp: 20 } }
      ]
    },
    { // 10 - milestone
      type: "quest",
      text: "\"Reckon you've earned a taste of the REAL stuff,\" the wiry brother says, producing a jar that looks identical to every other jar but is apparently, categorically, not. \"Granddad's own batch. Don't waste it.\"",
      choices: [
        { label: "Drink it with proper respect", outcome: { text: "It's smooth in a way none of the other batches were, and something about it settles warm in your chest for good.", permanentStatBoost: { maxHp: 3 }, xp: 30 } },
        { label: "Save it for later", outcome: { text: "\"Your call,\" he shrugs, \"but I'd have drunk it on the spot, personally.\" He seems to respect the restraint anyway.", gold: 30 } }
      ]
    },
    { // 11
      type: "choice",
      text: "The brothers are trying to fix a wagon wheel with what appears to be spare still parts, duct tape not having been invented yet in this particular universe's backwoods.",
      choices: [
        { label: "Help with proper tools", outcome: { text: "It actually works this time. The big brother looks personally betrayed that \"proper tools\" were an option all along.", xp: 20 } },
        { label: "Let them finish their way", outcome: { text: "It holds together for exactly one trip into town before falling apart spectacularly. Somehow, both brothers count this as a win.", gold: 15 } }
      ]
    },
    { // 12
      type: "quest",
      text: "\"Got a cousin over the ridge makes a mean batch too,\" the wiry brother admits, \"but between you and me, ours is better. Don't tell him I said that. Or that I said anything at all, really.\"",
      choices: [
        { label: "Promise to keep the secret", outcome: { text: "\"Good man,\" he says, relieved, and slips you a little extra for your discretion.", gold: 25 } },
        { label: "Offer to settle it with a taste test", outcome: { text: "They love this idea entirely too much and immediately start planning a rivalry that will clearly never actually happen.", xp: 25 } }
      ]
    },
    { // 13
      type: "combat",
      text: "The cousin's rival still (the one they definitely don't talk about) has apparently sent someone to \"negotiate\" over territory, and the negotiation has already turned physical by the time you arrive.",
      enemy: { id: "mcclureCousinsThug", name: "Cousin's Enforcer", icon: "🪓", hp: 34, atk: 11, def: 4, speed: 5, gold: [30, 45] },
      victoryOutcome: { text: "The enforcer leaves with a firm message for the cousin. The brothers are thrilled, and mildly worried about the family reunion next spring.", gold: 40, xp: 35 }
    },
    { // 14
      type: "choice",
      text: "\"Naming rights,\" the big brother says, gesturing grandly at a fresh, unnamed batch. \"You get to name this one. Big honor. We've named 'em after every relative we like already.\"",
      choices: [
        { label: "Suggest a name", outcome: { text: "Whatever you suggest, they love it immediately and unreservedly. It's now, officially, permanently, that name.", xp: 20 } },
        { label: "Let them keep the honor", outcome: { text: "They settle on something deeply improper that you're fairly sure will get the label rejected at market. Neither cares even slightly.", gold: 15 } }
      ]
    },
    { // 15
      type: "quest",
      text: "\"Swamp gas got into batch twenty-two somehow,\" the wiry brother says, staring at a jar with real suspicion. \"Don't ask how. We don't rightly know how. It ain't right, but it ain't NOT right either.\"",
      choices: [
        { label: "Insist on disposing of it safely", outcome: { text: "You bury it well away from the still. Both brothers watch the burial with the solemnity of a funeral.", xp: 25 } },
        { label: "Ask to study it out of curiosity", outcome: { text: "Nobody learns anything conclusive, but it's a genuinely fascinating and mildly alarming afternoon.", gold: 20 } }
      ]
    },
    { // 16
      type: "combat",
      text: "A gator's taken up residence uncomfortably close to the still's water source, and neither brother seems eager to be the one to relocate it personally.",
      enemy: { id: "mcclureGator", name: "Territorial Gator", icon: "🐊", hp: 38, atk: 12, def: 5, speed: 4, gold: [25, 40] },
      victoryOutcome: { text: "The gator relocates itself, permanently and enthusiastically, downstream. The water source is safe, and both brothers buy you a round for your trouble.", gold: 40, xp: 35 }
    },
    { // 17
      type: "choice",
      text: "\"Y'ain't from round here originally, are ya,\" the big brother observes, not unkindly, studying you over a jar. \"Where's home, before all this?\"",
      choices: [
        { label: "Tell them your story", outcome: { text: "They listen with real interest, the way only two people with absolutely nowhere else to be can listen.", xp: 20 } },
        { label: "Keep it vague", outcome: { text: "\"Fair enough,\" the wiry one shrugs. \"Man's business is his own business, out here.\"", gold: 15 } }
      ]
    },
    { // 18
      type: "quest",
      text: "\"Got a delivery needs makin',\" the wiry brother says, nodding at a wagon loaded suspiciously heavy for a load of \"just vegetables.\" \"Discreet-like. You understand.\"",
      choices: [
        { label: "Make the delivery", outcome: { text: "You get where you're going without incident, and the recipient tips generously for the discretion.", gold: 35 } },
        { label: "Ask what's really in the crates", outcome: { text: "\"Vegetables,\" the big brother insists, deadpan, while the crates very audibly clink.", xp: 20 } }
      ]
    },
    { // 19
      type: "choice",
      text: "The brothers have built an elaborate, entirely unnecessary scarecrow near the still - not for crows, they clarify, but \"for the look of the thing.\" It is, undeniably, extremely fashionable for a scarecrow.",
      choices: [
        { label: "Compliment the scarecrow", outcome: { text: "They are absurdly proud. The big one names it. It now has more personality than most actual people you've met this week.", hp: 8 } },
        { label: "Ask what it's actually for", outcome: { text: "\"Morale,\" the wiry one says, entirely serious. You decide not to push further.", gold: 15 } }
      ]
    },
    { // 20 - milestone
      type: "quest",
      text: "\"Gonna let you in on something,\" the wiry brother says, unusually solemn, leading you to a second, smaller, much older still hidden deeper in the brush. \"This is the ORIGINAL. Everything else is just practice.\"",
      choices: [
        { label: "Ask to see how it works", outcome: { text: "It's a beautiful, ancient piece of equipment, and something about understanding its craft settles into your bones as a real, lasting steadiness.", permanentRelicId: "ironSkin", xp: 35 } },
        { label: "Thank them for the trust", outcome: { text: "\"Figured you earned it,\" the big brother says, gruffly moved, and presses a keepsake flask into your hand.", permanentRelicId: "ironSkin", gold: 30 } }
      ]
    },
    { // 21
      type: "quest",
      text: "\"County fair's comin' up,\" the big brother says, eyes lighting up. \"We enter every year. Never won. Gonna be the year, I can feel it.\" He has said this, apparently, every year.",
      choices: [
        { label: "Help them prep for the fair", outcome: { text: "You spend a whole day helping polish, package, and present the entry. It doesn't win, but it places, for the first time ever.", xp: 30 } },
        { label: "Wish them luck from a safe distance", outcome: { text: "They appreciate the sentiment regardless, and insist on toasting your good wishes immediately.", gold: 15 } }
      ]
    },
    { // 22
      type: "choice",
      text: "\"Dog's gone and had puppies in the still shed,\" the wiry brother reports, equal parts exasperated and delighted, gesturing at a very smug hound and a squirming pile of pups.",
      choices: [
        { label: "Help find the puppies homes", outcome: { text: "Half the county ends up with a McClure hound puppy by month's end. Both brothers consider this a great success.", xp: 25 } },
        { label: "Suggest they keep them all", outcome: { text: "\"Now THAT's an idea,\" the big brother says, far too enthusiastically, already naming several of them.", gold: 20 } }
      ]
    },
    { // 23
      type: "combat",
      text: "The cousin's rival outfit is back, and bolder this time, apparently having decided the last lesson didn't stick. The brothers look less amused and more genuinely irritated now.",
      enemy: { id: "mcclureCousinBoss", name: "The Ridge Cousin", icon: "🥃", hp: 42, atk: 13, def: 4, speed: 5, gold: [35, 55] },
      victoryOutcome: { text: "The cousin finally backs off for good, muttering about family reunions being awkward now. The brothers are already planning how to bring this up at Thanksgiving.", gold: 45, xp: 40 }
    },
    { // 24
      type: "quest",
      text: "\"Reckon we oughta write the recipe down proper,\" the wiry brother muses. \"Case somethin' ever happens to us. Trouble is, neither of us agrees on half of it.\"",
      choices: [
        { label: "Help mediate a final recipe", outcome: { text: "It takes hours of good-natured arguing, but you help them settle on one true version, finally, after years of disagreement.", xp: 35 } },
        { label: "Suggest keeping some mystery", outcome: { text: "\"Huh. Family secret oughta stay a LITTLE secret,\" the big one agrees, visibly relieved not to have to compromise.", gold: 20 } }
      ]
    },
    { // 25 - companion
      type: "choice",
      text: "The barn owl that's been quietly guarding the still from the rafters for years - alerting the brothers to every revenuer and raccoon alike - has taken a liking to riding on your shoulder instead lately.",
      choices: [
        { label: "Take the owl with you", outcome: { text: "\"She's chosen, I reckon,\" the wiry brother says, a little wistfully. \"Good judge of character, that bird. Always has been.\"", companionPet: "owlFamiliar", xp: 30 } },
        { label: "Suggest she stays to guard the still", outcome: { text: "\"Preciate that,\" the big brother says, relieved. \"Still wouldn't be the same without her keepin' watch.\"", companionPet: "owlFamiliar", gold: 25 } }
      ]
    },
    { // 26
      type: "combat",
      text: "A whole crew's shown up this time, organized and serious, clearly done underestimating two brothers and a still. \"Bigger fight than usual,\" the wiry one admits, for once looking genuinely worried.",
      enemy: { id: "mcclureCrewBoss", name: "Organized Crew Boss", icon: "🎩", hp: 46, atk: 14, def: 5, speed: 5, gold: [40, 60], elite: true },
      victoryOutcome: { text: "The crew scatters, thoroughly beaten and thoroughly done with this particular stretch of ridge. The brothers throw an impromptu party that lasts well into the next day.", gold: 55, xp: 45 }
    },
    { // 27
      type: "choice",
      text: "\"Ever wonder why we do this?\" the wiry brother asks, unusually quiet, watching the still work. \"Coulda done anything. Ended up here anyway. Don't regret it, mostly. Just wonder sometimes.\"",
      choices: [
        { label: "Ask what else he might have done", outcome: { text: "He talks, wistfully, about a life that never happened - a few roads not taken. He seems lighter for having said it out loud.", xp: 25 } },
        { label: "Point out he seems genuinely happy here", outcome: { text: "\"Reckon I am, at that,\" he admits, brightening. \"Good thing to be reminded, now and then.\"", hp: 14 } }
      ]
    },
    { // 28
      type: "challenge",
      text: "\"Drinking contest,\" the big brother announces, entirely too excited about this idea, setting out three jars. This is, transparently, a terrible idea for you specifically.",
      choices: [
        { label: "Accept the contest", outcome: { text: "You lose, decisively, embarrassingly, and memorably. The brothers will bring this up for years.", hp: -10, gold: 20 } },
        { label: "Suggest an arm-wrestling contest instead", outcome: { text: "A far more survivable substitute. You still lose, but with considerably more dignity intact.", xp: 25 } }
      ]
    },
    { // 29
      type: "combat",
      text: "The cousin, humiliated one too many times, has called in help from outside the family entirely - a hired gun with no stake in the feud and no interest in backing down.",
      enemy: { id: "mcclureHiredGun", name: "Outside Hired Gun", icon: "🔫", hp: 50, atk: 15, def: 5, speed: 6, gold: [45, 70], elite: true },
      victoryOutcome: { text: "The hired gun leaves the county entirely, unwilling to fight a feud that isn't even his. The cousin, mortified, finally lets the whole thing drop.", gold: 60, xp: 50, gear: { defId: "throwingAxe", rarity: "rare" } }
    },
    { // 30 - finale milestone
      type: "choice",
      text: "The brothers sit you down between them - a rare, deliberate formality from two men who do almost nothing formally. \"Fam'ly recipe's fam'ly for a reason,\" the wiry one says. \"Figure you've more'n earned bein' called fam'ly, at this point.\"",
      choices: [
        { label: "Accept the honor", outcome: { text: "They toast you properly, the whole ritual, no jokes for once. Something about the moment sticks with you for good.", permanentStatBoost: { maxHp: 4, def: 1 }, gold: 60, xp: 65 } },
        { label: "Ask what being family actually means to them", outcome: { text: "\"Means we'd go to the mat for you,\" the big brother says, simply. \"Same as for each other. That's the whole of it, really.\"", permanentStatBoost: { atk: 2 }, gold: 45, xp: 65 } }
      ]
    }
  ],
  izzo: [
    { // 1
      type: "choice",
      text: "Izzo's got the hood popped on a car that's clearly been through several lives, muttering at the engine like it can hear the disappointment in his voice. \"She's been sluggish,\" he says. \"Off her game. We've all been there.\"",
      choices: [
        { label: "Help diagnose the problem", outcome: { text: "Turns out to be something small and stupid. Izzo looks personally offended it took two people to find it.", xp: 25 } },
        { label: "Suggest he just race it anyway", outcome: { text: "\"Bold,\" he grins. \"Reckless. I respect it.\" He does not, in fact, race it anyway.", gold: 20 } }
      ]
    },
    { // 2
      type: "quest",
      text: "\"Three years running, Race King,\" Izzo reminds you, entirely unprompted, polishing a trophy that's already blinding. \"Nobody's touched me. Nobody's CLOSE to touching me.\"",
      choices: [
        { label: "Ask if that ever gets lonely at the top", outcome: { text: "The grin falters, just slightly. \"Sometimes,\" he admits. \"Winning's better with somebody worth beating.\"", xp: 20 } },
        { label: "Ask for racing tips", outcome: { text: "He talks technique for a solid hour, more generous with his secrets than his reputation suggests he'd be.", gold: 20 } }
      ]
    },
    { // 3
      type: "combat",
      text: "A rival racer's crew has been sabotaging pit stops up and down the circuit, and Izzo's had enough of finding sugar in his gas tank. \"Handle the muscle,\" he says. \"I'll handle the racing.\"",
      enemy: { id: "izzoSaboteur", name: "Pit Crew Saboteur", icon: "🔧", hp: 28, atk: 9, def: 3, speed: 6, gold: [25, 40] },
      victoryOutcome: { text: "The sabotage stops overnight. Izzo wins his next race clean, and credits you loudly to anyone who'll listen.", gold: 35, xp: 30 }
    },
    { // 4
      type: "choice",
      text: "\"Name a car,\" Izzo says, gesturing at a fresh build with genuine ceremony. \"Every good ride needs a good name. This one's earned somethin' special.\"",
      choices: [
        { label: "Suggest a name", outcome: { text: "He loves it instantly, painting it on the side himself before the paint's even properly dry.", xp: 20 } },
        { label: "Ask what he'd name it", outcome: { text: "He already has three names picked out, obviously, and argues himself into a fourth on the spot.", gold: 15 } }
      ]
    },
    { // 5
      type: "quest",
      text: "\"Gonna let you in on somethin',\" Izzo says, lowering his voice like it's a state secret. \"Racing ain't about the car. It's about who wants it more. Car just makes sure the want don't go to waste.\"",
      choices: [
        { label: "Ask how he found that fire", outcome: { text: "He tells a real, unpolished story about losing badly, once, a long time ago, and never wanting to feel that again.", xp: 25 } },
        { label: "Nod and let the wisdom sit", outcome: { text: "He seems to appreciate the quiet more than a response. Rare for him.", gold: 20 } }
      ]
    },
    { // 6
      type: "choice",
      text: "Izzo's mid-argument with his own pit crew about tire pressure, gesturing wildly enough that you're mildly concerned for the nearby equipment.",
      choices: [
        { label: "Help settle the argument", outcome: { text: "You split the difference and, miraculously, everyone accepts it. Izzo looks at you like you've performed actual wizardry.", xp: 25 } },
        { label: "Let them work it out", outcome: { text: "They settle it themselves in about ten minutes, loudly, the way they apparently always do.", gold: 15 } }
      ]
    },
    { // 7
      type: "combat",
      text: "A street racer's been running illegal midnight races through town, endangering more than himself, and Izzo - who takes the SPORT of racing very seriously - is personally offended by the recklessness.",
      enemy: { id: "izzoStreetRacer", name: "Reckless Street Racer", icon: "🏁", hp: 32, atk: 11, def: 3, speed: 8, gold: [30, 45] },
      victoryOutcome: { text: "The street racer agrees, emphatically, to take it to the actual track from now on. Izzo considers this a genuine public service.", gold: 40, xp: 35 }
    },
    { // 8
      type: "quest",
      text: "\"Sponsor deal fell through,\" Izzo admits, uncharacteristically subdued. \"Second one this season. Startin' to wonder if the Race King brand's worth what it used to be.\"",
      choices: [
        { label: "Reassure him he's still the best", outcome: { text: "\"Damn right I am,\" he says, brightening instantly, ego fully restored on schedule.", gold: 25 } },
        { label: "Help him find new sponsors", outcome: { text: "You spend a day making calls with him. It works better than either of you expected, and he's genuinely grateful.", xp: 30 } }
      ]
    },
    { // 9
      type: "choice",
      text: "\"Ride along,\" Izzo offers, patting the passenger seat, grin already promising this will be a terrible idea. \"Full speed. You'll love it or you'll never speak to me again. Fifty-fifty, honestly.\"",
      choices: [
        { label: "Take the ride", outcome: { text: "It is, genuinely, terrifying and incredible in equal measure. You get out shaking and immediately want to do it again.", hp: -5, xp: 25 } },
        { label: "Politely decline", outcome: { text: "\"Coward,\" he says, with real affection, and doesn't push it further.", gold: 15 } }
      ]
    },
    { // 10 - milestone
      type: "quest",
      text: "Izzo hands you a helmet, dead serious for once. \"Gonna teach you to actually drive this thing right,\" he says. \"Not just point and go fast. Real control.\" It's the first genuinely patient thing you've seen him do.",
      choices: [
        { label: "Take the driving lesson seriously", outcome: { text: "Hours of drills later, something about your reflexes behind the wheel - and, weirdly, in a fight - feels sharper.", permanentStatBoost: { speed: 1 }, xp: 30 } },
        { label: "Ask him to just show off instead", outcome: { text: "He absolutely does not need convincing. The show-off run alone teaches you more than you expected.", gold: 30 } }
      ]
    },
    { // 11
      type: "choice",
      text: "\"New paint job,\" Izzo announces, gesturing at a car with flames so aggressive they're nearly load-bearing. \"Whaddya think? Too much?\"",
      choices: [
        { label: "Tell him it's perfect", outcome: { text: "\"Knew it,\" he says, though he was visibly nervous asking. \"Too much is the whole point, honestly.\"", gold: 20 } },
        { label: "Suggest toning it down slightly", outcome: { text: "He considers it, genuinely, for about four seconds before rejecting the idea entirely.", xp: 20 } }
      ]
    },
    { // 12
      type: "quest",
      text: "\"Kid at the track keeps askin' me for tips,\" Izzo says. \"Talented. Reminds me of me, if I'm honest, which worries me some.\" He seems torn between pride and genuine concern.",
      choices: [
        { label: "Encourage him to mentor the kid", outcome: { text: "He does, gruffly and generously, and it's clearly good for both of them.", xp: 30 } },
        { label: "Ask what worries him about it", outcome: { text: "\"Same fire I had. Same mistakes waitin', probably,\" he admits. \"Hope I can help him skip a few.\"", gold: 20 } }
      ]
    },
    { // 13
      type: "combat",
      text: "The sponsor who dropped Izzo has apparently hired muscle to \"discourage\" him from racing under a new deal with a rival team - a move so petty it's almost impressive.",
      enemy: { id: "izzoSponsorMuscle", name: "Ex-Sponsor's Enforcer", icon: "🕴️", hp: 36, atk: 12, def: 4, speed: 5, gold: [30, 50] },
      victoryOutcome: { text: "The enforcer reports back that Izzo is, quote, \"not worth the trouble,\" which Izzo takes as a genuine compliment somehow.", gold: 40, xp: 35 }
    },
    { // 14
      type: "challenge",
      text: "\"Drag race,\" Izzo grins, eyeing your own transportation with real interest. \"You versus me. Loser buys the winner a trophy. Small one. Symbolic.\"",
      choices: [
        { label: "Take the race", outcome: { text: "You lose, badly, but he's gracious about it and buys you a bigger trophy than the deal called for, out of respect.", gold: -10, xp: 25 } },
        { label: "Decline gracefully", outcome: { text: "\"Smart,\" he says. \"I'd have crushed you. But it's the smart call, respect it.\"", gold: 15 } }
      ]
    },
    { // 15
      type: "choice",
      text: "Izzo's staring at a trophy shelf that's, if anything, slightly too full, rearranging them for the third time this week with real concentration.",
      choices: [
        { label: "Ask which trophy means the most", outcome: { text: "He points, without hesitation, to a small, cheap, dented one from his very first amateur race. \"This one. Always this one.\"", xp: 20 } },
        { label: "Suggest he needs a bigger shelf", outcome: { text: "\"Already ordered one,\" he admits, slightly embarrassed at how quickly he answers.", gold: 20 } }
      ]
    },
    { // 16
      type: "combat",
      text: "A rival team's mascot car - genuinely, absurdly, weaponized somehow - has been terrorizing the pit lane, and nobody else on the crew is brave enough to deal with it.",
      enemy: { id: "izzoRivalMascot", name: "Weaponized Mascot Car", icon: "🚗", hp: 34, atk: 10, def: 6, speed: 7, gold: [30, 45] },
      victoryOutcome: { text: "It's disabled without anyone getting hurt, which is honestly more than anyone expected going in. Izzo laughs about this one for weeks.", gold: 40, xp: 35 }
    },
    { // 17
      type: "quest",
      text: "\"Championship's comin' up,\" Izzo says, unusually focused, none of the usual bravado in his voice. \"Real one. Not the local stuff. This is the one that matters.\"",
      choices: [
        { label: "Help him train seriously", outcome: { text: "You spend real, focused days on it together. No jokes, no showing off - just work. It shows.", xp: 35 } },
        { label: "Remind him he's already the best", outcome: { text: "\"Best local,\" he corrects, uncharacteristically humble. \"This one's a different league.\" He appreciates the confidence anyway.", gold: 25 } }
      ]
    },
    { // 18
      type: "choice",
      text: "\"Superstitions,\" Izzo admits, a little embarrassed, showing you a lucky charm dangling from the rearview mirror. \"Don't laugh. Never lost a race with it in the car.\"",
      choices: [
        { label: "Take the superstition seriously", outcome: { text: "\"Knew you'd get it,\" he says, relieved not to be mocked for once about this particular thing.", hp: 10 } },
        { label: "Point out that's not how racing works", outcome: { text: "\"Statistically, sure,\" he shrugs. \"Emotionally, absolutely not touching that charm.\"", gold: 15 } }
      ]
    },
    { // 19
      type: "quest",
      text: "\"Championship's tomorrow,\" Izzo says, pacing, more nervous than you've ever seen him. \"What if I choke? What if three years was the peak and it's all downhill from here?\"",
      choices: [
        { label: "Talk him down", outcome: { text: "By the end of the conversation, the swagger's fully back, restored and possibly overcorrected.", xp: 30 } },
        { label: "Remind him he loves this regardless of outcome", outcome: { text: "That one actually lands, quieter than the usual pep talk. \"Yeah,\" he says. \"Yeah, that's true.\"", gold: 20 } }
      ]
    },
    { // 20 - milestone
      type: "quest",
      text: "Izzo won the championship - by a hair, by everything he had. He finds you after, still buzzing, and presses his OWN first-ever lucky charm into your hand. \"Time to pass it on,\" he says. \"You were there for this one.\"",
      choices: [
        { label: "Accept the lucky charm", outcome: { text: "It doesn't do anything measurable. It just feels, undeniably, lucky - a permanent little edge you can't quite explain.", permanentRelicId: "berserkerHeart", xp: 35 } },
        { label: "Tell him to keep it for the next title", outcome: { text: "\"Got a new one already,\" he grins, pressing the old one into your hand regardless. \"This one's yours now. Non-negotiable.\"", permanentRelicId: "berserkerHeart", gold: 30 } }
      ]
    },
    { // 21
      type: "choice",
      text: "\"First championship win,\" Izzo says, still a little dazed by it days later. \"Don't really know what to do with myself now that I've actually got it.\"",
      choices: [
        { label: "Suggest setting a new goal", outcome: { text: "\"Back-to-back,\" he decides, instantly, fire returning to his eyes. \"That's the next one. Obviously.\"", xp: 25 } },
        { label: "Tell him to just enjoy it a while", outcome: { text: "He actually takes the advice, for once, and spends a genuinely relaxed week not thinking about racing at all. Briefly.", hp: 12 } }
      ]
    },
    { // 22
      type: "quest",
      text: "\"Kid from the track's racing his first real event,\" Izzo says, proud as a father, which is a strange look on him. \"Come watch. I might be more nervous than he is.\"",
      choices: [
        { label: "Go watch the race together", outcome: { text: "The kid places third. Izzo cheers louder for that than he ever did for his own championship.", xp: 25 } },
        { label: "Ask if he's thought about coaching full-time", outcome: { text: "\"Huh,\" he says, genuinely considering it for the first time. \"Might not hate that, actually.\"", gold: 20 } }
      ]
    },
    { // 23
      type: "combat",
      text: "The old rival team, humiliated at the championship, has decided to settle things the unsanctioned, illegal, off-track way. Izzo's furious in a way you haven't seen from him before.",
      enemy: { id: "izzoRivalTeamBoss", name: "Rival Team Owner", icon: "🏆", hp: 44, atk: 13, def: 5, speed: 6, gold: [35, 55] },
      victoryOutcome: { text: "The rival owner is banned from the circuit entirely after this stunt. Izzo's champion title has never felt more clean.", gold: 45, xp: 40 }
    },
    { // 24
      type: "choice",
      text: "\"Retirement,\" Izzo says the word like it tastes bad, turning it over. \"Some folks are askin' when. Ain't got an answer. Ain't sure I want one yet.\"",
      choices: [
        { label: "Ask what would make it feel like the right time", outcome: { text: "\"Dunno yet,\" he admits. \"Guess I'll know it when I feel it. Ain't there yet, though.\"", xp: 25 } },
        { label: "Tell him there's no rush", outcome: { text: "\"Preciate that,\" he says, genuinely relieved not to be pushed on it.", gold: 20 } }
      ]
    },
    { // 25 - companion
      type: "choice",
      text: "A little mechanical squirrel - one of the pit crew's diagnostic bots, gone rogue and startlingly personable - has taken to riding in the glovebox and chirping opinions about tire pressure. \"She's smarter than half my crew,\" Izzo admits. \"Might be time she found a new job.\"",
      choices: [
        { label: "Take the mechanical squirrel", outcome: { text: "She settles onto your shoulder immediately, already diagnosing something about your gear that probably needs oiling.", companionPet: "mechanicalSquirrel", xp: 30 } },
        { label: "Suggest she stays with the pit crew", outcome: { text: "\"Crew'd riot,\" Izzo laughs, and hands her over anyway. \"She already picked you. Wasn't really my call.\"", companionPet: "mechanicalSquirrel", gold: 25 } }
      ]
    },
    { // 26
      type: "combat",
      text: "An underground, entirely unsanctioned racing ring has been luring young drivers with promises of easy money and dangerous cars, and Izzo wants it shut down before someone gets seriously hurt.",
      enemy: { id: "izzoUndergroundBoss", name: "Underground Ring Boss", icon: "🎲", hp: 48, atk: 14, def: 5, speed: 6, gold: [40, 60], elite: true },
      victoryOutcome: { text: "The ring folds overnight without its boss. Izzo personally makes sure every driver involved gets a legitimate track invitation instead.", gold: 55, xp: 45 }
    },
    { // 27
      type: "choice",
      text: "\"Somethin' I never told anyone,\" Izzo says, quieter than usual, looking at his very first car - long retired, lovingly preserved. \"Almost quit before I ever really started. Bad crash. Scared me bad.\"",
      choices: [
        { label: "Ask what brought him back", outcome: { text: "\"Missed it too much to stay scared,\" he says simply. \"Some things are worth the fear.\"", xp: 30 } },
        { label: "Tell him that took real courage", outcome: { text: "He doesn't have a joke ready for once. Just nods, quietly moved, and lets the moment sit.", hp: 16 } }
      ]
    },
    { // 28
      type: "challenge",
      text: "\"Blindfolded lap,\" Izzo announces, entirely too pleased with this plan. \"Not you driving - me. Trust exercise. You call out the turns.\" This is, obviously, a terrible idea.",
      choices: [
        { label: "Call out the turns for him", outcome: { text: "Against all reason, he doesn't crash. You're both shaking with adrenaline and inadvisable laughter after.", xp: 30 } },
        { label: "Talk him out of it entirely", outcome: { text: "\"Boring but fair,\" he sighs, taking the blindfold off, visibly a little disappointed not to have done something reckless today.", gold: 20 } }
      ]
    },
    { // 29
      type: "combat",
      text: "The legendary racer Izzo's spent his whole career chasing - retired for years, coaxed out for one last unofficial grudge match - has finally agreed to settle the old rivalry, on the track and, apparently, off it too.",
      enemy: { id: "izzoLegend", name: "The Retired Legend", icon: "👑", hp: 56, atk: 16, def: 6, speed: 7, gold: [50, 75], elite: true },
      victoryOutcome: { text: "It's close, brutal, and unforgettable. The legend shakes both your hands after, genuinely impressed. Izzo talks about nothing else for a month.", gold: 65, xp: 55, gear: { defId: "genTrinket10", rarity: "rare" } }
    },
    { // 30 - finale milestone
      type: "choice",
      text: "Izzo pulls up beside you one last time, engine idling low instead of roaring for once. \"Been thinkin',\" he says. \"Race King title don't mean much without somebody worth racing. You've been that, this whole time. Figured you oughta know it.\"",
      choices: [
        { label: "Thank him for the ride", outcome: { text: "He grins, the real one, not the showman's version. \"Anytime,\" he says, and for once you believe he means exactly that.", permanentStatBoost: { speed: 2 }, gold: 60, xp: 65 } },
        { label: "Challenge him to one final race", outcome: { text: "He's already revving before you finish the sentence. You don't win. You weren't really racing for that anyway.", permanentStatBoost: { atk: 2 }, gold: 45, xp: 65 } }
      ]
    }
  ]
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
  { id: 'slime', name: 'Slime', icon: '🟢', hp: 24, atk: 3, def: 0, speed: 2, gold: [5, 10] },
  { id: 'rat', name: 'Giant Rat', icon: '🐀', hp: 18, atk: 4, def: 0, speed: 6, gold: [3, 8] },
  { id: 'goblin', name: 'Goblin', icon: '👺', hp: 30, atk: 5, def: 1, speed: 5, gold: [8, 14] },
  { id: 'wolf', name: 'Wild Wolf', icon: '🐺', hp: 34, atk: 6, def: 1, speed: 7, gold: [8, 14] },
  { id: 'bandit', name: 'Bandit', icon: '🥷', hp: 36, atk: 6, def: 2, speed: 5, gold: [12, 20] },
  { id: 'skeleton', name: 'Skeleton', icon: '💀', hp: 40, atk: 7, def: 2, speed: 3, gold: [10, 18] },
  { id: 'cultist', name: 'Cultist', icon: '🕯️', hp: 34, atk: 8, def: 0, speed: 4, gold: [12, 22] },
  { id: 'spider', name: 'Cave Spider', icon: '🕷️', hp: 28, atk: 6, def: 1, speed: 6, gold: [8, 15] },
  { id: 'zombie', name: 'Zombie', icon: '🧟', hp: 42, atk: 5, def: 2, speed: 2, gold: [10, 16] },
  { id: 'imp', name: 'Imp', icon: '👿', hp: 20, atk: 6, def: 0, speed: 7, gold: [8, 14] },
  { id: 'harpy', name: 'Harpy', icon: '🦅', hp: 28, atk: 5, def: 0, speed: 8, gold: [8, 15] },
  { id: 'boar', name: 'Wild Boar', icon: '🐗', hp: 34, atk: 6, def: 2, speed: 5, gold: [9, 16] }
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
  const shown = Math.round(EFFECT_LEVER_IS_PERCENT[key] ? value * 100 : value);
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
      "Tap a glowing node to wander off - battles, campfires, shops, and stranger things all wait down different roads.",
      "Keep an eye on your HP, gold, and Relics up top - or flip AUTO and let the game do the walking. Adventuring by proxy. I respect it."
    ]
  },
  combat: {
    lines: [
      "Attack swings whatever you're holding; your Skill hits harder but needs a breather between uses - like me after a long set.",
      "Mind your HP - a potion can bail you out, and fleeing's always on the table. Except against a boss. They lock the door."
    ]
  },
  relic: {
    lines: ["A relic sweetens this run only - gone the second you go down, like applause after the last song. Pick one, or walk on."]
  },
  shop: {
    lines: ["Spend it while you've got it - none of this gold makes it home if you don't. Prices climb the deeper you wander, same as my fees."]
  },
  rest: {
    lines: ["Rest to heal, meditate to permanently shave a round off your Skill's cooldown, or cook a fish for HP and Cooking XP. One per fire - I don't make the rules. Well, maybe I do."]
  },
  event: {
    lines: ["Every choice here goes somewhere different - there's no wrong pick, just a different verse of the same song."]
  },
  worldEvent: {
    lines: ["A rare, one-per-run showstopper. Step in for reputation, or let it play out for a one-of-a-kind title plus a pet or mount."]
  },
  rareNpc: {
    lines: ["A named face with a guaranteed reward waiting - no dice roll, no luck, just walk up and take it."]
  },
  witchJess: {
    lines: ["Jess deals in rare cats and kittens, and she only takes Relics, never gold - prices climb with rarity. She knows exactly what she's got."]
  },
  taming: {
    lines: ["Answer right and it's yours, no fuss. Answer wrong and you're fighting for it the hard way."]
  },
  jakesteel: {
    lines: ["A one-time signature duel. Win, and he's yours for good - or hand over every Relic you're carrying and walk past unscathed."]
  },
  legendaryEncounter: {
    lines: ["A multi-wave gauntlet guarding a named Legendary - no fleeing allowed, just a small heal between waves to catch your breath."]
  },
  // ---------------- Sanctuary tabs ----------------
  // Same one-time-ever convention as the in-run screens above, just keyed
  // 'sanctuary_<tab>' (see maybeShowTutorial's call at the end of
  // showSanctuary in main.js) so every tab gets its own first-visit intro.
  sanctuary_character: {
    lines: ["Gear, stats, talents, and whatever title you're flying - earn titles from encounters, dungeons, PvP, and reputation. Mine's just 'Kyle.' Working on it."]
  },
  sanctuary_spellbook: {
    lines: ["Every spell you've ever learned, one page, click one to see it up close. Star means always active; the rest fill your open slots - more open up at level 10, 30, 60, and max."]
  },
  sanctuary_pvp: {
    lines: ["Queue up against a random rival of similar power - not a mirror of you, an actual stranger with their own gear. Fight for Honor and rank; Honor buys gear here too."]
  },
  sanctuary_inventory: {
    lines: ["Everything you own, sorted by category - weapons, armor, food, relics, and spells. Recipes moved to the Resource Bank, if you go looking."]
  },
  sanctuary_professions: {
    lines: ["Gathering, cooking, crafting, disenchanting - level them up over time for passive bonuses. Slow work, but so is songwriting."]
  },
  sanctuary_shop: {
    lines: ["Permanent gear, relics, and spells, all bought with banked gold - none of it vanishes when you do."]
  },
  sanctuary_quests: {
    lines: ["Accept a quest, go do the thing, come back and collect. Most repeat, a little tougher each round - like an encore nobody asked for."]
  },
  sanctuary_journal: {
    lines: ["Everything you've found or are still missing, plus your standing with every zone - get friendly enough and their shop opens up to you."]
  },
  sanctuary_raids: {
    lines: ["Dungeons for a solo run, raids for a full party - both end with a named boss and a bad attitude."]
  },
  sanctuary_house: {
    lines: ["Feed and rename your pets and mounts here, and field up to four recruited companions to fight at your side. My band, basically."]
  }
};
