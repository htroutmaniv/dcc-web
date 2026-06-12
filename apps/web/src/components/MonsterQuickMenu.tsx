import { useMemo } from 'react';
import {
  Box,
  Button,
  FormControl,
  IconButton,
  InputLabel,
  Link,
  MenuItem,
  Select,
  Stack,
  Typography,
} from '@mui/material';
import CasinoIcon from '@mui/icons-material/Casino';
import ShuffleIcon from '@mui/icons-material/Shuffle';
import DeleteIcon from '@mui/icons-material/Delete';
import {
  formatMonsterSummary,
  getTargetAc,
  isActiveInPlay,
  isMonsterActive,
  isMonsterKilled,
  type GameInitiativeState,
  type GameMonsterInstance,
} from '@dcc-web/shared';
import type { Character } from '../types/game';

interface MonsterQuickMenuProps {
  monsters: GameMonsterInstance[];
  characters: Character[];
  initiative: GameInitiativeState | null;
  monsterTargetById: Record<string, string>;
  sheetMonsterId?: string | null;
  onMonsterTargetChange: (monsterId: string, characterId: string | null) => void;
  onPatchHp: (monster: GameMonsterInstance, hpCurrent: number) => void;
  onKillMonster: (monster: GameMonsterInstance) => void;
  onDeleteMonster: (monsterId: string) => void;
  onRollAttack: (monster: GameMonsterInstance, target: Character) => void;
  onOpenSheet: (monsterId: string) => void;
  busy?: boolean;
  lastAttackSummary?: string | null;
}

export function MonsterQuickMenu({
  monsters,
  characters,
  initiative,
  monsterTargetById,
  sheetMonsterId,
  onMonsterTargetChange,
  onPatchHp,
  onKillMonster,
  onDeleteMonster,
  onRollAttack,
  onOpenSheet,
  busy,
  lastAttackSummary,
}: MonsterQuickMenuProps) {
  const activeMonsters = useMemo(() => monsters.filter((m) => !isMonsterKilled(m)), [monsters]);
  const slainMonsters = useMemo(() => monsters.filter((m) => isMonsterKilled(m)), [monsters]);
  const targets = useMemo(
    () =>
      characters.filter(
        (c) =>
          c.status === 'alive' &&
          isActiveInPlay({
            status: c.status,
            stats: { custom: c.stats?.custom as Record<string, unknown> | undefined },
          }),
      ),
    [characters],
  );

  const pickRandomTarget = (monsterId: string) => {
    if (targets.length === 0) return;
    const pick = targets[Math.floor(Math.random() * targets.length)]!;
    onMonsterTargetChange(monsterId, pick.id);
  };

  const lootLabel = (m: GameMonsterInstance) => {
    const n = m.items?.length ?? 0;
    return n === 0 ? 'No loot' : `${n} item${n === 1 ? '' : 's'}`;
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, minHeight: 0, flex: 1 }}>
      <Typography variant="caption" color="text.secondary" fontWeight={700}>
        Monsters ({activeMonsters.length} active
        {slainMonsters.length > 0 ? `, ${slainMonsters.length} slain` : ''})
      </Typography>

      {initiative?.active && (
        <Typography variant="caption" color="warning.main">
          Shared monster initiative
        </Typography>
      )}

      {lastAttackSummary && (
        <Typography variant="caption" color="text.secondary" sx={{ wordBreak: 'break-word' }}>
          {lastAttackSummary}
        </Typography>
      )}

      <Box
        sx={{
          flex: 1,
          minHeight: 120,
          overflow: 'auto',
          border: 1,
          borderColor: 'divider',
          borderRadius: 1,
        }}
      >
        {activeMonsters.length === 0 && slainMonsters.length === 0 ? (
          <Typography variant="caption" color="text.secondary" sx={{ p: 1, display: 'block' }}>
            No monsters in play
          </Typography>
        ) : (
          <>
            {activeMonsters.map((m) => {
              const targetId = monsterTargetById[m.id] ?? '';
              const target = targets.find((c) => c.id === targetId);
              const primaryAttack = m.sheet?.attacks[0];
              const sheetOpen = sheetMonsterId === m.id;
              const canFight = isMonsterActive(m);

              return (
                <Box
                  key={m.id}
                  sx={{
                    px: 1,
                    py: 0.75,
                    bgcolor: sheetOpen ? 'action.selected' : 'transparent',
                    borderBottom: 1,
                    borderColor: 'divider',
                  }}
                >
                  <Stack direction="row" alignItems="flex-start" justifyContent="space-between">
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Link
                        component="button"
                        type="button"
                        variant="body2"
                        fontWeight={700}
                        onClick={() => onOpenSheet(m.id)}
                        sx={{
                          textAlign: 'left',
                          display: 'block',
                          maxWidth: '100%',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {m.name}
                      </Link>
                      <Typography variant="caption" color="text.secondary" display="block" noWrap>
                        {formatMonsterSummary(m)}
                      </Typography>
                    </Box>
                    <Stack direction="row" spacing={0.25} alignItems="center">
                      <Button
                        size="small"
                        color="error"
                        variant="outlined"
                        disabled={busy || isMonsterKilled(m)}
                        onClick={(e) => {
                          e.stopPropagation();
                          onKillMonster(m);
                        }}
                        sx={{ minWidth: 0, px: 0.75, py: 0, fontSize: '0.65rem', lineHeight: 1.2 }}
                      >
                        Kill
                      </Button>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => onDeleteMonster(m.id)}
                        disabled={busy}
                        aria-label={`Remove ${m.name}`}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Stack>
                  </Stack>

                  <Stack direction="row" spacing={0.25} alignItems="center" sx={{ mt: 0.5 }}>
                    <Button
                      size="small"
                      sx={{ minWidth: 24, px: 0.25, py: 0 }}
                      disabled={busy}
                      onClick={(e) => {
                        e.stopPropagation();
                        onPatchHp(m, m.hpCurrent - 1);
                      }}
                    >
                      −
                    </Button>
                    <Typography variant="caption" sx={{ minWidth: 44, textAlign: 'center' }}>
                      {m.hpCurrent}/{m.hpMax}
                    </Typography>
                    <Button
                      size="small"
                      sx={{ minWidth: 24, px: 0.25, py: 0 }}
                      disabled={busy || m.hpCurrent >= m.hpMax}
                      onClick={(e) => {
                        e.stopPropagation();
                        onPatchHp(m, m.hpCurrent + 1);
                      }}
                    >
                      +
                    </Button>
                  </Stack>

                  <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 0.5 }}>
                    <FormControl
                      size="small"
                      sx={{ flex: 1, minWidth: 0 }}
                      disabled={targets.length === 0 || !canFight}
                    >
                      <InputLabel id={`tgt-${m.id}`} sx={{ fontSize: '0.75rem' }}>
                        Target
                      </InputLabel>
                      <Select
                        labelId={`tgt-${m.id}`}
                        label="Target"
                        value={targetId}
                        onChange={(e) => onMonsterTargetChange(m.id, e.target.value || null)}
                        onClick={(e) => e.stopPropagation()}
                        sx={{ fontSize: '0.8rem' }}
                      >
                        <MenuItem value="">
                          <em>PC</em>
                        </MenuItem>
                        {targets.map((c) => (
                          <MenuItem key={c.id} value={c.id}>
                            {c.name} (AC {getTargetAc(c.combat)})
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    <IconButton
                      size="small"
                      onClick={() => pickRandomTarget(m.id)}
                      disabled={busy || targets.length === 0 || !canFight}
                      title="Random target"
                    >
                      <ShuffleIcon fontSize="small" />
                    </IconButton>
                    <Button
                      size="small"
                      variant="contained"
                      color="secondary"
                      disabled={busy || !target || !canFight}
                      onClick={() => target && onRollAttack(m, target)}
                      sx={{ minWidth: 0, px: 0.75, fontSize: '0.7rem' }}
                      startIcon={<CasinoIcon sx={{ fontSize: 14 }} />}
                    >
                      Atk
                    </Button>
                  </Stack>

                  {primaryAttack && target && canFight && (
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.25 }}>
                      +{primaryAttack.attackBonus} vs AC {getTargetAc(target.combat)} · {primaryAttack.damage}
                    </Typography>
                  )}
                </Box>
              );
            })}

            {slainMonsters.length > 0 && (
              <>
                <Typography
                  variant="caption"
                  color="error.main"
                  fontWeight={700}
                  sx={{ px: 1, pt: 1, pb: 0.25, display: 'block' }}
                >
                  Slain — click name for loot
                </Typography>
                {slainMonsters.map((m) => {
                  const sheetOpen = sheetMonsterId === m.id;
                  return (
                    <Box
                      key={m.id}
                      sx={{
                        px: 1,
                        py: 0.6,
                        bgcolor: sheetOpen ? 'action.selected' : 'action.hover',
                        opacity: 0.92,
                        borderBottom: 1,
                        borderColor: 'divider',
                      }}
                    >
                      <Stack direction="row" alignItems="flex-start" justifyContent="space-between">
                        <Box sx={{ minWidth: 0, flex: 1 }}>
                          <Link
                            component="button"
                            type="button"
                            variant="body2"
                            fontWeight={600}
                            color="error.light"
                            onClick={() => onOpenSheet(m.id)}
                            sx={{
                              textAlign: 'left',
                              display: 'block',
                              maxWidth: '100%',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {m.name}
                          </Link>
                          <Typography variant="caption" color="text.secondary" display="block">
                            {lootLabel(m)}
                          </Typography>
                        </Box>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => onDeleteMonster(m.id)}
                          disabled={busy}
                          aria-label={`Remove ${m.name} from slain list`}
                          title="Remove from game"
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Stack>
                    </Box>
                  );
                })}
              </>
            )}
          </>
        )}
      </Box>
    </Box>
  );
}
