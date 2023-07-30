import { ErrorReporter, TSLoxError } from "./error";
import { AssignmentExpression, BinaryExpression, Expression, FunctionCallExpression, GroupingExpression, Literal, TernaryExpression, UnaryExpression } from "./expr";
import { Token, TokenType } from "./lexer";
import { BlockStatement, ExpressionStatement, IfStatement, Statement, VariableDeclaration, VariableDeclarationStatement, WhileStatement } from "./stmt";

export class Parser {
  private current: number;

  constructor(private tokens: Token[], private errorReporter: ErrorReporter) {
    this.current = 0;
  }

  private isEOF() {
    return this.tokens[this.current].type === TokenType.EOF;
  }

  private peek(): Token | null {
    if (!this.isEOF()) {
      return this.tokens[this.current];
    }

    return null;
  }

  private advance() {
    return this.tokens[this.current++]
  }

  private match(...tokenTypes: TokenType[]) {
    const nextToken = this.peek();

    if (nextToken && tokenTypes.includes(nextToken.type)) {
      this.advance();
      return true;
    }

    return false;
  }

  private check(type: TokenType) {
    return this.curToken.type === type;
  }

  private previous() {
    return this.tokens[this.current - 1];
  }

  private ternary(): Expression {
    const startToken: Token = this.curToken;
    let expr = this.equality();

    if (this.match(TokenType.QUESTION_MARK)) {
      const truthyExpression = this.ternary();
      this.consume(TokenType.COLON, new TSLoxError('Syntax', this.curToken.location, `expected ${TokenType.COLON}`));
      const falsyExpression = this.ternary();

      expr = new TernaryExpression(startToken.location, expr, truthyExpression, falsyExpression);
    }

    return expr;
  }

  private assignment(): Expression {
    const startToken: Token = this.curToken;
    let expr = this.ternary();

    if (this.match(TokenType.EQ)) {
      if (expr instanceof Literal && expr.value.type === TokenType.IDENTIFIER) {
        const rValue = this.assignment();

        expr = new AssignmentExpression(startToken.location, expr.value, rValue);
      } else {
        throw new TSLoxError('Syntax', startToken.location, 'invalid assignment expression');
      }
    }

    return expr;
  }

  private equality(): Expression {
    const startToken: Token = this.curToken;
    let expr = this.comparison();

    while (this.match(TokenType.EQ_EQ, TokenType.BANG_EQ)) {
      const operator = this.previous();
      const rightExpr = this.comparison();
      expr = new BinaryExpression(startToken.location, expr, operator, rightExpr);
    }

    return expr;
  }

  private comparison(): Expression {
    const startToken: Token = this.curToken;
    let expr = this.term();

    while (this.match(TokenType.GT, TokenType.LT, TokenType.GTE, TokenType.LTE)) {
      const operator = this.previous();
      const rightExpr = this.term();
      expr = new BinaryExpression(startToken.location, expr, operator, rightExpr);
    }

    return expr;
  }

  private term(): Expression {
    const startToken: Token = this.curToken;
    let expr = this.factor();

    while (this.match(TokenType.PLUS, TokenType.MINUS)) {
      const operator = this.previous();
      const rightExpr = this.factor();
      expr = new BinaryExpression(startToken.location, expr, operator, rightExpr);
    }

    return expr;
  }

  private factor(): Expression {
    const startToken: Token = this.curToken;
    let expr = this.power();

    while (this.match(TokenType.SLASH, TokenType.MUL)) {
      const operator = this.previous();
      const rightExpr = this.power();
      expr = new BinaryExpression(startToken.location, expr, operator, rightExpr);
    }

    return expr;
  }

  private power(): Expression {
    const startToken: Token = this.curToken;
    let expr = this.unary();

    while (this.match(TokenType.CARET)) {
      const operator = this.previous();
      const rightExpr = this.unary();
      expr = new BinaryExpression(startToken.location, expr, operator, rightExpr);
    }

    return expr;
  }

  private unary(): Expression {
    if (this.match(TokenType.MINUS, TokenType.PLUS, TokenType.BANG)) {
      const operator = this.previous();
      const rightExpr = this.unary();

      return new UnaryExpression(operator.location, operator, rightExpr);
    }

    return this.call();
  }

  private call(): Expression {
    let calle = this.primary();
    
    while (true) {
      if (this.match(TokenType.OPEN_PAREN)) {
        const args: Expression[] = [];

        if (!this.check(TokenType.CLOSE_PAREN)) {
          do {
            args.push(this.expression());
          } while(this.match(TokenType.COMMA));
        }

        this.consume(TokenType.CLOSE_PAREN, new TSLoxError('Syntax', calle.location, `expected ${TokenType.CLOSE_PAREN} after function call`));

        calle = new FunctionCallExpression(calle.location, calle, args);
      } else {
        break;
      }
    }

    return calle;
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

    const startToken = this.curToken;

    if (this.match(TokenType.OPEN_PAREN)) {
      const expr = this.expression();

      this.consume(TokenType.CLOSE_PAREN, new TSLoxError('Syntax', this.curToken.location, `expect '${TokenType.CLOSE_PAREN}' after expression`));

      return new GroupingExpression(startToken.location, expr);
    }

    throw new TSLoxError('Syntax', this.curToken.location, `unexpected token ${this.curToken.type}`);
  }

  private get curToken() {
    return this.tokens[this.current];
  }

  private consume(tokenType: TokenType, error: TSLoxError) {
    if (!this.isEOF() && this.curToken.type === tokenType) {
      return this.advance();
    } else {
      throw error;
    }
  }

  private expression(): Expression {
    return this.assignment();
  }

  private consumeSemicolon() {
    this.consume(TokenType.SEMICOLON, new TSLoxError('Syntax', this.curToken.location, `expected ${TokenType.SEMICOLON} at end of statement`));
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

      variableDeclarations.push({ identifier: identifier, initializer });
    } while (this.match(TokenType.COMMA));

    this.consumeSemicolon();

    return new VariableDeclarationStatement(variableDeclarations);
  }

  private blockStatement(): BlockStatement {
    const statements: Statement[] = [];

    while (!this.isEOF() && !this.check(TokenType.CLOSE_BRACE)) {
      statements.push(this.statement());
    }

    this.consume(TokenType.CLOSE_BRACE, new TSLoxError('Syntax', this.curToken.location, `expected ${TokenType.CLOSE_BRACE}`));

    return new BlockStatement(statements);
  }

  private ifStatement(): IfStatement {
    this.consume(TokenType.OPEN_PAREN, new TSLoxError('Syntax', this.curToken.location, `expected '${TokenType.OPEN_PAREN}' before if condition`));
    const condition = this.expression();
    this.consume(TokenType.CLOSE_PAREN, new TSLoxError('Syntax', this.curToken.location, `expected '${TokenType.CLOSE_PAREN}' after if condition`));
    const trueStatement = this.statement();
    let elseStatement: Statement | null = null;

    if (this.match(TokenType.ELSE)) {
      elseStatement = this.statement();
    }

    return new IfStatement(condition, trueStatement, elseStatement);
  }

  private whileStatement(): WhileStatement {
    this.consume(TokenType.OPEN_PAREN, new TSLoxError('Syntax', this.curToken.location, `expected '${TokenType.OPEN_PAREN}' before while condition`));
    const condition = this.expression();
    this.consume(TokenType.CLOSE_PAREN, new TSLoxError('Syntax', this.curToken.location, `expected '${TokenType.CLOSE_PAREN}' after while condition`));
    const body = this.statement();

    return new WhileStatement(condition, body);
  }

  private statement(): Statement {
    if (this.match(TokenType.WHILE)) {
      return this.whileStatement();
    }
    else if (this.match(TokenType.IF)) {
      return this.ifStatement();
    }
    else if (this.match(TokenType.OPEN_BRACE)) {
      return this.blockStatement();
    }
    else if (this.match(TokenType.LET)) {
      return this.variableDeclarationStatement();
    }
    else {
      return this.expressionStatement();
    }
  }

  parse(): Statement[] | null {
    let statements: Statement[] = [];

    try {
      while (!this.isEOF()) {
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
