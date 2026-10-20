import { unauthorized } from '@/lib/auth/responses';
import { getCurrentUser } from '@/lib/auth/session';
import { getSessionSetup } from '@/lib/auth/users';
import type { UserProfile } from '@/types/user';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  return Response.json({
    email: user.email,
    role: user.role,
    sessionSetup: getSessionSetup(user),
  } satisfies UserProfile);
}
