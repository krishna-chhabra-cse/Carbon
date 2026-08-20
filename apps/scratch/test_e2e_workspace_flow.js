const http = require('http');

async function runTest() {
  console.log('=== TEST 1: Sending Workspace Files Payload to /api/analyze ===');
  
  const payload = {
    workspaceName: 'SampleExpressAuthApp',
    folderStructure: '[DIR] SampleExpressAuthApp/\n  [FILE] server.js\n  [FILE] routes/auth.js\n  [FILE] package.json',
    totalFiles: 3,
    totalBytes: 1500,
    files: [
      {
        path: 'package.json',
        content: JSON.stringify({
          name: 'sample-express-auth-app',
          version: '1.0.0',
          dependencies: { express: '^4.18.2', jsonwebtoken: '^9.0.0', bcryptjs: '^2.4.3' }
        }, null, 2),
        size: 150
      },
      {
        path: 'server.js',
        content: `
const express = require('express');
const authRoutes = require('./routes/auth');
const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
app.listen(3000, () => console.log('Server running on port 3000'));
`,
        size: 280
      },
      {
        path: 'routes/auth.js',
        content: `
const express = require('express');
const router = express.Router();
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (username === 'admin' && password === 'secret') {
    return res.json({ token: 'jwt-mock-token-xyz' });
  }
  res.status(401).json({ error: 'Invalid credentials' });
});
router.post('/register', (req, res) => {
  res.json({ message: 'User registered successfully' });
});
module.exports = router;
`,
        size: 420
      }
    ]
  };

  const bodyString = JSON.stringify(payload);

  const analysisResult = await new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost',
      port: 3002,
      path: '/api/analyze',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(bodyString)
      }
    }, (res) => {
      let buffer = '';
      let finalData = null;

      res.on('data', (chunk) => {
        buffer += chunk.toString();
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          if (line.trim()) {
            try {
              const event = JSON.parse(line.trim());
              console.log('  📡 [Event]:', event.status, event.node || event.message || '');
              if (event.status === 'complete') {
                finalData = event;
              }
            } catch (e) {
              console.log('  ⚠️ Raw line parse error:', line);
            }
          }
        }
      });

      res.on('end', () => {
        if (buffer.trim()) {
          try {
            const event = JSON.parse(buffer.trim());
            if (event.status === 'complete') finalData = event;
          } catch {}
        }
        if (res.statusCode >= 400) {
          return reject(new Error(`HTTP ${res.statusCode}: ${buffer}`));
        }
        resolve(finalData);
      });
    });

    req.on('error', reject);
    req.write(bodyString);
    req.end();
  });

  console.log('\n✅ /api/analyze Completed Successfully!');
  console.log('Workspace Name:', analysisResult.workspace_name);
  console.log('Tech Stack:', analysisResult.architecture?.tech_stack);
  console.log('Architecture Summary:', analysisResult.architecture?.summary?.slice(0, 120) + '...');
  console.log('Discovered Endpoints:', analysisResult.api_docs?.endpoints?.map(e => `${e.method} ${e.path}`));
  console.log('Business Flows:', analysisResult.business_logic?.business_flows?.map(f => f.feature));

  console.log('\n=== TEST 2: Testing Scrimba Video Explainer on Port 3002 ===');
  const videoPayload = JSON.stringify({
    architecture: analysisResult.architecture,
    apiDocs: analysisResult.api_docs,
    businessLogic: analysisResult.business_logic
  });

  const videoResult = await new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost',
      port: 3002,
      path: '/api/explain-video',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(videoPayload)
      }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk.toString());
      res.on('end', () => {
        if (res.statusCode >= 400) return reject(new Error(`HTTP ${res.statusCode}: ${body}`));
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.write(videoPayload);
    req.end();
  });

  console.log('✅ /api/explain-video Completed Successfully!');
  console.log('🎥 Scrimba Video URL:', videoResult.url);
  console.log('\n🎉 ALL LOCAL END-TO-END FLOW TESTS PASSED!');
}

runTest().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
