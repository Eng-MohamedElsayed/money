"use server";

import { getCurrentUser } from "../../server/auth";
import { accountsRepo } from "../../server/repositories/accounts";

export async function getAccountsAction(userId?: string) {
  const user = await getCurrentUser();
  const targetUserId = userId ?? user.id;
  if (targetUserId !== user.id) {
    throw new Error("Unauthorized");
  }
  return accountsRepo.list(user.id);
}
