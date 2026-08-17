# ============================================================
#  agents/graphrag_agent.py — GraphRAG Codebase Conversational Agent
# ============================================================

import json
from tools.graph_rag import build_codebase_graph, retrieve_graphrag_context
from tools.llm_client import generate_with_retry

def run_graphrag_chat(files_dict: dict, query: str, folder_structure: str = "") -> dict:
    """
    Executes GraphRAG-powered conversational codebase Q&A.
    """
    print(f"\n[GRAPHRAG] Building dependency graph across {len(files_dict)} files for query: '{query}'...")
    graph = build_codebase_graph(files_dict)
    context_str = retrieve_graphrag_context(graph, files_dict, query)

    prompt = f"""
You are Carbon's Principal Architect & Codebase Intelligence Expert.
Answer the following developer question about this codebase using the provided Dependency Graph and AST Context.

### DEVELOPER QUESTION
"{query}"

### FOLDER STRUCTURE
{folder_structure[:1500]}

### GRAPHRAG RETRIEVED CONTEXT & BLAST RADIUS
{context_str}

---

### INSTRUCTIONS:
1. **Direct Answer**: Provide a concise, highly technical answer explaining the exact architecture, data flows, and mechanisms.
2. **Citations & References**: Reference exact file paths and symbol names (e.g. `src/routes/auth.js`, `User.create()`).
3. **Blast Radius Analysis**: If the user is asking about modifying or refactoring code, explicitly list what upstream/downstream components would be impacted.
4. **Visual Flowchart (Mermaid)**: Include a mini Mermaid flowchart (`graph TD` or `sequenceDiagram`) visualizing the exact flow or dependency chain in question. Keep labels clean.

Return your response in clean Markdown.
"""

    try:
        answer_markdown = generate_with_retry(prompt)
        return {
            "success": True,
            "query": query,
            "answer": answer_markdown,
            "retrievedNodesCount": len(graph.nodes)
        }
    except Exception as e:
        print(f"[GRAPHRAG ERROR] Generation failed: {e}")
        return {
            "success": False,
            "query": query,
            "answer": f"Unable to generate GraphRAG response: {str(e)}",
            "retrievedNodesCount": 0
        }
