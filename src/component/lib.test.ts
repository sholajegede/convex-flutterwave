import { describe, expect, test } from "vitest";
import { initConvexTest } from "./setup.test.js";
import { api } from "./_generated/api.js";

describe("transactions", () => {
  test("recordTransaction inserts then updates the same txRef", async () => {
    const t = initConvexTest();

    await t.mutation(api.lib.recordTransaction, {
      txRef: "tx_123",
      customerEmail: "dev@sholajegede.com",
      amount: 5000,
      currency: "NGN",
      status: "pending",
    });

    let tx = await t.query(api.lib.getTransaction, { txRef: "tx_123" });
    expect(tx?.status).toBe("pending");

    await t.mutation(api.lib.recordTransaction, {
      txRef: "tx_123",
      customerEmail: "dev@sholajegede.com",
      amount: 5000,
      currency: "NGN",
      status: "successful",
      flwRef: "FLW-REF-1",
    });

    tx = await t.query(api.lib.getTransaction, { txRef: "tx_123" });
    expect(tx?.status).toBe("successful");
    expect(tx?.flwRef).toBe("FLW-REF-1");
  });

  test("listTransactions returns only the given customer's transactions", async () => {
    const t = initConvexTest();

    await t.mutation(api.lib.recordTransaction, {
      txRef: "tx_a",
      customerEmail: "a@example.com",
      amount: 1000,
      currency: "NGN",
      status: "successful",
    });
    await t.mutation(api.lib.recordTransaction, {
      txRef: "tx_b",
      customerEmail: "b@example.com",
      amount: 2000,
      currency: "NGN",
      status: "successful",
    });

    const results = await t.query(api.lib.listTransactions, {
      customerEmail: "a@example.com",
    });
    expect(results).toHaveLength(1);
    expect(results[0].txRef).toBe("tx_a");
  });
});

describe("subscriptions", () => {
  test("recordSubscriptionEvent upserts by subscriptionId", async () => {
    const t = initConvexTest();

    await t.mutation(api.lib.recordSubscriptionEvent, {
      subscriptionId: "1001",
      customerEmail: "dev@sholajegede.com",
      planId: "1",
      status: "active",
    });

    expect(
      await t.query(api.lib.hasActiveSubscription, {
        customerEmail: "dev@sholajegede.com",
      }),
    ).toBe(true);

    await t.mutation(api.lib.updateSubscriptionStatus, {
      subscriptionId: "1001",
      status: "cancelled",
    });

    expect(
      await t.query(api.lib.hasActiveSubscription, {
        customerEmail: "dev@sholajegede.com",
      }),
    ).toBe(false);
  });
});

describe("webhook idempotency", () => {
  test("checkAndRecordEvent flags duplicate event ids", async () => {
    const t = initConvexTest();

    const first = await t.mutation(api.lib.checkAndRecordEvent, {
      eventId: "charge.completed:998877",
      eventType: "charge.completed",
      txRef: "tx_123",
      payload: "{}",
    });
    expect(first.alreadyProcessed).toBe(false);

    const second = await t.mutation(api.lib.checkAndRecordEvent, {
      eventId: "charge.completed:998877",
      eventType: "charge.completed",
      txRef: "tx_123",
      payload: "{}",
    });
    expect(second.alreadyProcessed).toBe(true);
  });
});
