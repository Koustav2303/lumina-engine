const mongoose = require('mongoose');

const SnippetSchema = new mongoose.Schema({
  code: { 
    type: String, 
    required: true 
  },
  title: { 
    type: String, 
    default: 'Untitled Snippet' 
  },
  shortId: { 
    type: String, 
    required: true, 
    unique: true 
  }
}, { timestamps: true });

module.exports = mongoose.model('Snippet', SnippetSchema);