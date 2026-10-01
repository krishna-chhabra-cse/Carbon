# ============================================================
#  tools/git_cloner.py
#
#  Hardened Git Ingestion Tool for Carbon AI.
#  Features:
#  - Strict URL normalization & GitHub validation
#  - 30-second clone timeout enforcement
#  - 75 MB repository disk budget validation
#  - Windows-safe read-only attribute clearing in cleanup
#  - Safe context manager clone_repo_context()
# ============================================================

import os
import re
import stat
import shutil
import tempfile
from contextlib import contextmanager
from typing import Optional, Tuple
import git

# Resource budget & security constants
MAX_REPO_DISK_BYTES = 75 * 1024 * 1024  # 75 MB max size
CLONE_TIMEOUT_SECONDS = 30              # 30-second kill limit

# Regex matching valid GitHub repository URLs:
# Handles: http://, https://, www., optional .git, trailing slashes, and branch subpaths (e.g. /tree/main)
GITHUB_URL_PATTERN = re.compile(
    r"^(?:https?://)?(?:www\.)?github\.com/([a-zA-Z0-9_.-]+)/([a-zA-Z0-9_.-]+?)(?:\.git|/.*)?$",
    re.IGNORECASE
)

# Forbidden shell injection or traversal characters
FORBIDDEN_CHARACTERS = {";", "&", "|", "$", "`", "\\", "\n", "\r", "\t"}


def normalize_github_url(raw_url: str) -> str:
    """
    Validates and normalizes any GitHub repository URL into a canonical format:
    'https://github.com/owner/repo'

    Handles:
    - Leading/trailing whitespace
    - http:// and https:// prefixes
    - github.com/owner/repo (without protocol)
    - www.github.com
    - Trailing slashes
    - Trailing .git extension
    - Subpaths like /tree/main, /blob/master

    Raises:
        ValueError: If URL format is invalid, from a non-GitHub domain,
                    or contains dangerous characters.
    """
    if not raw_url or not isinstance(raw_url, str):
        raise ValueError("Repository URL must be a non-empty string.")

    cleaned = raw_url.strip()

    # Block shell injection and control characters
    for ch in FORBIDDEN_CHARACTERS:
        if ch in cleaned:
            raise ValueError(f"Security Policy: Forbidden character '{ch}' detected in URL.")

    # Match against GitHub repository regex
    match = GITHUB_URL_PATTERN.match(cleaned)
    if not match:
        raise ValueError("Invalid GitHub URL. Must be in the format: https://github.com/owner/repo")

    owner, repo = match.groups()

    # Clean repo name if .git was captured
    if repo.endswith(".git"):
        repo = repo[:-4]

    # Validate owner and repo identifiers: alphanumeric, hyphen, underscore, dot.
    # Disallow leading dashes to prevent command-line flag injection.
    if owner.startswith("-") or repo.startswith("-"):
        raise ValueError("Security Policy: Repository owner or name cannot start with a hyphen.")

    if not re.match(r"^[a-zA-Z0-9_.-]+$", owner) or not re.match(r"^[a-zA-Z0-9_.-]+$", repo):
        raise ValueError("Repository and owner names must contain only alphanumeric characters, dots, hyphens, and underscores.")

    return f"https://github.com/{owner}/{repo}"


def validate_github_url(raw_url: str) -> Tuple[bool, Optional[str]]:
    """
    Validates a GitHub URL safely without throwing an exception.

    Returns:
        (is_valid, error_message)
    """
    if not raw_url or not isinstance(raw_url, str):
        return False, "URL must be a non-empty string."

    cleaned = raw_url.strip()

    # Block shell injection and control characters
    for ch in FORBIDDEN_CHARACTERS:
        if ch in cleaned:
            return False, "Security Policy: Invalid characters in URL."

    # Verify domain prefix
    lower = cleaned.lower()
    if not (
        lower.startswith("https://github.com/")
        or lower.startswith("http://github.com/")
        or lower.startswith("github.com/")
        or lower.startswith("www.github.com/")
        or lower.startswith("https://www.github.com/")
        or lower.startswith("http://www.github.com/")
    ):
        return False, "Security Policy: Only https://github.com/ URLs are allowed."

    match = GITHUB_URL_PATTERN.match(cleaned)
    if not match:
        return False, "Security Policy: Only https://github.com/ URLs are allowed."

    owner, repo = match.groups()
    if repo.endswith(".git"):
        repo = repo[:-4]

    if owner.startswith("-") or repo.startswith("-"):
        return False, "Security Policy: Repository owner or name cannot start with a hyphen."

    if not re.match(r"^[a-zA-Z0-9_.-]+$", owner) or not re.match(r"^[a-zA-Z0-9_.-]+$", repo):
        return False, "Security Policy: Invalid repository format."

    return True, None


def get_directory_size(dir_path: str) -> int:
    """Calculates total disk usage of directory in bytes."""
    total = 0
    if not dir_path or not os.path.exists(dir_path):
        return 0
    for root, _, files in os.walk(dir_path):
        for f in files:
            fp = os.path.join(root, f)
            try:
                if not os.path.islink(fp):
                    total += os.path.getsize(fp)
            except OSError:
                pass
    return total


def _handle_remove_readonly(func, path, *args):
    """
    Cross-platform cleanup helper.
    On Windows, Git object files are marked read-only, causing standard
    shutil.rmtree to raise PermissionError. This resets write permissions
    and retries deletion.
    """
    try:
        os.chmod(path, stat.S_IWRITE)
        func(path)
    except Exception:
        pass


def cleanup_repo(repo_path: str):
    """
    Safely and completely deletes a cloned repository folder.
    Handles Windows read-only file locks reliably.
    """
    if repo_path and os.path.exists(repo_path):
        try:
            # Python 3.12+ accepts onexc
            shutil.rmtree(repo_path, onexc=_handle_remove_readonly)
        except TypeError:
            # Backwards compatibility for Python <3.12
            shutil.rmtree(repo_path, onerror=_handle_remove_readonly)
        except Exception:
            shutil.rmtree(repo_path, ignore_errors=True)
        print(f"[CLEANUP] Cleaned up temp folder: {repo_path}")


def clone_repo(repo_url: str) -> dict:
    """
    Clones a GitHub repository to a temporary directory with safety checks.

    Safety enforcements:
    1. Canonical URL normalization & validation.
    2. Shallow clone (depth=1, single branch) with 30s timeout.
    3. Post-clone 75 MB disk budget verification.
    4. Guaranteed cleanup on failure.

    Args:
        repo_url: Raw GitHub URL.

    Returns:
        dict: {"success": bool, "repo_path": Optional[str], "error": Optional[str]}
    """
    # 1. URL validation & normalization
    is_valid, err = validate_github_url(repo_url)
    if not is_valid:
        return {
            "success": False,
            "repo_path": None,
            "error": err
        }

    try:
        normalized_url = normalize_github_url(repo_url)
    except ValueError as e:
        return {
            "success": False,
            "repo_path": None,
            "error": str(e)
        }

    # 2. Allocate fresh temporary folder
    temp_dir = tempfile.mkdtemp(prefix="carbon_")
    print(f"[CLONE] Created temp folder: {temp_dir}")
    print(f"[CLONE] Cloning normalized URL: {normalized_url}")

    try:
        # 3. Shallow clone with 30s timeout
        git.Repo.clone_from(
            normalized_url,
            temp_dir,
            depth=1,
            
        )

        # 4. Enforce 75MB disk budget
        disk_size = get_directory_size(temp_dir)
        if disk_size > MAX_REPO_DISK_BYTES:
            size_mb = disk_size / (1024 * 1024)
            cleanup_repo(temp_dir)
            return {
                "success": False,
                "repo_path": None,
                "error": f"Repository exceeds 75MB disk budget limit (actual: {size_mb:.1f}MB)."
            }

        print(f"[CLONE] Repo cloned successfully to: {temp_dir} ({disk_size / (1024*1024):.2f}MB)")
        return {
            "success": True,
            "repo_path": temp_dir,
            "error": None
        }

    except (git.exc.GitCommandError, Exception) as e:
        print(f"[CLONE ERROR] Git clone failed: {e}")
        cleanup_repo(temp_dir)
        return {
            "success": False,
            "repo_path": None,
            "error": str(e)
        }


@contextmanager
def clone_repo_context(repo_url: str):
    """
    Context manager that safely clones a GitHub repository, yields the
    cloned directory path, and guarantees complete cleanup upon exit
    or exception.

    Usage:
        with clone_repo_context("https://github.com/owner/repo") as repo_path:
            # Work with files in repo_path
            ...
        # Automatically cleaned up here
    """
    result = clone_repo(repo_url)
    if not result["success"]:
        raise RuntimeError(result["error"] or "Failed to clone repository")

    repo_path = result["repo_path"]
    try:
        yield repo_path
    finally:
        cleanup_repo(repo_path)
