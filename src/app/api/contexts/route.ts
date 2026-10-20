import { forbidden, unauthorized } from '@/lib/auth/responses';
import { getCurrentUser } from '@/lib/auth/session';
import { getSessionSetup, isAdmin } from '@/lib/auth/users';
import { type LiveAvatarResponse, liveAvatarFetch } from '@/lib/live-avatar/api';
import type { Context } from '@/types/context';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    if (getSessionSetup(user) !== 'persona') return forbidden();

    const res = await liveAvatarFetch('/v1/contexts');
    if (!res.ok) {
      console.error('Error getting contexts data:', await res.text());
      return Response.json({ error: 'Не удалось загрузить контексты' }, { status: res.status });
    }

    const contexts = ((await res.json()) as LiveAvatarResponse<{ results: Context[] }>).data
      .results;

    // Admins see every context; regular users only see explicitly allowed IDs.
    return Response.json(
      isAdmin(user) ? contexts : contexts.filter((c) => user.contextIds?.includes(c.id))
    );
  } catch (error) {
    console.error('Error getting contexts data:', error);
    return Response.json({ error: 'Не удалось загрузить контексты' }, { status: 500 });
  }
}
