# Changelog

## 0.0.3

### Patch Changes

Fix `initializeTransaction`, `verifyTransaction`, `cancelSubscription`, `enableSubscription`, `createPaymentPlan`, `listPaymentPlans`, `syncCustomerSubscriptions`, and `syncSubscriptionsByPlan` being typed as `ctx: GenericActionCtx<GenericDataModel>`, which only type-checks when the calling app's schema is empty. Any real app with its own tables got a compile error on every one of these calls. Each now accepts a minimal structural ctx type matching what it actually touches (a mutation-only type, a combined mutation-and-query type for `verifyTransaction`, or `unknown` for the two payment-plan methods that never call `ctx` at all). The example app's schema was also given a real table, so this class of bug shows up in this repo's own typecheck from now on instead of only in a downstream app.

## 0.0.2

### Patch Changes

- Add demo screenshot to README

## 0.0.1

- Fix webhook verification to use Flutterwave's verif-hash header instead of a
  computed HMAC signature
- Add payment plans and subscription support (createPaymentPlan,
  listPaymentPlans, syncCustomerSubscriptions, syncSubscriptionsByPlan)
- Preserve the original customer email against Flutterwave's test-mode email
  rewriting
- Add a full example app: one-time payments, subscriptions, live webhook
  console, transaction/subscription history

## 0.0.0

- Initial release.
