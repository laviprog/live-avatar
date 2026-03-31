import { useLiveAvatarContext } from '@/logic/context';

export const useChatHistory = () => {
  const { messages } = useLiveAvatarContext();

  return messages;
};
