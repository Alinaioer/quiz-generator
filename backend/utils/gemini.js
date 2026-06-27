const { GoogleGenerativeAI } = require('@google/generative-ai');
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function embedText(text) {
  const model = genAI.getGenerativeModel({ model: 'models/gemini-embedding-001' });
  const result = await model.embedContent(text);
  return result.embedding.values;
}

async function generateQuestion(chunkText, avoidList = []) {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  const avoidText = avoidList.length
    ? `Avoid asking about these already-used topics: ${avoidList.join('; ')}.`
    : '';

  const prompt = `
You are a quiz generator. Based ONLY on the text below, create ONE multiple-choice question.
${avoidText}
Return ONLY valid JSON in this exact format, no extra text:
{"question": "...", "options": ["A", "B", "C", "D"], "answer": "A"}

Text:
"""${chunkText}"""
`;

  const result = await model.generateContent(prompt);
  const raw = result.response.text();
  const cleaned = raw.replace(/```json|```/g, '').trim();
  return JSON.parse(cleaned);
}

module.exports = { embedText, generateQuestion };