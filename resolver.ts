import { AssignmentExpression, BinaryExpression, Expression, ExpressionVisitor, FunctionCallExpression, GroupingExpression, Literal, TernaryExpression, UnaryExpression } from "./expr";
import { TokenType } from "./lexer";
import { BlockStatement, ExpressionStatement, FunctionDeclarationStatement, IfStatement, ReturnStatement, Statement, StatementVisitor, VariableDeclarationStatement, WhileStatement } from "./stmt";

export type Bindings = Map<string, number>;

type Scope = Map<string, boolean>;

class Scopes {
  private stack: Array<Scope>;

  constructor() {
    this.stack = [];
  }

  private assertNotEmpty() {
    if (this.isEmpty()) {
      throw new Error('ScopeStack is empty');
    }
  }

  push(scope: Scope) {
    this.stack.push(scope);
  }

  pop() {
    this.assertNotEmpty();

    return this.stack.pop();
  }

  peek() {
    this.assertNotEmpty();

    return this.stack[this.stack.length - 1];
  }

  findDepth(variableName: string) {
    return this.stack.findIndex((scope) => scope.get(variableName));
  }

  isEmpty() {
    return this.stack.length === 0;
  }
}

export class Resolver implements StatementVisitor, ExpressionVisitor {
  private bindings: Bindings;
  private scopes: Scopes;

  constructor(private statements: Statement[]) {
    this.bindings = new Map();
    this.scopes = new Scopes();
  }

  beginScope() {
    this.scopes.push(new Map());
  }

  endScope() {
    this.scopes.pop();
  }

  define(variableName: string) {
    this.scopes.peek().set(variableName, false);
  }

  declare(variableName: string) {
    this.scopes.peek().set(variableName, true);
  }

  visitLiteral(expr: Literal) {
    
  }

  visitTernaryExpr(expr: TernaryExpression) {

  }

  visitBinaryExpr(expr: BinaryExpression) {

  }

  visitUnaryExpr(expr: UnaryExpression) {

  }

  visitGroupingExpr(expr: GroupingExpression) {

  }

  visitFunctionCallExpr(expr: FunctionCallExpression) {

  }

  // statements

  visitVariableDeclarationStatement(statement: VariableDeclarationStatement) {
    statement.declarations.forEach(declaration => {
      const variableName = declaration.identifier.literalValue as string;
      this.define(variableName);

      if (declaration.initializer) {
        this.resolveExpr(declaration.initializer);
      }

      this.declare(variableName);
    });
  }

  visitFunctionDeclarationStatement(statement: FunctionDeclarationStatement) {
    this.declare(statement.functionName.literalValue as string);
    this.beginScope();
    statement.args.forEach(arg => this.declare(arg.literalValue as string));
    this.resolveStmt(statement.body);
    this.endScope();
  }
  
  visitReturnStatement(statement: ReturnStatement) {
    if (statement.returnExpr) {
      this.resolveExpr(statement.returnExpr);
    }
  }

  visitExpressionStatement(statement: ExpressionStatement) {
    this.resolveExpr(statement.expression);
  }

  visitBlockStatement(statement: BlockStatement) {
    this.beginScope();

    this.resolveStmts(statement.statements);

    this.endScope();
  }

  visitIfStatement(statement: IfStatement) {
    this.resolveExpr(statement.condition);
    this.resolveStmt(statement.trueStatement);
    
    if (statement.falseStatement) {
      this.resolveStmt(statement.falseStatement);
    }
  }

  visitWhileStatement(statement: WhileStatement) {
    this.resolveExpr(statement.condition);
    this.resolveStmt(statement.body);
  }

  resolveExpr(expression: Expression) {
    expression.accept(this);
  }

  resolveStmt(statement: Statement) {
    statement.accept(this);
  }

  resolveStmts(statements: Statement[]) {
    statements.forEach(statement => this.resolveStmt(statement));
  }

  resolve(): Bindings {
    this.resolveStmts(this.statements);

    return this.bindings;
  }
}
