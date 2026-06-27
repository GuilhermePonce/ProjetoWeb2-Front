import { apiRequest } from "./api";
import type { User } from "./auth";

export function listUsers(): Promise<User[]> {
  return apiRequest<User[]>("/users/");
}
