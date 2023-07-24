import { Expression } from "./expr";

export type VariableDeclaration = {identifier: string, initializer: Expression | null};

export interface StatementVisitor {
  visitExpressionStatement(statement: ExpressionStatement): any;
  visitPrintStatement(statement: PrintStatement): any;
  visitVariableDeclarationStatement(statement: VariableDeclarationStatement): any;
}

export abstract class Statement {
  accept(visitor: StatementVisitor): any {}
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

export class PrintStatement extends Statement {
  constructor(public expression: Expression) {
    super();
  }

  accept(visitor: StatementVisitor) {
    return visitor.visitPrintStatement(this);
  }
}
