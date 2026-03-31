import { NextRequest } from 'next/server';

interface StartFullModeSessionRequestBody {
  avatarId: string;
  voiceId: string;
  contextId: string | null;
  language: string;
}

const API_URL = process.env.NEXT_PUBLIC_BASE_API_URL_HEYGEN!;
const API_KEY = process.env.API_KEY_HEYGEN!;

export async function POST(request: NextRequest) {
  let session_token = '';
  let session_id = '';
  try {
    const body: StartFullModeSessionRequestBody = await request.json().catch(() => ({}));

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

      return new Response(JSON.stringify({ error: errorMessage }), {
        status: res.status,
      });
    }

    const data = await res.json();

    session_token = data.data.session_token;
    session_id = data.data.session_id;
  } catch (error) {
    console.error('Error retrieving session token:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
    });
  }

  if (!session_token) {
    return new Response('Failed to retrieve session token', {
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
