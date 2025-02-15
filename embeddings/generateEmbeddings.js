import dotenv from "dotenv";
dotenv.config();
import { HfInference } from "@huggingface/inference";

export default async function getEmbedding(text) {
  try {
    const client = new HfInference(process.env.HF_API_KEY);

    const output = await client.sentenceSimilarity({
      model: "sentence-transformers/all-MiniLM-L6-v2",
      inputs: {
      "source_sentence": text,
      "sentences": [text]
    },
      provider: "hf-inference",
    });

    console.log(output);
  
    return output;
  } catch(error) {
    console.log("error in the getEmbedding function", error)
  }
  
}