import { getAccessToken, getRefreshToken, saveTokens, clearSession } from "./auth";

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api";

type RequestOptions = RequestInit & { retry?: boolean };

async function refreshAccessToken(): Promise<boolean> {
  const refresh = getRefreshToken();
  if (!refresh) return false;

  const response = await fetch(`${API_BASE_URL}/auth/refresh/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh }),
  });

  if (!response.ok) {
    clearSession();
    return false;
  }

  const data = await response.json();
  saveTokens(data.access, refresh);
  return true;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers = new Headers(options.headers);
  const token = getAccessToken();
  if (!headers.has("Content-Type") && options.body) {
    headers.set("Content-Type", "application/json");
  }
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });
  if (response.status === 401 && options.retry !== false && (await refreshAccessToken())) {
    return apiRequest<T>(path, { ...options, retry: false });
  }

  if (!response.ok) {
    let message = "Nao foi possivel concluir a acao.";
    try {
      const error = await response.json();
      message = formatApiError(error);
    } catch {
      message = response.statusText || message;
    }
    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }
  return response.json();
}

function formatApiError(error: unknown): string {
  if (typeof error === "string") return error;
  if (Array.isArray(error)) return error.join(" ");
  if (error && typeof error === "object") {
    return Object.entries(error)
      .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(" ") : String(value)}`)
      .join(" | ");
  }
  return "Erro desconhecido.";
}
