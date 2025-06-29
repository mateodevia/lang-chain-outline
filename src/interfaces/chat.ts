import { getRAG } from '../rag/rag-workflow';
import chalk from 'chalk';
import inquirer from 'inquirer';
import readline from 'readline';
import { createInterface } from 'readline/promises';
require('dotenv').config();

/**
 * Interactive chat interface for the RAG (Retrieval-Augmented Generation) system.
 * 
 * This class provides a terminal-based chat interface that allows users to:
 * - Ask questions and receive AI-generated answers
 * - Toggle context visibility to see retrieved documents
 * - Use commands for interface control
 * - Get help and exit the application
 */
class ChatInterface {
  private showContext = false;
  private readonly rag: any;
  private readonly rl: readline.Interface;

  /**
   * Creates a new ChatInterface instance.
   * 
   * @param rag - The RAG system instance used for processing questions
   */
  constructor(rag: any) {
    this.rag = rag;
    this.rl = createInterface({
      input: process.stdin,
      output: process.stdout,
    });
  }

  /**
   * Initializes and starts the chat interface.
   * 
   * This method clears the console, displays the welcome message,
   * and begins the main chat loop.
   * 
   * @returns Promise that resolves when the chat interface is running
   */
  async initialize() {
    console.clear();
    this.printWelcomeMessage();
    await this.runChatLoop();
  }

  /**
   * Displays the welcome message and available commands to the user.
   * 
   * Shows a formatted header with the application name and lists
   * all available commands with their descriptions.
   */
  private printWelcomeMessage() {
    console.log(chalk.yellow.bold('╔════════════════════════════════════════╗'));
    console.log(chalk.yellow.bold('║          AI Assistant Terminal         ║'));
    console.log(chalk.yellow.bold('╚════════════════════════════════════════╝'));
    console.log(chalk.cyan('\nWelcome to the interactive chat interface!'));
    console.log(chalk.cyan('Type your questions or use the following commands:'));
    console.log(chalk.green('/context') + ' - Toggle context visibility');
    console.log(chalk.green('/exit') + '    - Quit the application');
    console.log(chalk.green('/help') + '    - Show this help message\n');
    console.log(chalk.yellow('───────────────────────────────────────────\n'));
  }

  /**
   * Processes user input, either executing commands or sending questions to the RAG system.
   * 
   * @param input - The user input string to process
   * @returns Promise that resolves when input processing is complete
   * 
   * @throws Will log errors if RAG system fails to process the question
   */
  private async handleInput(input: string) {
    if (input.startsWith('/')) {
      this.handleCommand(input);
      return;
    }

    chalk.yellow('Processing your question...');
    
    try {
      const result = await this.rag.invoke({ question: input });
      
      chalk.green('Response received:');
      
      this.printMessage('You', input, chalk.blue);
      this.printMessage('Assistant', result['answer'].split('</think>')[1], chalk.green);
      
      if (this.showContext) {
        this.printMessage('Context', result['context'], chalk.magenta);
      }
      
      console.log(chalk.yellow('───────────────────────────────────────────\n'));
    } catch (error: any) {
      chalk.red('Failed to process request');
      console.error(chalk.red(`Error: ${error.message}\n`));
    }
  }

  /**
   * Formats and prints a message with a colored sender label.
   * 
   * @param sender - The name of the message sender (e.g., 'You', 'Assistant', 'Context')
   * @param text - The message content to display
   * @param color - The chalk color function to apply to the sender label
   */
  private printMessage(sender: string, text: string, color: chalk.Chalk) {
    const formattedSender = color.bold(`${sender}:`);
    const message = `${formattedSender} ${text}\n`;
    console.log(message);
  }

  /**
   * Handles command execution based on user input.
   * 
   * Supports the following commands:
   * - /exit: Terminates the application
   * - /context: Toggles visibility of retrieved context documents
   * - /help: Shows the welcome message with available commands
   * 
   * @param command - The command string to execute (must start with '/')
   */
  private handleCommand(command: string) {
    switch (command.toLowerCase()) {
      case '/exit':
        console.log(chalk.yellow('\nGoodbye! Have a great day.'));
        process.exit(0);
        
      case '/context':
        this.showContext = !this.showContext;
        const status = this.showContext ? 'ON' : 'OFF';
        console.log(chalk.cyan(`\nContext visibility is now ${status}\n`));
        break;
        
      case '/help':
        this.printWelcomeMessage();
        break;
        
      default:
        console.log(chalk.red('\nUnknown command. Available commands:'));
        console.log(chalk.green('/context, /exit, /help\n'));
        break;
    }
  }

  /**
   * Main chat loop that continuously prompts for user input and processes it.
   * 
   * This method runs indefinitely, prompting the user for input and
   * calling handleInput() to process each message or command.
   * 
   * @returns Promise that never resolves (runs until application exit)
   */
  private async runChatLoop() {
    while (true) {
      const { message } = await inquirer.prompt({
        type: 'input',
        name: 'message',
        message: chalk.blue.bold('You:'),
        transformer: (input: string) => chalk.blue(input),
      });

      await this.handleInput(message.trim());
    }
  }
}

// Initialize and run the chat interface
(async () => {
  const rag = await getRAG();
  const chatInterface = new ChatInterface(rag);
  await chatInterface.initialize();
})();