import { useRef } from 'react';
import {
  AlertDialog,
  AlertDialogBody,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogOverlay,
  Button,
  ButtonGroup,
} from '@chakra-ui/react';
import { ErrorAlert } from './ErrorAlert';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: React.ReactNode;
  confirmLabel: string;
  confirmColorScheme?: string;
  isSubmitting?: boolean;
  error?: unknown;
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel,
  confirmColorScheme = 'red',
  isSubmitting = false,
  error,
}: Props) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  return (
    <AlertDialog
      isOpen={isOpen}
      leastDestructiveRef={cancelRef}
      onClose={onClose}
      isCentered
    >
      <AlertDialogOverlay>
        <AlertDialogContent>
          <AlertDialogHeader fontSize="lg" fontWeight="bold">
            {title}
          </AlertDialogHeader>
          <AlertDialogBody>
            {Boolean(error) && <ErrorAlert error={error} />}
            {description}
          </AlertDialogBody>
          <AlertDialogFooter>
            <ButtonGroup>
              <Button ref={cancelRef} onClick={onClose} variant="ghost" isDisabled={isSubmitting}>
                Cancel
              </Button>
              <Button
                colorScheme={confirmColorScheme}
                onClick={onConfirm}
                isLoading={isSubmitting}
              >
                {confirmLabel}
              </Button>
            </ButtonGroup>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialogOverlay>
    </AlertDialog>
  );
}