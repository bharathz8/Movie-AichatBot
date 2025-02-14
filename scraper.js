import axios from "axios";
import * as cheerio from 'cheerio';
import Dialogue from "./Dialogue.js";
import { decode } from "html-entities";

export const scrapeCharacterDialogues = async (character, url) => {
  try {
    const { data } = await axios.get(url);
    const $ = cheerio.load(data);
    const dialogues = [];

    const lines = $('td.scrtext').text().split('\n');

    lines.forEach((line, index) => {
      if (line.trim().toUpperCase() === character.toUpperCase()) {
        const nextLine = lines[index + 1]?.trim();
        if (isValidDialogue(nextLine)) {
          dialogues.push({
            character,
            dialogue: cleanText(nextLine),
            user_message: null
          });
        }
      }
    });

    // Save to database in batches
    if (dialogues.length > 0) {
      await Dialogue.insertMany(dialogues);
      console.log(`✅ Saved ${dialogues.length} dialogues for ${character}`);
    } else {
      console.warn(`⚠️ No valid dialogues found for ${character}`);
    }

    return dialogues;

  } catch (error) {
    if (error.response) {
      console.error(`❌ Request failed for ${url}: ${error.response.status}`);
    } else {
      console.error(`❌ Scraping failed for ${character}:`, error.message);
    }
    throw error;
  }
};

const cleanText = (text) => {
  return decode(text)
    .replace(/[\n\r\t]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

const isValidDialogue = (text) => {
  return (
    text &&
    text.length > 0 &&
    text.length < 500 &&
    !/^\W+$/.test(text)
  );
};
