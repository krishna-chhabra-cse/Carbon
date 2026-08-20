// ============================================================
//  src/index.js — Carbon GitHub Action Entry Point
// ============================================================

const core = require('@actions/core');
const github = require('@actions/github');
const { parseGitDiff } = require('./diffParser');
const { analyzePullRequest } = require('./prAgent');
const { buildPrComment, upsertStickyComment } = require('./commentManager');

async function run() {
  try {
    const token = core.getInput('github-token', { required: true });
    const geminiApiKey = core.getInput('gemini-api-key') || process.env.GEMINI_API_KEY;
    const backendUrl = core.getInput('backend-url') || 'https://carbon-backend-a1sg.onrender.com';
    const maxFiles = parseInt(core.getInput('max-files') || '30', 10);

    const octokit = github.getOctokit(token);
    const context = github.context;

    // Verify trigger is a pull request
    const pr = context.payload.pull_request;
    if (!pr) {
      core.setFailed('This action can only run on pull_request events.');
      return;
    }

    const { owner, repo } = context.repo;
    const pull_number = pr.number;

    core.info(`🪐 [Carbon PR Action] Analyzing PR #${pull_number} in ${owner}/${repo}...`);
    core.info(`📝 PR Title: "${pr.title}" by @${pr.user?.login || 'unknown'}`);

    // 1. Fetch Pull Request Raw Unified Diff (with local git diff and pagination fallbacks for large PRs)
    let diffData = '';
    try {
      const response = await octokit.rest.pulls.get({
        owner,
        repo,
        pull_number,
        mediaType: {
          format: 'diff'
        }
      });
      diffData = String(response.data);
    } catch (apiErr) {
      core.info(`⚠️ GitHub pulls.get diff API returned: ${apiErr.message}. Engaging local git diff fallback...`);
      try {
        const { execSync } = require('child_process');
        const baseBranch = pr.base?.ref || 'main';
        diffData = execSync(`git diff origin/${baseBranch}...HEAD`, { encoding: 'utf-8', maxBuffer: 20 * 1024 * 1024 });
      } catch (gitErr) {
        core.info(`⚠️ Local git diff fallback returned: ${gitErr.message}. Engaging paginated listFiles API fallback...`);
        const filesList = await octokit.paginate(octokit.rest.pulls.listFiles, {
          owner,
          repo,
          pull_number,
          per_page: 100
        });
        diffData = filesList.map(f => `diff --git a/${f.filename} b/${f.filename}\n--- a/${f.filename}\n+++ b/${f.filename}\n${f.patch || ''}`).join('\n');
      }
    }

    core.info(`📦 Received diff payload (${Buffer.byteLength(String(diffData))} bytes). Parsing AST...`);

    // 2. Parse Diff into structured components
    const parsedFiles = parseGitDiff(String(diffData));
    core.info(`🔍 Detected ${parsedFiles.length} changed files across PR.`);

    if (parsedFiles.length === 0) {
      core.info('No code file changes detected to analyze.');
      return;
    }

    const prData = {
      title: pr.title,
      body: pr.body,
      author: pr.user?.login,
      baseRef: pr.base?.ref,
      headRef: pr.head?.ref,
      repoUrl: pr.html_url
    };

    // 3. Run AI Architecture & Blast Radius Agent
    core.info('🧠 Synthesizing architecture impact and Mermaid flowchart...');
    const analysis = await analyzePullRequest(
      prData,
      parsedFiles.slice(0, maxFiles),
      { apiKey: geminiApiKey, backendUrl }
    );

    // 4. Build Styled Markdown Comment
    const commentMarkdown = buildPrComment(prData, analysis, parsedFiles);

    // 5. Upsert Sticky Comment on PR
    await upsertStickyComment(octokit, context, commentMarkdown);

    core.info('✅ Successfully posted Carbon Architecture Review on PR!');
    core.setOutput('summary', analysis.summary);
    core.setOutput('risk-level', analysis.riskLevel);

  } catch (error) {
    core.setFailed(`Carbon PR Action failed: ${error.message}`);
  }
}

run();
