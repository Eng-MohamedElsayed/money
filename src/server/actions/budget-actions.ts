"use server";

import { getBudget } from "../queries/budget";

export async function getBudgetAction(month: number, year: number) {
  return getBudget(month, year);
}
