# Showcase Farms Export

## Why this exists

Farms created in the app live only in the browser's `localStorage`
(`CropLab_guest_farms`) along with their satellite output
(`agriculture_heatmap_cache`). That data is per-browser and disappears if
storage is cleared.

This script **snapshots** that data into `src/assets/showcase-farms.json`,
which is bundled into the build. Those farms then appear **permanently** on the
dashboard for every user, with their stored heatmap output — no backend call
needed. They are read-only: no edit or delete buttons.

## How to use

1. Open the app in the browser where you created the farms.
2. Open each farm once so its heatmap output gets cached.
3. Get the snippet onto your clipboard:
   ```
   npm run export:showcase
   ```
   (prints `export-showcase-farms.js` to the terminal — copy it; or just open
   that file and copy it directly)
4. In the app, open DevTools (F12) → **Console**, paste the snippet, press Enter.
5. `showcase-farms.json` downloads.
6. Move it to `src/assets/showcase-farms.json`, overwriting the old file.
7. Reload / rebuild — the farms are now permanent on the dashboard.

## Process in short

```
localStorage  ──(console snippet)──►  showcase-farms.json  ──(build)──►  dashboard
```

- The export is a **full snapshot** — re-running fully replaces the previous
  `showcase-farms.json`.
- `localStorage` is **not** modified; new farms you create afterwards still
  show as normal editable farms until you export again.
- The snippet must run in the **browser** (it needs `localStorage`); it cannot
  run in Node, which is why `npm run export:showcase` only prints it.
