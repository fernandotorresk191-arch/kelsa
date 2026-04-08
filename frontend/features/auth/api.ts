import { apiGet, apiPatch, apiPost } from "shared/api/http";
import type {
  AuthResponse,
  AuthUser,
  SendSmsCodeResponse,
  SettlementDto,
  UpdateProfilePayload,
  UserOrder,
  VerifySmsCodePayload,
} from "./types";

export const authApi = {
  settlements: () => apiGet<SettlementDto[]>("/v1/settlements"),
  sendSmsCode: (phone: string) =>
    apiPost<SendSmsCodeResponse, { phone: string }>("/v1/auth/send-sms-code", { phone }),
  verifySmsCode: (payload: VerifySmsCodePayload) =>
    apiPost<AuthResponse, VerifySmsCodePayload>("/v1/auth/verify-sms-code", payload),
  me: () => apiGet<AuthUser>("/v1/me"),
  myOrders: () => apiGet<UserOrder[]>("/v1/me/orders"),
  updateProfile: (payload: UpdateProfilePayload) =>
    apiPatch<AuthUser, UpdateProfilePayload>("/v1/me/profile", payload),
};
