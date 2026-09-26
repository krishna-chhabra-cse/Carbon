"""
tools/graph_rag.py — NetworkX-backed Codebase Knowledge Graph & RAG
Provides robust topological sorting, blast radius BFS, and RAG context retrieval.
"""

import re
import networkx as nx
from typing import Dict, List, Set, Any


class CodebaseGraph:
    """A NetworkX wrapper that represents the codebase as a Directed Graph."""

    def __init__(self):
        # Directed graph: Edge from A -> B means A depends on B.
        self._nx_graph = nx.DiGraph()

    def add_node(self, file_path: str, node_type: str = "file", metadata: dict = None):
        if not self._nx_graph.has_node(file_path):
            self._nx_graph.add_node(
                file_path,
                type=node_type,
                metadata=metadata or {},
                symbols=[]
            )
        else:
            if metadata:
                self._nx_graph.nodes[file_path]["metadata"].update(metadata)
            if node_type != "file":
                self._nx_graph.nodes[file_path]["type"] = node_type

    def add_edge(self, source: str, target: str):
        self.add_node(source)
        self.add_node(target)
        self._nx_graph.add_edge(source, target)

    @property
    def nodes(self):
        """Compatibility property for tests."""
        return self._nx_graph.nodes

    @property
    def dependencies(self):
        """Compatibility property: node -> set of nodes it depends on."""
        return {n: set(self._nx_graph.successors(n)) for n in self._nx_graph.nodes}

    @property
    def dependents(self):
        """Compatibility property: node -> set of nodes that depend on it."""
        return {n: set(self._nx_graph.predecessors(n)) for n in self._nx_graph.nodes}

    def get_blast_radius(self, target_name: str, max_depth: int = 3) -> List[str]:
        """
        Finds all downstream components affected if target_name changes.
        Uses NetworkX BFS traversal on the reversed graph.
        """
        matching_nodes = [k for k in self._nx_graph.nodes if target_name.lower() in k.lower()]
        if not matching_nodes:
            return []

        # We want to find nodes that depend on the target.
        # Since A -> B means A depends on B, we need the reverse graph to traverse B -> A.
        rev_graph = self._nx_graph.reverse()
        affected = set()

        for start_node in matching_nodes:
            # nx.single_source_shortest_path_length gives depths up to cutoff
            reachable = nx.single_source_shortest_path_length(rev_graph, start_node, cutoff=max_depth)
            affected.update(reachable.keys())

        return list(affected)


def extract_imports_and_symbols(file_path: str, content: str) -> Dict[str, Any]:
    """Extracts imported modules, declared routes, and top-level symbols."""
    imported_targets = []
    routes = []
    symbols = []
    lines = content.split('\n')

    for line in lines:
        stripped = line.strip()

        # JS/TS imports
        if stripped.startswith('import ') or 'require(' in stripped:
            match = re.search(r'[\'"]([^\'"]+)[\'"]', stripped)
            if match:
                imported_targets.append(match.group(1))

        # Python imports
        if stripped.startswith('from ') or stripped.startswith('import '):
            parts = stripped.split()
            if len(parts) >= 2:
                imported_targets.append(parts[1])

        # Express/FastAPI routes
        if re.search(r'\.(get|post|put|delete|patch|use)\(', stripped):
            match = re.search(r'\.(get|post|put|delete|patch)\s*\(\s*[\'"]([^\'"]+)[\'"]', stripped)
            if match:
                routes.append(f"{match.group(1).upper()} {match.group(2)}")

        # Symbols (classes/functions)
        if stripped.startswith('class '):
            parts = stripped.split()
            if len(parts) > 1:
                name = parts[1].split('(')[0].split('{')[0].strip(':')
                symbols.append(name)
        elif stripped.startswith('def ') or stripped.startswith('async def '):
            name_part = stripped.replace('async def ', '').replace('def ', '')
            name = name_part.split('(')[0]
            symbols.append(name)
        elif stripped.startswith('function '):
            parts = stripped.split()
            if len(parts) > 1:
                name = parts[1].split('(')[0]
                symbols.append(name)

    return {
        "imports": imported_targets,
        "routes": routes,
        "symbols": symbols
    }


def build_codebase_graph(files_dict: Dict[str, str]) -> CodebaseGraph:
    """Parses files and builds the NetworkX codebase graph."""
    graph = CodebaseGraph()

    for file_path, content in files_dict.items():
        extracted = extract_imports_and_symbols(file_path, content)
        graph.add_node(file_path, metadata=extracted)

        # Naive matching of imports to files
        for imp in extracted["imports"]:
            clean_imp = imp.replace('./', '').replace('../', '').split('/')[-1]
            matched = False
            for potential_target in files_dict.keys():
                if clean_imp in potential_target:
                    graph.add_edge(file_path, potential_target)
                    matched = True
                    break
            if not matched:
                graph.add_edge(file_path, f"external:{imp}")

    return graph


def retrieve_graphrag_context(graph: CodebaseGraph, files_dict: Dict[str, str], query: str, max_chars: int = 15000) -> str:
    """Retrieves subgraph context relevant to the user query."""
    query_terms = query.lower().split()
    scored_nodes = {}

    for node, data in graph.nodes.items():
        score = 0
        node_lower = node.lower()

        for term in query_terms:
            if term in node_lower:
                score += 10
            for route in data.get('metadata', {}).get('routes', []):
                if term in route.lower():
                    score += 5
            for sym in data.get('metadata', {}).get('symbols', []):
                if term in sym.lower():
                    score += 2

        if score > 0:
            scored_nodes[node] = score

    if not scored_nodes:
        return "\n".join(
            f"=== {k} ===\n{v[:1000]}"
            for k, v in list(files_dict.items())[:3]
        )

    top_nodes = sorted(scored_nodes.keys(), key=lambda k: scored_nodes[k], reverse=True)[:5]
    context_parts = []
    total_chars = 0

    for node in top_nodes:
        if node not in files_dict:
            continue

        deps = graph.dependencies.get(node, set())
        dependents = graph.dependents.get(node, set())
        routes = graph.nodes[node].get("metadata", {}).get("routes", [])

        # Instead of returning raw content, let's use the AST skeletonizer for token efficiency
        from tools.ast_skeletonizer import skeletonize_code
        content = skeletonize_code(node, files_dict[node])

        chunk = (
            f"=== MODULE: {node} ===\n"
            f"[ROUTES]: {', '.join(routes) if routes else 'None'}\n"
            f"[DEPENDS ON]: {', '.join(deps) if deps else 'None'}\n"
            f"[DEPENDENTS (Blast Radius)]: {', '.join(dependents) if dependents else 'None'}\n"
            f"[CODE]:\n\n{content}\n"
        )
        if total_chars + len(chunk) > max_chars:
            chunk = chunk[:(max_chars - total_chars)]
            context_parts.append(chunk)
            break

        context_parts.append(chunk)
        total_chars += len(chunk)

    return "\n\n----------------------------------------\n\n".join(context_parts)
