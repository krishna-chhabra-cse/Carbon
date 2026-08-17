// ============================================================
//  src/prAgent.js — Autonomous AI Agent for PR Architecture Analysis
// ============================================================

const axios = require('axios');
const { GoogleGenerativeAI } = require('@google/generative-ai');

/**
 * Analyzes a pull request diff and synthesizes an architecture review.
 *
 * @param {Object} prData PR metadata (title, body, author, repo, etc.)
 * @param {Array<Object>} parsedFiles Structured file diffs from diffParser
 * @param {Object} options Config options (apiKey, backendUrl)
 * @returns {Promise<Object>} Formatted architectural analysis result
 */
async function analyzePullRequest(prData, parsedFiles, options = {}) {
  const { apiKey, backendUrl } = options;

  // 1. Prepare structured diff summary for the prompt
  const diffSummaryText = parsedFiles.map(f => {
    return `FILE: ${f.filePath} (${f.changeType.toUpperCase()} +${f.additions}/-${f.deletions})
PATTERNS: ${JSON.stringify(f.detectedPatterns)}
DIFF SNIPPET:
${f.snippet}
`;
  }).join('\n----------------------------------------\n');

  const prompt = `
You are Carbon's Lead System Architect & Senior Code Reviewer.
Analyze this Pull Request and generate a concise, high-signal architecture impact review with an interactive Mermaid diagram.

### PULL REQUEST METADATA
- Title: ${prData.title}
- Description: ${prData.body || 'No description provided.'}
- Author: ${prData.author || 'Contributor'}
- Target Base: ${prData.baseRef || 'main'} <- Head Branch: ${prData.headRef || 'feature'}
- Total Files Changed: ${parsedFiles.length}

### FILE-BY-FILE CODE DIFFS
${diffSummaryText.slice(0, 35000)}

---

### INSTRUCTIONS:
1. **Executive Summary**: A crisp 2-3 sentence overview of what this PR introduces or refactors.
2. **Blast Radius & Risk Assessment**:
   - Risk Level: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
   - Blast Radius: Explanation of which downstream systems, consumers, or databases could be affected.
3. **Breaking Changes & API Drift**:
   - List any modified function signatures, deleted endpoints, changed database schemas, or state changes.
   - If none, state "No breaking changes detected."
4. **Architectural Flowchart (Mermaid)**:
   - Create a clean Mermaid diagram (\`graph TD\`) illustrating:
     - Existing components connected to new/modified components.
     - Use class styling or clear labels (e.g. \`:::modified\` or \`[NEW: Auth Controller]\`).
     - Highlight data flow or API interactions introduced in this PR.
     - CRITICAL: Use strict valid Mermaid syntax. Keep labels clean (no parentheses or quotes inside labels).
5. **Key Architectural Highlights**: 2-4 bullet points on design patterns, architectural pros, and potential edge cases.

Return your response in EXACT JSON format with this structure:
{
  "summary": "2-3 sentence executive summary",
  "riskLevel": "LOW | MEDIUM | HIGH | CRITICAL",
  "blastRadius": "Detailed explanation of blast radius",
  "breakingChanges": [
    "Breaking change 1",
    "Breaking change 2"
  ],
  "diagram": "graph TD\\nA[Client Request] -->|POST /auth| B[Auth Controller]\\nB --> C[(User Database)]",
  "highlights": [
    "Highlight 1",
    "Highlight 2"
  ]
}

Return ONLY valid JSON. No markdown backticks, no extra text.
`;

  // Try direct Gemini call if API key provided
  if (apiKey) {
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      const result = await model.generateContent(prompt);
      let text = result.response.text().trim();
      
      if (text.startsWith('```')) {
        text = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
      }

      return JSON.parse(text);
    } catch (err) {
      console.warn(`[Carbon Agent] Direct Gemini failed (${err.message}). Trying backend...`);
    }
  }

  // Fallback to Carbon Backend API
  const cloudUrl = (backendUrl || 'https://carbon-backend-a1sg.onrender.com').replace(/\/+$/, '');
  try {
    const res = await axios.post(`${cloudUrl}/api/chat`, {
      repoUrl: prData.repoUrl || 'https://github.com/pull-request',
      query: prompt
    }, { timeout: 90000 });

    if (res.data && res.data.answer) {
      let raw = res.data.answer.trim();
      if (raw.startsWith('```')) {
        raw = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
      }
      return JSON.parse(raw);
    }
  } catch (backendErr) {
    console.error('[Carbon Agent] Backend error:', backendErr.message);
  }

  // Graceful fallback structure if LLMs are unavailable
  return {
    summary: `This pull request modifies ${parsedFiles.length} file(s) across the repository.`,
    riskLevel: parsedFiles.some(f => f.detectedPatterns.hasAuthChanges || f.detectedPatterns.hasDatabaseChanges) ? 'MEDIUM' : 'LOW',
    blastRadius: 'Changes are localized to the modified files and their direct dependencies.',
    breakingChanges: [],
    diagram: generateFallbackMermaid(parsedFiles),
    highlights: [
      `Modified ${parsedFiles.length} file(s) with total AST diffing.`,
      parsedFiles.some(f => f.detectedPatterns.hasApiEndpoints) ? 'Contains API endpoint updates.' : 'No new API routes introduced.'
    ]
  };
}

/**
 * Generates a clean fallback Mermaid flowchart from parsed files.
 */
function generateFallbackMermaid(parsedFiles) {
  const lines = ['graph TD'];
  lines.push('  PR["🔀 Pull Request Changes"]');

  parsedFiles.slice(0, 8).forEach((f, idx) => {
    const safeName = f.filePath.replace(/[^a-zA-Z0-9]/g, '_');
    const label = f.filePath.split('/').pop();
    const tag = f.changeType === 'added' ? '[NEW]' : '[MODIFIED]';
    lines.push(`  PR --> N${idx}["${tag} ${label}"]`);
  });

  return lines.join('\n');
}

module.exports = {
  analyzePullRequest
};
