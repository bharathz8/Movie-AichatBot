import client from "./weaviateClient.js";

export async function createSchema() {
    try {

        await client.schema.deleteAll()   // remove aftrer completing the development
        
        await client.schema.classCreator().withClass({
            class: "Dialogue",
            vectorizer: 'none',
            properties: [
                {
                    name: 'character', datatype: ['string'],
                    name: 'dialogues', datatype: ['string'],
                    name: 'user_message', datatype: ['string']
                }]          
        }).do()
        console.log("weaviate schema got created successful !");
    }
    catch(error) {
        console.log("error got in the creating weaviate schema", error);
    }
}

createSchema().then(() => {
    console.log("Schema creation completed");
    process.exit(0);
}).catch(error => {
    console.error("Failed to create schema:", error);
    process.exit(1);
});