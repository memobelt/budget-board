import { Group, Skeleton, Stack } from "@mantine/core";
import { IBudget } from "~/models/budget";
import { buildCategoriesTree, getParentCategory } from "~/helpers/category";
import { CategoryTypes, ICategoryNode } from "~/models/category";
import { ITransaction } from "~/models/transaction";
import { buildCategoryToTransactionsTotalMap } from "~/helpers/transactions";
import BudgetSummaryCard from "./BudgetSummaryCard/BudgetSummaryCard";
import BudgetsGroup from "./BudgetsGroup/BudgetsGroup";
import UnbudgetedGroup from "./UnbudgetedGroup/UnbudgetedGroup";
import EverythingElseCard from "./EverythingElseCard/EverythingElseCard";
import { isEverythingElseBudget, isTransfer } from "~/helpers/budgets";
import { IRecurringForecastOccurrence } from "~/models/recurringRule";
import { areStringsEqual, roundAwayFromZero } from "~/helpers/utils";
import FixParentBudgetButton from "./FixParentBudgetButton/FixParentBudgetButton";
import BudgetDetails from "./BudgetDetails/BudgetDetails";
import React from "react";
import { useDisclosure } from "@mantine/hooks";
import { useTranslation } from "react-i18next";
import { useTransactionCategories } from "~/providers/TransactionCategoryProvider/TransactionCategoryProvider";
import { buildCategoryToRecurringForecastTotalMap } from "~/helpers/recurringRules";
import { useRecurringForecastQuery } from "~/hooks/queries/useRecurringForecastQuery";
import { useRecurringForecastQueries } from "~/hooks/queries/useRecurringForecastQueries";
import { useLocale } from "~/providers/LocaleProvider/LocaleProvider";
import classes from "./BudgetsContent.module.css";
import { HeadingText } from "@teelur/budget-board-ui";

interface BudgetsContentProps {
  budgets: IBudget[];
  transactions: ITransaction[];
  selectedDates: Date[];
  selectedDate: Date | null;
  isPending?: boolean;
  isTransactionsPending?: boolean;
}

const BudgetsContent = (props: BudgetsContentProps) => {
  const [opened, { open, close }] = useDisclosure(false);
  const [selectedCategory, setSelectedCategory] = React.useState<string | null>(
    null,
  );
  const [selectedMonths, setSelectedMonths] = React.useState<Date[]>([]);

  const { t } = useTranslation();
  const { dayjs } = useLocale();
  const { allTransactionCategories, getCategoryType } =
    useTransactionCategories();
  const recurringForecastQuery = useRecurringForecastQuery({
    month: props.selectedDate,
    enabled: props.selectedDate !== null,
  });
  const recurringForecastQueries = useRecurringForecastQueries({
    months: props.selectedDates,
    enabled: props.selectedDates.length > 0,
  });

  // Transfers are left out of the budgets page; the transactions passed in are
  // already filtered, so only the recurring forecasts need it here.
  const isNotTransfer = (occurrence: IRecurringForecastOccurrence) =>
    !isTransfer(occurrence, allTransactionCategories);

  const categoryToTransactionsTotalMap: Map<string, number> =
    buildCategoryToTransactionsTotalMap(props.transactions);
  const categoryToRecurringForecastTotalMap =
    buildCategoryToRecurringForecastTotalMap(
      (recurringForecastQuery.data ?? []).filter(isNotTransfer),
    );

  const categoryTree = buildCategoriesTree(allTransactionCategories);

  const summaryTransactions = props.transactions.filter((transaction) =>
    dayjs(transaction.date).isSameOrBefore(dayjs(), "day"),
  );
  const summaryCategoryToTransactionsTotalMap =
    buildCategoryToTransactionsTotalMap(summaryTransactions);
  const summaryForecastOccurrences = recurringForecastQueries.data.filter(
    (occurrence) =>
      isNotTransfer(occurrence) &&
      dayjs(occurrence.date).isSameOrAfter(dayjs(), "day"),
  );
  const summaryCategoryToRecurringForecastTotalMap =
    buildCategoryToRecurringForecastTotalMap(summaryForecastOccurrences);

  const incomeBudgets = props.budgets.filter((budget) =>
    areStringsEqual(getCategoryType(budget.category), CategoryTypes.Income),
  );
  const incomeCategoryTree = categoryTree.filter(
    (category) =>
      areStringsEqual(category.categoryType, CategoryTypes.Income) &&
      props.budgets.some((budget) =>
        areStringsEqual(budget.category, category.value),
      ),
  );

  const expenseBudgets = props.budgets.filter((budget) =>
    areStringsEqual(getCategoryType(budget.category), CategoryTypes.Expense),
  );
  const expenseCategoryTree = categoryTree.filter(
    (category) =>
      areStringsEqual(category.categoryType, CategoryTypes.Expense) &&
      props.budgets.some((budget) =>
        areStringsEqual(budget.category, category.value),
      ),
  );

  // Everything Else isn't a transaction category, so it must not count as
  // budgeting one.
  const everythingElseBudgets = props.budgets.filter(isEverythingElseBudget);
  const categoryBudgets = props.budgets.filter(
    (budget) => !isEverythingElseBudget(budget),
  );

  const unbudgetedCategoryTree = categoryTree.filter(
    (category) =>
      !categoryBudgets.some((budget) =>
        areStringsEqual(
          getParentCategory(budget.category, allTransactionCategories),
          getParentCategory(category.value, allTransactionCategories),
        ),
      ) &&
      categoryToTransactionsTotalMap.has(category.value.toLocaleLowerCase()),
  );

  const unbudgetedIncomeCategoryTree = unbudgetedCategoryTree.filter((c) =>
    areStringsEqual(c.categoryType, CategoryTypes.Income),
  );
  const unbudgetedExpenseCategoryTree = unbudgetedCategoryTree.filter((c) =>
    areStringsEqual(c.categoryType, CategoryTypes.Expense),
  );
  const hasUnbudgetedIncome = unbudgetedIncomeCategoryTree.some(
    (category) =>
      roundAwayFromZero(
        categoryToTransactionsTotalMap.get(
          category.value.toLocaleLowerCase(),
        ) ?? 0,
      ) !== 0,
  );

  const isBudgetedCategory = (category: string): boolean =>
    categoryBudgets.some((budget) =>
      areStringsEqual(
        getParentCategory(budget.category, allTransactionCategories),
        getParentCategory(category, allTransactionCategories),
      ),
    );

  const getProjectedUnbudgetedTotal = (isIncome: boolean): number =>
    summaryForecastOccurrences.reduce((total, occurrence) => {
      const category = occurrence.category ?? occurrence.subcategory ?? "";
      const occurrenceIsIncome = areStringsEqual(
        getCategoryType(category),
        CategoryTypes.Income,
      );
      return isBudgetedCategory(category) || occurrenceIsIncome !== isIncome
        ? total
        : total + occurrence.amount;
    }, 0);
  const projectedUnbudgetedIncomeTotal = getProjectedUnbudgetedTotal(true);
  const projectedUnbudgetedExpenseTotal = getProjectedUnbudgetedTotal(false);

  // Everything Else spends whatever the Unbudgeted expenses list holds,
  // uncategorized included.
  const sumOverUnbudgetedExpenses = (totals: Map<string, number>): number =>
    unbudgetedExpenseCategoryTree.reduce(
      (total: number, category: ICategoryNode) =>
        total + (totals.get(category.value.toLocaleLowerCase()) ?? 0),
      totals.get("") ?? 0,
    );
  const everythingElseAmount = sumOverUnbudgetedExpenses(
    categoryToTransactionsTotalMap,
  );
  const everythingElseProjectedAmount =
    everythingElseAmount +
    sumOverUnbudgetedExpenses(categoryToRecurringForecastTotalMap);

  const openBudgetDetails = (category: string, month: Date | null) => {
    open();
    setSelectedCategory(category);
    setSelectedMonths(month ? [month] : [...props.selectedDates]);
  };

  return (
    <Group gap="0.5rem" align="flex-start">
      <BudgetDetails
        isOpen={opened}
        close={close}
        category={selectedCategory ?? null}
        months={selectedMonths}
      />
      <Stack w={{ base: "100%", md: "70%" }}>
        <Stack gap="0.5rem">
          <HeadingText tone="heading" level={4}>
            {t("income")}
          </HeadingText>
          {props.isPending ? (
            <Skeleton h={65} radius="md" />
          ) : (
            <BudgetsGroup
              budgets={incomeBudgets}
              categoryNodes={incomeCategoryTree}
              categoryToTransactionsTotalMap={categoryToTransactionsTotalMap}
              categoryToRecurringForecastTotalMap={
                categoryToRecurringForecastTotalMap
              }
              selectedDate={props.selectedDate}
              openDetails={openBudgetDetails}
            />
          )}
          {props.isPending ? (
            <Skeleton h={65} radius="md" />
          ) : (
            // Only shown when there is income without a budget to list.
            hasUnbudgetedIncome && (
              <UnbudgetedGroup
                categoryTree={unbudgetedIncomeCategoryTree}
                categoryToTransactionsTotalMap={categoryToTransactionsTotalMap}
                selectedDate={props.selectedDate}
                openDetails={openBudgetDetails}
              />
            )
          )}
        </Stack>
        <Stack gap="0.5rem">
          <HeadingText tone="heading" level={4}>
            {t("expenses")}
          </HeadingText>
          {props.isPending ? (
            <Skeleton h={65} radius="md" />
          ) : (
            // Everything Else is always shown, so skip the empty placeholder.
            expenseBudgets.length > 0 && (
              <BudgetsGroup
                budgets={expenseBudgets}
                categoryNodes={expenseCategoryTree}
                categoryToTransactionsTotalMap={categoryToTransactionsTotalMap}
                categoryToRecurringForecastTotalMap={
                  categoryToRecurringForecastTotalMap
                }
                selectedDate={props.selectedDate}
                openDetails={openBudgetDetails}
              />
            )
          )}
          {props.isPending ? (
            <Skeleton h={65} radius="md" />
          ) : (
            <EverythingElseCard
              budgets={everythingElseBudgets}
              amount={everythingElseAmount}
              projectedAmount={everythingElseProjectedAmount}
              categoryNodes={unbudgetedExpenseCategoryTree}
              categoryToTransactionsTotalMap={categoryToTransactionsTotalMap}
              selectedDate={props.selectedDate}
              openDetails={openBudgetDetails}
            />
          )}
        </Stack>
      </Stack>
      <Stack
        className={classes.summary}
        style={{ flexGrow: 1 }}
        w={{ base: "100%", md: "20%" }}
        h={{ base: "auto", md: "100%" }}
      >
        <BudgetSummaryCard
          incomeCategories={incomeCategoryTree}
          expenseCategories={expenseCategoryTree}
          budgets={props.budgets}
          categoryToTransactionsTotalMap={summaryCategoryToTransactionsTotalMap}
          categoryToRecurringForecastTotalMap={
            summaryCategoryToRecurringForecastTotalMap
          }
          unbudgetedIncomeCategoryTree={unbudgetedIncomeCategoryTree}
          unbudgetedExpenseCategoryTree={unbudgetedExpenseCategoryTree}
          everythingElseBudgets={everythingElseBudgets}
          projectedUnbudgetedIncomeTotal={projectedUnbudgetedIncomeTotal}
          projectedUnbudgetedExpenseTotal={projectedUnbudgetedExpenseTotal}
          isPending={
            (props.isPending ?? false) ||
            (props.isTransactionsPending ?? false) ||
            recurringForecastQueries.isPending
          }
          isForecastError={recurringForecastQueries.isError}
        />
        <FixParentBudgetButton
          budgets={props.budgets}
          categoryTree={categoryTree}
          categoryToTransactionsTotalMap={categoryToTransactionsTotalMap}
        />
      </Stack>
    </Group>
  );
};

export default BudgetsContent;
