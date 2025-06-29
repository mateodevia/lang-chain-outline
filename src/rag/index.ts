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

const InputStateAnnotation = Annotation.Root({
  question: Annotation<string>,
});

const StateAnnotation = Annotation.Root({
  question: Annotation<string>,
  context: Annotation<Document[]>,
  answer: Annotation<string>,
});


export const getRAG = async () => {
  const promptTemplate = await pull<ChatPromptTemplate>('rlm/rag-prompt');

  const vectorStore = await PGVectorStore.initialize(embeddingModel, {
    tableName: 'outline_docs',
    postgresConnectionOptions: {
      connectionString: process.env.PG_CONNECTION_STRING,
    },
  });

  const retrieve = async (state: typeof InputStateAnnotation.State) => {
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

  const generate = async (state: typeof StateAnnotation.State) => {
    const docsContent = state.context.map((doc) => doc.pageContent).join('\n');
    const messages = await promptTemplate.invoke({
      question: state.question,
      context: docsContent,
    });
    const response = await ragModel.invoke(messages);
    return { answer: response.content };
  };

  const graph = new StateGraph(StateAnnotation)
  .addNode("retrieve", retrieve)
  .addNode("generate", generate)
  .addEdge("__start__", "retrieve")
  .addEdge("retrieve", "generate")
  .addEdge("generate", "__end__")
  .compile();

  return graph;
};