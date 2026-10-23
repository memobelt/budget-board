import { Group, ScrollArea, Skeleton, Stack } from "@mantine/core";
import {
  Badge,
  BodyText,
  Button,
  Card,
  HeadingText,
  Pagination,
} from "@teelur/budget-board-ui";
import { CheckCheckIcon, SparklesIcon } from "lucide-react";
import React from "react";
import { useTranslation } from "react-i18next";
import TransactionCard from "~/components/TransactionCard/TransactionCard";
import { ITransaction } from "~/models/transaction";
import { useNewTransactions } from "~/providers/NewTransactionsProvider/NewTransactionsProvider";
import { useTransactionCategories } from "~/providers/TransactionCategoryProvider/TransactionCategoryProvider";

/**
 * Lists the transactions synced from the user's banks since their last visit.
 */
const NewTransactionsWidget = (): React.ReactNode => {
  const itemsPerPage = 15;
  const [activePage, setPage] = React.useState(1);

  const { t } = useTranslation();
  const { allTransactionCategories: transactionCategories } =
    useTransactionCategories();
  const {
    newTransactions,
    isNewTransactionsPending,
    markAllSeen,
    isMarkingSeen,
    showNewTransactions,
  } = useNewTransactions();

  const totalPages = Math.max(
    1,
    Math.ceil(newTransactions.length / itemsPerPage),
  );

  // The list shrinks when transactions are marked as seen, so don't stay on a
  // page that no longer exists.
  React.useEffect(() => {
    if (activePage > totalPages) {
      setPage(totalPages);
    }
  }, [activePage, totalPages]);

  const currentPageTransactions = React.useMemo(
    () =>
      newTransactions.slice(
        (activePage - 1) * itemsPerPage,
        (activePage - 1) * itemsPerPage + itemsPerPage,
      ),
    [newTransactions, activePage],
  );

  const getWidgetContent = () => {
    if (isNewTransactionsPending) {
      return <Skeleton h="100%" radius="md" />;
    }

    if (newTransactions.length === 0) {
      return (
        <BodyText tone="muted" size="sm" ta="center">
          {t("no_new_transactions")}
        </BodyText>
      );
    }

    return (
      <ScrollArea
        w="100%"
        type="auto"
        offsetScrollbars="present"
        style={{ flex: "1 1 0", minHeight: 0 }}
      >
        <Stack gap="0.3rem">
          {currentPageTransactions.map((transaction: ITransaction) => (
            <TransactionCard
              key={transaction.id}
              transaction={transaction}
              categories={transactionCategories}
              surface="sunken"
            />
          ))}
        </Stack>
      </ScrollArea>
    );
  };

  return (
    <Card
      w="100%"
      h="100%"
      style={{ display: "flex", flexDirection: "column", minHeight: 0 }}
    >
      <Card.Section separatorThickness="thick">
        <Group justify="space-between" gap="0.5rem" wrap="wrap">
          <Group gap="0.25rem" wrap="nowrap">
            <SparklesIcon size="1.5rem" color="var(--bbui-color-success)" />
            <HeadingText tone="heading" level={4}>
              {t("new_transactions")}
            </HeadingText>
            {newTransactions.length > 0 && (
              <Badge variant="light" color="success" size="sm">
                {newTransactions.length}
              </Badge>
            )}
          </Group>
          {newTransactions.length > 0 && (
            <Group gap="0.25rem" wrap="nowrap">
              <Button
                variant="ghost"
                color="success"
                size="compact-xs"
                rightSection={<CheckCheckIcon size="1rem" />}
                onClick={() => void markAllSeen()}
                loading={isMarkingSeen}
              >
                {t("mark_all_as_seen")}
              </Button>
              <Button
                variant="filled"
                color="success"
                size="compact-xs"
                onClick={showNewTransactions}
              >
                {t("view_new_transactions")}
              </Button>
            </Group>
          )}
        </Group>
      </Card.Section>
      <Card.Section
        p="0.5rem"
        style={{
          display: "flex",
          flex: "1 1 0",
          flexDirection: "column",
          minHeight: 0,
        }}
      >
        <Stack
          gap="0.5rem"
          justify="center"
          align="center"
          w="100%"
          style={{ flex: "1 1 0", minHeight: 0 }}
        >
          {getWidgetContent()}
          {newTransactions.length > itemsPerPage && (
            <Pagination
              size="sm"
              value={activePage}
              onChange={setPage}
              total={totalPages}
            />
          )}
        </Stack>
      </Card.Section>
    </Card>
  );
};

export default NewTransactionsWidget;
