import { ActionIcon } from "@teelur/budget-board-ui";
import { EqualIcon } from "lucide-react";
import React from "react";
import { useTranslation } from "react-i18next";
import { convertNumberToCurrency, SignDisplay } from "~/helpers/currency";
import { useLocale } from "~/providers/LocaleProvider/LocaleProvider";
import { usePrivacyMode } from "~/providers/PrivacyModeProvider/PrivacyModeProvider";
import { useUserSettings } from "~/providers/UserSettingsProvider/UserSettingsProvider";

interface MatchSpendingButtonProps {
  /** The limit that matches what's been spent (or received, for income). */
  matchingLimit: number;
  currentLimit: number;
  onMatch: (limit: number) => void;
}

/**
 * Sets a budget's limit to the amount actually used this month. Disabled when
 * the limit already matches.
 */
const MatchSpendingButton = (
  props: MatchSpendingButtonProps,
): React.ReactNode => {
  const { t } = useTranslation();
  const { intlLocale } = useLocale();
  const { preferredCurrency } = useUserSettings();
  const { isPrivacyModeEnabled } = usePrivacyMode();

  const label = t("match_limit_to_amount_used", {
    amount: isPrivacyModeEnabled
      ? "••••"
      : convertNumberToCurrency(
          props.matchingLimit,
          0,
          preferredCurrency,
          SignDisplay.Auto,
          intlLocale,
        ),
  });

  return (
    <ActionIcon
      variant="outline"
      color="primary"
      size="compact-sm"
      h="100%"
      aria-label={label}
      title={label}
      disabled={Math.round(props.currentLimit) === props.matchingLimit}
      onClick={(e) => {
        e.stopPropagation();
        props.onMatch(props.matchingLimit);
      }}
    >
      <EqualIcon size="1rem" />
    </ActionIcon>
  );
};

export default MatchSpendingButton;
