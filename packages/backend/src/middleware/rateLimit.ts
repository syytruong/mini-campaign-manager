import rateLimit from 'express-rate-limit';

/**
 * Strict limit for public auth endpoints.
 * 10 attempts per 15 minutes per IP — enough for a handful of typos,
 * tight enough to make credential stuffing impractical without
 * distributed sources.
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    error: {
      code: 'RATE_LIMITED',
      message: 'Too many auth attempts. Try again in a few minutes.',
    },
  },
});

/**
 * Tighter limit for registration to prevent signup spam.
 * 5 per IP per 15 minutes is conservative for a real product but
 * appropriate for a demo where we want to make abuse obviously hard.
 */
export const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    error: {
      code: 'RATE_LIMITED',
      message: 'Too many registration attempts. Try again in a few minutes.',
    },
  },
});