'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { LANGUAGE_LIST } from '@/data/languages';
import { BASE_PATH } from '@/lib/utils';
import type { Avatar, AvatarPage, AvatarSource } from '@/types/avatar';
import type { Context } from '@/types/context';
import type { UserProfile } from '@/types/user';
import type { VoiceAgent } from '@/types/voice-agent';
import { LiveAvatarSession } from './LiveAvatarSession';

const PUBLIC_AVATAR_PAGE_SIZE = 100;
const EMPTY_AVATAR_PAGE: AvatarPage = { count: 0, next: null, previous: null, results: [] };
const FORM_PREFERENCES_STORAGE_KEY = 'live-avatar:form-preferences';

interface StoredFormPreferences {
  avatarSource?: AvatarSource;
  selectedAvatarIds?: Partial<Record<AvatarSource, string>>;
  contextId?: string | null;
  voiceAgentId?: string | null;
  language?: string;
  noInterrupt?: boolean;
}

const readStoredFormPreferences = (): StoredFormPreferences | null => {
  try {
    const rawPreferences = window.localStorage.getItem(FORM_PREFERENCES_STORAGE_KEY);
    if (!rawPreferences) return null;

    const parsedPreferences: unknown = JSON.parse(rawPreferences);
    if (!parsedPreferences || typeof parsedPreferences !== 'object') return null;

    const preferences = parsedPreferences as Record<string, unknown>;
    const selectedAvatarIds =
      preferences.selectedAvatarIds && typeof preferences.selectedAvatarIds === 'object'
        ? (preferences.selectedAvatarIds as Record<string, unknown>)
        : null;

    return {
      avatarSource:
        preferences.avatarSource === 'personal' || preferences.avatarSource === 'public'
          ? preferences.avatarSource
          : undefined,
      selectedAvatarIds: selectedAvatarIds
        ? {
            personal:
              typeof selectedAvatarIds.personal === 'string'
                ? selectedAvatarIds.personal
                : undefined,
            public:
              typeof selectedAvatarIds.public === 'string' ? selectedAvatarIds.public : undefined,
          }
        : undefined,
      contextId:
        preferences.contextId === null || typeof preferences.contextId === 'string'
          ? preferences.contextId
          : undefined,
      voiceAgentId:
        preferences.voiceAgentId === null || typeof preferences.voiceAgentId === 'string'
          ? preferences.voiceAgentId
          : undefined,
      language: typeof preferences.language === 'string' ? preferences.language : undefined,
      noInterrupt:
        typeof preferences.noInterrupt === 'boolean' ? preferences.noInterrupt : undefined,
    };
  } catch (error) {
    console.warn('Failed to read form preferences from localStorage:', error);
    return null;
  }
};

const getAvatars = async (): Promise<Avatar[]> => {
  const res = await fetch(`${BASE_PATH}/api/avatars`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch avatars: ${res.status}`);
  }

  return res.json();
};

const getPublicAvatars = async (page: number): Promise<AvatarPage> => {
  const params = new URLSearchParams({
    page: String(page),
    page_size: String(PUBLIC_AVATAR_PAGE_SIZE),
  });
  const res = await fetch(`${BASE_PATH}/api/avatars/public?${params}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch public avatars: ${res.status}`);
  }

  return res.json();
};

const getContexts = async (): Promise<Context[]> => {
  const res = await fetch(`${BASE_PATH}/api/contexts`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch contexts: ${res.status}`);
  }

  return res.json();
};

const getVoiceAgents = async (): Promise<VoiceAgent[]> => {
  const res = await fetch(`${BASE_PATH}/api/voice-agents`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch voice agents: ${res.status}`);
  }

  return res.json();
};

const getCurrentUser = async (): Promise<UserProfile | null> => {
  const res = await fetch(`${BASE_PATH}/api/auth/me`, {
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
  const [startingSession, setStartingSession] = useState(false);
  const [user, setUser] = useState<UserProfile | null>(null);

  const [isDataLoading, setIsDataLoading] = useState(true);
  const [dataError, setDataError] = useState<string | null>(null);
  const [formPreferencesReady, setFormPreferencesReady] = useState(false);

  const [avatars, setAvatars] = useState<Avatar[]>([]);
  const [publicAvatars, setPublicAvatars] = useState<Avatar[]>([]);
  const [publicAvatarCount, setPublicAvatarCount] = useState(0);
  const [publicAvatarPage, setPublicAvatarPage] = useState(1);
  const [hasMorePublicAvatars, setHasMorePublicAvatars] = useState(false);
  const [loadingMorePublicAvatars, setLoadingMorePublicAvatars] = useState(false);
  const [publicAvatarSearch, setPublicAvatarSearch] = useState('');
  const [contexts, setContexts] = useState<Context[]>([]);
  const [avatarSource, setAvatarSource] = useState<AvatarSource>('personal');
  const [selectedAvatarIds, setSelectedAvatarIds] = useState<Record<AvatarSource, string>>({
    personal: '',
    public: '',
  });
  const [contextId, setContextId] = useState<string | null>(null);
  const [voiceAgents, setVoiceAgents] = useState<VoiceAgent[]>([]);
  const [voiceAgentId, setVoiceAgentId] = useState<string | null>(null);
  const [language, setLanguage] = useState('ru');
  const [noInterrupt, setNoInterrupt] = useState(false);

  const normalizedPublicAvatarSearch = publicAvatarSearch.trim().toLocaleLowerCase();
  const filteredPublicAvatars = normalizedPublicAvatarSearch
    ? publicAvatars.filter((avatar) =>
        avatar.name.toLocaleLowerCase().includes(normalizedPublicAvatarSearch)
      )
    : publicAvatars;
  const isAdmin = user?.role === 'admin';
  const currentAvatars = avatarSource === 'personal' ? avatars : filteredPublicAvatars;
  const avatarId = selectedAvatarIds[avatarSource];
  const selectedAvatar = currentAvatars.find((avatar) => avatar.id === avatarId);
  const voiceId = selectedAvatar?.default_voice?.id ?? '';
  // Per-user setting from USERS: a voice agent brings its own voice and context
  const usesVoiceAgent = user?.sessionSetup === 'voiceAgent';
  const canStart = Boolean(avatarId && language && (usesVoiceAgent ? voiceAgentId : voiceId));

  useEffect(() => {
    const loadFormData = async () => {
      try {
        setIsDataLoading(true);
        setDataError(null);

        // The public catalog is admin-only and contexts vs voice agents depend on the user's
        // setup, so those requests wait for the profile
        const userRequest = getCurrentUser();
        const usesAgents = userRequest.then((u) => u?.sessionSetup === 'voiceAgent');
        const [
          fetchedAvatars,
          fetchedPublicAvatars,
          fetchedContexts,
          fetchedVoiceAgents,
          fetchedUser,
        ] = await Promise.all([
          getAvatars(),
          userRequest.then((u) => (u?.role === 'admin' ? getPublicAvatars(1) : EMPTY_AVATAR_PAGE)),
          usesAgents.then((agents) => (agents ? [] : getContexts())),
          usesAgents.then((agents) => (agents ? getVoiceAgents() : [])),
          userRequest,
        ]);

        setAvatars(fetchedAvatars);
        setPublicAvatars(fetchedPublicAvatars.results);
        setPublicAvatarCount(fetchedPublicAvatars.count);
        setHasMorePublicAvatars(Boolean(fetchedPublicAvatars.next));
        setContexts(fetchedContexts);
        setVoiceAgents(fetchedVoiceAgents);
        setUser(fetchedUser);

        const storedPreferences = readStoredFormPreferences();
        const personalAvatarId = fetchedAvatars.some(
          (avatar) => avatar.id === storedPreferences?.selectedAvatarIds?.personal
        )
          ? storedPreferences?.selectedAvatarIds?.personal
          : fetchedAvatars[0]?.id;
        const publicAvatarId = fetchedPublicAvatars.results.some(
          (avatar) => avatar.id === storedPreferences?.selectedAvatarIds?.public
        )
          ? storedPreferences?.selectedAvatarIds?.public
          : fetchedPublicAvatars.results[0]?.id;
        // Fall back to the public catalog only when it is available and nothing personal is
        const restoredAvatarSource: AvatarSource =
          publicAvatarId && (storedPreferences?.avatarSource === 'public' || !personalAvatarId)
            ? 'public'
            : 'personal';
        const restoredContextId =
          storedPreferences?.contextId === null
            ? null
            : fetchedContexts.some((context) => context.id === storedPreferences?.contextId)
              ? storedPreferences?.contextId
              : (fetchedContexts[0]?.id ?? null);
        const restoredLanguage = LANGUAGE_LIST.some(
          (item) => item.value === storedPreferences?.language
        )
          ? storedPreferences?.language
          : 'ru';

        setSelectedAvatarIds({
          personal: personalAvatarId ?? '',
          public: publicAvatarId ?? '',
        });
        setAvatarSource(restoredAvatarSource);
        setContextId(restoredContextId ?? null);
        // Keep the saved agent if it is still available, otherwise default to the first one
        setVoiceAgentId(
          fetchedVoiceAgents.find((agent) => agent.id === storedPreferences?.voiceAgentId)?.id ??
            fetchedVoiceAgents[0]?.id ??
            null
        );
        setLanguage(restoredLanguage ?? 'ru');
        setNoInterrupt(storedPreferences?.noInterrupt ?? false);
        setFormPreferencesReady(true);
      } catch (error) {
        console.error('Failed to load form data:', error);
        setDataError('Не удалось загрузить данные. Попробуйте ещё раз.');
        toast.error('Не удалось загрузить данные формы');
      } finally {
        setIsDataLoading(false);
      }
    };

    loadFormData();
  }, []);

  useEffect(() => {
    if (!formPreferencesReady) return;

    try {
      window.localStorage.setItem(
        FORM_PREFERENCES_STORAGE_KEY,
        JSON.stringify({
          avatarSource,
          selectedAvatarIds,
          contextId,
          voiceAgentId,
          language,
          noInterrupt,
        } satisfies StoredFormPreferences)
      );
    } catch (error) {
      console.warn('Failed to save form preferences to localStorage:', error);
    }
  }, [
    avatarSource,
    contextId,
    formPreferencesReady,
    language,
    noInterrupt,
    selectedAvatarIds,
    voiceAgentId,
  ]);

  const handleStartFullSession = async () => {
    if (!canStart) {
      toast.error('Заполните все обязательные поля');
      return;
    }

    setStartingSession(true);
    try {
      const res = await fetch(`${BASE_PATH}/api/start-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          usesVoiceAgent
            ? { avatarId, language, voiceAgentId }
            : { avatarId, language, voiceId, contextId }
        ),
      });

      if (!res.ok) {
        const error = await res.json();
        console.error('Failed to start session', error);
        toast.error('Не удалось начать сессию');
        return;
      }

      const { session_token } = await res.json();
      setSessionToken(session_token);
    } catch (error) {
      console.error('Failed to start session:', error);
      toast.error('Не удалось начать сессию');
    } finally {
      setStartingSession(false);
    }
  };

  const handleAvatarChange = (id: string) => {
    setSelectedAvatarIds((current) => ({ ...current, [avatarSource]: id }));
  };

  const handlePublicAvatarSearch = (value: string) => {
    setPublicAvatarSearch(value);

    const normalizedSearch = value.trim().toLocaleLowerCase();
    const matchingAvatars = normalizedSearch
      ? publicAvatars.filter((avatar) => avatar.name.toLocaleLowerCase().includes(normalizedSearch))
      : publicAvatars;

    setSelectedAvatarIds((current) => ({
      ...current,
      public: matchingAvatars.some((avatar) => avatar.id === current.public)
        ? current.public
        : (matchingAvatars[0]?.id ?? ''),
    }));
  };

  const loadMorePublicAvatars = async () => {
    if (loadingMorePublicAvatars || !hasMorePublicAvatars) return;

    setLoadingMorePublicAvatars(true);
    try {
      const nextPage = publicAvatarPage + 1;
      const result = await getPublicAvatars(nextPage);
      setPublicAvatars((current) => {
        const existingIds = new Set(current.map((avatar) => avatar.id));
        return [...current, ...result.results.filter((avatar) => !existingIds.has(avatar.id))];
      });
      setPublicAvatarCount(result.count);
      setPublicAvatarPage(nextPage);
      setHasMorePublicAvatars(Boolean(result.next));
    } catch (error) {
      console.error('Failed to load more public avatars:', error);
      toast.error('Не удалось загрузить дополнительные публичные аватары');
    } finally {
      setLoadingMorePublicAvatars(false);
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
      await fetch(`${BASE_PATH}/api/auth/logout`, { method: 'POST' });
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
          <p className="text-white/60 text-lg">Загрузка...</p>
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
            type="button"
            onClick={() => window.location.reload()}
            className="px-6 py-3 rounded-lg bg-white/10 text-white font-medium border border-white/20 hover:bg-white/20 transition-colors"
          >
            Повторить
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col items-center justify-center overflow-y-auto">
      {!sessionToken ? (
        <div className="w-full max-w-3xl flex flex-col items-center gap-6 p-8">
          {user && (
            <div className="w-full flex items-center justify-between text-sm text-white/60">
              <span>
                {user.email}
                {user.role === 'admin' && (
                  <span className="ml-2 px-2 py-0.5 rounded bg-white/10 text-white/80 text-xs">
                    администратор
                  </span>
                )}
              </span>
              <button
                type="button"
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
            <div className="w-full rounded-2xl bg-white/[0.04] p-3 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]">
              {isAdmin && (
                <div className="mb-3 flex rounded-xl bg-black/25 p-1">
                  {(['personal', 'public'] as const).map((source) => {
                    const isActive = avatarSource === source;
                    const count = source === 'personal' ? avatars.length : publicAvatarCount;
                    const isDisabled = source === 'personal' && avatars.length === 0;

                    return (
                      <button
                        key={source}
                        type="button"
                        aria-pressed={isActive}
                        disabled={isDisabled}
                        onClick={() => setAvatarSource(source)}
                        className={`min-h-10 flex-1 rounded-lg px-3 text-sm font-medium transition-[background-color,color,transform] active:scale-[0.96] disabled:cursor-not-allowed disabled:opacity-40 ${
                          isActive
                            ? 'bg-white text-black shadow-sm'
                            : 'text-white/60 hover:bg-white/[0.06] hover:text-white'
                        }`}
                      >
                        {source === 'personal' ? 'Личные' : 'Публичные'}
                        <span className="ml-2 tabular-nums opacity-60">{count}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {avatarSource === 'public' && (
                <div className="mb-3">
                  <label
                    htmlFor="public-avatar-search"
                    className="mb-1 block text-sm font-medium text-white"
                  >
                    Поиск по публичным аватарам
                  </label>
                  <div className="flex gap-2">
                    <input
                      id="public-avatar-search"
                      type="search"
                      value={publicAvatarSearch}
                      onChange={(event) => handlePublicAvatarSearch(event.target.value)}
                      placeholder="Введите имя аватара"
                      autoComplete="off"
                      className="min-h-10 min-w-0 flex-1 rounded-lg border border-white/10 bg-black/20 px-4 text-white placeholder:text-white/35 transition-colors focus:border-white/30 focus:outline-none"
                    />
                    {publicAvatarSearch && (
                      <button
                        type="button"
                        onClick={() => handlePublicAvatarSearch('')}
                        className="min-h-10 rounded-lg px-3 text-sm text-white/65 transition-[background-color,color,transform] hover:bg-white/[0.06] hover:text-white active:scale-[0.96]"
                      >
                        Очистить
                      </button>
                    )}
                  </div>
                  {normalizedPublicAvatarSearch && (
                    <p className="mt-1.5 text-xs text-white/45">
                      Найдено:{' '}
                      <span className="tabular-nums">
                        {filteredPublicAvatars.length} из {publicAvatars.length}
                      </span>
                    </p>
                  )}
                </div>
              )}

              <div className="flex min-h-28 gap-4 rounded-xl bg-black/20 p-3">
                <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-lg bg-white/[0.06] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.1)]">
                  {selectedAvatar?.preview_url ? (
                    // The provider controls preview hosts, so a native image avoids a brittle host allowlist.
                    // biome-ignore lint/performance/noImgElement: preview hosts are provider-controlled
                    <img
                      src={selectedAvatar.preview_url}
                      alt={`Превью аватара ${selectedAvatar.name}`}
                      className="h-full w-full object-cover outline outline-1 -outline-offset-1 outline-white/10"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-2xl text-white/30">
                      ◉
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <label
                    htmlFor="avatar-select"
                    className="mb-1 block text-sm font-medium text-white"
                  >
                    Аватар
                  </label>
                  <select
                    id="avatar-select"
                    value={avatarId}
                    onChange={(e) => handleAvatarChange(e.target.value)}
                    disabled={currentAvatars.length === 0}
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-lg text-white transition-colors focus:border-white/30 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {currentAvatars.length === 0 && (
                      <option value="">
                        {normalizedPublicAvatarSearch
                          ? 'По вашему запросу ничего не найдено'
                          : 'Нет доступных аватаров'}
                      </option>
                    )}
                    {currentAvatars.map((avatar) => (
                      <option key={avatar.id} value={avatar.id}>
                        {avatar.name}
                      </option>
                    ))}
                  </select>

                  <div className="mt-2 flex min-h-6 items-center justify-between gap-3 text-xs text-white/45">
                    <span className="truncate">
                      {usesVoiceAgent
                        ? 'Голос задаётся голосовым агентом'
                        : (selectedAvatar?.default_voice?.name ?? 'Голос по умолчанию не задан')}
                    </span>
                    {avatarSource === 'public' && hasMorePublicAvatars && (
                      <button
                        type="button"
                        onClick={loadMorePublicAvatars}
                        disabled={loadingMorePublicAvatars}
                        className="min-h-10 shrink-0 rounded-lg px-3 text-white/70 transition-[background-color,color,transform] hover:bg-white/[0.06] hover:text-white active:scale-[0.96] disabled:cursor-wait disabled:opacity-50"
                      >
                        {loadingMorePublicAvatars
                          ? 'Загрузка…'
                          : `Показать ещё (${publicAvatars.length}/${publicAvatarCount})`}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {usesVoiceAgent ? (
              <div className="w-full">
                <label
                  htmlFor="voice-agent-select"
                  className="block mb-1 text-sm font-medium text-white"
                >
                  Голосовой агент
                </label>
                <select
                  id="voice-agent-select"
                  value={voiceAgentId ?? ''}
                  onChange={(e) => setVoiceAgentId(e.target.value)}
                  disabled={voiceAgents.length === 0}
                  className="w-full px-4 py-3 rounded-lg bg-white/5 text-white text-lg border border-white/10 focus:outline-none focus:border-white/30 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {voiceAgents.length === 0 && (
                    <option value="">Нет доступных голосовых агентов</option>
                  )}
                  {voiceAgents.map((agent) => (
                    <option key={agent.id} value={agent.id}>
                      {agent.is_public ? `${agent.name} (публичный)` : agent.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="w-full">
                <label
                  htmlFor="context-select"
                  className="block mb-1 text-sm font-medium text-white"
                >
                  Контекст
                </label>
                <select
                  id="context-select"
                  value={contextId ?? ''}
                  onChange={(e) => handleContextChange(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg bg-white/5 text-white text-lg border border-white/10 focus:outline-none focus:border-white/30 transition-colors"
                >
                  <option value="">Не выбран</option>
                  {contexts.map((context) => (
                    <option key={context.id} value={context.id}>
                      {context.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="w-full">
              <label htmlFor="lang-select" className="block mb-1 text-sm font-medium text-white">
                Язык
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

            <label
              htmlFor="no-interrupt"
              className="w-full flex cursor-pointer items-start gap-3 rounded-lg border border-white/10 bg-white/5 px-4 py-3 transition-colors hover:border-white/20"
            >
              <input
                id="no-interrupt"
                type="checkbox"
                checked={noInterrupt}
                onChange={(e) => setNoInterrupt(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-white"
              />
              <span className="flex flex-col gap-0.5">
                <span className="text-sm font-medium text-white">
                  Не прерывать аватара во время ответа
                </span>
                <span className="text-xs text-white/45">
                  Микрофон отключается, пока аватар говорит
                </span>
              </span>
            </label>
          </div>

          <div className="w-full flex flex-col gap-3">
            <button
              type="button"
              onClick={handleStartFullSession}
              disabled={startingSession || !canStart}
              className="w-full px-6 py-3 rounded-lg bg-white/10 text-white font-medium text-lg border border-white/20 hover:bg-white/20 active:scale-[0.96] transition-[background-color,transform] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {startingSession ? 'Запуск...' : 'Начать сессию'}
            </button>
          </div>
        </div>
      ) : (
        <LiveAvatarSession
          sessionAccessToken={sessionToken}
          onSessionStopped={onSessionStopped}
          noInterrupt={noInterrupt}
        />
      )}
    </div>
  );
};
