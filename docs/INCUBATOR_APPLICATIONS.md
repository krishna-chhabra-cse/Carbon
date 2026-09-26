# Carbon AI — Incubator Applications

> **Status**: Draft. Fill in [PLACEHOLDER] values before submitting.
> Last updated: August 2026

---

## 🚀 Master Pitch Paragraph (use everywhere)

> Carbon AI is a multi-agent DevSecOps intelligence platform that scans any GitHub repository for leaked credentials and OWASP vulnerabilities, maps its architecture as an interactive diagram, and answers blast-radius questions in natural language — all in under 60 seconds.
>
> Unlike Sourcegraph Cody or Greptile (which search code), Carbon actively **catches what is leaking before it ships** and builds the mental model your team loses every time an engineer leaves. It works fully offline using local LLMs (Ollama) for air-gapped enterprises with zero token cost.
>
> Built: LangGraph multi-agent engine, 99% token-reduction AST sieve, VS Code extension (v1.1.0), zero-install GitHub Action PR reviewer, ElevenLabs-narrated cinema walkthrough.
> Traction: [X GitHub stars] · [Y VS Code installs] · [Z repos analyzed].

---

## 📋 Apply Immediately (Always Open)

### 1. Microsoft for Startups Founders Hub
- **URL**: https://foundershub.startups.microsoft.com
- **Benefit**: Up to $150,000 USD in Azure credits + GitHub Enterprise + OpenAI credits + Microsoft 365
- **Eligibility**: Early-stage, have not raised > $1M
- **Time to approve**: 24–72 hours
- **Application**: Online form, ~15 minutes

**Answers to key questions:**

*Describe your startup in 1–2 sentences:*
> Carbon AI is a developer-first DevSecOps platform that uses AI agents to scan codebases for security vulnerabilities, map architecture, and answer blast-radius questions — all in one automated report.

*What problem are you solving?*
> Engineering teams lose weeks reverse-engineering unfamiliar codebases, and leaked credentials (AWS keys, JWT secrets) survive undetected across dozens of commits before causing breaches. Carbon AI makes codebase understanding and security hygiene automatic.

*What stage are you at?*
> [Pre-seed / Seed — chose appropriately]. Shipped product: VS Code extension, GitHub Action, web platform, offline mode.

---

### 2. AWS Activate
- **URL**: https://aws.amazon.com/activate
- **Benefit**: Up to $100,000 USD in AWS credits + $5,000 in AWS support
- **Eligibility**: < 10 years old, not yet raised Series B
- **Time to approve**: 1–2 weeks
- **Application**: Apply via a supported VC or accelerator ("Portfolio" tier), or directly ("Founders" tier for $1,000 credits)

**Answers to key questions:**

*How will you use AWS?*
> Carbon AI's Python agent service (LangGraph, FastAPI) and Node.js gateway will run on AWS EC2/ECS for self-hosted enterprise deployments. We'll use S3 for repository snapshot caching and RDS for telemetry at scale.

---

### 3. Google for Startups Cloud Program
- **URL**: https://cloud.google.com/startup
- **Benefit**: Up to $200,000 in Google Cloud credits over 2 years
- **Eligibility**: < 10 years old, use GCP
- **Application**: Online form, approval in 1–3 weeks

*How does your product use Google Cloud or Google AI?*
> Carbon AI's primary LLM inference engine uses Google Gemini (gemini-3.5-flash, gemini-3.1-flash-lite) via the official google-generativeai SDK for multi-agent architecture analysis and security taint scanning. We plan to deploy our Python microservice on Cloud Run and use Vertex AI for enterprise customers.

---

## 🏆 Batch Programs (Selective, Plan Ahead)

### 4. Y Combinator S27
- **URL**: https://www.ycombinator.com/apply
- **Deadline**: ~March 2027 (S27)
- **Benefit**: $500K for 7% equity + YC network
- **Interview rate**: ~2–3% of applicants

**YC Application Questions (Draft Answers):**

**What does your company do? (50 chars)**
> AI agents that secure & map any codebase instantly.

**Describe what you do in 2–3 sentences.**
> Carbon AI is a multi-agent DevSecOps platform. It scans any GitHub repository for leaked credentials and OWASP vulnerabilities in under 60 seconds, maps the full architecture as an interactive diagram, and answers "blast radius" questions — what breaks if I change this file? It works offline with local LLMs for enterprises that can't send code to the cloud.

**What is your company going to make?**
> A SaaS platform and VS Code extension that replaces 3 categories of expensive tools: static secret scanners (GitGuardian ~$100/seat/mo), architecture documentation tools (Confluence, Miro), and codebase search tools (Sourcegraph). Carbon does all three in one automated scan with a single API call. The $19/mo Pro plan targets individual developers; the Enterprise plan targets engineering orgs with compliance requirements (SOC2, OWASP).

**Who are your competitors and how are you different?**
> Direct: GitGuardian (secret scanning only, no architecture, no Q&A), Sourcegraph Cody (search/chat, no security), Greptile (Q&A only, cloud-only).
> Carbon is the only product that combines **proactive security scanning + architecture mapping + blast-radius Q&A + offline mode** in one tool. Our 99% token reduction AST sieve means we can analyze repos that exceed GPT-4's context window without truncation.

**Why did you pick this idea?**
> I spent time on-call at [company] where a hardcoded Stripe key slipped through 3 PRs before someone caught it in a customer complaint. I also watched a new engineer spend 3 weeks trying to understand a 200K-line monorepo because there was no architecture documentation. I realized these are the same problem: nobody has a fast, automatic way to understand what a codebase does and what it's leaking.

**What's your unfair advantage?**
> (1) The AST sieve: a deterministic skeletonizer that compresses any codebase by 99% while preserving architectural signatures. This is original research, not a wrapper. (2) Offline mode: enterprises with air-gapped environments (defense, finance, healthcare) have zero options for AI codebase tools. Carbon works with Ollama locally. (3) Shipping velocity: VS Code extension, GitHub Action, Chrome extension, web platform, Python agent service — all built and working.

**How long have you been working on this?**
> [X months]. Solo founder. Built the full stack: Python (FastAPI, LangGraph), Node.js (Express), React 19, TypeScript (VS Code extension), GitHub Actions.

**How many active users do you have?**
> [Fill with real numbers after LinkedIn launch post]

**What is your monthly revenue?**
> Pre-revenue. Launching paid tiers [month].

**Have you raised money?**
> No.

---

### 5. Antler India
- **URL**: https://www.antler.co/location/india
- **Benefit**: $125K for 9% + 10-week founder program + network
- **Rolling admission**: Apply anytime, cohorts quarterly
- **Best for**: Solo founders — Antler matches you with co-founders

**Why Antler makes sense for Carbon:**
> Antler's India program actively matches solo technical founders with business/GTM co-founders. Carbon needs a GTM co-founder for enterprise sales (DevSecOps buyers are security teams, not individual developers). Antler's program structure would compress the co-founder search from months to weeks.

---

## 📝 Checklist

- [ ] Apply to Microsoft Founders Hub (do today — 15 min form)
- [ ] Apply to AWS Activate Founders tier (do today)
- [ ] Apply to Google for Startups Cloud Program
- [ ] Set up [traction tracking](https://plausible.io) so you have real user numbers for YC
- [ ] Record Loom walkthrough demo (needed for YC video question)
- [ ] Register a domain (carbon-ai.dev or trycarbon.ai) before LinkedIn post
- [ ] Write YC application draft by January 2027
- [ ] Consider Antler India if remaining solo founder

---

## 💡 Notes

- **Domain**: `carbons.codes` is already in the VS Code extension's `homepage` field. If you own this domain, set it up. If not, register it or switch to something clearer like `carbon-ai.dev`.
- **LinkedIn Post**: Post within 1 week of landing page going live. Tag the GitHub repo, include the 99% token reduction number and Grade A+ score — those are concrete, verifiable claims.
- **Traction is everything for YC**: Between now and March 2027, focus on getting 100 real users, 10 who pay, and 3 who give written testimonials.
