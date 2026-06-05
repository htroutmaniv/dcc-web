# Character creation (DCC rules)

All random rolls run on the **API** with cryptographically secure RNG (`secureRandomInt`). Clients send options only; they never supply rolled values.

## UI flow

**Add character** opens a dialog:

| Mode | Behavior |
|------|----------|
| **Random** | Server rolls abilities, occupation/class, HP, gear, lucky sign, etc. |
| **Manual** | Blank sheet (10s in all abilities, minimal HP); player/DM edits in the app |

Shared options:

- **Level** 0–10 (0 = funnel peasant)
- **Class** (level 1+): pick a class or leave empty for random (random mode only)
- **Race filters** (random only): exclude elf, dwarf, and halfling funnel occupations and racial classes

Implementation: `POST /games/:gameId/characters` with `createCharacterSchema` (`packages/shared`).

## Random generation — 0-level (funnel)

Aligned with the **DCC RPG funnel** (core rulebook 0-level play):

### Ability scores

- Roll **3d6 in order** for STR, AGL, STA, PER, INT, LCK (stored as `str`, `agi`, `sta`, `per`, `int`, `lck`).
- Modifiers use the standard DCC table (−3 at 3 … +3 at 18+).

### Occupation

- Roll **d100** on the funnel occupation table (`apps/api/src/data/funnel-occupations.ts`).
- Matching entry must fall in that row’s `rollLow`–`rollHigh` range (re-roll up to 20 times if filters removed the row).
- **Race filters** drop occupations tagged `elf`, `dwarf`, or `halfling` (e.g. “Elven falconer”, “Dwarf”, “Halfling trader”).
- Occupation name is stored as `className` and `stats.custom.occupation`.
- Starting **weapon** and **trade goods** become `character_items` (weapon includes damage notation for combat rolls).

### Hit points

- **1d6 + STA modifier**, minimum 1.

### Armor class

- **10 + AGL modifier** (unarmored funnel default).

### Saves & initiative

Saves are computed in `packages/shared/src/dcc-saves.ts` and stored as `stats.saves` (`ref`, `frt`, `wil`).

**Level 0 (funnel):** total save = ability modifier only — Reflex (AGL), Fortitude (STA), Will (PER).

**Level 1+:** class bonus + ability modifier:

- **Good** save: +1 at 1st level, +1 more every 2 levels thereafter.
- **Poor** save: +0 at 1st level, +1 every 3 levels thereafter.
- **Dwarf** class: +2 flat Fortitude (class feature).

Good/poor by class: Warrior (Fort), Cleric (Fort/Will), Wizard (Will), Thief (Ref), Dwarf (Fort), Elf (Ref/Will), Halfling (Ref).

**Initiative** = AGL mod.

### Other

- **Alignment**: random Lawful / Neutral / Chaotic / Unaligned.
- **Starting funds**: 3d6 copper pieces (`stats.custom.startingFunds`).
- **Birth augur (lucky sign)**: d20 on `birth-augur.ts`, adjusted by **Luck modifier** to pick the sign; the permanent bonus on that roll type is the **Luck modifier at creation** (DCC core p.19), stored in `stats.custom.luckySign`.
- **Race**: `stats.custom.race` — `human`, `elf`, `dwarf`, or `halfling` (from occupation on random roll; editable on sheet).
- **Name**: `Funnel ###` until the player renames.

## Random generation — level 1+

Simplified until full class sheets exist:

- Same **3d6 in order** abilities and augur/alignment/funds as funnel.
- **Class**: chosen in the dialog, or random from `DCC_CHARACTER_CLASSES` after race filters.
- **HP**: one hit die roll per class + STA mod (Warrior d12, Cleric d8, Wizard d4, Thief d6, Dwarf d10, Elf d6, Halfling d6), minimum 1.
- **AC**: 10 + AGL mod.
- Placeholder weapon item until class gear tables are implemented.

Class-specific attack bonuses, deed dice, spells, and gear will be added in a later pass (`docs` / class modules).

## Manual creation

- All abilities **10** (+0 modifiers).
- **HP**: 1 at level 0; at level 1+ one hit die roll for the selected class with +0 STA (editable on sheet).
- **AC** 10 until edited.
- No items; empty occupation at level 0.
- `source = manual`.

## Code map

| Piece | Path |
|-------|------|
| Occupation table | `apps/api/src/data/funnel-occupations.ts` |
| Birth augur | `apps/api/src/data/birth-augur.ts` |
| Generator | `apps/api/src/services/character-generator.ts` |
| API route | `apps/api/src/routes/characters.ts` |
| Dialog | `apps/web/src/components/CreateCharacterDialog.tsx` |
| Class list / hit dice | `packages/shared/src/dcc-classes.ts` |

## Gaps vs. full DCC (planned)

- Not every core rulebook occupation row is in the table yet (subset with correct d100 ranges).
- Occupation **skill** bonuses and trained weapon rules are not applied automatically.
- Deity, spells, deed dice, armor, and class progressions for level 1+ are stubs.
- **Purple Sorcerer** import remains the path for fully authored third-party characters (`docs/PURPLE-SORCERER.md`).
