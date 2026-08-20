# ============================================================
#  tools/security_scanner.py — DevSecOps Static Taint & Secret Scanner
# ============================================================

import re
from typing import Dict, List, Any

# Regex patterns for credential & secret leakage
SECRET_PATTERNS = [
    {
        "id": "SEC-001",
        "title": "Hardcoded AWS Access Key",
        "severity": "CRITICAL",
        "regex": r"(?:A3T[A-Z0-9]|AKIA|AGPA|AIDA|AROA|AIPA|ANPA|ANVA|ASIA)[A-Z0-9]{16}",
        "remediation": "Store AWS credentials in environment variables or AWS Secrets Manager."
    },
    {
        "id": "SEC-002",
        "title": "Hardcoded Private Key / Secret Token",
        "severity": "CRITICAL",
        "regex": r"(?:jwt_secret|jwt_key|private_key|secret_key|api_secret)\s*[:=]\s*['\"][a-zA-Z0-9_\-!@#$%^&*]{8,}['\"]",
        "remediation": "Move secret key to a secure .env file accessed via process.env or os.getenv()."
    },
    {
        "id": "SEC-003",
        "title": "Exposed Database Connection URI with Credentials",
        "severity": "HIGH",
        "regex": r"(?:postgres|mysql|mongodb(?:\+srv)?|redis)://[a-zA-Z0-9_\-]+:[a-zA-Z0-9_\-!@#$%^&*]+@[a-zA-Z0-9._\-]+",
        "remediation": "Replace raw database credentials with process.env.DATABASE_URL."
    },
    {
        "id": "SEC-004",
        "title": "Exposed Payment Gateway Secret (Stripe/PayPal)",
        "severity": "CRITICAL",
        "regex": r"(?:sk_live|sk_test|pk_live)_[0-9a-zA-Z]{24,}",
        "remediation": "Never commit payment gateway private keys into source control."
    },
    {
        "id": "SEC-005",
        "title": "Google / Firebase API Key in Server Code",
        "severity": "MEDIUM",
        "regex": r"AIzaSy[a-zA-Z0-9_\-]{33}",
        "remediation": "Restrict API key scopes in Google Cloud Console and load from environment."
    }
]

# Regex patterns for OWASP Top 10 code-level taint vulnerabilities
OWASP_PATTERNS = [
    {
        "id": "VULN-001",
        "title": "SQL / NoSQL Injection Risk (Unsanitized Query Interpolation)",
        "severity": "HIGH",
        "regex": r"(?:SELECT|INSERT|UPDATE|DELETE|FROM)\s+.*(?:\$\{|f['\"]).*(?:req\.|params|query|body)",
        "remediation": "Use parameterized queries or ORM query builders (e.g. Prisma, Mongoose, TypeORM) instead of string concatenation."
    },
    {
        "id": "VULN-002",
        "title": "Dangerous Dynamic Code Execution (eval / exec)",
        "severity": "CRITICAL",
        "regex": r"(?<![\w.])(?:eval|exec|Function)\s*\(\s*(?:req\.|params|body|[a-zA-Z0-9_$]+)",
        "remediation": "Avoid eval() and exec(). Use safe structured parsers like JSON.parse() or dedicated AST validators."
    },
    {
        "id": "VULN-003",
        "title": "Overly Permissive CORS Configuration (Wildcard Origin)",
        "severity": "MEDIUM",
        "regex": r"(?:cors\(\s*\{\s*origin\s*:\s*['\"]\*['\"]|Access-Control-Allow-Origin['\"]\s*,\s*['\"]\*['\"])",
        "remediation": "Specify an explicit list of trusted origin domains in CORS options instead of wildcard '*'."
    },
    {
        "id": "VULN-004",
        "title": "Plaintext Password Storage without Cryptographic Hashing",
        "severity": "HIGH",
        "regex": r"(?:password\s*:\s*req\.body\.password|\.create\(\s*\{[^}]*password\s*:\s*(?!await\s+bcrypt|hash))",
        "remediation": "Always hash passwords with bcrypt or Argon2 with a minimum salt rounds of 10 before saving."
    },
    {
        "id": "VULN-005",
        "title": "Insecure Cookie Settings (Missing HttpOnly / Secure Flags)",
        "severity": "LOW",
        "regex": r"res\.cookie\([^)]*(?:httpOnly\s*:\s*false|secure\s*:\s*false)",
        "remediation": "Enable { httpOnly: true, secure: true, sameSite: 'strict' } on session cookies to prevent XSS cookie theft."
    }
]

def scan_file_for_vulnerabilities(file_path: str, content: str) -> List[Dict[str, Any]]:
    """Scans a single file's content against security rules."""
    findings = []
    lines = content.split('\n')

    # 1. Scan for Secrets
    for rule in SECRET_PATTERNS:
        for idx, line in enumerate(lines):
            match = re.search(rule["regex"], line, re.IGNORECASE)
            if match:
                findings.append({
                    "ruleId": rule["id"],
                    "title": rule["title"],
                    "severity": rule["severity"],
                    "filePath": file_path,
                    "lineNumber": idx + 1,
                    "snippet": line.strip()[:100],
                    "remediation": rule["remediation"],
                    "category": "Secret Leakage"
                })

    # 2. Scan for OWASP Vulnerabilities
    for rule in OWASP_PATTERNS:
        for idx, line in enumerate(lines):
            match = re.search(rule["regex"], line, re.IGNORECASE)
            if match:
                findings.append({
                    "ruleId": rule["id"],
                    "title": rule["title"],
                    "severity": rule["severity"],
                    "filePath": file_path,
                    "lineNumber": idx + 1,
                    "snippet": line.strip()[:100],
                    "remediation": rule["remediation"],
                    "category": "OWASP Vulnerability"
                })

    return findings

def calculate_security_grade(findings: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Calculates overall security grade and summary stats."""
    critical_count = sum(1 for f in findings if f["severity"] == "CRITICAL")
    high_count = sum(1 for f in findings if f["severity"] == "HIGH")
    medium_count = sum(1 for f in findings if f["severity"] == "MEDIUM")
    low_count = sum(1 for f in findings if f["severity"] == "LOW")

    # Grading algorithm
    if critical_count > 0:
        grade = "F"
        badge_color = "red"
        status_text = "Critical Security Vulnerabilities Detected"
    elif high_count >= 2:
        grade = "D"
        badge_color = "orange"
        status_text = "High Risk Findings Identified"
    elif high_count == 1 or medium_count >= 2:
        grade = "C"
        badge_color = "yellow"
        status_text = "Moderate Security Concerns"
    elif medium_count == 1 or low_count > 0:
        grade = "B"
        badge_color = "blue"
        status_text = "Good Security Posture with Minor Suggestions"
    else:
        grade = "A+"
        badge_color = "green"
        status_text = "Excellent Security Posture (Zero Known Flaws)"

    return {
        "grade": grade,
        "badgeColor": badge_color,
        "statusText": status_text,
        "totalFindings": len(findings),
        "critical": critical_count,
        "high": high_count,
        "medium": medium_count,
        "low": low_count
    }

def run_security_audit(files_dict: Dict[str, str]) -> Dict[str, Any]:
    """
    Executes full static security audit across all files in repository.
    """
    all_findings = []
    for file_path, content in files_dict.items():
        findings = scan_file_for_vulnerabilities(file_path, content)
        all_findings.extend(findings)

    # Sort findings by severity: CRITICAL -> HIGH -> MEDIUM -> LOW
    severity_order = {"CRITICAL": 0, "HIGH": 1, "MEDIUM": 2, "LOW": 3}
    all_findings.sort(key=lambda x: severity_order.get(x["severity"], 99))

    scorecard = calculate_security_grade(all_findings)

    return {
        "scorecard": scorecard,
        "findings": all_findings,
        "totalScannedFiles": len(files_dict)
    }
