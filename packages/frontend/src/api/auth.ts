import { apiRequest } from './client';
import type { AuthResult } from '../types';

export interface RegisterPayload {
  email: string;
  name: string;
  password: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export const authApi = {
  register: (payload: RegisterPayload) =>
    apiRequest<AuthResult>('/auth/register', {
      method: 'POST',
      body: payload,
      skipAuth: true,
    }),

  login: (payload: LoginPayload) =>
    apiRequest<AuthResult>('/auth/login', {
      method: 'POST',
      body: payload,
      skipAuth: true,
    }),
};
