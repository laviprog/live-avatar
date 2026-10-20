import { unauthorized } from '@/lib/auth/responses';
import { getCurrentUser } from '@/lib/auth/session';
import { isAdmin } from '@/lib/auth/users';
import { type LiveAvatarResponse, liveAvatarFetch } from '@/lib/live-avatar/api';
import type { Avatar } from '@/types/avatar';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();

    const res = await liveAvatarFetch('/v1/avatars');
    if (!res.ok) {
      console.error('Error getting avatars data:', await res.text());
      return Response.json({ error: 'Не удалось загрузить аватары' }, { status: res.status });
    }

    const avatars = ((await res.json()) as LiveAvatarResponse<{ results: Avatar[] }>).data.results;

    // Admins see every avatar; regular users only see explicitly allowed IDs.
    return Response.json(
      isAdmin(user) ? avatars : avatars.filter((a) => user.avatarIds?.includes(a.id))
    );
  } catch (error) {
    console.error('Error getting avatars data:', error);
    return Response.json({ error: 'Не удалось загрузить аватары' }, { status: 500 });
  }
}
