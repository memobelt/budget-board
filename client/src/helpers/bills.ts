import type { Dayjs } from "dayjs";
import dayjs from "~/shared/dayjs";
import { IAccountResponse } from "~/models/account";
import { IBillResponse, IBillUpdateRequest } from "~/models/bill";

export const billDateFormat = "YYYY-MM-DD";

/**
 * Returns the bill's due date within the month containing the given date.
 * Due days past the end of a short month are clamped to its last day.
 */
export const getDueDateInMonth = (month: Dayjs, dueDay: number): Dayjs => {
  const startOfMonth = month.startOf("month");
  return startOfMonth.date(Math.min(dueDay, startOfMonth.daysInMonth()));
};

/**
 * Returns the next due date that has not been marked as paid.
 *
 * Bills that have never been marked paid start with this month's due date,
 * or next month's if this month's has already passed. Once a bill has been
 * paid, the next due date is the first one after the last paid due date, so
 * a missed payment shows up as overdue.
 */
export const getNextDueDate = (bill: IBillResponse, today: Dayjs): Dayjs => {
  const todayStart = today.startOf("day");

  if (!bill.lastPaidDueDate) {
    const thisMonth = getDueDateInMonth(todayStart, bill.dueDay);
    return thisMonth.isBefore(todayStart, "day")
      ? getDueDateInMonth(todayStart.add(1, "month"), bill.dueDay)
      : thisMonth;
  }

  const lastPaid = dayjs(bill.lastPaidDueDate, billDateFormat);
  return getDueDateInMonth(lastPaid.add(1, "month"), bill.dueDay);
};

/**
 * Returns the amount due for a bill. When the bill uses its linked account's
 * balance, liability balances (stored as negative numbers) are converted to a
 * positive amount owed; a credit balance means nothing is owed.
 */
export const getBillAmountDue = (
  bill: IBillResponse,
  accounts: IAccountResponse[],
): number => {
  if (bill.useAccountBalance && bill.accountID) {
    const account = accounts.find((a) => a.id === bill.accountID);
    if (!account) {
      return 0;
    }
    return Math.max(0, -account.currentBalance);
  }

  return bill.amount;
};

export const buildBillUpdateRequest = (
  bill: IBillResponse,
  changes: Partial<IBillUpdateRequest> = {},
): IBillUpdateRequest => ({
  id: bill.id,
  name: bill.name,
  amount: bill.amount,
  dueDay: bill.dueDay,
  useAccountBalance: bill.useAccountBalance,
  accountID: bill.accountID,
  lastPaidDueDate: bill.lastPaidDueDate,
  ...changes,
});

export enum BillMonthStatus {
  Paid = "paid",
  Overdue = "overdue",
  Due = "due",
}

export interface IBillMonthEntry {
  dueDate: Dayjs;
  status: BillMonthStatus;
  /** True when this is the earliest unpaid due date, which is the only one that can be marked paid. */
  isNextDue: boolean;
  /** True when this due date is the most recent payment, which is the only one that can be undone. */
  isLastPaid: boolean;
}

/**
 * Describes a bill's due date within the given month, or null when the bill
 * was not being tracked yet (it has never been paid and this month's due date
 * comes before its first due date).
 */
export const getBillMonthEntry = (
  bill: IBillResponse,
  month: Dayjs,
  today: Dayjs,
): IBillMonthEntry | null => {
  const dueDate = getDueDateInMonth(month, bill.dueDay);
  const nextDue = getNextDueDate(bill, today);

  if (dueDate.isBefore(nextDue, "day")) {
    if (!bill.lastPaidDueDate) {
      return null;
    }
    const lastPaid = dayjs(bill.lastPaidDueDate, billDateFormat);
    return {
      dueDate,
      status: BillMonthStatus.Paid,
      isNextDue: false,
      isLastPaid: dueDate.isSame(lastPaid, "day"),
    };
  }

  return {
    dueDate,
    status: dueDate.isBefore(today.startOf("day"), "day")
      ? BillMonthStatus.Overdue
      : BillMonthStatus.Due,
    isNextDue: dueDate.isSame(nextDue, "day"),
    isLastPaid: false,
  };
};
