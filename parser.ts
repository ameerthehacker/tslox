import { ErrorReporter, TSLoxError } from "./error";
import { AssignmentExpression, BinaryExpression, ClassInstantiationExpression, Expression, FunctionCallExpression, GroupingExpression, InstanceGetExpression, Literal, SuperExpression, TernaryExpression, ThisExpression, UnaryExpression } from "./expr";
import { RESERVED_KEYWORDS, Token, TokenType } from "./lexer";
import { BlockStatement, ClassDeclarationStatement, ExpressionStatement, FunctionDeclarationStatement, IfStatement, ReturnStatement, Statement, VariableDeclaration, VariableDeclarationStatement, WhileStatement } from "./stmt";

export class Parser {
  private current: number;
  private _hasError: boolean;

  constructor(private tokens: Token[], private errorReporter: ErrorReporter) {
    this.current = 0;
    this._hasError = false;
  }

  public get hasError() {
    return this._hasError;
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

    if (this.match(TokenType.EQ, TokenType.PLUS_EQ, TokenType.MINUS_EQ, TokenType.SLASH_EQ)) {
      if (
        (expr instanceof Literal && expr.value.type === TokenType.IDENTIFIER) ||
        expr instanceof InstanceGetExpression
      ) {
        const operator = this.previous();
        const rValue = this.assignment();
        const rValueLocation = rValue.location;

        function buildOpAssignmentExpression(op: TokenType) {
          return new AssignmentExpression(
            startToken.location,
            expr as Literal,
            new BinaryExpression(
              rValueLocation,
              expr,
              { location: { row: rValueLocation.row, col: rValueLocation.col + 1 }, type: op },
              rValue
            )
          );
        }

        switch (operator.type) {
          case TokenType.EQ: {
            expr = new AssignmentExpression(startToken.location, expr, rValue);
            break;
          }
          case TokenType.PLUS_EQ: {
            expr = buildOpAssignmentExpression(TokenType.PLUS)
            break;
          }
          case TokenType.MINUS_EQ: {
            expr = buildOpAssignmentExpression(TokenType.MINUS)
            break;
          }
          case TokenType.MUL_EQ: {
            expr = buildOpAssignmentExpression(TokenType.MUL)
            break;
          }
          case TokenType.SLASH_EQ: {
            expr = buildOpAssignmentExpression(TokenType.SLASH)
            break;
          } 
        }
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

  private jumpBack() {
    return this.tokens[--this.current];
  }

  private unary(): Expression {
    // check for postfix operators
    if (this.match(TokenType.IDENTIFIER)) {
      const identifier = this.previous();
      if (this.match(TokenType.PLUS_PLUS, TokenType.MINUS_MINUS)) {
        const operator = this.previous();
        return new UnaryExpression(operator.location, operator, new Literal(identifier), true);
      } else {
        // it was not a postfix ++ or -- operation so go back
        this.jumpBack();
      }
    }

    // check for prefix operators
    if (this.match(TokenType.MINUS, TokenType.PLUS, TokenType.BANG, TokenType.PLUS_PLUS, TokenType.MINUS_MINUS)) {
      const operator = this.previous();
      const rightExpr = this.unary();

      return new UnaryExpression(operator.location, operator, rightExpr);
    }

    return this.classInstantiation();
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
      } else if (this.match(TokenType.DOT)) {
        const property = this.consume(TokenType.IDENTIFIER, new TSLoxError('Syntax', this.curToken.location, `expected property name after ${TokenType.DOT} operator`));

        calle = new InstanceGetExpression(calle.location, calle, property);
      } else {
        break;
      }
    }

    return calle;
  }

  private classInstantiation(): Expression {
    const startTokenLocation = this.curToken.location;

    if (this.match(TokenType.NEW)) {
      const callExpression = this.call();

      if (callExpression instanceof FunctionCallExpression) {
        return new ClassInstantiationExpression(startTokenLocation, callExpression)
      } else {
        throw new TSLoxError('Syntax', startTokenLocation, 'new operator can only be used with classes');
      }
    }

    return this.call();
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

    if (this.match(TokenType.THIS)) {
      return new ThisExpression(this.previous().location);
    }

    if (this.match(TokenType.SUPER)) {
      const superLocation = this.previous().location;
      this.consume(TokenType.DOT, new TSLoxError('Syntax', this.curToken.location, `expected ${TokenType.DOT} after ${TokenType.SUPER} keyword`));
      const property = this.consume(TokenType.IDENTIFIER, new TSLoxError('Syntax', this.curToken.location, `expected identifier after ${TokenType.DOT}`));

      return new SuperExpression(superLocation, property);
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

  private classDeclarationStatement(): ClassDeclarationStatement {
    const classIdentifier = this.consume(TokenType.IDENTIFIER, new TSLoxError('Syntax', this.curToken.location, 'expected class name after class keyword'));
    let superClass: Literal | null = null;

    if (this.match(TokenType.EXTENDS)) {
      superClass = new Literal(this.consume(TokenType.IDENTIFIER, new TSLoxError('Syntax', this.curToken.location, 'expected super class name after extends keyword')));
    }

    this.consume(TokenType.OPEN_BRACE, new TSLoxError('Syntax', this.curToken.location, `expected ${TokenType.OPEN_BRACE} after class name`));
    const functionDeclarations: FunctionDeclarationStatement[] = [];

    while (!this.isEOF() && !this.check(TokenType.CLOSE_BRACE)) {
      functionDeclarations.push(this.functionDeclarationStatement('method'));
    }

    this.consume(TokenType.CLOSE_BRACE, new TSLoxError('Syntax', this.curToken.location, `expected ${TokenType.CLOSE_BRACE} at end of class declaration`));

    return new ClassDeclarationStatement(classIdentifier, functionDeclarations, superClass);
  }

  private whileStatement(): WhileStatement {
    this.consume(TokenType.OPEN_PAREN, new TSLoxError('Syntax', this.curToken.location, `expected '${TokenType.OPEN_PAREN}' before while condition`));
    const condition = this.expression();
    this.consume(TokenType.CLOSE_PAREN, new TSLoxError('Syntax', this.curToken.location, `expected '${TokenType.CLOSE_PAREN}' after while condition`));
    const body = this.statement();

    return new WhileStatement(condition, body);
  }

  private functionDeclarationStatement(kind: 'method' | 'function' = 'function'): FunctionDeclarationStatement {
    const functionName = this.consume(TokenType.IDENTIFIER, new TSLoxError('Syntax', this.curToken.location, `expected ${kind} name`));
    this.consume(TokenType.OPEN_PAREN, new TSLoxError('Syntax', functionName.location, `expected ${TokenType.OPEN_PAREN} before ${kind} arguments`));
    const args: Token[] = [];

    if (!this.check(TokenType.CLOSE_PAREN)) {
      do {
        const arg = this.consume(TokenType.IDENTIFIER, new TSLoxError('Syntax', this.curToken.location, `expected ${kind} argument to be an identifer but got ${this.curToken.type}`));

        args.push(arg);
      } while (this.match(TokenType.COMMA))
    }

    this.consume(TokenType.CLOSE_PAREN, new TSLoxError('Syntax', this.curToken.location, `expected ${TokenType.CLOSE_PAREN} after function arguments`));
    this.consume(TokenType.OPEN_BRACE, new TSLoxError('Syntax', this.curToken.location, `expected ${TokenType.OPEN_BRACE} before function body`));
    const body = this.blockStatement();

    return new FunctionDeclarationStatement(functionName, args, body);
  }

  private returnStatement(): ReturnStatement {
    let returnExpr: Expression | null = null;
    const returnTokenLocation = this.previous().location;

    if (!this.check(TokenType.SEMICOLON)) {
      returnExpr = this.expression();
    }

    this.consumeSemicolon();

    return new ReturnStatement(returnTokenLocation, returnExpr);
  }

  private statement(): Statement {
    if (this.match(TokenType.CLASS)) {
      return this.classDeclarationStatement();
    }
    else if (this.match(TokenType.RETURN)) {
      return this.returnStatement();
    }
    else if (this.match(TokenType.FUNCTION)) {
      return this.functionDeclarationStatement();
    }
    else if (this.match(TokenType.WHILE)) {
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

  private sync() {
    while (!this.match(TokenType.SEMICOLON, TokenType.CLOSE_BRACE) && !this.isEOF()) {
      this.advance();
    }
  }

  parse(): Statement[] {
    let statements: Statement[] = [];

    while (!this.isEOF()) {
      try {
        const statement = this.statement();

        if (statement) {
          statements.push(statement);
        }
      } catch(err) {
        if (err instanceof TSLoxError) {
          this.errorReporter.report(err);
          this._hasError = true;
          this.sync();
        } else {
          throw err;
        }
      }
    }

    return statements;
  }
}
