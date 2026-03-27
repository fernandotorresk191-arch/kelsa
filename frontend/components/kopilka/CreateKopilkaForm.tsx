"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { kopilkaApi } from "@/features/kopilka/api";
import type { Kopilka } from "@/features/kopilka/types";
import { FiPlus, FiTrash2 } from "react-icons/fi";

const MONTH_OPTIONS = (() => {
  const now = new Date();
  const options: { value: string; label: string }[] = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("ru-RU", { month: "long", year: "numeric" });
    options.push({ value, label });
  }
  return options;
})();

export default function CreateKopilkaForm({
  onCreated,
}: {
  onCreated: (k: Kopilka) => void;
}) {
  const [name, setName] = useState("");
  const [goalAmount, setGoalAmount] = useState("");
  const [startMonth, setStartMonth] = useState(MONTH_OPTIONS[0].value);
  const [members, setMembers] = useState<string[]>([""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const addMemberField = () => {
    if (members.length < 10) setMembers([...members, ""]);
  };

  const removeMemberField = (idx: number) => {
    setMembers(members.filter((_, i) => i !== idx));
  };

  const updateMember = (idx: number, val: string) => {
    const next = [...members];
    next[idx] = val;
    setMembers(next);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const filtered = members.map((m) => m.trim()).filter(Boolean);
    if (!name.trim()) return setError("Введите название копилки");
    if (!goalAmount || Number(goalAmount) <= 0) return setError("Укажите сумму цели");
    if (filtered.length === 0) return setError("Добавьте хотя бы одного участника");

    setLoading(true);
    try {
      const kopilka = await kopilkaApi.create({
        name: name.trim(),
        goalAmount: Number(goalAmount),
        startMonth,
        members: filtered,
      });
      onCreated(kopilka);
    } catch {
      setError("Не удалось создать копилку. Попробуйте ещё раз.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Название копилки
        </label>
        <Input
          placeholder="Например: На отпуск"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="h-11"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Цель накоплений (₽)
        </label>
        <Input
          type="number"
          placeholder="25000"
          value={goalAmount}
          onChange={(e) => setGoalAmount(e.target.value)}
          min={1}
          className="h-11"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Месяц начала
        </label>
        <select
          value={startMonth}
          onChange={(e) => setStartMonth(e.target.value)}
          className="flex h-11 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          {MONTH_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Участники
        </label>
        <div className="space-y-2">
          {members.map((m, idx) => (
            <div key={idx} className="flex gap-2">
              <Input
                placeholder={`Имя участника ${idx + 1}`}
                value={m}
                onChange={(e) => updateMember(idx, e.target.value)}
                className="h-10"
              />
              {members.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeMemberField(idx)}
                  className="flex items-center justify-center w-10 h-10 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                >
                  <FiTrash2 size={16} />
                </button>
              )}
            </div>
          ))}
        </div>
        {members.length < 10 && (
          <button
            type="button"
            onClick={addMemberField}
            className="mt-2 flex items-center gap-1 text-sm text-[#6206c7] hover:text-[#5205A8] font-medium"
          >
            <FiPlus size={14} /> Добавить участника
          </button>
        )}
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
          {error}
        </p>
      )}

      <Button
        type="submit"
        disabled={loading}
        className="w-full h-11 bg-[#6206c7] hover:bg-[#5205A8] text-white font-medium rounded-xl"
      >
        {loading ? "Создаём..." : "Создать копилку"}
      </Button>
    </form>
  );
}
