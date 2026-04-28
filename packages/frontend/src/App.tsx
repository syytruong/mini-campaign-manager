import { useEffect, useState } from 'react';
import { Badge, Box, Container, Heading, HStack, Spinner, Stack, Text } from '@chakra-ui/react';

type HealthState =
  | { kind: 'loading' }
  | { kind: 'ok'; database: string; timestamp: string }
  | { kind: 'error'; message: string };

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export function App() {
  const [health, setHealth] = useState<HealthState>({ kind: 'loading' });

  useEffect(() => {
    let cancelled = false;
    fetch(`${API_URL}/health`)
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (cancelled) return;
        setHealth({ kind: 'ok', database: data.database, timestamp: data.timestamp });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setHealth({
          kind: 'error',
          message: err instanceof Error ? err.message : 'Unknown error',
        });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Container maxW="container.md" py={10}>
      <Stack spacing={6}>
        <Box>
          <Heading size="lg">Mini Campaign Manager</Heading>
          <Text color="gray.600">Frontend scaffold — connectivity check</Text>
        </Box>
        <Box borderWidth="1px" borderRadius="md" p={5}>
          <Heading size="sm" mb={3}>
            API status
          </Heading>
          {health.kind === 'loading' && (
            <HStack>
              <Spinner size="sm" />
              <Text>Pinging {API_URL}/health…</Text>
            </HStack>
          )}
          {health.kind === 'ok' && (
            <Stack spacing={2}>
              <HStack>
                <Badge colorScheme="green">connected</Badge>
                <Text>API is reachable</Text>
              </HStack>
              <Text fontSize="sm" color="gray.600">
                Database: {health.database} · {health.timestamp}
              </Text>
            </Stack>
          )}
          {health.kind === 'error' && (
            <Stack spacing={2}>
              <HStack>
                <Badge colorScheme="red">unreachable</Badge>
                <Text>{health.message}</Text>
              </HStack>
              <Text fontSize="sm" color="gray.600">
                Make sure the backend is running at {API_URL}.
              </Text>
            </Stack>
          )}
        </Box>
      </Stack>
    </Container>
  );
}
