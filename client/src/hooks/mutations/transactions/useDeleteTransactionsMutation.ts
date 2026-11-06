import { NotificationType, showNotification } from "~/helpers/notifications";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AxiosError } from "axios";
import {
  accountsQueryKey,
  balancesQueryKey,
  goalsQueryKey,
  institutionsQueryKey,
  tagSuggestionsQueryKey,
  transactionsQueryKey,
  translateAxiosError,
} from "~/helpers/requests";
import { useAuth } from "~/providers/AuthProvider/AuthProvider";

export const useDeleteTransactionsMutation = () => {
  const queryClient = useQueryClient();
  const { request } = useAuth();

  return useMutation({
    mutationFn: async (transactionIds: string[]) => {
      await request({
        url: "/api/transaction",
        method: "DELETE",
        data: transactionIds,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: [transactionsQueryKey] });
      await queryClient.invalidateQueries({
        queryKey: [tagSuggestionsQueryKey],
      });
      await queryClient.invalidateQueries({ queryKey: [balancesQueryKey] });
      // Transactions can count towards goals, so goal progress may have changed.
      await queryClient.invalidateQueries({ queryKey: [goalsQueryKey] });
      await queryClient.invalidateQueries({ queryKey: [accountsQueryKey] });
      await queryClient.invalidateQueries({ queryKey: [institutionsQueryKey] });
    },
    onError: (error: AxiosError) => {
      showNotification({
        type: NotificationType.Error,
        message: translateAxiosError(error),
      });
    },
  });
};
