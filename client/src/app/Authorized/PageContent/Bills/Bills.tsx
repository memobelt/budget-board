import { Group, Stack } from "@mantine/core";
import { BodyText } from "@teelur/budget-board-ui";
import { InfoIcon } from "lucide-react";
import React from "react";
import { useTranslation } from "react-i18next";

const Bills = (): React.ReactNode => {
  const { t } = useTranslation();

  return (
    <Stack w="100%" maw={1400} gap="0.75rem">
      <Group justify="center" align="center" gap="0.5rem">
        <InfoIcon size={20} color="var(--bbui-color-text-muted)" />
        <BodyText tone="muted" size="sm">
          {t("no_bills", "No bills found.")}
        </BodyText>
      </Group>
    </Stack>
  );
};

export default Bills;
