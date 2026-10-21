import { NotificationType, showNotification } from "~/helpers/notifications";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { billsQueryKey, translateAxiosError } from "~/helpers/requests";
import { IBillUpdateRequest } from "~/models/bill";
import { useAuth } from "~/providers/AuthProvider/AuthProvider";

export const useUpdateBillMutation = () => {
  const queryClient = useQueryClient();
  const { request } = useAuth();

  return useMutation({
    mutationFn: async (bill: IBillUpdateRequest) =>
      await request({
        url: "/api/bill",
        method: "PUT",
        data: bill,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: [billsQueryKey] });
    },
    onError: (error: AxiosError) =>
      showNotification({
        type: NotificationType.Error,
        message: translateAxiosError(error),
      }),
  });
};
