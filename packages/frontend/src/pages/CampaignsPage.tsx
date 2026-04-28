import { useMemo } from 'react';
import { Link as RouterLink, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Box,
  Button,
  Center,
  Flex,
  Heading,
  HStack,
  Select,
  Spacer,
  Spinner,
  Table,
  TableContainer,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
} from '@chakra-ui/react';
import { useCampaignsList } from '../api/campaigns';
import { EmptyState } from '../components/EmptyState';
import { ErrorAlert } from '../components/ErrorAlert';
import { StatusBadge } from '../components/StatusBadge';
import type { CampaignStatus } from '../types';

const PAGE_SIZE = 20;
const STATUS_OPTIONS: Array<{ value: '' | CampaignStatus; label: string }> = [
  { value: '', label: 'All statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'sending', label: 'Sending' },
  { value: 'sent', label: 'Sent' },
];

export function CampaignsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const status = (searchParams.get('status') as CampaignStatus | null) || undefined;
  const page = Number(searchParams.get('page') || '1');
  const offset = (page - 1) * PAGE_SIZE;

  const params = useMemo(
    () => ({ limit: PAGE_SIZE, offset, status }),
    [offset, status],
  );

  const { data, isLoading, isError, error, isPlaceholderData } = useCampaignsList(params);

  const onStatusChange = (value: string): void => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set('status', value);
    else next.delete('status');
    next.delete('page'); // reset to page 1 when filter changes
    setSearchParams(next);
  };

  const goToPage = (nextPage: number): void => {
    const next = new URLSearchParams(searchParams);
    if (nextPage <= 1) next.delete('page');
    else next.set('page', String(nextPage));
    setSearchParams(next);
  };

  const total = data?.pagination.total ?? 0;
  const hasMore = data?.pagination.hasMore ?? false;
  const totalPages = total === 0 ? 1 : Math.ceil(total / PAGE_SIZE);

  return (
    <Box>
      <Flex align="center" mb={6}>
        <Box>
          <Heading size="lg">Campaigns</Heading>
          <Text color="gray.600" mt={1}>
            Manage your email campaigns and track delivery
          </Text>
        </Box>
        <Spacer />
        <Button as={RouterLink} to="/campaigns/new" colorScheme="blue">
          New campaign
        </Button>
      </Flex>

      <HStack mb={4} spacing={3}>
        <Select
          size="sm"
          maxW="220px"
          value={status ?? ''}
          onChange={(e) => onStatusChange(e.target.value)}
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value || 'all'} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </Select>
        {data && (
          <Text fontSize="sm" color="gray.600">
            {total} campaign{total === 1 ? '' : 's'}
          </Text>
        )}
      </HStack>

      {isError && <ErrorAlert error={error} />}

      {isLoading && !data && (
        <Center py={16}>
          <Spinner />
        </Center>
      )}

      {data && data.data.length === 0 && (
        <EmptyState
          title={status ? `No ${status} campaigns` : 'No campaigns yet'}
          description={
            status
              ? 'Try a different status or clear the filter.'
              : 'Create your first campaign to start sending emails.'
          }
          action={
            !status && (
              <Button as={RouterLink} to="/campaigns/new" colorScheme="blue" mt={2}>
                New campaign
              </Button>
            )
          }
        />
      )}

      {data && data.data.length > 0 && (
        <Box opacity={isPlaceholderData ? 0.6 : 1} transition="opacity 0.2s">
          <TableContainer borderWidth="1px" borderRadius="md" bg="white">
            <Table size="sm">
              <Thead bg="gray.50">
                <Tr>
                  <Th>Name</Th>
                  <Th>Status</Th>
                  <Th>Subject</Th>
                  <Th>Created</Th>
                </Tr>
              </Thead>
              <Tbody>
                {data.data.map((c) => (
                  <Tr
                    key={c.id}
                    cursor="pointer"
                    _hover={{ bg: 'gray.50' }}
                    onClick={() => navigate(`/campaigns/${c.id}`)}
                  >
                    <Td fontWeight="medium">{c.name}</Td>
                    <Td>
                      <StatusBadge status={c.status} />
                    </Td>
                    <Td color="gray.600" maxW="240px" isTruncated>
                      {c.subject}
                    </Td>
                    <Td color="gray.600">{new Date(c.createdAt).toLocaleDateString()}</Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </TableContainer>

          <Flex mt={4} align="center">
            <Text fontSize="sm" color="gray.600">
              Page {page} of {totalPages}
            </Text>
            <Spacer />
            <HStack>
              <Button
                size="sm"
                onClick={() => goToPage(page - 1)}
                isDisabled={page <= 1 || isPlaceholderData}
              >
                Previous
              </Button>
              <Button
                size="sm"
                onClick={() => goToPage(page + 1)}
                isDisabled={!hasMore || isPlaceholderData}
              >
                Next
              </Button>
            </HStack>
          </Flex>
        </Box>
      )}
    </Box>
  );
}
