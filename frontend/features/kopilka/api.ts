import { apiDelete, apiGet, apiPatch, apiPost } from "@/shared/api/http";
import type { Kopilka, CreateKopilkaPayload } from "./types";

export const kopilkaApi = {
  create: (payload: CreateKopilkaPayload) =>
    apiPost<Kopilka, CreateKopilkaPayload>("/v1/kopilka", payload),

  get: (shareId: string) =>
    apiGet<Kopilka>(`/v1/kopilka/${shareId}`),

  update: (shareId: string, payload: { name?: string; goalAmount?: number }) =>
    apiPatch<Kopilka>(`/v1/kopilka/${shareId}`, payload),

  remove: (shareId: string) =>
    apiDelete<{ ok: boolean }>(`/v1/kopilka/${shareId}`),

  addMember: (shareId: string, name: string) =>
    apiPost<Kopilka>(`/v1/kopilka/${shareId}/members`, { name }),

  removeMember: (shareId: string, memberId: string) =>
    apiDelete<Kopilka>(`/v1/kopilka/${shareId}/members/${memberId}`),

  addContribution: (shareId: string, memberId: string, amount: number) =>
    apiPost<Kopilka>(`/v1/kopilka/${shareId}/members/${memberId}/contributions`, { amount }),

  removeContribution: (shareId: string, contributionId: string) =>
    apiDelete<Kopilka>(`/v1/kopilka/${shareId}/contributions/${contributionId}`),

  togglePayment: (shareId: string, contributionId: string, month: string) =>
    apiPost<Kopilka>(`/v1/kopilka/${shareId}/contributions/${contributionId}/toggle`, { month }),
};
