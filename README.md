# Setae.js

Interactive taxonomic key for marine polychaete (bristle worm) families, based on the **Fauchald (1977) family key**. Named after the bristle-like appendages (*setae*) that define this class of segmented worms.

## Features

- **Dichotomous Key** — Step-by-step binary decision tree to identify polychaete families
- **Taxa List** — Alphabetical index of all families with full diagnostic paths, searchable by taxon name or morphological traits
- **Bilingual** — Full English (en) and Spanish (es) support
- **iNaturalist Integration** — Live taxon images fetched from iNaturalist
- **WoRMS Validation** — Checks family names against the World Register of Marine Species, flags outdated/unaccepted names with the currently accepted name
- **Depth Meter** — Visual progress indicator mimicking ocean depth descent
- **Breadcrumb Navigation** — Click any breadcrumb to jump back to that step in the key

## Tech Stack

- [React 19](https://react.dev/) + [Vite 8](https://vitejs.dev/)
- Data: Fauchald family key in structured JSON (en/es)
- i18n: Locale-aware JSON string bundles
- APIs: [iNaturalist](https://api.inaturalist.org/) · [WoRMS](https://www.marinespecies.org/rest/)

## Development

```bash
npm install
npm run dev       # Start dev server with HMR
npm run build     # Production build → dist/
npm run preview   # Preview production build
```

## Deployment

GitHub Actions auto-deploys to GitHub Pages on every push to `main`/`master`:

```
.github/workflows/deploy.yml
```

The workflow builds the Vite project and publishes `dist/` via `actions/deploy-pages`.

## Data

Taxonomic key data is located in `src/data/`:

| File | Content |
|------|---------|
| `fauchald_family_key_en.json` | English key — binary decision tree |
| `fauchald_family_key_es.json` | Spanish key |
| `fauchald_family_key.json` | Legacy / reference copy |

Each node has a `step` number and two `optionA`/`optionB` choices leading to either:
- `goTo` → another step
- `result` → a family name (leaf node)

## License

MIT
