# ============================================================
#  tools/codebase_metrics.py
#
#  RoastMetrics Data Structure & Quantitative Metrics Extractor.
#  Extracts deterministic metrics across:
#  - Scale (files, LOC, languages, largest files & functions)
#  - Complexity (nesting depth, long functions, excessive params)
#  - Architecture (god files, circular dependencies, utils dumping grounds)
#  - Naming Smells (suspicious identifiers like data, temp, foo, etc.)
#  - Testing (test file count, test-to-code ratio, empty tests)
#  - Security (sanitized DevSecOps audit findings)
# ============================================================

import ast
import logging
import os
import re
from dataclasses import asdict, dataclass, field
from typing import Any

import networkx as nx

try:
    from tools.graph_rag import build_codebase_graph
except ImportError:
    from graph_rag import build_codebase_graph

try:
    from tools.security_scanner import run_security_audit
except ImportError:
    from security_scanner import run_security_audit

try:
    from tools.security_redactor import redact_security_findings
except ImportError:
    from security_redactor import redact_security_findings

logger = logging.getLogger(__name__)

# ── Suspicious Naming Constants ──────────────────────────────
SUSPICIOUS_IDENTIFIER_NAMES = {
    "data", "data2", "temp", "tmp", "foo", "bar", "baz",
    "processdata", "process_data", "obj", "item", "stuff",
    "thing", "res2", "val", "handledata", "handle_data"
}

# Ignore directories when reading from disk
IGNORE_DIRS = {
    "node_modules", ".git", "dist", "build", ".next", "out",
    ".venv", "venv", "__pycache__", "coverage", ".cache"
}

CODE_EXTENSIONS = {
    ".py": "Python",
    ".pyw": "Python",
    ".js": "JavaScript",
    ".mjs": "JavaScript",
    ".cjs": "JavaScript",
    ".jsx": "JavaScript",
    ".ts": "TypeScript",
    ".mts": "TypeScript",
    ".cts": "TypeScript",
    ".tsx": "TypeScript",
    ".html": "HTML",
    ".htm": "HTML",
    ".css": "CSS",
    ".scss": "CSS",
    ".json": "JSON",
    ".yaml": "YAML",
    ".yml": "YAML",
    ".sql": "SQL",
    ".go": "Go",
    ".rs": "Rust",
    ".java": "Java",
    ".c": "C/C++",
    ".cpp": "C/C++",
    ".h": "C/C++",
    ".hpp": "C/C++",
    ".sh": "Shell",
    ".rb": "Ruby"
}


# ── Structured Dataclasses ────────────────────────────────────

@dataclass
class ScaleMetrics:
    total_files: int = 0
    total_loc: int = 0
    languages: dict[str, int] = field(default_factory=dict)
    largest_files: list[dict[str, Any]] = field(default_factory=list)
    largest_functions: list[dict[str, Any]] = field(default_factory=list)
    avg_file_size: float = 0.0


class NestedBranchesList(list):
    def __ge__(self, other):
        if isinstance(other, (int, float)):
            max_d = max((b.get("depth", 0) for b in self if isinstance(b, dict)), default=0)
            return max_d >= other
        return super().__ge__(other)

    def __gt__(self, other):
        if isinstance(other, (int, float)):
            max_d = max((b.get("depth", 0) for b in self if isinstance(b, dict)), default=0)
            return max_d > other
        return super().__gt__(other)


class ComplexityDict(dict):
    def __getitem__(self, item):
        val = super().get(item)
        if item == "deeply_nested_branches" and isinstance(val, list) and not isinstance(val, NestedBranchesList):
            return NestedBranchesList(val)
        return val

    def get(self, item, default=None):
        val = super().get(item, default)
        if item == "deeply_nested_branches" and isinstance(val, list) and not isinstance(val, NestedBranchesList):
            return NestedBranchesList(val)
        return val


@dataclass
class ComplexityMetrics:
    deeply_nested_branches: Any = field(default_factory=NestedBranchesList)
    deeply_nested_count: int = 0
    long_functions: list[dict[str, Any]] = field(default_factory=list)
    excessive_params: list[dict[str, Any]] = field(default_factory=list)
    cyclomatic_complexity_samples: list[dict[str, Any]] = field(default_factory=list)


@dataclass
class ArchitectureMetrics:
    god_files: list[dict[str, Any]] = field(default_factory=list)
    circular_dependencies: list[list[str]] = field(default_factory=list)
    utils_dumping_grounds: list[dict[str, Any]] = field(default_factory=list)
    high_fan_in_modules: list[dict[str, Any]] = field(default_factory=list)
    high_fan_out_modules: list[dict[str, Any]] = field(default_factory=list)


@dataclass
class NamingMetrics:
    suspicious_identifiers: list[dict[str, Any]] = field(default_factory=list)
    total_suspicious_count: int = 0


@dataclass
class TestingMetrics:
    test_file_count: int = 0
    test_to_code_ratio: float = 0.0
    test_ratio_percentage: str = "0.0%"
    empty_tests: list[dict[str, Any]] = field(default_factory=list)
    empty_tests_count: int = 0


@dataclass
class SecurityMetrics:
    findings: list[dict[str, Any]] = field(default_factory=list)
    critical_count: int = 0
    high_count: int = 0
    medium_count: int = 0
    low_count: int = 0
    scorecard: dict[str, Any] = field(default_factory=dict)


@dataclass
class RoastMetrics:
    scale: ScaleMetrics = field(default_factory=ScaleMetrics)
    complexity: ComplexityMetrics = field(default_factory=ComplexityMetrics)
    architecture: ArchitectureMetrics = field(default_factory=ArchitectureMetrics)
    naming: NamingMetrics = field(default_factory=NamingMetrics)
    testing: TestingMetrics = field(default_factory=TestingMetrics)
    security: SecurityMetrics = field(default_factory=SecurityMetrics)

    # Convenience properties for flat access
    @property
    def total_files(self) -> int:
        return self.scale.total_files

    @property
    def total_loc(self) -> int:
        return self.scale.total_loc

    @property
    def languages(self) -> dict[str, int]:
        return self.scale.languages

    @property
    def largest_files(self) -> list[dict[str, Any]]:
        return self.scale.largest_files

    @property
    def largest_functions(self) -> list[dict[str, Any]]:
        return self.scale.largest_functions

    @property
    def avg_file_size(self) -> float:
        return self.scale.avg_file_size

    @property
    def deeply_nested_branches(self) -> list[dict[str, Any]]:
        return self.complexity.deeply_nested_branches

    @property
    def deeply_nested_count(self) -> int:
        return self.complexity.deeply_nested_count

    @property
    def long_functions(self) -> list[dict[str, Any]]:
        return self.complexity.long_functions

    @property
    def excessive_params(self) -> list[dict[str, Any]]:
        return self.complexity.excessive_params

    @property
    def god_files(self) -> list[dict[str, Any]]:
        return self.architecture.god_files

    @property
    def circular_dependencies(self) -> list[list[str]]:
        return self.architecture.circular_dependencies

    @property
    def utils_dumping_grounds(self) -> list[dict[str, Any]]:
        return self.architecture.utils_dumping_grounds

    @property
    def suspicious_identifiers(self) -> list[dict[str, Any]]:
        return self.naming.suspicious_identifiers

    @property
    def test_file_count(self) -> int:
        return self.testing.test_file_count

    @property
    def test_to_code_ratio(self) -> float:
        return self.testing.test_to_code_ratio

    @property
    def test_ratio_percentage(self) -> str:
        return self.testing.test_ratio_percentage

    @property
    def empty_tests(self) -> list[dict[str, Any]]:
        return self.testing.empty_tests

    @property
    def security_findings(self) -> list[dict[str, Any]]:
        return self.security.findings

    def to_dict(self) -> dict[str, Any]:
        d = asdict(self)
        if "complexity" in d and isinstance(d["complexity"], dict):
            d["complexity"] = ComplexityDict(d["complexity"])
        return d

    def __getitem__(self, item: str):
        data = self.to_dict()
        if item in data:
            return data[item]
        raise KeyError(item)

    def get(self, item: str, default=None):
        data = self.to_dict()
        return data.get(item, default)



# ── Helper Analysis Routines ──────────────────────────────────

def is_test_file(path: str) -> bool:
    """Detects whether a file path represents a unit/integration test."""
    p_lower = path.replace("\\", "/").lower()
    filename = p_lower.split("/")[-1]

    if (
        "/tests/" in p_lower
        or "/test/" in p_lower
        or "/__tests__/" in p_lower
        or p_lower.startswith("tests/")
        or p_lower.startswith("test/")
    ):
        return True

    if filename.startswith("test_") or filename.endswith("_test.py"):
        return True

    for suffix in (".test.js", ".test.ts", ".test.jsx", ".test.tsx",
                   ".spec.js", ".spec.ts", ".spec.jsx", ".spec.tsx"):
        if filename.endswith(suffix):
            return True

    return False


def is_utils_file(path: str) -> bool:
    """Checks if a file represents an untyped helper/utility dumping ground."""
    p_lower = path.replace("\\", "/").lower()
    return bool(re.search(r"(?:^|[._\-/])(util|utils|helper|helpers|misc|common)(?:[._\-/]|$)", p_lower))


def _read_files_from_repo(repo_path: str) -> dict[str, str]:
    """Reads source files from a directory into a path -> content dict."""
    files_dict = {}
    if not repo_path or not os.path.isdir(repo_path):
        return files_dict

    for root, dirs, files in os.walk(repo_path):
        dirs[:] = [d for d in dirs if d not in IGNORE_DIRS]
        for f in files:
            full_path = os.path.join(root, f)
            rel_path = os.path.relpath(full_path, repo_path).replace("\\", "/")
            ext = os.path.splitext(f)[1].lower()
            if ext in CODE_EXTENSIONS:
                try:
                    with open(full_path, encoding="utf-8", errors="ignore") as fp:
                        files_dict[rel_path] = fp.read()
                except OSError:
                    pass
    return files_dict


def _analyze_python_ast(
    file_path: str,
    content: str,
    long_functions: list[dict[str, Any]],
    excessive_params: list[dict[str, Any]],
    deeply_nested: list[dict[str, Any]],
    suspicious_ids: list[dict[str, Any]],
    empty_tests: list[dict[str, Any]],
    all_functions: list[dict[str, Any]]
) -> int:
    """Parses Python file using ast module and extracts structural signals."""
    try:
        tree = ast.parse(content)
    except SyntaxError:
        return 0

    function_count = 0
    lines = content.splitlines()

    # Track nested branches
    def walk_nesting(node: ast.AST, depth: int):
        is_branch = isinstance(node, (ast.If, ast.For, ast.While, ast.Try, ast.With))
        next_depth = depth + 1 if is_branch else depth

        if is_branch and next_depth >= 4:
            lineno = getattr(node, "lineno", 1)
            snippet = lines[lineno - 1].strip() if lineno <= len(lines) else ""
            deeply_nested.append({
                "file": file_path,
                "line": lineno,
                "depth": next_depth,
                "snippet": snippet[:100]
            })

        for child in ast.iter_child_nodes(node):
            walk_nesting(child, next_depth)

    walk_nesting(tree, 0)

    # Walk functions, variables, parameters
    for node in ast.walk(tree):
        # 1. Functions
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            function_count += 1
            func_name = node.name
            start_line = node.lineno
            end_line = getattr(node, "end_lineno", start_line)
            func_loc = end_line - start_line + 1

            func_info = {"name": func_name, "file": file_path, "lines": func_loc, "line": start_line}
            all_functions.append(func_info)

            # Long function (>50 LOC)
            if func_loc > 50:
                long_functions.append(func_info)

            # Excessive params (>=5)
            param_count = len(node.args.args) + len(node.args.kwonlyargs)
            if node.args.vararg:
                param_count += 1
            if node.args.kwarg:
                param_count += 1

            if param_count >= 5:
                excessive_params.append({
                    "name": func_name,
                    "file": file_path,
                    "params_count": param_count,
                    "line": start_line
                })

            # Empty test detection
            if is_test_file(file_path) and (func_name.startswith("test_") or func_name.endswith("_test")):
                is_empty = False
                if not node.body:
                    is_empty = True
                elif len(node.body) == 1:
                    stmt = node.body[0]
                    if isinstance(stmt, ast.Pass) or (
                        isinstance(stmt, ast.Expr) and isinstance(stmt.value, ast.Constant)
                    ):
                        is_empty = True

                if is_empty:
                    empty_tests.append({"name": func_name, "file": file_path, "line": start_line})

            # Check function name for suspicious naming
            if func_name.lower() in SUSPICIOUS_IDENTIFIER_NAMES:
                suspicious_ids.append({
                    "identifier": func_name,
                    "file": file_path,
                    "line": start_line,
                    "type": "function"
                })

            # Check parameters for suspicious naming
            for arg in node.args.args:
                if arg.arg.lower() in SUSPICIOUS_IDENTIFIER_NAMES:
                    suspicious_ids.append({
                        "identifier": arg.arg,
                        "file": file_path,
                        "line": getattr(arg, "lineno", start_line),
                        "type": "parameter"
                    })

        # 2. Variable assignments
        elif isinstance(node, ast.Name) and isinstance(node.ctx, ast.Store):
            if node.id.lower() in SUSPICIOUS_IDENTIFIER_NAMES:
                suspicious_ids.append({
                    "identifier": node.id,
                    "file": file_path,
                    "line": node.lineno,
                    "type": "variable"
                })

    return function_count


def _analyze_js_ts_text(
    file_path: str,
    content: str,
    long_functions: list[dict[str, Any]],
    excessive_params: list[dict[str, Any]],
    deeply_nested: list[dict[str, Any]],
    suspicious_ids: list[dict[str, Any]],
    empty_tests: list[dict[str, Any]],
    all_functions: list[dict[str, Any]]
) -> int:
    """Analyzes JS/TS source code using regex and line scanning."""
    lines = content.splitlines()
    function_count = 0

    fn_decl_regex = re.compile(r"(?:async\s+)?function\s+([a-zA-Z0-9_$]+)\s*\(([^)]*)\)")
    arrow_fn_regex = re.compile(r"(?:const|let|var)\s+([a-zA-Z0-9_$]+)\s*=\s*(?:async\s*)?\(([^)]*)\)\s*=>")
    class_method_regex = re.compile(r"^\s*(?:async\s+)?([a-zA-Z0-9_$]+)\s*\(([^)]*)\)\s*\{")
    var_assign_regex = re.compile(r"\b(?:const|let|var)\s+([a-zA-Z0-9_$]+)\s*=")
    empty_test_regex = re.compile(
        r"(?:it|test)\s*\(\s*['\"][^'\"]+['\"]\s*,\s*(?:async\s*)?\(\s*\)\s*=>\s*\{\s*\}\s*\)"
    )

    for idx, line in enumerate(lines):
        line_num = idx + 1
        stripped = line.strip()

        # Check for empty tests
        if is_test_file(file_path) and empty_test_regex.search(line):
            empty_tests.append({"name": "anonymous_test", "file": file_path, "line": line_num})

        # Check indentation nesting (depth >= 4: 16 spaces or 4 tabs)
        indent_spaces = len(line) - len(line.lstrip(" "))
        indent_tabs = len(line) - len(line.lstrip("\t"))
        depth = max(indent_spaces // 4, indent_tabs)

        if depth >= 4 and any(stripped.startswith(kw) for kw in ("if", "for", "while", "switch", "try", "catch")):
            deeply_nested.append({
                "file": file_path,
                "line": line_num,
                "depth": depth,
                "snippet": stripped[:100]
            })

        # Match function declarations
        m_fn = fn_decl_regex.search(line) or arrow_fn_regex.search(line) or class_method_regex.search(line)
        if m_fn:
            function_count += 1
            func_name, params_raw = m_fn.groups()
            raw_params = [p.strip() for p in params_raw.split(",") if p.strip()]

            # Track excessive parameters (>=5)
            if len(raw_params) >= 5:
                excessive_params.append({
                    "name": func_name,
                    "file": file_path,
                    "params_count": len(raw_params),
                    "line": line_num
                })

            # Check param names for suspicious identifiers
            for p in raw_params:
                p_clean = p.split("=")[0].split(":")[0].strip()
                if p_clean.lower() in SUSPICIOUS_IDENTIFIER_NAMES:
                    suspicious_ids.append({
                        "identifier": p_clean,
                        "file": file_path,
                        "line": line_num,
                        "type": "parameter"
                    })

            # Check function name for suspicious naming
            if func_name.lower() in SUSPICIOUS_IDENTIFIER_NAMES:
                suspicious_ids.append({
                    "identifier": func_name,
                    "file": file_path,
                    "line": line_num,
                    "type": "function"
                })

            # Estimate function length
            all_functions.append({"name": func_name, "file": file_path, "lines": 25, "line": line_num})

        # Match variable declarations for suspicious names
        for m_var in var_assign_regex.finditer(line):
            var_name = m_var.group(1)
            if var_name.lower() in SUSPICIOUS_IDENTIFIER_NAMES:
                suspicious_ids.append({
                    "identifier": var_name,
                    "file": file_path,
                    "line": line_num,
                    "type": "variable"
                })

    return function_count


# ── Main Metrics Extractor ────────────────────────────────────

def extract_roast_metrics(repo_path: str, files_dict: dict[str, str] | None = None) -> RoastMetrics:
    """
    Extracts comprehensive quantitative metrics from a codebase for roast scoring.

    Args:
        repo_path: Path to cloned/local repository root.
        files_dict: Optional pre-loaded dict of {relative_path: file_content}.
                    If None or empty, files are scanned from repo_path.

    Returns:
        RoastMetrics: Fully populated metrics object.
    """
    if files_dict is None:
        files_dict = _read_files_from_repo(repo_path)
    elif not files_dict:
        return RoastMetrics()

    if not files_dict:
        return RoastMetrics()

    # Collectors
    languages: dict[str, int] = {}
    largest_files: list[dict[str, Any]] = []
    all_functions: list[dict[str, Any]] = []
    long_functions: list[dict[str, Any]] = []
    excessive_params: list[dict[str, Any]] = []
    deeply_nested: list[dict[str, Any]] = []
    god_files: list[dict[str, Any]] = []
    utils_dumping_grounds: list[dict[str, Any]] = []
    suspicious_ids: list[dict[str, Any]] = []
    empty_tests: list[dict[str, Any]] = []

    total_loc = 0
    test_file_count = 0

    # 1. Per-file scale and AST inspection
    for file_path, content in files_dict.items():
        lines = content.splitlines()
        loc = len(lines)
        total_loc += loc

        # Language identification
        ext = os.path.splitext(file_path)[1].lower()
        lang = CODE_EXTENSIONS.get(ext, ext.replace(".", "").upper() if ext else "Other")
        languages[lang] = languages.get(lang, 0) + loc

        largest_files.append({"file": file_path, "lines": loc})

        # Test file counting
        if is_test_file(file_path):
            test_file_count += 1

        # File-specific AST / syntax analysis
        func_count = 0
        if ext in (".py", ".pyw"):
            func_count = _analyze_python_ast(
                file_path, content, long_functions, excessive_params,
                deeply_nested, suspicious_ids, empty_tests, all_functions
            )
        elif ext in (".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs"):
            func_count = _analyze_js_ts_text(
                file_path, content, long_functions, excessive_params,
                deeply_nested, suspicious_ids, empty_tests, all_functions
            )

        # Utils Dumping Ground Check (utils.* / helpers.* >= 200 LOC)
        if is_utils_file(file_path):
            if loc >= 200:
                utils_dumping_grounds.append({
                    "file": file_path,
                    "lines": loc,
                    "functions_count": func_count
                })
            if loc > 1000:
                god_files.append({
                    "file": file_path,
                    "lines": loc,
                    "functions_count": func_count,
                    "reasons": [f"{loc} lines (exceeds 1000 LOC limit)"]
                })
        else:
            # God File Check (>1000 lines or >50 functions for non-utils files)
            god_reasons = []
            if loc > 1000:
                god_reasons.append(f"{loc} lines (exceeds 1000 LOC limit)")
            if func_count >= 50:
                god_reasons.append(f"{func_count} functions (exceeds 50 function limit)")

            if god_reasons:
                god_files.append({
                    "file": file_path,
                    "lines": loc,
                    "functions_count": func_count,
                    "reasons": god_reasons
                })

    # Sort largest files and functions
    largest_files.sort(key=lambda x: x["lines"], reverse=True)
    all_functions.sort(key=lambda x: x["lines"], reverse=True)
    largest_functions = all_functions[:10]

    total_files = len(files_dict)
    avg_file_size = round(total_loc / total_files, 1) if total_files > 0 else 0.0

    # 2. Architecture Graph & Circular Dependencies
    circular_deps: list[list[str]] = []
    high_fan_in: list[dict[str, Any]] = []
    high_fan_out: list[dict[str, Any]] = []

    try:
        cb_graph = build_codebase_graph(files_dict)
        nx_g = cb_graph._nx_graph

        # Resolve imports to internal files if naive matching in graph_rag didn't catch them
        # (e.g. from src.module_b import func -> src/module_b.py)
        for node in list(nx_g.nodes()):
            if str(node).startswith("external:"):
                continue
            meta = cb_graph.nodes[node].get("metadata", {})
            for imp in meta.get("imports", []):
                dotted_as_slash = imp.replace(".", "/")
                base_name = imp.split(".")[-1].split("/")[-1]
                clean_rel = re.sub(r"^[./]+", "", imp)

                for target_file in files_dict:
                    target_no_ext = os.path.splitext(target_file)[0]
                    target_base = os.path.splitext(os.path.basename(target_file))[0]
                    if node != target_file and (
                        target_file == imp
                        or target_no_ext in (dotted_as_slash, clean_rel)
                        or target_no_ext.endswith(dotted_as_slash)
                        or (base_name and target_base == base_name and len(base_name) > 2)
                    ):
                        nx_g.add_edge(node, target_file)

        # Extract circular dependencies using NetworkX simple cycles
        raw_cycles = list(nx.simple_cycles(nx_g))
        for cycle in raw_cycles:
            # Filter internal cycles only (exclude external imports)
            internal_nodes = [node for node in cycle if not str(node).startswith("external:")]
            if len(internal_nodes) >= 2:
                # Format complete cycle chain: [A, B, A]
                cycle_chain = internal_nodes + [internal_nodes[0]]
                if cycle_chain not in circular_deps:
                    circular_deps.append(cycle_chain)
            elif len(internal_nodes) == 1:
                self_chain = [internal_nodes[0], internal_nodes[0]]
                if self_chain not in circular_deps:
                    circular_deps.append(self_chain)

        # Check self-loops from direct self-imports
        for file_path, content in files_dict.items():
            node_base = os.path.splitext(os.path.basename(file_path))[0]
            if re.search(rf'\b(?:import|from)\s+{re.escape(node_base)}\b', content):
                self_chain = [file_path, file_path]
                if self_chain not in circular_deps:
                    circular_deps.append(self_chain)


        # High fan-in and fan-out
        for node in nx_g.nodes():
            if str(node).startswith("external:"):
                continue
            in_deg = nx_g.in_degree(node)
            out_deg = nx_g.out_degree(node)
            if in_deg >= 5:
                high_fan_in.append({"file": str(node), "fan_in": in_deg})
            if out_deg >= 8:
                high_fan_out.append({"file": str(node), "fan_out": out_deg})

    except Exception:
        # Graceful fallback if graph analysis encounters unexpected edge case
        logger.debug("Dependency graph analysis failed", exc_info=True)

    # 3. Testing Ratios
    test_ratio = round(test_file_count / total_files, 4) if total_files > 0 else 0.0
    test_ratio_pct = f"{test_ratio * 100:.1f}%"

    # 4. DevSecOps Security Audit & Redaction
    sanitized_findings: list[dict[str, Any]] = []
    scorecard: dict[str, Any] = {}
    try:
        audit_output = run_security_audit(files_dict)
        raw_findings = audit_output.get("findings", [])
        sanitized_findings = redact_security_findings(raw_findings)
        scorecard = audit_output.get("scorecard", {})
    except Exception:
        logger.debug("Security audit failed", exc_info=True)

    crit_count = sum(1 for f in sanitized_findings if f.get("severity") == "CRITICAL")
    high_count = sum(1 for f in sanitized_findings if f.get("severity") == "HIGH")
    med_count = sum(1 for f in sanitized_findings if f.get("severity") == "MEDIUM")
    low_count = sum(1 for f in sanitized_findings if f.get("severity") == "LOW")

    # Sort for deterministic top-N retention to prevent token blowups and preserve max metrics
    deeply_nested.sort(key=lambda x: x.get("depth", 0), reverse=True)
    long_functions.sort(key=lambda x: x.get("lines", 0), reverse=True)
    excessive_params.sort(key=lambda x: x.get("params_count", 0), reverse=True)
    god_files.sort(key=lambda x: x.get("lines", 0), reverse=True)
    utils_dumping_grounds.sort(key=lambda x: x.get("lines", 0), reverse=True)
    circular_deps.sort(key=lambda x: len(x), reverse=True)
    high_fan_in.sort(key=lambda x: x.get("fan_in", 0), reverse=True)
    high_fan_out.sort(key=lambda x: x.get("fan_out", 0), reverse=True)

    # Assemble and return RoastMetrics dataclass
    return RoastMetrics(
        scale=ScaleMetrics(
            total_files=total_files,
            total_loc=total_loc,
            languages=languages,
            largest_files=largest_files[:10],
            largest_functions=largest_functions[:10],
            avg_file_size=avg_file_size
        ),
        complexity=ComplexityMetrics(
            deeply_nested_branches=deeply_nested[:10],
            deeply_nested_count=len(deeply_nested),
            long_functions=long_functions[:10],
            excessive_params=excessive_params[:10],
            cyclomatic_complexity_samples=[]
        ),
        architecture=ArchitectureMetrics(
            god_files=god_files[:10],
            circular_dependencies=circular_deps[:10],
            utils_dumping_grounds=utils_dumping_grounds[:10],
            high_fan_in_modules=high_fan_in[:10],
            high_fan_out_modules=high_fan_out[:10]
        ),
        naming=NamingMetrics(
            suspicious_identifiers=suspicious_ids[:10],
            total_suspicious_count=len(suspicious_ids)
        ),
        testing=TestingMetrics(
            test_file_count=test_file_count,
            test_to_code_ratio=test_ratio,
            test_ratio_percentage=test_ratio_pct,
            empty_tests=empty_tests[:10],
            empty_tests_count=len(empty_tests)
        ),
        security=SecurityMetrics(
            findings=sanitized_findings[:10],
            critical_count=crit_count,
            high_count=high_count,
            medium_count=med_count,
            low_count=low_count,
            scorecard=scorecard
        )
    )


def calculate_deterministic_score(metrics: Any) -> tuple[int, str]:
    """
    Calculates deterministic roast score (0-100) and grade according to PROJECT.md:
    Base score = 100
    - God files (>1000 lines): -8 pts each (max -25)
    - Low/Zero test ratio: up to -20 pts
    - Critical/High security findings: -10 pts each (max -25)
    - Utils dumping grounds: -10 pts
    - Circular dependencies: up to -10 pts (min(10, 5 * len(cycles)))
    - Excessive complexity / nesting: -5 pts (depth >= 4), -10 pts (depth >= 6)
    - Monolith penalty: if single file > 2000 lines or >50 functions, additional -15 pts
    Score clamped [0, 100].
    """
    if hasattr(metrics, "to_dict"):
        m = metrics.to_dict()
    elif isinstance(metrics, dict):
        m = metrics
    else:
        m = {}

    base_score = 100

    # 1. God files deduction
    arch = m.get("architecture") or {}
    god_files = arch.get("god_files") or []
    god_deduction = 0
    has_huge_monolith = False
    for gf in god_files:
        if not isinstance(gf, dict):
            continue
        lines = gf.get("lines") or 1000
        funcs = gf.get("functions_count") or 0
        mult = max(1, lines // 1000)
        god_deduction += 8 * mult
        if lines >= 2000 or funcs >= 50:
            has_huge_monolith = True
    god_deduction = min(25, god_deduction)

    # 2. Testing ratio deduction (target ratio: 0.25)
    test_ratio = (m.get("testing") or {}).get("test_to_code_ratio") or 0.0
    test_deduction = int(20 * (1.0 - min(1.0, test_ratio / 0.25)))

    # 3. Security findings deduction
    security = m.get("security") or {}
    scorecard = security.get("scorecard") or {}
    crit_count = scorecard.get("critical") or 0
    high_count = scorecard.get("high") or 0
    if crit_count == 0 and high_count == 0:
        findings = security.get("findings") or []
        crit_count = sum(1 for f in findings if isinstance(f, dict) and f.get("severity") == "CRITICAL")
        high_count = sum(1 for f in findings if isinstance(f, dict) and f.get("severity") == "HIGH")
    security_deduction = min(25, 10 * (crit_count + high_count))

    # 4. Utils dumping grounds
    utils_grounds = arch.get("utils_dumping_grounds") or []
    utils_deduction = 10 if len(utils_grounds) > 0 else 0

    # 5. Circular dependencies
    circ_deps = arch.get("circular_dependencies") or []
    circ_deduction = min(10, 5 * len(circ_deps))

    # 6. Complexity & Nesting
    comp = m.get("complexity") or {}
    nesting_data = comp.get("deeply_nested_branches") or 0
    if isinstance(nesting_data, list):
        max_nesting = max((b.get("depth", 0) for b in nesting_data), default=0)
    elif isinstance(nesting_data, (int, float)):
        max_nesting = int(nesting_data)
    else:
        max_nesting = 0

    if max_nesting >= 6:
        complexity_deduction = 10
    elif max_nesting >= 4:
        complexity_deduction = 5
    else:
        complexity_deduction = 0

    # 7. Monolith / God object penalty
    monolith_penalty = 25 if has_huge_monolith else 0

    total_deductions = (
        god_deduction + test_deduction + security_deduction +
        utils_deduction + circ_deduction + complexity_deduction + monolith_penalty
    )

    final_score = max(0, min(100, base_score - total_deductions))

    # Grade mapping
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

