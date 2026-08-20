# ============================================================
#  tools/llm_client.py — Dual-Engine LLM Invoker (Ollama Local & Cloud Gemini)
# ============================================================

import os
import time
import json
import urllib.request
import urllib.error
from google import genai
from dotenv import load_dotenv

load_dotenv()

# Active verified Google Gemini cloud models
CANDIDATE_GEMINI_MODELS = [
    "gemini-3.1-flash-lite",
    "gemini-3.5-flash-lite",
    "gemini-3.5-flash",
    "gemini-3.6-flash",
    "gemini-3.7-flash",
    "gemini-flash-latest",
    "gemini-flash-lite-latest"
]

# Supported local Ollama models (in preferred coding priority)
CANDIDATE_OLLAMA_MODELS = [
    "qwen2.5-coder",
    "deepseek-r1",
    "deepseek-coder",
    "llama3.1",
    "codellama",
    "mistral",
    "phi3",
    "llama3"
]

DEFAULT_OLLAMA_ENDPOINT = os.getenv("OLLAMA_ENDPOINT", "http://localhost:11434").rstrip("/")

def is_ollama_available(endpoint: str = DEFAULT_OLLAMA_ENDPOINT) -> bool:
    """Checks if a local Ollama server is running with a 1.2s timeout."""
    try:
        req = urllib.request.Request(f"{endpoint}/api/tags", headers={"User-Agent": "Carbon-AI/1.0"})
        with urllib.request.urlopen(req, timeout=1.2) as response:
            return response.status == 200
    except Exception:
        return False

def get_installed_ollama_models(endpoint: str = DEFAULT_OLLAMA_ENDPOINT) -> list:
    """Fetches list of currently installed local models from Ollama."""
    try:
        req = urllib.request.Request(f"{endpoint}/api/tags", headers={"User-Agent": "Carbon-AI/1.0"})
        with urllib.request.urlopen(req, timeout=2.0) as response:
            data = json.loads(response.read().decode("utf-8"))
            return [m["name"] for m in data.get("models", [])]
    except Exception:
        return []

def generate_with_ollama(prompt: str, model_name: str = None, endpoint: str = DEFAULT_OLLAMA_ENDPOINT) -> str:
    """
    Generates completion using local air-gapped Ollama instance.
    Zero data leaves the developer's machine.
    """
    installed = get_installed_ollama_models(endpoint)
    chosen_model = model_name or os.getenv("OLLAMA_MODEL")

    if not chosen_model:
        # Match highest priority installed coding model
        for candidate in CANDIDATE_OLLAMA_MODELS:
            match = next((m for m in installed if candidate in m), None)
            if match:
                chosen_model = match
                break
        if not chosen_model:
            chosen_model = installed[0] if installed else "qwen2.5-coder"

    print(f"[LOCAL LLM] 🔒 Running air-gapped Ollama inference ({chosen_model}) at {endpoint}...")

    payload = json.dumps({
        "model": chosen_model,
        "prompt": prompt,
        "stream": False,
        "options": {
            "temperature": 0.2,
            "num_ctx": 16384
        }
    }).encode("utf-8")

    req = urllib.request.Request(
        f"{endpoint}/api/generate",
        data=payload,
        headers={"Content-Type": "application/json"}
    )

    with urllib.request.urlopen(req, timeout=120) as response:
        res_data = json.loads(response.read().decode("utf-8"))
        return res_data.get("response", "").strip()

def get_gemini_client():
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY is missing from .env!")
    return genai.Client(api_key=api_key)

def generate_with_gemini(prompt: str) -> str:
    """Calls Gemini cloud API with automatic multi-model failover."""
    client = get_gemini_client()
    last_err = None

    for model_name in CANDIDATE_GEMINI_MODELS:
        for attempt in range(2):
            try:
                print(f"[CLOUD LLM] Calling {model_name} (attempt {attempt + 1})...")
                response = client.models.generate_content(
                    model=model_name,
                    contents=prompt
                )
                if response and response.text:
                    return response.text.strip()
            except Exception as e:
                err_str = str(e)
                last_err = e
                print(f"[CLOUD LLM WARNING] Model {model_name} failed: {err_str[:100]}.")
                
                if "429" in err_str or "RESOURCE_EXHAUSTED" in err_str:
                    time.sleep(1.5 * (attempt + 1))
                else:
                    time.sleep(0.5)

    raise RuntimeError(f"All Gemini models failed. Last error: {str(last_err)}")

def generate_with_retry(prompt: str, system_instruction: str = None) -> str:
    """
    Main entry point:
    Checks configured provider (OLLAMA vs GEMINI vs AUTO).
    Provides seamless offline air-gapped inference with cloud failover.
    """
    provider = os.getenv("LLM_PROVIDER", "auto").lower().strip()

    # 1. Explicit Ollama Request
    if provider == "ollama":
        if is_ollama_available():
            return generate_with_ollama(prompt)
        else:
            raise ConnectionError(f"Ollama server is not running at {DEFAULT_OLLAMA_ENDPOINT}. Please start Ollama or set LLM_PROVIDER=gemini.")

    # 2. Auto Mode: If Ollama is running locally, use it for zero-cost private inference!
    if provider == "auto" and is_ollama_available():
        try:
            return generate_with_ollama(prompt)
        except Exception as e:
            print(f"[LOCAL LLM WARNING] Ollama inference failed ({e}). Falling back to Gemini cloud...")

    # 3. Gemini Cloud Fallback
    return generate_with_gemini(prompt)
