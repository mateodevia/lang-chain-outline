# RAG Agent MCP Server

This MCP exposes a RAG (Retrieval-Augmented Generation) agent that will answer questions about your outline knwoledge base, allowing other applications to interact with your knowledge base through standardized tools.

## What is MCP?

The Model Context Protocol (MCP) is an open standard that enables AI applications to securely access external data sources and tools. By implementing an MCP server, your RAG agent can be used by any MCP-compatible client.

## Features

The MCP server exposes two main tools:

1. **`rag_query`** - Query your RAG system with a question and get a complete answer
2. **`rag_stream_query`** - Stream queries for real-time responses (currently returns final result due to MCP limitations)

## Setup

### Prerequisites

1. Make sure you have your PostgreSQL database set up with vector embeddings (run your ingestion process first). To load your data into the database use the command `npm run ingest`
2. Ensure all environment variables are properly configured (see your `.env` file)

### Running the MCP Server

#### Development Mode
```bash
npm run mcp-server
```

#### Production Mode
```bash
npm run build
npm run mcp-server:build
```

## Connecting to MCP Clients

Use the `mcp-server-config-example.json` file as a reference for connecting to other MCP-compatible applications.

## Tool Usage

Once connected, you can use the following tools in your MCP client:

### Query the RAG System
```
Use the rag_query tool with a question about your knowledge base
```

Example questions you might ask:
- "What are the main topics covered in the documentation?"
- "How do I implement feature X?"
- "What are the best practices for Y?"

## Architecture

The MCP server:
1. Initializes your RAG agent (vector store + LLM)
2. Exposes tools through the MCP protocol
3. Handles queries by invoking your RAG pipeline
4. Returns formatted responses to the client

## Troubleshooting

### Common Issues

1. **"Module not found" errors**: Make sure you've run `npm run build` before using the production mode
2. **Database connection issues**: Verify your `PG_CONNECTION_STRING` environment variable
3. **API key errors**: Check that your `GROQ_API_KEY` and `HUGGINGFACEHUB_API_KEY` are set correctly

### Debugging

The server logs to stderr, so you can see what's happening:
- Initialization messages
- Query processing logs
- Error messages

### Testing the Server

You can test the server manually by running it and checking that it starts without errors:

```bash
npm run mcp-server
# Should output: "RAG MCP Server running on stdio"
```

## Environment Variables Required

Make sure these are set in your environment or `.env` file:
- `PG_CONNECTION_STRING` - Your PostgreSQL connection string to the DB where you are planning to store your chunked data for retrieval
- `HUGGINGFACEHUB_API_KEY` - Your Hugging Face API key for embeddings
- `GROQ_API_KEY` - Your Groq API key for the chat model
- `OUTLINE_URL` - Your outline instance url
- `OUTLINE_API_KEY` - Your outline instance API KEY
- `LANGSMITH_TRACING` -  If true, then loging will be sent to your LangSmith service
- `LANGSMITH_API_KEY` - The API KEY for our LangSmith service

## Next Steps

1. Build and test the MCP server
2. Configure your MCP client (like Claude Desktop)
3. Start asking questions about your knowledge base!

The RAG agent will use your existing vector database and provide answers based on the documents you've ingested. 