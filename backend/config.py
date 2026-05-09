"""
RAKSHA AI — Centralized Environment Validator
=============================================
Validates all required environment variables at application startup.
Called from main.py lifespan before any provider is initialized.

Usage:
    from config import validate_env, get_provider_status
    validate_env()  # raises EnvironmentError if critically misconfigured
"""

import os
import logging
from typing import Dict, List, Tuple

logger = logging.getLogger("raksha.config")


# ── Provider Definitions ──────────────────────────────────────────────────────

PROVIDER_KEYS: List[Tuple[str, str, bool, str]] = [
    # (env_var, display_name, required, get_key_url)
    (
        "GOOGLE_API_KEY",
        "Google Gemini / Gemma 4 Cloud",
        True,   # Required — primary AI provider
        "https://aistudio.google.com/app/apikey",
    ),
    (
        "HUGGINGFACE_TOKEN",
        "HuggingFace BLIP Vision",
        False,  # Optional — vision captioning fallback
        "https://huggingface.co/settings/tokens",
    ),
    (
        "GROQ_API_KEY",
        "Groq Llama 3.2 Vision",
        False,  # Optional — fast LPU vision fallback
        "https://console.groq.com",
    ),
    (
        "MISTRAL_API_KEY",
        "Mistral Pixtral Vision",
        False,  # Optional — premium vision fallback
        "https://console.mistral.ai",
    ),
]


# ── Validator ─────────────────────────────────────────────────────────────────

def validate_env() -> Dict[str, bool]:
    """
    Validate all provider environment variables.

    Returns:
        Dict mapping provider name to availability (True = key present).

    Raises:
        EnvironmentError: If any REQUIRED key is missing.
    """
    results: Dict[str, bool] = {}
    missing_required: List[str] = []
    warnings: List[str] = []

    for env_var, display_name, required, key_url in PROVIDER_KEYS:
        value = os.getenv(env_var, "").strip()
        is_present = bool(value)
        results[env_var] = is_present

        if is_present:
            # Mask key for safe logging: show first 8 + last 4 chars
            masked = f"{value[:8]}...{value[-4:]}" if len(value) > 12 else "***"
            logger.info(f"✅ {display_name}: configured ({masked})")
        else:
            if required:
                missing_required.append(
                    f"  ❌ MISSING REQUIRED: {env_var}\n"
                    f"     Provider: {display_name}\n"
                    f"     Get key:  {key_url}"
                )
            else:
                warnings.append(
                    f"  ○  OPTIONAL not set: {env_var} ({display_name})"
                )

    # Log optional warnings
    for w in warnings:
        logger.warning(w)

    # Raise on missing required keys
    if missing_required:
        error_lines = [
            "\n" + "=" * 60,
            "  RAKSHA AI — STARTUP FAILED: Missing Required Keys",
            "=" * 60,
            *missing_required,
            "",
            "  Add these to backend/.env and restart the server.",
            "  See backend/.env.example for template.",
            "=" * 60,
        ]
        raise EnvironmentError("\n".join(error_lines))

    return results


def get_provider_status() -> Dict[str, Dict]:
    """
    Return structured provider status for health check endpoints.

    Returns a dict with each provider's name, env_var, and configured state.
    """
    status = {}
    for env_var, display_name, required, _ in PROVIDER_KEYS:
        value = os.getenv(env_var, "").strip()
        status[env_var] = {
            "provider": display_name,
            "configured": bool(value),
            "required": required,
        }
    return status


def get_runtime_summary() -> str:
    """
    Human-readable summary of provider configuration for startup logs.
    """
    lines = ["\n=== RAKSHA AI Provider Configuration ==="]
    for env_var, display_name, required, _ in PROVIDER_KEYS:
        value = os.getenv(env_var, "").strip()
        status = "✅ SET" if value else ("❌ MISSING (required)" if required else "○  not set (optional)")
        lines.append(f"  {status:<28} {env_var} → {display_name}")
    lines.append("=" * 42)
    return "\n".join(lines)
