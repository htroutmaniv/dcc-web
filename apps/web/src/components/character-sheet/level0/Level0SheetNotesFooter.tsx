import { Box } from '@mui/material';
import type { Level0SheetData } from '../../../utils/character-sheet';
import { SheetField } from '../SheetField';
import { sheetColors } from '../sheet-theme';
import { patchSheet, SectionLabel, SheetText } from '../sheet-primitives';

interface Level0SheetNotesFooterProps {
  data: Level0SheetData;
  editing?: boolean;
  onChange?: (data: Level0SheetData) => void;
}

export function Level0SheetNotesFooter({
  data,
  editing = false,
  onChange,
}: Level0SheetNotesFooterProps) {
  return (
    <>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: '4fr 1fr' },
          gap: 0,
          mt: 2,
          border: `2px solid ${sheetColors.border}`,
          borderRadius: 1,
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            p: 1.5,
            bgcolor: sheetColors.paper,
            borderRight: { sm: `2px solid ${sheetColors.border}` },
          }}
        >
          <SectionLabel>Notes</SectionLabel>
          {editing ? (
            <SheetField
              multiline
              minRows={4}
              sx={{ mt: 0.5 }}
              value={data.notes}
              onChange={(e) => patchSheet(data, onChange, { notes: e.target.value })}
            />
          ) : (
            <SheetText
              component="pre"
              sx={{
                mt: 0.5,
                fontSize: '0.85rem',
                fontWeight: 600,
                whiteSpace: 'pre-wrap',
                display: 'block',
              }}
            >
              {data.notes || '—'}
            </SheetText>
          )}
        </Box>
        <Box sx={{ p: 1.5, bgcolor: sheetColors.paperDark }}>
          <SectionLabel>XP</SectionLabel>
          {editing ? (
            <SheetField
              sx={{ mt: 0.5 }}
              value={data.xp}
              onChange={(e) => patchSheet(data, onChange, { xp: e.target.value })}
            />
          ) : (
            <SheetText
              sx={{
                mt: 0.5,
                fontWeight: 600,
                minHeight: 48,
                color: sheetColors.inkMuted,
                display: 'block',
              }}
            >
              {data.xp || ' '}
            </SheetText>
          )}
        </Box>
      </Box>

      <SheetText
        sx={{
          textAlign: 'center',
          mt: 1,
          fontSize: '0.75rem',
          color: sheetColors.inkMuted,
          fontWeight: 600,
          display: 'block',
        }}
      >
        Level {data.level} · {data.status}
        {editing ? ' · editing' : ''}
      </SheetText>
    </>
  );
}
