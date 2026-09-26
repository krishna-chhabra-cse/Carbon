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

# ── Extended Security Rules (CWE-mapped) ──────────────────────

INJECTION_PATTERNS = [
    {
        "id": "VULN-006", "title": "Command Injection (child_process with user input)",
        "severity": "CRITICAL", "cwe": "CWE-78",
        "regex": r"(?:exec|execSync|spawn|spawnSync)\s*\(\s*(?:req\.|params|query|body|`)",
        "remediation": "Use parameterized commands or a safe wrapper. Never pass user input directly to shell commands."
    },
    {
        "id": "VULN-007", "title": "Server-Side Template Injection (SSTI)",
        "severity": "HIGH", "cwe": "CWE-1336",
        "regex": r"(?:render|template|Jinja2|nunjucks|handlebars)\s*\(.*(?:req\.|params|query|body)",
        "remediation": "Use auto-escaping templates and never pass raw user input into template strings."
    },
    {
        "id": "VULN-008", "title": "NoSQL Operator Injection ($gt, $ne, $regex)",
        "severity": "HIGH", "cwe": "CWE-943",
        "regex": r"(?:find|findOne|aggregate|updateOne)\s*\(\s*\{[^}]*(?:req\.body|req\.query|req\.params)",
        "remediation": "Validate and sanitize MongoDB query parameters. Use mongo-sanitize or explicit field extraction."
    },
    {
        "id": "VULN-009", "title": "Log Injection (unsanitized user input in logs)",
        "severity": "MEDIUM", "cwe": "CWE-117",
        "regex": r"(?:console\.log|logger\.info|logger\.error|logging\.info)\s*\(.*(?:req\.|params|query|body)",
        "remediation": "Sanitize log inputs by stripping newlines and control characters before logging."
    },
]

AUTH_PATTERNS = [
    {
        "id": "AUTH-001", "title": "Weak JWT Algorithm (none/HS256 without key rotation)",
        "severity": "HIGH", "cwe": "CWE-327",
        "regex": r"jwt\.sign\s*\([^)]*algorithm\s*:\s*['\"](?:none|HS256)['\"]",
        "remediation": "Use RS256 or ES256 with rotating keys. Never use 'none' algorithm."
    },
    {
        "id": "AUTH-002", "title": "Missing Token Expiration",
        "severity": "MEDIUM", "cwe": "CWE-613",
        "regex": r"jwt\.sign\s*\([^)]*\)\s*(?!.*(?:expiresIn|exp))",
        "remediation": "Always set expiresIn (e.g., '1h') when signing JWT tokens."
    },
    {
        "id": "AUTH-003", "title": "Password in URL Parameters",
        "severity": "HIGH", "cwe": "CWE-598",
        "regex": r"(?:req\.query\.password|req\.params\.password|\?.*password=)",
        "remediation": "Never transmit passwords via URL parameters. Use POST request body over HTTPS."
    },
    {
        "id": "AUTH-004", "title": "Default Admin Credentials",
        "severity": "CRITICAL", "cwe": "CWE-798",
        "regex": r"(?:admin|root|administrator)\s*[:=]\s*['\"](?:admin|password|123456|root)['\"]",
        "remediation": "Remove default credentials. Require secure password setup on first run."
    },
]

CONFIG_PATTERNS = [
    {
        "id": "CFG-001", "title": "Debug Mode Enabled in Production Code",
        "severity": "MEDIUM", "cwe": "CWE-489",
        "regex": r"(?:DEBUG\s*=\s*True|NODE_ENV\s*[:=]\s*['\"]development['\"]|app\.debug\s*=\s*True)",
        "remediation": "Ensure DEBUG/development mode is disabled in production configuration."
    },
    {
        "id": "CFG-002", "title": "Stack Trace Exposed in Error Response",
        "severity": "MEDIUM", "cwe": "CWE-209",
        "regex": r"res\.(?:json|send)\s*\(\s*(?:err|error)\.(?:stack|message)\s*\)",
        "remediation": "Log errors server-side but return generic error messages to clients."
    },
    {
        "id": "CFG-003", "title": "Missing Security Headers (Helmet)",
        "severity": "LOW", "cwe": "CWE-693",
        "regex": r"app\.use\((?!.*helmet).*(?:express\.static|cors)\)",
        "remediation": "Add app.use(helmet()) before other middleware for security headers."
    },
    {
        "id": "CFG-004", "title": "Exposed .env or Credentials File in Static Serving",
        "severity": "CRITICAL", "cwe": "CWE-552",
        "regex": r"express\.static\s*\(\s*['\"]\./?['\"]|serveStatic\s*\(\s*['\"]\./?['\"]",
        "remediation": "Never serve the project root as static files. Use a specific public/ directory."
    },
]

CRYPTO_PATTERNS = [
    {
        "id": "CRYPTO-001", "title": "Weak Hashing Algorithm (MD5/SHA1 for passwords)",
        "severity": "HIGH", "cwe": "CWE-328",
        "regex": r"(?:md5|sha1|SHA1|MD5)\s*\(|createHash\s*\(\s*['\"](?:md5|sha1)['\"]",
        "remediation": "Use bcrypt, scrypt, or Argon2 for password hashing. Use SHA-256+ for integrity checks."
    },
    {
        "id": "CRYPTO-002", "title": "Math.random() Used for Security-Sensitive Operations",
        "severity": "MEDIUM", "cwe": "CWE-330",
        "regex": r"Math\.random\s*\(\s*\).*(?:token|secret|key|password|session|nonce|csrf)",
        "remediation": "Use crypto.randomBytes() or crypto.randomUUID() for security-sensitive random values."
    },
]

DATA_PATTERNS = [
    {
        "id": "DATA-001", "title": "Potential PII in Logs (Email/SSN patterns)",
        "severity": "MEDIUM", "cwe": "CWE-532",
        "regex": r"(?:console\.log|logger)\s*\(.*(?:email|ssn|social_security|credit_card|password)",
        "remediation": "Redact or mask PII fields before logging. Use structured logging with field-level redaction."
    },
    {
        "id": "DATA-002", "title": "Sensitive Data in URL Query Parameters",
        "severity": "MEDIUM", "cwe": "CWE-598",
        "regex": r"\?(?:.*&)?(?:token|api_key|secret|password|ssn)=",
        "remediation": "Send sensitive data in request body or headers, never in URL query strings."
    },
]

def scan_file_for_vulnerabilities(file_path: str, content: str) -> List[Dict[str, Any]]:
    """Scans a single file's content against security rules."""
    findings = []
    lines = content.split('\n')

    ALL_RULES = [
        (SECRET_PATTERNS, "Secret Leakage"),
        (OWASP_PATTERNS, "OWASP Vulnerability"),
        (INJECTION_PATTERNS, "Injection"),
        (AUTH_PATTERNS, "Authentication"),
        (CONFIG_PATTERNS, "Configuration"),
        (CRYPTO_PATTERNS, "Cryptography"),
        (DATA_PATTERNS, "Data Exposure"),
    ]

    for rule_set, category in ALL_RULES:
        for rule in rule_set:
            for idx, line in enumerate(lines):
                match = re.search(rule["regex"], line, re.IGNORECASE)
                if match:
                    findings.append({
                        "ruleId": rule["id"],
                        "title": rule["title"],
                        "severity": rule["severity"],
                        "cwe": rule.get("cwe", ""),
                        "filePath": file_path,
                        "lineNumber": idx + 1,
                        "snippet": line.strip()[:100],
                        "remediation": rule["remediation"],
                        "category": category,
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

def export_sarif(findings: list, tool_version: str = "2.0.0") -> dict:
    """Exports findings in SARIF v2.1.0 format for GitHub Security tab."""
    severity_map = {"CRITICAL": "error", "HIGH": "error", "MEDIUM": "warning", "LOW": "note"}

    rules = {}
    results = []

    for f in findings:
        rule_id = f["ruleId"]
        if rule_id not in rules:
            rules[rule_id] = {
                "id": rule_id,
                "name": f["title"].replace(" ", ""),
                "shortDescription": {"text": f["title"]},
                "helpUri": f"https://cwe.mitre.org/data/definitions/{f.get('cwe', '').replace('CWE-', '')}.html" if f.get("cwe") else "",
                "properties": {"tags": [f.get("cwe", ""), f["category"]]}
            }

        results.append({
            "ruleId": rule_id,
            "level": severity_map.get(f["severity"], "note"),
            "message": {"text": f"{f['title']}: {f['remediation']}"},
            "locations": [{
                "physicalLocation": {
                    "artifactLocation": {"uri": f["filePath"]},
                    "region": {"startLine": f["lineNumber"]}
                }
            }]
        })

    return {
        "$schema": "https://json.schemastore.org/sarif-2.1.0.json",
        "version": "2.1.0",
        "runs": [{
            "tool": {
                "driver": {
                    "name": "Carbon Security Scanner",
                    "version": tool_version,
                    "rules": list(rules.values())
                }
            },
            "results": results
        }]
    }
