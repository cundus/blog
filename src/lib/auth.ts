import { randomBytes, createHash } from 'node:crypto';
import { eq, and, gt } from 'drizzle-orm';
import type { AstroCookies } from 'astro';
import { db } from '../db/client';
import { sessions, type Session } from '../db/schema';

export const SESSION_COOKIE_NAME = 'session';
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

function hashToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}

export async function createSession(cookies: AstroCookies): Promise<void> {
  const rawToken = randomBytes(32).toString('base64url');
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000);

  await db.insert(sessions).values({ tokenHash, expiresAt });

  cookies.set(SESSION_COOKIE_NAME, rawToken, {
    httpOnly: true,
    secure: import.meta.env.PROD,
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export async function getSession(cookies: AstroCookies): Promise<Session | null> {
  const raw = cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!raw) return null;

  const tokenHash = hashToken(raw);
  const now = new Date();

  const rows = await db
    .select()
    .from(sessions)
    .where(and(eq(sessions.tokenHash, tokenHash), gt(sessions.expiresAt, now)))
    .limit(1);

  return rows[0] ?? null;
}

export async function deleteSession(cookies: AstroCookies): Promise<void> {
  const raw = cookies.get(SESSION_COOKIE_NAME)?.value;
  if (raw) {
    const tokenHash = hashToken(raw);
    await db.delete(sessions).where(eq(sessions.tokenHash, tokenHash));
  }
  cookies.delete(SESSION_COOKIE_NAME, { path: '/' });
}
