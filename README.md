# Game Projects

A collection of browser-playable games. Each one lives in its own folder under
[`games/`](games/) with no build step required — open its `index.html`
directly, or serve the folder with any static file server.

## Games

| Game | Folder | Play |
|---|---|---|
| **World of Salcraft** — a WoW-inspired 2D roguelike RPG | [`games/world-of-salcraft`](games/world-of-salcraft) | [Play in browser](https://REPLACE_WITH_GITHUB_USERNAME.github.io/REPLACE_WITH_REPO_NAME/games/world-of-salcraft/) |

## Repo layout

```
games/
  world-of-salcraft/   vanilla HTML/CSS/JS, no dependencies
    index.html
    styles.css
    js/
  <next-game>/
    ...
```

Adding a new game: create a new folder under `games/`, keep it self-contained
(its own `index.html` at the folder root), and add a row to the table above.

## Hosting

This repo is served as a static site via GitHub Pages (Settings → Pages →
Deploy from branch → `main` / `/ (root)`), so every game under `games/` is
reachable directly at `https://<username>.github.io/<repo>/games/<game>/`.
