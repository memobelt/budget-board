import { Flex, Group, Stack } from "@mantine/core";
import {
  ActionIcon,
  Badge,
  BodyText,
  Button,
  Card,
  CaptionText,
  Tooltip,
} from "@teelur/budget-board-ui";
import { CheckIcon, PencilIcon, TrashIcon, Undo2Icon } from "lucide-react";
import React from "react";
import { useTranslation } from "react-i18next";
import {
  billDateFormat,
  BillMonthStatus,
  buildBillUpdateRequest,
  formatBillAccountLabel,
  getDueDateInMonth,
  IBillMonthEntry,
} from "~/helpers/bills";
import { SignDisplay } from "~/helpers/currency";
import { useDeleteBillMutation } from "~/hooks/mutations/bills/useDeleteBillMutation";
import { useUpdateBillMutation } from "~/hooks/mutations/bills/useUpdateBillMutation";
import { useSensitiveAmountFormatter } from "~/hooks/useSensitiveAmountFormatter";
import { IBillResponse } from "~/models/bill";

interface BillCardProps {
  bill: IBillResponse;
  entry: IBillMonthEntry;
  accountName: string | null;
  amountDue: number | null;
  onEdit: (bill: IBillResponse) => void;
}

const BillCard = (props: BillCardProps): React.ReactNode => {
  const { t } = useTranslation();
  const formatSensitiveAmount = useSensitiveAmountFormatter();

  const updateBillMutation = useUpdateBillMutation();
  const deleteBillMutation = useDeleteBillMutation();

  const isPaid = props.entry.status === BillMonthStatus.Paid;
  const accountLabel = formatBillAccountLabel(
    props.accountName,
    props.bill.accountLastFour,
  );

  const markPaid = () =>
    updateBillMutation.mutate(
      buildBillUpdateRequest(props.bill, {
        lastPaidDueDate: props.entry.dueDate.format(billDateFormat),
      }),
    );

  // Moves the last paid date back one month, so this due date is unpaid again.
  const undoPaid = () =>
    updateBillMutation.mutate(
      buildBillUpdateRequest(props.bill, {
        lastPaidDueDate: getDueDateInMonth(
          props.entry.dueDate.subtract(1, "month"),
          props.bill.dueDay,
        ).format(billDateFormat),
      }),
    );

  const getStatusBadge = () => {
    switch (props.entry.status) {
      case BillMonthStatus.Overdue:
        return (
          <Badge color="error" variant="light" size="xs">
            {t("overdue")}
          </Badge>
        );
      case BillMonthStatus.Paid:
        return (
          <Badge color="success" variant="light" size="xs">
            {t("paid")}
          </Badge>
        );
      default:
        return null;
    }
  };

  const getAmount = () => {
    // The amount actually paid isn't recorded, and a linked account's balance
    // no longer reflects a payment that has already been made.
    // Bills without an amount entered also show a dash.
    if ((isPaid && props.bill.useAccountBalance) || props.amountDue === null) {
      return "—";
    }
    return formatSensitiveAmount(props.amountDue, SignDisplay.Auto);
  };

  return (
    <Card>
      <Flex
        justify="space-between"
        align={{ base: "stretch", xs: "center" }}
        direction={{ base: "column", xs: "row" }}
        gap="0.5rem"
      >
        <Stack gap={0}>
          <Group gap="0.5rem">
            <BodyText tone="primary" size="lg" fw={500}>
              {props.bill.name}
            </BodyText>
            {getStatusBadge()}
          </Group>
          <CaptionText tone="secondary">
            {t("bill_due_date", {
              date: props.entry.dueDate.format("ll"),
            })}
            {accountLabel ? ` · ${accountLabel}` : ""}
          </CaptionText>
        </Stack>
        <Group gap="0.75rem" justify="space-between" wrap="nowrap">
          <Stack gap={0} align="flex-end">
            <BodyText
              tone={isPaid ? "secondary" : "primary"}
              size="lg"
              fw={600}
            >
              {getAmount()}
            </BodyText>
            {props.bill.useAccountBalance && !isPaid && (
              <CaptionText tone="muted">{t("bill_from_balance")}</CaptionText>
            )}
          </Stack>
          <Group gap="0.25rem" wrap="nowrap">
            {props.entry.isLastPaid && (
              <Tooltip label={t("bill_undo_paid")}>
                <ActionIcon
                  variant="ghost"
                  color="muted"
                  size="compact-md"
                  aria-label={t("bill_undo_paid")}
                  loading={updateBillMutation.isPending}
                  onClick={undoPaid}
                >
                  <Undo2Icon size="1rem" />
                </ActionIcon>
              </Tooltip>
            )}
            {props.entry.isNextDue && props.amountDue !== null && (
              <Button
                variant="filled"
                color="primary"
                size="compact-sm"
                leftSection={<CheckIcon size="0.9rem" />}
                loading={updateBillMutation.isPending}
                onClick={markPaid}
              >
                {t("bill_mark_paid")}
              </Button>
            )}
            <Tooltip label={t("edit")}>
              <ActionIcon
                variant="ghost"
                color="muted"
                size="compact-md"
                aria-label={t("edit")}
                onClick={() => props.onEdit(props.bill)}
              >
                <PencilIcon size="1rem" />
              </ActionIcon>
            </Tooltip>
            <Tooltip label={t("delete")}>
              <ActionIcon
                variant="ghost"
                color="error"
                size="compact-md"
                aria-label={t("delete")}
                loading={deleteBillMutation.isPending}
                onClick={() => deleteBillMutation.mutate(props.bill.id)}
              >
                <TrashIcon size="1rem" />
              </ActionIcon>
            </Tooltip>
          </Group>
        </Group>
      </Flex>
    </Card>
  );
};

export default BillCard;
