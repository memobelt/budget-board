import { getIsParentCategory, getParentCategory } from "~/helpers/category";
import { areStringsEqual } from "~/helpers/utils";
import {
  ITransaction,
  ITransactionImportDuplicateFieldAvailability,
  ITransactionImportDuplicateOptions,
  ITransactionImportTableData,
  TransactionImportDuplicateField,
} from "~/models/transaction";
import dayjs from "~/shared/dayjs";

export const normalizeImportedAccountName = (
  accountName: string | null | undefined,
): string => (accountName ?? "").trim().toLowerCase();

export const getMappedAccountId = (
  accountMap: Map<string, string>,
  accountName: string | null | undefined,
): string => {
  const normalizedAccountName = normalizeImportedAccountName(accountName);
  if (!normalizedAccountName) {
    return "";
  }

  for (const [mappedAccountName, accountId] of accountMap) {
    if (
      normalizeImportedAccountName(mappedAccountName) === normalizedAccountName
    ) {
      return accountId;
    }
  }

  return "";
};

const normalizeForMatching = (name: string): string =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const getBigrams = (text: string): string[] => {
  const compact = text.replace(/ /g, "");
  const bigrams: string[] = [];
  for (let i = 0; i < compact.length - 1; i++) {
    bigrams.push(compact.slice(i, i + 2));
  }
  return bigrams;
};

/**
 * Scores how alike an imported account name and a saved account name are, from
 * 0 (nothing in common) to 1 (the same once case and punctuation are ignored).
 */
export const getAccountNameSimilarity = (
  importedName: string,
  savedName: string,
): number => {
  const a = normalizeForMatching(importedName);
  const b = normalizeForMatching(savedName);
  if (!a || !b) {
    return 0;
  }
  if (a === b) {
    return 1;
  }

  // Account numbers (e.g. the last four digits) are the strongest hint.
  const numbersInA = a.match(/\d{3,}/g) ?? [];
  const numbersInB = new Set(b.match(/\d{3,}/g) ?? []);
  if (numbersInA.some((n) => numbersInB.has(n))) {
    return 0.9;
  }

  // One name inside the other, e.g. "Chase Checking" and "Checking".
  if (Math.min(a.length, b.length) >= 3 && (a.includes(b) || b.includes(a))) {
    return 0.8;
  }

  // Otherwise, how many words and letter pairs they share.
  const wordsA = new Set(a.split(" "));
  const wordsB = new Set(b.split(" "));
  const sharedWords = [...wordsA].filter((w) => wordsB.has(w)).length;
  const wordScore = sharedWords / new Set([...wordsA, ...wordsB]).size;

  const bigramsA = getBigrams(a);
  const bigramsB = getBigrams(b);
  const remaining = [...bigramsB];
  let sharedBigrams = 0;
  bigramsA.forEach((bigram) => {
    const index = remaining.indexOf(bigram);
    if (index !== -1) {
      sharedBigrams++;
      remaining.splice(index, 1);
    }
  });
  const bigramScore =
    bigramsA.length + bigramsB.length === 0
      ? 0
      : (2 * sharedBigrams) / (bigramsA.length + bigramsB.length);

  return Math.max(wordScore, bigramScore);
};

/** Below this, a saved account is too different to suggest. */
const minimumAccountSimilarity = 0.4;

/**
 * Finds the saved account whose name is closest to an account name from an
 * imported file, or null when none is close enough to be a sensible guess.
 */
export const findClosestAccountId = (
  importedName: string,
  accounts: { value: string; label: string }[],
): string | null => {
  let bestId: string | null = null;
  let bestScore = minimumAccountSimilarity;

  for (const account of accounts) {
    const score = getAccountNameSimilarity(importedName, account.label);
    if (score > bestScore) {
      bestId = account.value;
      bestScore = score;
    }
  }

  return bestId;
};

interface DuplicateFilterResult {
  filteredTransactions: ITransactionImportTableData[];
  duplicateTransactions: Map<ITransactionImportTableData, ITransaction>;
  duplicateMatchFields: Map<number, TransactionImportDuplicateField[]>;
}

export const filterImportedTransactionDuplicates = (
  importedTransactions: ITransactionImportTableData[],
  existingTransactions: ITransaction[],
  transactionCategories: Parameters<typeof getParentCategory>[1],
  duplicateOptions: ITransactionImportDuplicateOptions,
  accountMap: Map<string, string>,
  availableDuplicateFields: ITransactionImportDuplicateFieldAvailability,
): DuplicateFilterResult => {
  const duplicateTransactions = new Map<
    ITransactionImportTableData,
    ITransaction
  >();
  const duplicateMatchFields = new Map<
    number,
    TransactionImportDuplicateField[]
  >();

  if (
    !duplicateOptions.filterDuplicates ||
    importedTransactions.length === 0 ||
    existingTransactions.length === 0
  ) {
    return {
      filteredTransactions: importedTransactions,
      duplicateTransactions,
      duplicateMatchFields,
    };
  }

  const filterOptions = {
    date:
      duplicateOptions.filterByOptions.date && availableDuplicateFields.date,
    merchantName:
      duplicateOptions.filterByOptions.merchantName &&
      availableDuplicateFields.merchantName,
    category:
      duplicateOptions.filterByOptions.category &&
      availableDuplicateFields.category,
    amount:
      duplicateOptions.filterByOptions.amount &&
      availableDuplicateFields.amount,
    account:
      duplicateOptions.filterByOptions.account &&
      availableDuplicateFields.account,
  };
  if (
    !filterOptions.date &&
    !filterOptions.merchantName &&
    !filterOptions.category &&
    !filterOptions.amount &&
    !filterOptions.account
  ) {
    return {
      filteredTransactions: importedTransactions,
      duplicateTransactions,
      duplicateMatchFields,
    };
  }

  const makeKey = (
    transaction: ITransaction | ITransactionImportTableData,
    isImported: boolean,
  ): string => {
    const parts: string[] = [];
    const importedTransaction = transaction as ITransactionImportTableData;
    const existingTransaction = transaction as ITransaction;
    if (filterOptions.date) {
      parts.push(dayjs(transaction.date).startOf("day").valueOf().toString());
    }
    if (filterOptions.merchantName) {
      parts.push((transaction.merchantName ?? "").trim().toLowerCase());
    }
    if (filterOptions.category) {
      if (isImported) {
        const importedCategory = importedTransaction.category ?? "";
        const isParent = getIsParentCategory(
          importedCategory,
          transactionCategories,
        );
        parts.push(
          getParentCategory(importedCategory, transactionCategories)
            .toString()
            .trim()
            .toLowerCase(),
        );
        parts.push(
          (isParent ? "" : importedCategory).toString().trim().toLowerCase(),
        );
      } else {
        parts.push((existingTransaction.category ?? "").trim().toLowerCase());
        parts.push(
          (existingTransaction.subcategory ?? "").trim().toLowerCase(),
        );
      }
    }
    if (filterOptions.amount) {
      parts.push((transaction.amount ?? "").toString());
    }
    if (filterOptions.account) {
      parts.push(
        isImported
          ? getMappedAccountId(accountMap, importedTransaction.account)
          : existingTransaction.accountID.trim(),
      );
    }
    return parts.join("|");
  };

  const existingIndex = new Map<string, ITransaction[]>();
  for (const transaction of existingTransactions) {
    const key = makeKey(transaction, false);
    const candidates = existingIndex.get(key) ?? [];
    candidates.push(transaction);
    existingIndex.set(key, candidates);
  }

  const filteredTransactions: ITransactionImportTableData[] = [];
  for (const importedTransaction of importedTransactions) {
    const candidates = existingIndex.get(makeKey(importedTransaction, true));
    const matched = candidates?.find((existingTransaction) => {
      if (
        filterOptions.account &&
        !getMappedAccountId(accountMap, importedTransaction.account)
      ) {
        return false;
      }

      return (
        (!filterOptions.date ||
          dayjs(existingTransaction.date).isSame(
            importedTransaction.date,
            "day",
          )) &&
        (!filterOptions.merchantName ||
          areStringsEqual(
            existingTransaction.merchantName ?? "",
            importedTransaction.merchantName ?? "",
          )) &&
        (!filterOptions.category ||
          (areStringsEqual(
            existingTransaction.category ?? "",
            getParentCategory(
              importedTransaction.category ?? "",
              transactionCategories,
            ),
          ) &&
            areStringsEqual(
              existingTransaction.subcategory ?? "",
              getIsParentCategory(
                importedTransaction.category ?? "",
                transactionCategories,
              )
                ? ""
                : (importedTransaction.category ?? ""),
            ))) &&
        (!filterOptions.amount ||
          existingTransaction.amount === importedTransaction.amount) &&
        (!filterOptions.account ||
          areStringsEqual(
            existingTransaction.accountID,
            getMappedAccountId(accountMap, importedTransaction.account),
          ))
      );
    });

    if (matched) {
      duplicateTransactions.set(importedTransaction, matched);
      duplicateMatchFields.set(importedTransaction.uid, [
        ...(filterOptions.date ? ["date" as const] : []),
        ...(filterOptions.merchantName ? ["merchantName" as const] : []),
        ...(filterOptions.category ? ["category" as const] : []),
        ...(filterOptions.amount ? ["amount" as const] : []),
        ...(filterOptions.account ? ["account" as const] : []),
      ]);
    } else {
      filteredTransactions.push(importedTransaction);
    }
  }

  return {
    filteredTransactions,
    duplicateTransactions,
    duplicateMatchFields,
  };
};
