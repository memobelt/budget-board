import classes from "../BudgetsGroup/BudgetCard/BudgetParentItem/BudgetParentItem.module.css";

import { Flex, Group, Stack } from "@mantine/core";
import {
  ActionIcon,
  AmountText,
  BodyText,
  Card,
  HeadingText,
  Progress,
} from "@teelur/budget-board-ui";
import { useDisclosure } from "@mantine/hooks";
import { PencilIcon } from "lucide-react";
import React from "react";
import { Trans, useTranslation } from "react-i18next";
import { EVERYTHING_ELSE_CATEGORY, IBudget } from "~/models/budget";
import { uncategorizedTransactionCategory } from "~/models/transaction";
import {
  getEverythingElseGroupTotal,
  getRangeRolloverBudgetIds,
  IEverythingElseGroup,
} from "~/helpers/budgets";
import { getCategoryIcon } from "~/helpers/category";
import { SignDisplay } from "~/helpers/currency";
import { roundAwayFromZero } from "~/helpers/utils";
import { useCreateBudgetMutation } from "~/hooks/mutations/budgets/useCreateBudgetMutation";
import { useUpdateBudgetMutation } from "~/hooks/mutations/budgets/useUpdateBudgetMutation";
import { useLocale } from "~/providers/LocaleProvider/LocaleProvider";
import { usePrivacyMode } from "~/providers/PrivacyModeProvider/PrivacyModeProvider";
import { useTransactionCategories } from "~/providers/TransactionCategoryProvider/TransactionCategoryProvider";
import { useUserSettings } from "~/providers/UserSettingsProvider/UserSettingsProvider";
import BudgetMetrics from "../BudgetsGroup/BudgetCard/BudgetMetrics/BudgetMetrics";
import RolloverButton from "../BudgetsGroup/BudgetCard/RolloverButton/RolloverButton";
import UnbudgetedChildItem from "../BudgetsGroup/BudgetCard/UnbudgetedChildItem/UnbudgetedChildItem";

interface EverythingElseCardProps {
  /**
   * The Everything Else budget for each selected month. The server adds one to every month that
   * has budgets, with its limit already set to budgeted income minus budgeted expenses. Empty
   * when the months have no budgets at all.
   */
  budgets: IBudget[];
  /** Spending in unbudgeted expense categories and uncategorized transactions. */
  amount: number;
  /** The amount plus recurring transactions still expected this period. */
  projectedAmount: number;
  /**
   * The expense categories whose spending falls into Everything Else, each listed as a row:
   * unbudgeted categories in whole, and budgeted ones by their unbudgeted subcategories.
   */
  groups: IEverythingElseGroup[];
  categoryToTransactionsTotalMap: Map<string, number>;
  selectedDate: Date | null;
  openDetails: (category: string, month: Date | null) => void;
}

/**
 * A catch-all expense budget: every expense category without its own budget, plus uncategorized
 * spending, falls into it. Its limit is automatic (budgeted income minus budgeted expenses), and
 * it can roll over unspent money. Each of those categories is listed in the card, much like
 * subcategories on a budget card.
 */
const EverythingElseCard = (
  props: EverythingElseCardProps,
): React.ReactNode => {
  const { t } = useTranslation();
  const { isPrivacyModeEnabled } = usePrivacyMode();
  const { intlLocale, dayjs } = useLocale();
  const { preferredCurrency, budgetWarningThreshold } = useUserSettings();
  const { allTransactionCategories } = useTransactionCategories();

  const updateBudgetMutation = useUpdateBudgetMutation();
  const createBudgetMutation = useCreateBudgetMutation();

  const [isEditing, { toggle: toggleEditing }] = useDisclosure(false);
  // Groups (parent categories) start collapsed; expanding one lists its subcategories.
  const [expandedGroups, setExpandedGroups] = React.useState<
    Record<string, boolean>
  >({});
  const toggleGroup = (category: string) => {
    const key = category.toLowerCase();
    setExpandedGroups((current) => ({ ...current, [key]: !current[key] }));
  };

  // Rollover settings can only be changed when a single month is shown.
  const budget =
    props.selectedDate && props.budgets.length === 1 ? props.budgets[0] : null;
  const hasLimit = props.budgets.length > 0;

  const limit = props.budgets.reduce((total, b) => total + b.limit, 0);
  const rangeRolloverBudgetIds = getRangeRolloverBudgetIds(props.budgets);
  const rollover = props.budgets.reduce(
    (total, b) => total + (rangeRolloverBudgetIds.has(b.id) ? b.rollover : 0),
    0,
  );
  const rolloverStartMonth = props.budgets[0]?.rolloverStartMonth ?? null;
  const rollsOver = props.budgets.some((b) => b.rolloverStartMonth !== null);
  const availableLimit = limit + rollover;

  const getPercent = (amount: number): number =>
    Math.min(
      100,
      Math.max(0, roundAwayFromZero((-amount / availableLimit) * 100)),
    );
  const actualPercent = availableLimit <= 0 ? 0 : getPercent(props.amount);
  const projectedPercent =
    availableLimit <= 0 ? actualPercent : getPercent(props.projectedAmount);
  const projectedProgressValue = Math.max(0, projectedPercent - actualPercent);

  const handleRolloverChange = (newRolloverStartMonth: string | null) => {
    if (!budget) {
      return;
    }

    // The limit is worked out by the server, so the stored one doesn't matter.
    if (budget.isPlaceholder) {
      // Not saved yet for this month: saving it keeps the rollover setting.
      createBudgetMutation.mutate([
        {
          month: dayjs(budget.month).format("YYYY-MM-DD"),
          category: EVERYTHING_ELSE_CATEGORY,
          limit: 0,
          rolloverStartMonth: newRolloverStartMonth,
        },
      ]);
    } else {
      updateBudgetMutation.mutate({
        id: budget.id,
        limit: 0,
        rolloverStartMonth: newRolloverStartMonth,
      });
    }
  };

  // Uncategorized first, then the rest by most spent.
  const rows = [
    {
      value: "",
      label: t(uncategorizedTransactionCategory) as string | undefined,
      amount: props.categoryToTransactionsTotalMap.get("") ?? 0,
      isPartial: false,
    },
    ...props.groups
      .map((group) => ({
        value: group.value,
        label: undefined as string | undefined,
        isPartial: group.isPartial,
        amount: getEverythingElseGroupTotal(
          group,
          props.categoryToTransactionsTotalMap,
        ),
      }))
      .sort((a, b) => a.amount - b.amount),
  ]
    .filter((row) => roundAwayFromZero(row.amount) !== 0)
    .map((row) => ({
      ...row,
      // Subcategories with spending, most spent first.
      children: (
        props.groups.find((group) => group.value === row.value)
          ?.subCategories ?? []
      )
        .map((sub) => ({
          value: sub.value,
          amount:
            props.categoryToTransactionsTotalMap.get(sub.value.toLowerCase()) ??
            0,
        }))
        .filter((sub) => roundAwayFromZero(sub.amount) !== 0)
        .sort((a, b) => a.amount - b.amount),
    }));

  const amountElement = (
    <AmountText
      amount={props.amount}
      disableStatusColor
      size="md"
      isSensitive={isPrivacyModeEnabled}
      locale={intlLocale}
      currency={preferredCurrency}
      decimalPlaces={0}
      signDisplay={SignDisplay.Auto}
      invertSign
      className={classes.text}
      key="amount"
    />
  );

  return (
    <Card w="100%">
      <Card.Section>
        <Group gap="0.75rem" align="flex-start" wrap="nowrap">
          <Stack gap={0} w="100%">
            <Group
              justify="space-between"
              align="center"
              style={{ containerType: "inline-size" }}
              gap={0}
            >
              <Group gap="0.25rem" align="center">
                <HeadingText tone="primary" className={classes.title}>
                  {t("everything_else")}
                </HeadingText>
                {budget && (
                  <ActionIcon
                    variant="ghost"
                    color="primary"
                    size="compact-xs"
                    selected={isEditing}
                    aria-label={t("edit_everything_else_budget")}
                    onClick={toggleEditing}
                  >
                    <PencilIcon size={16} />
                  </ActionIcon>
                )}
              </Group>
              <Group gap="0.25rem" justify="flex-end" align="center">
                {hasLimit ? (
                  <Trans
                    i18nKey="x_of_y"
                    components={[
                      amountElement,
                      <BodyText tone="secondary" size="sm" key="of" />,
                      <AmountText
                        amount={availableLimit}
                        disableStatusColor
                        size="md"
                        isSensitive={isPrivacyModeEnabled}
                        locale={intlLocale}
                        currency={preferredCurrency}
                        decimalPlaces={0}
                        signDisplay={SignDisplay.Auto}
                        className={classes.text}
                        key="total"
                      />,
                    ]}
                  />
                ) : (
                  amountElement
                )}
              </Group>
            </Group>
            <BodyText tone="muted" size="xs">
              {t("everything_else_description")}
              {!hasLimit && ` ${t("everything_else_no_limit")}`}
            </BodyText>
            {hasLimit && (
              <>
                <Progress
                  amount={props.amount}
                  limit={availableLimit}
                  label
                  sections={
                    projectedProgressValue > 0
                      ? [
                          {
                            ariaLabel: t("recurring_transactions"),
                            color: "muted",
                            striped: true,
                            value: projectedProgressValue,
                          },
                        ]
                      : []
                  }
                  size="sm"
                  type="expense"
                  warningThreshold={budgetWarningThreshold}
                  ariaLabel={t("everything_else")}
                />
                <BudgetMetrics
                  amount={props.amount}
                  projectedAmount={props.projectedAmount}
                  limit={availableLimit}
                  rollover={rollsOver ? rollover : undefined}
                  isIncome={false}
                />
              </>
            )}
          </Stack>
          {isEditing && budget && (
            <Flex style={{ alignSelf: "stretch" }}>
              <RolloverButton
                category={t("everything_else")}
                rolloverStartMonth={rolloverStartMonth}
                budgetMonth={props.selectedDate ?? dayjs().toDate()}
                onChange={handleRolloverChange}
              />
            </Flex>
          )}
        </Group>
      </Card.Section>
      {rows.map((row) => {
        const isExpanded = expandedGroups[row.value.toLowerCase()] ?? false;
        return (
          <React.Fragment key={row.value || "uncategorized"}>
            <Card.Section
              onClick={() => props.openDetails(row.value, props.selectedDate)}
              hoverable
            >
              <UnbudgetedChildItem
                category={row.value}
                label={row.label}
                amount={row.amount}
                isIncome={false}
                icon={
                  row.value
                    ? getCategoryIcon(row.value, allTransactionCategories)
                    : ""
                }
                selectedDate={props.selectedDate}
                // Uncategorized can't have a budget, and a partial group
                // already has one.
                hideAddBudget={row.value === "" || row.isPartial}
                isExpanded={isExpanded}
                onToggleExpanded={
                  row.children.length > 0
                    ? () => toggleGroup(row.value)
                    : undefined
                }
              />
            </Card.Section>
            {isExpanded &&
              row.children.map((child) => (
                <Card.Section
                  key={child.value}
                  onClick={() =>
                    props.openDetails(child.value, props.selectedDate)
                  }
                  hoverable
                >
                  <UnbudgetedChildItem
                    category={child.value}
                    amount={child.amount}
                    isIncome={false}
                    icon={getCategoryIcon(
                      child.value,
                      allTransactionCategories,
                    )}
                    selectedDate={props.selectedDate}
                    indent="2.75rem"
                  />
                </Card.Section>
              ))}
          </React.Fragment>
        );
      })}
    </Card>
  );
};

export default EverythingElseCard;
