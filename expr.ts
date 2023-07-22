import { Token } from './lexer';

interface ExpressionVisitor {
  visitBinaryExpr: (expr: BinaryExpression) => any;
  visitUnaryExpr: (expr: UnaryExpression) => any;
  visitGroupingExpr: (expr: GroupingExpression) => any;
  visitLiteral: (expr: Literal) => any;
}

export abstract class Expression {
  abstract accept(visitor: ExpressionVisitor): void;
}

export class BinaryExpression extends Expression {
  constructor(
    public leftExpr: Expression,
    public operator: Token,
    public rightExpr: Expression
  ) {
    super();
  }

  accept(visitor: ExpressionVisitor): void {
    return visitor.visitBinaryExpr(this);
  }
}

export class UnaryExpression extends Expression {
  constructor(public operator: Token, public expr: Expression) {
    super();
  }

  accept(visitor: ExpressionVisitor): void {
    return visitor.visitUnaryExpr(this);
  }
}

export class GroupingExpression extends Expression {
  constructor(public expr: Expression) {
    super();
  }

  accept(visitor: ExpressionVisitor): void {
    return visitor.visitGroupingExpr(this);
  }
}

export class Literal extends Expression {
  constructor(public value: Token) {
    super();
  }

  accept(visitor: ExpressionVisitor): void {
    return visitor.visitLiteral(this);
  }
}