// ── Shared Component Library ─────────────────────────────────────────────────
// These are the only button/form/badge primitives used in the app shell.
// All styles use existing design tokens only — no new values.

import type { ReactNode, ButtonHTMLAttributes, InputHTMLAttributes, TextareaHTMLAttributes, SelectHTMLAttributes } from "react";
import { cn } from "../ui/utils";

// ── Buttons ──────────────────────────────────────────────────────────────────

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode };

export function PrimaryButton({ className, children, ...props }: BtnProps) {
  return (
    <button
      className={cn(
        "bg-primary text-primary-foreground rounded-sm px-5 py-2.5 text-sm font-bold tracking-wide",
        "hover:brightness-110 active:scale-[0.97] transition-all duration-150",
        "disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function DangerButton({ className, children, ...props }: BtnProps) {
  return (
    <button
      className={cn(
        "bg-destructive text-white rounded-sm px-5 py-2.5 text-sm font-bold tracking-wide",
        "hover:brightness-110 active:scale-[0.97] transition-all duration-150",
        "disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function GhostButton({ className, children, ...props }: BtnProps) {
  return (
    <button
      className={cn(
        "bg-transparent text-muted-foreground border border-white/10 rounded-sm px-5 py-2.5 text-sm font-medium",
        "hover:text-foreground hover:border-white/20 transition-all duration-150",
        "disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

// ── Form Elements ─────────────────────────────────────────────────────────────

const inputBase =
  "bg-white/[0.04] border border-white/[0.08] rounded-lg px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/10 transition-colors w-full";

export function FormInput({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(inputBase, className)} {...props} />;
}

export function FormTextarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(inputBase, "resize-none", className)} {...props} />;
}

export function FormSelect({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement> & { children: ReactNode }) {
  return (
    <select
      className={cn(inputBase, "cursor-pointer appearance-none", className)}
      style={{ colorScheme: "dark" }}
      {...props}
    >
      {children}
    </select>
  );
}

// ── Severity Badge ────────────────────────────────────────────────────────────

const severityMap = {
  Critical: "text-red-400 bg-red-500/10 border border-red-500/20",
  High:     "text-orange-400 bg-orange-500/10 border border-orange-500/20",
  Moderate: "text-blue-400 bg-blue-500/10 border border-blue-500/20",
  Low:      "text-primary bg-primary/10 border border-primary/20",
} as const;

export function SeverityBadge({
  severity,
  className,
}: {
  severity: keyof typeof severityMap;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-sm",
        severityMap[severity] ?? severityMap.Low,
        className
      )}
    >
      {severity}
    </span>
  );
}

// ── Status Badge ─────────────────────────────────────────────────────────────

const statusMap = {
  available:  "text-primary bg-primary/10 border border-primary/20",
  dispatched: "text-orange-400 bg-orange-500/10 border border-orange-500/20",
  on_scene:   "text-blue-400 bg-blue-500/10 border border-blue-500/20",
  active:     "text-primary bg-primary/10 border border-primary/20",
  resolved:   "text-muted-foreground bg-white/5 border border-white/10",
} as const;

const statusLabel: Record<string, string> = {
  available:  "Available",
  dispatched: "Dispatched",
  on_scene:   "On Scene",
  active:     "Active",
  resolved:   "Resolved",
};

export function StatusBadge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-sm",
        statusMap[status as keyof typeof statusMap] ?? statusMap.resolved,
        className
      )}
    >
      {statusLabel[status] ?? status}
    </span>
  );
}

// ── Empty State ───────────────────────────────────────────────────────────────

export function EmptyState({ label, sub }: { label: string; sub?: string }) {
  return (
    <div className="py-24 flex flex-col items-center justify-center gap-3">
      <p className="text-muted-foreground/40 text-sm font-medium">{label}</p>
      {sub && <p className="text-muted-foreground/25 text-xs">{sub}</p>}
    </div>
  );
}

// ── Chip ──────────────────────────────────────────────────────────────────────

export function Chip({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "border rounded-sm px-3 py-1.5 text-xs cursor-pointer transition-all duration-100",
        selected
          ? "bg-primary/15 border-primary/40 text-primary"
          : "bg-transparent border-white/10 text-muted-foreground hover:border-white/20 hover:text-foreground"
      )}
    >
      {label}
    </button>
  );
}

// ── Metric Card ───────────────────────────────────────────────────────────────

import { useEffect, useRef } from "react";

export function MetricCard({ label, value }: { label: string; value: number }) {
  const numRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = numRef.current;
    if (!el) return;
    const start = performance.now();
    const duration = 500;

    const step = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
      el.textContent = Math.round(eased * value).toString();
      if (t < 1) requestAnimationFrame(step);
      else el.textContent = value.toString();
    };

    requestAnimationFrame(step);
  }, [value]);

  return (
    <div className="bg-white/[0.04] border border-white/[0.08] rounded-xl p-6">
      <p className="text-muted-foreground text-xs uppercase tracking-widest font-medium mb-2">
        {label}
      </p>
      <div ref={numRef} className="text-4xl font-bold text-foreground tabular-nums">
        {value}
      </div>
    </div>
  );
}

// ── Section Card ─────────────────────────────────────────────────────────────

import type { CSSProperties } from "react";

export function SectionCard({
  title,
  action,
  children,
  className,
  style,
}: {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div className={cn("bg-white/[0.03] border border-white/[0.07] rounded-xl overflow-hidden", className)} style={style}>
      {title && (
        <div className="px-6 py-4 border-b border-white/[0.06] flex items-center justify-between">
          <span className="text-foreground text-sm font-semibold">{title}</span>
          {action}
        </div>
      )}
      <div className="px-6 py-5">{children}</div>
    </div>
  );
}

// ── Triage Color Badge ────────────────────────────────────────────────────────

const triageColorMap = {
  Red:   "text-red-400 bg-red-500/10 border border-red-500/20",
  Yellow:"text-yellow-400 bg-yellow-500/10 border border-yellow-500/20",
  Green: "text-primary bg-primary/10 border border-primary/20",
  Black: "text-muted-foreground bg-white/5 border border-white/10",
} as const;

export function TriageBadge({
  category,
  color,
}: {
  category: string;
  color: keyof typeof triageColorMap;
}) {
  return (
    <span
      className={cn(
        "text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-sm",
        triageColorMap[color] ?? triageColorMap.Green
      )}
    >
      {category}
    </span>
  );
}
