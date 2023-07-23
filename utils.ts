import { BinaryExpression, Expression, ExpressionVisitor, GroupingExpression, Literal, UnaryExpression } from "./expr";

class ExpressionPrinter implements ExpressionVisitor {
  private parenthesis(operator: string, ...expressions: Expression[]) {
    let exprStr = `(${operator}`;

    for (const expr  of expressions) {
      exprStr += expr.accept(this);
    }

    exprStr += ')';

    return exprStr;
  }

  visitBinaryExpr(expr: BinaryExpression) {
    return this.parenthesis(expr.operator.type, expr.leftExpr, expr.rightExpr);
  }

  visitUnaryExpr(expr: UnaryExpression) {
    return this.parenthesis(expr.operator.type, expr.expr);
  }

  visitGroupingExpr(expr: GroupingExpression) {
    return this.parenthesis('group', expr.expr);
  }

  visitLiteral(expr: Literal) {
    const value = expr.value.literalValue || '';

    return this.parenthesis(value.toString());
  }
}

export function printExpression(expr: Expression) {
  const expressionPrinter = new ExpressionPrinter();

  console.log(expr.accept(expressionPrinter));
}
