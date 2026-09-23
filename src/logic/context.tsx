import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import {
  AgentEventsEnum,
  ConnectionQuality,
  LiveAvatarSession,
  SessionEvent,
  SessionState,
  VoiceChatConfig,
  VoiceChatEvent,
  VoiceChatState,
} from '@heygen/liveavatar-web-sdk';
import { LiveAvatarSessionMessage, MessageSender } from '@/types/message';

const MIC_RESUME_DELAY_MS = 500;

type LiveAvatarContextProps = {
  sessionRef: React.RefObject<LiveAvatarSession>;

  isMuted: boolean;
  voiceChatState: VoiceChatState;

  noInterrupt: boolean;
  isMicSuspended: boolean;
  isMicMutedByUser: boolean;
  muteMic: () => Promise<void>;
  unmuteMic: () => Promise<void>;

  sessionState: SessionState;
  isStreamReady: boolean;
  connectionQuality: ConnectionQuality;

  isUserTalking: boolean;
  isAvatarTalking: boolean;

  messages: LiveAvatarSessionMessage[];
};

export const LiveAvatarContext = createContext<LiveAvatarContextProps>({
  sessionRef: {
    current: null,
  } as unknown as React.RefObject<LiveAvatarSession>,
  connectionQuality: ConnectionQuality.UNKNOWN,
  isMuted: true,
  voiceChatState: VoiceChatState.INACTIVE,
  noInterrupt: false,
  isMicSuspended: false,
  isMicMutedByUser: false,
  muteMic: async () => {},
  unmuteMic: async () => {},
  sessionState: SessionState.DISCONNECTED,
  isStreamReady: false,
  isUserTalking: false,
  isAvatarTalking: false,
  messages: [],
});

type LiveAvatarContextProviderProps = {
  children: React.ReactNode;
  sessionAccessToken: string;
  voiceChatConfig?: boolean | VoiceChatConfig;
  noInterrupt?: boolean;
};

const useSessionState = (sessionRef: React.RefObject<LiveAvatarSession>) => {
  const [sessionState, setSessionState] = useState<SessionState>(SessionState.INACTIVE);
  const [connectionQuality, setConnectionQuality] = useState<ConnectionQuality>(
    ConnectionQuality.UNKNOWN
  );
  const [isStreamReady, setIsStreamReady] = useState<boolean>(false);

  useEffect(() => {
    const session = sessionRef.current;
    if (!session) return;

    setSessionState(session.state);
    setConnectionQuality(session.connectionQuality);

    session.on(SessionEvent.SESSION_STATE_CHANGED, (state) => {
      setSessionState(state);
      if (state === SessionState.DISCONNECTED) {
        session.removeAllListeners();
        session.voiceChat.removeAllListeners();
        setIsStreamReady(false);
      }
    });
    session.on(SessionEvent.SESSION_STREAM_READY, () => {
      setIsStreamReady(true);
    });
    session.on(SessionEvent.SESSION_CONNECTION_QUALITY_CHANGED, setConnectionQuality);
  }, [sessionRef]);

  return { sessionState, isStreamReady, connectionQuality };
};

const useVoiceChatState = (sessionRef: React.RefObject<LiveAvatarSession>) => {
  const [isMuted, setIsMuted] = useState(true);
  const [voiceChatState, setVoiceChatState] = useState<VoiceChatState>(VoiceChatState.INACTIVE);

  useEffect(() => {
    const session = sessionRef.current;
    if (!session) return;

    setVoiceChatState(session.voiceChat.state);

    session.voiceChat.on(VoiceChatEvent.MUTED, () => {
      setIsMuted(true);
    });
    session.voiceChat.on(VoiceChatEvent.UNMUTED, () => {
      setIsMuted(false);
    });
    session.voiceChat.on(VoiceChatEvent.STATE_CHANGED, setVoiceChatState);
  }, [sessionRef]);

  return { isMuted, voiceChatState };
};

const useTalkingState = (sessionRef: React.RefObject<LiveAvatarSession>) => {
  const [isUserTalking, setIsUserTalking] = useState(false);
  const [isAvatarTalking, setIsAvatarTalking] = useState(false);

  useEffect(() => {
    if (sessionRef.current) {
      sessionRef.current.on(AgentEventsEnum.USER_SPEAK_STARTED, () => {
        setIsUserTalking(true);
      });
      sessionRef.current.on(AgentEventsEnum.USER_SPEAK_ENDED, () => {
        setIsUserTalking(false);
      });
      sessionRef.current.on(AgentEventsEnum.AVATAR_SPEAK_STARTED, () => {
        setIsAvatarTalking(true);
      });
      sessionRef.current.on(AgentEventsEnum.AVATAR_SPEAK_ENDED, () => {
        setIsAvatarTalking(false);
      });
    }
  }, [sessionRef]);

  return { isUserTalking, isAvatarTalking };
};

const useSpeechLock = (sessionRef: React.RefObject<LiveAvatarSession>, enabled: boolean) => {
  const [isMicSuspended, setIsMicSuspended] = useState(false);
  const [isMicMutedByUser, setIsMicMutedByUser] = useState(false);
  // Refs mirror the state for event handlers, which must not depend on render timing
  const suspendedRef = useRef(false);
  const mutedByUserRef = useRef(false);

  const setMutedByUser = useCallback((muted: boolean) => {
    mutedByUserRef.current = muted;
    setIsMicMutedByUser(muted);
  }, []);

  // Track the user's own mute choice, ignoring mutes made by the lock itself
  useEffect(() => {
    const session = sessionRef.current;
    if (!session) return;

    const handleMuted = () => {
      if (!suspendedRef.current) setMutedByUser(true);
    };
    const handleUnmuted = () => {
      if (!suspendedRef.current) setMutedByUser(false);
    };
    const handleStateChanged = (state: VoiceChatState) => {
      // Voice chat (re)started while the avatar is speaking: keep the new track silent
      if (state === VoiceChatState.ACTIVE && suspendedRef.current) {
        setMutedByUser(session.voiceChat.isMuted);
        void session.voiceChat.mute();
      }
    };

    session.voiceChat.on(VoiceChatEvent.MUTED, handleMuted);
    session.voiceChat.on(VoiceChatEvent.UNMUTED, handleUnmuted);
    session.voiceChat.on(VoiceChatEvent.STATE_CHANGED, handleStateChanged);

    return () => {
      session.voiceChat.off(VoiceChatEvent.MUTED, handleMuted);
      session.voiceChat.off(VoiceChatEvent.UNMUTED, handleUnmuted);
      session.voiceChat.off(VoiceChatEvent.STATE_CHANGED, handleStateChanged);
    };
  }, [sessionRef, setMutedByUser]);

  useEffect(() => {
    const session = sessionRef.current;
    if (!session || !enabled) return;

    let resumeTimer: ReturnType<typeof setTimeout> | null = null;

    const clearResumeTimer = () => {
      if (resumeTimer) {
        clearTimeout(resumeTimer);
        resumeTimer = null;
      }
    };

    const handleAvatarSpeakStarted = () => {
      clearResumeTimer();
      if (suspendedRef.current) return;

      suspendedRef.current = true;
      setIsMicSuspended(true);
      if (!mutedByUserRef.current) {
        void session.voiceChat.mute();
      }
    };

    const handleAvatarSpeakEnded = () => {
      clearResumeTimer();
      resumeTimer = setTimeout(() => {
        resumeTimer = null;
        suspendedRef.current = false;
        setIsMicSuspended(false);
        if (!mutedByUserRef.current) {
          void session.voiceChat.unmute();
        }
      }, MIC_RESUME_DELAY_MS);
    };

    session.on(AgentEventsEnum.AVATAR_SPEAK_STARTED, handleAvatarSpeakStarted);
    session.on(AgentEventsEnum.AVATAR_SPEAK_ENDED, handleAvatarSpeakEnded);

    return () => {
      session.off(AgentEventsEnum.AVATAR_SPEAK_STARTED, handleAvatarSpeakStarted);
      session.off(AgentEventsEnum.AVATAR_SPEAK_ENDED, handleAvatarSpeakEnded);
      clearResumeTimer();
    };
  }, [sessionRef, enabled]);

  // While suspended, only remember the user's choice; it is applied when the avatar finishes
  const muteMic = useCallback(async () => {
    setMutedByUser(true);
    if (suspendedRef.current) return;
    await sessionRef.current.voiceChat.mute();
  }, [sessionRef, setMutedByUser]);

  const unmuteMic = useCallback(async () => {
    setMutedByUser(false);
    if (suspendedRef.current) return;
    await sessionRef.current.voiceChat.unmute();
  }, [sessionRef, setMutedByUser]);

  return { isMicSuspended, isMicMutedByUser, muteMic, unmuteMic };
};

const useChatHistoryState = (sessionRef: React.RefObject<LiveAvatarSession>) => {
  const [messages, setMessages] = useState<LiveAvatarSessionMessage[]>([]);
  const currentSenderRef = useRef<MessageSender | null>(null);

  useEffect(() => {
    const session = sessionRef.current;
    if (!session) return;

    // User chunks are cumulative (full phrase so far) — replace
    const handleUserChunk = (event: { text: string }) => {
      const sender = MessageSender.USER;
      if (currentSenderRef.current === sender) {
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (!last) return prev;
          return [...prev.slice(0, -1), { ...last, message: event.text }];
        });
      } else {
        currentSenderRef.current = sender;
        setMessages((prev) => [...prev, { sender, message: event.text, timestamp: Date.now() }]);
      }
    };

    // Avatar chunks are individual words — append
    const handleAvatarChunk = (event: { text: string }) => {
      const sender = MessageSender.AVATAR;
      if (currentSenderRef.current === sender) {
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (!last) return prev;
          return [...prev.slice(0, -1), { ...last, message: last.message + event.text }];
        });
      } else {
        currentSenderRef.current = sender;
        setMessages((prev) => [...prev, { sender, message: event.text, timestamp: Date.now() }]);
      }
    };

    const handleUserFinal = (event: { text: string }) => {
      currentSenderRef.current = null;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last && last.sender === MessageSender.USER) {
          return [...prev.slice(0, -1), { ...last, message: event.text }];
        }
        return [
          ...prev,
          {
            sender: MessageSender.USER,
            message: event.text,
            timestamp: Date.now(),
          },
        ];
      });
    };

    const handleAvatarFinal = (event: { text: string }) => {
      currentSenderRef.current = null;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last && last.sender === MessageSender.AVATAR) {
          return [...prev.slice(0, -1), { ...last, message: event.text }];
        }
        return [
          ...prev,
          {
            sender: MessageSender.AVATAR,
            message: event.text,
            timestamp: Date.now(),
          },
        ];
      });
    };

    session.on(AgentEventsEnum.USER_TRANSCRIPTION_CHUNK, handleUserChunk);
    session.on(AgentEventsEnum.AVATAR_TRANSCRIPTION_CHUNK, handleAvatarChunk);
    session.on(AgentEventsEnum.USER_TRANSCRIPTION, handleUserFinal);
    session.on(AgentEventsEnum.AVATAR_TRANSCRIPTION, handleAvatarFinal);

    return () => {
      session.off(AgentEventsEnum.USER_TRANSCRIPTION_CHUNK, handleUserChunk);
      session.off(AgentEventsEnum.AVATAR_TRANSCRIPTION_CHUNK, handleAvatarChunk);
      session.off(AgentEventsEnum.USER_TRANSCRIPTION, handleUserFinal);
      session.off(AgentEventsEnum.AVATAR_TRANSCRIPTION, handleAvatarFinal);
    };
  }, [sessionRef]);

  return { messages };
};

export const LiveAvatarContextProvider = ({
  children,
  sessionAccessToken,
  voiceChatConfig = true,
  noInterrupt = false,
}: LiveAvatarContextProviderProps) => {
  // Default voice chat on
  const config = {
    voiceChat: voiceChatConfig,
    apiUrl: process.env.NEXT_PUBLIC_BASE_API_URL_HEYGEN,
  };
  const sessionRef = useRef<LiveAvatarSession>(new LiveAvatarSession(sessionAccessToken, config));

  const { sessionState, isStreamReady, connectionQuality } = useSessionState(sessionRef);

  const { isMuted, voiceChatState } = useVoiceChatState(sessionRef);
  const { isUserTalking, isAvatarTalking } = useTalkingState(sessionRef);
  const { isMicSuspended, isMicMutedByUser, muteMic, unmuteMic } = useSpeechLock(
    sessionRef,
    noInterrupt
  );
  const { messages } = useChatHistoryState(sessionRef);

  return (
    <LiveAvatarContext.Provider
      value={{
        sessionRef,
        sessionState,
        isStreamReady,
        connectionQuality,
        isMuted,
        voiceChatState,
        noInterrupt,
        isMicSuspended,
        isMicMutedByUser,
        muteMic,
        unmuteMic,
        isUserTalking,
        isAvatarTalking,
        messages,
      }}
    >
      {children}
    </LiveAvatarContext.Provider>
  );
};

export const useLiveAvatarContext = () => {
  return useContext(LiveAvatarContext);
};
