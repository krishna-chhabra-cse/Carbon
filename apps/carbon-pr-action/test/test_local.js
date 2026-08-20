// ============================================================
//  test/test_local.js — Local Simulator for Carbon PR Action
// ============================================================

require('dotenv').config({ path: '../Carbon Agent Service/.env' });
const { parseGitDiff } = require('../src/diffParser');
const { analyzePullRequest } = require('../src/prAgent');
const { buildPrComment } = require('../src/commentManager');

// Sample real-world PR diff (adding JWT auth and user route)
const SAMPLE_DIFF = `
diff --git a/src/routes/auth.js b/src/routes/auth.js
new file mode 100644
index 0000000..a1b2c3d
--- /dev/null
+++ b/src/routes/auth.js
@@ -0,0 +1,24 @@
+const express = require('express');
+const jwt = require('jsonwebtoken');
+const bcrypt = require('bcrypt');
+const router = express.Router();
+
+router.post('/api/auth/login', async (req, res) => {
+  const { email, password } = req.body;
+  const token = jwt.sign({ email }, process.env.JWT_SECRET, { expiresIn: '1h' });
+  res.json({ token, user: { email } });
+});
+
+router.post('/api/auth/register', async (req, res) => {
+  const { email, password } = req.body;
+  const hashedPassword = await bcrypt.hash(password, 10);
+  res.status(201).json({ success: true, email });
+});
+
+module.exports = router;

diff --git a/src/models/User.js b/src/models/User.js
index 1122334..4455667 100644
--- a/src/models/User.js
+++ b/src/models/User.js
@@ -10,4 +10,6 @@ const UserSchema = new mongoose.Schema({
   email: { type: String, required: true, unique: true },
   role: { type: String, default: 'member' },
+  passwordHash: { type: String, required: true },
+  lastLoginAt: { type: Date }
 });
`;

async function runLocalTest() {
  console.log('🧪 Starting Carbon PR Action Local Simulation...\n');

  console.log('1. Parsing sample git diff...');
  const parsedFiles = parseGitDiff(SAMPLE_DIFF);
  console.log(`   Found ${parsedFiles.length} changed files.`);
  parsedFiles.forEach(f => {
    console.log(`   - ${f.filePath} (${f.changeType}) additions: +${f.additions}, deletions: -${f.deletions}`);
    console.log(`     Patterns: ${JSON.stringify(f.detectedPatterns)}`);
  });

  const prData = {
    title: 'feat(auth): implement JWT login, registration, and user schema updates',
    body: 'Introduces secure password hashing with bcrypt, JWT token generation, and adds passwordHash to User schema.',
    author: 'krishna-chhabra',
    baseRef: 'main',
    headRef: 'feat/auth-jwt'
  };

  console.log('\n2. Running Carbon AI PR Architecture Agent...');
  const analysis = await analyzePullRequest(prData, parsedFiles, {
    apiKey: process.env.GEMINI_API_KEY,
    backendUrl: 'https://carbon-backend-a1sg.onrender.com'
  });

  console.log('\n3. Building final PR Sticky Markdown Comment...\n');
  const comment = buildPrComment(prData, analysis, parsedFiles);

  console.log('================== GENERATED PR COMMENT ==================');
  console.log(comment);
  console.log('==========================================================');

  console.log('\n✅ Local PR Simulation finished successfully!');
}

runLocalTest().catch(console.error);
