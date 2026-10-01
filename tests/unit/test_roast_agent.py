# ============================================================
#  tests/unit/test_roast_agent.py
#
#  Unit test suite for Carbon Roast Intelligence Agent.
#  Covers:
#  - Strict Output Schema compliance (§9)
#  - Deterministic score & stats preservation
#  - Personality modes (LIGHT, SAVAGE, BRUTAL)
#  - Robustness & deterministic fallback mechanisms
#  - Secret redaction in prompt assembly and output
#  - Real metric-grounded worst offender and crimes extraction
#  - Custom llm_client interfaces
#  - Backwards-compatible run() interface
# ============================================================

import json
import pytest
from unittest.mock import patch, MagicMock

from tools.codebase_metrics import (
    RoastMetrics,
    ScaleMetrics,
    ComplexityMetrics,
    ArchitectureMetrics,
    NamingMetrics,
    TestingMetrics,
    SecurityMetrics,
    extract_roast_metrics,
    calculate_deterministic_score
)
TestingMetrics.__test__ = False
from tools.security_redactor import REDACTION_TOKEN, redact_secrets
from agents.roast_agent import (
    generate_roast,
    run,
    identify_worst_offender,
    extract_top_crimes,
    extract_fixes,
    synthesize_deterministic_roast,
    build_roast_prompt,
    sanitize_and_validate_roast,
    ALLOWED_SEVERITIES,
    ALLOWED_GRADES,
    REQUIRED_ROAST_KEYS,
)


# ── Global Test Fixtures ───────────────────────────────────────

def default_mock_llm_response(prompt: str) -> str:
    """Deterministic, 100% offline mock LLM response generator."""
    return json.dumps({
        "title": "Mock Architectural Roasting",
        "roast": "This codebase reflects notable technical debt and concentrated responsibility.",
        "top_crimes": [
            {
                "crime": "God Object Monolith",
                "file": "src/god_server.py",
                "evidence": "2800 lines of code across 65 functions",
                "roast": "Too much responsibility concentrated in a single file.",
                "fix": "Decompose into modular domain services."
            }
        ],
        "fixes": [
            {
                "priority": "HIGH",
                "title": "Break up src/god_server.py",
                "file": "src/god_server.py",
                "action": "Split into domain services."
            }
        ],
        "share_text": "My codebase just got roasted by Carbon!"
    })


@pytest.fixture(autouse=True)
def mock_roast_agent_llm(monkeypatch):
    """Ensures unit tests run 100% offline without hitting network or timeouts."""
    monkeypatch.setattr("agents.roast_agent.generate_with_retry", default_mock_llm_response)


@pytest.fixture
def clean_metrics() -> RoastMetrics:
    """A pristine clean codebase metrics object."""
    return RoastMetrics(
        scale=ScaleMetrics(
            total_files=5,
            total_loc=300,
            languages={"Python": 300},
            largest_files=[{"file": "src/main.py", "lines": 80}],
            avg_file_size=60.0
        ),
        complexity=ComplexityMetrics(),
        architecture=ArchitectureMetrics(),
        naming=NamingMetrics(),
        testing=TestingMetrics(
            test_file_count=2,
            test_to_code_ratio=0.4,
            test_ratio_percentage="40.0%"
        ),
        security=SecurityMetrics()
    )


@pytest.fixture
def messy_monolith_metrics() -> RoastMetrics:
    """A codebase afflicted with a God file, circular deps, and low testing ratio."""
    return RoastMetrics(
        scale=ScaleMetrics(
            total_files=10,
            total_loc=4500,
            languages={"Python": 4500},
            largest_files=[
                {"file": "src/god_server.py", "lines": 2800},
                {"file": "src/utils.py", "lines": 800}
            ],
            avg_file_size=450.0
        ),
        complexity=ComplexityMetrics(
            deeply_nested_branches=[{"file": "src/god_server.py", "line": 45, "depth": 6}],
            deeply_nested_count=1
        ),
        architecture=ArchitectureMetrics(
            god_files=[{
                "file": "src/god_server.py",
                "lines": 2800,
                "functions_count": 65,
                "reasons": ["2800 lines (exceeds 1000 LOC limit)"]
            }],
            utils_dumping_grounds=[{
                "file": "src/utils.py",
                "lines": 800,
                "functions_count": 30
            }],
            circular_dependencies=[
                ["src/god_server.py", "src/auth.py", "src/god_server.py"]
            ]
        ),
        naming=NamingMetrics(
            suspicious_identifiers=[
                {"identifier": "data2", "file": "src/god_server.py", "line": 102, "type": "variable"}
            ],
            total_suspicious_count=1
        ),
        testing=TestingMetrics(
            test_file_count=0,
            test_to_code_ratio=0.0,
            test_ratio_percentage="0.0%"
        ),
        security=SecurityMetrics()
    )


@pytest.fixture
def security_compromised_metrics() -> RoastMetrics:
    """A codebase containing high and critical security vulnerabilities."""
    return RoastMetrics(
        scale=ScaleMetrics(
            total_files=8,
            total_loc=1200,
            languages={"JavaScript": 1200},
            largest_files=[{"file": "src/config.js", "lines": 200}],
            avg_file_size=150.0
        ),
        complexity=ComplexityMetrics(),
        architecture=ArchitectureMetrics(),
        naming=NamingMetrics(),
        testing=TestingMetrics(
            test_file_count=1,
            test_to_code_ratio=0.125,
            test_ratio_percentage="12.5%"
        ),
        security=SecurityMetrics(
            findings=[
                {
                    "ruleId": "SEC-001",
                    "title": "Hardcoded AWS Access Key",
                    "severity": "CRITICAL",
                    "filePath": "src/config.js",
                    "lineNumber": 15,
                    "snippet": f"const key = '{REDACTION_TOKEN}';",
                    "remediation": "Store AWS credentials in AWS Secrets Manager."
                },
                {
                    "ruleId": "SEC-002",
                    "title": "SQL Injection in User Query",
                    "severity": "HIGH",
                    "filePath": "src/db.js",
                    "lineNumber": 42,
                    "snippet": "const query = `SELECT * FROM users WHERE id = ${req.params.id}`;",
                    "remediation": "Use parameterized queries."
                }
            ],
            critical_count=1,
            high_count=1
        )
    )


# ============================================================
# 1. Schema Validation Tests
# ============================================================

class TestRoastAgentSchemaValidation:
    """Verifies that generate_roast strictly satisfies the PROJECT.md §9 schema."""

    def test_strict_schema_keys_present(self, messy_monolith_metrics):
        roast = generate_roast(messy_monolith_metrics, personality="SAVAGE")

        assert isinstance(roast, dict)
        missing_keys = REQUIRED_ROAST_KEYS - set(roast.keys())
        assert not missing_keys, f"Missing required top-level keys: {missing_keys}"

    def test_score_range_and_grade_validity(self, messy_monolith_metrics, clean_metrics):
        roast_messy = generate_roast(messy_monolith_metrics)
        assert isinstance(roast_messy["overall_score"], int)
        assert 0 <= roast_messy["overall_score"] <= 100
        assert roast_messy["grade"] in ALLOWED_GRADES

        roast_clean = generate_roast(clean_metrics)
        assert isinstance(roast_clean["overall_score"], int)
        assert 0 <= roast_clean["overall_score"] <= 100
        assert roast_clean["grade"] in ALLOWED_GRADES
        assert roast_clean["overall_score"] >= 90
        assert roast_clean["grade"] == "MICHELIN_STAR"

    def test_severity_validity(self, messy_monolith_metrics):
        for sev in ("LIGHT", "SAVAGE", "BRUTAL"):
            roast = generate_roast(messy_monolith_metrics, personality=sev)
            assert roast["severity"] == sev

    def test_worst_offender_structure(self, messy_monolith_metrics):
        roast = generate_roast(messy_monolith_metrics)
        wo = roast["worst_offender"]
        assert isinstance(wo, dict)
        assert {"file", "metric", "reason"}.issubset(wo.keys())
        assert isinstance(wo["file"], str) and len(wo["file"]) > 0
        assert isinstance(wo["metric"], str) and len(wo["metric"]) > 0
        assert isinstance(wo["reason"], str) and len(wo["reason"]) > 0

    def test_top_crimes_structure(self, messy_monolith_metrics):
        roast = generate_roast(messy_monolith_metrics)
        crimes = roast["top_crimes"]
        assert isinstance(crimes, list)
        assert len(crimes) > 0
        for crime in crimes:
            assert isinstance(crime, dict)
            assert {"crime", "file", "evidence", "roast", "fix"}.issubset(crime.keys())
            for key in ("crime", "file", "evidence", "roast", "fix"):
                assert isinstance(crime[key], str) and len(crime[key]) > 0

    def test_stats_structure(self, messy_monolith_metrics):
        roast = generate_roast(messy_monolith_metrics)
        stats = roast["stats"]
        assert isinstance(stats, dict)
        req_stats = {"total_files", "total_loc", "god_files_count", "circular_deps_count", "test_ratio", "security_issues"}
        assert req_stats.issubset(stats.keys())
        assert isinstance(stats["total_files"], int)
        assert isinstance(stats["total_loc"], int)
        assert isinstance(stats["god_files_count"], int)
        assert isinstance(stats["circular_deps_count"], int)
        assert isinstance(stats["test_ratio"], str)
        assert isinstance(stats["security_issues"], int)

    def test_fixes_structure_and_worst_offender_alignment(self, messy_monolith_metrics):
        roast = generate_roast(messy_monolith_metrics)
        fixes = roast["fixes"]
        assert isinstance(fixes, list)
        assert len(fixes) > 0
        for fix in fixes:
            assert isinstance(fix, dict)
            assert {"priority", "title", "file", "action"}.issubset(fix.keys())
            assert fix["priority"] in ("CRITICAL", "HIGH", "MEDIUM")

        # Invariant: Top fix must target the worst offender file
        assert fixes[0]["file"] == roast["worst_offender"]["file"]

    def test_share_text_validity(self, messy_monolith_metrics):
        roast = generate_roast(messy_monolith_metrics)
        st = roast["share_text"]
        assert isinstance(st, str) and len(st) > 0
        assert str(roast["overall_score"]) in st
        assert roast["grade"] in st
        assert "https://carbon.dev/roast" in st


# ============================================================
# 2. Deterministic Preservation Tests
# ============================================================

class TestDeterministicPreservation:
    """Verifies that the LLM cannot hallucinate or override deterministic scores/stats."""

    def test_overall_score_preservation_against_llm_hallucination(self, messy_monolith_metrics):
        expected_score, expected_grade = calculate_deterministic_score(messy_monolith_metrics)

        # Mock LLM attempting to claim score 100 on a broken codebase
        hallucinated_payload = {
            "overall_score": 100,
            "grade": "MICHELIN_STAR",
            "title": "Totally Fine",
            "roast": "Nothing wrong here!",
            "severity": "SAVAGE",
            "worst_offender": {"file": "fine.py", "metric": "0 lines", "reason": "None"},
            "top_crimes": [],
            "stats": {"total_files": 1, "total_loc": 10, "god_files_count": 0, "circular_deps_count": 0, "test_ratio": "100%", "security_issues": 0},
            "fixes": [{"priority": "LOW", "title": "Chill", "file": "fine.py", "action": "Relax"}],
            "share_text": "I got 100/100!"
        }
        mock_client = lambda prompt: json.dumps(hallucinated_payload)

        roast = generate_roast(messy_monolith_metrics, personality="SAVAGE", llm_client=mock_client)

        # Deterministic invariants must override hallucinated values
        assert roast["overall_score"] == expected_score
        assert roast["grade"] == expected_grade
        assert roast["stats"]["total_files"] == messy_monolith_metrics.total_files
        assert roast["stats"]["total_loc"] == messy_monolith_metrics.total_loc

    def test_stats_preservation_against_llm_hallucination(self, messy_monolith_metrics):
        mock_client = lambda prompt: json.dumps({
            "overall_score": 50,
            "grade": "ACCEPTABLE_CHAOS",
            "title": "Messy",
            "roast": "Spaghetti!",
            "severity": "SAVAGE",
            "worst_offender": {"file": "src/god_server.py", "metric": "2800 lines", "reason": "God object"},
            "top_crimes": [],
            "stats": {"total_files": 9999, "total_loc": 999999, "god_files_count": 0, "circular_deps_count": 0, "test_ratio": "99%", "security_issues": 0},
            "fixes": [{"priority": "HIGH", "title": "Fix", "file": "src/god_server.py", "action": "Split"}],
            "share_text": "Roast"
        })
        roast = generate_roast(messy_monolith_metrics, personality="SAVAGE", llm_client=mock_client)

        assert roast["stats"]["total_files"] == messy_monolith_metrics.total_files
        assert roast["stats"]["total_loc"] == messy_monolith_metrics.total_loc
        assert roast["stats"]["god_files_count"] == len(messy_monolith_metrics.god_files)

    def test_personality_invariance_on_deterministic_metrics(self, messy_monolith_metrics):
        r_light = generate_roast(messy_monolith_metrics, personality="LIGHT")
        r_savage = generate_roast(messy_monolith_metrics, personality="SAVAGE")
        r_brutal = generate_roast(messy_monolith_metrics, personality="BRUTAL")

        # Deterministic core must be identical across personalities
        assert r_light["overall_score"] == r_savage["overall_score"] == r_brutal["overall_score"]
        assert r_light["grade"] == r_savage["grade"] == r_brutal["grade"]
        assert r_light["stats"] == r_savage["stats"] == r_brutal["stats"]
        assert r_light["worst_offender"]["file"] == r_savage["worst_offender"]["file"] == r_brutal["worst_offender"]["file"]

        # Severities must reflect the requested personality
        assert r_light["severity"] == "LIGHT"
        assert r_savage["severity"] == "SAVAGE"
        assert r_brutal["severity"] == "BRUTAL"


# ============================================================
# 3. Personality Modes Tests
# ============================================================

class TestPersonalityModes:
    """Verifies tone, case-insensitivity, and fallback behavior across personality modes."""

    def test_personality_savage_default(self, messy_monolith_metrics):
        roast = generate_roast(messy_monolith_metrics)
        assert roast["severity"] == "SAVAGE"

    def test_personality_light(self, messy_monolith_metrics):
        roast = generate_roast(messy_monolith_metrics, personality="LIGHT")
        assert roast["severity"] == "LIGHT"

    def test_personality_brutal(self, messy_monolith_metrics):
        roast = generate_roast(messy_monolith_metrics, personality="BRUTAL")
        assert roast["severity"] == "BRUTAL"

    def test_personality_case_insensitive(self, messy_monolith_metrics):
        assert generate_roast(messy_monolith_metrics, personality="light")["severity"] == "LIGHT"
        assert generate_roast(messy_monolith_metrics, personality="savage")["severity"] == "SAVAGE"
        assert generate_roast(messy_monolith_metrics, personality="brutal")["severity"] == "BRUTAL"

    def test_personality_invalid_defaults_to_savage(self, messy_monolith_metrics):
        assert generate_roast(messy_monolith_metrics, personality="EXTREME_CHAOS")["severity"] == "SAVAGE"
        assert generate_roast(messy_monolith_metrics, personality="")["severity"] == "SAVAGE"


# ============================================================
# 4. LLM Robustness and Fallback Tests
# ============================================================

class TestLLMRobustnessAndFallback:
    """Tests infallible fallback behavior under various LLM failure modes."""

    def test_fallback_on_llm_exception(self, messy_monolith_metrics):
        def failing_client(prompt):
            raise ConnectionError("Ollama or Cloud LLM connection timed out")

        roast = generate_roast(messy_monolith_metrics, llm_client=failing_client)
        assert isinstance(roast, dict)
        assert REQUIRED_ROAST_KEYS.issubset(roast.keys())
        assert roast["worst_offender"]["file"] == "src/god_server.py"

    def test_fallback_on_none_or_empty_response(self, messy_monolith_metrics):
        for empty_val in (None, "", "   \n\t  "):
            roast = generate_roast(messy_monolith_metrics, llm_client=lambda p: empty_val)
            assert isinstance(roast, dict)
            assert REQUIRED_ROAST_KEYS.issubset(roast.keys())

    def test_fallback_on_malformed_json(self, messy_monolith_metrics):
        malformed = "I am an AI and here is your roast: {not valid json at all}"
        roast = generate_roast(messy_monolith_metrics, llm_client=lambda p: malformed)
        assert isinstance(roast, dict)
        assert REQUIRED_ROAST_KEYS.issubset(roast.keys())

    def test_parsing_markdown_code_fences(self, messy_monolith_metrics):
        valid_json = json.dumps({
            "title": "Fenced Roast",
            "roast": "Roast inside fences.",
            "top_crimes": [
                {
                    "crime": "God Object",
                    "file": "src/god_server.py",
                    "evidence": "2800 lines",
                    "roast": "Bloated file.",
                    "fix": "Refactor it."
                }
            ],
            "fixes": [
                {
                    "priority": "HIGH",
                    "title": "Refactor",
                    "file": "src/god_server.py",
                    "action": "Split it."
                }
            ],
            "share_text": "Custom share text"
        })
        fenced_response = f"```json\n{valid_json}\n```"

        roast = generate_roast(messy_monolith_metrics, llm_client=lambda p: fenced_response)
        assert roast["title"] == "Fenced Roast"
        assert roast["roast"] == "Roast inside fences."
        assert roast["fixes"][0]["file"] == "src/god_server.py"

    def test_parsing_embedded_json_in_preamble(self, messy_monolith_metrics):
        valid_dict = {
            "title": "Preamble Roast",
            "roast": "Roast with preamble.",
            "top_crimes": [
                {
                    "crime": "God Object",
                    "file": "src/god_server.py",
                    "evidence": "2800 lines",
                    "roast": "Bloated.",
                    "fix": "Split."
                }
            ],
            "fixes": [
                {
                    "priority": "HIGH",
                    "title": "Split god_server",
                    "file": "src/god_server.py",
                    "action": "Split into modules."
                }
            ],
            "share_text": "Custom share"
        }
        response_with_preamble = f"Here is your complete roast analysis:\n\n{json.dumps(valid_dict)}\n\nHope you enjoyed it!"

        roast = generate_roast(messy_monolith_metrics, llm_client=lambda p: response_with_preamble)
        assert roast["title"] == "Preamble Roast"
        assert roast["roast"] == "Roast with preamble."

    def test_deterministic_synthesizer_direct(self, messy_monolith_metrics):
        score, grade = calculate_deterministic_score(messy_monolith_metrics)
        payload = synthesize_deterministic_roast(
            metrics_dict=messy_monolith_metrics.to_dict(),
            personality="SAVAGE",
            overall_score=score,
            grade=grade
        )
        assert isinstance(payload, dict)
        assert REQUIRED_ROAST_KEYS.issubset(payload.keys())
        assert payload["overall_score"] == score
        assert payload["grade"] == grade
        assert payload["worst_offender"]["file"] == "src/god_server.py"
        assert payload["fixes"][0]["file"] == "src/god_server.py"


# ============================================================
# 5. Secret Redaction Tests
# ============================================================

class TestSecretRedaction:
    """Verifies that secrets are masked in prompt assembly and output payload."""

    def test_secrets_redacted_in_prompt_assembly(self, security_compromised_metrics):
        secret_sample = "AKIAIOSFODNN7EXAMPLE"
        security_compromised_metrics.security.findings.append({
            "ruleId": "SEC-001",
            "title": "Raw AWS Secret Key",
            "severity": "CRITICAL",
            "filePath": "src/leaky.js",
            "lineNumber": 1,
            "snippet": f"const aws_key = '{secret_sample}';",
            "remediation": "Do not hardcode secrets."
        })

        captured_prompts = []
        def intercept_client(prompt):
            captured_prompts.append(prompt)
            return json.dumps({
                "title": "Security Roast",
                "roast": "You leaked an AWS key!",
                "top_crimes": [],
                "fixes": [{"priority": "CRITICAL", "title": "Fix secret", "file": "src/config.js", "action": "Rotate key"}],
                "share_text": "Leaked key roast"
            })

        generate_roast(security_compromised_metrics, llm_client=intercept_client)
        assert len(captured_prompts) == 1
        prompt_text = captured_prompts[0]

        # Verify raw secret was redacted before prompt was sent
        assert secret_sample not in prompt_text
        assert REDACTION_TOKEN in prompt_text

    def test_secrets_redacted_in_output_payload(self, security_compromised_metrics):
        roast = generate_roast(security_compromised_metrics)
        serialized_roast = json.dumps(roast)

        # Confirm no raw AWS pattern exists anywhere in the JSON
        assert "AKIAIOSFODNN7EXAMPLE" not in serialized_roast

    def test_hostile_llm_echoing_secrets_is_redacted(self, messy_monolith_metrics):
        secret_sample = "AKIAIOSFODNN7EXAMPLE"
        hostile_llm_response = json.dumps({
            "title": f"Leaked Secret: {secret_sample}",
            "roast": f"Your secret is {secret_sample} and you should feel bad.",
            "top_crimes": [
                {
                    "crime": "Secret Leak",
                    "file": "src/god_server.py",
                    "evidence": f"Found {secret_sample}",
                    "roast": f"Echoing {secret_sample}",
                    "fix": "Remove secret"
                }
            ],
            "fixes": [
                {
                    "priority": "CRITICAL",
                    "title": f"Remove {secret_sample}",
                    "file": "src/god_server.py",
                    "action": f"Delete {secret_sample}"
                }
            ],
            "share_text": f"My secret was {secret_sample}"
        })

        roast = generate_roast(messy_monolith_metrics, llm_client=lambda p: hostile_llm_response)
        serialized = json.dumps(roast)

        assert secret_sample not in serialized
        assert REDACTION_TOKEN in serialized


# ============================================================
# 6. Worst Offender and Top Crimes Extraction Tests
# ============================================================

class TestWorstOffenderAndCrimesExtraction:
    """Verifies that worst offender and top crimes accurately reflect real metrics."""

    def test_god_file_worst_offender(self, messy_monolith_metrics):
        wo = identify_worst_offender(messy_monolith_metrics.to_dict())
        assert wo["file"] == "src/god_server.py"
        assert "2800 lines" in wo["metric"]
        assert "God object" in wo["reason"]

    def test_security_flaw_worst_offender(self, security_compromised_metrics):
        wo = identify_worst_offender(security_compromised_metrics.to_dict())
        assert wo["file"] == "src/config.js"
        assert "critical/high flaw" in wo["metric"]

    def test_circular_deps_worst_offender(self):
        metrics = {
            "scale": {"total_files": 4, "total_loc": 200, "largest_files": []},
            "architecture": {
                "god_files": [],
                "utils_dumping_grounds": [],
                "circular_dependencies": [["src/a.py", "src/b.py", "src/a.py"]]
            },
            "security": {"findings": []}
        }
        wo = identify_worst_offender(metrics)
        assert wo["file"] == "src/a.py"
        assert "circular" in wo["metric"].lower()

    def test_utils_dumping_ground_crime(self, messy_monolith_metrics):
        crimes = extract_top_crimes(messy_monolith_metrics.to_dict())
        utils_crime = next((c for c in crimes if c["file"] == "src/utils.py"), None)
        assert utils_crime is not None
        assert "Utils Dumping Ground" in utils_crime["crime"]

    def test_low_test_ratio_crime(self, messy_monolith_metrics):
        crimes = extract_top_crimes(messy_monolith_metrics.to_dict())
        test_crime = next((c for c in crimes if "Testing" in c["crime"]), None)
        assert test_crime is not None
        assert "0.0%" in test_crime["evidence"]

    def test_clean_codebase_graceful_handling(self, clean_metrics):
        roast = generate_roast(clean_metrics)
        assert roast["overall_score"] >= 90
        assert roast["grade"] == "MICHELIN_STAR"
        assert len(roast["top_crimes"]) > 0
        assert len(roast["fixes"]) > 0


# ============================================================
# 7. Custom LLM Client Interface Tests
# ============================================================

class TestLLMClientInterfaceSupport:
    """Verifies that generate_roast accepts various LLM client signatures."""

    def test_callable_client(self, clean_metrics):
        client = lambda p: json.dumps({"title": "Callable OK", "roast": "Clean code!"})
        roast = generate_roast(clean_metrics, llm_client=client)
        assert roast["title"] == "Callable OK"

    def test_client_with_generate_with_retry(self, clean_metrics):
        class RetryClient:
            def generate_with_retry(self, prompt):
                return json.dumps({"title": "RetryClient OK", "roast": "Clean code!"})

        roast = generate_roast(clean_metrics, llm_client=RetryClient())
        assert roast["title"] == "RetryClient OK"

    def test_client_with_generate(self, clean_metrics):
        class GenClient:
            def generate(self, prompt):
                return json.dumps({"title": "GenClient OK", "roast": "Clean code!"})

        roast = generate_roast(clean_metrics, llm_client=GenClient())
        assert roast["title"] == "GenClient OK"

    def test_client_with_generate_content(self, clean_metrics):
        class ContentResponse:
            def __init__(self, text):
                self.text = text

        class ContentClient:
            def generate_content(self, prompt):
                return ContentResponse(json.dumps({"title": "ContentClient OK", "roast": "Clean code!"}))

        roast = generate_roast(clean_metrics, llm_client=ContentClient())
        assert roast["title"] == "ContentClient OK"


# ============================================================
# 8. Backwards-Compatible run() Tests
# ============================================================

class TestBackwardsCompatibleRun:
    """Verifies that the legacy run() function called by main.py functions seamlessly."""

    def test_run_function_with_files_dict(self):
        files = {
            "src/app.py": "def main():\n    print('Hello')\n",
            "tests/test_app.py": "def test_main():\n    assert True\n"
        }
        roast = run(files_dict=files, personality="SAVAGE")
        assert isinstance(roast, dict)
        assert REQUIRED_ROAST_KEYS.issubset(roast.keys())
        assert roast["overall_score"] >= 90
        assert roast["severity"] == "SAVAGE"


# ============================================================
# 9. Milestone 2 Defensive Hardenings Tests
# ============================================================

class TestDefensiveHardenings:
    """Verifies that roast_agent is hardened against adversarial LLM hallucinations and null inputs."""

    def test_worst_offender_cannot_be_hallucinated_by_llm(self, messy_monolith_metrics):
        mock_payload = {
            "title": "Hallucinated Roast",
            "roast": "Roast text.",
            "worst_offender": {
                "file": "nonexistent_file_xyz.py",
                "metric": "9999 lines",
                "reason": "Completely made up file"
            },
            "top_crimes": [],
            "fixes": [
                {"priority": "HIGH", "title": "Other", "file": "src/other.py", "action": "Do something"}
            ],
            "share_text": "Share text"
        }
        roast = generate_roast(messy_monolith_metrics, llm_client=lambda p: json.dumps(mock_payload))

        # Must reject nonexistent file and preserve canonical worst offender
        assert roast["worst_offender"]["file"] == "src/god_server.py"
        # Invariant: fixes[0] must align with worst_offender
        assert roast["fixes"][0]["file"] == roast["worst_offender"]["file"]

    def test_worst_offender_alignment_with_fixes_when_llm_hallucinates_all_fixes(self, messy_monolith_metrics):
        mock_payload = {
            "title": "Hallucinated Fixes Roast",
            "roast": "Roast text.",
            "worst_offender": {
                "file": "hallucinated.py",
                "metric": "100 lines",
                "reason": "Hallucinated"
            },
            "top_crimes": [],
            "fixes": [
                {"priority": "HIGH", "title": "Fix something else", "file": "src/other_module.py", "action": "Refactor"}
            ],
            "share_text": "Share text"
        }
        roast = generate_roast(messy_monolith_metrics, llm_client=lambda p: json.dumps(mock_payload))

        assert roast["worst_offender"]["file"] == "src/god_server.py"
        assert roast["fixes"][0]["file"] == "src/god_server.py"

    def test_generate_roast_handles_null_none_fields_in_metrics_dictionary(self):
        null_metrics = {
            "scale": None,
            "architecture": None,
            "testing": None,
            "security": None,
            "naming": None,
            "complexity": None
        }
        roast = generate_roast(null_metrics)
        assert isinstance(roast, dict)
        assert REQUIRED_ROAST_KEYS.issubset(roast.keys())
        assert roast["stats"]["total_files"] == 0
        assert roast["stats"]["total_loc"] == 0
        assert roast["stats"]["god_files_count"] == 0
        assert roast["stats"]["circular_deps_count"] == 0
        assert roast["stats"]["security_issues"] == 0
        assert roast["worst_offender"]["file"] == "repository"
        assert roast["fixes"][0]["file"] == roast["worst_offender"]["file"]

    def test_generate_roast_handles_nested_none_values_in_metrics_dict(self):
        nested_null_metrics = {
            "scale": {"total_files": None, "total_loc": None, "largest_files": None},
            "architecture": {"god_files": None, "circular_dependencies": None, "utils_dumping_grounds": None},
            "testing": {"test_file_count": None, "test_to_code_ratio": None, "test_ratio_percentage": None},
            "security": {"findings": None},
            "naming": {"suspicious_identifiers": None},
            "complexity": {"deeply_nested_branches": None}
        }
        roast = generate_roast(nested_null_metrics)
        assert isinstance(roast, dict)
        assert REQUIRED_ROAST_KEYS.issubset(roast.keys())
        assert roast["stats"]["total_files"] == 0
        assert roast["stats"]["total_loc"] == 0
        assert roast["stats"]["god_files_count"] == 0
        assert roast["stats"]["circular_deps_count"] == 0
        assert roast["stats"]["security_issues"] == 0
        assert roast["worst_offender"]["file"] == "repository"
        assert roast["fixes"][0]["file"] == "repository"

    def test_extract_top_crimes_with_non_dict_suspicious_identifiers(self):
        metrics = {
            "scale": {"total_files": 1, "total_loc": 50},
            "naming": {"suspicious_identifiers": ["foo", "data", 123]},
            "testing": {"test_ratio_percentage": "100%", "test_to_code_ratio": 1.0}
        }
        crimes = extract_top_crimes(metrics)
        assert isinstance(crimes, list)
        sid_crime = next((c for c in crimes if "Ambiguous Identifier" in c["crime"]), None)
        assert sid_crime is not None
        assert "foo" in sid_crime["evidence"]

    def test_extract_fixes_with_null_and_non_dict_crimes(self):
        wo = {"file": None, "metric": None, "reason": None}
        crimes = [None, {"crime": None, "file": None, "fix": None}]
        fixes = extract_fixes(wo, crimes, 50)
        assert isinstance(fixes, list)
        assert len(fixes) > 0
        assert fixes[0]["file"] == "repository"

    def test_circular_dependency_with_non_string_elements(self):
        metrics = {
            "scale": {"total_files": 2, "total_loc": 100},
            "architecture": {"circular_dependencies": [[101, 102, 103]]}
        }
        wo = identify_worst_offender(metrics)
        assert "101" in wo["file"]
        assert "101 -> 102 -> 103" in wo["reason"]
