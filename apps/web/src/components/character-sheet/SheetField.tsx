import { TextField, type TextFieldProps } from '@mui/material';
import { sheetColors, sheetFont } from './sheet-theme';

export function SheetField(props: TextFieldProps) {
  return (
    <TextField
      size="small"
      variant="outlined"
      fullWidth
      {...props}
      slotProps={{
        ...props.slotProps,
        input: {
          sx: {
            fontFamily: sheetFont.label,
            fontWeight: 600,
            color: sheetColors.ink,
            bgcolor: sheetColors.field,
            '& fieldset': { borderColor: sheetColors.border, borderWidth: 2 },
          },
          ...props.slotProps?.input,
        },
      }}
    />
  );
}
