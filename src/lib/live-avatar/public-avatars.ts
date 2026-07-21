import { AvatarPage } from '@/types/avatar';

const API_URL = process.env.NEXT_PUBLIC_BASE_API_URL_HEYGEN!;
const API_KEY = process.env.API_KEY_HEYGEN!;
const PUBLIC_AVATARS_CACHE_TTL_SECONDS = 10 * 60 * 60;

interface LiveAvatarResponse<T> {
  code: number;
  data: T;
  message: string | null;
}

export class PublicAvatarsApiError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
    this.name = 'PublicAvatarsApiError';
  }
}

export async function getPublicAvatarPage(page: number, pageSize: number): Promise<AvatarPage> {
  const url = new URL('/v1/avatars/public', API_URL);
  url.searchParams.set('page', String(page));
  url.searchParams.set('page_size', String(pageSize));

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      'X-API-KEY': API_KEY,
    },
    next: { revalidate: PUBLIC_AVATARS_CACHE_TTL_SECONDS },
  });

  const payload = (await response
    .json()
    .catch(() => null)) as LiveAvatarResponse<AvatarPage> | null;

  if (!response.ok || !payload?.data) {
    throw new PublicAvatarsApiError(
      payload?.message || 'Failed to get public avatars',
      response.status
    );
  }

  return payload.data;
}

export async function isPublicAvatar(avatarId: string): Promise<boolean> {
  const pageSize = 100;

  for (let page = 1; page <= 100; page += 1) {
    const result = await getPublicAvatarPage(page, pageSize);

    if (result.results.some((avatar) => avatar.id === avatarId)) {
      return true;
    }

    if (!result.next) {
      return false;
    }
  }

  return false;
}
