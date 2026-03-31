import { useCallback } from 'react';
import { useLiveAvatarContext } from '@/logic/context';

export const useTextChat = (mode: 'FULL' | 'LITE') => {
  const { sessionRef } = useLiveAvatarContext();

  const sendMessage = useCallback(
    async (message: string) => {
      if (mode === 'FULL') {
        return sessionRef.current.message(message);
      }
    },
    [sessionRef, mode]
  );

  return {
    sendMessage,
  };
};
