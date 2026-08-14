# ============================================================
#  agents/explainer_agent.py
#
#  Generates Scrimba-compatible OPML markup for a video explainer.
# ============================================================

import os
import json
from google import genai
from dotenv import load_dotenv

load_dotenv()

def run(architecture: dict, api_docs: dict, business_logic: dict) -> str:
    """
    Given the existing Carbon analysis results, uses Gemini to generate
    a Scrimba-compliant OPML fragment for a video slideshow explanation.
    """
    print("[EXPLAINER AGENT] Starting OPML generation...")

    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY not found in .env file!")

    client = genai.Client(api_key=api_key)
    MODEL = "gemini-3.1-flash-lite"

    # Format the analysis data as context for the model
    context = f"""
=== ARCHITECTURE ANALYSIS ===
{json.dumps(architecture, indent=2)}

=== API DOCS ===
{json.dumps(api_docs, indent=2)}

=== BUSINESS LOGIC ===
{json.dumps(business_logic, indent=2)}
"""

    prompt = f"""
You are an expert technical teacher. Your task is to generate a Scrimba-compatible OPML fragment explaining the codebase based on the analysis context provided.

Here is the analysis context of the codebase:
{context}

You MUST follow these strict rules to generate a valid Scrimba Explainer OPML:

1. STRUCTURE RULES:
- Output ONLY the OPML tags. DO NOT wrap the output in markdown code blocks (e.g. ```xml ... ```).
- Supported tags: `<item>`, `<say>`, and `<followup>` only.
- The root of your output MUST NOT be wrapped in a single parent `<item>`. Sibling `<item>` and `<say>` elements must be at the top level.
- Every top-level `<item>` represents one slide. Put `<say>` immediately after the `<item>` it narrates.
- End the explainer with EXACTLY two self-closing `<followup>` tags as the very last nodes (e.g. `<followup prompt="concise question" />`).

2. ITEM AND LAYOUT RULES:
- An item can be a plain slide, a code slide (`type="code"`), a diagram slide (`type="diagram"` with Mermaid inside CDATA), or layout lists (`layout="ul"`, `layout="ol"`, `layout="cards"`).
- Inside a layout item (e.g. `<item layout="cards">`), you nest child `<item>` tags representing the cards. Each card must have its own unique `anchor`.
- A slide can contain at most ONE visual element. Keep slide descriptions (`text` attribute or body) short.

3. NARRATION (<say>) RULES:
- Every `<say>` must have `lang="en"` as the first attribute.
- Every `<say>` must have a `title` attribute.
- The `<say>`'s `text` attribute MUST start with a markdown link to the item's anchor (e.g., `text="[Slide Title](#slide-anchor) rest of narration..."`).
- Write natural, conversational narration. Avoid stock metaphors ("heavy lifting", "under the hood", "secret sauce", "magic").

4. STRUCTURE OF THE EXPLAINER DECK (5-7 slides recommended):
- Slide 1 (anchor: "welcome"): Welcome/Overview. A plain text slide summarizing the codebase.
- Slide 2 (anchor: "tech-stack"): Tech Stack. Use `layout="cards"` or `layout="ul"` to list the technologies used.
- Slide 3 (anchor: "key-components"): Key Components. Use `layout="cards"` or `layout="ul"` to outline main files/folders.
- Slide 4 (anchor: "api-endpoints"): API Endpoints/Routing (if present, otherwise backend routes). Use `type="code"` with a short snippet of express routes, or layout.
- Slide 5 (anchor: "business-logic"): Core Business Logic. Use `type="code"` or layout explaining the main flow.
- Slide 6 (anchor: "wrap-up"): Summary/Conclusion.
- Followed by exactly two `<followup>` tags.

Generate the finished OPML fragment now:
"""

    response = client.models.generate_content(
        model=MODEL,
        contents=prompt
    )
    raw_opml = response.text.strip()

    # Clean up markdown code blocks if the model wrapped it anyway
    if raw_opml.startswith("```"):
        lines = raw_opml.split('\n')
        start_idx = 1
        if lines[0].strip().startswith("```"):
            if len(lines[0].strip()) > 3:
                start_idx = 1
        end_idx = len(lines) - 1
        raw_opml = '\n'.join(lines[start_idx:end_idx]).strip()

    print("[EXPLAINER AGENT] Completed OPML generation.")
    return raw_opml
