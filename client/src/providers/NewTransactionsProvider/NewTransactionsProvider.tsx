import React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AxiosResponse } from "axios";
import { useAuth } from "~/providers/AuthProvider/AuthProvider";
import { useTransactionFilters } from "~/providers/TransactionFiltersProvider/TransactionFiltersProvider";
import {
  applicationUserQueryKey,
  newTransactionsQueryKey,
  transactionsQueryKey,
} from "~/helpers/requests";
import { IApplicationUserVisitResponse } from "~/models/applicationUser";
import { Filters, ITransaction } from "~/models/transaction";
import { isTransactionNewSince } from "~/helpers/transactions";

interface NewTransactionsContextType {
  /**
   * Synced transactions added after this time are new; null until loaded.
   * Only moves forward when the user marks transactions as seen.
   */
  newSince: Date | null;
  /** Synced transactions not yet marked as seen, most recent first. */
  newTransactions: ITransaction[];
  isNewTransactionsPending: boolean;
  isNewTransaction: (transaction: ITransaction) => boolean;
  /** Clears the "new" marks on everything synced so far. */
  markAllSeen: () => Promise<void>;
  isMarkingSeen: boolean;
  /** Opens the transactions page showing only the new transactions. */
  showNewTransactions: () => void;
}

const NewTransactionsContext = React.createContext<NewTransactionsContextType>({
  newSince: null,
  newTransactions: [],
  isNewTransactionsPending: false,
  isNewTransaction: () => false,
  markAllSeen: async () => {},
  isMarkingSeen: false,
  showNewTransactions: () => {},
});

interface NewTransactionsProviderProps {
  children: React.ReactNode;
}

export const NewTransactionsProvider = (
  props: NewTransactionsProviderProps,
): React.ReactNode => {
  const { request } = useAuth();
  // `request` changes on every render of the auth provider; keep the latest one
  // in a ref so the visit effects below don't re-run each time.
  const requestRef = React.useRef(request);
  React.useEffect(() => {
    requestRef.current = request;
  });
  const queryClient = useQueryClient();
  const { navigateToTransactions } = useTransactionFilters();

  const [newSince, setNewSince] = React.useState<Date | null>(null);
  const [isMarkingSeen, setIsMarkingSeen] = React.useState(false);

  const applyVisitResponse = React.useCallback(
    (response: IApplicationUserVisitResponse) => {
      const next = new Date(response.newTransactionsSince);
      if (Number.isNaN(next.getTime())) {
        return;
      }
      setNewSince((previous) =>
        previous?.getTime() === next.getTime() ? previous : next,
      );
    },
    [],
  );

  const recordVisit = React.useCallback(async () => {
    try {
      const res: AxiosResponse = await requestRef.current({
        url: "/api/applicationUser/visit",
        method: "POST",
      });
      applyVisitResponse(res.data as IApplicationUserVisitResponse);
    } catch {
      // Not being able to reach the server only means nothing is marked new.
    }
  }, [applyVisitResponse]);

  // Load when the app opens, and again when the tab comes back into view in
  // case transactions were marked as seen on another device.
  React.useEffect(() => {
    void recordVisit();

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void recordVisit();
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", onVisibilityChange);
  }, [recordVisit]);

  const newTransactionsQuery = useQuery({
    queryKey: [
      transactionsQueryKey,
      newTransactionsQueryKey,
      newSince?.toISOString() ?? null,
    ],
    queryFn: async (): Promise<ITransaction[]> => {
      const res: AxiosResponse = await requestRef.current({
        url: "/api/transaction/new",
        method: "GET",
      });
      return res.data as ITransaction[];
    },
    enabled: newSince !== null,
  });

  const isNewTransaction = React.useCallback(
    (transaction: ITransaction) => isTransactionNewSince(transaction, newSince),
    [newSince],
  );

  const markAllSeen = React.useCallback(async () => {
    setIsMarkingSeen(true);
    try {
      const res: AxiosResponse = await requestRef.current({
        url: "/api/applicationUser/markTransactionsSeen",
        method: "POST",
      });
      applyVisitResponse(res.data as IApplicationUserVisitResponse);
      await queryClient.invalidateQueries({
        queryKey: [applicationUserQueryKey],
      });
    } finally {
      setIsMarkingSeen(false);
    }
  }, [applyVisitResponse, queryClient]);

  const showNewTransactions = React.useCallback(() => {
    const filters = new Filters();
    filters.newOnly = true;
    navigateToTransactions(filters);
  }, [navigateToTransactions]);

  const value = React.useMemo(
    () => ({
      newSince,
      newTransactions: newTransactionsQuery.data ?? [],
      isNewTransactionsPending:
        newSince === null || newTransactionsQuery.isPending,
      isNewTransaction,
      markAllSeen,
      isMarkingSeen,
      showNewTransactions,
    }),
    [
      newSince,
      newTransactionsQuery.data,
      newTransactionsQuery.isPending,
      isNewTransaction,
      markAllSeen,
      isMarkingSeen,
      showNewTransactions,
    ],
  );

  return (
    <NewTransactionsContext.Provider value={value}>
      {props.children}
    </NewTransactionsContext.Provider>
  );
};

export const useNewTransactions = () =>
  React.useContext(NewTransactionsContext);
