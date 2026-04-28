import {
  Box,
  Heading,
  HStack,
  Progress,
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
  Text,
  Tooltip,
} from '@chakra-ui/react';
import type { CampaignStats } from '../types';

interface Props {
  stats: CampaignStats;
}

function pct(rate: number): string {
  return `${Math.round(rate * 1000) / 10}%`;
}

export function StatsPanel({ stats }: Props) {
  return (
    <Box bg="white" borderWidth="1px" borderRadius="md" p={5}>
      <Heading size="sm" mb={4}>
        Stats
      </Heading>

      <SimpleGrid columns={{ base: 2, md: 4 }} spacing={4} mb={6}>
        <Stat>
          <StatLabel color="gray.600">Total recipients</StatLabel>
          <StatNumber fontSize="2xl">{stats.total}</StatNumber>
        </Stat>
        <Stat>
          <StatLabel color="gray.600">Sent</StatLabel>
          <StatNumber fontSize="2xl" color="green.600">
            {stats.sent}
          </StatNumber>
        </Stat>
        <Stat>
          <StatLabel color="gray.600">Failed</StatLabel>
          <StatNumber fontSize="2xl" color="red.500">
            {stats.failed}
          </StatNumber>
        </Stat>
        <Stat>
          <StatLabel color="gray.600">Opened</StatLabel>
          <StatNumber fontSize="2xl" color="blue.600">
            {stats.opened}
          </StatNumber>
        </Stat>
      </SimpleGrid>

      <Box mb={4}>
        <HStack justify="space-between" mb={1}>
          <Tooltip label="Successfully sent / total recipients" placement="top" hasArrow>
            <Text fontSize="sm" fontWeight="medium" cursor="help">
              Send rate
            </Text>
          </Tooltip>
          <Text fontSize="sm" color="gray.600">
            {pct(stats.send_rate)} ({stats.sent} / {stats.total})
          </Text>
        </HStack>
        <Progress value={stats.send_rate * 100} colorScheme="green" size="sm" borderRadius="full" />
      </Box>

      <Box>
        <HStack justify="space-between" mb={1}>
          <Tooltip label="Opened / successfully sent" placement="top" hasArrow>
            <Text fontSize="sm" fontWeight="medium" cursor="help">
              Open rate
            </Text>
          </Tooltip>
          <Text fontSize="sm" color="gray.600">
            {pct(stats.open_rate)} ({stats.opened} / {stats.sent})
          </Text>
        </HStack>
        <Progress value={stats.open_rate * 100} colorScheme="blue" size="sm" borderRadius="full" />
      </Box>
    </Box>
  );
}
