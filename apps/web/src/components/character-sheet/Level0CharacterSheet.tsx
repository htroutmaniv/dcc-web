import { Box, MenuItem } from '@mui/material';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined';
import {
  abilityModifier,
  type Level0SheetData,
} from '../../utils/character-sheet';
import { SheetField } from './SheetField';
import { sheetColors, sheetFont, sheetRootSx } from './sheet-theme';

interface Level0CharacterSheetProps {
  data: Level0SheetData;
  editing?: boolean;
  onChange?: (data: Level0SheetData) => void;
}

function FieldBox({
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

function SheetText({
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

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <SheetText sx={{ fontWeight: 800, fontSize: '0.95rem', lineHeight: 1.1, display: 'block' }}>
      {children}
    </SheetText>
  );
}

function patch(
  data: Level0SheetData,
  onChange: ((d: Level0SheetData) => void) | undefined,
  partial: Partial<Level0SheetData>,
) {
  onChange?.({ ...data, ...partial });
}

export function Level0CharacterSheet({
  data,
  editing = false,
  onChange,
}: Level0CharacterSheetProps) {
  const weaponSlots = [...data.weapons];
  while (weaponSlots.length < 3) weaponSlots.push('');

  const updateAbility = (key: string, score: number) => {
    const abilities = data.abilities.map((ab) =>
      ab.key === key
        ? { ...ab, score, mod: abilityModifier(score) }
        : ab,
    );
    onChange?.({ ...data, abilities });
  };

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
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 2, alignItems: 'flex-end' }}>
        <Box sx={{ flex: '1 1 280px' }}>
          <SectionLabel>Name:</SectionLabel>
          {editing ? (
            <SheetField
              sx={{ mt: 0.5 }}
              value={data.name}
              onChange={(e) => patch(data, onChange, { name: e.target.value })}
            />
          ) : (
            <FieldBox sx={{ mt: 0.5, minHeight: 36 }}>
              <SheetText sx={{ fontWeight: 700, fontSize: '1.1rem' }}>{data.name}</SheetText>
            </FieldBox>
          )}
        </Box>
        <Box sx={{ flex: '1 1 200px' }}>
          <SectionLabel>Occupation:</SectionLabel>
          {editing ? (
            <SheetField
              sx={{ mt: 0.5 }}
              value={data.occupation}
              onChange={(e) => patch(data, onChange, { occupation: e.target.value })}
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
                onChange={(e) => patch(data, onChange, { alignment: e.target.value })}
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

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '200px 1fr 200px' },
          gap: 2,
        }}
      >
        <Box>
          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            <Box sx={{ textAlign: 'center', flex: 1 }}>
              <ShieldOutlinedIcon sx={{ fontSize: 48, color: sheetColors.ink }} />
              <SectionLabel>AC</SectionLabel>
              {editing ? (
                <SheetField
                  type="number"
                  value={data.ac}
                  onChange={(e) =>
                    patch(data, onChange, { ac: Number.parseInt(e.target.value, 10) || 0 })
                  }
                  sx={{ maxWidth: 72, mx: 'auto' }}
                />
              ) : (
                <SheetText sx={{ fontWeight: 800, fontSize: '1.25rem', display: 'block' }}>
                  ({data.ac})
                </SheetText>
              )}
            </Box>
            <Box sx={{ textAlign: 'center', flex: 1 }}>
              <FavoriteBorderIcon sx={{ fontSize: 48, color: sheetColors.ink }} />
              <SectionLabel>HP</SectionLabel>
              {editing ? (
                <SheetField
                  type="number"
                  value={data.hp}
                  onChange={(e) =>
                    patch(data, onChange, { hp: Number.parseInt(e.target.value, 10) || 0 })
                  }
                  sx={{ maxWidth: 72, mx: 'auto' }}
                />
              ) : (
                <SheetText sx={{ fontWeight: 800, fontSize: '1.25rem', display: 'block' }}>
                  ({data.hp})
                </SheetText>
              )}
            </Box>
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

        <Box>
          <SectionLabel>Saves</SectionLabel>
          <FieldBox sx={{ mt: 0.5, mb: 2, flexDirection: 'column', alignItems: 'stretch', gap: 0.75 }}>
            {(
              [
                ['Reflex', 'reflex'] as const,
                ['Fortitude', 'fortitude'] as const,
                ['Will', 'will'] as const,
              ]
            ).map(([label, key]) => (
              <Box
                key={key}
                sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1 }}
              >
                <SheetText sx={{ fontWeight: 700 }}>{label}:</SheetText>
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
                    sx={{ maxWidth: 56 }}
                  />
                ) : (
                  <Box
                    component="span"
                    sx={{
                      border: `2px solid ${sheetColors.border}`,
                      minWidth: 36,
                      textAlign: 'center',
                      fontWeight: 800,
                      bgcolor: sheetColors.paper,
                      color: sheetColors.ink,
                      py: 0.25,
                    }}
                  >
                    {data.saves[key]}
                  </Box>
                )}
              </Box>
            ))}
          </FieldBox>

          <SectionLabel>Weapons</SectionLabel>
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
                <Box
                  key={i}
                  sx={{
                    border: `2px solid ${sheetColors.border}`,
                    borderRadius: 1,
                    minHeight: 32,
                    px: 1,
                    display: 'flex',
                    alignItems: 'center',
                    bgcolor: w?.trim() ? sheetColors.weaponFill : sheetColors.field,
                    color: w?.trim() ? sheetColors.weaponText : sheetColors.fieldText,
                  }}
                >
                  <SheetText sx={{ fontWeight: 700, fontSize: '0.9rem', color: 'inherit' }}>
                    {w?.trim() || ' '}
                  </SheetText>
                </Box>
              ),
            )}
          </Box>
        </Box>

        <Box>
          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            <Box sx={{ flex: 1 }}>
              <SectionLabel>Speed</SectionLabel>
              {editing ? (
                <SheetField
                  type="number"
                  sx={{ mt: 0.5 }}
                  value={data.speed}
                  onChange={(e) =>
                    patch(data, onChange, { speed: Number.parseInt(e.target.value, 10) || 0 })
                  }
                />
              ) : (
                <FieldBox sx={{ mt: 0.5, justifyContent: 'center' }}>
                  <SheetText sx={{ fontWeight: 800 }}>{data.speed}</SheetText>
                </FieldBox>
              )}
            </Box>
            <Box sx={{ flex: 1 }}>
              <SectionLabel>Init</SectionLabel>
              {editing ? (
                <SheetField
                  type="number"
                  sx={{ mt: 0.5 }}
                  value={data.init}
                  onChange={(e) =>
                    patch(data, onChange, { init: Number.parseInt(e.target.value, 10) || 0 })
                  }
                />
              ) : (
                <FieldBox sx={{ mt: 0.5, justifyContent: 'center' }}>
                  <SheetText sx={{ fontWeight: 800 }}>{data.init}</SheetText>
                </FieldBox>
              )}
            </Box>
          </Box>

          <SectionLabel>Equipment</SectionLabel>
          {editing ? (
            <SheetField
              multiline
              minRows={8}
              sx={{ mt: 0.5 }}
              value={data.equipment.join('\n')}
              onChange={(e) =>
                patch(data, onChange, {
                  equipment: e.target.value.split('\n').filter((l) => l.length > 0),
                })
              }
              placeholder="One item per line"
            />
          ) : (
            <FieldBox
              sx={{
                mt: 0.5,
                minHeight: 180,
                flexDirection: 'column',
                alignItems: 'flex-start',
              }}
            >
              {data.equipment.map((line, i) => (
                <SheetText key={i} sx={{ fontSize: '0.9rem', fontWeight: 600, lineHeight: 1.5 }}>
                  {line.trim() ? (line.startsWith('•') ? line : `• ${line}`) : '—'}
                </SheetText>
              ))}
            </FieldBox>
          )}
        </Box>
      </Box>

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
              onChange={(e) => patch(data, onChange, { notes: e.target.value })}
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
              onChange={(e) => patch(data, onChange, { xp: e.target.value })}
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
    </Box>
  );
}
