import client from "./weaviateClient.js";
import getEmbeddings from "../embeddings/generateEmbeddings.js"

export async function insertDialogue(character, dialogue, user_message = null) {
    try {
      const embedding = await getEmbeddings(dialogue);
  
      if (!embedding || embedding.length === 0) {
        throw new Error(`Invalid embedding for dialogue: "${dialogue}"`);
      }
  
      await client.data.creator()
        .withClassName('Dialogue')
        .withProperties({ character, dialogue, user_message })
        .withVector(embedding)
        .do();
  
      console.log(`✅ Inserted: ${dialogue}`);
    } catch (err) {
      console.error(`❌ Failed to insert dialogue: ${dialogue}`, err.message);
    }
  }
  


export async function searchDialogue(userMessage) {
    const embedding = await getEmbeddings(userMessage);

    const response = await client.graphql
        .get()
        .withClassName('Dialogue')
        .withFields('character dialogue user_message')
        .withNearVector({vector: embedding, distance: 0.7})
        .withLimit(1)
        .do()

        return response.data.Get.dialogue[0] || null;
}