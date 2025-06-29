import { PGVectorStore } from '@langchain/community/vectorstores/pgvector';
import { requestDocumentById, requestLatestOutlineDocs } from '../outline-api/document-service';
import { requestCollectionById } from '../outline-api/collection-service';
import { generateDocumentChunks } from './agentic-chunker';
import { embeddingModel } from './llm-config';
import { queryDB } from '../database/database';
import chalk from 'chalk';

require('dotenv').config();

/**
 * Checks if a document has already been loaded into the vector database.
 * 
 * @param document - The document object containing an id field
 * @param document.id - Unique identifier of the document to check
 * @returns Promise that resolves to true if the document exists in the database, false otherwise
 * 
 * @example
 * ```typescript
 * const exists = await documentWasAlreadyLoaded({ id: 'doc-123' });
 * if (exists) {
 *   console.log('Document already processed');
 * }
 * ```
 */
const documentWasAlreadyLoaded = async(document: any) => {
  const documentExists = await queryDB(`SELECT * FROM outline_docs WHERE metadata->>'id' = '${document.id}'`);
  if (documentExists?.length) {
    return true;
  }
  return false;
}

/**
 * Enriches a document with semantic meaning by adding parent document and collection information,
 * then generates chunks and loads them into the vector store.
 * 
 * This function performs the following steps:
 * 1. Fetches parent document title if parentDocumentId exists
 * 2. Fetches collection name if collectionId exists  
 * 3. Generates semantic chunks using AI decomposition
 * 4. Adds the generated chunks to the vector store
 * 
 * @param document - The document object to process and load
 * @param document.parentDocumentId - Optional ID of the parent document
 * @param document.collectionId - Optional ID of the collection
 * @param vectorStore - The PGVectorStore instance to add documents to
 * @returns Promise that resolves when the document has been processed and loaded
 * 
 * @throws Will throw an error if API requests fail or vector store operations fail
 * 
 * @example
 * ```typescript
 * await addSemanticMeaningAndLoadDoc(document, vectorStore);
 * ```
 */
const addSemanticMeaningAndLoadDoc = async (document: any, vectorStore: PGVectorStore) => {
  // Add parent document title to add more semantic meaning to the generated documents
  if (document.parentDocumentId) {
    const parentDocument = await requestDocumentById(document.parentDocumentId);
    document.parentDocument = parentDocument.title;
  }

  // Add collection title to add more semantic meaning to the generated documents
  if (document.collectionId) {
    const collection = await requestCollectionById(document.collectionId);
    document.collection = collection.name;
  }

  const generatedDocs = await generateDocumentChunks(document);
  if (generatedDocs.length) await vectorStore.addDocuments(generatedDocs);
}

/**
 * Processes an array of documents and loads them into the vector database.
 * 
 * This function:
 * 1. Initializes a connection to the PostgreSQL vector store
 * 2. Processes documents in parallel, skipping already loaded ones
 * 3. Enriches documents with semantic meaning and generates chunks
 * 4. Logs progress for each processed document
 * 
 * @param docs - Array of document objects to process and load
 * @returns Promise that resolves when all documents have been processed
 * 
 * @throws Will throw an error if vector store initialization fails
 * 
 * @example
 * ```typescript
 * const documents = [{ id: 'doc1', title: 'Guide 1' }, { id: 'doc2', title: 'Guide 2' }];
 * await loadDocsToVectorDB(documents);
 * ```
 */
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
        console.log(`Document ${document.parentDocument} > ${document.title} will be skipped because it was already uploaded. ${i}`);
        i++;
        return;
      };
      await addSemanticMeaningAndLoadDoc(document, vectorStore);
      console.log(`Document ${document.parentDocument} > ${document.title} was processed. Total documents processed: ${i}`);
      i++;
      return;
    })
  );
};

/**
 * Main ingestion function that retrieves all documents from Outline API and loads them into the vector database.
 * 
 * This function implements paginated retrieval to handle large document collections:
 * 1. Starts with the first page of documents (sorted by update date, descending)
 * 2. Loads the first batch into the vector database
 * 3. Continues with remaining pages if total documents exceed page size
 * 4. Logs completion when all documents are processed
 * 
 * The function uses a page size of 100 documents per request.
 * 
 * @returns Promise that resolves when the entire ingestion process is complete
 * 
 * @throws Will throw an error if API requests fail or database operations fail
 * 
 * @example
 * ```typescript
 * // Run the complete ingestion process
 * await ingest();
 * ```
 */
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
  console.log(chalk.green('Ingestion finished'));
};

ingest();