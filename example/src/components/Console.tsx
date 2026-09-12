import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useLog } from "../lib/logStore";

type Row = {
  id: string;
  ts: number;
  tag: string;
  message: string;
  payload?: string;
  tone: "info" | "success" | "error" | "webhook";
};

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString("en-GB", { hour12: false });
}

function prettyPayload(payload: string): string {
  try {
    return JSON.stringify(JSON.parse(payload), null, 2);
  } catch {
    return payload;
  }
}

/**
 * A Convex-styled developer console docked to the right edge of the
 * screen, showing the full lifecycle of a payment: client actions
 * (checkout started, verifying…) interleaved with the real webhook
 * events this component recorded, in the order they actually happened —
 * reactive, since the webhook half comes straight from `listRecentEvents`.
 *
 * It's a true side dock, not an overlay: the app shell adds matching
 * right padding while it's open, so the console never covers content
 * underneath it (on narrow screens it falls back to a slide-over drawer
 * with a scrim instead, since there's no room to push content aside).
 */
export function Console({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { logs, clear } = useLog();
  const [expanded, setExpanded] = useState<string | null>(null);
  const events = useQuery(api.example.listRecentEvents, { limit: 40 });
  const bottomRef = useRef<HTMLDivElement>(null);

  const rows: Row[] = useMemo(() => {
    const webhookRows: Row[] = (events ?? []).map((e) => ({
      id: e._id,
      ts: e.receivedAt,
      tag: "webhook",
      message: `${e.eventType}${e.txRef ? `  ref=${e.txRef}` : ""}`,
      payload: e.payload,
      tone: "webhook",
    }));
    const clientRows: Row[] = logs.map((l) => ({
      id: l.id,
      ts: l.ts,
      tag: "client",
      message: l.message,
      tone: l.level,
    }));
    return [...webhookRows, ...clientRows].sort((a, b) => a.ts - b.ts).slice(-80);
  }, [events, logs]);

  useEffect(() => {
    if (open) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [rows.length, open]);

  return (
    <>
      {!open && (
        <button className="console-toggle" onClick={() => onOpenChange(true)}>
          <span className="console__dot" />
          <span className="console-toggle__label">Live console</span>
          <span className="console-toggle__count">{rows.length}</span>
        </button>
      )}

      <div className={`console ${open ? "console--open" : ""}`}>
        <button className="console__bar" onClick={() => onOpenChange(!open)}>
          <span className="console__dot" />
          <span className="console__title">Convex live console</span>
          <span className="console__count">{rows.length} events</span>
          <span className="console__chevron">✕</span>
        </button>

        <div className="console__body">
          <div className="console__log">
            {rows.length === 0 && (
              <p className="console__empty">
                Nothing yet — start a payment to watch the lifecycle land here.
              </p>
            )}
            {rows.map((row) => (
              <div key={row.id} className="console__entry">
                <button
                  className={`console__row console__row--${row.tone}`}
                  onClick={() => row.payload && setExpanded(expanded === row.id ? null : row.id)}
                >
                  <span className="console__time">{formatTime(row.ts)}</span>
                  <span className={`console__tag console__tag--${row.tag}`}>{row.tag}</span>
                  <span className="console__message">{row.message}</span>
                  {row.payload && <span className="console__expand">{expanded === row.id ? "hide" : "view"}</span>}
                </button>
                {row.payload && expanded === row.id && (
                  <pre className="console__payload">{prettyPayload(row.payload)}</pre>
                )}
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
          <div className="console__footer">
            <span>
              {events === undefined
                ? "connecting to Convex…"
                : `${events.length} webhook ${events.length === 1 ? "event" : "events"} recorded`}
            </span>
            <button className="link-button link-button--console" onClick={clear}>
              Clear client log
            </button>
          </div>
        </div>
      </div>

      {open && <div className="console-scrim" onClick={() => onOpenChange(false)} />}
    </>
  );
}
