// Load environment variables
require("dotenv").config();

const express = require("express");
const axios = require("axios");
const { OpenAI } = require("openai");
const cors = require("cors");
const fs = require("fs");

const app = express();
app.use(cors({ origin: "*" }));
app.use(express.json());

// Debug log for environment variables
console.log("🧪 ENV DEBUG:", {
  CHATBASE_API_KEY: process.env.CHATBASE_API_KEY,
  CHATBASE_BOT_ID: process.env.CHATBASE_BOT_ID,
  ELEVEN_API_KEY: process.env.ELEVEN_API_KEY,
  ELEVEN_VOICE_ID: process.env.ELEVEN_VOICE_ID
});

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Root route
app.get("/", (req, res) => {
  res.send("Welcome to BetterChat! The chatbot that improves conversations.");
});

// Chat using OpenAI
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

// Voice using ElevenLabs
app.post("/speak", async (req, res) => {
  try {
    const { text, voice_id } = req.body;
    const voiceId = voice_id || process.env.ELEVEN_VOICE_ID;

    const response = await axios({
      method: "POST",
      url: `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      headers: {
        "xi-api-key": process.env.ELEVEN_API_KEY,
        "Content-Type": "application/json"
      },
      data: {
        text,
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
      "Content-Length": response.data.length
    });
    res.send(response.data);
  } catch (error) {
    if (error.response && error.response.data) {
      const decoded = Buffer.from(error.response.data).toString("utf8");
      console.error("🔊 ElevenLabs Error (decoded):", decoded);
    } else {
      console.error("🔊 ElevenLabs Error:", error.message);
    }
    res.status(500).send("Voice generation error");
  }
});

// Chatbase chatbot route
app.post("/chatbase", async (req, res) => {
  try {
    const userText = req.body.text;
    console.log("📢 /chatbase route was hit!");
    console.log("🔥 Chatbase Request Triggered");
    console.log("🔑 Using bot ID:", process.env.CHATBASE_BOT_ID);
    console.log("📝 User said:", userText);

    const response = await axios.post(
      "https://www.chatbase.co/api/v1/chat",
      {
        messages: [{ role: "user", content: userText }],
        chatbotId: process.env.CHATBASE_BOT_ID,
        stream: false
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.CHATBASE_API_KEY}`
        }
      }
    );

    const reply =
      response.data.text ||
      response.data.choices?.[0]?.message?.content ||
      response.data.reply ||
      null;

    console.log("📦 Full response from Chatbase:", response.data);
    console.log("📦 Raw Chatbase response:", JSON.stringify(response.data, null, 2));

    if (!reply) {
      console.error("⚠️ Could not extract reply from Chatbase response.");
      return res.status(500).send("No valid reply from Chatbase.");
    }

    console.log("✅ Final reply:", reply);
    res.json({ text: reply });
  } catch (error) {
    console.error("💬 Chatbase Full Error:", {
      message: error.message,
      status: error?.response?.status,
      data: error?.response?.data
    });
    res.status(500).send("Chatbase error");
  }
});

// Speakbase - Chatbase + ElevenLabs (with voice switching + logs)
app.post("/speakbase", async (req, res) => {
  try {
    const userText = req.body.text || "";
    const lowerCaseText = userText.toLowerCase();

    // 🗺️ Voice map
    const characterVoices = {
      fatima: "pFZP5JQG7iQjIQuC4Bku"
    };

    // 🎯 Set default voice
    let selectedVoiceId = process.env.ELEVEN_VOICE_ID;

    // 🔍 Detect character name in input
    const nameDetected = Object.keys(characterVoices).find(name =>
      lowerCaseText.includes(name)
    );
    if (nameDetected) {
      selectedVoiceId = characterVoices[nameDetected];
      console.log(`🎭 Detected character: ${nameDetected} → using voice ID: ${selectedVoiceId}`);
    } else {
      console.log("🎭 No character match found, using default voice.");
    }

    console.log("📝 User input:", userText);
    console.log("🔊 Sending to ElevenLabs voice ID:", selectedVoiceId);

    // 💬 Get Chatbase reply
    const chatResponse = await axios.post(
      "http://localhost:3000/chatbase",
      { text: userText },
      { headers: { "Content-Type": "application/json" } }
    );

    const spokenText = chatResponse.data.text;

    // 🔊 Generate voice using dynamic voice ID
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
    console.error("💬 SpeakBase Error:", error.message);
    res.status(500).send("SpeakBase generation error");
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
