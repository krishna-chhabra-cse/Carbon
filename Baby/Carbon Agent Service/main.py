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
from typing import Optional
from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, model_validator
from dotenv import load_dotenv

# Import our tools
from tools.git_cloner import clone_repo, cleanup_repo
from tools.file_reader import get_folder_structure, read_files_for_analysis
from tools.workspace_reader import validate_workspace_path

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
class AnalyzeRequest(BaseModel):
    repo_url: Optional[str] = None    # e.g. "https://github.com/facebook/react"
    local_path: Optional[str] = None  # e.g. "C:\\Users\\username\\project"

    # NOTE: written for Pydantic v2 (model_validator). If this project pins
    # Pydantic v1, swap this for `@root_validator` with the same body.
    @model_validator(mode="after")
    def _require_a_source(self):
        if not self.repo_url and not self.local_path:
            raise ValueError("Either 'repo_url' or 'local_path' must be provided")
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
#
# Keys are a stable identifier for the analyzed source:
#   - the repo_url as-is, for GitHub repositories
#   - the normalized absolute path, for local workspaces
# Values are dicts with folder_structure and files_content.
# -------------------------------------------------------
REPO_CACHE = {}


def get_cache_key(repo_url: Optional[str], local_path: Optional[str]) -> str:
    """
    Builds a stable cache key for either a GitHub repo or a local workspace.
    GitHub repos are keyed by URL (unchanged from before). Local workspaces
    are keyed by their normalized absolute path so the same folder always
    maps to the same cache entry.
    """
    if local_path:
        return os.path.normpath(os.path.abspath(local_path))
    return repo_url


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
#   OR: { "local_path": "C:\\Users\\username\\project" }
# -------------------------------------------------------
@app.post("/run-agents")
async def run_agents(request: AnalyzeRequest):
    async def event_generator():
        repo_path = None
        is_local_workspace = bool(request.local_path)
        source_label = request.local_path if is_local_workspace else request.repo_url

        try:
            print(f"\n{'='*50}")
            print(f"[START] Starting streaming analysis for: {source_label}")
            print(f"{'='*50}")

            if is_local_workspace:
                # STEP 1 (local workspace): validate the path instead of cloning
                yield json.dumps({"status": "reading_workspace"}) + "\n"

                print("\n[STEP 1] Validating local workspace path...")
                validation_result = validate_workspace_path(request.local_path)

                if not validation_result["success"]:
                    yield json.dumps({"status": "error", "message": f"Invalid workspace path: {validation_result['error']}"}) + "\n"
                    return

                repo_path = validation_result["path"]
            else:
                # STEP 1 (GitHub repo): clone the repository — unchanged
                yield json.dumps({"status": "cloning"}) + "\n"

                print("\n[STEP 1] Cloning repository...")
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
            # LangGraph yields updates as each node completes
            final_state = {}
            for event in agent_graph.stream(initial_state):
                # event is a dict mapping node_name -> partial_state
                for node_name, partial_state in event.items():
                    print(f"[{node_name}] finished.")
                    yield json.dumps({"status": "node_finished", "node": node_name}) + "\n"
                    # Update our running final_state
                    final_state.update(partial_state)
            
            # CACHE THE REPO DATA FOR CHAT
            cache_key = get_cache_key(request.repo_url, request.local_path)
            REPO_CACHE[cache_key] = {
                "folder_structure": folder_structure,
                "files_content": files_content
            }

            print("\n[DONE] All agents finished! Returning final results.")

            # Yield the final payload (repo_url / local_path preserved as sent,
            # so existing GitHub-flow consumers see the exact same shape as before)
            yield json.dumps({
                "status": "complete",
                "success": True,
                "repo_url": request.repo_url,
                "local_path": request.local_path,
                "architecture": final_state.get("architecture_result"),
                "api_docs": final_state.get("api_result"),
                "business_logic": final_state.get("business_logic_result"),
            }) + "\n"

        except Exception as e:
            print(f"[ERROR] Unexpected error: {e}")
            yield json.dumps({"status": "error", "message": str(e)}) + "\n"

        finally:
            # IMPORTANT: only delete cloned temp repos. A local workspace
            # is the user's own project folder and must never be removed.
            if repo_path and not is_local_workspace:
                print("\n[CLEANUP] Cleaning up cloned repo...")
                cleanup_repo(repo_path)

    return StreamingResponse(event_generator(), media_type="application/x-ndjson")


# -------------------------------------------------------
# The Chat endpoint
# POST /chat
# Body: { "repo_url": "...", "query": "..." }
# -------------------------------------------------------
@app.post("/chat")
async def chat(request: ChatRequest):
    if request.repo_url not in REPO_CACHE:
        raise HTTPException(
            status_code=400, 
            detail="Repo not found in cache. Please analyze it first."
        )

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
        print(f"[ERROR] Chat failed: {e}")
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

