import { Flex, Group, Skeleton, Stack } from "@mantine/core";
import { BodyText, Card, HeadingText } from "@teelur/budget-board-ui";
import React from "react";
import BudgetSummaryItem from "./BudgetSummaryItem/BudgetSummaryItem";
import { IBudget } from "~/models/budget";
import { ICategory, ICategoryNode } from "~/models/category";
import { areStringsEqual, roundAwayFromZero } from "~/helpers/utils";
import {
  getRangeRolloverBudgetIds,
  getUnbudgetedSubcategoriesTotal,
  StatusColorType,
} from "~/helpers/budgets";
import { useTranslation } from "react-i18next";
import { PiggyBankIcon } from "lucide-react";

interface BudgetSummaryCardProps {
  incomeCategories: ICategoryNode[];
  expenseCategories: ICategory[];
  budgets: IBudget[];
  categoryToTransactionsTotalMap: Map<string, number>;
  categoryToRecurringForecastTotalMap: Map<string, number>;
  unbudgetedIncomeCategoryTree: ICategory[];
  unbudgetedExpenseCategoryTree: ICategory[];
  /** The Everything Else budget for each selected month; empty when no limit is set. */
  everythingElseBudgets: IBudget[];
  projectedUnbudgetedIncomeTotal: number;
  projectedUnbudgetedExpenseTotal: number;
  isPending: boolean;
  isForecastError: boolean;
}

const BudgetSummaryCard = (props: BudgetSummaryCardProps): React.ReactNode => {
  const { t } = useTranslation();

  const rangeRolloverBudgetIds = getRangeRolloverBudgetIds(props.budgets);
  const getAvailableLimit = (budget: IBudget): number =>
    budget.limit +
    (rangeRolloverBudgetIds.has(budget.id) ? budget.rollover : 0);

  const incomeBudgetsTotal = props.budgets
    .filter((b) =>
      props.incomeCategories.some((c) => areStringsEqual(b.category, c.value)),
    )
    .reduce((acc, b) => acc + getAvailableLimit(b), 0);
  // Income counts only from budgeted sources. Unbudgeted subcategories of a
  // budgeted income category (e.g. Interest Income next to a budgeted Paycheck)
  // move to the Unbudgeted line instead, so net cash flow is unchanged.
  const isBudgeted = (category: string): boolean =>
    props.budgets.some((b) => areStringsEqual(b.category, category));
  const getExcludedIncomeTotal = (totals: Map<string, number>): number =>
    props.incomeCategories.reduce(
      (acc, category) =>
        acc + getUnbudgetedSubcategoriesTotal(category, isBudgeted, totals),
      0,
    );
  const excludedIncomeTotal = getExcludedIncomeTotal(
    props.categoryToTransactionsTotalMap,
  );
  const excludedIncomeForecastTotal = getExcludedIncomeTotal(
    props.categoryToRecurringForecastTotalMap,
  );

  const incomeTransactionsTotal =
    props.incomeCategories.reduce((acc, category) => {
      const transactionsTotal = props.categoryToTransactionsTotalMap.get(
        category.value.toLocaleLowerCase(),
      );
      return acc + (transactionsTotal ?? 0);
    }, 0) - excludedIncomeTotal;

  const getTransactionsTotal = (categories: ICategory[]): number =>
    categories.reduce(
      (acc, category) =>
        acc +
        (props.categoryToTransactionsTotalMap.get(
          category.value.toLocaleLowerCase(),
        ) ?? 0),
      0,
    );

  const unbudgetedIncomeTransactionsTotal = getTransactionsTotal(
    props.unbudgetedIncomeCategoryTree,
  );
  const unbudgetedExpenseTransactionsTotal =
    getTransactionsTotal(props.unbudgetedExpenseCategoryTree) +
    (props.categoryToTransactionsTotalMap.get("") ?? 0);

  // Expenses without a budget all fall into Everything Else, so they count as
  // Expenses. Only income can be unbudgeted.
  const everythingElseRolloverIds = getRangeRolloverBudgetIds(
    props.everythingElseBudgets,
  );
  const everythingElseLimitTotal = props.everythingElseBudgets.reduce(
    (acc, b) =>
      acc + b.limit + (everythingElseRolloverIds.has(b.id) ? b.rollover : 0),
    0,
  );

  const expenseBudgetsTotal =
    props.budgets
      .filter((b) =>
        props.expenseCategories.some((c) =>
          areStringsEqual(b.category, c.value),
        ),
      )
      .reduce((acc, b) => acc + getAvailableLimit(b), 0) +
    everythingElseLimitTotal;
  const expenseTransactionsTotal =
    getTransactionsTotal(props.expenseCategories) +
    unbudgetedExpenseTransactionsTotal;

  const unbudgetedTransactionsTotal =
    unbudgetedIncomeTransactionsTotal + excludedIncomeTotal;

  const getForecastTotal = (category: ICategory): number =>
    props.categoryToRecurringForecastTotalMap.get(
      category.value.toLocaleLowerCase(),
    ) ?? 0;
  const incomeForecastTotal =
    props.incomeCategories.reduce(
      (acc, category) => acc + getForecastTotal(category),
      0,
    ) - excludedIncomeForecastTotal;
  const unbudgetedForecastTotal =
    props.projectedUnbudgetedIncomeTotal + excludedIncomeForecastTotal;
  const expenseForecastTotal =
    props.expenseCategories.reduce(
      (acc, category) => acc + getForecastTotal(category),
      0,
    ) + props.projectedUnbudgetedExpenseTotal;
  const projectedIncomeTransactionsTotal = props.isForecastError
    ? undefined
    : incomeTransactionsTotal + incomeForecastTotal;
  const projectedExpenseTransactionsTotal = props.isForecastError
    ? undefined
    : expenseTransactionsTotal + expenseForecastTotal;
  const projectedUnbudgetedTotal = props.isForecastError
    ? undefined
    : unbudgetedTransactionsTotal + unbudgetedForecastTotal;
  const showUnbudgeted =
    roundAwayFromZero(unbudgetedTransactionsTotal) !== 0 ||
    roundAwayFromZero(unbudgetedForecastTotal) !== 0;
  const projectedNetExpensesTotal =
    projectedIncomeTransactionsTotal === undefined ||
    projectedExpenseTransactionsTotal === undefined
      ? undefined
      : projectedIncomeTransactionsTotal + projectedExpenseTransactionsTotal;
  const projectedNetCashFlowTotal =
    projectedNetExpensesTotal === undefined ||
    projectedUnbudgetedTotal === undefined
      ? undefined
      : projectedNetExpensesTotal + projectedUnbudgetedTotal;

  return (
    <Card>
      <Card.Section p="0.25rem" separatorThickness="thick">
        <Group gap="0.25rem">
          <PiggyBankIcon color="var(--bbui-color-text-secondary)" />
          <HeadingText tone="heading" level={4}>
            {t("budget_summary")}
          </HeadingText>
        </Group>
      </Card.Section>
      <Card.Section p="0.25rem">
        {props.isForecastError && (
          <Group gap="0.25rem" px="0.75rem" mt="0.25rem">
            <BodyText tone="secondary" size="xs">
              {t("error_loading_configuration_message")}
            </BodyText>
          </Group>
        )}
        {props.isPending ? (
          <Flex h="100%" w="100%">
            <Skeleton h={100} radius="md" />
          </Flex>
        ) : (
          <Stack gap="0.25rem">
            <BudgetSummaryItem
              label={t("income")}
              amount={incomeTransactionsTotal}
              total={incomeBudgetsTotal}
              projectedAmount={projectedIncomeTransactionsTotal}
              budgetValueType={StatusColorType.Income}
              showDivider={incomeBudgetsTotal <= 0}
            />
            <BudgetSummaryItem
              label={t("expenses")}
              amount={expenseTransactionsTotal}
              total={expenseBudgetsTotal}
              projectedAmount={projectedExpenseTransactionsTotal}
              budgetValueType={StatusColorType.Expense}
              showDivider={expenseBudgetsTotal <= 0}
            />
            <BudgetSummaryItem
              label={t("net_expenses")}
              amount={incomeTransactionsTotal + expenseTransactionsTotal}
              projectedAmount={projectedNetExpensesTotal}
              budgetValueType={StatusColorType.Total}
              hideProgress
              showDivider
            />
          </Stack>
        )}
      </Card.Section>
      {showUnbudgeted && (
        <Card.Section p="0.25rem">
          {props.isPending ? (
            <Flex h="100%" w="100%">
              <Skeleton h={43} radius="md" />
            </Flex>
          ) : (
            <Stack gap="0.25rem">
              <BudgetSummaryItem
                label={t("unbudgeted")}
                amount={unbudgetedTransactionsTotal}
                projectedAmount={projectedUnbudgetedTotal}
                budgetValueType={StatusColorType.Total}
                hideProgress
                showDivider
              />
            </Stack>
          )}
        </Card.Section>
      )}
      <Card.Section p="0.25rem">
        {props.isPending ? (
          <Flex h="100%" w="100%">
            <Skeleton h={43} radius="md" />
          </Flex>
        ) : (
          <Stack gap="0.25rem">
            <BudgetSummaryItem
              label={t("net_cash_flow")}
              amount={
                incomeTransactionsTotal +
                expenseTransactionsTotal +
                unbudgetedTransactionsTotal
              }
              projectedAmount={projectedNetCashFlowTotal}
              budgetValueType={StatusColorType.Total}
              hideProgress
              showDivider
            />
          </Stack>
        )}
      </Card.Section>
    </Card>
  );
};

export default BudgetSummaryCard;
