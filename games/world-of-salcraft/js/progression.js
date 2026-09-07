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

// Once a class's body art is a flat PixelLab image (see CLASS_ART_READY in
// sprites.js) rather than an SVG built from named color regions, per-slot
// rarity tinting is no longer possible - this is the replacement: a single
// CSS filter graded by the better of the equipped weapon/armor rarity,
// echoing each rarity's own color (RARITIES[x].color) as a glow so an
// upgrade still visibly reads on the portrait.
const RARITY_SPRITE_FILTER = {
  common: 'none',
  uncommon: 'saturate(1.15) brightness(1.03)',
  rare: 'saturate(1.3) brightness(1.06) hue-rotate(6deg) drop-shadow(0 0 3px rgba(74,143,232,0.55))',
  epic: 'saturate(1.45) brightness(1.08) hue-rotate(-8deg) drop-shadow(0 0 4px rgba(157,111,232,0.65))',
  legendary: 'saturate(1.6) brightness(1.1) hue-rotate(4deg) drop-shadow(0 0 5px rgba(232,169,74,0.75))'
};

function maxRarity(a, b) {
  if (!a) return b || 'common';
  if (!b) return a;
  return RARITIES[a].mult >= RARITIES[b].mult ? a : b;
}

// The account's current Change Difficulty pick (see DIFFICULTIES in
// data.js) - falls back to Normal if a save somehow has an unrecognized id.
function currentDifficulty() {
  return DIFFICULTIES[Persistent.load().difficulty] || DIFFICULTIES.normal;
}

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
// PixelLab-generated icons (assets/icons/gear/) - every weapon/armor/
// accessory item's `icon` field is stamped straight from one of these three
// lookup tables (see generateGearPool/generateAccessoryPool/
// generateEffectPool below), so swapping the table swaps the icon
// everywhere that item ever renders (shop, inventory, armory, quest
// rewards) without touching each call site.
function gearIconImg(path) {
  return `<img src="${path}" width="22" height="22" class="gear-icon" alt="">`;
}
const WEAPON_VISUAL_ICON = {
  sword: gearIconImg('assets/icons/gear/weapon_sword.png'),
  dagger: gearIconImg('assets/icons/gear/weapon_dagger.png'),
  axe: gearIconImg('assets/icons/gear/weapon_axe.png'),
  staff: gearIconImg('assets/icons/gear/weapon_staff.png'),
  bow: gearIconImg('assets/icons/gear/weapon_bow.png'),
  mace: gearIconImg('assets/icons/gear/weapon_mace.png'),
  lute: gearIconImg('assets/icons/gear/weapon_lute.png')
};
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
const ARMOR_VISUAL_ICON = {
  cloth: gearIconImg('assets/icons/gear/armor_cloth.png'),
  leather: gearIconImg('assets/icons/gear/armor_leather.png'),
  mail: gearIconImg('assets/icons/gear/armor_mail.png'),
  plate: gearIconImg('assets/icons/gear/armor_plate.png')
};
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

const ACCESSORY_SLOT_ICON = {
  head: gearIconImg('assets/icons/gear/slot_head.png'),
  neck: gearIconImg('assets/icons/gear/slot_neck.png'),
  shoulders: gearIconImg('assets/icons/gear/slot_shoulders.png'),
  back: gearIconImg('assets/icons/gear/slot_back.png'),
  wrists: gearIconImg('assets/icons/gear/slot_wrists.png'),
  hands: gearIconImg('assets/icons/gear/slot_hands.png'),
  waist: gearIconImg('assets/icons/gear/slot_waist.png'),
  legs: gearIconImg('assets/icons/gear/slot_legs.png'),
  boots: gearIconImg('assets/icons/gear/slot_boots.png'),
  ring: gearIconImg('assets/icons/gear/slot_ring.png'),
  trinket: gearIconImg('assets/icons/gear/slot_trinket.png')
};
const ACCESSORY_SLOT_NOUNS = {
  head: ['Helm', 'Hood', 'Circlet', 'Cowl', 'Crown'],
  neck: ['Necklace', 'Amulet', 'Pendant', 'Choker', 'Torc'],
  shoulders: ['Pauldrons', 'Shoulderguards', 'Mantle', 'Spaulders', 'Epaulets'],
  back: ['Cloak', 'Cape', 'Shroud', 'Drape', 'Mantling'],
  wrists: ['Bracers', 'Wristguards', 'Vambraces', 'Cuffs', 'Bindings'],
  hands: ['Gloves', 'Gauntlets', 'Handwraps', 'Grips', 'Mitts'],
  waist: ['Belt', 'Sash', 'Girdle', 'Cord', 'Waistguard'],
  legs: ['Leggings', 'Greaves', 'Legguards', 'Trousers', 'Kilt'],
  boots: ['Boots', 'Sabatons', 'Treads', 'Footguards', 'Walkers'],
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
  generateAccessoryPool(15, 'boots', (i) => ({ baseDef: 2 + (i % 4), baseHp: 3 + (i % 6) })),
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
const EQUIP_GEAR_KEYS = ['mainHand', 'offHand', 'ranged', 'head', 'neck', 'shoulders', 'back', 'chest', 'shirt', 'tabard', 'wrists', 'hands', 'waist', 'legs', 'boots', 'ring1', 'ring2', 'trinket1', 'trinket2'];

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
    if (item.enchantId && ENCHANTS[item.enchantId]) {
      const enchantEffect = ENCHANTS[item.enchantId].effect;
      Object.keys(enchantEffect).forEach(k => { base[k] = (base[k] || 0) + enchantEffect[k]; });
    }
  });
  return base;
}

// The Gear Set Bonus - a global % multiplier (0-100%) applied to every stat
// contribution from items/relics/food/pets/mounts (see effectiveStats in
// state.js and previewClassStats above) that rewards actually filling out
// the paperdoll, not just chasing a couple of strong items. Score is the sum
// of each filled slot's rarity multiplier (RARITIES[rarity].mult - the same
// weighting the loot/economy systems already use), against the max possible
// (every one of the 19 equip-gear slots at legendary) - so 100% requires a
// fully legendary loadout, and the ratio scales smoothly with both how many
// slots are filled AND how good they are. Needs at least 2 filled slots to
// grant anything at all - a single item (however rare) is not a "set".
function gearSetBonusPct(rec) {
  let filled = 0;
  let score = 0;
  EQUIP_GEAR_KEYS.forEach(key => {
    const uid = rec.equipped[key];
    if (!uid) return;
    filled++;
    const item = Persistent.findItem(uid);
    if (item) score += RARITIES[item.rarity].mult;
  });
  if (filled < 2) return 0;
  const maxScore = EQUIP_GEAR_KEYS.length * RARITIES.legendary.mult;
  return clamp(score / maxScore, 0, 1);
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
  dragonScaleMail: { name: 'Dragon Scale Mail', slot: 'chest', visual: 'mail', icon: '🐉', def: 7, hp: 18, universe: 'D&D', desc: 'Scales shed by an ancient wyrm.' },
  // Signature rewards from RARE_NPCS (data.js) - never randomly rolled into
  // the normal legendary encounter pool, always tied to that specific NPC
  // (see enterRareNpc in main.js).
  williamsFists: { name: "William's Iron Fists", slot: 'weapon', weaponType: 'oneHanded', visual: 'mace', icon: '👊', atk: 19, universe: 'Original', desc: "A lifetime of mastery, needing no blade at all." },
  mcclureReserve: { name: 'The McClure Reserve', slot: 'weapon', weaponType: 'mainHandOnly', visual: 'dagger', icon: '🥃', atk: 15, goldBonus: 0.10, universe: 'Original', desc: "Bootlegged, illegal, and unreasonably effective. +10% gold." },
  dylinatorChassis: { name: 'Dylinator Chassis Plating', slot: 'chest', visual: 'plate', icon: '🦾', def: 9, hp: 16, universe: 'Original', desc: 'Cybernetic armor plating, still warm from the forge.' },
  tinasEncoreMic: { name: "Tina's Encore Mic", slot: 'weapon', weaponType: 'twoHanded', visual: 'staff', icon: '🎤', atk: 17, goldBonus: 0.08, universe: 'Original', desc: 'Turns every battle into a headline act. +8% gold.' }
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

// Epic/legendary drops are capped to later acts - without this a lucky
// boss/elite roll in Act 1 could hand out best-in-slot gear immediately,
// letting the player one-shot everything until the difficulty finally
// caught up many acts later. Common/uncommon/rare are unrestricted (normal
// early-game progression); the cap only clips the TOP of the roll, it never
// rerolls, so a capped roll still lands on the best tier currently allowed
// rather than falling all the way back to common.
function maxLootRarityIndexForAct(act) {
  if (act >= 7) return RARITY_ORDER.indexOf('legendary');
  if (act >= 4) return RARITY_ORDER.indexOf('epic');
  return RARITY_ORDER.indexOf('rare');
}

function rollLootRarity(isBoss, isElite, act) {
  const roll = Math.random() + (isBoss ? 0.5 : isElite ? 0.25 : 0);
  let rarity;
  if (roll > 1.35) rarity = 'legendary';
  else if (roll > 1.05) rarity = 'epic';
  else if (roll > 0.75) rarity = 'rare';
  else if (roll > 0.45) rarity = 'uncommon';
  else rarity = 'common';
  const cappedIdx = Math.min(RARITY_ORDER.indexOf(rarity), maxLootRarityIndexForAct(act || 1));
  return RARITY_ORDER[cappedIdx];
}

function rollLootDrop(enemy, act) {
  const dropChance = enemy.boss ? 1 : enemy.elite ? 0.5 : 0.16;
  if (Math.random() > dropChance) return null;
  const ids = Object.keys(GEAR_TEMPLATES);
  const defId = ids[rand(0, ids.length - 1)];
  return instantiateGear(defId, rollLootRarity(enemy.boss, enemy.elite, act));
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
  amount = Math.max(0, Math.round(amount * currentDifficulty().resourceMult));
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
  { id: 'craftBoots', defId: 'genBoots1', rarity: 'uncommon', cost: { gold: 35, leather: 2, ore: 1 } },
  { id: 'craftRing', defId: 'genRing1', rarity: 'uncommon', cost: { gold: 50, essence: 2 } },
  { id: 'craftTrinket', defId: 'genTrinket1', rarity: 'uncommon', cost: { gold: 55, essence: 2, ore: 1 } },
  { id: 'craftShirt', defId: 'genShirt1', rarity: 'uncommon', cost: { gold: 15 } },
  { id: 'craftTabard', defId: 'genTabard1', rarity: 'uncommon', cost: { gold: 15 } }
];

// ============================================================================
// Disenchanting - breaks a weapon/armor/accessory item down into arcane
// materials instead of selling it for gold. Three tiers, scaling with the
// disenchanted item's OWN rarity (mirrors how rarer gear is worth more):
// dust (common component), shard (mid-tier, rare+ only), crystal (top-tier,
// epic+ only). Disenchanting has its own independent level/xp track
// (rec.disenchanting, see Persistent.getCharacter) rather than plugging into
// the shared "one active gathering profession" system in PROFESSIONS/
// PROFESSION_PASSIVES - it's a deliberate, per-use action (open the popup,
// pick an item), not a passive trickle from adventuring, so it levels up
// only when actually used.
// ============================================================================
const DISENCHANT_MAX_LEVEL = 99;
const DISENCHANT_YIELD_BASE = {
  common: { dust: 2 },
  uncommon: { dust: 4 },
  rare: { dust: 4, shard: 2 },
  epic: { dust: 4, shard: 4, crystal: 2 },
  legendary: { dust: 4, shard: 6, crystal: 5 }
};
// XP granted per disenchant, scaled the same way loot rarity itself scales.
const DISENCHANT_XP_BY_RARITY = { common: 5, uncommon: 10, rare: 20, epic: 40, legendary: 80 };

// +2% yield per Disenchanting level, same curve every other profession's
// passive uses - level 1 grants none, consistent with professionXpForLevel.
function disenchantYieldFor(rarity, disenchantingLevel) {
  const base = DISENCHANT_YIELD_BASE[rarity] || DISENCHANT_YIELD_BASE.common;
  const mult = 1 + 0.02 * (disenchantingLevel - 1);
  const yield_ = {};
  Object.keys(base).forEach(k => { yield_[k] = Math.max(1, Math.round(base[k] * mult)); });
  return yield_;
}

function grantDisenchantingXp(rec, amount) {
  const d = rec.disenchanting;
  if (d.level >= DISENCHANT_MAX_LEVEL) return { levelsGained: 0 };
  d.xp += amount;
  let levelsGained = 0;
  while (d.level < DISENCHANT_MAX_LEVEL) {
    const need = professionXpForLevel(d.level);
    if (d.xp < need) break;
    d.xp -= need;
    d.level += 1;
    levelsGained += 1;
  }
  return { levelsGained };
}

// Destroys `item` (caller removes it from pdata.inventory) and returns the
// materials it yields, already added to pdata.materials, plus the XP grant.
function disenchantItem(rec, pdata, item) {
  const yieldAmounts = disenchantYieldFor(item.rarity, rec.disenchanting.level);
  Object.keys(yieldAmounts).forEach(k => { pdata.materials[k] = (pdata.materials[k] || 0) + yieldAmounts[k]; });
  const xpResult = grantDisenchantingXp(rec, DISENCHANT_XP_BY_RARITY[item.rarity] || 5);
  return { yieldAmounts, ...xpResult };
}

// ============================================================================
// Enchanting - applies a passive-ability enchant (one at a time - a new one
// replaces the old) to an already-equipped item, paid for with Disenchanting's
// materials. Nine of the ten are class-flavored (classId set - only shown
// when enchanting gear equipped by that class); the tenth (classId: null) is
// universal. Effects reuse the same effect{} levers relics/talents/jewelry
// already use (see EFFECT_LEVER_LABELS in data.js) so describeEffectLever
// and gearStatBonus need no special-casing beyond reading item.enchantId.
// ============================================================================
const ENCHANTS = {
  berserkersEdge: { id: 'berserkersEdge', name: "Berserker's Edge", icon: '🪓', classId: 'warrior', desc: 'A reckless, aggressive edge.', cost: { shard: 3 }, effect: { critBonus: 0.03 } },
  shadowstep: { id: 'shadowstep', name: 'Shadowstep', icon: '🥷', classId: 'rogue', desc: 'Steps too quick for the eye.', cost: { dust: 4, shard: 2 }, effect: { speed: 2 } },
  arcaneFocus: { id: 'arcaneFocus', name: 'Arcane Focus', icon: '🔷', classId: 'mage', desc: 'Sharpens the mind for spellcraft.', cost: { shard: 3 }, effect: { spellPower: 0.05 } },
  blessedAegis: { id: 'blessedAegis', name: 'Blessed Aegis', icon: '🛡️', classId: 'paladin', desc: 'A slow, steady holy mending.', cost: { dust: 5 }, effect: { hpRegen: 2 } },
  predatorsMark: { id: 'predatorsMark', name: "Predator's Mark", icon: '🏹', classId: 'hunter', desc: 'Marks the strong for the kill.', cost: { shard: 3 }, effect: { eliteSlayerAtk: 3 } },
  soulSiphon: { id: 'soulSiphon', name: 'Soul Siphon', icon: '💀', classId: 'warlock', desc: 'Drains life with every strike.', cost: { shard: 2, crystal: 1 }, effect: { lifesteal: 2 } },
  savageMomentum: { id: 'savageMomentum', name: 'Savage Momentum', icon: '💢', classId: 'barbarian', desc: 'Feeds a building fury into faster strikes.', cost: { crystal: 2 }, effect: { comboChance: 0.05 } },
  sanctifiedLight: { id: 'sanctifiedLight', name: 'Sanctified Light', icon: '✨', classId: 'cleric', desc: 'Makes every remedy go further.', cost: { dust: 5 }, effect: { potionHealBonus: 0.05 } },
  encore: { id: 'encore', name: 'Encore', icon: '🎼', classId: 'bard', desc: 'The crowd tips generously.', cost: { dust: 4, shard: 1 }, effect: { goldBonus: 0.03 } },
  radiantVigor: { id: 'radiantVigor', name: 'Radiant Vigor', icon: '💎', classId: null, desc: 'A universal enchant - fits any class.', cost: { dust: 6 }, effect: { maxHp: 8 } }
};

// Which enchants a given class is allowed to pick (its own class-flavored
// one plus the universal one) - see showEnchantModal in main.js.
function enchantsFor(classId) {
  return Object.values(ENCHANTS).filter(e => e.classId === null || e.classId === classId);
}

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

// Each Upgrade raises a recipe's craftable rarity ceiling permanently, so its
// ongoing gold/material cost rises to match - tenfold per rarity tier
// upgraded, so a recipe pushed to its legendary ceiling is a real gold/
// material sink rather than a one-time-cheap way to keep churning out
// top-rarity gear. Shared by gear recipes (RECIPES) and food recipes
// (COOKING_RECIPES) - both key into the same pdata.recipeRarityBoost.
function scaledRecipeCost(recipeId, baseCost) {
  const boost = Persistent.load().recipeRarityBoost[recipeId] || 0;
  const mult = Math.pow(10, boost);
  const scaled = {};
  Object.keys(baseCost).forEach(k => { scaled[k] = baseCost[k] * mult; });
  return scaled;
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
  const diffMult = currentDifficulty().resourceMult;
  const xpGained = Math.round(AFK_LEVELS_PER_HOUR * elapsedHours * xpForLevel(startLevel) * diffMult);
  const levelResult = xpGained > 0 ? grantXpToCharacter(rec, xpGained) : { levelsGained: 0 };

  // Economy: gold/materials/items at 70% of a rough "active hour" baseline,
  // scaled up by the character's starting level (so a higher-level character
  // earns more per hour AFK, matching how a real adventure scales with act/level),
  // then by the account's Change Difficulty pick same as everything else.
  const levelFactor = 1 + (startLevel - 1) * 0.15;
  const goldGained = Math.round(250 * levelFactor * AFK_ECONOMY_RATE * elapsedHours * diffMult);
  pdata.bankGold += goldGained;

  const materialsGained = {};
  ['ore', 'leather', 'essence', 'herbs', 'wood', 'fish'].forEach(kind => {
    const amt = Math.round(8 * levelFactor * AFK_ECONOMY_RATE * elapsedHours * diffMult);
    if (amt > 0) { pdata.materials[kind] += amt; materialsGained[kind] = amt; }
  });

  const itemCount = Math.floor(3 * AFK_ECONOMY_RATE * elapsedHours + Math.random());
  const itemsGained = [];
  const gearIds = Object.keys(GEAR_TEMPLATES);
  const afkAct = Meta.load().bestAct;
  for (let i = 0; i < itemCount; i++) {
    const item = instantiateGear(gearIds[rand(0, gearIds.length - 1)], rollLootRarity(false, false, afkAct));
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
  spells: [
    'frostbolt', 'execute', 'chainLightning', 'inspire',
    'iceLance', 'shadowBolt', 'arcaneBlast', 'earthShatter', 'moonfire', 'sinisterStrike',
    'eviscerate', 'ambush', 'crusaderStrike', 'consecration', 'flashHeal', 'hammerOfJustice',
    'whirlwind', 'bloodlust', 'rampage', 'mortalStrike', 'serpentSting', 'multiShot',
    'voidBolt', 'drainLife', 'hellfireBlast', 'curseOfAgony', 'penanceStrike', 'smite',
    'judgment', 'holyWrath', 'slam', 'heroicStrike', 'overpower', 'shieldSlam',
    'soulFire', 'chaosBolt', 'starfall', 'wildStrike', 'rejuvenation', 'avengingWrath'
  ].map(id => ({ id, price: 220 })),
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

// --- Multi-spell equip ---
// Every class starts with 1 equipped slot (its defaultSpell) and unlocks one
// more at level 10, 30, 60, and MAX_LEVEL (99 - the practical stand-in for
// the requested "level 100" milestone, since MAX_LEVEL is the actual cap) -
// 5 slots total at max level.
function maxEquippedSpells(level) {
  let slots = 1;
  if (level >= 10) slots++;
  if (level >= 30) slots++;
  if (level >= 60) slots++;
  if (level >= MAX_LEVEL) slots++;
  return slots;
}

// The class's defaultSpell is always slot 1 and can't be unequipped;
// rec.equipped.spells holds whatever's filling the additional slots.
function equippedSpellIds(rec, cls) {
  return [cls.defaultSpell, ...(rec.equipped.spells || [])].filter((v, i, a) => a.indexOf(v) === i);
}

// --- Spell leveling ---
// Spells level up from use, same idea as companion leveling above but
// account-wide per spell id (pdata.spellLevels) rather than per-character,
// since a spell's usage carries over to whichever class has it equipped.
// Capped at SPELL_MAX_LEVEL (10) - a level-10 spell hits much harder but
// also carries a much longer cooldown (see scaledSpellDef), so it's a
// meaningful long-term payoff rather than a free stat stick.
const SPELL_MAX_LEVEL = 10;

function spellXpForLevel(level) {
  return Math.floor(15 * Math.pow(level, 1.4)) + 10;
}

function getSpellLevel(spellId) {
  const pdata = Persistent.load();
  if (!pdata.spellLevels[spellId]) pdata.spellLevels[spellId] = { level: 1, xp: 0 };
  return pdata.spellLevels[spellId];
}

function grantSpellUsageXp(spellId, amount = 1) {
  const progress = getSpellLevel(spellId);
  if (progress.level >= SPELL_MAX_LEVEL) return { levelsGained: 0 };
  progress.xp += amount;
  let levelsGained = 0;
  while (progress.level < SPELL_MAX_LEVEL) {
    const need = spellXpForLevel(progress.level);
    if (progress.xp < need) break;
    progress.xp -= need;
    progress.level += 1;
    levelsGained += 1;
  }
  if (levelsGained) Persistent.save();
  return { levelsGained };
}

// +20% power per level above 1 (level 10 = 2.8x) - deliberately steeper than
// companion/gear scaling since this is the whole point of using a spell a lot.
function spellLevelPowerMult(level) {
  return 1 + (level - 1) * 0.2;
}

// +1 cooldown round every 3 levels (level 10 = +3) - the "large cooldown"
// tradeoff for a level-10 spell's much bigger hit.
function spellLevelCooldownBonus(level) {
  return Math.floor((level - 1) / 3);
}

// The actual skill object combat/UI code should use in place of a raw
// SPELLS[id] lookup - power and cooldown pre-scaled for the spell's current
// level. resolveSkillDamage (combat.js) is generic over whatever's passed in,
// so this is the only place the leveling math lives.
function scaledSpellDef(spellId) {
  const base = SPELLS[spellId];
  const level = getSpellLevel(spellId).level;
  if (level <= 1) return { ...base, level };
  const mult = spellLevelPowerMult(level);
  const scaled = { ...base, level, cooldown: base.cooldown + spellLevelCooldownBonus(level) };
  scaled.power = base.type === 'multiplier' ? Math.round(base.power * mult * 100) / 100 : Math.round(base.power * mult);
  return scaled;
}

// Builds Game.player.skills (see newRun/buildRaidPlayer in state.js) - one
// live, cooldown-tracking instance per currently-equipped spell, already
// scaled for that spell's account-wide level.
function buildSkillInstances(classId, charRecord) {
  const cls = CLASSES[classId];
  return equippedSpellIds(charRecord, cls).map(id => ({ ...scaledSpellDef(id), cooldownLeft: 0 }));
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

// Accepts every quest currently sitting in the Available list.
function acceptAllQuests() {
  getAvailableQuests().forEach(q => acceptQuest(q.id));
}

// Claims every active quest that's ready, returning how many were claimed.
function completeAllQuests(classIdForXp) {
  let count = 0;
  getActiveQuests().filter(q => isQuestReady(q.id)).forEach(q => {
    if (claimQuest(q.id, classIdForXp)) count++;
  });
  return count;
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
  if (!pdata.companionLevels[kind][id]) pdata.companionLevels[kind][id] = { level: 1, xp: 0, name: '' };
  // Backfill for records saved before renaming existed.
  if (pdata.companionLevels[kind][id].name === undefined) pdata.companionLevels[kind][id].name = '';
  return pdata.companionLevels[kind][id];
}

// The player's own custom nickname for a tamed pet/mount (see the rename
// input in renderSanctuaryHouse), falling back to the species name - same
// idea as a character's own customization.name in effectiveCharStats.
function companionDisplayName(kind, id, def) {
  const custom = getCompanionProgress(kind, id).name;
  return custom || def.name;
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

// --- Reputation ---
// Account-wide (like Honor/materials) rather than per-character - it's your
// standing with a place, not a personal stat. See REPUTATION_TIERS/
// ACT_THEMES in data.js.
function grantReputation(zoneId, amount) {
  const pdata = Persistent.load();
  const scaled = Math.round(amount * (1 + groupBonusPct()));
  pdata.reputation[zoneId] = (pdata.reputation[zoneId] || 0) + scaled;
  Persistent.save();
}

function getReputationTierIndex(zoneId) {
  const pdata = Persistent.load();
  const rep = pdata.reputation[zoneId] || 0;
  let idx = 0;
  REPUTATION_TIERS.forEach((t, i) => { if (rep >= t.threshold) idx = i; });
  return idx;
}

function getReputationProgress(zoneId) {
  const pdata = Persistent.load();
  const rep = pdata.reputation[zoneId] || 0;
  const idx = getReputationTierIndex(zoneId);
  const tier = REPUTATION_TIERS[idx];
  const next = REPUTATION_TIERS[idx + 1] || null;
  return { rep, tier, next, idx };
}

// Every reputation tier reached, in every zone, chips in a small permanent
// gold bonus - folded into Game.effectiveStats()/previewClassStats() the
// same way every other stat source is.
function reputationStatBonus() {
  const base = {};
  RELIC_EFFECT_KEYS.forEach(k => { base[k] = 0; });
  ACT_THEMES.forEach(theme => { base.goldBonus += getReputationTierIndex(theme.id) * REPUTATION_GOLD_BONUS_PER_TIER; });
  return base;
}

// --- Titles ---
// See TITLES in data.js for the full catalog. Unlock state is never cached -
// each title's `check` reads live Persistent/Meta state, so equipping one
// the moment it becomes available never needs any extra bookkeeping (and a
// stale equip on some future save-format change just silently stops
// contributing its bonus rather than crashing).
function isTitleUnlocked(titleId) {
  const title = TITLES[titleId];
  return !!(title && title.check());
}

// A title's passive bonus, folded into effectiveStats/previewClassStats the
// same way a talent's is - flat, not boosted by the Gear Set Bonus, since
// it's a narrative reward rather than gear.
function titleStatBonus(rec) {
  const base = {};
  RELIC_EFFECT_KEYS.forEach(k => { base[k] = 0; });
  const titleId = rec.customization && rec.customization.titleId;
  if (titleId && isTitleUnlocked(titleId)) {
    Object.keys(TITLES[titleId].effect).forEach(key => { base[key] = (base[key] || 0) + TITLES[titleId].effect[key]; });
  }
  return base;
}

// Renders a title (see TITLES in data.js) onto a base name - prefix
// ("the Ambassador Aldric") or suffix ("Aldric the Hollowbane") per the
// title's own `position`. Falls through to the plain name with no title
// equipped, or an unequipped/no-longer-unlocked one.
function renderedTitleName(baseName, titleId) {
  const title = titleId && isTitleUnlocked(titleId) ? TITLES[titleId] : null;
  if (!title) return baseName;
  return title.position === 'prefix' ? `${title.name} ${baseName}` : `${baseName} ${title.name}`;
}

// The single source of truth for "what does this character's name read as
// right now" - custom name (or class name) plus their equipped title, if
// any. Used everywhere a character's name is displayed: combat nameplates
// (renderCompanionRig), the Character tab, a PvP mirror ghost, a recruited
// companion's card.
function displayCharacterName(classId) {
  const rec = Persistent.getCharacter(classId);
  const base = (rec.customization && rec.customization.name) || CLASSES[classId].name;
  return renderedTitleName(base, rec.customization && rec.customization.titleId);
}

// --- Recruited companions ---
// A companion is a frozen SNAPSHOT of another player's character (imported
// from their exported save - see performSaveGame/importSaveFile in main.js),
// not a live link to their save. It fights alongside you exactly like a
// raid Ghost already did (a flat support stat contribution, no independent
// turn of its own to control) but is visually present in combat with its
// own portrait, animation, and pet/mount - see renderCombatScreen. Up to 4
// can be equipped ("in group") at once; each equipped companion adds +5%
// gold/XP/reputation (see groupBonusPct) on top of its stat contribution.
const COMPANION_MAX_EQUIPPED = 4;
const COMPANION_STAT_SHARE = 0.35; // how much of a companion's own snapshot stats carry over
const GROUP_BONUS_PER_COMPANION = 0.05;

function groupBonusPct() {
  const pdata = Persistent.load();
  return GROUP_BONUS_PER_COMPANION * (pdata.equippedCompanionIds || []).length;
}

function getEquippedCompanions() {
  const pdata = Persistent.load();
  const ids = new Set(pdata.equippedCompanionIds);
  return pdata.recruitedCompanions.filter(c => ids.has(c.id));
}

function companionGroupStatBonus() {
  const base = {};
  RELIC_EFFECT_KEYS.forEach(k => { base[k] = 0; });
  getEquippedCompanions().forEach(c => {
    base.atk += Math.round(c.stats.atk * COMPANION_STAT_SHARE);
    base.def += Math.round(c.stats.def * COMPANION_STAT_SHARE);
    base.maxHp += Math.round(c.stats.maxHp * COMPANION_STAT_SHARE);
  });
  return base;
}

// Builds a companion card from ANOTHER player's exported save data (the
// `persistent` object from a save file, not our own Persistent.data) -
// snapshots that character's current combat stats once, at recruit time,
// rather than keeping any live reference to their save. Recruits whichever
// character that save last had active (falls back to its first character).
function recruitCompanionFromSave(importedData) {
  if (!importedData || !importedData.characters) return { error: "That file isn't a valid save." };
  const classId = (importedData.lastPlayedClassId && importedData.characters[importedData.lastPlayedClassId])
    ? importedData.lastPlayedClassId
    : Object.keys(importedData.characters)[0];
  if (!classId || !CLASSES[classId]) return { error: "That save doesn't have a character to recruit." };

  // previewClassStats/getCompanionProgress/etc. all read through
  // Persistent.load(), so a temporary swap is the simplest way to compute
  // stats against someone else's data without duplicating that whole calc.
  const backupData = Persistent.data;
  Persistent.data = importedData;
  Persistent.applyDefaults();
  const rec = Persistent.getCharacter(classId);
  const stats = previewClassStats(classId);
  const companion = {
    id: 'comp' + Math.random().toString(36).slice(2, 10),
    name: displayCharacterName(classId),
    classId, level: rec.level,
    stats: { atk: stats.atk, def: stats.def, maxHp: stats.maxHp, speed: stats.speed },
    petId: rec.equipped.pet || null,
    mountId: rec.equipped.mount || null,
    spellId: (rec.equipped.spells && rec.equipped.spells[0]) || CLASSES[classId].defaultSpell
  };
  Persistent.data = backupData;

  const pdata = Persistent.load();
  pdata.recruitedCompanions.push(companion);
  Persistent.save();
  return { companion };
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
      bankGold: 0, materials: { ore: 0, leather: 0, essence: 0, herbs: 0, wood: 0, fish: 0, dust: 0, shard: 0, crystal: 0 }, inventory: [], permanentRelics: [], unlockedSpells: [], unlockedClasses: [], ownedLegendaries: [], characters: {},
      ownedPets: [], ownedMounts: [], activeQuestIds: [], questProgress: {}, questTiers: {}, completedQuestIds: [],
      honor: 0, honorInventory: [], honorPotionCount: 0, pvpInventory: [], randomPvpEnabled: false, recipeRarityBoost: {},
      companionLevels: { pet: {}, mount: {} }, activeBuffs: [], lastSeenAt: Date.now(), reputation: {},
      recruitedCompanions: [], equippedCompanionIds: [], showCheats: false, tutorialSeen: false, difficulty: 'normal',
      // Kyle the Bard's in-run tutorial (distinct from tutorialSeen above,
      // which is the old static "How to Play" rules popup) - see
      // maybeShowTutorial in main.js. Keyed by screen id, seen once ever.
      kyleTutorialsSeen: {}, skipTutorials: false,
      // Rare NPCs already met (see RARE_NPCS/enterRareNpc) - one-time-ever,
      // account-wide, same idea as ownedLegendaries/unlockedClasses.
      metRareNpcs: [],
      // Jakesteel, once bested in his duel, joins as a permanent companion
      // and never appears as a map encounter again - see
      // enterJakesteelEncounter/recruitJakesteel in main.js.
      metJakesteel: false,
      // Zone ids whose World Event has been let play out (see WORLD_EVENTS
      // in data.js and resolveWorldEventAllow in main.js) - each zone's
      // we_<zoneId> title (data.js) checks against this, one-time-ever.
      worldEventTitlesEarned: [],
      // Spell leveling (see grantSpellUsageXp/scaledSpellDef) - account-wide
      // per spell id, same idea as companionLevels above.
      spellLevels: {},
      // Permanent PvP win counter for the title ladder (see TITLES'
      // pvp_* entries in data.js) - unlike the pvpWins quest's questProgress
      // entry, this is never deleted when a quest is claimed, so a title
      // earned once stays earned.
      pvpWinsTotal: 0
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
      d.characters[classId] = { level: 1, xp: 0, equipped: { spells: [], pet: null, mount: null }, customization: { name: '' } };
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
    // Migrate pre-multi-spell saves: the old single equipped.spell slot
    // becomes the first entry in the new equipped.spells array.
    if (eq.spell !== undefined) { eq.spells = eq.spell ? [eq.spell] : []; delete eq.spell; }
    if (!Array.isArray(eq.spells)) eq.spells = [];
    if (!rec.customization) rec.customization = { name: '' };
    if (rec.customization.titleId === undefined) rec.customization.titleId = null;
    if (!rec.profession) rec.profession = { active: null, levels: {}, xp: {} };
    Object.keys(PROFESSIONS).forEach(id => {
      if (rec.profession.levels[id] === undefined) rec.profession.levels[id] = 1;
      if (rec.profession.xp[id] === undefined) rec.profession.xp[id] = 0;
    });
    if (!rec.disenchanting) rec.disenchanting = { level: 1, xp: 0 };
    if (rec.autoEquip === undefined) rec.autoEquip = false;
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
  const title = titleStatBonus(rec);
  const buff = activeBuffStatBonus();
  const reputation = reputationStatBonus();
  const lvlMult = levelStatMultiplier(rec.level);
  // Mirrors effectiveStats() in state.js (see gearSetBonusPct) so the
  // Sanctuary preview matches what combat will actually show.
  const setBonusPct = gearSetBonusPct(rec);
  const boost = (v) => v * (1 + setBonusPct);
  // Every displayed stat is rounded to a whole number (Math.round - .5 and
  // above rounds up) - `boost()` multiplies by a float set-bonus percentage,
  // so without this a geared-up character would show a stat like 226.345...
  // instead of a clean 226.
  return {
    atk: Math.round(Math.round((cls.atk + boost(gear.atk)) * lvlMult) + boost(bonus.atk + companion.atk + buff.atk) + talent.atk + title.atk),
    def: Math.round(cls.def + boost(gear.def + bonus.def + companion.def + buff.def) + talent.def + title.def),
    maxHp: Math.round(Math.round((cls.maxHp + boost(gear.maxHp)) * lvlMult) + boost(bonus.maxHp + companion.maxHp + buff.maxHp) + talent.maxHp + title.maxHp),
    speed: Math.round(cls.speed + boost(gear.speed + bonus.speed + companion.speed + buff.speed) + talent.speed + title.speed),
    goldBonus: boost(gear.goldBonus + bonus.goldBonus + companion.goldBonus + buff.goldBonus) + talent.goldBonus + title.goldBonus + reputation.goldBonus,
    setBonusPct
  };
}

// Renders a class's sprite with whatever it currently has equipped (falling
// back to its default WoW-flavored look for empty slots) - the single place
// every screen should call through so equipped gear is always reflected.
// The chest slot and main-hand weapon get full hand-authored shapes/palettes;
// the remaining accessory slots (head/shoulders/back/tabard/shirt/wrists/
// hands/waist/legs/boots) have no unique art of their own, so each one
// instead tints its own region of the shared body silhouette to that item's
// rarity color - a helmet, say, recolors the hair region, and a legendary
// piece reads as visually fancier than a common one.
// `weaponSlot` ('mainHand'|'ranged', default 'mainHand') picks which equipped
// weapon-bearing slot's visual actually gets drawn - see pickAttackWeaponSlot
// in combat.js, which rolls this per Attack so a character carrying both a
// melee weapon and a bow visibly swings whichever one that specific attack
// used, reverting to their mainHand "resting" look everywhere else (map,
// armory, HUD) since those calls never pass a slot.
// Which weapon-visual (see ITEMS[x].visual) a class's body art should show
// for a given weaponSlot - shared by characterSpriteFor (the static portrait)
// and the weapon-attack-animation trigger in main.js, which needs this same
// resolution to look up WEAPON_ATTACK_ANIM[`${classId}_${weaponVisual}`].
function currentWeaponVisual(classId, weaponSlot) {
  const rec = Persistent.getCharacter(classId);
  const eq = rec.equipped;
  const weapon = eq.mainHand ? Persistent.findItem(eq.mainHand) : null;
  const rangedItem = eq.ranged ? Persistent.findItem(eq.ranged) : null;
  const useRanged = weaponSlot === 'ranged' && rangedItem && rangedItem.visual;
  const activeWeapon = useRanged ? rangedItem : weapon;
  return (activeWeapon && activeWeapon.visual) || CLASS_ART_DEFAULTS[classId].weaponVisual;
}

function characterSpriteFor(classId, sizePx, weaponSlot) {
  const rec = Persistent.getCharacter(classId);
  const eq = rec.equipped;
  const weapon = eq.mainHand ? Persistent.findItem(eq.mainHand) : null;
  const armor = eq.chest ? Persistent.findItem(eq.chest) : null;

  if (CLASS_ART_READY.has(classId)) {
    const defaults = CLASS_ART_DEFAULTS[classId];
    const rangedItem = eq.ranged ? Persistent.findItem(eq.ranged) : null;
    const useRanged = weaponSlot === 'ranged' && rangedItem && rangedItem.visual;
    const activeWeapon = useRanged ? rangedItem : weapon;
    const armorStyle = (armor && armor.visual) || defaults.armorStyle;
    const weaponVisual = currentWeaponVisual(classId, weaponSlot);
    const path = classBodyArtPath(classId, armorStyle, weaponVisual);
    const filter = RARITY_SPRITE_FILTER[maxRarity(activeWeapon && activeWeapon.rarity, armor && armor.rarity)];
    const filterAttr = filter !== 'none' ? ` style="filter:${filter}"` : '';
    return `<img class="player-weapon-sprite" src="${path}" width="${sizePx}" height="${sizePx}"${filterAttr} alt="${classId}">`;
  }

  const shirt = eq.shirt ? Persistent.findItem(eq.shirt) : null;
  const shoulders = eq.shoulders ? Persistent.findItem(eq.shoulders) : null;
  const waist = eq.waist ? Persistent.findItem(eq.waist) : null;
  const legs = eq.legs ? Persistent.findItem(eq.legs) : null;
  const boots = eq.boots ? Persistent.findItem(eq.boots) : null;
  const head = eq.head ? Persistent.findItem(eq.head) : null;
  const back = eq.back ? Persistent.findItem(eq.back) : null;
  const tabard = eq.tabard ? Persistent.findItem(eq.tabard) : null;
  const wrists = eq.wrists ? Persistent.findItem(eq.wrists) : null;
  const hands = eq.hands ? Persistent.findItem(eq.hands) : null;

  const options = {};
  if (armor && armor.visual) {
    options.armorShape = ARMOR_STYLE_SHAPE[armor.visual];
    options.armorPalette = tintedPalette(ARMOR_STYLE_PALETTES[armor.visual], ['T', 'W'], armor.rarity);
  } else if (shirt) {
    // No chest piece equipped - a cosmetic shirt shows as a plain recolor of
    // the base torso/collar instead of the class's unarmored default.
    const baseArmor = CLASS_LOOKS[classId].armorPalette;
    options.armorPalette = { ...baseArmor, A: RARITIES[shirt.rarity].color, T: RARITIES[shirt.rarity].color };
  }
  const armorPalette = { ...(options.armorPalette || CLASS_LOOKS[classId].armorPalette) };
  if (shoulders) armorPalette.T = RARITIES[shoulders.rarity].color;
  if (waist) armorPalette.W = RARITIES[waist.rarity].color;
  if (legs) armorPalette.L = RARITIES[legs.rarity].color;
  if (boots) armorPalette.B = RARITIES[boots.rarity].color;
  options.armorPalette = armorPalette;

  if (weapon && weapon.visual) {
    options.weaponStyle = weapon.visual;
    options.weaponPalette = tintedPalette(WEAPON_STYLE_PALETTES[weapon.visual], WEAPON_ACCENT_KEY[weapon.visual], weapon.rarity);
  }

  const headPalette = { ...CLASS_LOOKS[classId].head };
  if (head) headPalette.r = RARITIES[head.rarity].color;
  options.headPalette = headPalette;

  if (back) options.capeColor = RARITIES[back.rarity].color;
  if (tabard) options.tabardColor = RARITIES[tabard.rarity].color;
  if (wrists) options.bracerColor = RARITIES[wrists.rarity].color;
  if (hands) options.gloveColor = RARITIES[hands.rarity].color;
  // Any equipped shoulder item physically broadens the silhouette; epic gets
  // a spike, legendary a full wing, on top of the same broadened base.
  if (shoulders) {
    options.shoulderPadColor = RARITIES[shoulders.rarity].color;
    options.shoulderStyle = shoulders.rarity === 'legendary' ? 'winged'
      : shoulders.rarity === 'epic' ? 'spiked' : 'flared';
  }

  // Player-chosen customization (hair/eye/armor color, from the Sanctuary
  // Character tab) layers on top of gear-driven options - it overrides just
  // the specific palette keys it cares about, so equipped gear's own trim/
  // accent colors are untouched.
  const custom = rec.customization;
  if (custom && (custom.hairColor || custom.eyeColor)) {
    if (custom.hairColor) options.headPalette.r = custom.hairColor;
    if (custom.eyeColor) options.headPalette.e = custom.eyeColor;
  }
  if (custom && custom.armorColor) {
    options.armorPalette = { ...options.armorPalette, A: custom.armorColor };
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
function anyCharacterSvg(id, sizePx, weaponSlot) {
  if (BOSS_ART[id]) return bossSpriteSvg(id, sizePx);
  return CLASS_LOOKS[id] ? characterSpriteFor(id, sizePx, weaponSlot) : spriteSvg(id, sizePx);
}

// Composes the character together with whatever it currently has equipped as
// a companion: an equipped MOUNT walks just behind/beside the character (not
// ridden - overlaying a rider on the mount's own silhouette read poorly), and
// an equipped PET trots alongside on the other side, smaller. Used everywhere
// the traveling character appears out in the world (the map traveler, the
// combat portrait) - both render as a simple bottom-aligned flex row, laid
// out by .companion-row in styles.css. The Sanctuary's own small icons (HUD,
// class picker) stay plain since there's no room there for a whole group.
// `companionAnim` (only passed from the combat portrait - see
// Combat.resolveCompanionAttacks and renderCombatScreen) is
// {pet: role|'attack', mount: role|'attack'} for whichever companion just
// landed a hit this round - drives a lunge animation glowing the color of
// its role (COMPANION_ROLE_GLOW in data.js), or the default accent gold for
// a plain non-role pet/mount.
function renderCompanionRig(classId, sizePx, companionAnim, weaponSlot) {
  const rec = Persistent.getCharacter(classId);
  const mountId = rec.equipped.mount;
  const petId = rec.equipped.pet;
  const riderSvg = anyCharacterSvg(classId, sizePx, weaponSlot);
  const mountSvg = mountId ? anyCharacterSvg(mountId, Math.round(sizePx * 0.8)) : '';
  const petSvg = petId ? anyCharacterSvg(petId, Math.round(sizePx * 0.5)) : '';
  // A WoW-style floating nameplate above the character's head - custom name
  // (or class name) plus their equipped title, if any (see
  // displayCharacterName) - and the same for a renamed mount/pet (see the
  // rename input in renderSanctuaryHouse), just smaller to match their
  // smaller sprite.
  const name = displayCharacterName(classId);
  const nameplate = `<span class="nameplate">${escapeHtml(name)}</span>`;
  const mountName = mountId ? companionDisplayName('mount', mountId, MOUNTS[mountId]) : '';
  const petName = petId ? companionDisplayName('pet', petId, PETS[petId]) : '';
  const mountNameplate = mountName ? `<span class="nameplate nameplate-small">${escapeHtml(mountName)}</span>` : '';
  const petNameplate = petName ? `<span class="nameplate nameplate-small">${escapeHtml(petName)}</span>` : '';
  const actingClass = (kind) => (companionAnim && companionAnim[kind]) ? 'companion-acting' : '';
  const actingStyle = (kind) => {
    const acting = companionAnim && companionAnim[kind];
    return acting ? ` style="--companion-glow:${COMPANION_ROLE_GLOW[acting] || 'var(--accent)'}"` : '';
  };
  return `<span class="companion-row">` +
    (mountSvg ? `<span class="companion-mount ${actingClass('mount')}"${actingStyle('mount')}>${mountNameplate}${mountSvg}</span>` : '') +
    `<span class="companion-rider">${nameplate}${riderSvg}</span>` +
    (petSvg ? `<span class="companion-pet ${actingClass('pet')}"${actingStyle('pet')}>${petNameplate}${petSvg}</span>` : '') +
    `</span>`;
}

// Same mount/rider/pet composite as renderCompanionRig, minus every
// nameplate - for a PvP Ghost opponent (see enterPvpMatch in main.js), whose
// portrait already has its own single nameplate (the opponent's generated
// name, not this class's real display name) wrapping the whole thing. Reads
// the SAME real per-class mount/pet/appearance data renderCompanionRig does
// (whatever that class's own Sanctuary record actually has equipped) rather
// than anything synthesized for the match, so the opponent looks like a
// genuine alternate character and gets the exact same weapon-swing/mount/
// pet animation treatment the player's own side does - just without the
// player-side CSS mirror, so it keeps its native left-facing pose (correct
// for the enemy side, facing the player).
function renderOpponentRig(classId, sizePx) {
  const rec = Persistent.getCharacter(classId);
  const mountId = rec.equipped.mount;
  const petId = rec.equipped.pet;
  const riderSvg = anyCharacterSvg(classId, sizePx);
  const mountSvg = mountId ? anyCharacterSvg(mountId, Math.round(sizePx * 0.8)) : '';
  const petSvg = petId ? anyCharacterSvg(petId, Math.round(sizePx * 0.5)) : '';
  return `<span class="companion-row">` +
    (mountSvg ? `<span class="companion-mount">${mountSvg}</span>` : '') +
    `<span class="companion-rider">${riderSvg}</span>` +
    (petSvg ? `<span class="companion-pet">${petSvg}</span>` : '') +
    `</span>`;
}
