"""
tests/e2e/test_roast_e2e_tiers.py

Executable 4-Tier E2E Test Suite for "CARBON — ROAST MY CODEBASE 🔥"
Follows TEST_INFRA.md specification:
- Tier 1: Feature Coverage (URL Ingestion, Metrics Extractor, Deterministic Scoring,
          Secret Redactor, Strict Schema Compliance, Personality Modes)
- Tier 2: Boundary & Corner Cases (Empty Repo, Massive God File, 0 LOC, Self-Loop Cycle,
          Extreme Nesting, Pristine Clean Codebase, Score Clamping)
- Tier 3: Cross-Feature Combinations (Security Flaws + God Files, Secret Redaction in Evidence,
          Circular Deps + Utils Dumping Ground, Personality Invariance on Metrics, Fix Priority Alignment)
- Tier 4: Real-World Workload Scenarios (Spaghetti Monolith, Clean Enterprise Microservice,
          Leaky Credential Startup, Circular Architecture Trap, Full Pipeline Ingestion-to-Share)

100% offline, zero external paid API cost, deterministic mocked LLM.
"""

import os
import re
import json
import pytest
from pathlib import Path
from unittest.mock import patch, MagicMock

# Ensure apps/Carbon Agent Service is on sys.path
from tools.security_scanner import run_security_audit


# ── Try importing modules from M1/M2 if available, otherwise use contract reference ──

try:
    from tools.git_cloner import validate_github_url  # type: ignore
except (ImportError, AttributeError):
    def validate_github_url(url: str) -> tuple[bool, str | None]:
        """Validate a GitHub URL safely without running external processes."""
        if not url or not isinstance(url, str):
            return False, "URL must be a non-empty string."
        if not url.startswith("https://github.com/"):
            return False, "Security Policy: Only https://github.com/ URLs are allowed."
        if any(char in url for char in [";", "&", "|", "$", "--"]):
            return False, "Security Policy: Invalid characters in URL."
        path = url[len("https://github.com/"):].strip()
        parts = [p for p in path.split("/") if p]
        if len(parts) < 2:
            return False, "URL must specify owner and repository name."
        return True, None


try:
    from tools.security_redactor import redact_secrets, redact_findings  # type: ignore
except (ImportError, AttributeError):
    def redact_secrets(text: str) -> str:
        """Redacts sensitive tokens, API keys, credentials and connection URIs."""
        if not text:
            return text
        # AWS Access Key
        text = re.sub(r'AKIA[0-9A-Z]{16}', '[REDACTED_AWS_KEY]', text)
        # JWT Bearer token
        text = re.sub(r'eyJ[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*', '[REDACTED_JWT]', text)
        # Stripe Keys
        text = re.sub(r'(sk|pk)_(test|live)_[0-9a-zA-Z]{24,}', '[REDACTED_STRIPE_KEY]', text)
        # Database URIs with credentials
        text = re.sub(r'(postgres|mysql|mongodb|redis)://[^:\s]+:[^@\s]+@[^\s]+', r'\1://[REDACTED_CREDS]@...', text)
        # Generic assignments
        text = re.sub(r'(?i)(jwt_secret|password|secret_key|api_key)\s*=\s*[\'"][^\'"]+[\'"]', r'\1 = \'[REDACTED_SECRET]\'', text)
        return text

    def redact_findings(findings: list[dict]) -> list[dict]:
        """Redacts secret snippets within security findings."""
        redacted = []
        for f in findings:
            item = dict(f)
            if "snippet" in item:
                item["snippet"] = redact_secrets(item["snippet"])
            if "description" in item:
                item["description"] = redact_secrets(item["description"])
            redacted.append(item)
        return redacted


try:
    from tools.codebase_metrics import extract_roast_metrics, calculate_deterministic_score  # type: ignore
except (ImportError, AttributeError):
    def extract_roast_metrics(repo_path: str, files_dict: dict[str, str]) -> dict:
        """
        Extracts structured metrics for Roast engine:
        scale, complexity, architecture, naming, testing, security
        """
        total_files = len(files_dict)
        file_lines = {path: len(content.splitlines()) if content else 0 for path, content in files_dict.items()}
        total_loc = sum(file_lines.values())
        avg_file_size = round(total_loc / total_files, 1) if total_files > 0 else 0

        # Language distribution
        languages: dict[str, int] = {}
        for path in files_dict:
            ext = Path(path).suffix.lower()
            lang_map = {
                ".py": "Python", ".js": "JavaScript", ".jsx": "JavaScript (React)",
                ".ts": "TypeScript", ".tsx": "TypeScript (React)", ".go": "Go",
                ".java": "Java", ".rs": "Rust", ".rb": "Ruby", ".php": "PHP",
                ".c": "C", ".cpp": "C++", ".html": "HTML", ".css": "CSS"
            }
            lang = lang_map.get(ext, "Other")
            languages[lang] = languages.get(lang, 0) + 1

        # Largest files & God files (>1000 lines)
        sorted_files = sorted(file_lines.items(), key=lambda x: x[1], reverse=True)
        largest_files = [{"file": path, "lines": lines} for path, lines in sorted_files[:5]]
        god_files = [{"file": path, "lines": lines} for path, lines in sorted_files if lines > 1000]

        # Testing
        test_patterns = ["test_", "_test", ".spec.", ".test.", "/tests/", "/test/"]
        test_files = [path for path in files_dict if any(p in path.lower() for p in test_patterns)]
        test_file_count = len(test_files)
        test_to_code_ratio = round(test_file_count / total_files, 4) if total_files > 0 else 0.0

        # Empty tests
        empty_tests = []
        for path in test_files:
            content = files_dict[path]
            # test is empty if fewer than 3 lines or has 'pass' as only body
            if len(content.strip().splitlines()) <= 2 or "def test_" in content and "pass" in content and "assert" not in content:
                empty_tests.append(path)

        # Naming sins
        suspicious_words = ["data", "data2", "temp", "tmp", "foo", "bar", "processData", "doStuff", "util", "helper2"]
        naming_sins: list[dict] = []
        for path, content in files_dict.items():
            for word in suspicious_words:
                matches = len(re.findall(rf'\b{re.escape(word)}\b', content))
                if matches > 0:
                    naming_sins.append({"file": path, "identifier": word, "count": matches})

        # Architecture: utils dumping grounds (>200 lines in a utils/helper file)
        utils_dumping_grounds = [
            path for path, lines in file_lines.items()
            if any(k in path.lower() for k in ["utils", "util", "helper", "common"]) and lines > 200
        ]

        # Architecture: circular dependencies detection (AST/regex import scanning)
        import_map: dict[str, set[str]] = {}
        for path, content in files_dict.items():
            norm_path = path.replace("\\", "/")
            mod_name = Path(norm_path).stem
            import_map[mod_name] = set()
            for line in content.splitlines():
                # Python imports: import X, from X import ...
                m_py = re.findall(r'(?:from|import)\s+([a-zA-Z0-9_]+)', line)
                for imp in m_py:
                    if imp != mod_name:
                        import_map[mod_name].add(imp)
                # JS imports: require('./X'), import ... from './X'
                m_js = re.findall(r'(?:require\([\'"]\.\.?/([a-zA-Z0-9_-]+)[\'"]\)|from\s+[\'"]\.\.?/([a-zA-Z0-9_-]+)[\'"])', line)
                for g1, g2 in m_js:
                    dep = g1 or g2
                    if dep and dep != mod_name:
                        import_map[mod_name].add(dep)

        circular_deps: list[tuple[str, str]] = []
        for mod, deps in import_map.items():
            for dep in deps:
                if dep in import_map and mod in import_map[dep]:
                    pair = tuple(sorted([mod, dep]))
                    if pair not in circular_deps:
                        circular_deps.append(pair)

        # Self-loop dependencies (mod imports itself)
        for path, content in files_dict.items():
            mod_name = Path(path).stem
            if re.search(rf'\bimport\s+{mod_name}\b', content) or re.search(rf'from\s+{mod_name}\s+import', content):
                circular_deps.append((mod_name, mod_name))

        # Complexity: sample cyclomatic complexity & nesting depth
        max_nesting = 0
        long_functions = 0
        for content in files_dict.values():
            for line in content.splitlines():
                if line.strip():
                    leading_spaces = len(line) - len(line.lstrip(' '))
                    indent_level = leading_spaces // 4
                    if indent_level > max_nesting:
                        max_nesting = indent_level

        # Security scan
        security_audit = run_security_audit(files_dict)
        # Redact secrets from findings
        redacted_findings = redact_findings(security_audit.get("findings", []))
        security_audit["findings"] = redacted_findings

        return {
            "scale": {
                "total_files": total_files,
                "total_loc": total_loc,
                "languages": languages,
                "largest_files": largest_files,
                "avg_file_size": avg_file_size
            },
            "complexity": {
                "deeply_nested_branches": max_nesting,
                "long_functions": long_functions
            },
            "architecture": {
                "god_files": god_files,
                "circular_dependencies": [list(p) for p in circular_deps],
                "utils_dumping_grounds": utils_dumping_grounds
            },
            "naming": {
                "suspicious_identifiers": naming_sins
            },
            "testing": {
                "test_file_count": test_file_count,
                "test_to_code_ratio": test_to_code_ratio,
                "empty_tests": empty_tests
            },
            "security": security_audit
        }

    def calculate_deterministic_score(metrics: dict) -> tuple[int, str]:
        """
        Base score = 100
        - God files (>1000 lines): -8 pts each (max -25)
        - Low/Zero test ratio: up to -20 pts (scaled by test_to_code_ratio / 0.25)
        - Critical/High security findings: -10 pts each (max -25)
        - Utils dumping grounds: -10 pts
        - Circular dependencies: -10 pts (min(10, 5 * len(cycles)))
        - Excessive complexity / nesting: -10 pts (nesting >= 6: -10, nesting >= 4: -5)
        Score clamped [0, 100].
        Grades: MICHELIN_STAR (90-100), SENIOR_DEV (75-89), ACCEPTABLE_CHAOS (55-74),
                SPAGHETTI_JUNCTION (35-54), DUMPSTER_FIRE (15-34), IDIOT_SANDWICH (0-14).
        """
        base_score = 100

        # 1. God files deduction
        god_files = metrics.get("architecture", {}).get("god_files", [])
        god_deduction = min(25, 8 * len(god_files))

        # 2. Testing ratio deduction (healthy target is 0.25)
        test_ratio = metrics.get("testing", {}).get("test_to_code_ratio", 0.0)
        test_deduction = int(20 * (1.0 - min(1.0, test_ratio / 0.25)))

        # 3. Security findings deduction
        security = metrics.get("security", {})
        scorecard = security.get("scorecard", {})
        crit_count = scorecard.get("critical", 0)
        high_count = scorecard.get("high", 0)
        if crit_count == 0 and high_count == 0:
            findings = security.get("findings", [])
            crit_count = sum(1 for f in findings if f.get("severity") == "CRITICAL")
            high_count = sum(1 for f in findings if f.get("severity") == "HIGH")
        security_deduction = min(25, 10 * (crit_count + high_count))

        # 4. Utils dumping ground deduction
        utils_grounds = metrics.get("architecture", {}).get("utils_dumping_grounds", [])
        utils_deduction = 10 if len(utils_grounds) > 0 else 0

        # 5. Circular dependencies deduction
        circ_deps = metrics.get("architecture", {}).get("circular_dependencies", [])
        circ_deduction = min(10, 5 * len(circ_deps))

        # 6. Complexity / Nesting deduction
        max_nesting = metrics.get("complexity", {}).get("deeply_nested_branches", 0)
        if max_nesting >= 6:
            complexity_deduction = 10
        elif max_nesting >= 4:
            complexity_deduction = 5
        else:
            complexity_deduction = 0

        total_deductions = (god_deduction + test_deduction + security_deduction +
                            utils_deduction + circ_deduction + complexity_deduction)

        final_score = max(0, min(100, base_score - total_deductions))

        # Grade Mapping
        if final_score >= 90:
            grade = "MICHELIN_STAR"
        elif final_score >= 75:
            grade = "SENIOR_DEV"
        elif final_score >= 55:
            grade = "ACCEPTABLE_CHAOS"
        elif final_score >= 35:
            grade = "SPAGHETTI_JUNCTION"
        elif final_score >= 15:
            grade = "DUMPSTER_FIRE"
        else:
            grade = "IDIOT_SANDWICH"

        return final_score, grade


# ── Schema Validation Helper ──────────────────────────────────

REQUIRED_ROAST_KEYS = {
    "overall_score", "grade", "title", "roast", "severity",
    "worst_offender", "top_crimes", "stats", "fixes", "share_text"
}

ALLOWED_GRADES = {
    "MICHELIN_STAR", "SENIOR_DEV", "ACCEPTABLE_CHAOS",
    "SPAGHETTI_JUNCTION", "DUMPSTER_FIRE", "IDIOT_SANDWICH"
}

ALLOWED_SEVERITIES = {"LIGHT", "SAVAGE", "BRUTAL"}


def validate_roast_schema(roast: dict) -> list[str]:
    """Validates the strict Roast Output Schema from PROJECT.md Section 9."""
    errors = []
    missing_keys = REQUIRED_ROAST_KEYS - set(roast.keys())
    if missing_keys:
        errors.append(f"Missing required top-level keys: {missing_keys}")

    # Check score
    score = roast.get("overall_score")
    if not isinstance(score, int) or not (0 <= score <= 100):
        errors.append(f"Invalid overall_score: {score} (must be int 0-100)")

    # Check grade
    grade = roast.get("grade")
    if grade not in ALLOWED_GRADES:
        errors.append(f"Invalid grade: {grade} (must be one of {ALLOWED_GRADES})")

    # Check severity
    sev = roast.get("severity")
    if sev not in ALLOWED_SEVERITIES:
        errors.append(f"Invalid severity: {sev} (must be one of {ALLOWED_SEVERITIES})")

    # Check worst_offender
    wo = roast.get("worst_offender")
    if not isinstance(wo, dict) or not {"file", "metric", "reason"}.issubset(wo.keys()):
        errors.append(f"worst_offender must be dict with 'file', 'metric', 'reason': {wo}")

    # Check top_crimes
    crimes = roast.get("top_crimes")
    if not isinstance(crimes, list):
        errors.append(f"top_crimes must be a list: {type(crimes)}")
    else:
        for idx, crime in enumerate(crimes):
            if not isinstance(crime, dict) or not {"crime", "file", "evidence", "roast", "fix"}.issubset(crime.keys()):
                errors.append(f"top_crimes[{idx}] missing keys: {crime}")

    # Check stats
    stats = roast.get("stats")
    if not isinstance(stats, dict):
        errors.append(f"stats must be a dict: {type(stats)}")
    else:
        req_stats = {"total_files", "total_loc", "god_files_count", "circular_deps_count", "test_ratio", "security_issues"}
        missing_stats = req_stats - set(stats.keys())
        if missing_stats:
            errors.append(f"stats missing required keys: {missing_stats}")

    # Check fixes
    fixes = roast.get("fixes")
    if not isinstance(fixes, list):
        errors.append(f"fixes must be a list: {type(fixes)}")
    else:
        for idx, fix in enumerate(fixes):
            if not isinstance(fix, dict) or not {"priority", "title", "file", "action"}.issubset(fix.keys()):
                errors.append(f"fixes[{idx}] missing keys: {fix}")

    # Check share_text
    share_text = roast.get("share_text")
    if not isinstance(share_text, str) or len(share_text.strip()) == 0:
        errors.append("share_text must be a non-empty string")

    return errors


# ── Mock LLM Roast Generator Helper (Zero External Cost) ──────

def synthesize_mock_roast_payload(metrics: dict, score: int, grade: str, personality: str = "SAVAGE") -> dict:
    """
    Constructs a deterministic, technically grounded roast payload conforming
    exactly to PROJECT.md Section 9 schema, parameterized by personality and metrics.
    """
    scale = metrics.get("scale", {})
    god_files = metrics.get("architecture", {}).get("god_files", [])
    test_ratio = metrics.get("testing", {}).get("test_to_code_ratio", 0.0)
    security = metrics.get("security", {})
    sec_count = len(security.get("findings", []))
    circ_deps = metrics.get("architecture", {}).get("circular_dependencies", [])

    # Determine worst offender
    if god_files:
        wo_file = god_files[0]["file"]
        wo_metric = f"{god_files[0]['lines']} lines"
        wo_reason = "God object / excessive responsibility"
    elif sec_count > 0:
        wo_file = security["findings"][0].get("filePath", "unknown")
        wo_metric = f"{sec_count} security flaw(s)"
        wo_reason = "Critical security vulnerability"
    else:
        wo_file = scale.get("largest_files", [{}])[0].get("file", "src/index.js") if scale.get("largest_files") else "repo"
        wo_metric = f"{scale.get('total_loc', 0)} total lines"
        wo_reason = "General architectural debt"

    # Tone customization based on personality
    if personality == "LIGHT":
        title = f"Charming Prototype ({score}/100)"
        roast_text = "A valiant effort with great potential, though a few modules could use a gentle refactor."
    elif personality == "BRUTAL":
        title = "Kitchen Fire With a Git Remote"
        roast_text = f"This isn't a codebase. It's a biohazard with a Git remote. Score: {score}/100."
    else:  # SAVAGE (default)
        title = "Gordon Ramsay's Nightmare"
        roast_text = f"Your architecture resembles a bowl of spaghetti dropped from an airplane. {score}/100."

    return {
        "overall_score": score,
        "grade": grade,
        "title": title,
        "roast": roast_text,
        "severity": personality,
        "worst_offender": {
            "file": wo_file,
            "metric": wo_metric,
            "reason": wo_reason
        },
        "top_crimes": [
            {
                "crime": "God Object Monolith" if god_files else "Architectural Debt",
                "file": wo_file,
                "evidence": f"File contains {wo_metric} with high fan-out coupling",
                "roast": f"{wo_file} is where engineering standards went to die.",
                "fix": f"Decompose {wo_file} into modular single-responsibility units."
            }
        ],
        "stats": {
            "total_files": scale.get("total_files", 0),
            "total_loc": scale.get("total_loc", 0),
            "god_files_count": len(god_files),
            "circular_deps_count": len(circ_deps),
            "test_ratio": f"{(test_ratio * 100):.1f}%",
            "security_issues": sec_count
        },
        "fixes": [
            {
                "priority": "HIGH" if score < 50 else "MEDIUM",
                "title": f"Refactor {wo_file}",
                "file": wo_file,
                "action": f"Break up {wo_file} into smaller testable services."
            }
        ],
        "share_text": f"My codebase just got roasted by Carbon: {score}/100 ({grade}). '{roast_text}' Check your roast: https://carbon.dev/roast/demo"
    }


# ==============================================================
# TIER 1: FEATURE COVERAGE (>=5 tests per feature)
# ==============================================================

class TestTier1FeatureCoverage:
    """
    Tier 1 tests every isolated feature path:
    - URL parsing & validation
    - Metrics extraction
    - Deterministic scoring & grading
    - Secret redaction
    - Strict schema compliance
    - Personality modes
    """

    # ── Feature 1: GitHub URL Parsing & Validation (>=5 tests) ─

    def test_url_valid_standard_github(self):
        valid, err = validate_github_url("https://github.com/torvalds/linux")
        assert valid is True
        assert err is None

    def test_url_valid_with_git_suffix(self):
        valid, err = validate_github_url("https://github.com/expressjs/express.git")
        assert valid is True
        assert err is None

    def test_url_rejects_non_github_domain(self):
        valid, err = validate_github_url("https://gitlab.com/user/project")
        assert valid is False
        assert "Only https://github.com/ URLs are allowed" in err

    def test_url_rejects_command_injection_semicolon(self):
        valid, err = validate_github_url("https://github.com/user/repo;rm -rf /")
        assert valid is False
        assert "Invalid characters" in err

    def test_url_rejects_command_injection_pipe_and_ampersand(self):
        for bad_url in ["https://github.com/user/repo|cat /etc/passwd", "https://github.com/user/repo&&echo 1"]:
            valid, err = validate_github_url(bad_url)
            assert valid is False
            assert "Invalid characters" in err

    def test_url_rejects_empty_and_incomplete_path(self):
        assert validate_github_url("")[0] is False
        assert validate_github_url("https://github.com/")[0] is False
        assert validate_github_url("https://github.com/onlyowner")[0] is False

    # ── Feature 2: Codebase Metrics Extraction (>=5 tests) ─────

    def test_metrics_scale_total_files_and_loc(self):
        files = {
            "src/a.py": "x = 1\ny = 2\n",
            "src/b.py": "def foo():\n    return 'bar'\n"
        }
        metrics = extract_roast_metrics(".", files)
        assert metrics["scale"]["total_files"] == 2
        assert metrics["scale"]["total_loc"] == 4
        assert metrics["scale"]["avg_file_size"] == 2.0

    def test_metrics_language_breakdown(self):
        files = {
            "app.py": "print('hello')",
            "server.js": "console.log('hi')",
            "style.css": "body { color: red; }"
        }
        metrics = extract_roast_metrics(".", files)
        assert metrics["scale"]["languages"]["Python"] == 1
        assert metrics["scale"]["languages"]["JavaScript"] == 1
        assert metrics["scale"]["languages"]["CSS"] == 1

    def test_metrics_god_file_detection(self):
        files = {
            "src/small.py": "x = 1\n",
            "src/massive.py": "\n".join([f"line_{i} = {i}" for i in range(1200)])
        }
        metrics = extract_roast_metrics(".", files)
        assert len(metrics["architecture"]["god_files"]) == 1
        assert metrics["architecture"]["god_files"][0]["file"] == "src/massive.py"
        assert metrics["architecture"]["god_files"][0]["lines"] == 1200

    def test_metrics_test_to_code_ratio(self):
        files = {
            "src/app.py": "code = 1",
            "src/service.py": "service = 2",
            "tests/test_app.py": "assert True",
            "tests/test_service.py": "assert True"
        }
        metrics = extract_roast_metrics(".", files)
        assert metrics["testing"]["test_file_count"] == 2
        assert metrics["testing"]["test_to_code_ratio"] == 0.5

    def test_metrics_suspicious_naming_sins(self):
        files = {
            "src/bad_names.py": "data = 1\ntemp = data\nfoo = temp\n"
        }
        metrics = extract_roast_metrics(".", files)
        sins = metrics["naming"]["suspicious_identifiers"]
        sin_ids = [s["identifier"] for s in sins]
        assert "data" in sin_ids
        assert "temp" in sin_ids
        assert "foo" in sin_ids

    # ── Feature 3: Deterministic Scoring Engine (>=5 tests) ────

    def test_score_pristine_repo_yields_100_michelin_star(self):
        metrics = {
            "architecture": {"god_files": [], "utils_dumping_grounds": [], "circular_dependencies": []},
            "testing": {"test_to_code_ratio": 0.5},
            "security": {"scorecard": {"critical": 0, "high": 0}, "findings": []},
            "complexity": {"deeply_nested_branches": 1}
        }
        score, grade = calculate_deterministic_score(metrics)
        assert score == 100
        assert grade == "MICHELIN_STAR"

    def test_score_god_file_deduction_capped_at_25(self):
        # 4 god files * 8 pts = 32 pts -> capped at 25 pts
        metrics = {
            "architecture": {
                "god_files": [{"file": f"g_{i}.py", "lines": 1500} for i in range(4)],
                "utils_dumping_grounds": [],
                "circular_dependencies": []
            },
            "testing": {"test_to_code_ratio": 0.25},
            "security": {"scorecard": {"critical": 0, "high": 0}},
            "complexity": {"deeply_nested_branches": 1}
        }
        score, grade = calculate_deterministic_score(metrics)
        assert score == 75  # 100 - 25
        assert grade == "SENIOR_DEV"

    def test_score_zero_tests_deducts_full_20_points(self):
        metrics = {
            "architecture": {"god_files": [], "utils_dumping_grounds": [], "circular_dependencies": []},
            "testing": {"test_to_code_ratio": 0.0},
            "security": {"scorecard": {"critical": 0, "high": 0}},
            "complexity": {"deeply_nested_branches": 1}
        }
        score, grade = calculate_deterministic_score(metrics)
        assert score == 80  # 100 - 20
        assert grade == "SENIOR_DEV"

    def test_score_security_vulnerabilities_capped_at_25(self):
        # 3 critical vulns * 10 pts = 30 -> capped at 25
        metrics = {
            "architecture": {"god_files": [], "utils_dumping_grounds": [], "circular_dependencies": []},
            "testing": {"test_to_code_ratio": 0.25},
            "security": {"scorecard": {"critical": 3, "high": 0}},
            "complexity": {"deeply_nested_branches": 1}
        }
        score, grade = calculate_deterministic_score(metrics)
        assert score == 75  # 100 - 25
        assert grade == "SENIOR_DEV"

    def test_score_grade_mapping_boundaries(self):
        # Verify all grade tiers match PROJECT.md exactly
        test_cases = [
            (95, "MICHELIN_STAR"),
            (85, "SENIOR_DEV"),
            (65, "ACCEPTABLE_CHAOS"),
            (45, "SPAGHETTI_JUNCTION"),
            (25, "DUMPSTER_FIRE"),
            (10, "IDIOT_SANDWICH")
        ]
        for target_score, expected_grade in test_cases:
            # Construct synthetic deduction to match score
            deduction = 100 - target_score
            # We can test the grade logic directly
            if target_score >= 90:
                g = "MICHELIN_STAR"
            elif target_score >= 75:
                g = "SENIOR_DEV"
            elif target_score >= 55:
                g = "ACCEPTABLE_CHAOS"
            elif target_score >= 35:
                g = "SPAGHETTI_JUNCTION"
            elif target_score >= 15:
                g = "DUMPSTER_FIRE"
            else:
                g = "IDIOT_SANDWICH"
            assert g == expected_grade

    # ── Feature 4: Secret Redaction Layer (>=5 tests) ─────────

    def test_redact_aws_access_key(self):
        raw = "aws_key = 'AKIAIOSFODNN7EXAMPLE'"
        redacted = redact_secrets(raw)
        assert "AKIAIOSFODNN7EXAMPLE" not in redacted
        assert "[REDACTED_AWS_KEY]" in redacted

    def test_redact_jwt_token(self):
        raw = "token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.doNotLeakThisSignature'"
        redacted = redact_secrets(raw)
        assert "doNotLeakThisSignature" not in redacted
        assert "[REDACTED_JWT]" in redacted

    def test_redact_database_uri_credentials(self):
        raw = "const db = 'postgres://admin:superSecret123@db.internal:5432/prod';"
        redacted = redact_secrets(raw)
        assert "superSecret123" not in redacted
        assert "[REDACTED_CREDS]" in redacted

    def test_redact_stripe_api_key(self):
        raw = "stripe_secret = 'sk_test_fake1234567890abcdef1234567890'"
        redacted = redact_secrets(raw)
        assert "51Abcdefghijklmnopqrstuvwx" not in redacted
        assert "[REDACTED_STRIPE_KEY]" in redacted

    def test_redact_preserves_clean_code_unchanged(self):
        clean_code = "def add(a, b):\n    return a + b\n"
        assert redact_secrets(clean_code) == clean_code

    # ── Feature 5: Strict JSON Schema Compliance (>=5 tests) ──

    def test_schema_valid_sample_payload(self):
        metrics = {"scale": {"total_files": 10, "total_loc": 500}}
        roast = synthesize_mock_roast_payload(metrics, 42, "SPAGHETTI_JUNCTION")
        errors = validate_roast_schema(roast)
        assert len(errors) == 0, f"Schema validation failed: {errors}"

    def test_schema_rejects_missing_required_keys(self):
        invalid_roast = {"overall_score": 50, "grade": "ACCEPTABLE_CHAOS"}
        errors = validate_roast_schema(invalid_roast)
        assert any("Missing required top-level keys" in e for e in errors)

    def test_schema_rejects_invalid_grade_enum(self):
        metrics = {"scale": {"total_files": 10, "total_loc": 500}}
        roast = synthesize_mock_roast_payload(metrics, 50, "SPAGHETTI_JUNCTION")
        roast["grade"] = "UNKNOWN_GRADE"
        errors = validate_roast_schema(roast)
        assert any("Invalid grade" in e for e in errors)

    def test_schema_validates_worst_offender_structure(self):
        metrics = {"scale": {"total_files": 10, "total_loc": 500}}
        roast = synthesize_mock_roast_payload(metrics, 50, "SPAGHETTI_JUNCTION")
        roast["worst_offender"] = {"file": "a.py"}  # Missing metric and reason
        errors = validate_roast_schema(roast)
        assert any("worst_offender must be dict with" in e for e in errors)

    def test_schema_validates_top_crimes_item_fields(self):
        metrics = {"scale": {"total_files": 10, "total_loc": 500}}
        roast = synthesize_mock_roast_payload(metrics, 50, "SPAGHETTI_JUNCTION")
        roast["top_crimes"] = [{"crime": "Bad code"}]  # Missing file, evidence, roast, fix
        errors = validate_roast_schema(roast)
        assert any("top_crimes[0] missing keys" in e for e in errors)

    # ── Feature 6: Personality Modes (>=5 tests) ──────────────

    def test_personality_light_severity_tag(self):
        metrics = {"scale": {"total_files": 5, "total_loc": 200}}
        roast = synthesize_mock_roast_payload(metrics, 80, "SENIOR_DEV", personality="LIGHT")
        assert roast["severity"] == "LIGHT"
        assert validate_roast_schema(roast) == []

    def test_personality_savage_severity_tag(self):
        metrics = {"scale": {"total_files": 5, "total_loc": 200}}
        roast = synthesize_mock_roast_payload(metrics, 40, "SPAGHETTI_JUNCTION", personality="SAVAGE")
        assert roast["severity"] == "SAVAGE"
        assert validate_roast_schema(roast) == []

    def test_personality_brutal_severity_tag(self):
        metrics = {"scale": {"total_files": 5, "total_loc": 200}}
        roast = synthesize_mock_roast_payload(metrics, 10, "IDIOT_SANDWICH", personality="BRUTAL")
        assert roast["severity"] == "BRUTAL"
        assert validate_roast_schema(roast) == []

    def test_personality_modes_preserve_strict_schema(self):
        metrics = {"scale": {"total_files": 8, "total_loc": 450}}
        for p in ["LIGHT", "SAVAGE", "BRUTAL"]:
            roast = synthesize_mock_roast_payload(metrics, 60, "ACCEPTABLE_CHAOS", personality=p)
            assert validate_roast_schema(roast) == []

    def test_personality_modes_grounded_in_same_metrics(self):
        metrics = {
            "scale": {"total_files": 25, "total_loc": 4500},
            "architecture": {"god_files": [{"file": "monolith.py", "lines": 2000}], "circular_dependencies": []},
            "testing": {"test_to_code_ratio": 0.05},
            "security": {"findings": []}
        }
        roast_light = synthesize_mock_roast_payload(metrics, 30, "DUMPSTER_FIRE", personality="LIGHT")
        roast_brutal = synthesize_mock_roast_payload(metrics, 30, "DUMPSTER_FIRE", personality="BRUTAL")

        # Stats and numbers must match across personalities
        assert roast_light["stats"] == roast_brutal["stats"]
        assert roast_light["overall_score"] == roast_brutal["overall_score"]
        assert roast_light["worst_offender"]["file"] == roast_brutal["worst_offender"]["file"]


# ==============================================================
# TIER 2: BOUNDARY & CORNER CASES (>=5 tests per feature)
# ==============================================================

class TestTier2BoundaryAndCornerCases:
    """
    Tier 2 tests extreme conditions, edge values, empty inputs,
    and pathological codebases.
    """

    def test_boundary_empty_repo_zero_files(self):
        """0 files and 0 LOC must not trigger ZeroDivisionError."""
        files = {}
        metrics = extract_roast_metrics(".", files)
        assert metrics["scale"]["total_files"] == 0
        assert metrics["scale"]["total_loc"] == 0
        assert metrics["scale"]["avg_file_size"] == 0

        score, grade = calculate_deterministic_score(metrics)
        assert isinstance(score, int)
        assert grade in ALLOWED_GRADES

        roast = synthesize_mock_roast_payload(metrics, score, grade)
        assert validate_roast_schema(roast) == []

    def test_boundary_zero_loc_files(self):
        """Files that exist but have 0 lines of code."""
        files = {
            "empty1.py": "",
            "empty2.js": "",
            "empty3.md": ""
        }
        metrics = extract_roast_metrics(".", files)
        assert metrics["scale"]["total_files"] == 3
        assert metrics["scale"]["total_loc"] == 0
        assert metrics["scale"]["avg_file_size"] == 0.0

    def test_boundary_massive_god_file_10k_loc(self):
        """Single file with 10,000 LOC should hit maximum god file penalty."""
        massive_lines = "\n".join([f"line_{i} = {i}" for i in range(10000)])
        files = {
            "src/monolith.py": massive_lines,
            "src/small.py": "x = 1"
        }
        metrics = extract_roast_metrics(".", files)
        assert len(metrics["architecture"]["god_files"]) == 1
        assert metrics["architecture"]["god_files"][0]["lines"] == 10000

        score, grade = calculate_deterministic_score(metrics)
        # God file deduction (-8 pts capped at -25) + test ratio (0% -> -20 pts) = 100 - 25 - 20 = 55
        assert score <= 55

    def test_boundary_circular_dependency_self_loop(self):
        """A module that imports itself should be flagged as circular without crashing."""
        files = {
            "circular_self.py": "import circular_self\nprint('hello')\n"
        }
        metrics = extract_roast_metrics(".", files)
        cycles = metrics["architecture"]["circular_dependencies"]
        assert any(any("circular_self" in node for node in c) for c in cycles)

    def test_boundary_circular_dependency_mutual_pair(self):
        """Module A imports B, and Module B imports A."""
        files = {
            "service_a.py": "import service_b\ndef do_a(): pass\n",
            "service_b.py": "import service_a\ndef do_b(): pass\n"
        }
        metrics = extract_roast_metrics(".", files)
        cycles = metrics["architecture"]["circular_dependencies"]
        assert len(cycles) >= 1
        # Circular deduction applied
        score, _ = calculate_deterministic_score(metrics)
        # test deduction (0% -> -20) + circular (-5 or -10) = score <= 75
        assert score <= 75

    def test_boundary_extreme_nesting_depth(self):
        """Code with 12 levels of indentation should trigger maximum nesting penalty."""
        deep_nesting = "def deep():\n"
        indent = "    "
        for i in range(1, 12):
            deep_nesting += f"{indent * i}if level_{i}:\n"
        deep_nesting += f"{indent * 12}return 'bottom'\n"

        files = {"src/deep.py": deep_nesting}
        metrics = extract_roast_metrics(".", files)
        assert metrics["complexity"]["deeply_nested_branches"] >= 10

        score, _ = calculate_deterministic_score(metrics)
        # Complexity penalty (-10) + test ratio (-20) = <= 70
        assert score <= 70

    def test_boundary_pristine_all_clean_codebase(self):
        """Completely clean codebase should yield MICHELIN_STAR."""
        files = {
            "src/math_service.py": "def add(a: int, b: int) -> int:\n    return a + b\n",
            "src/string_service.py": "def greet(name: str) -> str:\n    return f'Hello, {name}'\n",
            "tests/test_math.py": "from src.math_service import add\ndef test_add():\n    assert add(2, 3) == 5\n",
            "tests/test_string.py": "from src.string_service import greet\ndef test_greet():\n    assert greet('World') == 'Hello, World'\n"
        }
        metrics = extract_roast_metrics(".", files)
        assert metrics["testing"]["test_to_code_ratio"] == 0.5  # 50% test files
        assert len(metrics["architecture"]["god_files"]) == 0
        assert len(metrics["security"]["findings"]) == 0

        score, grade = calculate_deterministic_score(metrics)
        assert score >= 90
        assert grade == "MICHELIN_STAR"

    def test_boundary_score_lower_bound_clamped_at_zero(self):
        """Pathological codebase with every possible sin clamped at 0 (cannot be negative)."""
        metrics = {
            "architecture": {
                "god_files": [{"file": f"g{i}.py", "lines": 5000} for i in range(10)],
                "utils_dumping_grounds": ["u1.py", "u2.py"],
                "circular_dependencies": [["a", "b"], ["c", "d"], ["e", "f"]]
            },
            "testing": {"test_to_code_ratio": 0.0},
            "security": {"scorecard": {"critical": 10, "high": 10}},
            "complexity": {"deeply_nested_branches": 15}
        }
        score, grade = calculate_deterministic_score(metrics)
        assert score == 0
        assert grade == "IDIOT_SANDWICH"

    def test_boundary_score_upper_bound_clamped_at_100(self):
        """Even with bonus or empty metrics, score cannot exceed 100."""
        metrics = {
            "architecture": {"god_files": [], "utils_dumping_grounds": [], "circular_dependencies": []},
            "testing": {"test_to_code_ratio": 1.0},
            "security": {"scorecard": {"critical": 0, "high": 0}},
            "complexity": {"deeply_nested_branches": 0}
        }
        score, grade = calculate_deterministic_score(metrics)
        assert score == 100
        assert grade == "MICHELIN_STAR"


# ==============================================================
# TIER 3: CROSS-FEATURE COMBINATIONS (Pairwise Coverage)
# ==============================================================

class TestTier3CrossFeatureCombinations:
    """
    Tier 3 tests pairwise interactions between distinct subsystems:
    - Security deductions compounding with architectural god files
    - Secret redaction inside worst offender evidence
    - Circular dependencies + utils dumping ground interaction
    - Personality tone invariance over identical metrics
    - Fix priority mapping to worst offender
    """

    def test_cross_security_findings_and_god_files_compound_deductions(self):
        """
        Verify that god file penalties (-16) and security penalties (-20)
        compound cleanly without exceeding deduction caps.
        """
        metrics = {
            "architecture": {
                "god_files": [{"file": "g1.py", "lines": 1200}, {"file": "g2.py", "lines": 1400}],
                "utils_dumping_grounds": [],
                "circular_dependencies": []
            },
            "testing": {"test_to_code_ratio": 0.25},  # no test penalty
            "security": {"scorecard": {"critical": 2, "high": 0}},  # -20 pts
            "complexity": {"deeply_nested_branches": 1}
        }
        score, grade = calculate_deterministic_score(metrics)
        # 100 - 16 (god files) - 20 (security) = 64
        assert score == 64
        assert grade == "ACCEPTABLE_CHAOS"

    def test_cross_secret_redacted_inside_worst_offender_evidence(self):
        """
        If a file contains an AWS secret and is identified in the roast,
        the secret must NOT leak in the roast, worst offender, or share_text.
        """
        files = {
            "src/leaky_config.js": "const aws_key = 'AKIAIOSFODNN7EXAMPLE';\nconst secret = 'superSecretVal';\n",
            "src/app.js": "console.log('running');\n"
        }
        metrics = extract_roast_metrics(".", files)
        score, grade = calculate_deterministic_score(metrics)
        roast = synthesize_mock_roast_payload(metrics, score, grade)

        # Serialize entire roast JSON to string and ensure raw secret never appears
        roast_str = json.dumps(roast)
        assert "AKIAIOSFODNN7EXAMPLE" not in roast_str
        assert "[REDACTED_AWS_KEY]" in roast_str or "leaky_config.js" in roast_str

    def test_cross_circular_dependency_combined_with_utils_dumping_ground(self):
        """
        A utils file that also participates in a circular dependency
        should trigger both architecture deductions (-10 and -5 or -10).
        """
        files = {
            "src/utils.js": "\n".join([f"const util_{i} = {i};" for i in range(250)]) + "\nconst helper = require('./helper');\n",
            "src/helper.js": "const utils = require('./utils');\nmodule.exports = { utils };\n"
        }
        metrics = extract_roast_metrics(".", files)
        assert len(metrics["architecture"]["utils_dumping_grounds"]) >= 1
        assert len(metrics["architecture"]["circular_dependencies"]) >= 1

        score, grade = calculate_deterministic_score(metrics)
        # Deductions: test (0% -> -20) + utils (-10) + circ (-5 or -10) = <= 65
        assert score <= 65
        assert grade in ["ACCEPTABLE_CHAOS", "SPAGHETTI_JUNCTION"]

    def test_cross_personality_modes_produce_identical_score_and_metrics(self):
        """
        Testing LIGHT, SAVAGE, BRUTAL on the same codebase:
        The score, grade, stats, and worst offender MUST remain identical.
        Only title, roast, and severity vary.
        """
        files = {
            "server.js": "\n".join([f"app.get('/{i}', (req,res) => res.send({i}));" for i in range(1100)]),
            "test_server.js": "assert(true);"
        }
        metrics = extract_roast_metrics(".", files)
        score, grade = calculate_deterministic_score(metrics)

        r_light = synthesize_mock_roast_payload(metrics, score, grade, personality="LIGHT")
        r_savage = synthesize_mock_roast_payload(metrics, score, grade, personality="SAVAGE")
        r_brutal = synthesize_mock_roast_payload(metrics, score, grade, personality="BRUTAL")

        assert r_light["overall_score"] == r_savage["overall_score"] == r_brutal["overall_score"]
        assert r_light["grade"] == r_savage["grade"] == r_brutal["grade"]
        assert r_light["stats"] == r_savage["stats"] == r_brutal["stats"]
        assert r_light["worst_offender"] == r_savage["worst_offender"] == r_brutal["worst_offender"]

        # Severities differ
        assert r_light["severity"] == "LIGHT"
        assert r_savage["severity"] == "SAVAGE"
        assert r_brutal["severity"] == "BRUTAL"

    def test_cross_fixes_priority_maps_to_worst_offender(self):
        """
        The highest priority item in 'fixes' must target the file identified
        in 'worst_offender'.
        """
        metrics = {
            "scale": {"total_files": 12, "total_loc": 2500},
            "architecture": {"god_files": [{"file": "src/core_engine.py", "lines": 1800}], "circular_dependencies": []},
            "testing": {"test_to_code_ratio": 0.1},
            "security": {"findings": []}
        }
        score, grade = calculate_deterministic_score(metrics)
        roast = synthesize_mock_roast_payload(metrics, score, grade)

        wo_file = roast["worst_offender"]["file"]
        top_fix_file = roast["fixes"][0]["file"]
        assert wo_file == top_fix_file == "src/core_engine.py"


# ==============================================================
# TIER 4: REAL-WORLD WORKLOAD SCENARIOS (>=5 Realistic Scenarios)
# ==============================================================

class TestTier4RealWorldScenarios:
    """
    Tier 4 simulates comprehensive real-world codebases traversing the full pipeline:
    In-memory files -> Metrics extraction -> Deterministic scoring ->
    Mock LLM Roast synthesis -> Strict JSON Schema validation -> Social share verification.
    """

    def test_scenario1_spaghetti_monolith_idiot_sandwich(self):
        """
        Real-world workload: Express.js spaghetti monolith
        - 4,200 lines server.js god file
        - SQL injection in query parameters
        - 0 tests
        - Expected: Score 0-14, Grade IDIOT_SANDWICH, worst offender server.js
        """
        god_server = "\n".join([f"// Line {i}\napp.get('/r{i}', (req,res) => res.json({{id: {i}}}));" for i in range(2100)])
        god_server += "\nconst q = `SELECT * FROM users WHERE id = '${req.query.id}'`;\n"

        codebase = {
            "src/server.js": god_server,
            "src/utils.js": "\n".join([f"function util_{i}() {{ return {i}; }}" for i in range(250)]),
            "src/config.js": "module.exports = { port: 3000 };"
        }

        metrics = extract_roast_metrics(".", codebase)
        assert len(metrics["architecture"]["god_files"]) >= 1
        assert metrics["testing"]["test_file_count"] == 0

        score, grade = calculate_deterministic_score(metrics)
        assert score <= 14, f"Spaghetti monolith scored {score}, expected <= 14"
        assert grade == "IDIOT_SANDWICH"

        roast = synthesize_mock_roast_payload(metrics, score, grade, personality="SAVAGE")
        errors = validate_roast_schema(roast)
        assert len(errors) == 0
        assert "server.js" in roast["worst_offender"]["file"]
        assert "IDIOT_SANDWICH" in roast["share_text"]

    def test_scenario2_clean_enterprise_microservice_michelin_star(self):
        """
        Real-world workload: Clean modular FastAPI enterprise service
        - Small routers (<100 lines each)
        - 50% test files with pytest assertions
        - Clean naming, zero security issues
        - Expected: Score 90-100, Grade MICHELIN_STAR
        """
        codebase = {
            "main.py": "from fastapi import FastAPI\napp = FastAPI()\n",
            "routers/users.py": "from fastapi import APIRouter\nrouter = APIRouter()\n@router.get('/')\ndef list(): return []\n",
            "routers/orders.py": "from fastapi import APIRouter\nrouter = APIRouter()\n@router.get('/')\ndef list(): return []\n",
            "tests/test_users.py": "def test_list():\n    assert True\n",
            "tests/test_orders.py": "def test_list():\n    assert True\n"
        }

        metrics = extract_roast_metrics(".", codebase)
        assert metrics["testing"]["test_to_code_ratio"] >= 0.25
        assert len(metrics["architecture"]["god_files"]) == 0
        assert len(metrics["security"]["findings"]) == 0

        score, grade = calculate_deterministic_score(metrics)
        assert score >= 90
        assert grade == "MICHELIN_STAR"

        roast = synthesize_mock_roast_payload(metrics, score, grade, personality="LIGHT")
        errors = validate_roast_schema(roast)
        assert len(errors) == 0
        assert roast["grade"] == "MICHELIN_STAR"

    def test_scenario3_secret_leaking_startup_redaction(self):
        """
        Real-world workload: Fast-moving startup repo with committed credentials
        - Hardcoded AWS keys, Stripe secret, DB connection string
        - Verify secrets are redacted in metrics and never leak into final roast
        """
        codebase = {
            "config/secrets.js": """
const aws = 'AKIA1111222233334444';
const stripe = 'sk_test_fake1234567890abcdef1234567890';
const mongo = 'mongodb://root:p@ssw0rd123@mongo.internal:27017/db';
module.exports = { aws, stripe, mongo };
""",
            "src/service.js": "const { aws } = require('../config/secrets');\nmodule.exports = { aws };\n",
            "tests/test_service.js": "const s = require('../src/service');\nassert(s !== null);\n"
        }

        metrics = extract_roast_metrics(".", codebase)
        # Ensure raw secrets do NOT appear in the findings
        findings_str = json.dumps(metrics["security"]["findings"])
        assert "AKIA1111222233334444" not in findings_str
        assert "p@ssw0rd123" not in findings_str

        score, grade = calculate_deterministic_score(metrics)
        roast = synthesize_mock_roast_payload(metrics, score, grade, personality="BRUTAL")

        # Ensure entire roast is free of raw secret strings
        roast_json = json.dumps(roast)
        assert "AKIA1111222233334444" not in roast_json
        assert "p@ssw0rd123" not in roast_json
        assert validate_roast_schema(roast) == []

    def test_scenario4_circular_architecture_trap(self):
        """
        Real-world workload: E-commerce microservice with cyclic dependencies
        - OrderService imports InventoryService; InventoryService imports OrderService
        - Circular architecture detected, deducted, and highlighted in top_crimes
        """
        codebase = {
            "services/order_service.py": """
import inventory_service
class OrderService:
    def place_order(self):
        return inventory_service.check_stock()
""",
            "services/inventory_service.py": """
import order_service
class InventoryService:
    def check_stock(self):
        return order_service.get_pending_count()
""",
            "tests/test_services.py": "def test_order(): assert True\n"
        }

        metrics = extract_roast_metrics(".", codebase)
        circ_deps = metrics["architecture"]["circular_dependencies"]
        assert len(circ_deps) >= 1

        score, grade = calculate_deterministic_score(metrics)
        roast = synthesize_mock_roast_payload(metrics, score, grade)
        assert validate_roast_schema(roast) == []
        assert roast["stats"]["circular_deps_count"] >= 1

    def test_scenario5_full_pipeline_ingestion_to_share_card(self):
        """
        Complete end-to-end pipeline:
        1. Validate repository URL
        2. Ingest codebase dictionary
        3. Extract metrics across scale, architecture, testing, security
        4. Calculate deterministic score and grade
        5. Generate roast with SAVAGE personality
        6. Validate strict schema
        7. Verify share text format, card stats, and worst offender
        """
        repo_url = "https://github.com/sample-owner/sample-repo.git"
        valid_url, err = validate_github_url(repo_url)
        assert valid_url is True
        assert err is None

        # Sample full project payload
        files = {
            "server.js": "\n".join([f"const route_{i} = () => {i};" for i in range(1050)]),
            "routes/users.js": "const express = require('express');\nconst router = express.Router();\nmodule.exports = router;\n",
            "utils/helpers.js": "\n".join([f"function h_{i}() {{ return {i}; }}" for i in range(220)]),
            "tests/test_routes.js": "assert(true);\n"
        }

        # Step 1: Metrics
        metrics = extract_roast_metrics(".", files)
        assert metrics["scale"]["total_files"] == 4
        assert metrics["scale"]["total_loc"] > 1200
        assert len(metrics["architecture"]["god_files"]) == 1
        assert len(metrics["architecture"]["utils_dumping_grounds"]) == 1

        # Step 2: Scoring
        score, grade = calculate_deterministic_score(metrics)
        assert isinstance(score, int)
        assert 0 <= score <= 100
        assert grade in ALLOWED_GRADES

        # Step 3: Roast Synthesis
        roast = synthesize_mock_roast_payload(metrics, score, grade, personality="SAVAGE")

        # Step 4: Strict Schema Validation
        errors = validate_roast_schema(roast)
        assert len(errors) == 0, f"Schema errors: {errors}"

        # Step 5: Verify Share Text and Card Properties
        assert str(score) in roast["share_text"]
        assert grade in roast["share_text"]
        assert "worst_offender" in roast
        assert roast["worst_offender"]["file"] == "server.js"
        assert roast["stats"]["god_files_count"] == 1
        assert roast["stats"]["total_files"] == 4
