import { apiRequest } from "./api";
import type { User } from "./auth";

export interface Expense {
  id: number;
  group: number;
  group_name: string;
  title: string;
  description: string;
  amount: string;
  paid_by: number;
  paid_by_details: User;
  participants: number[];
  participant_details: User[];
  created_at: string;
}

export interface ExpensePayload {
  group: number;
  title: string;
  description: string;
  amount: string;
  paid_by: number;
  participants: number[];
}

export function listExpenses(groupId?: number): Promise<Expense[]> {
  return apiRequest<Expense[]>("/expenses/").then((expenses) =>
    groupId ? expenses.filter((expense) => expense.group === groupId) : expenses,
  );
}

export function getExpense(id: number): Promise<Expense> {
  return apiRequest<Expense>(`/expenses/${id}/`);
}

export function createExpense(payload: ExpensePayload): Promise<Expense> {
  return apiRequest<Expense>("/expenses/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateExpense(id: number, payload: ExpensePayload): Promise<Expense> {
  return apiRequest<Expense>(`/expenses/${id}/`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function deleteExpense(id: number): Promise<void> {
  return apiRequest<void>(`/expenses/${id}/`, { method: "DELETE" });
}
