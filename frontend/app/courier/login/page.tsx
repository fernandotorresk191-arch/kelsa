'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useCourier } from '@/components/courier/CourierProvider';

export default function CourierLoginPage() {
  const router = useRouter();
  const { login, isLoading } = useCourier();
  const [loginValue, setLoginValue] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!loginValue.trim() || !password.trim()) {
      setError('Введите логин и пароль');
      return;
    }

    try {
      await login(loginValue.trim(), password);
      router.push('/courier');
    } catch (err) {
      console.error('Login error:', err);
      setError('Неверный логин или пароль');
    }
  };

  return (
    <div className="courier-login-page">
      <Image
        src="/logo-fiolet.svg"
        alt="Kelsa Курьер"
        width={96}
        height={96}
        className="courier-login-logo"
      />
      <h1 className="courier-login-title">Kelsa Курьер</h1>
      <p className="courier-login-subtitle">Войдите в приложение доставки</p>

      <form onSubmit={handleSubmit} className="courier-login-form">
        <input
          type="text"
          placeholder="Логин"
          value={loginValue}
          onChange={(e) => setLoginValue(e.target.value)}
          className="courier-login-input"
          autoComplete="username"
          disabled={isLoading}
        />
        <input
          type="password"
          placeholder="Пароль"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="courier-login-input"
          autoComplete="current-password"
          disabled={isLoading}
        />
        
        {error && <p className="courier-login-error">{error}</p>}

        <button
          type="submit"
          disabled={isLoading}
          className="courier-btn courier-btn-primary"
        >
          {isLoading ? 'Вход...' : 'Войти'}
        </button>
      </form>
    </div>
  );
}
