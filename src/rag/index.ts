import { ChatPromptTemplate } from '@langchain/core/prompts';
import { pull } from 'langchain/hub';
import { Document } from '@langchain/core/documents';
import { Annotation } from '@langchain/langgraph';
import { PGVectorStore } from '@langchain/community/vectorstores/pgvector';
import { StateGraph } from "@langchain/langgraph";
import { InMemoryStore } from "@langchain/core/stores";
import { MultiVectorRetriever } from "langchain/retrievers/multi_vector";
import { embeddingModel, ragModel } from './llm-config';
require('dotenv').config();

/**
 * Type definition for the input state of the RAG system.
 * Used to annotate the initial state containing just the user's question.
 * 
 * @property question - The user's input question as a string
 */
const InputStateAnnotation = Annotation.Root({
  question: Annotation<string>,
});

/**
 * Type definition for the complete state of the RAG system.
 * Used to annotate the full state during question processing.
 * 
 * @property question - The user's input question as a string
 * @property context - Array of retrieved Document objects providing relevant context
 * @property answer - The generated answer string based on the context and question
 */
const StateAnnotation = Annotation.Root({
  question: Annotation<string>,
  context: Annotation<Document[]>,
  answer: Annotation<string>,
});

/**
 * Retrieves relevant documents from the vector store based on the input question.
 * 
 * This function:
 * 1. Initializes a connection to the PostgreSQL vector store
 * 2. Creates a MultiVectorRetriever for hierarchical document retrieval
 * 3. Performs similarity search using the input question
 * 4. Returns retrieved documents as context
 * 
 * The retriever is configured to:
 * - Use parent-child relationships between document chunks
 * - Retrieve up to 20 child chunks and 5 parent documents
 * - Store binary data in memory
 * 
 * @param state - Input state containing the question
 * @param state.question - The user's question to search for relevant documents
 * @returns Promise resolving to an object with retrieved context documents
 * 
 * @throws Will throw an error if vector store initialization fails
 */
const retrieve = async (state: typeof InputStateAnnotation.State) => {
    
  const vectorStore = await PGVectorStore.initialize(embeddingModel, {
    tableName: 'outline_docs',
    postgresConnectionOptions: {
      connectionString: process.env.PG_CONNECTION_STRING,
    },
  });

  const retriever = new MultiVectorRetriever({
    vectorstore: vectorStore,
    byteStore: new InMemoryStore<Uint8Array>(),
    idKey: 'parent_id',
    childK: 20,
    parentK: 5,
  });
  const vectorstoreResult = await retriever.vectorstore.similaritySearch(state.question);
  return { context: vectorstoreResult };
};

/**
 * Generates an answer to the user's question using retrieved context documents.
 * 
 * This function:
 * 1. Loads a chat prompt template for RAG responses
 * 2. Combines the context documents into a single text
 * 3. Invokes the prompt template with the question and context
 * 4. Generates an answer using the configured language model
 * 
 * @param state - Current state containing:
 * @param state.question - The user's original question
 * @param state.context - Array of retrieved documents providing context
 * @returns Promise resolving to an object containing the generated answer
 * 
 * @throws Will throw an error if:
 * - Prompt template loading fails
 * - Language model invocation fails
 * 
 * @example
 * ```typescript
 * const result = await generate({
 *   question: "How do I authenticate?",
 *   context: [{ pageContent: "Authentication uses API keys..." }]
 * });
 * console.log(result.answer); // Generated response about authentication
 * ```
 */
const generate = async (state: typeof StateAnnotation.State) => {
  const promptTemplate = await pull<ChatPromptTemplate>('rlm/rag-prompt');

  const docsContent = state.context.map((doc) => doc.pageContent).join('\n');
  const messages = await promptTemplate.invoke({
    question: state.question,
    context: docsContent,
  });
  const response = await ragModel.invoke(messages);
  return { answer: response.content };
};

/**
 * Creates and configures a RetrievalAugmented Generation (RAG) agent using LangGraph.
 * 
 * This function sets up a complete RAG pipeline that:
 * 1. Retrieves relevant documents from a PostgreSQL vector store
 * 2. Uses retrieved context to generate answers using an LLM
 * 
 * @returns Promise that resolves to a compiled StateGraph representing the RAG system
 * 
 * @throws Will throw an error if the vector store initialization fails or if environment variables are missing
 * 
 * @example
 * ```typescript
 * const rag = await getRAG();
 * const result = await rag.invoke({ question: "What is the API authentication method?" });
 * console.log(result.answer); // AI-generated answer based on retrieved documents
 * ```
 */
export const getRAG = async () => {
  const graph = new StateGraph(StateAnnotation)
  .addNode("retrieve", retrieve)
  .addNode("generate", generate)
  .addEdge("__start__", "retrieve")
  .addEdge("retrieve", "generate")
  .addEdge("generate", "__end__")
  .compile();

  return graph;
};