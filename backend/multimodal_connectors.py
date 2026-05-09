"""
RAKSHA AI — Multimodal Vision Connectors
Pluggable vision provider architecture with Gemma 4 cloud as primary.

Provider priority (for image analysis):
  1. Gemma 4 Cloud Vision (Google AI API — native, best accuracy, no extra key)
  2. Local Ollama vision-capable model (offline, gemma/llava/moondream)
  3. Groq Llama 3.2 Vision (fast LPU cloud, requires GROQ_API_KEY)
  4. Mistral Pixtral (premium, requires MISTRAL_API_KEY)
  5. Static JSON fallback (never fails)

All non-Gemma providers are positioned as fallbacks only,
in compliance with the Gemma 4 Hackathon requirements.
"""

import json, base64, logging
import httpx
from typing import Dict, List, Optional, Any
from abc import ABC, abstractmethod
from providers import config

logger = logging.getLogger("raksha.multimodal")


# ── Abstract Base ──────────────────────────────────────────────────────────────

class BaseVisionProvider(ABC):
    """Standard interface for all vision providers."""
    provider_name: str = "Base"

    @abstractmethod
    async def analyze_image(
        self, image_base64: str, prompt: str, system_prompt: Optional[str] = None
    ) -> Dict[str, Any]:
        pass

    def _clean_b64(self, image_base64: str) -> str:
        """Strip data URI prefix — returns raw base64."""
        return image_base64.split(",")[-1] if "," in image_base64 else image_base64

    def _with_prefix(self, image_base64: str) -> str:
        """Ensure data URI prefix for OpenAI-compatible providers."""
        if not image_base64.startswith("data:image"):
            return f"data:image/jpeg;base64,{image_base64}"
        return image_base64

    def _unavailable(self, reason: str) -> Dict[str, Any]:
        return {"success": False, "error": reason, "provider": self.provider_name}


# ── Gemma 4 Cloud Vision (PRIMARY) ────────────────────────────────────────────

class GemmaCloudVisionConnector(BaseVisionProvider):
    """
    PRIMARY vision provider: Gemma 4 (gemma-4-31b-it) via Google AI API.
    Gemma 4 supports native multimodal (text + image) via inline_data.
    No additional API key required beyond GOOGLE_API_KEY.
    """
    provider_name = "GemmaCloudVision"

    async def analyze_image(
        self, image_base64: str, prompt: str, system_prompt: Optional[str] = None
    ) -> Dict[str, Any]:
        if not config.google_api_key:
            return self._unavailable("GOOGLE_API_KEY not configured")

        raw_b64 = self._clean_b64(image_base64)
        sys = system_prompt or (
            "You are a Gemma 4-powered disaster assessment AI. "
            "Analyze the disaster scene and return valid JSON only."
        )
        body = {
            "contents": [
                {
                    "role": "user",
                    "parts": [
                        {"inline_data": {"mime_type": "image/jpeg", "data": raw_b64}},
                        {"text": prompt},
                    ],
                }
            ],
            "systemInstruction": {"parts": [{"text": sys}]},
            "generationConfig": {"temperature": 0.2, "maxOutputTokens": 1024},
        }
        url = (
            f"{config.gemma_api_base}/models/{config.gemma_cloud_model}"
            f":generateContent?key={config.google_api_key}"
        )
        try:
            async with httpx.AsyncClient(timeout=60) as client:
                r = await client.post(url, json=body)
                r.raise_for_status()
                parts = r.json().get("candidates", [{}])[0].get("content", {}).get("parts", [])
                text = "".join(p.get("text", "") for p in parts if "text" in p)
                return {"success": True, "model_used": config.gemma_cloud_model,
                        "provider": self.provider_name, "raw_response": text}
        except Exception as e:
            logger.warning(f"Gemma Cloud Vision failed: {e}")
            return self._unavailable(str(e))


# ── Ollama Local Vision (SECONDARY) ───────────────────────────────────────────

class OllamaVisionConnector(BaseVisionProvider):
    """Local Ollama vision models (gemma2-vision, llava, moondream, etc.)"""
    provider_name = "OllamaLocalVision"

    async def _get_vision_models(self) -> List[str]:
        try:
            async with httpx.AsyncClient(timeout=3) as client:
                r = await client.get(f"{config.ollama_base_url}/api/tags")
                if r.status_code == 200:
                    names = [m.get("name", "") for m in r.json().get("models", [])]
                    vision_patterns = ["vision", "llava", "pixtral", "moondream", "gemma"]
                    return [n for n in names if any(p in n.lower() for p in vision_patterns)]
        except Exception:
            pass
        return []

    async def analyze_image(
        self, image_base64: str, prompt: str, system_prompt: Optional[str] = None
    ) -> Dict[str, Any]:
        models = await self._get_vision_models()
        if not models:
            return self._unavailable("No Ollama vision model installed")

        model = models[0]
        raw_b64 = self._clean_b64(image_base64)
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt, "images": [raw_b64]})

        try:
            async with httpx.AsyncClient(timeout=120) as client:
                r = await client.post(
                    f"{config.ollama_base_url}/api/chat",
                    json={"model": model, "messages": messages, "stream": False},
                )
                r.raise_for_status()
                text = r.json().get("message", {}).get("content", "")
                return {"success": True, "model_used": model,
                        "provider": self.provider_name, "raw_response": text}
        except Exception as e:
            logger.warning(f"Ollama Vision failed: {e}")
            return self._unavailable(str(e))


# ── Groq LPU Vision (TERTIARY — optional) ─────────────────────────────────────

class GroqVisionConnector(BaseVisionProvider):
    """Groq LPU Llama 3.2 Vision — fast cloud fallback. Requires GROQ_API_KEY."""
    provider_name = "GroqCloud"

    async def analyze_image(
        self, image_base64: str, prompt: str, system_prompt: Optional[str] = None
    ) -> Dict[str, Any]:
        if not config.groq_api_key:
            return self._unavailable("GROQ_API_KEY not set")

        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({
            "role": "user",
            "content": [
                {"type": "text", "text": prompt},
                {"type": "image_url", "image_url": {"url": self._with_prefix(image_base64)}},
            ],
        })
        try:
            async with httpx.AsyncClient(timeout=30) as client:
                r = await client.post(
                    config.groq_endpoint,
                    headers={"Authorization": f"Bearer {config.groq_api_key}",
                             "Content-Type": "application/json"},
                    json={"model": config.groq_vision_model, "messages": messages,
                          "temperature": 0.2, "max_tokens": 1024},
                )
                r.raise_for_status()
                text = r.json()["choices"][0]["message"]["content"]
                return {"success": True, "model_used": config.groq_vision_model,
                        "provider": self.provider_name, "raw_response": text}
        except Exception as e:
            logger.warning(f"Groq Vision failed: {e}")
            return self._unavailable(str(e))


# ── Mistral Pixtral (QUATERNARY — optional) ───────────────────────────────────

class MistralCloudVisionConnector(BaseVisionProvider):
    """Mistral Pixtral — premium vision fallback. Requires MISTRAL_API_KEY."""
    provider_name = "MistralCloud"

    async def analyze_image(
        self, image_base64: str, prompt: str, system_prompt: Optional[str] = None
    ) -> Dict[str, Any]:
        if not config.mistral_api_key:
            return self._unavailable("MISTRAL_API_KEY not set")

        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({
            "role": "user",
            "content": [
                {"type": "text", "text": prompt},
                {"type": "image_url", "image_url": {"url": self._with_prefix(image_base64)}},
            ],
        })
        try:
            async with httpx.AsyncClient(timeout=60) as client:
                r = await client.post(
                    config.mistral_endpoint,
                    headers={"Authorization": f"Bearer {config.mistral_api_key}",
                             "Content-Type": "application/json"},
                    json={"model": config.mistral_vision_model, "messages": messages, "max_tokens": 1000},
                )
                r.raise_for_status()
                text = r.json()["choices"][0]["message"]["content"]
                return {"success": True, "model_used": config.mistral_vision_model,
                        "provider": self.provider_name, "raw_response": text}
        except Exception as e:
            logger.warning(f"Mistral Vision failed: {e}")
            return self._unavailable(str(e))


# ── Multimodal Router ──────────────────────────────────────────────────────────

class MultimodalRouter:
    """
    Routes image analysis to best available vision provider.
    Priority: Gemma 4 Cloud → Ollama Local → Groq → Mistral → Static JSON

    Gemma 4 is always the primary provider when GOOGLE_API_KEY is set.
    Non-Gemma providers are fallbacks only (hackathon compliance).
    """

    SYSTEM_INSTRUCTIONS = (
        "You are a Gemma 4-powered disaster assessment AI. "
        "Analyze the image and return ONLY valid JSON with keys: "
        "damage_severity (1-10 float), structural_integrity (stable|compromised|collapsed), "
        "hazards (list), estimated_trapped (int or null), recommended_actions (list)."
    )

    def __init__(self):
        self.providers: List[BaseVisionProvider] = [
            GemmaCloudVisionConnector(),   # PRIMARY  — Gemma 4 cloud vision
            OllamaVisionConnector(),        # SECONDARY — local offline
            GroqVisionConnector(),          # TERTIARY  — requires GROQ_API_KEY
            MistralCloudVisionConnector(),  # QUATERNARY — requires MISTRAL_API_KEY
        ]

    async def route_and_analyze(self, image_base64: str, context_prompt: str) -> str:
        """Try each provider in priority order, return first successful raw response."""
        for provider in self.providers:
            result = await provider.analyze_image(
                image_base64, context_prompt, self.SYSTEM_INSTRUCTIONS
            )
            if result.get("success"):
                logger.info(f"Vision analysis via {result['provider']} ({result.get('model_used')})")
                return result.get("raw_response", "")

        logger.error("All vision providers failed — returning static fallback JSON")
        return json.dumps({
            "damage_severity": 5,
            "structural_integrity": "unknown",
            "hazards": ["All vision providers offline"],
            "estimated_trapped": None,
            "recommended_actions": ["Await human verification", "Restore network connectivity"],
        })


multimodal_router = MultimodalRouter()
