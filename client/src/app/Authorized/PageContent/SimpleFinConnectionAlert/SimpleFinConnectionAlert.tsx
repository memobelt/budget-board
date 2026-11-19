import { Group, List, Stack } from "@mantine/core";
import { Alert, BodyText, Button } from "@teelur/budget-board-ui";
import { CloudAlertIcon, ExternalLinkIcon } from "lucide-react";
import React from "react";
import { useTranslation } from "react-i18next";
import { useApplicationUserQuery } from "~/hooks/queries/useApplicationUserQuery";

const SIMPLEFIN_BRIDGE_URL = "https://beta-bridge.simplefin.org/";

const DISMISSED_STORAGE_KEY = "simpleFinConnectionAlertDismissed";

const readDismissedKey = (): string | null => {
  try {
    return window.localStorage.getItem(DISMISSED_STORAGE_KEY);
  } catch {
    return null;
  }
};

const writeDismissedKey = (key: string): void => {
  try {
    window.localStorage.setItem(DISMISSED_STORAGE_KEY, key);
  } catch {
    // Storage can be unavailable (e.g. private browsing); the alert just won't stay dismissed.
  }
};

/**
 * Banner shown when the last SimpleFIN sync could not connect (revoked access, expired
 * subscription, SimpleFIN outage, or a bank connection that needs attention).
 * Dismissing it hides it until a different connection problem occurs.
 */
const SimpleFinConnectionAlert = (): React.ReactNode => {
  const { t } = useTranslation();
  const applicationUserQuery = useApplicationUserQuery();

  const user = applicationUserQuery.data;
  const errors = user?.simpleFinConnectionErrors ?? [];
  const alertKey = `${user?.simpleFinConnectionErrorDate ?? ""}|${errors.join("|")}`;

  const [dismissedKey, setDismissedKey] = React.useState<string | null>(
    readDismissedKey,
  );

  if (!user?.simpleFinAccessToken || errors.length === 0) {
    return null;
  }

  if (dismissedKey === alertKey) {
    return null;
  }

  const onDismiss = () => {
    writeDismissedKey(alertKey);
    setDismissedKey(alertKey);
  };

  return (
    <Alert
      variant="light"
      color="error"
      icon={<CloudAlertIcon size={16} />}
      title={t("simplefin_connection_error_title")}
      withCloseButton
      closeButtonLabel={t("dismiss")}
      onClose={onDismiss}
      w="100%"
    >
      <Stack gap="xs">
        {errors.length === 1 ? (
          <BodyText size="sm">{errors[0]}</BodyText>
        ) : (
          <List size="sm">
            {errors.map((error) => (
              <List.Item key={error}>{error}</List.Item>
            ))}
          </List>
        )}
        <BodyText size="sm" tone="secondary">
          {t("simplefin_connection_error_hint")}
        </BodyText>
        <Group>
          <Button
            variant="filled"
            color="error"
            size="compact-sm"
            rightSection={<ExternalLinkIcon size={14} />}
            onClick={() =>
              window.open(SIMPLEFIN_BRIDGE_URL, "_blank", "noopener,noreferrer")
            }
          >
            {t("simplefin_connection_error_action")}
          </Button>
        </Group>
      </Stack>
    </Alert>
  );
};

export default SimpleFinConnectionAlert;
