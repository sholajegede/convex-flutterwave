# convex-flutterwave

**Accept payments and subscriptions with Flutterwave in your Convex app.** Reactive transactions, subscription state, and webhook ingestion.

[![npm version](https://img.shields.io/npm/v/convex-flutterwave)](https://www.npmjs.com/package/convex-flutterwave)
[![Convex Component](https://www.convex.dev/components/badge/sholajegede/convex-flutterwave)](https://www.convex.dev/components/sholajegede/convex-flutterwave)
[![npm downloads](https://img.shields.io/npm/dw/convex-flutterwave)](https://www.npmjs.com/package/convex-flutterwave)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue)](./LICENSE)

```ts
const flutterwave = new Flutterwave(components.convexFlutterwave, {
  secretKey: process.env.FLW_SECRET_KEY!,
  webhookSecretHash: process.env.FLW_WEBHOOK_SECRET_HASH!,
});

// Start a checkout
const { paymentLink } = await flutterwave.initializeTransaction(ctx, {
  email: "customer@example.com",
  amount: 5000,
  redirectUrl: "https://yourapp.com/payment/callback",
});

// Confirm it server-side after redirect
const result = await flutterwave.verifyTransaction(ctx, { transactionId });

// Is this customer on an active subscription?
const active = await flutterwave.hasActiveSubscription(ctx, { customerEmail: "customer@example.com" });
```

## What this does

Flutterwave fires webhook events every time a payment action happens — a charge completes, a subscription is cancelled. Without this component, you have to write and maintain your own webhook receiver, HMAC signature verification, database schema, and reactive queries.

This component owns all of that. Drop it in, mount the webhook, and your Convex app immediately has:

- **Reactive transaction state** — every transaction, live in Convex, keyed by `tx_ref`
- **Reactive subscription state** — subscription status for recurring payment plans, live in Convex
- **Checkout** — `initializeTransaction()` generates a Flutterwave-hosted payment link
- **Server-side verification** — `verifyTransaction()` confirms a transaction directly with Flutterwave
- **Subscription management** — `cancelSubscription()` / `enableSubscription()` call Flutterwave directly and keep local state in sync
- **Webhook idempotency** — duplicate deliveries of the same event are detected and skipped

> **API version:** This component uses Flutterwave's v3 Standard integration (`api.flutterwave.com/v3`) — a static secret key, not the newer v4 OAuth flow. v3 remains fully supported and is what most existing Flutterwave integrations use.

> **Webhook timing:** After a payment action occurs in Flutterwave, there is a short delay — usually a few seconds — before the webhook arrives and your Convex data updates. Once the webhook arrives, Convex's real-time reactivity propagates the change to all subscribers instantly.

## Table of Contents

- [Install](#install)
- [Quick Start](#quick-start)
- [Setup](#setup)
- [Usage](#usage)
- [Checkout](#checkout)
- [Subscriptions](#subscriptions)
- [API Reference](#api-reference)
- [Type Reference](#type-reference)
- [Webhook Events](#webhook-events)
- [Database Schema](#database-schema)
- [Customer IDs](#customer-ids)
- [Testing](#testing)
- [Limitations](#limitations)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [Changelog](#changelog)

## Install

```bash
npm install convex-flutterwave
```

**Requirements:** Convex v1.33.1 or later, Node.js 18+, a [Flutterwave](https://flutterwave.com) account

## Quick Start

Five steps to add Flutterwave to your Convex app.

### 1. Add the component

In `convex/convex.config.ts`:

```ts
import { defineApp } from "convex/server";
import convexFlutterwave from "convex-flutterwave/convex.config";

const app = defineApp();
app.use(convexFlutterwave);

export default app;
```

### 2. Set environment variables

```bash
npx convex env set FLW_SECRET_KEY FLWSECK-xxxxxxxxxxxx
npx convex env set FLW_WEBHOOK_SECRET_HASH your-chosen-secret-hash
```

`FLW_WEBHOOK_SECRET_HASH` is a random value **you** choose and enter in the Flutterwave dashboard — it's separate from your API secret key.

### 3. Mount the webhook handler

In `convex/http.ts`:

```ts
import { httpRouter } from "convex/server";
import { components } from "./_generated/api";
import { Flutterwave } from "convex-flutterwave";

const flutterwave = new Flutterwave(components.convexFlutterwave, {
  secretKey: process.env.FLW_SECRET_KEY!,
  webhookSecretHash: process.env.FLW_WEBHOOK_SECRET_HASH!,
});

const http = httpRouter();

http.route({
  path: "/webhooks/flutterwave",
  method: "POST",
  handler: flutterwave.webhookHandler,
});

export default http;
```

### 4. Register the webhook in Flutterwave

1. In Flutterwave Dashboard → **Settings → Webhooks**
2. Set the webhook URL: `https://your-deployment.convex.site/webhooks/flutterwave`
3. Set the same secret hash you stored as `FLW_WEBHOOK_SECRET_HASH`
4. Save. Flutterwave sends every event to this URL — the handler ignores events it doesn't recognize.

Your Convex site URL is in the Convex dashboard under **Settings → URL & Deploy Key** — it ends in `.convex.site`.

### 5. Initialize the client

In `convex/payments.ts`:

```ts
import { components } from "./_generated/api";
import { Flutterwave } from "convex-flutterwave";

export const flutterwave = new Flutterwave(components.convexFlutterwave, {
  secretKey: process.env.FLW_SECRET_KEY!,
  webhookSecretHash: process.env.FLW_WEBHOOK_SECRET_HASH!,
});
```

Import `flutterwave` from this file in any Convex function that needs payments.

## Setup

**`convex/payments.ts`** — your central payments module:

```ts
import { components } from "./_generated/api";
import { Flutterwave } from "convex-flutterwave";
import { action } from "./_generated/server";
import { v } from "convex/values";

export const flutterwave = new Flutterwave(components.convexFlutterwave, {
  secretKey: process.env.FLW_SECRET_KEY!,
  webhookSecretHash: process.env.FLW_WEBHOOK_SECRET_HASH!,
});

export const checkout = action({
  args: { email: v.string(), amount: v.number(), redirectUrl: v.string() },
  handler: async (ctx, args) => flutterwave.initializeTransaction(ctx, args),
});
```

**`convex/http.ts`** — webhook entry point (shown in [Quick Start](#quick-start)).

## Usage

### Start a checkout

```ts
export const checkout = action({
  args: { email: v.string(), amount: v.number() },
  handler: async (ctx, args) => {
    return await flutterwave.initializeTransaction(ctx, {
      email: args.email,
      amount: args.amount, // major currency unit — e.g. naira, not kobo
      redirectUrl: "https://yourapp.com/payment/callback",
    });
  },
});
// Returns: { paymentLink, txRef }
// Redirect the customer to paymentLink.
```

### Verify a transaction

```ts
export const confirmPayment = action({
  args: { transactionId: v.string() },
  handler: async (ctx, args) => {
    return await flutterwave.verifyTransaction(ctx, args);
  },
});
// Returns: { status, txRef, flwRef, transactionId, amount, currency, customerEmail, ... }
```

Flutterwave redirects to your `redirectUrl` with `transaction_id` and `tx_ref` query params — pass `transaction_id` into `verifyTransaction`.

### Read a transaction reactively

```ts
export const getTransaction = query({
  args: { txRef: v.string() },
  handler: async (ctx, args) => {
    return await flutterwave.getTransaction(ctx, args);
  },
});
// Returns: Transaction | null
```

### List a customer's transactions

```ts
export const getHistory = query({
  args: { customerEmail: v.string() },
  handler: async (ctx, args) => {
    return await flutterwave.listTransactions(ctx, {
      customerEmail: args.customerEmail,
      limit: 20,
    });
  },
});
// Returns: Transaction[] ordered newest first
```

## Checkout

`initializeTransaction()` calls Flutterwave's [Standard payment](https://developer.flutterwave.com/docs/collecting-payments/standard) endpoint, records a `pending` transaction locally, and returns the hosted payment link. Send the customer to `paymentLink`; Flutterwave redirects them back to `redirectUrl` after payment.

Call `verifyTransaction()` from your callback route (or rely on the `charge.completed` webhook) to confirm the final status — never trust the client-side redirect alone.

## Subscriptions

Recurring billing on Flutterwave is built on **Payment Plans**: a customer subscribes by paying against a plan, and Flutterwave manages renewals. This component mirrors subscription state reactively as webhooks arrive, and exposes cancel/enable against Flutterwave's [Subscriptions API](https://developer.flutterwave.com/v3.0/reference/activate-a-subscription-1):

```ts
export const cancelPlan = action({
  args: { subscriptionId: v.string(), customerEmail: v.string() },
  handler: async (ctx, args) => {
    await flutterwave.cancelSubscription(ctx, args);
    return null;
  },
});
```

`subscriptionId` is Flutterwave's numeric subscription id, available via `getSubscription()` or the `subscription.cancelled` webhook.

## API Reference

| Method | Kind | Description |
| --- | --- | --- |
| `initializeTransaction(ctx, args)` | action | Starts a Flutterwave checkout, returns the hosted payment link |
| `verifyTransaction(ctx, args)` | action | Confirms a transaction's final status with Flutterwave |
| `cancelSubscription(ctx, args)` | action | Cancels a subscription on Flutterwave and locally |
| `enableSubscription(ctx, args)` | action | Re-activates a cancelled subscription |
| `getTransaction(ctx, args)` | query | Fetch one transaction by `tx_ref` |
| `listTransactions(ctx, args)` | query | List a customer's transactions, newest first |
| `getSubscription(ctx, args)` | query | Fetch one subscription by subscription id |
| `listSubscriptions(ctx, args)` | query | List a customer's subscriptions |
| `hasActiveSubscription(ctx, args)` | query | `true` if the customer has an active subscription |

## Type Reference

```ts
type InitializeTransactionArgs = {
  email: string;
  amount: number;
  currency?: string;
  redirectUrl: string;
  txRef?: string;
  customerName?: string;
  customerPhoneNumber?: string;
  metadata?: Record<string, unknown>;
};

type Transaction = {
  txRef: string;
  flwRef?: string;
  transactionId?: string;
  customerEmail: string;
  amount: number;
  currency: string;
  status: "pending" | "successful" | "failed" | "cancelled";
  paymentType?: string;
  narration?: string;
  paidAt?: number;
  metadata?: string;
};

type Subscription = {
  subscriptionId: string;
  customerEmail: string;
  planId?: string;
  amount?: number;
  status: "active" | "cancelled";
};
```

## Webhook Events

Flutterwave doesn't sign webhook payloads with a computed digest — it echoes back the exact secret hash you configured in the Dashboard, verbatim, in a `verif-hash` header. The webhook handler compares that header directly (constant-time) against `FLW_WEBHOOK_SECRET_HASH` before processing anything, and de-duplicates by event id so retried deliveries are safe. It currently acts on:

| Event | Effect |
| --- | --- |
| `charge.completed` | Upserts the transaction as `successful` or `failed` |
| `subscription.cancelled` | Marks the subscription `cancelled` |

All other event types are accepted (HTTP 200) but ignored, so you can register every event on one endpoint without errors.

## Database Schema

```ts
transactions: {
  txRef, flwRef?, transactionId?, customerEmail, amount, currency, status,
  paymentType?, narration?, paidAt?, metadata?,
  createdAt, updatedAt,
}

subscriptions: {
  subscriptionId, customerEmail, planId?, amount?, status,
  createdAt, updatedAt,
}

webhookEvents: {
  eventId, eventType, txRef?, payload, receivedAt,
}
```

## Customer IDs

This component keys everything on `customerEmail` — the email Flutterwave has on file for the transaction or subscription. If your app identifies customers a different way (e.g. an internal user id), keep a mapping from your own id to the email you pass into this component.

## Testing

```bash
npm run test
```

Component logic is tested with [`convex-test`](https://www.npmjs.com/package/convex-test) in `src/component/lib.test.ts`. Import `convex-flutterwave/test` in your own app to register this component's schema against your test instance.

## Limitations

- `amount` is in the currency's major unit (e.g. naira), unlike some processors that use subunits — this component passes it through as-is.
- Only the webhook events listed above update local state; other events are received but not persisted beyond the raw idempotency record.
- `cancelSubscription` / `enableSubscription` require Flutterwave's numeric subscription id, only available after a `subscription.cancelled` webhook or a call to Flutterwave's list-subscriptions endpoint.

## Troubleshooting

**Webhook returns 401** — the `verif-hash` header didn't match. Confirm `FLW_WEBHOOK_SECRET_HASH` matches exactly what's set as the secret hash in the Flutterwave Dashboard webhook settings — it is not your API secret key.

**Transaction stays `pending`** — `initializeTransaction` only records `pending`; it becomes `successful`/`failed` once the `charge.completed` webhook arrives or you call `verifyTransaction`.

**Subscription never appears** — subscriptions are created by Flutterwave when a customer pays against a payment plan, not by this component. Confirm the `subscription.cancelled` webhook is registered and reaching your endpoint, or fetch subscriptions directly from Flutterwave to backfill.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md).

## Changelog

See [CHANGELOG.md](./CHANGELOG.md).
