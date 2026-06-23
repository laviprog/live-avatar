'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LiveAvatarSession } from './LiveAvatarSession';
import { Avatar } from '@/types/avatar';
import { Context } from '@/types/context';
import { SessionUser } from '@/types/user';
import { toast } from 'react-toastify';
import { LANGUAGE_LIST } from '@/data/languages';

export type SessionMode = 'FULL';

const getAvatars = async (): Promise<Avatar[]> => {
  const res = await fetch('/api/avatars', {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch avatars: ${res.status}`);
  }

  return res.json();
};

const getContexts = async (): Promise<Context[]> => {
  const res = await fetch('/api/contexts', {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch contexts: ${res.status}`);
  }

  return res.json();
};

const getCurrentUser = async (): Promise<SessionUser | null> => {
  const res = await fetch('/api/auth/me', {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });

  if (!res.ok) {
    return null;
  }

  return res.json();
};

export const LiveAvatar = () => {
  const router = useRouter();
  const [sessionToken, setSessionToken] = useState('');
  const mode: SessionMode = 'FULL';
  const [startingSession, setStartingSession] = useState(false);
  const [user, setUser] = useState<SessionUser | null>(null);

  const [isDataLoading, setIsDataLoading] = useState(true);
  const [dataError, setDataError] = useState<string | null>(null);

  const [avatars, setAvatars] = useState<Avatar[]>([]);
  const [contexts, setContexts] = useState<Context[]>([]);
  const [avatarId, setAvatarId] = useState('');
  const [contextId, setContextId] = useState<string | null>(null);
  const [language, setLanguage] = useState('ru');
  const [voiceId, setVoiceId] = useState('');

  useEffect(() => {
    const loadFormData = async () => {
      try {
        setIsDataLoading(true);
        setDataError(null);

        const [fetchedAvatars, fetchedContexts, fetchedUser] = await Promise.all([
          getAvatars(),
          getContexts(),
          getCurrentUser(),
        ]);

        setAvatars(fetchedAvatars);
        setContexts(fetchedContexts);
        setUser(fetchedUser);

        if (fetchedAvatars.length > 0) {
          setAvatarId(fetchedAvatars[0].id);
          setVoiceId(fetchedAvatars[0].default_voice.id);
        }
        if (fetchedContexts.length > 0) {
          setContextId(fetchedContexts[0].id);
        }
      } catch (error) {
        console.error('Failed to load form data:', error);
        setDataError('Failed to load data. Please try again.');
        toast.error('Failed to load form data');
      } finally {
        setIsDataLoading(false);
      }
    };

    loadFormData();
  }, []);

  const handleStartFullSession = async () => {
    if (!avatarId || !language) {
      toast.error('Please fill in all fields');
      return;
    }

    setStartingSession(true);
    try {
      const res = await fetch('/api/start-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          avatarId,
          contextId,
          language,
          voiceId,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        console.error('Failed to start session', error);
        toast.error('Failed to start session');
        return;
      }

      const { session_token } = await res.json();
      setSessionToken(session_token);
    } catch (error) {
      console.error(error);
      toast.error('Failed to start session');
    } finally {
      setStartingSession(false);
    }
  };

  const handleAvatarChange = (id: string) => {
    setAvatarId(id);
    const avatar = avatars.find((a) => a.id === id);
    if (avatar) {
      setVoiceId(avatar.default_voice.id);
    }
  };

  const handleContextChange = (value: string) => {
    setContextId(value === '' ? null : value);
  };

  const onSessionStopped = () => {
    setSessionToken('');
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      router.replace('/login');
      router.refresh();
    }
  };

  if (isDataLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-white/20 border-t-white rounded-full animate-spin" />
          <p className="text-white/60 text-lg">Loading...</p>
        </div>
      </div>
    );
  }

  if (dataError) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 p-8">
          <p className="text-red-400 text-lg">{dataError}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 rounded-lg bg-white/10 text-white font-medium border border-white/20 hover:bg-white/20 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col items-center justify-center">
      {!sessionToken ? (
        <div className="w-full max-w-2xl flex flex-col items-center gap-6 p-8">
          {user && (
            <div className="w-full flex items-center justify-between text-sm text-white/60">
              <span>
                {user.email}
                {user.role === 'admin' && (
                  <span className="ml-2 px-2 py-0.5 rounded bg-white/10 text-white/80 text-xs">
                    admin
                  </span>
                )}
              </span>
              <button
                onClick={handleLogout}
                className="text-white/70 hover:text-white underline underline-offset-2 transition-colors"
              >
                Выйти
              </button>
            </div>
          )}
          <div className="text-center mb-2">
            <h1 className="text-4xl font-semibold text-white mb-1">LiveAvatar</h1>
          </div>

          <div className="w-full flex flex-col items-center gap-3">
            <div className="w-full">
              <label htmlFor="avatar-select" className="block mb-1 text-sm font-medium text-white">
                Avatar
              </label>
              <select
                id="avatar-select"
                value={avatarId}
                onChange={(e) => handleAvatarChange(e.target.value)}
                className="w-full px-4 py-3 rounded-lg bg-white/5 text-white text-lg border border-white/10 focus:outline-none focus:border-white/30 transition-colors"
              >
                {avatars.map((avatar) => (
                  <option key={avatar.id} value={avatar.id}>
                    {avatar.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="w-full">
              <label htmlFor="context-select" className="block mb-1 text-sm font-medium text-white">
                Context
              </label>
              <select
                id="context-select"
                value={contextId ?? ''}
                onChange={(e) => handleContextChange(e.target.value)}
                className="w-full px-4 py-3 rounded-lg bg-white/5 text-white text-lg border border-white/10 focus:outline-none focus:border-white/30 transition-colors"
              >
                <option value="">None</option>
                {contexts.map((context) => (
                  <option key={context.id} value={context.id}>
                    {context.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="w-full">
              <label htmlFor="lang-select" className="block mb-1 text-sm font-medium text-white">
                Language
              </label>
              <select
                id="lang-select"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full px-4 py-3 rounded-lg bg-white/5 text-white text-lg border border-white/10 focus:outline-none focus:border-white/30 transition-colors"
              >
                <option disabled value="">
                  Выберите язык
                </option>
                {LANGUAGE_LIST.map((lang) => (
                  <option key={lang.key} value={lang.value}>
                    {lang.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="w-full flex flex-col gap-3">
            <button
              onClick={handleStartFullSession}
              disabled={startingSession || !avatarId || !language}
              className="w-full px-6 py-3 rounded-lg bg-white/10 text-white font-medium text-lg border border-white/20 hover:bg-white/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {startingSession ? 'Starting...' : 'Start session'}
            </button>
          </div>
        </div>
      ) : (
        <LiveAvatarSession
          mode={mode}
          sessionAccessToken={sessionToken}
          onSessionStopped={onSessionStopped}
        />
      )}
    </div>
  );
};
