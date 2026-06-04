# UI screens (MUI)

## Global layout

- **AppBar** — logo, active game selector (DM), user menu
- **Nav drawer** — Games | Characters | Map | Import | Settings
- **Theme** — `createTheme({ palette: { mode: 'dark' }, ... })` with gold/ember primary for DCC tone

## DM: Game lobby

- DataGrid or list: game title, player count, last updated, **Open** / **Archive**
- FAB: **New game** → dialog (title) → shows invite code + copy link
- **Switch game** updates global `GameContext` and refetches scoped data

## Player: Join

- Route `/join/:inviteCode` — if not logged in, register/login then auto-join
- Landing shows game title + DM name + **Enter session**

## Character list

| Viewer | Content |
|--------|---------|
| DM | All PCs in game; badges for player name; quick HP/AC |
| Player | Only own characters; **New character** / **Import** |

## Character sheet (split view)

**Left column — Core**

- Name, class, level, alignment, portrait upload
- Ability scores table with auto modifiers
- Saves, AC, HP (max/current/temp), speed, initiative
- Attack wizard (weapons from inventory)

**Right column — Tabs (MUI Tabs)**

1. **Weapons** — table: name, damage, properties, quantity
2. **Armor** — AC, check penalty, etc.
3. **Treasure** — coins, gems
4. **Misc** — gear, tools
5. **Disposables** — torches, rations, liquids; quantity + uses
6. **Notes** — free text

- DM: dropdown to jump between any character (read-only or edit per game setting)
- Player: character switcher only among own

## Map workspace (DM-primary)

```
┌─────────────────────────────────────────────────────────┐
│ Toolbar: upload | draw | grid | snap | token | radius  │
├──────────────────────────────┬──────────────────────────┤
│                              │ Token list               │
│   Konva Stage (map image)    │ - PC (linked char)       │
│   - grid overlay             │ - NPC                    │
│   - tokens draggable         │ - objects                │
│   - radius circle on select  │                          │
│                              │ Selected: speed 30ft     │
│                              │ [Show movement]          │
└──────────────────────────────┴──────────────────────────┘
```

- **Upload** — dropzone → preview → set grid scale
- **Draw** — pen/highlighter layers in `dm_drawings` (DM only)
- **Movement radius** — circle centered on token, radius = `movement_ft` or character speed; toggle ft vs cells
- **Player view** — same canvas without draw/upload; optional drag own token

## Import wizard (Purple Sorcerer)

1. Choose game (if DM importing for player, select target player)
2. Upload JSON/CSV
3. Preview table with validation warnings
4. Confirm import → navigate to new character sheet

## Real-time indicators

- Snackbar on remote edit: “DM updated your HP”
- Presence chips in AppBar for connected players
- Optional: field-level highlight flash on `character:updated`
