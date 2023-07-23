import { Expression } from "./expr";

export interface StatementVisitor {
  visitExpressionStatement(statement: ExpressionStatement): any;
  visitPrintStatement(statement: PrintStatement): any;
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

export class PrintStatement extends Statement {
  constructor(public expression: Expression) {
    super();
  }

  accept(visitor: StatementVisitor) {
    return visitor.visitPrintStatement(this);
  }
}
