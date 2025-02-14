import axios from 'axios';

export const requestLatestOutlineDocs = async (p: {
  page: number;
  pageSize: number;
}) => {
  const { page, pageSize } = p;

  console.log(
    `Requesting page ${page}: offset=${page * pageSize}, limit=${pageSize}`
  );
  return (await axios.post(
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
  )).data;
};

export const requestDocumentById = async (documentId: string) => {
    return (await axios.post(
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
    )).data;
};