import axios from 'axios';
import * as fsPromises from 'fs/promises';
require('dotenv').config();

const pageSize = 100;

const saveDocs = async (docs: any[]) => {
    for (let document of docs) {
        await fsPromises.writeFile(`./domain-knowledge/${document.id}.json`, JSON.stringify({
            title: document.title,
            text: document.text,
            updatedAt: document.updatedAt,
            createdAt: document.createdAt,
            publishedAt: document.publishedAt,
            deletedAt: document.deletedAt,
            id: document.id,
            tags: document.tags,
            collectionId: document.collectionId,
            parentDocumentId: document.parentDocumentId,
        }));
    }
}

const requestLatestOutlineDocs = async (p: { page: number }) => {
    const { page } = p;
    console.log(`Requesting page ${page}: offset=${page * pageSize}, limit=${pageSize}`);
    return axios.post(
        `${process.env.OUTLINE_URL}/api/documents.list`,
        {
            offset: page * pageSize,
            limit: pageSize,
            sort: "updatedAt",
            direction: "DESC"
        },
        {
            headers: {
                'content-type': 'application/json',
                'accept': 'application/json',
                'Authorization': `Bearer ${process.env.OUTLINE_API_KEY}`
            }
        }
    );
}

const loadDocs = async () => {
    let page = 0;
    const response = await requestLatestOutlineDocs({ page });
    await saveDocs(response.data.data);

    // Check if there are more documents to load
    console.log(`Total documents: ${response.data.pagination.total}`);
    if (response.data.pagination.total > pageSize) {
        const totalPages = Math.ceil(response.data.pagination.total / pageSize);
        console.log(`Total pages: ${totalPages}`);
        for (let i = 1; i < totalPages; i++) {
            const response = await requestLatestOutlineDocs({ page: i });
            await saveDocs(response.data.data);
        }
    }
};

loadDocs();
