"""
Guards the Backend's default Agent Service URL against drifting from the
port that `npm run dev` actually starts the Agent Service on.
"""

import json
import re
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
BACKEND_DIR = REPO_ROOT / "apps" / "Carbon Backend"

# Every Backend file that falls back to a default Agent Service URL.
BACKEND_FILES = [
    BACKEND_DIR / "server.js",
    BACKEND_DIR / "routes" / "analyze.js",
    BACKEND_DIR / "routes" / "roast.js",
    BACKEND_DIR / "routes" / "explainVideo.js",
]


def _dev_agent_port() -> str:
    scripts = json.loads((REPO_ROOT / "package.json").read_text())["scripts"]
    match = re.search(r"--port (\d+)", scripts["dev:agent"])
    assert match, "dev:agent script no longer sets --port"
    return match.group(1)


def test_dev_agent_port_is_8005():
    assert _dev_agent_port() == "8005"


@pytest.mark.parametrize("path", BACKEND_FILES, ids=lambda p: p.name)
def test_backend_default_agent_url_matches_dev_port(path):
    source = path.read_text()
    defaults = re.findall(r"PYTHON_SERVICE_URL\s*\|\|\s*'(http://localhost:\d+)'", source)
    assert defaults, f"no PYTHON_SERVICE_URL default found in {path.name}"
    expected = f"http://localhost:{_dev_agent_port()}"
    assert all(d == expected for d in defaults), f"{path.name} defaults {defaults}, expected {expected}"
