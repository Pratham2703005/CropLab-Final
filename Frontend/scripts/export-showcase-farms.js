/**
 * export-showcase-farms.js
 * ----------------------------------------------------------------------------
 * Snapshots the guest farms + their cached heatmap output from browser
 * localStorage into a single JSON file that gets baked into the app build.
 *
 * The exported farms become PERMANENT, read-only "showcase" farms that always
 * appear on the dashboard with their stored satellite output — no backend
 * call needed to view them.
 *
 * This is a BROWSER snippet — it cannot run in Node (it uses localStorage /
 * document). The npm script below just prints this file so you can copy it.
 *
 * ── HOW TO USE ──────────────────────────────────────────────────────────────
 * 1. Open the CropLab app in the browser where you created the farms.
 * 2. Create / verify the farms you want to showcase (open each one once so its
 *    heatmap output gets cached in localStorage).
 * 3. Open DevTools (F12) → Console tab.
 * 4. Get this snippet onto the clipboard, then paste it into the console:
 *
 *      npm run export:showcase        (prints this file to the terminal)
 *
 *    — or just open this file and copy it directly.
 * 5. Paste into the console, press Enter. `showcase-farms.json` downloads.
 * 6. Move it to:  Frontend/src/assets/showcase-farms.json   (overwrite the old)
 * 7. Reload / rebuild the app — the farms now show permanently on the dashboard.
 *
 * Re-run this anytime: the new file is a FULL snapshot and fully replaces the
 * previous showcase-farms.json. localStorage is left untouched.
 * ----------------------------------------------------------------------------
 */
(function exportShowcaseFarms() {
  const FARMS_KEY = 'CropLab_guest_farms';
  const HEATMAP_KEY = 'agriculture_heatmap_cache';

  const read = key => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.error(`[export] Could not parse "${key}":`, e);
      return [];
    }
  };

  const farms = read(FARMS_KEY);
  const heatmaps = read(HEATMAP_KEY);

  if (!Array.isArray(farms) || farms.length === 0) {
    console.warn(
      '[export] No guest farms found in localStorage — nothing to export.'
    );
    return;
  }

  // Keep only the heatmap caches that belong to an exported farm.
  const farmIds = new Set(farms.map(f => f && f.id).filter(Boolean));
  const relevantHeatmaps = Array.isArray(heatmaps)
    ? heatmaps.filter(h => h && farmIds.has(h.farmId))
    : [];

  const withoutHeatmap = farms.filter(f => f && !relevantHeatmaps.some(h => h.farmId === f.id));
  if (withoutHeatmap.length > 0) {
    console.warn(
      '[export] These farms have NO cached heatmap output — open each one in ' +
        'the app once before exporting:',
      withoutHeatmap.map(f => f.name || f.id)
    );
  }

  const payload = {
    exportedAt: new Date().toISOString(),
    farmCount: farms.length,
    heatmapCount: relevantHeatmaps.length,
    farms,
    heatmaps: relevantHeatmaps,
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'showcase-farms.json';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);

  console.log(
    `%c✅ Exported ${farms.length} farm(s) and ${relevantHeatmaps.length} heatmap(s).`,
    'color:#10b981;font-weight:bold'
  );
  console.log(
    'Next: move the downloaded showcase-farms.json into ' +
      'Frontend/src/assets/showcase-farms.json (overwrite the existing file).'
  );
})();
