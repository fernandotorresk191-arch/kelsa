"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import CreateKopilkaForm from "@/components/kopilka/CreateKopilkaForm";
import KopilkaView from "@/components/kopilka/KopilkaView";
import { kopilkaApi } from "@/features/kopilka/api";
import type { Kopilka } from "@/features/kopilka/types";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  FiTarget,
  FiUsers,
  FiTrendingUp,
  FiShare2,
  FiPlus,
  FiArrowRight,
  FiTrash2,
  FiLogIn,
} from "react-icons/fi";

const FEATURES = [
  {
    icon: FiTarget,
    title: "Общая цель",
    desc: "Задайте цель и копите вместе с близкими",
  },
  {
    icon: FiUsers,
    title: "До 10 участников",
    desc: "Добавляйте семью и друзей в вашу копилку",
  },
  {
    icon: FiTrendingUp,
    title: "Прогресс",
    desc: "Отслеживайте накопления по месяцам",
  },
  {
    icon: FiShare2,
    title: "Делитесь ссылкой",
    desc: "Участники следят за прогрессом онлайн",
  },
];

export default function KopilkaPage() {
  const { user, isReady } = useAuth();
  const [kopilkas, setKopilkas] = useState<Kopilka[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [activeKopilka, setActiveKopilka] = useState<Kopilka | null>(null);
  const [confirmDeleteKopilka, setConfirmDeleteKopilka] = useState<{ shareId: string; name: string } | null>(null);

  const loadKopilkas = useCallback(async () => {
    if (!user) {
      setKopilkas([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const results = await kopilkaApi.getMy();
      setKopilkas(results);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (isReady) loadKopilkas();
  }, [isReady, loadKopilkas]);

  const handleCreated = (k: Kopilka) => {
    setKopilkas((prev) => [...prev, k]);
    setShowCreate(false);
    setActiveKopilka(k);
  };

  const handleDelete = async (shareId: string) => {
    try {
      await kopilkaApi.remove(shareId);
      setKopilkas((prev) => prev.filter((k) => k.shareId !== shareId));
      if (activeKopilka?.shareId === shareId) setActiveKopilka(null);
    } catch {
      // ignore
    }
  };

  // If viewing a specific kopilka
  if (activeKopilka) {
    return (
      <div className="kelsa-container py-6 pb-16">
        <button
          onClick={() => {
            setActiveKopilka(null);
            loadKopilkas();
          }}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-[#6206c7] transition-colors mb-4"
        >
          ← Все копилки
        </button>
        <KopilkaView kopilka={activeKopilka} />
      </div>
    );
  }

  return (
    <div className="kelsa-container py-6 pb-16">
      {/* Hero */}
      <div className="text-center py-10 md:py-16">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-[#6206c7] to-[#9333ea] mb-5 shadow-lg shadow-[#6206c7]/20">
          <span className="text-3xl">🪙</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
          Копилка
        </h1>
        <p className="text-lg text-gray-500 max-w-xl mx-auto leading-relaxed">
          Копить вместе — <span className="text-[#6206c7] font-semibold">проще и веселее!</span>{" "}
          Создайте совместную копилку, добавьте участников и
          отслеживайте прогресс накоплений
        </p>
      </div>

      {/* Features */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        {FEATURES.map((f) => (
          <div
            key={f.title}
            className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
          >
            <div className="w-10 h-10 rounded-xl bg-[#6206c7]/10 flex items-center justify-center mb-3">
              <f.icon size={20} className="text-[#6206c7]" />
            </div>
            <h3 className="text-sm font-semibold text-gray-800">{f.title}</h3>
            <p className="text-xs text-gray-500 mt-1">{f.desc}</p>
          </div>
        ))}
      </div>

      {/* My Kopilkas */}
      {!user ? (
        <div className="text-center py-10">
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 max-w-sm mx-auto">
            <div className="w-14 h-14 rounded-2xl bg-[#6206c7]/10 flex items-center justify-center mx-auto mb-4">
              <FiLogIn size={24} className="text-[#6206c7]" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Войдите в аккаунт</h3>
            <p className="text-sm text-gray-500 mb-5">
              Чтобы создавать копилки и отслеживать накопления, необходимо авторизоваться
            </p>
            <a
              href="/account"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#6206c7] hover:bg-[#5205A8] text-white text-sm font-medium shadow-lg shadow-[#6206c7]/20 transition-all"
            >
              <FiLogIn size={16} />
              Войти
            </a>
          </div>
        </div>
      ) : loading ? (
        <div className="text-center py-10 text-gray-400">Загрузка...</div>
      ) : (
        <>
          {kopilkas.length > 0 && (
            <div className="mb-8">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                Мои копилки
              </h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {kopilkas.map((k) => {
                  let totalSaved = 0;
                  for (const member of k.members) {
                    for (const c of member.contributions) {
                      try {
                        const paid: string[] = JSON.parse(c.paidMonths);
                        totalSaved += c.amount * paid.length;
                      } catch {
                        // ignore
                      }
                    }
                  }
                  const progress = Math.min(
                    100,
                    (totalSaved / k.goalAmount) * 100
                  );

                  return (
                    <div
                      key={k.id}
                      className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-all cursor-pointer group"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div
                          className="flex-1"
                          onClick={() => setActiveKopilka(k)}
                        >
                          <h3 className="font-semibold text-gray-800 group-hover:text-[#6206c7] transition-colors">
                            {k.name}
                          </h3>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {k.members.length}{" "}
                            {k.members.length === 1
                              ? "участник"
                              : k.members.length < 5
                              ? "участника"
                              : "участников"}
                          </p>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmDeleteKopilka({ shareId: k.shareId, name: k.name });
                          }}
                          className="p-1.5 text-gray-300 hover:text-red-500 transition-colors rounded"
                          title="Удалить копилку"
                        >
                          <FiTrash2 size={14} />
                        </button>
                      </div>

                      <div
                        className="space-y-2"
                        onClick={() => setActiveKopilka(k)}
                      >
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-500">
                            {totalSaved.toLocaleString("ru-RU")} ₽
                          </span>
                          <span className="font-medium text-[#6206c7]">
                            {k.goalAmount.toLocaleString("ru-RU")} ₽
                          </span>
                        </div>
                        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${progress}%`,
                              background:
                                "linear-gradient(90deg, #6206c7, #9333ea)",
                            }}
                          />
                        </div>
                      </div>

                      <div
                        className="mt-3 flex items-center gap-1 text-xs text-[#6206c7] font-medium opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => setActiveKopilka(k)}
                      >
                        Открыть <FiArrowRight size={12} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Create section */}
          {showCreate ? (
            <div className="max-w-lg mx-auto">
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <h2 className="text-xl font-bold text-gray-900 mb-5">
                  Новая копилка
                </h2>
                <CreateKopilkaForm onCreated={handleCreated} />
                <button
                  onClick={() => setShowCreate(false)}
                  className="mt-3 text-sm text-gray-400 hover:text-gray-600 w-full text-center"
                >
                  Отмена
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center">
              {kopilkas.length >= 3 ? (
                <p className="text-sm text-gray-400">
                  Вы достигли лимита — максимум 3 копилки
                </p>
              ) : (
                <Button
                  onClick={() => setShowCreate(true)}
                  className="bg-[#6206c7] hover:bg-[#5205A8] text-white font-medium rounded-xl h-12 px-8 shadow-lg shadow-[#6206c7]/20 hover:shadow-[#6206c7]/30 transition-all"
                >
                  <FiPlus size={18} className="mr-2" />
                  Создать копилку
                </Button>
              )}
            </div>
          )}
        </>
      )}

      {/* Confirm delete kopilka modal */}
      {confirmDeleteKopilka && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.4)" }}
          onClick={() => setConfirmDeleteKopilka(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 flex flex-col gap-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0">
                <FiTrash2 size={18} className="text-red-500" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-900">Удалить копилку?</h3>
                <p className="text-sm text-gray-500 mt-0.5">
                  «{confirmDeleteKopilka.name}» и все данные будут удалены безвозвратно.
                </p>
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setConfirmDeleteKopilka(null)}
                className="flex-1 h-10 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Отмена
              </button>
              <button
                onClick={async () => {
                  const { shareId } = confirmDeleteKopilka;
                  setConfirmDeleteKopilka(null);
                  await handleDelete(shareId);
                }}
                className="flex-1 h-10 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-medium transition-colors"
              >
                Да, удалить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
