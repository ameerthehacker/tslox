#! env ./node_modules/.bin/ts-node
import { promises as fs } from 'fs';

interface ErrorReporter {
  report(line: number, message: string): void;
}

class ConsoleErrorReporter implements ErrorReporter {
  report(line: number, message: string): void {
    console.error(`${line}: ${message}`);
  }
}

enum TokenType {
  EOF = 'EOF',
  OPEN_PAREN = 'OPEN_PAREN',
  CLOSE_PAREN = 'CLOSE_PAREN',
  SLASH = 'SLASH',
  LT = 'LESS_THAN',
  GT = 'GREATER_THAN',
  LTE = 'LESS_THAN_OR_EQUAL',
  GTE = 'GREATER_THAN_OR_EQUAL',
  EQ = 'EQUAL',
  EQ_EQ = 'EQUALITY',
  PLUS = 'PLUS',
  MINUS = 'MINUS',
  MUL = 'MULTIPLY',
  OPEN_BRACE = 'OPEN_BRACE',
  CLOSE_BRACE = 'CLOSE_BRACE',
  STRING = 'STRING',
}

type Token = {
  type: TokenType;
  literalValue?: any;
  line: number;
};

class Lexer {
  private start = 0;
  private current = 0;
  private line = 1;
  private tokens: Token[] = [];

  constructor(private source: string, private errorReporter: ErrorReporter) {}

  private peek() {
    return this.source.charAt(this.current);
  }

  private advance() {
    return this.source.charAt(this.current++);
  }

  private isEOF() {
    return this.current >= this.source.length;
  }

  private addToken(token: Token) {
    this.tokens.push(token);
  }

  private match(nextExpectedChar: string) {
    if (this.isEOF()) return false;

    if (this.peek() === nextExpectedChar) {
      this.advance();

      return true;
    } else {
      return false;
    }
  }

  lex() {
    this.start = this.current = 0;
    this.line = 1;
    this.tokens = [];

    while (!this.isEOF()) {
      const currentChar = this.advance();
      this.start = this.current;

      switch (currentChar) {
        // ignore whitespace, tabs and linefeeds
        case '\t':
        case '\r':
        case ' ':
          break;
        case '/':
          if (this.match('/')) {
            while (this.peek() != '\n' && !this.isEOF()) this.advance();
          } else {
            this.addToken({
              type: TokenType.SLASH,
              line: this.line,
            });
          }

          break;
        case '\n':
          ++this.line;
          break;
        case '{':
          this.addToken({
            type: TokenType.OPEN_BRACE,
            line: this.line,
          });
          break;
        case '}':
          this.addToken({
            type: TokenType.CLOSE_BRACE,
            line: this.line,
          });
          break;
        case '(':
          this.addToken({
            type: TokenType.OPEN_PAREN,
            line: this.line,
          });
          break;
        case ')':
          this.addToken({
            type: TokenType.CLOSE_PAREN,
            line: this.line,
          });
          break;
        case '<':
          if (this.match('=')) {
            this.addToken({
              type: TokenType.LTE,
              line: this.line,
            });
          } else {
            this.addToken({
              type: TokenType.LT,
              line: this.line,
            });
          }
          break;
        case '>':
          if (this.match('=')) {
            this.addToken({
              type: TokenType.GTE,
              line: this.line,
            });
          } else {
            this.addToken({
              type: TokenType.GT,
              line: this.line,
            });
          }
          break;
        case '=':
          if (this.match('=')) {
            this.addToken({
              type: TokenType.EQ_EQ,
              line: this.line,
            });
          } else {
            this.addToken({
              type: TokenType.EQ,
              line: this.line,
            });
          }
          break;
        case '+':
          this.addToken({
            type: TokenType.PLUS,
            line: this.line,
          });
          break;
        case '-':
          this.addToken({
            type: TokenType.MINUS,
            line: this.line,
          });
          break;
        case '*':
          this.addToken({
            type: TokenType.MUL,
            line: this.line,
          });
          break;
        case '"':
          while (this.peek() !== '"' && !this.isEOF()) {
            if (this.peek() === '\n') ++this.line;
            this.advance();
          }

          if (this.isEOF()) {
            this.errorReporter.report(this.line, 'unterminated string literal');

            return;
          }

          this.advance();

          const stringLiteralValue = this.source.substring(
            this.start,
            this.current - 1
          );

          this.addToken({
            type: TokenType.STRING,
            line: this.line,
            literalValue: stringLiteralValue,
          });
          break;
        default:
          this.errorReporter.report(
            this.line,
            `unexpected token ${currentChar}`
          );
          break;
      }
    }

    this.addToken({
      type: TokenType.EOF,
      line: this.line,
    });

    return this.tokens;
  }
}

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
