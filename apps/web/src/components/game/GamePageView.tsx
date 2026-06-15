import { lazy, Suspense } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Alert, Box, Button, Chip, CircularProgress, Link } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { AppShell } from '../AppShell';
import { GameDialogs } from './GameDialogs';
import { GameSidebar } from './GameSidebar';
import { GameStage } from './GameStage';
import type { GamePageController } from '../../hooks/useGamePageController';

const CharacterSheetView = lazy(() =>
  import('../character-sheet/CharacterSheetView').then((m) => ({
    default: m.CharacterSheetView,
  })),
);
const MonsterSheetView = lazy(() =>
  import('../monster-sheet/MonsterSheetView').then((m) => ({
    default: m.MonsterSheetView,
  })),
);

type GamePageViewProps = {
  vm: GamePageController;
};

export function GamePageView({ vm }: GamePageViewProps) {
  const {
    gameId,
    user,
    error,
    setError,
    loading,
    detail,
    isDm,
    initiative,
    initiativeActive,
    monstersVisibleOnMap,
    sharedMonsterInitiative,
    hideMonsterAcInRollLog,
    characters,
    monsters,
    npcTokens,
    maps,
    activeMap,
    activeMapId,
    mapBusy,
    rollLog,
    setRollLog,
    lastRoll,
    selectedCharacter,
    setSelectedCharacter,
    selectedMonster,
    setSelectedMonster,
    monsterTargetById,
    setMonsters,
    applyInitiative,
    menuTab,
    setMenuTab,
    createDialogOpen,
    setCreateDialogOpen,
    corpseLootOpen,
    diceTrayCounts,
    setDiceTrayCounts,
    diceRolling,
    diceCharacterId,
    setDiceCharacterId,
    diceQuickRollKind,
    resetDiceTray,
    presenceUsers,
    combatTargetOptions,
    characterAttackTargetById,
    characterActions,
    combatActions,
    monsterActions,
    mapActions,
    handleInventoryTransferred,
    canDragToken,
    closeCorpseLoot,
    selectSidebarCharacter,
    applyCharacterFromServer,
    handleMonsterUpdated,
  } = vm;

  const headerActions = (
    <>
      <Button
        component={RouterLink}
        to="/"
        size="small"
        startIcon={<ArrowBackIcon />}
        sx={{ mr: 1 }}
      >
        All games
      </Button>
      {detail && (
        <Chip
          size="small"
          label={isDm ? 'DM' : 'Player'}
          color={isDm ? 'primary' : 'default'}
          variant="outlined"
          sx={{ mr: 1 }}
        />
      )}
    </>
  );

  if (loading) {
    return (
      <AppShell title="Loading…" actions={headerActions} showBrandLink>
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      </AppShell>
    );
  }

  if (!detail || !gameId) {
    return (
      <AppShell actions={headerActions} showBrandLink>
        <Box sx={{ p: 3 }}>
          <Alert severity="error">{error ?? 'Game not found'}</Alert>
          <Link component={RouterLink} to="/" sx={{ mt: 2, display: 'inline-block' }}>
            Back to home
          </Link>
        </Box>
      </AppShell>
    );
  }

  const players = detail.game.players?.map((p) => p.user) ?? [];

  return (
    <AppShell title={detail.game.title} actions={headerActions} showBrandLink>
      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {error && (
          <Alert
            severity="error"
            onClose={() => setError(null)}
            sx={{ mx: 2, mt: 1, flexShrink: 0 }}
          >
            {error}
          </Alert>
        )}
        <Box
          sx={{
            flex: 1,
            display: 'flex',
            flexDirection: 'row',
            minHeight: 0,
            overflow: 'hidden',
          }}
        >
          <Box
            sx={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              minWidth: 0,
              minHeight: 0,
              position: 'relative',
            }}
          >
            <Box
              sx={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                flexDirection: 'column',
                minHeight: 0,
              }}
            >
              <GameStage
                gameId={gameId}
                isDm={isDm}
                userId={user?.id}
                initiative={initiative}
                initiativeActive={initiativeActive}
                initiativeBusy={combatActions.initiativeBusy}
                monstersVisibleOnMap={monstersVisibleOnMap}
                hideMonsterAcInRollLog={hideMonsterAcInRollLog}
                sharedMonsterInitiative={sharedMonsterInitiative}
                onStartInitiative={combatActions.startInitiative}
                onAdvanceTurn={combatActions.advanceInitiative}
                onEndInitiative={combatActions.endInitiative}
                onToggleMonstersVisibleOnMap={() =>
                  void combatActions.toggleMonstersVisibleOnMap()
                }
                onToggleSharedMonsterInitiative={() =>
                  void combatActions.toggleSharedMonsterInitiative()
                }
                onToggleHideMonsterAcInRollLog={() =>
                  void combatActions.toggleHideMonsterAcInRollLog()
                }
                monsters={monsters}
                characters={characters}
                monsterTargetById={monsterTargetById}
                selectedMonsterId={selectedMonster?.id ?? null}
                onMonsterTargetChange={monsterActions.setMonsterAttackTarget}
                onPatchMonsterHp={monsterActions.patchMonsterHp}
                onKillMonster={monsterActions.killMonster}
                onDeleteMonster={monsterActions.deleteMonsterQuick}
                onRollMonsterAttack={monsterActions.rollMonsterAttack}
                onMonsterCombatRoll={monsterActions.rollMonsterCombat}
                onToggleMonsterInPlay={monsterActions.toggleMonsterInPlay}
                monsterBusy={monsterActions.monsterBusy}
                rollingMonsterId={monsterActions.monsterRollingId}
                rollingMonsterKind={monsterActions.monsterRollingKind}
                onOpenMonsterSheet={monsterActions.openMonsterSheet}
                lastAttackSummary={monsterActions.lastMonsterAttackSummary}
                onMonstersChange={setMonsters}
                onMonsterInitiativeChange={applyInitiative}
                onMonsterPanelError={setError}
                maps={maps}
                activeMap={activeMap}
                activeMapId={activeMapId}
                mapBusy={mapBusy}
                drawTool={mapActions.drawTool}
                drawColor={mapActions.drawColor}
                drawStrokeWidth={mapActions.drawStrokeWidth}
                onDrawToolChange={mapActions.setDrawTool}
                onDrawColorChange={mapActions.setDrawColor}
                onDrawStrokeWidthChange={mapActions.setDrawStrokeWidth}
                onImageScaleChange={(imageScale) => void mapActions.patchActiveMap({ imageScale })}
                onSelectMap={(id) => void mapActions.setActiveMap(id)}
                onPrevMap={() => mapActions.cycleMap(-1)}
                onNextMap={() => mapActions.cycleMap(1)}
                onAddMap={() => void mapActions.addMap()}
                onDeleteMap={() => void mapActions.deleteActiveMap()}
                onToggleMapVisible={() =>
                  activeMap && void mapActions.patchActiveMap({ visible: !activeMap.visible })
                }
                onGridPresetChange={(preset) =>
                  void mapActions.patchActiveMap({ gridPreset: preset })
                }
                onUploadImage={mapActions.uploadMapImage}
                onRemoveImage={() => void mapActions.patchActiveMap({ clearImage: true })}
                onRenameMap={(name) => void mapActions.patchActiveMap({ name })}
                onResetPlayerTokens={mapActions.resetPlayerMapTokens}
                onResetMonsterTokens={mapActions.resetMonsterMapTokens}
                onClearDrawings={() => void mapActions.patchActiveMap({ dmDrawings: [] })}
                onDrawingsChange={(drawings) =>
                  void mapActions.patchActiveMap({ dmDrawings: drawings })
                }
                onTokenMove={(tokenId, x, y) => void mapActions.moveMapToken(tokenId, x, y)}
                canDragToken={canDragToken}
                canLootToken={mapActions.canLootToken}
                isTokenInitiativeActive={mapActions.isTokenInitiativeActive}
                getTokenOverlay={mapActions.getTokenOverlay}
                onTokenClick={mapActions.handleMapTokenClick}
                rollLog={rollLog}
                onClearRollLog={() => setRollLog([])}
                onApplyDamageFromRoll={
                  isDm ? (roll) => combatActions.setApplyDamageRoll(roll) : undefined
                }
              />
            </Box>
            {selectedCharacter && (
              <Box
                sx={{
                  position: 'absolute',
                  inset: 0,
                  zIndex: 2,
                  display: 'flex',
                  flexDirection: 'column',
                  bgcolor: 'background.default',
                  overflow: 'auto',
                }}
              >
                <Suspense fallback={<CircularProgress sx={{ m: 'auto' }} />}>
                  <CharacterSheetView
                    character={selectedCharacter}
                    gameId={gameId}
                    partyCharacters={characters}
                    partyMonsters={monsters}
                    isDm={isDm}
                    players={players}
                    dmUserId={detail.game.dmUserId}
                    onClose={() => setSelectedCharacter(null)}
                    onCharacterUpdated={applyCharacterFromServer}
                    onMonsterUpdated={handleMonsterUpdated}
                    onInventoryTransferred={handleInventoryTransferred}
                    onMarkDead={characterActions.markDead}
                    onRevive={characterActions.reviveCharacter}
                    onArchive={characterActions.archiveCharacter}
                  />
                </Suspense>
              </Box>
            )}
            {selectedMonster && isDm && !selectedCharacter && (
              <Box
                sx={{
                  position: 'absolute',
                  inset: 0,
                  zIndex: 2,
                  display: 'flex',
                  flexDirection: 'column',
                  bgcolor: 'background.default',
                  overflow: 'auto',
                }}
              >
                <Suspense fallback={<CircularProgress sx={{ m: 'auto' }} />}>
                  <MonsterSheetView
                    gameId={gameId}
                    monster={selectedMonster}
                    partyCharacters={characters}
                    partyMonsters={monsters}
                    onClose={() => setSelectedMonster(null)}
                    onMonsterUpdated={handleMonsterUpdated}
                    onInventoryTransferred={handleInventoryTransferred}
                  />
                </Suspense>
              </Box>
            )}
          </Box>
          <GameSidebar
            game={detail.game}
            isDm={isDm}
            inviteCode={detail.game.inviteCode}
            characters={characters}
            players={detail.game.players}
            tab={menuTab}
            onTabChange={setMenuTab}
            lastRoll={lastRoll}
            onAddCharacter={() => setCreateDialogOpen(true)}
            diceTrayCounts={diceTrayCounts}
            onDiceTrayCountsChange={setDiceTrayCounts}
            onResetDiceTray={resetDiceTray}
            diceRolling={diceRolling}
            onRollDiceTray={combatActions.rollDiceTray}
            diceCharacterId={diceCharacterId}
            onDiceCharacterIdChange={setDiceCharacterId}
            onCharacterQuickRoll={combatActions.rollCharacterQuickRoll}
            diceQuickRollKind={diceQuickRollKind}
            onSelectCharacter={selectSidebarCharacter}
            onCombatRoll={combatActions.rollCharacterCombat}
            onPatchCharacterHp={characterActions.patchCharacterHp}
            hpAdjustingId={characterActions.hpAdjustingId}
            onSelectWeapon={characterActions.setCharacterWeapon}
            combatTargetOptions={combatTargetOptions}
            characterAttackTargetById={characterAttackTargetById}
            onCharacterAttackTargetChange={characterActions.setCharacterAttackTarget}
            onOpenConsume={characterActions.openConsumeDialog}
            onSelectActiveLight={characterActions.selectActiveLight}
            onToggleLightLit={characterActions.toggleLightLit}
            onExpendActiveLight={characterActions.expendActiveLight}
            consumableAdjustingId={characterActions.consumableAdjustingId}
            canEditCharacter={characterActions.canEditCharacter}
            rollingCharacterId={combatActions.rollingCharacterId}
            rollingKind={combatActions.rollingKind}
            combatRollByCharacter={combatActions.combatRollByCharacter}
            selectedCharacterId={selectedCharacter?.id}
            initiative={initiative}
            onToggleInPlay={characterActions.toggleInPlay}
            hasCharacterMapToken={characterActions.hasCharacterMapToken}
            onToggleCharacterMapToken={(c, visible) =>
              void characterActions.toggleCharacterMapToken(c, visible)
            }
            mapTokenBusyId={characterActions.mapTokenBusyId}
            onEndTurn={combatActions.endTurn}
            endTurnCharacterId={combatActions.endTurnCharacterId}
            currentUserId={user?.id}
            presenceUsers={presenceUsers}
          />
        </Box>
      </Box>
      <GameDialogs
        gameId={gameId}
        isDm={isDm}
        dmUserId={detail.game.dmUserId}
        players={players}
        characters={characters}
        monsters={monsters}
        npcTokens={npcTokens}
        currentUserId={user?.id}
        createDialogOpen={createDialogOpen}
        creatingCharacter={characterActions.creatingCharacter}
        onCloseCreateDialog={() => setCreateDialogOpen(false)}
        onCreateCharacter={characterActions.createCharacter}
        applyDamageRoll={combatActions.applyDamageRoll}
        applyingDamage={combatActions.applyingDamage}
        onCloseApplyDamage={() => combatActions.setApplyDamageRoll(null)}
        onApplyDamage={combatActions.applyDamageFromRoll}
        consumeDialog={characterActions.consumeDialog}
        consumableAdjustingId={characterActions.consumableAdjustingId}
        onCloseConsumeDialog={() => characterActions.setConsumeDialog(null)}
        onConsumeItem={characterActions.applyConsumeItem}
        corpseLootOpen={corpseLootOpen}
        corpseLootTarget={mapActions.corpseLootTarget}
        onCloseCorpseLoot={closeCorpseLoot}
        onInventoryTransferred={handleInventoryTransferred}
      />
    </AppShell>
  );
}
