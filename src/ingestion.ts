import * as fsPromises from 'fs/promises';
import { TextLoader } from 'langchain/document_loaders/fs/text';
import { MarkdownTextSplitter } from '@langchain/textsplitters';
import { PGVectorStore } from '@langchain/community/vectorstores/pgvector';
import { OllamaEmbeddings } from '@langchain/ollama';
import { requestDocumentById, requestLatestOutlineDocs } from './outline-api/document-service';
import { requestCollectionById } from './outline-api/collection-service';
import { Document } from '@langchain/core/documents';

require('dotenv').config();

const splitter = new MarkdownTextSplitter({
  chunkSize: 400,
  chunkOverlap: 0,
});

const embeddings = new OllamaEmbeddings({
  model: 'deepseek-r1:8b',
});

const generateDocumentChunks = async (document: any) => {
    return await splitter.splitDocuments([
      new Document({ pageContent: `# ${document.title}\n${document.text}` }),
    ]);
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

  // Add relevant metadata to the generated documents
  generatedDocs.forEach((doc) => {
    doc.metadata['title'] = document.title;
    doc.metadata['parent_document'] = document.parentDocument;
    doc.metadata['collection'] = document.collection;
    doc.metadata['updated_at'] = document.updatedAt;
    doc.metadata['created_at'] = document.createdAt;
    doc.metadata['published_at'] = document.publishedAt;
    doc.metadata['deleted_at'] = document.deletedAt;
    doc.metadata['tags'] = document.tags;
  });
  
  await vectorStore.addDocuments(generatedDocs);
}

const loadDocsToVectorDB = async (docs: any[]) => {
  const vectorStore = await PGVectorStore.initialize(embeddings, {
    tableName: 'outline_docs',
    postgresConnectionOptions: {
      connectionString: process.env.PG_CONNECTION_STRING,
    },
  });
  let i = 0;
  await Promise.all(
    docs.map(async (document) => {
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
