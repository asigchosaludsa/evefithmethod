import 'server-only';
import { createHash, randomBytes } from 'crypto';

/** Long, URL-safe random invitation token (shown to the coach only once). */
export function generateInvitationToken(): string {
  return randomBytes(32).toString('base64url');
}

/** SHA-256 hash stored in the DB (never store the plain token). */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
