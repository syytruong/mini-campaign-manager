import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Button,
  ButtonGroup,
  Center,
  Divider,
  Flex,
  Heading,
  HStack,
  IconButton,
  Spacer,
  Spinner,
  Stack,
  Table,
  TableContainer,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tooltip,
  Tr,
} from '@chakra-ui/react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ApiError } from '../api/client';
import { campaignKeys, campaignsApi, useCampaign, useCampaignStats } from '../api/campaigns';
import { AddRecipientsModal } from '../components/AddRecipientModal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { EmptyState } from '../components/EmptyState';
import { ErrorAlert } from '../components/ErrorAlert';
import { ScheduleModal } from '../components/ScheduleModal';
import { StatsPanel } from '../components/StatsPanel';
import { StatusBadge } from '../components/StatusBadge';
import type { Recipient } from '../types';

type DialogState =
  | { kind: 'closed' }
  | { kind: 'schedule' }
  | { kind: 'send' }
  | { kind: 'delete' }
  | { kind: 'addRecipients' }
  | { kind: 'removeRecipient'; recipient: Recipient };

export function CampaignDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const campaignQuery = useCampaign(id);
  const statsQuery = useCampaignStats(id, campaignQuery.data?.status);

  const [dialog, setDialog] = useState<DialogState>({ kind: 'closed' });
  const close = (): void => setDialog({ kind: 'closed' });

  const invalidateAll = (): void => {
    queryClient.invalidateQueries({ queryKey: campaignKeys.all });
    if (id) {
      queryClient.invalidateQueries({ queryKey: campaignKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: campaignKeys.stats(id) });
    }
  };

  const scheduleMutation = useMutation({
    mutationFn: (iso: string) => campaignsApi.schedule(id!, iso),
    onSuccess: () => {
      invalidateAll();
      close();
    },
  });

  const sendMutation = useMutation({
    mutationFn: () => campaignsApi.send(id!),
    onSuccess: () => {
      invalidateAll();
      close();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => campaignsApi.remove(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: campaignKeys.all });
      navigate('/campaigns', { replace: true });
    },
  });

  const addRecipientsMutation = useMutation({
    mutationFn: (emails: string[]) => campaignsApi.addRecipients(id!, emails),
    onSuccess: () => {
      invalidateAll();
      close();
    },
  });

  const removeRecipientMutation = useMutation({
    mutationFn: (recipientId: string) => campaignsApi.removeRecipient(id!, recipientId),
    onSuccess: () => {
      invalidateAll();
      close();
    },
  });

  if (!id) {
    return <ErrorAlert error={new Error('Missing campaign id')} />;
  }

  if (campaignQuery.isLoading) {
    return (
      <Center py={16}>
        <Spinner />
      </Center>
    );
  }

  if (campaignQuery.isError) {
    const err = campaignQuery.error;
    if (err instanceof ApiError && err.status === 404) {
      return (
        <Box>
          <Heading size="md" mb={2}>
            Campaign not found
          </Heading>
          <Text color="gray.600" mb={4}>
            This campaign doesn&rsquo;t exist or you don&rsquo;t have access to it.
          </Text>
          <Button onClick={() => navigate('/campaigns')}>Back to campaigns</Button>
        </Box>
      );
    }
    return <ErrorAlert error={err} />;
  }

  const campaign = campaignQuery.data!;
  const status = campaign.status;
  const recipientCount = campaign.recipients.length;

  // Action visibility per status
  const canSchedule = status === 'draft';
  const canSend = status === 'draft' || status === 'scheduled';
  const canDelete = status === 'draft';
  const canEditRecipients = status === 'draft' || status === 'scheduled';

  const sendDisabledReason =
    recipientCount === 0 ? 'Add at least one recipient before sending.' : undefined;

  return (
    <Stack spacing={6}>
      {/* Header */}
      <Flex align="flex-start">
        <Box>
          <HStack mb={1}>
            <Button size="xs" variant="ghost" onClick={() => navigate('/campaigns')}>
              ← Back
            </Button>
          </HStack>
          <HStack mb={2} spacing={3}>
            <Heading size="lg">{campaign.name}</Heading>
            <StatusBadge status={status} />
          </HStack>
          <Text color="gray.600">{campaign.subject}</Text>
          {campaign.scheduledAt && (
            <Text color="gray.500" fontSize="sm" mt={1}>
              Scheduled for {new Date(campaign.scheduledAt).toLocaleString()}
            </Text>
          )}
        </Box>
        <Spacer />
        <ButtonGroup>
          {canSchedule && (
            <Button onClick={() => setDialog({ kind: 'schedule' })} variant="outline">
              Schedule
            </Button>
          )}
          {canSend && (
            <Tooltip label={sendDisabledReason} isDisabled={!sendDisabledReason} hasArrow>
              {/* Tooltip needs a wrapper around a disabled button */}
              <Box>
                <Button
                  colorScheme="blue"
                  onClick={() => setDialog({ kind: 'send' })}
                  isDisabled={recipientCount === 0}
                >
                  Send now
                </Button>
              </Box>
            </Tooltip>
          )}
          {canDelete && (
            <Button colorScheme="red" variant="ghost" onClick={() => setDialog({ kind: 'delete' })}>
              Delete
            </Button>
          )}
        </ButtonGroup>
      </Flex>

      {/* Stats */}
      {statsQuery.data && <StatsPanel stats={statsQuery.data} />}

      {/* Body preview */}
      <Box bg="white" borderWidth="1px" borderRadius="md" p={5}>
        <Heading size="sm" mb={3}>
          Body
        </Heading>
        <Text whiteSpace="pre-wrap" color="gray.800">
          {campaign.body}
        </Text>
      </Box>

      {/* Recipients */}
      <Box bg="white" borderWidth="1px" borderRadius="md" p={5}>
        <Flex mb={3} align="center">
          <HStack>
            <Heading size="sm">Recipients</Heading>
            <Text fontSize="sm" color="gray.500">
              ({recipientCount})
            </Text>
          </HStack>
          <Spacer />
          {canEditRecipients && recipientCount > 0 && (
            <Button size="sm" onClick={() => setDialog({ kind: 'addRecipients' })}>
              Add recipients
            </Button>
          )}
        </Flex>

        {recipientCount === 0 ? (
          <EmptyState
            title="No recipients yet"
            description={
              canEditRecipients
                ? 'Add at least one recipient before you can send this campaign.'
                : 'This campaign has no recipients.'
            }
            action={
              canEditRecipients && (
                <Button
                  colorScheme="blue"
                  mt={2}
                  onClick={() => setDialog({ kind: 'addRecipients' })}
                >
                  Add recipients
                </Button>
              )
            }
          />
        ) : (
          <TableContainer borderWidth="1px" borderRadius="md">
            <Table size="sm">
              <Thead bg="gray.50">
                <Tr>
                  <Th>Email</Th>
                  <Th>Name</Th>
                  <Th>Added</Th>
                  {canEditRecipients && <Th aria-label="Actions" w="1" />}
                </Tr>
              </Thead>
              <Tbody>
                {campaign.recipients.map((r) => (
                  <Tr key={r.id}>
                    <Td fontFamily="mono" fontSize="sm">
                      {r.email}
                    </Td>
                    <Td color="gray.700">{r.name ?? '—'}</Td>
                    <Td color="gray.600" fontSize="sm">
                      {new Date(r.createdAt).toLocaleDateString()}
                    </Td>
                    {canEditRecipients && (
                      <Td>
                        <IconButton
                          aria-label={`Remove ${r.email}`}
                          size="xs"
                          variant="ghost"
                          colorScheme="red"
                          icon={<span aria-hidden>×</span>}
                          onClick={() => setDialog({ kind: 'removeRecipient', recipient: r })}
                        />
                      </Td>
                    )}
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </TableContainer>
        )}
      </Box>

      <Divider />
      <Text fontSize="xs" color="gray.500">
        Created {new Date(campaign.createdAt).toLocaleString()}
        {campaign.updatedAt !== campaign.createdAt &&
          ` · Updated ${new Date(campaign.updatedAt).toLocaleString()}`}
      </Text>

      {/* Dialogs */}
      <ScheduleModal
        isOpen={dialog.kind === 'schedule'}
        onClose={() => {
          scheduleMutation.reset();
          close();
        }}
        onConfirm={(iso) => scheduleMutation.mutate(iso)}
        isSubmitting={scheduleMutation.isPending}
        error={scheduleMutation.error}
      />

      <ConfirmDialog
        isOpen={dialog.kind === 'send'}
        onClose={() => {
          sendMutation.reset();
          close();
        }}
        onConfirm={() => sendMutation.mutate()}
        title="Send this campaign?"
        description={
          <>
            This will start sending to <strong>{recipientCount}</strong> recipient
            {recipientCount === 1 ? '' : 's'}. Once sent, the campaign cannot be edited or sent
            again.
          </>
        }
        confirmLabel="Send now"
        confirmColorScheme="blue"
        isSubmitting={sendMutation.isPending}
        error={sendMutation.error}
      />

      <ConfirmDialog
        isOpen={dialog.kind === 'delete'}
        onClose={() => {
          deleteMutation.reset();
          close();
        }}
        onConfirm={() => deleteMutation.mutate()}
        title="Delete this campaign?"
        description={
          <>
            <strong>{campaign.name}</strong> will be permanently deleted. This cannot be undone.
          </>
        }
        confirmLabel="Delete"
        isSubmitting={deleteMutation.isPending}
        error={deleteMutation.error}
      />

      <AddRecipientsModal
        isOpen={dialog.kind === 'addRecipients'}
        onClose={() => {
          addRecipientsMutation.reset();
          close();
        }}
        onConfirm={(emails) => addRecipientsMutation.mutate(emails)}
        isSubmitting={addRecipientsMutation.isPending}
        error={addRecipientsMutation.error}
      />

      <ConfirmDialog
        isOpen={dialog.kind === 'removeRecipient'}
        onClose={() => {
          removeRecipientMutation.reset();
          close();
        }}
        onConfirm={() => {
          if (dialog.kind !== 'removeRecipient') return;
          removeRecipientMutation.mutate(dialog.recipient.id);
        }}
        title="Remove this recipient?"
        description={
          dialog.kind === 'removeRecipient' ? (
            <>
              <strong>{dialog.recipient.email}</strong> will no longer receive this campaign.
            </>
          ) : null
        }
        confirmLabel="Remove"
        isSubmitting={removeRecipientMutation.isPending}
        error={removeRecipientMutation.error}
      />
    </Stack>
  );
}