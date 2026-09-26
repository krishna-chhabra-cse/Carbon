"""
tools/ast_parser.py — Real AST-based code skeletonizer.

Replaces the regex-based approach with:
  - Python `ast` module for .py files (zero dependencies, 100% accurate)
  - tree-sitter for JS/TS files (handles JSX, TSX, modern syntax)

Falls back to the original regex skeletonizer for unsupported languages.
"""

import ast as python_ast
from typing import Optional

# ── Python Skeletonizer (using built-in ast) ──────────────────

class PythonASTSkeletonizer:
    """Extracts structural skeleton from Python source using the `ast` module."""

    def skeletonize(self, source: str, filepath: str = "") -> str:
        try:
            tree = python_ast.parse(source)
        except SyntaxError:
            # Fall back to regex for files that can't be parsed
            from tools.ast_skeletonizer import skeletonize_python
            return skeletonize_python(source)

        parts = []
        for node in python_ast.iter_child_nodes(tree):
            if isinstance(node, (python_ast.Import, python_ast.ImportFrom)):
                parts.append(python_ast.unparse(node))

            elif isinstance(node, python_ast.ClassDef):
                parts.append(self._class_skeleton(node))

            elif isinstance(node, (python_ast.FunctionDef, python_ast.AsyncFunctionDef)):
                parts.append(self._function_skeleton(node))

            elif isinstance(node, python_ast.Assign):
                # Keep top-level constant assignments (e.g., CONFIG = {...})
                for target in node.targets:
                    if isinstance(target, python_ast.Name) and target.id.isupper():
                        parts.append(python_ast.unparse(node))

        skeleton = "\n\n".join(parts)
        if len(skeleton) < len(source) * 0.7:
            return f"# [AST SKELETON: {filepath} — {len(source.splitlines())} lines → {len(skeleton.splitlines())} structural lines]\n\n{skeleton}"
        return source

    def _function_skeleton(self, node) -> str:
        lines = []
        for dec in node.decorator_list:
            lines.append(f"@{python_ast.unparse(dec)}")

        args_str = python_ast.unparse(node.args)
        returns = f" -> {python_ast.unparse(node.returns)}" if node.returns else ""
        prefix = "async def" if isinstance(node, python_ast.AsyncFunctionDef) else "def"
        lines.append(f"{prefix} {node.name}({args_str}){returns}:")

        # Preserve docstring
        if (node.body
                and isinstance(node.body[0], python_ast.Expr)
                and isinstance(node.body[0].value, python_ast.Constant)
                and isinstance(node.body[0].value.value, str)):
            docstring = node.body[0].value.value
            if len(docstring) > 200:
                docstring = docstring[:200] + "..."
            lines.append(f'    """{docstring}"""')

        lines.append("    ...")
        return "\n".join(lines)

    def _class_skeleton(self, node) -> str:
        lines = []
        for dec in node.decorator_list:
            lines.append(f"@{python_ast.unparse(dec)}")

        bases = ", ".join(python_ast.unparse(b) for b in node.bases)
        lines.append(f"class {node.name}({bases}):" if bases else f"class {node.name}:")

        # Preserve docstring
        if (node.body
                and isinstance(node.body[0], python_ast.Expr)
                and isinstance(node.body[0].value, python_ast.Constant)
                and isinstance(node.body[0].value.value, str)):
            lines.append(f'    """{node.body[0].value.value[:200]}"""')

        # Extract method signatures only
        for item in node.body:
            if isinstance(item, (python_ast.FunctionDef, python_ast.AsyncFunctionDef)):
                method_skel = self._function_skeleton(item)
                # Indent method skeleton
                lines.extend(f"    {line}" for line in method_skel.split("\n"))

        return "\n".join(lines)


# ── JS/TS Skeletonizer (using tree-sitter) ─────────────────────

class JSTreeSitterSkeletonizer:
    """Extracts structural skeleton from JS/TS using tree-sitter parser."""

    def __init__(self):
        self._parser = None
        self._js_lang = None
        self._ts_lang = None

    def _get_parser(self, language: str = "javascript"):
        if self._parser is None:
            try:
                import tree_sitter_javascript as tsjs
                import tree_sitter_typescript as tsts
                from tree_sitter import Language, Parser

                self._parser = Parser()
                self._js_lang = Language(tsjs.language())
                self._ts_lang = Language(tsts.language_typescript())
            except ImportError:
                return None
        return self._parser

    def skeletonize(self, source: str, filepath: str = "") -> str:
        ext = filepath.rsplit(".", 1)[-1].lower() if "." in filepath else "js"
        parser = self._get_parser()

        if parser is None:
            from tools.ast_skeletonizer import skeletonize_js_ts
            return skeletonize_js_ts(source)

        if ext in ("ts", "tsx"):
            parser.language = self._ts_lang
        else:
            parser.language = self._js_lang

        tree = parser.parse(source.encode("utf-8"))
        skeleton_parts = self._extract_structural_nodes(tree.root_node, source.encode("utf-8"))

        skeleton = "\n\n".join(skeleton_parts)
        if len(skeleton) < len(source) * 0.7:
            return f"/* [AST SKELETON: {filepath} — {len(source.splitlines())} lines → {len(skeleton.splitlines())} structural lines] */\n\n{skeleton}"
        return source

    def _extract_structural_nodes(self, node, source_bytes: bytes) -> list:
        STRUCTURAL_TYPES = {
            "import_statement", "import_declaration", "export_statement",
            "export_declaration", "class_declaration", "interface_declaration",
            "type_alias_declaration", "enum_declaration", "function_declaration",
            "lexical_declaration",  # const/let/var at top level
        }

        parts = []
        for child in node.children:
            if child.type in STRUCTURAL_TYPES:
                text = source_bytes[child.start_byte:child.end_byte].decode("utf-8", errors="replace")
                # For function declarations, only keep signature (first 3 lines)
                if child.type == "function_declaration" and text.count("\n") > 5:
                    lines = text.split("\n")
                    text = "\n".join(lines[:3]) + "\n  // ... [body omitted]"
                parts.append(text)
            elif child.type == "expression_statement":
                text = source_bytes[child.start_byte:child.end_byte].decode("utf-8", errors="replace")
                # Keep route definitions: app.get(...), router.post(...)
                if any(pattern in text for pattern in [".get(", ".post(", ".put(", ".delete(", ".patch(", ".use("]):
                    sig_line = text.split("\n")[0]
                    parts.append(sig_line)
        return parts


# ── Unified dispatcher ─────────────────────────────────────────

_py_skel = PythonASTSkeletonizer()
_js_skel = JSTreeSitterSkeletonizer()


def skeletonize_with_ast(filepath: str, source: str) -> str:
    """
    Main entry point: uses real AST parsing for Python and JS/TS,
    falls back to regex for other languages.
    """
    ext = filepath.rsplit(".", 1)[-1].lower() if "." in filepath else ""

    if ext in ("py", "pyw"):
        return _py_skel.skeletonize(source, filepath)
    elif ext in ("js", "jsx", "ts", "tsx", "mjs", "cjs"):
        return _js_skel.skeletonize(source, filepath)
    else:
        return source
