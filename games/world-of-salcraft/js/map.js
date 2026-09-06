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
  boss: { icon: '☠️', label: 'Boss' }
};

// How "dangerous" each node type reads for AUTO's path-of-most-resistance
// pick (see autoPickPath in main.js) - purely a UI-facing ranking, no
// gameplay effect of its own; ties just keep whichever came first.
const NODE_RESISTANCE_RANK = {
  boss: 8, legendary: 7, elite: 6, classTrial: 5, taming: 4,
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
  if (roll < 0.78) return 'rest';
  if (roll < 0.86) return 'shop';
  if (roll < 0.94) return 'treasure';
  if (roll < 0.97) return 'classTrial'; // rare - actual target class is chosen when the node is visited
  if (roll < 0.995) return 'taming'; // rare - tame a persistent WoW/D&D-flavored pet or mount
  return 'legendary'; // very rare - a multi-wave gauntlet guarding a named legendary item
}

function generateMap(act) {
  const rows = [];
  let idCounter = 0;

  for (let r = 0; r < REGULAR_ROWS; r++) {
    const count = r === REGULAR_ROWS - 1 ? 2 : rand(3, 4);
    const nodes = [];
    for (let i = 0; i < count; i++) {
      const baseX = (MAP_WIDTH / (count + 1)) * (i + 1);
      const jitter = rand(-18, 18);
      nodes.push({
        id: `n${idCounter++}`,
        row: r,
        slot: i,
        x: Math.max(30, Math.min(MAP_WIDTH - 30, baseX + jitter)),
        y: r * ROW_HEIGHT + 60,
        type: pickType(r),
        connections: [],
        visited: false
      });
    }
    rows.push(nodes);
  }

  // Force guarantees so a long act still has reliable pacing: rests at the
  // midpoint and just before the boss, a couple of shops and treasures spread out.
  const lastRow = rows[REGULAR_ROWS - 1];
  lastRow[rand(0, lastRow.length - 1)].type = 'rest';
  const midpointRow = rows[Math.floor(REGULAR_ROWS / 2)];
  midpointRow[rand(0, midpointRow.length - 1)].type = 'rest';

  const midRows = rows.slice(1, REGULAR_ROWS - 1);
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

// Zones with a themed third-person scene (assets/scenes/<id>/) - a plain
// CSS gradient sky (theme.bg) plus the zone's own ground tileset as a land
// strip along the bottom, with three small hand-picked pixel props (sky.png
// - a sun or moon, cloud.png - a drifting atmosphere wisp, fg.png - a
// swaying foreground silhouette) layered on top. Zones not in this set fall
// back to the tiled ground texture + procedural skyline silhouette (see
// renderMap). Cheaper and more consistent than painting a full unique scene
// per zone - the land/sky is reused code, only the three small props differ.
const ZONE_SCENE_READY = new Set(['forest', 'swamp', 'desert', 'hellfire', 'emerald', 'silvermoon', 'blacktemple', 'northrend', 'nether']);

// Most fg props are tree-like and sway in the wind; a couple (a floating
// rock shard, a jagged spire) read better bobbing gently up and down.
const ZONE_SCENE_FG_MOTION = { blacktemple: 'bob', nether: 'bob' };

// Sun/moon glow, drifting clouds, and a swaying/bobbing pair of foreground
// props (pure CSS, see .map-scene-* in styles.css) are layered over the
// land+sky so the scene doesn't feel like a single frozen frame.
function renderZoneScene(theme) {
  const fgMotion = ZONE_SCENE_FG_MOTION[theme.id] || 'sway';
  return `<div class="map-scene">
    <div class="map-scene-sky" style="background:${theme.bg}"></div>
    <div class="map-scene-path" style="background-image:url('assets/tilesets/${theme.id}.png')"></div>
    <img class="map-scene-sky-body" src="assets/scenes/${theme.id}/sky.png" alt="">
    <img class="map-scene-cloud map-scene-cloud-1" src="assets/scenes/${theme.id}/cloud.png" alt="">
    <img class="map-scene-cloud map-scene-cloud-2" src="assets/scenes/${theme.id}/cloud.png" alt="">
    <img class="map-scene-fg map-scene-fg-left map-scene-fg-${fgMotion}-left" src="assets/scenes/${theme.id}/fg.png" alt="">
    <img class="map-scene-fg map-scene-fg-right map-scene-fg-${fgMotion}-right" src="assets/scenes/${theme.id}/fg.png" alt="">
  </div>`;
}

// Two camera profiles: a wider establishing shot for the very first choice
// (nothing chosen yet - `currentRow` is -1), and a tighter, closer-in
// over-the-shoulder framing once the player has actually set out down the
// path. The close profile anchors lower in the frame, spaces rows further
// apart, and falls off scale faster - all of which read as the camera having
// pulled in right behind the character rather than watching from a distance.
// Anchored close to the bottom edge of VIEW_HEIGHT (500) so the traveler's
// feet plant near the base of the frame, like a camera trailing right behind
// them, with just enough clearance below to not look clipped.
const ANCHOR_Y_START = 430;
const ROW_GAP_START = 118;
const SCALE_STEP_START = 0.17;

const ANCHOR_Y_CLOSE = 480;
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

  // Once you've stepped onto a node, the sibling choices you *didn't* take in
  // that same row are just dead alternate branches - hiding them (and any
  // line touching them) keeps the screen to just where you stand and where
  // you can go next, instead of a full historical diagram of roads not taken.
  const hiddenSiblingIds = new Set(
    (map.rows[currentRow] || [])
      .filter(node => node.id !== currentNodeId)
      .map(node => node.id)
  );

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
    if (hiddenSiblingIds.has(node.id)) return;
    const a = screen[node.id];
    if (!a) return;
    node.connections.forEach(targetId => {
      if (hiddenSiblingIds.has(targetId)) return;
      const dimmed = !(visitedSet.has(node.id) && (visitedSet.has(targetId) || available.has(targetId)));
      drawRoute(a, targetId, dimmed);
    });
  });
  // No real "current node" yet (run just started) - draw synthetic roads
  // from the anchor (dungeon entrance) out to row 0 so the first choice
  // still reads as a fork in a path rather than floating markers.
  if (!cur) {
    map.entryIds.forEach(id => drawRoute({ sx: centerX, sy: anchorY, scale: 1 }, id, false));
  }

  let nodesHtml = '';
  Object.keys(screen).forEach(nodeId => {
    if (hiddenSiblingIds.has(nodeId)) return;
    const node = map.nodes[nodeId];
    const pos = screen[nodeId];
    const isVisited = visitedSet.has(node.id);
    const isAvailable = available.has(node.id) && !isVisited;
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
  // The traveler rests at the CURRENT node's own projected position - not
  // just the horizontal center - so it visibly stands on the circle you
  // actually picked rather than snapping back to the middle of the road.
  const restPos = screen[currentNodeId] || { sx: centerX, sy: anchorY, scale: 1 };

  // Purely cosmetic per-act backdrop (see ACT_THEMES in data.js) - a themed
  // background on the map's own bordered frame plus a handful of drifting
  // particles, so the same node-graph generator reads as a different place
  // every 10 acts instead of the same gray dungeon corridor forever.
  const theme = getActTheme(map.act);
  container.style.background = theme.bg;
  const particles = Array.from({ length: 9 }, (_, i) => {
    const pos = rand(2, 94);
    const delay = (Math.random() * 6).toFixed(2);
    const duration = (5 + Math.random() * 4).toFixed(2);
    const drift = rand(-30, 30);
    return `<span class="map-particle" style="${theme.motion === 'drift-side' ? 'top' : 'left'}:${pos}%; animation-delay:${delay}s; animation-duration:${duration}s; --particle-drift:${drift}px">${theme.particle}</span>`;
  }).join('');

  // The skyline is anchored to the visible viewport (a sibling of the tall
  // scrollable .map-scroll, sitting directly in .map-container instead of
  // inside it) so it always shows at the bottom of what's on screen, rather
  // than the bottom of the full (much taller) scrollable map coordinate
  // space, which the camera rarely scrolls all the way down to.
  const skylineProgress = Math.min(1, visitedIds.length / (Object.keys(map.nodes).length || 1));
  const backdrop = ZONE_SCENE_READY.has(theme.id)
    ? renderZoneScene(theme)
    : `<div class="map-ground" style="background-image:url('assets/tilesets/${theme.id}.png')"></div>
       <div class="map-skyline">${renderZoneSkyline(theme.id, skylineProgress, 'contain', 300)}</div>`;
  // Zones with a full painted scene already carry plenty of atmosphere
  // (drifting clouds, swaying trees) - the small drifting-emoji particles
  // read as clutter layered on top of real art, so they're skipped there.
  container.innerHTML = `
    ${backdrop}
    <div class="map-scroll" style="height:${VIEW_HEIGHT}px">
      <div class="map-particles particle-${theme.motion}">${ZONE_SCENE_READY.has(theme.id) ? '' : particles}</div>
      <div class="map-theme-label">${theme.name} · Act ${map.act}</div>
      <svg class="map-svg" width="${MAP_WIDTH}" height="${VIEW_HEIGHT}">${svgLines}${svgHitAreas}</svg>
      ${nodesHtml}
      <div class="map-traveler" id="map-traveler" style="left:${restPos.sx}px; top:${restPos.sy}px; --traveler-scale:${restPos.scale.toFixed(3)}">${travelerSprite}</div>
    </div>`;

  const travelTo = (nodeId) => animateTravel(container, screen[nodeId], nodeId, onSelect);
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

// Sends the two big foreground trees and the ground path (see
// renderZoneScene) down off screen and fading (.fg-leaving/.path-leaving) -
// called the instant the player leaves their current node, so the whole
// treeline reacts to moving forward instead of just sitting there.
function leaveForegroundTrees(container) {
  container.querySelectorAll('.map-scene-fg-left, .map-scene-fg-right').forEach(tree => {
    // Clear any leftover cycle state and force a reflow before re-adding the
    // class - without this, re-triggering while a previous cycle's classes
    // are somehow still present would be a no-op (the animation wouldn't
    // restart).
    tree.classList.remove('fg-leaving', 'fg-blooming');
    void tree.offsetWidth;
    tree.classList.add('fg-leaving');
  });
  const path = container.querySelector('.map-scene-path');
  if (path) {
    path.classList.remove('path-leaving', 'path-blooming');
    void path.offsetWidth;
    path.classList.add('path-leaving');
  }
}

// Pops a fresh tree/path up out of the ground at the same spot (.fg-blooming
// / .path-blooming, scaling up from a bottom-anchored transform-origin so it
// reads as sprouting rather than fading in) - called once the traveler
// actually arrives at the chosen node, not on a fixed timer, so the "gone"
// gap always lasts exactly as long as the walk itself. A small per-cycle
// jitter on the trees keeps the "new" one from looking like an exact rewind
// of the one that just left.
function bloomForegroundTrees(container) {
  container.querySelectorAll('.map-scene-fg-left, .map-scene-fg-right').forEach(tree => {
    const isLeft = tree.classList.contains('map-scene-fg-left');
    tree.classList.remove('fg-leaving');
    const jitter = (Math.random() - 0.5) * 6; // percentage points
    tree.style.setProperty(isLeft ? 'left' : 'right', `calc(-9% + ${jitter.toFixed(2)}%)`);
    tree.style.width = `${(38 + Math.random() * 5).toFixed(1)}%`;
    tree.classList.add('fg-blooming');
    tree.addEventListener('animationend', () => tree.classList.remove('fg-blooming'), { once: true });
  });
  const path = container.querySelector('.map-scene-path');
  if (path) {
    path.classList.remove('path-leaving');
    path.classList.add('path-blooming');
    path.addEventListener('animationend', () => path.classList.remove('path-blooming'), { once: true });
  }
}

// How long to hold on the map, traveler mid-jump, after arrival before
// actually cutting to the encounter - gives the bloom-in above (0.6s) time
// to fully play out instead of getting cut off.
const ARRIVAL_BUFFER_MS = 650;

// Walks the traveler marker from the anchor point to the chosen node's
// perspective-projected position (shrinking as it "moves into the distance")
// before actually resolving the encounter - picking a route reads as setting
// out down that path rather than opening a menu. Once the encounter resolves
// and the map re-renders, the new current node becomes the anchor again, so
// the "camera" reads as having followed the character forward.
function animateTravel(container, targetPos, nodeId, onSelect) {
  const traveler = container.querySelector('#map-traveler');
  if (!traveler || !targetPos) { onSelect(nodeId); return; }

  leaveForegroundTrees(container);

  container.querySelectorAll('.map-node.available, .map-line-hit').forEach(el => {
    el.style.pointerEvents = 'none';
  });

  const startX = parseFloat(traveler.style.left) || 0;
  const startY = parseFloat(traveler.style.top) || 0;
  const dist = Math.hypot(targetPos.sx - startX, targetPos.sy - startY);
  const duration = Math.round(clamp(dist * 2.6, 450, 1100));

  traveler.classList.add('walking');
  traveler.classList.toggle('facing-left', targetPos.sx < startX);
  traveler.style.transition = `left ${duration}ms ease-in-out, top ${duration}ms ease-in-out, transform ${duration}ms ease-in-out`;
  requestAnimationFrame(() => {
    traveler.style.left = `${targetPos.sx}px`;
    traveler.style.top = `${targetPos.sy}px`;
    traveler.style.setProperty('--traveler-scale', targetPos.scale.toFixed(3));
  });

  setTimeout(() => {
    // Arrived - swap the walk-cycle for a one-shot landing jump and bring
    // the treeline/path back in while the player actually watches it
    // happen, instead of getting yanked straight into the next screen.
    traveler.classList.remove('walking');
    traveler.classList.add('jumping');
    bloomForegroundTrees(container);
    setTimeout(() => onSelect(nodeId), ARRIVAL_BUFFER_MS);
  }, duration);
}
