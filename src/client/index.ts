import { httpActionGeneric } from "convex/server";
import type { GenericActionCtx, GenericDataModel } from "convex/server";
import type { ComponentApi } from "../component/_generated/component.js";

const FLUTTERWAVE_API_BASE = "https://api.flutterwave.com/v3";

export type FlutterwaveOptions = {
  secretKey: string;
  webhookSecretHash: string;
};

export type InitializeTransactionArgs = {
  email: string;
  amount: number;
  currency?: string;
  redirectUrl: string;
  txRef?: string;
  customerName?: string;
  customerPhoneNumber?: string;
  metadata?: Record<string, unknown>;
};

export type InitializeTransactionResult = {
  paymentLink: string;
  txRef: string;
};

export type VerifyTransactionResult = {
  status: string;
  txRef: string;
  flwRef?: string;
  transactionId: string;
  amount: number;
  currency: string;
  paymentType?: string;
  narration?: string;
  paidAt?: number;
  customerEmail: string;
};

// Flutterwave does not sign webhook payloads. Instead, it echoes back the
// secret hash you configured in the Dashboard, verbatim, in a `verif-hash`
// header — verification is a direct (constant-time) string comparison, not
// an HMAC digest of the request body. See:
// https://developer.flutterwave.com/docs/integration-guides/webhooks
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

export class Flutterwave {
  webhookHandler: ReturnType<typeof httpActionGeneric>;

  constructor(
    private component: ComponentApi,
    private options: FlutterwaveOptions,
  ) {
    const component_ = component;
    const webhookSecretHash = options.webhookSecretHash;

    this.webhookHandler = httpActionGeneric(async (ctx, request) => {
      const rawBody = await request.text();
      const signature = request.headers.get("verif-hash");

      if (!signature) {
        return new Response(JSON.stringify({ error: "Missing signature" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      if (!timingSafeEqual(webhookSecretHash, signature)) {
        console.error("convex-flutterwave: webhook signature mismatch");
        return new Response(JSON.stringify({ error: "Invalid signature" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }

      let event: { event: string; data: Record<string, unknown> };
      try {
        event = JSON.parse(rawBody);
      } catch {
        return new Response(JSON.stringify({ error: "Invalid JSON" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      const data = event.data ?? {};
      const eventId =
        data.id !== undefined
          ? `${event.event}:${data.id}`
          : `${event.event}:${(data.tx_ref as string) ?? crypto.randomUUID()}`;

      const { alreadyProcessed } = await ctx.runMutation(component_.lib.checkAndRecordEvent, {
        eventId,
        eventType: event.event,
        txRef: (data.tx_ref as string) ?? undefined,
        payload: rawBody,
      });

      if (alreadyProcessed) {
        return new Response(JSON.stringify({ success: true, duplicate: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      switch (event.event) {
        case "charge.completed": {
          const customer = data.customer as Record<string, unknown> | undefined;
          const status = (data.status as string) === "successful" ? "successful" : "failed";
          await ctx.runMutation(component_.lib.recordTransaction, {
            txRef: data.tx_ref as string,
            flwRef: (data.flw_ref as string) ?? undefined,
            transactionId: data.id !== undefined ? String(data.id) : undefined,
            customerEmail: (customer?.email as string) ?? "",
            amount: data.amount as number,
            currency: (data.currency as string) ?? "NGN",
            status,
            paymentType: (data.payment_type as string) ?? undefined,
            narration: (data.narration as string) ?? undefined,
            paidAt: data.created_at ? new Date(data.created_at as string).getTime() : undefined,
            metadata: data.meta ? JSON.stringify(data.meta) : undefined,
          });
          break;
        }
        case "subscription.cancelled": {
          const planId = (data.plan as string) ?? undefined;
          const customer = data.customer as Record<string, unknown> | undefined;
          if (data.id !== undefined) {
            await ctx.runMutation(component_.lib.recordSubscriptionEvent, {
              subscriptionId: String(data.id),
              customerEmail: (customer?.email as string) ?? "",
              planId,
              amount: (data.amount as number) ?? undefined,
              status: "cancelled",
            });
          }
          break;
        }
        default:
          break;
      }

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });
  }

  async initializeTransaction(
    ctx: GenericActionCtx<GenericDataModel>,
    args: InitializeTransactionArgs,
  ): Promise<InitializeTransactionResult> {
    const txRef = args.txRef ?? crypto.randomUUID();

    const res = await fetch(`${FLUTTERWAVE_API_BASE}/payments`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.options.secretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        tx_ref: txRef,
        amount: args.amount,
        currency: args.currency ?? "NGN",
        redirect_url: args.redirectUrl,
        customer: {
          email: args.email,
          name: args.customerName,
          phonenumber: args.customerPhoneNumber,
        },
        meta: args.metadata,
      }),
    });
    const json = (await res.json()) as {
      status: string;
      message?: string;
      data: { link: string };
    };
    if (json.status !== "success") {
      throw new Error(json.message ?? "Failed to initialize Flutterwave transaction");
    }

    await ctx.runMutation(this.component.lib.recordTransaction, {
      txRef,
      customerEmail: args.email,
      amount: args.amount,
      currency: args.currency ?? "NGN",
      status: "pending",
      metadata: args.metadata ? JSON.stringify(args.metadata) : undefined,
    });

    return { paymentLink: json.data.link, txRef };
  }

  async verifyTransaction(
    ctx: GenericActionCtx<GenericDataModel>,
    args: { transactionId: string },
  ): Promise<VerifyTransactionResult> {
    const res = await fetch(
      `${FLUTTERWAVE_API_BASE}/transactions/${encodeURIComponent(args.transactionId)}/verify`,
      { headers: { Authorization: `Bearer ${this.options.secretKey}` } },
    );
    const json = (await res.json()) as {
      status: string;
      message?: string;
      data: {
        id: number;
        tx_ref: string;
        flw_ref?: string;
        status: string;
        amount: number;
        currency: string;
        payment_type?: string;
        narration?: string;
        created_at?: string;
        customer?: { email?: string };
      };
    };
    if (json.status !== "success") {
      throw new Error(json.message ?? "Failed to verify Flutterwave transaction");
    }
    const data = json.data;
    const status = data.status === "successful" ? "successful" : "failed";

    await ctx.runMutation(this.component.lib.recordTransaction, {
      txRef: data.tx_ref,
      flwRef: data.flw_ref ?? undefined,
      transactionId: String(data.id),
      customerEmail: data.customer?.email ?? "",
      amount: data.amount,
      currency: data.currency,
      status,
      paymentType: data.payment_type ?? undefined,
      narration: data.narration ?? undefined,
      paidAt: data.created_at ? new Date(data.created_at).getTime() : undefined,
    });

    return {
      status: data.status,
      txRef: data.tx_ref,
      flwRef: data.flw_ref ?? undefined,
      transactionId: String(data.id),
      amount: data.amount,
      currency: data.currency,
      paymentType: data.payment_type ?? undefined,
      narration: data.narration ?? undefined,
      paidAt: data.created_at ? new Date(data.created_at).getTime() : undefined,
      customerEmail: data.customer?.email ?? "",
    };
  }

  async cancelSubscription(
    ctx: GenericActionCtx<GenericDataModel>,
    args: { subscriptionId: string; customerEmail: string },
  ): Promise<void> {
    const res = await fetch(
      `${FLUTTERWAVE_API_BASE}/subscriptions/${encodeURIComponent(args.subscriptionId)}/cancel`,
      { method: "PUT", headers: { Authorization: `Bearer ${this.options.secretKey}` } },
    );
    const json = (await res.json()) as { status: string; message?: string };
    if (json.status !== "success") {
      throw new Error(json.message ?? "Failed to cancel Flutterwave subscription");
    }
    await ctx.runMutation(this.component.lib.recordSubscriptionEvent, {
      subscriptionId: args.subscriptionId,
      customerEmail: args.customerEmail,
      status: "cancelled",
    });
  }

  async enableSubscription(
    ctx: GenericActionCtx<GenericDataModel>,
    args: { subscriptionId: string; customerEmail: string },
  ): Promise<void> {
    const res = await fetch(
      `${FLUTTERWAVE_API_BASE}/subscriptions/${encodeURIComponent(args.subscriptionId)}/activate`,
      { method: "PUT", headers: { Authorization: `Bearer ${this.options.secretKey}` } },
    );
    const json = (await res.json()) as { status: string; message?: string };
    if (json.status !== "success") {
      throw new Error(json.message ?? "Failed to activate Flutterwave subscription");
    }
    await ctx.runMutation(this.component.lib.recordSubscriptionEvent, {
      subscriptionId: args.subscriptionId,
      customerEmail: args.customerEmail,
      status: "active",
    });
  }

  async getTransaction(ctx: RunQueryCtx, args: { txRef: string }) {
    return await ctx.runQuery(this.component.lib.getTransaction, args);
  }

  async listTransactions(ctx: RunQueryCtx, args: { customerEmail: string; limit?: number }) {
    return await ctx.runQuery(this.component.lib.listTransactions, args);
  }

  async getSubscription(ctx: RunQueryCtx, args: { subscriptionId: string }) {
    return await ctx.runQuery(this.component.lib.getSubscription, args);
  }

  async listSubscriptions(ctx: RunQueryCtx, args: { customerEmail: string }) {
    return await ctx.runQuery(this.component.lib.listSubscriptions, args);
  }

  async hasActiveSubscription(ctx: RunQueryCtx, args: { customerEmail: string }): Promise<boolean> {
    return await ctx.runQuery(this.component.lib.hasActiveSubscription, args);
  }
}

type RunQueryCtx = {
  runQuery: GenericActionCtx<GenericDataModel>["runQuery"];
};
