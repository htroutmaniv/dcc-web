import { Box, Stack } from '@mui/material';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined';
import { computeDccSaves, formatSaveModifier } from '@dcc-web/shared';
import { deriveArmorOnSheet } from '../../../utils/armor';
import { abilityModifier, type Level0SheetData } from '../../../utils/character-sheet';
import { SheetField } from '../SheetField';
import { sheetColors } from '../sheet-theme';
import { FieldBox, patchSheet, SectionLabel, SheetText } from '../sheet-primitives';

interface Level0SheetStatsColumnProps {
  data: Level0SheetData;
  editing?: boolean;
  onChange?: (data: Level0SheetData) => void;
  canEditHp?: boolean;
  onPatchHp?: (hpCurrent: number) => void;
  hpAdjusting?: boolean;
}

export function Level0SheetStatsColumn({
  data,
  editing = false,
  onChange,
  canEditHp = false,
  onPatchHp,
  hpAdjusting = false,
}: Level0SheetStatsColumnProps) {
  const recalcDerived = (abilities: Level0SheetData['abilities']) => {
    const mod = (k: string) => abilities.find((a) => a.key === k)?.mod ?? 0;
    const classForSaves =
      data.level > 0 ? data.occupation.trim() || 'Warrior' : undefined;
    const saves = computeDccSaves({
      level: data.level,
      className: classForSaves,
      agilityMod: mod('agi'),
      staminaMod: mod('sta'),
      personalityMod: mod('per'),
    });
    const armorDerived = deriveArmorOnSheet({ ...data, abilities });
    return { saves, init: mod('agi'), ...armorDerived };
  };

  const updateAbility = (key: string, score: number) => {
    const abilities = data.abilities.map((ab) =>
      ab.key === key ? { ...ab, score, mod: abilityModifier(score) } : ab,
    );
    const derived = recalcDerived(abilities);
    onChange?.({ ...data, abilities, ...derived });
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
        <Box sx={{ textAlign: 'center', flex: 1 }}>
          <ShieldOutlinedIcon sx={{ fontSize: 48, color: sheetColors.ink }} />
          <SectionLabel>AC</SectionLabel>
          <SheetText sx={{ fontWeight: 800, fontSize: '1.25rem', display: 'block' }}>
            ({data.ac})
          </SheetText>
        </Box>
        <Box sx={{ textAlign: 'center', flex: 1 }}>
          <FavoriteBorderIcon sx={{ fontSize: 48, color: sheetColors.ink }} />
          <SectionLabel>HP</SectionLabel>
          <Stack
            direction="row"
            spacing={0.5}
            alignItems="center"
            justifyContent="center"
            sx={{ mt: 0.25 }}
          >
            {canEditHp && onPatchHp ? (
              <SheetField
                type="number"
                value={data.hp}
                disabled={hpAdjusting}
                onChange={(e) => {
                  const next = Number.parseInt(e.target.value, 10);
                  patchSheet(data, onChange, {
                    hp: Number.isFinite(next) ? next : data.hp,
                  });
                }}
                onBlur={(e) => {
                  const next = Number.parseInt(e.target.value, 10);
                  if (Number.isFinite(next)) onPatchHp(next);
                }}
                sx={{ maxWidth: 72 }}
              />
            ) : (
              <SheetText sx={{ fontWeight: 800, fontSize: '1.25rem' }}>
                ({data.hp})
              </SheetText>
            )}
            <SheetText sx={{ fontWeight: 700, fontSize: '1rem', opacity: 0.85 }}>
              / {data.hpMax}
            </SheetText>
          </Stack>
          {data.vitalityLabel && (
            <SheetText
              sx={{
                fontWeight: 800,
                fontSize: '0.75rem',
                color: data.isDead ? '#7a1f1f' : '#9a6b00',
                mt: 0.25,
                display: 'block',
              }}
            >
              {data.vitalityLabel}
            </SheetText>
          )}
        </Box>
      </Box>

      <SectionLabel>Saving throws</SectionLabel>
      <Box sx={{ display: 'flex', gap: 1, mb: 2, mt: 0.5 }}>
        {(
          [
            ['Ref', 'reflex'] as const,
            ['Fort', 'fortitude'] as const,
            ['Will', 'will'] as const,
          ] as const
        ).map(([short, key]) => (
          <Box
            key={key}
            sx={{
              flex: 1,
              textAlign: 'center',
              border: `2px solid ${sheetColors.border}`,
              bgcolor: sheetColors.field,
              py: 0.75,
              px: 0.5,
            }}
          >
            <SheetText sx={{ fontWeight: 800, fontSize: '0.7rem', display: 'block' }}>
              {short}
            </SheetText>
            {editing ? (
              <SheetField
                type="number"
                value={data.saves[key]}
                onChange={(e) =>
                  onChange?.({
                    ...data,
                    saves: {
                      ...data.saves,
                      [key]: Number.parseInt(e.target.value, 10) || 0,
                    },
                  })
                }
                sx={{ maxWidth: 56, mx: 'auto', mt: 0.25 }}
              />
            ) : (
              <SheetText sx={{ fontWeight: 800, fontSize: '1.1rem', display: 'block' }}>
                {formatSaveModifier(data.saves[key])}
              </SheetText>
            )}
          </Box>
        ))}
      </Box>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: '1fr auto auto',
          gap: 0.5,
          alignItems: 'center',
        }}
      >
        <Box />
        <SheetText sx={{ fontWeight: 800, fontSize: '0.75rem', textAlign: 'center', display: 'block' }}>
          mod
        </SheetText>
        <Box />
        {data.abilities.map((ab) => (
          <Box key={ab.key} sx={{ display: 'contents' }}>
            <SectionLabel>{ab.label}</SectionLabel>
            {editing ? (
              <>
                <SheetField
                  type="number"
                  value={ab.score}
                  onChange={(e) =>
                    updateAbility(ab.key, Number.parseInt(e.target.value, 10) || 0)
                  }
                  sx={{ minWidth: 0 }}
                />
                <FieldBox sx={{ minHeight: 26, minWidth: 40, justifyContent: 'center' }}>
                  <SheetText sx={{ fontWeight: 700 }}>
                    {ab.mod >= 0 ? `+${ab.mod}` : ab.mod}
                  </SheetText>
                </FieldBox>
              </>
            ) : (
              <>
                <FieldBox sx={{ minHeight: 26, justifyContent: 'center' }}>
                  <SheetText sx={{ fontWeight: 700 }}>{ab.score}</SheetText>
                </FieldBox>
                <FieldBox sx={{ minHeight: 26, minWidth: 40, justifyContent: 'center' }}>
                  <SheetText sx={{ fontWeight: 700 }}>
                    {ab.mod >= 0 ? `+${ab.mod}` : ab.mod}
                  </SheetText>
                </FieldBox>
              </>
            )}
          </Box>
        ))}
      </Box>
    </Box>
  );
}
