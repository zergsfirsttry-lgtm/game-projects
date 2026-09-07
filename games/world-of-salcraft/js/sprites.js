// Procedural pixel-art sprites (SVG, no image assets). Grids are authored as the
// left half only and mirrored horizontally to build a symmetric, front-facing sprite.

// Every row here must be "flush to the seam" wherever the silhouette should
// read as continuous - i.e. its rightmost (innermost) half-column has to be
// filled, since that column and its mirror are the two centermost pixels of
// the final sprite. A row authored "centered" (gap at the innermost column)
// silently splits the shape down the middle - invisible with flat fills, but
// traced by the new outline pass as an ugly notch. Only rows that should
// genuinely split (a gap between two legs, two ears) skip that column on
// purpose, with the gap sized deliberately rather than left to chance.
// ----------------------------------------------------------------------------
// Resolution note: every template/overlay/weapon-shape below is authored at
// 2x the grid density of the original hand-drawn art (each old cell became a
// clean 2x2 block, THEN a handful of transition rows were hand-refined for
// smoother diagonals - shoulder slopes, jaw curve, wingtip taper - rather
// than staying blocky). This is what makes 32x32/64x64 (see
// PLAYER_SPRITE_SIZE/EPIC_ENEMY_SPRITE_SIZE in main.js) actually look more
// detailed instead of just uniformly bigger. Because it's a strict 2x scale,
// every row/col/w/h coordinate in a SPRITES overlay or a WEAPON_SHAPES entry
// is exactly double what it would have been against the old grid - see the
// comments at each of those for the old->new mapping used.
// ----------------------------------------------------------------------------
const TEMPLATES = {
  humanoid: [
    "................",
    "................",
    "....RRRRRRRRRRRR",
    "....RRRRRRRRRRRR",
    "..RRRRHHHHHHHHHH",
    "..RRRRHHHHHHHHHH",
    "..RRHHHHHHFFHHHH",
    "..RRHHHHHHFFHHHH",
    "..RRHHHHHHHHHHHH",
    "..RRHHHHHHHHHHHH",
    "....HHHHHHHHHHHH",
    "....HHHHHHHHHHHH",
    "........NNNNNNNN",
    "........NNNNNNNN",
    "......AAAAAAAAAA",
    "......AAAAAAAAAA",
    "......AAAAAAAAAA",
    "......AAAAAAAAAA",
    "......AAAAAAAAAA",
    "......AAAAAAAAAA",
    "..........LLLL..",
    "..........LLLL..",
    "..........LLLL..",
    "..........LLLL..",
    "..........LLLL..",
    "..........LLLL..",
    "..........LLLL..",
    "..........LLLL..",
    "..........BBBB..",
    "..........BBBB..",
    "................",
    "................"
  ],
  creature: [
    "................",
    "................",
    "..........EEEE..",
    "..........EEEE..",
    "..EEEEEEEEEEEEEE",
    "..EEEEEEEEEEEEEE",
    "..EEEEHHHHHHHHHH",
    "..EEEEHHHHHHHHHH",
    "..HHHHHHHHFFHHHH",
    "..HHHHHHHHFFHHHH",
    "..HHHHHHHHHHHHHH",
    "..HHHHHHHHHHHHHH",
    "......HHHHHHHHHH",
    "......HHHHHHHHHH",
    "....BBBBBBBBBBBB",
    "....BBBBBBBBBBBB",
    "....BBBBBBBBBBBB",
    "....BBBBBBBBBBBB",
    "............BB..",
    "............BB..",
    "............PP..",
    "............PP..",
    "................",
    "................"
  ],
  // Small winged creature - dragon whelplings, griffons, owls, pixies. Wings
  // (W) spread wide toward the outer edge, head/body (H) toward the seam.
  flyer: [
    "................",
    "................",
    "..........EEEE..",
    "..........EEEE..",
    "........EEEEEEEE",
    "........EEEEEEEE",
    "......WWHHHHHHHH",
    "......WWHHHHHHHH",
    "..WWWWWWHHHHFFHH",
    "..WWWWWWHHHHFFHH",
    "..WWWWWWWWHHHHHH",
    "..WWWWWWWWHHHHHH",
    "....WWWWHHHHHHHH",
    "....WWWWHHHHHHHH",
    "......BBHHHHHHHH",
    "......BBHHHHHHHH",
    "........BBBBBBBB",
    "........BBBBBBBB",
    "........BBBB....",
    "........BBBB...."
  ],
  blob: [
    "................",
    "................",
    "................",
    "................",
    "............GGGG",
    "............GGGG",
    "..........GGGGGG",
    "..........GGGGGG",
    "........GGGGGGGG",
    "........GGGGGGGG",
    "GGGGGGGGGGGGGGGG",
    "GGGGGGGGGGGGGGGG",
    "GGGGGGGGGGGGGGGG",
    "GGGGGGGGGGGGGGGG",
    "GGGGGGGGGGGGGGGG",
    "GGGGGGGGGGGGGGGG",
    "GGGGGGGGGGGGGGGG",
    "GGGGGGGGGGGGGGGG",
    "........GGGGGGGG",
    "........GGGGGGGG",
    "..........GGGGGG",
    "..........GGGGGG",
    "............GGGG",
    "............GGGG",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................"
  ]
};

// Every id below also has PixelLab-generated art at assets/sprites/<id>.png
// (see CREATURE_ART_IDS/spriteSvg further down) which takes over rendering -
// SPRITES/TEMPLATES stay defined as the pre-PixelLab fallback for any
// monster/pet/mount id that isn't (yet) in CREATURE_ART_IDS.
//
// Overlay/rect coordinates below are all 2x the original hand-authored
// values (see the resolution note above TEMPLATES) - every row/col/w/h was
// mechanically doubled to match the new finer grid, so a mirrored overlay
// still lands in exactly the same relative spot it always did.
const SPRITES = {
  // --- Regular enemies ---
  slime: { template: 'blob', palette: { G:'#4caf7d' },
    overlays: [ { row:12, col:12, w:2, h:2, color:'#132015', mirror:true } ] },
  rat: { template: 'creature', palette: { E:'#8a8a8a', H:'#8a8a8a', F:'#1a1414', B:'#71706f', P:'#3d3a3a' },
    overlays: [ { row:8, col:14, w:4, h:2, color:'#d98a9c' } ] },
  goblin: { template: 'humanoid', palette: { R:'#2f4a22', H:'#7fae5a', F:'#160f00', A:'#5b4632', L:'#3f3226', B:'#241b14' } },
  wolf: { template: 'creature', palette: { E:'#6b7280', H:'#6b7280', F:'#e8c94a', B:'#565c68', P:'#333842' } },
  bandit: { template: 'humanoid', palette: { R:'#332018', H:'#d9a066', F:'#150e08', A:'#4a4038', L:'#332a24', B:'#1c1712' } },
  skeleton: { template: 'humanoid', palette: { R:'#e8e4d8', H:'#e8e4d8', F:'#c0392b', A:'#c9c4b3', L:'#a8a290', B:'#7d7867' } },
  cultist: { template: 'humanoid', palette: { R:'#3a1f4d', H:'#c9a888', F:'#7d2ae8', A:'#2a1638', L:'#1c0f26', B:'#120a18' } },
  spider: { template: 'creature', palette: { E:'#241b2e', H:'#241b2e', F:'#c0392b', B:'#1a1420', P:'#0f0b14' },
    overlays: [
      { row:18, col:4, w:2, h:4, color:'#1a1420', mirror:true },
      { row:8, col:4, w:2, h:2, color:'#c0392b', mirror:true }
    ] },
  zombie: { template: 'humanoid', palette: { R:'#3e4a2e', H:'#7c8f5a', F:'#c0392b', A:'#4a3c2a', L:'#332a1c', B:'#231c14' } },
  imp: { template: 'humanoid', palette: { R:'#8a1f1f', H:'#c0392b', F:'#0f0805', A:'#7a1f1f', L:'#5c1717', B:'#3d0f0f' },
    overlays: [ { row:0, col:10, w:2, h:2, color:'#2b0808', mirror:true }, { row:16, col:4, w:2, h:6, color:'#8a1f1f' } ] },
  harpy: { template: 'creature', palette: { E:'#a3947a', H:'#a3947a', F:'#1a1410', B:'#8a7a5e', P:'#5c4f3a' },
    overlays: [ { row:14, col:0, w:4, h:4, color:'#c9b892', mirror:true } ] },
  boar: { template: 'creature', palette: { E:'#6b4a2f', H:'#6b4a2f', F:'#0f0805', B:'#503620', P:'#33220f' },
    overlays: [ { row:10, col:4, w:2, h:2, color:'#f0e6d2', mirror:true } ] },

  // --- Elites ---
  ogre: { template: 'humanoid', palette: { R:'#4a3a2a', H:'#8a9c5e', F:'#1a1410', A:'#4a3c2a', L:'#332a1c', B:'#231c14' } },
  darkKnight: { template: 'humanoid', palette: { R:'#1a1a1f', H:'#8a7060', F:'#c0392b', A:'#26262e', L:'#1a1a20', B:'#0f0f14' } },
  witch: { template: 'humanoid', palette: { R:'#3a1f4d', H:'#c9a888', F:'#7d2ae8', A:'#4a2d63', L:'#331f44', B:'#1f1330' },
    overlays: [ { row:0, col:14, w:4, h:2, color:'#2a1638' } ] },
  minotaur: { template: 'humanoid', palette: { R:'#4a3222', H:'#6b4a2f', F:'#c0392b', A:'#3a2a1a', L:'#2a1f14', B:'#1a130c' },
    overlays: [ { row:2, col:2, w:2, h:2, color:'#e8dcc4', mirror:true } ] },
  vampire: { template: 'humanoid', palette: { R:'#1a1a1f', H:'#e8d8d0', F:'#c0392b', A:'#3a1020', L:'#26141a', B:'#180c10' },
    overlays: [ { row:14, col:10, w:2, h:2, color:'#e8e4d8', mirror:true } ] },

  // --- Bosses ---
  rotWarden: { template: 'humanoid', palette: { R:'#2f3a1f', H:'#5a6b3a', F:'#8fae4a', A:'#3a4526', L:'#262e18', B:'#181f10' } },
  banditKing: { template: 'humanoid', palette: { R:'#3a2418', H:'#d9a066', F:'#1a1410', A:'#6b1f1f', L:'#4a1515', B:'#2e0d0d' },
    overlays: [ { row:0, col:10, w:12, h:2, color:'#e8c94a' } ] },
  lich: { template: 'humanoid', palette: { R:'#1a1a24', H:'#d8d4c8', F:'#4ae8e0', A:'#26202e', L:'#1a1620', B:'#100d16' },
    overlays: [ { row:8, col:12, w:2, h:2, color:'#8ff5ef', mirror:true } ] },

  // --- Pets (see PETS in data.js) ---
  dragonWhelpling: { template: 'flyer', palette: { W:'#8a1f2a', H:'#c0392b', F:'#e8c94a', B:'#8a1f1f', E:'#e8c94a' } },
  direwolfPup: { template: 'creature', palette: { E:'#8a8f9c', H:'#8a8f9c', F:'#e8c94a', B:'#6b7280', P:'#4a505c' } },
  pseudodragon: { template: 'flyer', palette: { W:'#5a3a7a', H:'#8a5fd6', F:'#e8c94a', B:'#4a2f66', E:'#c9a8ff' } },
  impFamiliar: { template: 'humanoid', palette: { R:'#5c2a7a', H:'#a85fd6', F:'#0f0805', A:'#4a2166', L:'#331744', B:'#1f0d2b' },
    overlays: [ { row:0, col:10, w:2, h:2, color:'#2b0838', mirror:true } ] },
  moonkinHatchling: { template: 'creature', palette: { E:'#8a6b3a', H:'#8a6b3a', F:'#e8c94a', B:'#5c4623', P:'#3a2c16' },
    overlays: [ { row:0, col:12, w:2, h:2, color:'#e8c94a', mirror:true } ] },
  mechanicalSquirrel: { template: 'creature', palette: { E:'#b0b8c4', H:'#b0b8c4', F:'#4ae8e0', B:'#7a828e', P:'#565c68' },
    overlays: [ { row:0, col:12, w:2, h:2, color:'#4ae8e0', mirror:true } ] },
  owlFamiliar: { template: 'flyer', palette: { W:'#5c4530', H:'#8a7050', F:'#e8c94a', B:'#4a3624', E:'#c9b892' },
    overlays: [ { row:8, col:14, w:4, h:2, color:'#e8a94a' } ] },
  pixieSprite: { template: 'flyer', palette: { W:'#e87dc9', H:'#8adbe8', F:'#ffffff', B:'#5ab0c9', E:'#f5e8ff' },
    overlays: [ { row:2, col:14, w:4, h:2, color:'#ffffff' } ] },
  // Three support-role pets (see COMPANION_ROLE_GLOW/resolveCompanionAttacks
  // in combat.js) - Tank, DPS, Healer.
  ironshellTortle: { template: 'creature', palette: { E:'#4a6b3a', H:'#7a8a72', F:'#c9d4b8', B:'#5c6b52', P:'#8a5a2e' } },
  direhornRaptor: { template: 'creature', palette: { E:'#8a2a1f', H:'#c9502e', F:'#e8c94a', B:'#6b1f14', P:'#3a1008' } },
  faerieDragonling: { template: 'flyer', palette: { W:'#e87dc9', H:'#7de8c9', F:'#e8c94a', B:'#5ab0c9', E:'#ffd9f5' },
    overlays: [ { row:2, col:14, w:4, h:2, color:'#e8c94a' } ] },

  // --- Mounts (see MOUNTS in data.js) ---
  netherdrake: { template: 'flyer', palette: { W:'#3a7a2a', H:'#5fae3a', F:'#e8f5a0', B:'#2a5c1e', E:'#a0e85a' },
    overlays: [ { row:2, col:14, w:4, h:2, color:'#e8f5a0' } ] },
  griffonMount: { template: 'flyer', palette: { W:'#8a6b3a', H:'#c9a866', F:'#1a1410', B:'#7a5f38', E:'#e8dcc4' },
    overlays: [ { row:6, col:14, w:4, h:2, color:'#e8c94a' } ] },
  frostwolfMount: { template: 'creature', palette: { E:'#c9d6e8', H:'#c9d6e8', F:'#4ae8e0', B:'#8a9cb0', P:'#5a6c80' } },
  warKodo: { template: 'creature', palette: { E:'#6b4a2f', H:'#6b4a2f', F:'#1a1410', B:'#4a3220', P:'#2a1c12' },
    overlays: [ { row:10, col:2, w:2, h:2, color:'#e8e4d8', mirror:true } ] },
  hippogriffMount: { template: 'flyer', palette: { W:'#6b5a4a', H:'#a8927a', F:'#1a1410', B:'#5c4a3a', E:'#d9c9a8' } },
  nightmareSteed: { template: 'creature', palette: { E:'#1a1414', H:'#1a1414', F:'#e8722a', B:'#0f0c0c', P:'#050404' } },
  unicornMount: { template: 'creature', palette: { E:'#f0ecff', H:'#f0ecff', F:'#7d2ae8', B:'#d8cff0', P:'#b8a8e0' },
    overlays: [ { row:0, col:14, w:4, h:2, color:'#e8c94a' } ] },
  spectralTiger: { template: 'creature', palette: { E:'#8fd9e8', H:'#8fd9e8', F:'#e8f5ff', B:'#5ab0c9', P:'#3a7a8f' },
    overlays: [
      { row:10, col:6, w:2, h:2, color:'#2a5560', mirror:true },
      { row:14, col:4, w:2, h:2, color:'#2a5560', mirror:true }
    ] }
};

// ============================================================================
// Shared compositor: outlines + directional shading.
// Reference art (painted RPG asset packs) reads as much higher-quality than
// flat color blocks mainly because of two cheap, purely algorithmic tricks:
// a dark outline around the silhouette, and light/shadow banding across round
// forms. Both are derived automatically from the same grid data below - no
// extra hand-authoring needed per sprite.
// ============================================================================

const OUTLINE_COLOR = '#15100c';

function shadeColor(hex, percent) {
  const num = parseInt(hex.slice(1), 16);
  let r = (num >> 16) & 0xff, g = (num >> 8) & 0xff, b = num & 0xff;
  const target = percent < 0 ? 0 : 255;
  const t = Math.min(1, Math.abs(percent) / 100);
  r = Math.round(r + (target - r) * t);
  g = Math.round(g + (target - g) * t);
  b = Math.round(b + (target - b) * t);
  return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
}

// Cheap front-lighting: columns near the sprite's center read as lit, columns
// near the outer edge fall into shadow - gives flat rectangles a sense of
// rounded volume, matching how pixel artists shade cylindrical limbs/torsos.
function shadeForColumn(hex, col, width) {
  const dist = Math.abs(col + 0.5 - width / 2) / (width / 2);
  if (dist > 0.55) return shadeColor(hex, -16);
  if (dist < 0.22) return shadeColor(hex, 14);
  return hex;
}

function rowRunsToRects(colorRow, rowIndex) {
  let rects = '';
  let c = 0;
  while (c < colorRow.length) {
    if (!colorRow[c]) { c++; continue; }
    const color = colorRow[c];
    const start = c;
    while (c < colorRow.length && colorRow[c] === color) c++;
    rects += `<rect x="${start}" y="${rowIndex}" width="${c - start}" height="1" fill="${color}"/>`;
  }
  return rects;
}

// gridLayers: [{ rows: half-width mirrored char grid, palette, group }] -
// painted in order, later layers overdraw earlier ones at the same cell.
// rectLayers: [{ parts: [{ row, col, w, h, color }], group }] - absolute
// (non-mirrored) blocks, e.g. a held weapon or a monster's overlay accent.
// `group` ('body' by default, or 'weapon') decides which of the two output
// <g> elements a cell lands in, so CSS can target just the weapon (e.g. for
// a legendary glow) without touching the rest of the character.
// displayWidth/displayHeight are explicit output pixel dimensions - callers
// compute them (see spriteSvg vs renderCharacterSprite below), since the two
// use different sizing conventions and shouldn't affect each other.
function buildCompositeSVG(gridLayers, rectLayers, width, height, displayWidth, displayHeight, outlineColor, weaponExtraClass) {
  const colorAt = Array.from({ length: height }, () => new Array(width).fill(null));
  const groupAt = Array.from({ length: height }, () => new Array(width).fill(null));

  gridLayers.forEach(layer => {
    const group = layer.group || 'body';
    const halfW = layer.rows[0].length;
    for (let r = 0; r < layer.rows.length && r < height; r++) {
      for (let c = 0; c < halfW; c++) {
        const base = layer.palette[layer.rows[r][c]];
        if (!base) continue;
        const mirrored = width - 1 - c;
        colorAt[r][c] = shadeForColumn(base, c, width);
        groupAt[r][c] = group;
        colorAt[r][mirrored] = shadeForColumn(base, mirrored, width);
        groupAt[r][mirrored] = group;
      }
    }
  });

  (rectLayers || []).forEach(layerDef => {
    const group = layerDef.group || 'body';
    (layerDef.parts || []).forEach(p => {
      for (let r = p.row; r < p.row + p.h; r++) {
        for (let c = p.col; c < p.col + p.w; c++) {
          if (r < 0 || r >= height || c < 0 || c >= width || !p.color) continue;
          colorAt[r][c] = shadeForColumn(p.color, c, width);
          groupAt[r][c] = group;
        }
      }
    });
  });

  // Outline pass: any empty cell bordering a filled one gets an outline pixel,
  // drawn first so the real fills (painted after) sit on top of it. The
  // outline pixel is assigned to whichever group's cell caused it - 'weapon'
  // wins on a tie, so the weapon's edge is never swallowed into the body group.
  const outlineGroupAt = Array.from({ length: height }, () => new Array(width).fill(null));
  for (let r = 0; r < height; r++) {
    for (let c = 0; c < width; c++) {
      if (!colorAt[r][c]) continue;
      [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]].forEach(([nr, nc]) => {
        if (nr < 0 || nr >= height || nc < 0 || nc >= width) return;
        if (!colorAt[nr][nc] && outlineGroupAt[nr][nc] !== 'weapon') outlineGroupAt[nr][nc] = groupAt[r][c];
      });
    }
  }

  function renderGroup(group) {
    let rects = '';
    for (let r = 0; r < height; r++) rects += rowRunsToRects(outlineGroupAt[r].map(g => g === group ? outlineColor : null), r);
    for (let r = 0; r < height; r++) rects += rowRunsToRects(colorAt[r].map((color, c) => groupAt[r][c] === group ? color : null), r);
    return rects;
  }

  const bodyRects = renderGroup('body');
  const weaponRects = renderGroup('weapon');
  const weaponClass = `sprite-weapon-layer${weaponExtraClass ? ' ' + weaponExtraClass : ''}`;

  return `<svg viewBox="0 0 ${width} ${height}" width="${displayWidth}" height="${displayHeight}" shape-rendering="crispEdges" style="image-rendering:pixelated"><g class="sprite-body-layer">${bodyRects}</g><g class="${weaponClass}">${weaponRects}</g></svg>`;
}

// sizePx here means WIDTH (unchanged, existing convention) - monster
// templates aren't affected by the wider class canvas above.
// Monster/pet/mount ids with PixelLab-generated art (all square canvases,
// generated at assets/sprites/<id>.png - see the session's art-migration
// pass). Anything not listed here still falls back to the procedural
// SPRITES/TEMPLATES compositor below, e.g. a newly-added monster before its
// art is generated.
const CREATURE_ART_IDS = new Set([
  'slime', 'rat', 'goblin', 'wolf', 'bandit', 'skeleton', 'cultist', 'spider', 'zombie', 'imp', 'harpy', 'boar',
  'ogre', 'darkKnight', 'witch', 'minotaur', 'vampire',
  'rotWarden', 'banditKing', 'lich',
  'dragonWhelpling', 'direwolfPup', 'pseudodragon', 'impFamiliar', 'moonkinHatchling', 'mechanicalSquirrel',
  'owlFamiliar', 'pixieSprite', 'ironshellTortle', 'direhornRaptor', 'faerieDragonling',
  'netherdrake', 'griffonMount', 'frostwolfMount', 'warKodo', 'hippogriffMount', 'nightmareSteed',
  'unicornMount', 'spectralTiger',
  'emberTabby', 'shadowPouncer', 'luckyCalico', 'starlitKitten', 'witchlightKitten',
  'ryker', 'landryDuckling', 'monkey', 'chopper', 'izzoCorvette', 'robin',
  // World Event rewards (see WORLD_EVENTS in data.js) - added after the
  // initial batch above, same PixelLab treatment.
  'witherbarkSprite', 'cinderWhelp', 'emeraldSapling', 'frostwyrmling',
  'murkfenDireleech', 'felstrider', 'starlitHawkstrider', 'shadowmaneCharger', 'voidstrider'
]);

// Full PixelLab character treatment (create_character v3 + a text-guided
// animate_character attack) for dungeon/raid FINAL bosses only - unlike
// CREATURE_ART_IDS's single static image, each entry here also has a
// multi-frame attack animation that plays during its turn in combat (see
// playBossAttackAnimation in main.js). Keyed by the dungeon/raid's own id
// (DUNGEONS/RAID_BOSSES in data.js), not a separate boss-name id, since
// that's what Combat renders enemy portraits by (s.enemy.id).
function _bossArt(id, name) {
  return [id, {
    name,
    idle: `assets/sprites/bosses/${id}_idle.png`,
    attackFrames: [0, 1, 2, 3, 4, 5, 6, 7, 8].map(i => `assets/sprites/bosses/${id}_attack_${i}.png`)
  }];
}
const BOSS_ART = Object.fromEntries([
  _bossArt('icecrownCitadel', 'Vaelkorath, the Hollow King'),
  _bossArt('deadmines', 'Captain Blacktide Vane'),
  _bossArt('shadowfangKeep', 'Alaric the Wolflord'),
  _bossArt('razorfenDowns', 'Warboar Chief Tuskram'),
  _bossArt('blackfathomDeeps', 'Naga Highpriestess Coraleth'),
  _bossArt('scarletMonastery', 'Inquisitor Vayle'),
  _bossArt('direMaul', 'King Grimtusk the Bloated'),
  _bossArt('zulFarrak', 'Sandshaper Zurga'),
  _bossArt('maraudon', "Vortexlord Thal'kesh"),
  _bossArt('moltenCore', 'Cindermaw, the Molten Titan'),
  _bossArt('blackwingLair', 'Nightscale, the Black Wyrm'),
  _bossArt('naxxramas', 'The Plaguebound Countess'),
  _bossArt('karazhan', 'Maestro Nightwhisper'),
  _bossArt('blackTemple', "Xal'gorath the Betrayer"),
  _bossArt('scholomance', 'Archlich Mordrenna'),
  _bossArt('cullingOfStratholme', 'Deathlord Ashgrave'),
  _bossArt('sunwellPlateau', 'Radiant Malvexis'),
  _bossArt('ulduar', 'The Forgewarden Prime'),
  _bossArt('burningThrone', "Xoth'rath, the Void King"),
  _bossArt('ahnQiraj', "Queen Anub'khepra"),
  // Jakesteel isn't a dungeon/raid boss - he's the signature duel encounter
  // (see enterJakesteelEncounter in main.js) - but reuses this exact same
  // registry since combat's attack-animation trigger and anyCharacterSvg's
  // BOSS_ART lookup both key off it identically either way.
  _bossArt('jakesteel', 'Jakesteel')
]);

// Player weapon-swing / spell-cast animations - same PixelLab treatment as
// BOSS_ART, keyed by `${classId}_${weaponVisual}` for a basic Attack (see
// currentWeaponVisual in progression.js) or `${classId}_cast` for a 'flat'
// -type magic spell (see isPlayerSpellCast in main.js). First wave covers
// only the three starter classes (warrior/rogue/mage) - a class or weapon
// with no entry here just keeps the plain CSS swing/glow it always had.
function _weaponAttackAnim(key) {
  return [key, {
    attackFrames: [0, 1, 2, 3, 4, 5, 6, 7].map(i => `assets/sprites/classes/anim/${key}_attack_${i}.png`)
  }];
}
const WEAPON_ATTACK_ANIM = Object.fromEntries([
  'warrior_axe', 'warrior_bow', 'warrior_dagger', 'warrior_mace', 'warrior_sword',
  'rogue_bow', 'rogue_dagger', 'rogue_mace', 'rogue_sword',
  'mage_dagger', 'mage_mace', 'mage_staff', 'mage_sword', 'mage_cast',
  // Wave 2 - the remaining 6 unlockable classes, completing every class's
  // weapon-swing coverage. None of their own default spells are 'flat'-type
  // (see SPELLS in data.js), so none need a dedicated _cast entry - a
  // flat-type spell bought from the Bank Shop for one of these classes just
  // falls back to the weapon-swing animation, same as any uncovered key.
  'paladin_axe', 'paladin_dagger', 'paladin_mace', 'paladin_sword',
  'hunter_axe', 'hunter_bow', 'hunter_dagger', 'hunter_mace', 'hunter_staff', 'hunter_sword',
  'warlock_dagger', 'warlock_mace', 'warlock_staff', 'warlock_sword',
  'barbarian_axe', 'barbarian_bow', 'barbarian_dagger', 'barbarian_mace', 'barbarian_staff', 'barbarian_sword',
  'cleric_axe', 'cleric_dagger', 'cleric_mace', 'cleric_sword',
  'bard_bow', 'bard_lute', 'bard_mace', 'bard_sword'
].map(_weaponAttackAnim));

// World Event scene art (see WORLD_EVENTS in data.js, keyed by each event's
// own `artKey`) - a wide illustration plus a subtle ambient animation loop
// (see playLoopingAnimation in main.js), same PixelLab pipeline as
// BOSS_ART but for a scene rather than a character portrait. Each zone has
// 3 events: the first uses the bare zone id (pre-existing art), the other
// two use `<zoneId>_2` / `<zoneId>_3`.
function _worldEventArt(artKey) {
  return [artKey, {
    idle: `assets/sprites/events/${artKey}_idle.png`,
    frames: [0, 1, 2, 3, 4, 5].map(i => `assets/sprites/events/${artKey}_anim_${i}.png`)
  }];
}
const WORLD_EVENT_ART = Object.fromEntries([
  'forest', 'forest_2', 'forest_3',
  'swamp', 'swamp_2', 'swamp_3',
  'desert', 'desert_2', 'desert_3',
  'hellfire', 'hellfire_2', 'hellfire_3',
  'emerald', 'emerald_2', 'emerald_3',
  'silvermoon', 'silvermoon_2', 'silvermoon_3',
  'blacktemple', 'blacktemple_2', 'blacktemple_3',
  'northrend', 'northrend_2', 'northrend_3',
  'nether', 'nether_2', 'nether_3'
].map(_worldEventArt));

// Attack animations for every pet/mount with real PixelLab art (CREATURE_ART_IDS
// above) - same treatment as BOSS_ART/WEAPON_ATTACK_ANIM, triggered whenever
// the player's own equipped pet/mount lands a hit (see
// Combat.resolveCompanionAttacks and the trigger in renderCombatScreen, main.js).
function _companionAttackAnim(id) {
  return [id, {
    attackFrames: [0, 1, 2, 3, 4, 5, 6, 7].map(i => `assets/sprites/anim/${id}_attack_${i}.png`)
  }];
}
const PET_MOUNT_ATTACK_ANIM = Object.fromEntries([
  'dragonWhelpling', 'direwolfPup', 'pseudodragon', 'impFamiliar', 'moonkinHatchling', 'mechanicalSquirrel',
  'owlFamiliar', 'pixieSprite', 'ironshellTortle', 'direhornRaptor', 'faerieDragonling',
  'netherdrake', 'griffonMount', 'frostwolfMount', 'warKodo', 'hippogriffMount', 'nightmareSteed',
  'unicornMount', 'spectralTiger',
  'emberTabby', 'shadowPouncer', 'luckyCalico', 'starlitKitten', 'witchlightKitten',
  'ryker', 'landryDuckling', 'monkey', 'chopper', 'izzoCorvette', 'robin',
  // World Event rewards - added after the initial batch above.
  'witherbarkSprite', 'cinderWhelp', 'emeraldSapling', 'frostwyrmling',
  'murkfenDireleech', 'felstrider', 'starlitHawkstrider', 'shadowmaneCharger', 'voidstrider'
].map(_companionAttackAnim));

// Attack animations for every regular/elite/act-boss monster (ENEMIES/
// ELITES/BOSSES in data.js - NOT the 19 dungeon/raid final bosses, which
// have their own richer BOSS_ART treatment above) - same 8-frame reuse of
// _companionAttackAnim's helper and download convention, triggered on the
// enemy's turn via the .creature-portrait-sprite class (see spriteSvg
// above) whenever the enemy id has an entry here.
const MONSTER_ATTACK_ANIM = Object.fromEntries([
  'slime', 'rat', 'goblin', 'wolf', 'bandit', 'skeleton', 'cultist', 'spider', 'zombie', 'imp', 'harpy', 'boar',
  'ogre', 'darkKnight', 'witch', 'minotaur', 'vampire',
  'rotWarden', 'banditKing', 'lich'
].map(_companionAttackAnim));

// The boss's idle portrait - anyCharacterSvg (progression.js) checks BOSS_ART
// before falling through to spriteSvg, so this is what shows outside of the
// brief attack-animation window.
function bossSpriteSvg(id, sizePx) {
  const art = BOSS_ART[id];
  if (!art) return null;
  return `<img class="boss-portrait-sprite" src="${art.idle}" width="${sizePx}" height="${sizePx}" style="image-rendering:pixelated" alt="${art.name}">`;
}

function spriteSvg(id, sizePx) {
  if (CREATURE_ART_IDS.has(id)) {
    // creature-portrait-sprite: lets the combat screen's attack-animation
    // trigger (see MONSTER_ATTACK_ANIM below and renderCombatScreen in
    // main.js) find and swap this exact <img> during an enemy's attack -
    // harmless for a pet/mount, which is instead found via its own
    // .companion-<kind> img parent selector.
    return `<img class="creature-portrait-sprite" src="assets/sprites/${id}.png" width="${sizePx}" height="${sizePx}" style="image-rendering:pixelated" alt="${id}">`;
  }
  const def = SPRITES[id];
  if (!def) return '';
  const rows = TEMPLATES[def.template];
  const halfW = rows[0].length;
  const w = halfW * 2;
  const h = rows.length;

  const overlayParts = (def.overlays || []).map(o => {
    const ow = o.w || 1, oh = o.h || 1;
    return { row: o.row, col: o.col, w: ow, h: oh, color: o.color };
  });
  const mirroredOverlayParts = (def.overlays || []).filter(o => o.mirror).map(o => {
    const ow = o.w || 1, oh = o.h || 1;
    return { row: o.row, col: w - o.col - ow, w: ow, h: oh, color: o.color };
  });

  const displayHeight = Math.round(sizePx * h / w);
  return buildCompositeSVG(
    [{ rows, palette: def.palette }],
    [{ parts: overlayParts.concat(mirroredOverlayParts) }],
    w, h, sizePx, displayHeight, OUTLINE_COLOR
  );
}

// ============================================================================
// Playable-class sprites: a higher-resolution, LAYERED human character system.
// Three layers share one 20x22 grid so they composite directly on top of each
// other: BODY (head/hair - never changes), ARMOR (torso/legs/boots - changes
// with equipped armor, or falls back to the class's default WoW-style look),
// and WEAPON (held item - same fallback rule). This is what lets gear visibly
// change the character instead of just being a stat number.
// ============================================================================

// Canvas is padded 3 extra columns wider on each side (13-wide half instead
// of 10) purely to give the WEAPON layer more room to the right of the body -
// see WEAPON_SHAPES below. The body/armor silhouettes themselves are
// unchanged, just shifted inward by that same padding (every row below is the
// old row with "..." prepended) so they still read as flush-to-seam.
// Doubled from the original 26x22 canvas (13-wide half x 22 rows) to 52x44 -
// see the resolution note above TEMPLATES for the same 2x-then-hand-refine
// approach. WEAPON_SHAPES below is doubled the same way.
const SPRITE_W = 52;
const SPRITE_HALF = 26;
const SPRITE_H = 44;

// BODY: head/hair/face. Always visible, never affected by equipment. Rows
// 14-43 are intentionally blank so the ARMOR layer (drawn on top) shows through.
const HEAD_SHAPE = [
  '..............rrrrrrrrrrrr', // 0  hair top - reaches the seam so it's one head, not two
  '..............rrrrrrrrrrrr', // 1
  '............rrrrrrrrrrrrrr', // 2  hair sides
  '............rrrrrrrrrrrrrr', // 3
  '............rrrrhhhhhhhhhh', // 4  hairline / face
  '............rrrrhhhhhhhhhh', // 5
  '............rrhhhhhheehhhh', // 6  face + eye (eye away from the seam so its mirror twin isn't touching it)
  '............rrhhhhhheehhhh', // 7
  '............hhhhhhhhhhhhhh', // 8  face
  '............hhhhhhhhhhhhhh', // 9
  '..............hhhhhhhhhhhh', // 10 jaw
  '..............hhhhhhhhhhhh', // 11
  '..................nnnnnnnn', // 12 neck
  '..................nnnnnnnn', // 13
  '..........................', '..........................', '..........................', '..........................',
  '..........................', '..........................', '..........................', '..........................',
  '..........................', '..........................', '..........................', '..........................',
  '..........................', '..........................', '..........................', '..........................',
  '..........................', '..........................', '..........................', '..........................',
  '..........................', '..........................', '..........................', '..........................',
  '..........................', '..........................', '..........................', '..........................',
  '..........................', '..........................'
];

// ARMOR shapes. "armor" = martial silhouette (shoulder flare, split legs,
// boots) used by plate/mail/leather/hide. "robe" = flowing caster silhouette
// (no leg split, wide hem) used by cloth/dark-robe. Both share identical
// shoulder/torso/waist rows so the two read as the same body underneath.
// T = rarity trim (collar + chest emblem - both light up together on rare+
// gear), W = belt/sash accent (a third distinct color band for definition,
// also brightened on rare+ gear).
const ARMOR_SHAPES = {
  armor: [
    '..........................', '..........................', '..........................', '..........................',
    '..........................', '..........................', '..........................', '..........................',
    '..........................', '..........................',
    '................TTTTTTTTTT', // 10 collar
    '................TTTTTTTTTT', // 11
    '............TTAAAAAAAAAAAA', // 12 shoulder flare + pauldron cap at the tip
    '............TTAAAAAAAAAAAA', // 13
    '..............AAAAAAAAAAAA', // 14 torso
    '..............AAAAAAAAAAAA', // 15
    '..............AAAAAAAAAATT', // 16 torso + chest emblem
    '..............AAAAAAAAAATT', // 17
    '..............AAAAAAAAAAAA', // 18 torso
    '..............AAAAAAAAAAAA', // 19
    '..............WWWWWWWWWWWW', // 20 belt
    '..............WWWWWWWWWWWW', // 21
    '................AAAAAAAAAA', // 22 waist
    '................AAAAAAAAAA', // 23
    '................AAAAAAAAAA', // 24 waist taper
    '................AAAAAAAAAA', // 25
    '..................LLLLLL..', // 26 legs split
    '..................LLLLLL..', // 27
    '..................LLLLLL..', // 28
    '..................LLLLLL..', // 29
    '..................LLLLLL..', // 30
    '..................LLLLLL..', // 31
    '..................LLLLLL..', // 32
    '..................LLLLLL..', // 33
    '..................LLLLLL..', // 34
    '..................LLLLLL..', // 35
    '..................LLLLLL..', // 36
    '..................LLLLLL..', // 37
    '..................LLLLLL..', // 38
    '..................LLLLLL..', // 39
    '..................BBBBBB..', // 40 boots
    '..................BBBBBB..', // 41
    '..................BBBBBB..', // 42
    '..................BBBBBB..'  // 43
  ],
  robe: [
    '..........................', '..........................', '..........................', '..........................',
    '..........................', '..........................', '..........................', '..........................',
    '..........................', '..........................',
    '................TTTTTTTTTT', // 10 collar
    '................TTTTTTTTTT', // 11
    '............TTAAAAAAAAAAAA', // 12 shoulder flare + pauldron cap
    '............TTAAAAAAAAAAAA', // 13
    '..............AAAAAAAAAAAA', // 14 torso
    '..............AAAAAAAAAAAA', // 15
    '..............AAAAAAAAAATT', // 16 torso + chest emblem
    '..............AAAAAAAAAATT', // 17
    '..............AAAAAAAAAAAA', // 18 torso
    '..............AAAAAAAAAAAA', // 19
    '..............WWWWWWWWWWWW', // 20 sash
    '..............WWWWWWWWWWWW', // 21
    '................AAAAAAAAAA', // 22 waist
    '................AAAAAAAAAA', // 23
    '................AAAAAAAAAA', // 24 waist
    '................AAAAAAAAAA', // 25
    '..............LLLLLLLLLLLL', // 26 robe body (no leg split - full width)
    '..............LLLLLLLLLLLL', // 27
    '..............LLLLLLLLLLLL', // 28
    '..............LLLLLLLLLLLL', // 29
    '..............LLLLLLLLLLLL', // 30
    '..............LLLLLLLLLLLL', // 31
    '..............LLLLLLLLLLLL', // 32
    '..............LLLLLLLLLLLL', // 33
    '..............LLLLLLLLLLLL', // 34
    '..............LLLLLLLLLLLL', // 35
    '............LLLLLLLLLLLLLL', // 36 hem flare
    '............LLLLLLLLLLLLLL', // 37
    '............BBBBBBBBBBBBBB', // 38 hem trim
    '............BBBBBBBBBBBBBB', // 39
    '............BBBBBBBBBBBBBB', // 40
    '............BBBBBBBBBBBBBB', // 41
    '............BBBBBBBBBBBBBB', // 42
    '............BBBBBBBBBBBBBB'  // 43
  ]
};

// WEAPON shapes: small held-item graphics using ABSOLUTE (non-mirrored) full-
// width coordinates, positioned just outside the armor silhouette on one side
// (like a weapon held out from the body). `key` looks up a color in the
// weapon's palette; ACCENT_KEY says which part gets tinted by rarity.
// The body's silhouette now ends around col 18 (see ARMOR_SHAPES above), so
// weapons have a clear 7-column margin (19-25) to work with - each shape
// below is sized to use that room fully rather than being squeezed into it.
const WEAPON_SHAPES = {
  sword: [
    { row:10, col:44, w:4, h:2, key:'blade' },  // tapered tip
    { row:12, col:42, w:6, h:10, key:'blade' }, // blade
    { row:22, col:38, w:14, h:2, key:'guard' }, // full-width crossguard
    { row:24, col:42, w:6, h:4, key:'hilt' },   // grip
    { row:28, col:42, w:6, h:2, key:'guard' }   // pommel cap
  ],
  dagger: [
    { row:16, col:44, w:4, h:2, key:'blade' },
    { row:18, col:42, w:6, h:6, key:'blade' },
    { row:22, col:40, w:10, h:2, key:'hilt' },  // small guard
    { row:24, col:42, w:6, h:2, key:'hilt' }
  ],
  axe: [
    { row:14, col:40, w:8, h:4, key:'blade' },  // upper curve of the axe-head
    { row:18, col:38, w:12, h:4, key:'blade' }, // wide cutting edge
    { row:22, col:44, w:4, h:12, key:'handle' },
    { row:34, col:44, w:4, h:2, key:'blade' }   // butt spike
  ],
  staff: [
    { row:8, col:42, w:6, h:4, key:'orb' },     // bigger orb
    { row:12, col:44, w:4, h:18, key:'handle' },
    { row:20, col:40, w:10, h:2, key:'orb' },   // banding mid-shaft
    { row:30, col:44, w:4, h:2, key:'orb' }     // butt cap
  ],
  bow: [
    { row:10, col:50, w:2, h:4, key:'wood' },
    { row:14, col:46, w:2, h:4, key:'wood' },
    { row:18, col:42, w:2, h:6, key:'wood' },   // widest point of the curve
    { row:18, col:44, w:4, h:2, key:'wood' },   // grip
    { row:24, col:46, w:2, h:4, key:'wood' },
    { row:28, col:50, w:2, h:4, key:'wood' }
  ],
  mace: [
    { row:12, col:44, w:4, h:2, key:'head' },   // top spike
    { row:14, col:40, w:10, h:6, key:'head' },  // flanged head
    { row:20, col:44, w:4, h:2, key:'head' },   // neck taper
    { row:22, col:44, w:4, h:10, key:'handle' }
  ],
  lute: [
    { row:8, col:44, w:4, h:2, key:'neck' },    // tuning pegs
    { row:10, col:44, w:4, h:8, key:'neck' },
    { row:18, col:42, w:6, h:4, key:'body' },   // upper body
    { row:22, col:38, w:10, h:6, key:'body' }   // lower, rounder body
  ]
};
const WEAPON_ACCENT_KEY = { sword: 'blade', dagger: 'blade', axe: 'blade', staff: 'orb', bow: 'wood', mace: 'head', lute: 'body' };

// Default palettes for gear rendered generically (e.g. shown as bank-shop
// preview icons rather than on a specific class's model).
// Which of the two silhouettes (ARMOR_SHAPES keys) each armor style uses.
const ARMOR_STYLE_SHAPE = { cloth: 'robe', leather: 'armor', mail: 'armor', plate: 'armor' };

const ARMOR_STYLE_PALETTES = {
  cloth: { A: '#c9c4b3', L: '#c9c4b3', B: '#8a8577', T: '#c9c4b3', W: '#8a5a2e' },
  leather: { A: '#5c4530', L: '#5c4530', B: '#3d2f1f', T: '#5c4530', W: '#9aa3b2' },
  mail: { A: '#5a6472', L: '#5a6472', B: '#3a4048', T: '#5a6472', W: '#8a5a2e' },
  plate: { A: '#9aa3b2', L: '#9aa3b2', B: '#5a6068', T: '#9aa3b2', W: '#8a5a2e' }
};
const WEAPON_STYLE_PALETTES = {
  sword: { blade: '#c7ccd1', guard: '#5a5f68', hilt: '#6b4a2f' },
  dagger: { blade: '#c7ccd1', hilt: '#3d2f1f' },
  axe: { blade: '#c7ccd1', handle: '#6b4a2f' },
  staff: { handle: '#6b4a2f', orb: '#9d6fe8' },
  bow: { wood: '#8a5a2e' },
  mace: { handle: '#6b4a2f', head: '#c7ccd1' },
  lute: { body: '#6b4a2f', neck: '#4a3320' }
};

// Per-class default look (used whenever nothing is equipped in that slot) -
// human, WoW-class-flavored: hair/eye color plus a default armor+weapon style.
const CLASS_LOOKS = {
  warrior: { head: { r:'#5c4530', h:'#e8b98a', e:'#20160e', n:'#e0ab7d' }, armorShape:'armor', armorPalette:{ A:'#8a929c', L:'#8a929c', B:'#3d4148', T:'#8a929c', W:'#8a5a2e' }, weaponStyle:'sword', weaponPalette:{ blade:'#c7ccd1', guard:'#5a5f68', hilt:'#6b4a2f' } },
  rogue: { head: { r:'#1a1a1f', h:'#dba876', e:'#20160e', n:'#d19d6e' }, armorShape:'armor', armorPalette:{ A:'#332538', L:'#332538', B:'#1c1520', T:'#332538', W:'#9aa3b2' }, weaponStyle:'dagger', weaponPalette:{ blade:'#c7ccd1', hilt:'#2a1f30' } },
  mage: { head: { r:'#c9c4d9', h:'#e8b98a', e:'#2a3a6a', n:'#e0ab7d' }, armorShape:'robe', armorPalette:{ A:'#2f4f9c', L:'#2f4f9c', B:'#1c3162', T:'#2f4f9c', W:'#8a5a2e' }, weaponStyle:'staff', weaponPalette:{ handle:'#6b4a2f', orb:'#9d6fe8' } },
  paladin: { head: { r:'#d9c060', h:'#e8b98a', e:'#20160e', n:'#e0ab7d' }, armorShape:'armor', armorPalette:{ A:'#d9c88a', L:'#d9c88a', B:'#a88f4a', T:'#d9c88a', W:'#6b1f1f' }, weaponStyle:'mace', weaponPalette:{ handle:'#6b4a2f', head:'#e8c94a' } },
  hunter: { head: { r:'#3a5c2e', h:'#c9a888', e:'#20160e', n:'#bd9b7c' }, armorShape:'armor', armorPalette:{ A:'#4a6b3a', L:'#4a6b3a', B:'#2e4324', T:'#4a6b3a', W:'#8a5a2e' }, weaponStyle:'bow', weaponPalette:{ wood:'#8a5a2e' } },
  warlock: { head: { r:'#1a1a1f', h:'#a888a0', e:'#7d2ae8', n:'#9c7c94' }, armorShape:'robe', armorPalette:{ A:'#3a1a4a', L:'#3a1a4a', B:'#22102c', T:'#3a1a4a', W:'#7d2ae8' }, weaponStyle:'staff', weaponPalette:{ handle:'#3a1a4a', orb:'#c23df5' } },
  barbarian: { head: { r:'#c9502e', h:'#c9906b', e:'#20160e', n:'#bd8560' }, armorShape:'armor', armorPalette:{ A:'#8a4a2a', L:'#8a4a2a', B:'#5c3218', T:'#8a4a2a', W:'#e8dcc4' }, weaponStyle:'axe', weaponPalette:{ blade:'#c7ccd1', handle:'#6b4a2f' } },
  cleric: { head: { r:'#e8e4d8', h:'#e8b98a', e:'#20160e', n:'#e0ab7d' }, armorShape:'robe', armorPalette:{ A:'#d9d4c3', L:'#d9d4c3', B:'#a8a290', T:'#d9d4c3', W:'#e8c94a' }, weaponStyle:'mace', weaponPalette:{ handle:'#6b4a2f', head:'#e8e4d8' } },
  bard: { head: { r:'#a83d8a', h:'#e0ab7d', e:'#20160e', n:'#d19d6e' }, armorShape:'armor', armorPalette:{ A:'#8a2a5c', L:'#8a2a5c', B:'#5c1c3d', T:'#8a2a5c', W:'#e8c94a' }, weaponStyle:'lute', weaponPalette:{ body:'#6b4a2f', neck:'#4a3320' } }
};

// accentKeys: a single palette key or an array of them - all get swapped to
// the rarity's color (common gear stays unmodified).
function tintedPalette(basePalette, accentKeys, rarity) {
  if (!rarity || rarity === 'common' || !accentKeys) return basePalette;
  const keys = Array.isArray(accentKeys) ? accentKeys : [accentKeys];
  const next = { ...basePalette };
  keys.forEach(k => { next[k] = RARITIES[rarity].color; });
  return next;
}

// A legendary WEAPON gets a pulsing glow (scoped to just its <g>, via the
// 'legendary-weapon-glow' class already on that group - see
// renderCharacterSprite) plus a couple of twinkling sparkles positioned near
// where weapons sit in the sprite (upper-right). The rest of the character
// is untouched. See the .legendary-* rules in styles.css.
function wrapLegendaryWeaponGlow(svgMarkup) {
  return `<span class="legendary-aura">${svgMarkup}<span class="legendary-sparkle w1">✦</span><span class="legendary-sparkle w2">✧</span></span>`;
}

// options: { armorShape, armorPalette, headPalette, weaponStyle, weaponPalette,
// legendaryWeapon, capeColor, tabardColor, bracerColor, gloveColor } - any
// omitted field falls back to the class's default look. armorPalette/headPalette
// are full {key:color} dicts, so callers (see characterSpriteFor) resolve each
// equip slot (helmet -> headPalette.r, shoulders -> armorPalette.T, waist -> W,
// legs/boots -> L/B, chest -> A) into those dicts before calling in here.
// capeColor/tabardColor/bracerColor/gloveColor have no dedicated shape region,
// so they're painted as small extra rect accents instead.
// Playable classes with PixelLab-generated body art (see
// assets/sprites/classes/<id>/<armorStyle>_<weaponVisual>.png) - a full
// one-shot illustration per armor-style/weapon-visual combo that classId can
// actually reach (see characterSpriteFor in progression.js, which resolves
// the combo from equipped gear and falls back to CLASS_ART_DEFAULTS for any
// empty slot). Classes not in this set still render through the fully
// procedural renderCharacterSprite below.
const CLASS_ART_READY = new Set(['warrior', 'rogue', 'mage', 'paladin', 'hunter', 'warlock', 'barbarian', 'cleric', 'bard']);

// The armor style / weapon visual shown for a class's still-unequipped
// slots - an ungeared character reads as a light adventurer rather than
// naked, and wielding their class's own signature weapon.
const CLASS_ART_DEFAULTS = {
  warrior: { armorStyle: 'leather', weaponVisual: 'sword' },
  rogue: { armorStyle: 'leather', weaponVisual: 'dagger' },
  mage: { armorStyle: 'cloth', weaponVisual: 'staff' },
  paladin: { armorStyle: 'plate', weaponVisual: 'mace' },
  hunter: { armorStyle: 'leather', weaponVisual: 'bow' },
  warlock: { armorStyle: 'cloth', weaponVisual: 'staff' },
  barbarian: { armorStyle: 'leather', weaponVisual: 'axe' },
  cleric: { armorStyle: 'cloth', weaponVisual: 'mace' },
  bard: { armorStyle: 'leather', weaponVisual: 'lute' }
};

function classBodyArtPath(classId, armorStyle, weaponVisual) {
  return `assets/sprites/classes/${classId}/${armorStyle}_${weaponVisual}.png`;
}

// sizePx here means HEIGHT (not width, unlike spriteSvg) - the class canvas is
// wider than it is tall (to give the weapon room), so sizing by height keeps
// the character's on-screen height consistent regardless of that extra margin.
function renderCharacterSprite(classId, sizePx, options) {
  const look = CLASS_LOOKS[classId];
  if (!look) return '';
  const opts = options || {};
  const headPalette = opts.headPalette || look.head;
  const armorShape = ARMOR_SHAPES[opts.armorShape || look.armorShape];
  const armorPalette = opts.armorPalette || look.armorPalette;
  const weaponStyle = opts.weaponStyle || look.weaponStyle;
  const weaponPalette = opts.weaponPalette || look.weaponPalette;

  const weaponParts = (WEAPON_SHAPES[weaponStyle] || []).map(p => ({ row: p.row, col: p.col, w: p.w, h: p.h, color: weaponPalette[p.key] }));

  const accentParts = [];
  // Shoulder guards physically broaden the silhouette rather than just
  // tinting the existing pauldron-cap cells (armorPalette.T) - any equipped
  // shoulder item extends the frame outward past the torso's own edge;
  // epic/legendary shoulders (see WoW's own oversized/spiked epics for the
  // reference) add a spike on top of that, bigger again at legendary.
  // Drawn before the cape below so a cape's own accent (same corner of the
  // canvas) layers over it, matching a cloak resting outside the pauldrons.
  if (opts.shoulderStyle) {
    // The torso's own pauldron cap (ARMOR_SHAPES row 12-13) is exactly as
    // wide as the head (cols 12-20 / 32-40) - so the broadening pad sits just
    // outside that, at cols 6-11 / 40-45, clear of the head at every row it
    // touches. Epic adds a spike above the pad (row 9); legendary adds a
    // bigger wing flourish above and further out again (row 7).
    accentParts.push({ row: 11, col: 6, w: 6, h: 4, color: opts.shoulderPadColor });
    accentParts.push({ row: 11, col: 40, w: 6, h: 4, color: opts.shoulderPadColor });
    if (opts.shoulderStyle === 'spiked' || opts.shoulderStyle === 'winged') {
      accentParts.push({ row: 9, col: 8, w: 3, h: 2, color: opts.shoulderPadColor });
      accentParts.push({ row: 9, col: 41, w: 3, h: 2, color: opts.shoulderPadColor });
    }
    if (opts.shoulderStyle === 'winged') {
      accentParts.push({ row: 7, col: 4, w: 6, h: 3, color: opts.shoulderPadColor });
      accentParts.push({ row: 7, col: 42, w: 6, h: 3, color: opts.shoulderPadColor });
    }
  }
  if (opts.capeColor) {
    accentParts.push({ row: 12, col: 9, w: 3, h: 14, color: opts.capeColor });
    accentParts.push({ row: 12, col: 40, w: 3, h: 14, color: opts.capeColor });
  }
  if (opts.tabardColor) {
    accentParts.push({ row: 13, col: 24, w: 4, h: 13, color: opts.tabardColor });
  }
  if (opts.bracerColor) {
    accentParts.push({ row: 18, col: 14, w: 3, h: 4, color: opts.bracerColor });
    accentParts.push({ row: 18, col: 35, w: 3, h: 4, color: opts.bracerColor });
  }
  if (opts.gloveColor) {
    accentParts.push({ row: 24, col: 16, w: 3, h: 3, color: opts.gloveColor });
    accentParts.push({ row: 24, col: 33, w: 3, h: 3, color: opts.gloveColor });
  }

  const displayWidth = Math.round(sizePx * SPRITE_W / SPRITE_H);
  return buildCompositeSVG(
    [{ rows: HEAD_SHAPE, palette: headPalette }, { rows: armorShape, palette: armorPalette }],
    [{ parts: weaponParts, group: 'weapon' }, { parts: accentParts, group: 'body' }],
    SPRITE_W, SPRITE_H, displayWidth, sizePx, OUTLINE_COLOR,
    opts.legendaryWeapon ? 'legendary-weapon-glow' : ''
  );
}

// --- Zone skyline backdrops ---
// One silhouette "unit" (a tree, spire, floating rock...) at a given center
// x / baseline y. Purely geometric shapes, same spirit as the character
// compositor: no raster art, just polygons tinted to the zone's own color.
function zoneUnitShape(shape, cx, baseY, w, h, color) {
  switch (shape) {
    case 'tree':
      return `<polygon points="${cx},${baseY - h} ${cx - w / 2},${baseY} ${cx + w / 2},${baseY}" fill="${color}"/>`;
    case 'gnarled': {
      const lean = w * 0.3;
      return `<polygon points="${cx - w * 0.12},${baseY} ${cx + w * 0.12},${baseY} ${cx + lean},${baseY - h} ${cx + lean - w * 0.35},${baseY - h * 0.7} ${cx - lean + w * 0.4},${baseY - h * 0.55} ${cx - lean},${baseY - h * 0.9}" fill="${color}"/>`;
    }
    case 'mushroom':
      return `<circle cx="${cx}" cy="${baseY - h * 0.85}" r="${w * 0.55}" fill="${color}"/><rect x="${cx - w * 0.08}" y="${baseY - h * 0.5}" width="${w * 0.16}" height="${h * 0.5}" fill="${color}"/>`;
    case 'spire':
      return `<rect x="${cx - w * 0.22}" y="${baseY - h * 0.55}" width="${w * 0.44}" height="${h * 0.55}" fill="${color}"/><polygon points="${cx - w * 0.3},${baseY - h * 0.55} ${cx + w * 0.3},${baseY - h * 0.55} ${cx},${baseY - h}" fill="${color}"/>`;
    case 'arch':
      return `<rect x="${cx - w * 0.4}" y="${baseY - h}" width="${w * 0.22}" height="${h}" fill="${color}"/><rect x="${cx + w * 0.18}" y="${baseY - h}" width="${w * 0.22}" height="${h}" fill="${color}"/><polygon points="${cx - w * 0.4},${baseY - h} ${cx + w * 0.4},${baseY - h} ${cx},${baseY - h * 1.35}" fill="${color}"/>`;
    case 'asteroid':
      return `<polygon points="${cx - w / 2},${baseY} ${cx - w * 0.2},${baseY - h} ${cx + w * 0.3},${baseY - h * 0.8} ${cx + w / 2},${baseY - h * 0.2} ${cx + w * 0.1},${baseY + h * 0.15}" fill="${color}"/>`;
    default:
      return `<rect x="${cx - w / 2}" y="${baseY - h}" width="${w}" height="${h}" fill="${color}"/>`;
  }
}

// A row of `count` units spread across (and a bit past) the 400-wide
// viewBox, with a deterministic sine-based jitter (not Math.random) so the
// skyline doesn't visibly reshuffle every re-render - only the parallax
// translate (driven by zone progress) moves it. 'asteroid' floats at a
// varying height instead of sitting on the baseline.
function buildZoneUnits(style, count, baseY, near) {
  let out = '';
  const spacing = 460 / count;
  for (let i = 0; i < count; i++) {
    const jitter = Math.sin(i * 2.7) * spacing * 0.28;
    const cx = -20 + i * spacing + jitter;
    const hJitter = 0.7 + ((i * 53) % 10) / 15;
    const w = (near ? 34 : 22) * (0.85 + (i % 3) * 0.12);
    const h = (near ? 42 : 26) * hJitter;
    const y = style.shape === 'asteroid' ? baseY - 10 - ((i * 37) % 26) : baseY;
    out += zoneUnitShape(style.shape, cx, y, w, h, style.color);
  }
  return out;
}

// One continuous mountain/dune line spanning the viewBox - a smooth wave for
// dunes, a hard zigzag for jagged/icy peaks. `floorY` is the bottom edge of
// the current canvas (120 for the wide encounter banner, taller for the
// map's own canvas - see renderZoneSkyline's `viewH`).
function buildZoneRidge(style, baseY, amplitude, near, floorY) {
  const points = [`-20,${floorY}`];
  const steps = near ? 14 : 10;
  for (let i = 0; i <= steps; i++) {
    const x = -20 + (460 / steps) * i;
    const wave = style.shape === 'dune'
      ? Math.sin(i * 1.3) * amplitude * 0.5 + Math.sin(i * 0.6) * amplitude * 0.3
      : (i % 2 === 0 ? -amplitude : -amplitude * 0.35);
    points.push(`${x.toFixed(1)},${(baseY + wave).toFixed(1)}`);
  }
  points.push(`440,${floorY}`);
  return `<polygon points="${points.join(' ')}" fill="${style.color}"/>`;
}

// The full backdrop: a far (dimmer, slower) and near (fuller, faster) layer
// for a cheap parallax read, plus an optional moon/sun disc or ambient glow.
// `progress` (0-1, see zoneProgress in main.js) is how far into the current
// act's map the player has traveled - it nudges both layers sideways so the
// backdrop visibly drifts onward as the run pushes deeper into a zone,
// instead of sitting frozen behind every screen.
// `fit` picks how the 400-wide art fills whatever box it's dropped into:
// 'cover' (default, used by the wide/short encounter banner) scales up and
// crops the sides so the strip is filled edge to edge; 'contain' (used by
// the map screen) scales to fit the full width instead, letterboxing empty
// sky above rather than cropping the art. `viewH` is the canvas's own height
// in SVG units (default 120, a short wide strip) - the map passes a much
// taller value so, combined with 'contain', the skyline fills most of its
// tall portrait-ish frame instead of being squeezed into a thin sliver at
// the very bottom.
function renderZoneSkyline(themeId, progress, fit, viewH) {
  const style = ZONE_SKYLINE_STYLE[themeId] || ZONE_SKYLINE_STYLE.forest;
  const p = Math.max(0, Math.min(1, progress || 0));
  const h = viewH || 120;
  const farShift = (-(p * 14)).toFixed(1);
  const nearShift = (-(p * 30)).toFixed(1);
  const farBaseY = h * 0.65, nearBaseY = h * 0.8;
  const far = style.family === 'ridge' ? buildZoneRidge(style, farBaseY, h * 0.13, false, h) : buildZoneUnits(style, 7, farBaseY, false);
  const near = style.family === 'ridge' ? buildZoneRidge(style, nearBaseY, h * 0.2, true, h) : buildZoneUnits(style, 5, nearBaseY, true);
  const disc = style.disc ? `<circle cx="330" cy="${h * 0.18}" r="14" fill="${style.disc}" opacity="0.85"/>` : '';
  const glow = style.glow ? `<circle cx="80" cy="${h * 0.58}" r="30" fill="${style.glow}" opacity="0.18"/><circle cx="300" cy="${h * 0.7}" r="24" fill="${style.glow}" opacity="0.15"/>` : '';
  const preserve = fit === 'contain' ? 'xMidYMax meet' : 'xMidYMax slice';
  return `<svg class="zone-skyline" viewBox="0 0 400 ${h}" preserveAspectRatio="${preserve}" xmlns="http://www.w3.org/2000/svg">
    ${disc}
    <g style="transform:translateX(${farShift}px)" opacity="0.5">${far}</g>
    ${glow}
    <g style="transform:translateX(${nearShift}px)" opacity="0.85">${near}</g>
  </svg>`;
}
