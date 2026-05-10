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
            f"You are RAKSHA AI, a Gemma 4-powered emergency response intelligence system deployed in active disaster zones.\n"
            f"RESPONSE REQUIREMENTS (NON-NEGOTIABLE):\n"
            f"1. Always give specific, actionable, situation-aware answers — never generic or vague.\n"
            f"2. If the user provides an incident ID, location, or hazard type, tailor the response to that specific context.\n"
            f"3. Use structured formatting: bullet points, priority levels, recommended actions, and estimated timelines where relevant.\n"
            f"4. Dynamically generate based on conversation history and current input. NEVER repeat a canned response.\n"
            f"5. If the user needs real-world action (dispatch, alert, etc), output a JSON function_call block.\n"
            f"Respond ONLY in language: {language}.\n\n"
            f"--- CONVERSATION HISTORY ---\n"
            f"{context}\n\n"
            f"User: {message}\n"
            f"RAKSHA AI:"
        )

        # 1. Gemma 4 via Google AI REST (highest quality cascade without tools)
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

        # 2. Groq Fallback (as provided)
        if config.groq_api_key:
            try:
                headers = {
                    "Authorization": f"Bearer {config.groq_api_key}",
                    "Content-Type": "application/json"
                }
                body = {
                    "model": config.groq_vision_model,
                    "messages": [{"role": "user", "content": prompt}],
                    "temperature": 0.5,
                    "max_tokens": 1024
                }
                async with httpx.AsyncClient(timeout=15) as client:
                    r = await client.post(config.groq_endpoint, headers=headers, json=body)
                    if r.status_code == 200:
                        text = r.json().get("choices", [{}])[0].get("message", {}).get("content", "")
                        if text:
                            return text + "\n\n*(Fallback: Groq)*"
            except Exception as e:
                logger.warning(f"Groq cascade failed: {e}")

        # 3. Mistral Fallback (as provided)
        if config.mistral_api_key:
            try:
                headers = {
                    "Authorization": f"Bearer {config.mistral_api_key}",
                    "Content-Type": "application/json"
                }
                body = {
                    "model": config.mistral_vision_model,
                    "messages": [{"role": "user", "content": prompt}],
                    "temperature": 0.5,
                    "max_tokens": 1024
                }
                async with httpx.AsyncClient(timeout=15) as client:
                    r = await client.post(config.mistral_endpoint, headers=headers, json=body)
                    if r.status_code == 200:
                        text = r.json().get("choices", [{}])[0].get("message", {}).get("content", "")
                        if text:
                            return text + "\n\n*(Fallback: Mistral)*"
            except Exception as e:
                logger.warning(f"Mistral cascade failed: {e}")

        # 4. Static offline emergency protocols (never fails)
        return (
            "⚠️ RAKSHA AI Emergency Mode Active\n\n"
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
