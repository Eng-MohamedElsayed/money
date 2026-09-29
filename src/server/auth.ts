import "server-only";
import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "./db";

export async function getCurrentUser() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const clerkUser = await currentUser().catch(() => null);

  const user = await prisma.user.upsert({
    where: { id: userId },
    create: {
      id: userId,
      email: clerkUser?.emailAddresses[0]?.emailAddress,
      name: [clerkUser?.firstName, clerkUser?.lastName].filter(Boolean).join(" ") || null,
    },
    update: {
      email: clerkUser?.emailAddresses[0]?.emailAddress,
      name: [clerkUser?.firstName, clerkUser?.lastName].filter(Boolean).join(" ") || null,
    },
  });

  return { id: user.id, email: user.email, name: user.name };
}
