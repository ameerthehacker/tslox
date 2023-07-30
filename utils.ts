import { AssignmentExpression, BinaryExpression, Expression, ExpressionVisitor, FunctionCallExpression, GroupingExpression, Literal, TernaryExpression, UnaryExpression } from "./expr";

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

  visitTernaryExpr(expr: TernaryExpression) {
    return this.parenthesis('ternary', expr.conditionalExpression, expr.truthyExpression, expr.falsyExpression);
  }

  visitAssignmentExpr(expr: AssignmentExpression)  {
    return this.parenthesis(`${expr.lValue.literalValue} =`, expr.rValue);
  }

  visitFunctionCallExpr(expr: FunctionCallExpression) {
    return this.parenthesis(`func ${expr.calle.accept(this)}`, ...expr.args);
  };
}

export function printExpression(expr: Expression) {
  const expressionPrinter = new ExpressionPrinter();

  console.log(expr.accept(expressionPrinter));
}
