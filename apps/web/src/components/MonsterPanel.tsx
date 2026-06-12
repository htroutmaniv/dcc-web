import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Autocomplete,
  Box,
  Button,
  Checkbox,
  Divider,
  FormControlLabel,
  IconButton,
  Slider,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import {
  buildMonsterKilledStats,
  formatMonsterSummary,
  isMonsterKilled,
  scaleMonsterStats,
  type GameInitiativeState,
  type GameMonsterInstance,
  type MonsterCatalogEntry,
} from '@dcc-web/shared';
import { api } from '../api/client';
import { formatError } from '../utils/errors';

interface MonsterPanelProps {
  gameId: string;
  monsters: GameMonsterInstance[];
  initiative: GameInitiativeState | null;
  busy?: boolean;
  onMonstersChange: (monsters: GameMonsterInstance[]) => void;
  onInitiativeChange?: (initiative: GameInitiativeState | null) => void;
  onError?: (message: string | null) => void;
}

type PanelMode = 'manual' | 'catalog';

const DEFAULT_CUSTOM = {
  name: 'Custom creature',
  hitDice: '2d8',
  ac: 12,
  attackBonus: 1,
  damage: '1d6',
  initMod: 0,
  speed: 30,
  hpMax: 9,
};

export function MonsterPanel({
  gameId,
  monsters,
  initiative,
  busy,
  onMonstersChange,
  onInitiativeChange,
  onError,
}: MonsterPanelProps) {
  const [mode, setMode] = useState<PanelMode>('catalog');
  const [catalogQuery, setCatalogQuery] = useState('');
  const [catalogOptions, setCatalogOptions] = useState<MonsterCatalogEntry[]>([]);
  const [selectedCatalog, setSelectedCatalog] = useState<MonsterCatalogEntry | null>(null);
  const [scaleLevel, setScaleLevel] = useState(1);
  const [spawnCount, setSpawnCount] = useState(1);
  const [addToInitiative, setAddToInitiative] = useState(true);
  const [custom, setCustom] = useState(DEFAULT_CUSTOM);
  const [spawning, setSpawning] = useState(false);
  const [localBusy, setLocalBusy] = useState(false);

  const loadCatalog = useCallback(
    async (q: string) => {
      try {
        const params = new URLSearchParams({ limit: '25' });
        if (q.trim()) params.set('q', q.trim());
        const data = await api<{ monsters: MonsterCatalogEntry[] }>(
          `/monsters/catalog?${params}`,
        );
        setCatalogOptions(data.monsters);
      } catch {
        setCatalogOptions([]);
      }
    },
    [],
  );

  useEffect(() => {
    const t = window.setTimeout(() => loadCatalog(catalogQuery), 250);
    return () => window.clearTimeout(t);
  }, [catalogQuery, loadCatalog]);

  useEffect(() => {
    if (selectedCatalog) {
      setScaleLevel(Math.max(0, selectedCatalog.baseLevel));
    }
  }, [selectedCatalog]);

  const scaledPreview = useMemo(() => {
    if (!selectedCatalog) return null;
    return scaleMonsterStats(
      {
        hitDice: selectedCatalog.hitDice,
        ac: selectedCatalog.ac,
        attackBonus: selectedCatalog.attackBonus,
        damage: selectedCatalog.damage,
        initMod: selectedCatalog.initMod,
        speed: selectedCatalog.speed,
        hpAvg: selectedCatalog.hpAvg,
      },
      selectedCatalog.baseLevel,
      scaleLevel,
    );
  }, [selectedCatalog, scaleLevel]);

  const spawn = async () => {
    setSpawning(true);
    onError?.(null);
    try {
      const body =
        mode === 'catalog' && selectedCatalog
          ? {
              catalogId: selectedCatalog.id,
              count: spawnCount,
              scaleLevel,
              addToInitiative: Boolean(initiative?.active && addToInitiative),
            }
          : {
              custom,
              count: spawnCount,
              scaleLevel: 0,
              addToInitiative: Boolean(initiative?.active && addToInitiative),
            };

      if (mode === 'catalog' && !selectedCatalog) {
        onError?.('Pick a monster from the manual');
        return;
      }

      const data = await api<{
        monsters: GameMonsterInstance[];
        initiative: GameInitiativeState | null;
      }>(`/games/${gameId}/monsters/spawn`, {
        method: 'POST',
        body: JSON.stringify(body),
      });
      onMonstersChange([...monsters, ...data.monsters]);
      if (data.initiative) onInitiativeChange?.(data.initiative);
    } catch (e) {
      onError?.(formatError(e));
    } finally {
      setSpawning(false);
    }
  };

  const patchHp = async (monster: GameMonsterInstance, hpCurrent: number) => {
    setLocalBusy(true);
    onError?.(null);
    try {
      const body: Record<string, unknown> = { hpCurrent };
      if (hpCurrent > 0 && isMonsterKilled(monster)) {
        body.stats = buildMonsterKilledStats(monster.stats, false);
      }
      const data = await api<{
        monster: GameMonsterInstance;
        initiative?: GameInitiativeState | null;
      }>(`/games/${gameId}/monsters/${monster.id}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      });
      onMonstersChange(monsters.map((m) => (m.id === monster.id ? data.monster : m)));
      if (data.initiative) onInitiativeChange?.(data.initiative);
    } catch (e) {
      onError?.(formatError(e));
    } finally {
      setLocalBusy(false);
    }
  };

  const killMonster = async (monster: GameMonsterInstance) => {
    setLocalBusy(true);
    onError?.(null);
    try {
      const data = await api<{
        monster: GameMonsterInstance;
        initiative?: GameInitiativeState | null;
      }>(`/games/${gameId}/monsters/${monster.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          hpCurrent: 0,
          stats: buildMonsterKilledStats(monster.stats, true),
        }),
      });
      onMonstersChange(monsters.map((m) => (m.id === monster.id ? data.monster : m)));
      if (data.initiative) onInitiativeChange?.(data.initiative);
    } catch (e) {
      onError?.(formatError(e));
    } finally {
      setLocalBusy(false);
    }
  };

  const removeMonster = async (monsterId: string) => {
    setLocalBusy(true);
    onError?.(null);
    try {
      const data = await api<{ initiative: GameInitiativeState | null }>(
        `/games/${gameId}/monsters/${monsterId}`,
        { method: 'DELETE' },
      );
      onMonstersChange(monsters.filter((m) => m.id !== monsterId));
      if (data.initiative !== undefined) onInitiativeChange?.(data.initiative);
    } catch (e) {
      onError?.(formatError(e));
    } finally {
      setLocalBusy(false);
    }
  };

  const addAllToInitiative = async () => {
    setLocalBusy(true);
    onError?.(null);
    try {
      const data = await api<{ initiative: GameInitiativeState | null }>(
        `/games/${gameId}/monsters/add-to-initiative`,
        { method: 'POST', body: JSON.stringify({}) },
      );
      onInitiativeChange?.(data.initiative);
    } catch (e) {
      onError?.(formatError(e));
    } finally {
      setLocalBusy(false);
    }
  };

  const disabled = busy || spawning || localBusy;

  return (
    <Stack spacing={2}>
      <Tabs
        value={mode}
        onChange={(_, v) => setMode(v as PanelMode)}
        variant="fullWidth"
        sx={{ minHeight: 36 }}
      >
        <Tab label="Manual" value="manual" sx={{ minHeight: 36, py: 0.5 }} />
        <Tab label="Bestiary" value="catalog" sx={{ minHeight: 36, py: 0.5 }} />
      </Tabs>

      {mode === 'catalog' && (
        <Stack spacing={1.5}>
          <Autocomplete
            options={catalogOptions}
            value={selectedCatalog}
            onChange={(_, v) => setSelectedCatalog(v)}
            inputValue={catalogQuery}
            onInputChange={(_, v) => setCatalogQuery(v)}
            getOptionLabel={(o) => o.name}
            isOptionEqualToValue={(a, b) => a.id === b.id}
            renderInput={(params) => (
              <TextField {...params} label="Search bestiary" size="small" />
            )}
            renderOption={(props, option) => (
              <Box component="li" {...props} key={option.id}>
                <Box>
                  <Typography variant="body2">{option.name}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Lv {option.baseLevel} · AC {option.ac} · {option.hitDice} ·{' '}
                    {option.tags.join(', ') || 'creature'}
                  </Typography>
                </Box>
              </Box>
            )}
            disabled={disabled}
          />
          {selectedCatalog && (
            <Typography variant="caption" color="text.secondary">
              {selectedCatalog.description}
            </Typography>
          )}
          <Typography variant="caption" color="text.secondary" gutterBottom>
            Scale for party level: {scaleLevel}
          </Typography>
          <Slider
            size="small"
            min={0}
            max={10}
            step={1}
            marks
            value={scaleLevel}
            onChange={(_, v) => setScaleLevel(v as number)}
            disabled={disabled || !selectedCatalog}
          />
          {scaledPreview && (
            <Typography variant="caption" color="warning.main">
              Scaled: {formatMonsterSummary(scaledPreview)}
            </Typography>
          )}
        </Stack>
      )}

      {mode === 'manual' && (
        <Stack spacing={1}>
          <TextField
            label="Name"
            size="small"
            value={custom.name}
            onChange={(e) => setCustom({ ...custom, name: e.target.value })}
            disabled={disabled}
          />
          <Stack direction="row" spacing={1}>
            <TextField
              label="Hit dice"
              size="small"
              value={custom.hitDice}
              onChange={(e) => setCustom({ ...custom, hitDice: e.target.value })}
              disabled={disabled}
              sx={{ flex: 1 }}
            />
            <TextField
              label="HP (avg)"
              size="small"
              type="number"
              value={custom.hpMax}
              onChange={(e) =>
                setCustom({ ...custom, hpMax: Math.max(1, Number(e.target.value) || 1) })
              }
              disabled={disabled}
              sx={{ width: 80 }}
              helperText="Spawn rolls hit dice"
              FormHelperTextProps={{ sx: { display: { xs: 'none', sm: 'block' }, m: 0 } }}
            />
          </Stack>
          <Stack direction="row" spacing={1}>
            <TextField
              label="AC"
              size="small"
              type="number"
              value={custom.ac}
              onChange={(e) => setCustom({ ...custom, ac: Number(e.target.value) })}
              disabled={disabled}
              sx={{ width: 64 }}
            />
            <TextField
              label="Atk"
              size="small"
              type="number"
              value={custom.attackBonus}
              onChange={(e) =>
                setCustom({ ...custom, attackBonus: Number(e.target.value) })
              }
              disabled={disabled}
              sx={{ width: 64 }}
            />
            <TextField
              label="Damage"
              size="small"
              value={custom.damage}
              onChange={(e) => setCustom({ ...custom, damage: e.target.value })}
              disabled={disabled}
              sx={{ flex: 1 }}
            />
          </Stack>
          <Stack direction="row" spacing={1}>
            <TextField
              label="Init"
              size="small"
              type="number"
              value={custom.initMod}
              onChange={(e) => setCustom({ ...custom, initMod: Number(e.target.value) })}
              disabled={disabled}
              sx={{ width: 64 }}
            />
            <TextField
              label="Speed"
              size="small"
              type="number"
              value={custom.speed}
              onChange={(e) => setCustom({ ...custom, speed: Number(e.target.value) })}
              disabled={disabled}
              sx={{ width: 72 }}
            />
          </Stack>
        </Stack>
      )}

      <Stack direction="row" spacing={1} alignItems="center">
        <TextField
          label="Count"
          size="small"
          type="number"
          inputProps={{ min: 1, max: 50 }}
          value={spawnCount}
          onChange={(e) =>
            setSpawnCount(Math.min(50, Math.max(1, Number(e.target.value) || 1)))
          }
          disabled={disabled}
          sx={{ width: 80 }}
        />
        <Button
          variant="contained"
          color="secondary"
          startIcon={<AddIcon />}
          onClick={spawn}
          disabled={disabled || (mode === 'catalog' && !selectedCatalog)}
          sx={{ flex: 1 }}
        >
          Spawn {spawnCount > 1 ? `×${spawnCount}` : ''}
        </Button>
      </Stack>

      <FormControlLabel
        control={
          <Checkbox
            size="small"
            checked={addToInitiative}
            onChange={(e) => setAddToInitiative(e.target.checked)}
            disabled={disabled}
          />
        }
        label={
          <Typography variant="caption" color="text.secondary">
            Sync shared monster initiative when combat is active
          </Typography>
        }
      />

      <Divider />

      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Typography variant="subtitle2">In play ({monsters.length})</Typography>
        {monsters.length > 0 && (
          <Button
            size="small"
            variant="outlined"
            onClick={addAllToInitiative}
            disabled={disabled}
          >
            Sync init
          </Button>
        )}
      </Stack>

      {monsters.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          No monsters spawned yet.
        </Typography>
      ) : (
        <Stack spacing={1}>
          {monsters.map((m) => (
            <Box
              key={m.id}
              sx={{
                p: 1,
                border: 1,
                borderColor: 'divider',
                borderRadius: 1,
                bgcolor: 'action.hover',
              }}
            >
              <Stack direction="row" alignItems="flex-start" justifyContent="space-between">
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography variant="body2" fontWeight={700} noWrap title={m.name}>
                    {m.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" display="block">
                    {formatMonsterSummary(m)} · init {m.initMod >= 0 ? '+' : ''}
                    {m.initMod}
                  </Typography>
                </Box>
                <IconButton
                  size="small"
                  color="error"
                  onClick={() => removeMonster(m.id)}
                  disabled={disabled}
                  aria-label="Remove"
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Stack>
              <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 0.75 }} flexWrap="wrap">
                {!isMonsterKilled(m) ? (
                  <Button
                    size="small"
                    color="error"
                    variant="outlined"
                    disabled={disabled}
                    onClick={() => void killMonster(m)}
                    sx={{ fontSize: '0.7rem' }}
                  >
                    Kill
                  </Button>
                ) : (
                  <Typography variant="caption" color="error.main" fontWeight={600}>
                    Slain
                  </Typography>
                )}
                <Button
                  size="small"
                  variant="outlined"
                  sx={{ minWidth: 28, px: 0.5 }}
                  disabled={disabled}
                  onClick={() => patchHp(m, m.hpCurrent - 1)}
                >
                  −
                </Button>
                <Typography variant="caption" sx={{ minWidth: 48, textAlign: 'center' }}>
                  {m.hpCurrent}/{m.hpMax}
                </Typography>
                <Button
                  size="small"
                  variant="outlined"
                  sx={{ minWidth: 28, px: 0.5 }}
                  disabled={disabled || m.hpCurrent >= m.hpMax}
                  onClick={() => patchHp(m, Math.min(m.hpMax, m.hpCurrent + 1))}
                >
                  +
                </Button>
                {isMonsterKilled(m) && (
                  <Typography variant="caption" color="text.secondary">
                    {(m.items?.length ?? 0) > 0
                      ? `${m.items!.length} loot item(s)`
                      : 'No loot'}
                  </Typography>
                )}
              </Stack>
            </Box>
          ))}
        </Stack>
      )}
    </Stack>
  );
}
