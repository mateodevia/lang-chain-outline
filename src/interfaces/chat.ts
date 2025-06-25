import { getRAG } from '../rag';
import chalk from 'chalk';
import inquirer from 'inquirer';
import readline from 'readline';
import { createInterface } from 'readline/promises';
require('dotenv').config();

class ChatInterface {
  private showContext = false;
  private readonly rag: any;
  private readonly rl: readline.Interface;

  constructor(rag: any) {
    this.rag = rag;
    this.rl = createInterface({
      input: process.stdin,
      output: process.stdout,
    });
  }

  async initialize() {
    console.clear();
    this.printWelcomeMessage();
    await this.runChatLoop();
  }

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

  private printMessage(sender: string, text: string, color: chalk.Chalk) {
    const formattedSender = color.bold(`${sender}:`);
    const message = `${formattedSender} ${text}\n`;
    console.log(message);
  }

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