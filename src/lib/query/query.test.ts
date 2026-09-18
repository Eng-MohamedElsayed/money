import { vi, describe, expect, it } from "vitest";
import { accountsQuery } from "./query";

vi.mock("server-only", () => ({}));

describe("query wrapper key-reuse", () => {
  it("given the same userId, two builds produce identical stable keys; and different userIds differ", () => {
    const userId1 = "user_alpha";
    const userId2 = "user_beta";

    const build1 = accountsQuery(userId1);
    const build2 = accountsQuery(userId1);
    expect(build1.queryKey).toEqual(build2.queryKey);
    expect(build1.queryKey).toEqual(["accounts", userId1]);

    const buildDiff = accountsQuery(userId2);
    expect(build1.queryKey).not.toEqual(buildDiff.queryKey);
    expect(buildDiff.queryKey).toEqual(["accounts", userId2]);
  });
});
