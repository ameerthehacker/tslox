import { TSLoxError } from "./error";
import { AssignmentExpression, BinaryExpression, ClassInstantiationExpression, Expression, ExpressionVisitor, FunctionCallExpression, GroupingExpression, InstanceGetExpression, Literal, TernaryExpression, ThisExpression, UnaryExpression } from "./expr";
import { Token, TokenType } from "./lexer";
import { BlockStatement, ClassDeclarationStatement, ExpressionStatement, FunctionDeclarationStatement, IfStatement, ReturnStatement, Statement, StatementVisitor, VariableDeclarationStatement, WhileStatement } from "./stmt";

export type Bindings = Map<Expression | Token, number>;

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
    const depth = this.stack.findIndex((scope) => scope.get(variableName));

    if (depth === -1) {
      return null;
    }

    return this.stack.length - depth - 1;
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
    if (this.scopes.isEmpty()) return;

    this.scopes.peek().set(variableName, true);
  }

  declare(variableName: string) {
    if (this.scopes.isEmpty()) return;

    this.scopes.peek().set(variableName, false);
  }

  resolveBinding(expr: Expression, variableName: string) {
    const depth = this.scopes.findDepth(variableName);

    if (depth !== null) {
      this.bindings.set(expr, depth);
    }
  }

  resolveLocal(expr: Literal) {
    if (expr.value.type === TokenType.IDENTIFIER) {
      const variableName = expr.value.literalValue as string;

      if (!this.scopes.isEmpty() && this.scopes.peek().get(variableName) === false) {
        throw new TSLoxError('Syntax', expr.location, 'cannot use same variable for initialization');
      }

      this.resolveBinding(expr, variableName);
    }
  }

  visitLiteral(expr: Literal) {
    this.resolveLocal(expr);
  }

  visitTernaryExpr(expr: TernaryExpression) {
    this.resolveExpr(expr.conditionalExpression);
    this.resolveExpr(expr.truthyExpression);
    this.resolveExpr(expr.falsyExpression);
  }

  visitBinaryExpr(expr: BinaryExpression) {
    this.resolveExpr(expr.leftExpr);
    this.resolveExpr(expr.rightExpr);
  }

  visitUnaryExpr(expr: UnaryExpression) {
    this.resolveExpr(expr.expr);
  }

  visitGroupingExpr(expr: GroupingExpression) {
    this.resolveExpr(expr.expr);
  }

  visitFunctionCallExpr(expr: FunctionCallExpression) {
    this.resolveExpr(expr.calle);
    expr.args.forEach(arg => this.resolveExpr(arg));
  }

  visitAssignmentExpr(expr: AssignmentExpression) {
    if (expr.lValue instanceof Literal) {
      this.resolveLocal(expr.lValue);
    } else if (expr.lValue instanceof InstanceGetExpression) {
      this.resolveExpr(expr.lValue);
    }
    this.resolveExpr(expr.rValue);
  }

  visitClassInstantiationExpression(expr: ClassInstantiationExpression) {
    this.resolveExpr(expr.callExpression);
  }

  visitInstanceGetExpression(expr: InstanceGetExpression) {
    this.resolveExpr(expr.instance);
  }

  visitThisExpression(expr: ThisExpression) {
    this.resolveBinding(expr, TokenType.THIS);
  }

  // statements

  visitVariableDeclarationStatement(statement: VariableDeclarationStatement) {
    statement.declarations.forEach(declaration => {
      const variableName = declaration.identifier.literalValue as string;
      this.declare(variableName);

      if (declaration.initializer) {
        this.resolveExpr(declaration.initializer);
      }

      this.define(variableName);
    });
  }

  visitFunctionDeclarationStatement(statement: FunctionDeclarationStatement) {
    this.define(statement.functionName.literalValue as string);
    this.beginScope();
    statement.args.forEach(arg => this.define(arg.literalValue as string));
    this.resolveStmts(statement.body.statements);
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

  visitClassDeclarationStatement(statement: ClassDeclarationStatement) {
    this.define(statement.className.literalValue as string);

    this.beginScope();
    this.define(TokenType.THIS);
    this.resolveStmts(statement.methods);
    this.endScope();
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
