export interface IBillCreateRequest {
  name: string;
  amount: number;
  dueDay: number;
  useAccountBalance: boolean;
  accountID: string | null;
}

export interface IBillUpdateRequest extends IBillCreateRequest {
  id: string;
  lastPaidDueDate: string | null;
}

export interface IBillResponse {
  id: string;
  name: string;
  amount: number;
  dueDay: number;
  useAccountBalance: boolean;
  accountID: string | null;
  lastPaidDueDate: string | null;
  userID: string;
}
