import { NextRequest } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { getPublicAvatarPage, PublicAvatarsApiError } from '@/lib/live-avatar/public-avatars';

const DEFAULT_PAGE_SIZE = 24;
const MAX_PAGE_SIZE = 100;

const parsePositiveInteger = (value: string | null, fallback: number) => {
  if (value === null) return fallback;

  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

export async function GET(request: NextRequest) {
  try {
    const session = await getSessionUser();
    if (!session) {
      return Response.json({ error: 'Требуется авторизация' }, { status: 401 });
    }

    const page = parsePositiveInteger(request.nextUrl.searchParams.get('page'), 1);
    const pageSize = parsePositiveInteger(
      request.nextUrl.searchParams.get('page_size'),
      DEFAULT_PAGE_SIZE
    );

    if (page === null || pageSize === null || pageSize > MAX_PAGE_SIZE) {
      return Response.json(
        {
          error: `page и page_size должны быть положительными целыми числами; page_size не должен превышать ${MAX_PAGE_SIZE}`,
        },
        { status: 400 }
      );
    }

    const avatars = await getPublicAvatarPage(page, pageSize);
    return Response.json(avatars);
  } catch (error) {
    console.error('Error getting public avatars data:', error);

    if (error instanceof PublicAvatarsApiError) {
      return Response.json(
        { error: 'Не удалось загрузить публичные аватары' },
        { status: error.status }
      );
    }

    return Response.json({ error: 'Не удалось загрузить публичные аватары' }, { status: 500 });
  }
}
