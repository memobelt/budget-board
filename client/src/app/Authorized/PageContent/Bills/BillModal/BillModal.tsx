import { Group, Stack } from "@mantine/core";
import {
  Button,
  Checkbox,
  Modal,
  NumberInput,
  Select,
  TextInput,
} from "@teelur/budget-board-ui";
import React from "react";
import { useTranslation } from "react-i18next";
import { useAccountsQuery } from "~/hooks/queries/useAccountsQuery";
import { useCreateBillMutation } from "~/hooks/mutations/bills/useCreateBillMutation";
import { useUpdateBillMutation } from "~/hooks/mutations/bills/useUpdateBillMutation";
import { buildBillUpdateRequest } from "~/helpers/bills";
import { IBillResponse } from "~/models/bill";
import { useLocale } from "~/providers/LocaleProvider/LocaleProvider";
import { useUserSettings } from "~/providers/UserSettingsProvider/UserSettingsProvider";

interface BillModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** The bill to edit. When null, the modal creates a new bill. */
  bill: IBillResponse | null;
}

const toNumber = (value: string | number): number =>
  typeof value === "number" ? value : Number.parseFloat(value) || 0;

const BillModal = (props: BillModalProps): React.ReactNode => {
  const { t } = useTranslation();
  const { thousandsSeparator, decimalSeparator, currencySymbol } = useLocale();
  const { decimalPlaces } = useUserSettings();

  const accountsQuery = useAccountsQuery();
  const createBillMutation = useCreateBillMutation();
  const updateBillMutation = useUpdateBillMutation();

  const [name, setName] = React.useState("");
  const [accountId, setAccountId] = React.useState<string | null>(null);
  const [useAccountBalance, setUseAccountBalance] = React.useState(false);
  const [amount, setAmount] = React.useState<number>(0);
  const [dueDay, setDueDay] = React.useState<number>(1);

  React.useEffect(() => {
    if (!props.isOpen) {
      return;
    }
    setName(props.bill?.name ?? "");
    setAccountId(props.bill?.accountID ?? null);
    setUseAccountBalance(props.bill?.useAccountBalance ?? false);
    setAmount(props.bill?.amount ?? 0);
    setDueDay(props.bill?.dueDay ?? 1);
  }, [props.isOpen, props.bill]);

  const accountOptions = (accountsQuery.data ?? [])
    .filter((account) => account.deleted === null || account.id === accountId)
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((account) => ({ value: account.id, label: account.name }));

  const isValid =
    name.trim().length > 0 &&
    dueDay >= 1 &&
    dueDay <= 31 &&
    amount >= 0 &&
    (!useAccountBalance || accountId !== null);

  const isSaving = createBillMutation.isPending || updateBillMutation.isPending;

  const save = () => {
    const fields = {
      name: name.trim(),
      amount: useAccountBalance ? 0 : amount,
      dueDay,
      useAccountBalance,
      accountID: accountId,
    };

    if (props.bill) {
      updateBillMutation.mutate(buildBillUpdateRequest(props.bill, fields), {
        onSuccess: props.onClose,
      });
    } else {
      createBillMutation.mutate(fields, { onSuccess: props.onClose });
    }
  };

  return (
    <Modal
      opened={props.isOpen}
      onClose={props.onClose}
      title={props.bill ? t("edit_bill") : t("add_bill")}
    >
      <Stack gap="0.75rem">
        <TextInput
          label={t("bill_name")}
          placeholder={t("enter_bill_name")}
          value={name}
          onChange={(e) => setName(e.currentTarget.value)}
          maxLength={100}
        />
        <Select
          label={t("account")}
          description={t("bill_account_description")}
          placeholder={t("select_account")}
          data={accountOptions}
          searchable
          clearable
          value={accountId}
          onChange={(value) => {
            setAccountId(value);
            if (!value) {
              setUseAccountBalance(false);
            }
          }}
        />
        <Checkbox
          label={t("bill_use_account_balance")}
          disabled={accountId === null}
          checked={useAccountBalance}
          onChange={(e) => setUseAccountBalance(e.currentTarget.checked)}
        />
        {!useAccountBalance && (
          <NumberInput
            label={t("amount")}
            prefix={currencySymbol}
            min={0}
            decimalScale={decimalPlaces}
            thousandSeparator={thousandsSeparator}
            decimalSeparator={decimalSeparator}
            value={amount}
            onChange={(value) => setAmount(toNumber(value))}
          />
        )}
        <NumberInput
          label={t("bill_due_day")}
          description={t("bill_due_day_description")}
          min={1}
          max={31}
          allowDecimal={false}
          allowNegative={false}
          clampBehavior="strict"
          value={dueDay}
          onChange={(value) => setDueDay(Math.trunc(toNumber(value)))}
        />
        <Group justify="flex-end" mt="0.5rem">
          <Button
            variant="ghost"
            color="muted"
            size="sm"
            onClick={props.onClose}
          >
            {t("cancel")}
          </Button>
          <Button
            variant="filled"
            color="primary"
            size="sm"
            disabled={!isValid}
            loading={isSaving}
            onClick={save}
          >
            {t("save")}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
};

export default BillModal;
