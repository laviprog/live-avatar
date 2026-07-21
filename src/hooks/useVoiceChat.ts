import { useCallback, useMemo, useState } from 'react';
import { useLiveAvatarContext } from '@/logic/context';
import { VoiceChatState } from '@heygen/liveavatar-web-sdk';

export const useVoiceChat = () => {
  const { sessionRef, isMuted, voiceChatState, isUserTalking, isAvatarTalking } =
    useLiveAvatarContext();

  const [error, setError] = useState<string | null>(null);

  const mute = useCallback(async () => {
    return await sessionRef.current.voiceChat.mute();
  }, [sessionRef]);

  const unmute = useCallback(async () => {
    return await sessionRef.current.voiceChat.unmute();
  }, [sessionRef]);

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

  const isLoading = useMemo(() => {
    return voiceChatState === VoiceChatState.STARTING;
  }, [voiceChatState]);

  const isActive = useMemo(() => {
    return voiceChatState === VoiceChatState.ACTIVE;
  }, [voiceChatState]);

  const startPushToTalk = useCallback(async () => {
    return await sessionRef.current.voiceChat.startPushToTalk();
  }, [sessionRef]);

  const stopPushToTalk = useCallback(async () => {
    return await sessionRef.current.voiceChat.stopPushToTalk();
  }, [sessionRef]);

  return {
    mute,
    unmute,
    start,
    stop,
    isLoading,
    isActive,
    isMuted,
    isUserTalking,
    isAvatarTalking,
    startPushToTalk,
    stopPushToTalk,
    error,
  };
};
