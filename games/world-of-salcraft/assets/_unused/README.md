# Unused assets

A staging area for generated art that isn't currently referenced by any
code, kept around for possible reuse instead of deleting it outright.
Mirrors the folder structure of wherever each asset originally lived.

**Workflow:** when something in here gets wired back into the game, move
its file(s) out to their real location and delete the entry below. When
something stops being used, move it in here and add an entry.

## Contents

- `scenes/<zoneId>/{fg,sky,cloud}.png` - the old side-view "3rd person
  scene" backdrop system (a lone landmark + parallax sky/clouds) for each
  zone. Superseded by the full top-down `zone_maps/<id>.png` painting.
  `fg.png` had a second life scattered along the map's side margins
  (`renderZoneDecorations`, removed) but didn't read well there either.
- `tilesets/<zoneId>.png` - a small repeating ground texture used by the
  old zone skyline banner (`renderZoneBanner`, removed) that sat between
  the HUD and every encounter panel.
