import SpendingChart from "~/components/Charts/SpendingChart/SpendingChart";
import { MonthToolcards } from "@teelur/budget-board-ui";
import { getMonthToolcardStatus } from "~/helpers/monthToolcards";
import {
  buildTimeToMonthlyTotalsMap,
  getMonthsWithTransactions,
} from "~/helpers/transactions";
import { Group, Stack } from "@mantine/core";
import React from "react";
import { useLocale } from "~/providers/LocaleProvider/LocaleProvider";
import QuickMonthSelect from "~/components/QuickMonthSelect/QuickMonthSelect";
import { useSelectMultipleMonths } from "~/hooks/useSelectMultipleMonths";
import { useTransactionsQuery } from "~/hooks/queries/useTransactionsQuery";
import { withoutTransfers } from "~/helpers/budgets";
import { useTransactionCategories } from "~/providers/TransactionCategoryProvider/TransactionCategoryProvider";

const SpendingTab = (): React.ReactNode => {
  const { dayjs, dayjsLocale } = useLocale();

  const [selectedMonths, setSelectedMonths] = React.useState<Date[]>([
    dayjs().subtract(1, "month").startOf("month").toDate(),
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
  const { allTransactionCategories } = useTransactionCategories();

  // Transfers only move money between accounts, so they're left out of trends.
  const transactions = React.useMemo(
    () =>
      withoutTransfers(transactionsQuery.data ?? [], allTransactionCategories),
    [transactionsQuery.data, allTransactionCategories],
  );

  // With no months selected ("All"), chart every month that has transactions.
  const chartMonths = React.useMemo(
    () =>
      selectedMonths.length > 0
        ? selectedMonths
        : getMonthsWithTransactions(transactions),
    [selectedMonths, transactions],
  );
  const { isSelectMultiple, toggleSelectMultiple, enableSelectMultiple } =
    useSelectMultipleMonths(selectedMonths, setSelectedMonths, true);

  const timeToMonthlyTotalsMap = React.useMemo(
    () => buildTimeToMonthlyTotalsMap(selectedMonths, transactions),
    [selectedMonths, transactions],
  );

  return (
    <Stack p="0.5rem">
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
      <Group justify="end">
        <QuickMonthSelect
          selectedMonths={selectedMonths}
          setSelectedMonths={setSelectedMonths}
          isSelectMultiple={isSelectMultiple}
          toggleSelectMultiple={toggleSelectMultiple}
          onSelectRange={enableSelectMultiple}
        />
      </Group>
      <SpendingChart
        h={400}
        transactions={transactions}
        months={chartMonths}
        isPending={transactionsQuery.isPending}
        includeGrid
        includeYAxis
      />
    </Stack>
  );
};

export default SpendingTab;
