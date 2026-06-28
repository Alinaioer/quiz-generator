const { GoogleGenerativeAI } = require('@google/generative-ai');
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function embedText(text) {
  const model = genAI.getGenerativeModel({ model: 'models/gemini-embedding-001' });
  const result = await model.embedContent(text);
  return result.embedding.values;
}

async function generateQuestion(chunkText, avoidList = [], retries = 3) {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  const avoidText = avoidList.length
    ? `Avoid asking about these already-used topics: ${avoidList.join('; ')}.`
    : '';

  const prompt = `
You are a quiz generator. Based ONLY on the text below, create ONE multiple-choice question.
${avoidText}
Return ONLY valid JSON in this exact format, no extra text:
{"question": "...", "options": ["A) ...", "B) ...", "C) ...", "D) ..."], "answer": "A) ..."}

IMPORTANT: The "answer" field must be copied EXACTLY character-for-character from one of the strings in "options", including the letter prefix like "A) ".

Text:
"""${chunkText}"""
`;

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const result = await model.generateContent(prompt);
      const raw = result.response.text();
      const cleaned = raw.replace(/```json|```/g, '').trim();
      return JSON.parse(cleaned);
    } catch (err) {
      const isRateLimited = err.status === 429 || err.status === 503;
      if (isRateLimited && attempt < retries - 1) {
        const waitTime = 3000 * (attempt + 1);
        console.log(`Rate limited, retrying in ${waitTime}ms...`);
        await new Promise((resolve) => setTimeout(resolve, waitTime));
      } else {
        throw err;
      }
    }
  }
}

module.exports = { embedText, generateQuestion };