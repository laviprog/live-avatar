import { getSessionUser } from '@/lib/auth/session';

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return Response.json({ error: 'Требуется авторизация' }, { status: 401 });
  }
  return Response.json(user);
}
