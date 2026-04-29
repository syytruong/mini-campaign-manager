import { useMemo, useState } from 'react';
import {
  Box,
  Button,
  ButtonGroup,
  FormControl,
  FormErrorMessage,
  FormHelperText,
  FormLabel,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Stack,
  Tag,
  Text,
  Textarea,
  Wrap,
  WrapItem,
} from '@chakra-ui/react';
import { ErrorAlert } from './ErrorAlert';
import { parseEmails } from '../utils/parseEmails';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (emails: string[]) => void;
  isSubmitting: boolean;
  error: unknown;
}

export function AddRecipientsModal({ isOpen, onClose, onConfirm, isSubmitting, error }: Props) {
  const [raw, setRaw] = useState('');

  const parsed = useMemo(() => parseEmails(raw), [raw]);
  const canSubmit = parsed.valid.length > 0 && parsed.invalid.length === 0;

  const handleClose = (): void => {
    setRaw('');
    onClose();
  };

  const handleConfirm = (): void => {
    if (!canSubmit) return;
    onConfirm(parsed.valid);
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="lg" isCentered>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Add recipients</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <Stack spacing={4}>
            {Boolean(error) && <ErrorAlert error={error} title="Failed to add recipients" />}

            <FormControl isInvalid={parsed.invalid.length > 0}>
              <FormLabel>Recipient emails</FormLabel>
              <Textarea
                value={raw}
                onChange={(e) => setRaw(e.target.value)}
                placeholder="alice@example.com, bob@example.com&#10;carol@example.com"
                rows={5}
                fontFamily="mono"
                fontSize="sm"
              />
              <FormHelperText>
                One or more emails, separated by spaces, commas, semicolons, or new lines.
                Recipients already on this campaign will be skipped automatically.
              </FormHelperText>
              <FormErrorMessage>
                {parsed.invalid.length > 0 &&
                  `Invalid: ${parsed.invalid.slice(0, 3).join(', ')}${
                    parsed.invalid.length > 3 ? ` (+${parsed.invalid.length - 3} more)` : ''
                  }`}
              </FormErrorMessage>

              {parsed.valid.length > 0 && (
                <Box mt={3}>
                  <Text fontSize="sm" color="gray.600" mb={2}>
                    {parsed.valid.length} valid recipient{parsed.valid.length === 1 ? '' : 's'}:
                  </Text>
                  <Wrap spacing={2}>
                    {parsed.valid.slice(0, 20).map((email) => (
                      <WrapItem key={email}>
                        <Tag size="sm" colorScheme="blue">
                          {email}
                        </Tag>
                      </WrapItem>
                    ))}
                    {parsed.valid.length > 20 && (
                      <WrapItem>
                        <Tag size="sm" variant="outline">
                          +{parsed.valid.length - 20} more
                        </Tag>
                      </WrapItem>
                    )}
                  </Wrap>
                </Box>
              )}
            </FormControl>
          </Stack>
        </ModalBody>
        <ModalFooter>
          <ButtonGroup>
            <Button variant="ghost" onClick={handleClose} isDisabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              colorScheme="blue"
              onClick={handleConfirm}
              isLoading={isSubmitting}
              loadingText="Adding"
              isDisabled={!canSubmit}
            >
              Add {parsed.valid.length || ''}
            </Button>
          </ButtonGroup>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}