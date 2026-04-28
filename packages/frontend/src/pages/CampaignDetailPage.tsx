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
  Tr,
} from '@chakra-ui/react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ApiError } from '../api/client';
import { campaignKeys, campaignsApi, useCampaign, useCampaignStats } from '../api/campaigns';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { ErrorAlert } from '../components/ErrorAlert';
import { ScheduleModal } from '../components/ScheduleModal';
import { StatsPanel } from '../components/StatsPanel';
import { StatusBadge } from '../components/StatusBadge';

type DialogState = 'closed' | 'schedule' | 'send' | 'delete';

export function CampaignDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const campaignQuery = useCampaign(id);
  const statsQuery = useCampaignStats(id, campaignQuery.data?.status);

  const [dialog, setDialog] = useState<DialogState>('closed');
  const close = (): void => setDialog('closed');

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

  // Action visibility per status
  const canSchedule = status === 'draft';
  const canSend = status === 'draft' || status === 'scheduled';
  const canDelete = status === 'draft';

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
            <Button onClick={() => setDialog('schedule')} variant="outline">
              Schedule
            </Button>
          )}
          {canSend && (
            <Button colorScheme="blue" onClick={() => setDialog('send')}>
              Send now
            </Button>
          )}
          {canDelete && (
            <Button colorScheme="red" variant="ghost" onClick={() => setDialog('delete')}>
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
        <HStack mb={3}>
          <Heading size="sm">Recipients</Heading>
          <Text fontSize="sm" color="gray.500">
            ({campaign.recipients.length})
          </Text>
        </HStack>
        {campaign.recipients.length === 0 ? (
          <Text color="gray.500" fontSize="sm">
            No recipients on this campaign.
          </Text>
        ) : (
          <TableContainer borderWidth="1px" borderRadius="md">
            <Table size="sm">
              <Thead bg="gray.50">
                <Tr>
                  <Th>Email</Th>
                  <Th>Name</Th>
                  <Th>Added</Th>
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
        isOpen={dialog === 'schedule'}
        onClose={() => {
          scheduleMutation.reset();
          close();
        }}
        onConfirm={(iso) => scheduleMutation.mutate(iso)}
        isSubmitting={scheduleMutation.isPending}
        error={scheduleMutation.error}
      />

      <ConfirmDialog
        isOpen={dialog === 'send'}
        onClose={() => {
          sendMutation.reset();
          close();
        }}
        onConfirm={() => sendMutation.mutate()}
        title="Send this campaign?"
        description={
          <>
            This will start sending to <strong>{campaign.recipients.length}</strong> recipient
            {campaign.recipients.length === 1 ? '' : 's'}. Once sent, the campaign cannot be edited
            or sent again.
          </>
        }
        confirmLabel="Send now"
        confirmColorScheme="blue"
        isSubmitting={sendMutation.isPending}
        error={sendMutation.error}
      />

      <ConfirmDialog
        isOpen={dialog === 'delete'}
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
    </Stack>
  );
}
