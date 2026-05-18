# Genus Descriptions — Progress & Next Steps

## What was done

Built a `descriptions.json` in the ant key folder with Wikipedia-sourced
descriptions for 11 of the 20 ant genera. Also added result card display
and AntWiki/AntWeb links (already on master).

## Current status

### ✅ Descriptions obtained (11/20)

| Genus | Source |
|-------|--------|
| Acromyrmex, Brachymyrmex, Cephalotes, Crematogaster | Wikipedia (delay=300ms) |
| Cyphomyrmex, Dorymyrmex, Gnamptogenys, Hypoponera | Wikipedia (delay=300ms) |
| Linepithema, Myrmelachista, Nylanderia | Wikipedia (delay=2000ms) |
| Pachycondyla, Pheidole, Pogonomyrmex, Pseudomyrmex | Wikipedia (delay=2000ms) |
| Solenopsis | Wikipedia (disambiguation — needs cleaning) |
| Strumigenys, Wasmannia | Wikipedia (delay=10000ms, retry) |

### ❌ Still needed (3/20)

| Genus | Issue | Suggested approach |
|-------|-------|-------------------|
| Camponotus | Wikipedia page has no extract | Try `Camponotus (ant)` as title, or use AntWiki directly |
| Mycetomoellerius | New genus (split 2017), no Wikipedia page | AntWiki only |
| Solenopsis | Disambiguation (ant vs plant) | Parse just the ant paragraph, or use AntWiki |

## How descriptions display

Descriptions would show on the result card (after identifying a genus)
in an info box below the image and above the AntWiki/AntWeb links.
Check `feat/genus-descriptions` branch for the App.jsx changes needed.

## Next steps to complete

1. Get Camponotus, Mycetomoellerius, and clean Solenopsis
2. Try AntWiki via Puppeteer in GitHub Actions for the remaining gaps
3. Wire up descriptions display in App.jsx (already partially built)
4. Optionally add common names and subfamily info to the descriptions JSON

## API access notes

| Source | Cloudflare? | Works from Node? | Notes |
|--------|-------------|-----------------|-------|
| Wikipedia API | No | Yes | Rate limit: ~1 req/300ms |
| AntWeb | Yes | No | Blocked everywhere |
| AntWiki | Yes | No | Blocked everywhere |
| AntCat | Yes | No | Blocked everywhere |
| GBIF | No | Partial | Genus-level taxonomy unreliable |
