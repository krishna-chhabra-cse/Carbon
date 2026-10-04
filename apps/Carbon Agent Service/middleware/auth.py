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
    In development (CARBON_AUTH_DISABLED=true), authentication is bypassed.
    """
    if os.getenv("CARBON_AUTH_DISABLED", "false").lower() == "true":
        return {"source": "dev-bypass"}

    expected_key = os.getenv("CARBON_API_KEY")
    if not expected_key:
        raise HTTPException(status_code=503, detail="API key not configured")

    if api_key and hmac.compare_digest(api_key, expected_key):
        return {"source": "api-key"}

    raise HTTPException(status_code=401, detail="Invalid or missing API key")
