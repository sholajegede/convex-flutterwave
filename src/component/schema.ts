import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  transactions: defineTable({
    txRef: v.string(),
    flwRef: v.optional(v.string()),
    transactionId: v.optional(v.string()),
    customerEmail: v.string(),
    amount: v.number(),
    currency: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("successful"),
      v.literal("failed"),
      v.literal("cancelled"),
    ),
    paymentType: v.optional(v.string()),
    narration: v.optional(v.string()),
    paidAt: v.optional(v.number()),
    metadata: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_txRef", ["txRef"])
    .index("by_customerEmail", ["customerEmail"]),

  subscriptions: defineTable({
    subscriptionId: v.string(),
    customerEmail: v.string(),
    planId: v.optional(v.string()),
    amount: v.optional(v.number()),
    status: v.union(v.literal("active"), v.literal("cancelled")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_subscriptionId", ["subscriptionId"])
    .index("by_customerEmail", ["customerEmail"])
    .index("by_status", ["status"]),

  webhookEvents: defineTable({
    eventId: v.string(),
    eventType: v.string(),
    txRef: v.optional(v.string()),
    payload: v.string(),
    receivedAt: v.number(),
  })
    .index("by_eventId", ["eventId"])
    .index("by_eventType", ["eventType"]),
});
