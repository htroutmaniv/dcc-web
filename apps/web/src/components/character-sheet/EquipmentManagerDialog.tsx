import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Autocomplete,
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  FormGroup,
  IconButton,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import NotesIcon from '@mui/icons-material/Notes';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import {
  armorTooltipLines,
  consumableFlagsToProperties,
  consumablePropertiesToRecord,
  EQUIPMENT_SECTIONS,
  EQUIPMENT_SECTION_TO_CATEGORY,
  formatArmorSummary,
  formatConsumableTags,
  formatStackUsesSummary,
  formatWeaponSummary,
  getStackUsesAvailable,
  parseConsumableProperties,
  usesPerUnit,
  type ConsumableFlags,
  type ConsumableProperties,
  type EquipmentSectionKey,
} from '@dcc-web/shared';
import { api } from '../../api/client';
import {
  TransferItemDialog,
  type TransferableItem,
  type TransferInventoryResult,
} from '../inventory/TransferItemDialog';
import type { Character, CharacterItem } from '../../types/game';
import type { GameMonsterInstance } from '@dcc-web/shared';
import { formatError } from '../../utils/errors';

interface CatalogEntry {
  id: string;
  name: string;
  description: string;
  properties: Record<string, unknown>;
}

export interface EquipmentItemDraft {
  id: string;
  category: CharacterItem['category'];
  name: string;
  quantity: number;
  notes: string;
  properties: Record<string, unknown>;
}

interface EquipmentManagerDialogProps {
  open: boolean;
  character: Character;
  canEdit: boolean;
  gameId?: string;
  partyCharacters?: Character[];
  partyMonsters?: GameMonsterInstance[];
  onInventoryTransferred?: (result: TransferInventoryResult) => void;
  onClose: () => void;
  onSaved: (character: Character) => void;
}

function toDraft(item: CharacterItem): EquipmentItemDraft {
  return {
    id: item.id,
    category: item.category as EquipmentItemDraft['category'],
    name: item.name,
    quantity: item.quantity,
    notes: item.notes ?? '',
    properties: { ...(item.properties ?? {}) },
  };
}

function newDraft(category: EquipmentItemDraft['category']): EquipmentItemDraft {
  return {
    id: `new-${crypto.randomUUID()}`,
    category,
    name: '',
    quantity: 1,
    notes: '',
    properties: {},
  };
}

function sectionForItem(item: EquipmentItemDraft): EquipmentSectionKey {
  if (item.category === 'disposable') return 'consumables';
  if (item.category === 'treasure') return 'misc';
  if (item.category === 'weapon' || item.category === 'armor' || item.category === 'misc') {
    return item.category;
  }
  return 'misc';
}

function ItemSummary({ item }: { item: EquipmentItemDraft }) {
  if (item.category === 'disposable') {
    const tags = formatConsumableTags(parseConsumableProperties(item.properties));
    return tags ? (
      <Typography variant="caption" color="text.secondary">
        {tags}
        {item.quantity > 1 ? ` · Qty ${item.quantity}` : ''}
      </Typography>
    ) : item.quantity > 1 ? (
      <Typography variant="caption" color="text.secondary">
        Qty {item.quantity}
      </Typography>
    ) : null;
  }
  if (item.category === 'weapon') {
    return (
      <Typography variant="caption" color="text.secondary">
        {formatWeaponSummary(item.properties)}
      </Typography>
    );
  }
  if (item.category === 'armor') {
    const tips = armorTooltipLines(item.properties);
    const label = formatArmorSummary(item.properties);
    return tips.length > 0 ? (
      <Tooltip title={tips.join(' · ')} arrow>
        <Typography variant="caption" color="text.secondary" sx={{ cursor: 'help' }}>
          {label} — hover for penalties
        </Typography>
      </Tooltip>
    ) : (
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
    );
  }
  if (item.quantity > 1) {
    return (
      <Typography variant="caption" color="text.secondary">
        Qty {item.quantity}
      </Typography>
    );
  }
  return null;
}

interface ItemFormState {
  open: boolean;
  mode: 'add' | 'edit';
  section: EquipmentSectionKey;
  draft: EquipmentItemDraft | null;
}

function ItemFormDialog({
  state,
  onClose,
  onSave,
}: {
  state: ItemFormState;
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
      f
        ? {
            ...f,
            name: entry.name,
            properties: { ...entry.properties },
          }
        : f,
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

          {form.category === 'weapon' && (
            <>
              <TextField
                label="Damage"
                value={String(form.properties.damage ?? '')}
                onChange={(e) =>
                  setForm((f) =>
                    f ? { ...f, properties: { ...f.properties, damage: e.target.value } } : f,
                  )
                }
                placeholder="1d6"
              />
              <TextField
                label="Attack bonus"
                type="number"
                value={Number(form.properties.attackBonus ?? 0)}
                onChange={(e) =>
                  setForm((f) =>
                    f
                      ? {
                          ...f,
                          properties: {
                            ...f.properties,
                            attackBonus: Number.parseInt(e.target.value, 10) || 0,
                          },
                        }
                      : f,
                  )
                }
              />
            </>
          )}

          {form.category === 'armor' && (
            <>
              <TextField
                label="AC bonus"
                type="number"
                value={Number(form.properties.acBonus ?? 0)}
                onChange={(e) =>
                  setForm((f) =>
                    f
                      ? {
                          ...f,
                          properties: {
                            ...f.properties,
                            acBonus: Number.parseInt(e.target.value, 10) || 0,
                          },
                        }
                      : f,
                  )
                }
              />
              <TextField
                label="Speed penalty (ft)"
                type="number"
                value={Number(form.properties.speedPenalty ?? 0)}
                onChange={(e) =>
                  setForm((f) =>
                    f
                      ? {
                          ...f,
                          properties: {
                            ...f.properties,
                            speedPenalty: Number.parseInt(e.target.value, 10) || 0,
                          },
                        }
                      : f,
                  )
                }
              />
              <TextField
                label="Check penalty"
                type="number"
                value={Number(form.properties.checkPenalty ?? 0)}
                onChange={(e) =>
                  setForm((f) =>
                    f
                      ? {
                          ...f,
                          properties: {
                            ...f.properties,
                            checkPenalty: Number.parseInt(e.target.value, 10) || 0,
                          },
                        }
                      : f,
                  )
                }
              />
              <TextField
                label="Fumble die"
                value={String(form.properties.fumbleDie ?? '')}
                onChange={(e) =>
                  setForm((f) =>
                    f
                      ? { ...f, properties: { ...f.properties, fumbleDie: e.target.value } }
                      : f,
                  )
                }
                placeholder="d16"
              />
              <TextField
                label="Spell check penalty"
                type="number"
                value={Number(form.properties.spellCheckPenalty ?? 0)}
                onChange={(e) =>
                  setForm((f) =>
                    f
                      ? {
                          ...f,
                          properties: {
                            ...f.properties,
                            spellCheckPenalty: Number.parseInt(e.target.value, 10) || 0,
                          },
                        }
                      : f,
                  )
                }
              />
            </>
          )}

          {form.category === 'disposable' && (
            <>
              <FormGroup row sx={{ gap: 1, flexWrap: 'wrap' }}>
                {(
                  [
                    ['food', 'Food'],
                    ['vessel', 'Vessel (drinks)'],
                    ['fuel', 'Fuel (oil)'],
                    ['light', 'Light source'],
                    ['requiresFuel', 'Needs fuel (lantern)'],
                    ['poisonous', 'Poisonous'],
                    ['consumedWhenEmpty', 'Remove when empty'],
                  ] as const
                ).map(([key, label]) => {
                  const props = parseConsumableProperties(form.properties);
                  const checked = Boolean(props[key as keyof ConsumableProperties]);
                  return (
                    <FormControlLabel
                      key={key}
                      control={
                        <Checkbox
                          size="small"
                          checked={checked}
                          onChange={(e) => {
                            const next: ConsumableProperties = {
                              ...props,
                              [key]: e.target.checked,
                            };
                            setForm((f) =>
                              f
                                ? {
                                    ...f,
                                    properties: consumablePropertiesToRecord(next),
                                  }
                                : f,
                            );
                          }}
                        />
                      }
                      label={label}
                    />
                  );
                })}
              </FormGroup>
              {parseConsumableProperties(form.properties).vessel && (
                <Stack direction="row" spacing={1}>
                  <TextField
                    label="Capacity"
                    type="number"
                    size="small"
                    value={Number(parseConsumableProperties(form.properties).capacity ?? 1)}
                    onChange={(e) => {
                      const props = parseConsumableProperties(form.properties);
                      const cap = Math.max(1, Number.parseInt(e.target.value, 10) || 1);
                      setForm((f) =>
                        f
                          ? {
                              ...f,
                              properties: consumablePropertiesToRecord({
                                ...props,
                                capacity: cap,
                                usesRemaining: props.usesRemaining ?? cap,
                              }),
                            }
                          : f,
                      );
                    }}
                  />
                  <TextField
                    label="Uses remaining"
                    type="number"
                    size="small"
                    value={Number(
                      parseConsumableProperties(form.properties).usesRemaining ??
                        parseConsumableProperties(form.properties).capacity ??
                        1,
                    )}
                    onChange={(e) => {
                      const props = parseConsumableProperties(form.properties);
                      const uses = Math.max(
                        0,
                        Number.parseInt(e.target.value, 10) || 0,
                      );
                      setForm((f) =>
                        f
                          ? {
                              ...f,
                              properties: consumablePropertiesToRecord({
                                ...props,
                                usesRemaining: uses,
                              }),
                            }
                          : f,
                      );
                    }}
                  />
                  <TextField
                    label="Unit label"
                    size="small"
                    value={parseConsumableProperties(form.properties).unitLabel ?? ''}
                    onChange={(e) => {
                      const props = parseConsumableProperties(form.properties);
                      setForm((f) =>
                        f
                          ? {
                              ...f,
                              properties: consumablePropertiesToRecord({
                                ...props,
                                unitLabel: e.target.value.trim() || undefined,
                              }),
                            }
                          : f,
                      );
                    }}
                    placeholder="day, oil, …"
                  />
                </Stack>
              )}
              <TextField
                label="Quantity"
                type="number"
                value={form.quantity}
                onChange={(e) =>
                  setForm((f) =>
                    f
                      ? { ...f, quantity: Math.max(1, Number.parseInt(e.target.value, 10) || 1) }
                      : f,
                  )
                }
              />
              {!parseConsumableProperties(form.properties).vessel && (
                <Stack direction="row" spacing={1} flexWrap="wrap">
                  <TextField
                    label="Uses (per item)"
                    type="number"
                    size="small"
                    value={usesPerUnit(form.properties)}
                    onChange={(e) => {
                      const props = parseConsumableProperties(form.properties);
                      const uses = Math.max(1, Number.parseInt(e.target.value, 10) || 1);
                      const qty = form.quantity;
                      setForm((f) =>
                        f
                          ? {
                              ...f,
                              properties: consumablePropertiesToRecord({
                                ...props,
                                uses,
                                usesRemaining:
                                  props.usesRemaining ?? uses * qty,
                              }),
                            }
                          : f,
                      );
                    }}
                  />
                  <TextField
                    label="Uses left (current unit)"
                    type="number"
                    size="small"
                    helperText={`Total: ${formatStackUsesSummary(form)}`}
                    value={
                      parseConsumableProperties(form.properties).usesRemaining ??
                      getStackUsesAvailable(form)
                    }
                    onChange={(e) => {
                      const props = parseConsumableProperties(form.properties);
                      const left = Math.max(0, Number.parseInt(e.target.value, 10) || 0);
                      setForm((f) =>
                        f
                          ? {
                              ...f,
                              properties: consumablePropertiesToRecord({
                                ...props,
                                usesRemaining: left,
                              }),
                            }
                          : f,
                      );
                    }}
                  />
                </Stack>
              )}
            </>
          )}
          {(form.category === 'misc' || form.category === 'treasure') && (
            <>
              <TextField
                label="Quantity"
                type="number"
                value={form.quantity}
                onChange={(e) =>
                  setForm((f) =>
                    f ? { ...f, quantity: Math.max(1, Number.parseInt(e.target.value, 10) || 1) } : f,
                  )
                }
              />
              <Stack direction="row" spacing={1}>
                <TextField
                  label="Uses (per item)"
                  type="number"
                  size="small"
                  value={usesPerUnit(form.properties)}
                  onChange={(e) => {
                    const uses = Math.max(1, Number.parseInt(e.target.value, 10) || 1);
                    const prev = form.properties ?? {};
                    setForm((f) =>
                      f
                        ? {
                            ...f,
                            properties: {
                              ...prev,
                              uses,
                              usesRemaining:
                                (prev.usesRemaining as number | undefined) ??
                                uses * f.quantity,
                            },
                          }
                        : f,
                    );
                  }}
                />
                <TextField
                  label="Uses left (current unit)"
                  type="number"
                  size="small"
                  helperText={`Total: ${formatStackUsesSummary(form)}`}
                  value={
                    (form.properties?.usesRemaining as number | undefined) ??
                    getStackUsesAvailable(form)
                  }
                  onChange={(e) => {
                    const left = Math.max(0, Number.parseInt(e.target.value, 10) || 0);
                    setForm((f) =>
                      f
                        ? {
                            ...f,
                            properties: {
                              ...(f.properties ?? {}),
                              uses: usesPerUnit(f.properties),
                              usesRemaining: left,
                            },
                          }
                        : f,
                    );
                  }}
                />
              </Stack>
            </>
          )}
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

export function EquipmentManagerDialog({
  open,
  character,
  canEdit,
  gameId,
  partyCharacters = [],
  partyMonsters = [],
  onInventoryTransferred,
  onClose,
  onSaved,
}: EquipmentManagerDialogProps) {
  const [items, setItems] = useState<EquipmentItemDraft[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transferItem, setTransferItem] = useState<TransferableItem | null>(null);
  const [itemForm, setItemForm] = useState<ItemFormState>({
    open: false,
    mode: 'add',
    section: 'misc',
    draft: null,
  });
  const [notesItem, setNotesItem] = useState<EquipmentItemDraft | null>(null);
  const [notesText, setNotesText] = useState('');

  useEffect(() => {
    if (!open) return;
    setItems((character.items ?? []).map(toDraft));
    setError(null);
  }, [open, character]);

  const bySection = useMemo(() => {
    const map: Record<EquipmentSectionKey, EquipmentItemDraft[]> = {
      consumables: [],
      weapon: [],
      armor: [],
      misc: [],
    };
    for (const item of items) {
      map[sectionForItem(item)].push(item);
    }
    return map;
  }, [items]);

  const persist = async () => {
    setSaving(true);
    setError(null);
    try {
      const body = {
        items: items.map((item) => ({
          category: item.category,
          name: item.name,
          quantity: item.quantity,
          notes: item.notes,
          properties: item.properties,
        })),
      };
      const res = await api<{ character: Character }>(
        `/characters/${character.id}/items`,
        { method: 'PUT', body: JSON.stringify(body) },
      );
      onSaved(res.character);
      onClose();
    } catch (e) {
      setError(formatError(e));
    } finally {
      setSaving(false);
    }
  };

  const openNotes = (item: EquipmentItemDraft) => {
    setNotesItem(item);
    setNotesText(item.notes);
  };

  const saveNotes = () => {
    if (!notesItem) return;
    setItems((prev) =>
      prev.map((i) => (i.id === notesItem.id ? { ...i, notes: notesText } : i)),
    );
    setNotesItem(null);
  };

  const handleTransferred = (result: TransferInventoryResult) => {
    onInventoryTransferred?.(result);
    const updated =
      result.sourceCharacter?.id === character.id
        ? result.sourceCharacter
        : result.targetCharacter?.id === character.id
          ? result.targetCharacter
          : null;
    if (updated?.items) {
      setItems(updated.items.map(toDraft));
    }
  };

  const canTransfer =
    canEdit &&
    gameId != null &&
    (partyCharacters.some((c) => c.id !== character.id) || partyMonsters.length > 0);

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle>Equipment — {character.name}</DialogTitle>
        <DialogContent>
          {error && (
            <Typography color="error" variant="body2" sx={{ mb: 2 }}>
              {error}
            </Typography>
          )}
          {EQUIPMENT_SECTIONS.map(({ key, label }) => (
            <Box key={key} sx={{ mb: 3 }}>
              <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                <Typography variant="subtitle1" fontWeight={700}>
                  {label}
                </Typography>
                {canEdit && (
                  <Button
                    size="small"
                    startIcon={<AddIcon />}
                    onClick={() =>
                      setItemForm({
                        open: true,
                        mode: 'add',
                        section: key,
                        draft: newDraft(EQUIPMENT_SECTION_TO_CATEGORY[key]),
                      })
                    }
                  >
                    Add
                  </Button>
                )}
              </Stack>
              {bySection[key].length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No items
                </Typography>
              ) : (
                <Stack spacing={1}>
                  {bySection[key].map((item) => (
                    <Box
                      key={item.id}
                      sx={{
                        px: 1.5,
                        py: 1,
                        border: 1,
                        borderColor: 'divider',
                        borderRadius: 1,
                        bgcolor: 'action.hover',
                      }}
                    >
                      <Stack direction="row" alignItems="flex-start" justifyContent="space-between">
                        <Box sx={{ minWidth: 0, flex: 1 }}>
                          <Typography fontWeight={600}>{item.name}</Typography>
                          <ItemSummary item={item} />
                          {item.notes.trim() && (
                            <Typography variant="caption" display="block" sx={{ mt: 0.5, fontStyle: 'italic' }}>
                              Note: {item.notes}
                            </Typography>
                          )}
                        </Box>
                        <Stack direction="row" spacing={0.5}>
                          <Tooltip title={item.notes.trim() ? 'Edit notes' : 'Add notes'}>
                            <span>
                              <IconButton
                                size="small"
                                onClick={() => openNotes(item)}
                                disabled={!canEdit}
                              >
                                <NotesIcon fontSize="small" />
                              </IconButton>
                            </span>
                          </Tooltip>
                          {canTransfer && !item.id.startsWith('new-') && (
                            <Tooltip title="Transfer to another inventory">
                              <IconButton
                                size="small"
                                onClick={() =>
                                  setTransferItem({
                                    id: item.id,
                                    name: item.name,
                                    category: item.category,
                                    quantity: item.quantity,
                                    notes: item.notes,
                                    properties: item.properties,
                                  })
                                }
                              >
                                <SwapHorizIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                          {canEdit && (
                            <>
                              <IconButton
                                size="small"
                                onClick={() =>
                                  setItemForm({
                                    open: true,
                                    mode: 'edit',
                                    section: key,
                                    draft: item,
                                  })
                                }
                              >
                                <EditIcon fontSize="small" />
                              </IconButton>
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() =>
                                  setItems((prev) => prev.filter((i) => i.id !== item.id))
                                }
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </>
                          )}
                        </Stack>
                      </Stack>
                    </Box>
                  ))}
                </Stack>
              )}
            </Box>
          ))}
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Close</Button>
          {canEdit && (
            <Button variant="contained" onClick={() => void persist()} disabled={saving}>
              {saving ? 'Saving…' : 'Save equipment'}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      <ItemFormDialog
        state={itemForm}
        onClose={() => setItemForm((s) => ({ ...s, open: false }))}
        onSave={(item) => {
          setItems((prev) => {
            const idx = prev.findIndex((i) => i.id === item.id);
            if (idx >= 0) {
              const next = [...prev];
              next[idx] = item;
              return next;
            }
            return [...prev, item];
          });
        }}
      />

      {gameId && transferItem && (
        <TransferItemDialog
          open
          onClose={() => setTransferItem(null)}
          gameId={gameId}
          sourceType="character"
          sourceId={character.id}
          sourceLabel={character.name}
          item={transferItem}
          characters={partyCharacters}
          monsters={partyMonsters}
          onTransferred={handleTransferred}
        />
      )}

      <Dialog open={notesItem != null} onClose={() => setNotesItem(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Item notes — {notesItem?.name}</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            multiline
            minRows={4}
            value={notesText}
            onChange={(e) => setNotesText(e.target.value)}
            disabled={!canEdit}
            placeholder="Custom rules, charges, who gave you this, etc."
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNotesItem(null)}>Cancel</Button>
          {canEdit && (
            <Button variant="contained" onClick={saveNotes}>
              OK
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </>
  );
}
