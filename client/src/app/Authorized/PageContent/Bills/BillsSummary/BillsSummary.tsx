import { SimpleGrid, Stack } from "@mantine/core";
import { BodyText, Card, CaptionText } from "@teelur/budget-board-ui";
import React from "react";
import { useTranslation } from "react-i18next";
import { SignDisplay } from "~/helpers/currency";
import { useSensitiveAmountFormatter } from "~/hooks/useSensitiveAmountFormatter";

interface BillsSummaryProps {
  monthLabel: string;
  remaining: number;
  remainingCount: number;
  overdue: number;
  overdueCount: number;
  paidCount: number;
  totalCount: number;
}

const BillsSummary = (props: BillsSummaryProps): React.ReactNode => {
  const { t } = useTranslation();
  const formatSensitiveAmount = useSensitiveAmountFormatter();

  const items = [
    {
      label: t("bills_left_to_pay", { month: props.monthLabel }),
      value: formatSensitiveAmount(props.remaining, SignDisplay.Auto),
      detail: t("bills_count", { count: props.remainingCount }),
    },
    {
      label: t("bills_overdue"),
      value: formatSensitiveAmount(props.overdue, SignDisplay.Auto),
      detail: t("bills_count", { count: props.overdueCount }),
    },
    {
      label: t("bills_paid"),
      value: t("bills_paid_fraction", {
        paid: props.paidCount,
        total: props.totalCount,
      }),
      detail: t("bills_paid_description"),
    },
  ];

  return (
    <SimpleGrid cols={{ base: 1, xs: 3 }} spacing="0.5rem">
      {items.map((item) => (
        <Card key={item.label}>
          <Stack gap="0.125rem">
            <CaptionText tone="secondary">{item.label}</CaptionText>
            <BodyText tone="primary" size="xl" fw={600}>
              {item.value}
            </BodyText>
            <CaptionText tone="muted">{item.detail}</CaptionText>
          </Stack>
        </Card>
      ))}
    </SimpleGrid>
  );
};

export default BillsSummary;
