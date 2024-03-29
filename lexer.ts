import { ErrorReporter, TSLoxError } from './error';
import { TokenLocation } from './types';

export enum TokenType {
  EOF = 'EOF',
  OPEN_PAREN = '(',
  CLOSE_PAREN = ')',
  SLASH = '/',
  LT = '<',
  GT = '>',
  LTE = '<=',
  GTE = '>=',
  BANG = '!',
  BANG_EQ = '!=',
  EQ = '=',
  EQ_EQ = '==',
  PLUS = '+',
  PLUS_PLUS = '++',
  PLUS_EQ = '+=',
  MINUS_EQ = '-=',
  MUL_EQ = '*=',
  SLASH_EQ = '/=',
  MINUS = '-',
  MINUS_MINUS = '--',
  CARET = '^',
  MUL = '*',
  OPEN_BRACE = '{',
  CLOSE_BRACE = '}',
  STRING = 'string',
  NUMBER = 'number',
  IDENTIFIER = 'identifier',
  FOR = 'for',
  FALSE = 'FALSE',
  TRUE = 'TRUE',
  SEMICOLON = ';',
  NONE = 'none',
  QUESTION_MARK = '?',
  COLON = ':',
  LET = 'let',
  COMMA = ',',
  IF = 'if',
  ELSE = 'else',
  WHILE = 'while',
  FUNCTION = 'function',
  RETURN = 'return',
  CLASS = 'class',
  NEW = 'new',
  DOT = '.',
  THIS = 'this',
  EXTENDS = 'extends',
  CONSTRUCTOR = 'constructor',
  SUPER = 'super'
}

export const RESERVED_KEYWORDS: Record<string, TokenType> = {
  [TokenType.FOR]: TokenType.FOR,
  [TokenType.TRUE]: TokenType.TRUE,
  [TokenType.FALSE]: TokenType.FALSE,
  [TokenType.NONE]: TokenType.NONE,
  [TokenType.LET]: TokenType.LET,
  [TokenType.IF]: TokenType.IF,
  [TokenType.ELSE]: TokenType.ELSE,
  [TokenType.WHILE]: TokenType.WHILE,
  [TokenType.FUNCTION]: TokenType.FUNCTION,
  [TokenType.RETURN]: TokenType.RETURN,
  [TokenType.CLASS]: TokenType.CLASS,
  [TokenType.NEW]: TokenType.NEW,
  [TokenType.THIS]: TokenType.THIS,
  [TokenType.EXTENDS]: TokenType.EXTENDS,
  [TokenType.CONSTRUCTOR]: TokenType.IDENTIFIER,
  [TokenType.SUPER]: TokenType.SUPER
};

export type Token = {
  type: TokenType;
  literalValue?: string | number;
  location: TokenLocation
};

export default class Lexer {
  private start = 0;
  private current = 0;
  private row = 1;
  private col = 1;
  private tokens: Token[] = [];

  constructor(private source: string, private errorReporter: ErrorReporter) {}

  private peek() {
    return this.source.charAt(this.current);
  }

  private peekNext() {
    return this.current < this.source.length
      ? this.source.charAt(this.current + 1)
      : '';
  }

  private advance() {
    this.col++;
    return this.source.charAt(this.current++);
  }

  private get curLocation() {
    return {
      row: this.row,
      col: this.col
    }
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

  private eatString() {
    const startCol = this.col - 1;
    while (this.peek() !== '"' && !this.isEOF()) {
      if (this.peek() === '\n') {
        ++this.row;
        this.col = 1;
      };
      this.advance();
    }

    if (this.isEOF()) {
      this.errorReporter.report(new TSLoxError('Syntax', this.curLocation, 'unterminated string literal'));

      return;
    }

    this.advance();

    const stringLiteralValue = this.source.substring(
      this.start + 1,
      this.current - 1
    );

    this.addToken({
      type: TokenType.STRING,
      location: {
        row: this.row,
        col: startCol
      },
      literalValue: stringLiteralValue
    });
  }

  private isDigit(currentChar: string) {
    return /\d/.test(currentChar);
  }

  private isAlphaNumeric(currentChar: string) {
    return /[_a-zA-Z0-9]/.test(currentChar);
  }

  private eatIdentifier() {
    const startCol = this.col - 1;
    while (this.isAlphaNumeric(this.peek()) && !this.isEOF()) this.advance();

    const identifierLiteralValue = this.source.substring(
      this.start,
      this.current
    );
    
    let tokenType = RESERVED_KEYWORDS[identifierLiteralValue] || TokenType.IDENTIFIER;

    this.addToken({
      type: tokenType,
      literalValue: identifierLiteralValue,
      location: {
        row: this.row,
        col: startCol
      }
    });
  }

  private eatNumber() {
    const startCol = this.col - 1;
    while (this.isDigit(this.peek()) && !this.isEOF()) this.advance();

    if (this.peek() === '.' && this.isDigit(this.peekNext())) {
      this.advance();
    }

    while (this.isDigit(this.peek()) && !this.isEOF()) this.advance();

    const numberLiteralValue = this.source.substring(this.start, this.current);

    this.addToken({
      type: TokenType.NUMBER,
      literalValue: parseInt(numberLiteralValue),
      location: {
        row: this.row,
        col: startCol
      }
    });
  }

  lex() {
    this.start = this.current = 0;
    this.row = 1;
    this.tokens = [];

    while (!this.isEOF()) {
      this.start = this.current;
      const currentChar = this.advance();

      switch (currentChar) {
        // ignore whitespace, tabs and linefeeds
        case '\t':
        case '\r':
        case ' ':
        break;
        case TokenType.SEMICOLON:
          this.addToken({
            type: TokenType.SEMICOLON,
            location: this.curLocation
          })
          break;
        case TokenType.SLASH:
          if (this.match(TokenType.SLASH)) {
            while (this.peek() !== '\n' && !this.isEOF()) this.advance();
          }
          else if (this.match(TokenType.EQ)) {
            this.addToken({
              type: TokenType.SLASH_EQ,
              location: this.curLocation
            });
          } else if (this.match('*')) {
            // comments can be multi lined
            while (!(this.peek() === '*' && this.peekNext() === '/')) {
              if (this.peek() === '\n') ++this.row;

              this.advance();
            }

            // remove lat */
            this.advance();
            this.advance();
          } else {
            this.addToken({
              type: TokenType.SLASH,
              location: this.curLocation
            });
          }

          break;
        case '#':
          while (this.peek() !== '\n' && !this.isEOF()) this.advance();
          break;
        case '\n':
          ++this.row;
          this.col = 1;
          break;
        case TokenType.OPEN_BRACE:
          this.addToken({
            type: TokenType.OPEN_BRACE,
            location: this.curLocation
          });
          break;
        case TokenType.CLOSE_BRACE:
          this.addToken({
            type: TokenType.CLOSE_BRACE,
            location: this.curLocation
          });
          break;
        case TokenType.OPEN_PAREN:
          this.addToken({
            type: TokenType.OPEN_PAREN,
            location: this.curLocation
          });
          break;
        case TokenType.CLOSE_PAREN:
          this.addToken({
            type: TokenType.CLOSE_PAREN,
            location: this.curLocation
          });
          break;
        case TokenType.LT:
          if (this.match('=')) {
            this.addToken({
              type: TokenType.LTE,
              location: this.curLocation
            });
          } else {
            this.addToken({
              type: TokenType.LT,
              location: this.curLocation
            });
          }
          break;
        case TokenType.GT:
          if (this.match('=')) {
            this.addToken({
              type: TokenType.GTE,
              location: this.curLocation
            });
          } else {
            this.addToken({
              type: TokenType.GT,
              location: this.curLocation
            });
          }
          break;
        case TokenType.EQ:
          if (this.match('=')) {
            this.addToken({
              type: TokenType.EQ_EQ,
              location: this.curLocation
            });
          } else {
            this.addToken({
              type: TokenType.EQ,
              location: this.curLocation
            });
          }
          break;
        case TokenType.CARET:
          this.addToken({
            type: TokenType.CARET,
            location: this.curLocation
          });
          break;
        case TokenType.BANG: 
          if (this.match('=')) {
            this.addToken({
              type: TokenType.BANG_EQ,
              location: this.curLocation
            });
          } else {
            this.addToken({
              type: TokenType.BANG,
              location: this.curLocation
            });
          }
          break;
        case TokenType.QUESTION_MARK:
          this.addToken({
            type: TokenType.QUESTION_MARK,
            location: this.curLocation
          });
          break;
        case TokenType.COLON:
          this.addToken({
            type: TokenType.COLON,
            location: this.curLocation
          });
          break;
        case TokenType.COMMA:
          this.addToken({
            type: TokenType.COMMA,
            location: this.curLocation
          });
          break;
        case TokenType.PLUS:
          if (this.match(TokenType.PLUS)) {
            this.addToken({
              type: TokenType.PLUS_PLUS,
              location: this.curLocation
            });
          }
          else if (this.match(TokenType.EQ)) {
            this.addToken({
              type: TokenType.PLUS_EQ,
              location: this.curLocation
            });
          } else {
            this.addToken({
              type: TokenType.PLUS,
              location: this.curLocation
            });
          }
          break;
        case TokenType.MINUS:
          if (this.match(TokenType.MINUS)) {
            this.addToken({
              type: TokenType.MINUS_MINUS,
              location: this.curLocation
            });
          }
          else if (this.match(TokenType.EQ)) {
            this.addToken({
              type: TokenType.MINUS_EQ,
              location: this.curLocation
            });
          } else {
            this.addToken({
              type: TokenType.MINUS,
              location: this.curLocation
            });
          }
          break;
        case TokenType.MUL:
          if (this.match(TokenType.EQ)) {
            this.addToken({
              type: TokenType.MUL_EQ,
              location: this.curLocation
            });
          } else {
            this.addToken({
              type: TokenType.MUL,
              location: this.curLocation
            });
          }
          break;
        case '"':
          this.eatString();

          break;
        case TokenType.DOT:
          this.addToken({
            type: TokenType.DOT,
            location: this.curLocation
          });

          break;
        default:
          if (this.isDigit(currentChar)) {
            this.eatNumber();
          } else if (this.isAlphaNumeric(currentChar)) {
            this.eatIdentifier();
          } else {
            this.errorReporter.report(
              new TSLoxError(
                'Syntax',
                this.curLocation,
                `unexpected token ${currentChar}`
              )
            );
          }

          break;
      }
    }

    this.addToken({
      type: TokenType.EOF,
      location: this.curLocation
    });

    return this.tokens;
  }
}
