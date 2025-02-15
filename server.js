import "dotenv/config";
import express from "express";
import cors from "cors";
import axios from "axios";
import { scrapeCharacterDialogues } from "./scripts/scraper.js";
import { insertDialogue, searchDialogue } from "./config/Dialogue.js";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const app = express();
app.use(express.json());
app.use(cors());


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

const rateLimitMap = new Map();
const rateLimit = { windowMs: 60 * 1000, limit: 20 };

const rateLimiter = (req, res, next) => {
  const ip = req.ip;
  const currentTime = Date.now();
  const requestLog = rateLimitMap.get(ip) || [];

  const recentRequests = requestLog.filter(timestamp => currentTime - timestamp < rateLimit.windowMs);

  if (recentRequests.length >= rateLimit.limit) {
    return res.status(429).json({ error: "Too many requests. Please try again later." });
  }

  recentRequests.push(currentTime);
  rateLimitMap.set(ip, recentRequests);

  next();
};

app.use(rateLimiter);

// Generate Gemini Response Function
const generateGeminiResponse = async (prompt, userMessage) => {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    const result = await model.generateContent(`${prompt}\nUser: ${userMessage}`);
    const responseText = result.response.text();

    return responseText.trim();
  } catch (error) {
    console.error("Gemini API Error:", error.message);
    throw error;
  }
};

// Chat endpoint
app.post("/chat", async (req, res) => {
  const {character, user_message} = req.body;

  if (!character || !user_message) {
    return res.status(400).json({ error: "Character and user_message are required" });
  }

  try {
    const foundDialogue = await searchDialogue(user_message);

    if (foundDialogue) {
      return res.json({response: foundDialogue.dialogue, source: "weaviate"})
    }

    const prompt = characterPrompts[character] || characterPrompts._default.replace("{CHARACTER_NAME}", character)
    const aiResponse = await generateGeminiResponse(prompt, user_message);

    await insertDialogue(character, aiResponse, user_message)

    return res.json({response: aiResponse, source: "ai"})
  }
  catch(error) {
    console.log("error in the chat route while finding or creating response ", error)
  }
})

// Scrape endpoint
app.post('/scrape', async (req, res) => {
  const { character, url } = req.body;

  try {
    const dialogues = await scrapeCharacterDialogues(character, url);
    console.log('Scraped Dialogues Count:', dialogues.length);
    res.status(200).json({ message: 'Scraping successful', dialogues });
  } catch (error) {
    console.error('Scrape Error:', error);
    res.status(500).json({ error: 'Scraping failed' });
  }
});


const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

// Graceful shutdown
process.on('SIGTERM', async () => {
  await mongoose.connection.close();
  process.exit(0);
});