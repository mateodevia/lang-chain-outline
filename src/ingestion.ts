import { PGVectorStore } from '@langchain/community/vectorstores/pgvector';
import { requestDocumentById, requestLatestOutlineDocs } from './outline-api/document-service';
import { requestCollectionById } from './outline-api/collection-service';
import { generateDocumentChunks } from './AgenticChunker';
import { embeddingModel } from './LLMs';
import { queryDB } from './database/database';

require('dotenv').config();

const documentWasAlreadyLoaded = async(document: any) => {
  const documentExists = await queryDB(`SELECT * FROM outline_docs WHERE metadata->>'id' = '${document.id}'`);
  if (documentExists?.length) {
    return true;
  }
  return false;
}

const addSemanticMeaningAndLoadDoc = async (document: any, vectorStore: PGVectorStore) => {
  // Add parent document title to add more semantic meaning to the generated documents
  if (document.parentDocumentId) {
    const parentDocument = await requestDocumentById(document.parentDocumentId);
    document.parentDocument = parentDocument.title;
  }

  // Add collection title to add more semantic meaning to the generated documents
  if (document.collectionId) {
    const collection = await requestCollectionById(document.collectionId);
    document.collection = collection.title;
  }

  const generatedDocs = await generateDocumentChunks(document);
  console.log(`Document ${document.title} was chunked.`);
  
  if (generateDocumentChunks.length) await vectorStore.addDocuments(generatedDocs);
  console.log(`Document ${document.title} was uploaded.`);
}

const loadDocsToVectorDB = async (docs: any[]) => {
  const vectorStore = await PGVectorStore.initialize(embeddingModel, {
    tableName: 'outline_docs',
    postgresConnectionOptions: {
      connectionString: process.env.PG_CONNECTION_STRING,
    },
  });
  let i = 0;
  await Promise.all(
    docs.map(async (document) => {
      if (await documentWasAlreadyLoaded(document)) {   
        console.log(`Document ${document.title} will be skipped because it was already uploaded.`);
        return;
      };
      await addSemanticMeaningAndLoadDoc(document, vectorStore);
      console.log(`Document ${document.title} was uploaded. Total: ${i}`);
      i++;
      return;
    })
  );
};

const ingest = async () => {
  let page = 0;
  const pageSize = 100;

  const response = await requestLatestOutlineDocs({ page, pageSize });
  console.log(`Total documents: ${response.pagination.total}`);
  await loadDocsToVectorDB(response.data);

  // Check if there are more documents to load
  if (response.pagination.total > pageSize) {
    const totalPages = Math.ceil(response.pagination.total / pageSize);
    console.log(`Total pages: ${totalPages}`);
    for (let i = 1; i < totalPages; i++) {
      const response = await requestLatestOutlineDocs({ page: i, pageSize });
      await loadDocsToVectorDB(response.data);
    }
  }
};

ingest();