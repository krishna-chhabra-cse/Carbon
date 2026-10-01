# ============================================================
#  agents/roast_agent.py
#
#  CARBON — ROAST MY CODEBASE 🔥
#  Roast Intelligence Agent.
#
#  Consumes RoastMetrics and calculate_deterministic_score from
#  tools.codebase_metrics. Enforces strict JSON Output Schema
#  (PROJECT.md §9), supports LIGHT, SAVAGE, and BRUTAL personality
#  modes, grounds every critique in real metrics (no hallucinated
#  numbers), sanitizes all secrets via tools.security_redactor,
#  and provides an infallible deterministic fallback synthesizer.
# ============================================================

import os
import re
import json
import logging
from typing import Dict, List, Any, Optional, Union

# Handle package vs standalone imports
try:
    from tools.codebase_metrics import (
        RoastMetrics,
        calculate_deterministic_score,
        extract_roast_metrics,
    )
except ImportError:
    from codebase_metrics import (
        RoastMetrics,
        calculate_deterministic_score,
        extract_roast_metrics,
    )

try:
    from tools.security_redactor import (
        redact_secrets,
        redact_security_findings,
    )
except ImportError:
    from security_redactor import (
        redact_secrets,
        redact_security_findings,
    )

try:
    from tools.llm_client import generate_with_retry
except ImportError:
    try:
        from llm_client import generate_with_retry
    except ImportError:
        generate_with_retry = None

logger = logging.getLogger("carbon.roast_agent")

# ── Allowed Enums and Defaults ─────────────────────────────────

ALLOWED_SEVERITIES = {"LIGHT", "SAVAGE", "BRUTAL"}
DEFAULT_SEVERITY = "SAVAGE"

ALLOWED_GRADES = {
    "MICHELIN_STAR",
    "SENIOR_DEV",
    "ACCEPTABLE_CHAOS",
    "SPAGHETTI_JUNCTION",
    "DUMPSTER_FIRE",
    "IDIOT_SANDWICH",
}

REQUIRED_ROAST_KEYS = {
    "overall_score",
    "grade",
    "title",
    "roast",
    "severity",
    "worst_offender",
    "top_crimes",
    "stats",
    "fixes",
    "share_text",
}


# ── Helper: Normalize Metrics Input ────────────────────────────

def _coerce_metrics_dict(metrics: Union[RoastMetrics, Dict[str, Any]]) -> Dict[str, Any]:
    """Ensures metrics are represented as a dictionary for uniform extraction."""
    if hasattr(metrics, "to_dict"):
        raw = metrics.to_dict()
    elif isinstance(metrics, dict):
        raw = dict(metrics)
    else:
        raw = {}

    clean: Dict[str, Any] = {}
    for k, v in raw.items():
        if k in ("scale", "architecture", "testing", "security", "naming", "complexity"):
            clean[k] = v if isinstance(v, dict) else {}
        else:
            clean[k] = v

    for k in ("scale", "architecture", "testing", "security", "naming", "complexity"):
        if k not in clean or not isinstance(clean[k], dict):
            clean[k] = {}

    return clean


# ── Helper: Worst Offender Extractor ───────────────────────────

def identify_worst_offender(metrics_dict: Dict[str, Any]) -> Dict[str, str]:
    """
    Identifies the single worst technical offender in the repository
    grounded strictly in quantitative metrics.

    Order of precedence:
    1. Critical / High security vulnerability
    2. God files (>1000 lines or >50 functions)
    3. Utils dumping grounds (>300 LOC)
    4. Circular dependency cycles
    5. Largest file by lines of code
    6. General repo fallback
    """
    sec_findings = (metrics_dict.get("security") or {}).get("findings") or []
    crit_high = [
        f for f in sec_findings
        if isinstance(f, dict) and f.get("severity") in ("CRITICAL", "HIGH")
    ]
    if crit_high:
        top_sec = crit_high[0]
        file_path = top_sec.get("filePath") or top_sec.get("file") or "unknown"
        title = redact_secrets(str(top_sec.get("title") or "High-severity security vulnerability"))
        rule = str(top_sec.get("ruleId") or "SEC")
        return {
            "file": redact_secrets(str(file_path)),
            "metric": f"{len(crit_high)} critical/high flaw(s)",
            "reason": f"[{rule}] {title}"
        }

    god_files = (metrics_dict.get("architecture") or {}).get("god_files") or []
    if god_files and isinstance(god_files[0], dict):
        gf = god_files[0]
        lines = int(gf.get("lines") or 0)
        funcs = int(gf.get("functions_count") or 0)
        metric_desc = f"{lines} lines" if lines else f"{funcs} functions"
        return {
            "file": redact_secrets(str(gf.get("file") or "unknown")),
            "metric": metric_desc,
            "reason": "God object / excessive responsibility"
        }

    utils_grounds = (metrics_dict.get("architecture") or {}).get("utils_dumping_grounds") or []
    if utils_grounds and isinstance(utils_grounds[0], dict):
        ug = utils_grounds[0]
        lines = int(ug.get("lines") or 0)
        return {
            "file": redact_secrets(str(ug.get("file") or "unknown")),
            "metric": f"{lines} lines",
            "reason": "Utils dumping ground / helper clutter"
        }

    circular_deps = (metrics_dict.get("architecture") or {}).get("circular_dependencies") or []
    if circular_deps and isinstance(circular_deps[0], list) and circular_deps[0]:
        cycle = circular_deps[0]
        chain_str = " -> ".join(str(c) for c in cycle[:3])
        return {
            "file": redact_secrets(str(cycle[0])),
            "metric": f"{len(circular_deps)} circular cycle(s)",
            "reason": f"Circular dependency trap: {chain_str}"
        }

    largest_files = (metrics_dict.get("scale") or {}).get("largest_files") or []
    if largest_files and isinstance(largest_files[0], dict):
        lf = largest_files[0]
        lines = int(lf.get("lines") or 0)
        return {
            "file": redact_secrets(str(lf.get("file") or "src/index.js")),
            "metric": f"{lines} lines",
            "reason": "Largest module with accumulated technical debt"
        }

    total_loc = int((metrics_dict.get("scale") or {}).get("total_loc") or 0)
    return {
        "file": "repository",
        "metric": f"{total_loc} lines",
        "reason": "Clean baseline architecture"
    }


# ── Helper: Top Crimes Extractor ───────────────────────────────

def extract_top_crimes(metrics_dict: Dict[str, Any], personality: str = "SAVAGE") -> List[Dict[str, str]]:
    """
    Extracts structured, evidence-backed engineering crimes from real metrics.
    Every crime includes: crime, file, evidence, roast, fix.
    """
    crimes: List[Dict[str, str]] = []

    # 1. Security vulnerabilities
    sec_findings = (metrics_dict.get("security") or {}).get("findings") or []
    for finding in sec_findings[:2]:
        if not isinstance(finding, dict):
            continue
        file_path = finding.get("filePath") or finding.get("file") or "unknown"
        sev = str(finding.get("severity") or "HIGH")
        title = redact_secrets(str(finding.get("title") or "Security Vulnerability"))
        snippet = redact_secrets(str(finding.get("snippet") or "Sensitive pattern detected"))
        remediation = redact_secrets(str(finding.get("remediation") or "Store secrets in environment variables or KMS."))

        if personality == "LIGHT":
            roast_line = f"A friendly reminder that credentials in {file_path} belong in secrets managers, not in version control."
        elif personality == "BRUTAL":
            roast_line = f"{file_path} is an active liability. Leaked credentials and unchecked inputs represent catastrophic security debt."
        else:
            roast_line = f"Hackers don't even need zero-days when {file_path} leaves the front door wide open."

        crimes.append({
            "crime": f"{sev} Security Finding: {title}",
            "file": redact_secrets(str(file_path)),
            "evidence": f"[{sev}] {snippet[:120]}",
            "roast": roast_line,
            "fix": remediation
        })

    # 2. God Files
    god_files = (metrics_dict.get("architecture") or {}).get("god_files") or []
    for gf in god_files[:2]:
        if not isinstance(gf, dict):
            continue
        file_path = gf.get("file") or "unknown"
        lines = int(gf.get("lines") or 0)
        funcs = int(gf.get("functions_count") or 0)
        evidence = f"{lines} lines of code across {funcs} functions"

        if personality == "LIGHT":
            roast_line = f"{file_path} is trying to do everything at once; a gentle modular decomposition would work wonders."
        elif personality == "BRUTAL":
            roast_line = f"{file_path} is an unmaintainable monolith that flagrantly violates the Single Responsibility Principle."
        else:
            roast_line = f"{file_path} is where engineering standards went to die. No single file needs this much responsibility."

        crimes.append({
            "crime": "God Object Monolith",
            "file": redact_secrets(str(file_path)),
            "evidence": evidence,
            "roast": roast_line,
            "fix": f"Decompose {file_path} into single-responsibility domain modules and distinct services."
        })

    # 3. Circular Dependencies
    circ_deps = (metrics_dict.get("architecture") or {}).get("circular_dependencies") or []
    for cycle in circ_deps[:2]:
        if not isinstance(cycle, list) or not cycle:
            continue
        primary_file = cycle[0]
        chain_str = " -> ".join(str(c) for c in cycle[:4])
        evidence = f"Circular import cycle: {chain_str}"

        if personality == "LIGHT":
            roast_line = f"Modules in this cycle are a bit too tightly coupled. Consider introducing an interface or event boundary."
        elif personality == "BRUTAL":
            roast_line = f"Circular architecture trap ({chain_str}) indicates structural rot and non-existent boundary enforcement."
        else:
            roast_line = f"These modules are in a mutual hostage situation. Neither can load without the other panicking."

        crimes.append({
            "crime": "Circular Dependency Cycle",
            "file": redact_secrets(str(primary_file)),
            "evidence": evidence,
            "roast": roast_line,
            "fix": "Refactor shared types into a common dependency or apply Dependency Inversion."
        })

    # 4. Utils Dumping Grounds
    utils_grounds = (metrics_dict.get("architecture") or {}).get("utils_dumping_grounds") or []
    for ug in utils_grounds[:1]:
        if not isinstance(ug, dict):
            continue
        file_path = ug.get("file") or "unknown"
        lines = int(ug.get("lines") or 0)
        evidence = f"{lines} lines of unstructured utility functions"

        if personality == "LIGHT":
            roast_line = f"{file_path} has become the neighborhood junk drawer. Time for some spring cleaning."
        elif personality == "BRUTAL":
            roast_line = f"{file_path} is an unstructured dumping ground demonstrating zero architectural discipline."
        else:
            roast_line = f"Calling a file '{file_path}' is an admission that you gave up on domain design."

        crimes.append({
            "crime": "Utils Dumping Ground",
            "file": redact_secrets(str(file_path)),
            "evidence": evidence,
            "roast": roast_line,
            "fix": f"Categorize functions in {file_path} by bounded context and relocate to dedicated packages."
        })

    # 5. Low / Zero Testing Ratio
    test_metrics = metrics_dict.get("testing") or {}
    test_ratio_str = str(test_metrics.get("test_ratio_percentage") or "0.0%")
    test_to_code = float(test_metrics.get("test_to_code_ratio") or 0.0)
    scale = metrics_dict.get("scale") or {}
    total_files = int(scale.get("total_files") or 0)

    if total_files >= 3 and test_to_code < 0.15:
        if personality == "LIGHT":
            roast_line = "Confidence in refactoring is much higher with a comprehensive automated test safety net."
        elif personality == "BRUTAL":
            roast_line = f"A {test_ratio_str} test-to-code ratio is professional negligence. You are relying on end users to be your QA."
        else:
            roast_line = f"A {test_ratio_str} test ratio means your production users are effectively your QA team."

        crimes.append({
            "crime": "Neglected Automated Testing",
            "file": "tests/",
            "evidence": f"Test-to-code ratio is {test_ratio_str} across {total_files} source files",
            "roast": roast_line,
            "fix": "Add unit and integration test coverage for core business routes and services."
        })

    # 6. Deep Nesting / Complexity
    deep_nested = (metrics_dict.get("complexity") or {}).get("deeply_nested_branches") or []
    if deep_nested and isinstance(deep_nested[0], dict):
        dn = deep_nested[0]
        file_path = dn.get("file") or "unknown"
        depth = int(dn.get("depth") or 4)
        line_num = int(dn.get("line") or 1)
        evidence = f"Indentation depth {depth} at line {line_num}"

        if personality == "LIGHT":
            roast_line = f"Deep nesting at line {line_num} could be simplified with early returns and guard clauses."
        elif personality == "BRUTAL":
            roast_line = f"Pyramid of doom at {file_path}:{line_num} (depth {depth}) makes mental tracing nearly impossible."
        else:
            roast_line = f"The indentation at {file_path}:{line_num} travels so far right it needs its own passport."

        crimes.append({
            "crime": "Pyramid of Doom (Deep Nesting)",
            "file": redact_secrets(str(file_path)),
            "evidence": evidence,
            "roast": roast_line,
            "fix": "Refactor deeply nested conditional blocks into guard clauses and discrete helper functions."
        })

    # 7. Suspicious Naming
    suspicious_ids = (metrics_dict.get("naming") or {}).get("suspicious_identifiers") or []
    if suspicious_ids and len(crimes) < 3:
        sid = suspicious_ids[0]
        if isinstance(sid, dict):
            file_path = sid.get("file") or "unknown"
            ident = sid.get("identifier") or "data"
            line_num = sid.get("line") or 1
        else:
            file_path = "unknown"
            ident = str(sid)
            line_num = 1
        evidence = f"Ambiguous identifier '{ident}' at line {line_num}"

        if personality == "LIGHT":
            roast_line = f"Naming variables '{ident}' is a bit ambiguous; descriptive names help future maintainers."
        elif personality == "BRUTAL":
            roast_line = f"Variables like '{ident}' obscure intent and demonstrate sloppy engineering hygiene."
        else:
            roast_line = f"Calling a variable '{ident}' proves that naming things remains your insurmountable challenge."

        crimes.append({
            "crime": "Ambiguous Identifier Smells",
            "file": redact_secrets(str(file_path)),
            "evidence": evidence,
            "roast": roast_line,
            "fix": f"Rename '{ident}' and related generic identifiers to reflect their actual domain role."
        })

    # Fallback if codebase has zero detected crimes
    if not crimes:
        largest_files = (metrics_dict.get("scale") or {}).get("largest_files") or []
        first_lf = largest_files[0] if (largest_files and isinstance(largest_files[0], dict)) else {}
        top_file = str(first_lf.get("file") or "src/index.js") if largest_files else "repo"
        loc = int(first_lf.get("lines") or 100) if largest_files else 100
        crimes.append({
            "crime": "Accumulated Architectural Debt",
            "file": redact_secrets(top_file),
            "evidence": f"Primary codebase module ({loc} lines)",
            "roast": "Codebase shows disciplined patterns, but continuous refactoring is essential to avoid stagnation.",
            "fix": "Maintain modular boundaries and extend automated regression tests."
        })

    return crimes


# ── Helper: Fixes Extractor ────────────────────────────────────

def extract_fixes(
    worst_offender: Dict[str, str],
    top_crimes: List[Dict[str, str]],
    overall_score: int
) -> List[Dict[str, str]]:
    """
    Generates actionable remediation items.
    Enforces contract: fixes[0]['file'] MUST match worst_offender['file'].
    """
    fixes: List[Dict[str, str]] = []
    wo_file = str(worst_offender.get("file") or "repository")
    wo_reason = str(worst_offender.get("reason") or "Architectural debt")

    # Priority determination for top fix
    if "security" in wo_reason.lower() or "flaw" in wo_reason.lower() or "sec" in wo_reason.lower():
        top_priority = "CRITICAL"
        top_action = f"Immediately audit and resolve security findings in {wo_file}; redact and move credentials."
    elif overall_score < 50:
        top_priority = "HIGH"
        top_action = f"Decompose {wo_file} into modular, isolated domain units to eliminate architectural coupling."
    else:
        top_priority = "MEDIUM"
        top_action = f"Refactor {wo_file} to improve testability and adhere to single-responsibility principles."

    fixes.append({
        "priority": top_priority,
        "title": f"Refactor {wo_file}",
        "file": wo_file,
        "action": top_action
    })

    # Secondary fixes from top crimes
    for crime in top_crimes:
        if not isinstance(crime, dict):
            continue
        crime_file = str(crime.get("file") or "")
        if crime_file and crime_file != wo_file and not any(f["file"] == crime_file for f in fixes):
            crime_name = str(crime.get("crime") or "")
            if "security" in crime_name.lower():
                prio = "CRITICAL"
            elif "god" in crime_name.lower() or "circular" in crime_name.lower():
                prio = "HIGH"
            else:
                prio = "MEDIUM"

            fixes.append({
                "priority": prio,
                "title": f"Address {crime_name.split(':')[0]} in {crime_file}",
                "file": crime_file,
                "action": str(crime.get("fix") or f"Refactor and add automated tests for {crime_file}.")
            })
        if len(fixes) >= 4:
            break

    return fixes


# ── Deterministic Fallback Synthesizer ─────────────────────────

def synthesize_deterministic_roast(
    metrics_dict: Dict[str, Any],
    personality: str,
    overall_score: int,
    grade: str
) -> Dict[str, Any]:
    """
    Generates a 100% compliant roast payload using only deterministic logic.
    Used when LLM is unavailable, times out, or produces malformed JSON.
    """
    scale = metrics_dict.get("scale") or {}
    arch = metrics_dict.get("architecture") or {}
    testing = metrics_dict.get("testing") or {}
    sec = metrics_dict.get("security") or {}

    total_files = int(scale.get("total_files") or 0)
    total_loc = int(scale.get("total_loc") or 0)
    god_files = arch.get("god_files") or []
    circular_deps = arch.get("circular_dependencies") or []
    test_ratio_str = str(testing.get("test_ratio_percentage") or "0.0%")
    sec_findings = sec.get("findings") or []

    worst_offender = identify_worst_offender(metrics_dict)
    top_crimes = extract_top_crimes(metrics_dict, personality=personality)
    fixes = extract_fixes(worst_offender, top_crimes, overall_score)

    stats = {
        "total_files": total_files,
        "total_loc": total_loc,
        "god_files_count": int(len(god_files)),
        "circular_deps_count": int(len(circular_deps)),
        "test_ratio": test_ratio_str,
        "security_issues": int(len(sec_findings)),
    }

    # Tone synthesis
    if personality == "LIGHT":
        if overall_score >= 90:
            title = f"Michelin Star Candidate ({overall_score}/100)"
            roast_text = (
                f"With {total_files} files and a solid {test_ratio_str} test ratio, your codebase "
                "is exceptionally well-engineered. A few minor polish areas remain, but overall "
                "this is clean, thoughtful craftsmanship."
            )
        elif overall_score >= 55:
            title = f"Acceptable Chaos With Potential ({overall_score}/100)"
            roast_text = (
                f"Your repository spans {total_files} files and {total_loc} lines of code. "
                f"While {worst_offender['file']} ({worst_offender['metric']}) could use a gentle "
                "diet, the foundation is sound and shows real engineering heart."
            )
        else:
            title = f"Brave Prototype Under Construction ({overall_score}/100)"
            roast_text = (
                f"Every great application starts somewhere. At {overall_score}/100, the technical "
                f"debt in {worst_offender['file']} is eager for attention, but with structured "
                "refactoring, this codebase will shine."
            )
    elif personality == "BRUTAL":
        if overall_score >= 90:
            title = f"Temporary Architectural Truce ({overall_score}/100)"
            roast_text = (
                f"A score of {overall_score}/100 indicates disciplined rigor across {total_files} files. "
                "Do not get comfortable: architectural decay begins the second you stop enforcing "
                "strict boundary isolation."
            )
        elif overall_score >= 55:
            title = f"Forensic Codebase Autopsy ({overall_score}/100)"
            roast_text = (
                f"Analysis reveals {total_loc} lines of accumulated debt. Modules like {worst_offender['file']} "
                f"({worst_offender['metric']}) reflect architectural compromise and unmanaged side effects. "
                "Immediate structural remediation is mandatory."
            )
        else:
            title = f"Scorched Earth Technical Debt ({overall_score}/100)"
            roast_text = (
                f"This isn't a codebase; it's a biohazard with a Git remote. With an abysmal {test_ratio_str} "
                f"test ratio and {worst_offender['file']} collapsing under {worst_offender['metric']}, "
                "the architectural integrity has suffered total failure."
            )
    else:  # SAVAGE (default)
        if overall_score >= 90:
            title = f"Suspiciously Clean Codebase ({overall_score}/100)"
            roast_text = (
                f"Scored {overall_score}/100 ({grade}). Across {total_files} files, we barely found anything to yell at. "
                "Did you write this to impress your staff engineer or did an AI write the entire thing for you?"
            )
        elif overall_score >= 55:
            title = f"Gordon Ramsay's Kitchen Nightmare ({overall_score}/100)"
            roast_text = (
                f"Your architecture resembles a bowl of spaghetti dropped from an airplane. {total_loc} lines "
                f"of code, and {worst_offender['file']} is holding onto dear life with {worst_offender['metric']}. "
                "Wake up and refactor!"
            )
        else:
            title = f"Kitchen Fire With a Git Remote ({overall_score}/100)"
            roast_text = (
                f"This isn't a codebase. It's a kitchen fire with a Git repository attached. With {worst_offender['file']} "
                f"weighing in at {worst_offender['metric']} and a {test_ratio_str} test safety net, "
                "you are playing Russian roulette with every deployment."
            )

    # Sanitize roast text and title
    title = redact_secrets(title)
    roast_text = redact_secrets(roast_text)

    # Share text
    quote_snippet = roast_text.split(".")[0].strip()
    if len(quote_snippet) > 80:
        quote_snippet = quote_snippet[:77] + "..."
    share_text = (
        f"My codebase just got roasted by Carbon: {overall_score}/100 ({grade}). "
        f"'{quote_snippet}.' Check your roast: https://carbon.dev/roast"
    )

    return {
        "overall_score": int(overall_score),
        "grade": grade,
        "title": title,
        "roast": roast_text,
        "severity": personality,
        "worst_offender": worst_offender,
        "top_crimes": top_crimes,
        "stats": stats,
        "fixes": fixes,
        "share_text": share_text,
    }


# ── Prompt Builder ─────────────────────────────────────────────

def build_roast_prompt(
    metrics_dict: Dict[str, Any],
    personality: str,
    overall_score: int,
    grade: str,
    worst_offender: Dict[str, str],
    canonical_stats: Dict[str, Any]
) -> str:
    """
    Constructs an airtight LLM prompt strictly embedding real metrics,
    enforcing that the LLM does not invent numbers or alter deterministic scores.
    """
    scale = metrics_dict.get("scale") or {}
    god_files = (metrics_dict.get("architecture") or {}).get("god_files") or []
    circular_deps = (metrics_dict.get("architecture") or {}).get("circular_dependencies") or []
    utils_grounds = (metrics_dict.get("architecture") or {}).get("utils_dumping_grounds") or []
    sec_findings = (metrics_dict.get("security") or {}).get("findings") or []
    testing = metrics_dict.get("testing") or {}
    languages = scale.get("languages") or {}

    # Redact security findings before prompt assembly
    sanitized_sec = redact_security_findings(sec_findings)

    # Summarize facts
    god_summary = "\n".join([
        f"  * {gf.get('file')}: {gf.get('lines', 0)} lines, {gf.get('functions_count', 0)} functions"
        for gf in god_files[:5] if isinstance(gf, dict)
    ]) if god_files else "  * None detected"

    circ_summary = "\n".join([
        f"  * {' -> '.join(str(x) for x in c)}" for c in circular_deps[:4] if isinstance(c, list)
    ]) if circular_deps else "  * None detected"

    utils_summary = "\n".join([
        f"  * {ug.get('file')}: {ug.get('lines', 0)} lines"
        for ug in utils_grounds[:3] if isinstance(ug, dict)
    ]) if utils_grounds else "  * None detected"

    sec_summary = "\n".join([
        f"  * [{f.get('severity', 'HIGH')}] {f.get('filePath')}: {f.get('title')} ({redact_secrets(f.get('snippet', ''))[:80]})"
        for f in sanitized_sec[:4] if isinstance(f, dict)
    ]) if sanitized_sec else "  * 0 vulnerabilities detected"

    if isinstance(languages, dict):
        lang_summary = ", ".join([f"{k} ({v} LOC)" for k, v in list(languages.items())[:5]]) or "Mixed"
    else:
        lang_summary = "Mixed"

    # Tone instruction
    if personality == "LIGHT":
        tone_instruction = (
            "TONE: LIGHT. Playful, witty, constructive teasing with a Staff Engineer mentorship tone. "
            "Never insulting; point out quirks and encourage good habits with clever humor."
        )
    elif personality == "BRUTAL":
        tone_instruction = (
            "TONE: BRUTAL. Pure technical autopsy, scorched-earth truth, uncompromising reality check. "
            "Attack the architecture, coupling, and technical debt directly with clinical precision."
        )
    else:  # SAVAGE
        tone_instruction = (
            "TONE: SAVAGE. Gordon Ramsay meets Staff Engineer. Sharp, incisive, hilarious, memorable. "
            "Roast the bad decisions, bloated files, and missing tests without mercy."
        )

    prompt = f"""
You are the Carbon Roast Intelligence Agent.
Your job is to roast a software repository based on REAL quantitative static analysis metrics.

=== INTEGRITY MANDATE ===
- DO NOT invent, hallucinate, or alter any numbers. Every number must match the facts below.
- Do NOT use profanity or attack developers personally. Attack the code, architecture, and engineering decisions.
- Overall score and grade are DETERMINISTIC and FINAL: Score={overall_score}, Grade={grade}.
- Severity mode: {personality}.

=== VERIFIED CODEBASE FACTS ===
- Overall Score: {overall_score}/100
- Grade: {grade}
- Total Files: {canonical_stats['total_files']}
- Total LOC: {canonical_stats['total_loc']}
- Languages: {lang_summary}
- Test-to-Code Ratio: {canonical_stats['test_ratio']}
- Security Issues Count: {canonical_stats['security_issues']}
- God Files Count: {canonical_stats['god_files_count']}
- Circular Dependencies Count: {canonical_stats['circular_deps_count']}

God Files:
{god_summary}

Circular Dependencies:
{circ_summary}

Utils Dumping Grounds:
{utils_summary}

Security Findings:
{sec_summary}

Worst Offender:
- File: {worst_offender['file']}
- Metric: {worst_offender['metric']}
- Reason: {worst_offender['reason']}

=== PERSONALITY GUIDELINES ===
{tone_instruction}

=== REQUIRED JSON OUTPUT SCHEMA ===
You must respond with ONLY a single valid JSON object. No explanation, no markdown outside the JSON.
Schema:
{{
  "overall_score": {overall_score},
  "grade": "{grade}",
  "title": "<Witty punchy title>",
  "roast": "<One solid paragraph roasting the codebase according to the requested tone, mentioning verified metrics>",
  "severity": "{personality}",
  "worst_offender": {{
    "file": "{worst_offender['file']}",
    "metric": "{worst_offender['metric']}",
    "reason": "{worst_offender['reason']}"
  }},
  "top_crimes": [
    {{
      "crime": "<Short crime name>",
      "file": "<Path to file>",
      "evidence": "<Factual metric evidence>",
      "roast": "<Witty one-line roast of this specific crime>",
      "fix": "<Actionable remediation instruction>"
    }}
  ],
  "stats": {{
    "total_files": {canonical_stats['total_files']},
    "total_loc": {canonical_stats['total_loc']},
    "god_files_count": {canonical_stats['god_files_count']},
    "circular_deps_count": {canonical_stats['circular_deps_count']},
    "test_ratio": "{canonical_stats['test_ratio']}",
    "security_issues": {canonical_stats['security_issues']}
  }},
  "fixes": [
    {{
      "priority": "<CRITICAL|HIGH|MEDIUM>",
      "title": "<Fix Title>",
      "file": "{worst_offender['file']}",
      "action": "<Concrete architectural remediation>"
    }}
  ],
  "share_text": "<Prepopulated tweet: score, grade, quote, and https://carbon.dev/roast>"
}}
"""
    return redact_secrets(prompt.strip())


# ── Schema Sanitizer & Enforcer ────────────────────────────────

def sanitize_and_validate_roast(
    payload: Dict[str, Any],
    overall_score: int,
    grade: str,
    personality: str,
    canonical_stats: Dict[str, Any],
    worst_offender: Dict[str, str],
    fallback_payload: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Validates the parsed LLM payload against the strict schema.
    Enforces deterministic properties (score, grade, canonical stats, worst offender)
    and redacts all string contents.
    """
    if not isinstance(payload, dict):
        return fallback_payload

    # Enforce deterministic invariants
    clean = dict(payload)
    clean["overall_score"] = int(overall_score)
    clean["grade"] = grade if grade in ALLOWED_GRADES else fallback_payload["grade"]
    clean["severity"] = personality if personality in ALLOWED_SEVERITIES else DEFAULT_SEVERITY
    clean["stats"] = dict(canonical_stats)

    # Title & Roast
    title = str(clean.get("title") or fallback_payload["title"]).strip()
    roast_text = str(clean.get("roast") or fallback_payload["roast"]).strip()
    clean["title"] = redact_secrets(title)
    clean["roast"] = redact_secrets(roast_text)

    # Worst Offender: 'file' must remain the canonical deterministic worst offender
    raw_wo = clean.get("worst_offender")
    clean["worst_offender"] = {
        "file": worst_offender["file"],
        "metric": redact_secrets(str(raw_wo.get("metric") if isinstance(raw_wo, dict) and raw_wo.get("metric") else worst_offender["metric"])),
        "reason": redact_secrets(str(raw_wo.get("reason") if isinstance(raw_wo, dict) and raw_wo.get("reason") else worst_offender["reason"])),
    }

    # Top Crimes
    raw_crimes = clean.get("top_crimes")
    valid_crimes: List[Dict[str, str]] = []
    if isinstance(raw_crimes, list) and raw_crimes:
        for c in raw_crimes:
            if isinstance(c, dict) and all(k in c for k in ("crime", "file", "evidence", "roast", "fix")):
                valid_crimes.append({
                    "crime": redact_secrets(str(c["crime"])),
                    "file": redact_secrets(str(c["file"])),
                    "evidence": redact_secrets(str(c["evidence"])),
                    "roast": redact_secrets(str(c["roast"])),
                    "fix": redact_secrets(str(c["fix"])),
                })
    if not valid_crimes:
        clean["top_crimes"] = fallback_payload["top_crimes"]
    else:
        clean["top_crimes"] = valid_crimes

    # Fixes: Ensure fixes[0]["file"] maps to worst_offender["file"]
    raw_fixes = clean.get("fixes")
    valid_fixes: List[Dict[str, str]] = []
    if isinstance(raw_fixes, list) and raw_fixes:
        for f in raw_fixes:
            if isinstance(f, dict) and all(k in f for k in ("priority", "title", "file", "action")):
                prio = str(f["priority"]).upper()
                if prio not in ("CRITICAL", "HIGH", "MEDIUM"):
                    prio = "HIGH" if overall_score < 50 else "MEDIUM"
                valid_fixes.append({
                    "priority": prio,
                    "title": redact_secrets(str(f["title"])),
                    "file": redact_secrets(str(f["file"])),
                    "action": redact_secrets(str(f["action"])),
                })

    if not valid_fixes:
        clean["fixes"] = fallback_payload["fixes"]
    else:
        # Guarantee top fix targets worst offender file
        wo_target_file = clean["worst_offender"]["file"]
        if valid_fixes[0]["file"] != wo_target_file:
            matching_idx = next((i for i, f in enumerate(valid_fixes) if f["file"] == wo_target_file), None)
            if matching_idx is not None:
                item = valid_fixes.pop(matching_idx)
                valid_fixes.insert(0, item)
            else:
                valid_fixes.insert(0, fallback_payload["fixes"][0])
        clean["fixes"] = valid_fixes

    # Share Text
    share_text = str(clean.get("share_text") or "").strip()
    if not share_text or str(overall_score) not in share_text or clean["grade"] not in share_text:
        quote_snippet = clean["roast"].split(".")[0].strip()
        if len(quote_snippet) > 80:
            quote_snippet = quote_snippet[:77] + "..."
        share_text = (
            f"My codebase just got roasted by Carbon: {overall_score}/100 ({clean['grade']}). "
            f"'{quote_snippet}.' Check your roast: https://carbon.dev/roast"
        )
    clean["share_text"] = redact_secrets(share_text)

    # Final check of all required keys
    missing = REQUIRED_ROAST_KEYS - set(clean.keys())
    if missing:
        for k in missing:
            clean[k] = fallback_payload[k]

    return clean


# ── Main Entrypoint: generate_roast ───────────────────────────

def generate_roast(
    metrics: Union[RoastMetrics, Dict[str, Any]],
    personality: str = "SAVAGE",
    llm_client: Optional[Any] = None
) -> Dict[str, Any]:
    """
    Generates a structured, evidence-backed codebase roast conforming to PROJECT.md §9.

    Args:
        metrics: RoastMetrics instance or metrics dictionary.
        personality: 'LIGHT' | 'SAVAGE' | 'BRUTAL' (default: 'SAVAGE').
        llm_client: Optional custom LLM client or callable. If None, uses generate_with_retry.

    Returns:
        Dict conforming strictly to the PROJECT.md Section 9 JSON Output Schema.
    """
    # 1. Normalize personality
    p_upper = str(personality).upper().strip()
    chosen_personality = p_upper if p_upper in ALLOWED_SEVERITIES else DEFAULT_SEVERITY

    # 2. Coerce metrics and compute deterministic score
    metrics_dict = _coerce_metrics_dict(metrics)
    overall_score, grade = calculate_deterministic_score(metrics_dict)
    overall_score = max(0, min(100, int(overall_score)))

    # 3. Canonical stats and worst offender
    scale = metrics_dict.get("scale") or {}
    arch = metrics_dict.get("architecture") or {}
    testing = metrics_dict.get("testing") or {}
    sec = metrics_dict.get("security") or {}

    canonical_stats = {
        "total_files": int(scale.get("total_files") or 0),
        "total_loc": int(scale.get("total_loc") or 0),
        "god_files_count": int(len(arch.get("god_files") or [])),
        "circular_deps_count": int(len(arch.get("circular_dependencies") or [])),
        "test_ratio": str(testing.get("test_ratio_percentage") or "0.0%"),
        "security_issues": int(len(sec.get("findings") or [])),
    }

    worst_offender = identify_worst_offender(metrics_dict)

    # 4. Prepare fallback payload
    fallback_payload = synthesize_deterministic_roast(
        metrics_dict=metrics_dict,
        personality=chosen_personality,
        overall_score=overall_score,
        grade=grade
    )

    # 5. Build prompt
    prompt = build_roast_prompt(
        metrics_dict=metrics_dict,
        personality=chosen_personality,
        overall_score=overall_score,
        grade=grade,
        worst_offender=worst_offender,
        canonical_stats=canonical_stats
    )

    # 6. Invoke LLM with multi-tier error handling
    raw_response = None
    try:
        if llm_client is not None:
            if callable(llm_client):
                raw_response = llm_client(prompt)
            elif hasattr(llm_client, "generate_with_retry"):
                raw_response = llm_client.generate_with_retry(prompt)
            elif hasattr(llm_client, "generate"):
                raw_response = llm_client.generate(prompt)
            elif hasattr(llm_client, "generate_content"):
                resp = llm_client.generate_content(prompt)
                raw_response = getattr(resp, "text", str(resp))
            else:
                raw_response = str(llm_client)
        elif generate_with_retry is not None:
            raw_response = generate_with_retry(prompt)
    except Exception as e:
        logger.warning(f"[ROAST AGENT] LLM call failed ({e}); engaging deterministic fallback.")
        return fallback_payload

    if not raw_response or not isinstance(raw_response, str) or not raw_response.strip():
        logger.info("[ROAST AGENT] Empty LLM response; returning deterministic fallback.")
        return fallback_payload

    # 7. Clean Markdown fences and parse JSON
    cleaned = raw_response.strip()
    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```[a-zA-Z]*\n", "", cleaned)
        cleaned = re.sub(r"\n```$", "", cleaned)
        cleaned = cleaned.strip()

    # Sometimes models include preamble or postamble text
    try:
        parsed_payload = json.loads(cleaned)
    except json.JSONDecodeError:
        json_match = re.search(r"(\{.*\})", cleaned, re.DOTALL)
        if json_match:
            try:
                parsed_payload = json.loads(json_match.group(1))
            except json.JSONDecodeError:
                logger.warning("[ROAST AGENT] JSON extraction failed; engaging deterministic fallback.")
                return fallback_payload
        else:
            logger.warning("[ROAST AGENT] Malformed JSON from LLM; engaging deterministic fallback.")
            return fallback_payload

    # 8. Sanitize, validate schema, enforce deterministic invariants and secrets redaction
    final_payload = sanitize_and_validate_roast(
        payload=parsed_payload,
        overall_score=overall_score,
        grade=grade,
        personality=chosen_personality,
        canonical_stats=canonical_stats,
        worst_offender=worst_offender,
        fallback_payload=fallback_payload
    )

    return final_payload


# ── Backwards-Compatible run() Function ────────────────────────

def run(
    files_dict: Dict[str, str],
    architecture_info: Optional[Dict[str, Any]] = None,
    security_info: Optional[Dict[str, Any]] = None,
    graph_stats: Optional[Dict[str, Any]] = None,
    personality: str = "SAVAGE"
) -> Dict[str, Any]:
    """
    Backwards-compatible interface for existing endpoints (e.g. main.py).
    Extracts RoastMetrics and delegates to generate_roast.
    """
    metrics = extract_roast_metrics("", files_dict=files_dict)
    return generate_roast(metrics, personality=personality)
