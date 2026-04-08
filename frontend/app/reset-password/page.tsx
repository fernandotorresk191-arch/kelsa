"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

function ResetPasswordForm() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/");
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-lg p-6 flex flex-col items-center gap-4 text-center">
        <h1 className="text-xl font-bold text-gray-900">Сброс пароля</h1>
        <p className="text-sm text-gray-500">
          Авторизация теперь осуществляется через SMS. Перенаправляем на главную...
        </p>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return <ResetPasswordForm />;
}
