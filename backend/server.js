require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const crypto = require('crypto');
const Snippet = require('./models/Snippet');

const app = express();

// Middleware
app.use(cors()); // Allows your Vite frontend to talk to this Express backend
app.use(express.json()); // Parses incoming JSON payloads

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB Connected to CodePlaygroundDB'))
  .catch(err => console.error('❌ MongoDB Connection Error:', err));

// --- API Routes ---

// 1. Save a new snippet and generate a share link
app.post('/api/snippets/save', async (req, res) => {
  try {
    const { code, title } = req.body;
    
    // Generate a random 6-character hex string for the share ID
    const shortId = crypto.randomBytes(3).toString('hex'); 
    
    const newSnippet = new Snippet({ code, title, shortId });
    await newSnippet.save();
    
    res.json({ 
      success: true, 
      shortId: shortId,
      message: 'Snippet saved successfully!' 
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
});

// 2. Retrieve a snippet by its shortId
app.get('/api/snippets/:shortId', async (req, res) => {
  try {
    const snippet = await Snippet.findOne({ shortId: req.params.shortId });
    
    if (!snippet) {
      return res.status(404).json({ error: 'Snippet not found' });
    }
    
    res.json(snippet);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server Error' });
  }
});

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Backend server running on http://localhost:${PORT}`);
});