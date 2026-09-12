import type { ButtonHTMLAttributes, PropsWithChildren, ReactNode } from "react";

export function Card({ children, className = "" }: PropsWithChildren<{ className?: string }>) {
  return <div className={`ui-card ${className}`}>{children}</div>;
}

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

export function Button({
  children,
  variant = "primary",
  className = "",
  ...rest
}: PropsWithChildren<
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }
>) {
  return (
    <button className={`ui-button ui-button--${variant} ${className}`} {...rest}>
      {children}
    </button>
  );
}

export function Badge({ children, tone = "neutral" }: PropsWithChildren<{ tone?: "neutral" | "success" | "danger" | "brand" }>) {
  return <span className={`ui-badge ui-badge--${tone}`}>{children}</span>;
}

export function Spinner({ size = 22 }: { size?: number }) {
  return (
    <span
      className="ui-spinner"
      style={{ width: size, height: size, borderWidth: Math.max(2, size / 10) }}
      aria-label="Loading"
    />
  );
}

export function ChipPicker({
  options,
  selected,
  onToggle,
}: {
  options: Array<{ value: string; label: string }>;
  selected: string[];
  onToggle: (value: string) => void;
}) {
  return (
    <div className="ui-chip-row">
      {options.map((opt) => {
        const active = selected.includes(opt.value);
        return (
          <button
            type="button"
            key={opt.value}
            onClick={() => onToggle(opt.value)}
            className={`ui-chip ${active ? "ui-chip--active" : ""}`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

export function StatusIcon({ status }: { status: "successful" | "failed" | "pending" | "cancelled" }) {
  const map: Record<string, { icon: ReactNode; tone: string }> = {
    successful: { icon: "✓", tone: "success" },
    failed: { icon: "✕", tone: "danger" },
    cancelled: { icon: "!", tone: "danger" },
    pending: { icon: "…", tone: "neutral" },
  };
  const { icon, tone } = map[status] ?? map.pending;
  return <span className={`ui-status-icon ui-status-icon--${tone}`}>{icon}</span>;
}
