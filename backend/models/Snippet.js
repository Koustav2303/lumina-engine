const mongoose = require('mongoose');

const SnippetSchema = new mongoose.Schema({
  // Legacy support for your older 3D snippets
  code: { type: String }, 
  
  // New Multi-tab support
  html: { type: String, default: '<div id="canvas-container"></div>' },
  css: { type: String, default: 'body { margin: 0; padding: 0; overflow: hidden; background-color: #0f172a; }\n#canvas-container { width: 100vw; height: 100vh; }' },
  js: { type: String, default: '' },
  
  title: { type: String, default: 'Playground Snippet' },
  shortId: { type: String, required: true, unique: true }
}, { timestamps: true });

module.exports = mongoose.model('Snippet', SnippetSchema);