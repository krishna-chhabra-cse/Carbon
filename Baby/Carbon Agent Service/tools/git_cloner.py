# ============================================================
#  tools/git_cloner.py
#
#  This tool clones a GitHub repository to a local folder.
#  An "agent tool" is just a regular Python function that
#  an agent can call to interact with the outside world.
# ============================================================

import os
import shutil          # for deleting folders
import tempfile        # for creating temporary folders
import git             # from the gitpython library


def clone_repo(repo_url: str) -> dict:
    """
    Clones a GitHub repository to a temporary folder.

    What it does step by step:
    1. Creates a fresh temporary folder (e.g. C:/Temp/repo_abc123)
    2. Runs 'git clone <repo_url>' into that folder
    3. Returns the path so other tools can read files from it

    Args:
        repo_url: The GitHub URL e.g. "https://github.com/user/repo"

    Returns:
        A dict with:
        - "success": True or False
        - "repo_path": where the repo was cloned to
        - "error": error message if something went wrong
    """

    # Step 1: Create a unique temporary directory
    # tempfile.mkdtemp() creates a folder like: C:\Users\...\AppData\Local\Temp\tmpXXXXXX
    temp_dir = tempfile.mkdtemp(prefix="carbon_")

    print(f"[CLONE] Created temp folder: {temp_dir}")
    print(f"[CLONE] Cloning repo: {repo_url}")

    try:
        # Step 2: Clone the repo into the temp folder
        # This is exactly like running 'git clone <url> <folder>' in terminal
        git.Repo.clone_from(
            repo_url,
            temp_dir,
            depth=1   # depth=1 means "only get the latest version, not full history"
                      # This makes it MUCH faster for large repos!
        )

        print(f"[CLONE] Repo cloned successfully to: {temp_dir}")

        return {
            "success": True,
            "repo_path": temp_dir,
            "error": None
        }

    except git.exc.GitCommandError as e:
        # This happens if: repo doesn't exist, URL is wrong, no internet, etc.
        print(f"[CLONE ERROR] Git clone failed: {e}")

        # Clean up the temp folder if clone failed
        shutil.rmtree(temp_dir, ignore_errors=True)

        return {
            "success": False,
            "repo_path": None,
            "error": str(e)
        }


def cleanup_repo(repo_path: str):
    """
    Deletes the cloned repo folder after we're done with it.
    We always want to clean up temp files!

    Args:
        repo_path: The path returned by clone_repo()
    """
    if repo_path and os.path.exists(repo_path):
        shutil.rmtree(repo_path, ignore_errors=True)
        print(f"[CLEANUP] Cleaned up temp folder: {repo_path}")
