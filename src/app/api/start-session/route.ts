import type { NextRequest } from 'next/server';
import { forbidden, unauthorized } from '@/lib/auth/responses';
import { getCurrentUser } from '@/lib/auth/session';
import { isAdmin } from '@/lib/auth/users';
import { type LiveAvatarResponse, liveAvatarFetch } from '@/lib/live-avatar/api';
import { getVoiceAgent, SUPPORTED_AGENT_TYPE } from '@/lib/live-avatar/voice-agents';

interface StartSessionRequestBody {
  avatarId?: string;
  language?: string;
  // Preferred: a stored voice agent supplies the voice and context
  voiceAgentId?: string | null;
  // Legacy avatar_persona path, used when no voice agent is selected
  voiceId?: string;
  contextId?: string | null;
}

interface SessionTokenData {
  session_token: string;
  session_id: string;
}

const START_FAILED = 'Не удалось начать сессию';
const badRequest = (error: string) => Response.json({ error }, { status: 400 });

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();

    const body: StartSessionRequestBody = await request.json().catch(() => ({}));
    const { avatarId, language, voiceAgentId, voiceId, contextId } = body;
    if (!avatarId || !language) return badRequest('Аватар и язык обязательны');
    if (!voiceAgentId && !voiceId) return badRequest('Выберите голосового агента или голос');

    // Regular users may only use the avatars, agents and contexts assigned to them.
    if (!isAdmin(user)) {
      const allowed =
        user.avatarIds?.includes(avatarId) &&
        (voiceAgentId
          ? user.voiceAgentIds?.includes(voiceAgentId)
          : !contextId || user.contextIds?.includes(contextId));
      if (!allowed) return forbidden('Доступ к аватару, агенту или контексту запрещён');
    }

    if (voiceAgentId) {
      const agent = await getVoiceAgent(voiceAgentId);
      if (!agent) return badRequest('Голосовой агент не найден');
      if (agent.agent_type !== SUPPORTED_AGENT_TYPE) {
        return badRequest('Поддерживаются только агенты типа LiveAvatar');
      }
    }

    const res = await liveAvatarFetch('/v1/sessions/token', {
      method: 'POST',
      body: JSON.stringify({
        mode: 'FULL',
        avatar_id: avatarId,
        ...(voiceAgentId
          ? { voice_agent: { id: voiceAgentId, language } }
          : {
              avatar_persona: {
                voice_id: voiceId,
                ...(contextId && { context_id: contextId }),
                language,
              },
            }),
      }),
    });

    if (!res.ok) {
      console.error('Session token request failed:', res.status, await res.text());
      return Response.json({ error: START_FAILED }, { status: res.status });
    }

    const { data } = (await res.json()) as LiveAvatarResponse<SessionTokenData>;
    if (!data?.session_token) {
      return Response.json({ error: START_FAILED }, { status: 502 });
    }

    return Response.json({ session_token: data.session_token, session_id: data.session_id });
  } catch (error) {
    console.error('Error retrieving session token:', error);
    return Response.json({ error: START_FAILED }, { status: 500 });
  }
}
