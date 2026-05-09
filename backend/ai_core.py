"""
RAKSHA AI — Advanced AI Cascade Engine
Async multi-provider fallback when primary Gemma 4 models are unavailable.
All HTTP is non-blocking. Imports config from providers.py.

Chain: Gemma 4 Cloud REST → Pollinations (free) → DuckDuckGo → Static Offline
"""

import logging
import urllib.parse
import httpx
from typing import List, Dict
from providers import config

logger = logging.getLogger("raksha.ai_core")


class AdvancedAIEngine:
    """
    Async fallback AI cascade for RAKSHA.
    Used when the primary GemmaClient cloud/local paths both fail.
    All calls are non-blocking (httpx.AsyncClient).
    """

    async def generate_response(self, message: str, history: List[Dict], language: str) -> str:
        context = "\n".join(
            f"{'User' if m.get('role') == 'user' else 'AI'}: {m.get('content', '')}"
            for m in history[-4:]
        )
        prompt = (
            f"You are RAKSHA AI, a Gemma 4-powered emergency response assistant.\n"
            f"If the user needs real-world action, output a JSON function_call block.\n"
            f"Respond ONLY in language: {language}.\n\n"
            f"{context}\nUser: {message}\nRAKSHA AI:"
        )

        # 1. Gemma 4 via Google AI REST (highest quality cascade)
        if config.google_api_key:
            try:
                body = {
                    "contents": [{"role": "user", "parts": [{"text": prompt}]}],
                    "generationConfig": {"temperature": 0.5, "maxOutputTokens": 1024},
                }
                async with httpx.AsyncClient(timeout=15) as client:
                    r = await client.post(
                        f"{config.gemma_api_base}/models/{config.gemma_cloud_model}"
                        f":generateContent?key={config.google_api_key}",
                        json=body,
                    )
                    if r.status_code == 200:
                        data = r.json()
                        parts = data.get("candidates", [{}])[0].get("content", {}).get("parts", [])
                        text = "".join(p.get("text", "") for p in parts if "text" in p)
                        if text:
                            return text
            except Exception as e:
                logger.warning(f"Cascade Gemma 4 cloud failed: {e}")

        # 2. Pollinations free LLM (no API key, uses Mistral model)
        try:
            encoded = urllib.parse.quote(prompt[: config.pollinations_max_chars])
            async with httpx.AsyncClient(timeout=config.pollinations_timeout_s) as client:
                r = await client.get(
                    f"{config.pollinations_base_url}{encoded}?model={config.pollinations_model}",
                    headers={"User-Agent": "RakshaAI/2.0"},
                )
                if r.status_code == 200 and len(r.text.strip()) > 10:
                    return r.text.strip()
        except Exception as e:
            logger.warning(f"Pollinations cascade failed: {e}")

        # 3. DuckDuckGo HTML search (factual last resort)
        try:
            query = urllib.parse.quote(message[:200])
            async with httpx.AsyncClient(timeout=10) as client:
                r = await client.get(
                    f"https://html.duckduckgo.com/html/?q={query}",
                    headers={"User-Agent": "Mozilla/5.0"},
                )
                if r.status_code == 200:
                    import re
                    snippets = re.findall(
                        r'<a class="result__snippet[^>]*>(.*?)</a>',
                        r.text, re.IGNORECASE | re.DOTALL,
                    )
                    if snippets:
                        clean = re.sub(r"<[^>]+>", "", snippets[0]).strip()
                        clean = (clean.replace("&#x27;", "'")
                                      .replace("&quot;", '"')
                                      .replace("&amp;", "&"))
                        if len(clean) > 20:
                            return f"{clean}\n\n*(Web search — Gemma 4 temporarily offline)*"
        except Exception as e:
            logger.warning(f"DDG cascade failed: {e}")

        # 4. Static offline emergency protocols (never fails)
        return (
            "⚠️ AI Emergency Mode Active\n\n"
            "All AI providers unreachable. Emergency protocols:\n"
            "• India Emergency: 112\n• NDRF: 1078\n• Medical: 108\n• Fire: 101\n\n"
            "Standard safety protocols:\n"
            "1. Ensure your own safety first\n"
            "2. Move to high ground if flooding\n"
            "3. Stay away from damaged structures\n"
            "4. Help injured only if safe to do so\n"
            "5. Signal for help with light or sound\n\n"
            "Gemma 4 AI will resume when connectivity is restored."
        )


advanced_ai = AdvancedAIEngine()
