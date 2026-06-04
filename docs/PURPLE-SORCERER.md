# Purple Sorcerer integration

## Summary

**Purple Sorcerer does not publish a public HTTP API** for programmatic character generation. Their [Character Generators: Style Descriptions](https://purplesorcerer.com/styles.php) page documents export **styles**, including **CSV** and **JSON** formats intended for further processing — not live API calls.

Recommended approach for DCC Web: **import pipeline**, not remote generation.

## User workflow (MVP)

1. Player or DM generates characters on [0-Level Party Generator](https://purplesorcerer.com/create_party.php) or [Upper Level Character Generator](https://purplesorcerer.com/create_upper.php).
2. In the generator UI, choose output style: **JSON List** or **CSV Spreadsheet** (per campaign/style docs).
3. In DCC Web: **Import → Purple Sorcerer** → upload file.
4. Review mapping preview → confirm → create `characters` row(s) with `source = purple_sorcerer` and `source_payload` retained.

## Implementation components

### 1. Parsers (`packages/shared` or `apps/api/src/import/purple-sorcerer`)

| Format | Library | Notes |
|--------|---------|-------|
| JSON | Native `JSON.parse` | Expect array of character objects; schema varies by style — version detect header keys |
| CSV | `papaparse` | Map columns via configurable dictionary per PS style version |

### 2. Normalizer

Map PS fields → internal `Character` + `character_items`:

| PS (typical) | Internal |
|--------------|----------|
| Name, Class, Level | `name`, `class_name`, `level` |
| STR, AGI, … | `stats.abilities` |
| HP, AC | `combat` |
| Weapons / gear text blocks | Split into `character_items` rows heuristically |
| Unmapped fields | `source_payload` + optional `stats.custom` |

### 3. Mapping profiles

Store JSON mapping profiles in repo, e.g. `import-maps/ps-json-v1.json`, updated when Purple Sorcerer changes export shape. Log unknown keys for maintainer review.

### 4. Legal / etiquette

- Credit Purple Sorcerer in UI (“Import from Purple Sorcerer export”).
- Do not scrape their generators server-side without permission.
- Goodman Games / DCC RPG trademarks — follow fan tool guidelines.

## Future enhancements (no API dependency)

| Feature | Approach |
|---------|----------|
| “Generate-like” native wizard | Reimplement simplified DCC rollers in-app (dice + tables) |
| Clipboard paste | Parse JSON from clipboard if users copy export text |
| PDF import | Low priority; OCR/heavy — avoid for MVP |

## Acceptance criteria (Phase 4)

- [ ] Upload JSON export creates one or more characters in selected game
- [ ] Upload CSV export with detected profile maps ≥ 90% core stats
- [ ] Raw file preserved in `source_payload` for debugging
- [ ] Import errors show row/character index and field name

## Research tasks before coding

1. Capture **sample JSON and CSV** exports for 0-level and upper-level characters (same campaign style).
2. Document exact key names per style in `docs/samples/purple-sorcerer/` (gitignore large dumps if needed).
3. Contact Purple Sorcerer only if you need partnership/API — not required for import-based MVP.
