import {
  apiDelete,
  apiGet,
  apiPatch,
  apiPost,
} from "./client";

// --------------------------------------------------------------------------- //
// Types (mirror backend app/schemas/auth.py)                                  //
// --------------------------------------------------------------------------- //
export type Role = "superadmin" | "admin" | "researcher" | "research_assistant";

export const ROLE_LABELS: Record<Role, string> = {
  superadmin: "Super Admin",
  admin: "Admin",
  researcher: "Researcher",
  research_assistant: "Research Assistant",
};

export const SELF_SIGNUP_ROLES: Role[] = ["researcher", "research_assistant"];
export const ALL_ROLES: Role[] = [
  "superadmin",
  "admin",
  "researcher",
  "research_assistant",
];

export interface UserPublic {
  id: number;
  username: string;
  email: string;
  phone: string | null;
  full_name: string | null;
  role: Role;
  is_active: boolean;
  must_change_password: boolean;
  created_at: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  must_change_password: boolean;
  user: UserPublic;
}

export interface RegisterResponse {
  user: UserPublic;
  initial_password_hint: string;
  detail: string;
}

export interface RegisterPayload {
  username: string;
  email: string;
  phone?: string | null;
  full_name?: string | null;
  role: Role;
}

export interface ForgotUsernameResponse {
  username: string;
  detail: string;
}

export interface SimpleMessage {
  detail: string;
}

// --------------------------------------------------------------------------- //
// API calls                                                                   //
// --------------------------------------------------------------------------- //
export function registerUser(
  payload: RegisterPayload
): Promise<RegisterResponse> {
  return apiPost<RegisterResponse>("/auth/register", payload);
}

export function loginUser(
  username: string,
  password: string
): Promise<TokenResponse> {
  return apiPost<TokenResponse>("/auth/login", { username, password });
}

export function fetchMe(): Promise<UserPublic> {
  return apiGet<UserPublic>("/auth/me");
}

export function changePassword(
  current_password: string,
  new_password: string
): Promise<TokenResponse> {
  return apiPost<TokenResponse>("/auth/change-password", {
    current_password,
    new_password,
  });
}

export function forgotUsername(input: {
  email?: string;
  phone?: string;
}): Promise<ForgotUsernameResponse> {
  return apiPost<ForgotUsernameResponse>("/auth/forgot-username", input);
}

export function forgotPassword(input: {
  username: string;
  email?: string;
  phone?: string;
}): Promise<SimpleMessage> {
  return apiPost<SimpleMessage>("/auth/forgot-password", input);
}

// Admin / superadmin user management
export function listUsers(): Promise<UserPublic[]> {
  return apiGet<UserPublic[]>("/auth/users");
}

export function updateUserRole(
  userId: number,
  role: Role
): Promise<UserPublic> {
  return apiPatch<UserPublic>(`/auth/users/${userId}/role`, { role });
}

export function updateUserActive(
  userId: number,
  isActive: boolean
): Promise<UserPublic> {
  return apiPatch<UserPublic>(`/auth/users/${userId}/active`, {
    is_active: isActive,
  });
}

export function deleteUser(userId: number): Promise<SimpleMessage> {
  return apiDelete<SimpleMessage>(`/auth/users/${userId}`);
}
