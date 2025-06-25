import { HuggingFaceInferenceEmbeddings } from '@langchain/community/embeddings/hf';
import { ChatGroq } from '@langchain/groq';
import { ChatOllama } from '@langchain/ollama';
require('dotenv').config();

export const embeddingModel = new HuggingFaceInferenceEmbeddings({
  apiKey: process.env.HUGGINGFACEHUB_API_KEY,
});

export const chunckerModel = new ChatGroq({
  model: 'deepseek-r1-distill-llama-70b',
  temperature: 0,
});

export const ragModel = new ChatGroq({
    model: 'deepseek-r1-distill-llama-70b',
    temperature: 0,
  });