import { apiRequest } from "./api";

export interface User {
  id: number;
  username: string;
  email: string;
}

const ACCESS_KEY = "divideai_access";
const REFRESH_KEY = "divideai_refresh";

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_KEY);
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_KEY);
}

export function saveTokens(access: string, refresh: string): void {
  localStorage.setItem(ACCESS_KEY, access);
  localStorage.setItem(REFRESH_KEY, refresh);
}

export function clearSession(): void {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

export function isAuthenticated(): boolean {
  return Boolean(getAccessToken());
}

export async function login(username: string, password: string): Promise<void> {
  const data = await apiRequest<{ access: string; refresh: string }>("/auth/login/", {
    method: "POST",
    body: JSON.stringify({ username, password }),
    retry: false,
  });
  saveTokens(data.access, data.refresh);
}

export async function register(
  username: string,
  email: string,
  password: string,
  passwordConfirm: string,
): Promise<void> {
  await apiRequest("/auth/register/", {
    method: "POST",
    body: JSON.stringify({
      username,
      email,
      password,
      password_confirm: passwordConfirm,
    }),
    retry: false,
  });
}

export function logout(): void {
  clearSession();
  window.location.hash = "#/login";
}

export function getMe(): Promise<User> {
  return apiRequest<User>("/auth/me/");
}

export function resetPassword(email: string): Promise<{ detail: string }> {
  return apiRequest<{ detail: string }>("/auth/password-reset/", {
    method: "POST",
    body: JSON.stringify({ email }),
    retry: false,
  });
}

export function changePassword(
  oldPassword: string,
  newPassword: string,
  newPasswordConfirm: string,
): Promise<{ detail: string }> {
  return apiRequest<{ detail: string }>("/auth/change-password/", {
    method: "POST",
    body: JSON.stringify({
      old_password: oldPassword,
      new_password: newPassword,
      new_password_confirm: newPasswordConfirm,
    }),
  });
}
