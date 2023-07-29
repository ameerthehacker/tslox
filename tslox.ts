#! ./node_modules/.bin/ts-node
import { promises as fs } from 'fs';
import ConsoleErrorReporter from './error';
import Lexer from './lexer';
import { Parser } from './parser';
import { ExpressionInterpreter, StatementInterpreter } from './interpreter';

async function main() {
  if (process.argv.length === 2) {
    console.error(`script file was not provided`);

    return;
  }

  const scriptFilePath = process.argv[2];
  const scriptFileContent = await fs.readFile(scriptFilePath, 'utf-8');
  const errorReporter = new ConsoleErrorReporter();
  const expressionInterpreter = new ExpressionInterpreter(errorReporter);
  const statementInterpreter = new StatementInterpreter(expressionInterpreter);
  const lexer = new Lexer(scriptFileContent, errorReporter);
  const tokens = lexer.lex();
  const parser = new Parser(tokens, errorReporter);
  const statements = parser.parse();

  if (statements) {
    for (const statement of statements) {
      statement.accept(statementInterpreter);
    }
  }
}

main().then(() => {});
