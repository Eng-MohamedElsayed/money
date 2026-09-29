"use client";

import { useMemo, useState } from "react";
import { formatMoney, makeMoney, toMinor } from "@/domain/money";
import {
  useBudget,
  useCreateIncome,
  useDeleteIncome,
  type BudgetBucketView,
} from "@/lib/hooks/use-budget";

const BUCKET_META: Record<
  BudgetBucketView["bucket"],
  { label: string; percent: number; accent: string; bar: string }
> = {
  GROWTH: {
    label: "النمو",
    percent: 25,
    accent: "text-emerald-600 dark:text-emerald-400",
    bar: "bg-emerald-500",
  },
  STABILITY: {
    label: "الاستقرار",
    percent: 15,
    accent: "text-sky-600 dark:text-sky-400",
    bar: "bg-sky-500",
  },
  ESSENTIALS: {
    label: "الأساسيات",
    percent: 50,
    accent: "text-amber-600 dark:text-amber-400",
    bar: "bg-amber-500",
  },
  REWARDS: {
    label: "المكافآت",
    percent: 10,
    accent: "text-violet-600 dark:text-violet-400",
    bar: "bg-violet-500",
  },
};

const AR_MONTHS = [
  "يناير",
  "فبراير",
  "مارس",
  "أبريل",
  "مايو",
  "يونيو",
  "يوليو",
  "أغسطس",
  "سبتمبر",
  "أكتوبر",
  "نوفمبر",
  "ديسمبر",
];

function parseAmountToMinor(raw: string): number | null {
  const trimmed = raw.trim().replace(/[٫,\s]/g, "");
  if (!trimmed) return null;
  const value = Number(trimmed);
  if (!Number.isFinite(value) || value <= 0) return null;
  return toMinor(value);
}

function BucketCard({
  bucket,
  currency,
}: {
  bucket: BudgetBucketView;
  currency: string;
}) {
  const meta = BUCKET_META[bucket.bucket];
  const cappedPercent = Math.min(100, Math.max(0, bucket.percentUsed));

  return (
    <div className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          {meta.label}
        </h3>
        <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
          {meta.percent}%
        </span>
      </div>

      <p className="mt-3 text-2xl font-bold text-zinc-900 dark:text-zinc-100">
        {formatMoney(makeMoney(bucket.allocatedMinor), currency)}
      </p>
      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
        المصروف: {formatMoney(makeMoney(bucket.spentMinor), currency)}
      </p>

      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
        <div
          className={`h-full rounded-full ${bucket.isOverspent ? "bg-red-500" : meta.bar}`}
          style={{ width: `${cappedPercent}%` }}
        />
      </div>

      <div className="mt-2 flex items-center justify-between text-xs">
        <span className="text-zinc-500 dark:text-zinc-400">
          {bucket.percentUsed}% مستخدم
        </span>
        {bucket.isOverspent ? (
          <span className="font-semibold text-red-600 dark:text-red-400">
            تجاوز الحد
          </span>
        ) : (
          <span className={`font-semibold ${meta.accent}`}>
            متبقٍ {formatMoney(makeMoney(bucket.remainingMinor), currency)}
          </span>
        )}
      </div>
    </div>
  );
}

export function BudgetClient({ userId }: { userId: string }) {
  const now = useMemo(() => new Date(), []);
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [source, setSource] = useState("");
  const [amount, setAmount] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const { data, isPending, isError } = useBudget(userId, month, year);
  const createIncome = useCreateIncome(userId, month, year);
  const deleteIncome = useDeleteIncome(userId, month, year);

  const snapshot = data?.snapshot;
  const currency = data?.currency ?? "EGP";

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const amountMinor = parseAmountToMinor(amount);
    if (amountMinor === null) {
      setFormError("أدخل مبلغًا صحيحًا أكبر من صفر");
      return;
    }
    if (!source.trim()) {
      setFormError("مصدر الدخل مطلوب");
      return;
    }

    createIncome.mutate(
      {
        amountMinor,
        source: source.trim(),
        date: new Date(),
        currency: "EGP",
        note: null,
      },
      {
        onSuccess: () => {
          setAmount("");
          setSource("");
        },
      },
    );
  }

  const shiftMonth = (delta: number) => {
    const next = new Date(year, month - 1 + delta, 1);
    setMonth(next.getMonth() + 1);
    setYear(next.getFullYear());
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => shiftMonth(-1)}
            className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm transition-colors hover:bg-zinc-100 dark:border-zinc-800 dark:hover:bg-zinc-800"
            aria-label="الشهر السابق"
          >
            →
          </button>
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
            {AR_MONTHS[month - 1]} {year}
          </h2>
          <button
            type="button"
            onClick={() => shiftMonth(1)}
            className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm transition-colors hover:bg-zinc-100 dark:border-zinc-800 dark:hover:bg-zinc-800"
            aria-label="الشهر التالي"
          >
            ←
          </button>
        </div>

        {snapshot ? (
          <div className="text-sm text-zinc-600 dark:text-zinc-400">
            إجمالي الدخل:{" "}
            <span className="font-bold text-zinc-900 dark:text-zinc-100">
              {formatMoney(makeMoney(snapshot.totalIncomeMinor), currency)}
            </span>
          </div>
        ) : null}
      </div>

      <form
        onSubmit={handleSubmit}
        className="flex flex-wrap items-end gap-3 rounded-xl border border-zinc-200 p-4 dark:border-zinc-800"
      >
        <div className="flex-1 min-w-40">
          <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
            المبلغ (ج.م)
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-900"
          />
        </div>
        <div className="flex-1 min-w-40">
          <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
            المصدر
          </label>
          <input
            type="text"
            value={source}
            onChange={(e) => setSource(e.target.value)}
            placeholder="راتب"
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-900"
          />
        </div>
        <button
          type="submit"
          disabled={createIncome.isPending}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
        >
          {createIncome.isPending ? "جارٍ الحفظ..." : "إضافة دخل"}
        </button>
        {formError ? (
          <p className="w-full text-xs text-red-600 dark:text-red-400">{formError}</p>
        ) : null}
        {createIncome.isError ? (
          <p className="w-full text-xs text-red-600 dark:text-red-400">
            {(createIncome.error as Error)?.message}
          </p>
        ) : null}
      </form>

      {isPending ? (
        <p className="text-sm text-zinc-500">جارٍ التحميل...</p>
      ) : isError ? (
        <p className="text-sm text-red-600">تعذر تحميل الميزانية</p>
      ) : snapshot ? (
        <>
          {snapshot.totalIncomeMinor === 0 ? (
            <p className="rounded-lg bg-zinc-50 p-4 text-sm text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
              لا يوجد دخل مسجل في {AR_MONTHS[month - 1]} {year}. أضف دخلك
              لتوزيعه تلقائيًا وفق قاعدة 25/15/50/10.
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {snapshot.buckets.map((bucket) => (
                <BucketCard
                  key={bucket.bucket}
                  bucket={bucket}
                  currency={currency}
                />
              ))}
            </div>
          )}

          {snapshot.totalSpentMinor > 0 ? (
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              إجمالي المصروف على الفئات:{" "}
              {formatMoney(makeMoney(snapshot.totalSpentMinor), currency)}
            </p>
          ) : null}

          {data && data.unclassifiedMinor ? (
            <p className="text-sm text-amber-600 dark:text-amber-400">
              مصروف بدون تصنيف:{" "}
              {formatMoney(makeMoney(data.unclassifiedMinor), currency)}
            </p>
          ) : null}

          {data && data.incomes.length > 0 ? (
            <section className="space-y-2">
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              الدخل المسجل
              </h3>
              <ul className="divide-y divide-zinc-200 rounded-xl border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
                {data.incomes.map((income) => (
                  <li
                    key={income.id}
                    className="flex items-center justify-between gap-3 p-3 text-sm"
                  >
                    <div>
                      <p className="font-medium text-zinc-900 dark:text-zinc-100">
                        {income.source}
                      </p>
                      <p className="text-xs text-zinc-500">
                        {new Date(income.date).toLocaleDateString("ar-EG-u-nu-latn")}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                        {formatMoney(makeMoney(income.amountMinor), currency)}
                      </span>
                      <button
                        type="button"
                        onClick={() => deleteIncome.mutate(income.id)}
                        disabled={deleteIncome.isPending}
                        className="text-xs text-red-600 hover:underline disabled:opacity-50 dark:text-red-400"
                      >
                        حذف
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
