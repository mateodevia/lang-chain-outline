import { getRAG } from './RAG';

const generateResponse = async (question: string) => {
  const rag = await getRAG();
  const result = await rag.invoke({ question });
  console.log(`\nContext: ${result['context']}`);
  console.log(`\nAnswer: ${result['answer']}`);
};

generateResponse('Qué es power cash?');
