import React from "react";
import { Group, Stack } from "@mantine/core";
import { Checkbox, MonthToolcards } from "@teelur/budget-board-ui";
import { useTranslation } from "react-i18next";
import FlowsChart from "~/components/Charts/FlowsChart/FlowsChart";
import QuickMonthSelect from "~/components/QuickMonthSelect/QuickMonthSelect";
import { useSelectMultipleMonths } from "~/hooks/useSelectMultipleMonths";
import {
  buildTimeToMonthlyTotalsMap,
  getMonthsWithTransactions,
} from "~/helpers/transactions";
import { getMonthToolcardStatus } from "~/helpers/monthToolcards";
import { useTransactionsQuery } from "~/hooks/queries/useTransactionsQuery";
import { withoutTransfers } from "~/helpers/budgets";
import { useFlowsRollovers } from "~/hooks/useFlowsRollovers";
import { useLocale } from "~/providers/LocaleProvider/LocaleProvider";
import { useTransactionCategories } from "~/providers/TransactionCategoryProvider/TransactionCategoryProvider";

const FlowsTab = (): React.ReactNode => {
  const { t } = useTranslation();
  const [showRollovers, setShowRollovers] = React.useState(false);
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

  const { rollovers, isPending: rolloversPending } = useFlowsRollovers({
    enabled: showRollovers,
    months: chartMonths,
    categories: allTransactionCategories,
  });

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
      <Checkbox
        checked={showRollovers}
        onChange={(event) => setShowRollovers(event.currentTarget.checked)}
        label={t("show_rollovers")}
        description={t("show_rollovers_description")}
        size="xs"
      />
      <FlowsChart
        transactions={transactions}
        categories={allTransactionCategories}
        rollovers={rollovers}
        isPending={transactionsQuery.isPending || rolloversPending}
      />
    </Stack>
  );
};

export default FlowsTab;
