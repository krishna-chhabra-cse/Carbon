"""
Unit tests for the explainer (OPML) agent.
All tests use mocks — zero API calls are made.
"""

from unittest.mock import patch

from agents.explainer_agent import run


ARCH = {"tech_stack": ["FastAPI"], "key_components": ["main.py"], "diagram": "graph TD\nA-->B"}


class TestExplainerAgent:
    """The agent must go through the shared LLM client (it used to reference an undefined `client`)."""

    @patch("tools.llm_client.generate_with_retry", return_value='  <item anchor="intro" title="Intro"/>  ')
    def test_uses_shared_llm_client(self, mock_generate):
        result = run(ARCH, {"endpoints": []}, {"flows": []})

        assert result == '<item anchor="intro" title="Intro"/>'
        prompt = mock_generate.call_args.args[0]
        assert "flowchart TD" in prompt

    @patch("tools.llm_client.generate_with_retry", return_value='```xml\n<item anchor="intro"/>\n```')
    def test_strips_markdown_code_fence(self, _mock_generate):
        assert run(ARCH, {}, {}) == '<item anchor="intro"/>'
