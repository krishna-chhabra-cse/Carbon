# ============================================================
#  tools/workspace_reader.py
#
#  Support for analyzing a LOCAL workspace (e.g. the folder
#  currently open in VS Code) instead of a cloned GitHub repo.
#
#  This module does NOT re-implement any file-reading logic.
#  It only validates the supplied local path and then hands it
#  off to the existing functions in tools/file_reader.py
#  (get_folder_structure / read_files_for_analysis), which are
#  reused as-is.
# ============================================================

import os


def validate_workspace_path(local_path: str) -> dict:
    """
    Validates that `local_path` exists and is a directory.

    Returns:
        {"success": True, "path": "<normalized absolute path>"}
        or
        {"success": False, "error": "<reason>"}
    """

    if not local_path or not local_path.strip():
        return {"success": False, "error": "local_path was empty"}

    # Normalize so the same folder always produces the same cache key,
    # regardless of trailing slashes, "..", or relative segments.
    normalized_path = os.path.normpath(os.path.abspath(local_path))

    if not os.path.exists(normalized_path):
        return {
            "success": False,
            "error": f"Path does not exist: {normalized_path}",
        }

    if not os.path.isdir(normalized_path):
        return {
            "success": False,
            "error": f"Path is not a directory: {normalized_path}",
        }

    return {"success": True, "path": normalized_path}
