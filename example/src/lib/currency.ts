export type CurrencyCode = "NGN" | "GHS" | "KES" | "ZAR" | "USD";

export const CURRENCIES: Array<{ code: CurrencyCode; label: string; symbol: string }> = [
  { code: "NGN", label: "Nigerian Naira", symbol: "₦" },
  { code: "GHS", label: "Ghanaian Cedi", symbol: "GH₵" },
  { code: "KES", label: "Kenyan Shilling", symbol: "KSh" },
  { code: "ZAR", label: "South African Rand", symbol: "R" },
  { code: "USD", label: "US Dollar", symbol: "$" },
];

export function symbolFor(code: string): string {
  return CURRENCIES.find((c) => c.code === code)?.symbol ?? code + " ";
}

// Unlike Paystack (subunits — kobo, pesewas, cents), Flutterwave's `amount`
// is already in the currency's major unit, so no conversion happens here —
// the value the customer types is exactly what gets charged.
export function formatAmount(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      currencyDisplay: "narrowSymbol",
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${symbolFor(currency)}${amount.toLocaleString()}`;
  }
}
