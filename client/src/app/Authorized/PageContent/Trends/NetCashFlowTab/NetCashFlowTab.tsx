import React from "react";
import { MonthToolcards } from "@teelur/budget-board-ui";
import { getMonthToolcardStatus } from "~/helpers/monthToolcards";
import { buildTimeToMonthlyTotalsMap } from "~/helpers/transactions";
import NetCashFlowChart from "~/components/Charts/NetCashFlowChart/NetCashFlowChart";
import { Stack } from "@mantine/core";
import { useLocale } from "~/providers/LocaleProvider/LocaleProvider";
import SelectLastNMonths from "~/components/SelectLastNMonths/SelectLastNMonths";
import { useTransactionsQuery } from "~/hooks/queries/useTransactionsQuery";
import { withoutTransfers } from "~/helpers/budgets";
import { useTransactionCategories } from "~/providers/TransactionCategoryProvider/TransactionCategoryProvider";

const NetCashFlowTab = (): React.ReactNode => {
  const monthButtons = [3, 6, 12];

  const { dayjs, dayjsLocale } = useLocale();

  const [selectedMonths, setSelectedMonths] = React.useState<Date[]>([
    dayjs().subtract(1, "month").startOf("month").toDate(),
    dayjs().startOf("month").toDate(),
  ]);

  const transactionsQuery = useTransactionsQuery({
    selectedDates: selectedMonths.map((month) => ({
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
      <NetCashFlowChart
        transactions={transactions}
        months={selectedMonths}
        isPending={transactionsQuery.isPending}
      />
    </Stack>
  );
};

export default NetCashFlowTab;
