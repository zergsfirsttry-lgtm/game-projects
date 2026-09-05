// Resolution logic for decision events, treasure, rest, and shop nodes.

function applyOutcome(outcome) {
  const lines = [outcome.text];
  if (outcome.hp) {
    if (outcome.hp > 0) { Game.heal(outcome.hp); lines.push(`+${outcome.hp} HP`); }
    else { Game.damage(-outcome.hp); lines.push(`${outcome.hp} HP`); }
  }
  if (outcome.gold) {
    const applied = Game.addGold(outcome.gold);
    lines.push(`${applied >= 0 ? '+' : ''}${applied} Gold`);
  }
  if (outcome.item) {
    Game.player.items.push(outcome.item);
    lines.push(`Received ${ITEMS[outcome.item].name}`);
  }
  if (outcome.removeItem) {
    const idx = Game.player.items.indexOf(outcome.removeItem);
    if (idx !== -1) Game.player.items.splice(idx, 1);
  }
  if (outcome.removeRelic) {
    const idx = Game.player.relics.indexOf(outcome.removeRelic);
    if (idx !== -1) Game.player.relics.splice(idx, 1);
  }
  if (outcome.relic) {
    Game.player.relics.push(outcome.relic);
    lines.push(`Gained relic: ${RELICS[outcome.relic].name}`);
  }
  if (outcome.statBoost) {
    if (outcome.statBoost.atk) { Game.player.baseAtk += outcome.statBoost.atk; lines.push(`+${outcome.statBoost.atk} ATK permanently`); }
  }
  return lines;
}

function pickRandomEvent() {
  return EVENTS[rand(0, EVENTS.length - 1)];
}

function generateTreasureReward() {
  const gold = rand(20, 40);
  const relicChance = Math.random() < 0.55;
  const reward = { gold, relic: relicChance ? randomRelic() : null, item: !relicChance ? (Math.random() < 0.5 ? 'potion' : 'bomb') : null };
  // Archaeology passive: an independent chance at a BONUS second relic, on
  // top of whatever the roll above already gave.
  if (Game.player) {
    const rec = Persistent.getCharacter(Game.player.classId);
    const level = rec.profession.levels.archaeology;
    const bonusChance = PROFESSION_PASSIVES.archaeology.perLevelPct * (level - 1);
    if (Math.random() < bonusChance) reward.bonusRelic = randomRelic();
  }
  return reward;
}

function generateShopStock() {
  const itemKeys = Object.keys(ITEMS);
  const shuffled = [...itemKeys].sort(() => Math.random() - 0.5);
  const stock = shuffled.slice(0, 3).map(id => ({ kind: 'item', id, price: ITEMS[id].price }));
  const relicId = randomRelic();
  stock.push({ kind: 'relic', id: relicId, price: 65 });
  return stock;
}
