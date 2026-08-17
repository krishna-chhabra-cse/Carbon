# ============================================================
#  tools/ast_skeletonizer.py — AST Code Skeletonizer & Token Sieve
# ============================================================

import re
from typing import Dict, Tuple

# Ignore patterns for deterministic AST sieve
IGNORE_DIR_PATTERNS = [
    r'node_modules', r'\.git', r'dist', r'build', r'out', r'\.next', r'coverage',
    r'__pycache__', r'\.pytest_cache', r'venv', r'\.venv', r'target', r'vendor',
    r'public[/\\]assets', r'static[/\\]media', r'__tests__', r'tests[/\\]fixtures'
]

IGNORE_FILE_PATTERNS = [
    r'.*\.lock$', r'.*lock\.json$', r'.*lock\.yaml$', r'.*\.min\.js$', r'.*\.min\.css$',
    r'.*\.map$', r'.*\.svg$', r'.*\.png$', r'.*\.jpg$', r'.*\.jpeg$', r'.*\.gif$',
    r'.*\.ico$', r'.*\.woff2?$', r'.*\.ttf$', r'.*\.eot$', r'.*\.pdf$', r'.*\.zip$',
    r'.*\.tar\.gz$', r'.*\.test\.[jt]sx?$', r'.*\.spec\.[jt]sx?$', r'.*test_.*\.py$'
]

def should_ignore_file(file_path: str) -> bool:
    """Returns True if the file is noise, build artifact, or binary asset."""
    path_normalized = file_path.replace('\\', '/')
    for pattern in IGNORE_DIR_PATTERNS:
        if re.search(r'(^|/)' + pattern + r'(/|$)', path_normalized, re.IGNORECASE):
            return True
    for pattern in IGNORE_FILE_PATTERNS:
        if re.search(pattern, path_normalized, re.IGNORECASE):
            return True
    return False

def get_file_priority_score(file_path: str) -> int:
    """
    Ranks files by topological architectural importance:
    Tier 1 (Highest): Entry points, routing, server setup
    Tier 2: Models, Schemas, Database migrations
    Tier 3: Controllers, Services, API handlers
    Tier 4: UI Components, State management
    Tier 5: Utilities, Configs
    """
    p = file_path.lower().replace('\\', '/')
    name = p.split('/')[-1]

    # Tier 1: Core Entry Points & App Roots
    if name in ['server.js', 'server.ts', 'main.py', 'app.py', 'index.js', 'index.ts', 'app.js', 'app.ts', 'main.go', 'main.rs']:
        return 100
    if 'route' in p or 'controller' in p or 'api' in p or 'endpoint' in p:
        return 90

    # Tier 2: Schemas & Database Entities
    if 'schema' in p or 'model' in p or 'entity' in p or 'migration' in p or name.endswith('.prisma') or name.endswith('.sql'):
        return 80

    # Tier 3: Core Business Services / Handlers
    if 'service' in p or 'handler' in p or 'middleware' in p or 'agent' in p:
        return 70

    # Tier 4: Frontend Components & Views
    if name.endswith(('.jsx', '.tsx', '.vue', '.svelte')):
        return 50

    # Tier 5: Configs & Utils
    if 'config' in p or 'util' in p or 'helper' in p:
        return 40

    return 30

def skeletonize_js_ts(content: str) -> str:
    """
    Extracts imports, exports, class declarations, function signatures,
    and route definitions from JS/TS while omitting deep internal loop bodies.
    """
    lines = content.split('\n')
    if len(lines) <= 80:
        return content

    skeleton_lines = []
    in_multiline_comment = False

    for line in lines:
        stripped = line.strip()

        # Comment handling
        if '/*' in stripped and '*/' not in stripped:
            in_multiline_comment = True
            continue
        if '*/' in stripped:
            in_multiline_comment = False
            continue
        if in_multiline_comment or stripped.startswith('//'):
            continue

        # Keep imports, requires, and exports
        if re.match(r'^(import\s+|export\s+|const\s+.*=\s*require\(|module\.exports)', stripped):
            skeleton_lines.append(line)
            continue

        # Keep Express / Fastify / HTTP route definitions
        if re.search(r'(app|router|server)\.(get|post|put|delete|patch|use|all)\s*\(', stripped, re.IGNORECASE):
            skeleton_lines.append(line)
            continue

        # Keep class and interface declarations
        if re.match(r'^(export\s+)?(class|interface|type|enum|abstract\s+class)\s+', stripped):
            skeleton_lines.append(line)
            continue

        # Keep function definitions and async handlers
        if re.match(r'^(export\s+)?(async\s+)?function\s+[\w$]+\s*\(', stripped) or \
           re.match(r'^(const|let|var)\s+[\w$]+\s*=\s*(async\s*)?\([^)]*\)\s*=>', stripped) or \
           re.match(r'^(public|private|protected|async|\s*)+\s*[\w$]+\s*\([^)]*\)\s*[:{]', stripped):
            # Cleanly truncate long inline arrow bodies
            if '=>' in stripped and '{' not in stripped:
                skeleton_lines.append(line.split('=>')[0] + '=> { /* [AST Skeleton] */ };')
            else:
                skeleton_lines.append(line)
            continue

        # Keep Mongoose / Prisma schema definitions
        if 'new Schema(' in stripped or 'mongoose.model(' in stripped or 'Prisma.' in stripped:
            skeleton_lines.append(line)
            continue

    skeleton = '\n'.join(skeleton_lines)
    if len(skeleton_lines) < len(lines) * 0.7:
        return f"/* [AST SKELETON: Optimized from {len(lines)} lines to {len(skeleton_lines)} structural lines] */\n" + skeleton
    return content

def skeletonize_python(content: str) -> str:
    """
    Extracts imports, decorators, class headers, method signatures,
    and FastAPI/Flask routes from Python code.
    """
    lines = content.split('\n')
    if len(lines) <= 80:
        return content

    skeleton_lines = []
    for line in lines:
        stripped = line.strip()

        # Keep imports
        if stripped.startswith(('import ', 'from ')):
            skeleton_lines.append(line)
            continue

        # Keep decorators (e.g. @app.get('/api'), @router.post)
        if stripped.startswith('@'):
            skeleton_lines.append(line)
            continue

        # Keep class declarations
        if re.match(r'^class\s+\w+', stripped):
            skeleton_lines.append(line)
            continue

        # Keep function/method definitions
        if re.match(r'^(async\s+)?def\s+\w+', stripped):
            skeleton_lines.append(line)
            continue

        # Keep top-level assignments & Pydantic models / SQLAlchemy tables
        if re.match(r'^[A-Z_0-9]+\s*=', stripped) or 'BaseModel' in stripped or 'Column(' in stripped:
            skeleton_lines.append(line)
            continue

    skeleton = '\n'.join(skeleton_lines)
    if len(skeleton_lines) < len(lines) * 0.7:
        return f"# [AST SKELETON: Optimized from {len(lines)} lines to {len(skeleton_lines)} structural lines]\n" + skeleton
    return content

def skeletonize_code(file_path: str, content: str) -> str:
    """
    Dispatcher: Skeletonizes code based on file extension.
    """
    ext = file_path.lower().split('.')[-1] if '.' in file_path else ''

    if ext in ['js', 'jsx', 'ts', 'tsx', 'mjs', 'cjs']:
        return skeletonize_js_ts(content)
    elif ext in ['py', 'pyw']:
        return skeletonize_python(content)

    # For other languages, if over 120 lines, sample head and tail
    lines = content.split('\n')
    if len(lines) > 120:
        head = '\n'.join(lines[:60])
        tail = '\n'.join(lines[-25:])
        return f"{head}\n\n... [AST Skeleton: {len(lines) - 85} lines omitted for token optimization] ...\n\n{tail}"

    return content

def optimize_repo_files(files_dict: Dict[str, str], max_total_chars: int = 45000) -> Tuple[Dict[str, str], int]:
    """
    Sieves and skeletonizes an entire repository dictionary to fit within a strict token budget.
    Returns: (optimized_files_dict, saved_char_count)
    """
    # 1. Filter ignored files
    filtered = {path: content for path, content in files_dict.items() if not should_ignore_file(path)}

    # 2. Sort by topological importance score
    sorted_paths = sorted(filtered.keys(), key=lambda p: get_file_priority_score(p), reverse=True)

    original_size = sum(len(c) for c in files_dict.values())
    optimized = {}
    current_chars = 0

    for path in sorted_paths:
        raw_content = filtered[path]
        skeleton = skeletonize_code(path, raw_content)

        if current_chars + len(skeleton) <= max_total_chars:
            optimized[path] = skeleton
            current_chars += len(skeleton)
        else:
            # If running out of budget, include only high-level 20-line stub
            stub_lines = skeleton.split('\n')[:25]
            stub = '\n'.join(stub_lines) + f"\n... [Truncated remaining {len(skeleton.splitlines()) - 25} lines]"
            if current_chars + len(stub) <= max_total_chars:
                optimized[path] = stub
                current_chars += len(stub)
            else:
                break

    saved_chars = max(0, original_size - current_chars)
    return optimized, saved_chars
