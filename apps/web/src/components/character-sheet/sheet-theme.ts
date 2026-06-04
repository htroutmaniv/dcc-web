/** Classic DCC funnel sheet — light parchment, always dark readable text */
export const sheetColors = {
  paper: '#ebe4d3',
  paperDark: '#ddd3bc',
  field: '#c8b88a',
  fieldText: '#2a2218',
  ink: '#2a2218',
  inkMuted: '#5a4d3a',
  border: '#3d3428',
  weaponFill: '#5c2323',
  weaponText: '#f8f4ea',
  accent: '#8b4513',
};

export const sheetFont = {
  label: '"Source Sans 3", "Arial Narrow", sans-serif',
  title: '"Source Sans 3", sans-serif',
};

/** Apply to sheet root so MUI dark theme does not force white text */
export const sheetRootSx = {
  color: sheetColors.ink,
  bgcolor: sheetColors.paper,
  '& .MuiTypography-root': {
    color: 'inherit',
  },
};
