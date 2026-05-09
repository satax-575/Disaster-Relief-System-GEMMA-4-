import { useEffect, useRef, useState, useMemo } from "react";
import { toast } from "sonner";
import { useTopbar } from "../components/app/AppLayout";
import { useAuth } from "../../contexts/AuthContext";
import { useTriageLog, addTriageEntry, timeAgo } from "../../lib/hooks";
import {
  SectionCard, EmptyState, PrimaryButton,
  Chip, FormSelect, TriageBadge,
} from "../components/shared/index";
import { FormInput } from "../components/shared/index";
import type { TriageAssessmentResult } from "../../lib/types";
import { getTriageGuidance, ApiError } from "../../lib/api";

const PRESET_SYMPTOMS = [
  "Not breathing","Severe bleeding","Unconscious","Chest pain",
  "Broken limb","Minor cuts","Walking wounded","Breathing difficulty",
  "Head injury","Burns","Spinal injury","Crush injury",
];

// Map backend response to frontend type
function normaliseTriageResult(raw: {
  triage_color: string;
  immediate_remedy?: string[];
  precautions?: string[];
  medical_summary?: string;
  priority_level?: number;
}): TriageAssessmentResult {
  const colorMap: Record<string, TriageAssessmentResult["color"]> = {
    red: "Red", yellow: "Yellow", green: "Green", black: "Black",
  };
  const catMap: Record<string, TriageAssessmentResult["triageCategory"]> = {
    red: "Immediate", yellow: "Delayed", green: "Minimal", black: "Expectant",
  };
  const color = colorMap[raw.triage_color?.toLowerCase()] ?? "Yellow";
  return {
    triageCategory:       catMap[raw.triage_color?.toLowerCase()] ?? "Delayed",
    color,
    priorityScore:        raw.priority_level ?? 5,
    immediateActions:     raw.immediate_remedy ?? [],
    treatmentNotes:       raw.medical_summary ?? "",
    estimatedTimeToTreat: raw.precautions?.join("; ") ?? "Assess on site",
  };
}

export function TriagePage() {
  const { set }                   = useTopbar();
  const { user }                  = useAuth();
  const { entries, reload }       = useTriageLog();
  const [selected, setSelected]   = useState<Set<string>>(new Set());
  const [custom, setCustom]       = useState("");
  const [extra, setExtra]         = useState<string[]>([]);
  const [age, setAge]             = useState("Unknown");
  const [gender, setGender]       = useState("Unknown");
  const [result, setResult]       = useState<TriageAssessmentResult | null>(null);
  const [loading, setLoading]     = useState(false);
  const abortRef                  = useRef<AbortController | null>(null);

  const topbarRight = useMemo(() => (
    <span className="text-muted-foreground/60 text-sm">START Protocol</span>
  ), []);

  useEffect(() => {
    set({ title: "Medical Triage", right: topbarRight });
  }, [set, topbarRight]);

  const toggleSymptom = (s: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(s) ? next.delete(s) : next.add(s);
      return next;
    });
  };

  const addCustom = () => {
    const s = custom.trim();
    if (!s) return;
    setExtra((e) => [...e, s]);
    setSelected((prev) => new Set([...prev, s]));
    setCustom("");
  };

  const allSymptoms = [...PRESET_SYMPTOMS, ...extra];
  const selectedArr = Array.from(selected);

  const handleAssess = async () => {
    if (selectedArr.length === 0) return;
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    setLoading(true);
    setResult(null);
    try {
      const raw = await getTriageGuidance(
        { symptoms: selectedArr, age_estimate: age, gender, language: "en" },
        abortRef.current.signal,
      );
      setResult(normaliseTriageResult(raw));
    } catch (err: unknown) {
      if ((err as { name?: string })?.name === "AbortError") return;
      const msg = err instanceof ApiError
        ? `Triage failed (${err.status}). Check backend connectivity.`
        : "Triage assessment failed.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToLog = async () => {
    if (!result) return;
    try {
      await addTriageEntry({
        symptoms:             selectedArr,
        age, gender,
        category:             result.triageCategory,
        color:                result.color,
        priorityScore:        result.priorityScore,
        immediateActions:     result.immediateActions,
        treatmentNotes:       result.treatmentNotes,
        estimatedTimeToTreat: result.estimatedTimeToTreat,
        assessedBy:           user?.uid ?? "unknown",
      });
      toast.success("Added to triage log.");
      reload();
      setResult(null);
      setSelected(new Set());
      setExtra([]);
    } catch {
      toast.error("Failed to save entry.");
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* LEFT — Entry */}
      <SectionCard title="Patient Entry">
        <p className="text-muted-foreground/50 text-[11px] uppercase tracking-widest mb-3">
          Observed Symptoms
        </p>
        <div className="flex flex-wrap gap-2">
          {allSymptoms.map((s) => (
            <Chip key={s} label={s} selected={selected.has(s)} onClick={() => toggleSymptom(s)} />
          ))}
        </div>
        <div className="flex gap-2 mt-3">
          <FormInput
            placeholder="Add symptom…"
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustom(); } }}
            className="flex-1"
          />
          <button
            type="button"
            onClick={addCustom}
            className="px-4 py-2 text-sm bg-transparent border border-white/10 text-muted-foreground hover:text-foreground rounded-lg transition-colors"
          >
            Add
          </button>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <div>
            <label className="text-muted-foreground/60 text-[11px] uppercase tracking-widest block mb-1.5">Age Estimate</label>
            <FormSelect value={age} onChange={(e) => setAge(e.target.value)}>
              {["Unknown","Child (0-12)","Teen (13-17)","Adult (18-60)","Elderly (60+)"].map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </FormSelect>
          </div>
          <div>
            <label className="text-muted-foreground/60 text-[11px] uppercase tracking-widest block mb-1.5">Gender</label>
            <FormSelect value={gender} onChange={(e) => setGender(e.target.value)}>
              {["Unknown","Male","Female","Other"].map((g) => <option key={g}>{g}</option>)}
            </FormSelect>
          </div>
        </div>
        <PrimaryButton
          className="w-full mt-5"
          onClick={handleAssess}
          disabled={loading || selectedArr.length === 0}
        >
          {loading ? "Assessing…" : "Get Assessment"}
        </PrimaryButton>
      </SectionCard>

      {/* RIGHT — Results + Log */}
      <div className="space-y-4">
        {/* Result */}
        <SectionCard title="Assessment Result">
          {!result && !loading && (
            <EmptyState label="Select symptoms and submit." />
          )}
          {loading && (
            <div className="py-12 flex flex-col items-center gap-4">
              <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              <p className="text-muted-foreground/40 text-sm">Analyzing…</p>
            </div>
          )}
          {result && (
            <div
              className="divide-y divide-white/[0.05] space-y-4"
              style={{ animation: "fade-up 0.4s cubic-bezier(0.16,1,0.3,1) both", willChange: "transform, opacity" }}
            >
              <div className="flex items-center gap-3 pb-4">
                <TriageBadge category={result.triageCategory} color={result.color} />
                <span className="text-foreground font-bold text-2xl tabular-nums">
                  Priority {result.priorityScore}/10
                </span>
              </div>
              <div className="pt-4">
                <p className="text-muted-foreground/50 text-[11px] uppercase tracking-widest mb-2">Immediate Actions</p>
                <ol className="space-y-1">
                  {result.immediateActions.map((a, i) => (
                    <li key={i} className="text-sm text-foreground/70">
                      <span className="text-primary font-bold mr-2">{i + 1}.</span>{a}
                    </li>
                  ))}
                </ol>
              </div>
              <div className="pt-4">
                <p className="text-muted-foreground/50 text-[11px] uppercase tracking-widest mb-2">Treatment Notes</p>
                <p className="text-foreground/70 text-sm leading-relaxed">{result.treatmentNotes}</p>
              </div>
              <div className="pt-4">
                <p className="text-muted-foreground/50 text-[11px] uppercase tracking-widest mb-1">Time Estimate</p>
                <p className="text-foreground font-medium">~{result.estimatedTimeToTreat}</p>
              </div>
              <div className="pt-4">
                <PrimaryButton className="w-full" onClick={handleAddToLog}>Add to Triage Log</PrimaryButton>
              </div>
            </div>
          )}
        </SectionCard>

        {/* Triage Log */}
        <SectionCard title="Triage Log">
          {entries.length === 0 ? (
            <EmptyState label="No entries yet" />
          ) : (
            <div className="divide-y divide-white/[0.04] -mx-6 -mb-5">
              {entries.map((e) => (
                <div key={e.id} className="px-6 py-3 flex items-center justify-between">
                  <div>
                    <TriageBadge category={e.category} color={e.color} />
                    <p className="text-muted-foreground/60 text-[10px] mt-1">
                      {e.symptoms.length} symptoms · assessed by {e.assessedBy.slice(0, 8)}
                    </p>
                  </div>
                  <span className="text-muted-foreground/50 text-xs">
                    {timeAgo(e.timestamp as { seconds: number })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
