import { Progress } from "@teelur/budget-board-ui";
import React from "react";
import { useTranslation } from "react-i18next";
import { roundAwayFromZero } from "~/helpers/utils";

interface BudgetProgressSection {
  value: number;
  color?: "muted";
  ariaLabel: string;
  striped?: boolean;
}

interface BudgetProgressProps {
  /** What's been spent (negative for expenses) or received. */
  amount: number;
  /** What's available: the month's limit plus any rollover. */
  limit: number;
  type: "income" | "expense";
  label?: boolean;
  sections?: BudgetProgressSection[];
  size?: "xs" | "sm";
  warningThreshold?: number;
  ariaLabel: string;
}

/**
 * A budget's progress bar. Normally the percentage is spent ÷ available, rollover included.
 * When an expense budget has nothing available (a negative balance carried in, or spending
 * against a $0 limit), there's no meaningful percentage, so the bar is shown full and red and
 * labelled "Over" instead of a misleading 0%. The "left" amount below it gives the real figure.
 */
const BudgetProgress = (props: BudgetProgressProps): React.ReactNode => {
  const { t } = useTranslation();

  const spent = roundAwayFromZero(-props.amount);
  const isOver =
    props.type === "expense" &&
    (props.limit < 0 || (props.limit <= 0 && spent > 0));

  if (!isOver) {
    return (
      <Progress
        amount={props.amount}
        limit={props.limit}
        label={props.label}
        sections={props.sections}
        size={props.size}
        type={props.type}
        warningThreshold={props.warningThreshold}
        ariaLabel={props.ariaLabel}
      />
    );
  }

  // Matches the layout of the library's own label.
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "0.5rem",
        width: "100%",
        minWidth: 0,
      }}
    >
      <Progress
        value={100}
        color="error"
        size={props.size}
        ariaLabel={props.ariaLabel}
      />
      {props.label && (
        <span
          style={{
            color: "var(--bbui-color-error)",
            flex: "none",
            fontSize: "0.875rem",
            fontWeight: 600,
            lineHeight: 1,
            whiteSpace: "nowrap",
          }}
        >
          {t("over_budget")}
        </span>
      )}
    </div>
  );
};

export default BudgetProgress;
