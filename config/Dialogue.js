import client from "./weaviateClient.js";
import getEmbeddings from "../embeddings/generateEmbeddings.js";

export async function searchDialogue(character, userMessage) {
    try {
        if (!character || !userMessage) {
            throw new Error('Character and userMessage are required for search');
        }
        const embedding = await getEmbeddings(userMessage);
        const query = client.graphql.get()
            .withClassName('Dialogue')
            .withFields(['character', 'dialogue', 'user_message'])
            .withNearVector({ 
                vector: embedding, 
                certainty: 0.85
            })
            .withWhere({
                operator: 'And',
                operands: [
                    {
                        path: ['character'],
                        operator: 'Equal',
                        valueString: character.toLowerCase(),
                    },
                    {
                        operator: 'Or',
                        operands: [
                            {
                                path: ['user_message'],
                                operator: 'Like',
                                valueString: `*${userMessage.toLowerCase()}*`
                            },
                            {
                                path: ['dialogue'],
                                operator: 'Like',
                                valueString: `*${userMessage.toLowerCase()}*`
                            }
                        ]
                    }
                ]
            })
            .withLimit(5);

        const response = await query.do();
        console.log('Weaviate search response:', JSON.stringify(response, null, 2));

        const dialogues = response?.data?.Get?.Dialogue || [];

        if (dialogues.length === 0) {
            console.log(`❌ No dialogues found for character ${character}`);
            return null;
        }

        // Filter out responses that are too different from the current context
        const filteredDialogues = dialogues.filter(dialogue => {
            const storedMessage = dialogue.user_message?.toLowerCase() || '';
            const currentMessage = userMessage.toLowerCase();
            
            // Check if the messages are significantly different in length
            const lengthRatio = Math.min(storedMessage.length, currentMessage.length) / 
                              Math.max(storedMessage.length, currentMessage.length);
            
            // Only return responses where the messages are somewhat similar in length
            return lengthRatio > 0.5;
        });

        if (filteredDialogues.length === 0) {
            console.log(`❌ No suitable dialogues found after filtering`);
            return null;
        }

        // Return the most relevant result
        const bestMatch = filteredDialogues[0];
        console.log(`✅ Found dialogue for character ${character}:`);
        console.log(`User message: ${bestMatch.user_message}`);
        console.log(`Response: ${bestMatch.dialogue}`);

        return bestMatch;
    } catch (err) {
        console.error(`❌ Error searching dialogue for character ${character}:`, err.message);
        throw err;
    }
}

export async function insertDialogue(character, dialogue, user_message = null) {
    try {
        const embedding = await getEmbeddings(user_message || dialogue);

        if (!embedding || embedding.length === 0) {
            throw new Error(`Invalid embedding for dialogue: "${dialogue}"`);
        }

        await client.data.creator()
            .withClassName('Dialogue')
            .withProperties({ 
                character: character.toLowerCase(), 
                dialogue, 
                user_message: (user_message || dialogue).toLowerCase()
            })
            .withVector(embedding)
            .do();

        console.log(`✅ Inserted dialogue for character ${character}`);
    } catch (err) {
        console.error(`❌ Failed to insert dialogue for character ${character}:`, err.message);
        throw err;
    }
}