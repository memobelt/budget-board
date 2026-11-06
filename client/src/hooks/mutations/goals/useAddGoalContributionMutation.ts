import { NotificationType, showNotification } from "~/helpers/notifications";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { goalsQueryKey, translateAxiosError } from "~/helpers/requests";
import { IGoalContributionCreateRequest } from "~/models/goal";
import { useAuth } from "~/providers/AuthProvider/AuthProvider";

export const useAddGoalContributionMutation = () => {
  const queryClient = useQueryClient();
  const { request } = useAuth();

  return useMutation({
    mutationFn: async (contribution: IGoalContributionCreateRequest) =>
      await request({
        url: "/api/goal/contribution",
        method: "POST",
        data: contribution,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: [goalsQueryKey],
      });
    },
    onError: (error: AxiosError) => {
      showNotification({
        type: NotificationType.Error,
        message: translateAxiosError(error),
      });
    },
  });
};
