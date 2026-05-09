import { useEffect, useRef, useState, useMemo } from "react";
import { toast } from "sonner";
import { useTopbar } from "../components/app/AppLayout";
import {
  SectionCard, EmptyState, PrimaryButton, GhostButton, SeverityBadge, FormSelect,
} from "../components/shared/index";
import type { DamageAssessmentResult } from "../../lib/types";
import { assessDamage, ApiError } from "../../lib/api";

const SYSTEM_LABEL = "Powered by RAKSHAK AI Vision";

// Normalise the backend response to the frontend type
function normaliseResult(raw: Record<string, unknown>): DamageAssessmentResult {
  // Backend returns snake_case numbers; frontend type uses PascalCase strings
  const severityNum = typeof raw.damage_severity === "number" ? raw.damage_severity : 5;
  const severityLabel: DamageAssessmentResult["damageSeverity"] =
    severityNum >= 8 ? "Critical" :
    severityNum >= 6 ? "High" :
    severityNum >= 4 ? "Moderate" : "Low";

  return {
    damageSeverity:          (raw.damageSeverity as DamageAssessmentResult["damageSeverity"]) ?? severityLabel,
    structuralAssessment:    (raw.structuralAssessment as string) ?? (raw.structural_integrity as string) ?? "Assessment unavailable.",
    identifiedHazards:       (raw.identifiedHazards as string[]) ?? (raw.hazards as string[]) ?? [],
    estimatedTrappedPersons: (raw.estimatedTrappedPersons as number) ?? (raw.estimated_trapped as number) ?? 0,
    recommendedActions:      (raw.recommendedActions as string[]) ?? (raw.recommended_actions as string[]) ?? [],
    confidenceScore:         Math.round(((raw.confidenceScore as number) ?? (raw.confidence as number) ?? 0.5) * 100),
  };
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
  const [result, setResult]             = useState<DamageAssessmentResult | null>(null);
  const [isDragOver, setIsDragOver]     = useState(false);
  const abortRef                        = useRef<AbortController | null>(null);

  const topbarRight = useMemo(() => (
    <span className="text-muted-foreground/60 text-sm">{SYSTEM_LABEL}</span>
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
    };
    reader.readAsDataURL(file);
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = ""; // allow re-selecting same file
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  };

  const handleAssess = async () => {
    if (!base64) return;
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    setLoading(true);
    setResult(null);
    try {
      const raw = await assessDamage(
        {
          image_base64: base64,
          disaster_type: disasterType || undefined,
          building_type: buildingType || undefined,
          language: "en",
        },
        abortRef.current.signal,
      );
      setResult(normaliseResult(raw as Record<string, unknown>));
    } catch (err: unknown) {
      if ((err as { name?: string })?.name === "AbortError") return;
      const msg = err instanceof ApiError
        ? `Assessment failed (${err.status}). Check backend connectivity.`
        : "Assessment failed. Ensure the backend is running.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const clearPhoto = () => {
    setPreview(null);
    setBase64(null);
    setResult(null);
    if (fileRef.current) fileRef.current.value = "";
  };

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
          >
            <p className="text-foreground text-sm font-medium">Drop a photo here</p>
            <p className="text-muted-foreground/50 text-xs text-center px-4">
              or click to select · supports camera capture on mobile
            </p>
            <GhostButton className="mt-1 text-xs px-4 py-2">Select Photo</GhostButton>
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

        {/* Options */}
        <div className="mt-4 grid grid-cols-2 gap-3">
          <FormSelect value={disasterType} onChange={(e) => setDisasterType(e.target.value)}>
            <option value="">Disaster type</option>
            {["Earthquake","Flood","Fire","Cyclone","Landslide","Building Collapse"].map((t) => (
              <option key={t}>{t}</option>
            ))}
          </FormSelect>
          <FormSelect value={buildingType} onChange={(e) => setBuildingType(e.target.value)}>
            <option value="">Building type</option>
            {["Residential","Commercial","Industrial","Hospital","School","Bridge"].map((t) => (
              <option key={t}>{t}</option>
            ))}
          </FormSelect>
        </div>

        <PrimaryButton
          className="w-full mt-4"
          disabled={!base64 || loading}
          onClick={handleAssess}
        >
          {loading ? "Analyzing…" : "Run Assessment"}
        </PrimaryButton>
      </SectionCard>

      {/* RIGHT — Results */}
      <SectionCard title="Assessment Results">
        {!result && !loading && (
          <EmptyState
            label="Upload a photo to begin."
            sub="AI will assess structural damage, hazards, and required actions."
          />
        )}
        {loading && (
          <div className="py-20 flex flex-col items-center gap-4">
            <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            <p className="text-muted-foreground/40 text-sm">Analyzing image…</p>
          </div>
        )}
        {result && (
          <div
            className="divide-y divide-white/[0.05] space-y-4"
            style={{ animation: "fade-up 0.4s cubic-bezier(0.16,1,0.3,1) both", willChange: "transform, opacity" }}
          >
            <div className="flex items-center gap-3 pb-4">
              <SeverityBadge severity={result.damageSeverity} className="text-xs px-3 py-1" />
              <span className="text-muted-foreground/60 text-xs">{result.confidenceScore}% confidence</span>
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
