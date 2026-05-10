import { useEffect, lazy, Suspense, useMemo, memo, useState } from "react";
import { useTopbar } from "../components/app/AppLayout";
import { MetricCard, SeverityBadge, EmptyState, DangerButton } from "../components/shared/index";
import { useDashboardStats, useIncidents, useAlerts, timeAgo } from "../../lib/hooks";
import { IncidentModal } from "./IncidentsPage";

// Lazy-load leaflet map — not in main bundle
const LiveMap = lazy(() => import("../components/app/LiveMap"));

// ── Live timestamp — memoized so it doesn't re-render parent ─────────────────
const LiveTimestamp = memo(function LiveTimestamp() {
  const [ts, setTs] = useState(() =>
    new Date().toLocaleString("en-US", { hour12: true })
  );
  useEffect(() => {
    const id = setInterval(
      () => setTs(new Date().toLocaleString("en-US", { hour12: true })),
      1000,
    );
    return () => clearInterval(id);
  }, []);
  return <span className="text-muted-foreground/60 text-sm tabular-nums">{ts}</span>;
});

// ── Section header (shared card title row) ───────────────────────────────────
function CardTitle({ label }: { label: string }) {
  return (
    <div
      className="px-6 py-4 flex items-center justify-between"
      style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
    >
      <span className="text-foreground text-sm font-semibold">{label}</span>
    </div>
  );
}

export function Dashboard() {
  const { set }  = useTopbar();
  const stats    = useDashboardStats();
  const [showModal, setShowModal] = useState(false);

  const { data: incidents } = useIncidents();
  const { data: alerts }    = useAlerts();

  const recentIncidents = useMemo(
    () => (incidents ?? []).slice(0, 5),
    [incidents],
  );
  const activeAlerts = useMemo(
    () => (alerts ?? []).filter((a) => a.status === "active").slice(0, 5),
    [alerts],
  );

  const topbarRight = useMemo(() => (
    <div className="flex items-center gap-4">
      <LiveTimestamp />
      <DangerButton onClick={() => setShowModal(true)}>New Incident</DangerButton>
    </div>
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ), []);

  useEffect(() => {
    set({ title: "Situation Overview", right: topbarRight });
  }, [set, topbarRight]);

  return (
    <div className="space-y-6">
      {/* Row 1 — Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Active Incidents"     value={stats.activeIncidents}     />
        <MetricCard label="Available Responders" value={stats.availableResponders} />
        <MetricCard label="Triage Entries"       value={stats.triageCount}         />
        <MetricCard label="Active Alerts"        value={stats.activeAlerts}        />
      </div>

      {/* Row 2 — Map (isolation: isolate prevents z-index stacking from parent) */}
      {/* NOTE: No overflow-hidden here — Leaflet popups escape the card boundary */}
      <div
        className="rounded-xl"
        style={{
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.07)",
          isolation: "isolate",
        }}
      >
        <CardTitle label="Live Incident Map" />
        <div style={{ height: 380, position: "relative" }}>
          <Suspense
            fallback={
              <div className="h-full bg-white/[0.02] rounded-b-xl flex items-center justify-center text-muted-foreground/30 text-sm gap-3">
                <div className="w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                Loading map…
              </div>
            }
          >
            <LiveMap incidents={recentIncidents} />
          </Suspense>
        </div>
      </div>

      {/* Row 3 — Two columns */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Recent Incidents */}
        <div
          className="rounded-xl overflow-hidden lg:col-span-3"
          style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.07)",
          }}
        >
          <CardTitle label="Recent Incidents" />
          <div className="px-6 py-5">
            {recentIncidents.length === 0 ? (
              <EmptyState label="No incidents reported" />
            ) : (
              <div className="divide-y divide-white/[0.05] -mx-6 -mb-5">
                {recentIncidents.map((inc) => (
                  <div key={inc.id} className="flex items-center justify-between px-6 py-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <SeverityBadge severity={inc.severity} />
                      <div className="min-w-0">
                        <p className="text-foreground text-sm font-medium truncate">{inc.title}</p>
                        <p className="text-muted-foreground/60 text-xs">{inc.type}</p>
                      </div>
                    </div>
                    <span className="text-muted-foreground/50 text-xs flex-shrink-0 ml-4">
                      {timeAgo(inc.createdAt)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Active Alerts */}
        <div
          className="rounded-xl overflow-hidden lg:col-span-2"
          style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.07)",
          }}
        >
          <CardTitle label="Active Alerts" />
          <div className="px-6 py-5">
            {activeAlerts.length === 0 ? (
              <EmptyState label="All clear" />
            ) : (
              <div className="divide-y divide-white/[0.05] -mx-6 -mb-5">
                {activeAlerts.map((alert) => (
                  <div key={alert.id} className="px-6 py-3">
                    <div className="flex items-center justify-between mb-1">
                      <SeverityBadge severity={alert.severity} />
                      <span className="text-muted-foreground/50 text-[10px]">
                        {timeAgo(alert.createdAt)}
                      </span>
                    </div>
                    <p className="text-foreground/80 text-xs leading-relaxed line-clamp-2">
                      {alert.message}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <IncidentModal open={showModal} onClose={() => setShowModal(false)} />
    </div>
  );
}
