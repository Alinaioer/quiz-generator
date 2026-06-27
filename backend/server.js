require("dotenv").config();

const express = require("express");
const cors = require("cors");
const uploadRouter = require("./routes/upload");
const processRouter = require("./routes/process");   // ← moved here
const quizRouter = require('./routes/quiz');
const app = express();

// Middleware
app.use(cors({
  origin: ['http://localhost:5000', 'https://quiz-generator-uh9x.onrender.com']
}));
app.use(express.json());

// Routes
app.use("/api", uploadRouter);
app.use("/api", processRouter);   // ← moved here
app.use('/api', quizRouter);
app.get("/", (req, res) => {
  res.send("Quiz Generator API is running");
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});