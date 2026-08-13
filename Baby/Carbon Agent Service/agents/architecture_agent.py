# ============================================================
#  agents/architecture_agent.py
#
#  THE FIRST REAL AI AGENT! 🧠
#
#  This agent's job:
#  - Look at the folder structure and code files
#  - Ask Gemini to understand the overall architecture
#  - Return: a text explanation + a Mermaid diagram
#
#  What is "prompt engineering"?
#  It's how we talk to the AI to get the exact output we want.
#  The better the prompt, the better the output.
# ============================================================

import os
import json
from google import genai            # NEW Gemini SDK (replaces google.generativeai)
from dotenv import load_dotenv

# Load the GEMINI_API_KEY from our .env file
load_dotenv()


def run(folder_structure: str, files_content: dict) -> dict:
    """
    The Architecture Agent.

    Args:
        folder_structure: A text tree of all folders/files
        files_content:    A dict of { "filepath": "file content" }

    Returns:
        {
            "summary": "This is a Node.js REST API that...",
            "diagram": "graph TD\n  A --> B\n ...",
            "key_components": ["auth", "database", "api"],
            "tech_stack": ["Node.js", "Express", "MongoDB"]
        }
    """

    print("[ARCH AGENT] Architecture Agent starting...")

    # Step 1: Set up Gemini client with our API key
    # The new SDK uses a Client object — cleaner than the old configure() approach
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY not found in .env file!")

    client = genai.Client(api_key=api_key)

    # Step 2: Choose the Gemini model
    # gemini-3.1-flash-lite — confirmed working and available
    MODEL = "gemini-3.1-flash-lite"

    # Step 3: Format the file contents into a readable string for the prompt
    # We limit each file to 3000 chars to stay within context limits
    files_text = ""
    for filepath, content in list(files_content.items())[:30]:  # max 30 files
        files_text += f"\n\n--- FILE: {filepath} ---\n"
        files_text += content[:3000]  # first 3000 chars of each file

    # Step 4: Write the prompt
    # This is PROMPT ENGINEERING — the art of telling AI exactly what to do
    # Notice we:
    # - Give it context (what is its role)
    # - Give it the data (folder structure + files)
    # - Tell it exactly what format to return (JSON)
    # - Give it an example of the output we expect
    prompt = f"""
You are an expert software architect analyzing a codebase for a new developer joining the team.

Here is the folder structure of the repository:
{folder_structure}

Here are the key files in the codebase:
{files_text}

Your task:
1. Understand the overall architecture of this codebase
2. Identify the main components and how they connect
3. Identify the tech stack being used
4. Create a Mermaid flowchart showing the architecture

Return your response as a valid JSON object with EXACTLY this structure:
{{
    "summary": "A clear 3-5 sentence explanation of what this codebase does and its architecture",
    "tech_stack": ["list", "of", "technologies", "used"],
    "key_components": [
        {{
            "name": "component name",
            "purpose": "what this component does",
            "location": "folder or file path"
        }}
    ],
    "diagram": "graph TD\\nA[Frontend] -->|REST API| B[Backend Server]\\nB --> C[Database]\\nB --> D[Auth Service]"
}}

CRITICAL RULES FOR THE DIAGRAM FIELD:
- The value must be a single JSON string with \\n for newlines
- Use graph TD format
- Each node connection MUST be separated by \\n
- NEVER put multiple --> connections on the same line
- NEVER define multiple disconnected nodes on the same line (e.g. A[L1] B[L2] is INVALID. Put them on separate lines)
- NEVER use parentheses or curly braces inside node labels
- Use square brackets for labels like A[My Label]
- Use subgraph blocks separated by \\n like: subgraph Name\\nA --> B\\nend
- NEVER connect two subgraphs directly by their names (e.g. Frontend --> Backend is INVALID). Instead, connect specific nodes inside them (e.g. AppNode --> ServerNode).
- ALWAYS put cross-subgraph connections (e.g. connecting a node in Frontend to a node in Backend) OUTSIDE the subgraphs, at the very end of the diagram string.
- Here is a PERFECT example of the diagram format:
  "graph TD\\nsubgraph Frontend\\nA[React App] -->|API Call| B[Auth Page]\\nA --> C[Dashboard]\\nend\\nsubgraph Backend\\nD[Express Server] --> E[Routes]\\nE --> F[Controllers]\\nend\\nA -->|HTTP| D\\nF --> G[MongoDB Database]"

IMPORTANT:
- Return ONLY the JSON, no extra text before or after
- Make the diagram accurate to the actual codebase
- Keep the summary beginner-friendly but technical
"""

    # Step 5: Send the prompt to Gemini and get the response
    print("[ARCH AGENT] Sending to Gemini for analysis...")
    response = client.models.generate_content(
        model=MODEL,
        contents=prompt,
        config=genai.types.GenerateContentConfig(
            response_mime_type="application/json",
        )
    )
    raw_text = response.text.strip()

    # Step 6: Parse Gemini's response as JSON
    # Sometimes Gemini wraps JSON in ```json ... ``` — we need to strip that
    if raw_text.startswith("```"):
        # Remove the first line (```json) and last line (```)
        lines = raw_text.split('\n')
        raw_text = '\n'.join(lines[1:-1])

    try:
        result = json.loads(raw_text)
        print("[ARCH AGENT] Complete!")
        return result

    except json.JSONDecodeError as e:
        # If Gemini didn't return valid JSON, return a fallback
        print(f"[ARCH AGENT WARNING] JSON parse failed: {e}")
        return {
            "summary": raw_text,  # return the raw text at least
            "tech_stack": [],
            "key_components": [],
            "diagram": "graph TD\n    A[Could not generate diagram]"
        }
