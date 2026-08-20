# ============================================================
#  benchmarks/dogfood_security_scan.py — Dogfood Carbon Security Scanner
# ============================================================

import os
import sys
from pathlib import Path

if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')

repo_root = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(repo_root / "apps" / "Carbon Agent Service"))

from tools.security_scanner import run_security_audit
from tools.ast_skeletonizer import should_ignore_file

def run_carbon_dogfood_audit():
    print("========================================================")
    print("  🛡️ Carbon DevSecOps Scanner — Self-Audit (Dogfooding)")
    print(f"  Target: {repo_root}")
    print("========================================================\n")

    code_extensions = {'.js', '.jsx', '.ts', '.tsx', '.py', '.json', '.yml', '.yaml', '.html', '.css', '.env', '.example'}
    raw_files = {}

    for root, dirs, files in os.walk(repo_root):
        dirs[:] = [d for d in dirs if d not in ['node_modules', '.git', 'dist', 'build', 'out', '.next', '.venv', 'venv', '__pycache__', 'coverage', '.tempmediaStorage', '.user_uploaded']]
        for file in files:
            file_path = Path(root) / file
            rel_path = str(file_path.relative_to(repo_root)).replace('\\', '/')
            if not should_ignore_file(rel_path):
                try:
                    with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                        raw_files[rel_path] = f.read()
                except Exception:
                    pass

    print(f"[*] Scanning {len(raw_files)} files across repository...")
    audit_report = run_security_audit(raw_files)

    scorecard = audit_report['scorecard']
    print("\n--- Dogfooding Audit Results ---")
    print(f"Security Grade:       {scorecard['grade']}")
    print(f"Status:               {scorecard['statusText']}")
    print(f"Total Findings:       {scorecard['totalFindings']}")
    print(f"Critical Severity:    {scorecard['critical']}")
    print(f"High Severity:        {scorecard['high']}")
    print(f"Medium Severity:      {scorecard['medium']}")
    print(f"Low Severity:         {scorecard['low']}")

    if audit_report['findings']:
        print("\nTop Findings Detail:")
        for f in audit_report['findings'][:30]:
            print(f"  - [{f['severity']}] {f['ruleId']} in {f['filePath']}:{f['lineNumber']} -> {f['title']}")
    else:
        print("\n🎉 Zero security vulnerabilities or leaked credentials detected!")

    return audit_report

if __name__ == "__main__":
    run_carbon_dogfood_audit()
