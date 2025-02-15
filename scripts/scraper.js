import axios from "axios";
import * as cheerio from 'cheerio';
import { insertDialogue } from "../config/Dialogue.js";
import { decode } from "html-entities";

export const scrapeCharacterDialogues = async (character, url) => {
  const cleanText = (text) => {
    return decode(text).replace(/[\n\r\t]/g, ' ').replace(/\s+/g, ' ').trim();
  };

  const isValidDialogue = (text) => {
    return text && text.length > 0 && text.length < 500 && !/^\W+$/.test(text);
  };

  try {
    console.log(`Scraping dialogues for: ${character} from ${url}`);

    const { data } = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    const $ = cheerio.load(data);
    const lines = $('td.scrtext').text().split('\n');

    console.log('Sample of scraped lines:', lines.slice(0, 20));

    const dialogues = [];

    for (let index = 0; index < lines.length; index++) {
      const line = lines[index].trim();

      if (line.toUpperCase().includes(character.toUpperCase())) {
        const nextLine = lines[index + 1]?.trim();

        if (isValidDialogue(nextLine)) {
          const cleanedDialogue = cleanText(nextLine);
          dialogues.push({
            character,
            dialogue: cleanedDialogue,
          });

          // Optional: Insert into Weaviate
          await insertDialogue(character, cleanedDialogue, "");
        }
      }
    }

    console.log(`✅ Scraping finished. Collected ${dialogues.length} dialogues.`);
    return dialogues; // This is the important part!
  } catch (error) {
    console.error('❌ Error during scraping:', error);
    throw error;
  }
};

