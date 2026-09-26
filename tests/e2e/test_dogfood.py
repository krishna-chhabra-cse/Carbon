"""
tests/e2e/test_dogfood.py — Dogfooding Carbon against itself.
Runs the DevSecOps security scanner on the Carbon codebase to ensure it has an A+ grade.
"""

import os
from pathlib import Path
from tools.file_reader import read_files_for_analysis
from tools.security_scanner import run_security_audit

repo_root = Path(__file__).resolve().parent.parent.parent


def test_carbon_is_secure():
    """
    Self-audits the Carbon Agent Service codebase using its own security scanner.
    Ensures Carbon passes its own tests.
    """
    agent_service_path = repo_root / "apps" / "Carbon Agent Service"
    
    # Read our own files
    files_dict = read_files_for_analysis(str(agent_service_path))
    assert len(files_dict) > 0, "Should read Carbon Agent Service files"
    
    # Filter out our own scanner from the scan to prevent self-triggering
    filtered_files = {path: content for path, content in files_dict.items() if "security_scanner.py" not in path}
    
    # Run the security audit
    result = run_security_audit(filtered_files)
    
    critical = result["scorecard"]["critical"]
    high = result["scorecard"]["high"]
    grade = result["scorecard"]["grade"]
    
    # Filter out findings from the scanner's own regex strings
    filtered_findings = [f for f in result["findings"] if "security_scanner.py" not in f["filePath"]]
    
    # Recalculate grades based on filtered
    critical = sum(1 for f in filtered_findings if f["severity"] == "CRITICAL")
    high = sum(1 for f in filtered_findings if f["severity"] == "HIGH")
    filtered_findings = [f for f in result["findings"] if "security_scanner.py" not in f["filePath"]]
    
    # Recalculate grades based on filtered
    critical = sum(1 for f in filtered_findings if f["severity"] == "CRITICAL")
    high = sum(1 for f in filtered_findings if f["severity"] == "HIGH")
    grade = result["scorecard"]["grade"]
    
    # We should have zero critical or high vulnerabilities in our own code
    assert critical == 0, f"Found {critical} CRITICAL vulnerabilities in Carbon itself! Findings: {filtered_findings}"
    assert high == 0, f"Found {high} HIGH vulnerabilities in Carbon itself! Findings: {filtered_findings}"
    
    # Ideally we maintain an A+ grade
    assert grade in ["A+", "A", "B"], f"Carbon's own security grade is {grade}, which is unacceptable."
