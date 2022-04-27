import { Token } from './lexer';

interface ExprVisitor {
  visitBinaryExpr: (expr: BinaryExpr) => any;
  visitUnaryExpr: (expr: UnaryExpr) => any;
  visitGroupingExpr: (expr: GroupingExpr) => any;
  visitLiteral: (expr: LiteralExpr) => any;
}

export abstract class Expr {
  abstract accept(visitor: ExprVisitor): void;
}

export class BinaryExpr extends Expr {
  constructor(
    public leftExpr: Expr,
    public operator: Token,
    public rightExpr: Expr
  ) {
    super();
  }

  accept(visitor: ExprVisitor): void {
    return visitor.visitBinaryExpr(this);
  }
}

export class UnaryExpr extends Expr {
  constructor(public operator: Token, public expr: Expr) {
    super();
  }

  accept(visitor: ExprVisitor): void {
    return visitor.visitUnaryExpr(this);
  }
}

export class GroupingExpr extends Expr {
  constructor(expr: Expr) {
    super();
  }

  accept(visitor: ExprVisitor): void {
    return visitor.visitGroupingExpr(this);
  }
}

export class LiteralExpr extends Expr {
  constructor(public value: Token) {
    super();
  }

  accept(visitor: ExprVisitor): void {
    return visitor.visitLiteral(this);
  }
}
