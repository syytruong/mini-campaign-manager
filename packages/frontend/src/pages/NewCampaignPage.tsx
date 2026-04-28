import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  ButtonGroup,
  FormControl,
  FormErrorMessage,
  FormHelperText,
  FormLabel,
  Heading,
  HStack,
  Input,
  Stack,
  Tag,
  Text,
  Textarea,
  Wrap,
  WrapItem,
} from '@chakra-ui/react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { campaignKeys, campaignsApi } from '../api/campaigns';
import { ErrorAlert } from '../components/ErrorAlert';
import { parseEmails } from '../utils/parseEmails';

export function NewCampaignPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [emailsRaw, setEmailsRaw] = useState('');

  const parsed = useMemo(() => parseEmails(emailsRaw), [emailsRaw]);

  const mutation = useMutation({
    mutationFn: () =>
      campaignsApi.create({
        name,
        subject,
        body,
        recipientEmails: parsed.valid,
      }),
    onSuccess: (campaign) => {
      // Refresh the list view next time it mounts
      queryClient.invalidateQueries({ queryKey: campaignKeys.all });
      navigate(`/campaigns/${campaign.id}`, { replace: true });
    },
  });

  const canSubmit =
    name.trim().length > 0 &&
    subject.trim().length > 0 &&
    body.trim().length > 0 &&
    parsed.invalid.length === 0;

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault();
    if (!canSubmit) return;
    mutation.mutate();
  };

  return (
    <Box>
      <Heading size="lg" mb={1}>
        New campaign
      </Heading>
      <Text color="gray.600" mb={6}>
        Save as a draft. You can schedule or send it from the detail page.
      </Text>

      <Box maxW="2xl" bg="white" borderWidth="1px" borderRadius="md" p={6}>
        <form onSubmit={handleSubmit}>
          <Stack spacing={5}>
            {mutation.isError && <ErrorAlert error={mutation.error} title="Failed to create campaign" />}

            <FormControl isRequired>
              <FormLabel>Name</FormLabel>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. October Newsletter"
                maxLength={200}
              />
              <FormHelperText>Internal name. Recipients won&rsquo;t see this.</FormHelperText>
            </FormControl>

            <FormControl isRequired>
              <FormLabel>Subject line</FormLabel>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. What&rsquo;s new in October"
                maxLength={255}
              />
            </FormControl>

            <FormControl isRequired>
              <FormLabel>Body</FormLabel>
              <Textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Write your email content..."
                rows={8}
              />
            </FormControl>

            <FormControl isInvalid={parsed.invalid.length > 0}>
              <FormLabel>
                Recipient emails{' '}
                <Text as="span" color="gray.500" fontWeight="normal" fontSize="sm">
                  (optional)
                </Text>
              </FormLabel>
              <Textarea
                value={emailsRaw}
                onChange={(e) => setEmailsRaw(e.target.value)}
                placeholder="alice@example.com, bob@example.com&#10;carol@example.com"
                rows={4}
                fontFamily="mono"
                fontSize="sm"
              />
              <FormHelperText>
                One or more emails, separated by spaces, commas, semicolons, or new lines.
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

            <HStack justify="flex-end" pt={2}>
              <ButtonGroup>
                <Button
                  variant="ghost"
                  onClick={() => navigate('/campaigns')}
                  isDisabled={mutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  colorScheme="blue"
                  isLoading={mutation.isPending}
                  loadingText="Creating"
                  isDisabled={!canSubmit}
                >
                  Create draft
                </Button>
              </ButtonGroup>
            </HStack>
          </Stack>
        </form>
      </Box>
    </Box>
  );
}
