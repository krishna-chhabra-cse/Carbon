# ============================================================
#  tools/graph_rag.py — In-Memory Codebase Knowledge Graph & RAG
# ============================================================

import re
from typing import Dict, List, Set, Any

class CodebaseGraph:
    def __init__(self):
        # adjacency: node -> set of nodes it depends on (outgoing)
        self.dependencies: Dict[str, Set[str]] = {}
        # reverse_adj: node -> set of nodes that depend on it (incoming/dependents)
        self.dependents: Dict[str, Set[str]] = {}
        # metadata: node -> metadata dict (type, routes, symbols)
        self.nodes: Dict[str, Dict[str, Any]] = {}

    def add_node(self, file_path: str, node_type: str = "file", metadata: dict = None):
        if file_path not in self.nodes:
            self.nodes[file_path] = {
                "type": node_type,
                "metadata": metadata or {},
                "symbols": []
            }
            self.dependencies[file_path] = set()
            self.dependents[file_path] = set()

    def add_edge(self, source: str, target: str):
        self.add_node(source)
        self.add_node(target)
        self.dependencies[source].add(target)
        self.dependents[target].add(source)

    def get_blast_radius(self, target_name: str, max_depth: int = 3) -> List[str]:
        """
        Finds all downstream components affected if target_name changes.
        """
        # Find matching node keys
        matching_nodes = [k for k in self.nodes.keys() if target_name.lower() in k.lower()]
        if not matching_nodes:
            return []

        visited = set()
        queue = [(node, 0) for node in matching_nodes]

        while queue:
            current, depth = queue.pop(0)
            if current not in visited:
                visited.add(current)
                if depth < max_depth:
                    for dep in self.dependents.get(current, set()):
                        if dep not in visited:
                            queue.append((dep, depth + 1))

        return list(visited)

def extract_imports_and_symbols(file_path: str, content: str) -> Dict[str, Any]:
    """Extracts imported modules, declared routes, and top-level symbols."""
    imported_targets = []
    routes = []
    symbols = []

    # JS/TS imports & requires
    import_matches = re.findall(r'(?:import\s+.*?\s+from\s+[\'"](.*?)[\'"]|require\([\'"](.*?)[\'"]\))', content)
    for match in import_matches:
        target = match[0] or match[1]
        if target and not target.startswith('.'):
            imported_targets.append(target)  # External package
        elif target:
            # Relative import resolution
            clean_target = target.lstrip('./').replace('\\', '/')
            imported_targets.append(clean_target)

    # Route signatures
    route_matches = re.findall(r'(?:app|router|server)\.(get|post|put|delete|patch)\s*\(\s*[\'"`](.*?)[\'"`]', content, re.IGNORECASE)
    for m in route_matches:
        routes.append(f"{m[0].upper()} {m[1]}")

    # Top level functions/classes
    func_matches = re.findall(r'(?:function\s+([a-zA-Z0-9_$]+)|class\s+([a-zA-Z0-9_$]+)|def\s+([a-zA-Z0-9_$]+))', content)
    for m in func_matches:
        sym = m[0] or m[1] or m[2]
        if sym:
            symbols.append(sym)

    return {
        "imports": imported_targets,
        "routes": routes,
        "symbols": symbols
    }

def build_codebase_graph(files_dict: Dict[str, str]) -> CodebaseGraph:
    """Builds a full dependency and symbol graph from codebase files."""
    graph = CodebaseGraph()

    for path, content in files_dict.items():
        extracted = extract_imports_and_symbols(path, content)
        graph.add_node(path, node_type="module", metadata={
            "routes": extracted["routes"],
            "symbols": extracted["symbols"]
        })

        for imp in extracted["imports"]:
            # Find matching file in files_dict
            target_match = None
            for candidate_path in files_dict.keys():
                if candidate_path.endswith(f"{imp}.js") or candidate_path.endswith(f"{imp}.ts") or candidate_path.endswith(f"{imp}.py") or imp in candidate_path:
                    target_match = candidate_path
                    break
            
            if target_match:
                graph.add_edge(path, target_match)
            else:
                graph.add_edge(path, f"external:{imp}")

    return graph

def retrieve_graphrag_context(graph: CodebaseGraph, files_dict: Dict[str, str], query: str, max_chars: int = 15000) -> str:
    """
    Retrieves the most relevant AST modules, dependency edges, and blast radius for a given query.
    """
    query_lower = query.lower()
    matched_files = set()

    # 1. Keyword & symbol search
    for path, data in graph.nodes.items():
        if path.startswith("external:"):
            continue

        # Match path or route or symbol
        if any(term in path.lower() for term in query_lower.split()):
            matched_files.add(path)
        for route in data.get("metadata", {}).get("routes", []):
            if any(term in route.lower() for term in query_lower.split()):
                matched_files.add(path)
        for sym in data.get("metadata", {}).get("symbols", []):
            if sym.lower() in query_lower:
                matched_files.add(path)

    # 2. Graph Expansion: If matching files found, add their direct dependencies & blast radius
    expanded_files = set(matched_files)
    for f in list(matched_files):
        # Add components that depend on this
        dependents = graph.dependents.get(f, set())
        expanded_files.update([d for d in dependents if not d.startswith("external:")])
        # Add components this depends on
        dependencies = graph.dependencies.get(f, set())
        expanded_files.update([d for d in dependencies if not d.startswith("external:")])

    # If no specific files matched, select top structural entry points
    if not expanded_files:
        expanded_files = set(list(files_dict.keys())[:5])

    # 3. Format RAG Context
    context_sections = []
    current_length = 0

    for path in expanded_files:
        if path in files_dict and current_length < max_chars:
            content_snippet = files_dict[path][:2500]
            routes = graph.nodes.get(path, {}).get("metadata", {}).get("routes", [])
            deps = list(graph.dependencies.get(path, set()))
            dependents = list(graph.dependents.get(path, set()))

            section = f"""
=== MODULE: {path} ===
[ROUTES]: {', '.join(routes) if routes else 'None'}
[DEPENDS ON]: {', '.join(deps[:5]) if deps else 'None'}
[DEPENDENTS (Blast Radius)]: {', '.join(dependents[:5]) if dependents else 'None'}
[CODE]:
{content_snippet}
"""
            context_sections.append(section)
            current_length += len(section)

    return "\n----------------------------------------\n".join(context_sections)
