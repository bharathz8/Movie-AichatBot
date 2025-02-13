import "dotenv/config";
import express from "express";
import cors from "cors";
import axios from "axios";
import mongoose from "mongoose";
import Dialogue from "./Dialogue.js";
import { scrapeCharacterDialogues } from "./scraper.js";

const app = express();
app.use(express.json());
app.use(cors());

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MONGO_URI = process.env.MONGO_URI;

// Character prompt templates
const characterPrompts = {
  "Iron Man": `You are Tony Stark (Iron Man). Respond in a witty, sarcastic manner with these traits:
    - Use modern tech references and plenty of snark
    - Be confident, even arrogant, but ultimately caring
    - Make quips and clever comebacks
    - Reference your wealth, genius, and achievements casually
    Keep responses concise and witty.`,

  "Joker": `You are the Joker. Respond with these characteristics:
    - Mix humor with darkness in your responses
    - Be unpredictable but maintain internal logic
    - Laugh frequently (written as "HAHA" or "hehehe")
    - Use dark jokes and playful threats
    Keep responses unpredictable and entertaining.`,

  "_default": `You are {CHARACTER_NAME}. 
    - Maintain consistent personality and speech patterns
    - Use appropriate vocabulary and references
    - Show emotion and react naturally
    Keep responses concise and engaging.`
};

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("✅ MongoDB Connected");
  } catch (err) {
    console.error("❌ MongoDB Connection Error:", err);
    process.exit(1);
  }
};

connectDB();

// Rate limiting
const rateLimit = {
  windowMs: 60 * 1000,
  max: new Map(),
  limit: 20
};

const rateLimiter = (req, res, next) => {
  const ip = req.ip;
  const current = rateLimit.max.get(ip) || 0;
  
  if (current >= rateLimit.limit) {
    return res.status(429).json({ error: "Too many requests. Please try again later." });
  }
  
  rateLimit.max.set(ip, current + 1);
  setTimeout(() => rateLimit.max.set(ip, (rateLimit.max.get(ip) || 1) - 1), rateLimit.windowMs);
  
  next();
};

app.use(rateLimiter);

// Chat endpoint
app.post("/chat", async (req, res) => {
  try {
    const { character, user_message } = req.body;

    if (!character || !user_message) {
      return res.status(400).json({ error: "Character and message are required" });
    }

    if (user_message.length > 500) {
      return res.status(400).json({ error: "Message too long. Please keep under 500 characters." });
    }

    // Try to find existing dialogue
    const existingDialogue = await Dialogue.findOne({
      character,
      user_message: { $regex: new RegExp(user_message, "i") }
    });

    if (existingDialogue) {
      return res.json({ 
        response: existingDialogue.dialogue,
        source: "database"
      });
    }

    // Generate AI response
    const prompt = characterPrompts[character] || 
      characterPrompts._default.replace("{CHARACTER_NAME}", character);

    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`,
      {
        contents: [
          { 
            role: "user", 
            parts: [{ text: `${prompt}\n\nUser: ${user_message}` }] 
          }
        ],
        generationConfig: {
          temperature: 0.9,
          maxOutputTokens: 150
        }
      }
    );

    const reply = response.data.candidates[0]?.content?.parts[0]?.text || 
      "I don't know what to say.";

    // Save to database
    await new Dialogue({
      character,
      user_message,
      dialogue: reply
    }).save();

    res.json({ 
      response: reply,
      source: "ai"
    });

  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Something went wrong" });
  }
});

// Scrape endpoint
app.post("/scrape", async (req, res) => {
  try {
    const { character, url } = req.body;
    
    if (!character || !url) {
      return res.status(400).json({ error: "Character and URL are required" });
    }

    const dialogues = await scrapeCharacterDialogues(character, url);
    res.json({ success: true, count: dialogues.length });
  } catch (error) {
    console.error("Scrape Error:", error);
    res.status(500).json({ error: "Scraping failed" });
  }
});

// Health check
app.get("/health", (req, res) => {
  res.json({ 
    status: "ok",
    mongodb: mongoose.connection.readyState === 1
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

// Graceful shutdown
process.on('SIGTERM', async () => {
  await mongoose.connection.close();
  process.exit(0);
});