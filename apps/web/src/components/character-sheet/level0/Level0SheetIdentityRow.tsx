import { Box, MenuItem, Select } from '@mui/material';
import {
  CHARACTER_RACES,
  raceLabel,
  type CharacterRace,
} from '@dcc-web/shared';
import type { Level0SheetData } from '../../../utils/character-sheet';
import { SheetField } from '../SheetField';
import {
  armorSelectSx,
  FieldBox,
  patchSheet,
  SectionLabel,
  SheetText,
} from '../sheet-primitives';

interface Level0SheetIdentityRowProps {
  data: Level0SheetData;
  editing?: boolean;
  onChange?: (data: Level0SheetData) => void;
}

export function Level0SheetIdentityRow({
  data,
  editing = false,
  onChange,
}: Level0SheetIdentityRowProps) {
  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 2, alignItems: 'flex-end' }}>
      <Box sx={{ flex: '1 1 280px' }}>
        <SectionLabel>Name:</SectionLabel>
        {editing ? (
          <SheetField
            sx={{ mt: 0.5 }}
            value={data.name}
            onChange={(e) => patchSheet(data, onChange, { name: e.target.value })}
          />
        ) : (
          <FieldBox sx={{ mt: 0.5, minHeight: 36 }}>
            <SheetText sx={{ fontWeight: 700, fontSize: '1.1rem' }}>{data.name}</SheetText>
          </FieldBox>
        )}
      </Box>
      {data.level === 0 && (
        <Box sx={{ flex: '0 1 140px' }}>
          <SectionLabel>Race:</SectionLabel>
          {editing ? (
            <Select
              fullWidth
              size="small"
              value={data.race}
              onChange={(e) =>
                patchSheet(data, onChange, { race: e.target.value as CharacterRace })
              }
              sx={{ ...armorSelectSx, mt: 0.5 }}
            >
              {CHARACTER_RACES.map((r) => (
                <MenuItem key={r} value={r}>
                  {raceLabel(r)}
                </MenuItem>
              ))}
            </Select>
          ) : (
            <FieldBox sx={{ mt: 0.5 }}>
              <SheetText sx={{ fontWeight: 600 }}>{raceLabel(data.race)}</SheetText>
            </FieldBox>
          )}
        </Box>
      )}
      <Box sx={{ flex: '1 1 200px' }}>
        <SectionLabel>Occupation:</SectionLabel>
        {editing ? (
          <SheetField
            sx={{ mt: 0.5 }}
            value={data.occupation}
            onChange={(e) => patchSheet(data, onChange, { occupation: e.target.value })}
          />
        ) : (
          <FieldBox sx={{ mt: 0.5 }}>
            <SheetText sx={{ fontWeight: 600 }}>{data.occupation}</SheetText>
          </FieldBox>
        )}
        <Box sx={{ mt: 1 }}>
          <SectionLabel>Alignment:</SectionLabel>
          {editing ? (
            <SheetField
              select
              sx={{ mt: 0.5 }}
              value={data.alignment || ''}
              onChange={(e) => patchSheet(data, onChange, { alignment: e.target.value })}
            >
              <MenuItem value="">—</MenuItem>
              <MenuItem value="Law">Law</MenuItem>
              <MenuItem value="Neutral">Neutral</MenuItem>
              <MenuItem value="Chaos">Chaos</MenuItem>
            </SheetField>
          ) : (
            <FieldBox sx={{ mt: 0.5 }}>
              <SheetText sx={{ fontWeight: 600 }}>{data.alignment || '—'}</SheetText>
            </FieldBox>
          )}
        </Box>
      </Box>
      {data.isDead && (
        <SheetText
          sx={{
            fontWeight: 800,
            color: '#7a1f1f',
            border: '2px solid #7a1f1f',
            px: 1,
            py: 0.25,
            display: 'inline-block',
          }}
        >
          DECEASED
        </SheetText>
      )}
    </Box>
  );
}
