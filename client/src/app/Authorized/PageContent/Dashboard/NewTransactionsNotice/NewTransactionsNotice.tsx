import classes from "./NewTransactionsNotice.module.css";

import { Flex, Group, Stack } from "@mantine/core";
import {
  AmountText,
  BodyText,
  Button,
  Card,
  HeadingText,
} from "@teelur/budget-board-ui";
import { CheckCheckIcon, SparklesIcon } from "lucide-react";
import React from "react";
import { useTranslation } from "react-i18next";
import { useNewTransactions } from "~/providers/NewTransactionsProvider/NewTransactionsProvider";
import { useLocale } from "~/providers/LocaleProvider/LocaleProvider";
import { useUserSettings } from "~/providers/UserSettingsProvider/UserSettingsProvider";
import { usePrivacyMode } from "~/providers/PrivacyModeProvider/PrivacyModeProvider";

// How many new transactions to list before summarizing the rest.
const maxListed = 5;

/**
 * Tells the user which synced transactions they haven't marked as seen yet.
 * Only shown when there are some.
 */
const NewTransactionsNotice = (): React.ReactNode => {
  const { t } = useTranslation();
  const { dayjs, intlLocale } = useLocale();
  const { preferredCurrency, decimalPlaces } = useUserSettings();
  const { isPrivacyModeEnabled } = usePrivacyMode();
  const { newTransactions, markAllSeen, isMarkingSeen, showNewTransactions } =
    useNewTransactions();

  if (newTransactions.length === 0) {
    return null;
  }

  const listed = newTransactions.slice(0, maxListed);
  const remaining = newTransactions.length - listed.length;

  return (
    <Card className={classes.root} style={{ containerType: "inline-size" }}>
      <Stack gap="0.5rem">
        <Flex className={classes.header} justify="space-between" align="center">
          <Group gap="0.5rem" wrap="nowrap">
            <SparklesIcon size="1.1rem" color="var(--bbui-color-success)" />
            <HeadingText level={5}>
              {t("new_transactions_since_last_visit", {
                count: newTransactions.length,
              })}
            </HeadingText>
          </Group>
          <Group gap="0.5rem">
            <Button
              variant="ghost"
              color="success"
              size="xs"
              rightSection={<CheckCheckIcon size="1rem" />}
              onClick={() => void markAllSeen()}
              loading={isMarkingSeen}
            >
              {t("mark_all_as_seen")}
            </Button>
            <Button
              variant="filled"
              color="success"
              size="xs"
              onClick={showNewTransactions}
            >
              {t("view_new_transactions")}
            </Button>
          </Group>
        </Flex>
        <Stack gap="0.25rem">
          {listed.map((transaction) => (
            <Flex key={transaction.id} className={classes.row} align="center">
              <BodyText tone="secondary" size="sm" className={classes.date}>
                {dayjs(transaction.date).format("MMM D")}
              </BodyText>
              <BodyText size="sm" className={classes.merchant}>
                {transaction.merchantName}
              </BodyText>
              <BodyText tone="muted" size="sm" className={classes.account}>
                {transaction.accountName}
              </BodyText>
              <AmountText
                amount={transaction.amount}
                size="sm"
                isSensitive={isPrivacyModeEnabled}
                locale={intlLocale}
                currency={preferredCurrency}
                decimalPlaces={decimalPlaces}
              />
            </Flex>
          ))}
          {remaining > 0 && (
            <BodyText tone="muted" size="xs">
              {t("new_transactions_more", { count: remaining })}
            </BodyText>
          )}
        </Stack>
      </Stack>
    </Card>
  );
};

export default NewTransactionsNotice;
