# Outline RAG

A **Retrieval Augmented Generation (RAG) system** that transforms your [Outline](https://www.getoutline.com/) knowledge base into an intelligent, queryable AI assistant. This project ingests documentation from Outline, processes it using advanced chunking techniques, and provides a conversational interface powered by large language models.

> **⚠️ Disclaimer:** This is not a production-ready project, read the
[Project Reflection & Recommendations](#-project-reflection--recommendations) before using this project in a real-world scenario.

## 🎯 What This Project Does

This system creates a bridge between your Outline documentation and AI, enabling you to:

- **Query your knowledge base** using natural language questions
- **Get contextual answers** based on your actual documentation content
- **Access your knowledge** through multiple interfaces (chat, MCP server)
- **Maintain up-to-date** embeddings of your documentation

### Key Features

- 🔄 **Ingestion**: Fetches and processes documents from Outline API
- 🧠 **Intelligent Chunking**: Uses agentic chunking to create semantically meaningful document segments
- 🔍 **Vector Search**: Leverages PostgreSQL with pgvector for fast similarity search
- 🤖 **AI-Powered Responses**: Uses LLM models for generation and embeddings
- 🔌 **MCP Integration**: Exposes functionality through Model Context Protocol for external clients
- 💬 **Interactive Chat**: Exposes a cli-base chat interface for querying your RAG locally

## 🏗️ Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Outline API   │───▶│   Ingestion      │───▶│  Vector Store   │
│  (Documents)    │    │ (Agentic Chunker)│    │(PostgreSQL +    │
│                 │    │                  │    │  pgvector)      │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                                          │
                                                          ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│  Chat Interface │◄───│   RAG Workflow   │◄───│   Retriever     │
│  or MCP Client  │    │ (LangGraph +     │    │                 │
│                 │    │  LangChain)      │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL database with pgvector extension
- Outline instance with API access
- API keys for Groq and Hugging Face

### 1. Installation

```bash
git git clone https://github.com/mateodevia/agentic-rag-outline.git
cd agentic-rag-outline
npm install
```

### 2. Environment Setup

Create a `.env` file with the following variables:

```env
# Database Configuration
PG_CONNECTION_STRING=postgresql://user:password@localhost:5432/your_db

# Outline API Configuration
OUTLINE_URL=https://your-outline-instance.com
OUTLINE_API_KEY=your_outline_api_key

# AI Model Configuration
GROQ_API_KEY=your_groq_api_key
HUGGINGFACEHUB_API_KEY=your_huggingface_api_key

# Optional: LangSmith Tracing
LANGSMITH_TRACING=false
LANGSMITH_API_KEY=your_langsmith_api_key
```

### 3. Database Setup

Ensure your PostgreSQL database has the pgvector extension installed:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

### 4. Ingest Your Data

```bash
# Development mode
npm run dev:ingest

# Production mode
npm run start:ingest
```

### 5. Start Querying

#### Option A: Chat Interface
```bash
# Development mode
npm run dev:chat

# Production mode
npm run start:chat
```
```
╔════════════════════════════════════════╗
║          AI Assistant Terminal         ║
╚════════════════════════════════════════╝

Welcome to the interactive chat interface!
Type your questions or use the following commands:
/context - Toggle context visibility
/exit    - Quit the application
/help    - Show this help message

───────────────────────────────────────────

You: How do I set up API authentication in Outline?

You: How do I set up API authentication in Outline?
Assistant: To set up API authentication for your Outline instance, you need to configure the following environment variables in your .env file:

1. OUTLINE_URL - Your Outline instance URL (e.g., https://your-outline-instance.com)
2. OUTLINE_API_KEY - Your Outline API key

You can obtain your API key from your Outline settings under the API section. Make sure the API key has the necessary permissions to read documents and collections.

───────────────────────────────────────────

You: /context

Context visibility is now ON

You: What are the main features?

You: What are the main features?
Assistant: Based on your documentation, the main features include:
- Intelligent document ingestion from Outline
- Advanced agentic chunking for better context
- Vector search using PostgreSQL + pgvector
- AI-powered responses using LLM models
- Multiple interfaces (chat and MCP server)

Context: [Retrieved documents would appear here in magenta when context is enabled]

───────────────────────────────────────────

You: 
```

#### Option B: MCP Server (for integration with MCP clients like Claude Desktop or Cursor)
```bash
# Development mode
npm run dev:mcp

# Production mode
npm run start:mcp
```
To get more information on how to setup your MCP server check the `MCP-README.md` file

## 🔄 How It Works

### 1. Data Ingestion (`src/rag/ingestion.ts`)
- Fetches documents from your Outline instance using the API
- Enriches documents with semantic context (parent documents, collections)
- Intelligent Chunking (`src/rag/agentic-chunker.ts`)
  - Uses an agentic approach to create semantically coherent chunks
  - Maintains context and relationships between document sections
  - Optimizes chunk size for embedding and retrieval performance
- Generates embeddings and stores them in PostgreSQL with pgvector

### 2. RAG Workflow (`src/rag/rag-workflow.ts`)
- **Retrieval**: Performs similarity search to find relevant document chunks
- **Generation**: Uses retrieved context to generate answers with LLM
- Built with LangGraph for robust pipeline management

### 3. Multiple Interfaces
- **Chat Interface**: Direct conversation with your knowledge base
- **MCP Server**: Standardized protocol for integration with AI assistants


## 🛠️ Technology Stack

- **TypeScript/Node.js**: Core runtime and type safety
- **Lang Chain & LangGraph**: RAG workflow orchestration and LLM management
- **PostgreSQL + pgvector**: Vector database for embeddings
- **Model Context Protocol**: Standardized AI tool integration
- **Multiple LLMs**: Easily interchangeble LLMs for each process
  - **Groq**: Used for chunking and RAG Queriying
  - **Hugging Face**: Used for vector embeding

## 📁 Project Structure

```
src/
├── database/           # Database connection and utilities
├── interfaces/         # Chat and MCP server interfaces
├── outline-api/        # Outline API integration
├── rag/               # RAG pipeline components
│   ├── ingestion.ts   # Document ingestion workflow
│   ├── rag-workflow.ts # Main RAG pipeline
│   ├── agentic-chunker.ts # Intelligent document chunking
│   └── retriever.ts   # Vector search configuration
```

## 📝 Project Reflection & Recommendations

This project was developed as an **educational exploration** of advanced RAG (Retrieval Augmented Generation) architectures, focusing on learning and experimentation rather than production deployment. 

### Key Learnings

Through this implementation, we discovered that **simpler approaches often yield better results** with significantly less complexity. For production use cases requiring Outline integration, we recommend evaluating simpler alternatives such as [this MCP Outline implementation](https://github.com/fellowapp/mcp-outline), which offers:

- **Reduced complexity**: Easier to understand, implement, and maintain
- **Faster setup**: Minimal configuration requirements
- **Lower barrier to entry**: Less technical overhead for teams, and lower deployment costs

### Recommendation

Before implementing this solution, we encourage you to **evaluate simpler alternatives** that may better suit your specific use case and technical requirements. This project serves as a valuable learning resource for understanding advanced RAG patterns, but most be over-engineered for many practical applications.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request