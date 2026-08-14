# Japan natural park polygons (static)

Built by `npm run build:jp-ksj` → `natural-parks.geojson.gz`.

- Primary: MOE national-park restriction zones (no API key; 政府標準利用規約).
- Optional: drop KSJ A10 GeoJSON into `.tmp/ksj-src/` and re-run the script to merge prefectural coverage.

The app loads the gzip asset at runtime (no MLIT Reinfolib key; safe for 100% frontend).
