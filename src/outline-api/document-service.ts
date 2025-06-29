import axios from 'axios';
import { OutlineDocumentsListResponse, OutlineDocument } from './types';

/**
 * Retrieves a paginated list of the latest Outline documents, sorted by update date in descending order.
 * 
 * @param p - Pagination parameters
 * @param p.page - The page number (0-based)
 * @param p.pageSize - The number of documents to retrieve per page
 * @returns Promise that resolves to OutlineDocumentsListResponse with documents and pagination info
 * 
 * @throws Will throw an error if the API request fails or if authentication is invalid
 * 
 * @todo Remove hardcoded collectionId and make it configurable
 * 
 * @example
 * ```typescript
 * const response = await requestLatestOutlineDocs({ page: 0, pageSize: 50 });
 * console.log(`Total documents: ${response.pagination.total}`);
 * console.log(`Documents on this page: ${response.data.length}`);
 * ```
 */
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

/**
 * Retrieves detailed information for a specific Outline document by its ID.
 * 
 * @param documentId - The unique identifier of the document to retrieve
 * @returns Promise that resolves to the OutlineDocument object containing full document details
 * 
 * @throws Will throw an error if the API request fails, document is not found, or authentication is invalid
 * 
 * @example
 * ```typescript
 * const document = await requestDocumentById('doc-123-456');
 * console.log(document.title); // Document title
 * console.log(document.text);  // Document content
 * ```
 */
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