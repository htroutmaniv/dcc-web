import {
  Autocomplete,
  Box,
  Button,
  Slider,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { formatMonsterSummary } from '@dcc-web/shared';
import type { MonsterPanelState } from './useMonsterPanelState';

type MonsterSpawnFormProps = Pick<
  MonsterPanelState,
  | 'mode'
  | 'setMode'
  | 'catalogQuery'
  | 'setCatalogQuery'
  | 'catalogOptions'
  | 'selectedCatalog'
  | 'setSelectedCatalog'
  | 'scaleLevel'
  | 'setScaleLevel'
  | 'spawnCount'
  | 'setSpawnCount'
  | 'custom'
  | 'setCustom'
  | 'scaledPreview'
  | 'disabled'
  | 'spawn'
>;

export function MonsterSpawnForm(props: MonsterSpawnFormProps) {
  const {
    mode,
    setMode,
    catalogQuery,
    setCatalogQuery,
    catalogOptions,
    selectedCatalog,
    setSelectedCatalog,
    scaleLevel,
    setScaleLevel,
    spawnCount,
    setSpawnCount,
    custom,
    setCustom,
    scaledPreview,
    disabled,
    spawn,
  } = props;

  return (
    <>
      <Tabs
        value={mode}
        onChange={(_, v) => setMode(v as 'manual' | 'catalog')}
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
              onChange={(e) => setCustom({ ...custom, attackBonus: Number(e.target.value) })}
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
          onClick={() => void spawn()}
          disabled={disabled || (mode === 'catalog' && !selectedCatalog)}
          sx={{ flex: 1 }}
        >
          Spawn {spawnCount > 1 ? `×${spawnCount}` : ''}
        </Button>
      </Stack>
    </>
  );
}
