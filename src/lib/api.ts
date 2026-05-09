// ── RAKSHAK AI — Typed Backend API Client ────────────────────────────────────
// All AI calls (triage, assess, chat) route through the FastAPI backend.
// This keeps API keys server-side only — never exposed to the browser.

const BACKEND = (import.meta.env.VITE_BACKEND_URL as string | undefined)?.replace(/\/$/, "")
  ?? "http://localhost:8000";

// ── Shared fetch helper with timeout & typed errors ───────────────────────────
async function apiFetch<T>(
  path: string,
  init?: RequestInit,
  signal?: AbortSignal,
): Promise<T> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), 60_000); // 60s default timeout

  // Merge supplied signal with our timeout signal
  const mergedSignal = signal
    ? AbortSignal.any
      ? AbortSignal.any([signal, controller.signal])
      : controller.signal
    : controller.signal;

  try {
    const res = await fetch(`${BACKEND}${path}`, {
      ...init,
      signal: mergedSignal,
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new ApiError(res.status, body || res.statusText);
    }

    return res.json() as Promise<T>;
  } finally {
    clearTimeout(id);
  }
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

// ── Health ────────────────────────────────────────────────────────────────────
export async function checkHealth(): Promise<{ status: string }> {
  return apiFetch("/health");
}

// ── AI Chat ───────────────────────────────────────────────────────────────────
export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatRequest {
  message: string;
  history?: ChatMessage[];
  image_base64?: string;
  language?: string;
  session_id?: string;
}

export interface ChatResponse {
  session_id: string;
  message: string;
  model_used: string;
  function_calls: unknown[];
  function_results: unknown[];
  processing_time_ms: number;
}

export async function sendChatMessage(
  req: ChatRequest,
  signal?: AbortSignal,
): Promise<ChatResponse> {
  return apiFetch<ChatResponse>("/api/v1/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  }, signal);
}

// ── Damage Assessment ─────────────────────────────────────────────────────────
export interface AssessmentRequest {
  image_base64: string;
  disaster_type?: string;
  building_type?: string;
  language?: string;
}

export interface AssessmentResponse {
  damageSeverity?:          "Critical" | "High" | "Moderate" | "Low";
  damage_severity?:         number;
  structuralAssessment?:    string;
  structural_integrity?:    string;
  identifiedHazards?:       string[];
  hazards?:                 string[];
  estimatedTrappedPersons?: number;
  estimated_trapped?:       number | null;
  recommendedActions?:      string[];
  recommended_actions?:     string[];
  confidenceScore?:         number;
  confidence?:              number;
  model_used?:              string;
}

export async function assessDamage(
  req: AssessmentRequest,
  signal?: AbortSignal,
): Promise<AssessmentResponse> {
  return apiFetch<AssessmentResponse>("/api/v1/assess/base64", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  }, signal);
}

// ── Medical Triage ────────────────────────────────────────────────────────────
export interface TriageRequest {
  symptoms: string[];
  age_estimate?: string;
  gender?: string;
  language?: string;
}

export interface TriageGuidanceResponse {
  triage_color:      "red" | "yellow" | "green" | "black";
  priority_level:    number;
  immediate_remedy:  string[];
  precautions:       string[];
  medical_summary:   string;
  model_used?:       string;
}

/** Calls backend /api/v1/triage — returns AI-guided assessment only (no DB write). */
export async function getTriageGuidance(
  req: TriageRequest,
  signal?: AbortSignal,
): Promise<TriageGuidanceResponse> {
  return apiFetch<TriageGuidanceResponse>("/api/v1/triage/guidance", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  }, signal);
}
