# Setae.js Character Trait Database - Status

## Summary
- **Version:** 3.0
- **Generated:** 2026-05-07
- **Families profiled:** 79
- **Genera profiled:** 836
- **Unique characters:** 210
- **Avg traits per genus:** 4.3

## Files
| File | Size | Description |
|------|------|-------------|
| `src/data/traits/character_traits.json` | 496KB | Master trait database |
| `src/data/traits/genus_traits.json` | 802KB | Raw path traces per genus |
| `src/data/traits/family_traits.json` | 255KB | Raw path traces per family |
| `scripts/parse_traits_v3.py` | 20KB | Trait extraction pipeline |

## What Was Built

### 1. Genera Keys (65 families, ~840 genera)
All 65 families from Fauchald (1977) have been traced into JSON dichotomous keys:
- Each key has numbered steps with A/B choices
- Each choice either leads to a genus result or another step
- Keys range from 1 step (simple families) to 93 steps (POLYNOIDAE)
- Total: ~2,100 step descriptions, ~840 genus results

### 2. Path Tracing
A Python script traces every path through each key:
- Starts at step 1, follows all A/B branches
- Collects the ordered list of descriptions leading to each genus
- Handles multiple paths to the same genus (alternative routes)
- Output: `genus_traits.json` (path per genus) + `family_traits.json` (path per family)

### 3. Character Extraction (210 characters)
Rule-based parser extracts structured traits from description text:
- **50% coverage** — ~800/1,574 descriptions produce structured traits
- **210 characters** identified (branchiae, antennae, parapodia, setae types, etc.)
- Characters typed as boolean, integer, or string
- Remaining ~776 descriptions stored as raw `_notes` text

## Characters Inventory (210 total)

Key character groups:
- **Branchiae:** present/absent, pairs, type, start segment, membrane
- **Elytrae:** present/absent, pairs, pseudelytrae
- **Antennae:** count, median/lateral, frontal
- **Palps:** presence/absence, fusion
- **Tentacular cirri:** pairs, presence, articulation
- **Prostomium:** shape, features (ridges, horns)
- **Caruncle:** presence, type
- **Parapodia:** type (uniramous/biramous), notopodia, neuropodia
- **Dorsal/Ventral cirri:** presence, type
- **Body:** shape, features (mucus sheath, papillae)
- **Setae:** type (simple/composite), neurosetae type, notosetae type
- **Uncini:** presence, row arrangement, start position
- **Hooks:** presence, bidentate/unidentate
- **Pharynx:** armature (jaws, papillae, teeth), presence
- **Eyes:** presence, size
- **Collar:** presence, development
- **Operculum:** presence, stalk, cap
- **Tube:** type (calcareous, free, coiled)
- **Radioles:** arrangement
- **Plus 140+ `has_*` generic traits** from simple present/absent patterns

## Data Format

```json
{
  "version": "3.0",
  "characters": {
    "branchiae_pairs": {
      "type": "integer",
      "values": [1, 2, 3, 4],
      "examples": ["Two pairs of branchiae", "Four pairs of branchiae"]
    }
  },
  "genera": {
    "Eunice": {
      "family": "EUNICIDAE",
      "traits": {
        "antennae": "present",
        "tentacular_cirri": "present",
        "hooks": "present",
        "setae_type": "composite_falcigers"
      }
    }
  }
}
```

## Next Steps
- **UI:** Build a character selector with toggles (branchiae yes/no, antennae count picker, etc.)
- **Coverage:** Manual categorization of remaining ~776 `_notes` descriptions
- **Validation:** Cross-check generated traits against actual taxonomy
