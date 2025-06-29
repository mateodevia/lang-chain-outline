import { ChatPromptTemplate } from '@langchain/core/prompts';
import chalk from 'chalk';
import { Document } from '@langchain/core/documents';
import { chunckerModel } from './llm-config';
import { OutlineDocument } from '../outline-api/types';
import { ExtendedOutlineDocument } from './types';
import { AGENTIC_CHUNKER_PROMPT } from './agentic-chunker-prompt';

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
    console.error(`${chalk.red(`Failed to generate document chunks for ${identifier}:`)} ${input}`);
    return [];
  }

  try {
    const parsedJson = JSON.parse(match[1]);
    if (Array.isArray(parsedJson)) {
      return parsedJson;
    } else {
      console.error(chalk.red(`No information found in ${identifier}:`));
      return [];
    }
  } catch (e) {
    console.error(chalk.red(`Failed to parse JSON in ${identifier}:`));
    return [];
  }
}


/**
 * Validates if a document is suitable for chunking based on various criteria.
 * 
 * @param document - The document object to validate
 * @returns {boolean} Returns true if the document is valid for chunking, false otherwise
 * 
 * The function checks if:
 * - Document has text content
 * - Text is not just newline characters
 * - Text length is within MAX_DOC_SIZE limit (if specified)
 * - Text contains non-whitespace characters after trimming
 */
const isDocumentValidForChunking = (document: ExtendedOutlineDocument) => {
  if (!document.text) {
    console.log(chalk.yellow(`${document.parentDocument} > ${document.title}  is empty. It will be skipped.`));
    return false;
  };
  
  if (/^(\n)+$/.test(document.text)) {
    console.log(chalk.yellow(`${document.parentDocument} > ${document.title} is empty. It will be skipped.`));
    return false;
  };

  if (process.env.MAX_DOC_SIZE && document.text.length > parseInt(process.env.MAX_DOC_SIZE)) {
    console.log(chalk.red(`${document.parentDocument} > ${document.title} is exceeds the size limit. It will be skipped.`));
    return false;
  };

  const trimmedText = document.text.trim();
  const hasOtherContent = trimmedText.length > 0 && !/^\s*$/.test(trimmedText);
  if (!hasOtherContent) {
    console.log(chalk.yellow(`${document.parentDocument} > ${document.title} is empty. It will be skipped.`));
    return false;
  }
  return true;
}

/**
 * Generates semantic chunks from a document using AI-powered decomposition.
 * 
 * This function takes a document and uses an LLM to break it down into atomic, 
 * self-contained propositions in Spanish. Each proposition represents a single 
 * piece of information that can be understood independently.
 * 
 * @param document - The document object to chunk, must contain text content and metadata
 * @param document.text - The markdown-formatted content to decompose
 * @param document.title - The document title
 * @param document.id - Unique document identifier
 * @param document.parentDocument - Parent document name for context
 * @param document.collection - Collection name for context
 * @returns Promise that resolves to an array of Document objects with chunked content and metadata
 * 
 * @throws Will log errors and return empty array if chunking fails or document is invalid
 * 
 * @example
 * ```typescript
 * const chunks = await generateDocumentChunks({
 *   id: 'doc-123',
 *   title: 'API Guide',
 *   text: '# Authentication\nOur API uses JWT tokens...',
 *   parentDocument: 'Developer Documentation',
 *   collection: 'Tech Docs'
 * });
 * ```
 */
export const generateDocumentChunks = async (document: ExtendedOutlineDocument) => {
  // Some texts have no information, so they should be skipped unnecesy LLM usage
  if (!isDocumentValidForChunking(document)) return [];

  const chunkerPrompt = ChatPromptTemplate.fromTemplate(AGENTIC_CHUNKER_PROMPT);
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
            collection: document.collectionName,
            updatedAt: document.updatedAt,
            createdAt: document.createdAt,
            publishedAt: document.publishedAt,
            deletedAt: document.deletedAt,
          },
        })
    );
  } catch (e) {
    console.error(`${chalk.red(`Failed to generate document chunks for ${document.parentDocument} > ${document.title}:`)} ${e}`);
    return [];
  }
};
