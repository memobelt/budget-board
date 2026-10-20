/**
 * Reserved category for the "Everything Else" budget. It is not a transaction category: it covers
 * spending in every expense category without a budget of its own for the month, plus
 * uncategorized transactions. Its limit is always budgeted income minus budgeted expenses,
 * worked out by the server. Must match BudgetConstants.EverythingElseCategory on the server.
 */
export const EVERYTHING_ELSE_CATEGORY = "__everything_else__";

export interface IBudgetCreateRequest {
  month: string;
  category: string;
  limit: number;
  rolloverStartMonth?: string | null;
}

export interface IBudgetUpdateRequest {
  id: string;
  limit: number;
  rolloverStartMonth: string | null;
}

export interface IBudget {
  id: string;
  month: string;
  category: string;
  limit: number;
  /** Month the rollover balance starts accumulating from. Null disables rollover. */
  rolloverStartMonth: string | null;
  /** Balance accumulated since the start month. Negative when earlier months were overspent. */
  rollover: number;
  /**
   * True for a month's automatic Everything Else that hasn't been saved yet. It can't be updated
   * by ID; changing its rollover setting creates it.
   */
  isPlaceholder?: boolean;
  userId: string;
}

export enum CashFlowValue {
  Positive,
  Neutral,
  Negative,
}
