"""
Integration tests for FastAPI endpoints using HTTPX AsyncClient.
All LLM calls are mocked — these test the HTTP layer and request validation.
"""

import pytest
from unittest.mock import patch, MagicMock
from main import REPO_CACHE


@pytest.fixture
def mock_all_agents():
    """Mock all agent calls to prevent real LLM invocations."""
    with patch("agents.graph.agent_graph") as mock_graph:
        mock_graph.stream.return_value = iter([
            {"architecture": {"architecture_result": {"summary": "Test arch", "diagram": "graph TD\\nA-->B"}}},
            {"api": {"api_result": {"api_type": "REST", "endpoints": []}}},
            {"security": {"security_result": {"scorecard": {"grade": "A+"}}}},
            {"business_logic": {"business_logic_result": {"app_purpose": "Test", "business_flows": []}}},
        ])
        yield mock_graph


class TestHealthEndpoint:
    """Tests for the / health check."""

    @pytest.mark.asyncio
    async def test_health_returns_ok(self, api_client):
        response = await api_client.get("/")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"


class TestLLMStatusEndpoint:
    """Tests for GET /llm-status (engine detection & air-gapped status)."""

    @pytest.mark.asyncio
    @patch.dict("os.environ", {"LLM_PROVIDER": "auto"})
    @patch("tools.llm_client.is_ollama_available", return_value=False)
    async def test_llm_status_default_gemini(self, mock_ollama, api_client):
        response = await api_client.get("/llm-status")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert data["activeEngine"] == "gemini"
        assert data["ollamaOnline"] is False
        assert data["airGappedMode"] is False
        assert data["cloudProvider"] == "Google Gemini"

    @pytest.mark.asyncio
    @patch.dict("os.environ", {"LLM_PROVIDER": "ollama"})
    @patch("tools.llm_client.is_ollama_available", return_value=True)
    @patch("tools.llm_client.get_installed_ollama_models", return_value=["codellama:7b", "llama3:8b"])
    async def test_llm_status_ollama_airgapped(self, mock_models, mock_ollama, api_client):
        response = await api_client.get("/llm-status")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert data["activeEngine"] == "ollama"
        assert data["ollamaOnline"] is True
        assert data["airGappedMode"] is True
        assert data["installedOllamaModels"] == ["codellama:7b", "llama3:8b"]


class TestRunAgentsEndpoint:
    """Tests for POST /run-agents."""

    @pytest.mark.asyncio
    async def test_rejects_empty_request(self, api_client):
        response = await api_client.post("/run-agents", json={})
        assert response.status_code == 422, "Should reject request with no repo_url or files"

    @pytest.mark.asyncio
    async def test_accepts_workspace_files(self, api_client, mock_all_agents):
        response = await api_client.post("/run-agents", json={
            "workspace_name": "TestProject",
            "files": [
                {"path": "src/app.js", "content": "const x = 1;"},
            ],
            "folder_structure": "[FILE] src/app.js"
        })
        assert response.status_code == 200


class TestChatEndpoint:
    """Tests for POST /chat."""

    @pytest.mark.asyncio
    async def test_chat_requires_repo_url(self, api_client):
        response = await api_client.post("/chat", json={"query": "test"})
        assert response.status_code == 422

    @pytest.mark.asyncio
    @patch("agents.companion_agent.run", return_value={"answer": "Mock answer"})
    async def test_chat_fallback_to_companion(self, mock_companion, api_client):
        response = await api_client.post("/chat", json={
            "repo_url": "https://github.com/test/repo",
            "query": "How does auth work?"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["answer"] == "Mock answer"

    @pytest.mark.asyncio
    @patch("agents.graphrag_agent.run_graphrag_chat")
    async def test_chat_cached_repo_uses_graphrag(self, mock_graphrag, api_client):
        test_repo = "https://github.com/test/cached-repo"
        REPO_CACHE[test_repo] = {
            "folder_structure": "[FILE] src/index.js",
            "files_content": {"src/index.js": "console.log('hello');"}
        }
        mock_graphrag.return_value = {
            "success": True,
            "query": "Where is the entry point?",
            "answer": "The entry point is src/index.js",
            "retrievedNodesCount": 1
        }

        try:
            response = await api_client.post("/chat", json={
                "repo_url": test_repo,
                "query": "Where is the entry point?"
            })
            assert response.status_code == 200
            data = response.json()
            assert data["success"] is True
            assert data["retrievedNodesCount"] == 1
            assert data["answer"] == "The entry point is src/index.js"
            mock_graphrag.assert_called_once_with(
                files_dict={"src/index.js": "console.log('hello');"},
                query="Where is the entry point?",
                folder_structure="[FILE] src/index.js"
            )
        finally:
            REPO_CACHE.pop(test_repo, None)

    @pytest.mark.asyncio
    @patch("agents.graphrag_agent.run_graphrag_chat", side_effect=RuntimeError("GraphRAG engine failure"))
    @patch("agents.companion_agent.run", return_value={"answer": "Fallback answer"})
    async def test_chat_graphrag_failure_falls_back_to_companion(self, mock_companion, mock_graphrag, api_client):
        test_repo = "https://github.com/test/failing-cached-repo"
        REPO_CACHE[test_repo] = {
            "folder_structure": "[FILE] src/index.js",
            "files_content": {"src/index.js": "console.log('hello');"}
        }

        try:
            response = await api_client.post("/chat", json={
                "repo_url": test_repo,
                "query": "Where is the entry point?"
            })
            assert response.status_code == 200
            data = response.json()
            assert data["success"] is True
            assert data["answer"] == "Fallback answer"
            mock_companion.assert_called_once_with(
                query="Where is the entry point?",
                mode="explain",
                context={"url": test_repo}
            )
        finally:
            REPO_CACHE.pop(test_repo, None)


class TestCompanionEndpoint:
    """Tests for POST /companion (Chrome Extension Web Companion)."""

    @pytest.mark.asyncio
    async def test_companion_requires_query(self, api_client):
        response = await api_client.post("/companion", json={})
        assert response.status_code == 422

    @pytest.mark.asyncio
    @patch("agents.companion_agent.run", return_value={"answer": "Detailed explanation of CORS."})
    async def test_companion_success(self, mock_companion, api_client):
        response = await api_client.post("/companion", json={
            "query": "Explain CORS",
            "mode": "explain",
            "context": {"url": "https://developer.mozilla.org"}
        })
        assert response.status_code == 200
        data = response.json()
        assert data["answer"] == "Detailed explanation of CORS."
        mock_companion.assert_called_once_with(
            query="Explain CORS",
            mode="explain",
            context={"url": "https://developer.mozilla.org"}
        )
