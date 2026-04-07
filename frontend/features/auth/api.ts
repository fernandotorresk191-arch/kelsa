import { apiGet, apiPatch, apiPost } from "shared/api/http";
import type {
  AuthResponse,
  AuthUser,
  CheckPhoneResponse,
  LoginByPhonePayload,
  LoginPayload,
  RegisterByPhonePayload,
  RegisterPayload,
  SettlementDto,
  UpdateProfilePayload,
  UserOrder,
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
  me: () => apiGet<AuthUser>("/v1/me"),
  myOrders: () => apiGet<UserOrder[]>("/v1/me/orders"),
  updateProfile: (payload: UpdateProfilePayload) =>
    apiPatch<AuthUser, UpdateProfilePayload>("/v1/me/profile", payload),
};
