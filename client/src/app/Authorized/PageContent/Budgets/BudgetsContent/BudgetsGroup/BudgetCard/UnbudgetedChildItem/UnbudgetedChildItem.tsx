import classes from "./UnbudgetedChildItem.module.css";

import { Group } from "@mantine/core";
import { ActionIcon, AmountText, BodyText } from "@teelur/budget-board-ui";
import { ChevronDown, PlusIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { SignDisplay } from "~/helpers/currency";
import { useCreateBudgetMutation } from "~/hooks/mutations/budgets/useCreateBudgetMutation";
import { useLocale } from "~/providers/LocaleProvider/LocaleProvider";
import { usePrivacyMode } from "~/providers/PrivacyModeProvider/PrivacyModeProvider";
import { useUserSettings } from "~/providers/UserSettingsProvider/UserSettingsProvider";

interface UnbudgetedChildItemProps {
  selectedDate: Date | null;
  category: string;
  amount: number;
  isIncome: boolean;
  icon: string;
  /** Shown instead of the category, e.g. for uncategorized spending. */
  label?: string;
  /** Hides the button that creates a budget for the category. */
  hideAddBudget?: boolean;
  /** When set, a chevron is shown that expands or collapses the row's subcategories. */
  onToggleExpanded?: () => void;
  isExpanded?: boolean;
  /** Left padding of the row; deeper rows (subcategories) use more. */
  indent?: string;
}

const UnbudgetedChildItem = (
  props: UnbudgetedChildItemProps,
): React.ReactNode => {
  const { t } = useTranslation();
  const { dayjs, intlLocale } = useLocale();
  const { preferredCurrency } = useUserSettings();
  const { isPrivacyModeEnabled } = usePrivacyMode();
  const createBudgetMutation = useCreateBudgetMutation();

  return (
    <Group
      pl={props.indent ?? "1rem"}
      justify="space-between"
      w="100%"
      wrap="nowrap"
      style={{ containerType: "inline-size" }}
    >
      <Group gap="0.25rem" wrap="nowrap">
        {props.onToggleExpanded && (
          <ActionIcon
            variant="ghost"
            color="primary"
            size="compact-xs"
            aria-label={t("toggle_budget_category", {
              category: props.label ?? props.category,
            })}
            aria-expanded={props.isExpanded ?? false}
            onClick={(event) => {
              event.stopPropagation();
              props.onToggleExpanded!();
            }}
          >
            <ChevronDown
              className={props.isExpanded ? undefined : classes.collapseIcon}
              size={18}
            />
          </ActionIcon>
        )}
        <BodyText tone="primary" fw={500} className={classes.text}>
          {props.icon.length > 0 ? `${props.icon} ` : ""}
          {props.label ?? props.category}
        </BodyText>
      </Group>
      <Group gap="0.5rem" wrap="nowrap">
        <AmountText
          amount={props.amount * (props.isIncome ? 1 : -1)}
          disableStatusColor
          size="md"
          isSensitive={isPrivacyModeEnabled}
          currency={preferredCurrency}
          decimalPlaces={0}
          locale={intlLocale}
          signDisplay={SignDisplay.Auto}
          className={classes.text}
        />
        {props.selectedDate && !props.hideAddBudget && (
          <ActionIcon
            variant="filled"
            color="primary"
            size="compact-xs"
            disabled={createBudgetMutation.isPending}
            onClick={(event) => {
              event.stopPropagation();
              createBudgetMutation.mutate([
                {
                  month: dayjs(props.selectedDate!).format("YYYY-MM-DD"),
                  category: props.category,
                  limit: Math.round(Math.abs(props.amount)),
                },
              ]);
            }}
          >
            <PlusIcon size={20} />
          </ActionIcon>
        )}
      </Group>
    </Group>
  );
};

export default UnbudgetedChildItem;
