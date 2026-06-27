import { apiRequest } from "./api";

export interface BalanceItem {
  user: string;
  user_id: number;
  paid: number;
  owed: number;
  balance: number;
}

export interface Settlement {
  from_user: string;
  to_user: string;
  amount: number;
}

export interface BalanceResponse {
  group: string;
  total_expenses: number;
  balances: BalanceItem[];
  settlements: Settlement[];
}

export function getBalances(groupId: number): Promise<BalanceResponse> {
  return apiRequest<BalanceResponse>(`/groups/${groupId}/balances/`);
}
