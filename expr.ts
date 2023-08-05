import { Token } from './lexer';
import { TokenLocation } from './types';

export interface ExpressionVisitor {
  visitAssignmentExpr: (expr: AssignmentExpression) => any;
  visitTernaryExpr: (expr: TernaryExpression) => any;
  visitBinaryExpr: (expr: BinaryExpression) => any;
  visitUnaryExpr: (expr: UnaryExpression) => any;
  visitGroupingExpr: (expr: GroupingExpression) => any;
  visitLiteral: (expr: Literal) => any;
  visitFunctionCallExpr: (expr: FunctionCallExpression) => any;
}

export abstract class Expression {
  constructor(public location: TokenLocation) {}

  abstract accept(visitor: ExpressionVisitor): any;
}

export class TernaryExpression extends Expression {
  constructor(public location: TokenLocation, public conditionalExpression: Expression, public truthyExpression: Expression, public falsyExpression: Expression) {
    super(location);
  }

  accept(visitor: ExpressionVisitor) {
    return visitor.visitTernaryExpr(this);
  }
}

export class BinaryExpression extends Expression {
  constructor(
    public location: TokenLocation,
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
  constructor(
    public location: TokenLocation,
    public operator: Token,
    public expr: Expression,
    public isPostfix: boolean = false
  ) {
    super(location);
  }

  accept(visitor: ExpressionVisitor): void {
    return visitor.visitUnaryExpr(this);
  }
}

export class AssignmentExpression extends Expression {
  constructor(public location: TokenLocation, public lValue: Token, public rValue: Expression) {
    super(location);
  }

  accept(visitor: ExpressionVisitor) {
    return visitor.visitAssignmentExpr(this);
  }
}

export class GroupingExpression extends Expression {
  constructor(public location: TokenLocation, public expr: Expression) {
    super(location);
  }

  accept(visitor: ExpressionVisitor): void {
    return visitor.visitGroupingExpr(this);
  }
}

export class FunctionCallExpression extends Expression {
  constructor(public location: TokenLocation, public calle: Expression, public args: Expression[]) {
    super(location);
  }

  accept(visitor: ExpressionVisitor) {
    return visitor.visitFunctionCallExpr(this);
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
