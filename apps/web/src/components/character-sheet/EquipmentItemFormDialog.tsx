import { useCallback, useEffect, useState } from 'react';
import {
  Autocomplete,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
} from '@mui/material';
import { EQUIPMENT_SECTION_TO_CATEGORY, type EquipmentSectionKey } from '@dcc-web/shared';
import { api } from '../../api/client';
import { EquipmentItemCategoryFields } from './EquipmentItemCategoryFields.js';
import {
  type CatalogEntry,
  type EquipmentItemDraft,
  newDraft,
} from './equipment-types.js';

export interface EquipmentItemFormState {
  open: boolean;
  mode: 'add' | 'edit';
  section: EquipmentSectionKey;
  draft: EquipmentItemDraft | null;
}

export function EquipmentItemFormDialog({
  state,
  onClose,
  onSave,
}: {
  state: EquipmentItemFormState;
  onClose: () => void;
  onSave: (item: EquipmentItemDraft) => void;
}) {
  const [form, setForm] = useState<EquipmentItemDraft | null>(null);
  const [catalogOptions, setCatalogOptions] = useState<CatalogEntry[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);

  const category = state.draft?.category ?? EQUIPMENT_SECTION_TO_CATEGORY[state.section];

  useEffect(() => {
    if (!state.open) {
      setForm(null);
      return;
    }
    setForm(state.draft ? { ...state.draft } : newDraft(category));
  }, [state.open, state.draft, state.section, category]);

  const loadCatalog = useCallback(
    async (q: string) => {
      setCatalogLoading(true);
      try {
        const params = new URLSearchParams({ category, limit: '25' });
        if (q.trim()) params.set('q', q.trim());
        const { items } = await api<{ items: CatalogEntry[] }>(
          `/items/catalog?${params}`,
        );
        setCatalogOptions(items);
      } catch {
        setCatalogOptions([]);
      } finally {
        setCatalogLoading(false);
      }
    },
    [category],
  );

  useEffect(() => {
    if (state.open) void loadCatalog('');
  }, [state.open, loadCatalog]);

  if (!state.open || !form) return null;

  const applyCatalog = (entry: CatalogEntry | string | null) => {
    if (!entry || typeof entry === 'string') {
      setForm((f) => (f ? { ...f, name: typeof entry === 'string' ? entry : f.name } : f));
      return;
    }
    setForm((f) =>
      f ? { ...f, name: entry.name, properties: { ...entry.properties } } : f,
    );
  };

  const saveDisabled = !form.name.trim();

  return (
    <Dialog open={state.open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{state.mode === 'add' ? 'Add item' : 'Edit item'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Autocomplete
            freeSolo
            options={catalogOptions}
            getOptionLabel={(o) => (typeof o === 'string' ? o : o.name)}
            inputValue={form.name}
            onInputChange={(_, v) => {
              setForm((f) => (f ? { ...f, name: v } : f));
              void loadCatalog(v);
            }}
            onChange={(_, v) => applyCatalog(v)}
            loading={catalogLoading}
            renderInput={(params) => (
              <TextField {...params} label="Item name" placeholder="Type or pick from catalog" />
            )}
          />
          <EquipmentItemCategoryFields form={form} setForm={setForm} />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          disabled={saveDisabled}
          onClick={() => {
            if (form) onSave({ ...form, name: form.name.trim() });
            onClose();
          }}
        >
          {state.mode === 'add' ? 'Add' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
