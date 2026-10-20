import { VoiceChatState } from '@heygen/liveavatar-web-sdk';
import { useCallback, useState } from 'react';
import { useLiveAvatarContext } from '@/logic/context';

export const useVoiceChat = () => {
  const {
    sessionRef,
    isMuted: isTrackMuted,
    voiceChatState,
    isUserTalking,
    isAvatarTalking,
    isMicSuspended,
    isMicMutedByUser,
    muteMic,
    unmuteMic,
  } = useLiveAvatarContext();

  // While the microphone is suspended, show the user's own choice rather than the track state
  const isMuted = isMicSuspended ? isMicMutedByUser : isTrackMuted;

  const [error, setError] = useState<string | null>(null);

  const start = useCallback(async () => {
    setError(null);
    try {
      return await sessionRef.current.voiceChat.start();
    } catch (e) {
      const technicalMessage = e instanceof Error ? e.message : 'Unknown error';
      console.warn('Voice chat start failed:', technicalMessage);
      setError('Не удалось запустить голосовой чат');
    }
  }, [sessionRef]);

  const stop = useCallback(() => {
    setError(null);
    return sessionRef.current.voiceChat.stop();
  }, [sessionRef]);

  return {
    mute: muteMic,
    unmute: unmuteMic,
    start,
    stop,
    isLoading: voiceChatState === VoiceChatState.STARTING,
    isActive: voiceChatState === VoiceChatState.ACTIVE,
    isMuted,
    isMicSuspended,
    isUserTalking,
    isAvatarTalking,
    error,
  };
};
