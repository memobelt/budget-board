import { sumAccountsTotalBalance } from "~/helpers/accounts";
import { IGoalResponse } from "~/models/goal";
import { ITransaction } from "~/models/transaction";

/**
 * Determines the target amount for a financial goal based on the specified amount and initial amount.
 *
 * If the initial amount is less than zero, it indicates a debt goal,
 * and the target amount becomes the absolute value of that negative initial amount (representing debt payoff).
 * Otherwise, it simply uses the passed-in amount.
 *
 * @param {number} amount - The user-defined goal amount.
 * @param {number} initialAmount - The initial balance or debt amount.
 * @returns {number} The target amount for the goal.
 */
export const getGoalTargetAmount = (
  amount: number,
  initialAmount: number,
): number => {
  if (initialAmount < 0) {
    return Math.abs(initialAmount);
  }
  return amount;
};

/**
 * Returns how much progress has been made towards a goal.
 *
 * Manual goals are not linked to accounts, so their progress is the sum of the contributions
 * the user has logged (computed by the server). Account-linked goals use the current balance of
 * their accounts minus the balance when the goal was created.
 *
 * @param {IGoalResponse} goal - The goal to evaluate.
 * @returns {number} The amount saved (or paid off) towards the goal so far.
 */
export const getGoalCurrentAmount = (goal: IGoalResponse): number => {
  if (goal.isManual) {
    return goal.currentAmount;
  }
  return sumAccountsTotalBalance(goal.accounts) - goal.initialAmount;
};

/**
 * Summarizes transactions for a specific goal in a given month.
 *
 * The function filters the provided transactions to include only those belonging
 * to accounts associated with the specified goal, then sums up their amounts.
 *
 * @param {IGoalResponse} goal - The goal object containing the list of associated accounts.
 * @param {ITransaction[]} transactionsForMonth - Transactions to evaluate for the given month.
 * @returns {number} The total sum of transaction amounts matching the goal's accounts.
 */
export const sumTransactionsForGoalForMonth = (
  goal: IGoalResponse,
  transactionsForMonth: ITransaction[],
): number =>
  transactionsForMonth
    .filter((t) => goal.accounts.some((a) => a.id === t.accountID))
    .reduce((n, { amount }) => n + amount, 0);
