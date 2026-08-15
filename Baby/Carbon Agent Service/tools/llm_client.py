# ============================================================
#  tools/llm_client.py — Resilient Multi-Model Gemini Invoker
# ============================================================

import os
import time
from google import genai
from dotenv import load_dotenv

load_dotenv()

# Active verified models in priority order
CANDIDATE_MODELS = [
    "gemini-3.1-flash-lite",
    "gemini-3.5-flash-lite",
    "gemini-3.5-flash",
    "gemini-3.6-flash",
    "gemini-3.7-flash",
    "gemini-flash-latest",
    "gemini-flash-lite-latest"
]

def get_gemini_client():
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY is missing from .env!")
    return genai.Client(api_key=api_key)

def generate_with_retry(prompt: str, system_instruction: str = None) -> str:
    """
    Calls Gemini with automatic multi-model failover and exponential backoff
    on 503 UNAVAILABLE or 429 RATE_LIMIT.
    """
    client = get_gemini_client()
    last_err = None

    for model_name in CANDIDATE_MODELS:
        for attempt in range(2):
            try:
                print(f"[LLM] Calling {model_name} (attempt {attempt + 1})...")
                response = client.models.generate_content(
                    model=model_name,
                    contents=prompt
                )
                if response and response.text:
                    return response.text.strip()
            except Exception as e:
                err_str = str(e)
                last_err = e
                print(f"[LLM WARNING] Model {model_name} failed: {err_str[:120]}.")
                
                # If rate limited (429), back off briefly before retrying or failing over
                if "429" in err_str or "RESOURCE_EXHAUSTED" in err_str:
                    time.sleep(1.5 * (attempt + 1))
                else:
                    time.sleep(0.5)

    raise RuntimeError(f"All Gemini models failed. Last error: {str(last_err)}")
