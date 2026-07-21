'use client';

import React, { useEffect, useRef, useState } from 'react';
import { ConnectionQuality, SessionState, VoiceChatConfig } from '@heygen/liveavatar-web-sdk';
import { SessionMode } from './LiveAvatar';
import { useSession } from '@/hooks/useSession';
import { useVoiceChat } from '@/hooks/useVoiceChat';
import { useAvatarActions } from '@/actions/useAvatarActions';
import { useTextChat } from '@/hooks/useTextChat';
import { useChatHistory } from '@/hooks/useChatHistory';
import { LiveAvatarContextProvider } from '@/logic/context';

const SESSION_STATE_LABELS: Record<SessionState, string> = {
  [SessionState.INACTIVE]: 'Неактивна',
  [SessionState.CONNECTING]: 'Подключение',
  [SessionState.CONNECTED]: 'Подключено',
  [SessionState.DISCONNECTING]: 'Отключение',
  [SessionState.DISCONNECTED]: 'Отключено',
};

const CONNECTION_QUALITY_LABELS: Record<ConnectionQuality, string> = {
  [ConnectionQuality.UNKNOWN]: 'Нет данных',
  [ConnectionQuality.GOOD]: 'Хорошая связь',
  [ConnectionQuality.BAD]: 'Плохая связь',
};

const StatusDot: React.FC<{ active: boolean; label: string }> = ({ active, label }) => (
  <div className="flex items-center gap-1.5 text-xs text-gray-400">
    <div className={`w-2 h-2 rounded-full ${active ? 'bg-green-400' : 'bg-gray-600'}`} />
    {label}
  </div>
);

const ActionButton: React.FC<{
  onClick: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md';
  children: React.ReactNode;
}> = ({ onClick, disabled, variant = 'secondary', size = 'md', children }) => {
  const base =
    'min-h-10 font-medium rounded-lg transition-[background-color,color,opacity,transform] active:scale-[0.96] disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100';
  const sizes = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-5 py-2.5 text-sm',
  };
  const variants = {
    primary: 'bg-white text-black hover:bg-gray-100 active:bg-gray-200',
    secondary: 'bg-white/10 text-white border border-white/10 hover:bg-white/15 active:bg-white/20',
    danger:
      'bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 active:bg-red-500/30',
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${sizes[size]} ${variants[variant]}`}
    >
      {children}
    </button>
  );
};

const LiveAvatarSessionComponent: React.FC<{
  mode: SessionMode;
  onSessionStopped: () => void;
}> = ({ mode, onSessionStopped }) => {
  const [message, setMessage] = useState('');
  const [pendingChatAction, setPendingChatAction] = useState<'send' | 'repeat' | null>(null);
  const {
    sessionState,
    isStreamReady,
    startSession,
    stopSession,
    connectionQuality,
    keepAlive,
    attachElement,
  } = useSession();
  const {
    isAvatarTalking,
    isUserTalking,
    isMuted,
    isActive,
    isLoading,
    start,
    stop,
    mute,
    unmute,
    error: voiceChatError,
  } = useVoiceChat();

  const { interrupt, repeat, startListening, stopListening } = useAvatarActions(mode);

  const { sendMessage } = useTextChat(mode);
  const chatMessages = useChatHistory();
  const videoRef = useRef<HTMLVideoElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [videoHeight, setVideoHeight] = useState<number>(0);

  useEffect(() => {
    if (sessionState === SessionState.DISCONNECTED) {
      onSessionStopped();
    }
  }, [sessionState, onSessionStopped]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setVideoHeight(entry.contentRect.height);
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [isStreamReady]);

  useEffect(() => {
    if (isStreamReady && videoRef.current) {
      attachElement(videoRef.current);
    }
  }, [attachElement, isStreamReady]);

  useEffect(() => {
    if (sessionState === SessionState.INACTIVE) {
      startSession();
    }
  }, [startSession, sessionState]);

  const qualityColor =
    connectionQuality === 'GOOD'
      ? 'text-green-400'
      : connectionQuality === 'BAD'
        ? 'text-red-400'
        : 'text-gray-500';
  const trimmedMessage = message.trim();
  const isChatActionPending = pendingChatAction !== null;

  const handleChatAction = async (action: 'send' | 'repeat') => {
    if (!trimmedMessage || isChatActionPending) return;

    setPendingChatAction(action);
    try {
      if (action === 'send') {
        await sendMessage(trimmedMessage);
      } else {
        await repeat(trimmedMessage);
      }
      setMessage('');
    } catch (error) {
      console.error(`Failed to ${action} chat message:`, error);
    } finally {
      setPendingChatAction(null);
    }
  };

  return (
    <div className="w-full max-w-[1400px] h-full flex flex-col justify-center gap-4 py-4">
      {/* Video + Chat row */}
      <div className="w-full flex flex-row items-start justify-center gap-4">
        <div className="relative overflow-hidden rounded-lg flex flex-col items-center justify-center bg-black">
          <video ref={videoRef} autoPlay playsInline className="w-full h-full object-contain" />
          {/* Overlay status badges */}
          <div className="absolute top-3 left-3 flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-sm">
              <div
                className={`w-2 h-2 rounded-full ${
                  sessionState === SessionState.CONNECTED
                    ? 'bg-green-400'
                    : sessionState === SessionState.CONNECTING
                      ? 'bg-yellow-400 animate-pulse'
                      : 'bg-gray-500'
                }`}
              />
              <span className="text-xs text-white/70 font-medium uppercase tracking-wider">
                {SESSION_STATE_LABELS[sessionState]}
              </span>
            </div>
            <span
              className={`text-xs font-medium uppercase tracking-wider px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-sm ${qualityColor}`}
            >
              {CONNECTION_QUALITY_LABELS[connectionQuality]}
            </span>
          </div>
          {/* Talking indicators */}
          <div className="absolute bottom-3 left-3 flex items-center gap-2">
            {mode === 'FULL' && (
              <div
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full backdrop-blur-sm transition-colors ${
                  isUserTalking ? 'bg-blue-500/30 border border-blue-400/30' : 'bg-black/40'
                }`}
              >
                <div
                  className={`w-2 h-2 rounded-full transition-colors ${isUserTalking ? 'bg-blue-400 animate-pulse' : 'bg-gray-500'}`}
                />
                <span className="text-xs text-white/70 font-medium">Вы</span>
              </div>
            )}
            <div
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full backdrop-blur-sm transition-colors ${
                isAvatarTalking ? 'bg-purple-500/30 border border-purple-400/30' : 'bg-black/40'
              }`}
            >
              <div
                className={`w-2 h-2 rounded-full transition-colors ${isAvatarTalking ? 'bg-purple-400 animate-pulse' : 'bg-gray-500'}`}
              />
              <span className="text-xs text-white/70 font-medium">Аватар</span>
            </div>
          </div>
          {/* Stop button */}
          <button
            className="absolute bottom-3 right-3 px-4 py-2 text-sm font-medium rounded-lg bg-red-500/80 text-white hover:bg-red-500 backdrop-blur-sm transition-colors"
            onClick={() => stopSession()}
          >
            Завершить сессию
          </button>
        </div>

        {/* Chat History */}
        {mode === 'FULL' && (
          <div
            className="w-[350px] shrink-0 overflow-hidden border border-white/10 rounded-lg bg-white/5 flex flex-col"
            style={{ height: videoHeight > 0 ? videoHeight : 400 }}
          >
            <div className="px-4 py-3 border-b border-white/10 shrink-0">
              <p className="font-medium text-sm text-white">Чат</p>
            </div>
            <div
              className="flex-1 overflow-y-auto p-3 flex flex-col gap-2"
              style={{ scrollbarWidth: 'none' }}
            >
              {chatMessages.length === 0 && (
                <p className="text-gray-500 text-xs text-center mt-8">
                  Расшифровка диалога появится здесь
                </p>
              )}
              {chatMessages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] px-3 py-2 rounded-lg text-sm ${
                      msg.sender === 'user'
                        ? 'bg-blue-500/20 text-blue-100 border border-blue-500/10'
                        : 'bg-white/10 text-gray-200 border border-white/5'
                    }`}
                  >
                    <span className="font-medium text-xs uppercase tracking-wider opacity-50 block mb-0.5">
                      {msg.sender === 'user' ? 'Вы' : 'Аватар'}
                    </span>
                    <p className="leading-relaxed">{msg.message}</p>
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
            <div
              className="shrink-0 px-3 py-3 border-t border-white/10 flex flex-col gap-2"
              aria-busy={isChatActionPending}
            >
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                disabled={isChatActionPending}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && trimmedMessage && !isChatActionPending) {
                    void handleChatAction('send');
                  }
                }}
                placeholder="Введите сообщение..."
                className="w-full px-4 py-2 rounded-lg bg-white/5 text-white text-sm border border-white/10 focus:outline-none focus:border-white/30 placeholder-gray-500 transition-colors disabled:cursor-wait disabled:opacity-60"
              />
              <div className="flex items-center gap-2">
                <ActionButton
                  onClick={() => handleChatAction('send')}
                  disabled={!trimmedMessage || isChatActionPending}
                  variant="primary"
                  size="sm"
                >
                  {pendingChatAction === 'send' ? 'Отправка...' : 'Отправить'}
                </ActionButton>
                <ActionButton
                  onClick={() => handleChatAction('repeat')}
                  disabled={!trimmedMessage || isChatActionPending}
                  size="sm"
                >
                  {pendingChatAction === 'repeat' ? 'Повтор...' : 'Повторить'}
                </ActionButton>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="w-full flex flex-col items-center gap-3">
        {voiceChatError && (
          <p className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 px-3 py-1.5 rounded-lg">
            {voiceChatError}
          </p>
        )}

        {/* Voice Chat */}
        {mode === 'FULL' && (
          <div className="flex items-center gap-2">
            <StatusDot active={isActive} label="Голосовой чат" />
            <ActionButton
              onClick={() => (isActive ? stop() : start())}
              disabled={isLoading}
              variant={isActive ? 'danger' : 'primary'}
              size="sm"
            >
              {isLoading
                ? 'Загрузка...'
                : isActive
                  ? 'Остановить голосовой чат'
                  : 'Запустить голосовой чат'}
            </ActionButton>
            {isActive && (
              <ActionButton
                onClick={() => (isMuted ? unmute() : mute())}
                size="sm"
                variant={isMuted ? 'primary' : 'secondary'}
              >
                {isMuted ? 'Включить микрофон' : 'Выключить микрофон'}
              </ActionButton>
            )}
          </div>
        )}

        {/* Avatar Controls */}
        <div className="flex items-center gap-2">
          <ActionButton onClick={startListening} size="sm">
            Включить позу слушания
          </ActionButton>
          <ActionButton onClick={stopListening} size="sm">
            Выключить позу слушания
          </ActionButton>
          <ActionButton onClick={interrupt} size="sm">
            Прервать
          </ActionButton>
          <ActionButton onClick={keepAlive} size="sm">
            Продлить сессию
          </ActionButton>
        </div>
      </div>
    </div>
  );
};

export const LiveAvatarSession: React.FC<{
  mode: SessionMode;
  sessionAccessToken: string;
  onSessionStopped: () => void;
  voiceChatConfig?: boolean | VoiceChatConfig;
}> = ({ mode, sessionAccessToken, onSessionStopped, voiceChatConfig = true }) => {
  return (
    <LiveAvatarContextProvider
      sessionAccessToken={sessionAccessToken}
      voiceChatConfig={voiceChatConfig}
    >
      <LiveAvatarSessionComponent mode={mode} onSessionStopped={onSessionStopped} />
    </LiveAvatarContextProvider>
  );
};
