import { ErrorReporter, TSLoxError } from "./error";
import { AssignmentExpression, BinaryExpression, Expression, GroupingExpression, Literal, TernaryExpression, UnaryExpression } from "./expr";
import { Token, TokenType } from "./lexer";
import { ExpressionStatement, PrintStatement, Statement, VariableDeclaration, VariableDeclarationStatement } from "./stmt";

export class Parser {
  private current: number;

  constructor(private tokens: Token[], private errorReporter: ErrorReporter) {
    this.current = 0;
  }

  private isEof() {
    return this.tokens[this.current].type === TokenType.EOF;
  }

  private peek(): Token | null {
    if (!this.isEof()) {
      return this.tokens[this.current];
    }

    return null;
  }

  private advance() {
    return this.tokens[this.current++]
  }

  private match(...tokenTypes: TokenType[]) {
    const curToken = this.peek();

    if (curToken && tokenTypes.includes(curToken.type)) {
      this.advance();
      return true;
    }

    return false;
  }

  private previous() {
    return this.tokens[this.current - 1];
  }

  private ternary(): Expression {
    let expr = this.equality();

    if (this.match(TokenType.QUESTION_MARK)) {
      const truthyExpression = this.ternary();
      this.consume(TokenType.COLON, new TSLoxError('Syntax', this.curToken.location, 'expected :'));
      const falsyExpression = this.ternary();

      expr = new TernaryExpression(expr, truthyExpression, falsyExpression);
    }

    return expr;
  }

  private assignment(): Expression {
    let expr = this.ternary();

    if (this.match(TokenType.EQ)) {
      let startToken: Token = this.curToken;

      if (expr instanceof Literal && expr.value.type === TokenType.IDENTIFIER) {
        startToken = this.curToken;
        const rValue = this.assignment();

        expr = new AssignmentExpression(expr.value, rValue);
      } else {
        throw new TSLoxError('Syntax', startToken.location, 'invalid assignment expression');
      }
    }

    return expr;
  }

  private getStartLocation(expr: Expression) {

  }

  private equality(): Expression {
    let expr = this.comparison();

    while (this.match(TokenType.EQ_EQ, TokenType.BANG_EQ)) {
      const operator = this.previous();
      const rightExpr = this.comparison();
      expr = new BinaryExpression(expr, operator, rightExpr);
    }

    return expr;
  }

  private comparison(): Expression {
    let expr = this.term();

    while (this.match(TokenType.GT, TokenType.LT, TokenType.GTE, TokenType.LTE)) {
      const operator = this.previous();
      const rightExpr = this.term();
      expr = new BinaryExpression(expr, operator, rightExpr);
    }

    return expr;
  }

  private term(): Expression {
    let expr = this.factor();

    while (this.match(TokenType.PLUS, TokenType.MINUS)) {
      const operator = this.previous();
      const rightExpr = this.factor();
      expr = new BinaryExpression(expr, operator, rightExpr);
    }

    return expr;
  }

  private factor(): Expression {
    let expr = this.power();

    while (this.match(TokenType.SLASH, TokenType.MUL)) {
      const operator = this.previous();
      const rightExpr = this.power();
      expr = new BinaryExpression(expr, operator, rightExpr);
    }

    return expr;
  }

  private power(): Expression {
    let expr = this.unary();

    while (this.match(TokenType.CARET)) {
      const operator = this.previous();
      const rightExpr = this.unary();
      expr = new BinaryExpression(expr, operator, rightExpr);
    }

    return expr;
  }

  private unary(): Expression {
    if (this.match(TokenType.MINUS, TokenType.PLUS, TokenType.BANG)) {
      const operator = this.previous();
      const rightExpr = this.unary();

      return new UnaryExpression(operator, rightExpr);
    }

    return this.primary();
  }

  private get curToken() {
    return this.tokens[this.current];
  }

  private consume(tokenType: TokenType, error: TSLoxError) {
    if (!this.isEof() && this.curToken.type === tokenType) {
      return this.advance();
    } else {
      throw error;
    }
  }

  private primary(): Expression {
    if (
      this.match(
        TokenType.NUMBER,
        TokenType.STRING,
        TokenType.TRUE,
        TokenType.FALSE,
        TokenType.NONE,
        TokenType.IDENTIFIER
      )
    ) {
      const token = this.previous();

      return new Literal(token);
    }

    if (this.match(TokenType.OPEN_PAREN)) {
      const expr = this.expression();

      this.consume(TokenType.CLOSE_PAREN, new TSLoxError('Syntax', this.curToken.location, "expect ')' after expression."));

      return new GroupingExpression(expr);
    }

    throw new TSLoxError('Syntax', this.curToken.location, `unexpected token ${this.curToken.type}`);
  }

  private expression(): Expression {
    return this.assignment();
  }

  private consumeSemicolon() {
    this.consume(TokenType.SEMICOLON, new TSLoxError('Syntax', this.curToken.location, 'expected ;'));
  }

  private printStatement() {
    const expr = this.expression();

    this.consumeSemicolon();

    return new PrintStatement(expr);
  }

  private expressionStatement() {
    const expr = this.expression();

    this.consumeSemicolon();

    return new ExpressionStatement(expr);
  }

  private variableDeclarationStatement() {
    const variableDeclarations: VariableDeclaration[] = [];
    
    do {
      const identifier = this.consume(TokenType.IDENTIFIER, new TSLoxError('Syntax', this.curToken.location, 'expected variable name'));

      let initializer: Expression | null = null; 

      if (this.match(TokenType.EQ)) {
        initializer = this.expression();
      }

      variableDeclarations.push({ identifier: identifier.literalValue as string, initializer });
    } while (this.match(TokenType.COMMA));

    this.consumeSemicolon();

    return new VariableDeclarationStatement(variableDeclarations);
  }

  private statement(): Statement {
    if (this.match(TokenType.LET)) {
      return this.variableDeclarationStatement();
    }
    else if (this.match(TokenType.PRINT)) {
      return this.printStatement();
    } else {
      return this.expressionStatement();
    }
  }

  parse(): Statement[] | null {
    let statements: Statement[] = [];

    try {
      while (!this.isEof()) {
        const statement = this.statement();

        if (statement) {
          statements.push(statement);
        }
      }

      return statements;
    } catch(err) {
      let _err = err as TSLoxError;

      this.errorReporter.report(_err);

      return null;
    }
  }
}
