import { useState } from 'react';
import {
  Button,
  ButtonGroup,
  FormControl,
  FormHelperText,
  FormLabel,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Stack,
} from '@chakra-ui/react';
import { ErrorAlert } from './ErrorAlert';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (isoString: string) => void;
  isSubmitting: boolean;
  error: unknown;
}

/** Get an ISO-formatted "YYYY-MM-DDTHH:MM" suitable for <input type="datetime-local">. */
function defaultLocalValue(): string {
  // Default to "in 1 hour from now" — a sensible starting point.
  const d = new Date(Date.now() + 60 * 60 * 1000);
  // Strip seconds and timezone for the input
  const pad = (n: number): string => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function ScheduleModal({ isOpen, onClose, onConfirm, isSubmitting, error }: Props) {
  const [value, setValue] = useState<string>(() => defaultLocalValue());

  const handleConfirm = (): void => {
    if (!value) return;
    // Browser interprets the input as local time; convert to ISO 8601 (UTC).
    const date = new Date(value);
    onConfirm(date.toISOString());
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Schedule campaign</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <Stack spacing={4}>
            {Boolean(error) && <ErrorAlert error={error} title="Failed to schedule" />}
            <FormControl isRequired>
              <FormLabel>Send at</FormLabel>
              <Input
                type="datetime-local"
                value={value}
                onChange={(e) => setValue(e.target.value)}
              />
              <FormHelperText>Must be in the future. Local time.</FormHelperText>
            </FormControl>
          </Stack>
        </ModalBody>
        <ModalFooter>
          <ButtonGroup>
            <Button variant="ghost" onClick={onClose} isDisabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              colorScheme="blue"
              onClick={handleConfirm}
              isLoading={isSubmitting}
              loadingText="Scheduling"
              isDisabled={!value}
            >
              Schedule
            </Button>
          </ButtonGroup>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}