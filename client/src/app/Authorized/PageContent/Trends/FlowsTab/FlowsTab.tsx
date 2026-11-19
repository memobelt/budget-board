import React from "react";
import { Stack } from "@mantine/core";
import { MonthToolcards } from "@teelur/budget-board-ui";
import FlowsChart from "~/components/Charts/FlowsChart/FlowsChart";
import SelectLastNMonths from "~/components/SelectLastNMonths/SelectLastNMonths";
import { buildTimeToMonthlyTotalsMap } from "~/helpers/transactions";
import { getMonthToolcardStatus } from "~/helpers/monthToolcards";
import { useTransactionsQuery } from "~/hooks/queries/useTransactionsQuery";
import { withoutTransfers } from "~/helpers/budgets";
import { useLocale } from "~/providers/LocaleProvider/LocaleProvider";
import { useTransactionCategories } from "~/providers/TransactionCategoryProvider/TransactionCategoryProvider";

const FlowsTab = (): React.ReactNode => {
  const monthButtons = [3, 6, 12];
  const { dayjs, dayjsLocale } = useLocale();
  const { allTransactionCategories } = useTransactionCategories();
  const [selectedMonths, setSelectedMonths] = React.useState<Date[]>([
    dayjs().startOf("month").toDate(),
  ]);

  const transactionsQuery = useTransactionsQuery({
    selectedDates: selectedMonths.map((month) => ({
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
        allowSelectMultiple
        locale={dayjsLocale}
      />
      <SelectLastNMonths
        monthButtons={monthButtons}
        selectedMonths={selectedMonths}
        setSelectedMonths={setSelectedMonths}
        size="compact-sm"
        showClearButton
      />
      <FlowsChart
        transactions={transactions}
        categories={allTransactionCategories}
        isPending={transactionsQuery.isPending}
      />
    </Stack>
  );
};

export default FlowsTab;
