import { AppUser } from '@/types/user';

let cachedUsers: AppUser[] | null = null;

/**
 * Reads the user list from the USERS environment variable (a JSON array).
 * Example value:
 * [
 *   { "email": "admin@example.com", "password": "secret", "role": "admin" },
 *   { "email": "user@example.com", "password": "secret", "role": "user",
 *     "avatarIds": ["avatar_1"], "contextIds": ["context_1"] }
 * ]
 */
export function getUsers(): AppUser[] {
  if (cachedUsers) return cachedUsers;

  const raw = process.env.USERS;
  if (!raw) {
    console.warn('USERS env variable is not set — no users configured');
    cachedUsers = [];
    return cachedUsers;
  }

  try {
    const parsed = JSON.parse(raw) as AppUser[];
    if (!Array.isArray(parsed)) {
      throw new Error('USERS must be a JSON array');
    }
    cachedUsers = parsed.map((u) => ({
      ...u,
      email: u.email.trim().toLowerCase(),
    }));
    return cachedUsers;
  } catch (error) {
    console.error('Failed to parse USERS env variable:', error);
    cachedUsers = [];
    return cachedUsers;
  }
}

export function getUserByEmail(email: string): AppUser | undefined {
  const normalized = email.trim().toLowerCase();
  return getUsers().find((u) => u.email === normalized);
}

/** Verifies credentials and returns the matching user on success. */
export function verifyCredentials(email: string, password: string): AppUser | null {
  const user = getUserByEmail(email);
  if (!user || user.password !== password) {
    return null;
  }
  return user;
}

export function isAdmin(user: AppUser): boolean {
  return user.role === 'admin';
}
