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

    # Same reliable model we use across all agents
    MODEL = "gemini-3.1-flash-lite"

    # Step 2: Use GraphRAG for intelligent context assembly
    from tools.graph_rag import build_codebase_graph, retrieve_graphrag_context
    graph = build_codebase_graph(files_content)
    
    # We query the graph using architectural hints to pull the most central business logic
    query = "routes business logic services models controllers"
    if architecture_info and 'summary' in architecture_info:
        query += " " + architecture_info['summary']
        
    files_text = retrieve_graphrag_context(graph, files_content, query, max_chars=18000)
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
1. Understand the overall purpose of this application.
2. Identify the core business workflows.
3. For each workflow, generate a Mermaid sequence diagram (`sequenceDiagram`) representing the component interactions over time.
4. For each workflow, break down the logic into clear sequential steps, and trace EACH step to the EXACT source file, function name, and a tiny code snippet that executes it.

Return your response as a valid JSON object with EXACTLY this structure:
{{
    "app_purpose": "A clear 2-3 sentence description of what this application does",
    "business_flows": [
        {{
            "feature": "Name of the feature (e.g., User Authentication)",
            "complexity_score": "Simple", // 'Simple', 'Medium', or 'Complex' based on files touched
            "blast_radius": "Modifying this breaks X, Y, Z flows", // A short warning about what depends on this
            "test_coverage_status": true, // true if tests exist for the main files in this flow, false otherwise
            "sequence_diagram": "sequenceDiagram\\n Client->>Router: POST /login\\n Router->>AuthService: validate()\\n AuthService->>Database: queryUser()",
            "steps": [
                {{
                    "description": "Client sends login request, router intercepts it",
                    "file": "routes/auth.js",
                    "function": "loginUser",
                    "code_snippet": "router.post('/login', loginUser);"
                }}
            ]
        }}
    ]
}}

IMPORTANT:
- Return ONLY the JSON, no markdown formatting outside the JSON values.
- Include 3-5 business flows.
- Each flow must have a valid Mermaid sequenceDiagram string (use \\n for line breaks). Do NOT use markdown code blocks inside the string.
- Each step must trace back to a specific file, function, and short code snippet (1-3 lines max).
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
