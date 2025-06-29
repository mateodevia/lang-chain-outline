export const AGENTIC_CHUNKER_PROMPT = `
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