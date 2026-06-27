const express = require('express');
const fs = require('fs');
const path = require('path');
const { embedText, generateQuestion } = require('../utils/gemini');
const { cosineSimilarity } = require('../utils/similarity');

const router = express.Router();
const SIMILARITY_THRESHOLD = 0.85;
const MAX_ATTEMPTS = 5;

// stats log for your resume metric
const statsPath = path.join('data', 'stats.json');
function logAttempt(accepted, rejectedCount) {
  let stats = { totalGenerated: 0, totalRejectedDuplicates: 0 };
  if (fs.existsSync(statsPath)) stats = JSON.parse(fs.readFileSync(statsPath));
  stats.totalGenerated += 1;
  stats.totalRejectedDuplicates += rejectedCount;
  fs.writeFileSync(statsPath, JSON.stringify(stats, null, 2));
}

router.post('/quiz/:docId', async (req, res) => {
  try {
    const numQuestions = req.body.numQuestions || 5;
    const filePath = path.join('data', `${req.params.docId}.json`);
    const doc = JSON.parse(fs.readFileSync(filePath));

    if (!doc.chunks || doc.chunks.length === 0) {
      return res.status(400).json({ error: 'Document not processed yet' });
    }

    // load or init seen-questions cache for this doc
    const seenPath = path.join('data', `${req.params.docId}_seen.json`);
    let seen = fs.existsSync(seenPath) ? JSON.parse(fs.readFileSync(seenPath)) : [];

    const quiz = [];

    for (let i = 0; i < numQuestions; i++) {
      const chunk = doc.chunks[Math.floor(Math.random() * doc.chunks.length)];
      let rejectedCount = 0;
      let finalQuestion = null;

      for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
        const avoidList = seen.slice(-10).map(s => s.text); // recent topics to avoid
        const q = await generateQuestion(chunk.text, avoidList);
        const qEmbedding = await embedText(q.question);

        const isDuplicate = seen.some(
          s => cosineSimilarity(s.embedding, qEmbedding) > SIMILARITY_THRESHOLD
        );

        if (!isDuplicate) {
          finalQuestion = q;
          seen.push({ text: q.question, embedding: qEmbedding });
          logAttempt(true, rejectedCount);
          break;
        } else {
          rejectedCount++;
        }
      }

      if (finalQuestion) quiz.push(finalQuestion);
    }

    fs.writeFileSync(seenPath, JSON.stringify(seen, null, 2));
    res.json({ quiz });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Quiz generation failed' });
  }
});

module.exports = router;