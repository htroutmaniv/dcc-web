import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from '@mui/material';

interface DeleteGameDialogProps {
  open: boolean;
  gameTitle: string;
  deleting?: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function DeleteGameDialog({
  open,
  gameTitle,
  deleting = false,
  onClose,
  onConfirm,
}: DeleteGameDialogProps) {
  return (
    <Dialog open={open} onClose={deleting ? undefined : onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Delete game?</DialogTitle>
      <DialogContent>
        <DialogContentText>
          Permanently delete <strong>{gameTitle}</strong>? All characters, maps, monsters, and
          roll history for this session will be removed. This cannot be undone.
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={deleting}>
          Cancel
        </Button>
        <Button color="error" variant="contained" onClick={onConfirm} disabled={deleting}>
          {deleting ? 'Deleting…' : 'Delete game'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
