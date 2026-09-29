"use client";

import { useState } from "react";
import {
  useCategories,
  useCreateCategory,
  useDeleteCategory,
  useUpdateCategory,
  type CategoryView,
} from "@/lib/hooks/use-categories";

const BUCKET_OPTIONS: {
  value: CategoryView["defaultBucket"];
  label: string;
}[] = [
  { value: "ESSENTIALS", label: "الأساسيات" },
  { value: "GROWTH", label: "النمو" },
  { value: "STABILITY", label: "الاستقرار" },
  { value: "REWARDS", label: "المكافآت" },
  { value: "UNCLASSIFIED", label: "بدون تصنيف" },
];

function bucketLabel(bucket: CategoryView["defaultBucket"]): string {
  return BUCKET_OPTIONS.find((o) => o.value === bucket)?.label ?? "بدون تصنيف";
}

export function CategoryManager({ userId }: { userId: string }) {
  const { data: categories, isPending } = useCategories(userId);
  const createCategory = useCreateCategory(userId);
  const deleteCategory = useDeleteCategory(userId);
  const updateCategory = useUpdateCategory(userId);

  const [name, setName] = useState("");
  const [bucket, setBucket] = useState<CategoryView["defaultBucket"]>("ESSENTIALS");
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const rows = categories ?? [];

  function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError("اسم التصنيف مطلوب");
      return;
    }
    createCategory.mutate(
      { name: name.trim(), defaultBucket: bucket },
      {
        onSuccess: () => setName(""),
        onError: (e) => setError((e as Error)?.message ?? "تعذر إنشاء التصنيف"),
      },
    );
  }

  const errorMessage =
    error ??
    ((createCategory.error as Error)?.message ||
      (deleteCategory.error as Error)?.message ||
      (updateCategory.error as Error)?.message ||
      null);

  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between p-4 text-sm font-medium text-zinc-900 dark:text-zinc-100"
      >
        <span>إدارة التصنيفات</span>
        <span className="text-xs font-normal text-zinc-500">
          {isPending ? "جارٍ التحميل..." : `${rows.length} تصنيف`}
        </span>
      </button>

      {open ? (
        <div className="space-y-4 border-t border-zinc-200 p-4 dark:border-zinc-800">
          <form onSubmit={handleCreate} className="flex flex-wrap items-end gap-2">
            <div className="min-w-40 flex-1">
              <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                اسم التصنيف
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="مثال: صيانة السيارة"
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-900"
              />
            </div>
            <div className="min-w-32">
              <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                الفئة
              </label>
              <select
                value={bucket}
                onChange={(e) =>
                  setBucket(e.target.value as CategoryView["defaultBucket"])
                }
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-900"
              >
                {BUCKET_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              disabled={createCategory.isPending}
              className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white transition-colors disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
            >
              {createCategory.isPending ? "جارٍ الحفظ..." : "إضافة"}
            </button>
          </form>

          {errorMessage ? (
            <p className="text-xs text-red-600 dark:text-red-400">{errorMessage}</p>
          ) : null}

          <ul className="divide-y divide-zinc-200 rounded-lg border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
            {rows.map((category) => (
              <li
                key={category.id}
                className="flex flex-wrap items-center justify-between gap-2 p-2 text-sm"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-zinc-900 dark:text-zinc-100">
                    {category.name}
                    {category.isSystem ? (
                      <span className="mr-2 text-xs text-zinc-400">(افتراضي)</span>
                    ) : null}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {category.transactionCount} معاملة
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={category.defaultBucket}
                    disabled={category.isSystem}
                    onChange={(e) =>
                      updateCategory.mutate({
                        id: category.id,
                        patch: {
                          defaultBucket: e.target
                            .value as CategoryView["defaultBucket"],
                        },
                      })
                    }
                    className="rounded-lg border border-zinc-200 px-2 py-1 text-xs disabled:opacity-60 dark:border-zinc-800 dark:bg-zinc-900"
                    aria-label={`فئة ${category.name}`}
                  >
                    {BUCKET_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                  <span className="hidden text-xs text-zinc-500 sm:inline">
                    {bucketLabel(category.defaultBucket)}
                  </span>
                  <button
                    type="button"
                    onClick={() => deleteCategory.mutate(category.id)}
                    disabled={category.isSystem || deleteCategory.isPending}
                    title={
                      category.isSystem
                        ? "لا يمكن حذف التصنيفات الافتراضية"
                        : "حذف التصنيف"
                    }
                    className="text-xs text-red-600 hover:underline disabled:cursor-not-allowed disabled:opacity-40 dark:text-red-400"
                  >
                    حذف
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
