import {
  Avatar,
  Box,
  Button,
  Container,
  Flex,
  HStack,
  Heading,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Spacer,
  Text,
} from '@chakra-ui/react';
import { Link as RouterLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

export function AppLayout() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

  const handleLogout = (): void => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <Box minH="100vh" bg="gray.50">
      <Box as="header" bg="white" borderBottomWidth="1px" px={6} py={3}>
        <Flex align="center" maxW="6xl" mx="auto">
          <HStack spacing={6}>
            <Heading
              as={RouterLink}
              to="/campaigns"
              size="md"
              _hover={{ textDecoration: 'none' }}
            >
              Mini Campaign Manager
            </Heading>
            <Button as={RouterLink} to="/campaigns" variant="ghost" size="sm">
              Campaigns
            </Button>
          </HStack>
          <Spacer />
          {user && (
            <Menu>
              <MenuButton as={Button} variant="ghost" size="sm" rightIcon={<Avatar size="2xs" name={user.name} />}>
                <Text fontSize="sm">{user.name}</Text>
              </MenuButton>
              <MenuList>
                <MenuItem onClick={handleLogout}>Sign out</MenuItem>
              </MenuList>
            </Menu>
          )}
        </Flex>
      </Box>

      <Container maxW="6xl" py={8}>
        <Outlet />
      </Container>
    </Box>
  );
}
