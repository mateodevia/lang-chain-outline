import { PGVectorStore } from '@langchain/community/vectorstores/pgvector';
import { requestDocumentById, requestLatestOutlineDocs } from '../outline-api/document-service';
import { requestCollectionById } from '../outline-api/collection-service';
import { generateDocumentChunks } from './agentic-chunker';
import { embeddingModel } from './llm-config';
import { queryDB } from '../database/database';
import chalk from 'chalk';
import { OutlineDocument } from '../outline-api/types';
import { ExtendedOutlineDocument } from './types';

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
const documentWasAlreadyLoaded = async(document: OutlineDocument) => {
  const documentExists = await queryDB(`SELECT * FROM outline_docs WHERE metadata->>'id' = '${document.id}'`);
  if (documentExists?.length) {
    return true;
  }
  return false;
}

/**
 * Enriches a document with semantic meaning by adding parent document and collection information.
 * 
 * This function performs the following steps:
 * 1. Fetches parent document title if parentDocumentId exists
 * 2. Fetches collection name if collectionId exists
 * 3. Returns the enriched document
 * 
 * @param document - The document object to enrich
 * @param document.parentDocumentId - Optional ID of the parent document
 * @param document.collectionId - Optional ID of the collection
 * @returns Promise that resolves to the enriched document with parent and collection info
 * 
 * @throws Will throw an error if API requests to fetch parent or collection info fail
 * 
 * @example
 * ```typescript
 * const extendedDocument = await addSemanticMeaningAndLoadDoc(document);
 * ```
 */
const addSemanticMeaningAndLoadDoc = async (document: OutlineDocument): Promise<ExtendedOutlineDocument> => {
  const extendedDocument: ExtendedOutlineDocument = {
    ...document,
    parentDocument: '',
    collectionName: ''
  };

  // Add parent document title to add more semantic meaning to the generated documents
  if (document.parentDocumentId) {
    const parentDocument = await requestDocumentById(document.parentDocumentId);
    extendedDocument.parentDocument = parentDocument.title;
  }

  // Add collection title to add more semantic meaning to the generated documents
  if (document.collectionId) {
    const collection = await requestCollectionById(document.collectionId);
    extendedDocument.collectionName = collection.name;
  }

  return extendedDocument;
}

/**
 * Processes an array of documents and loads them into the vector database.
 * 
 * This function:
 * 1. Initializes a connection to the PostgreSQL vector store
 * 2. Processes documents in parallel, skipping already loaded ones
 * 3. Enriches documents with semantic meaning and generates chunks
 * 4. Loads generated chunks into the vector store
 * 5. Logs progress for each processed document
 * 
 * @param docs - Array of document objects to process and load. Each document should have:
 *   - id: Unique identifier
 *   - title: Document title
 *   - text: Document content
 *   - parentDocumentId?: Optional ID of parent document
 *   - collectionId?: Optional ID of collection
 * @returns Promise<void> Resolves when all documents have been processed
 * 
 * @throws Will throw an error if:
 * - Vector store initialization fails
 * - Document processing fails
 * - Vector store operations fail
 * 
 * @example
 * ```typescript
 * const documents = [{ id: 'doc1', title: 'Guide 1' }, { id: 'doc2', title: 'Guide 2' }];
 * await loadDocsToVectorDB(documents);
 * ```
 */
const loadDocsToVectorDB = async (docs: OutlineDocument[]) => {
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
        console.log(`Document ${document.title} will be skipped because it was already uploaded. ${i}`);
        i++;
        return;
      };
      const extendedDocument = await addSemanticMeaningAndLoadDoc(document);

      const generatedDocs = await generateDocumentChunks(extendedDocument);
      
      if (generatedDocs.length) await vectorStore.addDocuments(generatedDocs);
      
      console.log(`Document ${document.title} was processed. Total documents processed: ${i}`);
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