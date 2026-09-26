"""
Unit tests for GraphRAG Knowledge Graph.
Tests graph construction, BFS blast radius, and RAG context retrieval.
"""

import pytest
from tools.graph_rag import (
    CodebaseGraph,
    build_codebase_graph,
    extract_imports_and_symbols,
    retrieve_graphrag_context,
)


class TestCodebaseGraph:
    """Tests for the core graph data structure."""

    def test_add_node_creates_entry(self):
        g = CodebaseGraph()
        g.add_node("src/app.js", node_type="module")
        assert "src/app.js" in g.nodes
        assert g.nodes["src/app.js"]["type"] == "module"

    def test_add_edge_creates_bidirectional_links(self):
        g = CodebaseGraph()
        g.add_edge("src/routes.js", "src/models/User.js")
        assert "src/models/User.js" in g.dependencies["src/routes.js"]
        assert "src/routes.js" in g.dependents["src/models/User.js"]

    def test_blast_radius_finds_affected_components(self):
        g = CodebaseGraph()
        g.add_edge("routes/auth.js", "models/User.js")
        g.add_edge("routes/profile.js", "models/User.js")
        g.add_edge("services/email.js", "routes/auth.js")

        blast = g.get_blast_radius("User.js")
        assert any("auth" in b for b in blast), "auth route should be in blast radius"
        assert any("profile" in b for b in blast), "profile route should be in blast radius"

    def test_blast_radius_respects_max_depth(self):
        g = CodebaseGraph()
        g.add_edge("B", "A")
        g.add_edge("C", "B")
        g.add_edge("D", "C")
        g.add_edge("E", "D")  # depth 4 from A

        blast = g.get_blast_radius("A", max_depth=2)
        assert "C" in blast, "Depth 2 should include C"
        assert "E" not in blast, "Depth 4 node should NOT be included at max_depth=2"

    def test_blast_radius_handles_cycles(self):
        g = CodebaseGraph()
        g.add_edge("A", "B")
        g.add_edge("B", "C")
        g.add_edge("C", "A")  # cycle
        blast = g.get_blast_radius("A")
        assert len(blast) == 3, "Should handle cycles without infinite loop"

    def test_blast_radius_no_match_returns_empty(self):
        g = CodebaseGraph()
        g.add_node("src/app.js")
        assert g.get_blast_radius("nonexistent.py") == []


class TestImportExtraction:
    """Tests for import/symbol extraction from source code."""

    def test_extracts_js_require(self):
        code = "const User = require('../models/User');\nconst express = require('express');"
        result = extract_imports_and_symbols("routes.js", code)
        assert any("User" in imp for imp in result["imports"])
        assert "express" in result["imports"]

    def test_extracts_es6_import(self):
        code = "import React from 'react';\nimport { useState } from 'react';"
        result = extract_imports_and_symbols("App.jsx", code)
        assert "react" in result["imports"]

    def test_extracts_express_routes(self):
        code = "router.get('/api/users', handler);\nrouter.post('/api/users', createHandler);"
        result = extract_imports_and_symbols("routes.js", code)
        assert "GET /api/users" in result["routes"]
        assert "POST /api/users" in result["routes"]

    def test_extracts_function_symbols(self):
        code = "function loginUser(email) {}\nclass UserService {}\ndef process_data(x):"
        result = extract_imports_and_symbols("app.js", code)
        assert "loginUser" in result["symbols"]
        assert "UserService" in result["symbols"]


class TestBuildCodebaseGraph:
    """Tests for full graph construction from file dict."""

    def test_builds_graph_from_codebase(self, sample_express_codebase):
        graph = build_codebase_graph(sample_express_codebase)
        assert len(graph.nodes) > 0, "Should create nodes"
        # Check dependency edges exist
        internal_deps = {k: v for k, v in graph.dependencies.items() if not k.startswith("external:")}
        assert len(internal_deps) > 0, "Should create internal dependency edges"


class TestRetrieveGraphRAGContext:
    """Tests for RAG context retrieval."""

    def test_retrieves_relevant_context(self, sample_express_codebase):
        graph = build_codebase_graph(sample_express_codebase)
        context = retrieve_graphrag_context(graph, sample_express_codebase, "user authentication login")
        assert len(context) > 0, "Should retrieve non-empty context"
        assert "auth" in context.lower(), "Should include auth-related files"

    def test_respects_max_chars(self, sample_express_codebase):
        graph = build_codebase_graph(sample_express_codebase)
        context = retrieve_graphrag_context(graph, sample_express_codebase, "users", max_chars=500)
        # GraphRAG adds module headers and spacing which adds ~300 chars of overhead
        assert len(context) <= 1200, f"Should approximately respect char limit, got {len(context)}"
