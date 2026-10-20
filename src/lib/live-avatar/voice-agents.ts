import type { VoiceAgent, VoiceAgentType } from '@/types/voice-agent';
import { type LiveAvatarResponse, liveAvatarFetch } from './api';

// Other agent types turn a FULL token request into a LITE session, which this app does not support
export const SUPPORTED_AGENT_TYPE: VoiceAgentType = 'liveavatar_agent';

export class VoiceAgentsApiError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
    this.name = 'VoiceAgentsApiError';
  }
}

export async function listVoiceAgents(scope: 'private' | 'public'): Promise<VoiceAgent[]> {
  const res = await liveAvatarFetch(`/v1/voice_agents?scope=${scope}`);
  const payload = (await res.json().catch(() => null)) as LiveAvatarResponse<VoiceAgent[]> | null;

  if (!res.ok || !payload?.data) {
    throw new VoiceAgentsApiError(payload?.message || 'Failed to list voice agents', res.status);
  }

  return payload.data.filter((agent) => agent.agent_type === SUPPORTED_AGENT_TYPE);
}

export async function getVoiceAgent(id: string): Promise<VoiceAgent | null> {
  const res = await liveAvatarFetch(`/v1/voice_agents/${encodeURIComponent(id)}`);
  if (res.status === 404) return null;

  const payload = (await res.json().catch(() => null)) as LiveAvatarResponse<VoiceAgent> | null;
  if (!res.ok || !payload?.data) {
    throw new VoiceAgentsApiError(payload?.message || 'Failed to get voice agent', res.status);
  }

  return payload.data;
}
