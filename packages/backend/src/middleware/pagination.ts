import { z } from 'zod';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

/**
 * Standard list pagination query schema.
 *
 *   ?limit=20&offset=0
 *
 * Coerces from query strings (which arrive as strings) into bounded numbers.
 * limit is clamped to [1, 100], offset >= 0.
 */
export const paginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(MAX_LIMIT).default(DEFAULT_LIMIT),
  offset: z.coerce.number().int().min(0).default(0),
});

export type Pagination = z.infer<typeof paginationSchema>;

export function paginationMeta(total: number, limit: number, offset: number) {
  return {
    total,
    limit,
    offset,
    hasMore: offset + limit < total,
  };
}
