import { query, action } from "./_generated/server.js";
import { components } from "./_generated/api.js";
import { Flutterwave } from "../../src/client/index.js";
import { v } from "convex/values";

const flutterwave = new Flutterwave(components.convexFlutterwave, {
  secretKey: process.env.FLW_SECRET_KEY!,
  webhookSecretHash: process.env.FLW_WEBHOOK_SECRET_HASH!,
});

export const initializeTransaction = action({
  args: {
    email: v.string(),
    amount: v.number(),
    redirectUrl: v.string(),
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
