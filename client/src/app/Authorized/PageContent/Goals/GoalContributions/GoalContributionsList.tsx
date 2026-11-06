import { Group, Stack } from "@mantine/core";
import {
  ActionIcon,
  AmountText,
  Badge,
  BodyText,
  Card,
} from "@teelur/budget-board-ui";
import { TrashIcon, UnlinkIcon } from "lucide-react";
import React from "react";
import { useTranslation } from "react-i18next";
import { SignDisplay } from "~/helpers/currency";
import { useDeleteGoalContributionMutation } from "~/hooks/mutations/goals/useDeleteGoalContributionMutation";
import { useUpdateTransactionsMutation } from "~/hooks/mutations/transactions/useUpdateTransactionsMutation";
import {
  IGoalContributionResponse,
  IGoalTransactionResponse,
} from "~/models/goal";
import { useLocale } from "~/providers/LocaleProvider/LocaleProvider";
import { usePrivacyMode } from "~/providers/PrivacyModeProvider/PrivacyModeProvider";
import { useUserSettings } from "~/providers/UserSettingsProvider/UserSettingsProvider";

interface GoalContributionsListProps {
  contributions: IGoalContributionResponse[];
  transactions: IGoalTransactionResponse[];
}

type GoalEntry =
  | { kind: "contribution"; date: string; item: IGoalContributionResponse }
  | { kind: "transaction"; date: string; item: IGoalTransactionResponse };

/**
 * Everything counting towards a manual goal, newest first: contributions logged by hand
 * and transactions the user chose to count towards the goal.
 */
const GoalContributionsList = (
  props: GoalContributionsListProps,
): React.ReactNode => {
  const { t } = useTranslation();
  const { dayjs, intlLocale, longDateFormat } = useLocale();
  const { preferredCurrency, decimalPlaces } = useUserSettings();
  const { isPrivacyModeEnabled } = usePrivacyMode();
  const deleteContributionMutation = useDeleteGoalContributionMutation();
  const updateTransactionsMutation = useUpdateTransactionsMutation();

  const entries: GoalEntry[] = [
    ...props.contributions.map((item): GoalEntry => ({
      kind: "contribution",
      date: item.date,
      item,
    })),
    ...props.transactions.map((item): GoalEntry => ({
      kind: "transaction",
      date: item.date,
      item,
    })),
  ].sort((a, b) => dayjs(b.date).valueOf() - dayjs(a.date).valueOf());

  if (entries.length === 0) {
    return (
      <BodyText tone="secondary" size="sm">
        {t("no_contributions")}
      </BodyText>
    );
  }

  const renderAmount = (amount: number) => (
    <AmountText
      amount={amount}
      size="md"
      isSensitive={isPrivacyModeEnabled}
      locale={intlLocale}
      currency={preferredCurrency}
      decimalPlaces={decimalPlaces}
      signDisplay={SignDisplay.Auto}
    />
  );

  return (
    <Stack gap="0.5rem">
      {entries.map((entry) => (
        <Card surface="sunken" key={`${entry.kind}-${entry.item.id}`}>
          <Group justify="space-between" wrap="nowrap">
            {entry.kind === "contribution" ? (
              <BodyText tone="secondary" size="sm">
                {dayjs(entry.date).format(longDateFormat)}
              </BodyText>
            ) : (
              <Stack gap={0}>
                <Group gap="0.5rem" wrap="nowrap">
                  <BodyText tone="primary" size="sm">
                    {entry.item.merchantName?.trim() || entry.item.accountName}
                  </BodyText>
                  <Badge variant="light" color="primary" size="xs">
                    {t("transaction")}
                  </Badge>
                </Group>
                <BodyText tone="secondary" size="xs">
                  {dayjs(entry.date).format(longDateFormat)}
                  {entry.item.accountName ? ` · ${entry.item.accountName}` : ""}
                </BodyText>
              </Stack>
            )}
            <Group gap="0.5rem" wrap="nowrap">
              {entry.kind === "contribution" ? (
                <>
                  {renderAmount(entry.item.amount)}
                  <ActionIcon
                    variant="ghost"
                    color="error"
                    size="compact-xs"
                    aria-label={t("delete")}
                    title={t("delete")}
                    loading={
                      deleteContributionMutation.isPending &&
                      deleteContributionMutation.variables === entry.item.id
                    }
                    onClick={() =>
                      deleteContributionMutation.mutate(entry.item.id)
                    }
                  >
                    <TrashIcon size={16} />
                  </ActionIcon>
                </>
              ) : (
                <>
                  {renderAmount(entry.item.countedAmount)}
                  <ActionIcon
                    variant="ghost"
                    color="primary"
                    size="compact-xs"
                    aria-label={t("stop_counting_towards_goal")}
                    title={t("stop_counting_towards_goal")}
                    loading={
                      updateTransactionsMutation.isPending &&
                      updateTransactionsMutation.variables?.[0]?.id ===
                        entry.item.id
                    }
                    onClick={() =>
                      updateTransactionsMutation.mutate([
                        { id: entry.item.id, goalID: null },
                      ])
                    }
                  >
                    <UnlinkIcon size={16} />
                  </ActionIcon>
                </>
              )}
            </Group>
          </Group>
        </Card>
      ))}
    </Stack>
  );
};

export default GoalContributionsList;
