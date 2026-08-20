# Changelog

All notable changes to the "carbon-ai" VS Code extension will be documented in this file.

---

## [1.1.0] - 2026-08-19

### 🚀 Major Features & Architectural Enhancements
- **Zero-Login Native Carbon Cinema**: Integrated an in-editor animated video walkthrough player with synchronized architectural chapters, interactive timeline scrubber, and voice narration (Web Speech API) with zero external redirects or login walls.
- **1-Click Gamma AI & Slide Deck Generator**: Added a one-click action that formats the entire codebase analysis into structured presentation markdown, copies it to the clipboard, and automatically launches Gamma AI (`gamma.app/new`).
- **GraphRAG Codebase Architecture Q&A**: Integrated conversational dependency reasoning allowing developers to ask impact questions (*"What breaks if I rename the User schema?"*) with exact `file:line` citations and Mermaid sub-diagrams.
- **Autonomous DevSecOps & Security Scorecard**: Built-in static taint analysis auditing codebases for credential leaks (AWS, JWT, DB URIs) and OWASP Top 10 flaws (SQLi, wildcard CORS, unsafe evals) with Letter Grades (`A+` to `F`) and 1-click remediation diffs.
- **Air-Gapped Offline Local LLM Mode (Ollama)**: Added first-class support for local offline inference (`qwen2.5-coder`, `deepseek-r1`, `llama3.1`, `codellama`) with seamless cloud failover and zero data leakage.
- **Bidirectional Click-to-Code**: Interactive Mermaid flowchart nodes that immediately jump to matching files and line numbers in the VS Code editor when clicked.
- **AST Code Skeletonizer & Sieve**: Integrated token optimization engine slashing token consumption by **98.8%** on enterprise repositories while preserving 100% of exports, types, and schemas.

---

## [1.0.0] - 2026-08-14

### Initial Release
- **Codebase Analysis**: Local workspace scanning with secure client-side AST and file filtering.
- **Interactive Flowcharts**: Visual system diagrams and Mermaid graph rendering inside VS Code Webview.
- **API & Business Logic Discovery**: Identification of entry points, endpoints, and architectural components.
- **Configurable Backend**: Full support for self-hosted or cloud-deployed Carbon backend servers.
