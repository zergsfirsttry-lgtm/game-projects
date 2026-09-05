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
const TEMPLATES = {
  humanoid: [
    "........",
    "..RRRRRR",
    ".RRHHHHH",
    ".RHHHFHH",
    ".RHHHHHH",
    "..HHHHHH",
    "....NNNN",
    "...AAAAA",
    "...AAAAA",
    "...AAAAA",
    ".....LL.",
    ".....LL.",
    ".....LL.",
    ".....LL.",
    ".....BB.",
    "........"
  ],
  creature: [
    "........",
    ".....EE.",
    ".EEEEEEE",
    ".EEHHHHH",
    ".HHHHFHH",
    ".HHHHHHH",
    "...HHHHH",
    "..BBBBBB",
    "..BBBBBB",
    "......B.",
    "......P.",
    "........"
  ],
  // Small winged creature - dragon whelplings, griffons, owls, pixies. Wings
  // (W) spread wide toward the outer edge, head/body (H) toward the seam.
  flyer: [
    "........",
    ".....EE.",
    "....EEEE",
    "...WHHHH",
    ".WWWHHFH",
    ".WWWWHHH",
    "..WWHHHH",
    "...BHHHH",
    "....BBBB",
    "....BB.."
  ],
  blob: [
    "........",
    "........",
    "......GG",
    ".....GGG",
    "....GGGG",
    "GGGGGGGG",
    "GGGGGGGG",
    "GGGGGGGG",
    "GGGGGGGG",
    "....GGGG",
    ".....GGG",
    "......GG",
    "........",
    "........",
    "........",
    "........"
  ]
};

const SPRITES = {
  // --- Regular enemies ---
  slime: { template: 'blob', palette: { G:'#4caf7d' },
    overlays: [ { row:6, col:6, w:1, h:1, color:'#132015', mirror:true } ] },
  rat: { template: 'creature', palette: { E:'#8a8a8a', H:'#8a8a8a', F:'#1a1414', B:'#71706f', P:'#3d3a3a' },
    overlays: [ { row:4, col:7, w:2, h:1, color:'#d98a9c' } ] },
  goblin: { template: 'humanoid', palette: { R:'#2f4a22', H:'#7fae5a', F:'#160f00', A:'#5b4632', L:'#3f3226', B:'#241b14' } },
  wolf: { template: 'creature', palette: { E:'#6b7280', H:'#6b7280', F:'#e8c94a', B:'#565c68', P:'#333842' } },
  bandit: { template: 'humanoid', palette: { R:'#332018', H:'#d9a066', F:'#150e08', A:'#4a4038', L:'#332a24', B:'#1c1712' } },
  skeleton: { template: 'humanoid', palette: { R:'#e8e4d8', H:'#e8e4d8', F:'#c0392b', A:'#c9c4b3', L:'#a8a290', B:'#7d7867' } },
  cultist: { template: 'humanoid', palette: { R:'#3a1f4d', H:'#c9a888', F:'#7d2ae8', A:'#2a1638', L:'#1c0f26', B:'#120a18' } },
  spider: { template: 'creature', palette: { E:'#241b2e', H:'#241b2e', F:'#c0392b', B:'#1a1420', P:'#0f0b14' },
    overlays: [
      { row:9, col:2, w:1, h:2, color:'#1a1420', mirror:true },
      { row:4, col:2, w:1, h:1, color:'#c0392b', mirror:true }
    ] },
  zombie: { template: 'humanoid', palette: { R:'#3e4a2e', H:'#7c8f5a', F:'#c0392b', A:'#4a3c2a', L:'#332a1c', B:'#231c14' } },
  imp: { template: 'humanoid', palette: { R:'#8a1f1f', H:'#c0392b', F:'#0f0805', A:'#7a1f1f', L:'#5c1717', B:'#3d0f0f' },
    overlays: [ { row:0, col:5, w:1, h:1, color:'#2b0808', mirror:true }, { row:8, col:2, w:1, h:3, color:'#8a1f1f' } ] },
  harpy: { template: 'creature', palette: { E:'#a3947a', H:'#a3947a', F:'#1a1410', B:'#8a7a5e', P:'#5c4f3a' },
    overlays: [ { row:7, col:0, w:2, h:2, color:'#c9b892', mirror:true } ] },
  boar: { template: 'creature', palette: { E:'#6b4a2f', H:'#6b4a2f', F:'#0f0805', B:'#503620', P:'#33220f' },
    overlays: [ { row:5, col:2, w:1, h:1, color:'#f0e6d2', mirror:true } ] },

  // --- Elites ---
  ogre: { template: 'humanoid', palette: { R:'#4a3a2a', H:'#8a9c5e', F:'#1a1410', A:'#4a3c2a', L:'#332a1c', B:'#231c14' } },
  darkKnight: { template: 'humanoid', palette: { R:'#1a1a1f', H:'#8a7060', F:'#c0392b', A:'#26262e', L:'#1a1a20', B:'#0f0f14' } },
  witch: { template: 'humanoid', palette: { R:'#3a1f4d', H:'#c9a888', F:'#7d2ae8', A:'#4a2d63', L:'#331f44', B:'#1f1330' },
    overlays: [ { row:0, col:7, w:2, h:1, color:'#2a1638' } ] },
  minotaur: { template: 'humanoid', palette: { R:'#4a3222', H:'#6b4a2f', F:'#c0392b', A:'#3a2a1a', L:'#2a1f14', B:'#1a130c' },
    overlays: [ { row:1, col:1, w:1, h:1, color:'#e8dcc4', mirror:true } ] },
  vampire: { template: 'humanoid', palette: { R:'#1a1a1f', H:'#e8d8d0', F:'#c0392b', A:'#3a1020', L:'#26141a', B:'#180c10' },
    overlays: [ { row:7, col:5, w:1, h:1, color:'#e8e4d8', mirror:true } ] },

  // --- Bosses ---
  rotWarden: { template: 'humanoid', palette: { R:'#2f3a1f', H:'#5a6b3a', F:'#8fae4a', A:'#3a4526', L:'#262e18', B:'#181f10' } },
  banditKing: { template: 'humanoid', palette: { R:'#3a2418', H:'#d9a066', F:'#1a1410', A:'#6b1f1f', L:'#4a1515', B:'#2e0d0d' },
    overlays: [ { row:0, col:5, w:6, h:1, color:'#e8c94a' } ] },
  lich: { template: 'humanoid', palette: { R:'#1a1a24', H:'#d8d4c8', F:'#4ae8e0', A:'#26202e', L:'#1a1620', B:'#100d16' },
    overlays: [ { row:4, col:6, w:1, h:1, color:'#8ff5ef', mirror:true } ] },

  // --- Pets (see PETS in data.js) ---
  dragonWhelpling: { template: 'flyer', palette: { W:'#8a1f2a', H:'#c0392b', F:'#e8c94a', B:'#8a1f1f', E:'#e8c94a' } },
  direwolfPup: { template: 'creature', palette: { E:'#8a8f9c', H:'#8a8f9c', F:'#e8c94a', B:'#6b7280', P:'#4a505c' } },
  pseudodragon: { template: 'flyer', palette: { W:'#5a3a7a', H:'#8a5fd6', F:'#e8c94a', B:'#4a2f66', E:'#c9a8ff' } },
  impFamiliar: { template: 'humanoid', palette: { R:'#5c2a7a', H:'#a85fd6', F:'#0f0805', A:'#4a2166', L:'#331744', B:'#1f0d2b' },
    overlays: [ { row:0, col:5, w:1, h:1, color:'#2b0838', mirror:true } ] },
  moonkinHatchling: { template: 'creature', palette: { E:'#8a6b3a', H:'#8a6b3a', F:'#e8c94a', B:'#5c4623', P:'#3a2c16' },
    overlays: [ { row:0, col:6, w:1, h:1, color:'#e8c94a', mirror:true } ] },
  mechanicalSquirrel: { template: 'creature', palette: { E:'#b0b8c4', H:'#b0b8c4', F:'#4ae8e0', B:'#7a828e', P:'#565c68' },
    overlays: [ { row:0, col:6, w:1, h:1, color:'#4ae8e0', mirror:true } ] },
  owlFamiliar: { template: 'flyer', palette: { W:'#5c4530', H:'#8a7050', F:'#e8c94a', B:'#4a3624', E:'#c9b892' },
    overlays: [ { row:4, col:7, w:2, h:1, color:'#e8a94a' } ] },
  pixieSprite: { template: 'flyer', palette: { W:'#e87dc9', H:'#8adbe8', F:'#ffffff', B:'#5ab0c9', E:'#f5e8ff' },
    overlays: [ { row:1, col:7, w:2, h:1, color:'#ffffff' } ] },

  // --- Mounts (see MOUNTS in data.js) ---
  netherdrake: { template: 'flyer', palette: { W:'#3a7a2a', H:'#5fae3a', F:'#e8f5a0', B:'#2a5c1e', E:'#a0e85a' },
    overlays: [ { row:1, col:7, w:2, h:1, color:'#e8f5a0' } ] },
  griffonMount: { template: 'flyer', palette: { W:'#8a6b3a', H:'#c9a866', F:'#1a1410', B:'#7a5f38', E:'#e8dcc4' },
    overlays: [ { row:3, col:7, w:2, h:1, color:'#e8c94a' } ] },
  frostwolfMount: { template: 'creature', palette: { E:'#c9d6e8', H:'#c9d6e8', F:'#4ae8e0', B:'#8a9cb0', P:'#5a6c80' } },
  warKodo: { template: 'creature', palette: { E:'#6b4a2f', H:'#6b4a2f', F:'#1a1410', B:'#4a3220', P:'#2a1c12' },
    overlays: [ { row:5, col:1, w:1, h:1, color:'#e8e4d8', mirror:true } ] },
  hippogriffMount: { template: 'flyer', palette: { W:'#6b5a4a', H:'#a8927a', F:'#1a1410', B:'#5c4a3a', E:'#d9c9a8' } },
  nightmareSteed: { template: 'creature', palette: { E:'#1a1414', H:'#1a1414', F:'#e8722a', B:'#0f0c0c', P:'#050404' } },
  unicornMount: { template: 'creature', palette: { E:'#f0ecff', H:'#f0ecff', F:'#7d2ae8', B:'#d8cff0', P:'#b8a8e0' },
    overlays: [ { row:0, col:7, w:2, h:1, color:'#e8c94a' } ] },
  spectralTiger: { template: 'creature', palette: { E:'#8fd9e8', H:'#8fd9e8', F:'#e8f5ff', B:'#5ab0c9', P:'#3a7a8f' },
    overlays: [
      { row:5, col:3, w:1, h:1, color:'#2a5560', mirror:true },
      { row:7, col:2, w:1, h:1, color:'#2a5560', mirror:true }
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
function spriteSvg(id, sizePx) {
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
const SPRITE_W = 26;
const SPRITE_HALF = 13;
const SPRITE_H = 22;

// BODY: head/hair/face. Always visible, never affected by equipment. Rows 7-21
// are intentionally blank so the ARMOR layer (drawn on top) shows through.
const HEAD_SHAPE = [
  '.......rrrrrr', // 0 hair top - reaches the seam so it's one head, not two
  '......rrrrrrr', // 1 hair sides
  '......rrhhhhh', // 2 hairline / face
  '......rhhhehh', // 3 face + eye (eye away from the seam so its mirror twin isn't touching it)
  '......hhhhhhh', // 4 face
  '.......hhhhhh', // 5 jaw
  '.........nnnn', // 6 neck
  '.............', '.............', '.............', '.............', '.............',
  '.............', '.............', '.............', '.............', '.............',
  '.............', '.............', '.............', '.............', '.............'
];

// ARMOR shapes. "armor" = martial silhouette (shoulder flare, split legs,
// boots) used by plate/mail/leather/hide. "robe" = flowing caster silhouette
// (no leg split, wide hem) used by cloth/dark-robe. Both share identical
// shoulder/torso/waist rows (5-12) so the two read as the same body underneath.
// T = rarity trim (collar + chest emblem - both light up together on rare+
// gear), W = belt/sash accent (a third distinct color band for definition,
// also brightened on rare+ gear).
const ARMOR_SHAPES = {
  armor: [
    '.............', '.............', '.............', '.............', '.............',
    '........TTTTT', // 5  collar
    '......TAAAAAA', // 6  shoulder flare + pauldron cap at the tip
    '.......AAAAAA', // 7  torso
    '.......AAAAAT', // 8  torso + chest emblem
    '.......AAAAAA', // 9  torso
    '.......WWWWWW', // 10 belt
    '........AAAAA', // 11 waist
    '........AAAAA', // 12 waist taper
    '.........AAA.', // 13 legs split
    '.........AAA.', // 14
    '.........AAA.', // 15
    '.........AAA.', // 16
    '.........AAA.', // 17
    '.........AAA.', // 18
    '.........AAA.', // 19
    '.........BBB.', // 20 boots
    '.........BBB.'  // 21
  ],
  robe: [
    '.............', '.............', '.............', '.............', '.............',
    '........TTTTT', // 5 collar
    '......TAAAAAA', // 6 shoulder flare + pauldron cap
    '.......AAAAAA', // 7 torso
    '.......AAAAAT', // 8 torso + chest emblem
    '.......AAAAAA', // 9 torso
    '.......WWWWWW', // 10 sash
    '........AAAAA', // 11 waist
    '........AAAAA', // 12 waist
    '.......AAAAAA', // 13 robe body
    '.......AAAAAA', // 14
    '.......AAAAAA', // 15
    '.......AAAAAA', // 16
    '.......AAAAAA', // 17
    '......AAAAAAA', // 18 hem flare
    '......BBBBBBB', // 19 hem trim
    '......BBBBBBB', // 20 hem trim
    '......BBBBBBB'  // 21
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
    { row:5, col:22, w:2, h:1, key:'blade' },  // tapered tip
    { row:6, col:21, w:3, h:5, key:'blade' },  // blade
    { row:11, col:19, w:7, h:1, key:'guard' }, // full-width crossguard
    { row:12, col:21, w:3, h:2, key:'hilt' },  // grip
    { row:14, col:21, w:3, h:1, key:'guard' }  // pommel cap
  ],
  dagger: [
    { row:8, col:22, w:2, h:1, key:'blade' },
    { row:9, col:21, w:3, h:3, key:'blade' },
    { row:11, col:20, w:5, h:1, key:'hilt' },  // small guard
    { row:12, col:21, w:3, h:1, key:'hilt' }
  ],
  axe: [
    { row:7, col:20, w:4, h:2, key:'blade' },  // upper curve of the axe-head
    { row:9, col:19, w:6, h:2, key:'blade' },  // wide cutting edge
    { row:11, col:22, w:2, h:6, key:'handle' },
    { row:17, col:22, w:2, h:1, key:'blade' }  // butt spike
  ],
  staff: [
    { row:4, col:21, w:3, h:2, key:'orb' },    // bigger orb
    { row:6, col:22, w:2, h:9, key:'handle' },
    { row:10, col:20, w:5, h:1, key:'orb' },   // banding mid-shaft
    { row:15, col:22, w:2, h:1, key:'orb' }    // butt cap
  ],
  bow: [
    { row:5, col:25, w:1, h:2, key:'wood' },
    { row:7, col:23, w:1, h:2, key:'wood' },
    { row:9, col:21, w:1, h:3, key:'wood' },   // widest point of the curve
    { row:9, col:22, w:2, h:1, key:'wood' },   // grip
    { row:12, col:23, w:1, h:2, key:'wood' },
    { row:14, col:25, w:1, h:2, key:'wood' }
  ],
  mace: [
    { row:6, col:22, w:2, h:1, key:'head' },   // top spike
    { row:7, col:20, w:5, h:3, key:'head' },   // flanged head
    { row:10, col:22, w:2, h:1, key:'head' },  // neck taper
    { row:11, col:22, w:2, h:5, key:'handle' }
  ],
  lute: [
    { row:4, col:22, w:2, h:1, key:'neck' },   // tuning pegs
    { row:5, col:22, w:2, h:4, key:'neck' },
    { row:9, col:21, w:3, h:2, key:'body' },   // upper body
    { row:11, col:19, w:5, h:3, key:'body' }   // lower, rounder body
  ]
};
const WEAPON_ACCENT_KEY = { sword: 'blade', dagger: 'blade', axe: 'blade', staff: 'orb', bow: 'wood', mace: 'head', lute: 'body' };

// Default palettes for gear rendered generically (e.g. shown as bank-shop
// preview icons rather than on a specific class's model).
// Which of the two silhouettes (ARMOR_SHAPES keys) each armor style uses.
const ARMOR_STYLE_SHAPE = { cloth: 'robe', leather: 'armor', mail: 'armor', plate: 'armor' };

const ARMOR_STYLE_PALETTES = {
  cloth: { A: '#c9c4b3', B: '#8a8577', T: '#c9c4b3', W: '#8a5a2e' },
  leather: { A: '#5c4530', B: '#3d2f1f', T: '#5c4530', W: '#9aa3b2' },
  mail: { A: '#5a6472', B: '#3a4048', T: '#5a6472', W: '#8a5a2e' },
  plate: { A: '#9aa3b2', B: '#5a6068', T: '#9aa3b2', W: '#8a5a2e' }
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
  warrior: { head: { r:'#5c4530', h:'#e8b98a', e:'#20160e', n:'#e0ab7d' }, armorShape:'armor', armorPalette:{ A:'#8a929c', B:'#3d4148', T:'#8a929c', W:'#8a5a2e' }, weaponStyle:'sword', weaponPalette:{ blade:'#c7ccd1', guard:'#5a5f68', hilt:'#6b4a2f' } },
  rogue: { head: { r:'#1a1a1f', h:'#dba876', e:'#20160e', n:'#d19d6e' }, armorShape:'armor', armorPalette:{ A:'#332538', B:'#1c1520', T:'#332538', W:'#9aa3b2' }, weaponStyle:'dagger', weaponPalette:{ blade:'#c7ccd1', hilt:'#2a1f30' } },
  mage: { head: { r:'#c9c4d9', h:'#e8b98a', e:'#2a3a6a', n:'#e0ab7d' }, armorShape:'robe', armorPalette:{ A:'#2f4f9c', B:'#1c3162', T:'#2f4f9c', W:'#8a5a2e' }, weaponStyle:'staff', weaponPalette:{ handle:'#6b4a2f', orb:'#9d6fe8' } },
  paladin: { head: { r:'#d9c060', h:'#e8b98a', e:'#20160e', n:'#e0ab7d' }, armorShape:'armor', armorPalette:{ A:'#d9c88a', B:'#a88f4a', T:'#d9c88a', W:'#6b1f1f' }, weaponStyle:'mace', weaponPalette:{ handle:'#6b4a2f', head:'#e8c94a' } },
  hunter: { head: { r:'#3a5c2e', h:'#c9a888', e:'#20160e', n:'#bd9b7c' }, armorShape:'armor', armorPalette:{ A:'#4a6b3a', B:'#2e4324', T:'#4a6b3a', W:'#8a5a2e' }, weaponStyle:'bow', weaponPalette:{ wood:'#8a5a2e' } },
  warlock: { head: { r:'#1a1a1f', h:'#a888a0', e:'#7d2ae8', n:'#9c7c94' }, armorShape:'robe', armorPalette:{ A:'#3a1a4a', B:'#22102c', T:'#3a1a4a', W:'#7d2ae8' }, weaponStyle:'staff', weaponPalette:{ handle:'#3a1a4a', orb:'#c23df5' } },
  barbarian: { head: { r:'#c9502e', h:'#c9906b', e:'#20160e', n:'#bd8560' }, armorShape:'armor', armorPalette:{ A:'#8a4a2a', B:'#5c3218', T:'#8a4a2a', W:'#e8dcc4' }, weaponStyle:'axe', weaponPalette:{ blade:'#c7ccd1', handle:'#6b4a2f' } },
  cleric: { head: { r:'#e8e4d8', h:'#e8b98a', e:'#20160e', n:'#e0ab7d' }, armorShape:'robe', armorPalette:{ A:'#d9d4c3', B:'#a8a290', T:'#d9d4c3', W:'#e8c94a' }, weaponStyle:'mace', weaponPalette:{ handle:'#6b4a2f', head:'#e8e4d8' } },
  bard: { head: { r:'#a83d8a', h:'#e0ab7d', e:'#20160e', n:'#d19d6e' }, armorShape:'armor', armorPalette:{ A:'#8a2a5c', B:'#5c1c3d', T:'#8a2a5c', W:'#e8c94a' }, weaponStyle:'lute', weaponPalette:{ body:'#6b4a2f', neck:'#4a3320' } }
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

// options: { armorShape, armorPalette, weaponStyle, weaponPalette,
// legendaryWeapon } - any omitted field falls back to the class's default look.
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

  const displayWidth = Math.round(sizePx * SPRITE_W / SPRITE_H);
  return buildCompositeSVG(
    [{ rows: HEAD_SHAPE, palette: headPalette }, { rows: armorShape, palette: armorPalette }],
    [{ parts: weaponParts, group: 'weapon' }],
    SPRITE_W, SPRITE_H, displayWidth, sizePx, OUTLINE_COLOR,
    opts.legendaryWeapon ? 'legendary-weapon-glow' : ''
  );
}
