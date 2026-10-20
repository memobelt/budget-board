import { Button, MonthToolcards } from "@teelur/budget-board-ui";
import { buildTimeToMonthlyTotalsMap } from "~/helpers/transactions";
import { getMonthToolcardStatus } from "~/helpers/monthToolcards";
import { Flex, Group, Stack } from "@mantine/core";
import React from "react";
import SpendingCategoriesChart from "~/components/Charts/SpendingCategoriesChart/SpendingCategoriesChart";
import { useLocale } from "~/providers/LocaleProvider/LocaleProvider";
import { useTranslation } from "react-i18next";
import { useTransactionCategories } from "~/providers/TransactionCategoryProvider/TransactionCategoryProvider";
import { CategoryTypes } from "~/models/category";
import { useTransactionsQuery } from "~/hooks/queries/useTransactionsQuery";
import { withoutTransfers } from "~/helpers/budgets";
import QuickMonthSelect from "~/components/QuickMonthSelect/QuickMonthSelect";
import { useSelectMultipleMonths } from "~/hooks/useSelectMultipleMonths";

const SpendingCategoriesTab = (): React.ReactNode => {
  const { t } = useTranslation();
  const { dayjs, dayjsLocale } = useLocale();
  const { allTransactionCategories } = useTransactionCategories();

  const [selectedMonths, setSelectedMonths] = React.useState<Date[]>([
    dayjs().startOf("month").toDate(),
  ]);

  const transactionsQuery = useTransactionsQuery({
    // No months selected means all of them ("All" in the quick select).
    selectedDates:
      selectedMonths.length === 0
        ? undefined
        : selectedMonths.map((month) => ({
            month: dayjs(month).month() + 1,
            year: dayjs(month).year(),
          })),
  });

  // Transfers only move money between accounts, so they're left out of trends.
  const transactions = React.useMemo(
    () =>
      withoutTransfers(transactionsQuery.data ?? [], allTransactionCategories),
    [transactionsQuery.data, allTransactionCategories],
  );

  const { isSelectMultiple, toggleSelectMultiple, enableSelectMultiple } =
    useSelectMultipleMonths(selectedMonths, setSelectedMonths, true);

  const timeToMonthlyTotalsMap = React.useMemo(
    () => buildTimeToMonthlyTotalsMap(selectedMonths, transactions),
    [selectedMonths, transactions],
  );

  const [showSubcategories, setShowSubcategories] = React.useState(true);

  const selectedMonthKeys = new Set(
    selectedMonths.map((m) => `${m.getMonth()}-${m.getUTCFullYear()}`),
  );
  const transactionsForSelectedMonths =
    selectedMonths.length > 0
      ? transactions.filter((t) => {
          const d = new Date(t.date);
          return selectedMonthKeys.has(`${d.getMonth()}-${d.getUTCFullYear()}`);
        })
      : transactions;

  const expenseCategoryValues = new Set(
    allTransactionCategories
      .filter(
        (c) => c.parent === "" && c.categoryType === CategoryTypes.Expense,
      )
      .map((c) => c.value.toLowerCase()),
  );

  const expenseTransactions = transactionsForSelectedMonths.filter(
    (tx) =>
      tx.category == null ||
      tx.category === "" ||
      expenseCategoryValues.has(tx.category.toLowerCase()),
  );

  return (
    <Stack p="0.5rem" gap="1rem">
      <MonthToolcards
        selectedDates={selectedMonths}
        setSelectedDates={setSelectedMonths}
        getMonthStatus={(date) =>
          getMonthToolcardStatus(timeToMonthlyTotalsMap, date)
        }
        isPending={transactionsQuery.isPending}
        allowSelectMultiple={isSelectMultiple}
        locale={dayjsLocale}
      />
      <Group w="100%" justify="space-between">
        <Button
          variant="filled"
          color="primary"
          size="compact-sm"
          selected={showSubcategories}
          onClick={() => setShowSubcategories((v) => !v)}
        >
          {showSubcategories
            ? t("show_subcategories")
            : t("hide_subcategories")}
        </Button>
        <QuickMonthSelect
          selectedMonths={selectedMonths}
          setSelectedMonths={setSelectedMonths}
          isSelectMultiple={isSelectMultiple}
          toggleSelectMultiple={toggleSelectMultiple}
          onSelectRange={enableSelectMultiple}
        />
      </Group>
      <Flex justify="center">
        <SpendingCategoriesChart
          transactions={expenseTransactions}
          showSubcategories={showSubcategories}
          isPending={transactionsQuery.isPending}
        />
      </Flex>
    </Stack>
  );
};

export default SpendingCategoriesTab;
