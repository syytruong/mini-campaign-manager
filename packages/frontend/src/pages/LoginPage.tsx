import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import {
  Alert,
  AlertDescription,
  AlertIcon,
  AlertTitle,
  Box,
  Button,
  Container,
  FormControl,
  FormErrorMessage,
  FormLabel,
  Heading,
  Input,
  Stack,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Text,
} from '@chakra-ui/react';
import { useMutation } from '@tanstack/react-query';
import { ApiError } from '../api/client';
import { authApi, type LoginPayload, type RegisterPayload } from '../api/auth';
import { useAuthStore, useIsAuthenticated } from '../store/authStore';

interface LocationState {
  from?: string;
}

export function LoginPage() {
  const isAuthed = useIsAuthenticated();
  const location = useLocation();
  const state = (location.state as LocationState | null) ?? {};

  if (isAuthed) {
    return <Navigate to={state.from || '/campaigns'} replace />;
  }

  return (
    <Container maxW="md" py={12}>
      <Stack spacing={6}>
        <Box textAlign="center">
          <Heading size="lg">Mini Campaign Manager</Heading>
          <Text color="gray.600" mt={1}>
            Sign in to manage your campaigns
          </Text>
        </Box>

        <Tabs isFitted variant="enclosed">
          <TabList>
            <Tab>Sign in</Tab>
            <Tab>Create account</Tab>
          </TabList>
          <TabPanels>
            <TabPanel px={0}>
              <LoginForm redirectTo={state.from || '/campaigns'} />
            </TabPanel>
            <TabPanel px={0}>
              <RegisterForm redirectTo={state.from || '/campaigns'} />
            </TabPanel>
          </TabPanels>
        </Tabs>
      </Stack>
    </Container>
  );
}

interface FormProps {
  redirectTo: string;
}

function LoginForm({ redirectTo }: FormProps) {
  const navigate = useNavigate();
  const setSession = useAuthStore((s) => s.setSession);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const mutation = useMutation({
    mutationFn: (payload: LoginPayload) => authApi.login(payload),
    onSuccess: (data) => {
      setSession(data.token, data.user);
      navigate(redirectTo, { replace: true });
    },
  });

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault();
    mutation.mutate({ email, password });
  };

  return (
    <form onSubmit={handleSubmit}>
      <Stack spacing={4} mt={2}>
        {mutation.isError && <ErrorAlert error={mutation.error} />}

        <FormControl isRequired>
          <FormLabel>Email</FormLabel>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
        </FormControl>

        <FormControl isRequired>
          <FormLabel>Password</FormLabel>
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </FormControl>

        <Button
          type="submit"
          colorScheme="blue"
          isLoading={mutation.isPending}
          loadingText="Signing in"
        >
          Sign in
        </Button>
      </Stack>
    </form>
  );
}

function RegisterForm({ redirectTo }: FormProps) {
  const navigate = useNavigate();
  const setSession = useAuthStore((s) => s.setSession);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');

  const passwordTooShort = password.length > 0 && password.length < 8;

  const mutation = useMutation({
    mutationFn: (payload: RegisterPayload) => authApi.register(payload),
    onSuccess: (data) => {
      setSession(data.token, data.user);
      navigate(redirectTo, { replace: true });
    },
  });

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault();
    if (passwordTooShort) return;
    mutation.mutate({ email, name, password });
  };

  return (
    <form onSubmit={handleSubmit}>
      <Stack spacing={4} mt={2}>
        {mutation.isError && <ErrorAlert error={mutation.error} />}

        <FormControl isRequired>
          <FormLabel>Name</FormLabel>
          <Input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
        </FormControl>

        <FormControl isRequired>
          <FormLabel>Email</FormLabel>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
        </FormControl>

        <FormControl isRequired isInvalid={passwordTooShort}>
          <FormLabel>Password</FormLabel>
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            minLength={8}
          />
          <FormErrorMessage>Password must be at least 8 characters.</FormErrorMessage>
        </FormControl>

        <Button
          type="submit"
          colorScheme="blue"
          isLoading={mutation.isPending}
          loadingText="Creating account"
          isDisabled={passwordTooShort}
        >
          Create account
        </Button>
      </Stack>
    </form>
  );
}

function ErrorAlert({ error }: { error: unknown }) {
  const apiErr = error instanceof ApiError ? error : null;
  return (
    <Alert status="error" borderRadius="md">
      <AlertIcon />
      <Box flex="1">
        <AlertTitle fontSize="sm">{apiErr?.code ?? 'Error'}</AlertTitle>
        <AlertDescription fontSize="sm">
          {apiErr?.message ?? (error instanceof Error ? error.message : 'Unknown error')}
        </AlertDescription>
      </Box>
    </Alert>
  );
}
