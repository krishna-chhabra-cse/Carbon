# ============================================================
#  agents/security_agent.py — Autonomous DevSecOps Security Auditor
# ============================================================

import json
import re
from tools.security_scanner import run_security_audit
from tools.llm_client import generate_with_retry

def security_agent_node(state: dict) -> dict:
    """
    LangGraph Node: Performs static taint audit + AI remediation generation.
    """
    print("\n[GRAPH] Running Security Auditor Node...")
    files_content = state.get("files_content", {})

    # 1. Deterministic Static Security Scan (0 Tokens)
    audit_results = run_security_audit(files_content)
    findings = audit_results["findings"]
    scorecard = audit_results["scorecard"]

    print(f"[SECURITY AGENT] Audit finished. Grade: {scorecard['grade']}, Findings: {len(findings)}")

    # If no vulnerabilities found, return clean scorecard immediately (0 LLM tokens needed!)
    if not findings:
        return {
            "security_result": {
                "scorecard": scorecard,
                "summary": "No known security vulnerabilities, hardcoded secrets, or OWASP Top 10 risks detected.",
                "remediations": [],
                "best_practices": [
                    "Keep dependencies updated using automated security alerts (Dependabot/Snyk).",
                    "Maintain strict Content Security Policies (CSP) and Helmet HTTP security headers.",
                    "Ensure environment variables are loaded via secure secret managers in production."
                ]
            }
        }

    # 2. AI Remediation Generator for detected findings
    prompt = f"""
You are Carbon's Principal Application Security Engineer (AppSec).
A static security analysis found the following vulnerabilities in this codebase:

SCORECARD:
- Grade: {scorecard['grade']}
- Critical: {scorecard['critical']}, High: {scorecard['high']}, Medium: {scorecard['medium']}, Low: {scorecard['low']}

FINDINGS:
{json.dumps(findings[:10], indent=2)}

INSTRUCTIONS:
1. Provide a 2-3 sentence executive threat assessment.
2. For each major finding, provide a clean remediation code diff (unified diff format).
3. List 3 key proactive AppSec recommendations.

Return your response in EXACT JSON format:
{{
  "summary": "Executive threat summary",
  "remediations": [
    {{
      "findingId": "SEC-001",
      "title": "Finding title",
      "filePath": "path/file.js",
      "fixDiff": "```diff\\n- const key = 'AKIA12345';\\n+ const key = process.env.AWS_ACCESS_KEY_ID;\\n```",
      "explanation": "Why this fixes the vulnerability."
    }}
  ],
  "best_practices": [
    "Recommendation 1",
    "Recommendation 2"
  ]
}}

Return ONLY valid JSON.
"""

    try:
        response_text = generate_with_retry(prompt)
        # Strip potential markdown formatting
        cleaned_text = response_text.strip()
        if cleaned_text.startswith("```"):
            cleaned_text = re.sub(r"^```(?:json)?\n?", "", cleaned_text)
            cleaned_text = re.sub(r"\n?```$", "", cleaned_text)

        ai_data = json.loads(cleaned_text)
        return {
            "security_result": {
                "scorecard": scorecard,
                "findings": findings,
                "summary": ai_data.get("summary", scorecard["statusText"]),
                "remediations": ai_data.get("remediations", []),
                "best_practices": ai_data.get("best_practices", [])
            }
        }
    except Exception as e:
        print(f"[SECURITY AGENT WARNING] AI remediation synthesis failed ({e}). Returning static scorecard.")
        return {
            "security_result": {
                "scorecard": scorecard,
                "findings": findings,
                "summary": scorecard["statusText"],
                "remediations": [
                    {
                        "findingId": f["ruleId"],
                        "title": f["title"],
                        "filePath": f["filePath"],
                        "explanation": f["remediation"]
                    } for f in findings[:6]
                ],
                "best_practices": [
                    "Store sensitive secrets in environment variables.",
                    "Sanitize and parameterize all external database queries.",
                    "Enforce authentication and role-based access control on mutation endpoints."
                ]
            }
        }
