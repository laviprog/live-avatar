export type VoiceAgentType =
  | 'liveavatar_agent'
  | 'elevenlabs_agent'
  | 'cartesia_agent'
  | 'openai_agent';

export interface VoiceAgent {
  id: string;
  name: string;
  agent_type: VoiceAgentType;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}
