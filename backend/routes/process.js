const express = require('express');
const fs = require('fs');
const path = require('path');
const { chunkText } = require('../utils/chunker');
const { embedText } = require('../utils/gemini');

const router = express.Router();

router.post('/process/:docId', async (req, res) => {
  try {
    const filePath = path.join('data', `${req.params.docId}.json`);
    const doc = JSON.parse(fs.readFileSync(filePath));

    const rawChunks = chunkText(doc.text);
    const chunks = [];

    for (const text of rawChunks) {
      const embedding = await embedText(text);
      chunks.push({ text, embedding });
    }

    doc.chunks = chunks;
    fs.writeFileSync(filePath, JSON.stringify(doc, null, 2));

    res.json({ message: 'Document processed', numChunks: chunks.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Processing failed' });
  }
});

module.exports = router;