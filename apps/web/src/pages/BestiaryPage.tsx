import { useCallback, useEffect, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  CircularProgress,
  Divider,
  Link,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SaveIcon from '@mui/icons-material/Save';
import AddIcon from '@mui/icons-material/Add';
import {
  defaultMonsterSheet,
  parseMonsterSheet,
  type LootPoolDefinition,
  type MonsterCatalogEntry,
  type MonsterSheetData,
} from '@dcc-web/shared';
import { api } from '../api/client';
import { AppShell } from '../components/AppShell';
import { formatError } from '../utils/errors';

type CatalogRow = MonsterCatalogEntry & { lootPoolName?: string | null };

export default function BestiaryPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState('');
  const [options, setOptions] = useState<CatalogRow[]>([]);
  const [selected, setSelected] = useState<CatalogRow | null>(null);
  const [pools, setPools] = useState<LootPoolDefinition[]>([]);
  const [draft, setDraft] = useState({
    name: '',
    description: '',
    baseLevel: 1,
    hitDice: '1d8',
    ac: 12,
    attackBonus: 0,
    damage: '1d6',
    initMod: 0,
    speed: 30,
    hpAvg: '' as string,
    tags: '',
    lootPoolId: '' as string,
  });
  const [sheet, setSheet] = useState<MonsterSheetData>(defaultMonsterSheet());

  const loadPools = useCallback(async () => {
    const data = await api<{ pools: LootPoolDefinition[] }>('/loot-pools');
    setPools(data.pools);
  }, []);

  const loadCatalog = useCallback(async (q: string) => {
    const params = new URLSearchParams({ limit: '50' });
    if (q.trim()) params.set('q', q.trim());
    const data = await api<{ monsters: CatalogRow[] }>(`/monsters/catalog?${params}`);
    setOptions(data.monsters);
  }, []);

  useEffect(() => {
    setLoading(true);
    void Promise.all([loadPools(), loadCatalog('')])
      .catch((e) => setError(formatError(e)))
      .finally(() => setLoading(false));
  }, [loadPools, loadCatalog]);

  useEffect(() => {
    const t = window.setTimeout(() => void loadCatalog(query), 250);
    return () => window.clearTimeout(t);
  }, [query, loadCatalog]);

  const loadDetail = async (id: string) => {
    const { monster } = await api<{ monster: CatalogRow & { sheet?: unknown } }>(
      `/monsters/catalog/${id}`,
    );
    setSelected(monster);
    setDraft({
      name: monster.name,
      description: monster.description,
      baseLevel: monster.baseLevel,
      hitDice: monster.hitDice,
      ac: monster.ac,
      attackBonus: monster.attackBonus,
      damage: monster.damage,
      initMod: monster.initMod,
      speed: monster.speed,
      hpAvg: monster.hpAvg != null ? String(monster.hpAvg) : '',
      tags: monster.tags.join(', '),
      lootPoolId: monster.lootPoolId ?? '',
    });
    setSheet(parseMonsterSheet(monster.sheet));
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const body = {
        name: draft.name,
        description: draft.description,
        baseLevel: draft.baseLevel,
        hitDice: draft.hitDice,
        ac: draft.ac,
        attackBonus: draft.attackBonus,
        damage: draft.damage,
        initMod: draft.initMod,
        speed: draft.speed,
        hpAvg: draft.hpAvg ? Number(draft.hpAvg) : null,
        tags: draft.tags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
        lootPoolId: draft.lootPoolId || null,
        sheet,
      };
      if (selected?.id) {
        await api(`/monsters/catalog/${selected.id}`, {
          method: 'PUT',
          body: JSON.stringify(body),
        });
      } else {
        const { monster } = await api<{ monster: CatalogRow }>('/monsters/catalog', {
          method: 'POST',
          body: JSON.stringify(body),
        });
        setSelected(monster);
      }
      await loadCatalog(query);
      setError(null);
    } catch (e) {
      setError(formatError(e));
    } finally {
      setSaving(false);
    }
  };

  const newMonster = () => {
    setSelected(null);
    setDraft({
      name: 'New creature',
      description: '',
      baseLevel: 1,
      hitDice: '1d8',
      ac: 12,
      attackBonus: 0,
      damage: '1d6',
      initMod: 0,
      speed: 30,
      hpAvg: '',
      tags: '',
      lootPoolId: '',
    });
    setSheet(defaultMonsterSheet({ name: 'Melee', attackBonus: 0, damage: '1d6' }));
  };

  return (
    <AppShell>
      <Box sx={{ maxWidth: 900, mx: 'auto', p: 2 }}>
        <Link component={RouterLink} to="/" underline="hover" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, mb: 2 }}>
          <ArrowBackIcon fontSize="small" /> Home
        </Link>
        <Typography variant="h5" gutterBottom>
          Bestiary editor
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          Edit catalog monsters, attacks, abilities, and loot pools. Only users who run at least one game as DM can save.
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {loading ? (
          <CircularProgress />
        ) : (
          <Stack spacing={2}>
            <Stack direction="row" spacing={1}>
              <Autocomplete
                sx={{ flex: 1 }}
                options={options}
                value={selected}
                onChange={(_, v) => {
                  setSelected(v);
                  if (v) void loadDetail(v.id).catch((e) => setError(formatError(e)));
                }}
                inputValue={query}
                onInputChange={(_, v) => setQuery(v)}
                getOptionLabel={(o) => o.name}
                isOptionEqualToValue={(a, b) => a.id === b.id}
                renderInput={(params) => (
                  <TextField {...params} label="Search bestiary" size="small" />
                )}
              />
              <Button variant="outlined" startIcon={<AddIcon />} onClick={newMonster}>
                New
              </Button>
            </Stack>

            <Divider />

            <TextField label="Name" size="small" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
            <TextField label="Description" size="small" multiline minRows={2} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />

            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <TextField label="Base level" type="number" size="small" value={draft.baseLevel} onChange={(e) => setDraft({ ...draft, baseLevel: Number(e.target.value) })} sx={{ width: 100 }} />
              <TextField label="Hit dice" size="small" value={draft.hitDice} onChange={(e) => setDraft({ ...draft, hitDice: e.target.value })} sx={{ width: 100 }} />
              <TextField label="AC" type="number" size="small" value={draft.ac} onChange={(e) => setDraft({ ...draft, ac: Number(e.target.value) })} sx={{ width: 72 }} />
              <TextField label="Atk" type="number" size="small" value={draft.attackBonus} onChange={(e) => setDraft({ ...draft, attackBonus: Number(e.target.value) })} sx={{ width: 72 }} />
              <TextField label="Damage" size="small" value={draft.damage} onChange={(e) => setDraft({ ...draft, damage: e.target.value })} sx={{ width: 100 }} />
              <TextField label="Init" type="number" size="small" value={draft.initMod} onChange={(e) => setDraft({ ...draft, initMod: Number(e.target.value) })} sx={{ width: 72 }} />
              <TextField label="Speed" type="number" size="small" value={draft.speed} onChange={(e) => setDraft({ ...draft, speed: Number(e.target.value) })} sx={{ width: 80 }} />
            </Stack>

            <TextField label="Tags (comma-separated)" size="small" value={draft.tags} onChange={(e) => setDraft({ ...draft, tags: e.target.value })} />

            <TextField
              select
              label="Loot pool"
              size="small"
              value={draft.lootPoolId}
              onChange={(e) => setDraft({ ...draft, lootPoolId: e.target.value })}
              SelectProps={{ native: true }}
            >
              <option value="">None</option>
              {pools.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </TextField>

            <Typography variant="subtitle2">Primary attack (sheet)</Typography>
            {sheet.attacks[0] && (
              <Stack direction="row" spacing={1}>
                <TextField label="Name" size="small" value={sheet.attacks[0].name} onChange={(e) => setSheet((s) => ({ ...s, attacks: [{ ...s.attacks[0]!, name: e.target.value }, ...s.attacks.slice(1)] }))} />
                <TextField label="+Hit" type="number" size="small" value={sheet.attacks[0].attackBonus} onChange={(e) => setSheet((s) => ({ ...s, attacks: [{ ...s.attacks[0]!, attackBonus: Number(e.target.value) }, ...s.attacks.slice(1)] }))} sx={{ width: 80 }} />
                <TextField label="Dmg" size="small" value={sheet.attacks[0].damage} onChange={(e) => setSheet((s) => ({ ...s, attacks: [{ ...s.attacks[0]!, damage: e.target.value }, ...s.attacks.slice(1)] }))} sx={{ width: 100 }} />
              </Stack>
            )}

            <Button variant="contained" startIcon={saving ? <CircularProgress size={18} color="inherit" /> : <SaveIcon />} onClick={() => void save()} disabled={saving || !draft.name.trim()}>
              Save to bestiary
            </Button>
          </Stack>
        )}
      </Box>
    </AppShell>
  );
}
