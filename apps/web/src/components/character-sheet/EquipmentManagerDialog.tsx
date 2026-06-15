import { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
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
  EQUIPMENT_SECTIONS,
  EQUIPMENT_SECTION_TO_CATEGORY,
  type EquipmentSectionKey,
} from '@dcc-web/shared';
import { api } from '../../api/client';
import {
  TransferItemDialog,
  type TransferableItem,
  type TransferInventoryResult,
} from '../inventory/TransferItemDialog';
import type { Character } from '../../types/game';
import type { GameMonsterInstance } from '@dcc-web/shared';
import { formatError } from '../../utils/errors';
import {
  EquipmentItemFormDialog,
  type EquipmentItemFormState,
} from './EquipmentItemFormDialog.js';
import {
  ItemSummary,
  newDraft,
  sectionForItem,
  toDraft,
  type EquipmentItemDraft,
} from './equipment-types.js';

export type { EquipmentItemDraft } from './equipment-types.js';

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
  const [itemForm, setItemForm] = useState<EquipmentItemFormState>({
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

      <EquipmentItemFormDialog
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
