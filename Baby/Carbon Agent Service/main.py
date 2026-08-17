# ============================================================
#  main.py — Python FastAPI Server (the agent orchestrator)
#
#  This is the entry point for the Python side.
#  It runs on port 8000 and is called internally by Node.js.
#
#  Flow:
#  Node.js → POST /run-agents → this file →
#    1. Clone the repo
#    2. Read the files
#    3. Run Architecture Agent (more agents coming later!)
#    4. Clean up
#    5. Return all results to Node.js
# ============================================================

import json
import os
from typing import Optional, List
from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, model_validator
from dotenv import load_dotenv

# Import our tools
from tools.git_cloner import clone_repo, cleanup_repo
from tools.file_reader import get_folder_structure, read_files_for_analysis

from agents.architecture_agent import run as run_architecture_agent
from agents.api_agent import run as run_api_agent
from agents.business_logic_agent import run as run_business_logic_agent

# Load environment variables from .env
load_dotenv()

# Create the FastAPI app
# FastAPI automatically creates API documentation at http://localhost:8000/docs
app = FastAPI(
    title="Carbon — Agent Service",
    description="Internal Python service that runs AI agents to analyze codebases",
    version="1.0.0"
)

# Allow all origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# -------------------------------------------------------
# Define the shape of data we expect from Node.js
# Pydantic validates this automatically — if "repo_url"
# is missing, it returns a clear error before we even run
# -------------------------------------------------------
class FilePayload(BaseModel):
    path: str
    content: str
    size: Optional[int] = None

class AnalyzeRequest(BaseModel):
    repo_url: Optional[str] = None         # e.g. "https://github.com/facebook/react"
    workspace_name: Optional[str] = None   # e.g. "MyProject"
    files: Optional[List[FilePayload]] = None  # Uploaded file contents from VS Code extension
    folder_structure: Optional[str] = None # Folder structure tree text

    @model_validator(mode="after")
    def _require_a_source(self):
        has_repo = bool(self.repo_url and self.repo_url.strip())
        has_files = bool(self.files and len(self.files) > 0)
        if not has_repo and not has_files:
            raise ValueError("Either 'repo_url' or a non-empty 'files' list must be provided")
        return self

class ChatRequest(BaseModel):
    repo_url: str
    query: str

class ExplainerOPMLRequest(BaseModel):
    architecture: Optional[dict] = None
    api_docs: Optional[dict] = None
    business_logic: Optional[dict] = None


# -------------------------------------------------------
# Cache to hold codebase state for chat queries.
# -------------------------------------------------------
REPO_CACHE = {}


def get_cache_key(repo_url: Optional[str], workspace_name: Optional[str]) -> str:
    """
    Builds a stable cache key for either a GitHub repo or a workspace payload.
    """
    if repo_url:
        return repo_url.strip()
    if workspace_name:
        return workspace_name.strip()
    return "workspace_default"


# -------------------------------------------------------
# Health check — useful to know if Python service is alive
# -------------------------------------------------------
@app.get("/")
def health_check():
    return {"status": "ok", "message": "🐍 Python Agent Service is running!"}


# -------------------------------------------------------
# The main endpoint — Node.js calls this
# POST /run-agents
# Body: { "repo_url": "https://github.com/..." }
#   OR: { "workspace_name": "...", "files": [...], "folder_structure": "..." }
# -------------------------------------------------------
@app.post("/run-agents")
async def run_agents(request: AnalyzeRequest):
    async def event_generator():
        repo_path = None
        is_uploaded_workspace = bool(request.files and len(request.files) > 0)
        source_label = request.workspace_name if is_uploaded_workspace else request.repo_url

        try:
            print(f"\n{'='*50}")
            print(f"[START] Starting streaming analysis for: {source_label}")
            print(f"{'='*50}")

            if is_uploaded_workspace:
                yield json.dumps({"status": "reading_files"}) + "\n"

                print(f"\n[STEP 1] Processing {len(request.files)} uploaded workspace files...")
                raw_uploaded = { item.path: item.content for item in request.files }
                from tools.ast_skeletonizer import optimize_repo_files
                files_content, _ = optimize_repo_files(raw_uploaded, max_total_chars=40000)
                folder_structure = request.folder_structure or "\n".join(f"[FILE] {f.path}" for f in request.files)
            else:
                yield json.dumps({"status": "cloning"}) + "\n"

                print("\n[STEP 1] Cloning remote repository...")
                clone_result = clone_repo(request.repo_url)

                if not clone_result["success"]:
                    yield json.dumps({"status": "error", "message": f"Failed to clone repo: {clone_result['error']}"}) + "\n"
                    return

                repo_path = clone_result["repo_path"]
                yield json.dumps({"status": "reading_files"}) + "\n"

                # STEP 2: Read file structure and contents
                print("\n[STEP 2] Reading files...")
                folder_structure = get_folder_structure(repo_path)
                files_content = read_files_for_analysis(repo_path)
            
            yield json.dumps({"status": "analyzing"}) + "\n"

            print("\n[GRAPH] Starting collaborative agent workflow...")
            from agents.graph import agent_graph
            
            initial_state = {
                "repo_url": source_label,
                "folder_structure": folder_structure,
                "files_content": files_content
            }
            
            # Stream the graph execution!
            final_state = {}
            for event in agent_graph.stream(initial_state):
                for node_name, partial_state in event.items():
                    print(f"[{node_name}] finished.")
                    yield json.dumps({"status": "node_finished", "node": node_name}) + "\n"
                    final_state.update(partial_state)
            
            # CACHE THE REPO DATA FOR CHAT
            cache_key = get_cache_key(request.repo_url, request.workspace_name)
            REPO_CACHE[cache_key] = {
                "folder_structure": folder_structure,
                "files_content": files_content
            }

            print("\n[DONE] All agents finished! Returning final results.")

            # Yield the final payload
            yield json.dumps({
                "status": "complete",
                "success": True,
                "repo_url": request.repo_url,
                "workspace_name": request.workspace_name,
                "architecture": final_state.get("architecture_result"),
                "api_docs": final_state.get("api_result"),
                "business_logic": final_state.get("business_logic_result"),
                "security": final_state.get("security_result"),
            }) + "\n"

        except Exception as e:
            print(f"[ERROR] Unexpected error: {e}")
            yield json.dumps({"status": "error", "message": str(e)}) + "\n"

        finally:
            # IMPORTANT: only delete cloned temp repos.
            if repo_path and not is_uploaded_workspace:
                print("\n[CLEANUP] Cleaning up cloned repo...")
                cleanup_repo(repo_path)

    return StreamingResponse(event_generator(), media_type="application/x-ndjson")


class CompanionRequest(BaseModel):
    query: str
    mode: Optional[str] = "explain"
    context: Optional[dict] = None

# -------------------------------------------------------
# The Chat endpoint
# POST /chat
# Body: { "repo_url": "...", "query": "..." }
# -------------------------------------------------------
@app.post("/chat")
async def chat(request: ChatRequest):
    # If repo is cached, answer with codebase context
    if request.repo_url in REPO_CACHE:
        cached_data = REPO_CACHE[request.repo_url]
        from agents.chat_agent import run as run_chat_agent
        try:
            answer = run_chat_agent(
                folder_structure=cached_data["folder_structure"],
                files_content=cached_data["files_content"],
                query=request.query
            )
            return {"success": True, "answer": answer}
        except Exception as e:
            print(f"[ERROR] Codebase chat failed, falling back to companion: {e}")

    # Fallback to general AI companion
    from agents.companion_agent import run as run_companion_agent
    try:
        res = run_companion_agent(
            query=request.query,
            mode="explain",
            context={"url": request.repo_url}
        )
        return {"success": True, "answer": res["answer"]}
    except Exception as e:
        print(f"[ERROR] Chat failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# -------------------------------------------------------
# The Web Companion endpoint (Chrome Extension)
# POST /companion
# Body: { "query": "...", "mode": "explain|simplify|teach|summarize|page_explain|lessons", "context": {...} }
# -------------------------------------------------------
@app.post("/companion")
async def companion(request: CompanionRequest):
    from agents.companion_agent import run as run_companion_agent
    try:
        result = run_companion_agent(
            query=request.query,
            mode=request.mode or "explain",
            context=request.context or {}
        )
        return result
    except Exception as e:
        print(f"[ERROR] Companion failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# -------------------------------------------------------
# The Explainer OPML generation endpoint
# POST /generate-explainer-opml
# -------------------------------------------------------
@app.post("/generate-explainer-opml")
async def generate_explainer_opml(request: ExplainerOPMLRequest):
    try:
        from agents.explainer_agent import run as run_explainer_agent
        opml_content = run_explainer_agent(
            architecture=request.architecture or {},
            api_docs=request.api_docs or {},
            business_logic=request.business_logic or {}
        )
        return {"success": True, "opml": opml_content}
    except Exception as e:
        print(f"[ERROR] OPML generation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


