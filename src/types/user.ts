export type UserRole = 'admin' | 'user';

export interface AppUser {
  email: string;
  password: string;
  role: UserRole;
  // Только для роли 'user': разрешённые id аватаров и контекстов.
  // У 'admin' игнорируются — доступ ко всему.
  avatarIds?: string[];
  contextIds?: string[];
}

// Данные о текущем пользователе без пароля (для UI/сессии).
export interface SessionUser {
  email: string;
  role: UserRole;
}
