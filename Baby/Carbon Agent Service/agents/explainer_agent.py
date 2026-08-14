# ============================================================
#  agents/explainer_agent.py
#
#  Generates Scrimba-compatible OPML markup for a video explainer.
#
#  Quality Improvements:
#  - #1 Rich OPML structure: cards, code excerpts, and precise narration.
#  - #2 Mermaid diagram injection: includes <item type="diagram">
#       with node-level <say> refs based on the architecture analysis.
# ============================================================

import os
import json
from google import genai
from dotenv import load_dotenv

load_dotenv()

def run(architecture: dict, api_docs: dict, business_logic: dict) -> str:
    """
    Given the existing Carbon analysis results, uses Gemini to generate
    a rich, Scrimba-compliant OPML fragment for a video slideshow explanation.
    """
    print("[EXPLAINER AGENT] Starting OPML generation...")

    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY not found in .env file!")

    client = genai.Client(api_key=api_key)
    MODEL = "gemini-3.1-flash-lite"

    # Extract mermaid diagram if present in architecture analysis
    existing_diagram = architecture.get("diagram") or ""
    if existing_diagram.startswith("graph TD"):
        existing_diagram = existing_diagram.replace("graph TD", "flowchart TD", 1)

    # Format the analysis data as context for the model
    context = f"""
=== ARCHITECTURE ANALYSIS ===
Summary: {architecture.get('summary', 'N/A')}
Tech Stack: {json.dumps(architecture.get('tech_stack', []))}
Key Components: {json.dumps(architecture.get('key_components', []))}
Mermaid Diagram:
{existing_diagram}

=== API DOCS ===
{json.dumps(api_docs, indent=2)}

=== BUSINESS LOGIC ===
{json.dumps(business_logic, indent=2)}
"""

    prompt = f"""
You are an expert technical teacher and course instructor. Your task is to generate a Scrimba-compatible OPML fragment that delivers an engaging, interactive video explanation of this codebase.

Here is the analysis data of the codebase:
{context}

You MUST follow these strict Scrimba Explainer OPML contract rules:

## 1. OPML SHAPE & STRUCTURE RULES:
- Return ONLY the raw OPML fragment. DO NOT wrap the output in markdown code blocks (e.g. ```xml ... ```).
- Supported tags: `<item>`, `<say>`, and `<followup>` only. Never emit `<narrate>`, `<code>`, `<diagram>`, `<card>`, or `<prop>`.
- The root of your output MUST NOT be wrapped in a single parent `<item>`. Every slide is a top-level sibling `<item>`.
- Every top-level `<item>` represents ONE slide in the video slideshow.
- Put the matching `<say>` IMMEDIATELY after the `<item>` it narrates.
- A slide can contain at most ONE visual item (e.g. a diagram, a code block, or a card group).
- End the explainer with EXACTLY two self-closing `<followup>` tags as the very last nodes (e.g. `<followup prompt="concise question" />`).

## 2. INTRO SLIDE (Slide 1):
- The first slide must be an intro item with `anchor="intro"`, a concise `title` (under 45 chars), and `text` (1-2 sentences, ~120-160 chars).
- The first `<say>` must have `lang="en"` and open with `[Title](#intro)` followed by 1 clear, punchy introductory sentence.
- Example:
  <item anchor="intro" title="Carbon Codebase Overview" text="Carbon analyzes codebases using autonomous AI agents and streaming architecture diagrams."></item>
  <say lang="en" title="Carbon Overview" text="[Carbon](#intro) is an agentic analysis system that turns complex code repositories into structured architectural explanations."/>

## 3. TECH STACK & COMPONENTS (Card Layouts):
- Use `<item anchor="tech-stack" title="Tech Stack" layout="cards">` with nested `<item anchor="card-id" title="Tech" text="Role"/>` child items.
- In the `<say>`, cite specific cards like `[Node.js backend](#card-id)`.

## 4. ARCHITECTURE DIAGRAM SLIDE (#2 Mermaid Injection):
- Include a dedicated `<item type="diagram" anchor="arch-flow" title="System Architecture"><![CDATA[ ... ]]></item>`.
- The CDATA must contain a clean `flowchart TD` (use the provided Mermaid Diagram from context or adapt it cleanly).
- In the matching `<say>`, point directly to visible node labels, e.g. `[label](#arch-flow:L2 'Visible Node Label')`.
- Example:
  <item type="diagram" anchor="arch-flow" title="System Architecture"><![CDATA[
  flowchart TD
    Client[VS Code Extension] -->|HTTP| Backend[Express Backend]
    Backend -->|FastAPI| Agents[Python Agent Service]
    Agents -->|AI| Gemini[Gemini LLM]
  ]]></item>
  <say lang="en" title="System Architecture" text="[The architecture](#arch-flow) flows from the [VS Code Extension](#arch-flow:L2 'VS Code Extension') into the [Express Backend](#arch-flow:L2 'Express Backend'), which orchestrates [Python Agents](#arch-flow:L3 'Python Agent Service') powered by [Gemini](#arch-flow:L4 'Gemini LLM')."/>

## 5. CODE EXCERPTS (API & Logic Slides):
- Include at least one `<item type="code" anchor="code-anchor" title="..." language="javascript" filename="...">` with CDATA containing real code snippet (~5-15 lines).
- In the matching `<say>`, use line references and quote exact identifiers, e.g.:
  `[The router](#code-anchor) mounts [the analyze endpoint](#code-anchor:L2 'analyze') and [the video explainer](#code-anchor:L3 'explainVideo').`

## 6. NARRATION (<say>) & PHRASING RULES:
- Every `<say>` must have `lang="en"` as the first attribute and a `title` attribute.
- The `<say>`'s `text` MUST start with a markdown link to the item's anchor (e.g. `text="[Slide Title](#anchor) ..."`).
- Use natural, technical, conversational language.
- BANNED CLICHES: Never use "heavy lifting", "under the hood", "secret sauce", "magic", "game-changer", "dive in", or "X isn't just Y, it's Z". State direct technical facts.

## 7. RECOMMENDED SLIDE FLOW (5-7 slides):
1. `anchor="intro"` — Overview
2. `anchor="tech-stack"` — Tech Stack (`layout="cards"`)
3. `anchor="arch-flow"` — System Architecture (`type="diagram"` with Mermaid CDATA)
4. `anchor="key-components"` — Key Components (`layout="cards"`)
5. `anchor="api-routes"` or `anchor="business-logic"` — Core Logic / Routes (`type="code"`)
6. `anchor="summary"` — Wrap-up
7. Exactly two `<followup>` tags

Generate the full, valid OPML fragment now:
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

    print(f"[EXPLAINER AGENT] Completed OPML generation ({len(raw_opml)} bytes).")
    return raw_opml

