'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LiveAvatarSession } from './LiveAvatarSession';
import { Avatar, AvatarPage, AvatarSource } from '@/types/avatar';
import { Context } from '@/types/context';
import { SessionUser } from '@/types/user';
import { toast } from 'react-toastify';
import { LANGUAGE_LIST } from '@/data/languages';

export type SessionMode = 'FULL';

const PUBLIC_AVATAR_PAGE_SIZE = 100;

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

const getPublicAvatars = async (page: number): Promise<AvatarPage> => {
  const params = new URLSearchParams({
    page: String(page),
    page_size: String(PUBLIC_AVATAR_PAGE_SIZE),
  });
  const res = await fetch(`/api/avatars/public?${params}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch public avatars: ${res.status}`);
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
  const [language, setLanguage] = useState('ru');

  const normalizedPublicAvatarSearch = publicAvatarSearch.trim().toLocaleLowerCase();
  const filteredPublicAvatars = normalizedPublicAvatarSearch
    ? publicAvatars.filter((avatar) =>
        avatar.name.toLocaleLowerCase().includes(normalizedPublicAvatarSearch)
      )
    : publicAvatars;
  const currentAvatars = avatarSource === 'personal' ? avatars : filteredPublicAvatars;
  const avatarId = selectedAvatarIds[avatarSource];
  const selectedAvatar = currentAvatars.find((avatar) => avatar.id === avatarId);
  const voiceId = selectedAvatar?.default_voice.id ?? '';

  useEffect(() => {
    const loadFormData = async () => {
      try {
        setIsDataLoading(true);
        setDataError(null);

        const [fetchedAvatars, fetchedPublicAvatars, fetchedContexts, fetchedUser] =
          await Promise.all([getAvatars(), getPublicAvatars(1), getContexts(), getCurrentUser()]);

        setAvatars(fetchedAvatars);
        setPublicAvatars(fetchedPublicAvatars.results);
        setPublicAvatarCount(fetchedPublicAvatars.count);
        setHasMorePublicAvatars(Boolean(fetchedPublicAvatars.next));
        setContexts(fetchedContexts);
        setUser(fetchedUser);

        setSelectedAvatarIds({
          personal: fetchedAvatars[0]?.id ?? '',
          public: fetchedPublicAvatars.results[0]?.id ?? '',
        });
        setAvatarSource(fetchedAvatars.length > 0 ? 'personal' : 'public');
        if (fetchedContexts.length > 0) {
          setContextId(fetchedContexts[0].id);
        }
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

  const handleStartFullSession = async () => {
    if (!avatarId || !voiceId || !language) {
      toast.error('Заполните все обязательные поля');
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
          avatarSource,
        }),
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
                    // eslint-disable-next-line @next/next/no-img-element
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
                      {selectedAvatar?.default_voice.name ?? 'Голос по умолчанию не задан'}
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

            <div className="w-full">
              <label htmlFor="context-select" className="block mb-1 text-sm font-medium text-white">
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
          </div>

          <div className="w-full flex flex-col gap-3">
            <button
              onClick={handleStartFullSession}
              disabled={startingSession || !avatarId || !voiceId || !language}
              className="w-full px-6 py-3 rounded-lg bg-white/10 text-white font-medium text-lg border border-white/20 hover:bg-white/20 active:scale-[0.96] transition-[background-color,transform] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {startingSession ? 'Запуск...' : 'Начать сессию'}
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
