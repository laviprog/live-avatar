import { SignJWT, jwtVerify } from 'jose';
import { SessionUser } from '@/types/user';

export const SESSION_COOKIE = 'session';
export const MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 дней

function getSecretKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error('AUTH_SECRET env variable is not set');
  }
  return new TextEncoder().encode(secret);
}

/** Создаёт подписанный JWT для сессии. */
export async function signSession(user: SessionUser): Promise<string> {
  return new SignJWT({ email: user.email, role: user.role })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SECONDS}s`)
    .sign(getSecretKey());
}

/** Проверяет JWT и возвращает данные пользователя или null. */
export async function verifySession(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    if (typeof payload.email === 'string' && typeof payload.role === 'string') {
      return { email: payload.email, role: payload.role as SessionUser['role'] };
    }
    return null;
  } catch {
    return null;
  }
}
