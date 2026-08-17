# ============================================================
#  test_security_scanner.py — Test Suite for DevSecOps & AST Skeletonizer
# ============================================================

import os
import sys

# Configure UTF-8 for Windows PowerShell output
if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')

from dotenv import load_dotenv
load_dotenv('Baby/Carbon Agent Service/.env')

from tools.ast_skeletonizer import skeletonize_js_ts, skeletonize_python, optimize_repo_files
from tools.security_scanner import run_security_audit
from agents.graph import agent_graph

def test_ast_skeletonizer():
    print("\n--- 1. Testing AST Skeletonizer Token Reduction ---")
    large_js = "\n".join([
        "const express = require('express');",
        "const router = express.Router();",
        "const { authenticate } = require('../middleware/auth');",
        "router.get('/api/users', authenticate, async (req, res) => {"
    ] + [f"    console.log('doing loop iteration {i}'); let x = {i} * 2; if (x > 10) {{ x = 0; }}" for i in range(250)] + [
        "    res.json({ success: true });",
        "});",
        "module.exports = router;"
    ])

    skeleton = skeletonize_js_ts(large_js)
    original_lines = len(large_js.splitlines())
    skeleton_lines = len(skeleton.splitlines())
    reduction_pct = (1 - (len(skeleton) / len(large_js))) * 100

    print(f"Original lines: {original_lines} | Skeleton lines: {skeleton_lines}")
    print(f"Token size reduced by: {reduction_pct:.1f}%")
    assert skeleton_lines < 20, "Skeleton should omit deep inner loop body"
    print("✅ AST Skeletonizer Test Passed!")

def test_security_scanner():
    print("\n--- 2. Testing Static Security & Taint Vulnerability Scanner ---")
    mock_files = {
        "src/config/aws.js": """
const AWS = require('aws-sdk');
const s3 = new AWS.S3({
  accessKeyId: 'AKIA1234567890ABCDEF',
  secretAccessKey: 'my_secret_key'
});
module.exports = s3;
""",
        "src/routes/users.js": """
const express = require('express');
const router = express.Router();
router.get('/search', async (req, res) => {
  const query = `SELECT * FROM users WHERE username = '${req.query.name}'`;
  const results = await db.query(query);
  res.json(results);
});
module.exports = router;
""",
        "src/server.js": """
const express = require('express');
const cors = require('cors');
const app = express();
app.use(cors({ origin: '*' }));
"""
    }

    audit = run_security_audit(mock_files)
    scorecard = audit["scorecard"]
    findings = audit["findings"]

    print(f"Security Grade: {scorecard['grade']} ({scorecard['statusText']})")
    print(f"Total Findings: {scorecard['totalFindings']} (Critical: {scorecard['critical']}, High: {scorecard['high']}, Med: {scorecard['medium']})")
    for f in findings:
        print(f"  - [{f['severity']}] {f['title']} in {f['filePath']}:L{f['lineNumber']}")

    assert scorecard['critical'] >= 1, "Should detect hardcoded AWS key as CRITICAL"
    assert scorecard['high'] >= 1, "Should detect SQL Injection as HIGH"
    assert scorecard['medium'] >= 1, "Should detect CORS wildcard as MEDIUM"
    print("✅ Static Security Scanner Test Passed!")

def test_full_graph_with_security():
    print("\n--- 3. Testing Full LangGraph Multi-Agent Execution with Security Node ---")
    mock_state = {
        "repo_url": "test-repo",
        "folder_structure": "[FILE] src/server.js\n[FILE] src/routes/auth.js",
        "files_content": {
            "src/server.js": "const express = require('express'); const app = express(); app.use('/auth', require('./routes/auth'));",
            "src/routes/auth.js": "const express = require('express'); const router = express.Router(); router.post('/login', (req, res) => res.json({ token: 'jwt' })); module.exports = router;"
        }
    }

    final_state = {}
    for event in agent_graph.stream(mock_state):
        for node_name, partial in event.items():
            print(f"  Node finished: {node_name}")
            final_state.update(partial)

    sec_res = final_state.get("security_result")
    assert sec_res is not None, "Security result must be present in final state"
    print(f"Security Grade in Graph: {sec_res.get('scorecard', {}).get('grade')}")
    print("✅ Full Multi-Agent Graph Test with Security Passed!")

if __name__ == "__main__":
    test_ast_skeletonizer()
    test_security_scanner()
    test_full_graph_with_security()
    print("\n🎉 ALL DEVSECOPS & TOKEN OPTIMIZER TESTS PASSED!")
