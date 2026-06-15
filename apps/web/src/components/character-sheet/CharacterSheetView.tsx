import { Alert, Box, Typography } from '@mui/material';
import { isLevel0Sheet } from '../../utils/character-sheet';
import { NO_EQUIP_ID } from '../../utils/armor';
import { EquipmentManagerDialog } from './EquipmentManagerDialog';
import { Level0CharacterSheet } from './Level0CharacterSheet';
import { CharacterSheetToolbar } from './CharacterSheetToolbar';
import {
  useCharacterSheetView,
  type CharacterSheetViewProps,
} from './useCharacterSheetView';

export function CharacterSheetView(props: CharacterSheetViewProps) {
  const {
    character,
    draft,
    editing,
    saving,
    hpAdjusting,
    equipmentOpen,
    setEquipmentOpen,
    error,
    setError,
    isDead,
    vitalityLabel,
    canEdit,
    startEdit,
    cancelEdit,
    save,
    patchHp,
    persistSelectedWeapon,
    assignOwner,
    handleEquipmentSaved,
    applyArmorSelection,
    setDraft,
  } = useCharacterSheetView(props);

  const {
    gameId,
    partyCharacters = [],
    partyMonsters = [],
    onInventoryTransferred,
    onClose,
    onMonsterUpdated,
    onRevive,
    onArchive,
    onMarkDead,
    isDm,
    players = [],
    dmUserId,
  } = props;

  const sheet = (
    <Level0CharacterSheet
      data={draft}
      editing={editing}
      onChange={setDraft}
      onOpenEquipment={() => setEquipmentOpen(true)}
      onSelectWeapon={(weaponId) => {
        setDraft((d) => ({ ...d, selectedWeaponId: weaponId }));
        void persistSelectedWeapon(weaponId);
      }}
      onSelectArmor={(armorId) => {
        applyArmorSelection({ selectedArmorId: armorId || NO_EQUIP_ID });
      }}
      onSelectShield={(shieldId) => {
        applyArmorSelection({ selectedShieldId: shieldId || NO_EQUIP_ID });
      }}
      canEditHp={canEdit}
      onPatchHp={(hp) => void patchHp(hp)}
      hpAdjusting={hpAdjusting}
    />
  );

  return (
    <Box
      sx={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
        bgcolor: '#12100e',
        overflow: 'hidden',
      }}
    >
      <CharacterSheetToolbar
        character={character}
        isDead={isDead}
        vitalityLabel={vitalityLabel}
        canEdit={canEdit}
        editing={editing}
        saving={saving}
        onStartEdit={startEdit}
        onCancelEdit={cancelEdit}
        onSave={() => void save()}
        onClose={onClose}
        isDm={isDm}
        dmUserId={dmUserId}
        players={players}
        onAssignOwner={(ownerUserId) => void assignOwner(ownerUserId)}
        onRevive={onRevive}
        onMarkDead={onMarkDead}
        onArchive={onArchive}
      />

      {error && (
        <Alert severity="error" sx={{ mx: 2, mt: 1 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Box
        sx={{
          flex: 1,
          overflow: 'auto',
          p: { xs: 1, sm: 2, md: 3 },
          display: 'flex',
          justifyContent: 'center',
          bgcolor: '#3a342c',
        }}
      >
        {isLevel0Sheet(character) ? (
          sheet
        ) : (
          <Box sx={{ maxWidth: 960, width: '100%' }}>
            <Typography variant="h6" gutterBottom fontFamily="Cinzel, serif" color="text.primary">
              {character.name}
            </Typography>
            <Typography color="text.secondary" paragraph>
              Level {character.level} {character.className} — class layout coming soon.
            </Typography>
            {sheet}
          </Box>
        )}
      </Box>

      <EquipmentManagerDialog
        open={equipmentOpen}
        character={character}
        canEdit={canEdit}
        gameId={gameId}
        partyCharacters={partyCharacters}
        partyMonsters={partyMonsters}
        onInventoryTransferred={(result) => {
          onInventoryTransferred?.(result);
          if (result.sourceMonster) onMonsterUpdated?.(result.sourceMonster);
          if (result.targetMonster) onMonsterUpdated?.(result.targetMonster);
        }}
        onClose={() => setEquipmentOpen(false)}
        onSaved={handleEquipmentSaved}
      />
    </Box>
  );
}
