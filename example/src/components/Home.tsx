import { Button } from "./ui";
import type { Screen } from "./Header";

export function Home({ onNavigate }: { onNavigate: (screen: Screen) => void }) {
  return (
    <div className="home">
      <section className="hero">
        <div className="hero__dots" aria-hidden="true" />
        <div className="hero__content">
          <span className="eyebrow-pill">Live demo · test mode</span>
          <h1>
            Modern payments and subscriptions,
            <br />
            reactive by default
          </h1>
          <p>
            <strong>convex-flutterwave</strong> wraps Flutterwave Checkout, webhooks, and
            payment-plan billing in one Convex component. Try a real one-time payment or a
            subscription below — every step is visible in the live console (bottom-right).
          </p>
          <div className="hero__actions">
            <Button onClick={() => onNavigate("one-time")}>Try a payment →</Button>
            <button className="hero__secondary" onClick={() => onNavigate("subscription")}>
              Start a subscription
            </button>
          </div>
        </div>
      </section>

      <div className="brand-stripe" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>

      <section className="dev-panel">
        <div className="dev-panel__intro">
          <span className="eyebrow-pill eyebrow-pill--dark">Built for developers</span>
          <h2>Every webhook, reactive.</h2>
          <p>
            No polling, no queue to babysit. Flutterwave calls your webhook, this component
            checks the <code>verif-hash</code> header against your secret, dedupes by event id,
            and writes straight to Convex — every subscriber updates the instant it lands.
          </p>
          <button className="link-button link-button--light" onClick={() => onNavigate("history")}>
            View the reactive transaction history →
          </button>
        </div>
        <div className="terminal-card">
          <div className="terminal-card__dots">
            <span />
            <span />
            <span />
          </div>
          <pre>{`http.route({
  path: "/webhooks/flutterwave",
  method: "POST",
  handler: flutterwave.webhookHandler,
});

// charge.completed        → transactions.status = "successful" | "failed"
// subscription.cancelled  → subscriptions.status = "cancelled"
// (no "subscription created" event — sync it after checkout)`}</pre>
        </div>
      </section>
    </div>
  );
}
