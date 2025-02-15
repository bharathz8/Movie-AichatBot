import weaviate from "weaviate-ts-client";
import dotenv from "dotenv";
dotenv.config();

const client = weaviate.client({
    scheme: 'https',
    host: process.env.WEAVIATE_URL,
    apiKey: new weaviate.ApiKey(process.env.WEAVIATE_API_KEY),
});

export default client;

