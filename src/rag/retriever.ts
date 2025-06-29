import { PGVectorStore } from "@langchain/community/vectorstores/pgvector";
import { embeddingModel } from "./llm-config";
import { MultiVectorRetriever } from "langchain/retrievers/multi_vector";
import { InMemoryStore } from "@langchain/core/stores";

/**
 * Creates and returns a configured MultiVectorRetriever for hierarchical document retrieval.
 * 
 * This function:
 * 1. Initializes a connection to the PostgreSQL vector store
 * 2. Configures a MultiVectorRetriever with parent-child relationships
 * 
 * The retriever is set up to:
 * - Use PGVector for document storage and similarity search
 * - Store binary data in memory
 * - Retrieve up to 20 child chunks and 5 parent documents
 * - Use parent_id as the relationship key between documents
 * 
 * @returns Promise<MultiVectorRetriever> Resolves to configured retriever instance
 * 
 * @throws Will throw an error if:
 * - Vector store initialization fails
 * - Database connection fails
 * - Environment variables are missing
 * 
 * @example
 * ```typescript
 * const retriever = await getRetriever();
 * const results = await retriever.getRelevantDocuments("How do I authenticate?");
 * ```
 */

export const getRetriever = async () => {
 
    const vectorStore = await PGVectorStore.initialize(embeddingModel, {
        tableName: 'outline_docs',
        postgresConnectionOptions: {
          connectionString: process.env.PG_CONNECTION_STRING,
        },
      });
    
    return new MultiVectorRetriever({
        vectorstore: vectorStore,
        byteStore: new InMemoryStore<Uint8Array>(),
        idKey: 'parent_id',
        childK: 20,
        parentK: 5,
    });
}