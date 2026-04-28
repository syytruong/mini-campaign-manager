// Standard email regex — matches "looks like an email" without RFC 5322 pedantry.
// Backend Zod is the authoritative validator; this is just for inline UX feedback.
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface ParsedEmails {
  valid: string[];
  invalid: string[];
}

/**
 * Parse a free-form text block (textarea contents) into deduped, lowercased emails.
 *
 * Splitters: any whitespace OR comma OR semicolon. Empty strings are dropped.
 * Result is split into valid vs invalid so the UI can render both.
 */
export function parseEmails(input: string): ParsedEmails {
  const tokens = input
    .split(/[\s,;]+/)
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);

  const seen = new Set<string>();
  const valid: string[] = [];
  const invalid: string[] = [];

  for (const token of tokens) {
    if (seen.has(token)) continue;
    seen.add(token);
    if (EMAIL_REGEX.test(token)) valid.push(token);
    else invalid.push(token);
  }

  return { valid, invalid };
}
