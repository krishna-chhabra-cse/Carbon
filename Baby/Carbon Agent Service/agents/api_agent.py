# ============================================================
#  agents/api_agent.py
#
#  This agent's job:
#  - Look at the codebase and find all REST API endpoints, GraphQL 
#    mutations, or websocket routes.
#  - Extract the HTTP methods, paths, and descriptions.
#  - Return: a structured JSON list of endpoints.
# ============================================================

import os
import json
from google import genai
from dotenv import load_dotenv

load_dotenv()

def run(folder_structure: str, files_content: dict) -> dict:
    """
    The API Agent.

    Returns:
        {
            "endpoints": [
                {
                    "method": "GET",
                    "path": "/api/users",
                    "description": "Fetches a list of all users",
                    "file": "routes/users.js"
                }
            ],
            "api_type": "REST API with Express"
        }
    """

    print("[API AGENT] API Agent starting...")

    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY not found in .env file!")

    client = genai.Client(api_key=api_key)

    # Use the same powerful and fast model
    MODEL = "gemini-3.1-flash-lite"

    files_text = ""
    for filepath, content in list(files_content.items())[:40]:  # up to 40 files
        files_text += f"\n\n--- FILE: {filepath} ---\n"
        files_text += content[:3000]

    # PROMPT ENGINEERING for the API Agent
    prompt = f"""
You are an expert backend API researcher. Your job is to scan a codebase and document every single API endpoint exposed by the application.

Here is the folder structure:
{folder_structure}

Here are the key files:
{files_text}

Your task:
1. Scan the code specifically for route definitions, controllers, or handlers (e.g., Express app.get(), Django path(), FastAPI @app.get(), etc.)
2. Document every endpoint you find.
3. Identify the general style of the API (e.g., REST API, GraphQL, gRPC, etc.)

Return your response as a valid JSON object with EXACTLY this structure:
{{
    "api_type": "A short 3-5 word description of the API style (e.g., Node.js Express REST API)",
    "endpoints": [
        {{
            "method": "GET | POST | PUT | DELETE | PATCH",
            "path": "/example/route/:id",
            "description": "What this endpoint does",
            "file": "the file path where this route is defined"
        }}
    ]
}}

IMPORTANT:
- Return ONLY the JSON, no extra text before or after.
- If you cannot find any endpoints, return an empty list for endpoints.
"""

    print("[API AGENT] Sending to Gemini for API analysis...")
    from tools.llm_client import generate_with_retry
    raw_text = generate_with_retry(prompt)

    if raw_text.startswith("```"):
        lines = raw_text.split('\n')
        raw_text = '\n'.join(lines[1:-1])

    try:
        result = json.loads(raw_text)
        print("[API AGENT] Complete! Found endpoints.")
        return result

    except json.JSONDecodeError as e:
        print(f"[API AGENT WARNING] JSON parse failed: {e}")
        return {
            "api_type": "Unknown",
            "endpoints": []
        }
