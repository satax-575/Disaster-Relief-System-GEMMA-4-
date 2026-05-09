"""
RAKSHA AI — Triage Agent
Routes through GemmaClient for best AI quality.
Fallback uses keyword heuristics when all AI providers are offline.

The main triage logic has been consolidated into GemmaClient.generate_triage_guidance().
This module provides the standalone evaluate_patient() for direct calls and
backward-compatible exports.
"""

import logging
from typing import Dict, Any, List, Optional

logger = logging.getLogger("raksha.triage")


class TriageAgent:
    """
    Medical triage agent using START protocol.
    Routes through GemmaClient for Gemma 4 quality when online.
    Falls back to keyword heuristics offline.
    """

    async def evaluate_patient(
        self,
        symptoms: List[str],
        age_estimate: Optional[str] = "Unknown",
        vitals: Optional[Dict[str, Any]] = None,
        language: str = "en",
        fhir_history: Optional[dict] = None,
    ) -> Dict[str, Any]:
        """
        Evaluate a patient using AI-powered START triage.
        Delegates to GemmaClient which handles cloud/local/cascade routing.
        """
        from gemma_client import gemma_client
        try:
            result = await gemma_client.generate_triage_guidance(
                symptoms=symptoms,
                age_estimate=age_estimate,
                vitals=vitals,
                language=language,
                fhir_history=fhir_history,
            )
            # Ensure triage_color is always lowercase (START protocol)
            result["triage_color"] = result.get("triage_color", "yellow").lower().strip()
            # Validate triage_color is a legal value
            if result["triage_color"] not in ("red", "yellow", "green", "black"):
                result["triage_color"] = "yellow"
            return result
        except Exception as e:
            logger.error(f"Triage AI failed, using heuristic fallback: {e}")
            return self._heuristic_fallback(symptoms)

    def _heuristic_fallback(self, symptoms: List[str]) -> Dict[str, Any]:
        """Keyword-based fallback triage when all AI providers are offline."""
        symptom_text = " ".join(symptoms).lower()
        critical_keywords = {"bleeding", "unconscious", "breathing", "chest", "crush", "cardiac", "seizure"}
        delayed_keywords = {"broken", "fracture", "pain", "burn", "laceration", "head"}

        is_critical = any(k in symptom_text for k in critical_keywords)
        is_delayed = any(k in symptom_text for k in delayed_keywords)

        if is_critical:
            color, priority = "red", 1
            remedy = ["Control bleeding with direct pressure", "Open and maintain airway", "Prepare for immediate transport"]
            precautions = ["Do not move if spinal injury suspected", "Prevent shock — elevate legs if safe"]
            summary = "Critical presentation — immediate intervention required per START protocol."
        elif is_delayed:
            color, priority = "yellow", 2
            remedy = ["Stabilize injured limb", "Apply wound dressing", "Monitor vital signs"]
            precautions = ["Avoid unnecessary movement", "Keep patient warm and calm"]
            summary = "Delayed — serious but stable. Prioritize transport after immediate cases."
        else:
            color, priority = "green", 3
            remedy = ["Conduct secondary survey", "Treat minor wounds", "Monitor for deterioration"]
            precautions = ["Reassess periodically", "Keep patient hydrated"]
            summary = "Minimal — walking wounded. Lower priority but continue monitoring."

        return {
            "triage_color": color,
            "priority_level": priority,
            "immediate_remedy": remedy,
            "precautions": precautions,
            "medical_summary": summary,
            "reasoning": summary,
            "immediate_interventions": remedy,
            "model_used": "raksha-offline-heuristic-triage",
        }


triage_agent = TriageAgent()
