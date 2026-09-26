"""
Shared test fixtures for the Carbon test suite.
Provides mocked LLM clients, sample codebases, and FastAPI test client.
"""

import sys
import os
import pytest
from pathlib import Path
from unittest.mock import patch, MagicMock

# Add the agent service to sys.path so tests can import from tools/, agents/
AGENT_SERVICE_DIR = str(Path(__file__).resolve().parent.parent / "apps" / "Carbon Agent Service")
if AGENT_SERVICE_DIR not in sys.path:
    sys.path.insert(0, AGENT_SERVICE_DIR)


# ── Sample Codebase Fixtures ──────────────────────────────────

@pytest.fixture
def sample_express_codebase():
    """A minimal Express.js codebase for testing."""
    return {
        "src/server.js": """
const express = require('express');
const cors = require('cors');
const app = express();
app.use(cors({ origin: '*' }));
app.use('/api/users', require('./routes/users'));
app.use('/api/auth', require('./routes/auth'));
app.listen(3000, () => console.log('Running'));
""",
        "src/routes/users.js": """
const express = require('express');
const router = express.Router();
const User = require('../models/User');

router.get('/', async (req, res) => {
  const users = await User.find();
  res.json(users);
});

router.post('/', async (req, res) => {
  const user = await User.create(req.body);
  res.status(201).json(user);
});

module.exports = router;
""",
        "src/routes/auth.js": """
const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  const valid = await bcrypt.compare(password, user.password);
  if (valid) {
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);
    res.json({ token });
  }
});

module.exports = router;
""",
        "src/models/User.js": """
const mongoose = require('mongoose');
const UserSchema = new mongoose.Schema({
  username: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true }
});
module.exports = mongoose.model('User', UserSchema);
""",
    }


@pytest.fixture
def sample_fastapi_codebase():
    """A minimal FastAPI codebase for testing."""
    return {
        "main.py": """
from fastapi import FastAPI
from routes import users, auth

app = FastAPI()
app.include_router(users.router, prefix="/api/users")
app.include_router(auth.router, prefix="/api/auth")
""",
        "routes/users.py": """
from fastapi import APIRouter
from models import User
router = APIRouter()

@router.get("/")
async def list_users():
    return await User.all()

@router.post("/")
async def create_user(user: UserCreate):
    return await User.create(**user.dict())
""",
        "models.py": """
from sqlalchemy import Column, Integer, String
from database import Base

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    username = Column(String, unique=True)
    email = Column(String, unique=True)
    password_hash = Column(String)
""",
    }


@pytest.fixture
def sample_vulnerable_codebase():
    """A codebase with intentional security vulnerabilities for scanner testing."""
    return {
        "config/aws.js": "const key = 'AKIA1234567890ABCDEF'; module.exports = { key };",
        "routes/search.js": """
const router = require('express').Router();
router.get('/search', async (req, res) => {
  const query = `SELECT * FROM users WHERE name = '${req.query.name}'`;
  res.json(await db.query(query));
});
module.exports = router;
""",
        "server.js": """
const app = require('express')();
app.use(require('cors')({ origin: '*' }));
const result = eval(req.body.code);
const db_url = 'postgres://admin:password123@db.example.com:5432/prod';
""",
        "auth.js": """
const jwt_secret = 'my_super_secret_key_12345';
res.cookie('session', token, { httpOnly: false, secure: false });
""",
    }


# ── Mocked LLM Fixture ───────────────────────────────────────

@pytest.fixture
def mock_llm():
    """Patches generate_with_retry to return deterministic mock responses."""
    with patch("tools.llm_client.generate_with_retry") as mock:
        mock.return_value = '{"summary": "Mock architecture summary", "tech_stack": ["Node.js"], "key_components": [], "diagram": "graph TD\\nA[App] --> B[DB]"}'
        yield mock


@pytest.fixture
def mock_gemini_client():
    """Patches the Gemini client to prevent real API calls."""
    with patch("tools.llm_client.get_gemini_client") as mock:
        client = MagicMock()
        response = MagicMock()
        response.text = "Mock LLM response"
        client.models.generate_content.return_value = response
        mock.return_value = client
        yield client


# ── FastAPI Test Client ───────────────────────────────────────

@pytest.fixture
def api_client():
    """Provides a FastAPI TestClient for endpoint testing."""
    from httpx import AsyncClient, ASGITransport
    from main import app

    transport = ASGITransport(app=app)
    return AsyncClient(transport=transport, base_url="http://test")
