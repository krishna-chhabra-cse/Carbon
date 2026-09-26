"""
Unit tests for AST Skeletonizer & Token Sieve.
Tests structural preservation, token reduction, and edge cases.
"""

import pytest
from tools.ast_skeletonizer import (
    skeletonize_js_ts,
    skeletonize_python,
    skeletonize_code,
    should_ignore_file,
    get_file_priority_score,
    optimize_repo_files,
)


class TestShouldIgnoreFile:
    """Tests for the file filtering heuristic."""

    @pytest.mark.parametrize("path,expected", [
        ("node_modules/express/index.js", True),
        (".git/config", True),
        ("dist/bundle.js", True),
        ("src/app.js", False),
        ("routes/users.py", False),
        ("package-lock.json", True),
        ("yarn.lock", True),
        ("image.png", True),
        ("src/utils.test.js", True),
        ("src/utils.spec.ts", True),
        ("test_runner.py", True),
        ("src/main.ts", False),
    ])
    def test_ignore_patterns(self, path, expected):
        assert should_ignore_file(path) == expected, f"Expected {path} ignored={expected}"


class TestFilePriorityScore:
    """Tests for topological file ranking."""

    def test_entry_points_highest_priority(self):
        assert get_file_priority_score("server.js") == 100
        assert get_file_priority_score("main.py") == 100
        assert get_file_priority_score("app.ts") == 100

    def test_routes_high_priority(self):
        assert get_file_priority_score("src/routes/users.js") == 90
        assert get_file_priority_score("api/endpoints.py") == 90

    def test_models_tier2(self):
        assert get_file_priority_score("models/User.js") == 80
        assert get_file_priority_score("schema.prisma") == 80

    def test_utilities_lowest(self):
        score = get_file_priority_score("lib/random_helper.js")
        assert score <= 40


class TestJsSkeletonizer:
    """Tests for JavaScript/TypeScript skeletonization."""

    def test_preserves_imports(self):
        code = "\n".join([
            "const express = require('express');",
            "import React from 'react';",
        ] + [f"// filler line {i}" for i in range(100)])
        skeleton = skeletonize_js_ts(code)
        assert "require('express')" in skeleton
        assert "import React" in skeleton

    def test_preserves_route_definitions(self):
        code = "\n".join([
            "const router = express.Router();",
            "router.get('/api/users', handler);",
            "router.post('/api/users', createHandler);",
        ] + [f"let x_{i} = {i};" for i in range(100)])
        skeleton = skeletonize_js_ts(code)
        assert "router.get('/api/users'" in skeleton
        assert "router.post('/api/users'" in skeleton

    def test_preserves_class_declarations(self):
        code = "\n".join([
            "export class UserService {",
            "  constructor() {}",
        ] + [f"  // method body line {i}" for i in range(100)] + ["}"])
        skeleton = skeletonize_js_ts(code)
        assert "class UserService" in skeleton

    def test_strips_loop_bodies(self):
        code = "\n".join([
            "const express = require('express');",
            "function handler(req, res) {",
        ] + [f"  console.log('iteration {i}');" for i in range(200)] + ["}"])
        skeleton = skeletonize_js_ts(code)
        assert len(skeleton.splitlines()) < 50, "Should strip deep loop bodies"

    def test_small_files_unchanged(self):
        code = "const x = 1;\nconst y = 2;\n"
        assert skeletonize_js_ts(code) == code, "Files under 80 lines should pass through unchanged"


class TestPythonSkeletonizer:
    """Tests for Python skeletonization."""

    def test_preserves_imports(self):
        code = "\n".join([
            "import os",
            "from pathlib import Path",
            "from typing import Dict, List",
        ] + [f"x_{i} = {i}" for i in range(100)])
        skeleton = skeletonize_python(code)
        assert "import os" in skeleton
        assert "from pathlib import Path" in skeleton

    def test_preserves_decorators(self):
        code = "\n".join([
            "@app.get('/api/items')",
            "async def list_items():",
            "    pass",
        ] + [f"# comment {i}" for i in range(100)])
        skeleton = skeletonize_python(code)
        assert "@app.get('/api/items')" in skeleton

    def test_preserves_class_and_function_signatures(self):
        code = "\n".join([
            "class UserModel(BaseModel):",
            "    username: str",
            "    email: str",
            "",
            "def create_user(data: dict):",
            "    pass",
            "",
            "async def fetch_user(user_id: int):",
            "    pass",
        ] + [f"# filler {i}" for i in range(100)])
        skeleton = skeletonize_python(code)
        assert "class UserModel" in skeleton
        assert "def create_user" in skeleton
        assert "async def fetch_user" in skeleton


class TestOptimizeRepoFiles:
    """Tests for full repository optimization pipeline."""

    def test_filters_and_reduces(self, sample_express_codebase):
        optimized, saved = optimize_repo_files(sample_express_codebase, max_total_chars=50000)
        assert len(optimized) > 0, "Should retain at least some files"
        assert saved >= 0, "Saved chars should be non-negative"

    def test_respects_char_budget(self):
        large_files = {f"src/module_{i}.py": f"# module {i}\n" * 500 for i in range(50)}
        optimized, _ = optimize_repo_files(large_files, max_total_chars=5000)
        total_chars = sum(len(c) for c in optimized.values())
        assert total_chars <= 5000, f"Should stay within budget, got {total_chars}"

    def test_prioritizes_entry_points(self):
        files = {
            "server.js": "const app = require('express')(); app.listen(3000);",
            "utils/helper.js": "function helper() { return 1; }",
        }
        optimized, _ = optimize_repo_files(files, max_total_chars=100)
        # server.js should be included first due to higher priority
        assert "server.js" in optimized
