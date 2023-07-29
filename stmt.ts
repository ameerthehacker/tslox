import { Expression } from "./expr";
import { Token } from "./lexer";

export type VariableDeclaration = {identifier: Token, initializer: Expression | null};

export interface StatementVisitor {
  visitExpressionStatement(statement: ExpressionStatement): any;
  visitPrintStatement(statement: PrintStatement): any;
  visitVariableDeclarationStatement(statement: VariableDeclarationStatement): any;
  visitBlockStatement(statement: Statement): any
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

export class PrintStatement extends Statement {
  constructor(public expression: Expression) {
    super();
  }

  accept(visitor: StatementVisitor) {
    return visitor.visitPrintStatement(this);
  }
}
