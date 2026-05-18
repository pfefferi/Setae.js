# Setae.js

Interactive multi-key taxonomic identification tool. Start with a **key selector** to choose your taxonomic group, then step through a dichotomous key. Built to be extended — adding a new key means adding a folder with JSON files, no code changes.

## Available Keys

| Key | Group | Region | Based on |
|-----|-------|--------|----------|
| 🐛 **Polychaete Families** | Marine polychaete worms | Global | Fauchald (1977) |
| 🐜 **Ant Genera** | Ants (Formicidae) | Pampas & Espinal, Argentina | Paris & Santoandré (2023) |

---

## Adding a New Key — Quick Start

1. **Create a folder** inside `src/data/keys/` named with your key's ID (e.g. `src/data/keys/spider-families/`)
2. **Add key data:** create `key_es.json` (Spanish) and/or `key_en.json` (English) — see format below
3. **Register it:** add one entry to `src/data/keys/index.json` with title, icon, etc.
4. **Done.** Run `npm run dev` — your key appears in the selector.

> **Stuck?** Look at the real examples: `src/data/keys/ant-genera-pampas/` is a simple 19-step key. `src/data/keys/polychaete-fauchald/` is a more complex one with genus sub-keys.

---

## Complete Guide — Key Folder Structure

```
src/data/keys/{your-key-id}/
├── key_en.json           ← Key data, English version (REQUIRED if you want EN)
├── key_es.json           ← Key data, Spanish version (REQUIRED if you want ES)
├── glossary.json         ← Morphological term definitions (OPTIONAL)
├── genera_keys/          ← Genus-level sub-keys (OPTIONAL — see below)
│   ├── index.json        ←   List of families that have sub-keys
│   └── {family}.json     ←   Dichotomous key for one family
├── traits/               ← Trait data (OPTIONAL — for advanced browsing)
└── images/               ← Taxon images (OPTIONAL — not yet implemented)
```

---

## Step 1 — Create the Key Data File

Each file contains a **dichotomous key** as a JSON object. Each step is a numbered node with two choices (`optionA` and `optionB`). Each choice leads either to **another step** (`goTo`) or to a **result** (the identified taxon).

### Basic format

```json
{
  "1": {
    "step": "1",
    "optionA": {
      "text": "Wings present",
      "goTo": "2",
      "result": null
    },
    "optionB": {
      "text": "Wings absent",
      "goTo": null,
      "result": "APODIDAE"
    }
  },
  "2": {
    "step": "2",
    "optionA": {
      "text": "Body covered in hair",
      "goTo": null,
      "result": "MAMMALIA"
    },
    "optionB": {
      "text": "Body covered in feathers",
      "goTo": null,
      "result": "AVES"
    }
  }
}
```

### Rules for building keys

| Rule | Explanation |
|------|-------------|
| **Start at step "1"** | The first node must have `"step": "1"`. This is where the key begins. |
| **Steps don't need to be sequential** | You can have gaps: steps 1, 2, 5, 17. Only `goTo` references matter. |
| **Every node needs both A and B** | Each step must have exactly two choices. |
| **Each choice has `goTo` OR `result`** | One must be null, the other must have a value. Never both set or both null. |
| **`goTo` must reference an existing step** | If you write `"goTo": "5"`, step "5" must exist in the file. |
| **`goTo` values are strings** | Use `"goTo": "3"`, not `"goTo": 3`. |
| **`text` is the character description** | This is what the user reads to decide which branch to take. |
| **Results can include metadata** | Convention: `"result": "FamilyName (Subfamily) size–range mm"` — the app displays the full string. |

### Real example

The ant key at `src/data/keys/ant-genera-pampas/key_es.json` — here's what the first few steps look like:

```json
{
  "1": {
    "step": "1",
    "optionA": { "text": "Pecíolo de dos segmentos (pecíolo y pospecíolo)", "goTo": "2", "result": null },
    "optionB": { "text": "Pecíolo de un segmento", "goTo": "12", "result": null }
  },
  "2": {
    "step": "2",
    "optionA": { "text": "Espinas en el mesosoma", "goTo": "5", "result": null },
    "optionB": { "text": "Mesosoma sin espinas", "goTo": "3", "result": null }
  },
  "3": {
    "step": "3",
    "optionA": { "text": "Antena con una maza de 2 segmentos, de aspecto muy característico; aguijón presente", "result": "Solenopsis (Myrmicinae) 1.3–6 mm" },
    "optionB": { "text": "Antena con o sin maza; en caso de tener maza nunca es como la opción A", "goTo": "4", "result": null }
  }
}
```

### If you step number becomes a result

When navigation reaches `"result"` instead of `"goTo"`, the app displays the **result card** with the taxon name, the decision path, and optionally an image + taxonomic validation.

---

## Step 2 — Register the Key in the Index

Edit `src/data/keys/index.json` and add an entry like this:

```json
{
  "id": "my-key-id",
  "title": {
    "en": "My Key Title",
    "es": "Mi Título de Clave"
  },
  "subtitle": {
    "en": "Author (year) or brief context",
    "es": "Autor (año) o contexto breve"
  },
  "description": {
    "en": "A sentence explaining what this key is for and where it applies.",
    "es": "Una oración explicando para qué sirve esta clave y dónde aplica."
  },
  "icon": "🪲",
  "features": {
    "generaKeys": false,
    "worms": false,
    "inaturalist": false
  }
}
```

### `features` explained

| Feature | `true` means... | Used by |
|---------|-----------------|---------|
| `generaKeys` | This key has genus-level sub-keys in a `genera_keys/` folder. | Polychaete key — after identifying a family, user can drill to genus. |
| `worms` | After a result, check the taxon name against the World Register of Marine Species API. Shows a warning if the name is outdated. | Only meaningful for marine taxa. |
| `inaturalist` | After a result, fetch a photo from iNaturalist's API. | Shows a representative image on the result card. |
| `listImages` | Show thumbnail images in the Taxa List view. Requires images in `{keyId}/images/` folder named `{genus}.png`. | Ant key — shows a small photo of each genus next to its name in the browse list. |

If your key doesn't need these, set them all to `false`. They are opt-in features for specific use cases.

---

## Step 3 (Optional) — Add a Glossary

A glossary auto-highlights morphological terms in your key text. When the user taps a highlighted term, a popup shows the definition.

Create `glossary.json` in your key folder:

```json
[
  {
    "term": "Petiole (petioles)",
    "definition": "The narrow waist segment between the mesosoma and gaster. May consist of one or two segments.",
    "figure": ""
  },
  {
    "term": "Propodeum",
    "definition": "First abdominal segment, fused to the thorax forming part of the mesosoma.",
    "figure": ""
  }
]
```

### Glossary rules

- The `term` field can include a **plural form in parentheses**: `"term": "Antenna (antennae)"` matches both "antenna" and "antennae" in the key text.
- Terms are matched case-insensitively at word boundaries.
- The `figure` field is reserved for future diagram references.
- Terms shorter than 3 characters are ignored (to avoid false matches like "a" or "an").

### How highlighting works

The app scans each option's `text` for glossary terms. The longest matching term takes priority. If a key text says "Antenna with a 2-segmented club" and your glossary has `"Antenna (antennae)"`, the word "Antenna" will be highlighted and tappable for its definition.

---

## Step 3b (Optional) — Add Genus-Level Sub-Keys

If your key identifies organisms to the **family** level (like the polychaete key), you can add sub-keys that drill down to **genus**.

### Folder structure

```
genera_keys/
├── index.json              ← Array of family names that have sub-keys
├── nereidae.json           ← English genus key for Nereidae
├── nereidae_es.json        ← Spanish genus key for Nereidae
└── ... (one per family)
```

### `genera_keys/index.json`

A simple JSON array listing the families (base name only, lowercase):

```json
["nereidae", "syllidae", "spionidae", "polynoidae"]
```

### Genus key file format

Same format as the main key — `step` + `optionA` / `optionB` with `goTo` / `result`:

```json
{
  "_meta": { "family": "NEREIDAE", "source": "Author (year)", "type": "genera_key" },
  "1": {
    "step": "1",
    "optionA": { "text": "Peristomium forms a large ventral collar", "goTo": null, "result": "Cheilonereis" },
    "optionB": { "text": "Peristomium not ventrally enlarged", "goTo": "2", "result": null }
  },
  "2": {
    "step": "2",
    "optionA": { "text": "Some notopodia with pectinate branchiae", "goTo": null, "result": "Dendronereis" },
    "optionB": { "text": "Branchiae absent", "goTo": "3", "result": null }
  }
}
```

The `_meta` field is optional but recommended for provenance.

---

## Step 4 — Test Your Key

```bash
cd setae.js
npm install
npm run dev
```

Open the URL shown (typically `http://localhost:5173`). Your new key should appear in the selector. Click through every branch to verify:
- All `goTo` references point to existing steps
- Every path eventually reaches a `result` (no infinite loops)
- Glossary terms highlight correctly
- Language toggle switches between EN/ES versions

### Common mistakes

| Problem | Likely cause |
|---------|-------------|
| Key doesn't appear in selector | Missing entry in `src/data/keys/index.json`, or `id` doesn't match folder name |
| "Error: Step not found" | A `goTo` references a step number that doesn't exist in the file |
| Clicking A/B does nothing | Both `goTo` and `result` are null, or both are set — exactly one must be non-null |
| Glossary terms not highlighting | Term too short (<3 chars), or plural form in parentheses doesn't match the text |
| Language toggle does nothing | Missing `key_{lang}.json` file for the selected language |

---

## Features

- **Key Selector** — Choose which key to use on launch
- **Dichotomous Key** — Step-by-step A/B choices with breadcrumb back-navigation
- **Taxa List** — Alphabetical index of all taxa, searchable by name or morphological trait
- **Glossary Tooltips** — Morphological terms auto-highlighted with definitions (per-key)
- **Bilingual** — Full English (`en`) and Spanish (`es`) support per key
- **Depth Meter** — Visual progress indicator as you descend the key
- **Dark/Light Theme** — Toggle in header
- **Per-Key Features** — iNaturalist images, WoRMS validation, genus sub-keys (opt-in per key)
- **Fully Data-Driven** — Adding a new key = one folder + one registry entry. No code changes.

## Development

```bash
npm install
npm run dev       # Start dev server with HMR (hot reload)
npm run build     # Production build → dist/
npm run preview   # Preview production build
```

## Tech Stack

- React 19 + Vite 8
- `import.meta.glob` for automatic key file discovery
- iNaturalist API · WoRMS API (per-key, opt-in)

## Deployment

GitHub Actions auto-deploys to GitHub Pages on every push to `main`/`master`.

`.github/workflows/deploy.yml` builds the Vite project and publishes `dist/` via `actions/deploy-pages`.

## License

MIT
