import { Stack } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import React from "react";
import BudgetsToolbar from "./BudgetsToolbar/BudgetsToolbar";
import { buildTimeToMonthlyTotalsMap } from "~/helpers/transactions";
import BudgetsContent from "./BudgetsContent/BudgetsContent";
import { useLocale } from "~/providers/LocaleProvider/LocaleProvider";
import { useBudgetsQuery } from "~/hooks/queries/useBudgetsQuery";
import { useTransactionsQuery } from "~/hooks/queries/useTransactionsQuery";
import { useTransactionCategories } from "~/providers/TransactionCategoryProvider/TransactionCategoryProvider";
import { isTransfer } from "~/helpers/budgets";

const Budgets = (): React.ReactNode => {
  const { dayjs } = useLocale();

  // On wide screens the summary sits beside the budgets, so the page's buttons
  // move into a slot above it, level with the Income heading.
  const isWide = useMediaQuery("(min-width: 62em)");
  const [actionsSlot, setActionsSlot] = React.useState<HTMLDivElement | null>(
    null,
  );

  const [selectedDates, setSelectedDates] = React.useState<Date[]>([
    dayjs().startOf("month").toDate(),
  ]);

  const budgetsQuery = useBudgetsQuery({
    months: selectedDates,
    enabled: selectedDates.length > 0,
  });

  const transactionsQuery = useTransactionsQuery({
    selectedDates: selectedDates.map((month) => ({
      month: dayjs(month).month() + 1,
      year: dayjs(month).year(),
    })),
  });

  const { allTransactionCategories } = useTransactionCategories();

  // Transfers only move money between accounts, so they aren't income or
  // expenses anywhere on the budgets page.
  const transactions = React.useMemo(
    () =>
      (transactionsQuery.data ?? []).filter(
        (transaction) => !isTransfer(transaction, allTransactionCategories),
      ),
    [transactionsQuery.data, allTransactionCategories],
  );

  const timeToMonthlyTotalsMap: Map<number, number> = React.useMemo(
    () => buildTimeToMonthlyTotalsMap(selectedDates, transactions),
    [selectedDates, transactions],
  );

  return (
    <Stack w="100%" maw={1400} gap="0.75rem">
      <BudgetsToolbar
        selectedDates={selectedDates}
        setSelectedDates={setSelectedDates}
        timeToMonthlyTotalsMap={timeToMonthlyTotalsMap}
        showCopy={
          !budgetsQuery.isPending &&
          budgetsQuery.data.length === 0 &&
          selectedDates.length === 1
        }
        isPending={budgetsQuery.isPending}
        actionsTarget={isWide ? actionsSlot : null}
      />
      <BudgetsContent
        budgets={budgetsQuery.data}
        transactions={transactions}
        selectedDates={selectedDates}
        selectedDate={
          selectedDates.length === 1 ? (selectedDates[0] ?? null) : null
        }
        isPending={budgetsQuery.isPending}
        isTransactionsPending={transactionsQuery.isPending}
        actionsSlotRef={isWide ? setActionsSlot : undefined}
      />
    </Stack>
  );
};

export default Budgets;
