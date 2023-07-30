import { Expression } from "./expr";
import { Token } from "./lexer";
import { TokenLocation } from "./types";

export type VariableDeclaration = {identifier: Token, initializer: Expression | null};

export interface StatementVisitor {
  visitExpressionStatement(statement: ExpressionStatement): any;
  visitVariableDeclarationStatement(statement: VariableDeclarationStatement): any;
  visitBlockStatement(statement: BlockStatement): any;
  visitIfStatement(statement: IfStatement): any;
  visitWhileStatement(statement: WhileStatement): any;
  visitFunctionDeclarationStatement(statement: FunctionDeclarationStatement): any;
  visitReturnStatement(statement: ReturnStatement): any;
}

export abstract class Statement {
  abstract accept(visitor: StatementVisitor): any;
}

export class ExpressionStatement extends Statement {
  constructor(public expression: Expression) {
    super();
  }

  accept(visitor: StatementVisitor) {
    return visitor.visitExpressionStatement(this);
  }
}

export class VariableDeclarationStatement extends Statement {
  constructor(public declarations: VariableDeclaration[]) {
    super();
  }

  accept(visitor: StatementVisitor) {
    return visitor.visitVariableDeclarationStatement(this);
  }
}

export class BlockStatement extends Statement {
  constructor(public statements: Statement[]) {
    super();
  }

  accept(visitor: StatementVisitor) {
    return visitor.visitBlockStatement(this);
  }
}

export class IfStatement extends Statement {
  constructor(public condition: Expression, public trueStatement: Statement, public falseStatement?: Statement | null) {
    super();
  }

  accept(visitor: StatementVisitor) {
    visitor.visitIfStatement(this);
  }
}

export class WhileStatement extends Statement {
  constructor(public condition: Expression, public body: Statement) {
    super();
  }

  accept(visitor: StatementVisitor) {
    visitor.visitWhileStatement(this);
  }
}

export class FunctionDeclarationStatement extends Statement {
  constructor(public functionName: Token, public args: Token[], public body: BlockStatement) {
    super();
  }

  accept(visitor: StatementVisitor) {
    return visitor.visitFunctionDeclarationStatement(this);
  }
}

export class ReturnStatement extends Statement {
  constructor(public returnTokenLocation: TokenLocation,  public returnExpr: Expression | null) {
    super();
  }

  accept(visitor: StatementVisitor) {
    visitor.visitReturnStatement(this);
  }
}
