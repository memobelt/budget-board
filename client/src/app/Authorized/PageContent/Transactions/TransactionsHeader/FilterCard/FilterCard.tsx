import classes from "./FilterCard.module.css";

import { Flex, Stack } from "@mantine/core";
import {
  Button,
  Card,
  CategorySelect,
  DatePickerInput,
  HeadingText,
  NumberInput,
  TagsInput,
  TextInput,
} from "@teelur/budget-board-ui";
import { DatesRangeValue } from "@mantine/dates";
import { Filters, IFilters } from "~/models/transaction";
import React from "react";
import { useTransactionFilters } from "~/providers/TransactionFiltersProvider/TransactionFiltersProvider";
import { useTranslation } from "react-i18next";
import AccountMultiSelect from "~/components/AccountMultiSelect/AccountMultiSelect";
import { useLocale } from "~/providers/LocaleProvider/LocaleProvider";
import { useTransactionCategories } from "~/providers/TransactionCategoryProvider/TransactionCategoryProvider";
import { useUserSettings } from "~/providers/UserSettingsProvider/UserSettingsProvider";
import { useTagSuggestionsQuery } from "~/hooks/queries/useTagSuggestionsQuery";

const FilterCard = (): React.ReactNode => {
  const { t } = useTranslation();
  const {
    dayjs,
    dayjsLocale,
    longDateFormat,
    thousandsSeparator,
    decimalSeparator,
    currencySymbol,
  } = useLocale();
  const { decimalPlaces } = useUserSettings();
  const { transactionFilters, setTransactionFilters } = useTransactionFilters();
  const { allTransactionCategories: transactionCategories } =
    useTransactionCategories();
  const suggestionsQuery = useTagSuggestionsQuery();

  // Changes some filters and keeps the rest.
  const updateFilters = (changes: Partial<IFilters>) => {
    const newFilters = new Filters(transactionFilters);
    Object.assign(newFilters, changes);
    setTransactionFilters(newFilters);
  };

  const onDatePickerChange = (dateRange: DatesRangeValue<string>) => {
    const parsedDateRange: [Date | null, Date | null] = [
      dateRange[0] ? dayjs(dateRange[0]).toDate() : null,
      dateRange[1] ? dayjs(dateRange[1]).toDate() : null,
    ];
    updateFilters({
      dateRange: parsedDateRange,
    });
  };

  return (
    <Card>
      <Stack gap="0.25rem" className={classes.root}>
        <Flex
          className={classes.header}
          justify="space-between"
          align="center"
          wrap="nowrap"
        >
          <HeadingText level={5}>{t("filters")}</HeadingText>
          <Button
            variant="filled"
            color="primary"
            size="compact-sm"
            selected={!transactionFilters.isEqual(new Filters())}
            onClick={() => {
              setTransactionFilters(new Filters());
            }}
          >
            {t("clear_filters")}
          </Button>
        </Flex>
        <Flex className={classes.row} justify="space-between" wrap="nowrap">
          <DatePickerInput
            className={classes.datePickerInput}
            miw={165}
            type="range"
            label={t("date_range")}
            placeholder={t("select_a_date_range")}
            value={transactionFilters.dateRange}
            locale={dayjsLocale}
            valueFormat={longDateFormat}
            onChange={onDatePickerChange}
            clearable
          />
          <AccountMultiSelect
            className={classes.accountMultiSelect}
            label={t("accounts")}
            miw={150}
            value={transactionFilters.accounts}
            onChange={(newAccountIds: string[]) => {
              updateFilters({
                accounts: newAccountIds,
              });
            }}
            hideHidden
          />
          <CategorySelect
            className={classes.categorySelect}
            label={t("category")}
            miw={170}
            categories={transactionCategories}
            value={transactionFilters.category}
            onChange={(val) => {
              updateFilters({
                category: val,
              });
            }}
            withinPortal
            includeUncategorized
          />
        </Flex>
        <Flex className={classes.row} justify="space-between" wrap="nowrap">
          <TextInput
            className={classes.merchantInput}
            miw={140}
            label={t("merchant_name")}
            placeholder={t("enter_merchant_name")}
            value={transactionFilters.merchantName}
            onChange={(e) => {
              updateFilters({
                merchantName: e.currentTarget.value,
              });
            }}
          />
          <TextInput
            className={classes.merchantInput}
            miw={140}
            label={t("notes")}
            placeholder={t("enter_notes")}
            value={transactionFilters.notes}
            onChange={(e) => updateFilters({ notes: e.currentTarget.value })}
          />
          <NumberInput
            className={classes.amountInput}
            miw={100}
            label={t("amount_min")}
            placeholder="0"
            value={transactionFilters.amountRange[0] ?? ""}
            onChange={(val) => {
              updateFilters({
                amountRange: [
                  val === "" ? null : Number(val),
                  transactionFilters.amountRange[1],
                ],
              });
            }}
            prefix={currencySymbol}
            decimalScale={decimalPlaces}
            decimalSeparator={decimalSeparator}
            thousandSeparator={thousandsSeparator}
          />
          <NumberInput
            className={classes.amountInput}
            miw={100}
            label={t("amount_max")}
            placeholder="0"
            value={transactionFilters.amountRange[1] ?? ""}
            onChange={(val) => {
              updateFilters({
                amountRange: [
                  transactionFilters.amountRange[0],
                  val === "" ? null : Number(val),
                ],
              });
            }}
            prefix={currencySymbol}
            decimalScale={decimalPlaces}
            decimalSeparator={decimalSeparator}
            thousandSeparator={thousandsSeparator}
          />
          <TagsInput
            className={classes.tagsInput}
            label={t("tags")}
            placeholder={t("add_or_select_tags")}
            data={suggestionsQuery.data ?? []}
            value={transactionFilters.tags}
            onChange={(tags) => {
              updateFilters({
                tags: tags,
              });
            }}
          />
        </Flex>
      </Stack>
    </Card>
  );
};

export default FilterCard;
