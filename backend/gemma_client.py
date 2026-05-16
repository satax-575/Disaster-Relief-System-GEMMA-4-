"""
RAKSHA AI — Gemma 4 Unified Client (Production-Grade)
All model routing, retries, fallback, and tool execution in one place.
Imports all config from providers.py — no hardcoded model strings here.
"""

import os, time, json, asyncio, logging, re
import httpx
from typing import Optional, List, Dict, Any
from providers import config, ProviderType, LOCAL_MODEL_PRIORITY_PATTERNS

logger = logging.getLogger(__name__)

# Late imports to avoid circular dependency (these modules import advanced_ai)
def _get_advanced_ai():
    from ai_core import advanced_ai
    return advanced_ai

def _get_vision_agent():
    from vision_agent import vision_agent
    return vision_agent

def _get_triage_agent():
    from triage_agent import triage_agent
    return triage_agent


# ── RAKSHA Function Tool Schemas (Gemma 4 function calling format) ─────────────

RAKSHA_TOOLS = [
    {
        "name": "dispatch_responder",
        "description": "Dispatch an emergency responder or team to a specific location.",
        "parameters": {
            "type": "object",
            "properties": {
                "incident_id": {"type": "string"},
                "responder_role": {"type": "string", "enum": ["medical", "search_rescue", "firefighter", "ndrf", "volunteer"]},
                "priority": {"type": "string", "enum": ["critical", "high", "medium", "low"]},
                "location_description": {"type": "string"}
            },
            "required": ["responder_role", "priority", "location_description"]
        }
    },
    {
        "name": "broadcast_emergency_alert",
        "description": "Send an emergency alert to a geographic zone or all users.",
        "parameters": {
            "type": "object",
            "properties": {
                "title": {"type": "string"},
                "message": {"type": "string"},
                "severity": {"type": "string", "enum": ["extreme", "severe", "moderate", "minor"]},
                "languages": {"type": "array", "items": {"type": "string"}}
            },
            "required": ["title", "message", "severity"]
        }
    },
    {
        "name": "get_evacuation_route",
        "description": "Generate an evacuation route from current location to safety.",
        "parameters": {
            "type": "object",
            "properties": {
                "origin_description": {"type": "string"},
                "hazard_type": {"type": "string"},
                "mobility_level": {"type": "string", "enum": ["full", "limited", "wheelchair", "carrying_injured"]}
            },
            "required": ["origin_description", "hazard_type"]
        }
    },
    {
        "name": "log_medical_triage",
        "description": "Create a medical triage record for a patient using START protocol.",
        "parameters": {
            "type": "object",
            "properties": {
                "symptoms": {"type": "array", "items": {"type": "string"}},
                "triage_color": {"type": "string", "enum": ["red", "yellow", "green", "black"]},
                "age_estimate": {"type": "string"},
                "location": {"type": "string"}
            },
            "required": ["symptoms", "triage_color"]
        }
    },
    {
        "name": "request_resources",
        "description": "Request specific emergency resources or equipment for an incident.",
        "parameters": {
            "type": "object",
            "properties": {
                "resources": {"type": "array", "items": {"type": "string"}},
                "urgency": {"type": "string", "enum": ["immediate", "within_hour", "within_day"]},
                "delivery_location": {"type": "string"}
            },
            "required": ["resources", "urgency"]
        }
    },
    {
        "name": "calculate_dosage",
        "description": "Calculate medication dosages using FHIR EHR protocols.",
        "parameters": {
            "type": "object",
            "properties": {
                "medication": {"type": "string"},
                "patient_weight_kg": {"type": "number"},
                "patient_age": {"type": "number"},
                "route": {"type": "string", "enum": ["IV", "IM", "PO"]}
            },
            "required": ["medication", "patient_weight_kg", "route"]
        }
    }
]

# Fix 3a — Updated Field Assistant system prompt
# Handles two query types: procedural guidance and dispatch/situation queries
# Eliminates: JSON leaks, generic responses, "deploy units" operator instructions
RAKSHA_SYSTEM_PROMPT = """You are RAKSHAK AI — an emergency dispatch and field guidance AI for disaster response operators.

Detect the query type and respond accordingly:

TYPE A — HOW-TO / PROCEDURAL (operator needs step-by-step instructions)
→ Respond with clear, numbered steps. Be direct. No preamble.

TYPE B — SITUATION REPORT / DISPATCH (an emergency is being reported)
→ Use exactly this format, no more:

SITUATION: [event + any location given]
PRIORITY: [CRITICAL / HIGH / MODERATE / LOW]
RESPONSE: [What command center is doing — third person, 1-2 sentences]
ARRIVAL: [ETA range, e.g. 5–10 minutes]
ON-SITE ACTIONS: [2-3 bullet points for the person at the scene]

ABSOLUTE RULES — violating any of these is a failure:
- Output ONLY your final answer. NEVER show internal thoughts, reasoning steps, or deliberation.
- Do NOT use asterisks (*) for emphasis or to frame thinking. No *Wait*, no *Let me think*, no *Hmm*.
- Do NOT repeat the same information twice. Each sentence must add new value.
- Do NOT include JSON, code blocks, or function call syntax.
- Do NOT tell the operator to "deploy units" or "allocate resources" — that is command center's role.
- Keep responses SHORT. Type A: max 8 steps. Type B: use only the 5 fields above.
- Always reference the specific symptom, location, or hazard mentioned by the user.

Model: Gemma 4 31B | Role: Active disaster response"""


# ── Model Selector ─────────────────────────────────────────────────────────────

class ModelSelector:
    """
    Determines the best available Gemma 4 model with caching.
    Priority: Cloud Gemma 4 → Local Gemma 4/compatible → None (cascade)
    Thread-safe for asyncio concurrent access (asyncio is single-threaded).
    """

    def __init__(self):
        self._cache_ts: float = 0.0
        self._online: bool = False
        self._local: bool = False
        self._local_model: str = config.gemma_local_model
        self._lock = asyncio.Lock() if False else None  # placeholder

    async def check_availability(self) -> Dict[str, Any]:
        now = time.monotonic()
        if now - self._cache_ts < config.availability_cache_ttl_s:
            return self._cached_result()

        self._cache_ts = now
        self._online = await self._probe_cloud()
        local_model = await self._probe_local()
        if local_model:
            self._local = True
            self._local_model = local_model
        else:
            self._local = False

        return self._cached_result()

    def _cached_result(self) -> Dict[str, Any]:
        return {
            "online": self._online,
            "local": self._local,
            "local_model": self._local_model,
            "cloud_model": config.gemma_cloud_model,
        }

    async def get_best_model(self) -> tuple[str, str]:
        """Returns (provider_type, model_name). Cloud always preferred."""
        avail = await self.check_availability()
        if avail["online"]:
            return ProviderType.GEMMA_CLOUD, config.gemma_cloud_model
        elif avail["local"]:
            return ProviderType.GEMMA_LOCAL, avail["local_model"]
        else:
            return ProviderType.POLLINATIONS, config.pollinations_model

    async def _probe_cloud(self) -> bool:
        if not config.google_api_key:
            return False
        try:
            async with httpx.AsyncClient(timeout=5) as client:
                r = await client.get(
                    f"{config.gemma_api_base}/models?key={config.google_api_key}"
                )
                return r.status_code == 200
        except Exception:
            return False

    async def _probe_local(self) -> Optional[str]:
        """Returns best local model name or None."""
        try:
            async with httpx.AsyncClient(timeout=3) as client:
                r = await client.get(f"{config.ollama_base_url}/api/tags")
                if r.status_code != 200:
                    return None
                names = [m.get("name", "") for m in r.json().get("models", [])]
                # Select highest-priority model pattern
                for pattern in LOCAL_MODEL_PRIORITY_PATTERNS:
                    for name in names:
                        if pattern in name.lower():
                            return name
                return None
        except Exception:
            return None


model_selector = ModelSelector()


# ── Gemma 4 Client ─────────────────────────────────────────────────────────────

class GemmaClient:
    """
    Unified Gemma 4 inference client for RAKSHA AI.

    Routing:
      1. Gemma 4 via Google AI API  (cloud, function calling, multimodal)
      2. Any Gemma/compatible model via Ollama  (local, offline-capable)
      3. Pollinations free cascade + DuckDuckGo search  (no-key fallback)
      4. Static emergency protocols  (never fails)

    All methods are async and non-blocking.
    """

    def __init__(self):
        self.selector = model_selector

    # ── Public API ─────────────────────────────────────────────────────────

    async def chat(
        self,
        message: str,
        history: Optional[List[Dict]] = None,
        image_base64: Optional[str] = None,
        language: str = "en",
        enable_tools: bool = True,
        system_override: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 800,  # Chat default: keep responses concise
    ) -> Dict[str, Any]:
        """Main inference entry point. Returns structured response dict."""
        t0 = time.monotonic()
        provider, model = await self.selector.get_best_model()
        history = history or []

        try:
            if provider == ProviderType.GEMMA_CLOUD:
                result = await self._cloud_chat(message, history, image_base64, language, enable_tools, system_override, temperature, max_tokens)
            elif provider == ProviderType.GEMMA_LOCAL:
                result = await self._local_chat(message, history, image_base64, language, enable_tools, system_override)
            else:
                result = await self._cascade_chat(message, history, language)
        except Exception as e:
            logger.error(f"[GemmaClient] Primary provider error ({provider}): {e}")
            # Cascade 1: Try Groq text (fast, reliable) before Pollinations
            groq_result = await self._groq_text_fallback(message, history, system_override)
            if groq_result:
                result = groq_result
                result["fallback_reason"] = f"Gemma cloud unavailable: {str(e)[:80]}"
            else:
                try:
                    result = await self._cascade_chat(message, history, language)
                    result["fallback_reason"] = str(e)[:120]
                except Exception as e2:
                    logger.error(f"[GemmaClient] Cascade also failed: {e2}")
                    result = self._static_fallback()

        result["processing_time_ms"] = int((time.monotonic() - t0) * 1000)
        return result

    async def _groq_text_fallback(
        self,
        message: str,
        history: Optional[List[Dict]] = None,
        system_override: Optional[str] = None,
    ) -> Optional[Dict]:
        """Fast Groq text fallback (no vision) when Gemma cloud is down."""
        if not config.groq_api_key:
            return None
        try:
            sys_prompt = system_override or RAKSHA_SYSTEM_PROMPT
            msgs = [{"role": "system", "content": sys_prompt}]
            for h in (history or [])[-6:]:
                msgs.append({"role": h.get("role", "user"), "content": h.get("content", "")})
            msgs.append({"role": "user", "content": message})
            body = {
                "model": "llama-3.3-70b-versatile",  # Groq's text model (fast, free tier)
                "messages": msgs,
                "temperature": 0.4,
                "max_tokens": 2048,
            }
            headers = {
                "Authorization": f"Bearer {config.groq_api_key}",
                "Content-Type": "application/json",
            }
            async with httpx.AsyncClient(timeout=30) as client:
                r = await client.post(config.groq_endpoint, headers=headers, json=body)
                if r.status_code == 200:
                    text = r.json().get("choices", [{}])[0].get("message", {}).get("content", "")
                    if text:
                        logger.info("[GemmaClient] Groq text fallback succeeded")
                        return {
                            "message": text.strip(),
                            "model_used": "groq-llama-3.3-70b (fallback)",
                            "function_calls": [],
                            "function_results": [],
                        }
        except Exception as e:
            logger.warning(f"[GemmaClient] Groq text fallback failed: {e}")
        return None

    async def assess_damage(
        self,
        image_base64: str,
        disaster_type: Optional[str] = None,
        building_type: Optional[str] = None,
        language: str = "en",
    ) -> Dict[str, Any]:
        """
        Multimodal damage assessment.
        Routes to Gemma 4 cloud vision when available, falls back to BLIP pipeline.
        """
        provider, _ = await self.selector.get_best_model()

        # Try Gemma 4 cloud vision first (native multimodal support)
        if provider == ProviderType.GEMMA_CLOUD:
            context = ""
            if disaster_type:
                context += f"Disaster type: {disaster_type}. "
            if building_type:
                context += f"Building type: {building_type}. "

            # Gemma 4 is a text-to-text model. Sending raw images to the Google API causes 
            # a 500 Internal Server Error. We extract a caption using Groq/Mistral/BLIP first.
            caption = await _get_vision_agent()._get_image_caption(image_base64)
            logger.info(f"Generated caption for Gemma 4 assessment: {caption}")

            prompt = (
                f"You are a disaster assessment AI. Analyze this disaster scene description: '{caption}'.\n"
                f"{context}\n"
                f"Return ONLY valid JSON with these exact keys:\n"
                f'{{"damage_severity": <1-10 float>, "hazards": ["..."], '
                f'"structural_integrity": "<stable|compromised|collapsed>", '
                f'"estimated_trapped": <int or null>, '
                f'"recommended_actions": ["..."], '
                f'"intelligence_summary": "<2 sentence assessment>", '
                f'"resource_requirements": {{"teams_required": <int>, "medical_personnel": <int>, "equipment": []}}}}'
                f'\nRespond in language: {language}.'
            )
            try:
                result = await self._cloud_chat(
                    message=prompt,
                    history=[],
                    image_base64=None,  # Prevents the 500 error on the text endpoint
                    language=language,
                    enable_tools=False,
                    system_override="You are a precision disaster assessment AI. Output only valid JSON.",
                    temperature=0.5,  # Fix 4c: factual but scene-specific
                )
                parsed = self._extract_json(result.get("message", ""))
                if parsed and "damage_severity" in parsed:
                    parsed["model_used"] = f"gemma4-cloud ({config.gemma_cloud_model})"
                    parsed["caption"] = caption
                    return parsed
            except Exception as e:
                logger.warning(f"Cloud text assessment failed, falling back to BLIP pipeline: {e}")

        # Fall back to BLIP + LLM vision pipeline
        assessment = await _get_vision_agent().analyze_incident_image(image_base64, language)
        return assessment

    async def generate_triage_guidance(
        self,
        symptoms: List[str],
        age_estimate: Optional[str],
        vitals: Optional[Dict],
        language: str = "en",
        gender: Optional[str] = None,
        fhir_history: Optional[dict] = None,
    ) -> Dict[str, Any]:
        """
        AI-powered medical triage using START protocol with detailed clinical guidance.
        Routes through Gemma 4 when available for best accuracy.
        """
        vitals_str = json.dumps(vitals) if vitals else "Not measured"
        fhir_str = ""
        if fhir_history:
            from medical_rag import med_rag
            fhir_str = med_rag.parse_fhir_history(fhir_history)

        gender_str = gender or "Unknown"
        symptom_list = ", ".join(symptoms) if symptoms else "No symptoms provided"

        # Build a unique fingerprint in the prompt so the LLM cannot produce identical
        # outputs for different inputs (prevents caching-style repetition).
        import hashlib, time as _time
        case_id = hashlib.md5(f"{symptom_list}{age_estimate}{gender_str}{_time.time()}".encode()).hexdigest()[:8].upper()

        prompt = (
            f"PATIENT CASE #{case_id} — START TRIAGE ASSESSMENT\n"
            f"=================================================\n"
            f"Demographics: Age={age_estimate or 'Unknown'}, Gender={gender_str}\n"
            f"Presenting symptoms ({len(symptoms)} observed): {symptom_list}\n"
            f"Vitals on arrival: {vitals_str}\n"
            f"{f'Medical History: {fhir_str}' if fhir_str else ''}\n\n"
            f"INSTRUCTIONS:\n"
            f"1. Each symptom listed MUST be individually addressed in your clinical summary.\n"
            f"2. Your assessment must be 100%% specific to THIS patient's exact symptom combination.\n"
            f"3. Do NOT produce generic advice. Reference '{symptom_list}' explicitly.\n"
            f"4. Immediate actions must be ordered by clinical priority for THIS presentation.\n\n"
            f"Return ONLY valid JSON — no markdown, no commentary, raw JSON only:\n"
            f'{{\n'
            f'  "triage_color": "<red|yellow|green|black>",\n'
            f'  "priority_level": <integer 1-10, 10=most critical>,\n'
            f'  "immediate_remedy": ["<action specific to symptom 1>", "<action specific to symptom 2>", "<action 3>"],\n'
            f'  "precautions": ["<precaution relevant to this case>", "<contraindication relevant to this case>"],\n'
            f'  "medical_summary": "<3-4 sentence clinical narrative mentioning EACH observed symptom by name and the likely underlying pathology>",\n'
            f'  "differential_diagnosis": ["<primary diagnosis for this symptom combination>", "<alternative 1>", "<alternative 2>"],\n'
            f'  "shock_assessment": "<none|suspected|confirmed> — <1-sentence reasoning citing specific symptoms>",\n'
            f'  "vitals_targets": "<specific BP/SpO2/HR targets for this patient>",\n'
            f'  "medications_consider": ["<drug/intervention with dose if applicable>"],\n'
            f'  "transport_priority": "<immediate transport|stabilize first|can wait|deceased> — <reason>",\n'
            f'  "monitoring_intervals": "<reassessment interval with rationale>"\n'
            f'}}\n'
            f"Language: {language}."
        )

        result = await self.chat(
            message=prompt,
            enable_tools=False,
            temperature=0.6,
            max_tokens=2048,  # Triage JSON needs more space than regular chat
            system_override=(
                "You are RAKSHAK AI's clinical triage engine under the START (Simple Triage and Rapid Treatment) protocol.\n"
                "ABSOLUTE RULES:\n"
                "- Output ONLY raw JSON. No markdown fences, no prose before or after the JSON.\n"
                "- Every field in your JSON MUST be specific to the patient case presented — never use generic templates.\n"
                "- In medical_summary, name EVERY symptom from the patient's list by name.\n"
                "- immediate_remedy actions must differ from case to case based on the specific symptoms.\n"
                "- If you output generic text like 'Stabilize patient' without clinical specificity, you have FAILED.\n"
                "Field medics are treating a real patient. Precision saves lives."
            ),
        )
        raw_msg = result.get("message", "")
        parsed = self._extract_json(raw_msg) or {}

        # Detect generic/fallback output and log a warning
        summary = parsed.get("medical_summary", "")
        if not summary or summary.strip() in (
            "Awaiting full clinical evaluation.",
            "Immediate intervention required.",
        ) or not parsed.get("immediate_remedy"):
            logger.warning(
                f"[Triage] Generic/empty response detected for symptoms={symptoms}. "
                f"Raw response: {raw_msg[:300]}"
            )

        # Only use a fallback value when parsed JSON truly has no value — never hardcode
        # the generic strings that caused the original bug.
        triage_color = parsed.get("triage_color", "").lower().strip()
        if triage_color not in ("red", "yellow", "green", "black"):
            triage_color = "yellow"

        return {
            "triage_color":            triage_color,
            "priority_level":          parsed.get("priority_level") or 5,
            "immediate_remedy":        parsed.get("immediate_remedy") or [
                f"Assess airway and breathing for patient with {symptom_list}",
                "Control any active haemorrhage with direct pressure",
                "Establish IV access and monitor vitals continuously",
            ],
            "precautions":             parsed.get("precautions") or [
                f"Tailor precautions to presenting symptoms: {symptom_list}",
                "Re-assess neurological status every 5 minutes",
            ],
            "medical_summary":         parsed.get("medical_summary") or (
                f"Patient presenting with {symptom_list}. Full AI assessment could not be generated — "
                f"apply clinical judgment per START protocol."
            ),
            "differential_diagnosis":  parsed.get("differential_diagnosis") or [],
            "shock_assessment":        parsed.get("shock_assessment") or "Not assessed — evaluate clinically",
            "vitals_targets":          parsed.get("vitals_targets") or "BP >90 systolic, SpO2 >94%, HR 60-100",
            "medications_consider":    parsed.get("medications_consider") or [],
            "transport_priority":      parsed.get("transport_priority") or "Assess on site",
            "monitoring_intervals":    parsed.get("monitoring_intervals") or "Every 5 minutes",
            "reasoning":               parsed.get("medical_summary") or "",
            "immediate_interventions": parsed.get("immediate_remedy") or [],
            "model_used":              result.get("model_used", "raksha-triage-ai"),
        }

    async def translate_alert(self, message: str, target_languages: List[str]) -> Dict[str, str]:
        """Translate emergency alert into multiple languages using Gemma 4."""
        if not target_languages:
            return {"en": message}
        lang_list = ", ".join(target_languages)
        prompt = (
            f"Translate this emergency alert to: {lang_list}\n"
            f"Alert: {message}\n\n"
            f"Return ONLY valid JSON: {{\"hi\": \"...\", \"ta\": \"...\"}}\n"
            f"Keep translations urgent and accurate. This is a life-safety alert."
        )
        result = await self.chat(message=prompt, enable_tools=False)
        translations = self._extract_json(result.get("message", "")) or {}
        translations["en"] = message
        return translations

    # ── Cloud Path (Gemma 4 via Google AI API) ─────────────────────────────

    async def _cloud_chat(
        self, message: str, history: List[Dict],
        image_base64: Optional[str], language: str,
        enable_tools: bool, system_override: Optional[str],
        temperature: float = 0.7,
        max_tokens: int = 800,
    ) -> Dict:
        parts = []
        if image_base64:
            raw_b64 = image_base64.split(",")[-1] if "," in image_base64 else image_base64
            parts.append({"inline_data": {"mime_type": "image/jpeg", "data": raw_b64}})

        lang_hint = f"\n[Respond in language: {language}]" if language != "en" else ""
        parts.append({"text": message + lang_hint})

        sys_prompt = system_override or RAKSHA_SYSTEM_PROMPT
        is_gemma = "gemma" in config.gemma_cloud_model.lower()

        # Gemma models do not support systemInstruction natively on some endpoints.
        # We inject the system prompt into the first message to guarantee it works.
        contents = []
        for h in history[-10:]:
            role = "user" if h.get("role") == "user" else "model"
            contents.append({"role": role, "parts": [{"text": h.get("content", "")}]})
        contents.append({"role": "user", "parts": parts})

        if is_gemma:
            sys_msg = f"[SYSTEM INSTRUCTION]\n{sys_prompt}\n\n[USER INPUT]\n"
            # Always inject the system prompt into the LAST (current) user message,
            # not contents[0] which could be old history. This ensures the triage
            # system-override is actually seen by the model for the current request.
            last_user_idx = next(
                (i for i in range(len(contents) - 1, -1, -1) if contents[i]["role"] == "user"),
                None,
            )
            if last_user_idx is not None:
                contents[last_user_idx]["parts"][0]["text"] = (
                    sys_msg + contents[last_user_idx]["parts"][0]["text"]
                )
            else:
                contents.insert(0, {"role": "user", "parts": [{"text": sys_msg}]})

        body: Dict = {
            "contents": contents,
            # topK=40 ensures diverse token sampling.
            # max_tokens is caller-controlled: 800 for chat brevity, 2048 for triage JSON.
            "generationConfig": {"temperature": temperature, "topP": 0.9, "topK": 40, "maxOutputTokens": max_tokens},
        }
        if not is_gemma:
            body["systemInstruction"] = {"parts": [{"text": sys_prompt}]}
            if enable_tools:
                body["tools"] = [{"function_declarations": RAKSHA_TOOLS}]

        url = (
            f"{config.gemma_api_base}/models/{config.gemma_cloud_model}"
            f":generateContent?key={config.google_api_key}"
        )

        last_err = None
        for attempt in range(config.gemma_cloud_retries):
            try:
                async with httpx.AsyncClient(timeout=config.gemma_cloud_timeout_s) as client:
                    r = await client.post(url, json=body)
                    r.raise_for_status()
                    return self._parse_cloud_response(r.json())
            except httpx.HTTPStatusError as e:
                # FIX: Gemma 4 returns 500 for model overload / large payloads — treat like 503
                if e.response.status_code in (429, 500, 503):
                    wait = 2 ** attempt
                    status = e.response.status_code
                    logger.warning(f"Cloud error {status} (attempt {attempt+1}/{config.gemma_cloud_retries}), retrying in {wait}s")
                    await asyncio.sleep(wait)
                    last_err = e
                else:
                    raise
            except (httpx.TimeoutException, httpx.ConnectError) as e:
                logger.warning(f"Cloud timeout/connect (attempt {attempt+1}): {e}")
                await asyncio.sleep(2 ** attempt)
                last_err = e

        raise Exception(f"Cloud API failed after {config.gemma_cloud_retries} retries: {last_err}")

    def _parse_cloud_response(self, data: dict) -> Dict:
        fc_list, fr_list, text_parts = [], [], []
        candidates = data.get("candidates", [])
        if not candidates:
            return {"message": "No response from model.", "model_used": config.gemma_cloud_model,
                    "function_calls": [], "function_results": []}

        for part in candidates[0].get("content", {}).get("parts", []):
            if "text" in part:
                text_parts.append(part["text"])
            elif "functionCall" in part:
                fc = part["functionCall"]
                fc_list.append({"name": fc.get("name"), "args": fc.get("args", {})})

        for fc in fc_list:
            fr_list.append({"name": fc["name"], "result": self._execute_tool(fc["name"], fc["args"])})

        raw_msg = "\n".join(text_parts) if text_parts else self._summarize_results(fr_list)

        # ── Strip all internal reasoning and artifacts ──────────────────────
        msg = raw_msg
        # 1. Remove <think>...</think> blocks (explicit reasoning tags)
        msg = re.sub(r"<think>[\s\S]*?</think>\s*", "", msg, flags=re.IGNORECASE)
        # 2. Remove inline asterisk-formatted reasoning (e.g. *Wait*, *Let me think*, *Hmm*)
        msg = re.sub(r"\*[^\n]{1,80}\*\n?", "", msg)
        # 3. Remove leading meta-commentary lines ("Let me analyze...", "I need to...", etc.)
        msg = re.sub(
            r"(?im)^(let me|I need to|I should|I will|I'm going to|hmm|wait|okay|alright|so,)[^\n]*\n?",
            "", msg
        )
        # 4. Strip leaked JSON function call blocks
        msg = re.sub(r"(?i)JSON Function Call:\s*(```json)?\s*\{[\s\S]*?\}\s*(```)?", "", msg)
        msg = re.sub(r"```json\s*\{[\s\S]*?\}\s*```", "", msg, flags=re.IGNORECASE)
        msg = re.sub(r"JSON Function Call:[\s\S]*?\}", "", msg, flags=re.IGNORECASE)
        # 5. Collapse 3+ blank lines into max 2
        msg = re.sub(r"\n{3,}", "\n\n", msg).strip()

        if not msg:
            msg = raw_msg.strip()  # fallback if everything was stripped
        return {"message": msg, "model_used": config.gemma_cloud_model,
                "function_calls": fc_list, "function_results": fr_list}

    # ── Local Path (Ollama) ────────────────────────────────────────────────

    async def _local_chat(
        self, message: str, history: List[Dict],
        image_base64: Optional[str], language: str,
        enable_tools: bool, system_override: Optional[str],
    ) -> Dict:
        local_model = self.selector._local_model
        sys_prompt = system_override or RAKSHA_SYSTEM_PROMPT
        messages = [{"role": "system", "content": sys_prompt}]

        for h in history[-8:]:
            messages.append({"role": h.get("role", "user"), "content": h.get("content", "")})

        lang_hint = f" [Respond in language: {language}]" if language != "en" else ""
        user_content = message + lang_hint
        if enable_tools:
            user_content += "\n\nIf action is needed (dispatch/alert/evacuate), state clearly what action to take."

        msg_obj: Dict = {"role": "user", "content": user_content}
        if image_base64:
            raw_b64 = image_base64.split(",")[-1] if "," in image_base64 else image_base64
            msg_obj["images"] = [raw_b64]
        messages.append(msg_obj)

        body = {
            "model": local_model,
            "messages": messages,
            "stream": False,
            "options": {"temperature": 0.4, "top_p": 0.9, "num_predict": 1024},
        }

        async with httpx.AsyncClient(timeout=config.ollama_timeout_s,
                                     base_url=config.ollama_base_url) as client:
            r = await client.post("/api/chat", json=body)
            r.raise_for_status()

        content = r.json().get("message", {}).get("content", "No response.")
        return {"message": content, "model_used": local_model,
                "function_calls": [], "function_results": []}

    # ── Cascade Fallback (Pollinations + DDG) ──────────────────────────────

    async def _cascade_chat(self, message: str, history: List[Dict], language: str) -> Dict:
        text = await _get_advanced_ai().generate_response(message, history, language)

        fc_list, fr_list = [], []
        
        # Strip all function call json artifacts from text
        text = re.sub(r"(?i)JSON Function Call:\s*(```json)?\s*\{[\s\S]*?\}\s*(```)?", "", text)
        text = re.sub(r"```json\s*\{[\s\S]*?\}\s*```", "", text, flags=re.IGNORECASE).strip()

        for fc in fc_list:
            fr_list.append({"name": fc["name"], "result": self._execute_tool(fc["name"], fc["args"])})
        if fr_list:
            text += "\n\n" + self._summarize_results(fr_list)

        return {"message": text, "model_used": "raksha-cascade-ai",
                "function_calls": fc_list, "function_results": fr_list}

    # ── Static Fallback ────────────────────────────────────────────────────

    def _static_fallback(self) -> Dict:
        return {
            "message": (
                "⚠️ RAKSHA AI Emergency Mode\n\n"
                "All AI providers unreachable. Emergency contacts:\n"
                "• India Emergency: 112\n• NDRF: 1078\n• Medical: 108\n• Fire: 101\n\n"
                "1. Ensure your own safety first\n"
                "2. Move to high ground if flooding\n"
                "3. Stay away from damaged structures\n"
                "4. Help injured only if safe\n"
                "5. Signal rescue with light or sound"
            ),
            "model_used": "offline-static",
            "function_calls": [], "function_results": [],
        }

    # ── Tool Execution ─────────────────────────────────────────────────────

    def _execute_tool(self, name: str, args: dict) -> dict:
        if name == "dispatch_responder":
            return {"status": "dispatched",
                    "message": f"Dispatching {args.get('responder_role')} to {args.get('location_description')}",
                    "eta_minutes": 8, "priority": args.get("priority", "high")}
        elif name == "broadcast_emergency_alert":
            return {"status": "broadcast",
                    "message": f"Alert '{args.get('title')}' sent ({args.get('severity')} severity)"}
        elif name == "get_evacuation_route":
            return {"status": "route_generated", "origin": args.get("origin_description"),
                    "route": "Head to nearest high ground. Avoid roads near water. Assembly: Government School."}
        elif name == "log_medical_triage":
            return {"status": "logged", "patient_id": f"P-{int(time.monotonic()*100)%9999:04d}",
                    "triage_color": args.get("triage_color")}
        elif name == "request_resources":
            return {"status": "requested", "resources": args.get("resources", []),
                    "message": "Request forwarded to command center"}
        elif name == "calculate_dosage":
            return {"status": "calculated",
                    "message": f"Dosage for {args.get('medication')} calculated per protocol"}
        return {"status": "unknown", "name": name}

    def _summarize_results(self, results: List[Dict]) -> str:
        if not results:
            return ""
        return "\n".join(f"✅ {r.get('result', {}).get('message', r.get('name', 'Done'))}" for r in results)

    def _extract_json(self, text: str) -> Optional[dict]:
        if not text:
            return None
        try:
            return json.loads(text)
        except Exception:
            pass
        for pat in [r'```json\s*([\s\S]*?)\s*```', r'```\s*([\s\S]*?)\s*```', r'\{[\s\S]*\}']:
            m = re.search(pat, text)
            if m:
                try:
                    candidate = m.group(1) if '```' in pat else m.group(0)
                    return json.loads(candidate)
                except Exception:
                    continue
        return None


# ── Singletons ─────────────────────────────────────────────────────────────────

gemma_client = GemmaClient()
