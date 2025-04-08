// Added speak route - voice feature
require("dotenv").config();
const express = require("express");
const axios = require("axios");
const { OpenAI } = require("openai");
const fs = require("fs");
const cors = require("cors");

const app = express();
app.use(cors({ origin: "*" }));
app.use(express.json());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Text chatbot route
app.get("/", (req, res) => {
  res.send("Welcome to BetterChat! The chatbot that improves conversations.");
});

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
    console.error("🔥 Chat Error:", error?.response?.data || error.message);
    res.status(500).send("Chat error");
  }
});

// Voice reply route (ElevenLabs)
app.post("/speak", async (req, res) => {
  try {
    const { text, voice_id } = req.body;

    const response = await axios({
      method: "POST",
      url: `https://api.elevenlabs.io/v1/text-to-speech/${voice_id}`,
      headers: {
        "xi-api-key": process.env.ELEVEN_API_KEY,
        "Content-Type": "application/json"
      },
      data: {
        text,
        model_id: "eleven_monolingual_v1",
        voice_settings: { stability: 0.4, similarity_boost: 0.8 }
      },
      responseType: "arraybuffer"
    });

    res.set({
      "Content-Type": "audio/mpeg",
      "Content-Length": response.data.length
    });
    res.send(response.data);

  } catch (error) {
    console.error("🔊 ElevenLabs Error:", error?.response?.data || error.message);
    res.status(500).send("Voice generation error");
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
