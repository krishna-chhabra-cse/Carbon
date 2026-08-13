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
from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
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
class AnalyzeRequest(BaseModel):
    repo_url: str   # e.g. "https://github.com/facebook/react"

class ChatRequest(BaseModel):
    repo_url: str
    query: str

# -------------------------------------------------------
# Cache to hold codebase state for chat queries
# Keys are repo_urls, values are dicts with folder_structure and files_content
# -------------------------------------------------------
REPO_CACHE = {}


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
# -------------------------------------------------------
@app.post("/run-agents")
async def run_agents(request: AnalyzeRequest):
    async def event_generator():
        repo_path = None
        try:
            print(f"\n{'='*50}")
            print(f"[START] Starting streaming analysis for: {request.repo_url}")
            print(f"{'='*50}")

            yield json.dumps({"status": "cloning"}) + "\n"

            # STEP 1: Clone the repository
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
                "repo_url": request.repo_url,
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
            REPO_CACHE[request.repo_url] = {
                "folder_structure": folder_structure,
                "files_content": files_content
            }

            print("\n[DONE] All agents finished! Returning final results.")

            # Yield the final payload
            yield json.dumps({
                "status": "complete",
                "success": True,
                "repo_url": request.repo_url,
                "architecture": final_state.get("architecture_result"),
                "api_docs": final_state.get("api_result"),
                "business_logic": final_state.get("business_logic_result"),
            }) + "\n"

        except Exception as e:
            print(f"[ERROR] Unexpected error: {e}")
            yield json.dumps({"status": "error", "message": str(e)}) + "\n"

        finally:
            if repo_path:
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
