# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: record-ui.spec.ts >> record cinematic product workflow
- Location: scripts\record-ui.spec.ts:5:5

# Error details

```
TimeoutError: locator.boundingBox: Timeout 15000ms exceeded.
Call log:
  - waiting for locator('#repo-url-input')

```

# Page snapshot

```yaml
- generic [ref=e3]:
  - banner [ref=e4]:
    - generic [ref=e5]:
      - generic [ref=e6]: 🛡️
      - heading "Carbon AI" [level=1] [ref=e7]
    - heading "Catch what's leaking before it ships." [level=2] [ref=e8]
    - paragraph [ref=e9]: Multi-agent DevSecOps intelligence — automated security scorecards, AST-based architecture maps, and GraphRAG blast-radius Q&A for any codebase. Works offline.
    - navigation [ref=e10]:
      - link "Analyze Your Repo →" [ref=e11] [cursor=pointer]:
        - /url: /app
      - link "🔥 Roast My Codebase" [ref=e12] [cursor=pointer]:
        - /url: /roast
      - link "View on GitHub" [ref=e13] [cursor=pointer]:
        - /url: https://github.com/krishna-chhabra-cse/Carbon
    - generic [ref=e19]:
      - generic [ref=e20]: $ carbon scan github.com/your-org/backend
      - generic [ref=e21]: 🔑 Checking for leaked credentials...
      - generic [ref=e22]: 🛡️ Running OWASP taint analysis...
      - generic [ref=e23]: "✅ Security Grade: A+ | 0 vulnerabilities | 0 leaked secrets"
      - generic [ref=e24]: ⚡ Completed in 39.78ms
  - main [ref=e26]:
    - generic [ref=e28]:
      - generic [ref=e29]: 26 Security Rules
      - generic [ref=e30]: 16 CWEs Covered
      - generic [ref=e31]: < 40ms Parse
      - generic [ref=e32]: 100% Offline Mode
    - generic [ref=e33]:
      - heading "Your codebase is a black box. And it might be leaking." [level=2] [ref=e34]
      - generic [ref=e35]:
        - generic [ref=e36]:
          - generic [ref=e37]: 🔑
          - paragraph [ref=e38]: A hardcoded AWS key committed at 2am survives 47 commits before anyone notices.
        - generic [ref=e39]:
          - generic [ref=e40]: 🤯
          - paragraph [ref=e41]: New engineers spend weeks reverse-engineering architecture that should take hours.
        - generic [ref=e42]:
          - generic [ref=e43]: 🔄
          - paragraph [ref=e44]: Every code review misses blast-radius — until production breaks.
    - generic [ref=e46]:
      - generic [ref=e47]:
        - generic [ref=e48]:
          - generic [ref=e49]: 🛡️
          - heading "DevSecOps Security Scanner" [level=3] [ref=e50]
        - paragraph [ref=e51]: Static pattern analysis catches leaked AWS/JWT/Stripe secrets and common security anti-patterns before they merge. Outputs a Grade A+ to F scorecard with 1-click remediation diffs.
      - generic [ref=e52]:
        - generic [ref=e53]:
          - generic [ref=e54]: ⚡
          - heading "AST Token Sieve" [level=3] [ref=e55]
        - paragraph [ref=e56]: Deterministic code skeletonizer dramatically reduces LLM context while preserving 100% of architectural signatures. Runs in 39.78ms.
      - generic [ref=e57]:
        - generic [ref=e58]:
          - generic [ref=e59]: 🧠
          - heading "GraphRAG Blast Radius Q&A" [level=3] [ref=e60]
        - paragraph [ref=e61]: In-memory dependency graph answers 'If I rename the User schema, what routes break?' with citation-backed impact maps.
      - generic [ref=e62]:
        - generic [ref=e63]:
          - generic [ref=e64]: 🔒
          - heading "Air-Gapped Offline Mode" [level=3] [ref=e65]
        - paragraph [ref=e66]: Run 100% private security audits with Ollama (Qwen2.5/DeepSeek-Coder). Zero internet, zero token cost, enterprise-ready.
    - generic [ref=e67]:
      - heading "How it works" [level=2] [ref=e68]
      - generic [ref=e69]:
        - generic [ref=e70]:
          - generic [ref=e71]: "1"
          - generic [ref=e72]:
            - heading "🔗 Connect" [level=3] [ref=e73]
            - paragraph [ref=e74]: Paste any GitHub URL or point to a local workspace. Carbon clones and indexes in seconds.
        - generic [ref=e75]:
          - generic [ref=e76]: "2"
          - generic [ref=e77]:
            - heading "🤖 Scan" [level=3] [ref=e78]
            - paragraph [ref=e79]: LangGraph multi-agent mesh runs Security Auditor, Architecture Mapper, API Analyzer, and Business Logic agents in parallel.
        - generic [ref=e80]:
          - generic [ref=e81]: "3"
          - generic [ref=e82]:
            - heading "🛡️ Fix" [level=3] [ref=e83]
            - paragraph [ref=e84]: Get your Security Scorecard, interactive architecture diagram, and unified remediation diffs — all in one report.
    - generic [ref=e85]:
      - heading "Works where your team already works" [level=2] [ref=e86]
      - generic [ref=e87]:
        - generic [ref=e88]:
          - heading "VS Code Extension" [level=3] [ref=e89]
          - paragraph [ref=e90]: v1.1.0 available now
          - link "Install" [ref=e91] [cursor=pointer]:
            - /url: https://marketplace.visualstudio.com/items?itemName=krishcarbon.carbon-ai
        - generic [ref=e92]:
          - heading "GitHub Action" [level=3] [ref=e93]
          - paragraph [ref=e94]: Zero-install PR reviewer
          - link "Add to Workflow" [ref=e95] [cursor=pointer]:
            - /url: https://github.com/krishna-chhabra-cse/Carbon#github-action
        - generic [ref=e96]:
          - heading "Chrome Extension" [level=3] [ref=e97]
          - paragraph [ref=e98]: Side panel intelligence
          - link "Install" [ref=e99] [cursor=pointer]:
            - /url: /carbon-chrome-extension.zip
    - generic [ref=e100]:
      - heading "Open Source & Free" [level=2] [ref=e101]
      - paragraph [ref=e102]: Carbon is MIT-licensed. Run it locally, contribute features, or fork it for your team.
      - generic [ref=e103]:
        - link "⭐ Star on GitHub" [ref=e104] [cursor=pointer]:
          - /url: https://github.com/krishna-chhabra-cse/Carbon
        - link "Report an Issue" [ref=e105] [cursor=pointer]:
          - /url: https://github.com/krishna-chhabra-cse/Carbon/issues
    - generic [ref=e106]:
      - heading "Ready to secure your codebase?" [level=2] [ref=e107]
      - link "Analyze Your First Repo — Free →" [ref=e108] [cursor=pointer]:
        - /url: /app
  - contentinfo [ref=e109]:
    - generic [ref=e110]:
      - generic [ref=e111]:
        - generic [ref=e112]:
          - generic [ref=e113]: 🛡️
          - generic [ref=e114]: Carbon AI
        - generic [ref=e115]: Built by Krishna Chhabra
        - generic [ref=e116]: MIT License 2026
      - navigation [ref=e117]:
        - link "GitHub" [ref=e118] [cursor=pointer]:
          - /url: https://github.com/krishna-chhabra-cse/Carbon
        - link "VS Code Marketplace" [ref=e119] [cursor=pointer]:
          - /url: https://marketplace.visualstudio.com/items?itemName=krishcarbon.carbon-ai
        - link "LinkedIn" [ref=e120] [cursor=pointer]:
          - /url: https://linkedin.com/in/krishna-chhabra
    - generic [ref=e121]: Carbon AI — Multi-Agent DevSecOps & Codebase Intelligence Platform
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | import * as fs from 'fs';
  3  | import * as path from 'path';
  4  | 
  5  | test('record cinematic product workflow', async ({ page }) => {
  6  |   // We navigate to the local or production URL
  7  |   await page.goto('http://localhost:5173/');
  8  |   
  9  |   // Cinematic Wait (Wait for animations to settle)
  10 |   await page.waitForTimeout(2000);
  11 | 
  12 |   // Mouse hover emulation for visible cursor effects
  13 |   await page.mouse.move(960, 540); // Center
  14 |   await page.mouse.wheel(0, 400); // Smooth scroll down
  15 |   await page.waitForTimeout(1000);
  16 | 
  17 |   // Smooth mouse movement to the input box
> 18 |   const inputBounds = await page.locator('#repo-url-input').boundingBox();
     |                                                             ^ TimeoutError: locator.boundingBox: Timeout 15000ms exceeded.
  19 |   if (inputBounds) {
  20 |     await page.mouse.move(inputBounds.x + inputBounds.width / 2, inputBounds.y + inputBounds.height / 2, { steps: 50 });
  21 |     await page.waitForTimeout(500);
  22 |     await page.mouse.click(inputBounds.x + inputBounds.width / 2, inputBounds.y + inputBounds.height / 2);
  23 |     
  24 |     // Realistic typing speed
  25 |     await page.keyboard.type('https://github.com/expressjs/express', { delay: 40 });
  26 |     await page.waitForTimeout(800);
  27 |     
  28 |     // Move to Analyze button and click
  29 |     const btnBounds = await page.locator('button[type="submit"]').boundingBox();
  30 |     if (btnBounds) {
  31 |       await page.mouse.move(btnBounds.x + btnBounds.width / 2, btnBounds.y + btnBounds.height / 2, { steps: 30 });
  32 |       await page.mouse.click(btnBounds.x + btnBounds.width / 2, btnBounds.y + btnBounds.height / 2);
  33 |     }
  34 |   }
  35 | 
  36 |   // Let the orbital loading skeleton animate for 5 seconds
  37 |   await page.waitForTimeout(5000);
  38 | 
  39 |   // Save the exact timing metadata to be ingested by Remotion
  40 |   const timingData = {
  41 |     startScrapeAt: 0,
  42 |     typingStartsAt: 3.5,
  43 |     clickAnalyzeAt: 6.2,
  44 |     loadingAnimationDuration: 5.0
  45 |   };
  46 |   fs.writeFileSync(path.join(__dirname, '../recordings/timing.json'), JSON.stringify(timingData, null, 2));
  47 | });
  48 | 
```