export type UserRole = 'admin' | 'user';

export interface AppUser {
  email: string;
  password: string;
  role: UserRole;
  // Allowed avatar and context IDs for the 'user' role only.
  // These lists are ignored for 'admin', which has access to everything.
  avatarIds?: string[];
  contextIds?: string[];
}

// Current user data without the password, used by the UI and session.
export interface SessionUser {
  email: string;
  role: UserRole;
}
