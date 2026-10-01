# Carbon — Roast My Codebase 🔥 Test Infrastructure Specification (TEST_INFRA.md)

## 1. Test Philosophy

The testing framework for **Carbon — Roast My Codebase** is built around four non-negotiable principles:

1. **Opaque-Box & Requirement-Driven**: Tests evaluate observable behavior, interface contracts, structured metrics, deterministic scoring outputs, and schema compliance. Tests do not bind to fragile internal implementation details, ensuring that refactoring or algorithmic improvements do not break test contracts. Every test case maps directly to requirements in `ORIGINAL_REQUEST.md` (R1–R35) and `PROJECT.md`.
2. **Zero External Paid API Cost**: All LLM interactions (Gemini API calls) and remote network operations (GitHub clones) are 100% hermetically mocked in the test environment. Tests run completely offline with zero latency, zero flake, and zero billed token consumption.
3. **Deterministic & Grounded Evidence**: The roast generation process separates deterministic metric calculation and scoring from creative LLM phrasing. Tests verify that the scoring math (base 100 minus bounded deductions) is 100% deterministic and reproducible, and that LLM outputs never hallucinate metrics ungrounded in the analysis.
4. **Progressive Testability & Isolation**: Test fixtures are completely isolated and self-contained. Scaffolding is designed with contract fallback mechanisms so that E2E tiers can be verified across all development milestones without depending on uncompleted downstream work.

---

## 2. Feature Inventory & Tier Classification

Every feature defined in `PROJECT.md` is mapped to testing tiers:
- **Tier 1 (Feature Coverage)**: Direct verification of primary happy paths, input validation, and expected outputs.
- **Tier 2 (Boundary & Corner Cases)**: Edge conditions, empty states, zero-lengths, extreme sizes, self-loops, and malicious payloads.
- **Tier 3 (Cross-Feature Combinations)**: Pairwise and multi-variable interactions (e.g. security flaws compounding with architectural god objects).
- **Tier 4 (Real-World Application Scenarios)**: Full lifecycle workflows exercising ingestion, metrics extraction, scoring, agent synthesis, and schema output.

| Feature ID | Feature Name | Component Path | Tier 1 | Tier 2 | Tier 3 | Tier 4 |
|------------|--------------|----------------|:------:|:------:|:------:|:------:|
| **F-01** | GitHub Repo Ingestion & URL Validation | `tools/git_cloner.py` | ✅ | ✅ | — | ✅ |
| **F-02** | Codebase Metrics Extractor | `tools/codebase_metrics.py` | ✅ | ✅ | ✅ | ✅ |
| **F-03** | Secret Redaction Layer | `tools/security_redactor.py` | ✅ | ✅ | ✅ | ✅ |
| **F-04** | Deterministic Scoring Engine | `tools/codebase_metrics.py` / `roast_agent.py` | ✅ | ✅ | ✅ | ✅ |
| **F-05** | Roast Intelligence Agent & Schema | `agents/roast_agent.py` | ✅ | ✅ | ✅ | ✅ |
| **F-06** | Personality Modes (LIGHT / SAVAGE / BRUTAL) | `agents/roast_agent.py` | ✅ | ✅ | ✅ | ✅ |
| **F-07** | Backend Roast API Endpoints | `main.py`, `routes/roast.js` | ✅ | ✅ | ✅ | ✅ |
| **F-08** | Roast Storage & ID Lookup | `events.db` (SQLite), `main.py` | ✅ | ✅ | — | ✅ |
| **F-09** | Open Graph Crawler Intercept | Express `server.js` | ✅ | ✅ | — | ✅ |
| **F-10** | RoastModal & Multi-Input Flow | `src/components/Roast/RoastModal.jsx` | ✅ | ✅ | — | ✅ |
| **F-11** | Animated Reveal Experience (4 Stages) | `src/components/Roast/RoastReveal.jsx` | ✅ | — | — | ✅ |
| **F-12** | Result Dashboard & Cockpit | `src/components/Roast/RoastDashboard.jsx` | ✅ | ✅ | — | ✅ |
| **F-13** | Expandable Evidence Accordion | `src/components/Roast/RoastEvidence.jsx` | ✅ | — | ✅ | ✅ |
| **F-14** | 1200x630 Viral Card Generator | `src/components/Roast/RoastCard.jsx` | ✅ | ✅ | — | ✅ |
| **F-15** | Social Share Intent (X/Twitter) | `src/components/Roast/RoastDashboard.jsx` | ✅ | — | — | ✅ |
| **F-16** | Public Roast URL Route (`/carbon/roast/:id`) | `src/components/Roast/PublicRoastPage.jsx` | ✅ | ✅ | — | ✅ |
| **F-17** | "Fix This" Remediation Bridge | `src/components/Roast/RoastEvidence.jsx` | ✅ | — | ✅ | ✅ |
| **F-18** | VS Code Extension Command | `apps/vscode-extension/` | ✅ | ✅ | — | ✅ |
| **F-19** | DevSecOps Security Dogfood Benchmark | `benchmarks/dogfood_security_scan.py` | ✅ | ✅ | ✅ | ✅ |

---

## 3. Test Architecture

### 3.1 Invocation Commands
The test suite is built on `pytest` and `pytest-asyncio`. Run from repository root `Carbon/`:

```bash
# Run the complete test suite
python -m pytest tests/ -v

# Run the unified 4-Tier E2E Roast test suite
python -m pytest tests/e2e/test_roast_e2e_tiers.py -v

# Run individual tiers by keyword filter
python -m pytest tests/e2e/test_roast_e2e_tiers.py -k "tier1" -v
python -m pytest tests/e2e/test_roast_e2e_tiers.py -k "tier2" -v
python -m pytest tests/e2e/test_roast_e2e_tiers.py -k "tier3" -v
python -m pytest tests/e2e/test_roast_e2e_tiers.py -k "tier4" -v
```

### 3.2 Directory Layout
```text
Carbon/
├── TEST_INFRA.md                          # This specification document
├── tests/
│   ├── conftest.py                        # Common fixtures, mock LLMs, mock HTTP clients
│   ├── unit/
│   │   ├── test_ast_skeletonizer.py       # AST parsing & skeletonization tests
│   │   ├── test_graph_rag.py              # Architecture graph & blast radius tests
│   │   ├── test_llm_client.py             # LLM fallback and retry tests
│   │   └── test_security_scanner.py       # DevSecOps regex & grading tests
│   ├── integration/
│   │   └── test_api_endpoints.py          # FastAPI route integration tests
│   └── e2e/
│       ├── test_dogfood.py                # Self-auditing DevSecOps benchmark test
│       └── test_roast_e2e_tiers.py        # Complete 4-Tier E2E test suite
```

### 3.3 Mocking Strategy & Determinism
- **LLM Client**: `generate_with_retry` and `get_gemini_client` are intercepted via `unittest.mock.patch`. Mock generators synthesize structurally compliant JSON adhering to the Section 9 schema based on the input metrics.
- **Git Operations**: `git.Repo.clone_from` is mocked to prevent remote network egress and simulate repository trees using in-memory or temporary folder fixtures.
- **Filesystem**: In-memory file dictionaries `files_dict: dict[str, str]` represent codebases to provide millisecond execution times.

---

## 4. Test Tiers & Coverage Thresholds

### 4.1 Tier 1: Feature Coverage (>=5 tests per feature)
Tier 1 ensures every functional module operates as designed under standard conditions:
1. **GitHub URL Ingestion**:
   - Accepts standard `https://github.com/owner/repo`
   - Accepts URLs with trailing `.git`
   - Rejects non-GitHub domains (`gitlab.com`, `bitbucket.org`)
   - Rejects command injection characters (`;`, `&`, `|`, `$`)
   - Normalizes branch/tree sub-paths
2. **Codebase Metrics Extraction**:
   - Calculates total files, total LOC, and language distributions
   - Identifies largest files and potential god objects (>1000 lines)
   - Computes test-to-code ratio from test file patterns
   - Flags suspicious variable names (`data`, `temp`, `foo`, `data2`)
   - Samples cyclomatic complexity and deep branching
3. **Deterministic Scoring Engine**:
   - Evaluates base score 100 with deduction bounds
   - Verifies god file deduction cap (-8 pts each, max -25)
   - Verifies test deficiency deduction (up to -20 pts)
   - Verifies security vulnerability deduction (-10 pts each, max -25)
   - Maps score accurately to Gordon Ramsay grade tiers
4. **Secret Redaction Layer**:
   - Redacts AWS access keys (`AKIA...`)
   - Redacts JWT bearer secrets
   - Redacts database connection strings with embedded credentials
   - Redacts Stripe API secret keys
   - Masks secrets before metrics reach the LLM prompt or output card
5. **Strict JSON Schema Compliance**:
   - Validates all mandatory top-level fields: `overall_score`, `grade`, `title`, `roast`, `severity`, `worst_offender`, `top_crimes`, `stats`, `fixes`, `share_text`
   - Validates `worst_offender` dictionary keys (`file`, `metric`, `reason`)
   - Validates `top_crimes` items (`crime`, `file`, `evidence`, `roast`, `fix`)
   - Validates `fixes` items (`priority`, `title`, `file`, `action`)
   - Validates `stats` fields (`total_files`, `total_loc`, `god_files_count`, `circular_deps_count`, `test_ratio`, `security_issues`)
6. **Personality Modes**:
   - `LIGHT`: Constructive, playful banter; severity tag `LIGHT`
   - `SAVAGE` (default): Sarcastic, sharp, Staff-Engineer humor; severity tag `SAVAGE`
   - `BRUTAL`: Unfiltered Gordon Ramsay kitchen nightmare tone; severity tag `BRUTAL`
   - Verify all 3 modes preserve strict JSON schema compliance

### 4.2 Tier 2: Boundary & Corner Cases (>=5 tests per feature)
Tier 2 stress-tests system limits and irregular input conditions:
1. **Empty Repository**: 0 files, 0 LOC handled without `ZeroDivisionError`; assigns sensible baseline score and humorous empty-repo roast.
2. **Massive God File**: 10,000+ LOC single file (`monolith.py`); triggers maximum god-file deduction (-25 pts) and correctly designates it as `worst_offender`.
3. **Zero Test Ratio**: Codebase with 50 source files and 0 test files; incurs maximum test penalty (-20 pts) and generates a testing crime entry.
4. **Circular Dependency Loop**: Direct mutual imports (`a.py` imports `b.py` and `b.py` imports `a.py`) or self-loops (`a.py` imports `a.py`); detected without recursion overflow.
5. **Extreme Nesting Depth**: Code containing 12+ levels of nested `if/for/while` statements; complexity penalties applied.
6. **Pristine/All-Clean Codebase**: 100% test coverage, small modular files, zero security issues, clean naming; produces score >= 90 and `MICHELIN_STAR` grade.

### 4.3 Tier 3: Cross-Feature Combinations (Pairwise & Multi-Variable)
Tier 3 tests synergistic interactions between multiple features:
1. **Security Vulnerabilities + God File Compounding**:
   - A codebase containing both a 2,500 LOC god file and 2 critical vulnerabilities.
   - Verifies that god file deduction (-16 pts) and security deduction (-20 pts) compound properly without violating deduction caps or score clamping.
2. **Secret Redaction inside Worst Offender Evidence**:
   - A file containing hardcoded AWS credentials is flagged as the worst offender or top crime.
   - Verifies that the secret string never appears in `evidence`, `roast`, or `share_text`, but is replaced with redaction tokens.
3. **Circular Dependencies with High Fan-Out**:
   - Architecture graph detects tightly coupled cyclic modules which simultaneously exceed complexity thresholds.
4. **Personality Switch on Identical Metrics**:
   - Running the exact same `RoastMetrics` payload through `LIGHT`, `SAVAGE`, and `BRUTAL` modes produces identical `overall_score`, `grade`, and numerical `stats`, while modifying tone and `severity`.
5. **Remediation Fix Priorities Mapped to Worst Offender**:
   - The top item in `fixes` must correspond directly to the file and crime highlighted in `worst_offender`.

### 4.4 Tier 4: Real-World Workload Scenarios (5 Realistic E2E Workloads)
Tier 4 executes complete end-to-end workflows from raw code input to final shareable roast payload:
1. **Scenario 1 — The Spaghetti Monolith (`Express.js` Nightmare)**:
   - 25 files, 4,200 LOC `server.js` god file, raw `eval()`, SQL injection in query params, 0 tests.
   - Expected: Grade `IDIOT_SANDWICH` (score 0–14), worst offender `src/server.js`, top crime highlighting god file and SQLi.
2. **Scenario 2 — The Clean Enterprise Microservice (`FastAPI` Masterpiece)**:
   - 15 files, small modular routers, 100% test coverage with pytest, 0 security issues, clean naming.
   - Expected: Grade `MICHELIN_STAR` (score 90–100), complimentary roast, zero critical fixes.
3. **Scenario 3 — The Leaky Credential Startup**:
   - High test coverage and moderate modularity, but hardcoded Stripe keys and database credentials committed in `config.js`.
   - Expected: Secrets completely redacted in roast output, security deduction applied, grade reduced to `ACCEPTABLE_CHAOS` or `SPAGHETTI_JUNCTION`.
4. **Scenario 4 — The Circular Architecture Trap**:
   - 8 modules where circular import cycles exist across business logic services (`order_service.py` <-> `inventory_service.py`).
   - Expected: Circular dependency detected in metrics, architecture penalty deducted, crime flagged with remediation guidance.
5. **Scenario 5 — Full Ingestion-to-Share Pipeline (GitHub URL -> Card Payload)**:
   - Simulates valid GitHub URL input, shallow cloning, metrics extraction, deterministic scoring, LLM roast generation, and validation of the social share text and card attributes.
   - Expected: Complete JSON schema validation with `share_text` formatted with score, grade, quote, and Carbon URL.

---

## 5. Scoring & Grade Contract Reference

| Score Range | Grade Identifier | Verbal Tone |
|:-----------:|:-----------------|:------------|
| **90 – 100** | `MICHELIN_STAR` | Immaculate craftsmanship; rare praise. |
| **75 – 89** | `SENIOR_DEV` | Solid engineering; nitpicks on minor conventions. |
| **55 – 74** | `ACCEPTABLE_CHAOS` | Works in production, but tech debt is accumulating fast. |
| **35 – 54** | `SPAGHETTI_JUNCTION` | Tangled logic, missing tests, heavy duct tape. |
| **15 – 34** | `DUMPSTER_FIRE` | Major architectural and security failures. |
| **0 – 14** | `IDIOT_SANDWICH` | Gordon Ramsay kitchen nightmare; total disaster. |

### Deterministic Score Calculation Formula:
$$\text{Base Score} = 100$$
$$\text{Score} = \text{Base Score} - \Delta_{\text{god\_files}} - \Delta_{\text{testing}} - \Delta_{\text{security}} - \Delta_{\text{utils}} - \Delta_{\text{circular}} - \Delta_{\text{complexity}}$$
$$\text{Final Score} = \max(0, \min(100, \text{Score}))$$

Where:
- $\Delta_{\text{god\_files}} = \min(25, 8 \times N_{\text{god\_files}})$ (files $> 1000$ lines)
- $\Delta_{\text{testing}} = 20 \times (1 - \min(1.0, \frac{\text{test\_ratio}}{0.25}))$ (up to $-20$ if ratio is $0\%$)
- $\Delta_{\text{security}} = \min(25, 10 \times N_{\text{crit\_high\_vulns}})$
- $\Delta_{\text{utils}} = 10$ if dumping ground detected, else $0$
- $\Delta_{\text{circular}} = \min(10, 5 \times N_{\text{cycles}})$
- $\Delta_{\text{complexity}} = \min(10, \text{nesting\_penalty})$
