"""
Integration tests for FastAPI endpoints using HTTPX AsyncClient.
All LLM calls are mocked — these test the HTTP layer and request validation.
"""

import pytest
from unittest.mock import patch, MagicMock


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
