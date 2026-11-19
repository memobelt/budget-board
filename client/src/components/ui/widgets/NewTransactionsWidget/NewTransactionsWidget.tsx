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
import BulkActionBar from "~/components/BulkActionBar/BulkActionBar";
import { ITransaction } from "~/models/transaction";
import { useNewTransactions } from "~/providers/NewTransactionsProvider/NewTransactionsProvider";
import { useTransactionCategories } from "~/providers/TransactionCategoryProvider/TransactionCategoryProvider";

/**
 * Lists the synced transactions the user hasn't marked as seen yet.
 */
const NewTransactionsWidget = (): React.ReactNode => {
  const itemsPerPage = 15;
  const [activePage, setPage] = React.useState(1);
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());

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

  // Drop selections for transactions that left the list (deleted or marked
  // as seen) so the edit bar doesn't act on them.
  React.useEffect(() => {
    const listedIds = new Set(newTransactions.map((t) => t.id));
    setSelectedIds((prev) => {
      const next = new Set([...prev].filter((id) => listedIds.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [newTransactions]);

  const onToggleSelect = (id: string) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });

  const onClearSelection = () => setSelectedIds(new Set());

  const onSelectAll = (ids: string[]) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => next.add(id));
      return next;
    });

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
              selected={selectedIds.has(transaction.id)}
              onToggleSelect={onToggleSelect}
              surface="sunken"
            />
          ))}
        </Stack>
      </ScrollArea>
    );
  };

  return (
    <>
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
      <BulkActionBar
        selectedIds={selectedIds}
        currentPageTransactions={currentPageTransactions}
        onClearSelection={onClearSelection}
        onSelectAll={onSelectAll}
        categories={transactionCategories}
      />
    </>
  );
};

export default NewTransactionsWidget;
