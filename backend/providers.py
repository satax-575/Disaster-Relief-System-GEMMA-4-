"""
RAKSHA AI — Centralized Provider Configuration
============================================
Single source of truth for ALL model identifiers, API endpoints,
capability flags, and provider metadata used across the codebase.

NO module should hardcode a model name or endpoint.
ALL provider references should import from here.

Design: Open/Closed principle — add new providers by extending,
        never by modifying existing provider logic.

IMPORTANT: load_dotenv() MUST be called before this module is imported.
           main.py and startup.py both ensure this ordering.
"""

from __future__ import annotations
import os
from enum import Enum
from dataclasses import dataclass, field
from typing import Dict, List, Optional


# ── Provider Identifiers ───────────────────────────────────────────────────────

class ProviderType(str, Enum):
    """Canonical provider type identifiers."""
    GEMMA_CLOUD    = "gemma_cloud"    # Gemma 4 via Google AI REST API
    GEMMA_LOCAL    = "gemma_local"    # Gemma 4 (or compatible) via local Ollama
    POLLINATIONS   = "pollinations"   # Free Pollinations AI (cascade fallback)
    DDG_SEARCH     = "ddg_search"     # DuckDuckGo web search (last resort)
    STATIC_OFFLINE = "static_offline" # Hard-coded emergency fallback (never fails)


# ── Provider Capabilities ──────────────────────────────────────────────────────

@dataclass
class ProviderCapabilities:
    """Describes what a provider can and cannot do."""
    text_generation: bool = True
    multimodal_vision: bool = False     # Image understanding
    function_calling: bool = False      # Native structured function calls
    streaming: bool = False             # Token streaming
    multilingual: bool = True           # Multi-language responses
    max_context_tokens: int = 4096      # Maximum context window tokens
    max_output_tokens: int = 2048       # Maximum generation tokens


# ── Provider Descriptors ───────────────────────────────────────────────────────

@dataclass
class ProviderDescriptor:
    """Complete description of a single AI provider."""
    provider_type: ProviderType
    display_name: str
    model_id: str                       # API model identifier
    api_base_url: str
    capabilities: ProviderCapabilities
    requires_api_key: bool = False
    api_key_env_var: Optional[str] = None
    priority: int = 0                   # Lower = higher priority
    tags: List[str] = field(default_factory=list)


# ── Live Configuration (loaded from environment) ───────────────────────────────

class RakshaConfig:
    """
    Centralized runtime configuration for RAKSHA AI.
    All values sourced from environment variables with sensible defaults.

    CRITICAL: load_dotenv() must be called before this class is instantiated.
    The __init__ method reads all values at construction time, making it
    safe for testing (pass a custom env before instantiation).

    Usage:
        from providers import config
        model_id = config.gemma_cloud_model
        api_key  = config.google_api_key
    """

    def __init__(self) -> None:
        import json

        # ── Google AI / Gemma 4 Cloud ──────────────────────────────────────
        self.google_api_key: str       = os.getenv("GOOGLE_API_KEY", "").strip()
        self.gemma_cloud_model: str    = os.getenv("GEMMA_CLOUD_MODEL", "gemma-4-31b-it").strip()
        self.gemma_api_base: str       = "https://generativelanguage.googleapis.com/v1beta"
        self.gemma_cloud_timeout_s: int  = int(os.getenv("GEMMA_CLOUD_TIMEOUT", "60"))
        self.gemma_cloud_retries: int    = int(os.getenv("GEMMA_CLOUD_RETRIES", "3"))

        # ── Ollama / Local Gemma ───────────────────────────────────────────
        self.ollama_base_url: str      = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434").strip()
        self.gemma_local_model: str    = os.getenv("GEMMA_LOCAL_MODEL", "gemma2:9b").strip()
        self.ollama_timeout_s: int     = int(os.getenv("OLLAMA_TIMEOUT", "120"))
        self.local_model_priority: List[str] = ["gemma", "llama", "mistral", "phi", "qwen"]

        # ── Cascade Fallback ───────────────────────────────────────────────
        self.pollinations_base_url: str  = "https://text.pollinations.ai/"
        self.pollinations_model: str     = os.getenv("POLLINATIONS_MODEL", "mistral").strip()
        self.pollinations_timeout_s: int = int(os.getenv("POLLINATIONS_TIMEOUT", "20"))
        self.pollinations_max_chars: int = 2000

        # ── HuggingFace / BLIP Vision ─────────────────────────────────────
        self.huggingface_token: str    = os.getenv("HUGGINGFACE_TOKEN", "").strip()
        self.blip_api_url: str         = (
            "https://api-inference.huggingface.co/models/"
            "Salesforce/blip-image-captioning-large"
        )

        # ── Groq / Llama 4 Scout Vision ───────────────────────────────────
        self.groq_api_key: str         = os.getenv("GROQ_API_KEY", "").strip()
        # llama-4-scout-17b supports vision (images) — available on free Groq tier
        self.groq_vision_model: str    = "meta-llama/llama-4-scout-17b-16e-instruct"
        self.groq_endpoint: str        = "https://api.groq.com/openai/v1/chat/completions"

        # ── Mistral / Pixtral Vision ──────────────────────────────────────
        self.mistral_api_key: str      = os.getenv("MISTRAL_API_KEY", "").strip()
        # pixtral-large-2411 is the production Pixtral vision model
        self.mistral_vision_model: str = "pixtral-large-2411"
        self.mistral_endpoint: str     = "https://api.mistral.ai/v1/chat/completions"

        # ── Availability Cache ─────────────────────────────────────────────
        self.availability_cache_ttl_s: int = int(os.getenv("MODEL_CHECK_INTERVAL", "30"))

        # ── App ────────────────────────────────────────────────────────────
        self.app_name: str    = os.getenv("APP_NAME", "RAKSHA AI").strip()
        self.app_version: str = os.getenv("APP_VERSION", "1.0.0").strip()
        self.debug: bool      = os.getenv("DEBUG", "false").lower() == "true"
        self.port: int        = int(os.getenv("PORT", "8000"))
        self.database_url: str = os.getenv("DATABASE_URL", "./raksha.db").strip()

        # ── CORS ───────────────────────────────────────────────────────────
        raw_cors = os.getenv(
            "CORS_ORIGINS",
            '["http://localhost:8000","http://localhost:3000"]'
        )
        try:
            origins = json.loads(raw_cors)
            if origins == ["*"]:
                # CORS spec: wildcard + allow_credentials=True is invalid
                origins = ["http://localhost:8000", "http://localhost:3000"]
            self.cors_origins: List[str] = origins
        except Exception:
            self.cors_origins = ["http://localhost:8000", "http://localhost:3000"]

    # ── Provider Registry ──────────────────────────────────────────────────

    def get_provider_registry(self) -> Dict[ProviderType, ProviderDescriptor]:
        """Return the full ordered provider registry with live config values."""
        return {
            ProviderType.GEMMA_CLOUD: ProviderDescriptor(
                provider_type=ProviderType.GEMMA_CLOUD,
                display_name=f"Gemma 4 Cloud ({self.gemma_cloud_model})",
                model_id=self.gemma_cloud_model,
                api_base_url=self.gemma_api_base,
                capabilities=ProviderCapabilities(
                    text_generation=True,
                    multimodal_vision=True,
                    function_calling=True,
                    streaming=False,
                    multilingual=True,
                    max_context_tokens=8192,
                    max_output_tokens=2048,
                ),
                requires_api_key=True,
                api_key_env_var="GOOGLE_API_KEY",
                priority=0,
                tags=["gemma4", "cloud", "primary", "function_calling", "multimodal"],
            ),

            ProviderType.GEMMA_LOCAL: ProviderDescriptor(
                provider_type=ProviderType.GEMMA_LOCAL,
                display_name=f"Gemma 4 Local ({self.gemma_local_model})",
                model_id=self.gemma_local_model,
                api_base_url=self.ollama_base_url,
                capabilities=ProviderCapabilities(
                    text_generation=True,
                    multimodal_vision=False,
                    function_calling=False,
                    streaming=False,
                    multilingual=True,
                    max_context_tokens=4096,
                    max_output_tokens=1024,
                ),
                requires_api_key=False,
                priority=1,
                tags=["gemma4", "local", "offline", "secondary"],
            ),

            ProviderType.POLLINATIONS: ProviderDescriptor(
                provider_type=ProviderType.POLLINATIONS,
                display_name="RAKSHA Cascade AI (Pollinations)",
                model_id=self.pollinations_model,
                api_base_url=self.pollinations_base_url,
                capabilities=ProviderCapabilities(
                    text_generation=True,
                    multimodal_vision=False,
                    function_calling=False,
                    streaming=False,
                    multilingual=True,
                    max_context_tokens=2000,
                    max_output_tokens=1024,
                ),
                requires_api_key=False,
                priority=2,
                tags=["cascade", "free", "no_key_required"],
            ),

            ProviderType.STATIC_OFFLINE: ProviderDescriptor(
                provider_type=ProviderType.STATIC_OFFLINE,
                display_name="RAKSHA Offline Emergency Protocols",
                model_id="static",
                api_base_url="",
                capabilities=ProviderCapabilities(
                    text_generation=True,
                    multimodal_vision=False,
                    function_calling=False,
                    streaming=False,
                    multilingual=False,
                    max_context_tokens=0,
                    max_output_tokens=0,
                ),
                requires_api_key=False,
                priority=99,
                tags=["offline", "static", "never_fails"],
            ),
        }

    def validate(self) -> List[str]:
        """Validate configuration and return list of human-readable warnings."""
        warnings = []
        if not self.google_api_key:
            warnings.append("GOOGLE_API_KEY not set — Gemma 4 cloud unavailable")
        if self.gemma_cloud_model not in VALID_GEMMA_CLOUD_MODELS:
            warnings.append(
                f"GEMMA_CLOUD_MODEL='{self.gemma_cloud_model}' may not be valid. "
                f"Known valid models: {VALID_GEMMA_CLOUD_MODELS}"
            )
        if not self.huggingface_token:
            warnings.append(
                "HUGGINGFACE_TOKEN not set — BLIP vision rate-limited (50 req/day)"
            )
        if not self.groq_api_key:
            warnings.append("GROQ_API_KEY not set — Groq vision fallback disabled")
        if not self.mistral_api_key:
            warnings.append("MISTRAL_API_KEY not set — Mistral Pixtral vision disabled")
        return warnings


# ── Valid Gemma Cloud Model IDs ────────────────────────────────────────────────

# ── Verified Available Gemma 4 Models (confirmed live via API 2026-05-06) ──────
VALID_GEMMA_CLOUD_MODELS = {
    # ── Gemma 4 (HACKATHON REQUIRED — use these) ──────────────────────────
    "gemma-4-31b-it",       # Gemma 4 31B instruction-tuned (PRIMARY)
    "gemma-4-26b-a4b-it",   # Gemma 4 26B MoE, 4B active params (FASTER)
}

# ── Local Model Priority Patterns ──────────────────────────────────────────────

LOCAL_MODEL_PRIORITY_PATTERNS = [
    "gemma4",      # Gemma 4 (highest priority — hackathon target)
    "gemma3",      # Gemma 3
    "gemma2",      # Gemma 2
    "gemma",       # Any Gemma variant
    "llama3",      # Llama 3 (good fallback)
    "llama",       # Any Llama
    "mistral",     # Mistral
    "phi",         # Microsoft Phi
    "qwen",        # Qwen
]


# ── Singleton ──────────────────────────────────────────────────────────────────
# load_dotenv() must have been called before this line executes.

config = RakshaConfig()
