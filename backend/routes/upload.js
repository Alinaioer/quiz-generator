const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    const filePath = req.file.path;
    const dataBuffer = fs.readFileSync(filePath);
    const pdfData = await pdfParse(dataBuffer);
    const text = pdfData.text;

    const docId = uuidv4();
    fs.writeFileSync(
      path.join('data', `${docId}.json`),
      JSON.stringify({ docId, text, chunks: [] }, null, 2)
    );

    fs.unlinkSync(filePath); // delete temp upload

    res.json({ docId, message: 'Upload successful', length: text.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to process PDF' });
  }
});

module.exports = router;