"use client";

import { useMemo, useState } from "react";
import { formatMoney, makeMoney, toMinor } from "@/domain/money";
import {
  useBudget,
  useCreateIncome,
  useDeleteIncome,
  useResetRuleProfile,
  useRuleProfile,
  useSaveRuleProfile,
  type BudgetBucketView,
} from "@/lib/hooks/use-budget";

const BUCKET_META: Record<
  BudgetBucketView["bucket"],
  { label: string; accent: string; bar: string }
> = {
  GROWTH: {
    label: "النمو",
    accent: "text-emerald-600 dark:text-emerald-400",
    bar: "bg-emerald-500",
  },
  STABILITY: {
    label: "الاستقرار",
    accent: "text-sky-600 dark:text-sky-400",
    bar: "bg-sky-500",
  },
  ESSENTIALS: {
    label: "الأساسيات",
    accent: "text-amber-600 dark:text-amber-400",
    bar: "bg-amber-500",
  },
  REWARDS: {
    label: "المكافآت",
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
  percent,
}: {
  bucket: BudgetBucketView;
  currency: string;
  percent: number;
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
          {percent}%
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


const RULE_FIELDS = [
  { key: "growthPercent", bucket: "GROWTH", label: "النمو" },
  { key: "stabilityPercent", bucket: "STABILITY", label: "الاستقرار" },
  { key: "essentialsPercent", bucket: "ESSENTIALS", label: "الأساسيات" },
  { key: "rewardsPercent", bucket: "REWARDS", label: "المكافآت" },
] as const;

function RuleEditor({
  userId,
  month,
  year,
  isCustom,
  profileName,
}: {
  userId: string;
  month: number;
  year: number;
  isCustom: boolean;
  profileName: string | null;
}) {
  const { data } = useRuleProfile(userId);
  const saveRule = useSaveRuleProfile(userId, month, year);
  const resetRule = useResetRuleProfile(userId, month, year);

  const [draft, setDraft] = useState<Record<string, string> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const current = data?.rule;
  const values = draft ?? {
    growthPercent: String(current?.growthPercent ?? 25),
    stabilityPercent: String(current?.stabilityPercent ?? 15),
    essentialsPercent: String(current?.essentialsPercent ?? 50),
    rewardsPercent: String(current?.rewardsPercent ?? 10),
  };

  const total = RULE_FIELDS.reduce((acc, field) => {
    const parsed = Number(values[field.key]);
    return acc + (Number.isFinite(parsed) ? parsed : 0);
  }, 0);
  const isValidTotal = total === 100;

  function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed: Record<string, number> = {};
    for (const field of RULE_FIELDS) {
      const n = Number(values[field.key]);
      if (!Number.isInteger(n) || n < 0 || n > 100) {
        setError("كل نسبة يجب أن تكون رقمًا صحيحًا بين 0 و 100");
        return;
      }
      parsed[field.key] = n;
    }
    if (total !== 100) {
      setError(`مجموع النسب ${total}% — يجب أن يساوي 100%`);
      return;
    }
    setError(null);
    saveRule.mutate(
      {
        growthPercent: parsed.growthPercent,
        stabilityPercent: parsed.stabilityPercent,
        essentialsPercent: parsed.essentialsPercent,
        rewardsPercent: parsed.rewardsPercent,
        name: profileName ?? undefined,
      },
      { onSuccess: () => setDraft(null) },
    );
  }

  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between p-4 text-sm font-medium text-zinc-900 dark:text-zinc-100"
      >
        <span>تخصيص نسب التوزيع</span>
        <span className="text-xs font-normal text-zinc-500">
          {isCustom ? (profileName ?? "قاعدة مخصصة") : "الافتراضي 25/15/50/10"}
        </span>
      </button>

      {open ? (
        <form onSubmit={handleSave} className="space-y-3 border-t border-zinc-200 p-4 dark:border-zinc-800">
          <div className="grid gap-3 sm:grid-cols-4">
            {RULE_FIELDS.map((field) => (
              <div key={field.key}>
                <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                  {field.label}
                </label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  value={values[field.key]}
                  onChange={(e) =>
                    setDraft({ ...values, [field.key]: e.target.value })
                  }
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-900"
                />
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <p
              className={`text-xs ${
                isValidTotal
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-red-600 dark:text-red-400"
              }`}
            >
              المجموع: {total}% {isValidTotal ? "✓" : "(يجب أن يساوي 100%)"}
            </p>
            <div className="flex items-center gap-2">
              {isCustom ? (
                <button
                  type="button"
                  onClick={() => {
                    setDraft(null);
                    setError(null);
                    resetRule.mutate();
                  }}
                  disabled={resetRule.isPending}
                  className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs transition-colors hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-800 dark:hover:bg-zinc-800"
                >
                  استعادة الافتراضي
                </button>
              ) : null}
              <button
                type="submit"
                disabled={saveRule.isPending || !isValidTotal}
                className="rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white transition-colors disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
              >
                {saveRule.isPending ? "جارٍ الحفظ..." : "حفظ القاعدة"}
              </button>
            </div>
          </div>

          {error ? <p className="text-xs text-red-600 dark:text-red-400">{error}</p> : null}
          {saveRule.isError ? (
            <p className="text-xs text-red-600 dark:text-red-400">
              {(saveRule.error as Error)?.message}
            </p>
          ) : null}
        </form>
      ) : null}
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
  const rule = data?.rule;
  const rulePercent = {
    GROWTH: rule?.growthPercent ?? 25,
    STABILITY: rule?.stabilityPercent ?? 15,
    ESSENTIALS: rule?.essentialsPercent ?? 50,
    REWARDS: rule?.rewardsPercent ?? 10,
  };

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

      <RuleEditor
        userId={userId}
        month={month}
        year={year}
        isCustom={Boolean(data?.isCustomRule)}
        profileName={data?.profileName ?? null}
      />

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
                  percent={rulePercent[bucket.bucket]}
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
