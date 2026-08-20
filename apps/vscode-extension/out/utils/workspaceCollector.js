"use strict";
// ============================================================
//  src/utils/workspaceCollector.ts
//
//  Client-side workspace file collector for Carbon.
//  Reads files locally from the user's VS Code workspace,
//  filters out sensitive/binary/irrelevant files, enforces
//  strict size and count budgets, and prepares a safe payload
//  for cloud/remote analysis over HTTPS.
// ============================================================
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.collectWorkspaceFiles = collectWorkspaceFiles;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
// ── 1. Security Blacklists & Ignored Directories ─────────────
// Directories that should NEVER be scanned or uploaded
const IGNORED_DIRECTORIES = new Set([
    '.git',
    '.svn',
    '.hg',
    'node_modules',
    'bower_components',
    'dist',
    'build',
    'out',
    'target',
    'bin',
    'obj',
    'vendor',
    '.next',
    '.nuxt',
    '.turbo',
    '.cache',
    '__pycache__',
    '.pytest_cache',
    '.mypy_cache',
    '.venv',
    'venv',
    'env',
    '.tox',
    'coverage',
    '.idea',
    '.vscode',
    '.terraform',
    'temp_repos'
]);
// Sensitive filename patterns that must NEVER be sent to any server
const SENSITIVE_PATTERNS = [
    /^\.env(\..+)?$/i, // .env, .env.local, .env.production, etc.
    /\.key$/i, // Private keys
    /\.pem$/i, // Certificates / keys
    /\.pfx$/i,
    /\.p12$/i,
    /\.cer$/i,
    /\.crt$/i,
    /\.keystore$/i,
    /\.jks$/i,
    /^id_rsa/i, // SSH keys
    /^id_ecdsa/i,
    /^id_ed25519/i,
    /^id_dsa/i,
    /credentials\.json$/i, // Cloud credentials
    /serviceaccount.*\.json$/i,
    /secret/i, // Files with secret in name
    /password/i,
    /\.npmrc$/i, // Often contains auth tokens
    /\.pypirc$/i,
    /auth_token/i,
    /\.git-credentials$/i,
    /kubeconfig/i,
    /\.bash_history/i,
    /\.zsh_history/i,
    /\.netrc$/i
];
// Binary and non-code extensions to ignore
const BINARY_EXTENSIONS = new Set([
    // Images
    '.png', '.jpg', '.jpeg', '.gif', '.ico', '.svg', '.webp', '.bmp', '.tiff', '.psd',
    // Media
    '.mp4', '.mp3', '.wav', '.mov', '.avi', '.mkv', '.flac', '.ogg',
    // Binaries & Executables
    '.exe', '.dll', '.so', '.dylib', '.bin', '.wasm', '.class', '.pyc', '.pyo', '.o', '.a',
    // Archives
    '.zip', '.tar', '.gz', '.tgz', '.bz2', '.7z', '.rar', '.iso', '.dmg',
    // Documents
    '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
    // Fonts
    '.woff', '.woff2', '.ttf', '.eot', '.otf',
    // Large lockfiles (not needed for architectural analysis)
    '.lock', 'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', 'poetry.lock', 'cargo.lock', 'composer.lock'
]);
// Allowed text/code extensions prioritized for analysis
const CODE_EXTENSIONS = new Set([
    // JavaScript / TypeScript / Web
    '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.vue', '.svelte', '.html', '.css', '.scss', '.less',
    // Backend & Systems Languages
    '.py', '.java', '.go', '.rs', '.rb', '.php', '.cs', '.cpp', '.c', '.h', '.hpp', '.swift', '.kt', '.scala',
    // Config & Data
    '.json', '.yaml', '.yml', '.toml', '.xml', '.sql', '.prisma', '.graphql', '.gql',
    // DevOps & Documentation
    '.md', '.txt', '.sh', '.bash', '.dockerfile', 'dockerfile', 'docker-compose.yml', 'makefile', '.env.example'
]);
// ── 2. Budget Limits ─────────────────────────────────────────
const MAX_TOTAL_FILES = 50; // Maximum number of files to upload
const MAX_PER_FILE_BYTES = 40 * 1024; // 40 KB per file limit
const MAX_TOTAL_PAYLOAD_BYTES = 450 * 1024; // 450 KB maximum payload size
const MAX_TOTAL_CHARS = 100000; // 100k characters for LLM context
// ── 3. Helper Functions ──────────────────────────────────────
/**
 * Checks if a relative path contains any ignored directory.
 */
function isIgnoredPath(relativePath) {
    const parts = relativePath.split(/[\\/]/);
    for (const part of parts) {
        if (IGNORED_DIRECTORIES.has(part)) {
            return true;
        }
    }
    return false;
}
/**
 * Checks if a filename matches any sensitive credential pattern.
 */
function isSensitiveFile(filename) {
    for (const pattern of SENSITIVE_PATTERNS) {
        if (pattern.test(filename)) {
            return true;
        }
    }
    return false;
}
/**
 * Normalizes file path to POSIX format (using forward slashes).
 */
function toPosixPath(filePath) {
    return filePath.replace(/\\/g, '/');
}
/**
 * Checks if a file is an eligible code/config file.
 */
function isEligibleCodeFile(filename, ext) {
    const lowerName = filename.toLowerCase();
    const lowerExt = ext.toLowerCase();
    if (BINARY_EXTENSIONS.has(lowerExt) || BINARY_EXTENSIONS.has(lowerName)) {
        return false;
    }
    if (isSensitiveFile(filename)) {
        return false;
    }
    return CODE_EXTENSIONS.has(lowerExt) || CODE_EXTENSIONS.has(lowerName);
}
/**
 * Reads local `.gitignore` if present to skip ignored files.
 */
async function getGitignorePatterns(rootUri) {
    try {
        const gitignoreUri = vscode.Uri.joinPath(rootUri, '.gitignore');
        const bytes = await vscode.workspace.fs.readFile(gitignoreUri);
        const content = Buffer.from(bytes).toString('utf8');
        return content
            .split('\n')
            .map(line => line.trim())
            .filter(line => line && !line.startsWith('#'));
    }
    catch {
        return [];
    }
}
/**
 * Constructs a tree-like folder structure string from the collected paths.
 */
function buildFolderStructure(relativePaths, workspaceName) {
    const lines = [`[DIR] ${workspaceName}/`];
    const sorted = [...relativePaths].sort();
    for (const relPath of sorted) {
        const parts = relPath.split('/');
        const indent = '  '.repeat(parts.length);
        const filename = parts[parts.length - 1];
        lines.push(`${indent}[FILE] ${filename} (${relPath})`);
    }
    return lines.join('\n');
}
// ── 4. Main Collector Function ───────────────────────────────
/**
 * Collects safe code files and metadata from the given workspace folder.
 *
 * @param workspaceFolder The VS Code workspace folder to scan
 * @param onProgress Callback to report progress to UI
 * @returns Safe workspace payload ready to send over HTTPS
 */
async function collectWorkspaceFiles(workspaceFolder, onProgress) {
    const rootUri = workspaceFolder.uri;
    const workspaceName = workspaceFolder.name;
    if (onProgress)
        onProgress('Scanning workspace files...');
    // Use VS Code findFiles API with exclude glob
    const excludePattern = `{${Array.from(IGNORED_DIRECTORIES).map(d => `**/${d}/**`).join(',')}}`;
    const fileUris = await vscode.workspace.findFiles('**/*', excludePattern, 1000);
    const eligibleFiles = [];
    const allRelPaths = [];
    // Read .gitignore patterns
    const gitignorePatterns = await getGitignorePatterns(rootUri);
    for (const uri of fileUris) {
        const relPath = toPosixPath(path.relative(rootUri.fsPath, uri.fsPath));
        // Prevent path traversal outside workspace
        if (relPath.startsWith('..') || path.isAbsolute(relPath)) {
            continue;
        }
        // Skip ignored directories
        if (isIgnoredPath(relPath)) {
            continue;
        }
        const filename = path.basename(relPath);
        const ext = path.extname(filename);
        // Skip sensitive files
        if (isSensitiveFile(filename)) {
            continue;
        }
        allRelPaths.push(relPath);
        if (isEligibleCodeFile(filename, ext)) {
            try {
                const stat = await vscode.workspace.fs.stat(uri);
                // Only include files under the per-file size limit
                if (stat.size <= MAX_PER_FILE_BYTES) {
                    eligibleFiles.push({
                        uri,
                        relPath,
                        ext,
                        size: stat.size
                    });
                }
            }
            catch {
                // Skip unreadable files
            }
        }
    }
    // Prioritize critical architecture files first (package.json, Dockerfile, main entry points)
    eligibleFiles.sort((a, b) => {
        const aPriority = getFilePriority(a.relPath);
        const bPriority = getFilePriority(b.relPath);
        if (aPriority !== bPriority) {
            return aPriority - bPriority;
        }
        return a.relPath.localeCompare(b.relPath);
    });
    if (onProgress)
        onProgress(`Reading ${Math.min(eligibleFiles.length, MAX_TOTAL_FILES)} code files...`);
    const collected = [];
    let totalChars = 0;
    let totalBytes = 0;
    for (const item of eligibleFiles) {
        if (collected.length >= MAX_TOTAL_FILES) {
            break;
        }
        if (totalBytes + item.size > MAX_TOTAL_PAYLOAD_BYTES) {
            break;
        }
        if (totalChars >= MAX_TOTAL_CHARS) {
            break;
        }
        try {
            const bytes = await vscode.workspace.fs.readFile(item.uri);
            const content = Buffer.from(bytes).toString('utf8');
            // Check for binary null bytes
            if (content.includes('\0')) {
                continue;
            }
            collected.push({
                path: item.relPath,
                content: content,
                size: item.size
            });
            totalChars += content.length;
            totalBytes += item.size;
        }
        catch {
            // Skip if read fails
        }
    }
    const folderStructure = buildFolderStructure(allRelPaths, workspaceName);
    return {
        workspaceName,
        files: collected,
        folderStructure,
        totalFiles: collected.length,
        totalBytes
    };
}
/**
 * Assigns sorting priority so architectural manifest and entry point files
 * are processed before deep nested sub-utilities.
 */
function getFilePriority(relPath) {
    const filename = path.basename(relPath).toLowerCase();
    const depth = relPath.split('/').length;
    if (filename === 'package.json' || filename === 'requirements.txt' || filename === 'cargo.toml' || filename === 'go.mod')
        return 1;
    if (filename.includes('server') || filename.includes('main') || filename.includes('app') || filename.includes('index'))
        return 2;
    if (filename.includes('docker') || filename.includes('config'))
        return 3;
    if (depth <= 2)
        return 4;
    return 5;
}
//# sourceMappingURL=workspaceCollector.js.map