# ============================================================
#  agents/business_logic_agent.py
#
#  THE BUSINESS LOGIC AGENT 🧠
#
#  This agent's job:
#  - Read through the actual code logic (not just structure)
#  - Understand what the application DOES — the business rules
#  - Break down each major feature into plain English steps
#  - Return: a structured list of business flows
#
#  Example output for an e-commerce app:
#    "User Registration" → 1. User submits form → 2. Password is hashed
#    → 3. User saved to DB → 4. JWT token generated → 5. Token returned
#
#  This is the most "intelligent" agent — it needs to truly
#  understand the PURPOSE behind the code, not just the syntax.
# ============================================================

import os
import json
from google import genai
from dotenv import load_dotenv

load_dotenv()


def run(folder_structure: str, files_content: dict, architecture_info: dict = None, api_info: dict = None) -> dict:
    """
    The Business Logic Agent.

    Args:
        folder_structure: A text tree of all folders/files
        files_content:    A dict of { "filepath": "file content" }
        architecture_info: Results from the Architecture Agent
        api_info:          Results from the API Agent

    Returns:
        { "app_purpose": "...", "business_flows": [...] }
    """

    print("[BIZ AGENT] Business Logic Agent starting...")

    # Step 1: Set up Gemini client
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY not found in .env file!")

    client = genai.Client(api_key=api_key)

    # Same reliable model we use across all agents
    MODEL = "gemini-3.1-flash-lite"

    # Step 2: Format files for the prompt
    files_text = ""
    for filepath, content in list(files_content.items())[:30]:
        files_text += f"\n\n--- FILE: {filepath} ---\n"
        files_text += content[:4000]
        
    peer_context = ""
    if architecture_info or api_info:
        peer_context = "\nHere is what your fellow AI agents have discovered about this codebase:\n"
        if architecture_info:
            peer_context += f"- Architecture Summary: {architecture_info.get('summary', 'N/A')}\n"
        if api_info:
            peer_context += f"- Discovered API Endpoints: {json.dumps(api_info, indent=2)}\n"

    # Step 3: The Business Logic Prompt
    prompt = f"""
You are a senior software engineer explaining a codebase to a new developer joining the team.
Your job is to understand the BUSINESS LOGIC — what the application actually does, not just its structure.

Here is the folder structure:
{folder_structure}
{peer_context}
Here are the key source files:
{files_text}

Your task:
1. Understand the overall purpose of this application
2. Identify every major business feature or user flow
3. For each feature, break it down into clear sequential steps explaining what the code does

Return your response as a valid JSON object with EXACTLY this structure:
{{
    "app_purpose": "A clear 2-3 sentence description of what this application does and who it is for",
    "business_flows": [
        {{
            "feature": "Short name of the feature like User Authentication or Order Placement",
            "steps": [
                "Step 1: What happens first in plain English",
                "Step 2: What happens next",
                "Step 3: Continue until the flow is complete"
            ]
        }}
    ]
}}

IMPORTANT:
- Return ONLY the JSON, no extra text before or after
- Include at least 3-5 business flows if the codebase has them
- Each flow should have 3-7 clear steps
- Write steps in plain English that a beginner can understand
- Focus on WHAT the code does, not HOW it is written
"""

    # Step 4: Send to Gemini with resilient failover
    print("[BIZ AGENT] Sending to Gemini for business logic analysis...")
    from tools.llm_client import generate_with_retry
    raw_text = generate_with_retry(prompt)

    # Step 5: Parse the JSON response
    if raw_text.startswith("```"):
        lines = raw_text.split('\n')
        raw_text = '\n'.join(lines[1:-1])

    try:
        result = json.loads(raw_text)
        print(f"[BIZ AGENT] Complete! Found {len(result.get('business_flows', []))} business flows.")
        return result

    except json.JSONDecodeError as e:
        print(f"[BIZ AGENT WARNING] JSON parse failed: {e}")
        return {
            "app_purpose": "Could not analyze business logic.",
            "business_flows": []
        }
