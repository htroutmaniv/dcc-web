import type { ReactNode } from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  List,
  Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import type { Character, User } from '../types/game';
import { groupCharactersForDm } from '../utils/character-ownership';

interface DmCharacterSectionsProps {
  characters: Character[];
  players: { user: User }[];
  dmUserId: string;
  renderItem: (character: Character) => ReactNode;
}

export function DmCharacterSections({
  characters,
  players,
  dmUserId,
  renderItem,
}: DmCharacterSectionsProps) {
  const { playerSections, npcs } = groupCharactersForDm(characters, players, dmUserId);

  const sections = [
    ...playerSections,
    { id: 'npcs', title: 'NPCs', characters: npcs },
  ];

  return (
    <>
      {sections.map((section) => (
        <Accordion
          key={section.id}
          defaultExpanded
          disableGutters
          elevation={0}
          sx={{
            '&:before': { display: 'none' },
            borderBottom: 1,
            borderColor: 'divider',
            bgcolor: 'transparent',
          }}
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ minHeight: 40, px: 0 }}>
            <Typography variant="subtitle2">
              {section.title}
              <Typography
                component="span"
                variant="caption"
                color="text.secondary"
                sx={{ ml: 1 }}
              >
                ({section.characters.length})
              </Typography>
            </Typography>
          </AccordionSummary>
          <AccordionDetails sx={{ p: 0, pb: 1 }}>
            {section.characters.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ py: 0.5 }}>
                None
              </Typography>
            ) : (
              <List disablePadding>{section.characters.map((c) => renderItem(c))}</List>
            )}
          </AccordionDetails>
        </Accordion>
      ))}
    </>
  );
}
