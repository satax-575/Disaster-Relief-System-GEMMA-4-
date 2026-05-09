"""
RAKSHA AI — Vision Agent
Multimodal disaster image analysis pipeline.

Priority routing:
  1. Gemma 4 Cloud Vision (via GemmaClient — native multimodal, best accuracy)
  2. HuggingFace BLIP captioning + Gemma 4 LLM structuring
  3. Static fallback (never fails)

The vision agent is called by gemma_client.assess_damage() for the BLIP fallback path.
Cloud vision is handled directly in GemmaClient._cloud_chat() with image_base64.
"""

import json, base64, logging, re
import httpx
from typing import Dict, Any, Optional
from providers import config

logger = logging.getLogger("raksha.vision")


class VisionAgent:
    """
    Disaster image analysis using BLIP + Gemma 4 LLM pipeline.
    This is the fallback path when Gemma 4 cloud vision is unavailable.
    """

    async def analyze_incident_image(self, image_base64: str, language: str = "en") -> Dict[str, Any]:
        """Full pipeline: BLIP caption → Gemma 4 LLM structuring → JSON report."""
        try:
            caption = await self._get_blip_caption(image_base64)
            logger.info(f"BLIP caption: {caption}")

            prompt = (
                f"You are a Disaster Response Intelligence AI (Gemma 4). "
                f"A computer vision model analyzed a disaster scene image and produced: '{caption}'.\n\n"
                f"Based on this and disaster assessment patterns, generate a structured intelligence report.\n"
                f"Return ONLY valid JSON:\n"
                f'{{"damage_severity": <1-10 float>, "hazards": ["..."], '
                f'"structural_integrity": "<stable|compromised|collapsed>", '
                f'"estimated_trapped": <int or null>, '
                f'"recommended_actions": ["..."], '
                f'"intelligence_summary": "<2 sentence assessment>", '
                f'"resource_requirements": {{"teams_required": <int>, "medical_personnel": <int>, "equipment": []}}}}\n'
                f"Respond in language: {language}."
            )

            # Route through the AI cascade for LLM structuring
            from ai_core import advanced_ai
            llm_response = await advanced_ai.generate_response(prompt, [], "en")
            parsed = self._parse_json(llm_response)
            if parsed:
                parsed["model_used"] = "raksha-vision-blip-gemma4"
                parsed["caption"] = caption
                return parsed

        except Exception as e:
            logger.error(f"Vision pipeline failed: {e}")

        return self._static_fallback()

    # Alias for backward compatibility
    analyze = analyze_incident_image

    async def _get_blip_caption(self, image_base64: str) -> str:
        """Zero-cost image captioning via HuggingFace BLIP inference API."""
        headers = {}
        if config.huggingface_token:
            headers["Authorization"] = f"Bearer {config.huggingface_token}"

        raw_b64 = image_base64.split(",")[-1] if "," in image_base64 else image_base64
        try:
            image_data = base64.b64decode(raw_b64)
        except Exception:
            return "Disaster scene (image decode failed)"

        try:
            async with httpx.AsyncClient(timeout=30) as client:
                r = await client.post(config.blip_api_url, headers=headers, content=image_data)
                if r.status_code == 200:
                    result = r.json()
                    if isinstance(result, list) and result:
                        return result[0].get("generated_text", "Disaster area with visible damage.")
            return "Disaster scene with potential structural damage."
        except Exception as e:
            logger.warning(f"BLIP API failed: {e}")
            return "Image analysis unavailable (offline mode)."

    def _parse_json(self, text: str) -> Optional[Dict]:
        if not text:
            return None
        # Strip markdown code fences
        if "```json" in text:
            text = text.split("```json")[1].split("```")[0].strip()
        elif "```" in text:
            m = re.search(r"```([\s\S]*?)```", text)
            if m:
                text = m.group(1).strip()
        # Clean trailing commas
        text = re.sub(r",\s*}", "}", text)
        text = re.sub(r",\s*\]", "]", text)
        try:
            return json.loads(text)
        except Exception:
            # Try extracting first JSON object from text
            m = re.search(r"\{[\s\S]+\}", text)
            if m:
                try:
                    return json.loads(m.group(0))
                except Exception:
                    pass
        return None

    def _static_fallback(self) -> Dict[str, Any]:
        return {
            "damage_severity": 5.0,
            "hazards": ["Structural debris", "Potential collapse risk"],
            "structural_integrity": "compromised",
            "estimated_trapped": None,
            "recommended_actions": ["Deploy drone for reconnaissance", "Await human verification"],
            "intelligence_summary": "Vision AI temporarily offline. Conservative assessment applied.",
            "resource_requirements": {"teams_required": 2, "medical_personnel": 2, "equipment": []},
            "model_used": "raksha-vision-static-fallback",
        }


vision_agent = VisionAgent()
