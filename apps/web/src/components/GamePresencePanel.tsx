import { useMemo } from 'react';
import {
  Box,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Typography,
} from '@mui/material';
import CircleIcon from '@mui/icons-material/Circle';
import type { GamePresenceUser, User } from '../types/game';

interface GamePresencePanelProps {
  dmUserId: string;
  dmDisplayName: string;
  players?: { user: User }[];
  presenceUsers: GamePresenceUser[];
  currentUserId?: string;
}

type MemberRow = {
  userId: string;
  displayName: string;
  isDm: boolean;
  isPresent: boolean;
};

function buildMemberRows(
  dmUserId: string,
  dmDisplayName: string,
  players: { user: User }[],
  presenceUsers: GamePresenceUser[],
): MemberRow[] {
  const presentIds = new Set(presenceUsers.map((u) => u.userId));
  const presenceById = new Map(presenceUsers.map((u) => [u.userId, u]));

  const rows: MemberRow[] = [
    {
      userId: dmUserId,
      displayName: presenceById.get(dmUserId)?.displayName ?? dmDisplayName,
      isDm: true,
      isPresent: presentIds.has(dmUserId),
    },
  ];

  for (const p of players) {
    if (p.user.id === dmUserId) continue;
    rows.push({
      userId: p.user.id,
      displayName: presenceById.get(p.user.id)?.displayName ?? p.user.displayName,
      isDm: false,
      isPresent: presentIds.has(p.user.id),
    });
  }

  return rows.sort((a, b) => {
    if (a.isDm !== b.isDm) return a.isDm ? -1 : 1;
    if (a.isPresent !== b.isPresent) return a.isPresent ? -1 : 1;
    return a.displayName.localeCompare(b.displayName);
  });
}

export function GamePresencePanel({
  dmUserId,
  dmDisplayName,
  players = [],
  presenceUsers,
  currentUserId,
}: GamePresencePanelProps) {
  const members = useMemo(
    () => buildMemberRows(dmUserId, dmDisplayName, players, presenceUsers),
    [dmUserId, dmDisplayName, players, presenceUsers],
  );

  const presentCount = members.filter((m) => m.isPresent).length;

  if (members.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        No game members yet.
      </Typography>
    );
  }

  return (
    <>
      <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
        {presentCount} of {members.length} in the game room
      </Typography>
      <List dense disablePadding>
        {members.map((member) => {
          const isYou = currentUserId != null && member.userId === currentUserId;
          return (
            <ListItem key={member.userId} disablePadding sx={{ py: 0.75 }}>
              <ListItemIcon sx={{ minWidth: 28 }}>
                <CircleIcon
                  sx={{
                    fontSize: 10,
                    color: member.isPresent ? 'success.main' : 'error.main',
                  }}
                />
              </ListItemIcon>
              <ListItemText
                primary={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                    <Typography variant="body2" component="span">
                      {member.displayName}
                      {isYou ? ' (you)' : ''}
                    </Typography>
                    {member.isDm && (
                      <Chip label="DM" size="small" color="primary" variant="outlined" />
                    )}
                    {!member.isPresent && (
                      <Typography variant="caption" color="text.secondary" component="span">
                        Away
                      </Typography>
                    )}
                  </Box>
                }
              />
            </ListItem>
          );
        })}
      </List>
    </>
  );
}
