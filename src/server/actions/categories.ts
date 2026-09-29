"use server";

import { updateTag } from "next/cache";
import {
  categoryInputSchema,
  categoryUpdateSchema,
} from "../../lib/schemas/categories";
import { getCurrentUser } from "../auth";
import { prisma } from "../db";
import { getCategories } from "../queries/categories";

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "P2002"
  );
}

export async function getCategoriesAction() {
  return getCategories();
}

export async function createCategoryAction(input: unknown) {
  const data = categoryInputSchema.parse(input);
  const user = await getCurrentUser();

  try {
    const category = await prisma.category.create({
      data: {
        userId: user.id,
        name: data.name,
        defaultBucket: data.defaultBucket,
      },
      select: { id: true, name: true, defaultBucket: true },
    });

    updateTag("budget");
    updateTag("categories");
    return { ok: true as const, category };
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new Error("يوجد تصنيف بنفس الاسم بالفعل");
    }
    throw error;
  }
}

export async function updateCategoryAction(id: string, input: unknown) {
  const data = categoryUpdateSchema.parse(input);
  const user = await getCurrentUser();

  const existing = await prisma.category.findFirst({
    where: { id, userId: user.id },
    select: { id: true, isSystem: true },
  });
  if (!existing) throw new Error("التصنيف غير موجود");
  if (existing.isSystem) throw new Error("لا يمكن تعديل التصنيفات الافتراضية");

  try {
    const category = await prisma.category.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.defaultBucket !== undefined
          ? { defaultBucket: data.defaultBucket }
          : {}),
      },
      select: { id: true, name: true, defaultBucket: true },
    });

    updateTag("budget");
    updateTag("categories");
    return { ok: true as const, category };
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new Error("يوجد تصنيف بنفس الاسم بالفعل");
    }
    throw error;
  }
}

export async function deleteCategoryAction(id: string) {
  const user = await getCurrentUser();

  const existing = await prisma.category.findFirst({
    where: { id, userId: user.id },
    select: { id: true, isSystem: true },
  });
  if (!existing) throw new Error("التصنيف غير موجود");
  if (existing.isSystem) throw new Error("لا يمكن حذف التصنيفات الافتراضية");

  // Transactions keep their amount/bucket; categoryId becomes null (SetNull).
  await prisma.category.delete({ where: { id } });

  updateTag("budget");
  updateTag("categories");
  return { ok: true as const };
}
