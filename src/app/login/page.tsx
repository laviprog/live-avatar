'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Не удалось выполнить вход');
        return;
      }

      router.replace('/');
      router.refresh();
    } catch {
      setError('Не удалось выполнить вход');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full h-full flex items-center justify-center">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm flex flex-col gap-4 p-8"
        autoComplete="on"
      >
        <div className="text-center mb-2">
          <h1 className="text-3xl font-semibold text-white">Вход</h1>
        </div>

        <div className="w-full">
          <label htmlFor="email" className="block mb-1 text-sm font-medium text-white">
            Электронная почта
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="username"
            className="w-full px-4 py-3 rounded-lg bg-white/5 text-white text-lg border border-white/10 focus:outline-none focus:border-white/30 transition-colors"
          />
        </div>

        <div className="w-full">
          <label htmlFor="password" className="block mb-1 text-sm font-medium text-white">
            Пароль
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            className="w-full px-4 py-3 rounded-lg bg-white/5 text-white text-lg border border-white/10 focus:outline-none focus:border-white/30 transition-colors"
          />
        </div>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <button
          type="submit"
          disabled={loading || !email || !password}
          className="w-full px-6 py-3 rounded-lg bg-white/10 text-white font-medium text-lg border border-white/20 hover:bg-white/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Вход...' : 'Войти'}
        </button>
      </form>
    </div>
  );
}
