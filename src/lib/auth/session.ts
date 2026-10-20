import { cookies } from 'next/headers';
import { BASE_PATH } from '@/lib/utils';
import type { AppUser, SessionUser } from '@/types/user';
import { MAX_AGE_SECONDS, SESSION_COOKIE, signSession, verifySession } from './jwt';
import { getUserByEmail } from './users';

// Scope the cookie to this app so it is not shared with other apps on the same domain
const COOKIE_PATH = BASE_PATH || '/';

/** Sets the session cookie. Call from a route handler or server action. */
export async function setSessionCookie(user: SessionUser): Promise<void> {
  const token = await signSession(user);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: COOKIE_PATH,
    maxAge: MAX_AGE_SECONDS,
  });
}

/**
 * Expires the session cookie on the given response. Cookies issued before the cookie was scoped
 * to BASE_PATH live on "/", so that path is cleared too (cookies() keeps one entry per name).
 */
export function clearSessionCookie(response: Response): Response {
  for (const path of new Set([COOKIE_PATH, '/'])) {
    response.headers.append(
      'Set-Cookie',
      `${SESSION_COOKIE}=; Path=${path}; Max-Age=0; HttpOnly; SameSite=Lax`
    );
  }
  return response;
}

/** Returns the current user from the server-side cookie, or null. */
export async function getSessionUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySession(token);
}

/**
 * Returns the configured user behind the session cookie, or null.
 * Resolving against USERS (not just the JWT) means removed users and role changes apply at once.
 */
export async function getCurrentUser(): Promise<AppUser | null> {
  const session = await getSessionUser();
  if (!session) return null;
  return getUserByEmail(session.email) ?? null;
}
