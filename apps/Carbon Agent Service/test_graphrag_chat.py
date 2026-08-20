# ============================================================
#  test_graphrag_chat.py — Test Suite for GraphRAG Knowledge Graph
# ============================================================

import os
import sys

if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')

from dotenv import load_dotenv
env_path = 'apps/Carbon Agent Service/.env' if os.path.exists('apps/Carbon Agent Service/.env') else '.env'
load_dotenv(env_path)

from tools.graph_rag import build_codebase_graph, retrieve_graphrag_context
from agents.graphrag_agent import run_graphrag_chat

def test_graphrag_graph_construction():
    print("\n--- 1. Testing Codebase Knowledge Graph & Blast Radius ---")
    mock_files = {
        "src/models/User.js": """
const mongoose = require('mongoose');
const UserSchema = new mongoose.Schema({ username: String, email: String });
module.exports = mongoose.model('User', UserSchema);
""",
        "src/services/authService.js": """
const User = require('../models/User');
async function loginUser(email) { return User.findOne({ email }); }
module.exports = { loginUser };
""",
        "src/routes/authRoutes.js": """
const express = require('express');
const { loginUser } = require('../services/authService');
const router = express.Router();
router.post('/login', async (req, res) => { const user = await loginUser(req.body.email); res.json(user); });
module.exports = router;
"""
    }

    graph = build_codebase_graph(mock_files)
    print(f"Graph constructed with {len(graph.nodes)} nodes.")
    for node, data in graph.nodes.items():
        if not node.startswith("external:"):
            print(f"  Node: {node} -> Depends on: {list(graph.dependencies.get(node, []))}")

    # Test Blast Radius: If User.js changes, what is affected?
    blast = graph.get_blast_radius("User.js")
    print(f"Blast Radius of User.js: {blast}")
    assert any("authService" in b for b in blast), "authService must be in User.js blast radius"
    print("✅ Graph Construction & Blast Radius Test Passed!")

def test_graphrag_chat_execution():
    print("\n--- 2. Testing GraphRAG Conversational Reasoning ---")
    mock_files = {
        "src/routes/payment.js": """
const express = require('express');
const router = express.Router();
router.post('/webhook', (req, res) => {
  // processes stripe webhook event
  res.json({ received: true });
});
module.exports = router;
"""
    }

    query = "How does payment webhook processing work in this project?"
    res = run_graphrag_chat(mock_files, query)
    print(f"GraphRAG Success: {res['success']}")
    print(f"Answer Preview:\n{res['answer'][:250]}...")
    assert res['success'] is True, "GraphRAG execution should succeed"
    print("✅ GraphRAG Conversational Agent Test Passed!")

if __name__ == "__main__":
    test_graphrag_graph_construction()
    test_graphrag_chat_execution()
    print("\n🎉 ALL GRAPHRAG CODEBASE CHAT TESTS PASSED!")
