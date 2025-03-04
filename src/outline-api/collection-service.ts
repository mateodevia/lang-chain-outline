import axios from 'axios';

export const requestCollectionById = async (collectionId: string) => {
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
