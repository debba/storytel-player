import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api, { trackAction } from '../utils/api';
import storage from "../utils/storage";

interface LoginFormProps {
  onLogin: () => void;
  sessionExpired?: boolean;
}

function LoginForm({ onLogin, sessionExpired }: LoginFormProps) {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSsoLoading, setIsSsoLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const ssoAvailable = typeof window !== 'undefined' && !!window.electronAuth;

  const [ssoProvider, setSsoProvider] = useState<'google' | 'apple' | null>(null);

  const handleSsoLogin = async (provider: 'google' | 'apple') => {
    if (!window.electronAuth) return;
    setIsSsoLoading(true);
    setSsoProvider(provider);
    setError('');
    try {
      trackAction('User attempted SSO login', { provider });
      const result = await window.electronAuth.openSsoWindow(provider);
      if (result.cancelled) {
        setIsSsoLoading(false);
        setSsoProvider(null);
        return;
      }
      if (result.error || !result.credentials) {
        setError(result.error ?? t('login.errors.failed'));
        setIsSsoLoading(false);
        setSsoProvider(null);
        return;
      }
      const response = await api.post('/sso-login', result.credentials);
      const { token } = response.data;
      await storage.set('token', token);
      onLogin();
      navigate('/');
    } catch (err: any) {
      setError(err?.response?.data?.error ?? err?.message ?? t('login.errors.failed'));
    } finally {
      setIsSsoLoading(false);
      setSsoProvider(null);
    }
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();

    if (!email || !password) {
      setError(t('login.errors.required'));
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      trackAction('User attempted login', { email });
      const response = await api.post('/login', { email, password });
      const { token } = response.data;
      await storage.set('token', token);
      onLogin();
      navigate('/');
    } catch (error: any) {
      setError(error.response?.data?.error || t('login.errors.failed'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <main className="max-w-4xl mx-auto py-6 px-4">
        <div className="flex items-center justify-center min-h-[calc(100vh-8rem)]">
          <div className="max-w-md w-full space-y-8 p-8 bg-gray-900 rounded-lg shadow-lg border border-gray-800">
            <div>
                <div className="flex justify-center">
                    <img src={'assets/icon.png'} alt={"Storytel"} className="w-12 h-12"/>
                </div>
                <h2 className="mt-6 text-center text-3xl font-extrabold text-white">
                {t('login.title')}
              </h2>
              <p className="mt-2 text-center text-sm text-gray-400">
                {t('login.subtitle')}
              </p>
            </div>
            {sessionExpired && (
              <div className="text-amber-400 text-sm text-center bg-amber-900/20 p-2 rounded-md border border-amber-700">
                {t('login.errors.sessionExpired')}
              </div>
            )}
            <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <label htmlFor="email" className="sr-only">
                    {t('login.email')}
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="relative block w-full px-3 py-2 border border-gray-600 placeholder-gray-400 text-white bg-gray-800 rounded-md focus:outline-none focus:ring-orange-500 focus:border-orange-500 focus:z-10 sm:text-sm"
                    placeholder={t('login.email')}
                  />
                </div>
                <div className="relative">
                  <label htmlFor="password" className="sr-only">
                    {t('login.password')}
                  </label>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="relative block w-full px-3 py-2 pr-10 border border-gray-600 placeholder-gray-400 text-white bg-gray-800 rounded-md focus:outline-none focus:ring-orange-500 focus:border-orange-500 focus:z-10 sm:text-sm"
                    placeholder={t('login.password')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-300"
                  >
                    {showPassword ? (
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {error && (
                <div className="text-red-400 text-sm text-center bg-red-900/20 p-2 rounded-md border border-red-800">
                  {error}
                </div>
              )}

              <div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <div className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      {t('login.signingIn')}
                    </div>
                  ) : (
                    t('login.signIn')
                  )}
                </button>
              </div>
            </form>
            {ssoAvailable && (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-gray-700" />
                  <span className="text-xs uppercase tracking-wider text-gray-500">
                    {t('login.ssoDivider')}
                  </span>
                  <div className="flex-1 h-px bg-gray-700" />
                </div>
                <button
                  type="button"
                  onClick={() => handleSsoLogin('google')}
                  disabled={isSsoLoading || isLoading}
                  className="w-full flex items-center justify-center gap-2 py-2 px-4 border border-gray-600 text-sm font-medium rounded-md text-white bg-gray-800 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className="w-4 h-4" viewBox="0 0 48 48" aria-hidden="true">
                    <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.5-5.9 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 5.1 29.3 3 24 3 12.4 3 3 12.4 3 24s9.4 21 21 21 21-9.4 21-21c0-1.2-.1-2.4-.4-3.5z"/>
                    <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 5.1 29.3 3 24 3 16.3 3 9.7 7.4 6.3 14.7z"/>
                    <path fill="#4CAF50" d="M24 45c5.2 0 9.9-2 13.4-5.3l-6.2-5.2C29.2 36 26.7 37 24 37c-5.4 0-9.7-3.4-11.3-8.1L6.1 34C9.5 41.6 16.1 45 24 45z"/>
                    <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.5l6.2 5.2c-.4.4 6.6-4.8 6.6-14.2 0-1.2-.1-2.4-.4-3.5z"/>
                  </svg>
                  {isSsoLoading && ssoProvider === 'google'
                    ? t('login.ssoOpening')
                    : t('login.ssoGoogle')}
                </button>
                <button
                  type="button"
                  onClick={() => handleSsoLogin('apple')}
                  disabled={isSsoLoading || isLoading}
                  className="w-full flex items-center justify-center gap-2 py-2 px-4 border border-gray-600 text-sm font-medium rounded-md text-white bg-gray-800 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                  </svg>
                  {isSsoLoading && ssoProvider === 'apple'
                    ? t('login.ssoOpening')
                    : t('login.ssoApple')}
                </button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default LoginForm;
