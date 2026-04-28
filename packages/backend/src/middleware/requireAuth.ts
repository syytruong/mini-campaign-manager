import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { Errors } from '../errors/AppError';

export interface AuthedUser {
  id: string;
  email: string;
}

declare module 'express-serve-static-core' {
  interface Request {
    user?: AuthedUser;
  }
}

interface JwtPayloadShape {
  sub: string;
  email: string;
}

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return next(Errors.unauthorized('Missing or malformed Authorization header'));
  }

  const token = header.slice('Bearer '.length).trim();
  try {
    const payload = jwt.verify(token, config.jwtSecret) as JwtPayloadShape;
    req.user = { id: payload.sub, email: payload.email };
    next();
  } catch {
    next(Errors.unauthorized('Invalid or expired token'));
  }
}
