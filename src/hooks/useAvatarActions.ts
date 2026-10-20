import { useCallback } from 'react';
import { useLiveAvatarContext } from '@/logic/context';

export const useAvatarActions = () => {
  const { sessionRef } = useLiveAvatarContext();

  const interrupt = useCallback(() => sessionRef.current.interrupt(), [sessionRef]);

  const repeat = useCallback((message: string) => sessionRef.current.repeat(message), [sessionRef]);

  const sendMessage = useCallback(
    (message: string) => sessionRef.current.message(message),
    [sessionRef]
  );

  const startListening = useCallback(() => sessionRef.current.startListening(), [sessionRef]);

  const stopListening = useCallback(() => sessionRef.current.stopListening(), [sessionRef]);

  return { interrupt, repeat, sendMessage, startListening, stopListening };
};
