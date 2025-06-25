#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { getRAG } from '../rag';

interface RAGServerConfig {
  name: string;
  version: string;
}

interface QueryState {
  question: string;
}

class RAGMCPServer {
  private server: Server;
  private ragAgent: any;

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

  private async initializeRAG() {
    if (!this.ragAgent) {
      console.error('Initializing RAG agent...');
      this.ragAgent = await getRAG();
    }
  }

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

  private setupErrorHandling() {
    this.server.onerror = (error) => {
      console.error('[MCP Error]', error);
    };

    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

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