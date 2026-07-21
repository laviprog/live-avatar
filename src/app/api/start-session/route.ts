import { NextRequest } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { getUserByEmail, isAdmin } from '@/lib/auth/users';
import { isPublicAvatar } from '@/lib/live-avatar/public-avatars';
import { AvatarSource } from '@/types/avatar';

interface StartFullModeSessionRequestBody {
  avatarId: string;
  voiceId: string;
  contextId: string | null;
  language: string;
  avatarSource?: AvatarSource;
}

const API_URL = process.env.NEXT_PUBLIC_BASE_API_URL_HEYGEN!;
const API_KEY = process.env.API_KEY_HEYGEN!;

export async function POST(request: NextRequest) {
  let session_token = '';
  let session_id = '';
  try {
    const session = await getSessionUser();
    if (!session) {
      return new Response(JSON.stringify({ error: 'Требуется авторизация' }), { status: 401 });
    }

    const body: StartFullModeSessionRequestBody = await request.json().catch(() => ({}));

    // Regular users cannot start sessions with personal avatars or contexts they do not own.
    const user = getUserByEmail(session.email);
    if (user && !isAdmin(user)) {
      const avatarAllowed =
        body.avatarSource === 'public'
          ? await isPublicAvatar(body.avatarId)
          : user.avatarIds?.includes(body.avatarId);
      const contextAllowed = !body.contextId || user.contextIds?.includes(body.contextId);
      if (!avatarAllowed || !contextAllowed) {
        return new Response(JSON.stringify({ error: 'Доступ к аватару или контексту запрещён' }), {
          status: 403,
        });
      }
    }

    const res = await fetch(`${API_URL}/v1/sessions/token`, {
      method: 'POST',
      headers: {
        'X-API-KEY': API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        mode: 'FULL',
        avatar_id: body.avatarId,
        avatar_persona: {
          voice_id: body.voiceId,
          ...(body.contextId && { context_id: body.contextId }),
          language: body.language,
        },
      }),
    });

    if (!res.ok) {
      // Check if response is JSON before parsing
      const contentType = res.headers.get('content-type');
      let errorMessage = 'Failed to retrieve session token';

      if (contentType && contentType.includes('application/json')) {
        try {
          const resp = await res.json();
          if (resp.data && resp.data.length > 0) {
            errorMessage = resp.data[0].message;
          } else if (resp.error) {
            errorMessage = resp.error;
          } else if (resp.message) {
            errorMessage = resp.message;
          }
        } catch (e) {
          console.error('Failed to parse error response:', e);
        }
      } else {
        // If it's not JSON, try to get the text
        const text = await res.text();
        console.log('Error response (text):', text);
        errorMessage = text || errorMessage;
      }

      console.error('Session token request failed:', errorMessage);

      return new Response(JSON.stringify({ error: 'Не удалось начать сессию' }), {
        status: res.status,
      });
    }

    const data = await res.json();

    session_token = data.data.session_token;
    session_id = data.data.session_id;
  } catch (error) {
    console.error('Error retrieving session token:', error);
    return new Response(JSON.stringify({ error: 'Не удалось начать сессию' }), {
      status: 500,
    });
  }

  if (!session_token) {
    return new Response('Не удалось начать сессию', {
      status: 500,
    });
  }
  return new Response(JSON.stringify({ session_token, session_id }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}
