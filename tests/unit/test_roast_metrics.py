"""
Unit tests for Git ingestion, codebase metrics extraction, and secret redaction.
Covers:
- tools.git_cloner (URL normalization, validation, timeout, disk limit, cleanup, context manager)
- tools.security_redactor (redact_secrets, redact_security_findings)
- tools.codebase_metrics (RoastMetrics, extract_roast_metrics across scale, complexity, architecture, naming, testing, security)
"""

import os
import stat
import shutil
import tempfile
import time
import pytest
from unittest.mock import patch, MagicMock

from tools.git_cloner import (
    normalize_github_url,
    validate_github_url,
    clone_repo,
    cleanup_repo,
    clone_repo_context,
    MAX_REPO_DISK_BYTES
)
from tools.security_redactor import (
    redact_secrets,
    redact_security_findings,
    is_secret_present,
    REDACTION_TOKEN
)
from tools.codebase_metrics import (
    RoastMetrics,
    extract_roast_metrics,
    calculate_deterministic_score,
    is_test_file,
    is_utils_file
)


# ============================================================
#  1. Git Cloner & URL Normalization Tests
# ============================================================

class TestGitClonerNormalization:
    """Tests URL normalization and GitHub security policy validation."""

    @pytest.mark.parametrize("input_url,expected", [
        ("https://github.com/torvalds/linux", "https://github.com/torvalds/linux"),
        ("http://github.com/facebook/react", "https://github.com/facebook/react"),
        ("github.com/vercel/next.js", "https://github.com/vercel/next.js"),
        ("https://www.github.com/expressjs/express/", "https://github.com/expressjs/express"),
        ("https://github.com/pallets/flask.git", "https://github.com/pallets/flask"),
        ("https://github.com/python/cpython/tree/main", "https://github.com/python/cpython"),
        ("  https://github.com/owner/repo.git/  ", "https://github.com/owner/repo"),
    ])
    def test_normalize_valid_github_urls(self, input_url, expected):
        assert normalize_github_url(input_url) == expected

    @pytest.mark.parametrize("invalid_url", [
        "https://gitlab.com/owner/repo",
        "https://bitbucket.org/owner/repo",
        "https://malicious.site/github.com/owner/repo",
        "https://github.com/",
        "https://github.com/owner",
        "https://github.com/-flag/repo",
        "https://github.com/owner/-flag",
        "https://github.com/owner/repo;rm -rf /",
        "https://github.com/owner/repo|curl evil.com",
        "https://github.com/owner/repo`whoami`",
        "",
        None,
    ])
    def test_normalize_invalid_urls_raise_error(self, invalid_url):
        with pytest.raises(ValueError):
            normalize_github_url(invalid_url)

    def test_validate_github_url_returns_tuple(self):
        valid, err = validate_github_url("github.com/psf/requests")
        assert valid is True
        assert err is None

        valid_bad, err_bad = validate_github_url("https://gitlab.com/org/repo")
        assert valid_bad is False
        assert "Only https://github.com/ URLs are allowed" in err_bad



class TestGitClonerOperations:
    """Tests clone timeout, disk budget enforcement, and context manager."""

    @patch("git.Repo.clone_from")
    def test_clone_repo_success(self, mock_clone):
        mock_clone.return_value = MagicMock()
        result = clone_repo("https://github.com/test-org/test-repo")

        assert result["success"] is True
        assert result["repo_path"] is not None
        assert os.path.isdir(result["repo_path"])
        assert result["error"] is None

        # Clean up
        cleanup_repo(result["repo_path"])
        assert not os.path.exists(result["repo_path"])

    @patch("git.Repo.clone_from")
    def test_clone_repo_enforces_timeout_argument(self, mock_clone):
        mock_clone.return_value = MagicMock()
        result = clone_repo("https://github.com/owner/repo")
        try:
            assert mock_clone.called
            _, kwargs = mock_clone.call_args
            assert kwargs.get("kill_after_timeout") == 30
            assert kwargs.get("depth") == 1
        finally:
            if result.get("repo_path"):
                cleanup_repo(result["repo_path"])

    @patch("git.Repo.clone_from")
    def test_clone_repo_aborts_when_disk_budget_exceeded(self, mock_clone):
        # Create a mock repo directory that simulates exceeding 75MB
        def fake_clone(url, to_path, **kwargs):
            os.makedirs(to_path, exist_ok=True)
            # Create a sparse file or mock large file size check
            with open(os.path.join(to_path, "large.bin"), "wb") as f:
                f.seek(80 * 1024 * 1024 - 1)  # 80 MB
                f.write(b"\0")

        mock_clone.side_effect = fake_clone
        result = clone_repo("https://github.com/huge/monorepo")

        assert result["success"] is False
        assert result["repo_path"] is None
        assert "75MB disk budget limit" in result["error"]

    @patch("git.Repo.clone_from")
    def test_clone_repo_context_manager(self, mock_clone):
        mock_clone.return_value = MagicMock()
        captured_path = None

        with clone_repo_context("https://github.com/owner/context-test") as repo_path:
            captured_path = repo_path
            assert os.path.exists(repo_path)
            assert os.path.isdir(repo_path)

        # After exiting context, directory must be completely removed
        assert not os.path.exists(captured_path)

    def test_windows_safe_cleanup_handles_readonly_files(self):
        temp_dir = tempfile.mkdtemp(prefix="carbon_readonly_test_")
        test_file = os.path.join(temp_dir, "locked_pack.idx")
        with open(test_file, "w") as f:
            f.write("dummy git pack index")

        # Mark file as read-only (Windows Git object style)
        os.chmod(test_file, stat.S_IREAD)

        # Cleanup must safely clear read-only flag and remove directory
        cleanup_repo(temp_dir)
        assert not os.path.exists(temp_dir)


# ============================================================
#  2. Security Redactor Tests
# ============================================================

class TestSecurityRedactor:
    """Verifies that sensitive credentials are never leaked into prompts or output."""

    def test_redact_aws_access_key(self):
        raw = "export AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE\n"
        redacted = redact_secrets(raw)
        assert "AKIAIOSFODNN7EXAMPLE" not in redacted
        assert REDACTION_TOKEN in redacted

    def test_redact_jwt_secret_assignment(self):
        raw = 'const auth = jwt_secret = "super_secret_signing_key_12345";'
        redacted = redact_secrets(raw)
        assert "super_secret_signing_key_12345" not in redacted
        assert REDACTION_TOKEN in redacted

    def test_redact_database_connection_uri(self):
        raw = "DATABASE_URL=postgres://admin:superSecretP@ssword@db.internal:5432/production"
        redacted = redact_secrets(raw)
        assert "superSecretP@ssword" not in redacted
        assert REDACTION_TOKEN in redacted

    def test_redact_stripe_secret_key(self):
        raw = "STRIPE_KEY = 'sk_test_fake1234567890abcdef1234567890'"
        redacted = redact_secrets(raw)
        assert "1234567890abcdefghijklmnop" not in redacted
        assert REDACTION_TOKEN in redacted

    def test_clean_text_remains_unchanged(self):
        clean = "const port = 3000;\nconsole.log('Server started on port', port);"
        assert redact_secrets(clean) == clean

    def test_is_secret_present_detection(self):
        assert is_secret_present("AWS_KEY=AKIAIOSFODNN7EXAMPLE") is True
        assert is_secret_present("const x = 42;") is False

    def test_redact_security_findings(self):
        findings = [
            {
                "ruleId": "SEC-001",
                "title": "Hardcoded AWS Access Key",
                "severity": "CRITICAL",
                "filePath": "src/config.js",
                "lineNumber": 12,
                "snippet": "const key = 'AKIAIOSFODNN7EXAMPLE';",
                "remediation": "Store AWS credentials in env vars."
            },
            {
                "ruleId": "SEC-003",
                "title": "Exposed Database Connection URI",
                "severity": "HIGH",
                "filePath": "src/db.js",
                "lineNumber": 5,
                "snippet": "const uri = 'postgres://dbuser:mypassword123@localhost/app';",
                "remediation": "Use env var for db URI."
            }
        ]

        sanitized = redact_security_findings(findings)
        assert len(sanitized) == 2

        # Verify no raw secrets survive in snippets
        assert "AKIAIOSFODNN7EXAMPLE" not in sanitized[0]["snippet"]
        assert REDACTION_TOKEN in sanitized[0]["snippet"]

        assert "mypassword123" not in sanitized[1]["snippet"]
        assert REDACTION_TOKEN in sanitized[1]["snippet"]


# ============================================================
#  3. Codebase Metrics Extraction Tests
# ============================================================

class TestCodebaseMetricsExtraction:
    """Verifies quantitative metrics extraction on synthetic codebases."""

    def test_scale_metrics_calculation(self):
        files = {
            "src/index.js": "console.log('hello');\nconst x = 1;\n",
            "src/helper.py": "def foo():\n    return 42\n",
            "README.md": "# Title\nDocumentation\n"
        }
        metrics = extract_roast_metrics("", files)

        assert metrics.total_files == 3
        assert metrics.total_loc == 6
        assert "JavaScript" in metrics.languages
        assert "Python" in metrics.languages
        assert len(metrics.largest_files) == 3
        assert metrics.avg_file_size > 0

    def test_god_file_detection_by_loc(self):
        # Generate synthetic file exceeding 1000 lines
        huge_content = "\n".join([f"line_{i} = {i}" for i in range(1100)])
        files = {
            "src/normal.py": "x = 1\n",
            "src/monolith.py": huge_content
        }
        metrics = extract_roast_metrics("", files)

        assert len(metrics.god_files) == 1
        assert metrics.god_files[0]["file"] == "src/monolith.py"
        assert metrics.god_files[0]["lines"] == 1100
        assert any("exceeds 1000 LOC" in r for r in metrics.god_files[0]["reasons"])

    def test_god_file_detection_by_functions(self):
        # Generate synthetic file with 55 small functions (>50 functions)
        fn_content = "\n".join([f"def func_{i}():\n    return {i}\n" for i in range(55)])
        files = {
            "src/busy.py": fn_content
        }
        metrics = extract_roast_metrics("", files)

        assert len(metrics.god_files) == 1
        assert metrics.god_files[0]["file"] == "src/busy.py"
        assert metrics.god_files[0]["functions_count"] >= 50

    def test_utils_dumping_ground_detection(self):
        # File named utils.py >300 lines
        utils_content = "\n".join([f"def helper_{i}(): pass" for i in range(350)])
        clean_utils = "\n".join([f"def helper_{i}(): pass" for i in range(50)])

        files = {
            "src/utils.py": utils_content,
            "src/helpers.js": utils_content,
            "src/small_utils.py": clean_utils,
            "src/domain/service.py": utils_content  # Not named utils/helper
        }
        metrics = extract_roast_metrics("", files)

        dumping_ground_files = [d["file"] for d in metrics.utils_dumping_grounds]
        assert "src/utils.py" in dumping_ground_files
        assert "src/helpers.js" in dumping_ground_files
        assert "src/small_utils.py" not in dumping_ground_files

    def test_complexity_metrics(self):
        # 1. Deeply nested branch (depth >= 4)
        # 2. Long function (>50 lines)
        # 3. Excessive parameters (>= 5 params)
        long_func_body = "\n".join([f"    x_{i} = {i}" for i in range(60)])
        code = f"""
def complex_pipeline(p1, p2, p3, p4, p5, p6):
    if True:
        if True:
            if True:
                if True:
                    nested_val = 42
    return nested_val

def long_worker():
{long_func_body}
    return x_59
"""
        files = {"src/complex.py": code}
        metrics = extract_roast_metrics("", files)

        # Deep nesting detected
        assert len(metrics.deeply_nested_branches) >= 1
        assert metrics.deeply_nested_branches[0]["depth"] >= 4

        # Excessive parameters detected (>= 5)
        assert len(metrics.excessive_params) >= 1
        assert metrics.excessive_params[0]["name"] == "complex_pipeline"
        assert metrics.excessive_params[0]["params_count"] >= 5

        # Long function detected (>50 LOC)
        long_fn_names = [f["name"] for f in metrics.long_functions]
        assert "long_worker" in long_fn_names

    def test_circular_dependencies_detection(self):
        # Create circular import: module_a -> module_b -> module_a
        files = {
            "src/module_a.py": "from src.module_b import func_b\ndef func_a(): return 1\n",
            "src/module_b.py": "from src.module_a import func_a\ndef func_b(): return 2\n",
            "src/module_c.py": "from src.module_a import func_a\ndef func_c(): return 3\n"
        }
        metrics = extract_roast_metrics("", files)

        assert len(metrics.circular_dependencies) >= 1
        cycle = metrics.circular_dependencies[0]
        # Cycle contains both module_a and module_b
        assert any("module_a.py" in node for node in cycle)
        assert any("module_b.py" in node for node in cycle)

    def test_naming_smells_detection(self):
        py_code = """
def processData(data, temp):
    data2 = data + 1
    foo = 'bar'
    obj = {}
    return data2
"""
        files = {"src/bad_naming.py": py_code}
        metrics = extract_roast_metrics("", files)

        flagged_names = [item["identifier"].lower() for item in metrics.suspicious_identifiers]
        for smell in ["data", "temp", "data2", "foo", "obj", "processdata"]:
            assert smell in flagged_names

    def test_testing_metrics_calculation(self):
        files = {
            "src/core.py": "def add(a, b): return a + b\n",
            "src/service.py": "def mult(a, b): return a * b\n",
            "tests/test_core.py": "def test_add(): assert add(1, 2) == 3\n",
            "tests/test_empty.py": "def test_nothing():\n    pass\n"
        }
        metrics = extract_roast_metrics("", files)

        assert metrics.test_file_count == 2
        assert metrics.total_files == 4
        assert metrics.test_to_code_ratio == 0.5
        assert metrics.test_ratio_percentage == "50.0%"

        # Empty test detected
        assert len(metrics.empty_tests) >= 1
        assert metrics.empty_tests[0]["name"] == "test_nothing"

    def test_security_findings_are_redacted_in_metrics(self):
        vulnerable_code = "const aws_key = 'AKIAIOSFODNN7EXAMPLE';\nconst secret = jwt_secret = 'supersecrettoken123';\n"
        files = {"src/config.js": vulnerable_code}
        metrics = extract_roast_metrics("", files)

        assert metrics.security.critical_count > 0
        for finding in metrics.security_findings:
            assert "AKIAIOSFODNN7EXAMPLE" not in finding.get("snippet", "")
            assert "supersecrettoken123" not in finding.get("snippet", "")

    def test_to_dict_serialization(self):
        files = {"src/simple.py": "x = 1\n"}
        metrics = extract_roast_metrics("", files)
        data = metrics.to_dict()

        assert isinstance(data, dict)
        assert "scale" in data
        assert "complexity" in data
        assert "architecture" in data
        assert "naming" in data
        assert "testing" in data
        assert "security" in data
        assert data["scale"]["total_files"] == 1


# ============================================================
#  4. Empirical Adversarial Challenge Tests
# ============================================================

class TestAdversarialEmptyAndZeroLOC:
    """Stress tests on empty files, zero LOC, and empty dictionaries."""

    def test_completely_empty_dict(self):
        metrics = extract_roast_metrics("", {})
        assert metrics.total_files == 0
        assert metrics.total_loc == 0
        assert metrics.avg_file_size == 0.0
        assert metrics.test_to_code_ratio == 0.0
        assert metrics.test_ratio_percentage == "0.0%"
        assert metrics.god_files == []
        assert metrics.circular_dependencies == []
        score, grade = calculate_deterministic_score(metrics)
        assert 0 <= score <= 100
        assert grade in ["MICHELIN_STAR", "SENIOR_DEV", "ACCEPTABLE_CHAOS"]

    def test_zero_loc_files(self):
        files = {
            "empty.py": "",
            "empty.js": "",
            "empty.ts": "",
            "empty.txt": "",
            "tests/test_empty.py": ""
        }
        metrics = extract_roast_metrics("", files)
        assert metrics.total_files == 5
        assert metrics.total_loc == 0
        assert metrics.avg_file_size == 0.0
        assert metrics.test_file_count == 1
        assert metrics.test_to_code_ratio == 0.2
        assert metrics.god_files == []
        assert metrics.circular_dependencies == []
        score, grade = calculate_deterministic_score(metrics)
        assert 0 <= score <= 100

    def test_whitespace_only_files(self):
        files = {
            "spaces.py": "   \n\n\t\t\n   ",
            "newlines.js": "\n\n\n\n\n",
        }
        metrics = extract_roast_metrics("", files)
        assert metrics.total_files == 2
        assert metrics.total_loc == 9
        assert metrics.avg_file_size == 4.5
        score, grade = calculate_deterministic_score(metrics)
        assert 0 <= score <= 100


class TestAdversarialMassiveGodFiles:
    """Stress tests with 5000+ LOC files and high function counts."""

    def test_massive_python_god_file_5000_loc(self):
        import time
        lines = []
        for i in range(200):
            lines.append(f"def generated_func_{i}(a, b):")
            for j in range(24):
                lines.append(f"    var_{j} = a + b + {i * 24 + j}")
            lines.append("    return var_23\n")
        
        content = "\n".join(lines)
        actual_loc = len(content.splitlines())
        assert actual_loc >= 5000

        files = {
            "monolith.py": content,
            "small.py": "x = 1\n"
        }

        start_time = time.time()
        metrics = extract_roast_metrics("", files)
        elapsed = time.time() - start_time

        assert elapsed < 5.0, f"Extraction took too long: {elapsed:.2f}s"
        assert metrics.total_files == 2
        assert metrics.total_loc >= 5000
        assert len(metrics.god_files) == 1
        assert metrics.god_files[0]["file"] == "monolith.py"
        assert metrics.god_files[0]["lines"] >= 5000
        assert metrics.god_files[0]["functions_count"] == 200

        score, grade = calculate_deterministic_score(metrics)
        assert score <= 40
        assert grade in ["SPAGHETTI_JUNCTION", "DUMPSTER_FIRE", "IDIOT_SANDWICH"]

    def test_massive_javascript_god_file_5000_loc(self):
        lines = []
        for i in range(220):
            lines.append(f"function jsWorker_{i}(x, y) {{")
            for j in range(23):
                lines.append(f"    const step_{j} = x + y + {j};")
            lines.append("    return step_22;\n}\n")
        content = "\n".join(lines)
        actual_loc = len(content.splitlines())
        assert actual_loc >= 5000

        files = {"huge.js": content}
        metrics = extract_roast_metrics("", files)
        assert len(metrics.god_files) == 1
        assert metrics.god_files[0]["file"] == "huge.js"
        assert metrics.god_files[0]["lines"] >= 5000
        assert metrics.god_files[0]["functions_count"] >= 200


class TestAdversarialDeeplyNestedBranches:
    """Stress tests on deeply nested structures (indentation 12+ levels)."""

    def test_python_indentation_depth_12_plus(self):
        indent_lines = ["def deeply_nested_abomination():"]
        for d in range(1, 15):
            pad = "    " * d
            indent_lines.append(f"{pad}if condition_{d}:")
        indent_lines.append(f"{'    ' * 15}core_value = 999")
        indent_lines.append(f"{'    ' * 15}return core_value")

        code = "\n".join(indent_lines)
        files = {"nested.py": code}

        metrics = extract_roast_metrics("", files)
        assert len(metrics.deeply_nested_branches) > 0

        max_depth = max(b["depth"] for b in metrics.deeply_nested_branches)
        assert max_depth >= 12, f"Expected nesting depth >= 12, got {max_depth}"

        score, grade = calculate_deterministic_score(metrics)
        assert score <= 70

    def test_js_indentation_depth_14_spaces_and_tabs(self):
        js_lines = ["function testNestingJS() {"]
        for d in range(1, 14):
            pad = " " * (d * 4)
            js_lines.append(f"{pad}if (val_{d} > 0) {{")
        js_lines.append(f"{' ' * (14 * 4)}console.log('deep');")
        for d in range(13, 0, -1):
            pad = " " * (d * 4)
            js_lines.append(f"{pad}}}")
        js_lines.append("}")

        code = "\n".join(js_lines)
        files = {"nested.js": code}

        metrics = extract_roast_metrics("", files)
        assert len(metrics.deeply_nested_branches) > 0
        max_depth = max(b["depth"] for b in metrics.deeply_nested_branches)
        assert max_depth >= 12

    def test_python_indentation_depth_80_levels(self):
        # Extreme nesting: 80 levels
        indent_lines = ["def deep_recursion():"]
        for d in range(1, 80):
            indent_lines.append(f"{'    ' * d}if cond_{d}:")
        indent_lines.append(f"{'    ' * 80}return True")
        files = {"deep_rec.py": "\n".join(indent_lines)}
        metrics = extract_roast_metrics("", files)
        assert len(metrics.deeply_nested_branches) > 0
        max_depth = max(b["depth"] for b in metrics.deeply_nested_branches)
        assert max_depth >= 75


class TestAdversarialCircularDependencies:
    """Stress tests on 3-way, 4-way, figure-8, and self circular dependencies."""

    def test_3_way_circular_dependency(self):
        import time
        files = {
            "services/alpha.py": "from services.beta import beta_func\ndef alpha_func(): return 1\n",
            "services/beta.py": "from services.gamma import gamma_func\ndef beta_func(): return 2\n",
            "services/gamma.py": "from services.alpha import alpha_func\ndef gamma_func(): return 3\n",
            "services/isolated.py": "def isolated_func(): return 4\n"
        }

        start_time = time.time()
        metrics = extract_roast_metrics("", files)
        elapsed = time.time() - start_time

        assert elapsed < 3.0, f"Graph cycle detection took {elapsed:.2f}s"
        assert len(metrics.circular_dependencies) >= 1

        found_3way = False
        for c in metrics.circular_dependencies:
            nodes = [os.path.basename(n) for n in c]
            if "alpha.py" in nodes and "beta.py" in nodes and "gamma.py" in nodes:
                found_3way = True
                break
        assert found_3way, f"3-way circular dependency not found in {metrics.circular_dependencies}"

    def test_4_way_circular_dependency(self):
        files = {
            "node_a.ts": "import { b } from './node_b'; export const a = 1;",
            "node_b.ts": "import { c } from './node_c'; export const b = 2;",
            "node_c.ts": "import { d } from './node_d'; export const c = 3;",
            "node_d.ts": "import { a } from './node_a'; export const d = 4;",
        }
        metrics = extract_roast_metrics("", files)
        assert len(metrics.circular_dependencies) >= 1
        found_4way = False
        for c in metrics.circular_dependencies:
            nodes = [os.path.basename(n) for n in c]
            if all(f"node_{x}.ts" in nodes for x in ["a", "b", "c", "d"]):
                found_4way = True
                break
        assert found_4way, f"4-way circular dependency not found in {metrics.circular_dependencies}"

    def test_figure_eight_multi_cycles_no_hanging(self):
        import time
        files = {
            "module_a.py": "from module_b import b\ndef a(): pass",
            "module_b.py": "from module_c import c\ndef b(): pass",
            "module_c.py": "from module_a import a\nfrom module_d import d\ndef c(): pass",
            "module_d.py": "from module_e import e\ndef d(): pass",
            "module_e.py": "from module_c import c\ndef e(): pass"
        }
        start_time = time.time()
        metrics = extract_roast_metrics("", files)
        elapsed = time.time() - start_time

        assert elapsed < 3.0, f"Cycle analysis took {elapsed:.2f}s"
        assert len(metrics.circular_dependencies) >= 2

    def test_dense_interconnected_cycles_no_hanging(self):
        # 6 modules in a dense mutual-dependency mesh
        modules = [f"mod_{i}" for i in range(6)]
        files = {}
        for i, mod in enumerate(modules):
            imports = [f"from {m} import func_{m}" for m in modules if m != mod]
            content = "\n".join(imports) + f"\ndef func_{mod}(): pass\n"
            files[f"mesh/{mod}.py"] = content

        start_time = time.time()
        metrics = extract_roast_metrics("", files)
        elapsed = time.time() - start_time

        assert elapsed < 3.0, f"Dense mesh cycle detection took too long: {elapsed:.2f}s"
        assert len(metrics.circular_dependencies) > 0


class TestAdversarialSyntaxErrorsAndRobustness:
    """Stress tests on invalid syntax, malformed files, and unexpected tokens."""

    def test_python_syntax_errors_handled_gracefully(self):
        files = {
            "broken_def.py": "def foo(:\n  return 42",
            "unclosed_paren.py": "x = (1 + 2 * \n",
            "invalid_indent.py": "def bar():\nreturn 1\n",
            "random_junk.py": "@@@###$$$%%%^^^&&&***)))(((+++",
            "valid.py": "def ok():\n    return 'clean'\n"
        }

        metrics = extract_roast_metrics("", files)
        assert metrics.total_files == 5
        assert any(f["name"] == "ok" for f in metrics.largest_functions)

    def test_js_syntax_errors_handled_gracefully(self):
        files = {
            "broken.js": "function {{{{{{ const x = ;",
            "malformed.ts": "interface { : string = =>",
            "clean.js": "function validFunction() { return 123; }"
        }
        metrics = extract_roast_metrics("", files)
        assert metrics.total_files == 3
        assert any(f["name"] == "validFunction" for f in metrics.largest_functions)

    def test_null_byte_in_python_file(self):
        # Corrupted / binary file with .py extension
        files = {
            "corrupt.py": "def broken():\x00pass",
            "clean.py": "def fine(): return 1"
        }
        metrics = extract_roast_metrics("", files)
        assert metrics.total_files == 2

    def test_mixed_pathological_codebase(self):
        god_lines = ["# comment\n"] * 1200
        nested_lines = ["def deep():"] + ["    " * i + "if True:" for i in range(1, 14)] + ["    " * 14 + "return 1"]

        files = {
            "empty.py": "",
            "broken.py": "def ???:",
            "god.py": "".join(god_lines),
            "nested.py": "\n".join(nested_lines),
            "cycle1.py": "from cycle2 import b\ndef a(): pass",
            "cycle2.py": "from cycle3 import c\ndef b(): pass",
            "cycle3.py": "from cycle1 import a\ndef c(): pass",
            "utils.py": "\n".join([f"def u_{i}(): pass" for i in range(350)]),
            "tests/test_empty.py": "def test_nothing(): pass\n"
        }

        metrics = extract_roast_metrics("", files)
        assert metrics.total_files == 9
        assert len(metrics.god_files) >= 1
        assert len(metrics.deeply_nested_branches) > 0
        assert len(metrics.circular_dependencies) >= 1
        assert len(metrics.utils_dumping_grounds) >= 1
        assert len(metrics.empty_tests) >= 1

        score, grade = calculate_deterministic_score(metrics)
        assert score <= 35
        assert grade in ["SPAGHETTI_JUNCTION", "DUMPSTER_FIRE", "IDIOT_SANDWICH"]
