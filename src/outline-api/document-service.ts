import axios from 'axios';
import { OutlineDocumentsListResponse, OutlineDocument } from './types';

export const requestLatestOutlineDocs = async (p: {
  page: number;
  pageSize: number;
}): Promise<OutlineDocumentsListResponse> => {
  const { page, pageSize } = p;

  console.log(
    `Requesting page ${page}: offset=${page * pageSize}, limit=${pageSize}`
  );
  const response = await axios.post(
    `${process.env.OUTLINE_URL}/api/documents.list`,
    {
      offset: page * pageSize,
      limit: pageSize,
      sort: 'updatedAt',
      direction: 'DESC',
      collectionId: '351011ed-d7e5-49cc-b07c-257b562d15e9', // TODO: Remove this
    },
    {
      headers: {
        'content-type': 'application/json',
        accept: 'application/json',
        Authorization: `Bearer ${process.env.OUTLINE_API_KEY}`,
      },
    }
  );
  return response.data;
};

export const requestDocumentById = async (documentId: string): Promise<OutlineDocument> => {
    const response = await axios.post(
        `${process.env.OUTLINE_URL}/api/documents.info`,
        {
            id: documentId,
        },
        {
            headers: {
                'content-type': 'application/json',
                accept: 'application/json',
                Authorization: `Bearer ${process.env.OUTLINE_API_KEY}`,
            },
        }
    );
    return response.data.data;
};