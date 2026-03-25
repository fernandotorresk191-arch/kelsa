import { apiGet, apiPatch, apiPost } from "shared/api/http";
import type {
  AuthResponse,
  AuthUser,
  LoginPayload,
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
  me: () => apiGet<AuthUser>("/v1/me"),
  myOrders: () => apiGet<UserOrder[]>("/v1/me/orders"),
  updateProfile: (payload: UpdateProfilePayload) =>
    apiPatch<AuthUser, UpdateProfilePayload>("/v1/me/profile", payload),
};
