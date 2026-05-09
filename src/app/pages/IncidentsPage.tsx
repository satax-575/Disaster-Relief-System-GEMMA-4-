import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "../../contexts/AuthContext";
import { useTopbar } from "../components/app/AppLayout";
import { useIncidents, addIncident, timeAgo } from "../../lib/hooks";
import {
  SectionCard, SeverityBadge, StatusBadge, EmptyState,
  DangerButton, PrimaryButton, GhostButton,
  FormInput, FormTextarea, FormSelect,
} from "../components/shared/index";
import { Modal } from "../components/shared/Modal";
import type { Incident } from "../../lib/types";

// ── Incident Report Modal — exported so Dashboard can import it ──────────────
export function IncidentModal({
  open,
  onClose,
  prefill,
}: {
  open:      boolean;
  onClose:   () => void;
  prefill?:  Partial<Incident>;
}) {
  const { user } = useAuth();
  const [form, setForm] = useState({
    type: prefill?.type ?? "Flood",
    severity: prefill?.severity ?? "Moderate",
    description: prefill?.description ?? "",
    lat: prefill?.lat?.toString() ?? "",
    lng: prefill?.lng?.toString() ?? "",
    estimatedAffected: prefill?.estimatedAffected?.toString() ?? "",
    reporterName: user?.displayName ?? "",
    title: prefill?.title ?? "",
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await addIncident({
        title:             form.title || `${form.type} incident`,
        type:              form.type,
        severity:          form.severity as Incident["severity"],
        description:       form.description,
        lat:               parseFloat(form.lat) || 20.5937,
        lng:               parseFloat(form.lng) || 78.9629,
        estimatedAffected: parseInt(form.estimatedAffected) || 0,
        reportedBy:        user?.uid ?? form.reporterName,
        status:            "active",
      });
      toast.success("Incident reported successfully.");
      onClose();
    } catch (err) {
      toast.error("Failed to report incident.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Report Incident" subtitle="Document what you observe in the field." className="max-w-lg">
      <form onSubmit={handleSubmit} className="space-y-4 mt-2">
        <FormInput
          placeholder="Incident title (e.g. Building collapse on MG Road)"
          value={form.title}
          onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
        />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-muted-foreground/60 text-[11px] uppercase tracking-widest block mb-1.5">Type</label>
            <FormSelect value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}>
              {["Flood","Earthquake","Fire","Building Collapse","Medical Emergency","Landslide","Cyclone","Other"].map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </FormSelect>
          </div>
          <div>
            <label className="text-muted-foreground/60 text-[11px] uppercase tracking-widest block mb-1.5">Severity</label>
            <FormSelect value={form.severity} onChange={(e) => setForm((f) => ({ ...f, severity: e.target.value }))}>
              {["Critical","High","Moderate","Low"].map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </FormSelect>
          </div>
        </div>
        <FormTextarea
          placeholder="Describe what you observe..."
          rows={3}
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
        />
        <div className="grid grid-cols-2 gap-3">
          <FormInput placeholder="Latitude" type="number" step="any" value={form.lat} onChange={(e) => setForm((f) => ({ ...f, lat: e.target.value }))} />
          <FormInput placeholder="Longitude" type="number" step="any" value={form.lng} onChange={(e) => setForm((f) => ({ ...f, lng: e.target.value }))} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FormInput placeholder="Est. affected persons" type="number" value={form.estimatedAffected} onChange={(e) => setForm((f) => ({ ...f, estimatedAffected: e.target.value }))} />
          <FormInput placeholder="Your name / ID" value={form.reporterName} onChange={(e) => setForm((f) => ({ ...f, reporterName: e.target.value }))} />
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <GhostButton type="button" onClick={onClose}>Cancel</GhostButton>
          <PrimaryButton type="submit" disabled={loading}>
            {loading ? "Submitting..." : "Submit Report"}
          </PrimaryButton>
        </div>
      </form>
    </Modal>
  );
}

// ── Incidents Page ────────────────────────────────────────────────────────────
export function IncidentsPage() {
  const { set }           = useTopbar();
  const { data, loading } = useIncidents();
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    set({
      title: "Incident Management",
      right: <DangerButton onClick={() => setShowModal(true)}>Report Incident</DangerButton>,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <SectionCard>
        {loading && <div className="py-12 text-center text-muted-foreground/40 text-sm">Loading...</div>}
        {!loading && data.length === 0 && <EmptyState label="No incidents found" />}
        {!loading && data.length > 0 && (
          <div className="divide-y divide-white/[0.04] -mx-6 -my-5">
            {data.map((inc) => (
              <div key={inc.id} className="px-6 py-5">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-foreground text-sm font-medium">{inc.title}</span>
                  <SeverityBadge severity={inc.severity} />
                </div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-muted-foreground/60 text-xs">{inc.type} · {timeAgo(inc.createdAt)}</span>
                  <StatusBadge status={inc.status} />
                </div>
                <p className="text-muted-foreground text-xs truncate mb-1">{inc.description}</p>
                <p className="text-muted-foreground/40 text-[11px]">
                  Affected: {inc.estimatedAffected} · Reported by: {inc.reportedBy} · {inc.lat?.toFixed(4)}, {inc.lng?.toFixed(4)}
                </p>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      <IncidentModal open={showModal} onClose={() => setShowModal(false)} />
    </div>
  );
}
