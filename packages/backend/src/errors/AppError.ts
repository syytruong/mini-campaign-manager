/**
 * Domain errors carry an HTTP status code and a stable string code.
 *
 * Throw these from services; the global error handler renders them.
 * Never expose generic Error messages to clients.
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: unknown;

  constructor(statusCode: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export const Errors = {
  badRequest: (msg = 'Bad request', details?: unknown): AppError =>
    new AppError(400, 'BAD_REQUEST', msg, details),
  unauthorized: (msg = 'Unauthorized'): AppError => new AppError(401, 'UNAUTHORIZED', msg),
  forbidden: (msg = 'Forbidden'): AppError => new AppError(403, 'FORBIDDEN', msg),
  notFound: (msg = 'Not found'): AppError => new AppError(404, 'NOT_FOUND', msg),
  conflict: (msg = 'Conflict'): AppError => new AppError(409, 'CONFLICT', msg),
  unprocessable: (msg = 'Unprocessable entity', details?: unknown): AppError =>
    new AppError(422, 'UNPROCESSABLE_ENTITY', msg, details),
};
