import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useTopbar } from "../components/app/AppLayout";
import { useResponders, addResponder } from "../../lib/hooks";
import {
  SectionCard, EmptyState, PrimaryButton, GhostButton,
  StatusBadge, Chip, FormInput, FormSelect,
} from "../components/shared/index";
import { Modal } from "../components/shared/Modal";
import type { Responder } from "../../lib/types";
import { useLocation } from "../../contexts/LocationContext";
import { getEmergencyNumbers, type EmergencyNumbers } from "../../lib/emergencyNumbers";

// ── Emergency number card ─────────────────────────────────────────────────────
function EmergencyCard({ label, number, icon }: { label: string; number: string; icon: string }) {
  return (
    <a
      href={`tel:${number.replace(/[^0-9+]/g, "")}`}
      className="flex items-center gap-3 p-3 rounded-lg border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06] hover:border-primary/30 transition-all group"
      title={`Call ${label}: ${number}`}
    >
      <span className="text-xl flex-shrink-0">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-muted-foreground/50 text-[10px] uppercase tracking-widest">{label}</p>
        <p className="text-foreground font-semibold text-sm tabular-nums group-hover:text-primary transition-colors">
          {number}
        </p>
      </div>
      <svg className="w-3.5 h-3.5 text-muted-foreground/30 group-hover:text-primary transition-colors flex-shrink-0" viewBox="0 0 16 16" fill="currentColor">
        <path d="M3.654 1.328a.678.678 0 0 0-1.015-.063L1.605 2.3c-.483.484-.661 1.169-.45 1.77a17.568 17.568 0 0 0 4.168 6.608 17.569 17.569 0 0 0 6.608 4.168c.601.211 1.286.033 1.77-.45l1.034-1.034a.678.678 0 0 0-.063-1.015l-2.307-1.794a.678.678 0 0 0-.58-.122l-2.19.547a1.745 1.745 0 0 1-1.657-.459L5.482 8.062a1.745 1.745 0 0 1-.46-1.657l.548-2.19a.678.678 0 0 0-.122-.58L3.654 1.328z" />
      </svg>
    </a>
  );
}

// ── Public Emergency Services section ────────────────────────────────────────
function PublicEmergencySection({ em, loading }: { em: EmergencyNumbers; loading: boolean }) {
  if (loading) {
    return (
      <div className="mb-6 p-4 rounded-xl border border-white/[0.08] bg-white/[0.02] animate-pulse">
        <div className="h-4 w-48 bg-white/[0.06] rounded mb-3" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-16 bg-white/[0.04] rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      className="mb-6 p-4 rounded-xl border border-white/[0.08]"
      id="emergency-services-section"
      style={{ background: "rgba(34, 197, 94, 0.03)", borderColor: "rgba(34, 197, 94, 0.12)" }}
    >
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">{em.flag}</span>
        <p className="text-foreground/70 text-xs font-semibold uppercase tracking-widest">
          {em.country} — Public Emergency Services
        </p>
        <span className="ml-auto text-[10px] text-muted-foreground/40 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-primary inline-block" />
          Active 24/7
        </span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3" id="emergency-numbers-grid">
        <EmergencyCard label="Police" number={em.police} icon="🚔" />
        <EmergencyCard label="Ambulance" number={em.ambulance} icon="🚑" />
        <EmergencyCard label="Fire" number={em.fire} icon="🚒" />
        {em.disaster && (
          <EmergencyCard
            label={em.disasterName ?? "Disaster Mgmt"}
            number={em.disaster}
            icon="🆘"
          />
        )}
        {em.coastGuard && (
          <EmergencyCard label="Coast Guard" number={em.coastGuard} icon="⚓" />
        )}
        {em.mountainRescue && (
          <EmergencyCard label="Mountain Rescue" number={em.mountainRescue} icon="🏔️" />
        )}
      </div>
      <p className="text-muted-foreground/30 text-[10px] mt-2">
        Numbers are official government emergency lines for {em.country}. Tap any number to call.
      </p>
    </div>
  );
}

// ── Add Responder Modal ───────────────────────────────────────────────────────
function AddResponderModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [form, setForm] = useState({
    name: "", unit: "", role: "Medical" as Responder["role"],
    status: "available" as Responder["status"],
    equipment: "", specializations: "", contactNumber: "",
    lat: "", lng: "",
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await addResponder({
        name:            form.name,
        unit:            form.unit,
        role:            form.role,
        status:          form.status,
        equipment:       form.equipment.split(",").map((s) => s.trim()).filter(Boolean),
        specializations: form.specializations.split(",").map((s) => s.trim()).filter(Boolean),
        contactNumber:   form.contactNumber,
        lat:             parseFloat(form.lat) || 0,
        lng:             parseFloat(form.lng) || 0,
        gpsOnline:       !!(form.lat && form.lng),
      });
      toast.success("Responder added.");
      onClose();
    } catch {
      toast.error("Failed to add responder.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Add Responder" subtitle="Register a new field responder.">
      <form onSubmit={handleSubmit} className="space-y-3 mt-2">
        <FormInput required placeholder="Full name *" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
        <FormInput required placeholder="Unit (e.g. Medical Unit 1) *" value={form.unit} onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))} />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-muted-foreground/60 text-[11px] uppercase tracking-widest block mb-1.5">Role</label>
            <FormSelect value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as Responder["role"] }))}>
              {["Medical","Firefighter","Rescue","Police","Logistics"].map((r) => <option key={r}>{r}</option>)}
            </FormSelect>
          </div>
          <div>
            <label className="text-muted-foreground/60 text-[11px] uppercase tracking-widest block mb-1.5">Status</label>
            <FormSelect value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as Responder["status"] }))}>
              <option value="available">Available</option>
              <option value="dispatched">Dispatched</option>
              <option value="on_scene">On Scene</option>
            </FormSelect>
          </div>
        </div>
        <FormInput placeholder="Equipment (comma-separated)" value={form.equipment} onChange={(e) => setForm((f) => ({ ...f, equipment: e.target.value }))} />
        <FormInput placeholder="Specializations (comma-separated)" value={form.specializations} onChange={(e) => setForm((f) => ({ ...f, specializations: e.target.value }))} />
        <FormInput placeholder="Contact number" value={form.contactNumber} onChange={(e) => setForm((f) => ({ ...f, contactNumber: e.target.value }))} />
        <div className="grid grid-cols-2 gap-3">
          <FormInput placeholder="Latitude" type="number" step="any" value={form.lat} onChange={(e) => setForm((f) => ({ ...f, lat: e.target.value }))} />
          <FormInput placeholder="Longitude" type="number" step="any" value={form.lng} onChange={(e) => setForm((f) => ({ ...f, lng: e.target.value }))} />
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <GhostButton type="button" onClick={onClose}>Cancel</GhostButton>
          <PrimaryButton type="submit" disabled={loading}>
            {loading ? "Saving..." : "Add Responder"}
          </PrimaryButton>
        </div>
      </form>
    </Modal>
  );
}

// ── RespondersPage ────────────────────────────────────────────────────────────
export function RespondersPage() {
  const { set }             = useTopbar();
  const { data, loading }   = useResponders();
  const [showModal, setShowModal] = useState(false);
  const geo                 = useLocation();

  // Derive emergency numbers from detected country (or India as default)
  const em = getEmergencyNumbers(geo.countryCode ?? "IN");

  const available  = data.filter((r) => r.status === "available").length;
  const dispatched = data.filter((r) => r.status === "dispatched").length;
  const onScene    = data.filter((r) => r.status === "on_scene").length;

  useEffect(() => {
    set({
      title: "Responders",
      right: <PrimaryButton onClick={() => setShowModal(true)}>Add Responder</PrimaryButton>,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      {/* Public Emergency Services — location-aware */}
      <PublicEmergencySection em={em} loading={geo.loading} />

      {/* Status summary pills */}
      <div className="flex flex-wrap gap-4 mb-6">
        <span className="text-primary text-sm font-medium">{available} Available</span>
        <span className="text-muted-foreground/30">·</span>
        <span className="text-orange-400 text-sm font-medium">{dispatched} Dispatched</span>
        <span className="text-muted-foreground/30">·</span>
        <span className="text-blue-400 text-sm font-medium">{onScene} On Scene</span>
      </div>

      <SectionCard>
        {loading && <div className="py-12 text-center text-muted-foreground/40 text-sm">Loading...</div>}
        {!loading && data.length === 0 && <EmptyState label="No responders registered" />}
        {!loading && data.length > 0 && (
          <div className="divide-y divide-white/[0.04] -mx-6 -my-5">
            {data.map((r) => (
              <div key={r.id} className="px-6 py-5">
                <div className="flex items-center justify-between mb-1">
                  <div>
                    <span className="text-foreground font-semibold text-sm">{r.name}</span>
                    <p className="text-muted-foreground/60 text-xs mt-0.5">{r.unit} · {r.role}</p>
                  </div>
                  <StatusBadge status={r.status} />
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3 bg-white/[0.025] rounded-lg p-4 text-xs">
                  <div>
                    <p className="text-muted-foreground/50 uppercase tracking-widest text-[10px]">Equipment</p>
                    <p className="text-foreground/60 mt-1">{r.equipment?.join(", ") || "—"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground/50 uppercase tracking-widest text-[10px]">Location</p>
                    <p className="text-foreground/60 mt-1">
                      {r.gpsOnline ? `${r.lat?.toFixed(3)}, ${r.lng?.toFixed(3)}` : "GPS Offline"}
                    </p>
                  </div>
                </div>
                {r.specializations?.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {r.specializations.map((s) => (
                      <span key={s} className="text-[10px] border border-white/10 text-muted-foreground/60 px-2 py-0.5 rounded-sm">
                        {s}
                      </span>
                    ))}
                  </div>
                )}
                {r.contactNumber && (
                  <p className="mt-3 text-xs text-muted-foreground/50">Contact: {r.contactNumber}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      <AddResponderModal open={showModal} onClose={() => setShowModal(false)} />
    </div>
  );
}
