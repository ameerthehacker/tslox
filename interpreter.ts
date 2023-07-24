import { BinaryExpression, Expression, ExpressionVisitor, GroupingExpression, Literal, TernaryExpression, UnaryExpression } from "./expr";
import { TokenType } from "./lexer";
import { ExpressionStatement, PrintStatement, StatementVisitor, VariableDeclarationStatement } from "./stmt";

class Environment {
  constructor(private map: Map<string, any> = new Map()) {}

  define(variableName: string, value: any) {
    this.map.set(variableName, value);
  }

  get(variableName: string) {
    if (this.map.has(variableName)) {
      return this.map.get(variableName);
    } else {
      throw new Error(`Undefined variable ${variableName}`);
    }
  }
}

const globalEnvironment = new Environment();

export class ExpressionInterpreter implements ExpressionVisitor {
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
    if (expr.value.type === TokenType.IDENTIFIER) return globalEnvironment.get(expr.value.literalValue as string);
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

  visitTernaryExpr(expr: TernaryExpression) {
    let conditionalValue = this.eval(expr.conditionalExpression);

    if (conditionalValue) {
      return this.eval(expr.truthyExpression);
    } else {
      return this.eval(expr.falsyExpression);
    }
  }

  visitBinaryExpr(expr: BinaryExpression) {
    const leftValue = this.eval(expr.leftExpr);
    const rightValue = this.eval(expr.rightExpr);

    switch(expr.operator.type) {
      case TokenType.CARET: {
        return Math.pow(this.assertNumber(leftValue), this.assertNumber(rightValue));
      }
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
      case TokenType.GT: {
        return this.assertNumber(leftValue) > this.assertNumber(rightValue);
      }
      case TokenType.GTE: {
        return this.assertNumber(leftValue) >= this.assertNumber(rightValue);
      }
      case TokenType.LT: {
        return this.assertNumber(leftValue) < this.assertNumber(rightValue);
      }
      case TokenType.LTE: {
        return this.assertNumber(leftValue) <= this.assertNumber(rightValue);
      }
      case TokenType.EQ_EQ: {
        return leftValue === rightValue;
      }
      case TokenType.BANG_EQ: {
        return leftValue !== rightValue;
      }
    }
  }
}

export class StatementInterpreter implements StatementVisitor {
  constructor(private expressionInterpreter: ExpressionInterpreter) {}

  visitExpressionStatement(statement: ExpressionStatement) {
    return this.expressionInterpreter.eval(statement.expression);  
  }

  visitPrintStatement(statement: PrintStatement) {
    const value = this.expressionInterpreter.eval(statement.expression);

    console.log(value);
  }

  visitVariableDeclarationStatement(statement: VariableDeclarationStatement) {
    const variableDeclarations = statement.declarations;

    for (const variableDeclaration of variableDeclarations) {
      const initializer = variableDeclaration.initializer;
      let initializerValue = 0;

      if (initializer) {
        initializerValue = this.expressionInterpreter.eval(initializer);
      }

      globalEnvironment.define(variableDeclaration.identifier, initializerValue);
    }
  }
}
