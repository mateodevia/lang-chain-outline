import { getRAG } from './RAG';
require('dotenv').config();

const generateResponse = async (question: string) => {
  const rag = await getRAG();
  const result = await rag.invoke({ question });
  console.log(`\nContext: ${result['context']}`);
  console.log(`\nAnswer: ${result['answer']}`);
};

generateResponse('Como genero migraciones?');
