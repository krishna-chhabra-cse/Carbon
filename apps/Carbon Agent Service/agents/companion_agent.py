# ============================================================
#  agents/companion_agent.py — Carbon Web Learning Companion
# ============================================================

import os
from google import genai
from dotenv import load_dotenv

load_dotenv()

SYSTEM_INSTRUCTION = """
You are Carbon — an intelligent, friendly AI learning companion for the web.
Your mission is to help developers and learners deeply understand whatever they encounter while browsing the web.

You speak in clear, engaging, jargon-free language with cosmic elegance.
Always format your response in clean, beautiful GitHub-flavored Markdown.
Use code snippets, bullet points, numbered concepts (01, 02, 03), and bold headers where appropriate.
"""

def run(query: str, mode: str = "explain", context: dict = None) -> dict:
    """
    The Learning Companion Agent.
    Handles Explain, Simplify, Example, Teach Me, Summarize, Page Explain, and Lesson Discovery.
    """
    print(f"\n[COMPANION AGENT] Mode: '{mode}' | Query: '{query[:80]}...'")

    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY not found in environment!")

    client = genai.Client(api_key=api_key)
    MODEL = os.getenv("GEMINI_MODEL", "gemini-3.1-flash-lite")

    context = context or {}
    page_title = context.get("title", "Unknown Page")
    page_url = context.get("url", "")
    page_domain = context.get("domain", "")
    selected_text = context.get("selectedText", "")
    page_excerpt = context.get("pageExcerpt", "")

    # Mode-specific prompt engineering
    if mode == "simplify":
        mode_instructions = """
TASK: Explain this concept in ELI5 (Explain Like I'm 5) plain English.
- Use a vivid, intuitive real-world analogy.
- Avoid unnecessary academic jargon.
- Keep it punchy, visual, and immediately memorable.
- Highlight the "Why it matters" in one sentence.
"""
    elif mode == "example":
        mode_instructions = """
TASK: Provide concrete, real-world practical examples of this concept.
- Show clean, well-commented code snippets (if technical) or practical scenarios.
- Walk through what happens step-by-step.
- Highlight common mistakes or gotchas to avoid.
"""
    elif mode == "teach":
        mode_instructions = """
TASK: Teach this concept as an interactive structured learning module.
Structure your answer exactly with these sections:
### ✦ Mental Model
(A 2-sentence intuitive metaphor)

### ✦ Core Concepts
01. **[Concept Name]** — Explanation
02. **[Concept Name]** — Explanation
03. **[Concept Name]** — Explanation

### ✦ Practical Example
(A clean code snippet or practical demonstration)

### ✦ Quick Knowledge Check
**Question**: (A quick question to test understanding)
<details><summary>💡 Click to reveal answer</summary>

(Answer and explanation)
</details>

### ✦ Recommended Next Step
(What to explore next)
"""
    elif mode == "summarize":
        mode_instructions = """
TASK: Provide a crisp, high-signal summary of this content or concept.
- 1-paragraph Executive Overview
- 3 to 5 bullet points of Core Takeaways
- Key technical terms defined in 1 line each
"""
    elif mode == "page_explain":
        mode_instructions = f"""
TASK: Analyze this webpage and explain it clearly to the user.
Webpage Title: {page_title}
Webpage URL: {page_url}

Structure your answer with:
### ✦ This page is about:
(Clear 2-sentence summary)

### ✦ Key Concepts:
01. **[Concept 1]** — Explanation
02. **[Concept 2]** — Explanation
03. **[Concept 3]** — Explanation
04. **[Concept 4]** — Explanation

### ✦ Recommended Next Steps:
- [Next topic or action to explore]
"""
    elif mode == "lessons":
        mode_instructions = """
TASK: Find and suggest the best structured learning roadmap, relevant interactive lessons, and video walkthroughs for this topic.
- Break down the learning path into 3 progressive milestones.
- Recommend key topics to master in order.
- Include a visual explainer recommendation.
"""
    else:  # default: explain / chat
        mode_instructions = """
TASK: Explain this concept thoroughly, accurately, and concisely.
- Break down complex mechanisms step-by-step.
- Provide clear code examples in markdown where helpful.
- Keep the tone inspiring, precise, and educational.
"""

    prompt = f"""
{SYSTEM_INSTRUCTION}

{mode_instructions}

---
CONTEXT INFORMATION:
- Current Page Title: {page_title}
- Current URL: {page_url}
- Current Domain: {page_domain}
- Selected Text: {selected_text if selected_text else '(None)'}
- Page Content Excerpt: {page_excerpt[:2500] if page_excerpt else '(None)'}
---

USER QUERY / TOPIC:
{query}

Generate your complete, beautifully formatted response:
"""

    from tools.llm_client import generate_with_retry
    answer_text = generate_with_retry(prompt)

    return {
        "success": True,
        "mode": mode,
        "query": query,
        "answer": answer_text,
        "context": {
            "title": page_title,
            "domain": page_domain
        }
    }
