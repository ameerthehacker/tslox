import { Token } from './lexer';
import { Location } from './types';

export interface ExpressionVisitor {
  visitAssignmentExpr: (expr: AssignmentExpression) => any;
  visitTernaryExpr: (expr: TernaryExpression) => any;
  visitBinaryExpr: (expr: BinaryExpression) => any;
  visitUnaryExpr: (expr: UnaryExpression) => any;
  visitGroupingExpr: (expr: GroupingExpression) => any;
  visitLiteral: (expr: Literal) => any;
}

export abstract class Expression {
  constructor(public location: Location) {}

  abstract accept(visitor: ExpressionVisitor): any;
}

export class TernaryExpression extends Expression {
  constructor(public location: Location, public conditionalExpression: Expression, public truthyExpression: Expression, public falsyExpression: Expression) {
    super(location);
  }

  accept(visitor: ExpressionVisitor) {
    return visitor.visitTernaryExpr(this);
  }
}

export class BinaryExpression extends Expression {
  constructor(
    public location: Location,
    public leftExpr: Expression,
    public operator: Token,
    public rightExpr: Expression
  ) {
    super(location);
  }

  accept(visitor: ExpressionVisitor): void {
    return visitor.visitBinaryExpr(this);
  }
}

export class UnaryExpression extends Expression {
  constructor(public location: Location, public operator: Token, public expr: Expression) {
    super(location);
  }

  accept(visitor: ExpressionVisitor): void {
    return visitor.visitUnaryExpr(this);
  }
}

export class AssignmentExpression extends Expression {
  constructor(public location: Location, public lValue: Token, public rValue: Expression) {
    super(location);
  }

  accept(visitor: ExpressionVisitor) {
    return visitor.visitAssignmentExpr(this);
  }
}

export class GroupingExpression extends Expression {
  constructor(public location: Location, public expr: Expression) {
    super(location);
  }

  accept(visitor: ExpressionVisitor): void {
    return visitor.visitGroupingExpr(this);
  }
}

export class Literal extends Expression {
  constructor(public value: Token) {
    super(value.location);
  }

  accept(visitor: ExpressionVisitor): void {
    return visitor.visitLiteral(this);
  }
}
