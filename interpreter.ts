import { BinaryExpression, Expression, ExpressionVisitor, GroupingExpression, Literal, UnaryExpression } from "./expr";
import { TokenType } from "./lexer";

export class Interpreter implements ExpressionVisitor {
  public eval(expr: Expression): any {
    return expr.accept(this);
  }

  private assertNumber(value: any) {
    if (isNaN(value)) {
      throw new Error('expected operand to be a number');
    } else {
      return value as number;
    }
  }

  visitLiteral(expr: Literal) {
    if (expr.value.type === TokenType.NONE) return 0;
    if (expr.value.type === TokenType.TRUE) return 1;
    if (expr.value.type === TokenType.FALSE) return 0;
    else return expr.value.literalValue || 0;
  }

  visitUnaryExpr(expr: UnaryExpression) {
    const value = this.eval(expr.expr);

    switch (expr.operator.type) {
      case TokenType.MINUS: {
        return -this.assertNumber(value);
      }
      case TokenType.PLUS: {
        return this.assertNumber(value);
      }
      case TokenType.BANG: {
        if (value) {
          return 0;
        } else {
          return 1;
        }
      }
    }
  }

  visitGroupingExpr(expr: GroupingExpression) {
    return this.eval(expr.expr);
  }

  visitBinaryExpr(expr: BinaryExpression) {
    const leftValue = this.eval(expr.leftExpr);
    const rightValue = this.eval(expr.rightExpr);

    switch(expr.operator.type) {
      case TokenType.PLUS: {
        return leftValue + rightValue;
      }
      case TokenType.MINUS: {
        return this.assertNumber(leftValue) - this.assertNumber(rightValue);
      }
      case TokenType.MUL: {
        return this.assertNumber(leftValue) * this.assertNumber(rightValue);
      }
      case TokenType.SLASH: {
        return this.assertNumber(leftValue) / this.assertNumber(rightValue);
      }
    }
  }
}