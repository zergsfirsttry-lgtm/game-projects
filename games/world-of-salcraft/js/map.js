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
const REGULAR_ROWS = 12; // rows 0..11, then boss row = 12

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
  // visit time since only one branch of the map is ever walked).
  let worldEventPlaced = Game.worldEventPlacedThisRun;

  for (let r = 0; r < REGULAR_ROWS; r++) {
    const count = r === REGULAR_ROWS - 1 ? 2 : rand(3, 4);
    const nodes = [];
    for (let i = 0; i < count; i++) {
      const baseX = (MAP_WIDTH / (count + 1)) * (i + 1);
      const jitter = rand(-18, 18);
      let type = pickType(r);
      if (type === 'worldEvent') {
        if (worldEventPlaced) type = 'event';
        else { worldEventPlaced = true; Game.worldEventPlacedThisRun = true; }
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
  // Both guaranteed rests are exempt from the no-two-rests-in-a-row pass
  // below (forcedRestIds) so that pass can never undo them.
  const forcedRestIds = new Set();
  const lastRow = rows[REGULAR_ROWS - 1];
  const lastRestNode = lastRow[rand(0, lastRow.length - 1)];
  lastRestNode.type = 'rest';
  forcedRestIds.add(lastRestNode.id);
  const midpointRow = rows[Math.floor(REGULAR_ROWS / 2)];
  const midRestNode = midpointRow[rand(0, midpointRow.length - 1)];
  midRestNode.type = 'rest';
  forcedRestIds.add(midRestNode.id);

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
    row[rand(0, row.length - 1)].type = type;
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

  // No two campsites back-to-back on the same path - each row's type rolls
  // independently of what connects into it, so this is a real risk. Walking
  // rows in order (so an earlier row's own fix-ups are final before its
  // outgoing edges are checked), fix any rest-into-rest edge by rerolling
  // whichever end ISN'T one of the two guaranteed rests above (which this
  // must never undo) - normally that's the target, but a guaranteed rest
  // can just as easily be the one some earlier, randomly-rolled rest
  // happens to connect INTO, in which case the source has to give instead.
  rows.forEach(row => row.forEach(node => {
    if (node.type !== 'rest') return;
    node.connections.forEach(targetId => {
      const target = allNodes[targetId];
      if (target.type !== 'rest') return;
      const toFix = forcedRestIds.has(target.id) ? node : target;
      if (forcedRestIds.has(toFix.id)) return; // both ends forced - leave be
      let reroll = pickType(toFix.row);
      let attempts = 0;
      while (reroll === 'rest' && attempts < 5) { reroll = pickType(toFix.row); attempts++; }
      toFix.type = reroll === 'rest' ? 'combat' : reroll;
    });
  }));

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
  const project = (node, depth, sy) => {
    const scale = perspectiveScale(depth, scaleStep);
    screen[node.id] = { sx: centerX + (node.x - centerX) * scale, sy, scale };
  };

  let cumUp = 0;
  for (let r = currentRow + 1; r <= currentRow + ROWS_AHEAD && r < map.rows.length; r++) {
    const depth = r - currentRow;
    cumUp += rowGap * perspectiveScale(depth, scaleStep);
    (map.rows[r] || []).forEach(node => project(node, depth, anchorY - cumUp));
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
    nodesHtml += `<div class="${classes.join(' ')}" style="left:${pos.sx}px; top:${pos.sy}px; --node-scale:${pos.scale.toFixed(3)}" data-node-id="${node.id}" title="${info.label}"
      ${isAvailable ? 'role="button" tabindex="0"' : ''}>
      <span class="map-node-icon">${info.icon}</span>
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
      <div class="map-traveler" id="map-traveler" style="left:${anchorPos.sx}px; top:${anchorPos.sy}px; --traveler-scale:1">${travelerSprite}</div>
    </div>`;

  const travelTo = (nodeId) => animateTravel(container, screen[nodeId], anchorPos, nodeId, onSelect);
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

// The player never moves - instead, the chosen node's own marker travels
// IN to meet the fixed, dead-center anchor (shrinking toward scale 1 as it
// "arrives"), while every other node/line from this choice fades away.
// Once it reaches the player, that's "arrival": the same leave/bloom (trees,
// path) and landing-jump cues as before, just now triggered by the road
// coming to you rather than you walking down it.
function animateTravel(container, targetPos, centerPos, nodeId, onSelect) {
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

  const dist = Math.hypot(targetPos.sx - centerPos.sx, targetPos.sy - centerPos.sy);
  const duration = Math.round(clamp(dist * 2.6, 450, 1100));

  if (traveler) traveler.classList.toggle('facing-left', targetPos.sx < centerPos.sx);
  nodeEl.style.zIndex = '5';
  nodeEl.style.transition = `left ${duration}ms ease-in, top ${duration}ms ease-in, transform ${duration}ms ease-in`;
  requestAnimationFrame(() => {
    nodeEl.style.left = `${centerPos.sx}px`;
    nodeEl.style.top = `${centerPos.sy}px`;
    nodeEl.style.setProperty('--node-scale', '1');
  });

  setTimeout(() => {
    // Arrived - the path has reached the player. Play the landing jump and
    // bring the treeline/path back in while they actually watch it happen,
    // instead of getting yanked straight into the next screen.
    if (traveler) traveler.classList.add('jumping');
    bloomForegroundTrees(container);
    setTimeout(() => onSelect(nodeId), ARRIVAL_BUFFER_MS);
  }, duration);
}
