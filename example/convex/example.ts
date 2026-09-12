import { query, action } from "./_generated/server.js";
import { components } from "./_generated/api.js";
import { Flutterwave } from "../../src/client/index.js";
import { v } from "convex/values";

const paymentOptionValidator = v.union(
  v.literal("card"),
  v.literal("account"),
  v.literal("banktransfer"),
  v.literal("ussd"),
  v.literal("nqr"),
  v.literal("mpesa"),
  v.literal("mobilemoneyghana"),
  v.literal("mobilemoneyuganda"),
  v.literal("mobilemoneyrwanda"),
  v.literal("mobilemoneyzambia"),
  v.literal("barter"),
  v.literal("credit"),
  v.literal("opay"),
  v.literal("fawrypay"),
);

const flutterwave = new Flutterwave(components.convexFlutterwave, {
  secretKey: process.env.FLW_SECRET_KEY!,
  webhookSecretHash: process.env.FLW_WEBHOOK_SECRET_HASH!,
});

export const initializeTransaction = action({
  args: {
    email: v.string(),
    amount: v.number(),
    currency: v.optional(v.string()),
    redirectUrl: v.string(),
    paymentPlan: v.optional(v.string()),
    paymentOptions: v.optional(v.array(paymentOptionValidator)),
  },
  handler: async (ctx, args) => {
    return await flutterwave.initializeTransaction(ctx, args);
  },
});

export const verifyTransaction = action({
  args: { transactionId: v.string() },
  handler: async (ctx, args) => {
    return await flutterwave.verifyTransaction(ctx, args);
  },
});

export const getTransaction = query({
  args: { txRef: v.string() },
  handler: async (ctx, args) => {
    return await flutterwave.getTransaction(ctx, args);
  },
});

export const listTransactions = query({
  args: { customerEmail: v.string() },
  handler: async (ctx, args) => {
    return await flutterwave.listTransactions(ctx, args);
  },
});

export const listSubscriptions = query({
  args: { customerEmail: v.string() },
  handler: async (ctx, args) => {
    return await flutterwave.listSubscriptions(ctx, args);
  },
});

export const hasActiveSubscription = query({
  args: { customerEmail: v.string() },
  handler: async (ctx, args) => {
    return await flutterwave.hasActiveSubscription(ctx, args);
  },
});

export const cancelSubscription = action({
  args: { subscriptionId: v.string(), customerEmail: v.string() },
  handler: async (ctx, args) => {
    await flutterwave.cancelSubscription(ctx, args);
    return null;
  },
});

export const enableSubscription = action({
  args: { subscriptionId: v.string(), customerEmail: v.string() },
  handler: async (ctx, args) => {
    await flutterwave.enableSubscription(ctx, args);
    return null;
  },
});

export const syncSubscriptions = action({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const byEmail = await flutterwave.syncCustomerSubscriptions(ctx, { email: args.email });
    if (byEmail > 0) return byEmail;

    // Flutterwave's test mode substitutes one fixed sandbox customer
    // identity for every subscription, regardless of the email a checkout
    // actually used (see the README) — so the sync above can legitimately
    // find nothing even though a matching test subscription exists. This
    // app only ever creates subscriptions on its own two demo plans, so as
    // a fallback, check each one directly and claim any subscription found
    // there under the email the tester is actually using. Safe here because
    // this is a single-developer local demo, not a multi-customer
    // production app — see syncSubscriptionsByPlan's own doc comment.
    const plans = await flutterwave.listPaymentPlans(ctx);
    const demoPlans = plans.filter((plan) => plan.name.startsWith("Convex + Flutterwave Demo"));
    let synced = 0;
    for (const plan of demoPlans) {
      synced += await flutterwave.syncSubscriptionsByPlan(ctx, {
        planId: plan.planId,
        email: args.email,
      });
    }
    return synced;
  },
});

// Bootstraps two demo payment plans on first run, idempotent by name — the
// same pattern the [convex-paystack] example app uses.
export const ensureDemoPlans = action({
  args: {},
  handler: async (ctx) => {
    const existing = await flutterwave.listPaymentPlans(ctx);
    const findOrCreate = async (
      name: string,
      amount: number,
      interval: "monthly" | "yearly",
    ) => {
      const found = existing.find((p) => p.name === name);
      if (found) return found;
      return await flutterwave.createPaymentPlan(ctx, { name, amount, interval, currency: "NGN" });
    };
    const monthly = await findOrCreate("Convex + Flutterwave Demo — Monthly", 5000, "monthly");
    const yearly = await findOrCreate("Convex + Flutterwave Demo — Yearly", 50000, "yearly");
    return { monthly, yearly };
  },
});

export const listRecentEvents = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    return await flutterwave.listRecentEvents(ctx, args);
  },
});

export const getStats = query({
  args: {},
  handler: async (ctx) => {
    return await flutterwave.getStats(ctx);
  },
});

export const getWebhookUrl = query({
  args: {},
  handler: async () => {
    const site = process.env.CONVEX_SITE_URL;
    return site ? `${site}/webhooks/flutterwave` : null;
  },
});
