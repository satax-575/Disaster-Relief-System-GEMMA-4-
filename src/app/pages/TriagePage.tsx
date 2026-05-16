import { useEffect, useRef, useState, useMemo } from "react";
import { toast } from "sonner";
import { useTopbar } from "../components/app/AppLayout";
import { useAuth } from "../../contexts/AuthContext";
import { useTriageLog, addTriageEntry, timeAgo } from "../../lib/hooks";
import {
  SectionCard, EmptyState, PrimaryButton,
  Chip, TriageBadge,
} from "../components/shared/index";
import { FormInput } from "../components/shared/index";
import { CustomDropdown } from "../components/shared/CustomDropdown";
import type { TriageAssessmentResult } from "../../lib/types";

const PRESET_SYMPTOMS = [
  "Not breathing","Severe bleeding","Unconscious","Chest pain",
  "Broken limb","Minor cuts","Walking wounded","Breathing difficulty",
  "Head injury","Burns","Spinal injury","Crush injury",
];

// Extended result type that includes new Gemma 4 31B detailed fields
interface ExtendedTriageResult extends TriageAssessmentResult {
  differentialDiagnosis?: string[];
  shockAssessment?: string;
  vitalsTargets?: string;
  medicationsConsider?: string[];
  transportPriority?: string;
  monitoringIntervals?: string;
  modelUsed?: string;
}

// Map backend response to frontend type (including new detailed fields)
function normaliseTriageResult(raw: Record<string, unknown>): ExtendedTriageResult {
  const colorMap: Record<string, TriageAssessmentResult["color"]> = {
    red: "Red", yellow: "Yellow", green: "Green", black: "Black",
  };
  const catMap: Record<string, TriageAssessmentResult["triageCategory"]> = {
    red: "Immediate", yellow: "Delayed", green: "Minimal", black: "Expectant",
  };
  const colorKey = String(raw.triage_color ?? "yellow").toLowerCase();
  const color = colorMap[colorKey] ?? "Yellow";

  return {
    triageCategory:       catMap[colorKey] ?? "Delayed",
    color,
    priorityScore:        (raw.priority_level as number) ?? 5,
    immediateActions:     (raw.immediate_remedy as string[]) ?? [],
    treatmentNotes:       (raw.medical_summary as string) ?? "",
    estimatedTimeToTreat: Array.isArray(raw.precautions)
      ? (raw.precautions as string[]).join("; ")
      : "Assess on site",
    // Extended fields from enhanced Gemma 4 31B prompt
    differentialDiagnosis: (raw.differential_diagnosis as string[]) ?? [],
    shockAssessment:       (raw.shock_assessment as string) ?? "",
    vitalsTargets:         (raw.vitals_targets as string) ?? "",
    medicationsConsider:   (raw.medications_consider as string[]) ?? [],
    transportPriority:     (raw.transport_priority as string) ?? "",
    monitoringIntervals:   (raw.monitoring_intervals as string) ?? "",
    modelUsed:             (raw.model_used as string) ?? "",
  };
}

// ── Small info row helper ─────────────────────────────────────────────────────
function InfoRow({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div className="pt-4">
      <p className="text-muted-foreground/50 text-[11px] uppercase tracking-widest mb-1">{label}</p>
      <p className="text-foreground/80 text-sm leading-relaxed">{value}</p>
    </div>
  );
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
  const [result, setResult]       = useState<ExtendedTriageResult | null>(null);
  const [loading, setLoading]     = useState(false);
  const [loadingStage, setLoadingStage] = useState("");
  const [loadingProgress, setLoadingProgress] = useState(0);
  const abortRef                  = useRef<AbortController | null>(null);

  const topbarRight = useMemo(() => (
    <div className="flex items-center gap-2">
      <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
      <span className="text-muted-foreground/60 text-sm">START Protocol · Gemma 4 31B</span>
    </div>
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

  // Fix 2a — Unique incident ID per submission
  const incidentIdRef = useRef<string>("");

  const handleAssess = async () => {
    if (selectedArr.length === 0) return;
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    // Fix 2a — Debug log to verify symptom state is read correctly
    const incidentId = `INC-${Math.random().toString(36).slice(2, 10).toUpperCase()}`;
    incidentIdRef.current = incidentId;
    console.log('[Triage] Submitting assessment:', {
      symptoms: selectedArr,
      age: age,
      gender: gender,
      incidentId,
      timestamp: new Date().toISOString()
    });
    // If selectedArr is always [] or always the same — the chip selection handler is broken.

    setLoading(true);
    setLoadingStage("Analyzing symptoms with Gemma 4...");
    setLoadingProgress(20);
    setResult(null);

    const BACKEND = (import.meta.env.VITE_BACKEND_URL as string | undefined)?.replace(/\/$/, "") ?? "http://localhost:8000";

    const applyResultWithUniquenessCheck = (raw: Record<string, unknown>) => {
      const normalized = normaliseTriageResult(raw);

      // Fix 2d — uniqueness check: warn if AI returns duplicate/fallback content
      const triageText = normalized.treatmentNotes + normalized.triageCategory;
      const currentHash = btoa(unescape(encodeURIComponent(triageText.slice(0, 120))));
      const lastHash = sessionStorage.getItem('lastTriageHash');
      if (lastHash === currentHash) {
        console.warn('⚠️ [Triage] Duplicate response detected — AI may be returning fallback content');
      }
      sessionStorage.setItem('lastTriageHash', currentHash);

      setResult(normalized);
    };

    try {
      const res = await fetch(`${BACKEND}/api/v1/triage/guidance/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symptoms: selectedArr, age_estimate: age, gender, language: "en" }),
        signal: abortRef.current.signal,
      });

      if (!res.ok || !res.body) {
        throw new Error(`HTTP ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split("\n\n");
        buffer = lines.pop() ?? "";

        for (const block of lines) {
          const eventMatch = block.match(/^event:\s*(\S+)/m);
          const dataMatch  = block.match(/^data:\s*(.+)/m);
          if (!eventMatch || !dataMatch) continue;

          const event = eventMatch[1];
          const data  = JSON.parse(dataMatch[1]);

          if (event === "analyzing" || event === "processing") {
            setLoadingStage(data.stage);
            setLoadingProgress(data.progress);
          } else if (event === "complete") {
            applyResultWithUniquenessCheck(data.result as Record<string, unknown>);
            setLoadingProgress(100);
          } else if (event === "error") {
            throw new Error(data.message);
          }
        }
      }
    } catch (err: unknown) {
      if ((err as { name?: string })?.name === "AbortError") return;
      // SSE failed — fall back to regular POST
      try {
        const { getTriageGuidance, ApiError } = await import("../../lib/api");
        const raw = await getTriageGuidance(
          { symptoms: selectedArr, age_estimate: age, gender, language: "en" },
          abortRef.current?.signal,
        );
        applyResultWithUniquenessCheck(raw as unknown as Record<string, unknown>);
      } catch (fallbackErr: unknown) {
        if ((fallbackErr as { name?: string })?.name === "AbortError") return;
        const msg = fallbackErr instanceof Error
          ? `Triage failed. ${fallbackErr.message}`
          : "Triage assessment failed.";
        toast.error(msg);
      }
    } finally {
      setLoading(false);
      setLoadingStage("");
      setLoadingProgress(0);
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
            <CustomDropdown
              id="triage-age-dropdown"
              options={["Unknown","Child (0-12)","Teen (13-17)","Adult (18-60)","Elderly (60+)"]}
              value={age}
              onChange={setAge}
              placeholder="Unknown"
            />
          </div>
          <div>
            <label className="text-muted-foreground/60 text-[11px] uppercase tracking-widest block mb-1.5">Gender</label>
            <CustomDropdown
              id="triage-gender-dropdown"
              options={["Unknown","Male","Female","Other"]}
              value={gender}
              onChange={setGender}
              placeholder="Unknown"
            />
          </div>
        </div>

        {selectedArr.length > 0 && (
          <div className="mt-4 p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
            <p className="text-muted-foreground/50 text-[11px] uppercase tracking-widest mb-2">Selected Symptoms ({selectedArr.length})</p>
            <div className="flex flex-wrap gap-1.5">
              {selectedArr.map((s) => (
                <span key={s} className="text-xs bg-primary/10 text-primary border border-primary/20 rounded-sm px-2 py-0.5">{s}</span>
              ))}
            </div>
          </div>
        )}

        <PrimaryButton
          className="w-full mt-5"
          onClick={handleAssess}
          disabled={loading || selectedArr.length === 0}
        >
          {loading ? "Assessing with Gemma 4…" : `Get AI Assessment${selectedArr.length > 0 ? ` (${selectedArr.length} symptoms)` : ""}`}
        </PrimaryButton>
      </SectionCard>

      {/* RIGHT — Results + Log */}
      <div className="space-y-4">
        {/* Result */}
        <SectionCard title="Clinical Assessment — Gemma 4 31B">
          {!result && !loading && (
            <EmptyState label="Select symptoms and submit." sub="Powered by Gemma 4 31B · START Protocol" />
          )}
          {loading && (
            <div className="py-12 flex flex-col items-center gap-4">
              {/* Progress bar */}
              <div className="w-full max-w-[200px] h-1 bg-white/[0.06] rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-700"
                  style={{ width: `${loadingProgress}%` }}
                />
              </div>
              <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              <p className="text-muted-foreground/40 text-sm text-center">
                {loadingStage || "Gemma 4 31B analyzing…"}
              </p>
            </div>
          )}
          {result && (
            <div
              className="divide-y divide-white/[0.05] space-y-0"
              style={{ animation: "fade-up 0.4s cubic-bezier(0.16,1,0.3,1) both", willChange: "transform, opacity" }}
            >
              {/* Triage color + priority */}
              <div className="flex items-center justify-between pb-4">
                <div className="flex items-center gap-3">
                  <TriageBadge category={result.triageCategory} color={result.color} />
                  <span className="text-foreground font-bold text-2xl tabular-nums">
                    Priority {result.priorityScore}/10
                  </span>
                </div>
                {result.transportPriority && (
                  <span className="text-[11px] text-muted-foreground/60 bg-white/[0.04] border border-white/[0.08] px-2 py-1 rounded-md text-right max-w-[140px]">
                    {result.transportPriority}
                  </span>
                )}
              </div>

              {/* Clinical summary */}
              <div className="pt-4">
                <p className="text-muted-foreground/50 text-[11px] uppercase tracking-widest mb-2">Clinical Summary</p>
                <p className="text-foreground/80 text-sm leading-relaxed">{result.treatmentNotes}</p>
              </div>

              {/* Differential diagnosis */}
              {result.differentialDiagnosis && result.differentialDiagnosis.length > 0 && (
                <div className="pt-4">
                  <p className="text-muted-foreground/50 text-[11px] uppercase tracking-widest mb-2">Differential Diagnosis</p>
                  <div className="flex flex-wrap gap-1.5">
                    {result.differentialDiagnosis.map((d, i) => (
                      <span key={i} className={`text-xs px-2 py-0.5 rounded-sm border ${
                        i === 0
                          ? "bg-primary/10 text-primary border-primary/20 font-medium"
                          : "bg-white/[0.03] text-muted-foreground/70 border-white/[0.08]"
                      }`}>
                        {i === 0 ? "✦ " : ""}{d}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Immediate actions */}
              <div className="pt-4">
                <p className="text-muted-foreground/50 text-[11px] uppercase tracking-widest mb-2">Immediate Actions</p>
                <ol className="space-y-1.5">
                  {result.immediateActions.map((a, i) => (
                    <li key={i} className="text-sm text-foreground/80 flex gap-2">
                      <span className="text-primary font-bold flex-shrink-0">{i + 1}.</span>
                      <span>{a}</span>
                    </li>
                  ))}
                </ol>
              </div>

              {/* Shock + vitals row */}
              <div className="pt-4 grid grid-cols-1 gap-3">
                {result.shockAssessment && (
                  <div>
                    <p className="text-muted-foreground/50 text-[11px] uppercase tracking-widest mb-1">Shock Assessment</p>
                    <p className={`text-sm font-medium ${
                      result.shockAssessment.toLowerCase().startsWith("confirmed")
                        ? "text-red-400"
                        : result.shockAssessment.toLowerCase().startsWith("suspected")
                        ? "text-orange-400"
                        : "text-primary"
                    }`}>{result.shockAssessment}</p>
                  </div>
                )}
                {result.vitalsTargets && (
                  <div>
                    <p className="text-muted-foreground/50 text-[11px] uppercase tracking-widest mb-1">Vitals Targets</p>
                    <p className="text-foreground/70 text-sm font-mono">{result.vitalsTargets}</p>
                  </div>
                )}
              </div>

              {/* Medications */}
              {result.medicationsConsider && result.medicationsConsider.length > 0 && (
                <div className="pt-4">
                  <p className="text-muted-foreground/50 text-[11px] uppercase tracking-widest mb-2">Consider Medications / Interventions</p>
                  <ul className="space-y-1">
                    {result.medicationsConsider.map((m, i) => (
                      <li key={i} className="text-sm text-foreground/70 flex gap-2">
                        <span className="text-blue-400 flex-shrink-0">+</span>{m}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Precautions */}
              <div className="pt-4">
                <p className="text-muted-foreground/50 text-[11px] uppercase tracking-widest mb-2">Precautions / Contraindications</p>
                <ul className="space-y-1">
                  {result.estimatedTimeToTreat.split("; ").map((p, i) => (
                    <li key={i} className="text-sm text-foreground/60 flex gap-2">
                      <span className="text-orange-400 flex-shrink-0">⚠</span>{p}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Monitoring + model used */}
              <div className="pt-4 flex items-center justify-between">
                <div>
                  {result.monitoringIntervals && (
                    <>
                      <p className="text-muted-foreground/50 text-[11px] uppercase tracking-widest mb-0.5">Reassess Every</p>
                      <p className="text-foreground text-sm font-medium">{result.monitoringIntervals}</p>
                    </>
                  )}
                </div>
                {result.modelUsed && (
                  <span className="text-[10px] text-muted-foreground/25">{result.modelUsed}</span>
                )}
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
                      {e.symptoms.length} symptoms · {e.assessedBy.slice(0, 8)}
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
