import { Group, Stack } from "@mantine/core";
import {
  ActionIcon,
  AmountText,
  BodyText,
  Card,
} from "@teelur/budget-board-ui";
import { TrashIcon } from "lucide-react";
import React from "react";
import { useTranslation } from "react-i18next";
import { SignDisplay } from "~/helpers/currency";
import { useDeleteGoalContributionMutation } from "~/hooks/mutations/goals/useDeleteGoalContributionMutation";
import { IGoalContributionResponse } from "~/models/goal";
import { useLocale } from "~/providers/LocaleProvider/LocaleProvider";
import { usePrivacyMode } from "~/providers/PrivacyModeProvider/PrivacyModeProvider";
import { useUserSettings } from "~/providers/UserSettingsProvider/UserSettingsProvider";

interface GoalContributionsListProps {
  contributions: IGoalContributionResponse[];
}

const GoalContributionsList = (
  props: GoalContributionsListProps,
): React.ReactNode => {
  const { t } = useTranslation();
  const { dayjs, intlLocale, longDateFormat } = useLocale();
  const { preferredCurrency, decimalPlaces } = useUserSettings();
  const { isPrivacyModeEnabled } = usePrivacyMode();
  const deleteContributionMutation = useDeleteGoalContributionMutation();

  if (props.contributions.length === 0) {
    return (
      <BodyText tone="secondary" size="sm">
        {t("no_contributions")}
      </BodyText>
    );
  }

  return (
    <Stack gap="0.5rem">
      {props.contributions.map((contribution) => (
        <Card surface="sunken" key={contribution.id}>
          <Group justify="space-between" wrap="nowrap">
            <BodyText tone="secondary" size="sm">
              {dayjs(contribution.date).format(longDateFormat)}
            </BodyText>
            <Group gap="0.5rem" wrap="nowrap">
              <AmountText
                amount={contribution.amount}
                size="md"
                isSensitive={isPrivacyModeEnabled}
                locale={intlLocale}
                currency={preferredCurrency}
                decimalPlaces={decimalPlaces}
                signDisplay={SignDisplay.Auto}
              />
              <ActionIcon
                variant="ghost"
                color="error"
                size="compact-xs"
                aria-label={t("delete")}
                loading={
                  deleteContributionMutation.isPending &&
                  deleteContributionMutation.variables === contribution.id
                }
                onClick={() =>
                  deleteContributionMutation.mutate(contribution.id)
                }
              >
                <TrashIcon size={16} />
              </ActionIcon>
            </Group>
          </Group>
        </Card>
      ))}
    </Stack>
  );
};

export default GoalContributionsList;
