"""
benchmarks/evaluation_suite.py — Benchmark AST Skeletonizer on real open-source repos.

Usage:
    python benchmarks/evaluation_suite.py
    python benchmarks/evaluation_suite.py --repos express,fastapi
    python benchmarks/evaluation_suite.py --output results.json
"""

import os
import sys
import json
import time
import shutil
import tempfile
import argparse
from pathlib import Path

repo_root = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(repo_root / "apps" / "Carbon Agent Service"))

from tools.git_cloner import clone_repo, cleanup_repo
from tools.file_reader import read_files_for_analysis, get_folder_structure
from tools.ast_skeletonizer import optimize_repo_files, should_ignore_file

BENCHMARK_REPOS = {
    "express": {"url": "https://github.com/expressjs/express", "category": "small"},
    "fastapi": {"url": "https://github.com/tiangolo/fastapi", "category": "small"},
    "flask": {"url": "https://github.com/pallets/flask", "category": "small"},
    "nestjs": {"url": "https://github.com/nestjs/nest", "category": "medium"},
    "strapi": {"url": "https://github.com/strapi/strapi", "category": "medium"},
    "django": {"url": "https://github.com/django/django", "category": "large"},
}

CODE_EXTENSIONS = {'.js', '.jsx', '.ts', '.tsx', '.py', '.java', '.go', '.rs', '.rb'}


def estimate_tokens(text: str) -> int:
    return max(1, len(text) // 4)


def collect_raw_files(repo_path: str) -> dict:
    raw = {}
    for root, dirs, files in os.walk(repo_path):
        dirs[:] = [d for d in dirs if d not in {
            'node_modules', '.git', 'dist', 'build', 'out', '.next',
            '__pycache__', 'venv', '.venv', 'coverage', 'test', 'tests',
            '__tests__', 'vendor', 'target'
        }]
        for f in files:
            fp = Path(root) / f
            rel = str(fp.relative_to(repo_path)).replace('\\', '/')
            if fp.suffix.lower() in CODE_EXTENSIONS and not should_ignore_file(rel):
                try:
                    content = fp.read_text(encoding='utf-8', errors='ignore')
                    if content.strip():
                        raw[rel] = content
                except Exception:
                    pass
    return raw


def benchmark_single_repo(name: str, url: str) -> dict:
    print(f"\n{'='*60}")
    print(f"  Benchmarking: {name} ({url})")
    print(f"{'='*60}")

    clone_result = clone_repo(url)
    if not clone_result["success"]:
        return {"name": name, "error": clone_result["error"]}

    repo_path = clone_result["repo_path"]
    try:
        raw_files = collect_raw_files(repo_path)
        raw_tokens = sum(estimate_tokens(c) for c in raw_files.values())
        raw_bytes = sum(len(c.encode('utf-8')) for c in raw_files.values())

        start = time.perf_counter()
        optimized, saved = optimize_repo_files(raw_files, max_total_chars=45000)
        elapsed = time.perf_counter() - start

        opt_tokens = sum(estimate_tokens(c) for c in optimized.values())
        opt_bytes = sum(len(c.encode('utf-8')) for c in optimized.values())

        reduction = ((raw_tokens - opt_tokens) / raw_tokens * 100) if raw_tokens > 0 else 0

        result = {
            "name": name,
            "url": url,
            "raw_files": len(raw_files),
            "optimized_files": len(optimized),
            "raw_tokens": raw_tokens,
            "optimized_tokens": opt_tokens,
            "token_reduction_pct": round(reduction, 1),
            "raw_bytes": raw_bytes,
            "optimized_bytes": opt_bytes,
            "latency_ms": round(elapsed * 1000, 1),
            "throughput_files_per_sec": round(len(raw_files) / elapsed, 1) if elapsed > 0 else 0,
        }

        print(f"  Files: {result['raw_files']} -> {result['optimized_files']}")
        print(f"  Tokens: {result['raw_tokens']:,} -> {result['optimized_tokens']:,} (-{result['token_reduction_pct']}%)")
        print(f"  Latency: {result['latency_ms']}ms")

        return result

    finally:
        cleanup_repo(repo_path)


def run_full_benchmark(repo_names: list = None, output_file: str = None):
    repos = repo_names or list(BENCHMARK_REPOS.keys())
    results = []

    for name in repos:
        if name not in BENCHMARK_REPOS:
            print(f"  ⚠ Unknown repo: {name}, skipping")
            continue
        info = BENCHMARK_REPOS[name]
        result = benchmark_single_repo(name, info["url"])
        results.append(result)

    # Print summary table
    print(f"\n\n{'='*90}")
    print(f"  BENCHMARK RESULTS SUMMARY")
    print(f"{'='*90}")
    print(f"{'Repo':<15} {'Files':>7} {'Raw Tokens':>12} {'Skel Tokens':>12} {'Reduction':>10} {'Latency':>10}")
    print("-" * 90)
    for r in results:
        if "error" in r:
            print(f"{r['name']:<15} {'ERROR':>7}")
        else:
            print(f"{r['name']:<15} {r['raw_files']:>7} {r['raw_tokens']:>12,} {r['optimized_tokens']:>12,} {r['token_reduction_pct']:>9.1f}% {r['latency_ms']:>8.1f}ms")

    if output_file:
        Path(output_file).write_text(json.dumps(results, indent=2))
        print(f"\nResults saved to {output_file}")

    return results


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Carbon AST Skeletonizer Multi-Repo Benchmark")
    parser.add_argument("--repos", help="Comma-separated repo names", default=None)
    parser.add_argument("--output", help="Output JSON file path", default=None)
    args = parser.parse_args()

    repo_list = args.repos.split(",") if args.repos else None
    run_full_benchmark(repo_list, args.output)
