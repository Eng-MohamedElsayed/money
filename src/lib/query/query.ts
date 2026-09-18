import { queryOptions } from "@tanstack/react-query";
import { qk } from "../query-keys";
import { getAccountsAction } from "./actions";

export function accountsQuery(userId: string) {
  return queryOptions({
    queryKey: qk.accounts(userId),
    queryFn: () => getAccountsAction(userId),
  });
}

export const accountsQueryOptions = accountsQuery;

export const queries = {
  accounts: accountsQuery,
};
