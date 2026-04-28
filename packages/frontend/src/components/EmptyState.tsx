import { Box, Heading, Stack, Text } from '@chakra-ui/react';

interface Props {
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ title, description, action }: Props) {
  return (
    <Box
      borderWidth="1px"
      borderStyle="dashed"
      borderRadius="md"
      py={12}
      px={6}
      textAlign="center"
    >
      <Stack spacing={3} align="center">
        <Heading size="md">{title}</Heading>
        {description && (
          <Text color="gray.600" maxW="md">
            {description}
          </Text>
        )}
        {action}
      </Stack>
    </Box>
  );
}
