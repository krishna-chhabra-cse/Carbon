# ============================================================
#  tools/security_redactor.py
#
#  Secret Redaction Layer for Carbon AI.
#  Ensures credentials, private keys, database URIs, and tokens
#  are sanitized before passing into LLM prompts or output JSON.
# ============================================================

import re
from typing import List, Dict, Any, Optional

try:
    from tools.security_scanner import SECRET_PATTERNS
except ImportError:
    from security_scanner import SECRET_PATTERNS

REDACTION_TOKEN = "[REDACTED_SECRET]"


def redact_secrets(text: str, patterns: Optional[List[Dict[str, Any]]] = None) -> str:
    """
    Scans text against secret regex patterns from SECRET_PATTERNS
    and replaces matched values with '[REDACTED_SECRET]'.

    Args:
        text: Source code snippet, log line, or finding description.
        patterns: Optional custom regex pattern list; defaults to SECRET_PATTERNS.

    Returns:
        str: Sanitized text with all secret values masked.
    """
    if not text or not isinstance(text, str):
        return text if text is not None else ""

    rules = patterns if patterns is not None else SECRET_PATTERNS
    redacted = text

    for rule in rules:
        regex_pattern = rule.get("regex")
        if not regex_pattern:
            continue
        try:
            redacted = re.sub(regex_pattern, REDACTION_TOKEN, redacted, flags=re.IGNORECASE)
        except re.error:
            continue

    return redacted


def is_secret_present(text: str, patterns: Optional[List[Dict[str, Any]]] = None) -> bool:
    """
    Returns True if text contains any pattern matching secret detection rules.
    """
    if not text or not isinstance(text, str):
        return False

    rules = patterns if patterns is not None else SECRET_PATTERNS
    for rule in rules:
        regex_pattern = rule.get("regex")
        if not regex_pattern:
            continue
        try:
            if re.search(regex_pattern, text, flags=re.IGNORECASE):
                return True
        except re.error:
            continue

    return False


def redact_security_findings(findings: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Sanitizes security finding snippets, descriptions, titles, and remediations
    so sensitive secrets are never leaked into LLM prompts, storage, or JSON responses.

    Args:
        findings: List of security findings dictionaries from security_scanner.

    Returns:
        List[Dict[str, Any]]: New list of findings with secret values redacted.
    """
    if not findings:
        return []

    sanitized_findings = []
    text_fields = ("snippet", "description", "message", "title", "remediation", "context")

    for finding in findings:
        if not isinstance(finding, dict):
            continue

        item = dict(finding)
        for field in text_fields:
            if field in item and isinstance(item[field], str):
                item[field] = redact_secrets(item[field])

        sanitized_findings.append(item)

    return sanitized_findings
