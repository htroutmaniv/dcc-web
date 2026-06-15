import { Box, Button, MenuItem, Select, Stack } from '@mui/material';
import InventoryIcon from '@mui/icons-material/Inventory';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined';
import {
  CHARACTER_RACES,
  computeDccSaves,
  formatSaveModifier,
  raceLabel,
  type CharacterRace,
} from '@dcc-web/shared';
import {
  armorStatsFromEntry,
  deriveArmorOnSheet,
  formatDefenseLines,
  formatPieceStatLines,
  NO_EQUIP_ID,
} from '../../utils/armor';
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
  onSelectWeapon?: (weaponId: string) => void;
  onSelectArmor?: (armorId: string) => void;
  onSelectShield?: (shieldId: string) => void;
  onOpenEquipment?: () => void;
  canEditHp?: boolean;
  onPatchHp?: (hpCurrent: number) => void;
  hpAdjusting?: boolean;
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

function SectionLabel({
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
  onSelectWeapon,
  onSelectArmor,
  onSelectShield,
  onOpenEquipment,
  canEditHp = false,
  onPatchHp,
  hpAdjusting = false,
}: Level0CharacterSheetProps) {
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
      ab.key === key
        ? { ...ab, score, mod: abilityModifier(score) }
        : ab,
    );
    const derived = recalcDerived(abilities);
    onChange?.({ ...data, abilities, ...derived });
  };

  const selectArmorValue = data.selectedArmorId ?? NO_EQUIP_ID;
  const selectShieldValue = data.selectedShieldId ?? NO_EQUIP_ID;

  const armorSelectSx = {
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
        {data.level === 0 && (
          <Box sx={{ flex: '0 1 140px' }}>
            <SectionLabel>Race:</SectionLabel>
            {editing ? (
              <Select
                fullWidth
                size="small"
                value={data.race}
                onChange={(e) =>
                  patch(data, onChange, { race: e.target.value as CharacterRace })
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
                      patch(data, onChange, {
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
                    patch(data, onChange, { baseSpeed, speed });
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
