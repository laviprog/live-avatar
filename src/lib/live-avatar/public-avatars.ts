import type { AvatarPage } from '@/types/avatar';
import { type LiveAvatarResponse, liveAvatarFetch } from './api';

const PUBLIC_AVATARS_CACHE_TTL_SECONDS = 10 * 60 * 60;

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
  const params = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
  const response = await liveAvatarFetch(`/v1/avatars/public?${params}`, {
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
