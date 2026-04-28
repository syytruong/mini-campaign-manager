import { Alert, AlertDescription, AlertIcon, AlertTitle, Box } from '@chakra-ui/react';
import { ApiError } from '../api/client';

interface Props {
  error: unknown;
  title?: string;
}

export function ErrorAlert({ error, title }: Props) {
  const apiErr = error instanceof ApiError ? error : null;
  const code = apiErr?.code ?? 'Error';
  const message = apiErr?.message ?? (error instanceof Error ? error.message : 'Unknown error');

  return (
    <Alert status="error" borderRadius="md">
      <AlertIcon />
      <Box flex="1">
        <AlertTitle fontSize="sm">{title ?? code}</AlertTitle>
        <AlertDescription fontSize="sm">{message}</AlertDescription>
      </Box>
    </Alert>
  );
}
