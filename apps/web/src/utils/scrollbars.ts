import type { SxProps, Theme } from '@mui/material/styles';

/** Thin, low-contrast scrollbar for nested panel scroll areas. */
export const subtleScrollbarSx: SxProps<Theme> = {
  scrollbarWidth: 'thin',
  scrollbarColor: 'rgba(201, 162, 39, 0.32) transparent',
  '&::-webkit-scrollbar': {
    width: 6,
    height: 6,
  },
  '&::-webkit-scrollbar-track': {
    background: 'transparent',
  },
  '&::-webkit-scrollbar-thumb': {
    backgroundColor: 'rgba(201, 162, 39, 0.28)',
    borderRadius: 3,
  },
  '&::-webkit-scrollbar-thumb:hover': {
    backgroundColor: 'rgba(201, 162, 39, 0.45)',
  },
};
