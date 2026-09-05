# World of Salcraft

A browser-based, WoW-inspired 2D roguelike RPG. Vanilla HTML/CSS/JS — no
build step, no dependencies, no server-side code. Progress saves to your
browser's `localStorage`.

## Running locally

Just open `index.html` in a browser, or serve the folder with any static
file server, e.g.:

```bash
npx serve .
```

## Structure

```
index.html      entry point, loads the scripts below in order
styles.css      all styling
js/
  sprites.js      procedural pixel-art SVG sprite generation
  data.js         static game content (classes, spells, gear, relics, quests, ...)
  progression.js  persistent save data + leveling/crafting/profession logic
  state.js        per-run game state (Game object) and effective-stats calc
  map.js          procedural node-map generation and rendering
  combat.js        turn-based combat resolution
  events.js       decision-event/treasure/shop outcome resolution
  main.js         screen rendering and UI wiring (the App object)
```
