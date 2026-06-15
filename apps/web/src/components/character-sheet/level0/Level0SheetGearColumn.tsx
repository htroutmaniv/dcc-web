import { Box, Button, Stack } from '@mui/material';
import InventoryIcon from '@mui/icons-material/Inventory';
import { deriveArmorOnSheet } from '../../../utils/armor';
import type { Level0SheetData } from '../../../utils/character-sheet';
import { SheetField } from '../SheetField';
import { sheetColors, sheetFont } from '../sheet-theme';
import { FieldBox, patchSheet, SectionLabel, SheetText } from '../sheet-primitives';

interface Level0SheetGearColumnProps {
  data: Level0SheetData;
  editing?: boolean;
  onChange?: (data: Level0SheetData) => void;
  onOpenEquipment?: () => void;
}

export function Level0SheetGearColumn({
  data,
  editing = false,
  onChange,
  onOpenEquipment,
}: Level0SheetGearColumnProps) {
  const activeArmor = data.armorEntries.find((a) => a.id === data.selectedArmorId);

  return (
    <Box>
      <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
        <Box sx={{ flex: 1 }}>
          <SectionLabel>Speed</SectionLabel>
          {editing ? (
            <SheetField
              type="number"
              sx={{ mt: 0.5 }}
              value={data.baseSpeed}
              onChange={(e) => {
                const baseSpeed = Number.parseInt(e.target.value, 10) || 0;
                const { speed } = deriveArmorOnSheet({ ...data, baseSpeed });
                patchSheet(data, onChange, { baseSpeed, speed });
              }}
            />
          ) : (
            <FieldBox sx={{ mt: 0.5, justifyContent: 'center' }}>
              <SheetText sx={{ fontWeight: 800 }}>{data.speed}</SheetText>
            </FieldBox>
          )}
          {activeArmor?.speedPenalty ? (
            <SheetText sx={{ fontSize: '0.7rem', mt: 0.25, display: 'block', opacity: 0.85 }}>
              Base {data.baseSpeed}
              {activeArmor.speedPenalty >= 0 ? '+' : ''}
              {activeArmor.speedPenalty} armor
            </SheetText>
          ) : null}
        </Box>
        <Box sx={{ flex: 1 }}>
          <SectionLabel>Init</SectionLabel>
          {editing ? (
            <SheetField
              type="number"
              sx={{ mt: 0.5 }}
              value={data.init}
              onChange={(e) =>
                patchSheet(data, onChange, { init: Number.parseInt(e.target.value, 10) || 0 })
              }
            />
          ) : (
            <FieldBox sx={{ mt: 0.5, justifyContent: 'center' }}>
              <SheetText sx={{ fontWeight: 800 }}>{data.init}</SheetText>
            </FieldBox>
          )}
        </Box>
      </Box>

      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ gap: 1 }}>
        <SectionLabel>Equipment</SectionLabel>
        <Button
          size="small"
          variant="outlined"
          startIcon={<InventoryIcon />}
          onClick={onOpenEquipment}
          sx={{
            color: sheetColors.ink,
            borderColor: sheetColors.border,
            fontFamily: sheetFont.label,
            fontWeight: 700,
          }}
        >
          Manage
        </Button>
      </Stack>
      <FieldBox
        sx={{
          mt: 0.5,
          minHeight: 120,
          flexDirection: 'column',
          alignItems: 'flex-start',
        }}
      >
        {data.equipment.filter((l) => l.trim()).length === 0 ? (
          <SheetText sx={{ fontSize: '0.9rem', fontStyle: 'italic' }}>
            Open Manage to add armor, consumables, and gear.
          </SheetText>
        ) : (
          data.equipment
            .filter((l) => l.trim())
            .map((line, i) => (
              <SheetText key={i} sx={{ fontSize: '0.9rem', fontWeight: 600, lineHeight: 1.5 }}>
                • {line.replace(/^•\s*/, '')}
              </SheetText>
            ))
        )}
      </FieldBox>
    </Box>
  );
}
