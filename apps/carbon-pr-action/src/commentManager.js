// ============================================================
//  src/commentManager.js — Sticky PR Comment Formatter & Manager
// ============================================================

const COMMENT_WATERMARK = '<!-- carbon-pr-architecture-review -->';

/**
 * Builds the beautifully styled GitHub Markdown comment.
 *
 * @param {Object} prData Pull request metadata
 * @param {Object} analysis Analysis output from prAgent
 * @param {Array<Object>} parsedFiles Structured file diffs
 * @returns {string} Formatted GitHub PR Markdown comment
 */
function buildPrComment(prData, analysis, parsedFiles) {
  const riskBadge = getRiskBadge(analysis.riskLevel);
  const fileCount = parsedFiles.length;
  const totalAdditions = parsedFiles.reduce((sum, f) => sum + f.additions, 0);
  const totalDeletions = parsedFiles.reduce((sum, f) => sum + f.deletions, 0);

  const breakingSection = (analysis.breakingChanges && analysis.breakingChanges.length > 0)
    ? `### ⚠️ Breaking Changes & API Drift
${analysis.breakingChanges.map(b => `- 🚨 **${b}**`).join('\n')}
`
    : `### 🛡️ Breaking Changes & API Drift
> ✅ **No breaking changes or API regressions detected.**
`;

  const highlightsSection = (analysis.highlights && analysis.highlights.length > 0)
    ? `### 💡 Architectural Highlights
${analysis.highlights.map(h => `- ${h}`).join('\n')}
`
    : '';

  const filesTable = parsedFiles.slice(0, 15).map(f => {
    const badge = f.changeType === 'added' ? '🟢 Added' : (f.changeType === 'deleted' ? '🔴 Deleted' : '🟡 Modified');
    return `| \`${f.filePath}\` | ${badge} | \`+${f.additions} / -${f.deletions}\` |`;
  }).join('\n');

  return `${COMMENT_WATERMARK}
<div align="center">

## 🪐 Carbon — PR Architecture & Impact Review

${riskBadge} &nbsp;&nbsp; 📦 **${fileCount} Changed Files** &nbsp;&nbsp; 🟢 **+${totalAdditions}** &nbsp;&nbsp; 🔴 **-${totalDeletions}**

</div>

---

### 📋 Executive Summary
${analysis.summary}

---

### 🗺️ Visual Architecture Flowchart
\`\`\`mermaid
${analysis.diagram}
\`\`\`

---

### 🎯 Blast Radius & Risk Assessment
> ${analysis.blastRadius}

${breakingSection}

${highlightsSection}

<details>
<summary>📂 <b>View Changed Files Breakdown (${fileCount} files)</b></summary>

| File Path | Status | Diff Stats |
|---|---|---|
${filesTable}
${fileCount > 15 ? `\n*...and ${fileCount - 15} more files.*` : ''}

</details>

---

<div align="right">
<sub>⚡ Powered by <a href="https://carbons.codes"><b>Carbon Codebase Intelligence</b></a> • Instant Architecture for Dev Teams</sub>
</div>
`;
}

function getRiskBadge(riskLevel) {
  const level = (riskLevel || 'LOW').toUpperCase();
  switch (level) {
    case 'CRITICAL':
      return '![Critical Risk](https://img.shields.io/badge/Risk_Level-CRITICAL-darkred?style=for-the-badge&logo=shield)';
    case 'HIGH':
      return '![High Risk](https://img.shields.io/badge/Risk_Level-HIGH-red?style=for-the-badge&logo=shield)';
    case 'MEDIUM':
      return '![Medium Risk](https://img.shields.io/badge/Risk_Level-MEDIUM-yellow?style=for-the-badge&logo=shield)';
    case 'LOW':
    default:
      return '![Low Risk](https://img.shields.io/badge/Risk_Level-LOW-success?style=for-the-badge&logo=shield)';
  }
}

/**
 * Upserts a sticky comment on the GitHub Pull Request.
 *
 * @param {Object} octokit Authenticated Octokit client
 * @param {Object} context GitHub Action context (repo, PR number)
 * @param {string} body Markdown comment body
 */
async function upsertStickyComment(octokit, context, body) {
  const { owner, repo } = context.repo;
  const issue_number = context.payload.pull_request?.number || context.issue?.number;

  if (!issue_number) {
    throw new Error('Could not determine Pull Request issue number.');
  }

  // 1. Fetch existing comments on PR
  const { data: comments } = await octokit.rest.issues.listComments({
    owner,
    repo,
    issue_number,
    per_page: 50
  });

  // 2. Look for existing Carbon watermark comment
  const existingComment = comments.find(c => c.body && c.body.includes(COMMENT_WATERMARK));

  if (existingComment) {
    console.log(`[Carbon PR Action] Updating existing comment #${existingComment.id}...`);
    await octokit.rest.issues.updateComment({
      owner,
      repo,
      comment_id: existingComment.id,
      body: body
    });
  } else {
    console.log(`[Carbon PR Action] Creating new comment on PR #${issue_number}...`);
    await octokit.rest.issues.createComment({
      owner,
      repo,
      issue_number,
      body: body
    });
  }
}

module.exports = {
  buildPrComment,
  upsertStickyComment,
  COMMENT_WATERMARK
};
