"""
Unit tests for the DevSecOps Security Scanner.
Tests each individual rule category and the grading algorithm.
"""

import pytest
from tools.security_scanner import (
    scan_file_for_vulnerabilities,
    calculate_security_grade,
    run_security_audit,
)


class TestSecretDetection:
    """Tests for credential/secret leakage detection."""

    def test_detects_aws_key(self):
        content = "const key = 'AKIA1234567890ABCDEF';"
        findings = scan_file_for_vulnerabilities("config.js", content)
        assert any(f["ruleId"] == "SEC-001" for f in findings), "Should detect AWS access key"

    def test_detects_jwt_secret(self):
        content = "const jwt_secret = 'my_super_secret_key_12345';"
        findings = scan_file_for_vulnerabilities("auth.js", content)
        assert any(f["ruleId"] == "SEC-002" for f in findings), "Should detect hardcoded JWT secret"

    def test_detects_database_uri(self):
        content = "const db = 'mongodb+srv://admin:password@cluster.mongodb.net';"
        findings = scan_file_for_vulnerabilities("db.js", content)
        assert any(f["ruleId"] == "SEC-003" for f in findings), "Should detect database URI with creds"

    def test_detects_stripe_key(self):
        content = "const key = 'sk_test_fake1234567890abcdef';"
        findings = scan_file_for_vulnerabilities("payments.js", content)
        assert any(f["ruleId"] == "SEC-004" for f in findings), "Should detect Stripe secret key"

    def test_no_false_positive_on_clean_code(self):
        content = "const key = process.env.AWS_ACCESS_KEY_ID;\nconst db = process.env.DATABASE_URL;"
        findings = scan_file_for_vulnerabilities("config.js", content)
        secrets = [f for f in findings if f["category"] == "Secret Leakage"]
        assert len(secrets) == 0, "Should not flag environment variable usage"


class TestOwaspDetection:
    """Tests for OWASP Top 10 taint vulnerability detection."""

    def test_detects_sql_injection(self):
        content = "const q = `SELECT * FROM users WHERE id = '${req.query.id}'`;"
        findings = scan_file_for_vulnerabilities("routes.js", content)
        assert any(f["ruleId"] == "VULN-001" for f in findings), "Should detect SQL injection"

    def test_detects_eval_usage(self):
        content = "const result = eval(req.body.expression);"
        findings = scan_file_for_vulnerabilities("handler.js", content)
        assert any(f["ruleId"] == "VULN-002" for f in findings), "Should detect dangerous eval"

    def test_detects_wildcard_cors(self):
        content = "app.use(cors({ origin: '*' }));"
        findings = scan_file_for_vulnerabilities("server.js", content)
        assert any(f["ruleId"] == "VULN-003" for f in findings), "Should detect wildcard CORS"


class TestSecurityGrading:
    """Tests for the grading algorithm."""

    def test_grade_a_plus_no_findings(self):
        grade = calculate_security_grade([])
        assert grade["grade"] == "A+"

    def test_grade_f_on_critical(self):
        findings = [{"severity": "CRITICAL"}]
        grade = calculate_security_grade(findings)
        assert grade["grade"] == "F"

    def test_grade_d_on_multiple_highs(self):
        findings = [{"severity": "HIGH"}, {"severity": "HIGH"}]
        grade = calculate_security_grade(findings)
        assert grade["grade"] == "D"

    def test_grade_b_on_low(self):
        findings = [{"severity": "LOW"}]
        grade = calculate_security_grade(findings)
        assert grade["grade"] == "B"


class TestFullAudit:
    """Tests for the complete audit pipeline."""

    def test_full_audit_returns_scorecard(self, sample_vulnerable_codebase):
        result = run_security_audit(sample_vulnerable_codebase)
        assert "scorecard" in result
        assert "findings" in result
        assert result["totalScannedFiles"] == len(sample_vulnerable_codebase)

    def test_clean_codebase_gets_a_plus(self):
        clean = {"app.js": "const express = require('express');\nconst app = express();\napp.listen(3000);"}
        result = run_security_audit(clean)
        assert result["scorecard"]["grade"] == "A+"
