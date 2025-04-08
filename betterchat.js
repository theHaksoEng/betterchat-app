require("dotenv").config();
const express = require("express");
const axios = require("axios");
const { OpenAI } = require("openai"); // ✅ correct import
const fs = require("fs");
const cors = require("cors");

const app = express();

// Enable CORS
app.use(cors({ origin: "*" }));
app.use(express.json());

// ✅ Now we define the `openai` client (this was missing)
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Root route
app.get("/", (req, res) => {
  res.send("Welcome to BetterChat! The chatbot that improves conversations.");
});

// Chat endpoint
app.post("/chat", async (req, res) => {
  try {
    const transcribedText = req.body.text;

    const messages = [
      { role: "system", content: "You are a helpful assistant providing concise responses in at most two sentences." },
      { role: "user", content: transcribedText }
    ];

    const chatResponse = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages
    });

    const chatResponseText = chatResponse.choices[0].message.content;
    res.json({ text: chatResponseText });

  } catch (error) {
    console.error("🔥 FULL ERROR:", error);
    res.status(500).send("Server error");
  }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);

});
