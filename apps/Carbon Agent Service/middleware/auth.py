"""
middleware/auth.py — API Key authentication for Carbon Agent Service.
Supports API key header.
"""

import os
import hmac
from fastapi import HTTPException, Security
from fastapi.security import APIKeyHeader

api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)

async def verify_api_access(
    api_key: str = Security(api_key_header)
):
    """
    Validates API access via X-API-Key header.

    Fails closed: authentication is enforced unless CARBON_AUTH_DISABLED=true is
    set explicitly (local development only). If enforcement is on but
    CARBON_API_KEY is not configured, requests are rejected with 503.
    """
    if os.getenv("CARBON_AUTH_DISABLED", "false").strip().lower() == "true":
        return {"source": "dev-bypass"}

    expected_key = os.getenv("CARBON_API_KEY")
    if not expected_key:
        raise HTTPException(status_code=503, detail="Server authentication is not configured")

    if api_key and hmac.compare_digest(api_key.encode(), expected_key.encode()):
        return {"source": "api-key"}

    raise HTTPException(status_code=401, detail="Invalid or missing API key")
