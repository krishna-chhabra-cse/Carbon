const express = require('express');  
const cors    = require('cors');     
const dotenv  = require('dotenv');   

dotenv.config();
const app = express();

app.use(cors({ origin: ['http://localhost:5173', 'https://code-pilot-phi.vercel.app'] }));             // allow all origins (fine for development)
app.use(express.json());    

const analyzeRoutes = require('./routes/analyze');
const explainVideoRoutes = require('./routes/explainVideo');

app.use('/api', analyzeRoutes);  
app.use('/api', explainVideoRoutes);

app.get('/', (req, res) => {
  res.json({ 
    message: '🧠 Carbon Backend is running!',
    status: 'ok'
  });
});

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
  console.log(`✅ Node.js backend running on http://localhost:${PORT}`);
  console.log(`🐍 Expecting Python agent service at ${process.env.PYTHON_SERVICE_URL || 'http://localhost:8000'}`);
});
