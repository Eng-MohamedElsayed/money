import "server-only";
import { auth } from "@clerk/nextjs/server";

export async function getCurrentUser() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");
  return { id: userId };
}
