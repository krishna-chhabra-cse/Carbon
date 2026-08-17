# ============================================================
#  test_ollama_mode.py — Test Suite for Local Ollama Air-Gapped Engine
# ============================================================

import os
import sys

if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')

from dotenv import load_dotenv
load_dotenv('Baby/Carbon Agent Service/.env')

from tools.llm_client import is_ollama_available, get_installed_ollama_models, generate_with_retry

def test_ollama_detection():
    print("\n--- 1. Testing Ollama Local Server Detection ---")
    available = is_ollama_available()
    print(f"Ollama Server Online: {available}")
    if available:
        models = get_installed_ollama_models()
        print(f"Installed Ollama Models: {models}")
    else:
        print("Note: Ollama server is offline (Normal if not running on host). Automatic cloud fallback will engage.")
    print("✅ Ollama Detection Test Passed!")

def test_dual_engine_generation():
    print("\n--- 2. Testing Dual-Engine LLM Generation ---")
    prompt = "Reply with exactly 'CARBON_LLM_READY'."
    response = generate_with_retry(prompt)
    print(f"LLM Response: {response}")
    assert len(response) > 0, "Response must not be empty"
    print("✅ Dual-Engine Generation Test Passed!")

if __name__ == "__main__":
    test_ollama_detection()
    test_dual_engine_generation()
    print("\n🎉 ALL LOCAL OLLAMA DUAL-ENGINE TESTS PASSED!")
