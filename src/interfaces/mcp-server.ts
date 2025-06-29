#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { getRAG } from '../rag/rag-workflow';

interface RAGServerConfig {
  name: string;
  version: string;
}

interface QueryState {
  question: string;
}

/**
 * Model Context Protocol (MCP) server for RAG (Retrieval-Augmented Generation) functionality.
 * 
 * This class implements an MCP server that exposes RAG capabilities as tools that can be
 * called by MCP clients. It provides both standard and streaming query capabilities
 * for interacting with the knowledge base.
 */
class RAGMCPServer {
  private server: Server;
  private ragAgent: any;

  /**
   * Creates a new RAGMCPServer instance.
   * 
   * @param config - Configuration object for the server
   * @param config.name - The name of the MCP server
   * @param config.version - The version of the MCP server
   */
  constructor(config: RAGServerConfig) {
    this.server = new Server(
      {
        name: config.name,
        version: config.version,
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
    this.setupErrorHandling();
  }

  /**
   * Initializes the RAG agent if it hasn't been initialized yet.
   * 
   * This method is called lazily when the first tool request is received
   * to avoid initializing the RAG system during server startup.
   * 
   * @returns Promise that resolves when the RAG agent is ready
   * 
   * @throws Will throw an error if RAG initialization fails
   */
  private async initializeRAG() {
    if (!this.ragAgent) {
      console.error('Initializing RAG agent...');
      this.ragAgent = await getRAG();
    }
  }

  /**
   * Sets up tool handlers for the MCP server.
   * 
   * Configures handlers for:
   * - ListToolsRequest: Returns available tools (rag_query and rag_stream_query)
   * - CallToolRequest: Executes the requested tool with provided arguments
   * 
   * Both tools accept a 'question' parameter and return AI-generated answers
   * based on the knowledge base content.
   */
  private setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'rag_query',
            description: 'Query the RAG system with a question to get an answer based on the knowledge base',
            inputSchema: {
              type: 'object',
              properties: {
                question: {
                  type: 'string',
                  description: 'The question to ask the RAG system',
                },
              },
              required: ['question'],
            },
          },
          {
            name: 'rag_stream_query',
            description: 'Stream a query to the RAG system with real-time response chunks',
            inputSchema: {
              type: 'object',
              properties: {
                question: {
                  type: 'string',
                  description: 'The question to ask the RAG system',
                },
              },
              required: ['question'],
            },
          },
        ] satisfies Tool[],
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        await this.initializeRAG();

        switch (name) {
          case 'rag_query': {
            const { question } = args as { question: string };
            
            if (!question) {
              throw new Error('Question is required');
            }

            console.error(`Processing RAG query: ${question}`);
            
            const initialState: QueryState = { question };
            const result = await this.ragAgent.invoke(initialState);
            
            return {
              content: [
                {
                  type: 'text',
                  text: result.answer || 'No answer generated',
                },
              ],
            };
          }

          case 'rag_stream_query': {
            const { question } = args as { question: string };
            
            if (!question) {
              throw new Error('Question is required');
            }

            console.error(`Processing streaming RAG query: ${question}`);
            
            const initialState: QueryState = { question };
            
            // For streaming, we'll collect the stream and return the final result
            // Note: MCP doesn't support true streaming yet, so we collect and return
            let answer = '';
            const stream = await this.ragAgent.stream(initialState);
            
            for await (const chunk of stream) {
              if (chunk.generate && chunk.generate.answer) {
                answer = chunk.generate.answer;
              }
            }
            
            return {
              content: [
                {
                  type: 'text',
                  text: answer || 'No answer generated',
                },
              ],
            };
          }

          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        console.error(`Error in tool ${name}:`, error);
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  /**
   * Sets up error handling for the MCP server.
   * 
   * Configures:
   * - Server error handler for logging MCP-related errors
   * - SIGINT handler for graceful shutdown when the process is interrupted
   */
  private setupErrorHandling() {
    this.server.onerror = (error) => {
      console.error('[MCP Error]', error);
    };

    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  /**
   * Starts the MCP server using stdio transport.
   * 
   * This method connects the server to stdio transport, allowing it to
   * communicate with MCP clients through standard input/output streams.
   * 
   * @returns Promise that resolves when the server is running
   * 
   * @throws Will throw an error if server startup fails
   */
  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('RAG MCP Server running on stdio');
  }
}

// Run the server
const server = new RAGMCPServer({
  name: 'rag-agent-server',
  version: '1.0.0',
});

server.run().catch((error) => {
  console.error('Failed to run server:', error);
  process.exit(1);
}); 