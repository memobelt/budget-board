import { Group, Skeleton, Stack } from "@mantine/core";
import { BodyText, Button, Tooltip } from "@teelur/budget-board-ui";
import { useDisclosure } from "@mantine/hooks";
import { AxiosError } from "axios";
import { CheckCheckIcon, InfoIcon, PlusIcon } from "lucide-react";
import React from "react";
import { useTranslation } from "react-i18next";
import {
  billDateFormat,
  BillMonthStatus,
  buildBillUpdateRequest,
  getBillAmountDue,
  getBillMonthEntry,
} from "~/helpers/bills";
import { NotificationType, showNotification } from "~/helpers/notifications";
import { translateAxiosError } from "~/helpers/requests";
import { useAccountsQuery } from "~/hooks/queries/useAccountsQuery";
import { useBillsQuery } from "~/hooks/queries/useBillsQuery";
import { useUpdateBillMutation } from "~/hooks/mutations/bills/useUpdateBillMutation";
import { IBillResponse } from "~/models/bill";
import { useLocale } from "~/providers/LocaleProvider/LocaleProvider";
import BillCard from "./BillCard/BillCard";
import BillModal from "./BillModal/BillModal";
import BillsMonthSelect from "./BillsMonthSelect/BillsMonthSelect";
import BillsSummary from "./BillsSummary/BillsSummary";

const Bills = (): React.ReactNode => {
  const { t } = useTranslation();
  const { dayjs } = useLocale();

  const billsQuery = useBillsQuery();
  const accountsQuery = useAccountsQuery();
  const updateBillMutation = useUpdateBillMutation();
  const [isMarkingAllPaid, setIsMarkingAllPaid] = React.useState(false);

  const [month, setMonth] = React.useState(() => dayjs().startOf("month"));
  const [isModalOpen, { open: openModal, close: closeModal }] = useDisclosure();
  const [editingBill, setEditingBill] = React.useState<IBillResponse | null>(
    null,
  );

  React.useEffect(() => {
    if (billsQuery.isError) {
      showNotification({
        type: NotificationType.Error,
        message: translateAxiosError(billsQuery.error as AxiosError),
      });
    }
  }, [billsQuery.isError]);

  const today = dayjs();
  const todayKey = today.format("YYYY-MM-DD");
  const monthKey = month.format("YYYY-MM");

  const rows = React.useMemo(() => {
    const accounts = accountsQuery.data ?? [];
    return (billsQuery.data ?? [])
      .flatMap((bill) => {
        const entry = getBillMonthEntry(bill, month, today);
        if (!entry) {
          return [];
        }
        return [
          {
            bill,
            entry,
            amountDue: getBillAmountDue(bill, accounts),
            accountName:
              accounts.find((a) => a.id === bill.accountID)?.name ?? null,
          },
        ];
      })
      .sort(
        (a, b) =>
          a.entry.dueDate.valueOf() - b.entry.dueDate.valueOf() ||
          a.bill.name.localeCompare(b.bill.name),
      );
    // today and month are compared by their keys so the list only recomputes when they change.
  }, [billsQuery.data, accountsQuery.data, todayKey, monthKey]);

  const summary = React.useMemo(() => {
    const unpaid = rows.filter((r) => r.entry.status !== BillMonthStatus.Paid);
    const overdue = rows.filter(
      (r) => r.entry.status === BillMonthStatus.Overdue,
    );
    const sum = (items: typeof rows) =>
      items.reduce((total, r) => total + r.amountDue, 0);

    return {
      monthLabel: month.format("MMMM YYYY"),
      remaining: sum(unpaid),
      remainingCount: unpaid.length,
      overdue: sum(overdue),
      overdueCount: overdue.length,
      paidCount: rows.length - unpaid.length,
      totalCount: rows.length,
    };
  }, [rows]);

  // Only each bill's earliest unpaid due date can be marked paid, so payments stay in order.
  const payableRows = rows.filter((r) => r.entry.isNextDue);

  const markAllPaid = async () => {
    setIsMarkingAllPaid(true);
    try {
      await Promise.allSettled(
        payableRows.map((r) =>
          updateBillMutation.mutateAsync(
            buildBillUpdateRequest(r.bill, {
              lastPaidDueDate: r.entry.dueDate.format(billDateFormat),
            }),
          ),
        ),
      );
    } finally {
      setIsMarkingAllPaid(false);
    }
  };

  const openAdd = () => {
    setEditingBill(null);
    openModal();
  };

  const openEdit = (bill: IBillResponse) => {
    setEditingBill(bill);
    openModal();
  };

  const getContent = () => {
    if (billsQuery.isPending || accountsQuery.isPending) {
      return <Skeleton h={100} w="100%" radius="lg" />;
    }

    if (rows.length === 0) {
      return (
        <Group justify="center" align="center" gap="0.5rem">
          <InfoIcon size={20} color="var(--bbui-color-text-muted)" />
          <BodyText tone="muted" size="sm">
            {(billsQuery.data ?? []).length === 0
              ? t("no_bills", "No bills found.")
              : t("no_bills_this_month")}
          </BodyText>
        </Group>
      );
    }

    return (
      <Stack gap="0.5rem">
        {rows.map((row) => (
          <BillCard
            key={row.bill.id}
            bill={row.bill}
            entry={row.entry}
            accountName={row.accountName}
            amountDue={row.amountDue}
            onEdit={openEdit}
          />
        ))}
      </Stack>
    );
  };

  return (
    <Stack w="100%" maw={1400} gap="0.75rem">
      <BillModal isOpen={isModalOpen} onClose={closeModal} bill={editingBill} />
      <Group justify="space-between" gap="0.5rem">
        <BillsMonthSelect month={month} setMonth={setMonth} />
        <Group gap="0.5rem" wrap="nowrap">
          <Tooltip label={t("bills_mark_all_paid_description")}>
            <Button
              variant="outline"
              color="primary"
              size="compact-sm"
              leftSection={<CheckCheckIcon size="1rem" />}
              disabled={payableRows.length === 0}
              loading={isMarkingAllPaid}
              onClick={markAllPaid}
            >
              {t("bills_mark_all_paid")}
            </Button>
          </Tooltip>
          <Button
            variant="filled"
            color="primary"
            size="compact-sm"
            aria-label={t("add_bill")}
            onClick={openAdd}
          >
            <PlusIcon size={22} />
          </Button>
        </Group>
      </Group>
      <BillsSummary {...summary} />
      {getContent()}
    </Stack>
  );
};

export default Bills;
