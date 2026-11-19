export interface ITransactionImport {
  date: string | null;
  merchantName: string | null;
  category: string | null;
  amount: number | null;
  account: string | null;
  notes: string | null;
  /** Tags for the transaction, from a column listing them separated by commas, semicolons or |. */
  tags: string[] | null;
}

export interface ITransactionImportTableData extends ITransactionImport {
  uid: number;
  type: string | null;
}

export interface ITransactionImportDuplicateOptions {
  filterDuplicates: boolean;
  filterByOptions: {
    date: boolean;
    merchantName: boolean;
    category: boolean;
    amount: boolean;
    account: boolean;
  };
}

export interface ITransactionImportDuplicateFieldAvailability {
  date: boolean;
  merchantName: boolean;
  category: boolean;
  amount: boolean;
  account: boolean;
}

export type TransactionImportDuplicateField =
  keyof ITransactionImportDuplicateFieldAvailability;

export interface IAccountNameToIDKeyValuePair {
  accountName: string;
  accountID: string;
}

export interface ITransactionImportRequest {
  transactions: ITransactionImport[];
  accountNameToIDMap: IAccountNameToIDKeyValuePair[];
}

export interface ITransactionImportJobResponse {
  id: string;
  status: string;
  totalCount: number;
  processedCount: number;
  succeededCount: number;
  failedCount: number;
  progressPercentage: number;
  errorMessage: string | null;
  cancellationRequested: boolean;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
}

export interface ITransactionCreateRequest {
  syncID: string | null;
  amount: number;
  date: string;
  category: string | null;
  subcategory: string | null;
  merchantName: string | null;
  source: string | null;
  accountID: string;
}

export interface ITransactionUpdateRequest {
  id: string;
  amount?: number;
  date?: string;
  category?: string | null;
  subcategory?: string | null;
  merchantName?: string | null;
  notes?: string;
  addTags?: string[] | null;
  removeTags?: string[] | null;
}

export interface ITransactionSplitRequest {
  id: string;
  amount: number;
  category: string;
  subcategory: string;
}

export interface ITransactionLinkRequest {
  transactionID: string;
  linkedTransactionID: string;
}

export interface ITransaction {
  id: string;
  syncID: string | null;
  amount: number;
  date: string;
  category: string | null;
  subcategory: string | null;
  merchantName: string | null;
  pending: boolean;
  deleted: Date | null;
  /** When the transaction was synced or entered (not when it happened). */
  created: string;
  notes: string;
  tags: string[];
  recurringRuleID: string | null;
  accountName: string;
  source: string;
  accountID: string;
  linkedTransactionID: string | null;
  linkedAccountName: string | null;
  linkedDate: string | null;
  linkedAmount: number | null;
  linkedMerchantName: string | null;
}

export interface IFilters {
  accounts: string[];
  category: string;
  dateRange: [Date | null, Date | null];
  merchantName: string;
  /** Text to look for in a transaction's notes. */
  notes: string;
  amountRange: [number | null, number | null];
  tags: string[];
  /** Only show transactions synced since the user's last visit. */
  newOnly: boolean;
}

export class Filters implements IFilters {
  accounts: string[] = [];
  category: string = "";
  dateRange: [Date | null, Date | null] = [null, null];
  merchantName: string = "";
  notes: string = "";
  amountRange: [number | null, number | null] = [null, null];
  tags: string[] = [];
  newOnly: boolean = false;

  constructor(filter?: Filters) {
    if (filter) {
      this.accounts = filter.accounts;
      this.category = filter.category;
      this.dateRange = filter.dateRange;
      this.merchantName = filter.merchantName;
      this.notes = filter.notes ?? "";
      this.amountRange = filter.amountRange;
      this.tags = filter.tags;
      this.newOnly = filter.newOnly ?? false;
    }
  }

  public isEqual(other: Filters): boolean {
    return (
      JSON.stringify([...this.accounts].sort()) ===
        JSON.stringify([...other.accounts].sort()) &&
      this.category === other.category &&
      this.dateRange[0]?.getTime() === other.dateRange[0]?.getTime() &&
      this.dateRange[1]?.getTime() === other.dateRange[1]?.getTime() &&
      this.merchantName === other.merchantName &&
      this.notes === other.notes &&
      this.amountRange[0] === other.amountRange[0] &&
      this.amountRange[1] === other.amountRange[1] &&
      this.newOnly === other.newOnly &&
      JSON.stringify(
        this.tags.map((tag) => tag.trim().toUpperCase()).sort(),
      ) ===
        JSON.stringify(other.tags.map((tag) => tag.trim().toUpperCase()).sort())
    );
  }
}

export enum TransactionCardType {
  Normal,
  Edit,
  Uncategorized,
}

/** Source of transactions entered by hand. Must match the server's TransactionSource.Manual. */
export const manualTransactionSource = "Manual";

export const hiddenTransactionCategory = "Hide from Budgets";
/** Built-in category for moving money between accounts. Must match the server's. */
export const transferTransactionCategory = "Transfer";
export const uncategorizedTransactionCategory = "uncategorized";
