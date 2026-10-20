const API_URL = process.env.NEXT_PUBLIC_BASE_API_URL_HEYGEN as string;
const API_KEY = process.env.API_KEY_HEYGEN as string;

export interface LiveAvatarResponse<T> {
  code: number;
  data: T;
  message: string | null;
}

export function liveAvatarFetch(path: string, init: RequestInit = {}) {
  return fetch(new URL(path, API_URL), {
    ...init,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'X-API-KEY': API_KEY,
      ...init.headers,
    },
  });
}
