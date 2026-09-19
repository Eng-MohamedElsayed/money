import { vi, describe, expect, it, beforeEach } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import {
  transactionsQueryOptions,
  transformTransactionRow,
  transformTransactionRows,
  transactionInputSchema,
} from "./use-transactions";
import {
  getTransactionsAction,
  createTransactionAction,
} from "../../server/actions/transactions";

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({
  revalidateTag: vi.fn(),
}));

vi.mock("../../server/actions/transactions", () => ({
  getTransactionsAction: vi.fn(),
  createTransactionAction: vi.fn(async (input: unknown) => {
    // Mirror pure zod gating from action
    const data = transactionInputSchema.parse(input);
    return { ok: true, transaction: { id: "tx-created", ...data } };
  }),
  deleteTransactionAction: vi.fn(async () => ({ ok: true })),
}));

describe("use-transactions TanStack slice (pure logic, no DB)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("query-options transports minor ints end-to-end", () => {
    it("generates correct queryKey seeded with qk.transactions(userId)", () => {
      const options = transactionsQueryOptions("user_test_123");
      expect(options.queryKey).toEqual(["transactions", "user_test_123", null]);
    });

    it("transports minor ints end-to-end via queryFn and QueryClient", async () => {
      const mockDbRows = [
        {
          id: "tx-1",
          userId: "user_test_123",
          accountId: "acc-1",
          accountName: "Main Bank Account",
          account: { id: "acc-1", name: "Main Bank Account" },
          type: "EXPENSE",
          flow: "OUT",
          amountMinor: 4999, // 49.99 EGP strictly stored as integer minor units
          currency: "EGP",
          date: new Date("2026-09-19T10:00:00.000Z"),
          description: "Weekly Groceries",
          merchant: "Carrefour",
          note: null,
          categoryId: null,
          categoryName: null,
          bucket: "ESSENTIALS",
          transferAccountId: null,
          transferAccountName: null,
          createdAt: new Date("2026-09-19T10:00:00.000Z"),
          updatedAt: new Date("2026-09-19T10:00:00.000Z"),
        },
        {
          id: "tx-2",
          userId: "user_test_123",
          accountId: "acc-1",
          accountName: "Main Bank Account",
          account: { id: "acc-1", name: "Main Bank Account" },
          type: "INCOME",
          flow: "IN",
          amountMinor: 250000, // 2500.00 EGP as integer minor units
          currency: "EGP",
          date: new Date("2026-09-18T09:00:00.000Z"),
          description: "Consulting Salary",
          merchant: null,
          note: null,
          categoryId: null,
          categoryName: null,
          bucket: "GROWTH",
          transferAccountId: null,
          transferAccountName: null,
          createdAt: new Date("2026-09-18T09:00:00.000Z"),
          updatedAt: new Date("2026-09-18T09:00:00.000Z"),
        },
      ];

      vi.mocked(getTransactionsAction).mockResolvedValueOnce({
        qk: ["transactions", "user_test_123", null],
        transactions: mockDbRows,
      } as any);

      const options = transactionsQueryOptions("user_test_123");
      const client = new QueryClient();

      // Execute end-to-end through TanStack query pipeline
      const data = await client.fetchQuery(options);

      expect(data).toHaveLength(2);

      // Verify row 1: minor units integer guarantee (no floats)
      expect(data[0].amountMinor).toBe(4999);
      expect(Number.isInteger(data[0].amountMinor)).toBe(true);
      expect(data[0].accountName).toBe("Main Bank Account");
      expect(data[0].type).toBe("EXPENSE");

      // Verify row 2: minor units integer guarantee (no floats)
      expect(data[1].amountMinor).toBe(250000);
      expect(Number.isInteger(data[1].amountMinor)).toBe(true);
      expect(data[1].type).toBe("INCOME");
    });

    it("transformTransactionRows guards integer minor units against float inputs", () => {
      const rawRows = [
        {
          id: "tx-float",
          userId: "user-1",
          accountId: "acc-1",
          amountMinor: 1050.4, // Floating point input
          type: "EXPENSE",
          flow: "OUT",
          date: new Date(),
          accountName: "Wallet",
        },
      ];

      const transformed = transformTransactionRows(rawRows);
      expect(transformed).toHaveLength(1);
      expect(transformed[0].amountMinor).toBe(1050);
      expect(Number.isInteger(transformed[0].amountMinor)).toBe(true);
    });
  });

  describe("zod validation gate", () => {
    it("rejects negative amount (zod error case)", () => {
      const negativeInput = {
        type: "EXPENSE",
        amountMinor: -500, // Negative amount must be rejected
        date: new Date(),
        accountId: "acc-main",
      };

      const result = transactionInputSchema.safeParse(negativeInput);
      expect(result.success).toBe(false);

      if (!result.success) {
        const amountIssue = result.error.issues.find((issue) =>
          issue.path.includes("amountMinor")
        );
        expect(amountIssue).toBeDefined();
      }
    });

    it("rejects non-integer float amount", () => {
      const floatInput = {
        type: "EXPENSE",
        amountMinor: 25.75, // Must be integer minor units
        date: new Date(),
        accountId: "acc-main",
      };

      const result = transactionInputSchema.safeParse(floatInput);
      expect(result.success).toBe(false);

      if (!result.success) {
        const issue = result.error.issues.find((i) => i.path.includes("amountMinor"));
        expect(issue).toBeDefined();
      }
    });

    it("accepts valid non-negative integer minor units and coerces date", () => {
      const validInput = {
        type: "INCOME",
        amountMinor: 15000,
        date: "2026-09-19",
        accountId: "acc-main",
        bucket: "ESSENTIALS",
        description: "Freelance payment",
      };

      const result = transactionInputSchema.safeParse(validInput);
      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.data.amountMinor).toBe(15000);
        expect(Number.isInteger(result.data.amountMinor)).toBe(true);
        expect(result.data.date).toBeInstanceOf(Date);
        expect(result.data.type).toBe("INCOME");
      }
    });

    it("createTransactionAction rejects negative amount", async () => {
      const negativeInput = {
        type: "EXPENSE",
        amountMinor: -1200,
        date: new Date(),
        accountId: "acc-main",
      };

      await expect(createTransactionAction(negativeInput)).rejects.toThrow();
    });
  });
});
