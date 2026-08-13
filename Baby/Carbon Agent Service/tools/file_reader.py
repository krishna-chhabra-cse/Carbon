# ============================================================
#  tools/file_reader.py
#
#  This tool reads files from a cloned repository.
#  It walks through folders, reads code files, and
#  returns their contents so agents can analyze them.
# ============================================================

import os

# Files we DON'T want to read (too big, not useful for analysis)
SKIP_FOLDERS = {
    '.git', 'node_modules', '__pycache__', '.venv', 'venv',
    'env', 'dist', 'build', '.next', 'vendor', 'target'
}

# File extensions we DO want to read (code files)
ALLOWED_EXTENSIONS = {
    '.py', '.js', '.ts', '.jsx', '.tsx',      # Python & JavaScript
    '.java', '.go', '.rb', '.php', '.cs',     # Other languages
    '.json', '.yaml', '.yml', '.toml',        # Config files
    '.sql', '.md', '.txt', '.env.example',    # Docs & DB
    '.html', '.css', '.sh', '.dockerfile',    # Web & DevOps
    'dockerfile', 'docker-compose.yml'        # Docker (no extension)
}

# Max file size to read (1 MB) — avoids reading huge binary files
MAX_FILE_SIZE_BYTES = 1 * 1024 * 1024


def get_folder_structure(repo_path: str) -> str:
    """
    Returns a tree-like text showing the folder/file structure.
    This is the FIRST thing we show to the architecture agent.

    Example output:
        /src
          /components
            Button.jsx
            Header.jsx
          App.jsx
        package.json
        README.md
    """

    structure_lines = []

    for root, dirs, files in os.walk(repo_path):
        # Remove folders we want to skip (modifying dirs in-place affects os.walk)
        dirs[:] = [d for d in dirs if d not in SKIP_FOLDERS]

        # Calculate indent based on how deep we are in the folder tree
        level = root.replace(repo_path, '').count(os.sep)
        indent = '  ' * level

        # Add the folder name to our output
        folder_name = os.path.basename(root)
        if level == 0:
            structure_lines.append(f"[DIR] {folder_name}/")
        else:
            structure_lines.append(f"{indent}[DIR] {folder_name}/")

        # Add all files in this folder
        subindent = '  ' * (level + 1)
        for file in sorted(files):
            structure_lines.append(f"{subindent}[FILE] {file}")

    return '\n'.join(structure_lines)


def read_files_for_analysis(repo_path: str, max_total_chars: int = 100000) -> dict:
    """
    Reads important files from the repo and returns their content.

    Why max_total_chars? Because Gemini has a context limit — we can't
    dump an entire 500k LOC codebase into one prompt! We read the most
    important files and stay within limits.

    Returns a dict like:
    {
        "src/main.py": "import os\n...",
        "package.json": "{ name: ... }",
        ...
    }
    """

    files_content = {}
    total_chars = 0

    for root, dirs, files in os.walk(repo_path):
        # Skip folders we don't care about
        dirs[:] = [d for d in dirs if d not in SKIP_FOLDERS]

        for filename in files:
            # Check if this is a file type we want to read
            _, ext = os.path.splitext(filename.lower())
            if ext not in ALLOWED_EXTENSIONS and filename.lower() not in ALLOWED_EXTENSIONS:
                continue  # skip this file

            file_path = os.path.join(root, filename)

            # Skip files that are too large
            try:
                if os.path.getsize(file_path) > MAX_FILE_SIZE_BYTES:
                    continue
            except OSError:
                continue

            # Stop if we've read enough content for the AI context window
            if total_chars >= max_total_chars:
                break

            # Read the file
            try:
                with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                    content = f.read()

                # Make the path relative (cleaner to show the AI)
                relative_path = os.path.relpath(file_path, repo_path)
                files_content[relative_path] = content
                total_chars += len(content)

            except Exception as e:
                # Some files can't be read — that's okay, skip them
                continue

    print(f"[FILE READER] Read {len(files_content)} files ({total_chars:,} characters total)")
    return files_content
