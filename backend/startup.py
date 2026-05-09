"""
RAKSHA AI -- Startup Diagnostics
==================================
Run before launching the server to validate environment and connectivity.
Tests all 4 AI providers: Google Gemini, HuggingFace, Groq, Mistral.

Usage:
    cd backend && python startup.py
Then start:
    uvicorn main:app --host 0.0.0.0 --port 8000 --reload
"""

import os
import sys
import asyncio

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from dotenv import load_dotenv
load_dotenv()

from providers import config, VALID_GEMMA_CLOUD_MODELS

SEP = "-" * 64
OK  = "[OK]"
WARN = "[WARN]"
ERR = "[ERR]"
OPT = "[OPT]"


async def run_checks():
    import httpx

    print("\n" + "=" * 64)
    print("  RAKSHA AI -- Environment & Provider Diagnostics")
    print("=" * 64)

    # 1. Python version
    v = sys.version_info
    py_ok = v.major == 3 and v.minor >= 11
    print(f"\n{SEP}\n  SYSTEM\n{SEP}")
    print(f"{OK if py_ok else WARN} Python {v.major}.{v.minor}.{v.micro}"
          + ("" if py_ok else " (recommend 3.11+)"))

    # 2. Required packages
    for pkg in ["fastapi", "uvicorn", "pydantic", "httpx", "aiosqlite", "dotenv"]:
        try:
            __import__(pkg.replace("-", "_"))
            print(f"{OK} Package: {pkg}")
        except ImportError:
            print(f"{ERR} MISSING: {pkg} -- run: pip install -r requirements.txt")

    # 3. Google Gemini / Gemma 4 Cloud
    print(f"\n{SEP}\n  GOOGLE AI (PRIMARY PROVIDER)\n{SEP}")
    if config.google_api_key:
        masked = f"{config.google_api_key[:8]}...{config.google_api_key[-4:]}"
        print(f"{OK} GOOGLE_API_KEY set ({masked})")
        if config.gemma_cloud_model not in VALID_GEMMA_CLOUD_MODELS:
            print(f"{WARN} GEMMA_CLOUD_MODEL='{config.gemma_cloud_model}' -- not a known model ID")
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                r = await client.get(
                    f"{config.gemma_api_base}/models?key={config.google_api_key}"
                )
                if r.status_code == 200:
                    model_count = len(r.json().get("models", []))
                    print(f"{OK} Google AI API reachable -- {model_count} models available")
                    print(f"{OK} Active model: {config.gemma_cloud_model}")
                else:
                    print(f"{ERR} Google AI API: HTTP {r.status_code} -- check key permissions")
        except Exception as e:
            print(f"{WARN} Google AI API unreachable: {e}")
    else:
        print(f"{ERR} GOOGLE_API_KEY not set -- Gemma 4 cloud UNAVAILABLE")
        print(f"     Get free key: https://aistudio.google.com/app/apikey")

    # 4. HuggingFace BLIP Vision
    print(f"\n{SEP}\n  HUGGINGFACE (VISION PIPELINE)\n{SEP}")
    if config.huggingface_token:
        masked = f"{config.huggingface_token[:8]}...{config.huggingface_token[-4:]}"
        print(f"{OK} HUGGINGFACE_TOKEN set ({masked})")
        try:
            # Use the HF Inference API status endpoint (GET is valid here)
            # Returns model load status without requiring a real inference payload
            model_id = "Salesforce/blip-image-captioning-large"
            status_url = f"https://api-inference.huggingface.co/status/{model_id}"
            async with httpx.AsyncClient(timeout=10) as client:
                r = await client.get(
                    status_url,
                    headers={"Authorization": f"Bearer {config.huggingface_token}"},
                )
                if r.status_code == 200:
                    state = r.json().get("state", "unknown")
                    print(f"{OK} HuggingFace token valid -- BLIP model state: {state}")
                    print(f"{OK} Inference endpoint: {config.blip_api_url}")
                elif r.status_code == 401:
                    print(f"{WARN} HuggingFace token rejected (401)")
                    print(f"     Ensure token has 'Inference API' read access")
                else:
                    # Token valid but status endpoint unusual — BLIP still usable
                    print(f"{OK} HUGGINGFACE_TOKEN set -- BLIP inference will be attempted at runtime")
                    print(f"     Status check: HTTP {r.status_code} (non-critical)")
        except Exception as e:
            print(f"{WARN} HuggingFace status check failed: {e}")
            print(f"     Token is set -- BLIP will be attempted at runtime")
    else:
        print(f"{OPT} HUGGINGFACE_TOKEN not set -- BLIP rate-limited (50 req/day free)")
        print(f"     Get token: https://huggingface.co/settings/tokens")

    # 5. Groq Vision
    print(f"\n{SEP}\n  GROQ (VISION FALLBACK)\n{SEP}")
    if config.groq_api_key:
        masked = f"{config.groq_api_key[:8]}...{config.groq_api_key[-4:]}"
        print(f"{OK} GROQ_API_KEY set ({masked})")
        try:
            async with httpx.AsyncClient(timeout=8) as client:
                r = await client.get(
                    "https://api.groq.com/openai/v1/models",
                    headers={"Authorization": f"Bearer {config.groq_api_key}"},
                )
                if r.status_code == 200:
                    models = [m["id"] for m in r.json().get("data", [])]
                    print(f"{OK} Groq API valid -- {len(models)} models available")
                    if config.groq_vision_model in models:
                        print(f"{OK} Vision model ready: {config.groq_vision_model}")
                    else:
                        print(f"{WARN} Model '{config.groq_vision_model}' not in account")
                else:
                    print(f"{WARN} Groq API: HTTP {r.status_code}")
        except Exception as e:
            print(f"{WARN} Groq API unreachable: {e}")
    else:
        print(f"{OPT} GROQ_API_KEY not set -- Groq vision fallback disabled")
        print(f"     Get key: https://console.groq.com")

    # 6. Mistral Pixtral Vision
    print(f"\n{SEP}\n  MISTRAL AI (VISION FALLBACK)\n{SEP}")
    if config.mistral_api_key:
        masked = f"{config.mistral_api_key[:8]}...{config.mistral_api_key[-4:]}"
        print(f"{OK} MISTRAL_API_KEY set ({masked})")
        try:
            async with httpx.AsyncClient(timeout=8) as client:
                r = await client.get(
                    "https://api.mistral.ai/v1/models",
                    headers={"Authorization": f"Bearer {config.mistral_api_key}"},
                )
                if r.status_code == 200:
                    models = [m["id"] for m in r.json().get("data", [])]
                    print(f"{OK} Mistral API valid -- {len(models)} models available")
                    if config.mistral_vision_model in models:
                        print(f"{OK} Vision model ready: {config.mistral_vision_model}")
                    else:
                        print(f"{WARN} Model '{config.mistral_vision_model}' not found "
                              f"(check account tier)")
                else:
                    print(f"{WARN} Mistral API: HTTP {r.status_code}")
        except Exception as e:
            print(f"{WARN} Mistral API unreachable: {e}")
    else:
        print(f"{OPT} MISTRAL_API_KEY not set -- Mistral vision disabled")
        print(f"     Get key: https://console.mistral.ai")

    # 7. Ollama Local Model
    print(f"\n{SEP}\n  OLLAMA (LOCAL/OFFLINE)\n{SEP}")
    try:
        async with httpx.AsyncClient(timeout=3) as client:
            r = await client.get(f"{config.ollama_base_url}/api/tags")
            if r.status_code == 200:
                names = [m.get("name", "") for m in r.json().get("models", [])]
                gemma_models = [n for n in names if "gemma" in n.lower()]
                if gemma_models:
                    print(f"{OK} Ollama running -- Gemma model: {gemma_models[0]}")
                elif names:
                    print(f"{OK} Ollama running -- fallback model: {names[0]}")
                    print(f"     (No Gemma -- install: ollama pull gemma2:9b)")
                else:
                    print(f"{WARN} Ollama running but no AI models installed")
            else:
                print(f"{WARN} Ollama responded HTTP {r.status_code}")
    except Exception:
        print(f"{OPT} Ollama not running at {config.ollama_base_url}")
        print(f"     Install: https://ollama.com | Then: ollama pull gemma2:9b")

    # 8. Database
    print(f"\n{SEP}\n  DATABASE\n{SEP}")
    db_path = config.database_url
    db_dir = (
        os.path.dirname(os.path.abspath(db_path))
        if ("/" in db_path or "\\" in db_path)
        else os.getcwd()
    )
    if os.access(db_dir, os.W_OK):
        print(f"{OK} Database writable: {db_path}")
    else:
        print(f"{ERR} Database directory not writable: {db_dir}")

    # 9. Frontend
    print(f"\n{SEP}\n  FRONTEND\n{SEP}")
    frontend = os.path.join(os.path.dirname(__file__), "..", "frontend", "index.html")
    frontend_exists = os.path.exists(frontend)
    print(f"{OK if frontend_exists else ERR} Frontend: {os.path.abspath(frontend)}")

    # Summary
    configured = sum([
        bool(config.google_api_key),
        bool(config.huggingface_token),
        bool(config.groq_api_key),
        bool(config.mistral_api_key),
    ])
    print(f"\n{'=' * 64}")
    print(f"  SUMMARY: {configured}/4 API providers configured")
    if config.google_api_key:
        print(f"  Primary AI: Gemma 4 Cloud ({config.gemma_cloud_model})")
    else:
        print(f"  Primary AI: Cascade fallback only (no Google key)")
    print(f"\n  To start RAKSHA AI:")
    print(f"  uvicorn main:app --host 0.0.0.0 --port 8000 --reload")
    print(f"  Open: http://localhost:{config.port}")
    print("=" * 64 + "\n")


if __name__ == "__main__":
    asyncio.run(run_checks())
