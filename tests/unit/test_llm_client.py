"""
Unit tests for the dual-engine LLM client.
All tests use mocks — zero API calls are made.
"""

import pytest
from unittest.mock import patch, MagicMock
from tools.llm_client import (
    generate_with_retry,
    generate_with_gemini,
    is_ollama_available,
    CANDIDATE_GEMINI_MODELS,
)


class TestOllamaDetection:
    """Tests for Ollama local availability check."""

    @patch("tools.llm_client.urllib.request.urlopen")
    def test_returns_true_when_running(self, mock_urlopen):
        mock_response = MagicMock()
        mock_response.status = 200
        mock_response.__enter__ = lambda s: mock_response
        mock_response.__exit__ = MagicMock(return_value=False)
        mock_urlopen.return_value = mock_response
        assert is_ollama_available() is True

    @patch("tools.llm_client.urllib.request.urlopen", side_effect=ConnectionError)
    def test_returns_false_when_not_running(self, mock_urlopen):
        assert is_ollama_available() is False


class TestGenerateWithRetry:
    """Tests for the main generate_with_retry entry point."""

    @patch.dict("os.environ", {"LLM_PROVIDER": "gemini"})
    @patch("tools.llm_client.generate_with_gemini", return_value="gemini response")
    def test_uses_gemini_when_configured(self, mock_gemini):
        result = generate_with_retry("test prompt")
        assert result == "gemini response"
        mock_gemini.assert_called_once()

    @patch.dict("os.environ", {"LLM_PROVIDER": "ollama"})
    @patch("tools.llm_client.is_ollama_available", return_value=False)
    def test_raises_when_ollama_offline_and_required(self, mock_check):
        with pytest.raises(ConnectionError):
            generate_with_retry("test prompt")

    @patch.dict("os.environ", {"LLM_PROVIDER": "auto"})
    @patch("tools.llm_client.is_ollama_available", return_value=False)
    @patch("tools.llm_client.generate_with_gemini", return_value="fallback")
    def test_auto_falls_back_to_gemini(self, mock_gemini, mock_ollama):
        result = generate_with_retry("test prompt")
        assert result == "fallback"
