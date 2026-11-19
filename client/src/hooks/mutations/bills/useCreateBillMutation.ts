import { NotificationType, showNotification } from "~/helpers/notifications";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { billsQueryKey, translateAxiosError } from "~/helpers/requests";
import { IBillCreateRequest } from "~/models/bill";
import { useAuth } from "~/providers/AuthProvider/AuthProvider";

export const useCreateBillMutation = () => {
  const queryClient = useQueryClient();
  const { request } = useAuth();

  return useMutation({
    mutationFn: async (newBill: IBillCreateRequest) =>
      await request({
        url: "/api/bill",
        method: "POST",
        data: newBill,
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
