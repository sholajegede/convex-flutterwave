import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

/**
 * Flutterwave has no "subscription created" webhook, and even
 * `subscription.cancelled` only ever reaches Convex if this URL is
 * registered in the Dashboard. Surfacing the exact URL, with a copy
 * button, turns "why isn't my subscription updating" into a two-second
 * fix instead of a debugging session.
 */
export function WebhookUrlNote() {
  const url = useQuery(api.example.getWebhookUrl, {});
  const [copied, setCopied] = useState(false);

  async function copy() {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard access can be blocked (permissions, insecure context) —
      // the URL is still shown in plain text, so nothing else to do.
    }
  }

  return (
    <div className="webhook-note">
      <span className="webhook-note__label">Webhook URL for this deployment</span>
      <div className="webhook-note__row">
        <code>{url ?? "connecting…"}</code>
        {url && (
          <button className="link-button" onClick={copy}>
            {copied ? "Copied!" : "Copy"}
          </button>
        )}
      </div>
      <p>
        Register this exact URL in Flutterwave Dashboard → Settings → Webhooks, with the same
        secret hash you set as <code>FLW_WEBHOOK_SECRET_HASH</code>. Without it, subscription
        cancellations never reach Convex — transactions still update because{" "}
        <code>verifyTransaction</code> calls Flutterwave directly, but subscriptions rely on
        the webhook (or the "Sync from Flutterwave" button on the History screen).
      </p>
    </div>
  );
}
