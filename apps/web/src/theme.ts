import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#c9a227' },
    secondary: { main: '#8b4513' },
    background: { default: '#12100e', paper: '#1c1814' },
  },
  typography: {
    fontFamily: '"Source Sans 3", sans-serif',
    h4: { fontFamily: '"Cinzel", serif' },
    h5: { fontFamily: '"Cinzel", serif' },
    h6: { fontFamily: '"Cinzel", serif' },
  },
});
