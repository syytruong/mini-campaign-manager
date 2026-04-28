import jwt from 'jsonwebtoken';
import { config } from '../config';
import { AppError } from '../errors/AppError';
import { authService } from '../services/authService';
import { closeDatabase, resetDatabase } from '../test/helpers';

describe('authService', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await closeDatabase();
  });

  describe('register', () => {
    it('creates a user, returns a public projection (no passwordHash) and a valid JWT', async () => {
      const result = await authService.register({
        email: 'Alice@Example.com',
        name: '  Alice  ',
        password: 'super-secret-1',
      });

      // Email is normalised, name trimmed
      expect(result.user.email).toBe('alice@example.com');
      expect(result.user.name).toBe('Alice');
      expect(result.user.id).toMatch(/^[0-9a-f-]{36}$/);

      // Public projection never leaks the hash
      expect(result.user).not.toHaveProperty('passwordHash');
      expect(result.user).not.toHaveProperty('password_hash');

      // JWT verifies and carries the right claims
      const decoded = jwt.verify(result.token, config.jwtSecret) as {
        sub: string;
        email: string;
      };
      expect(decoded.sub).toBe(result.user.id);
      expect(decoded.email).toBe('alice@example.com');
    });

    it('rejects duplicate emails (case-insensitive) with a 409 conflict', async () => {
      await authService.register({
        email: 'bob@example.com',
        name: 'Bob',
        password: 'password123',
      });

      const dup = authService.register({
        email: 'BOB@example.com',
        name: 'Bob 2',
        password: 'password456',
      });

      await expect(dup).rejects.toBeInstanceOf(AppError);
      await expect(dup).rejects.toMatchObject({ statusCode: 409, code: 'CONFLICT' });
    });
  });

  describe('login', () => {
    it('returns the same generic error for unknown email and wrong password (no enumeration)', async () => {
      await authService.register({
        email: 'carol@example.com',
        name: 'Carol',
        password: 'correct-password',
      });

      const wrongPassword = authService
        .login({ email: 'carol@example.com', password: 'wrong-password' })
        .catch((e) => e);
      const unknownEmail = authService
        .login({ email: 'nobody@example.com', password: 'whatever' })
        .catch((e) => e);

      const [a, b] = await Promise.all([wrongPassword, unknownEmail]);

      expect(a).toBeInstanceOf(AppError);
      expect(b).toBeInstanceOf(AppError);
      expect(a.statusCode).toBe(401);
      expect(b.statusCode).toBe(401);
      // Identical message on purpose — leaking which one was wrong enables email enumeration.
      expect(a.message).toBe(b.message);
    });
  });
});
