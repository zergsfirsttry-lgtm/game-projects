// Branching node map generation (Slay-the-Spire style) and SVG/DOM rendering.

const NODE_TYPES = {
  combat: { icon: '⚔️', label: 'Battle' },
  elite: { icon: '👹', label: 'Elite' },
  event: { icon: '❓', label: 'Unknown' },
  rest: { icon: '🔥', label: 'Rest' },
  shop: { icon: '💰', label: 'Shop' },
  treasure: { icon: '🎁', label: 'Treasure' },
  classTrial: { icon: '🌟', label: 'Class Trial' },
  legendary: { icon: '👑', label: 'Legendary Encounter' },
  taming: { icon: '🐾', label: 'Wild Creature' },
  witchJess: { icon: '🐈', label: 'Glowing Witch' },
  rareNpc: { icon: '🎭', label: 'Rare Encounter' },
  legendaryTaming: { icon: '🐕', label: 'Legendary Creature' },
  jakesteel: { icon: '🐂', label: 'Jakesteel' },
  worldEvent: { icon: '🌋', label: 'World Event' },
  boss: { icon: '☠️', label: 'Boss' }
};

// What a revealed node should actually show instead of NODE_TYPES' generic
// icon+circle, for every type where a specific creature/theme is already
// known (see the resolution pass at the end of generateMap) or always fixed
// (jakesteel/witchJess/rest/shop/treasure/legendary). `kind` drives how
// renderMap/animateTravel use the art: 'attack' (combat/elite/boss) stays on
// its static idle portrait until the player's approach actually reaches the
// node, then plays the attack swing once as a flourish; 'ambient' (every
// decision-based encounter) loops its own idle animation continuously the
// whole time it's visible, same as its full encounter screen does.
function nodePreviewArt(node, act) {
  if (node.type === 'combat' || node.type === 'elite') {
    const anim = node.enemyId && MONSTER_ATTACK_ANIM[node.enemyId];
    if (!anim) return null;
    return { idle: `assets/sprites/${node.enemyId}.png`, frames: anim.attackFrames, kind: 'attack' };
  }
  if (node.type === 'boss') {
    const enemy = BOSSES[(act - 1) % BOSSES.length];
    const anim = MONSTER_ATTACK_ANIM[enemy.id];
    if (!anim) return null;
    return { idle: `assets/sprites/${enemy.id}.png`, frames: anim.attackFrames, kind: 'attack' };
  }
  if (node.type === 'worldEvent' && node.worldEvent) {
    const art = WORLD_EVENT_ART[node.worldEvent.artKey];
    if (!art) return null;
    return { idle: art.idle, frames: art.frames, kind: 'ambient' };
  }
  if ((node.type === 'taming' || node.type === 'legendaryTaming') && node.tamingReward) {
    const anim = PET_MOUNT_ATTACK_ANIM[node.tamingReward.id];
    if (!anim) return null;
    return { idle: `assets/sprites/${node.tamingReward.id}.png`, frames: anim.attackFrames, kind: 'ambient' };
  }
  if (node.type === 'rareNpc' && node.rareNpcId) {
    const npc = RARE_NPCS[node.rareNpcId];
    const anim = ENCOUNTER_AMBIENT_ANIM[npc.portrait];
    if (!anim) return null;
    return { idle: `assets/sprites/${npc.portrait}.png`, frames: anim.frames, kind: 'ambient' };
  }
  if (node.type === 'witchJess') {
    return { idle: 'assets/sprites/witchJess.png', frames: ENCOUNTER_AMBIENT_ANIM.witchJess.frames, kind: 'ambient' };
  }
  if (node.type === 'jakesteel') {
    return { idle: BOSS_ART.jakesteel.idle, frames: BOSS_ART.jakesteel.attackFrames, kind: 'ambient' };
  }
  if (node.type === 'event' && node.eventRef) {
    const art = EVENT_ART[node.eventRef.id];
    if (!art) return null;
    return { idle: art.idle, frames: art.frames, kind: 'ambient' };
  }
  if (NODE_TYPE_ART[node.type]) {
    const art = NODE_TYPE_ART[node.type];
    return { idle: art.idle, frames: art.frames, kind: 'ambient' };
  }
  return null;
}

// Cycles an <img>'s src through `frames` - `loop:true` (every ambient-kind
// node preview) repeats forever at `intervalMs`; `loop:false` (a combat/
// elite/boss node's attack flourish on arrival, see animateTravel) plays
// through once and calls `onDone`. Mirrors App.playLoopingAnimation/
// playAttackAnimation (main.js) but kept local to map.js rather than
// reaching across files for something this small.
function playFrames(imgEl, frames, intervalMs, loop, onDone) {
  let i = 0;
  const step = () => {
    if (!imgEl.isConnected) return;
    imgEl.src = frames[i % frames.length];
    i++;
    if (!loop && i >= frames.length) { if (onDone) onDone(); return; }
    setTimeout(step, intervalMs);
  };
  step();
}

// How "dangerous" each node type reads for AUTO's path-of-most-resistance
// pick (see autoPickPath in main.js) - purely a UI-facing ranking, no
// gameplay effect of its own; ties just keep whichever came first.
const NODE_RESISTANCE_RANK = {
  boss: 8, legendary: 7, jakesteel: 7, worldEvent: 6, elite: 6, classTrial: 5, witchJess: 5, rareNpc: 5, legendaryTaming: 5, taming: 4,
  combat: 3, event: 2, treasure: 1, shop: 0, rest: 0
};

// What an unvisited, un-revealed node shows instead of its true type - the
// path shape and which nodes are clickable are always visible, but their
// contents stay a mystery until you actually step onto them. The boss node
// is exempted (always shown) since its position already telegraphs it, and
// so are the currently-available nodes - you can see what your immediate
// next choices are, you just can't see any further than that.
const FOG_NODE = { icon: '?', label: '???' };

// MAP_WIDTH is deliberately mobile-safe (fits a ~360px phone viewport with
// padding to spare) since the perspective view below no longer scrolls -
// it's a fixed window, so nothing can rely on extra width via scrolling.
const MAP_WIDTH = 320;
const ROW_HEIGHT = 110;
const REGULAR_ROWS = 18; // rows 0..17, then boss row = 18

function pickType(rowIndex) {
  if (rowIndex === 0) return 'combat';
  const roll = Math.random();
  if (roll < 0.39) return 'combat';
  if (roll < 0.49) return 'elite';
  if (roll < 0.66) return 'event';
  if (roll < 0.70) return 'worldEvent'; // capped to 1 per RUN in generateMap regardless of how many nodes roll this
  if (roll < 0.78) return 'rest';
  if (roll < 0.86) return 'shop';
  if (roll < 0.94) return 'treasure';
  if (roll < 0.965) return 'classTrial'; // rare - actual target class is chosen when the node is visited
  if (roll < 0.978) return 'taming'; // rare - tame a persistent WoW/D&D-flavored pet or mount
  if (roll < 0.988) return 'witchJess'; // very rare - Jess sells rare cat/kitten pets for temporary relics
  if (roll < 0.995) return 'rareNpc'; // very rare - meet a named NPC, claim their signature reward
  if (roll < 0.999) return 'legendaryTaming'; // very rare - guaranteed Robin/Monkey/Chopper
  if (roll < 0.9995) return 'jakesteel'; // extremely rare - the Jakesteel duel-or-sacrifice encounter, once per run
  return 'legendary'; // very rare - a multi-wave gauntlet guarding a named legendary item
}

function generateMap(act) {
  const rows = [];
  let idCounter = 0;
  // At most one World Event node across the WHOLE RUN, not once per act -
  // capped here at generation time via the run-scoped Game.worldEventPlacedThisRun
  // flag (see newRun in state.js), same idea as Jakesteel's once-per-run cap
  // except this one resolves at map-generation time since the whole map's
  // nodes all get their type rolled up front (Jakesteel instead resolves at
  // visit time since only one branch of the map is ever walked). On top of
  // that per-run cap, World Event and Witch Jess are now also gated by a
  // cross-run cooldown (see isRareEncounterReady in data.js) - "special, not
  // regular" - so even a run that WOULD roll one skips it if it showed up
  // too recently. Downgrades to a plain 'event' when gated, same fallback
  // worldEvent already used for the per-run cap.
  let worldEventPlaced = Game.worldEventPlacedThisRun;
  const worldEventReady = isRareEncounterReady('worldEvent', 5);
  let witchJessPlaced = Game.witchJessPlacedThisRun;
  const witchJessReady = isRareEncounterReady('witchJess', 10);

  for (let r = 0; r < REGULAR_ROWS; r++) {
    const count = r === REGULAR_ROWS - 1 ? 2 : rand(3, 4);
    const nodes = [];
    for (let i = 0; i < count; i++) {
      const baseX = (MAP_WIDTH / (count + 1)) * (i + 1);
      const jitter = rand(-18, 18);
      let type = pickType(r);
      if (type === 'witchJess') {
        if (witchJessPlaced || !witchJessReady) type = 'event';
        else { witchJessPlaced = true; Game.witchJessPlacedThisRun = true; markRareEncounterSeen('witchJess'); }
      }
      if (type === 'worldEvent') {
        if (worldEventPlaced || !worldEventReady) type = 'event';
        else { worldEventPlaced = true; Game.worldEventPlacedThisRun = true; markRareEncounterSeen('worldEvent'); }
      }
      nodes.push({
        id: `n${idCounter++}`,
        row: r,
        slot: i,
        x: Math.max(30, Math.min(MAP_WIDTH - 30, baseX + jitter)),
        y: r * ROW_HEIGHT + 60,
        type,
        connections: [],
        visited: false
      });
    }
    rows.push(nodes);
  }

  // Force guarantees so a long act still has reliable pacing: rests at the
  // midpoint and just before the boss, a couple of shops and treasures spread out.
  // Every one of these forced placements is exempt from the
  // no-same-type-twice-in-a-row pass below (forcedNodeIds) so that pass can
  // never undo a guarantee this section just made.
  const forcedNodeIds = new Set();
  const lastRow = rows[REGULAR_ROWS - 1];
  const lastRestNode = lastRow[rand(0, lastRow.length - 1)];
  lastRestNode.type = 'rest';
  forcedNodeIds.add(lastRestNode.id);
  const midpointRow = rows[Math.floor(REGULAR_ROWS / 2)];
  const midRestNode = midpointRow[rand(0, midpointRow.length - 1)];
  midRestNode.type = 'rest';
  forcedNodeIds.add(midRestNode.id);

  // Excludes the midpoint row itself - otherwise this could pick that same
  // row for a shop/treasure and overwrite its one guaranteed rest node
  // (rand() picking the same index by chance).
  const midRows = rows.slice(1, REGULAR_ROWS - 1).filter(row => row !== midpointRow);
  const usedRowIndexes = new Set();
  const forceTypeInFreshRow = (type) => {
    if (!midRows.length) return;
    let idx = rand(0, midRows.length - 1);
    let attempts = 0;
    while (usedRowIndexes.has(idx) && attempts < midRows.length) {
      idx = (idx + 1) % midRows.length;
      attempts++;
    }
    usedRowIndexes.add(idx);
    const row = midRows[idx];
    const forcedNode = row[rand(0, row.length - 1)];
    forcedNode.type = type;
    forcedNodeIds.add(forcedNode.id);
  };
  forceTypeInFreshRow('shop');
  forceTypeInFreshRow('shop');
  forceTypeInFreshRow('treasure');
  forceTypeInFreshRow('treasure');

  // Boss row
  const bossNode = {
    id: `n${idCounter++}`, row: REGULAR_ROWS, slot: 0,
    x: MAP_WIDTH / 2, y: REGULAR_ROWS * ROW_HEIGHT + 60,
    type: 'boss', connections: [], visited: false
  };
  rows.push([bossNode]);

  // Connect each row to the next: every node gets 1-2 forward links, every node gets >=1 incoming link.
  for (let r = 0; r < rows.length - 1; r++) {
    const cur = rows[r];
    const next = rows[r + 1];
    const incoming = new Set();
    cur.forEach(node => {
      const nearestIdx = Math.round((node.slot / Math.max(1, cur.length - 1)) * (next.length - 1));
      const linksCount = next.length > 1 && Math.random() < 0.4 ? 2 : 1;
      const targets = new Set();
      targets.add(clamp(nearestIdx, 0, next.length - 1));
      if (linksCount === 2) {
        const offset = Math.random() < 0.5 ? -1 : 1;
        targets.add(clamp(nearestIdx + offset, 0, next.length - 1));
      }
      targets.forEach(idx => {
        node.connections.push(next[idx].id);
        incoming.add(idx);
      });
    });
    // Ensure every node in the next row has an incoming connection.
    next.forEach((node, idx) => {
      if (!incoming.has(idx)) {
        const closestCur = cur[clamp(Math.round((idx / Math.max(1, next.length - 1)) * (cur.length - 1)), 0, cur.length - 1)];
        closestCur.connections.push(node.id);
      }
    });
  }

  const allNodes = {};
  rows.forEach(row => row.forEach(n => { allNodes[n.id] = n; }));

  // No two of the SAME encounter type back-to-back on the same path - each
  // row's type rolls independently of what connects into it, so this is a
  // real risk for any type, not just campsites. Walking rows in order (so an
  // earlier row's own fix-ups are final before its outgoing edges are
  // checked), fix any same-type edge by rerolling whichever end ISN'T one of
  // the guarantees forced above (forcedNodeIds - two rests, two shops, two
  // treasures) - normally that's the target, but a forced node can just as
  // easily be the one some earlier, randomly-rolled node happens to connect
  // INTO, in which case the source has to give instead. boss is exempt (only
  // one, final row, nothing to repeat against); the reroll itself avoids
  // landing back on 'rest' (falls back to 'combat' instead, same as before)
  // so this pass can never accidentally invent a NEW same-type conflict
  // against the node it's fixing FROM - but fixing node B to satisfy an
  // A-B edge can still coincidentally collide with some other node C that
  // also connects to B (checked in an earlier row and already considered
  // settled), so the whole pass runs a few times until nothing's left to
  // fix rather than assuming one sweep converges.
  for (let pass = 0; pass < 4; pass++) {
    let fixedAny = false;
    rows.forEach(row => row.forEach(node => {
      if (node.type === 'boss') return;
      node.connections.forEach(targetId => {
        const target = allNodes[targetId];
        if (target.type !== node.type) return;
        const nodeForced = forcedNodeIds.has(node.id);
        const targetForced = forcedNodeIds.has(target.id);
        // A guaranteed REST pairing (the two forced above) is the one thing
        // this pass must never undo - but two forced shops or two forced
        // treasures landing adjacent is fair game: fixing one still leaves
        // "at least one shop/treasure exists" satisfied by the other.
        if (nodeForced && targetForced && node.type === 'rest') return;
        const toFix = (targetForced && !nodeForced) ? node : target;
        const conflictType = node.type;
        let reroll = pickType(toFix.row);
        let attempts = 0;
        while ((reroll === conflictType || reroll === 'rest' || (reroll === 'worldEvent' && worldEventPlaced) || (reroll === 'witchJess' && witchJessPlaced)) && attempts < 8) {
          reroll = pickType(toFix.row);
          attempts++;
        }
        if (reroll === 'worldEvent') { worldEventPlaced = true; Game.worldEventPlacedThisRun = true; markRareEncounterSeen('worldEvent'); }
        else if (reroll === 'witchJess') { witchJessPlaced = true; Game.witchJessPlacedThisRun = true; markRareEncounterSeen('witchJess'); }
        toFix.type = (reroll === conflictType || reroll === 'rest') ? 'combat' : reroll;
        fixedAny = true;
      });
    }));
    if (!fixedAny) break;
  }

  // Resolves each node's SPECIFIC content (which enemy, which world event,
  // which taming reward...) at generation time instead of visit time, so the
  // map can show that exact creature/theme art on the node itself (see
  // renderMap) rather than a generic type icon, and so its attack/ambient
  // animation is already known when the player's approach reaches it. Only
  // covers types where the specific pick is either safe to fix this early
  // (combat/elite/worldEvent/taming, whose pools never run out) or a
  // reasonable preview despite depending on account state that could still
  // shift before the node is actually visited (classTrial/rareNpc/
  // legendaryTaming - each re-validates its own stored pick at visit time
  // and falls back to a plain elite fight exactly as before if it's gone
  // stale, same as when their pool was simply empty). rest/shop/treasure/
  // legendary/jakesteel/witchJess are untouched - either a generic
  // node type with no single "specific content" to preview, or (jakesteel/
  // witchJess) already a fixed, always-known identity.
  Object.values(allNodes).forEach(node => {
    if (node.type === 'combat') node.enemyId = ENEMIES[rand(0, ENEMIES.length - 1)].id;
    else if (node.type === 'elite') node.enemyId = ELITES[rand(0, ELITES.length - 1)].id;
    else if (node.type === 'event') {
      node.eventRef = EVENTS[rand(0, EVENTS.length - 1)];
    } else if (node.type === 'worldEvent') {
      const options = WORLD_EVENTS[getActTheme(act).id];
      node.worldEvent = options[rand(0, options.length - 1)];
    } else if (node.type === 'taming') {
      node.tamingReward = pickTamingReward();
    } else if (node.type === 'classTrial') {
      const locked = getLockedClassIds();
      if (locked.length) node.trialClassId = locked[rand(0, locked.length - 1)];
    } else if (node.type === 'rareNpc') {
      // Each named NPC carries its OWN 5-run cooldown (see
      // isRareEncounterReady in data.js) rather than a shared one or the old
      // permanent one-time-ever exclusion - "special, not regular" without
      // ruling out ever meeting George again, and a lucky run can still
      // surface more than one of them. Marked seen right here at placement,
      // not at visit time, so a second rareNpc node rolled later in this
      // same map (rare, but possible) won't also pick the one just placed.
      const remaining = Object.keys(RARE_NPCS).filter(id => isRareEncounterReady(id, 5));
      if (remaining.length) {
        node.rareNpcId = remaining[rand(0, remaining.length - 1)];
        markRareEncounterSeen(node.rareNpcId);
      }
    } else if (node.type === 'legendaryTaming') {
      const pdata = Persistent.load();
      const remaining = Object.keys(LEGENDARY_TAMINGS).filter(key => {
        const t = LEGENDARY_TAMINGS[key];
        return !(t.kind === 'pet' ? pdata.ownedPets : pdata.ownedMounts).includes(t.id);
      });
      if (remaining.length) node.legendaryTamingKey = remaining[rand(0, remaining.length - 1)];
    }
  });

  return {
    act,
    rows,
    nodes: allNodes,
    entryIds: rows[0].map(n => n.id),
    bossId: bossNode.id,
    totalHeight: rows.length * ROW_HEIGHT + 40
  };
}

function getAvailableNodeIds(map, currentNodeId, visited) {
  if (!currentNodeId) return map.entryIds;
  const cur = map.nodes[currentNodeId];
  return cur.connections;
}

// ============================================================================
// Perspective ("3rd person, over-the-shoulder") camera. Rather than a flat
// top-down diagram of the whole act, the viewport is a fixed window centered
// on wherever the player currently stands: that spot is anchored low in the
// frame (like a camera trailing just behind/above the character), the road
// ahead recedes upward with each row scaled down and pulled toward the
// horizontal center (a classic 2D vanishing-point trick), and the one row
// just behind fades away below. Rows beyond the visible window simply aren't
// drawn yet - fitting neatly with the fog-of-war (you can't see far ahead).
// ============================================================================

const VIEW_HEIGHT = 500;
// Only the very next row - the one the player can actually step to right now
// - is visible. Rows past that stay undrawn (not just fogged) until the
// player advances far enough that a given row BECOMES the immediate next
// row, at which point it's revealed the same way. drawRoute already only
// draws a line when both endpoints are in `screen`, so shrinking this alone
// also hides every line/node beyond the immediate choice with no extra code.
const ROWS_AHEAD = 1;
const ROWS_BEHIND = 1;
const MIN_SCALE = 0.32;

// Every zone's PixelLab-generated top-down overworld map (assets/zone_maps/
// <id>.png) - a wide-open painted ground with the zone's landmarks confined
// to the top quarter, replacing the old side-view "3rd person scene"
// (sky/path/swaying trees) as the node graph's backdrop. .map-container is a
// fixed 320x500 viewport (see styles.css), not a scrollable one - the node
// graph's own perspective math (screen[node.id] scale/anchor below) is what
// makes far-off nodes look distant, so one static image fully covers it.
function renderZoneTopdownMap(theme) {
  return `<div class="map-topdown-bg" style="background-image:url('assets/zone_maps/${theme.id}.png')"></div>`;
}

// Two camera profiles: a wider establishing shot for the very first choice
// (nothing chosen yet - `currentRow` is -1), and a tighter, closer-in
// over-the-shoulder framing once the player has actually set out down the
// path (rows spaced further apart, falling off in scale faster). Both now
// anchor at dead center - the player never actually moves (see animateTravel
// below: picking a node sends THAT NODE traveling in to meet the player,
// rather than the player walking out to it), so there's no "camera trailing
// behind a moving character" anymore, just a fixed point the road unfolds
// around.
// Anchored low rather than dead center so the player visibly starts at the
// bottom of the screen and each future row unfolds upward toward the top of
// the frame - matching the zone art (see renderZoneTopdownMap), which always
// puts its landmarks in the top quarter and open road below. The one row
// behind (ROWS_BEHIND) can crop against the bottom edge (.map-container's
// overflow:hidden) rather than push the anchor back toward center.
const ANCHOR_Y_START = VIEW_HEIGHT * 0.78;
const ROW_GAP_START = 118;
const SCALE_STEP_START = 0.17;

const ANCHOR_Y_CLOSE = VIEW_HEIGHT * 0.78;
const ROW_GAP_CLOSE = 145;
const SCALE_STEP_CLOSE = 0.22;

// Where a chosen node's charge animation actually meets the player (see
// animateTravel) - the player starts at the anchor near the bottom and the
// node starts wherever it currently sits (generally above, since future
// rows unfold upward), and each one only closes HALF the gap to
// IMPACT_Y, stopping short by IMPACT_GAP on their own side so the two
// sprites visibly charge at each other without ever touching, whatever
// either one's current art size happens to be.
const IMPACT_Y = VIEW_HEIGHT * 0.5;
const IMPACT_GAP = 34;

function perspectiveScale(depth, scaleStep) {
  return Math.max(MIN_SCALE, 1 / (1 + Math.abs(depth) * scaleStep));
}

// Builds { nodeId: {sx, sy, scale} } for every node within the visible depth
// window, plus the anchor point itself (where the traveler currently stands).
function computeScreenPositions(map, currentRow, closeCam) {
  const centerX = MAP_WIDTH / 2;
  const anchorY = closeCam ? ANCHOR_Y_CLOSE : ANCHOR_Y_START;
  const rowGap = closeCam ? ROW_GAP_CLOSE : ROW_GAP_START;
  const scaleStep = closeCam ? SCALE_STEP_CLOSE : SCALE_STEP_START;
  const screen = {};
  // The immediately-reachable row (depth===1) renders its node art much
  // bigger than the plain type-icon circle this spacing math predates (see
  // .map-node.has-art) - up to ~110px wide before it's even at full scale.
  // Fanning depth-1 nodes out from center by an extra 35% (clamped back
  // inside the viewport, same NODE_EDGE_MARGIN the map-generation jitter
  // itself respects) keeps 2-4 reachable choices visibly separated instead
  // of their art crowding/overlapping, without touching node.x itself
  // (which the connecting lines and every other row still key off).
  const NODE_EDGE_MARGIN = 40;
  const project = (node, depth, sy) => {
    const scale = perspectiveScale(depth, scaleStep);
    const spread = depth === 1 ? 1.35 : 1;
    let sx = centerX + (node.x - centerX) * scale * spread;
    sx = clamp(sx, NODE_EDGE_MARGIN, MAP_WIDTH - NODE_EDGE_MARGIN);
    screen[node.id] = { sx, sy, scale };
  };

  let cumUp = 0;
  for (let r = currentRow + 1; r <= currentRow + ROWS_AHEAD && r < map.rows.length; r++) {
    const depth = r - currentRow;
    cumUp += rowGap * perspectiveScale(depth, scaleStep);
    const rowNodes = map.rows[r] || [];
    rowNodes.forEach(node => project(node, depth, anchorY - cumUp));
    // Guarantee a real minimum gap between this reachable row's nodes - node
    // art here can run up to ~95px wide (see .map-node-art), so the spread
    // factor above alone isn't always enough, especially with 3-4
    // simultaneous choices. When the row's natural (spread) span is too
    // tight for MIN_NODE_GAP between every neighbor, it's redistributed to
    // EXACTLY that minimum spacing, evenly, centered on where it naturally
    // sat - a deterministic single pass rather than iterative nudging, so it
    // can't leave a still-too-tight pair behind. Re-clamped to stay inside
    // the viewport either way.
    if (depth === 1 && rowNodes.length > 1) {
      const MIN_NODE_GAP = 76;
      const sorted = rowNodes.map(n => screen[n.id]).sort((a, b) => a.sx - b.sx);
      const requiredSpan = (sorted.length - 1) * MIN_NODE_GAP;
      const currentSpan = sorted[sorted.length - 1].sx - sorted[0].sx;
      if (currentSpan < requiredSpan) {
        const mean = sorted.reduce((s, p) => s + p.sx, 0) / sorted.length;
        const start = clamp(mean - requiredSpan / 2, NODE_EDGE_MARGIN, MAP_WIDTH - NODE_EDGE_MARGIN - requiredSpan);
        sorted.forEach((pos, i) => { pos.sx = start + i * MIN_NODE_GAP; });
      } else {
        sorted.forEach(pos => { pos.sx = clamp(pos.sx, NODE_EDGE_MARGIN, MAP_WIDTH - NODE_EDGE_MARGIN); });
      }
    }
  }
  let cumDown = 0;
  for (let r = currentRow - 1; r >= currentRow - ROWS_BEHIND && r >= 0; r--) {
    const depth = currentRow - r;
    cumDown += rowGap * perspectiveScale(depth, scaleStep);
    (map.rows[r] || []).forEach(node => project(node, depth, anchorY + cumDown));
  }
  if (currentRow >= 0 && map.rows[currentRow]) {
    map.rows[currentRow].forEach(node => project(node, 0, anchorY));
  }
  return { screen, centerX, anchorY };
}

function renderMap(container, map, currentNodeId, visitedIds, onSelect, classId) {
  const available = new Set(getAvailableNodeIds(map, currentNodeId, visitedIds));
  const visitedSet = new Set(visitedIds);
  const cur = map.nodes[currentNodeId];
  const currentRow = cur ? cur.row : -1;
  const closeCam = !!cur; // pulled in tight once the player has taken their first step
  const { screen, centerX, anchorY } = computeScreenPositions(map, currentRow, closeCam);
  // The player is always dead center - this fixed point is both where the
  // traveler sprite sits and where every route out of the current position
  // is drawn from, whether or not a real current node exists yet.
  const anchorPos = { sx: centerX, sy: anchorY, scale: 1 };

  // Once you've stepped onto a node, its whole row's markers - itself
  // included - stop being drawn at their own natural (slightly off-center)
  // position: the player's fixed, centered sprite already represents "here",
  // so a separate circle for it would just be a redundant, off-center ghost.
  const hiddenCurrentRowIds = new Set((map.rows[currentRow] || []).map(node => node.id));

  let svgLines = '';
  let svgHitAreas = '';
  const drawRoute = (fromScreen, targetId, dimmed) => {
    const b = screen[targetId];
    if (!b) return;
    const width = Math.max(2.5, 8 * Math.min(fromScreen.scale, b.scale));
    svgLines += `<line x1="${fromScreen.sx}" y1="${fromScreen.sy}" x2="${b.sx}" y2="${b.sy}" class="map-line ${dimmed ? 'dim' : 'active'}" stroke-width="${width}" />`;
    if (!dimmed && available.has(targetId)) {
      svgHitAreas += `<line x1="${fromScreen.sx}" y1="${fromScreen.sy}" x2="${b.sx}" y2="${b.sy}" class="map-line-hit" data-node-id="${targetId}" />`;
    }
  };

  Object.values(map.nodes).forEach(node => {
    if (hiddenCurrentRowIds.has(node.id)) return;
    const a = screen[node.id];
    if (!a) return;
    node.connections.forEach(targetId => {
      if (hiddenCurrentRowIds.has(targetId)) return;
      const dimmed = !(visitedSet.has(node.id) && (visitedSet.has(targetId) || available.has(targetId)));
      drawRoute(a, targetId, dimmed);
    });
  });
  // The current position's own outgoing routes (or, before the first pick,
  // the synthetic roads from the dungeon entrance to row 0) always draw from
  // the fixed dead-center anchor rather than a node's natural position - see
  // hiddenCurrentRowIds above.
  if (cur) {
    cur.connections.forEach(targetId => drawRoute(anchorPos, targetId, false));
  } else {
    map.entryIds.forEach(id => drawRoute(anchorPos, id, false));
  }

  let nodesHtml = '';
  Object.keys(screen).forEach(nodeId => {
    if (hiddenCurrentRowIds.has(nodeId)) return;
    const node = map.nodes[nodeId];
    const pos = screen[nodeId];
    const isVisited = visitedSet.has(node.id);
    const isAvailable = available.has(node.id) && !isVisited;
    // A node ahead of the player that isn't actually connected to where
    // they're standing (a sibling reachable only from a different node in
    // the current row, not this one) can never be walked to from here -
    // showing it as a "?" would just be inert clutter with no path leading
    // to it. The boss is exempted, same as the fog-of-war treatment above -
    // its position already telegraphs it regardless of the current route.
    if (node.row > currentRow && !isAvailable && node.type !== 'boss') return;
    const revealed = isVisited || node.type === 'boss' || isAvailable;
    const info = revealed ? NODE_TYPES[node.type] : FOG_NODE;
    const isCurrent = node.id === currentNodeId;
    const classes = ['map-node', revealed ? node.type : 'fogged'];
    if (isAvailable) classes.push('available');
    if (isVisited) classes.push('visited');
    if (isCurrent) classes.push('current');
    // Swaps the generic type icon+circle for the actual creature/theme art
    // (see nodePreviewArt above) wherever it's known - a combat/elite/boss
    // node shows its enemy's own idle portrait (its attack swing plays on
    // arrival, see animateTravel), every decision-based encounter instead
    // loops its own ambient animation continuously, same as its full
    // encounter screen. Falls back to the plain emoji+circle for every
    // other type, or if this specific node's art isn't resolved yet.
    const art = revealed ? nodePreviewArt(node, map.act) : null;
    const iconHtml = art
      ? `<img class="map-node-art" src="${art.idle}" alt="${info.label}" data-frames-ready="${art.kind === 'ambient' ? '0' : '1'}">`
      : `<span class="map-node-icon">${info.icon}</span>`;
    nodesHtml += `<div class="${classes.join(' ')} ${art ? 'has-art' : ''}" style="left:${pos.sx}px; top:${pos.sy}px; --node-scale:${pos.scale.toFixed(3)}" data-node-id="${node.id}" title="${info.label}"
      ${isAvailable ? 'role="button" tabindex="0"' : ''}>
      ${iconHtml}
    </div>`;
  });

  // Once the camera's pulled in close, the character itself renders bigger -
  // part of what sells "closer to the player" beyond just the anchor/spacing.
  // renderCompanionRig also folds in an equipped mount (rendered as a
  // rideable steed underneath) and pet (rendered alongside).
  const travelerSprite = classId ? renderCompanionRig(classId, closeCam ? 100 : 78) : '';

  // Purely cosmetic per-act backdrop (see ACT_THEMES in data.js) - the
  // zone's own painted top-down map, so the same node-graph generator reads
  // as a different place every 10 acts instead of the same gray dungeon
  // corridor forever.
  const theme = getActTheme(map.act);
  container.style.background = theme.bg;

  container.innerHTML = `
    ${renderZoneTopdownMap(theme)}
    <div class="map-scroll" style="height:${VIEW_HEIGHT}px">
      <div class="map-theme-label">${theme.name} · Act ${map.act}</div>
      <svg class="map-svg" width="${MAP_WIDTH}" height="${VIEW_HEIGHT}">${svgLines}${svgHitAreas}</svg>
      ${nodesHtml}
      <div class="map-traveler idle-bob" id="map-traveler" style="left:${anchorPos.sx}px; top:${anchorPos.sy}px; --traveler-scale:1">${travelerSprite}</div>
    </div>`;

  // Kick off every ambient-kind node preview's own looping animation now
  // that its <img> actually exists in the DOM (see nodePreviewArt/iconHtml
  // above - attack-kind previews stay on their static idle frame here and
  // only animate once, on arrival, via animateTravel below).
  container.querySelectorAll('.map-node-art[data-frames-ready="0"]').forEach(img => {
    const node = map.nodes[img.closest('.map-node').dataset.nodeId];
    const art = nodePreviewArt(node, map.act);
    if (art) playFrames(img, art.frames, 260, true);
  });

  const travelTo = (nodeId) => animateTravel(container, screen[nodeId], anchorPos, nodeId, onSelect, map);
  container.querySelectorAll('.map-node.available').forEach(el => {
    el.addEventListener('click', () => travelTo(el.dataset.nodeId));
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); travelTo(el.dataset.nodeId); }
    });
  });
  container.querySelectorAll('.map-line-hit').forEach(el => {
    el.addEventListener('click', () => travelTo(el.dataset.nodeId));
  });
}

// Pushes the top-down map backdrop into a brief zoom-and-fade "leave"
// (.map-topdown-bg-leaving) - called the instant the player sets out for
// their next node, so the world itself reacts to moving forward instead of
// just sitting there.
function leaveForegroundTrees(container) {
  const bg = container.querySelector('.map-topdown-bg');
  if (!bg) return;
  // Clear any leftover cycle state and force a reflow before re-adding the
  // class - without this, re-triggering while a previous cycle's class is
  // somehow still present would be a no-op (the animation wouldn't restart).
  bg.classList.remove('map-topdown-bg-leaving', 'map-topdown-bg-blooming');
  void bg.offsetWidth;
  bg.classList.add('map-topdown-bg-leaving');
}

// Brings the map backdrop back into focus (.map-topdown-bg-blooming,
// zooming down from slightly enlarged) - called once the traveler actually
// arrives at the chosen node, not on a fixed timer, so the "in transit" beat
// always lasts exactly as long as the walk itself.
function bloomForegroundTrees(container) {
  const bg = container.querySelector('.map-topdown-bg');
  if (!bg) return;
  bg.classList.remove('map-topdown-bg-leaving');
  bg.classList.add('map-topdown-bg-blooming');
  bg.addEventListener('animationend', () => bg.classList.remove('map-topdown-bg-blooming'), { once: true });
}

// How long to hold on the map, traveler mid-jump, after arrival before
// actually cutting to the encounter - gives the bloom-in above (0.6s) time
// to fully play out instead of getting cut off.
const ARRIVAL_BUFFER_MS = 650;

// A brief camera-shake at the moment of impact (see animateTravel) - toggles
// a class on the whole map viewport rather than the traveler/node
// individually, since the "hit" should read as the ground/camera jolting,
// not either combatant's own sprite jittering (that's what their attack
// animations are for).
function shakeScreen(container) {
  container.classList.remove('map-impact-shake');
  // Force reflow so re-adding the class restarts the animation even if a
  // previous shake's tail end somehow overlaps this one (rapid clicking).
  void container.offsetWidth;
  container.classList.add('map-impact-shake');
  container.addEventListener('animationend', () => container.classList.remove('map-impact-shake'), { once: true });
}

// The player's own attack-swing animation (the exact same WEAPON_ATTACK_ANIM
// frames combat uses, see the analogous trigger in renderCombatScreen) - the
// map traveler's rider gets this at the same impact moment the node's own
// art plays its attack flourish, so the charge reads as two real
// combatants clashing rather than one side just standing there.
function playPlayerImpactSwing(traveler) {
  if (!traveler || !Game.player) return;
  const classId = Game.player.classId;
  const weaponVisual = currentWeaponVisual(classId);
  const anim = WEAPON_ATTACK_ANIM[`${classId}_${weaponVisual}`];
  const riderImg = traveler.querySelector('.companion-rider .player-weapon-sprite');
  if (anim && riderImg) playFrames(riderImg, anim.attackFrames, 90, false);
}

// The chosen node and the player both charge toward IMPACT_Y from their own
// side (see the constant above) rather than the old "node travels the whole
// way to a stationary player" - each stops short by IMPACT_GAP so the two
// sprites visibly close the distance without ever touching. Every other
// node/line from this choice fades away the same as before. Once both
// arrive, that's "impact": a screen shake, the player's own attack swing,
// and (for combat/elite/boss) the enemy's real attack flourish (see
// nodePreviewArt) all fire together, then the same leave/bloom (trees,
// path) and landing-jump cues bring the map back before the encounter
// screen takes over.
function animateTravel(container, targetPos, centerPos, nodeId, onSelect, map) {
  const traveler = container.querySelector('#map-traveler');
  const nodeEl = container.querySelector(`.map-node[data-node-id="${nodeId}"]`);
  if (!nodeEl || !targetPos) { onSelect(nodeId); return; }

  leaveForegroundTrees(container);

  container.querySelectorAll('.map-node.available, .map-line-hit').forEach(el => {
    el.style.pointerEvents = 'none';
  });
  // The road not taken (every other node/line this render drew) falls away
  // so only the chosen node's approach is visible - the next renderMap()
  // call draws a clean slate once it actually arrives.
  container.querySelectorAll('.map-node, .map-line').forEach(el => {
    if (el !== nodeEl) el.classList.add('map-fading-out');
  });

  const meetNodeY = IMPACT_Y - IMPACT_GAP;
  const meetTravelerY = IMPACT_Y + IMPACT_GAP;
  const dist = Math.hypot(targetPos.sx - centerPos.sx, targetPos.sy - meetNodeY);
  const duration = Math.round(clamp(dist * 2.6, 450, 1100));

  if (traveler) {
    traveler.classList.toggle('facing-left', targetPos.sx < centerPos.sx);
    traveler.classList.remove('idle-bob');
    traveler.classList.add('walking');
    traveler.style.transition = `left ${duration}ms ease-in, top ${duration}ms ease-in`;
    requestAnimationFrame(() => {
      traveler.style.left = `${centerPos.sx}px`;
      traveler.style.top = `${meetTravelerY}px`;
    });
  }
  nodeEl.style.zIndex = '5';
  nodeEl.style.transition = `left ${duration}ms ease-in, top ${duration}ms ease-in, transform ${duration}ms ease-in`;
  requestAnimationFrame(() => {
    nodeEl.style.left = `${centerPos.sx}px`;
    nodeEl.style.top = `${meetNodeY}px`;
    nodeEl.style.setProperty('--node-scale', '1');
  });

  setTimeout(() => {
    // Impact - both sides have closed the distance. Play the landing jump,
    // the player's own swing, the screen shake, and bring the treeline/path
    // back in while they actually watch it happen, instead of getting
    // yanked straight into the next screen. A combat/elite/boss node also
    // gets one playthrough of its enemy's actual attack swing right here
    // (see nodePreviewArt) - held on for as long as needed instead of the
    // plain ARRIVAL_BUFFER_MS, so the flourish is never cut off mid-swing
    // before the encounter screen takes over.
    if (traveler) { traveler.classList.remove('walking'); traveler.classList.add('jumping'); }
    bloomForegroundTrees(container);
    shakeScreen(container);
    playPlayerImpactSwing(traveler);
    const node = map && map.nodes[nodeId];
    const art = node && nodePreviewArt(node, map.act);
    const artImg = nodeEl.querySelector('.map-node-art');
    if (art && art.kind === 'attack' && artImg) {
      playFrames(artImg, art.frames, 90, false, () => onSelect(nodeId));
    } else {
      setTimeout(() => onSelect(nodeId), ARRIVAL_BUFFER_MS);
    }
  }, duration);
}
