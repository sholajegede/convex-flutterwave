/* eslint-disable */
/**
 * Generated `ComponentApi` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type { FunctionReference } from "convex/server";

/**
 * A utility for referencing a Convex component's exposed API.
 *
 * Useful when expecting a parameter like `components.myComponent`.
 * Usage:
 * ```ts
 * async function myFunction(ctx: QueryCtx, component: ComponentApi) {
 *   return ctx.runQuery(component.someFile.someQuery, { ...args });
 * }
 * ```
 */
export type ComponentApi<Name extends string | undefined = string | undefined> =
  {
    lib: {
      checkAndRecordEvent: FunctionReference<
        "mutation",
        "internal",
        { eventId: string; eventType: string; payload: string; txRef?: string },
        { alreadyProcessed: boolean },
        Name
      >;
      getStats: FunctionReference<
        "query",
        "internal",
        {},
        { events: number; subscriptions: number; transactions: number },
        Name
      >;
      getSubscription: FunctionReference<
        "query",
        "internal",
        { subscriptionId: string },
        null | {
          _creationTime: number;
          _id: string;
          amount?: number;
          createdAt: number;
          customerEmail: string;
          planId?: string;
          status: "active" | "cancelled";
          subscriptionId: string;
          updatedAt: number;
        },
        Name
      >;
      getTransaction: FunctionReference<
        "query",
        "internal",
        { txRef: string },
        null | {
          _creationTime: number;
          _id: string;
          amount: number;
          createdAt: number;
          currency: string;
          customerEmail: string;
          flwRef?: string;
          metadata?: string;
          narration?: string;
          paidAt?: number;
          paymentType?: string;
          status: "pending" | "successful" | "failed" | "cancelled";
          transactionId?: string;
          txRef: string;
          updatedAt: number;
        },
        Name
      >;
      hasActiveSubscription: FunctionReference<
        "query",
        "internal",
        { customerEmail: string },
        boolean,
        Name
      >;
      listRecentEvents: FunctionReference<
        "query",
        "internal",
        { limit?: number },
        Array<{
          _creationTime: number;
          _id: string;
          eventId: string;
          eventType: string;
          payload: string;
          receivedAt: number;
          txRef?: string;
        }>,
        Name
      >;
      listSubscriptions: FunctionReference<
        "query",
        "internal",
        { customerEmail: string },
        Array<{
          _creationTime: number;
          _id: string;
          amount?: number;
          createdAt: number;
          customerEmail: string;
          planId?: string;
          status: "active" | "cancelled";
          subscriptionId: string;
          updatedAt: number;
        }>,
        Name
      >;
      listTransactions: FunctionReference<
        "query",
        "internal",
        { customerEmail: string; limit?: number },
        Array<{
          _creationTime: number;
          _id: string;
          amount: number;
          createdAt: number;
          currency: string;
          customerEmail: string;
          flwRef?: string;
          metadata?: string;
          narration?: string;
          paidAt?: number;
          paymentType?: string;
          status: "pending" | "successful" | "failed" | "cancelled";
          transactionId?: string;
          txRef: string;
          updatedAt: number;
        }>,
        Name
      >;
      recordSubscriptionEvent: FunctionReference<
        "mutation",
        "internal",
        {
          amount?: number;
          customerEmail: string;
          planId?: string;
          status: "active" | "cancelled";
          subscriptionId: string;
        },
        string,
        Name
      >;
      recordTransaction: FunctionReference<
        "mutation",
        "internal",
        {
          amount: number;
          currency: string;
          customerEmail: string;
          flwRef?: string;
          metadata?: string;
          narration?: string;
          paidAt?: number;
          paymentType?: string;
          status: "pending" | "successful" | "failed" | "cancelled";
          transactionId?: string;
          txRef: string;
        },
        string,
        Name
      >;
      updateSubscriptionStatus: FunctionReference<
        "mutation",
        "internal",
        { status: "active" | "cancelled"; subscriptionId: string },
        null,
        Name
      >;
    };
  };
