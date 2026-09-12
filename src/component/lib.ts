import { v } from "convex/values";
import { mutation, query } from "./_generated/server.js";

const transactionStatusValidator = v.union(
  v.literal("pending"),
  v.literal("successful"),
  v.literal("failed"),
  v.literal("cancelled"),
);

const subscriptionStatusValidator = v.union(
  v.literal("active"),
  v.literal("cancelled"),
);

const transactionValidator = v.object({
  _id: v.id("transactions"),
  _creationTime: v.number(),
  txRef: v.string(),
  flwRef: v.optional(v.string()),
  transactionId: v.optional(v.string()),
  customerEmail: v.string(),
  amount: v.number(),
  currency: v.string(),
  status: transactionStatusValidator,
  paymentType: v.optional(v.string()),
  narration: v.optional(v.string()),
  paidAt: v.optional(v.number()),
  metadata: v.optional(v.string()),
  createdAt: v.number(),
  updatedAt: v.number(),
});

const subscriptionValidator = v.object({
  _id: v.id("subscriptions"),
  _creationTime: v.number(),
  subscriptionId: v.string(),
  customerEmail: v.string(),
  planId: v.optional(v.string()),
  amount: v.optional(v.number()),
  status: subscriptionStatusValidator,
  createdAt: v.number(),
  updatedAt: v.number(),
});

const webhookEventValidator = v.object({
  _id: v.id("webhookEvents"),
  _creationTime: v.number(),
  eventId: v.string(),
  eventType: v.string(),
  txRef: v.optional(v.string()),
  payload: v.string(),
  receivedAt: v.number(),
});

// ─── Queries ────────────────────────────────────────────────────────────────

export const getTransaction = query({
  args: { txRef: v.string() },
  returns: v.union(v.null(), transactionValidator),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("transactions")
      .withIndex("by_txRef", (q) => q.eq("txRef", args.txRef))
      .first();
  },
});

export const listTransactions = query({
  args: { customerEmail: v.string(), limit: v.optional(v.number()) },
  returns: v.array(transactionValidator),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("transactions")
      .withIndex("by_customerEmail", (q) => q.eq("customerEmail", args.customerEmail))
      .order("desc")
      .take(args.limit ?? 50);
  },
});

export const getSubscription = query({
  args: { subscriptionId: v.string() },
  returns: v.union(v.null(), subscriptionValidator),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("subscriptions")
      .withIndex("by_subscriptionId", (q) => q.eq("subscriptionId", args.subscriptionId))
      .first();
  },
});

export const listSubscriptions = query({
  args: { customerEmail: v.string() },
  returns: v.array(subscriptionValidator),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("subscriptions")
      .withIndex("by_customerEmail", (q) => q.eq("customerEmail", args.customerEmail))
      .order("desc")
      .collect();
  },
});

export const hasActiveSubscription = query({
  args: { customerEmail: v.string() },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const sub = await ctx.db
      .query("subscriptions")
      .withIndex("by_customerEmail", (q) => q.eq("customerEmail", args.customerEmail))
      .order("desc")
      .first();
    return sub?.status === "active";
  },
});

export const listRecentEvents = query({
  args: { limit: v.optional(v.number()) },
  returns: v.array(webhookEventValidator),
  handler: async (ctx, args) => {
    return await ctx.db.query("webhookEvents").order("desc").take(args.limit ?? 50);
  },
});

export const getStats = query({
  args: {},
  returns: v.object({ transactions: v.number(), subscriptions: v.number(), events: v.number() }),
  handler: async (ctx) => {
    const [transactions, subscriptions, events] = await Promise.all([
      ctx.db.query("transactions").collect(),
      ctx.db.query("subscriptions").collect(),
      ctx.db.query("webhookEvents").collect(),
    ]);
    return { transactions: transactions.length, subscriptions: subscriptions.length, events: events.length };
  },
});

// ─── Mutations ──────────────────────────────────────────────────────────────

export const recordTransaction = mutation({
  args: {
    txRef: v.string(),
    flwRef: v.optional(v.string()),
    transactionId: v.optional(v.string()),
    customerEmail: v.string(),
    amount: v.number(),
    currency: v.string(),
    status: transactionStatusValidator,
    paymentType: v.optional(v.string()),
    narration: v.optional(v.string()),
    paidAt: v.optional(v.number()),
    metadata: v.optional(v.string()),
  },
  returns: v.id("transactions"),
  handler: async (ctx, args) => {
    const now = Date.now();
    const existing = await ctx.db
      .query("transactions")
      .withIndex("by_txRef", (q) => q.eq("txRef", args.txRef))
      .first();

    if (existing) {
      // Keep the email the merchant originally passed to initializeTransaction
      // rather than whatever the webhook/verify response echoes back. Some
      // processors (Flutterwave's test mode, notably) rewrite the customer
      // email in their own responses — e.g. prefixing it with a sandbox
      // routing tag like "ravesb_<hash>_" — which would otherwise silently
      // overwrite the real address callers query by.
      const { customerEmail: _incomingEmail, ...rest } = args;
      await ctx.db.patch(existing._id, { ...rest, updatedAt: now });
      return existing._id;
    }

    return await ctx.db.insert("transactions", {
      ...args,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const recordSubscriptionEvent = mutation({
  args: {
    subscriptionId: v.string(),
    customerEmail: v.string(),
    planId: v.optional(v.string()),
    amount: v.optional(v.number()),
    status: subscriptionStatusValidator,
  },
  returns: v.id("subscriptions"),
  handler: async (ctx, args) => {
    const now = Date.now();
    const existing = await ctx.db
      .query("subscriptions")
      .withIndex("by_subscriptionId", (q) => q.eq("subscriptionId", args.subscriptionId))
      .first();

    if (existing) {
      // Same reasoning as recordTransaction: don't let a later webhook or
      // sync call overwrite the email a subscription was first recorded
      // under with a processor-mangled value.
      const { customerEmail: _incomingEmail, ...rest } = args;
      await ctx.db.patch(existing._id, { ...rest, updatedAt: now });
      return existing._id;
    }

    return await ctx.db.insert("subscriptions", {
      ...args,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateSubscriptionStatus = mutation({
  args: {
    subscriptionId: v.string(),
    status: subscriptionStatusValidator,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("subscriptions")
      .withIndex("by_subscriptionId", (q) => q.eq("subscriptionId", args.subscriptionId))
      .first();
    if (!existing) return null;
    await ctx.db.patch(existing._id, { status: args.status, updatedAt: Date.now() });
    return null;
  },
});

export const checkAndRecordEvent = mutation({
  args: {
    eventId: v.string(),
    eventType: v.string(),
    txRef: v.optional(v.string()),
    payload: v.string(),
  },
  returns: v.object({ alreadyProcessed: v.boolean() }),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("webhookEvents")
      .withIndex("by_eventId", (q) => q.eq("eventId", args.eventId))
      .first();
    if (existing) {
      return { alreadyProcessed: true };
    }
    await ctx.db.insert("webhookEvents", { ...args, receivedAt: Date.now() });
    return { alreadyProcessed: false };
  },
});
