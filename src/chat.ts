import { getRAG } from './RAG';

const generateResponse = async (question: string) => {
  const rag = await getRAG();
  const result = await rag.invoke({ question });
  console.log(result.context.slice(0, 2));
  console.log(`\nAnswer: ${result['answer']}`);
};

generateResponse('Cuales son los microservicios existentes?');
