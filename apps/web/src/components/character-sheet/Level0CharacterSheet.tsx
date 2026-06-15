import { Box } from '@mui/material';
import type { Level0SheetData } from '../../utils/character-sheet';
import { sheetColors, sheetRootSx } from './sheet-theme';
import { Level0SheetIdentityRow } from './level0/Level0SheetIdentityRow';
import { Level0SheetStatsColumn } from './level0/Level0SheetStatsColumn';
import { Level0SheetCombatColumn } from './level0/Level0SheetCombatColumn';
import { Level0SheetGearColumn } from './level0/Level0SheetGearColumn';
import { Level0SheetNotesFooter } from './level0/Level0SheetNotesFooter';

interface Level0CharacterSheetProps {
  data: Level0SheetData;
  editing?: boolean;
  onChange?: (data: Level0SheetData) => void;
  onSelectWeapon?: (weaponId: string) => void;
  onSelectArmor?: (armorId: string) => void;
  onSelectShield?: (shieldId: string) => void;
  onOpenEquipment?: () => void;
  canEditHp?: boolean;
  onPatchHp?: (hpCurrent: number) => void;
  hpAdjusting?: boolean;
}

export function Level0CharacterSheet({
  data,
  editing = false,
  onChange,
  onSelectWeapon,
  onSelectArmor,
  onSelectShield,
  onOpenEquipment,
  canEditHp = false,
  onPatchHp,
  hpAdjusting = false,
}: Level0CharacterSheetProps) {
  return (
    <Box
      sx={{
        ...sheetRootSx,
        border: `4px solid ${editing ? sheetColors.accent : sheetColors.border}`,
        borderRadius: 0.5,
        p: { xs: 1.5, sm: 2 },
        maxWidth: 960,
        width: '100%',
        mx: 'auto',
        opacity: data.isDead ? 0.85 : 1,
        filter: data.isDead ? 'grayscale(0.35)' : 'none',
        boxShadow: '0 6px 28px rgba(0,0,0,0.45)',
      }}
    >
      <Level0SheetIdentityRow data={data} editing={editing} onChange={onChange} />

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '200px 1fr 200px' },
          gap: 2,
        }}
      >
        <Level0SheetStatsColumn
          data={data}
          editing={editing}
          onChange={onChange}
          canEditHp={canEditHp}
          onPatchHp={onPatchHp}
          hpAdjusting={hpAdjusting}
        />
        <Level0SheetCombatColumn
          data={data}
          editing={editing}
          onChange={onChange}
          onSelectWeapon={onSelectWeapon}
          onSelectArmor={onSelectArmor}
          onSelectShield={onSelectShield}
        />
        <Level0SheetGearColumn
          data={data}
          editing={editing}
          onChange={onChange}
          onOpenEquipment={onOpenEquipment}
        />
      </Box>

      <Level0SheetNotesFooter data={data} editing={editing} onChange={onChange} />
    </Box>
  );
}
