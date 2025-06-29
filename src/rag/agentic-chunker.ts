import { ChatPromptTemplate } from '@langchain/core/prompts';
import chalk from 'chalk';
import { Document } from '@langchain/core/documents';
import { chunckerModel } from './llm-config';

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
const isDocumentValidForChunking = (document: any) => {
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
export const generateDocumentChunks = async (document: any) => {
  // Some texts have no information, so they should be skipped unnecesy LLM usage
  if (!isDocumentValidForChunking(document)) return [];

  const chunkerPrompt = ChatPromptTemplate.fromTemplate(
    `
You are tasked with decomposing a document from a tech company's knowledge base into atomic, self-contained propositions in Spanish.

## Input Context:
The following JSON object contains:
- "text": Markdown-formatted content to decompose
- "parentDocument": The parent document name
- "collection": The collection this document belongs to  
- "title": The document title
- "url": The document URL (if available)

## Task:
Transform the "text" content into atomic propositions - simple, standalone statements that:
1. Can be understood without additional context
2. Contain only one key piece of information each
3. Are written in clear, simple Spanish
4. Preserve the semantic meaning of the original content

## Processing Rules:

### Content Decomposition:
- Break compound sentences into simple sentences
- Separate each distinct fact, claim, or piece of information
- For named entities with descriptions, create separate propositions for the entity and its description
- Convert lists into individual propositions for each item

### Contextualization:
- Replace pronouns and ambiguous references with specific entity names
- Add necessary context from document metadata (title, parentDocument, collection) when it clarifies meaning
- Ensure each proposition is self-contained and interpretable independently

### Markdown Handling:
- Convert headings into contextual statements: "En [title], la sección [heading] explica que..."
- Transform links into: "El documento referencia [link text] en [URL]"
- Convert images into: "El documento [title] incluye una imagen que muestra [description]"
- Transform tables into individual propositions for each meaningful data point

### Quality Standards:
- Use simple, direct language in Spanish
- Avoid technical jargon unless necessary for accuracy
- Ensure factual accuracy and completeness
- Maintain logical flow and relationships between concepts

## Output Format:
Return a JSON array of strings. Each string should be one atomic proposition.
If the input text is empty or contains no meaningful information, return an empty array: []

## Example Input:
"text": "# API Authentication\nOur API uses JWT tokens. Users must include the token in the Authorization header.\n\n![auth-flow](auth.png)"knowledge

  ## Example Output:
  [
    "La API de la empresa utiliza tokens JWT para autenticación",
    "Los usuarios deben incluir el token JWT en el header de Authorization",
    "El documento de autenticación de API incluye una imagen llamada auth-flow que muestra el flujo de autenticación"
  ]

## Document to Process:
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
    console.error(`${chalk.red(`Failed to generate document chunks for ${document.parentDocument} > ${document.title}:`)} ${e}`);
    return [];
  }
};
