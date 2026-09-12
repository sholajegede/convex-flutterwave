import { useEffect, useState } from "react";
import { useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Card, Button, Spinner } from "./ui";
import { formatAmount } from "../lib/currency";
import { savePendingAttempt } from "../lib/pendingAttempt";
import { useLog } from "../lib/logStore";
import { WebhookUrlNote } from "./WebhookUrlNote";

type Plan = { planId: string; name: string; amount: number; interval: string };

export function SubscriptionPayment({
  email,
  setEmail,
  onError,
}: {
  email: string;
  setEmail: (email: string) => void;
  onError: (message: string) => void;
}) {
  const [plans, setPlans] = useState<Record<string, Plan> | null>(null);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [subscribing, setSubscribing] = useState<string | null>(null);

  const ensureDemoPlans = useAction(api.example.ensureDemoPlans);
  const initializeTransaction = useAction(api.example.initializeTransaction);
  const { log } = useLog();

  useEffect(() => {
    let cancelled = false;
    log("Checking Flutterwave for existing demo plans…");
    ensureDemoPlans({})
      .then((result) => {
        if (!cancelled) {
          setPlans(result as Record<string, Plan>);
          log("Demo plans ready.", "success");
        }
      })
      .catch((err) => {
        const message = err instanceof Error ? err.message : "Failed to load plans";
        if (!cancelled) {
          onError(message);
          log(`Failed to load plans: ${message}`, "error");
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingPlans(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function subscribe(plan: Plan) {
    if (!email) return;
    setSubscribing(plan.planId);
    log(`Starting checkout for ${plan.name} (${email})…`);
    try {
      const result = await initializeTransaction({
        email,
        amount: plan.amount,
        paymentPlan: plan.planId,
        redirectUrl: window.location.origin + window.location.pathname,
      });
      log(`Checkout ready — ref=${result.txRef}. Redirecting to Flutterwave…`, "success");
      savePendingAttempt({
        kind: "subscription",
        email,
        planId: plan.planId,
        label: `${plan.name} subscription`,
      });
      window.location.assign(result.paymentLink);
    } catch (err) {
      setSubscribing(null);
      const message = err instanceof Error ? err.message : "Failed to start subscription";
      log(`Checkout failed: ${message}`, "error");
      onError(message);
    }
  }

  return (
    <Card className="flow-card">
      <h2>Subscribe to a demo plan</h2>
      <p className="flow-card__lede">
        Flutterwave bills these plans on a recurring schedule. The first payment starts the
        subscription; there's no "subscription created" webhook, so this component syncs the
        result straight from Flutterwave right after checkout returns.
      </p>

      <WebhookUrlNote />

      <label className="field">
        <span>Email</span>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
        />
      </label>

      {loadingPlans && (
        <div className="plan-loading">
          <Spinner /> <span>Setting up demo plans on your Flutterwave account…</span>
        </div>
      )}

      {plans && (
        <div className="plan-grid">
          {Object.entries(plans).map(([key, plan]) => (
            <div key={key} className={`plan-card ${key === "yearly" ? "plan-card--highlight" : ""}`}>
              {key === "yearly" && <span className="plan-card__ribbon">2 months free</span>}
              <h3>{key === "yearly" ? "Yearly" : "Monthly"}</h3>
              <p className="plan-card__price">
                {formatAmount(plan.amount, "NGN")}
                <span>/{plan.interval === "yearly" ? "year" : "month"}</span>
              </p>
              <Button
                variant={key === "yearly" ? "primary" : "secondary"}
                onClick={() => subscribe(plan)}
                disabled={!email || subscribing !== null}
              >
                {subscribing === plan.planId ? "Starting checkout…" : "Subscribe"}
              </Button>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
