require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const crypto = require('crypto');
const Snippet = require('./models/Snippet');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB Connected to CodePlaygroundDB'))
  .catch(err => console.error('❌ MongoDB Connection Error:', err));

// Create a temp directory for local code execution
const tempDir = path.join(__dirname, 'temp');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir);
}

// --- API Routes ---

// 1. Save a new snippet
app.post('/api/snippets/save', async (req, res) => {
  try {
    const { code, html, css, js, title } = req.body;
    const shortId = crypto.randomBytes(3).toString('hex'); 
    
    const newSnippet = new Snippet({ code, html, css, js, title, shortId });
    await newSnippet.save();
    
    res.json({ success: true, shortId: shortId, message: 'Snippet saved!' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
});

// 2. Retrieve a snippet
app.get('/api/snippets/:shortId', async (req, res) => {
  try {
    const snippet = await Snippet.findOne({ shortId: req.params.shortId });
    if (!snippet) return res.status(404).json({ error: 'Snippet not found' });
    res.json(snippet);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server Error' });
  }
});

// 3. Local Code Execution Engine
app.post('/api/execute', (req, res) => {
  const { language, code } = req.body;
  const fileId = `script_${Date.now()}`;
  let command = '';
  let filePath = '';

  try {
    // Determine file extension and execution command
    if (language === 'javascript') {
      filePath = path.join(tempDir, `${fileId}.js`);
      fs.writeFileSync(filePath, code);
      command = `node ${filePath}`;
    } else if (language === 'python') {
      filePath = path.join(tempDir, `${fileId}.py`);
      fs.writeFileSync(filePath, code);
      // NOTE: Change 'python' to 'python3' if you are on macOS/Linux
      command = `python ${filePath}`; 
    } else {
      return res.status(400).json({ error: `Local execution for ${language} is not configured on this server yet.` });
    }

    const startTime = Date.now();

    // Execute the terminal command (5-second timeout to prevent infinite loops)
    exec(command, { timeout: 5000 }, (error, stdout, stderr) => {
      // Clean up: delete the temporary file after running
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      const time = ((Date.now() - startTime) / 1000).toFixed(2);

      if (error && error.killed) {
        return res.json({ error: "Execution timed out. (Did you write an infinite loop?)" });
      }

      res.json({
        stdout: stdout,
        stderr: stderr || (error ? error.message : null),
        time: time
      });
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error during execution." });
  }
});

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Backend server running on http://localhost:${PORT}`);
});