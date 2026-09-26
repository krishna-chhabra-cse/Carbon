# ============================================================
#  agents/roast_agent.py
#
#  THE ROAST AGENT 🌶️
#
#  This agent's job:
#  - Look at the codebase architecture, security flaws, and graph.
#  - Generate a brutally honest, humorous "roast" of the code.
#  - Output a highly shareable JSON card for Twitter/social media.
# ============================================================

import os
import json
from google import genai
from dotenv import load_dotenv
from tools.llm_client import generate_with_retry

load_dotenv()


def run(files_dict: dict, architecture_info: dict, security_info: dict, graph_stats: dict = None) -> dict:
    """
    The Roast Agent.
    
    Args:
        files_dict: Dictionary of file paths and contents.
        architecture_info: Info from the Architecture Agent.
        security_info: Info from the Security Agent.
        graph_stats: Stats like max dependencies, god objects.
        
    Returns:
        JSON dict with the roast details.
    """
    print("[ROAST AGENT] Preparing the oven...")

    # 1. Analyze codebase for "sins"
    total_files = len(files_dict)
    
    # Find the largest files (God Objects)
    file_sizes = {path: len(content.split('\n')) for path, content in files_dict.items()}
    god_objects = sorted(file_sizes.items(), key=lambda x: x[1], reverse=True)[:3]
    
    # Check for tests
    test_files = [f for f in files_dict.keys() if 'test' in f.lower() or 'spec' in f.lower()]
    test_ratio = len(test_files) / total_files if total_files > 0 else 0
    
    # Security flaws
    critical_flaws = security_info.get("scorecard", {}).get("critical", 0)
    high_flaws = security_info.get("scorecard", {}).get("high", 0)
    
    # Build the context payload for the prompt
    sins = f"""
    Codebase Stats:
    - Total Files: {total_files}
    - Test Files: {len(test_files)} ({(test_ratio*100):.1f}%)
    - Critical Security Flaws: {critical_flaws}
    - High Security Flaws: {high_flaws}
    
    Top 3 Largest Files (God Objects):
    """
    for path, lines in god_objects:
        sins += f"- {path} ({lines} lines)\n"
        
    sins += f"\nArchitecture Summary: {architecture_info.get('summary', 'Unknown')}\n"

    # 2. The Prompt
    prompt = f"""
You are the Gordon Ramsay of software engineering. Your job is to brutally (but safely/humorously) ROAST this codebase. 
Developers love self-deprecating humor. 

Here are the "sins" of this repository:
{sins}

Your task:
1. Write a brutally honest, highly shareable, humorous summary of this architecture.
2. Call out specific sins (e.g., massive files, no tests, terrible security).
3. Generate 3 short, punchy quotes that the user can put on Twitter.
4. Give it a funny "Spaghetti Rating" out of 100.

Return your response as a valid JSON object with EXACTLY this structure:
{{
    "spaghetti_rating": 85,
    "brutal_summary": "Your server.js is 4,000 lines long and holding onto dear life with duct tape. Did you write this at 3 AM?",
    "top_sins": [
        "Zero unit tests. You like living on the edge.",
        "3 Critical security flaws. Hackers are thanking you right now."
    ],
    "twitter_quotes": [
        "Just got roasted by Carbon: 'My architecture resembles a bowl of spaghetti dropped on a keyboard.'",
        "Carbon gave my repo an 85/100 on the Spaghetti scale. Time to rewrite in Rust."
    ]
}}

IMPORTANT:
- Return ONLY valid JSON.
- Make it funny, sarcastic, and dramatic.
- Do NOT be genuinely offensive, keep it in the spirit of fun developer banter.
"""

    # 3. Send to Gemini
    print("[ROAST AGENT] Sending to Gemini for roasting...")
    raw_text = generate_with_retry(prompt)

    # 4. Parse the JSON
    if raw_text.startswith("```"):
        lines = raw_text.split('\n')
        raw_text = '\n'.join(lines[1:-1])

    try:
        result = json.loads(raw_text)
        print("[ROAST AGENT] Roast complete!")
        return result
    except json.JSONDecodeError as e:
        print(f"[ROAST AGENT WARNING] JSON parse failed: {e}")
        return {
            "spaghetti_rating": 100,
            "brutal_summary": "This codebase is so tangled it broke my JSON parser.",
            "top_sins": ["Unparseable spaghetti."],
            "twitter_quotes": ["My code literally broke the AI trying to roast it."]
        }
