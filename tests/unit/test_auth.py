"""
Unit tests for middleware/auth.py — authentication must fail closed.
"""

import pytest
from fastapi import HTTPException

from middleware.auth import verify_api_access


@pytest.fixture
def auth_env(monkeypatch):
    """Start every test from a clean auth environment (conftest opts the suite into dev-bypass)."""
    monkeypatch.delenv("CARBON_AUTH_DISABLED", raising=False)
    monkeypatch.delenv("CARBON_API_KEY", raising=False)
    return monkeypatch


class TestFailClosed:

    @pytest.mark.asyncio
    async def test_enforced_by_default_without_configured_key_returns_503(self, auth_env):
        with pytest.raises(HTTPException) as exc:
            await verify_api_access(api_key="anything")
        assert exc.value.status_code == 503

    @pytest.mark.asyncio
    async def test_enforced_by_default_rejects_missing_key(self, auth_env):
        auth_env.setenv("CARBON_API_KEY", "secret-key")
        with pytest.raises(HTTPException) as exc:
            await verify_api_access(api_key=None)
        assert exc.value.status_code == 401

    @pytest.mark.asyncio
    async def test_rejects_wrong_key(self, auth_env):
        auth_env.setenv("CARBON_API_KEY", "secret-key")
        with pytest.raises(HTTPException) as exc:
            await verify_api_access(api_key="wrong-key")
        assert exc.value.status_code == 401

    @pytest.mark.asyncio
    async def test_accepts_correct_key(self, auth_env):
        auth_env.setenv("CARBON_API_KEY", "secret-key")
        result = await verify_api_access(api_key="secret-key")
        assert result == {"source": "api-key"}

    @pytest.mark.asyncio
    @pytest.mark.parametrize("value", ["false", "0", "", "yes", "1"])
    async def test_only_literal_true_disables_auth(self, auth_env, value):
        auth_env.setenv("CARBON_AUTH_DISABLED", value)
        with pytest.raises(HTTPException) as exc:
            await verify_api_access(api_key=None)
        assert exc.value.status_code == 503


class TestDevBypass:

    @pytest.mark.asyncio
    @pytest.mark.parametrize("value", ["true", "TRUE", " True "])
    async def test_explicit_opt_in_bypasses(self, auth_env, value):
        auth_env.setenv("CARBON_AUTH_DISABLED", value)
        result = await verify_api_access(api_key=None)
        assert result == {"source": "dev-bypass"}


class TestEndpointEnforcement:

    @pytest.mark.asyncio
    async def test_protected_endpoint_requires_key_when_enforced(self, api_client, auth_env):
        auth_env.setenv("CARBON_API_KEY", "secret-key")
        response = await api_client.post("/api/roast", json={"repo_url": "https://github.com/a/b"})
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_protected_endpoint_503_when_key_unconfigured(self, api_client, auth_env):
        response = await api_client.post("/api/roast", json={"repo_url": "https://github.com/a/b"})
        assert response.status_code == 503
