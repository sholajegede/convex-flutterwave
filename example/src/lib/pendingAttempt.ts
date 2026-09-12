export type PendingAttempt =
  | {
      kind: "one-time";
      email: string;
      amount: number;
      currency: string;
      paymentOptions: string[];
      label: string;
    }
  | {
      kind: "subscription";
      email: string;
      planId: string;
      label: string;
    };

const STORAGE_KEY = "convex-flutterwave-demo:pending-attempt";

// Flutterwave's checkout is a full-page redirect, so React state doesn't
// survive the round trip — localStorage carries the attempt's context
// (what the customer was trying to do) across it, purely to make the
// result/retry screens friendlier. Wrapped in try/catch since storage
// access can be blocked (private windows, strict cookie settings, etc.).
export function savePendingAttempt(attempt: PendingAttempt) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(attempt));
  } catch {
    // Non-fatal — the flow still works, just without a "try again" label.
  }
}

export function readPendingAttempt(): PendingAttempt | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as PendingAttempt) : null;
  } catch {
    return null;
  }
}

export function clearPendingAttempt() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Non-fatal.
  }
}
