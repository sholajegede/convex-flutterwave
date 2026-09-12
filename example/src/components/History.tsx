import { useState } from "react";
import { useQuery, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Card, Badge, StatusIcon } from "./ui";
import { formatAmount } from "../lib/currency";

export function History({ email, setEmail }: { email: string; setEmail: (email: string) => void }) {
  const [queryEmail, setQueryEmail] = useState(email);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  const transactions = useQuery(
    api.example.listTransactions,
    queryEmail ? { customerEmail: queryEmail } : "skip",
  );
  const subscriptions = useQuery(
    api.example.listSubscriptions,
    queryEmail ? { customerEmail: queryEmail } : "skip",
  );
  const cancelSubscription = useAction(api.example.cancelSubscription);
  const syncSubscriptions = useAction(api.example.syncSubscriptions);

  async function sync() {
    if (!queryEmail) return;
    setSyncing(true);
    setSyncMessage(null);
    try {
      const count = await syncSubscriptions({ email: queryEmail });
      setSyncMessage(
        count > 0
          ? `Synced ${count} subscription${count === 1 ? "" : "s"} from Flutterwave.`
          : "Flutterwave has no subscription on file for this email yet.",
      );
    } catch (err) {
      setSyncMessage(err instanceof Error ? err.message : "Sync failed");
    } finally {
      setSyncing(false);
    }
  }

  return (
    <Card className="flow-card">
      <h2>Transaction history</h2>
      <p className="flow-card__lede">
        This list is a live Convex query — it updates the instant a webhook records a new
        transaction or subscription event, no refresh needed.
      </p>

      <label className="field">
        <span>Email to look up</span>
        <input
          type="email"
          value={queryEmail}
          onChange={(e) => {
            setQueryEmail(e.target.value);
            setEmail(e.target.value);
          }}
          placeholder="you@example.com"
        />
      </label>

      {queryEmail && (
        <div className="history-section">
          <div className="history-section__header">
            <h3>Subscriptions</h3>
            <button className="link-button" onClick={sync} disabled={syncing}>
              {syncing ? "Syncing…" : "Sync from Flutterwave"}
            </button>
          </div>
          {syncMessage && <p className="history-section__note">{syncMessage}</p>}
          {subscriptions === undefined && <p>Loading…</p>}
          {subscriptions && subscriptions.length === 0 && (
            <p>
              None yet. Flutterwave has no "subscription created" webhook, so click "Sync from
              Flutterwave" above after subscribing — it reads the subscription straight from
              their API.
            </p>
          )}
          {subscriptions && subscriptions.length > 0 && (
            <ul className="history-list">
              {subscriptions.map((sub) => (
                <li key={sub._id} className="history-row">
                  <div>
                    <strong>{sub.planId ?? sub.subscriptionId}</strong>
                    <div className="history-row__meta">{sub.subscriptionId}</div>
                  </div>
                  <div className="history-row__right">
                    <Badge tone={sub.status === "active" ? "success" : "danger"}>
                      {sub.status}
                    </Badge>
                    {sub.status === "active" && (
                      <button
                        className="link-button"
                        onClick={() =>
                          cancelSubscription({
                            subscriptionId: sub.subscriptionId,
                            customerEmail: sub.customerEmail,
                          })
                        }
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {queryEmail && (
        <div className="history-section">
          <h3>Transactions</h3>
          {transactions === undefined && <p>Loading…</p>}
          {transactions && transactions.length === 0 && <p>No transactions yet for this email.</p>}
          {transactions && transactions.length > 0 && (
            <ul className="history-list">
              {transactions.map((tx) => (
                <li key={tx._id} className="history-row">
                  <div>
                    <StatusIcon status={tx.status} />
                    <span className="history-row__reference"><code>{tx.txRef}</code></span>
                  </div>
                  <div className="history-row__right">
                    <span>{formatAmount(tx.amount, tx.currency)}</span>
                    <Badge tone={tx.status === "successful" ? "success" : tx.status === "pending" ? "neutral" : "danger"}>
                      {tx.status}
                    </Badge>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Card>
  );
}
