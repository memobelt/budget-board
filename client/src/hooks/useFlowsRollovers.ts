import React from "react";
import { useTranslation } from "react-i18next";
import { isEverythingElseBudget } from "~/helpers/budgets";
import { getFormattedCategoryValue } from "~/helpers/category";
import { FlowsRolloverItem } from "~/helpers/charts";
import { useBudgetsQuery } from "~/hooks/queries/useBudgetsQuery";
import { ICategory } from "~/models/category";

interface UseFlowsRolloversProps {
  enabled: boolean;
  months: Date[];
  categories: ICategory[];
}

/**
 * The budget rollover balances carried into a period, for showing in a Flows chart.
 * Returns undefined while turned off, so the chart shows no rollovers.
 */
export const useFlowsRollovers = ({
  enabled,
  months,
  categories,
}: UseFlowsRolloversProps): {
  rollovers: FlowsRolloverItem[] | undefined;
  isPending: boolean;
} => {
  const { t } = useTranslation();

  // Rollover balances are running totals, so only what's carried into the
  // earliest month counts; later months' balances already include it.
  const earliestMonth = React.useMemo(
    () =>
      months.length > 0
        ? new Date(Math.min(...months.map((month) => month.getTime())))
        : null,
    [months],
  );

  const budgetsQuery = useBudgetsQuery({
    months: earliestMonth ? [earliestMonth] : [],
    enabled: enabled && earliestMonth !== null,
  });

  const rollovers = React.useMemo(() => {
    if (!enabled) {
      return undefined;
    }

    // Only budgets with rollover on hold their own balance; a category
    // without it just shows the sum of its subcategories', which would
    // count them twice.
    return budgetsQuery.data
      .filter((budget) => budget.rolloverStartMonth !== null)
      .map((budget) => ({
        name: isEverythingElseBudget(budget)
          ? t("everything_else")
          : getFormattedCategoryValue(budget.category, categories),
        amount: Math.round(budget.rollover),
      }))
      .filter((item) => item.amount !== 0);
  }, [enabled, budgetsQuery.data, categories, t]);

  return {
    rollovers,
    isPending: enabled && earliestMonth !== null && budgetsQuery.isPending,
  };
};
