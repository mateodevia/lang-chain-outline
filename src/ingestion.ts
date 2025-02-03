import axios from 'axios';
import * as fsPromises from 'fs/promises';
import { JSONLoader } from 'langchain/document_loaders/fs/json';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { PGVectorStore } from '@langchain/community/vectorstores/pgvector';
import { OllamaEmbeddings } from '@langchain/ollama';
import async from 'async';

require('dotenv').config();

const pageSize = 100;

const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: 1000,
  chunkOverlap: 200,
});

const embeddings = new OllamaEmbeddings({
  model: 'deepseek-r1:8b',
});

const loadDocs = async (docs: any[]) => {
  const vectorStore = await PGVectorStore.initialize(embeddings, {
    tableName: 'outline_docs',
    postgresConnectionOptions: {
      connectionString: process.env.PG_CONNECTION_STRING,
    },
  });
  let i = 0;
  await Promise.all(
    docs.map(async (document) => {
      await fsPromises.writeFile(
        `./domain-knowledge/${document.id}.json`,
        JSON.stringify(document)
      );
      const loader = new JSONLoader(`./domain-knowledge/${document.id}.json`, [
        '/title',
        '/text',
        '/updatedAt',
        '/createdAt',
        '/publishedAt',
        '/deletedAt',
        '/id',
        '/tags',
        '/collectionId',
        '/parentDocumentId',
      ]);
      const langChainDocs = await loader.load();
      const allSplits = await splitter.splitDocuments(langChainDocs);
      await vectorStore.addDocuments(allSplits);
      i++;
      console.log(`Document ${document.title} was uploaded. Total: ${i}`);
      return;
    })
  );
};

const requestLatestOutlineDocs = async (p: { page: number }) => {
  const { page } = p;
  console.log(
    `Requesting page ${page}: offset=${page * pageSize}, limit=${pageSize}`
  );
  return axios.post(
    `${process.env.OUTLINE_URL}/api/documents.list`,
    {
      offset: page * pageSize,
      limit: pageSize,
      sort: 'updatedAt',
      direction: 'DESC',
    },
    {
      headers: {
        'content-type': 'application/json',
        accept: 'application/json',
        Authorization: `Bearer ${process.env.OUTLINE_API_KEY}`,
      },
    }
  );
};

const ingestDocsToVectorDB = async () => {
  let page = 0;
  const response = await requestLatestOutlineDocs({ page });
  await loadDocs(response.data.data);

  // Check if there are more documents to load
  console.log(`Total documents: ${response.data.pagination.total}`);
  if (response.data.pagination.total > pageSize) {
    const totalPages = Math.ceil(response.data.pagination.total / pageSize);
    console.log(`Total pages: ${totalPages}`);
    for (let i = 1; i < totalPages; i++) {
      const response = await requestLatestOutlineDocs({ page: i });
      await loadDocs(response.data.data);
    }
  }
};

ingestDocsToVectorDB();
