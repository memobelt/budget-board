import { Stack, Group } from "@mantine/core";
import { Button, HeadingText } from "@teelur/budget-board-ui";
import React from "react";
import { filterVisibleAccounts } from "~/helpers/accounts";
import AccountMappingItem from "./AccountMappingItem/AccountMappingItem";
import { ITransactionImportTableData } from "~/models/transaction";
import { MoveLeftIcon } from "lucide-react";
import {
  findClosestAccountId,
  getMappedAccountId,
} from "~/helpers/transactionImport";
import { useTranslation } from "react-i18next";
import { useAccountsQuery } from "~/hooks/queries/useAccountsQuery";

export interface IAccountItem {
  value: string;
  label: string;
}

interface AccountMappingProps {
  importedTransactions: ITransactionImportTableData[];
  accountNameToAccountIdMap: Map<string, string>;
  setAccountNameToAccountIdMap: React.Dispatch<
    React.SetStateAction<Map<string, string>>
  >;
  goBackToPreviousDialog: () => void;
  advanceToNextDialog: (
    filteredImportData: ITransactionImportTableData[],
    accountMap: Map<string, string>,
  ) => void;
}

const AccountMapping = (props: AccountMappingProps) => {
  const { t } = useTranslation();

  const accountsQuery = useAccountsQuery();

  const filteredAccounts: IAccountItem[] = filterVisibleAccounts(
    accountsQuery.data ?? [],
  )
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((account) => ({
      value: account.id,
      label: account.name,
    }));

  // Pre-fill each unmapped account with the closest saved account, once per
  // name, so clearing a suggestion doesn't bring it back.
  const prefilledAccountNamesRef = React.useRef(new Set<string>());
  React.useEffect(() => {
    if (filteredAccounts.length === 0) {
      return;
    }

    const suggestions = new Map<string, string>();
    props.accountNameToAccountIdMap.forEach((accountId, accountName) => {
      if (accountId || prefilledAccountNamesRef.current.has(accountName)) {
        return;
      }
      prefilledAccountNamesRef.current.add(accountName);

      const closestAccountId = findClosestAccountId(
        accountName,
        filteredAccounts,
      );
      if (closestAccountId) {
        suggestions.set(accountName, closestAccountId);
      }
    });

    if (suggestions.size > 0) {
      props.setAccountNameToAccountIdMap((prev) => {
        const newMap = new Map(prev);
        suggestions.forEach((accountId, accountName) => {
          // Only fill what's still unmapped.
          if (!newMap.get(accountName)) {
            newMap.set(accountName, accountId);
          }
        });
        return newMap;
      });
    }
  }, [accountsQuery.data, props.accountNameToAccountIdMap]);

  const filteredImportData = props.importedTransactions
    .filter(
      (t) =>
        getMappedAccountId(props.accountNameToAccountIdMap, t.account) !== "" &&
        getMappedAccountId(props.accountNameToAccountIdMap, t.account) !==
          "exclude",
    )
    .map((transaction) => ({
      ...transaction,
      account: transaction.account?.trim() ?? null,
    }));

  return (
    <Stack gap="0.5rem" w={800} maw="100%" mx="auto">
      <HeadingText tone="heading" level={5}>
        {t("account_mapping")}
      </HeadingText>
      {Array.from(props.accountNameToAccountIdMap.entries()).map(
        ([accountName, accountId]) => (
          <AccountMappingItem
            key={accountName}
            accountName={accountName}
            accountId={accountId}
            accounts={filteredAccounts}
            onAccountChange={(name, id) =>
              props.setAccountNameToAccountIdMap((prev) => {
                const newMap = new Map(prev);
                newMap.set(name, id);
                return newMap;
              })
            }
          />
        ),
      )}
      <Group w="100%">
        <Button
          variant="filled"
          color="primary"
          size="compact-sm"
          flex="1 1 auto"
          leftSection={<MoveLeftIcon size={16} />}
          onClick={() => props.goBackToPreviousDialog()}
        >
          {t("back")}
        </Button>
        <Button
          variant="filled"
          color="primary"
          size="compact-sm"
          flex="1 1 auto"
          disabled={filteredImportData.length === 0}
          onClick={() =>
            props.advanceToNextDialog(
              filteredImportData,
              props.accountNameToAccountIdMap,
            )
          }
        >
          {t("next")}
        </Button>
      </Group>
    </Stack>
  );
};

export default AccountMapping;
