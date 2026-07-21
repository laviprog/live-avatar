import { getSessionUser } from '@/lib/auth/session';
import { getUserByEmail, isAdmin } from '@/lib/auth/users';
import { Avatar } from '@/types/avatar';

const API_URL = process.env.NEXT_PUBLIC_BASE_API_URL_HEYGEN!;
const API_KEY = process.env.API_KEY_HEYGEN!;

export async function GET() {
  try {
    const session = await getSessionUser();
    if (!session) {
      return Response.json({ error: 'Требуется авторизация' }, { status: 401 });
    }

    const res = await fetch(`${API_URL}/v1/avatars`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': API_KEY,
      },
    });

    if (!res.ok) {
      const errorData = await res.json();
      console.error('Error getting avatars data:', errorData);
      return Response.json({ error: 'Не удалось загрузить аватары' }, { status: res.status });
    }

    const avatars: Avatar[] = (await res.json()).data.results;

    // Rights filtering: the admin sees everything, the regular user sees only the allowed IDs.
    const user = getUserByEmail(session.email);
    const filtered =
      user && !isAdmin(user) ? avatars.filter((a) => user.avatarIds?.includes(a.id)) : avatars;

    return Response.json(filtered);
  } catch (error) {
    console.error('Error getting avatars data:', error);
    return Response.json({ error: 'Не удалось загрузить аватары' }, { status: 500 });
  }
}
