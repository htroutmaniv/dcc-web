import { Box } from '@mui/material';
import { sheetColors, sheetFont } from './sheet-theme';
import type { Level0SheetData } from '../../utils/character-sheet';

export function FieldBox({
  children,
  sx,
}: {
  children: React.ReactNode;
  sx?: object;
}) {
  return (
    <Box
      sx={{
        bgcolor: sheetColors.field,
        color: sheetColors.fieldText,
        border: `2px solid ${sheetColors.border}`,
        borderRadius: 1,
        px: 1,
        py: 0.5,
        minHeight: 28,
        display: 'flex',
        alignItems: 'center',
        ...sx,
      }}
    >
      {children}
    </Box>
  );
}

export function SheetText({
  children,
  sx,
  component,
}: {
  children: React.ReactNode;
  sx?: object;
  component?: React.ElementType;
}) {
  const Comp = component ?? 'span';
  return (
    <Box
      component={Comp}
      sx={{
        color: sheetColors.ink,
        fontFamily: sheetFont.label,
        m: 0,
        ...sx,
      }}
    >
      {children}
    </Box>
  );
}

export function SectionLabel({
  children,
  sx,
}: {
  children: React.ReactNode;
  sx?: object;
}) {
  return (
    <SheetText
      sx={{
        fontWeight: 800,
        fontSize: '0.95rem',
        lineHeight: 1.1,
        display: 'block',
        ...sx,
      }}
    >
      {children}
    </SheetText>
  );
}

export function patchSheet(
  data: Level0SheetData,
  onChange: ((d: Level0SheetData) => void) | undefined,
  partial: Partial<Level0SheetData>,
) {
  onChange?.({ ...data, ...partial });
}

export const armorSelectSx = {
  bgcolor: sheetColors.field,
  color: sheetColors.ink,
  fontFamily: sheetFont.label,
  fontWeight: 700,
  '& .MuiOutlinedInput-notchedOutline': {
    borderColor: sheetColors.border,
    borderWidth: 2,
  },
  '& .MuiSelect-icon': { color: sheetColors.ink },
};
