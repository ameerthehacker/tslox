import { ErrorReporter, TSLoxError } from "./error";
import { AssignmentExpression, BinaryExpression, Expression, ExpressionVisitor, GroupingExpression, Literal, TernaryExpression, UnaryExpression } from "./expr";
import { TokenType } from "./lexer";
import { ExpressionStatement, PrintStatement, StatementVisitor, VariableDeclarationStatement } from "./stmt";
import { Location } from "./types";

const Errors = {
  undefinedVariable: (variableName: string, location: Location) => new TSLoxError('Runtime', location, `undefined variable '${variableName}'`)
} 

class Environment {
  constructor(private map: Map<string, any> = new Map()) {}

  define(variableName: string, value: any) {
    this.map.set(variableName, value);
  }

  get(variableName: string) {
    return this.map.get(variableName);
  }

  isDefined(variableName: string) {
    return this.map.has(variableName);
  }
}

const globalEnvironment = new Environment();

export class ExpressionInterpreter implements ExpressionVisitor {
  constructor(private errorReporter: ErrorReporter) {}

  public interpret(expr: Expression): any {
    try {
      return expr.accept(this);
    } catch (err) {
      const _err = err as TSLoxError;

      this.errorReporter.report(_err);
    }
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
    if (expr.value.type === TokenType.IDENTIFIER) {
      const variableName = expr.value.literalValue as string;

      if (globalEnvironment.isDefined(variableName)) {
        return globalEnvironment.get(expr.value.literalValue as string);
      } else {
        throw Errors.undefinedVariable(variableName, expr.value.location);
      }
    }
    else return expr.value.literalValue || 0;
  }

  visitUnaryExpr(expr: UnaryExpression) {
    const value = this.interpret(expr.expr);

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
    return this.interpret(expr.expr);
  }

  visitTernaryExpr(expr: TernaryExpression) {
    let conditionalValue = this.interpret(expr.conditionalExpression);

    if (conditionalValue) {
      return this.interpret(expr.truthyExpression);
    } else {
      return this.interpret(expr.falsyExpression);
    }
  }

  visitBinaryExpr(expr: BinaryExpression) {
    const leftValue = this.interpret(expr.leftExpr);
    const rightValue = this.interpret(expr.rightExpr);

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

  visitAssignmentExpr(expr: AssignmentExpression) {
    const variableName = expr.lValue.literalValue as string;
    const value = this.interpret(expr.rValue);

    if (globalEnvironment.isDefined(variableName)) {
      globalEnvironment.define(variableName, value);
    } else {
      throw Errors.undefinedVariable(variableName, expr.lValue.location);
    }

    return value;
  }
}

export class StatementInterpreter implements StatementVisitor {
  constructor(private expressionInterpreter: ExpressionInterpreter) {}

  visitExpressionStatement(statement: ExpressionStatement) {
    return this.expressionInterpreter.interpret(statement.expression);  
  }

  visitPrintStatement(statement: PrintStatement) {
    const value = this.expressionInterpreter.interpret(statement.expression);

    console.log(value);
  }

  visitVariableDeclarationStatement(statement: VariableDeclarationStatement) {
    const variableDeclarations = statement.declarations;

    for (const variableDeclaration of variableDeclarations) {
      const initializer = variableDeclaration.initializer;
      let initializerValue = 0;

      if (initializer) {
        initializerValue = this.expressionInterpreter.interpret(initializer);
      }

      globalEnvironment.define(variableDeclaration.identifier, initializerValue);
    }
  }
}
