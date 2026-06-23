import { getSessionUser } from '@/lib/auth/session';
import { getUserByEmail, isAdmin } from '@/lib/auth/users';
import { Context } from '@/types/context';

const API_URL = process.env.NEXT_PUBLIC_BASE_API_URL_HEYGEN!;
const API_KEY = process.env.API_KEY_HEYGEN!;

export async function GET() {
  try {
    const session = await getSessionUser();
    if (!session) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const res = await fetch(`${API_URL}/v1/contexts`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': API_KEY,
      },
    });

    if (!res.ok) {
      const errorData = await res.json();
      console.error('Error getting contexts data:', errorData);
      return Response.json(
        { error: errorData.data?.message || 'Failed to get contexts' },
        { status: res.status }
      );
    }

    const contexts: Context[] = (await res.json()).data.results;

    // Фильтрация по правам: admin видит всё, обычный пользователь — только разрешённые id.
    const user = getUserByEmail(session.email);
    const filtered =
      user && !isAdmin(user)
        ? contexts.filter((c) => user.contextIds?.includes(c.id))
        : contexts;

    return Response.json(filtered);
  } catch (error) {
    console.error('Error getting contexts data:', error);
    return Response.json({ error: 'Failed to get contexts' }, { status: 500 });
  }
}
