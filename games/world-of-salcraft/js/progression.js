// Cross-run persistent progression: bank gold, character level/XP, gear, materials,
// crafting recipes, the bank shop, and class-unlock trials. Everything here survives
// permadeath - only in-run gold/items/relics/HP reset when a character dies.

const RARITIES = {
  common: { label: 'Common', color: '#9aa3b2', mult: 1.0 },
  uncommon: { label: 'Uncommon', color: '#4caf7d', mult: 1.4 },
  rare: { label: 'Rare', color: '#4a8fe8', mult: 1.9 },
  epic: { label: 'Epic', color: '#9d6fe8', mult: 2.6 },
  legendary: { label: 'Legendary', color: '#e8a94a', mult: 3.6 }
};

// `visual` picks which sprite layer shows when this item is equipped - see
// ARMOR_SHAPES/WEAPON_SHAPES + their _STYLE_PALETTES in sprites.js. The
// character sprite only ever shows the CHEST armor + main-hand weapon
// visually (that's all the compositor supports); every other slot below
// still contributes real stats and shows up in the Armory paperdoll, it
// just doesn't repaint the pixel-art sprite.
const GEAR_TEMPLATES = {
  rustedBlade: { slot: 'weapon', weaponType: 'oneHanded', name: 'Rusted Blade', icon: '🗡️', baseAtk: 2, visual: 'sword' },
  ironSword: { slot: 'weapon', weaponType: 'oneHanded', name: 'Iron Sword', icon: '⚔️', baseAtk: 4, visual: 'sword' },
  steelGreataxe: { slot: 'weapon', weaponType: 'twoHanded', name: 'Steel Greataxe', icon: '🪓', baseAtk: 6, visual: 'axe' },
  runedStaff: { slot: 'weapon', weaponType: 'staff', name: 'Runed Staff', icon: '🔮', baseAtk: 5, visual: 'staff' },
  huntersBow: { slot: 'weapon', weaponType: 'ranged', name: "Hunter's Bow", icon: '🏹', baseAtk: 5, visual: 'bow' },
  clothRobe: { slot: 'chest', name: 'Cloth Robe', icon: '👕', baseDef: 1, baseHp: 3, visual: 'cloth' },
  leatherVest: { slot: 'chest', name: 'Leather Vest', icon: '🥋', baseDef: 2, baseHp: 6, visual: 'leather' },
  chainmail: { slot: 'chest', name: 'Chainmail', icon: '🧥', baseDef: 3, baseHp: 9, visual: 'mail' },
  plateArmor: { slot: 'chest', name: 'Plate Armor', icon: '🛡️', baseDef: 5, baseHp: 14, visual: 'plate' }
};

// --- Procedurally generated gear pool (100 weapons + 100 armor) ---
// The hand-placed templates above stay as the small "iconic" starter set;
// this tops up the loot table with a much deeper pool so drops/the Journal
// don't run dry. Rarity is still applied generically at drop/purchase time
// (see instantiateGear/rollLootRarity below) - these just vary the BASE
// stat per item so two items of the same rarity still feel distinct, kept
// within the same rough range as the hand-placed templates above (baseAtk
// 2-6, baseDef 1-5, baseHp 3-14) so a generated legendary doesn't dwarf the
// hand-tuned named LEGENDARY_ITEMS.
const WEAPON_VISUAL_CYCLE = ['sword', 'dagger', 'axe', 'staff', 'bow', 'mace', 'lute'];
const WEAPON_VISUAL_ICON = { sword: '⚔️', dagger: '🗡️', axe: '🪓', staff: '🔮', bow: '🏹', mace: '🔨', lute: '🎻' };
const WEAPON_VISUAL_NOUNS = {
  sword: ['Sword', 'Blade', 'Saber', 'Longsword', 'Rapier'],
  dagger: ['Dagger', 'Knife', 'Shiv', 'Stiletto', 'Kris'],
  axe: ['Axe', 'Cleaver', 'Hatchet', 'Greataxe', 'Tomahawk'],
  staff: ['Staff', 'Rod', 'Wand', 'Scepter', 'Cane'],
  bow: ['Bow', 'Longbow', 'Recurve', 'Shortbow', 'Warbow'],
  mace: ['Mace', 'Hammer', 'Warhammer', 'Flail', 'Maul'],
  lute: ['Lute', 'Harp', 'Fiddle', 'Mandolin', 'Lyre']
};
const ARMOR_VISUAL_CYCLE = ['cloth', 'leather', 'mail', 'plate'];
const ARMOR_VISUAL_ICON = { cloth: '👕', leather: '🥋', mail: '🧥', plate: '🛡️' };
const ARMOR_VISUAL_NOUNS = {
  cloth: ['Robe', 'Vestments', 'Cassock', 'Tunic', 'Wrap'],
  leather: ['Vest', 'Jerkin', 'Garb', 'Hide', 'Coat'],
  mail: ['Chainmail', 'Ringmail', 'Hauberk', 'Scalemail', 'Byrnie'],
  plate: ['Plate', 'Cuirass', 'Bulwark', 'Warplate', 'Aegis']
};
// Weapon templates need a `weaponType` (see the class-competency system
// below) alongside their sprite `visual` - this maps one to the other for
// the generator below, which only picks a visual.
const WEAPON_TYPE_BY_VISUAL = { sword: 'oneHanded', dagger: 'mainHandOnly', axe: 'twoHanded', staff: 'staff', bow: 'ranged', mace: 'oneHanded', lute: 'instrument' };
const GEAR_NAME_PREFIXES = [
  'Rusty', 'Iron', 'Steel', 'Silver', 'Golden', 'Bronze', 'Ember', 'Frost', 'Storm', 'Shadow',
  'Sunfire', 'Moonlit', 'Bloodforged', 'Runic', 'Ancient', 'Cursed', 'Blessed', 'Savage', "Serpent's", "Dragon's",
  'Phantom', 'Void', 'Crystal', 'Obsidian', 'Thorned', 'Whispering', 'Howling', 'Grim', 'Radiant', 'Molten',
  'Gilded', 'Feral', 'Sunken', 'Astral', 'Fel', 'Verdant', 'Glacial', 'Umbral', 'Wailing', 'Stormforged'
];

function generateGearPool(count, idPrefix, slot, visualCycle, visualIcon, visualNouns, statFn) {
  const pool = {};
  const nounCounters = {};
  for (let i = 0; i < count; i++) {
    const visual = visualCycle[i % visualCycle.length];
    const prefix = GEAR_NAME_PREFIXES[i % GEAR_NAME_PREFIXES.length];
    const nouns = visualNouns[visual];
    const nounIdx = (nounCounters[visual] || 0) % nouns.length;
    nounCounters[visual] = (nounCounters[visual] || 0) + 1;
    const id = `${idPrefix}${i + 1}`;
    const extra = slot === 'weapon' ? { weaponType: WEAPON_TYPE_BY_VISUAL[visual] } : {};
    pool[id] = { slot, name: `${prefix} ${nouns[nounIdx]}`, icon: visualIcon[visual], visual, ...extra, ...statFn(i) };
  }
  return pool;
}

Object.assign(GEAR_TEMPLATES, generateGearPool(100, 'genWeapon', 'weapon', WEAPON_VISUAL_CYCLE, WEAPON_VISUAL_ICON, WEAPON_VISUAL_NOUNS,
  (i) => ({ baseAtk: 2 + (i % 5) })
));
Object.assign(GEAR_TEMPLATES, generateGearPool(100, 'genArmor', 'chest', ARMOR_VISUAL_CYCLE, ARMOR_VISUAL_ICON, ARMOR_VISUAL_NOUNS,
  (i) => ({ baseDef: 1 + (i % 5), baseHp: 3 + (i % 12) })
));

// --- New equip slots: weapon subtypes without a curated sprite visual, plus
// the 15 accessory/armor slots (rings, trinkets, cape, belt, helmet, legs,
// gloves, bracers, shirt, tabard, necklace, shoulders). None of these repaint
// the character sprite (no `visual`) - see the note on GEAR_TEMPLATES above.
const EXTRA_WEAPON_TEMPLATES = {
  woodenShield: { slot: 'weapon', weaponType: 'shield', name: 'Wooden Shield', icon: '🛡️', baseDef: 2 },
  ironShield: { slot: 'weapon', weaponType: 'shield', name: 'Iron Shield', icon: '🛡️', baseDef: 3 },
  towerShield: { slot: 'weapon', weaponType: 'shield', name: 'Tower Shield', icon: '🛡️', baseDef: 4 },
  bucklerShield: { slot: 'weapon', weaponType: 'shield', name: 'Buckler', icon: '🔰', baseDef: 2 },
  runedWand: { slot: 'weapon', weaponType: 'wand', name: 'Runed Wand', icon: '🪄', baseAtk: 2 },
  crystalWand: { slot: 'weapon', weaponType: 'wand', name: 'Crystal Wand', icon: '🪄', baseAtk: 3 },
  emberWand: { slot: 'weapon', weaponType: 'wand', name: 'Ember Wand', icon: '🪄', baseAtk: 4 },
  throwingKnife: { slot: 'weapon', weaponType: 'thrown', name: 'Throwing Knife', icon: '🔪', baseAtk: 2 },
  throwingAxe: { slot: 'weapon', weaponType: 'thrown', name: 'Throwing Axe', icon: '🪃', baseAtk: 3 },
  javelin: { slot: 'weapon', weaponType: 'thrown', name: 'Javelin', icon: '🔱', baseAtk: 4 },
  blessingOfMight: { slot: 'weapon', weaponType: 'blessing', name: 'Blessing of Might', icon: '🕊️', baseAtk: 2 },
  blessingOfKings: { slot: 'weapon', weaponType: 'blessing', name: 'Blessing of Kings', icon: '🕊️', baseAtk: 3, baseDef: 1 },
  blessingOfLight: { slot: 'weapon', weaponType: 'blessing', name: 'Blessing of Light', icon: '✨', baseAtk: 2 }
};
Object.assign(GEAR_TEMPLATES, EXTRA_WEAPON_TEMPLATES);

const ACCESSORY_SLOT_ICON = { head: '⛑️', neck: '📿', shoulders: '🎽', back: '🧣', wrists: '⌚', hands: '🧤', waist: '🎗️', legs: '👖', ring: '💍', trinket: '🔯' };
const ACCESSORY_SLOT_NOUNS = {
  head: ['Helm', 'Hood', 'Circlet', 'Cowl', 'Crown'],
  neck: ['Necklace', 'Amulet', 'Pendant', 'Choker', 'Torc'],
  shoulders: ['Pauldrons', 'Shoulderguards', 'Mantle', 'Spaulders', 'Epaulets'],
  back: ['Cloak', 'Cape', 'Shroud', 'Drape', 'Mantling'],
  wrists: ['Bracers', 'Wristguards', 'Vambraces', 'Cuffs', 'Bindings'],
  hands: ['Gloves', 'Gauntlets', 'Handwraps', 'Grips', 'Mitts'],
  waist: ['Belt', 'Sash', 'Girdle', 'Cord', 'Waistguard'],
  legs: ['Leggings', 'Greaves', 'Legguards', 'Trousers', 'Kilt'],
  ring: ['Ring', 'Band', 'Loop', 'Signet', 'Circle'],
  trinket: ['Charm', 'Idol', 'Talisman', 'Relic', 'Trinket']
};

function generateAccessoryPool(count, slot, statFn) {
  const pool = {};
  const nouns = ACCESSORY_SLOT_NOUNS[slot];
  for (let i = 0; i < count; i++) {
    const prefix = GEAR_NAME_PREFIXES[i % GEAR_NAME_PREFIXES.length];
    const id = `gen${slot[0].toUpperCase()}${slot.slice(1)}${i + 1}`;
    pool[id] = { slot, name: `${prefix} ${nouns[i % nouns.length]}`, icon: ACCESSORY_SLOT_ICON[slot], ...statFn(i) };
  }
  return pool;
}

Object.assign(GEAR_TEMPLATES,
  generateAccessoryPool(15, 'head', (i) => ({ baseDef: 2 + (i % 4), baseHp: 4 + (i % 8) })),
  generateAccessoryPool(15, 'shoulders', (i) => ({ baseDef: 2 + (i % 4), baseHp: 3 + (i % 6) })),
  generateAccessoryPool(15, 'legs', (i) => ({ baseDef: 2 + (i % 4), baseHp: 4 + (i % 8) })),
  generateAccessoryPool(15, 'back', (i) => ({ baseDef: 1 + (i % 2) })),
  generateAccessoryPool(15, 'waist', (i) => ({ baseDef: 1 + (i % 2) })),
  generateAccessoryPool(15, 'wrists', (i) => ({ baseDef: 1 + (i % 2) })),
  generateAccessoryPool(15, 'hands', (i) => ({ baseDef: 1 + (i % 2), baseHp: 1 + (i % 3) }))
);

// Jewelry (neck/rings) rolls one of a handful of small flat stat levers
// instead of def/hp - trinkets roll from a punchier set of the same
// effect{} levers relics use (lifesteal, hpRegen, execute damage, etc.),
// matching how "trinkets are weird proc items, not just +stats" reads in WoW.
const JEWELRY_EFFECT_CYCLE = [{ atk: 1 }, { def: 1 }, { critBonus: 0.02 }, { speed: 1 }, { goldBonus: 0.02 }, { maxHp: 3 }];
const TRINKET_EFFECT_CYCLE = [{ lifesteal: 1 }, { hpRegen: 1 }, { executeBonus: 2 }, { potionHealBonus: 0.05 }, { spellPower: 0.03 }, { eliteSlayerAtk: 2 }];

function generateEffectPool(count, slot, effectCycle) {
  const pool = {};
  const nouns = ACCESSORY_SLOT_NOUNS[slot];
  for (let i = 0; i < count; i++) {
    const prefix = GEAR_NAME_PREFIXES[i % GEAR_NAME_PREFIXES.length];
    const id = `gen${slot[0].toUpperCase()}${slot.slice(1)}${i + 1}`;
    pool[id] = { slot, name: `${prefix} ${nouns[i % nouns.length]}`, icon: ACCESSORY_SLOT_ICON[slot], effect: effectCycle[i % effectCycle.length] };
  }
  return pool;
}

Object.assign(GEAR_TEMPLATES,
  generateEffectPool(15, 'neck', JEWELRY_EFFECT_CYCLE),
  generateEffectPool(15, 'ring', JEWELRY_EFFECT_CYCLE),
  generateEffectPool(15, 'trinket', TRINKET_EFFECT_CYCLE)
);

// Shirts/tabards are cosmetic-only (no stats), matching real WoW conventions
// for those two slots - they exist so the slot has something to equip.
const SHIRT_TABARD_TEMPLATES = {};
['Simple Shirt', 'Linen Shirt', 'Silk Shirt', "Traveler's Shirt", 'Festival Shirt'].forEach((name, i) => {
  SHIRT_TABARD_TEMPLATES[`genShirt${i + 1}`] = { slot: 'shirt', name, icon: '👔' };
});
["Adventurer's Tabard", 'Guild Tabard', "Champion's Tabard", 'Faded Tabard', 'Ceremonial Tabard'].forEach((name, i) => {
  SHIRT_TABARD_TEMPLATES[`genTabard${i + 1}`] = { slot: 'tabard', name, icon: '🚩' };
});
Object.assign(GEAR_TEMPLATES, SHIRT_TABARD_TEMPLATES);

// --- Class weapon competency ---
// Which weapon `weaponType`s each class can equip at all, and which
// equip-slot key(s) each weaponType occupies. twoHanded/staff occupy BOTH
// mainHand and offHand (classic 2H rule - equipping one evicts whatever was
// in either hand); shield is offHand-only; ranged/thrown/wand/blessing all
// live in the `ranged` slot (repurposed as paladins'/clerics' "Blessing"
// slot, per their class design below).
const WEAPON_TYPE_SLOTS = {
  oneHanded: ['mainHand', 'offHand'],
  mainHandOnly: ['mainHand'],
  twoHanded: ['mainHand', 'offHand'],
  staff: ['mainHand', 'offHand'],
  shield: ['offHand'],
  ranged: ['ranged'],
  thrown: ['ranged'],
  wand: ['ranged'],
  instrument: ['mainHand'],
  blessing: ['ranged']
};
const WEAPON_TYPE_TWO_HANDED = { twoHanded: true, staff: true };

const CLASS_WEAPON_TYPES = {
  warrior: ['twoHanded', 'oneHanded', 'mainHandOnly', 'shield', 'ranged'],
  rogue: ['oneHanded', 'mainHandOnly', 'ranged', 'thrown'],
  mage: ['oneHanded', 'staff', 'mainHandOnly', 'wand'],
  paladin: ['twoHanded', 'oneHanded', 'mainHandOnly', 'shield', 'blessing'],
  hunter: ['twoHanded', 'oneHanded', 'mainHandOnly', 'shield', 'ranged', 'thrown', 'staff'],
  warlock: ['oneHanded', 'staff', 'mainHandOnly', 'wand'],
  barbarian: ['twoHanded', 'oneHanded', 'mainHandOnly', 'ranged', 'thrown', 'staff'],
  cleric: ['twoHanded', 'oneHanded', 'mainHandOnly', 'shield', 'blessing'],
  bard: ['instrument', 'oneHanded', 'ranged']
};

function canClassUseWeaponType(classId, weaponType) {
  return (CLASS_WEAPON_TYPES[classId] || []).includes(weaponType);
}

// The full list of equippable non-cosmetic-slot-agnostic keys on a
// character record (excludes spell/pet/mount, which have their own equip
// logic already).
const EQUIP_GEAR_KEYS = ['mainHand', 'offHand', 'ranged', 'head', 'neck', 'shoulders', 'back', 'chest', 'shirt', 'tabard', 'wrists', 'hands', 'waist', 'legs', 'ring1', 'ring2', 'trinket1', 'trinket2'];

// Which equip-slot KEY(S) a given item could go into for this class - a
// weapon may resolve to zero keys (class can't use that weaponType), one
// key (most gear), or two (2H weapons; rings/trinkets offer either of
// their pair). Used both to validate an equip click and to build the
// Inventory/Armory's per-item equip button(s).
function equipSlotKeysFor(classId, item) {
  if (item.slot === 'weapon') {
    if (!canClassUseWeaponType(classId, item.weaponType)) return [];
    return WEAPON_TYPE_SLOTS[item.weaponType] || [];
  }
  if (item.slot === 'ring') return ['ring1', 'ring2'];
  if (item.slot === 'trinket') return ['trinket1', 'trinket2'];
  return [item.slot];
}

// Equips `item` into `chosenKey` (one of equipSlotKeysFor's results),
// resolving 2H-weapon conflicts: a 2H/staff fills both hands and evicts
// whatever was there; equipping a non-2H item into a hand currently spanned
// by a 2H weapon breaks that 2H weapon out of both hands.
function equipItemToSlot(rec, item, chosenKey) {
  if (item.slot === 'weapon' && WEAPON_TYPE_TWO_HANDED[item.weaponType]) {
    rec.equipped.mainHand = item.uid;
    rec.equipped.offHand = item.uid;
    return;
  }
  if (chosenKey === 'mainHand' || chosenKey === 'offHand') {
    const other = chosenKey === 'mainHand' ? 'offHand' : 'mainHand';
    if (rec.equipped[other] && rec.equipped[other] === rec.equipped[chosenKey]) rec.equipped[other] = null;
  }
  rec.equipped[chosenKey] = item.uid;
}

// Clears `uid` out of every equip slot it's in (handles a 2H weapon
// spanning both hands, and rings/trinkets living in either of their pair).
function unequipItemEverywhereOnRecord(rec, uid) {
  EQUIP_GEAR_KEYS.forEach(key => { if (rec.equipped[key] === uid) rec.equipped[key] = null; });
}

// Sums flat atk/def/hp/goldBonus AND effect{} levers (rings/necks/trinkets
// use effect{} instead of flat stats) across every equipped gear slot -
// folded into Game.effectiveStats()/previewClassStats() alongside relics,
// curses, companions, and talents.
function gearStatBonus(rec) {
  const base = { atk: 0, def: 0, maxHp: 0, goldBonus: 0 };
  RELIC_EFFECT_KEYS.forEach(k => { if (base[k] === undefined) base[k] = 0; });
  const countedTwoHanded = new Set();
  EQUIP_GEAR_KEYS.forEach(key => {
    const uid = rec.equipped[key];
    if (!uid) return;
    const item = Persistent.findItem(uid);
    if (!item) return;
    if (item.slot === 'weapon' && WEAPON_TYPE_TWO_HANDED[item.weaponType]) {
      if (countedTwoHanded.has(uid)) return; // counted once even though it fills 2 keys
      countedTwoHanded.add(uid);
    }
    base.atk += item.atk || 0;
    base.def += item.def || 0;
    base.maxHp += item.hp || 0;
    base.goldBonus += item.goldBonus || 0;
    if (item.effect) Object.keys(item.effect).forEach(k => { base[k] = (base[k] || 0) + item.effect[k]; });
  });
  return base;
}

// Honor-shop/Bloody-Bag gear (see PVP_GEAR_TEMPLATES/PVP_UNIQUE_ITEMS in
// data.js) lives in pdata.pvpInventory as real rarity-scaled instances, same
// as normal gear in pdata.inventory - rec.pvpEquipped stores their uids.
// Folded into Game.effectiveStats() ONLY while Game.pvp is set (see
// enterPvpMatch in main.js) - never touches adventure/raid/Sanctuary stats.
function pvpGearStatBonus(rec) {
  const base = { atk: 0, def: 0, maxHp: 0, critBonus: 0, lifesteal: 0 };
  const eq = rec.pvpEquipped;
  if (!eq) return base;
  ['weapon', 'armor', 'trinket'].forEach(kind => {
    const item = eq[kind] ? Persistent.findPvpItem(eq[kind]) : null;
    if (!item) return;
    base.atk += item.atk || 0;
    base.def += item.def || 0;
    base.maxHp += item.hp || 0;
    if (item.effect) {
      if (item.effect.critBonus) base.critBonus += item.effect.critBonus;
      if (item.effect.lifesteal) base.lifesteal += item.effect.lifesteal;
    }
  });
  return base;
}

// Instantiates a rarity-scaled PvP-only gear item from PVP_GEAR_TEMPLATES -
// mirrors instantiateGear, but stored separately in pdata.pvpInventory since
// this gear only ever counts toward stats during an actual PvP match.
function instantiatePvpGear(defId, rarity) {
  const tmpl = PVP_GEAR_TEMPLATES[defId];
  const mult = RARITIES[rarity].mult;
  const item = {
    uid: 'pvp' + Math.random().toString(36).slice(2, 10),
    defId, kind: tmpl.kind, weaponType: tmpl.weaponType, rarity, pvpOnly: true,
    name: tmpl.name, icon: tmpl.icon,
    atk: tmpl.baseAtk ? Math.round(tmpl.baseAtk * mult) : 0,
    def: tmpl.baseDef ? Math.round(tmpl.baseDef * mult) : 0,
    hp: tmpl.baseHp ? Math.round(tmpl.baseHp * mult) : 0
  };
  if (tmpl.effect) {
    item.effect = {};
    Object.keys(tmpl.effect).forEach(k => {
      const raw = tmpl.effect[k] * mult;
      item.effect[k] = Number.isInteger(tmpl.effect[k]) ? Math.round(raw) : Math.round(raw * 1000) / 1000;
    });
  }
  return item;
}

// Fixed-stat named PvP unique (see PVP_UNIQUE_ITEMS) - the rarest possible
// Bloody Bag roll, not rarity-scaled (same relationship instantiateLegendary
// has to LEGENDARY_ITEMS).
function instantiatePvpUnique(id) {
  const def = PVP_UNIQUE_ITEMS[id];
  return {
    uid: 'pvpu' + Math.random().toString(36).slice(2, 10),
    defId: id, kind: def.kind, weaponType: def.weaponType, rarity: 'unique', pvpOnly: true, pvpUnique: true,
    name: def.name, icon: def.icon,
    atk: def.atk || 0, def: def.def || 0, hp: def.hp || 0,
    effect: def.effect
  };
}

// Generic reusable container roll: checked rarest-first against
// `chances` (see CONTAINERS in data.js), falling through to a guaranteed
// 'common' floor if nothing rarer hits. Any future container just supplies
// its own chances table and generate(rarity) fn.
function rollContainerRarity(chances) {
  const order = ['unique', 'legendary', 'epic', 'rare', 'uncommon'];
  for (const tier of order) {
    if (chances[tier] && Math.random() < chances[tier]) return tier;
  }
  return 'common';
}

function openContainer(containerId) {
  const container = CONTAINERS[containerId];
  const rarity = rollContainerRarity(container.rarityChances);
  return container.generate(rarity);
}

function instantiateGear(defId, rarity) {
  const tmpl = GEAR_TEMPLATES[defId];
  const mult = RARITIES[rarity].mult;
  const item = {
    uid: 'g' + Math.random().toString(36).slice(2, 10),
    defId,
    slot: tmpl.slot,
    weaponType: tmpl.weaponType,
    rarity,
    name: tmpl.name,
    icon: tmpl.icon,
    visual: tmpl.visual,
    atk: tmpl.baseAtk ? Math.round(tmpl.baseAtk * mult) : 0,
    def: tmpl.baseDef ? Math.round(tmpl.baseDef * mult) : 0,
    hp: tmpl.baseHp ? Math.round(tmpl.baseHp * mult) : 0,
    goldBonus: 0
  };
  if (tmpl.effect) {
    item.effect = {};
    Object.keys(tmpl.effect).forEach(k => {
      const raw = tmpl.effect[k] * mult;
      // Percent-style levers (0.02 crit, etc.) keep 3 decimal places; flat
      // integer levers (atk, def, maxHp...) round to whole numbers.
      item.effect[k] = Number.isInteger(tmpl.effect[k]) ? Math.round(raw) : Math.round(raw * 1000) / 1000;
    });
  }
  return item;
}

// --- Legendary items ---
// Named uniques (fixed stats, not rarity-rolled) from the WoW and D&D
// universes, won only from Legendary Encounters (see CONTENT below).
const LEGENDARY_ITEMS = {
  thunderfury: { name: 'Thunderfury, Blessed Blade of the Windseeker', slot: 'weapon', weaponType: 'oneHanded', visual: 'sword', icon: '⚡', atk: 18, universe: 'WoW', desc: 'Crackles with elemental fury.' },
  ashbringer: { name: 'Ashbringer', slot: 'weapon', weaponType: 'oneHanded', visual: 'sword', icon: '🔥', atk: 20, universe: 'WoW', desc: 'A blade of pure holy fire.' },
  sulfuras: { name: 'Sulfuras, Hand of Ragnaros', slot: 'weapon', weaponType: 'twoHanded', visual: 'mace', icon: '☄️', atk: 22, universe: 'WoW', desc: 'Wreathed in molten flame.' },
  frostmourne: { name: 'Frostmourne', slot: 'weapon', weaponType: 'twoHanded', visual: 'sword', icon: '❄️', atk: 19, def: 2, universe: 'WoW', desc: 'A cursed blade that hungers for souls.' },
  shadowmourne: { name: 'Shadowmourne', slot: 'weapon', weaponType: 'twoHanded', visual: 'axe', icon: '💀', atk: 21, universe: 'WoW', desc: "Forged to end the Lich King's reign." },
  vorpalSword: { name: 'Vorpal Sword', slot: 'weapon', weaponType: 'oneHanded', visual: 'sword', icon: '⚔️', atk: 20, universe: 'D&D', desc: 'Said to sever more than flesh.' },
  holyAvenger: { name: 'Holy Avenger', slot: 'weapon', weaponType: 'oneHanded', visual: 'mace', icon: '✨', atk: 18, def: 2, universe: 'D&D', desc: 'Blessed by the gods themselves.' },
  luckBlade: { name: 'Luck Blade', slot: 'weapon', weaponType: 'mainHandOnly', visual: 'dagger', icon: '🍀', atk: 16, goldBonus: 0.15, universe: 'D&D', desc: 'Fortune favors its wielder. +15% gold.' },
  aegisOfAges: { name: 'Aegis of the Ages', slot: 'chest', visual: 'plate', icon: '🛡️', def: 8, hp: 20, universe: 'WoW', desc: 'An ancient, unbreakable ward.' },
  robeOfTheArchmagi: { name: 'Robe of the Archmagi', slot: 'chest', visual: 'cloth', icon: '🧙', def: 4, hp: 15, universe: 'WoW', desc: 'Woven from pure arcane silk.' },
  dragonScaleMail: { name: 'Dragon Scale Mail', slot: 'chest', visual: 'mail', icon: '🐉', def: 7, hp: 18, universe: 'D&D', desc: 'Scales shed by an ancient wyrm.' }
};

function instantiateLegendary(id) {
  const def = LEGENDARY_ITEMS[id];
  return {
    uid: 'leg' + Math.random().toString(36).slice(2, 10),
    defId: id,
    slot: def.slot,
    weaponType: def.weaponType,
    rarity: 'legendary',
    legendary: true,
    name: def.name,
    icon: def.icon,
    visual: def.visual,
    atk: def.atk || 0,
    def: def.def || 0,
    hp: def.hp || 0,
    goldBonus: def.goldBonus || 0
  };
}

function rollLootRarity(isBoss, isElite) {
  const roll = Math.random() + (isBoss ? 0.5 : isElite ? 0.25 : 0);
  if (roll > 1.35) return 'legendary';
  if (roll > 1.05) return 'epic';
  if (roll > 0.75) return 'rare';
  if (roll > 0.45) return 'uncommon';
  return 'common';
}

function rollLootDrop(enemy) {
  const dropChance = enemy.boss ? 1 : enemy.elite ? 0.5 : 0.16;
  if (Math.random() > dropChance) return null;
  const ids = Object.keys(GEAR_TEMPLATES);
  const defId = ids[rand(0, ids.length - 1)];
  return instantiateGear(defId, rollLootRarity(enemy.boss, enemy.elite));
}

// Which profession's passive boosts which material kind's drop AMOUNT (not
// its chance to appear at all) - see PROFESSION_PASSIVES in data.js. Applies
// based on that profession's own level regardless of whether it's the
// currently-*active* one, same as professionStatBonus below.
const MATERIAL_GATHERING_PROFESSION = { ore: 'mining', herbs: 'herbalism', wood: 'logging' };

function rollMaterialDrop(enemy) {
  if (Math.random() > 0.5) return null;
  const kinds = ['ore', 'leather', 'essence', 'herbs', 'wood'];
  const kind = kinds[rand(0, kinds.length - 1)];
  let amount = enemy.boss ? rand(4, 8) : enemy.elite ? rand(2, 4) : rand(1, 2);
  const profId = MATERIAL_GATHERING_PROFESSION[kind];
  if (profId && Game.player) {
    const rec = Persistent.getCharacter(Game.player.classId);
    const level = rec.profession.levels[profId];
    amount = Math.round(amount * (1 + PROFESSION_PASSIVES[profId].perLevelPct * (level - 1)));
  }
  return { kind, amount };
}

// All recipes craft at 'uncommon' rarity ONLY (see getRecipeRarity below,
// which can raise a specific recipe's ceiling one tier at a time via the
// Crafting "Upgrade" button) - crafted gear is meant to stay slightly weaker
// than what drops during encounters (which can roll all the way to
// legendary), and capping the recipe rarity itself is simpler than
// maintaining separate weaker stat templates.
const RECIPES = [
  // Weapons - one recipe per weaponType so every class has something to craft.
  { id: 'craftIronSword', defId: 'ironSword', rarity: 'uncommon', cost: { gold: 40, ore: 3 } },
  { id: 'craftSteelGreataxe', defId: 'steelGreataxe', rarity: 'uncommon', cost: { gold: 60, ore: 6, essence: 2 } },
  { id: 'craftHuntersBow', defId: 'huntersBow', rarity: 'uncommon', cost: { gold: 55, ore: 4, leather: 3 } },
  { id: 'craftRunedStaff', defId: 'runedStaff', rarity: 'uncommon', cost: { gold: 65, essence: 4, ore: 2 } },
  { id: 'craftDagger', defId: 'genWeapon2', rarity: 'uncommon', cost: { gold: 35, ore: 2 } },
  { id: 'craftLute', defId: 'genWeapon7', rarity: 'uncommon', cost: { gold: 40, wood: 2 } },
  { id: 'craftShield', defId: 'ironShield', rarity: 'uncommon', cost: { gold: 45, ore: 3 } },
  { id: 'craftWand', defId: 'runedWand', rarity: 'uncommon', cost: { gold: 50, essence: 3 } },
  { id: 'craftThrown', defId: 'throwingAxe', rarity: 'uncommon', cost: { gold: 35, ore: 2, wood: 1 } },
  { id: 'craftBlessing', defId: 'blessingOfMight', rarity: 'uncommon', cost: { gold: 50, essence: 2 } },
  // Armor/accessories - one recipe per remaining equip slot.
  { id: 'craftLeatherVest', defId: 'leatherVest', rarity: 'uncommon', cost: { gold: 35, leather: 3 } },
  { id: 'craftChainmail', defId: 'chainmail', rarity: 'uncommon', cost: { gold: 45, leather: 5, ore: 2 } },
  { id: 'craftPlateArmor', defId: 'plateArmor', rarity: 'uncommon', cost: { gold: 55, leather: 5, essence: 3, ore: 3 } },
  { id: 'craftHead', defId: 'genHead1', rarity: 'uncommon', cost: { gold: 40, leather: 2, ore: 1 } },
  { id: 'craftNeck', defId: 'genNeck1', rarity: 'uncommon', cost: { gold: 45, essence: 2 } },
  { id: 'craftShoulders', defId: 'genShoulders1', rarity: 'uncommon', cost: { gold: 40, leather: 2, ore: 1 } },
  { id: 'craftBack', defId: 'genBack1', rarity: 'uncommon', cost: { gold: 35, leather: 2 } },
  { id: 'craftWrists', defId: 'genWrists1', rarity: 'uncommon', cost: { gold: 30, leather: 1, ore: 1 } },
  { id: 'craftHands', defId: 'genHands1', rarity: 'uncommon', cost: { gold: 30, leather: 2 } },
  { id: 'craftWaist', defId: 'genWaist1', rarity: 'uncommon', cost: { gold: 30, leather: 2 } },
  { id: 'craftLegs', defId: 'genLegs1', rarity: 'uncommon', cost: { gold: 45, leather: 2, ore: 2 } },
  { id: 'craftRing', defId: 'genRing1', rarity: 'uncommon', cost: { gold: 50, essence: 2 } },
  { id: 'craftTrinket', defId: 'genTrinket1', rarity: 'uncommon', cost: { gold: 55, essence: 2, ore: 1 } },
  { id: 'craftShirt', defId: 'genShirt1', rarity: 'uncommon', cost: { gold: 15 } },
  { id: 'craftTabard', defId: 'genTabard1', rarity: 'uncommon', cost: { gold: 15 } }
];

// A recipe's craftable rarity ceiling, one tier per Upgrade consumed (see
// RECIPE_ITEMS/instantiateRecipeItem below and the Crafting "Upgrade" button
// in main.js) - persists in pdata.recipeRarityBoost, capped at legendary.
const RARITY_ORDER = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
function getRecipeRarity(recipeId) {
  const recipe = RECIPES.find(r => r.id === recipeId);
  const boost = Persistent.load().recipeRarityBoost[recipeId] || 0;
  const idx = Math.min(RARITY_ORDER.length - 1, RARITY_ORDER.indexOf(recipe.rarity) + boost);
  return RARITY_ORDER[idx];
}

// A Recipe item - drops rarely from encounters (see rollRecipeDrop) and is
// consumed via the Crafting "Upgrade" button to permanently raise the
// matching recipe's craftable rarity by one tier (see getRecipeRarity).
function instantiateRecipeItem(recipeId) {
  const recipe = RECIPES.find(r => r.id === recipeId);
  const tmpl = GEAR_TEMPLATES[recipe.defId];
  return {
    uid: 'r' + Math.random().toString(36).slice(2, 10),
    defId: recipeId, slot: 'recipe', recipeId,
    name: `Recipe: ${tmpl.name}`, icon: '📜',
    desc: `Consume in Crafting to permanently craft ${tmpl.name} one rarity higher.`
  };
}

// A Cooking recipe's "Recipe item" reuses instantiateRecipeItem's shape (slot
// 'recipe', a recipeId pointing back at COOKING_RECIPES instead of RECIPES) -
// the Crafting Upgrade button branch just needs to look the id up in the
// right list, same as getFoodRecipeRarity does.
function instantiateFoodRecipeItem(recipeId) {
  const recipe = COOKING_RECIPES.find(r => r.id === recipeId);
  const tmpl = FOOD_TEMPLATES[recipe.defId];
  return {
    uid: 'r' + Math.random().toString(36).slice(2, 10),
    defId: recipeId, slot: 'recipe', recipeId,
    name: `Recipe: ${tmpl.name}`, icon: '📜',
    desc: `Consume in Crafting to permanently cook ${tmpl.name} one rarity higher.`
  };
}

function rollRecipeDrop() {
  if (Math.random() > 0.06) return null;
  if (Math.random() < 0.5) return instantiateRecipeItem(RECIPES[rand(0, RECIPES.length - 1)].id);
  return instantiateFoodRecipeItem(COOKING_RECIPES[rand(0, COOKING_RECIPES.length - 1)].id);
}

// --- Cooking (food items) ---
// Mirrors the gear Recipe/Upgrade system exactly (getRecipeRarity/
// instantiateRecipeItem above) but for COOKING_RECIPES/FOOD_TEMPLATES (data.js)
// instead of RECIPES/GEAR_TEMPLATES - both share the same pdata.recipeRarityBoost
// bucket (recipe ids never collide between the two lists) so a food recipe's
// Upgrade button works exactly like a gear recipe's.
function getFoodRecipeRarity(recipeId) {
  const recipe = COOKING_RECIPES.find(r => r.id === recipeId);
  const boost = Persistent.load().recipeRarityBoost[recipeId] || 0;
  const idx = Math.min(RARITY_ORDER.length - 1, RARITY_ORDER.indexOf(recipe.rarity) + boost);
  return RARITY_ORDER[idx];
}

// A cooked food item - eaten directly (Rest) or fed to a pet/mount (House)
// for a temporary buff (see FEED_BUFF_DURATION_MS in data.js). Rarity scales
// the food's effect{} the same way instantiateGear scales gear stats.
function instantiateFoodItem(defId, rarity) {
  const tmpl = FOOD_TEMPLATES[defId];
  const mult = RARITIES[rarity].mult;
  const item = {
    uid: 'fd' + Math.random().toString(36).slice(2, 10),
    defId, slot: 'food', rarity,
    name: tmpl.name, icon: tmpl.icon, effect: {}
  };
  Object.keys(tmpl.effect).forEach(k => {
    const raw = tmpl.effect[k] * mult;
    item.effect[k] = Number.isInteger(tmpl.effect[k]) ? Math.round(raw) : Math.round(raw * 1000) / 1000;
  });
  return item;
}

// Grants a temporary buff from an effect{} bag (a food's own effect when
// eaten directly, or a companion's effect when fed to a pet/mount) - see
// activeBuffStatBonus, which sums every non-expired entry generically.
function grantTempBuff(label, icon, effect) {
  const pdata = Persistent.load();
  pdata.activeBuffs.push({
    id: 'buff' + Math.random().toString(36).slice(2, 10),
    label, icon, effect, expiresAt: Date.now() + FEED_BUFF_DURATION_MS
  });
  Persistent.save();
}

// --- AFK / idle progress ---
// Called once at App.init() (see main.js), before the title screen shows.
// This is a statistical estimate of "what would have happened," not a
// literal replay of the game loop - there's no active Game/run object to
// advance while the tab is closed, so instead it grants the LAST character
// the player was actively viewing in the Sanctuary (pdata.lastPlayedClassId,
// kept fresh by showSanctuary) a lump sum of level-ups, gold, materials,
// items, and gathering-profession XP based on how long Persistent.save()
// (see above) hasn't run. Below AFK_MIN_MINUTES away, this is a no-op - a
// quick tab refresh shouldn't trigger a welcome-back screen.
const AFK_MIN_MINUTES = 5;
const AFK_ECONOMY_RATE = 0.7; // gold/materials/items accrue at 70% of an active-play rate
const AFK_LEVELS_PER_HOUR = 0.25;

function computeAfkProgress() {
  const pdata = Persistent.load();
  const now = Date.now();
  const elapsedMs = Math.max(0, now - (pdata.lastSeenAt || now));
  const elapsedMinutes = elapsedMs / 60000;
  if (elapsedMinutes < AFK_MIN_MINUTES) return null;
  const classId = pdata.lastPlayedClassId;
  if (!classId || !CLASSES[classId] || !isClassUnlocked(classId)) return null;

  const elapsedHours = elapsedMinutes / 60;
  const rec = Persistent.getCharacter(classId);
  const startLevel = rec.level;

  // Leveling: a flat 1/4 level per hour, realized as real XP fed through the
  // normal grantXpToCharacter curve (using the XP-to-next-level cost at the
  // level the character started this AFK stretch at) so it plays by the
  // same rules a live level-up would, carries over remainders correctly
  // across multiple level-ups, and naturally stops at MAX_LEVEL.
  const xpGained = Math.round(AFK_LEVELS_PER_HOUR * elapsedHours * xpForLevel(startLevel));
  const levelResult = xpGained > 0 ? grantXpToCharacter(rec, xpGained) : { levelsGained: 0 };

  // Economy: gold/materials/items at 70% of a rough "active hour" baseline,
  // scaled up by the character's starting level (so a higher-level character
  // earns more per hour AFK, matching how a real adventure scales with act/level).
  const levelFactor = 1 + (startLevel - 1) * 0.15;
  const goldGained = Math.round(250 * levelFactor * AFK_ECONOMY_RATE * elapsedHours);
  pdata.bankGold += goldGained;

  const materialsGained = {};
  ['ore', 'leather', 'essence', 'herbs', 'wood', 'fish'].forEach(kind => {
    const amt = Math.round(8 * levelFactor * AFK_ECONOMY_RATE * elapsedHours);
    if (amt > 0) { pdata.materials[kind] += amt; materialsGained[kind] = amt; }
  });

  const itemCount = Math.floor(3 * AFK_ECONOMY_RATE * elapsedHours + Math.random());
  const itemsGained = [];
  const gearIds = Object.keys(GEAR_TEMPLATES);
  for (let i = 0; i < itemCount; i++) {
    const item = instantiateGear(gearIds[rand(0, gearIds.length - 1)], rollLootRarity(false, false));
    pdata.inventory.push(item);
    itemsGained.push(item);
  }

  // Gathering profession XP - same 70% rate, only for whichever profession
  // is currently equipped (matches how only the active one earns XP live).
  let professionLevelsGained = 0;
  const profId = rec.profession.active;
  if (profId) {
    const profXpGained = Math.round(40 * levelFactor * AFK_ECONOMY_RATE * elapsedHours);
    if (profXpGained > 0) professionLevelsGained = _grantProfessionXpToId(rec.profession, profId, profXpGained).levelsGained;
  }

  Persistent.save();
  return {
    classId, elapsedMs, xpGained, levelsGained: levelResult.levelsGained,
    goldGained, materialsGained, itemsGained, professionId: profId, professionLevelsGained
  };
}

const BANK_SHOP = {
  relics: Object.keys(RELICS).map(id => ({ id, price: 180 })),
  spells: ['frostbolt', 'execute', 'chainLightning', 'inspire'].map(id => ({ id, price: 220 })),
  gear: [
    { defId: 'rustedBlade', rarity: 'common', price: 30 },
    { defId: 'clothRobe', rarity: 'common', price: 25 }
  ]
};

// --- Leveling ---
// A literal compounding "+10% per level" overflows to Infinity well before level
// ~7000 (1.1^n blows past double-precision range), which would break the game long
// before the requested cap of 9,999,999. So growth here is linear instead - each
// level adds another 10% of BASE stats - which keeps "+10% per level" true at every
// single step while staying a finite, sane number all the way to the cap.
const MAX_LEVEL = 99;

function levelStatMultiplier(level) {
  return 1 + 0.10 * (level - 1);
}

function xpForLevel(level) {
  return Math.floor(40 * Math.pow(level, 1.55)) + 20;
}

function grantXpToCharacter(charRecord, amount) {
  if (charRecord.level >= MAX_LEVEL) return { levelsGained: 0 };
  charRecord.xp += amount;
  let levelsGained = 0;
  while (charRecord.level < MAX_LEVEL) {
    const need = xpForLevel(charRecord.level);
    if (charRecord.xp < need) break;
    charRecord.xp -= need;
    charRecord.level += 1;
    levelsGained += 1;
  }
  return { levelsGained };
}

// --- Gathering professions ---
// Same shape of leveling as character XP, but capped at 99 (see PROFESSIONS
// in data.js) and tracked once per profession per character rather than one
// single number - see grantProfessionXpToCharacter below for why only the
// currently-equipped profession actually advances.
const PROFESSION_MAX_LEVEL = 99;

function professionXpForLevel(level) {
  return Math.floor(20 * Math.pow(level, 1.35)) + 10;
}

function _grantProfessionXpToId(prof, id, amount) {
  if (prof.levels[id] >= PROFESSION_MAX_LEVEL) return { levelsGained: 0 };
  prof.xp[id] += amount;
  let levelsGained = 0;
  while (prof.levels[id] < PROFESSION_MAX_LEVEL) {
    const need = professionXpForLevel(prof.levels[id]);
    if (prof.xp[id] < need) break;
    prof.xp[id] -= need;
    prof.levels[id] += 1;
    levelsGained += 1;
  }
  return { levelsGained, professionId: id };
}

// Only the character's currently-equipped profession (charRecord.profession.active)
// gains XP - this is what "only one profession may be leveled at a time" means
// in practice: every profession keeps its own level/xp so switching back to
// one you've worked on before resumes it, but XP only ever flows into
// whichever one is presently equipped.
function grantProfessionXpToCharacter(charRecord, amount) {
  const prof = charRecord.profession;
  const id = prof && prof.active;
  if (!id) return { levelsGained: 0 };
  return _grantProfessionXpToId(prof, id, amount);
}

// Bypasses the "only the active profession gains XP" rule - used only for
// specific cross-profession interactions (cooking a fish Fishing caught, at
// a Rest encounter), so that action always boosts Cooking specifically
// regardless of which profession you currently have equipped.
function grantSpecificProfessionXp(charRecord, professionId, amount) {
  return _grantProfessionXpToId(charRecord.profession, professionId, amount);
}

// --- Class unlock trials ---
// Rare map encounters that let the player permanently unlock a bonus class by
// defeating a "spectral guardian" of that class (rendered using the class's own
// sprite, tinted, since it's meant to look like an echo of that class).
const CLASS_TRIALS = {
  paladin: { name: "Paladin's Trial", hp: 50, atk: 9, def: 3, speed: 4, gold: [40, 60] },
  hunter: { name: "Hunter's Trial", hp: 40, atk: 10, def: 1, speed: 8, gold: [40, 60] },
  warlock: { name: "Warlock's Trial", hp: 42, atk: 10, def: 1, speed: 5, gold: [40, 60] },
  barbarian: { name: "Barbarian's Trial", hp: 55, atk: 11, def: 2, speed: 3, gold: [40, 60] },
  cleric: { name: "Cleric's Trial", hp: 44, atk: 8, def: 3, speed: 4, gold: [40, 60] },
  bard: { name: "Bard's Trial", hp: 38, atk: 8, def: 1, speed: 7, gold: [40, 60] }
};

function getLockedClassIds() {
  const unlocked = Persistent.load().unlockedClasses;
  return Object.keys(CLASS_TRIALS).filter(id => !unlocked.includes(id));
}

function isClassUnlocked(classId) {
  const cls = CLASSES[classId];
  return !!(cls.starter || Persistent.load().unlockedClasses.includes(classId));
}

// --- Quests (Sanctuary) ---
// Objectives are tracked cumulatively in Persistent.questProgress (so partial
// progress survives permadeath) and advanced by Game.recordQuestProgress()
// (called from combat/gold-gain code in main.js/state.js). Rewards are claimed
// back in the Sanctuary once complete - gold/XP/weapons/armor/relics all land
// as PERMANENT Sanctuary rewards (XP applies to whichever class tab you claim
// from), unlike the run-only relics found during an adventure. Quests are
// REPEATABLE: claiming one returns it to the available list, and every
// repeat doubles both its objective target and its numeric rewards (gold/XP -
// a one-time weapon/armor/relic reward stays as-is on repeats) so they never
// go stale for a run that keeps going.
const QUESTS = [
  { id: 'q_slimeCull', name: 'Cull the Weak', objective: { type: 'kills', target: 5 }, reward: { gold: 50, xp: 20 } },
  { id: 'q_eliteHunt', name: 'Elite Hunter', objective: { type: 'eliteKills', target: 3 }, reward: { gold: 120, xp: 60, item: { defId: 'ironSword', rarity: 'uncommon' } } },
  { id: 'q_bossSlayer', name: 'Boss Slayer', objective: { type: 'bossKills', target: 2 }, reward: { gold: 200, xp: 100, item: { defId: 'chainmail', rarity: 'rare' } } },
  { id: 'q_goldRush', name: 'Gold Rush', objective: { type: 'goldEarned', target: 300 }, reward: { gold: 80, relic: 'luckyCoin' } },
  { id: 'q_actClear', name: 'Deeper Adventure', objective: { type: 'bossKills', target: 3 }, reward: { gold: 250, xp: 150, item: { defId: 'plateArmor', rarity: 'epic' } } },
  { id: 'q_veteranSlayer', name: 'Veteran Slayer', objective: { type: 'kills', target: 15 }, reward: { gold: 150, xp: 80, relic: 'ironSkin' } },
  { id: 'q_direHunt', name: 'Dire Threats', objective: { type: 'eliteKills', target: 6 }, reward: { gold: 220, item: { defId: 'steelGreataxe', rarity: 'rare' } } },
  { id: 'q_richDescent', name: 'Fortune Favors the Bold', objective: { type: 'goldEarned', target: 600 }, reward: { gold: 150, xp: 60, relic: 'eagleEye' } },
  // --- PvP quests: same repeatable/doubling logic as the rest, but reward
  // Honor (scaled to how hard the quest is) instead of a relic/item.
  { id: 'q_pvpFirstBlood', name: 'First Blood', objective: { type: 'pvpWins', target: 1 }, reward: { gold: 40, xp: 20, honor: 30 } },
  { id: 'q_pvpDuelist', name: 'Duelist', objective: { type: 'pvpWins', target: 2 }, reward: { gold: 70, xp: 35, honor: 60 } },
  { id: 'q_pvpGladiator', name: 'Gladiator', objective: { type: 'pvpWins', target: 3 }, reward: { gold: 110, xp: 55, honor: 100 } },
  { id: 'q_pvpChampion', name: 'Champion of the Arena', objective: { type: 'pvpWins', target: 5 }, reward: { gold: 170, xp: 85, honor: 160 } },
  { id: 'q_pvpLegend', name: "Arena Legend", objective: { type: 'pvpWins', target: 8 }, reward: { gold: 260, xp: 130, honor: 240 } }
];

const QUEST_OBJECTIVE_LABELS = {
  kills: (n) => `Defeat ${n} enemies on your adventures.`,
  eliteKills: (n) => `Defeat ${n} elite enemies.`,
  bossKills: (n) => `Defeat ${n} act bosses.`,
  goldEarned: (n) => `Earn ${n} gold across your adventures.`,
  pvpWins: (n) => `Win ${n} PvP matches.`
};

// --- Dungeon/Raid/Act-Boss quests (generated) ---
// One repeatable quest per DUNGEONS/RAID_BOSSES entry (data.js), plus one
// repeatable act-boss quest, all sharing a reward shape new to this batch:
// resourceChance grants one random non-Honor material, epicItem grants one
// random epic-rarity gear item (see claimQuest below).
DUNGEONS.forEach((d, i) => {
  QUESTS.push({ id: `q_dungeon_${d.id}`, name: `Clear ${d.name}`, objective: { type: `dungeon:${d.id}`, target: 1 }, reward: { gold: 60 + i * 15, xp: 30 + i * 8, resourceChance: true, epicItem: true } });
  QUEST_OBJECTIVE_LABELS[`dungeon:${d.id}`] = (n) => `Clear ${d.name} ${n} time${n > 1 ? 's' : ''}.`;
});
RAID_BOSSES.forEach((b, i) => {
  QUESTS.push({ id: `q_raid_${b.id}`, name: `Defeat ${b.name}`, objective: { type: `raid:${b.id}`, target: 1 }, reward: { gold: 120 + i * 25, xp: 60 + i * 15, resourceChance: true, epicItem: true } });
  QUEST_OBJECTIVE_LABELS[`raid:${b.id}`] = (n) => `Defeat ${b.name} ${n} time${n > 1 ? 's' : ''}.`;
});
QUESTS.push({ id: 'q_actBossRepeat', name: 'Endless Vigil', objective: { type: 'bossKills', target: 1 }, reward: { gold: 200, xp: 100, resourceChance: true, epicItem: true } });

function getAvailableQuests() {
  const pdata = Persistent.load();
  return QUESTS.filter(q => !pdata.activeQuestIds.includes(q.id));
}

function getActiveQuests() {
  const pdata = Persistent.load();
  return QUESTS.filter(q => pdata.activeQuestIds.includes(q.id));
}

function getQuestTier(questId) {
  return Persistent.load().questTiers[questId] || 0;
}

// tier 0 = base, tier 1 = 2x, tier 2 = 4x, etc. - each prior claim doubles
// the next round's requirement and numeric reward.
function getScaledQuest(quest) {
  const tier = getQuestTier(quest.id);
  const mult = Math.pow(2, tier);
  const target = Math.round(quest.objective.target * mult);
  return {
    ...quest,
    tier,
    objective: { ...quest.objective, target },
    desc: (QUEST_OBJECTIVE_LABELS[quest.objective.type] || (() => ''))(target),
    reward: {
      ...quest.reward,
      gold: quest.reward.gold ? Math.round(quest.reward.gold * mult) : quest.reward.gold,
      xp: quest.reward.xp ? Math.round(quest.reward.xp * mult) : quest.reward.xp,
      honor: quest.reward.honor ? Math.round(quest.reward.honor * mult) : quest.reward.honor
    }
  };
}

function acceptQuest(questId) {
  const pdata = Persistent.load();
  if (pdata.activeQuestIds.includes(questId)) return;
  pdata.activeQuestIds.push(questId);
  pdata.questProgress[questId] = 0;
  Persistent.save();
}

function isQuestReady(questId) {
  const pdata = Persistent.load();
  const quest = QUESTS.find(q => q.id === questId);
  if (!quest) return false;
  return (pdata.questProgress[questId] || 0) >= getScaledQuest(quest).objective.target;
}

// Advances every active quest matching `type` by `amount` - safe to call
// liberally since it no-ops when no active quest cares about that type.
function recordQuestProgress(type, amount) {
  const pdata = Persistent.load();
  let changed = false;
  pdata.activeQuestIds.forEach(id => {
    const quest = QUESTS.find(q => q.id === id);
    if (!quest || quest.objective.type !== type) return;
    const cap = getScaledQuest(quest).objective.target;
    pdata.questProgress[id] = Math.min(cap, (pdata.questProgress[id] || 0) + amount);
    changed = true;
  });
  if (changed) Persistent.save();
}

// Grants the (tier-scaled) reward, then returns the quest to the available
// pool at the next tier rather than retiring it - quests are repeatable.
// XP (if the reward has any) is applied to whichever class you're viewing in
// the Sanctuary when you claim - quests aren't tied to one class the way
// relics found mid-run are.
function claimQuest(questId, classIdForXp) {
  const pdata = Persistent.load();
  const quest = QUESTS.find(q => q.id === questId);
  if (!quest || !isQuestReady(questId)) return null;
  const reward = getScaledQuest(quest).reward;
  if (reward.gold) pdata.bankGold += reward.gold;
  if (reward.xp && classIdForXp) grantXpToCharacter(Persistent.getCharacter(classIdForXp), reward.xp);
  if (reward.honor) pdata.honor += reward.honor;
  if (reward.item) pdata.inventory.push(instantiateGear(reward.item.defId, reward.item.rarity));
  if (reward.relic && !pdata.permanentRelics.includes(reward.relic)) pdata.permanentRelics.push(reward.relic);
  if (reward.resourceChance) {
    const kinds = ['ore', 'leather', 'essence', 'herbs', 'wood', 'fish'];
    const kind = kinds[rand(0, kinds.length - 1)];
    pdata.materials[kind] += rand(3, 8);
  }
  if (reward.epicItem) {
    const ids = Object.keys(GEAR_TEMPLATES);
    pdata.inventory.push(instantiateGear(ids[rand(0, ids.length - 1)], 'epic'));
  }
  pdata.activeQuestIds = pdata.activeQuestIds.filter(id => id !== questId);
  pdata.questTiers[questId] = (pdata.questTiers[questId] || 0) + 1;
  delete pdata.questProgress[questId];
  Persistent.save();
  return reward;
}

// --- Pets & Mounts ---
// Sums the effect{} of whichever pet/mount a character has equipped (see
// PETS/MOUNTS in data.js) - folded into Game.effectiveStats() alongside relics
// so a tamed companion's bonuses apply automatically on every future run.
// --- Companion (pet/mount) leveling ---
// Pets/mounts are owned account-wide (pdata.ownedPets/ownedMounts), so their
// level/xp is tracked account-wide too, in pdata.companionLevels - the same
// tamed Spectral Tiger is exactly as leveled no matter which character has it
// equipped. Reuses the profession XP curve/max level (99) rather than a
// separate formula. A companion's effect{} scales up with its level (see
// COMPANION_LEVEL_SCALING below) the same way gear scales with rarity.
const COMPANION_LEVEL_SCALING = 0.02; // +2% of the base effect per level above 1

function getCompanionProgress(kind, id) {
  const pdata = Persistent.load();
  if (!pdata.companionLevels[kind][id]) pdata.companionLevels[kind][id] = { level: 1, xp: 0 };
  return pdata.companionLevels[kind][id];
}

// Same shape as _grantProfessionXpToId - kept separate (rather than a shared
// helper) since professions live on the character record while companion
// levels live on the account-wide persistent store.
function grantCompanionXp(kind, id, amount) {
  const progress = getCompanionProgress(kind, id);
  if (progress.level >= PROFESSION_MAX_LEVEL) return { levelsGained: 0 };
  progress.xp += amount;
  let levelsGained = 0;
  while (progress.level < PROFESSION_MAX_LEVEL) {
    const need = professionXpForLevel(progress.level);
    if (progress.xp < need) break;
    progress.xp -= need;
    progress.level += 1;
    levelsGained += 1;
  }
  return { levelsGained };
}

function companionStatBonus(charRecord) {
  const base = {};
  RELIC_EFFECT_KEYS.forEach(k => { base[k] = 0; });
  [['pet', PETS, charRecord.equipped.pet], ['mount', MOUNTS, charRecord.equipped.mount]].forEach(([kind, pool, id]) => {
    const c = id ? pool[id] : null;
    if (!c || !c.effect) return;
    const level = getCompanionProgress(kind, id).level;
    const mult = 1 + (level - 1) * COMPANION_LEVEL_SCALING;
    Object.keys(c.effect).forEach(key => { base[key] = (base[key] || 0) + c.effect[key] * mult; });
  });
  return base;
}

// A temporary player-wide buff (see FEED_BUFF_DURATION_MS/Cooking food in
// main.js) - stacks with everything else generically via the same effect{}
// lever bag relics/gear/talents use. Stored in pdata.activeBuffs (survives
// reload/leaving the Sanctuary, since a 1-hour real-world buff should keep
// ticking regardless of what screen the player is on) and pruned lazily
// whenever stats are computed.
function activeBuffStatBonus() {
  const pdata = Persistent.load();
  const now = Date.now();
  const before = pdata.activeBuffs.length;
  pdata.activeBuffs = pdata.activeBuffs.filter(b => b.expiresAt > now);
  if (pdata.activeBuffs.length !== before) Persistent.save();
  const base = {};
  RELIC_EFFECT_KEYS.forEach(k => { base[k] = 0; });
  pdata.activeBuffs.forEach(b => {
    Object.keys(b.effect || {}).forEach(key => { base[key] = (base[key] || 0) + b.effect[key]; });
  });
  return base;
}

// --- Talents ---
// One point per character level (see grantXpToCharacter's caller in state.js
// for where levels come from). See TALENT_TREES in data.js for the tier-
// gating rule and per-tree/per-class layout.
function getTalentPointsForLevel(level) {
  return Math.max(0, level - 1);
}

function getTalentRanksSpent(rec) {
  return Object.values(rec.talents.ranks).reduce((sum, r) => sum + r, 0);
}

function getTalentPointsAvailable(rec) {
  return Math.max(0, getTalentPointsForLevel(rec.level) - getTalentRanksSpent(rec));
}

function getTreeSpentPoints(rec, treeTalents) {
  return treeTalents.reduce((sum, t) => sum + (rec.talents.ranks[t.id] || 0), 0);
}

// Tier 0 (the tree's first talent) is always open; tier N needs
// N * TALENT_TIER_SIZE points already spent in that tree's earlier tiers.
function isTalentTierUnlocked(rec, treeTalents, tierIndex) {
  if (tierIndex === 0) return true;
  let priorRanks = 0;
  for (let i = 0; i < tierIndex; i++) priorRanks += (rec.talents.ranks[treeTalents[i].id] || 0);
  return priorRanks >= tierIndex * TALENT_TIER_SIZE;
}

function investTalentPoint(rec, classId, treeKey, talentId) {
  const tree = TALENT_TREES[classId] && TALENT_TREES[classId][treeKey];
  if (!tree) return false;
  const tierIndex = tree.talents.findIndex(t => t.id === talentId);
  if (tierIndex === -1) return false;
  const talent = tree.talents[tierIndex];
  if (!isTalentTierUnlocked(rec, tree.talents, tierIndex)) return false;
  const currentRank = rec.talents.ranks[talentId] || 0;
  if (currentRank >= talent.maxRank) return false;
  if (getTalentPointsAvailable(rec) <= 0) return false;
  rec.talents.ranks[talentId] = currentRank + 1;
  return true;
}

function resetTalents(rec) {
  rec.talents.ranks = {};
}

// Sums every invested talent's effect{} (scaled by its current rank) into
// the same lever bag relics/curses/companions use - folded into
// Game.effectiveStats() and previewClassStats() alongside those.
function talentStatBonus(classId, rec) {
  const base = {};
  RELIC_EFFECT_KEYS.forEach(k => { base[k] = 0; });
  const trees = TALENT_TREES[classId];
  if (!trees || !rec.talents) return base;
  Object.values(trees).forEach(tree => {
    tree.talents.forEach(t => {
      const rank = rec.talents.ranks[t.id] || 0;
      if (!rank) return;
      Object.keys(t.effect).forEach(key => { base[key] = (base[key] || 0) + t.effect[key] * rank; });
    });
  });
  return base;
}

// Only First Aid currently contributes a persistent combat-stat lever
// (potionHealBonus) - the other professions' passives are resource/economy
// hooks applied directly at their own call sites (rollMaterialDrop,
// generateTreasureReward, Crafting, Rest) rather than through this bag.
// Applies based on the profession's own level, regardless of whether it's
// the currently-*active* (XP-earning) one - once you've reached a level in
// something, you keep what it taught you.
function professionStatBonus(rec) {
  const base = {};
  RELIC_EFFECT_KEYS.forEach(k => { base[k] = 0; });
  if (!rec.profession) return base;
  const level = rec.profession.levels.firstAid;
  base.potionHealBonus += PROFESSION_PASSIVES.firstAid.perLevelPct * (level - 1);
  return base;
}

// --- Persistent store ---
const Persistent = {
  key: 'browserRpg_persistent',
  data: null,

  load() {
    if (this.data) return this.data;
    try {
      const raw = localStorage.getItem(this.key);
      if (raw) { this.data = JSON.parse(raw); this.applyDefaults(); return this.data; }
    } catch (e) { /* ignore corrupt storage */ }
    this.data = this.blank();
    return this.data;
  },

  blank() {
    return {
      bankGold: 0, materials: { ore: 0, leather: 0, essence: 0, herbs: 0, wood: 0, fish: 0 }, inventory: [], permanentRelics: [], unlockedSpells: [], unlockedClasses: [], ownedLegendaries: [], characters: {},
      ownedPets: [], ownedMounts: [], activeQuestIds: [], questProgress: {}, questTiers: {}, completedQuestIds: [],
      honor: 0, honorInventory: [], honorPotionCount: 0, pvpInventory: [], randomPvpEnabled: false, recipeRarityBoost: {},
      companionLevels: { pet: {}, mount: {} }, activeBuffs: [], lastSeenAt: Date.now()
    };
  },

  applyDefaults() {
    const d = this.data;
    const blank = this.blank();
    Object.keys(blank).forEach(key => { if (d[key] === undefined) d[key] = blank[key]; });
    Object.keys(blank.materials).forEach(key => { if (d.materials[key] === undefined) d.materials[key] = 0; });
    // Backfill weaponType on any weapon saved before that field existed -
    // without this, old saves would have permanently unequippable weapons
    // (equipSlotKeysFor returns [] for a weapon with no recognized type).
    d.inventory.forEach(item => {
      if (item.slot === 'weapon' && !item.weaponType) {
        const tmpl = GEAR_TEMPLATES[item.defId] || LEGENDARY_ITEMS[item.defId];
        item.weaponType = (tmpl && tmpl.weaponType) || WEAPON_TYPE_BY_VISUAL[item.visual] || 'oneHanded';
      }
    });
  },

  save() {
    // Every save is treated as "the player was just here" - the AFK/idle
    // system (computeAfkProgress) reads this on the next launch to know how
    // long the game was actually closed for, so it needs to reflect the
    // moment of the last real interaction, not just app open/close.
    if (this.data) this.data.lastSeenAt = Date.now();
    try { localStorage.setItem(this.key, JSON.stringify(this.data)); } catch (e) { /* storage unavailable */ }
  },

  getCharacter(classId) {
    const d = this.load();
    if (!d.characters[classId]) {
      d.characters[classId] = { level: 1, xp: 0, equipped: { spell: null, pet: null, mount: null }, customization: { name: '', hairColor: null, eyeColor: null, armorColor: null } };
    }
    const rec = d.characters[classId];
    const eq = rec.equipped;
    // Migrate pre-slot-overhaul saves: the old single weapon/armor keys
    // become mainHand/chest, then get deleted so EQUIP_GEAR_KEYS is the only
    // source of truth going forward.
    if (eq.weapon !== undefined) { if (eq.mainHand === undefined) eq.mainHand = eq.weapon; delete eq.weapon; }
    if (eq.armor !== undefined) { if (eq.chest === undefined) eq.chest = eq.armor; delete eq.armor; }
    EQUIP_GEAR_KEYS.forEach(key => { if (eq[key] === undefined) eq[key] = null; });
    if (eq.pet === undefined) eq.pet = null;
    if (eq.mount === undefined) eq.mount = null;
    if (!rec.customization) rec.customization = { name: '', hairColor: null, eyeColor: null, armorColor: null };
    if (!rec.profession) rec.profession = { active: null, levels: {}, xp: {} };
    Object.keys(PROFESSIONS).forEach(id => {
      if (rec.profession.levels[id] === undefined) rec.profession.levels[id] = 1;
      if (rec.profession.xp[id] === undefined) rec.profession.xp[id] = 0;
    });
    if (!rec.talents) rec.talents = { ranks: {} };
    if (!rec.pvpEquipped) rec.pvpEquipped = { weapon: null, armor: null, trinket: null };
    // Migrate pre-rarity Honor Shop saves: pvpEquipped used to hold the fixed
    // HONOR_SHOP.weapon/armor id strings directly rather than a pvpInventory
    // uid - those no longer resolve to anything, so clear them.
    if (rec.pvpEquipped.weapon === 'pvpWeapon') rec.pvpEquipped.weapon = null;
    if (rec.pvpEquipped.armor === 'pvpArmor') rec.pvpEquipped.armor = null;
    if (rec.pvpEquipped.trinket === undefined) rec.pvpEquipped.trinket = null;
    return rec;
  },

  findItem(uid) {
    return this.load().inventory.find(i => i.uid === uid) || null;
  },

  findPvpItem(uid) {
    return this.load().pvpInventory.find(i => i.uid === uid) || null;
  },

  unequipEverywhere(uid) {
    const d = this.load();
    Object.values(d.characters).forEach(c => unequipItemEverywhereOnRecord(c, uid));
  }
};

// Effective combat stats for a class as configured in the Sanctuary (no active run
// needed) - mirrors Game.effectiveStats() so the Sanctuary preview matches reality.
function previewClassStats(classId) {
  const cls = CLASSES[classId];
  const rec = Persistent.getCharacter(classId);
  const gear = gearStatBonus(rec);
  const bonus = applyRelicEffects(Persistent.load().permanentRelics);
  const companion = companionStatBonus(rec);
  const talent = talentStatBonus(classId, rec);
  const buff = activeBuffStatBonus();
  const lvlMult = levelStatMultiplier(rec.level);
  return {
    atk: Math.round((cls.atk + gear.atk) * lvlMult) + bonus.atk + companion.atk + talent.atk + buff.atk,
    def: cls.def + gear.def + bonus.def + companion.def + talent.def + buff.def,
    maxHp: Math.round((cls.maxHp + gear.maxHp) * lvlMult) + bonus.maxHp + companion.maxHp + talent.maxHp + buff.maxHp,
    speed: cls.speed + bonus.speed + companion.speed + talent.speed + buff.speed,
    goldBonus: bonus.goldBonus + gear.goldBonus + companion.goldBonus + talent.goldBonus + buff.goldBonus
  };
}

// Renders a class's sprite with whatever it currently has equipped (falling
// back to its default WoW-flavored look for empty slots) - the single place
// every screen should call through so equipped gear is always reflected.
// Only the CHEST slot and the main-hand weapon repaint the sprite (see the
// note on GEAR_TEMPLATES) - the other 16 equip slots are stats/Armory-only.
function characterSpriteFor(classId, sizePx) {
  const rec = Persistent.getCharacter(classId);
  const weapon = rec.equipped.mainHand ? Persistent.findItem(rec.equipped.mainHand) : null;
  const armor = rec.equipped.chest ? Persistent.findItem(rec.equipped.chest) : null;
  const options = {};
  if (armor && armor.visual) {
    options.armorShape = ARMOR_STYLE_SHAPE[armor.visual];
    options.armorPalette = tintedPalette(ARMOR_STYLE_PALETTES[armor.visual], ['T', 'W'], armor.rarity);
  }
  if (weapon && weapon.visual) {
    options.weaponStyle = weapon.visual;
    options.weaponPalette = tintedPalette(WEAPON_STYLE_PALETTES[weapon.visual], WEAPON_ACCENT_KEY[weapon.visual], weapon.rarity);
  }
  // Player-chosen customization (hair/eye/armor color, from the Sanctuary
  // Character tab) layers on top of gear-driven options - it overrides just
  // the specific palette keys it cares about, so equipped gear's own trim/
  // accent colors are untouched.
  const custom = rec.customization;
  if (custom && (custom.hairColor || custom.eyeColor)) {
    const baseHead = CLASS_LOOKS[classId].head;
    options.headPalette = { ...baseHead };
    if (custom.hairColor) options.headPalette.r = custom.hairColor;
    if (custom.eyeColor) options.headPalette.e = custom.eyeColor;
  }
  if (custom && custom.armorColor) {
    const baseArmor = options.armorPalette || CLASS_LOOKS[classId].armorPalette;
    options.armorPalette = { ...baseArmor, A: custom.armorColor };
  }
  const isLegendaryWeapon = !!(weapon && weapon.rarity === 'legendary');
  options.legendaryWeapon = isLegendaryWeapon;
  const svg = renderCharacterSprite(classId, sizePx, options);
  return isLegendaryWeapon ? wrapLegendaryWeaponGlow(svg) : svg;
}

// Renders either a playable-class sprite (with its equipped gear) or a
// monster sprite, whichever the id resolves to - lets combat render enemy
// portraits without caring whether the "enemy" is a monster or a class-trial
// guardian wearing a class's own look.
function anyCharacterSvg(id, sizePx) {
  return CLASS_LOOKS[id] ? characterSpriteFor(id, sizePx) : spriteSvg(id, sizePx);
}

// Composes the character together with whatever it currently has equipped as
// a companion: an equipped MOUNT walks just behind/beside the character (not
// ridden - overlaying a rider on the mount's own silhouette read poorly), and
// an equipped PET trots alongside on the other side, smaller. Used everywhere
// the traveling character appears out in the world (the map traveler, the
// combat portrait) - both render as a simple bottom-aligned flex row, laid
// out by .companion-row in styles.css. The Sanctuary's own small icons (HUD,
// class picker) stay plain since there's no room there for a whole group.
function renderCompanionRig(classId, sizePx) {
  const rec = Persistent.getCharacter(classId);
  const mountId = rec.equipped.mount;
  const petId = rec.equipped.pet;
  const riderSvg = anyCharacterSvg(classId, sizePx);
  const mountSvg = mountId ? anyCharacterSvg(mountId, Math.round(sizePx * 0.8)) : '';
  const petSvg = petId ? anyCharacterSvg(petId, Math.round(sizePx * 0.5)) : '';
  // A WoW-style floating nameplate above the character's head, if the player
  // named them in the Sanctuary Character tab.
  const name = rec.customization && rec.customization.name;
  const nameplate = name ? `<span class="nameplate">${escapeHtml(name)}</span>` : '';
  return `<span class="companion-row">` +
    (mountSvg ? `<span class="companion-mount">${mountSvg}</span>` : '') +
    `<span class="companion-rider">${nameplate}${riderSvg}</span>` +
    (petSvg ? `<span class="companion-pet">${petSvg}</span>` : '') +
    `</span>`;
}
