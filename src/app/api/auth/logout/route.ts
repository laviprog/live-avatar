import { clearSessionCookie } from '@/lib/auth/session';

export async function POST() {
  return clearSessionCookie(Response.json({ success: true }));
}
