import { useState } from 'react';
import axios from 'axios';
import './App.css';

const API = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

function App() {
  const [docId, setDocId] = useState(null);
  const [fileName, setFileName] = useState('');
  const [quiz, setQuiz] = useState([]);
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setFileName(file.name);
    setQuiz([]);
    setAnswers({});
    setSubmitted(false);
    setDocId(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      setLoading(true);
      setStatus('Uploading document...');
      const res = await axios.post(`${API}/upload`, formData);
      const newDocId = res.data.docId;

      setStatus('Extracting & embedding chunks...');
      const processRes = await axios.post(`${API}/process/${newDocId}`);

      if (!processRes.data.numChunks || processRes.data.numChunks === 0) {
        setStatus('Processing failed — no chunks created. Try a different PDF.');
        setLoading(false);
        return;
      }

      setDocId(newDocId);
      setStatus(`Ready — ${processRes.data.numChunks} chunks embedded. Click "Generate Quiz"`);
    } catch (err) {
      console.error(err);
      setStatus('Upload or processing failed. Check backend logs.');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateQuiz = async () => {
    if (!docId) {
      setStatus('No processed document yet. Upload a PDF first.');
      return;
    }

    try {
      setLoading(true);
      setStatus('Generating unique questions...');
      const res = await axios.post(`${API}/quiz/${docId}`, { numQuestions: 5 });
      setQuiz(res.data.quiz);
      setAnswers({});
      setSubmitted(false);
      setStatus('');
    } catch (err) {
      console.error(err);
      setStatus('Quiz generation failed.');
    } finally {
      setLoading(false);
    }
  };

  const selectAnswer = (qIndex, option) => {
    if (submitted) return;
    setAnswers((prev) => ({ ...prev, [qIndex]: option }));
  };

  const handleSubmit = () => {
    setSubmitted(true);
  };

  const handleRetake = async () => {
    setAnswers({});
    setSubmitted(false);
    await handleGenerateQuiz();
  };

  const allAnswered = quiz.length > 0 && quiz.every((_, i) => answers[i]);
  const score = quiz.reduce(
    (acc, q, i) => acc + (answers[i] === q.answer ? 1 : 0),
    0
  );
  const percentage = quiz.length ? Math.round((score / quiz.length) * 100) : 0;

  const getOptionClass = (q, i, opt) => {
    if (!submitted) {
      return answers[i] === opt ? 'option selected' : 'option';
    }
    const isCorrect = opt === q.answer;
    const isPicked = answers[i] === opt;

    if (isCorrect) return 'option correct';
    if (isPicked && !isCorrect) return 'option incorrect';
    return 'option disabled';
  };

  return (
    <div className="app">
    <div className="header">
      <h1>BrewQuiz</h1>
      <p className="tagline">Freshly brewed. Never the same twice.</p>
      <p className="description">Upload notes → brew fresh, plagiarism-resistant quizzes every time</p>
    </div>
   
      <div className="card">
        <label className="upload-zone">
          <input type="file" accept="application/pdf" onChange={handleUpload} />
          <div className="icon">📄</div>
          <div className="label">{fileName || 'Click to upload a PDF'}</div>
          <div className="sub">Lecture notes, textbooks, study material</div>
        </label>

        {docId && (
          <button className="btn" onClick={handleGenerateQuiz} disabled={loading}>
            Generate Quiz
          </button>
        )}

        {status && (
          <div className="status">
            {loading && <div className="spinner" />}
            {status}
          </div>
        )}
      </div>

      {quiz.length > 0 && submitted && (
        <div className="results-card">
          <div className="results-score">{percentage}%</div>
          <div className="results-label">
            You got {score} out of {quiz.length} correct
          </div>
          <button className="btn btn-secondary" onClick={handleRetake} disabled={loading}>
            {loading ? 'Generating fresh questions...' : 'Retake with New Questions'}
          </button>
        </div>
      )}

      {quiz.length > 0 && (
        <div className="quiz-section">
          <h2>
            Your Quiz <span className="badge">{quiz.length} questions</span>
          </h2>

          {quiz.map((q, i) => (
            <div className="question-card" key={i}>
              <div className="q-number">QUESTION {i + 1}</div>
              <div className="q-text">{q.question}</div>

              {q.options.map((opt, j) => (
                <label key={j} className={getOptionClass(q, i, opt)}>
                  <input
                    type="radio"
                    name={`q${i}`}
                    checked={answers[i] === opt}
                    onChange={() => selectAnswer(i, opt)}
                    disabled={submitted}
                  />
                  {opt}
                  {submitted && opt === q.answer && (
                    <span className="tag tag-correct">✓ Correct answer</span>
                  )}
                  {submitted && answers[i] === opt && opt !== q.answer && (
                    <span className="tag tag-incorrect">✗ Your answer</span>
                  )}
                </label>
              ))}
            </div>
          ))}

          {!submitted && (
            <button
              className="btn"
              onClick={handleSubmit}
              disabled={!allAnswered}
            >
              {allAnswered
                ? 'Submit Quiz'
                : `Answer all questions (${Object.keys(answers).length}/${quiz.length})`}
            </button>
          )}
        </div>
      )}

      {quiz.length === 0 && docId && !loading && (
        <div className="empty-state">No quiz generated yet.</div>
      )}
    </div>
  );
}

export default App;