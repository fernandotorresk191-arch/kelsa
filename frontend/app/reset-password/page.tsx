"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useState } from "react";
import { authApi } from "features/auth/api";
import { useAuth } from "components/auth/AuthProvider";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { loginWithToken } = useAuth();
  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!token) {
      setError("Отсутствует токен сброса. Проверьте ссылку из письма.");
      return;
    }
    if (password.length < 6) {
      setError("Пароль должен содержать минимум 6 символов");
      return;
    }
    if (password !== passwordConfirm) {
      setError("Пароли не совпадают");
      return;
    }

    setLoading(true);
    try {
      const res = await authApi.confirmPasswordReset({ token, password });
      loginWithToken(res.accessToken, res.user);
      setSuccess(true);
      setTimeout(() => {
        router.push("/");
      }, 2000);
    } catch (err: unknown) {
      const msg =
        err && typeof err === "object" && "message" in err
          ? (err as { message: string }).message
          : "Ошибка сброса пароля";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="w-full max-w-sm bg-white rounded-2xl shadow-lg p-6 flex flex-col items-center gap-4 text-center">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
            <span className="text-3xl">✅</span>
          </div>
          <h1 className="text-xl font-bold text-gray-900">Пароль изменён!</h1>
          <p className="text-sm text-gray-500">
            Вы автоматически авторизованы. Сейчас вы будете перенаправлены на
            главную страницу...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm bg-white rounded-2xl shadow-lg p-6 flex flex-col gap-4"
      >
        <div className="flex flex-col items-center text-center gap-2">
          <div className="w-14 h-14 rounded-full bg-[#6206c7]/10 flex items-center justify-center">
            <span className="text-2xl">🔑</span>
          </div>
          <h1 className="text-xl font-bold text-gray-900">Новый пароль</h1>
          <p className="text-sm text-gray-500">Введите новый пароль для вашего аккаунта</p>
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-700">Новый пароль</label>
          <input
            type="password"
            placeholder="Минимум 6 символов"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#6206c7]/30 focus:border-[#6206c7]"
            autoFocus
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-700">Подтвердите пароль</label>
          <input
            type="password"
            placeholder="Повторите пароль"
            value={passwordConfirm}
            onChange={(e) => setPasswordConfirm(e.target.value)}
            className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#6206c7]/30 focus:border-[#6206c7]"
          />
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-600">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full h-11 rounded-xl bg-[#6206c7] hover:bg-[#5205A8] text-white text-sm font-semibold transition-colors disabled:opacity-50"
        >
          {loading ? "Сохраняем..." : "Сохранить пароль"}
        </button>
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <p className="text-gray-500 text-sm">Загрузка...</p>
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
