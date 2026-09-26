"""
middleware/auth.py — API Key authentication for Carbon Agent Service.
Supports both API key header and optional JWT bearer tokens.
"""

import os
import hmac
from fastapi import HTTPException, Security, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials, APIKeyHeader

api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)
bearer_scheme = HTTPBearer(auto_error=False)


async def verify_api_access(
    api_key: str = Security(api_key_header),
    bearer: HTTPAuthorizationCredentials = Security(bearer_scheme),
):
    """
    Validates API access via either:
    1. X-API-Key header (for server-to-server)
    2. Bearer token (for client apps)

    In development (CARBON_AUTH_DISABLED=true), authentication is bypassed.
    """
    if os.getenv("CARBON_AUTH_DISABLED", "false").lower() == "true":
        return {"source": "dev-bypass"}

    expected_key = os.getenv("CARBON_API_KEY")
    if not expected_key:
        # If no API key is configured, allow all (backward compatible)
        return {"source": "no-auth-configured"}

    if api_key and hmac.compare_digest(api_key, expected_key):
        return {"source": "api-key"}

    if bearer and hmac.compare_digest(bearer.credentials, expected_key):
        return {"source": "bearer"}

    raise HTTPException(status_code=401, detail="Invalid or missing API key")
