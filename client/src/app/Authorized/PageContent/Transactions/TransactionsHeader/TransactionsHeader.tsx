import classes from "./TransactionsHeader.module.css";

import { Collapse, Flex, Group, Stack } from "@mantine/core";
import {
  AmountText,
  BodyText,
  Button,
  MonthToolcards,
} from "@teelur/budget-board-ui";
import { useDisclosure } from "@mantine/hooks";
import { FilterIcon } from "lucide-react";
import React from "react";
import SortMenu from "./SortMenu/SortMenu";
import { SortDirection } from "~/components/SortButton";
import { Sorts } from "./SortMenu/SortMenuHelpers";
import FilterCard from "./FilterCard/FilterCard";
import CreateTransactionModal from "./CreateTransactionModal/CreateTransactionModal";
import ImportTransactionsModal from "./ImportTransactionsModal/ImportTransactionsModal";
import { useTransactionFilters } from "~/providers/TransactionFiltersProvider/TransactionFiltersProvider";
import { useTranslation } from "react-i18next";
import ExportTransactionsModal from "./ExportTransactionsModal/ExportTransactionsModal";
import QuickMonthSelect from "~/components/QuickMonthSelect/QuickMonthSelect";
import { Filters, ITransaction } from "~/models/transaction";
import {
  buildTimeToMonthlyTotalsMap,
  getFilteredTransactions,
  sortTransactions,
} from "~/helpers/transactions";
import { getMonthToolcardStatus } from "~/helpers/monthToolcards";
import { isTransfer } from "~/helpers/budgets";
import { useTransactionCategories } from "~/providers/TransactionCategoryProvider/TransactionCategoryProvider";
import { getMonthsInDateRange } from "~/helpers/datetime";
import { useLocale } from "~/providers/LocaleProvider/LocaleProvider";
import { usePrivacyMode } from "~/providers/PrivacyModeProvider/PrivacyModeProvider";
import { useUserSettings } from "~/providers/UserSettingsProvider/UserSettingsProvider";
import { SignDisplay } from "~/helpers/currency";
import { CategoryTypes } from "~/models/category";
import { areStringsEqual } from "~/helpers/utils";

interface TransactionsHeaderProps {
  sort: Sorts;
  setSort: (newSort: Sorts) => void;
  sortDirection: SortDirection;
  setSortDirection: (newSortDirection: SortDirection) => void;
  setCurrentViewTransactions: (transactions: ITransaction[]) => void;
  transactions: ITransaction[];
  isQueryPending: boolean;
  selectedMonths: Date[];
  setSelectedMonths: React.Dispatch<React.SetStateAction<Date[]>>;
}

const TransactionsHeader = (
  props: TransactionsHeaderProps,
): React.ReactNode => {
  const { t } = useTranslation();
  const { transactionFilters, isFiltersPanelOpen, toggleFiltersPanel } =
    useTransactionFilters();
  const { allTransactionCategories, getCategoryType } =
    useTransactionCategories();
  const { dayjs, dayjsLocale, intlLocale } = useLocale();
  const { isPrivacyModeEnabled } = usePrivacyMode();
  const { preferredCurrency, decimalPlaces } = useUserSettings();
  const [canSelectMultiple, { toggle, open }] = useDisclosure(false);

  const toggleSelectMultiple = () => {
    if (canSelectMultiple) {
      if (props.selectedMonths.length === 0) {
        props.setSelectedMonths([dayjs().startOf("month").toDate()]);
      } else {
        props.setSelectedMonths([
          new Date(
            Math.max(...props.selectedMonths.map((date) => date.getTime())),
          ),
        ]);
      }
    }

    toggle();
  };

  // Transfers only move money between accounts, so they're left out of each
  // month's total. They're still listed with the other transactions.
  const timeToMonthlyTotalsMap = React.useMemo(
    () =>
      buildTimeToMonthlyTotalsMap(
        props.selectedMonths,
        props.transactions.filter(
          (transaction) => !isTransfer(transaction, allTransactionCategories),
        ),
      ),
    [props.selectedMonths, props.transactions, allTransactionCategories],
  );

  // Income and spending across the selected months, following the active
  // filters. Transfers only move money between accounts, and deleted
  // transactions don't count.
  const { totalIncome, totalExpenses } = React.useMemo(() => {
    let income = 0;
    let expenses = 0;
    getFilteredTransactions(
      props.transactions,
      transactionFilters ?? new Filters(),
      allTransactionCategories,
    ).forEach((transaction) => {
      if (
        transaction.deleted !== null ||
        isTransfer(transaction, allTransactionCategories) ||
        // No months selected means all of them.
        (props.selectedMonths.length > 0 &&
          !props.selectedMonths.some((month) =>
            dayjs(transaction.date).isSame(month, "month"),
          ))
      ) {
        return;
      }

      if (
        areStringsEqual(
          getCategoryType(transaction.category ?? ""),
          CategoryTypes.Income,
        )
      ) {
        income += transaction.amount;
      } else {
        expenses += transaction.amount;
      }
    });
    return { totalIncome: income, totalExpenses: expenses };
  }, [
    props.transactions,
    props.selectedMonths,
    transactionFilters,
    allTransactionCategories,
    getCategoryType,
    dayjs,
  ]);

  const getMonthStatus = React.useCallback(
    (date: Date) => getMonthToolcardStatus(timeToMonthlyTotalsMap, date),
    [timeToMonthlyTotalsMap],
  );

  React.useEffect(() => {
    const [startDate, endDate] = transactionFilters.dateRange;

    if (startDate && endDate) {
      const monthsInDateRange = getMonthsInDateRange(startDate, endDate);

      props.setSelectedMonths((selectedMonths) => {
        const isSelectionUnchanged =
          selectedMonths.length === monthsInDateRange.length &&
          selectedMonths.every(
            (month, index) =>
              month.getTime() === monthsInDateRange[index]?.getTime(),
          );

        return isSelectionUnchanged ? selectedMonths : monthsInDateRange;
      });

      if (monthsInDateRange.length > 1) {
        open();
      }
    }
  }, [transactionFilters.dateRange, props.setSelectedMonths, open]);

  React.useEffect(() => {
    if (props.isQueryPending) {
      return;
    }

    const filteredTransactions = getFilteredTransactions(
      props.transactions,
      transactionFilters ?? new Filters(),
      allTransactionCategories,
    );

    const sortedFilteredTransactions = sortTransactions(
      filteredTransactions,
      props.sort,
      props.sortDirection,
    );

    props.setCurrentViewTransactions(sortedFilteredTransactions);
  }, [
    props.transactions,
    props.isQueryPending,
    transactionFilters,
    allTransactionCategories,
    props.sort,
    props.sortDirection,
  ]);

  return (
    <Stack className={classes.root}>
      <Flex className={classes.header}>
        <Group className={classes.totals}>
          <Stack gap={0}>
            <BodyText tone="secondary" size="xs">
              {t("total_income")}
            </BodyText>
            <AmountText
              amount={totalIncome}
              size="lg"
              isSensitive={isPrivacyModeEnabled}
              currency={preferredCurrency}
              decimalPlaces={decimalPlaces}
              locale={intlLocale}
              signDisplay={SignDisplay.Auto}
            />
          </Stack>
          <Stack gap={0}>
            <BodyText tone="secondary" size="xs">
              {t("total_expenses")}
            </BodyText>
            <AmountText
              amount={totalExpenses}
              size="lg"
              isSensitive={isPrivacyModeEnabled}
              currency={preferredCurrency}
              decimalPlaces={decimalPlaces}
              locale={intlLocale}
              signDisplay={SignDisplay.Auto}
              invertSign
              c="var(--bbui-color-error)"
            />
          </Stack>
        </Group>
        <Group className={classes.buttonGroup}>
          <ImportTransactionsModal />
          <ExportTransactionsModal />
          <Button
            variant="filled"
            color="primary"
            size="xs"
            selected={isFiltersPanelOpen}
            rightSection={<FilterIcon size="1rem" />}
            onClick={toggleFiltersPanel}
          >
            {t("filters")}
          </Button>
          <CreateTransactionModal />
        </Group>
      </Flex>
      <Collapse expanded={isFiltersPanelOpen} transitionDuration={100}>
        <FilterCard />
      </Collapse>
      <MonthToolcards
        selectedDates={props.selectedMonths}
        setSelectedDates={props.setSelectedMonths}
        getMonthStatus={getMonthStatus}
        isPending={props.isQueryPending}
        allowSelectMultiple={canSelectMultiple}
        allowFutureMonths
        locale={dayjsLocale}
      />
      <Group w="100%" justify="space-between" align="center" wrap="wrap">
        <SortMenu
          currentSort={props.sort}
          setCurrentSort={props.setSort}
          sortDirection={props.sortDirection}
          setSortDirection={props.setSortDirection}
        />
        <QuickMonthSelect
          selectedMonths={props.selectedMonths}
          setSelectedMonths={props.setSelectedMonths}
          isSelectMultiple={canSelectMultiple}
          toggleSelectMultiple={toggleSelectMultiple}
          onSelectRange={open}
        />
      </Group>
    </Stack>
  );
};

export default TransactionsHeader;
