import { ChatPromptTemplate } from '@langchain/core/prompts';
import { ChatOllama } from '@langchain/ollama';
import { ChatGroq } from '@langchain/groq';
import { Document } from '@langchain/core/documents';
import { chunckerModel } from './LLMs';

require('dotenv').config();

/**
 * Extracts JSON content from markdown-style triple backtick code blocks
 * @param input String containing markdown with code blocks
 * @param identifier Identifier of the code block to extract
 * @returns Parsed JSON object
 */
function extractJsonFromBackticks(input: string, identifier: string): string[] {
  // Regular expression to match content between triple backticks
  const codeBlockRegex = /```json\s*\n([\s\S]*?)\n```/gm;

  const match = codeBlockRegex.exec(input);
  if (!match || !match[1]) {
    console.error(`No code block found in for ${identifier}`);
    return [];
  }

  try {
    const parsedJson = JSON.parse(match[1]);
    if (Array.isArray(parsedJson)) {
      return parsedJson;
    } else {
      console.error(`No information found in ${identifier}`);
      return [];
    }
  } catch (e) {
    console.error(`Failed to parse JSON in ${identifier}`);
    return [];
  }
}

export const generateDocumentChunks = async (document: any) => {
  const chunkerPrompt = ChatPromptTemplate.fromTemplate(
    `
The following json object is part of a kwoledge base of a tech company.
Decompose the "text" property into clear and simple propositions, ensuring they are interpretable out of context.
The "text" property is written in Markdown format.
The propositions should be structured as simple sentences in spanish.
Always take into account the "parentDocument", "collection", "title", and "url" properties of the json to add more semantic meaning to the generated propositions and to add extra context to the preposition.
If there are resources such as images, tables, or external links, add them as propositios with the necessary context so that they can be retrieved later.

1. Split compound sentence into simple sentences in spanish. Maintain the original phrasing from the input
whenever possible.
2. For any named entity that is accompanied by additional descriptive information, separate this
information into its own distinct proposition.
3. Decontextualize the proposition by adding necessary modifier to nouns or entire sentences
and replacing pronouns (e.g., "el", "la", "los" "las", "esto", "este", "esta", "eso", "ese", "esa") with the full name of the
entities they refer to.
4. Always present the results as a list of strings, formatted as a JSON array.

{document}
`
  );
  const chain = chunkerPrompt.pipe(chunckerModel);
  try {
    const response = await chain.invoke({ document });

    const chunks = extractJsonFromBackticks(
      response.content.toString(),
      document.title
    );
    return chunks.map(
      (chunk) =>
        new Document({
          pageContent: chunk,
          metadata: {
            id: document.id,
            title: document.title,
            parentDocumentId: document.parentDocumentId,
            parentDocument: document.parentDocument,
            collectionId: document.collectionId,
            collection: document.collection,
            updatedAt: document.updatedAt,
            createdAt: document.createdAt,
            publishedAt: document.publishedAt,
            deletedAt: document.deletedAt,
            tags: document.tags,
          },
        })
    );
  } catch (e) {
    console.error(`Failed to generate document chunks for ${document.title}`);
    return [];
  }
};
