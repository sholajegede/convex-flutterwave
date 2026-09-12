import { useEffect, useState } from "react";
import { useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Card, Button, Spinner, StatusIcon } from "./ui";
import { formatAmount } from "../lib/currency";
import { clearPendingAttempt, readPendingAttempt, type PendingAttempt } from "../lib/pendingAttempt";
import { useLog } from "../lib/logStore";

type VerifiedResult = {
  status: string;
  txRef: string;
  amount: number;
  currency: string;
  paymentType?: string;
  customerEmail: string;
};

export function Result({
  txRef,
  transactionId,
  redirectStatus,
  onRetry,
  onDone,
}: {
  txRef: string | null;
  transactionId: string | null;
  redirectStatus: string | null;
  onRetry: (attempt: PendingAttempt | null) => void;
  onDone: () => void;
}) {
  const [result, setResult] = useState<VerifiedResult | null>(null);
  const [loading, setLoading] = useState(transactionId !== null);
  const [error, setError] = useState<string | null>(null);
  const [syncNote, setSyncNote] = useState<string | null>(null);
  const [pending] = useState(readPendingAttempt);

  const verifyTransaction = useAction(api.example.verifyTransaction);
  const syncSubscriptions = useAction(api.example.syncSubscriptions);
  const { log } = useLog();

  useEffect(() => {
    let cancelled = false;

    if (!transactionId) {
      // Flutterwave's redirect only includes transaction_id on success — a
      // declined or abandoned payment redirects with just status=failed and
      // tx_ref, so there's nothing to verify server-side yet.
      return;
    }

    log(`Verifying transaction_id=${transactionId} with Flutterwave…`);
    verifyTransaction({ transactionId })
      .then(async (r) => {
        if (cancelled) return;
        setResult(r);
        log(
          r.status === "successful"
            ? `Verified — payment succeeded (${formatAmount(r.amount, r.currency)}).`
            : `Verified — payment ${r.status}.`,
          r.status === "successful" ? "success" : "error",
        );

        if (r.status === "successful" && pending?.kind === "subscription") {
          try {
            const synced = await syncSubscriptions({ email: pending.email });
            if (!cancelled) {
              log(
                synced > 0
                  ? `Synced ${synced} subscription${synced === 1 ? "" : "s"} from Flutterwave.`
                  : "No subscription found yet on Flutterwave for this email — it may still be processing.",
                synced > 0 ? "success" : "info",
              );
              setSyncNote(
                synced > 0
                  ? `Synced ${synced} subscription${synced === 1 ? "" : "s"} from Flutterwave.`
                  : "No subscription found yet — try again in a moment from the History screen.",
              );
            }
          } catch (err) {
            if (!cancelled) {
              log(`Couldn't sync subscription state: ${err instanceof Error ? err.message : "unknown error"}`, "error");
            }
          }
        }
      })
      .catch((err) => {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : "Failed to verify transaction";
          setError(message);
          log(`Verification failed: ${message}`, "error");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transactionId]);

  function handleDone() {
    clearPendingAttempt();
    onDone();
  }

  if (loading) {
    return (
      <Card className="flow-card result-card">
        <Spinner size={32} />
        <p>Verifying your transaction with Flutterwave…</p>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="flow-card result-card result-card--failed">
        <StatusIcon status="failed" />
        <p className="result-card__label">Couldn't verify this transaction</p>
        <p>{error}</p>
        <div className="result-card__actions">
          <Button variant="secondary" onClick={() => onRetry(pending)}>
            Try again
          </Button>
          <Button variant="ghost" onClick={handleDone}>
            Back home
          </Button>
        </div>
      </Card>
    );
  }

  // No transaction_id on the redirect — Flutterwave never created a
  // chargeable attempt (card declined at the gateway, checkout abandoned).
  if (!result) {
    const failed = redirectStatus === "failed" || redirectStatus === "cancelled";
    return (
      <Card className={`flow-card result-card ${failed ? "result-card--failed" : ""}`}>
        <StatusIcon status={failed ? "failed" : "pending"} />
        <p className="result-card__label">
          {failed ? "Payment wasn't completed" : "No transaction to show"}
        </p>
        {txRef && (
          <p className="result-card__label">
            Reference <code>{txRef}</code>
          </p>
        )}
        <div className="result-card__actions">
          <Button variant="secondary" onClick={() => onRetry(pending)}>
            Try again
          </Button>
          <Button variant="ghost" onClick={handleDone}>
            Back home
          </Button>
        </div>
      </Card>
    );
  }

  const success = result.status === "successful";

  return (
    <Card className={`flow-card result-card ${success ? "result-card--success" : "result-card--failed"}`}>
      <StatusIcon status={success ? "successful" : "failed"} />
      <p className="result-card__amount">{formatAmount(result.amount, result.currency)}</p>
      <p className="result-card__label">
        {success ? "Payment succeeded" : `Payment ${result.status}`}
      </p>

      <dl className="result-card__meta">
        <div>
          <dt>Reference</dt>
          <dd>{result.txRef}</dd>
        </div>
        <div>
          <dt>Email</dt>
          <dd>{result.customerEmail}</dd>
        </div>
        {result.paymentType && (
          <div>
            <dt>Method</dt>
            <dd>{result.paymentType}</dd>
          </div>
        )}
      </dl>

      {syncNote && <p className="result-card__note">{syncNote}</p>}

      <div className="result-card__actions">
        {success ? (
          <Button onClick={handleDone}>Done</Button>
        ) : (
          <>
            <Button variant="secondary" onClick={() => onRetry(pending)}>
              Try again
            </Button>
            <Button variant="ghost" onClick={handleDone}>
              Back home
            </Button>
          </>
        )}
      </div>
    </Card>
  );
}
