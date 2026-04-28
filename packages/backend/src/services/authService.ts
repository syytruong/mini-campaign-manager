import bcrypt from 'bcrypt';
import jwt, { type SignOptions } from 'jsonwebtoken';
import { UniqueConstraintError } from 'sequelize';
import { config } from '../config';
import { Errors } from '../errors/AppError';
import { User, type UserPublic } from '../models/User';

const BCRYPT_COST = 12;

export interface RegisterInput {
  email: string;
  name: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface AuthResult {
  user: UserPublic;
  token: string;
}

function signToken(user: User): string {
  return jwt.sign({ sub: user.id, email: user.email }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn as SignOptions['expiresIn'],
  });
}

export const authService = {
  async register(input: RegisterInput): Promise<AuthResult> {
    const email = input.email.trim().toLowerCase();
    const passwordHash = await bcrypt.hash(input.password, BCRYPT_COST);

    let user: User;
    try {
      user = await User.create({
        email,
        name: input.name.trim(),
        passwordHash,
      });
    } catch (err) {
      if (err instanceof UniqueConstraintError) {
        throw Errors.conflict('Email is already registered');
      }
      throw err;
    }

    return { user: user.toPublic(), token: signToken(user) };
  },

  async login(input: LoginInput): Promise<AuthResult> {
    const email = input.email.trim().toLowerCase();
    const user = await User.findOne({ where: { email } });

    // Same error in both branches — never reveal whether the email exists.
    const generic = Errors.unauthorized('Invalid email or password');
    if (!user) throw generic;

    const ok = await bcrypt.compare(input.password, user.passwordHash);
    if (!ok) throw generic;

    return { user: user.toPublic(), token: signToken(user) };
  },
};
