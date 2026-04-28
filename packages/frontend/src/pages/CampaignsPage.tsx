import { Box, Heading, Text } from '@chakra-ui/react';
import { useAuthStore } from '../store/authStore';

export function CampaignsPage() {
  const user = useAuthStore((s) => s.user);
  return (
    <Box>
      <Heading size="lg">Campaigns</Heading>
      <Text color="gray.600" mt={2}>
        Welcome back, {user?.name}. Campaign list coming in the next slice.
      </Text>
    </Box>
  );
}
