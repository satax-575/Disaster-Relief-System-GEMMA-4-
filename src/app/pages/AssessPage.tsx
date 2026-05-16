import { useEffect, useRef, useState, useMemo } from "react";
import { toast } from "sonner";
import { useTopbar } from "../components/app/AppLayout";
import {
  SectionCard, EmptyState, PrimaryButton, GhostButton, SeverityBadge,
} from "../components/shared/index";
import { CustomDropdown, DISASTER_TYPES, BUILDING_TYPES } from "../components/shared/CustomDropdown";
import type { DamageAssessmentResult } from "../../lib/types";
import { assessDamage, ApiError } from "../../lib/api";

// Fix 1a & Fix 5 — Correct label reflecting two-stage pipeline
const SYSTEM_LABEL = "Vision Pipeline: Mistral → Gemma 4 31B";

// Fix 1d — Phase-aware loading states
type AssessmentPhase = "idle" | "analyzing" | "generating" | "done";

const PHASE_LABELS: Record<AssessmentPhase, string | null> = {
  idle:       "Mistral vision AI will analyze the image. Gemma 4 31B will generate the assessment.",
  analyzing:  "🔍 Analyzing image with vision AI (Mistral)...",
  generating: "⚙️ Generating damage assessment (Gemma 4 31B)...",
  done:       null,
};

// Normalise the backend response to the frontend type
function normaliseResult(
  raw: Record<string, unknown>
): DamageAssessmentResult & { modelUsed?: string; visualSummary?: string; triageAssignment?: string } {
  const severityNum = typeof raw.damage_severity === "number" ? raw.damage_severity : 5;
  const severityLabel: DamageAssessmentResult["damageSeverity"] =
    severityNum >= 8 ? "Critical" :
    severityNum >= 6 ? "High" :
    severityNum >= 4 ? "Moderate" : "Low";

  return {
    damageSeverity:          (raw.damageSeverity as DamageAssessmentResult["damageSeverity"]) ?? severityLabel,
    structuralAssessment:    (raw.structuralAssessment as string) ?? (raw.structural_integrity as string) ?? (raw.intelligence_summary as string) ?? "Assessment unavailable.",
    identifiedHazards:       (raw.identifiedHazards as string[]) ?? (raw.hazards as string[]) ?? [],
    estimatedTrappedPersons: (raw.estimatedTrappedPersons as number) ?? (raw.estimated_trapped as number) ?? 0,
    recommendedActions:      (raw.recommendedActions as string[]) ?? (raw.recommended_actions as string[]) ?? [],
    confidenceScore:         Math.round(((raw.confidenceScore as number) ?? (raw.confidence as number) ?? 0.5) * 100),
    modelUsed:               (raw.model_used as string) ?? undefined,
    visualSummary:           (raw.visualSummary as string) ?? (raw.caption as string) ?? undefined,
    triageAssignment:        (raw.triageAssignment as string) ?? undefined,
  };
}

// ── Collapsible Visual Scan section (Fix 1c) ──────────────────────────────────
function VisualScanSection({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-white/[0.08] rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-muted-foreground/70 hover:text-foreground transition-colors"
        style={{ background: "rgba(255,255,255,0.02)" }}
      >
        <span className="text-[11px] uppercase tracking-widest">Visual Scan (Mistral)</span>
        <svg
          width="12" height="12" viewBox="0 0 12 12" fill="none"
          className={`transition-transform duration-200 ${open ? "rotate-90" : ""}`}
        >
          <path d="M4 2L8 6L4 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <div className="px-4 pb-4 pt-2 text-xs text-muted-foreground/60 leading-relaxed whitespace-pre-wrap border-t border-white/[0.06]">
          {text}
        </div>
      )}
    </div>
  );
}

export function AssessPage() {
  const { set }                         = useTopbar();
  const fileRef                         = useRef<HTMLInputElement>(null);
  const [preview, setPreview]           = useState<string | null>(null);
  const [base64, setBase64]             = useState<string | null>(null);
  const [mediaType, setMediaType]       = useState<string>("image/jpeg");
  const [disasterType, setDisasterType] = useState("");
  const [buildingType, setBuildingType] = useState("");
  const [loading, setLoading]           = useState(false);
  const [phase, setPhase]               = useState<AssessmentPhase>("idle");
  const [result, setResult]             = useState<(DamageAssessmentResult & { modelUsed?: string; visualSummary?: string; triageAssignment?: string }) | null>(null);
  const [isDragOver, setIsDragOver]     = useState(false);
  // Fix 1e — fallback manual description state
  const [showManualFallback, setShowManualFallback] = useState(false);
  const [manualDescription, setManualDescription]   = useState("");
  const abortRef                        = useRef<AbortController | null>(null);

  const topbarRight = useMemo(() => (
    <div className="flex items-center gap-2" id="assess-model-indicator">
      <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
      <span className="text-muted-foreground/60 text-sm">{SYSTEM_LABEL}</span>
    </div>
  ), []);

  useEffect(() => {
    set({ title: "Damage Assessment", right: topbarRight });
  }, [set, topbarRight]);

  const processFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file.");
      return;
    }
    setMediaType(file.type);
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setPreview(dataUrl);
      setBase64(dataUrl.split(",")[1]);
      setResult(null);
      setPhase("idle");
      setShowManualFallback(false);
    };
    reader.readAsDataURL(file);
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  };

  // Fix 1f — Guard: never send image directly to Gemma
  function guardAgainstDirectImageToGemma(payload: unknown) {
    if (
      payload &&
      typeof payload === "object" &&
      "messages" in payload &&
      Array.isArray((payload as Record<string, unknown>).messages) &&
      ((payload as Record<string, unknown>).messages as unknown[]).some(
        (m) =>
          m &&
          typeof m === "object" &&
          "content" in m &&
          Array.isArray((m as Record<string, unknown>).content) &&
          ((m as Record<string, unknown>).content as unknown[]).some(
            (c) => c && typeof c === "object" && "type" in c && (c as Record<string, unknown>).type === "image_url"
          )
      )
    ) {
      console.error("🚫 Attempted to send image directly to Gemma — blocked. Use vision pipeline.");
      throw new Error("Image input is not supported by this model. Route through vision pipeline.");
    }
  }

  const handleAssess = async () => {
    const inputSource = base64 ? "image" : manualDescription.trim() ? "manual" : null;
    if (!inputSource) return;

    abortRef.current?.abort();
    abortRef.current = new AbortController();
    setLoading(true);
    setResult(null);
    setShowManualFallback(false);

    // Fix 4a — Immediate loading state: Phase 1
    setPhase("analyzing");

    try {
      // Fix 1b guard
      guardAgainstDirectImageToGemma({
        messages: [{ content: [{ type: "image_url" }] }]
      });

      // Fix 4a — Phase 2 update after a brief delay (backend pipeline transitions)
      const phaseTimer = setTimeout(() => setPhase("generating"), 3500);

      const raw = await assessDamage(
        {
          image_base64: base64 ?? undefined,
          manual_description: inputSource === "manual" ? manualDescription.trim() : undefined,
          disaster_type: disasterType || undefined,
          building_type: buildingType || undefined,
          language: "en",
          mime_type: mediaType,
        },
        abortRef.current.signal,
      );

      clearTimeout(phaseTimer);
      setPhase("done");
      setResult(normaliseResult(raw as Record<string, unknown>));
    } catch (err: unknown) {
      const isAbort = (err as { name?: string })?.name === "AbortError";
      if (isAbort) return;

      // Fix 1e — graceful fallback on vision failure
      const errMsg = err instanceof Error ? err.message : "Unknown error";
      const isVisionError =
        errMsg.toLowerCase().includes("vision") ||
        errMsg.toLowerCase().includes("image analysis") ||
        errMsg.toLowerCase().includes("mistral");

      if (isVisionError && !showManualFallback) {
        toast.error("Image analysis could not be completed. Please describe the scene in text below and re-run.");
        setShowManualFallback(true);
        setPhase("idle");
        return;
      }

      const msg = err instanceof ApiError
        ? `Assessment failed (${err.status}): ${(err as ApiError).message.slice(0, 100)}.`
        : "Assessment failed. Ensure backend is running and an image is selected.";
      toast.error(msg);
      setPhase("idle");
    } finally {
      setLoading(false);
    }
  };

  const clearPhoto = () => {
    setPreview(null);
    setBase64(null);
    setResult(null);
    setPhase("idle");
    setShowManualFallback(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const phaseLabel = PHASE_LABELS[phase];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* LEFT — Input */}
      <SectionCard title="Photo Input">
        {!preview ? (
          <div
            role="button"
            tabIndex={0}
            aria-label="Drop zone — click to select image"
            className={`border border-dashed rounded-xl min-h-[180px] flex flex-col items-center justify-center gap-3 cursor-pointer transition-all ${
              isDragOver
                ? "border-primary/30 bg-primary/[0.03]"
                : "border-white/15 hover:border-white/25 hover:bg-white/[0.02]"
            }`}
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") fileRef.current?.click(); }}
            id="assess-dropzone"
          >
            <p className="text-foreground text-sm font-medium">Drop a photo here</p>
            <p className="text-muted-foreground/50 text-xs text-center px-4">
              or click to select · supports camera capture on mobile
            </p>
            <GhostButton className="mt-1 text-xs px-4 py-2" id="assess-select-photo-btn">Select Photo</GhostButton>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleFile}
            />
          </div>
        ) : (
          <div>
            <img src={preview} alt="Selected" className="w-full max-h-[200px] object-cover rounded-lg" />
            <button
              onClick={clearPhoto}
              className="text-primary text-xs mt-2 cursor-pointer hover:underline"
            >
              Change photo
            </button>
            <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFile} />
          </div>
        )}

        {/* Fix 1e — Manual fallback textarea */}
        {showManualFallback && (
          <div className="mt-3 p-3 rounded-lg bg-orange-500/5 border border-orange-500/20">
            <p className="text-orange-400 text-xs mb-2">
              Image analysis could not be completed. Describe the scene below and re-run.
            </p>
            <textarea
              rows={3}
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:border-primary/30 resize-none"
              placeholder="Describe the disaster scene: damage type, affected areas, visible hazards..."
              value={manualDescription}
              onChange={(e) => setManualDescription(e.target.value)}
              id="assess-manual-description"
            />
          </div>
        )}

        {/* Options — Fix: CustomDropdown replaces FormSelect (dropdown fix Option A) */}
        <div className="mt-4 grid grid-cols-2 gap-3">
          <CustomDropdown
            id="assess-disaster-type-dropdown"
            options={DISASTER_TYPES}
            value={disasterType}
            onChange={setDisasterType}
            placeholder="Disaster type"
          />
          <CustomDropdown
            id="assess-building-type-dropdown"
            options={BUILDING_TYPES}
            value={buildingType}
            onChange={setBuildingType}
            placeholder="Building type"
          />
        </div>

        {/* Fix 4a — Loading button text updates immediately */}
        <PrimaryButton
          id="assess-run-btn"
          className="w-full mt-4"
          disabled={(!base64 && !manualDescription.trim()) || loading}
          onClick={handleAssess}
        >
          {loading
            ? phase === "analyzing"
              ? "Analyzing image…"
              : "Generating assessment…"
            : "Run Assessment"}
        </PrimaryButton>
      </SectionCard>

      {/* RIGHT — Results (Fix 1c — two-section panel) */}
      <SectionCard title="Assessment Results">
        {/* Fix 1d — Phase-aware status message */}
        {!result && !loading && phaseLabel && (
          <EmptyState
            label="Upload a photo to begin."
            sub={phaseLabel}
          />
        )}
        {!result && !loading && !phaseLabel && phase === "idle" && (
          <EmptyState
            label="Upload a photo to begin."
            sub="Mistral vision AI will analyze the image. Gemma 4 31B will generate the assessment."
          />
        )}

        {loading && (
          <div className="py-20 flex flex-col items-center gap-4" id="assess-loading-state">
            <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            <p className="assessment-results-status text-muted-foreground/40 text-sm text-center">
              {PHASE_LABELS[phase] ?? "Processing…"}
            </p>
          </div>
        )}

        {result && (
          <div
            className="divide-y divide-white/[0.05] space-y-4"
            style={{ animation: "fade-up 0.4s cubic-bezier(0.16,1,0.3,1) both", willChange: "transform, opacity" }}
          >
            {/* Fix 1c — Visual Scan section (collapsible, default collapsed) */}
            {result.visualSummary && (
              <div className="pb-4">
                <VisualScanSection text={result.visualSummary} />
              </div>
            )}

            {/* Fix 1c — Damage Assessment section */}
            <div className="flex items-center gap-3 pb-4">
              <SeverityBadge severity={result.damageSeverity} className="text-xs px-3 py-1" />
              <span className="text-muted-foreground/60 text-xs">{result.confidenceScore}% confidence</span>
              {result.modelUsed && (
                <span className="text-[10px] text-muted-foreground/25 ml-auto">{result.modelUsed}</span>
              )}
            </div>
            <div className="pt-4">
              <p className="text-muted-foreground/50 text-[11px] uppercase tracking-widest mb-2">Assessment</p>
              <p className="text-foreground/80 text-sm leading-relaxed">{result.structuralAssessment}</p>
            </div>
            <div className="pt-4">
              <p className="text-muted-foreground/50 text-[11px] uppercase tracking-widest mb-2">Identified Hazards</p>
              <ul className="space-y-1">
                {result.identifiedHazards.map((h, i) => (
                  <li key={i} className="text-sm text-foreground/70">
                    <span className="text-destructive/70 mr-2">—</span>{h}
                  </li>
                ))}
              </ul>
            </div>
            <div className="pt-4">
              <p className="text-muted-foreground/50 text-[11px] uppercase tracking-widest mb-1">Estimated Trapped</p>
              <p className="text-3xl font-bold text-foreground tabular-nums">{result.estimatedTrappedPersons}</p>
            </div>
            <div className="pt-4">
              <p className="text-muted-foreground/50 text-[11px] uppercase tracking-widest mb-2">Recommended Actions</p>
              <ol className="space-y-1">
                {result.recommendedActions.map((a, i) => (
                  <li key={i} className="text-sm text-foreground/70">
                    <span className="text-primary font-bold mr-2">{i + 1}.</span>{a}
                  </li>
                ))}
              </ol>
            </div>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
