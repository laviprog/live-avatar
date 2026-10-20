export type UserRole = 'admin' | 'user';

// How a user configures a session:
// - 'persona': the avatar's default voice plus an optional context (deprecated avatar_persona API)
// - 'voiceAgent': a stored voice agent that defines the voice and context
export type SessionSetup = 'persona' | 'voiceAgent';

export interface AppUser {
  email: string;
  password: string;
  role: UserRole;
  avatarIds?: string[];
  contextIds?: string[];
  voiceAgentIds?: string[];
  sessionSetup?: SessionSetup;
}

export interface SessionUser {
  email: string;
  role: UserRole;
}

export interface UserProfile extends SessionUser {
  sessionSetup: SessionSetup;
}
