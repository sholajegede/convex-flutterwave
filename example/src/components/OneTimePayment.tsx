import { useState } from "react";
import { useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Card, Button, ChipPicker } from "./ui";
import { CURRENCIES, symbolFor, type CurrencyCode } from "../lib/currency";
import { savePendingAttempt } from "../lib/pendingAttempt";
import { useLog } from "../lib/logStore";

type PaymentOptionValue =
  | "card"
  | "account"
  | "banktransfer"
  | "ussd"
  | "nqr";

const PAYMENT_OPTIONS: Array<{ value: PaymentOptionValue; label: string }> = [
  { value: "card", label: "Card" },
  { value: "account", label: "Bank account" },
  { value: "banktransfer", label: "Bank transfer" },
  { value: "ussd", label: "USSD" },
  { value: "nqr", label: "QR" },
];

export function OneTimePayment({
  email,
  setEmail,
  onError,
}: {
  email: string;
  setEmail: (email: string) => void;
  onError: (message: string) => void;
}) {
  const [amount, setAmount] = useState(5000);
  const [currency, setCurrency] = useState<CurrencyCode>("NGN");
  const [paymentOptions, setPaymentOptions] = useState<PaymentOptionValue[]>([
    "card",
    "banktransfer",
    "ussd",
  ]);
  const [submitting, setSubmitting] = useState(false);

  const initializeTransaction = useAction(api.example.initializeTransaction);
  const { log } = useLog();

  function toggleOption(value: string) {
    const next = value as PaymentOptionValue;
    setPaymentOptions((prev) => (prev.includes(next) ? prev.filter((c) => c !== next) : [...prev, next]));
  }

  async function pay() {
    if (!email || amount <= 0) return;
    setSubmitting(true);
    log(`Initializing ${symbolFor(currency)}${amount.toLocaleString()} checkout for ${email}…`);
    try {
      const result = await initializeTransaction({
        email,
        amount,
        currency,
        paymentOptions: paymentOptions.length ? paymentOptions : undefined,
        redirectUrl: window.location.origin + window.location.pathname,
      });
      log(`Checkout ready — ref=${result.txRef}. Redirecting to Flutterwave…`, "success");
      savePendingAttempt({
        kind: "one-time",
        email,
        amount,
        currency,
        paymentOptions,
        label: `${symbolFor(currency)}${amount.toLocaleString()} one-time payment`,
      });
      window.location.assign(result.paymentLink);
    } catch (err) {
      setSubmitting(false);
      const message = err instanceof Error ? err.message : "Failed to start payment";
      log(`Checkout failed: ${message}`, "error");
      onError(message);
    }
  }

  return (
    <Card className="flow-card">
      <h2>One-time payment</h2>
      <p className="flow-card__lede">
        Amounts are in the currency's major unit — Flutterwave charges exactly what you enter,
        no subunit conversion.
      </p>

      <label className="field">
        <span>Email</span>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
        />
      </label>

      <div className="field-row">
        <label className="field field--amount">
          <span>Amount</span>
          <div className="amount-input">
            <span className="amount-input__symbol">{symbolFor(currency)}</span>
            <input
              type="number"
              min={1}
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
            />
          </div>
        </label>

        <label className="field field--currency">
          <span>Currency</span>
          <select value={currency} onChange={(e) => setCurrency(e.target.value as CurrencyCode)}>
            {CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.code} — {c.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className="field-hint">
        Not every currency is enabled on every Flutterwave account — if checkout rejects it,
        switch back to NGN or enable more in your Dashboard.
      </p>

      <label className="field">
        <span>Payment methods to offer at checkout</span>
        <ChipPicker options={PAYMENT_OPTIONS} selected={paymentOptions} onToggle={toggleOption} />
      </label>

      <Button onClick={pay} disabled={!email || amount <= 0 || submitting}>
        {submitting ? "Starting checkout…" : `Pay ${symbolFor(currency)}${amount.toLocaleString()} with Flutterwave`}
      </Button>
    </Card>
  );
}
