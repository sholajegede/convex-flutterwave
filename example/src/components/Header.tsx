import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

export type Screen = "home" | "one-time" | "subscription" | "result" | "history";

export function Header({
  screen,
  onNavigate,
}: {
  screen: Screen;
  onNavigate: (screen: Screen) => void;
}) {
  const stats = useQuery(api.example.getStats, {});

  return (
    <header className="site-header">
      <div className="site-header__inner">
        <button className="site-header__brand" onClick={() => onNavigate("home")}>
          <span className="brand-mark">
            <span className="brand-mark__half brand-mark__half--flw">₦</span>
            <span className="brand-mark__half brand-mark__half--convex">λ</span>
          </span>
          <span className="site-header__name">convex-flutterwave</span>
        </button>

        <nav className="site-header__nav">
          <button
            className={screen === "home" ? "is-active" : ""}
            onClick={() => onNavigate("home")}
          >
            Overview
          </button>
          <button
            className={screen === "history" ? "is-active" : ""}
            onClick={() => onNavigate("history")}
          >
            History
          </button>
        </nav>

        <div className="site-header__right">
          <span className="stat-pill" title="Live Convex query — updates as webhooks arrive">
            <span className="stat-pill__dot" />
            {stats ? `${stats.transactions} tx` : "…"}
          </span>
          <span className="stat-pill stat-pill--muted">
            {stats ? `${stats.subscriptions} subs` : "…"}
          </span>
          <button className="cta-pill" onClick={() => onNavigate("one-time")}>
            New payment
          </button>
        </div>
      </div>
    </header>
  );
}
