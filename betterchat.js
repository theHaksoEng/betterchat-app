// Load environment variables
require("dotenv").config();

// Import packages
const express = require("express");
const axios = require("axios");
const OpenAI = require("openai").default;  // Corrected import
const cors = require("cors");
const fs = require("fs");

// Setup Express app
const app = express();
app.use(cors({ origin: "*" }));
app.use(express.json());

// Create OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ENV Debug Printout
console.log("🧪 ENV DEBUG:", {
  CHATBASE_API_KEY: process.env.CHATBASE_API_KEY,
  CHATBASE_BOT_ID: process.env.CHATBASE_BOT_ID,
  ELEVEN_API_KEY: process.env.ELEVEN_API_KEY,
  ELEVEN_VOICE_ID: process.env.ELEVEN_VOICE_ID,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
});

// Root route
app.get("/", (req, res) => {
  res.send("Welcome to BetterChat! The chatbot that improves conversations.");
});

// Chat endpoint
app.post("/chat", async (req, res) => {
  try {
    const transcribedText = req.body.text;

    if (!transcribedText) {
      return res.status(400).json({ error: "Missing text in request body." });
    }

    const messages = [
      { role: "system", content: "You are a helpful assistant with a warm voice." },
      { role: "user", content: transcribedText }
    ];

    const chatResponse = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages
    });

    const chatResponseText = chatResponse.choices[0].message.content;
    res.json({ text: chatResponseText });
  } catch (error) {
    console.error("🔥 Chat Error:", error?.response?.data || error.message);
    res.status(500).json({ error: "Chat error occurred." });
  }
});

// Speakbase endpoint (Chat + ElevenLabs)
app.post("/speakbase", async (req, res) => {
  console.log("🌟 /speakbase was hit!");

  try {
    const userText = req.body.text || "";
    const lowerCaseText = userText.toLowerCase();

    const characterVoices = {
      fatima: process.env.FATIMA_VOICE_ID, // you can expand this later
    };

    let selectedVoiceId = process.env.ELEVEN_VOICE_ID;

    const nameDetected = Object.keys(characterVoices).find(name =>
      lowerCaseText.includes(name)
    );

    if (nameDetected) {
      selectedVoiceId = characterVoices[nameDetected];
      console.log(`🎩 Detected character: ${nameDetected}`);
    }

    // Get chat response
    const chatResponse = await axios.post(
      "http://localhost:3000/chat",
      { text: userText },
      { headers: { "Content-Type": "application/json" } }
    );

    const rawText = chatResponse.data.text;
    const spokenText = rawText
      .replace(/\*\*(.*?)\*\*/g, "$1")
      .replace(/\*/g, "")
      .replace(/[_~`]/g, "")
      .trim();

    console.log("🗣 Text to speak:", spokenText);

    // Get ElevenLabs voice
    const voiceResponse = await axios({
      method: "POST",
      url: `https://api.elevenlabs.io/v1/text-to-speech/${selectedVoiceId}`,
      headers: {
        "xi-api-key": process.env.ELEVEN_API_KEY,
        "Content-Type": "application/json"
      },
      data: {
        text: spokenText,
        model_id: "eleven_monolingual_v1",
        voice_settings: {
          stability: 0.4,
          similarity_boost: 0.8
        }
      },
      responseType: "arraybuffer"
    });

    res.set({
      "Content-Type": "audio/mpeg",
      "Content-Length": voiceResponse.data.length
    });
    res.send(voiceResponse.data);

  } catch (error) {
    console.error("❌ Speakbase Error:", error?.response?.data || error.message);
    res.status(500).json({ error: "Speakbase error occurred." });
  }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
