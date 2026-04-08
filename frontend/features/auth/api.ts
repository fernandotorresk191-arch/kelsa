import { apiGet, apiPatch, apiPost } from "shared/api/http";
import type {
  AuthResponse,
  AuthUser,
  CheckEmailResponse,
  CheckPhoneResponse,
  ConfirmPasswordResetPayload,
  LoginByPhonePayload,
  LoginPayload,
  RegisterByPhonePayload,
  RegisterPayload,
  RequestPasswordResetResponse,
  SendEmailCodeResponse,
  SettlementDto,
  UpdateProfilePayload,
  UserOrder,
  VerifyEmailCodeResponse,
} from "./types";

export const authApi = {
  settlements: () => apiGet<SettlementDto[]>("/v1/settlements"),
  register: (payload: RegisterPayload) =>
    apiPost<AuthResponse, RegisterPayload>("/v1/auth/register", payload),
  login: (payload: LoginPayload) =>
    apiPost<AuthResponse, LoginPayload>("/v1/auth/login", payload),
  checkPhone: (phone: string) =>
    apiPost<CheckPhoneResponse, { phone: string }>("/v1/auth/check-phone", { phone }),
  loginByPhone: (payload: LoginByPhonePayload) =>
    apiPost<AuthResponse, LoginByPhonePayload>("/v1/auth/login-by-phone", payload),
  registerByPhone: (payload: RegisterByPhonePayload) =>
    apiPost<AuthResponse, RegisterByPhonePayload>("/v1/auth/register-by-phone", payload),
  checkEmail: (email: string) =>
    apiPost<CheckEmailResponse, { email: string }>("/v1/auth/check-email", { email }),
  sendEmailCode: (email: string) =>
    apiPost<SendEmailCodeResponse, { email: string }>("/v1/auth/send-email-code", { email }),
  verifyEmailCode: (email: string, code: string) =>
    apiPost<VerifyEmailCodeResponse, { email: string; code: string }>("/v1/auth/verify-email-code", { email, code }),
  requestPasswordReset: (phone: string) =>
    apiPost<RequestPasswordResetResponse, { phone: string }>("/v1/auth/request-password-reset", { phone }),
  confirmPasswordReset: (payload: ConfirmPasswordResetPayload) =>
    apiPost<AuthResponse, ConfirmPasswordResetPayload>("/v1/auth/confirm-password-reset", payload),
  me: () => apiGet<AuthUser>("/v1/me"),
  myOrders: () => apiGet<UserOrder[]>("/v1/me/orders"),
  updateProfile: (payload: UpdateProfilePayload) =>
    apiPatch<AuthUser, UpdateProfilePayload>("/v1/me/profile", payload),
};
