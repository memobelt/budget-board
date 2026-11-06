import { Stack } from "@mantine/core";
import { UseFieldReturnType } from "@mantine/form";
import React from "react";
import { useTranslation } from "react-i18next";
import { NumberInput } from "@teelur/budget-board-ui";
import { useLocale } from "~/providers/LocaleProvider/LocaleProvider";
import { useUserSettings } from "~/providers/UserSettingsProvider/UserSettingsProvider";

interface ManualGoalOptionsProps {
  targetAmountField: UseFieldReturnType<number, "input", "controlled">;
  startingAmountField: UseFieldReturnType<number, "input", "controlled">;
}

const ManualGoalOptions = (props: ManualGoalOptionsProps): React.ReactNode => {
  const { t } = useTranslation();
  const { thousandsSeparator, decimalSeparator, currencySymbol } = useLocale();
  const { decimalPlaces } = useUserSettings();

  return (
    <Stack gap={"0.5rem"}>
      <NumberInput
        label={t("target_amount")}
        placeholder={t("enter_target_amount")}
        prefix={currencySymbol}
        min={0}
        decimalScale={decimalPlaces}
        thousandSeparator={thousandsSeparator}
        decimalSeparator={decimalSeparator}
        {...props.targetAmountField.getInputProps()}
      />
      <NumberInput
        label={t("amount_already_saved")}
        description={t("amount_already_saved_description")}
        prefix={currencySymbol}
        min={0}
        decimalScale={decimalPlaces}
        thousandSeparator={thousandsSeparator}
        decimalSeparator={decimalSeparator}
        {...props.startingAmountField.getInputProps()}
      />
    </Stack>
  );
};

export default ManualGoalOptions;
