import React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AxiosResponse } from "axios";
import { useIdle } from "@mantine/hooks";
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

// While the app is open and in use, tell the server every few minutes so it
// knows the visit is still going. Coming back after the server's idle timeout
// (30 minutes) starts a new visit.
const visitHeartbeatMs = 5 * 60 * 1000;

interface NewTransactionsContextType {
  /** Synced transactions added after this time are new; null until the visit is recorded. */
  newSince: Date | null;
  /** Synced transactions added since the last visit, most recent first. */
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
  const isIdle = useIdle(visitHeartbeatMs, { initialState: false });

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
      // Not being able to record the visit only means nothing is marked new.
    }
  }, [applyVisitResponse]);

  // Record the visit when the app opens and whenever the tab comes back into view.
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

  // Keep the visit going while the user is actually using the app.
  React.useEffect(() => {
    if (isIdle) {
      return;
    }

    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void recordVisit();
      }
    }, visitHeartbeatMs);
    return () => window.clearInterval(interval);
  }, [isIdle, recordVisit]);

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
