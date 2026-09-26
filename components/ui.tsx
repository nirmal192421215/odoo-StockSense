import React from "react";

// ─── Status Pill ──────────────────────────────────────────────────────────
const stateClass: Record<string, string> = {
  draft:    "badge badge-draft",
  waiting:  "badge badge-waiting",
  ready:    "badge badge-ready",
  done:     "badge badge-done",
  canceled: "badge badge-canceled",
};

export function StatusPill({ state }: { state: string }) {
  return (
    <span className={stateClass[state] ?? "badge badge-draft"}>
      {state}
    </span>
  );
}

// ─── Alert Badge ──────────────────────────────────────────────────────────
export function AlertBadge({ kind }: { kind: "low_stock" | "out_of_stock" | null }) {
  if (!kind) return null;
  const cls = kind === "out_of_stock" ? "badge badge-out" : "badge badge-low";
  const label = kind === "out_of_stock" ? "Out of stock" : "Low stock";
  return <span className={cls}>{label}</span>;
}

// ─── Button ───────────────────────────────────────────────────────────────
type BtnVariant = "primary" | "secondary" | "danger" | "ghost";
type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: BtnVariant;
  size?: "sm" | "md";
  loading?: boolean;
};

const variantClass: Record<BtnVariant, string> = {
  primary:   "btn btn-primary",
  secondary: "btn btn-secondary",
  danger:    "btn btn-danger",
  ghost:     "btn btn-ghost",
};

export function Button({
  children,
  variant = "primary",
  size,
  loading,
  className = "",
  disabled,
  ...props
}: ButtonProps) {
  const cls = `${variantClass[variant]}${size === "sm" ? " btn-sm" : ""} ${className}`;
  return (
    <button className={cls} disabled={disabled || loading} {...props}>
      {loading ? (
        <svg
          className="loading-pulse"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
          <path d="M12 2a10 10 0 0110 10" strokeLinecap="round" />
        </svg>
      ) : null}
      {children}
    </button>
  );
}

// ─── Field (Form Label wrapper) ───────────────────────────────────────────
export function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span
        className="block text-xs font-semibold mb-1.5"
        style={{ color: "var(--ink-muted)", letterSpacing: "0.02em" }}
      >
        {label}
        {required && <span style={{ color: "#dc2626", marginLeft: 3 }}>*</span>}
      </span>
      {children}
      {hint && (
        <span className="block mt-1 text-xs" style={{ color: "var(--ink-faint)" }}>
          {hint}
        </span>
      )}
    </label>
  );
}

// ─── inputClass helper ────────────────────────────────────────────────────
export function inputClass(extra = "") {
  return `form-input ${extra}`.trim();
}

export function selectClass(extra = "") {
  return `form-input form-select ${extra}`.trim();
}

// ─── Page Header ──────────────────────────────────────────────────────────
export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="page-header">
      <div>
        <h1 className="page-title">{title}</h1>
        {subtitle && (
          <p className="text-sm mt-0.5" style={{ color: "var(--ink-muted)" }}>
            {subtitle}
          </p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────
export function EmptyState({
  title,
  subtitle,
  icon,
  action,
}: {
  title: string;
  subtitle?: string;
  icon?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="empty-state animate-fade-in">
      <div className="empty-state-icon">
        <span style={{ fontSize: "1.5rem" }}>{icon ?? "📦"}</span>
      </div>
      <div>
        <p className="empty-title">{title}</p>
        {subtitle && <p className="empty-subtitle">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

// ─── Card ─────────────────────────────────────────────────────────────────
export function Card({
  children,
  className = "",
  noPad,
}: {
  children: React.ReactNode;
  className?: string;
  noPad?: boolean;
}) {
  return (
    <div className={`card ${noPad ? "" : "p-5"} ${className}`}>
      {children}
    </div>
  );
}

// ─── Loading Skeleton ─────────────────────────────────────────────────────
export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`loading-pulse rounded ${className}`}
      style={{ background: "var(--border-light)" }}
    />
  );
}

// ─── Spinner ──────────────────────────────────────────────────────────────
export function Spinner() {
  return (
    <div className="flex items-center justify-center p-8">
      <svg
        className="loading-pulse"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
      >
        <circle
          cx="12"
          cy="12"
          r="10"
          stroke="var(--brand)"
          strokeWidth="2"
          strokeOpacity="0.2"
        />
        <path
          d="M12 2a10 10 0 0110 10"
          stroke="var(--brand)"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}
