import classes from "./TransactionCard.module.css";

import { Collapse, Group } from "@mantine/core";
import { ActionIcon, Card, CardProps, Checkbox } from "@teelur/budget-board-ui";
import { ITransaction } from "~/models/transaction";
import React from "react";
import { ICategory } from "~/models/category";
import TransactionCardContent from "./TransactionCardContent/TransactionCardContent";
import TransactionCardDetails from "./TransactionCardDetails/TransactionCardDetails";
import { ChevronDown } from "lucide-react";
import { useTranslation } from "react-i18next";

export interface TransactionCardProps extends CardProps {
  transaction: ITransaction;
  categories: ICategory[];
  onToggleSelect?: (id: string) => void;
}

const TransactionCard = ({
  transaction,
  categories,
  onToggleSelect,
  ...cardProps
}: TransactionCardProps): React.ReactNode => {
  const { t } = useTranslation();
  // Details open only when the chevron is clicked, never on hover.
  const [isDetailsOpen, setIsDetailsOpen] = React.useState(false);
  const selectionMode = onToggleSelect !== undefined;
  const hoverable = cardProps.hoverable ?? selectionMode;
  const detailsId = React.useId();

  const detailsLabel = t(
    isDetailsOpen
      ? "collapse_transaction_details"
      : "expand_transaction_details",
  );

  const transactionContent = (
    <div className={classes.contentWrapper}>
      <TransactionCardContent
        transaction={transaction}
        categories={categories}
      />
    </div>
  );

  const detailsToggle = (
    <ActionIcon
      variant="ghost"
      color="primary"
      size="compact-xs"
      aria-label={detailsLabel}
      title={detailsLabel}
      aria-expanded={isDetailsOpen}
      aria-controls={detailsId}
      onClick={(event) => {
        event.stopPropagation();
        setIsDetailsOpen((prev) => !prev);
      }}
    >
      <ChevronDown
        size="1rem"
        className={`${classes.chevron}${isDetailsOpen ? ` ${classes.chevronOpen}` : ""}`}
      />
    </ActionIcon>
  );

  return (
    <div>
      <Card
        w={cardProps.w ?? "100%"}
        p={cardProps.p ?? "0.2rem"}
        {...cardProps}
        style={{ containerType: "inline-size" }}
        onClick={
          selectionMode ? () => onToggleSelect!(transaction.id) : undefined
        }
        hoverable={hoverable}
      >
        {selectionMode ? (
          <Group gap="0.5rem" wrap="nowrap">
            <Group
              className={classes.selectionGroup}
              data-selected={cardProps.selected ? "true" : "false"}
              wrap="nowrap"
              gap="0.5rem"
              align="center"
            >
              <div className={classes.checkboxWrapper}>
                <Checkbox
                  size="xs"
                  checked={cardProps.selected ?? false}
                  onChange={() => onToggleSelect!(transaction.id)}
                  onClick={(event) => event.stopPropagation()}
                />
              </div>
              {transactionContent}
            </Group>
            {detailsToggle}
          </Group>
        ) : (
          <Group gap="0.5rem">
            {transactionContent}
            {detailsToggle}
          </Group>
        )}
        <Collapse id={detailsId} expanded={isDetailsOpen}>
          <TransactionCardDetails transaction={transaction} />
        </Collapse>
      </Card>
    </div>
  );
};

export default TransactionCard;
