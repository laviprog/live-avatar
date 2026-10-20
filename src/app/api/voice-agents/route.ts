import { forbidden, unauthorized } from '@/lib/auth/responses';
import { getCurrentUser } from '@/lib/auth/session';
import { getSessionSetup, isAdmin } from '@/lib/auth/users';
import { listVoiceAgents, VoiceAgentsApiError } from '@/lib/live-avatar/voice-agents';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    if (getSessionSetup(user) !== 'voiceAgent') return forbidden();

    if (!isAdmin(user)) {
      // Regular users only see explicitly allowed agents from the account's own space
      const agents = await listVoiceAgents('private');
      return Response.json(agents.filter((a) => user.voiceAgentIds?.includes(a.id)));
    }

    // Admins also get the read-only presets shared with every account
    const [privateAgents, publicAgents] = await Promise.all([
      listVoiceAgents('private'),
      listVoiceAgents('public'),
    ]);
    return Response.json([...privateAgents, ...publicAgents]);
  } catch (error) {
    console.error('Error getting voice agents:', error);
    const status = error instanceof VoiceAgentsApiError ? error.status : 500;
    return Response.json({ error: 'Не удалось загрузить голосовых агентов' }, { status });
  }
}
