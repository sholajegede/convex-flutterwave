# Changelog

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
