import { Box, MenuItem, Select } from '@mui/material';
import {
  armorStatsFromEntry,
  formatDefenseLines,
  formatPieceStatLines,
  NO_EQUIP_ID,
} from '../../../utils/armor';
import type { Level0SheetData } from '../../../utils/character-sheet';
import { SheetField } from '../SheetField';
import { sheetColors, sheetFont } from '../sheet-theme';
import { armorSelectSx, FieldBox, SectionLabel, SheetText } from '../sheet-primitives';

interface Level0SheetCombatColumnProps {
  data: Level0SheetData;
  editing?: boolean;
  onChange?: (data: Level0SheetData) => void;
  onSelectWeapon?: (weaponId: string) => void;
  onSelectArmor?: (armorId: string) => void;
  onSelectShield?: (shieldId: string) => void;
}

export function Level0SheetCombatColumn({
  data,
  editing = false,
  onChange,
  onSelectWeapon,
  onSelectArmor,
  onSelectShield,
}: Level0SheetCombatColumnProps) {
  const agiMod = data.abilities.find((a) => a.key === 'agi')?.mod ?? 0;
  const activeArmor = data.armorEntries.find((a) => a.id === data.selectedArmorId);
  const activeShield = data.shieldEntries.find((s) => s.id === data.selectedShieldId);
  const bodyStats = armorStatsFromEntry(activeArmor);
  const shieldStats = armorStatsFromEntry(activeShield);
  const defenseLines = formatDefenseLines({
    agiMod,
    ac: data.ac,
    baseSpeed: data.baseSpeed,
    speed: data.speed,
    body: bodyStats,
    shield: shieldStats,
  });
  const activeWeapon =
    data.weaponEntries.find((w) => w.id === data.selectedWeaponId) ??
    data.weaponEntries[0];
  const weaponSlots = [...data.weapons];
  while (weaponSlots.length < 3) weaponSlots.push('');

  const selectArmorValue = data.selectedArmorId ?? NO_EQUIP_ID;
  const selectShieldValue = data.selectedShieldId ?? NO_EQUIP_ID;

  return (
    <Box>
      <SectionLabel>Weapon</SectionLabel>
      {!editing && data.weaponEntries.length > 0 && (
        <Box sx={{ mt: 0.5, mb: 1 }}>
          <Select
            size="small"
            fullWidth
            value={data.selectedWeaponId ?? data.weaponEntries[0]!.id}
            onChange={(e) => onSelectWeapon?.(e.target.value)}
            sx={{
              bgcolor: sheetColors.field,
              color: sheetColors.ink,
              fontFamily: sheetFont.label,
              fontWeight: 700,
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: sheetColors.border,
                borderWidth: 2,
              },
              '& .MuiSelect-icon': { color: sheetColors.ink },
            }}
          >
            {data.weaponEntries.map((w) => (
              <MenuItem key={w.id} value={w.id}>
                {w.label}
              </MenuItem>
            ))}
          </Select>
          {activeWeapon && (
            <SheetText
              sx={{ mt: 0.75, fontSize: '0.8rem', display: 'block', opacity: 0.9 }}
            >
              To hit: 1d20
              {activeWeapon.attackBonus >= 0 ? '+' : ''}
              {activeWeapon.attackBonus} · Damage: {activeWeapon.damage}
            </SheetText>
          )}
        </Box>
      )}
      {!editing && data.weaponEntries.length === 0 && (
        <SheetText sx={{ mt: 0.5, mb: 1, fontStyle: 'italic', display: 'block' }}>
          No weapons
        </SheetText>
      )}
      {editing && (
        <SheetText sx={{ fontSize: '0.75rem', mb: 0.5, display: 'block', opacity: 0.85 }}>
          Other weapons (edit lines)
        </SheetText>
      )}
      <Box sx={{ mt: 0.5, display: 'flex', flexDirection: 'column', gap: 0.75 }}>
        {weaponSlots.map((w, i) =>
          editing ? (
            <SheetField
              key={i}
              placeholder="Weapon name + bonus (damage)"
              value={w}
              onChange={(e) => {
                const weapons = [...weaponSlots];
                weapons[i] = e.target.value;
                onChange?.({ ...data, weapons });
              }}
            />
          ) : (
            i > 0 && (
              <Box
                key={i}
                sx={{
                  border: `2px solid ${sheetColors.border}`,
                  borderRadius: 1,
                  minHeight: 28,
                  px: 1,
                  display: w?.trim() ? 'flex' : 'none',
                  alignItems: 'center',
                  bgcolor: sheetColors.field,
                  color: sheetColors.fieldText,
                }}
              >
                <SheetText sx={{ fontWeight: 600, fontSize: '0.85rem', color: 'inherit' }}>
                  {w?.trim()}
                </SheetText>
              </Box>
            )
          ),
        )}
      </Box>

      <SectionLabel sx={{ mt: 1.5 }}>Armor</SectionLabel>
      <Box sx={{ mt: 0.5, mb: 1 }}>
        <Select
          size="small"
          fullWidth
          disabled={editing}
          displayEmpty
          value={selectArmorValue}
          onChange={(e) => onSelectArmor?.(e.target.value)}
          sx={armorSelectSx}
        >
          <MenuItem value={NO_EQUIP_ID}>No armor</MenuItem>
          {data.armorEntries.map((a) => (
            <MenuItem key={a.id} value={a.id}>
              {a.name}
            </MenuItem>
          ))}
        </Select>
        {activeArmor && (
          <Box sx={{ mt: 0.5, pl: 0.5 }}>
            {formatPieceStatLines(activeArmor).map((line) => (
              <SheetText
                key={line}
                sx={{ fontSize: '0.72rem', display: 'block', opacity: 0.88, lineHeight: 1.35 }}
              >
                {line}
              </SheetText>
            ))}
          </Box>
        )}
      </Box>

      <SectionLabel>Shield</SectionLabel>
      <Box sx={{ mt: 0.5, mb: 1 }}>
        <Select
          size="small"
          fullWidth
          disabled={editing}
          displayEmpty
          value={selectShieldValue}
          onChange={(e) => onSelectShield?.(e.target.value)}
          sx={armorSelectSx}
        >
          <MenuItem value={NO_EQUIP_ID}>No shield</MenuItem>
          {data.shieldEntries.map((s) => (
            <MenuItem key={s.id} value={s.id}>
              {s.name}
            </MenuItem>
          ))}
        </Select>
        {activeShield && (
          <Box sx={{ mt: 0.5, pl: 0.5 }}>
            {formatPieceStatLines(activeShield).map((line) => (
              <SheetText
                key={line}
                sx={{ fontSize: '0.72rem', display: 'block', opacity: 0.88, lineHeight: 1.35 }}
              >
                {line}
              </SheetText>
            ))}
          </Box>
        )}
      </Box>

      <SectionLabel sx={{ mt: 0.5 }}>Defense total</SectionLabel>
      <FieldBox
        sx={{
          mt: 0.5,
          flexDirection: 'column',
          alignItems: 'flex-start',
          py: 0.75,
          gap: 0.25,
        }}
      >
        {defenseLines.map((line) => (
          <SheetText
            key={line}
            sx={{ fontSize: '0.78rem', fontWeight: 600, display: 'block', lineHeight: 1.4 }}
          >
            {line}
          </SheetText>
        ))}
      </FieldBox>
    </Box>
  );
}
