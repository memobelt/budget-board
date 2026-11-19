import { Group } from "@mantine/core";
import { Button, DateInput, NumberInput } from "@teelur/budget-board-ui";
import { useField } from "@mantine/form";
import { DateValue } from "@mantine/dates";
import { PlusIcon } from "lucide-react";
import React from "react";
import { useTranslation } from "react-i18next";
import { useAddGoalContributionMutation } from "~/hooks/mutations/goals/useAddGoalContributionMutation";
import { useLocale } from "~/providers/LocaleProvider/LocaleProvider";
import { useUserSettings } from "~/providers/UserSettingsProvider/UserSettingsProvider";

interface AddGoalContributionProps {
  goalId: string;
  showDate?: boolean;
}

/**
 * Inline form for logging a contribution (or a withdrawal, as a negative amount)
 * towards a goal that is not linked to any accounts.
 */
const AddGoalContribution = (
  props: AddGoalContributionProps,
): React.ReactNode => {
  const { t } = useTranslation();
  const {
    dayjs,
    dayjsLocale,
    longDateFormat,
    currencySymbol,
    thousandsSeparator,
    decimalSeparator,
  } = useLocale();
  const { decimalPlaces } = useUserSettings();
  const addContributionMutation = useAddGoalContributionMutation();

  const amountField = useField<number | string>({ initialValue: "" });
  const dateField = useField<DateValue>({ initialValue: new Date() });

  const amount = Number(amountField.getValue());
  const isValid = amountField.getValue() !== "" && amount !== 0;

  const submit = () => {
    if (!isValid) {
      return;
    }

    const parsedDate = dayjs(dateField.getValue());
    addContributionMutation.mutate(
      {
        goalID: props.goalId,
        amount,
        date: parsedDate.isValid() ? parsedDate.format("YYYY-MM-DD") : null,
      },
      {
        onSuccess: () => {
          amountField.reset();
        },
      },
    );
  };

  return (
    <Group
      gap="0.5rem"
      wrap="nowrap"
      align="flex-end"
      onClick={(e) => e.stopPropagation()}
    >
      <NumberInput
        size="xs"
        flex="1 1 auto"
        placeholder={t("add_contribution")}
        prefix={currencySymbol}
        decimalScale={decimalPlaces}
        thousandSeparator={thousandsSeparator}
        decimalSeparator={decimalSeparator}
        {...amountField.getInputProps()}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            submit();
          }
        }}
      />
      {props.showDate && (
        <DateInput
          size="xs"
          maw={160}
          locale={dayjsLocale}
          valueFormat={longDateFormat}
          {...dateField.getInputProps()}
        />
      )}
      <Button
        variant="filled"
        color="primary"
        size="compact-sm"
        disabled={!isValid}
        loading={addContributionMutation.isPending}
        onClick={submit}
        aria-label={t("add_contribution")}
      >
        <PlusIcon size={16} />
      </Button>
    </Group>
  );
};

export default AddGoalContribution;
