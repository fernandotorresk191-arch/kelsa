"use client";

import { useState } from "react";
import type { Kopilka, KopilkaContribution } from "@/features/kopilka/types";
import { kopilkaApi } from "@/features/kopilka/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  FiPlus,
  FiTrash2,
  FiCheck,
  FiShare2,
  FiCopy,
  FiUserPlus,
} from "react-icons/fi";

const MONTH_NAMES_SHORT: Record<string, string> = {
  "01": "Янв",
  "02": "Фев",
  "03": "Мар",
  "04": "Апр",
  "05": "Май",
  "06": "Июн",
  "07": "Июл",
  "08": "Авг",
  "09": "Сен",
  "10": "Окт",
  "11": "Ноя",
  "12": "Дек",
};

function formatMonth(m: string): string {
  const [year, month] = m.split("-");
  return `${MONTH_NAMES_SHORT[month]} ${year.slice(2)}`;
}

function getMonthColumns(startMonth: string, count = 6): string[] {
  const [y, m] = startMonth.split("-").map(Number);
  const months: string[] = [];
  for (let i = 0; i < count; i++) {
    const d = new Date(y, m - 1 + i, 1);
    months.push(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
    );
  }
  return months;
}

function getPaidMonths(contribution: KopilkaContribution): string[] {
  try {
    return JSON.parse(contribution.paidMonths);
  } catch {
    return [];
  }
}

function calcTotalSaved(kopilka: Kopilka): number {
  let total = 0;
  for (const member of kopilka.members) {
    for (const c of member.contributions) {
      const paid = getPaidMonths(c);
      total += c.amount * paid.length;
    }
  }
  return total;
}

export default function KopilkaView({
  kopilka: initialKopilka,
  isReadonly = false,
}: {
  kopilka: Kopilka;
  isReadonly?: boolean;
}) {
  const [kopilka, setKopilka] = useState(initialKopilka);
  const [loading, setLoading] = useState(false);
  const [addAmountFor, setAddAmountFor] = useState<string | null>(null);
  const [newAmount, setNewAmount] = useState("");
  const [showAddMember, setShowAddMember] = useState(false);
  const [newMemberName, setNewMemberName] = useState("");
  const [copied, setCopied] = useState(false);

  const months = getMonthColumns(kopilka.startMonth, 6);
  const totalSaved = calcTotalSaved(kopilka);
  const progress = Math.min(100, (totalSaved / kopilka.goalAmount) * 100);

  const handleTogglePayment = async (
    contributionId: string,
    month: string
  ) => {
    if (isReadonly || loading) return;
    setLoading(true);
    try {
      const updated = await kopilkaApi.togglePayment(
        kopilka.shareId,
        contributionId,
        month
      );
      setKopilka(updated);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const handleAddContribution = async (memberId: string) => {
    const amount = Number(newAmount);
    if (!amount || amount <= 0) return;
    setLoading(true);
    try {
      const updated = await kopilkaApi.addContribution(
        kopilka.shareId,
        memberId,
        amount
      );
      setKopilka(updated);
      setAddAmountFor(null);
      setNewAmount("");
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveContribution = async (contributionId: string) => {
    if (loading) return;
    setLoading(true);
    try {
      const updated = await kopilkaApi.removeContribution(
        kopilka.shareId,
        contributionId
      );
      setKopilka(updated);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const handleAddMember = async () => {
    if (!newMemberName.trim() || loading) return;
    setLoading(true);
    try {
      const updated = await kopilkaApi.addMember(
        kopilka.shareId,
        newMemberName.trim()
      );
      setKopilka(updated);
      setNewMemberName("");
      setShowAddMember(false);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (loading) return;
    setLoading(true);
    try {
      const updated = await kopilkaApi.removeMember(
        kopilka.shareId,
        memberId
      );
      setKopilka(updated);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = () => {
    const url = `${window.location.origin}/kopilka/${kopilka.shareId}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{kopilka.name}</h2>
          <p className="text-sm text-gray-500 mt-1">
            Цель: {kopilka.goalAmount.toLocaleString("ru-RU")} ₽
          </p>
        </div>
        <button
          onClick={handleCopyLink}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#6206c7]/10 text-[#6206c7] hover:bg-[#6206c7]/20 transition-colors text-sm font-medium"
        >
          {copied ? (
            <>
              <FiCheck size={16} /> Скопировано!
            </>
          ) : (
            <>
              <FiShare2 size={16} /> Поделиться
            </>
          )}
        </button>
      </div>

      {/* Progress bar */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-600">
            Накоплено
          </span>
          <span className="text-sm font-bold text-[#6206c7]">
            {totalSaved.toLocaleString("ru-RU")} ₽ из{" "}
            {kopilka.goalAmount.toLocaleString("ru-RU")} ₽
          </span>
        </div>
        <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500 ease-out"
            style={{
              width: `${progress}%`,
              background: "linear-gradient(90deg, #6206c7, #9333ea)",
            }}
          />
        </div>
        <p className="text-xs text-gray-400 mt-1 text-right">
          {progress.toFixed(0)}%
        </p>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700 min-w-[140px] bg-gray-50/50">
                  Участник
                </th>
                <th className="px-2 py-3 text-sm font-medium text-gray-500 bg-gray-50/50 w-[80px] text-center">
                  Сумма
                </th>
                {months.map((m) => (
                  <th
                    key={m}
                    className="px-2 py-3 text-xs font-medium text-gray-500 text-center bg-gray-50/50 min-w-[70px]"
                  >
                    {formatMonth(m)}
                  </th>
                ))}
                {!isReadonly && (
                  <th className="px-2 py-3 bg-gray-50/50 w-[44px]" />
                )}
              </tr>
            </thead>
            <tbody>
              {kopilka.members.map((member) => (
                <>
                  {/* Member header row */}
                  <tr
                    key={`header-${member.id}`}
                    className="border-b border-gray-50"
                  >
                    <td className="px-4 py-2.5" colSpan={months.length + 3}>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-800 text-sm">
                          {member.name}
                        </span>
                        {!isReadonly && (
                          <button
                            onClick={() => handleRemoveMember(member.id)}
                            className="text-gray-300 hover:text-red-500 transition-colors p-0.5"
                            title="Удалить участника"
                          >
                            <FiTrash2 size={13} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>

                  {/* Contribution rows */}
                  {member.contributions.map((contribution) => {
                    const paid = getPaidMonths(contribution);
                    return (
                      <tr
                        key={contribution.id}
                        className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors"
                      >
                        <td className="px-4 py-1.5" />
                        <td className="px-2 py-1.5 text-center">
                          <span className="text-sm font-medium text-gray-700">
                            {contribution.amount.toLocaleString("ru-RU")}
                          </span>
                        </td>
                        {months.map((m) => {
                          const isPaid = paid.includes(m);
                          return (
                            <td key={m} className="px-1 py-1.5 text-center">
                              <button
                                onClick={() =>
                                  handleTogglePayment(contribution.id, m)
                                }
                                disabled={isReadonly || loading}
                                className={`w-full h-8 rounded-lg transition-all duration-200 ${
                                  isPaid
                                    ? "bg-[#86c76e] hover:bg-[#6fb856] shadow-sm"
                                    : "bg-gray-100 hover:bg-gray-200"
                                } ${
                                  isReadonly
                                    ? "cursor-default"
                                    : "cursor-pointer active:scale-95"
                                }`}
                                title={
                                  isPaid
                                    ? "Отменить оплату"
                                    : "Отметить как оплачено"
                                }
                              >
                                {isPaid && (
                                  <FiCheck
                                    size={14}
                                    className="mx-auto text-white"
                                  />
                                )}
                              </button>
                            </td>
                          );
                        })}
                        {!isReadonly && (
                          <td className="px-1 py-1.5 text-center">
                            <button
                              onClick={() =>
                                handleRemoveContribution(contribution.id)
                              }
                              className="p-1.5 text-gray-300 hover:text-red-500 transition-colors rounded"
                              title="Удалить взнос"
                            >
                              <FiTrash2 size={13} />
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })}

                  {/* Add contribution row */}
                  {!isReadonly && (
                    <tr
                      key={`add-${member.id}`}
                      className="border-b border-gray-100"
                    >
                      <td
                        className="px-4 py-2"
                        colSpan={months.length + 3}
                      >
                        {addAmountFor === member.id ? (
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              placeholder="Сумма"
                              value={newAmount}
                              onChange={(e) => setNewAmount(e.target.value)}
                              className="h-8 w-28 text-sm"
                              min={1}
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === "Enter")
                                  handleAddContribution(member.id);
                                if (e.key === "Escape") {
                                  setAddAmountFor(null);
                                  setNewAmount("");
                                }
                              }}
                            />
                            <Button
                              onClick={() =>
                                handleAddContribution(member.id)
                              }
                              size="sm"
                              className="h-8 bg-[#6206c7] hover:bg-[#5205A8] text-white text-xs"
                            >
                              Добавить
                            </Button>
                            <button
                              onClick={() => {
                                setAddAmountFor(null);
                                setNewAmount("");
                              }}
                              className="text-xs text-gray-400 hover:text-gray-600"
                            >
                              Отмена
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setAddAmountFor(member.id);
                              setNewAmount("");
                            }}
                            className="flex items-center gap-1 text-xs text-[#6206c7] hover:text-[#5205A8] font-medium transition-colors"
                          >
                            <FiPlus size={12} /> Добавить сумму
                          </button>
                        )}
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>

        {/* Add member */}
        {!isReadonly && (
          <div className="px-4 py-3 border-t border-gray-100 bg-gray-50/30">
            {showAddMember ? (
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Имя участника"
                  value={newMemberName}
                  onChange={(e) => setNewMemberName(e.target.value)}
                  className="h-9 w-48 text-sm"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAddMember();
                    if (e.key === "Escape") {
                      setShowAddMember(false);
                      setNewMemberName("");
                    }
                  }}
                />
                <Button
                  onClick={handleAddMember}
                  size="sm"
                  className="h-9 bg-[#6206c7] hover:bg-[#5205A8] text-white"
                >
                  Добавить
                </Button>
                <button
                  onClick={() => {
                    setShowAddMember(false);
                    setNewMemberName("");
                  }}
                  className="text-xs text-gray-400 hover:text-gray-600"
                >
                  Отмена
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowAddMember(true)}
                className="flex items-center gap-1.5 text-sm text-[#6206c7] hover:text-[#5205A8] font-medium transition-colors"
              >
                <FiUserPlus size={14} /> Добавить участника
              </button>
            )}
          </div>
        )}
      </div>

      {/* Share section */}
      <div className="bg-gradient-to-r from-[#6206c7]/5 to-[#9333ea]/5 rounded-2xl p-5 border border-[#6206c7]/10">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#6206c7]/10 flex items-center justify-center flex-shrink-0">
            <FiCopy size={18} className="text-[#6206c7]" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-800">
              Поделитесь ссылкой
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Скопируйте ссылку и отправьте участникам — они смогут следить
              за накоплениями в реальном времени
            </p>
            <button
              onClick={handleCopyLink}
              className="mt-2 flex items-center gap-1.5 text-sm text-[#6206c7] hover:text-[#5205A8] font-medium transition-colors"
            >
              <FiCopy size={14} />
              {copied ? "Скопировано!" : "Скопировать ссылку"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
