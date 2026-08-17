# Carbon — PR Architecture & Impact Reviewer (GitHub Action)

> **Autonomous AI-powered PR Intelligence: Interactive Architecture Flowcharts, Blast Radius Calculation, and Breaking Change Detection.**

---

## 🌟 What does this Action do?

Whenever a **Pull Request** is opened or updated in your repository, **Carbon PR Action**:

1. 🔍 **Parses Unified Git Diffs & Code Changes**: Analyzes modified functions, database schemas, and new API routes.
2. 🗺️ **Draws Interactive Architecture Flowcharts**: Embeds an auto-generated **Mermaid diagram** in the PR comment illustrating data flow between new and existing modules.
3. 🎯 **Calculates Blast Radius & Risk Score**: Evaluates risk level (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`) and flags impacted downstream services.
4. ⚠️ **Detects Breaking Changes & API Drift**: Warns reviewers if public API parameters, database fields, or schemas were altered.
5. 📌 **Sticky Comments (Zero Spam)**: Updates its existing comment in-place when new commits are pushed to the PR.

---

## 🚀 Quick Setup (30 Seconds)

Add a workflow file `.github/workflows/carbon-pr-review.yml` to your repository:

```yaml
name: Carbon PR Architecture Review

on:
  pull_request:
    types: [opened, synchronize, reopened]

permissions:
  contents: read
  pull-requests: write
  issues: write

jobs:
  carbon-review:
    runs-on: ubuntu-latest
    name: Carbon PR Architecture Review
    steps:
      - name: Checkout Code
        uses: actions/checkout@v4

      - name: Run Carbon PR Reviewer
        uses: ./Baby/carbon-pr-action
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          gemini-api-key: ${{ secrets.GEMINI_API_KEY }} # (Optional: Or uses Carbon Cloud)
          backend-url: 'https://carbon-backend-a1sg.onrender.com'
```

---

## ⚙️ Inputs & Configuration

| Input | Required | Default | Description |
|---|---|---|---|
| `github-token` | **Yes** | `${{ secrets.GITHUB_TOKEN }}` | GitHub token with `pull-requests: write` permission to post review comments. |
| `gemini-api-key` | No | `""` | Optional direct Google Gemini API Key for zero-latency runner inference. |
| `backend-url` | No | `https://carbon-backend-a1sg.onrender.com` | Remote Carbon AI Backend gateway URL. |
| `max-files` | No | `30` | Maximum number of changed files to include in deep AST analysis. |

---

## 🧪 Local Testing

You can simulate PR analysis locally without pushing to GitHub:

```bash
cd Baby/carbon-pr-action
npm install
npm test
```

---

## 📄 License

MIT © [Carbon](https://carbons.codes)
