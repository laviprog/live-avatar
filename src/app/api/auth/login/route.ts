import { NextRequest } from 'next/server';
import { verifyCredentials } from '@/lib/auth/users';
import { setSessionCookie } from '@/lib/auth/session';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json().catch(() => ({}));

    if (!email || !password) {
      return Response.json({ error: 'Электронная почта и пароль обязательны' }, { status: 400 });
    }

    const user = verifyCredentials(email, password);
    if (!user) {
      return Response.json({ error: 'Неверная электронная почта или пароль' }, { status: 401 });
    }

    await setSessionCookie({ email: user.email, role: user.role });

    return Response.json({ email: user.email, role: user.role });
  } catch (error) {
    console.error('Login error:', error);
    return Response.json({ error: 'Не удалось выполнить вход' }, { status: 500 });
  }
}
