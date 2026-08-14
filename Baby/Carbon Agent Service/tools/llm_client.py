# ============================================================
#  tools/llm_client.py — Resilient Multi-Model Gemini Invoker
# ============================================================

import os
import time
from google import genai
from dotenv import load_dotenv

load_dotenv()

# Active models in priority order
CANDIDATE_MODELS = [
    "gemini-3.1-flash-lite",
    "gemini-3.5-flash-lite",
    "gemini-3.5-flash",
    "gemini-flash-latest",
    "gemini-3.7-flash"
]

def get_gemini_client():
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY is missing from .env!")
    return genai.Client(api_key=api_key)

def generate_with_retry(prompt: str, system_instruction: str = None) -> str:
    """
    Calls Gemini with automatic multi-model failover on 503 UNAVAILABLE or 429 RATE_LIMIT.
    """
    client = get_gemini_client()
    last_err = None

    for model_name in CANDIDATE_MODELS:
        try:
            print(f"[LLM] Calling {model_name}...")
            response = client.models.generate_content(
                model=model_name,
                contents=prompt
            )
            if response and response.text:
                return response.text.strip()
        except Exception as e:
            err_str = str(e)
            print(f"[LLM WARNING] Model {model_name} failed: {err_str[:120]}. Failing over...")
            last_err = e
            time.sleep(0.5)
            continue

    raise RuntimeError(f"All Gemini models failed. Last error: {str(last_err)}")
