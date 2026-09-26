# ============================================================
#  tools/llm_client.py — Multi-Engine LLM Router (Ollama, Gemini, Groq, Cerebras)
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
    "gemini-2.5-flash",
    "gemini-2.0-flash",
    "gemini-1.5-flash"
]

CANDIDATE_GROQ_MODELS = [
    "llama-3.3-70b-versatile",
    "mixtral-8x7b-32768"
]

CANDIDATE_CEREBRAS_MODELS = [
    "llama3.1-70b",
    "llama3.1-8b"
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
    """Generates completion using local air-gapped Ollama instance."""
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

    print(f"[LOCAL LLM] 🦙 Running air-gapped Ollama inference ({chosen_model}) at {endpoint}...")

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

def generate_with_openai_compatible(prompt: str, api_key: str, endpoint: str, models: list, provider_name: str) -> str:
    """Generic client for OpenAI-compatible APIs (Groq, Cerebras, Together)."""
    last_err = None
    for model_name in models:
        for attempt in range(2):
            try:
                print(f"[CLOUD LLM] Calling {provider_name} ({model_name}) attempt {attempt + 1}...")
                payload = json.dumps({
                    "model": model_name,
                    "messages": [{"role": "user", "content": prompt}],
                    "temperature": 0.2
                }).encode("utf-8")

                req = urllib.request.Request(
                    endpoint,
                    data=payload,
                    headers={
                        "Content-Type": "application/json",
                        "Authorization": f"Bearer {api_key}"
                    }
                )

                with urllib.request.urlopen(req, timeout=60) as response:
                    res_data = json.loads(response.read().decode("utf-8"))
                    if "choices" in res_data and len(res_data["choices"]) > 0:
                        return res_data["choices"][0]["message"]["content"].strip()
            except Exception as e:
                err_str = str(e)
                last_err = e
                print(f"[{provider_name} WARNING] {model_name} failed: {err_str[:100]}.")
                time.sleep(0.5)

    raise RuntimeError(f"All {provider_name} models failed. Last error: {str(last_err)}")

def generate_with_groq(prompt: str) -> str:
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise ValueError("GROQ_API_KEY missing")
    return generate_with_openai_compatible(prompt, api_key, "https://api.groq.com/openai/v1/chat/completions", CANDIDATE_GROQ_MODELS, "Groq")

def generate_with_cerebras(prompt: str) -> str:
    api_key = os.getenv("CEREBRAS_API_KEY")
    if not api_key:
        raise ValueError("CEREBRAS_API_KEY missing")
    return generate_with_openai_compatible(prompt, api_key, "https://api.cerebras.ai/v1/chat/completions", CANDIDATE_CEREBRAS_MODELS, "Cerebras")

def generate_with_retry(prompt: str, system_instruction: str = None) -> str:
    """
    Main entry point for multi-LLM fallback.
    Order of preference (if keys exist and auto mode is on):
    1. Local Ollama (if running)
    2. Gemini
    3. Groq
    4. Cerebras
    """
    provider = os.getenv("LLM_PROVIDER", "auto").lower().strip()

    if provider == "ollama":
        return generate_with_ollama(prompt)
    elif provider == "gemini":
        return generate_with_gemini(prompt)
    elif provider == "groq":
        return generate_with_groq(prompt)
    elif provider == "cerebras":
        return generate_with_cerebras(prompt)

    # AUTO MODE (Failover cascade)
    if is_ollama_available():
        try:
            return generate_with_ollama(prompt)
        except Exception as e:
            print(f"[LOCAL LLM WARNING] Ollama failed: {e}. Falling back to cloud...")

    # Cloud Cascade
    errors = []
    
    if os.getenv("GEMINI_API_KEY"):
        try:
            return generate_with_gemini(prompt)
        except Exception as e:
            errors.append(f"Gemini: {e}")

    if os.getenv("GROQ_API_KEY"):
        try:
            return generate_with_groq(prompt)
        except Exception as e:
            errors.append(f"Groq: {e}")

    if os.getenv("CEREBRAS_API_KEY"):
        try:
            return generate_with_cerebras(prompt)
        except Exception as e:
            errors.append(f"Cerebras: {e}")

    # If we get here, everything failed or no keys were configured
    if not errors:
        raise ValueError("No LLM providers configured! Please set GEMINI_API_KEY, GROQ_API_KEY, or CEREBRAS_API_KEY in .env, or start Ollama locally.")
    
    raise RuntimeError(f"All configured LLM providers failed. Errors: {errors}")
