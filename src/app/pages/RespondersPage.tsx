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

export function RespondersPage() {
  const { set }             = useTopbar();
  const { data, loading }   = useResponders();
  const [showModal, setShowModal] = useState(false);

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
