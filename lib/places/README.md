# Place dataset (`lib/places/`)

Powers the location picker (`components/ui/location-combobox.tsx`) and the home
map view (`app/(app)/home/_components/moments-map.tsx`).

## Files

| File | Consumed by | Notes |
| --- | --- | --- |
| `cities.json` | `data.ts` (server only) | ~49k cities, population ≥ 5,000 plus every national capital. Shape `{ id, city, cc, lat, lng, pop, cap }`, pre-sorted by population desc. Country **name** is not stored per city — looked up from `countries.json` by `cc`. |
| `regions.json` | `data.ts` (server only) | ~5k admin regions (US states, provinces, …): `{ iso, name, cc, lat, lng }`. Lets a moment be tagged to e.g. "Connecticut, United States". |
| `countries.json` | `data.ts` (server only) | One row per country: `{ cc, name, capLat, capLng }`. Capital coords are where country-only moments are plotted. |
| `world.json` | map component (client) | TopoJSON world map (50m, ~740 KB), copied from `world-atlas`. |
| `types.ts` | client + server | Pure types (`PlaceValue`, `PlaceKind`, `PlaceSearchResult`). Safe to import anywhere. |
| `data.ts` | **server only** | Loads the ~4 MB city list + regions + `searchPlaces()`. Never import from a client component. |

## Regenerating

```bash
npm run gen:places
```

Runs `scripts/generate-places.mjs`, which reads the `all-the-cities`,
`world-countries`, and `country-state-city` dev dependencies (GeoNames-derived /
public domain) and the `world-atlas` TopoJSON, then rewrites the JSON files above.
Commit the result. The heavy source packages are `devDependencies` only — the app
runtime imports the committed JSON, never those packages.

Tuning knobs live at the top of the script (`MIN_POPULATION`, capital detection).
