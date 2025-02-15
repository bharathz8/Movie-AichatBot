import axios from "axios";
import "dotenv/config";

async function getEmbedding(text) {
  try {
    console.log("HF_API_KEY:", process.env.HF_API_KEY);

    const response = await axios.post(
      'https://api-inference.huggingface.co/models/sentence-transformers/all-MiniLM-L6-v2',
      { inputs: [text] },
      {
        headers: {
          Authorization: `Bearer ${process.env.HF_API_KEY}`,
        },
      }
    );
  
    return response.data; 
  } catch(error) {
    console.log("error in the getEmbedding function", error)
  }
  
}

getEmbedding("Hello, how are you?")
  .then(embedding => console.log(embedding))
  .catch(err => console.error(err));
