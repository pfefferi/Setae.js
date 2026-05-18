# Taxonomic Key Data

Each subfolder here is a **self-contained taxonomic key**. The app discovers them
automatically at build time — no code changes needed to add a new key.

## Structure of a key folder

```
{key-id}/
├── key_en.json         ← Key data in English
├── key_es.json         ← Key data in Spanish
├── glossary.json       ← Term definitions (auto-highlighted in UI)
├── genera_keys/        ← Genus-level sub-keys (optional)
└── traits/             ← Trait data (optional, for advanced features)
```

## How to add a new key

1. **Create a folder** here with your key ID (e.g. `my-new-key/`)
2. **Add `key_es.json`** (and/or `key_en.json`) with the dichotomous key
3. **Register it** in `index.json` (one level up from this file)

See the main README at the project root for the complete guide with
format specifications, examples, and troubleshooting.

## Existing keys

| Folder | Description |
|--------|-------------|
| `ant-genera-pampas/` | Ant genera of Pampas & Espinal (Argentina) — 19 steps, 15 genera |
| `polychaete-fauchald/` | Marine polychaete families (Fauchald 1977) — 70+ families, with genus sub-keys |
