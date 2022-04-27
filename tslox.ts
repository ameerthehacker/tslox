#! ./node_modules/.bin/ts-node
import { promises as fs } from 'fs';
import ConsoleErrorReporter from './error';
import { BinaryExpr, Expr, GroupingExpr, LiteralExpr, UnaryExpr } from './expr';
import Lexer, { TokenType } from './lexer';

async function main() {
  if (process.argv.length === 2) {
    console.error(`script file was not provided`);

    return;
  }

  const scriptFilePath = process.argv[2];
  const scriptFileContent = await fs.readFile(scriptFilePath, 'utf-8');
  const lexer = new Lexer(scriptFileContent, new ConsoleErrorReporter());

  console.log(lexer.lex());
}

main().then(() => {});
