import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "../../contexts/AuthContext";
import { useTopbar } from "../components/app/AppLayout";
import { useAlerts, addAlert, resolveAlert, timeAgo } from "../../lib/hooks";
import {
  SectionCard, EmptyState, DangerButton, GhostButton, PrimaryButton,
  SeverityBadge, FormSelect,
} from "../components/shared/index";
import { FormInput, FormTextarea } from "../components/shared/index";
import { Modal } from "../components/shared/Modal";
import type { Alert } from "../../lib/types";
import { cn } from "../components/ui/utils";

const severityBorderColor: Record<string, string> = {
  Critical: "border-l-red-500",
  High:     "border-l-orange-500",
  Moderate: "border-l-blue-500",
  Low:      "border-l-primary",
};

function BroadcastModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user } = useAuth();
  const [form, setForm] = useState({ message: "", severity: "High", affectedArea: "" });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await addAlert({
        message:      form.message,
        severity:     form.severity as Alert["severity"],
        affectedArea: form.affectedArea,
        broadcastBy:  user?.uid ?? "unknown",
        status:       "active",
      });

      // Optional browser notification (permission-based)
      if (Notification.permission === "granted") {
        new Notification("RAKSHAK AI — Emergency Alert", {
          body: form.message,
        });
      } else if (Notification.permission !== "denied") {
        Notification.requestPermission();
      }

      toast.success("Alert broadcast successfully.");
      setForm({ message: "", severity: "High", affectedArea: "" });
      onClose();
    } catch {
      toast.error("Failed to broadcast alert.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Broadcast Alert" subtitle="Send an emergency broadcast to all field units.">
      <form onSubmit={handleSubmit} className="space-y-4 mt-2">
        <FormTextarea
          required
          rows={4}
          placeholder="Emergency message..."
          value={form.message}
          onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
        />
        <div>
          <label className="text-muted-foreground/60 text-[11px] uppercase tracking-widest block mb-1.5">Severity</label>
          <FormSelect value={form.severity} onChange={(e) => setForm((f) => ({ ...f, severity: e.target.value }))}>
            {["Critical","High","Moderate","Low"].map((s) => <option key={s}>{s}</option>)}
          </FormSelect>
        </div>
        <FormInput
          placeholder="Affected area (e.g. North Chennai)"
          value={form.affectedArea}
          onChange={(e) => setForm((f) => ({ ...f, affectedArea: e.target.value }))}
        />
        <div className="flex justify-end gap-3 pt-2">
          <GhostButton type="button" onClick={onClose}>Cancel</GhostButton>
          <DangerButton type="submit" disabled={loading}>
            {loading ? "Broadcasting..." : "Broadcast"}
          </DangerButton>
        </div>
      </form>
    </Modal>
  );
}

export function AlertsPage() {
  const { set }           = useTopbar();
  const { data, loading } = useAlerts();
  const activeAlerts       = data.filter((a) => a.status === "active");
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    set({
      title: "Emergency Alerts",
      right: <DangerButton onClick={() => setShowModal(true)}>Broadcast Alert</DangerButton>,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleResolve = async (id: string) => {
    try {
      await resolveAlert(id);
      toast.success("Alert resolved.");
    } catch {
      toast.error("Failed to resolve alert.");
    }
  };

  return (
    <div>
      <SectionCard>
        {loading && <div className="py-12 text-center text-muted-foreground/40 text-sm">Loading...</div>}
        {!loading && activeAlerts.length === 0 && (
          <EmptyState label="All clear" sub="No active emergency broadcasts." />
        )}
        {!loading && activeAlerts.length > 0 && (
          <div className="divide-y divide-white/[0.04] -mx-6 -my-5">
            {activeAlerts.map((alert) => (
              <div
                key={alert.id}
                className={cn(
                  "pl-4 py-4 pr-6 border-l-2",
                  severityBorderColor[alert.severity] ?? "border-l-primary"
                )}
              >
                <div className="flex items-center justify-between mb-1">
                  <SeverityBadge severity={alert.severity} />
                  <span className="text-muted-foreground/50 text-xs">{timeAgo(alert.createdAt)}</span>
                </div>
                <p className="text-foreground text-sm mt-1 leading-relaxed">{alert.message}</p>
                <p className="text-muted-foreground/40 text-xs mt-1">
                  Area: {alert.affectedArea || "Unknown"} · Broadcast by: {alert.broadcastBy.slice(0,8)}
                </p>
                <div className="flex justify-end mt-2">
                  <GhostButton
                    className="text-xs px-3 py-1.5"
                    onClick={() => handleResolve(alert.id)}
                  >
                    Resolve
                  </GhostButton>
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      <BroadcastModal open={showModal} onClose={() => setShowModal(false)} />
    </div>
  );
}
