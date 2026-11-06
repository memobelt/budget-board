import classes from "./GoalCardContent.module.css";

import { Flex, Group, Stack } from "@mantine/core";
import {
  ActionIcon,
  Badge,
  AmountText,
  Progress,
  BodyText,
} from "@teelur/budget-board-ui";
import React from "react";
import { useUserSettings } from "~/providers/UserSettingsProvider/UserSettingsProvider";
import { SignDisplay } from "~/helpers/currency";
import { getGoalCurrentAmount, getGoalTargetAmount } from "~/helpers/goals";
import { IGoalResponse } from "~/models/goal";
import { PencilIcon } from "lucide-react";
import { useSensitiveAmountFormatter } from "~/hooks/useSensitiveAmountFormatter";
import { StatusColorType } from "~/helpers/budgets";
import { Trans, useTranslation } from "react-i18next";
import { useLocale } from "~/providers/LocaleProvider/LocaleProvider";
import { usePrivacyMode } from "~/providers/PrivacyModeProvider/PrivacyModeProvider";

interface GoalCardContentProps {
  goal: IGoalResponse;
  includeInterest: boolean;
  toggleIsSelected: () => void;
}

const GoalCardContent = (props: GoalCardContentProps): React.ReactNode => {
  const { t } = useTranslation();
  const { dayjs, intlLocale } = useLocale();
  const { preferredCurrency } = useUserSettings();
  const { isPrivacyModeEnabled } = usePrivacyMode();
  const formatAmount = useSensitiveAmountFormatter();
  // A goal with neither a target date nor a monthly contribution has nothing to project.
  const isOpenEnded =
    props.goal.completeDate === null &&
    !props.goal.isMonthlyContributionEditable;
  const formatSensitiveAmount = (amount: number): string =>
    formatAmount(amount, SignDisplay.Auto, undefined, 0);

  return (
    <Group style={{ containerType: "inline-size" }} wrap="nowrap">
      <Stack w="100%" gap="0.1rem">
        <Flex className={classes.header}>
          <Group align="center" gap={10} wrap="nowrap">
            <BodyText tone="primary" size="lg" fw={500}>
              {props.goal.name}
            </BodyText>
            {props.includeInterest && props.goal.interestRate && (
              <Badge variant="light" color="primary" size="xs">
                {t("interest_rate_apr", {
                  rate: new Intl.NumberFormat(intlLocale, {
                    style: "percent",
                    maximumFractionDigits: 2,
                  }).format(props.goal.interestRate),
                })}
              </Badge>
            )}
            {props.goal.isManual && (
              <Badge variant="light" color="secondary" size="xs">
                {t("manual")}
              </Badge>
            )}
            <ActionIcon
              variant="ghost"
              color="primary"
              size="compact-xs"
              onClick={(e) => {
                e.stopPropagation();
                props.toggleIsSelected();
              }}
            >
              <PencilIcon size={16} />
            </ActionIcon>
          </Group>
          <Flex justify="flex-end" align="center" gap="0.25rem">
            <Trans
              i18nKey="x_of_y"
              components={[
                <AmountText
                  amount={getGoalCurrentAmount(props.goal)}
                  disableStatusColor
                  size="lg"
                  isSensitive={isPrivacyModeEnabled}
                  locale={intlLocale}
                  currency={preferredCurrency}
                  decimalPlaces={0}
                  signDisplay={SignDisplay.Auto}
                  invertSign={false}
                  key="amount"
                />,
                <BodyText tone="secondary" size="md" key="of" />,
                <AmountText
                  amount={getGoalTargetAmount(
                    props.goal.amount,
                    props.goal.initialAmount,
                  )}
                  disableStatusColor
                  size="lg"
                  isSensitive={isPrivacyModeEnabled}
                  locale={intlLocale}
                  currency={preferredCurrency}
                  decimalPlaces={0}
                  signDisplay={SignDisplay.Auto}
                  invertSign={false}
                  key="total"
                />,
              ]}
            />
          </Flex>
        </Flex>
        <Progress
          value={props.goal.percentComplete}
          size="md"
          label
          ariaLabel={props.goal.name}
        />
        <Flex className={classes.footer}>
          <Group align="center" gap="0.25rem">
            <BodyText tone="secondary" size="sm" key="label">
              {t("projected_colon")}
            </BodyText>
            <BodyText tone="primary" size="sm" key="date-not-edit">
              {props.goal.completeDate
                ? dayjs(props.goal.completeDate).format("MMMM YYYY")
                : t("no_target_date")}
            </BodyText>
          </Group>
          <Flex justify="flex-end" align="center" gap="0.25rem">
            {isOpenEnded ? (
              <Trans
                i18nKey="x_this_month"
                components={[
                  <AmountText
                    amount={props.goal.monthlyContributionProgress}
                    size="md"
                    disableStatusColor
                    isSensitive={isPrivacyModeEnabled}
                    locale={intlLocale}
                    currency={preferredCurrency}
                    decimalPlaces={0}
                    key="amount"
                  />,
                  <BodyText tone="secondary" size="sm" key="this_month" />,
                ]}
              />
            ) : (
              <Trans
                i18nKey="x_of_y_this_month"
                values={{
                  total: formatSensitiveAmount(props.goal.monthlyContribution),
                }}
                components={[
                  <AmountText
                    amount={props.goal.monthlyContributionProgress}
                    size="md"
                    total={props.goal.monthlyContribution}
                    type={StatusColorType.Target}
                    isSensitive={isPrivacyModeEnabled}
                    locale={intlLocale}
                    currency={preferredCurrency}
                    decimalPlaces={0}
                    key="amount"
                  />,
                  <BodyText tone="secondary" size="sm" key="of" />,
                  <AmountText
                    amount={props.goal.monthlyContribution}
                    size="md"
                    disableStatusColor
                    isSensitive={isPrivacyModeEnabled}
                    locale={intlLocale}
                    currency={preferredCurrency}
                    decimalPlaces={0}
                    key="total-not-edit"
                  />,
                ]}
              />
            )}
          </Flex>
        </Flex>
      </Stack>
    </Group>
  );
};

export default GoalCardContent;
