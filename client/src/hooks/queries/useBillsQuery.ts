import { useQuery } from "@tanstack/react-query";
import { AxiosResponse } from "axios";
import { billsQueryKey } from "~/helpers/requests";
import { IBillResponse } from "~/models/bill";
import { useAuth } from "~/providers/AuthProvider/AuthProvider";

export const useBillsQuery = () => {
  const { request } = useAuth();

  return useQuery({
    queryKey: [billsQueryKey],
    queryFn: async (): Promise<IBillResponse[]> => {
      const res: AxiosResponse = await request({
        url: "/api/bill",
        method: "GET",
      });

      return res.data as IBillResponse[];
    },
  });
};
