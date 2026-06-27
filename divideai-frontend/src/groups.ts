import { apiRequest } from "./api";
import type { User } from "./auth";

export interface Group {
  id: number;
  name: string;
  description: string;
  owner: User;
  members: number[];
  member_details: User[];
  created_at: string;
}

export interface GroupPayload {
  name: string;
  description: string;
  members?: number[];
}

export function listGroups(): Promise<Group[]> {
  return apiRequest<Group[]>("/groups/");
}

export function getGroup(id: number): Promise<Group> {
  return apiRequest<Group>(`/groups/${id}/`);
}

export function createGroup(payload: GroupPayload): Promise<Group> {
  return apiRequest<Group>("/groups/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateGroup(id: number, payload: GroupPayload): Promise<Group> {
  return apiRequest<Group>(`/groups/${id}/`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function deleteGroup(id: number): Promise<void> {
  return apiRequest<void>(`/groups/${id}/`, { method: "DELETE" });
}
