// ============================================================
//  src/diffParser.js — Git Unified Diff & AST Pattern Parser
// ============================================================

/**
 * Parses raw git unified diff output into structured file diff objects.
 *
 * @param {string} rawDiff Unified diff text from GitHub API or git diff
 * @returns {Array<Object>} List of structured file changes
 */
function parseGitDiff(rawDiff) {
  if (!rawDiff || typeof rawDiff !== 'string') {
    return [];
  }

  const files = [];
  const fileDiffBlocks = rawDiff.split(/^diff --git /m).filter(Boolean);

  for (const block of fileDiffBlocks) {
    const lines = block.split('\n');
    const headerLine = lines[0] || '';
    
    // Extract file paths from "a/path/file.js b/path/file.js"
    const pathMatch = headerLine.match(/a\/(.+?)\s+b\/(.+)/);
    const oldPath = pathMatch ? pathMatch[1] : null;
    const newPath = pathMatch ? pathMatch[2] : null;
    let filePath = newPath || oldPath;

    if (!filePath) {
      const plusMatch = block.match(/\+\+\+\s+b\/(.+)/);
      const minusMatch = block.match(/---\s+a\/(.+)/);
      filePath = plusMatch ? plusMatch[1] : (minusMatch ? minusMatch[1] : null);
    }

    if (!filePath || filePath === '/dev/null' || filePath === 'unknown') {
      continue;
    }

    let changeType = 'modified';
    if (block.includes('new file mode')) {
      changeType = 'added';
    } else if (block.includes('deleted file mode')) {
      changeType = 'deleted';
    } else if (block.includes('similarity index')) {
      changeType = 'renamed';
    }

    let additions = 0;
    let deletions = 0;
    const addedLines = [];
    const deletedLines = [];
    const hunkHeaders = [];

    for (const line of lines) {
      if (line.startsWith('@@')) {
        hunkHeaders.push(line);
      } else if (line.startsWith('+') && !line.startsWith('+++')) {
        additions++;
        addedLines.push(line.slice(1));
      } else if (line.startsWith('-') && !line.startsWith('---')) {
        deletions++;
        deletedLines.push(line.slice(1));
      }
    }

    // Inspect code patterns: routes, components, database models
    const detectedPatterns = detectPatternsInDiff(addedLines, deletedLines, filePath);

    files.push({
      filePath,
      changeType,
      additions,
      deletions,
      totalChanges: additions + deletions,
      detectedPatterns,
      snippet: block.slice(0, 2500) // snippet cap for LLM context
    });
  }

  return files;
}

/**
 * Detects architectural patterns in added/deleted lines.
 */
function detectPatternsInDiff(addedLines, deletedLines, filePath) {
  const allLines = [...addedLines, ...deletedLines];
  const fullText = allLines.join('\n');

  const patterns = {
    hasApiEndpoints: false,
    hasDatabaseChanges: false,
    hasAuthChanges: false,
    hasUiComponents: false,
    hasConfigChanges: false,
    extractedRoutes: []
  };

  // API Endpoints detection (Express, Fastify, Flask, Django, Spring, FastAPI)
  const routeRegex = /(?:app|router|server)\.(get|post|put|delete|patch)\s*\(\s*['"`](.+?)['"`]/gi;
  let match;
  while ((match = routeRegex.exec(fullText)) !== null) {
    patterns.hasApiEndpoints = true;
    patterns.extractedRoutes.push({
      method: match[1].toUpperCase(),
      path: match[2]
    });
  }

  // Database / Schema detection (Prisma, Mongoose, TypeORM, SQLAlchemy, SQL)
  if (/prisma|mongoose\.model|schema|migration|create\s+table|foreign\s+key|table\./i.test(fullText) || filePath.includes('migration') || filePath.includes('schema')) {
    patterns.hasDatabaseChanges = true;
  }

  // Auth / Security detection (JWT, bcrypt, passport, oauth, token, permission)
  if (/jwt|token|bcrypt|password|auth|session|cors|authorization/i.test(fullText)) {
    patterns.hasAuthChanges = true;
  }

  // UI Components detection (React, Vue, Svelte, JSX, TSX)
  if (/\.jsx?$|\.tsx?$|\.vue$|\.svelte$/i.test(filePath) && (/<[A-Z][a-zA-Z0-9]+|return\s*\(/i.test(fullText))) {
    patterns.hasUiComponents = true;
  }

  // Configuration changes (.env, package.json, docker, workflow, yaml)
  if (/package\.json|dockerfile|docker-compose|\.ya?ml|\.toml|\.env/i.test(filePath)) {
    patterns.hasConfigChanges = true;
  }

  return patterns;
}

module.exports = {
  parseGitDiff
};
