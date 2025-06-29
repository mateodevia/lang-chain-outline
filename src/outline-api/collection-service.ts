import axios from 'axios';
import { OutlineCollection } from './types';

/**
 * Retrieves collection information from the Outline API by collection ID.
 * 
 * @param collectionId - The unique identifier of the collection to retrieve
 * @returns Promise that resolves to the OutlineCollection object containing collection details
 * 
 * @throws Will throw an error if the API request fails or if authentication is invalid
 * 
 * @example
 * ```typescript
 * const collection = await requestCollectionById('351011ed-d7e5-49cc-b07c-257b562d15e9');
 * console.log(collection.name); // Collection name
 * ```
 */
export const requestCollectionById = async (collectionId: string): Promise<OutlineCollection> => {
    return (await axios.post(
        `${process.env.OUTLINE_URL}/api/collections.info`,
        {
            id: collectionId,
        },
        {
            headers: {
                'content-type': 'application/json',
                accept: 'application/json',
                Authorization: `Bearer ${process.env.OUTLINE_API_KEY}`,
            },
        }
    )).data;
};
