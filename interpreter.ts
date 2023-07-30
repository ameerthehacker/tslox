import { ErrorReporter, TSLoxError } from "./error";
import { AssignmentExpression, BinaryExpression, Expression, ExpressionVisitor, FunctionCallExpression, GroupingExpression, Literal, TernaryExpression, UnaryExpression } from "./expr";
import { TokenType } from "./lexer";
import { BlockStatement, ExpressionStatement, FunctionDeclarationStatement, IfStatement, StatementVisitor, VariableDeclarationStatement, WhileStatement } from "./stmt";
import { TokenLocation } from "./types";

const Errors = {
  undefinedVariable: (variableName: string, location: TokenLocation) => new TSLoxError('Runtime', location, `undefined variable '${variableName}'`)
} 

class Environment {
  private map: Map<string, any> = new Map()

  constructor(private _outerScope?: Environment) {}

  define(variableName: string, value: any) {
    this.map.set(variableName, value);
  }

  assign(variableName: string, value: any) {
    if (this.isDefinedInScope(variableName)) {
      this.map.set(variableName, value);
    } else {
      this._outerScope?.assign(variableName, value);
    }
  }

  get(variableName: string): any {
    if (this.map.has(variableName)) {
      return this.map.get(variableName)
    } else {
      return this._outerScope?.get(variableName);
    }
  }

  isDefined(variableName: string): boolean {
    return this.map.has(variableName) || Boolean(this._outerScope?.isDefined(variableName));
  }

  isDefinedInScope(variableName: string): boolean {
    return this.map.has(variableName);
  }

  public get outerScope() {
    return this._outerScope;
  }
}

let environment = new Environment();

abstract class LoxCallable {
  constructor(public arity: number) {}

  abstract call(...args: any[]): any;

  abstract toString(): string;
}

class LoxCallableFn extends LoxCallable {
  constructor(private outerScopeEnvironment: Environment, private functionDeclaration: FunctionDeclarationStatement, private interpreter: StatementInterpreter) {
    super(functionDeclaration.args.length);
  }

  call(...args: any[]) {
    const environment = new Environment(this.outerScopeEnvironment);
    const argNames = this.functionDeclaration.args.map(arg => arg.literalValue as string);

    argNames.forEach((argName, index) => environment.define(argName, args[index]));

    this.interpreter.interpretBlockStatement(this.functionDeclaration.body, environment);
  }

  toString(): string {
    return `fn <${this.functionDeclaration.functionName.literalValue}>`;
  }
}

abstract class NativeLoxCallable extends LoxCallable {
  abstract call(...args: any[]): any;

  toString(): string {
    return 'fn <native>';
  }
}

class NativeClock extends NativeLoxCallable {
  constructor(arity: number) {
    super(arity);
  }

  call(...args: any[]) {
    return performance.now();  
  }
}

class NativePrint extends NativeLoxCallable {
  constructor(arity: number) {
    super(arity);
  }

  call(...args: any[]) {
    console.log(String(args[0]));
  }
}

environment.define('clock', new NativeClock(0));
environment.define('print', new NativePrint(1));

export class ExpressionInterpreter implements ExpressionVisitor {
  constructor(private errorReporter: ErrorReporter) {}

  public interpret(expr: Expression): any {
    try {
      return expr.accept(this);
    } catch (err) {
      if (err instanceof TSLoxError) {
        this.errorReporter.report(err);
      } else {
        throw err;
      }
    }
  }

  private assertNumber(expr: Expression) {
    const value = this.interpret(expr);

    if (isNaN(value)) {
      throw new TSLoxError('Runtime', expr.location, 'expected operand to be a number');
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

      if (environment.isDefined(variableName)) {
        return environment.get(expr.value.literalValue as string);
      } else {
        throw Errors.undefinedVariable(variableName, expr.value.location);
      }
    }
    else return expr.value.literalValue || 0;
  }

  visitUnaryExpr(expr: UnaryExpression) {
    switch (expr.operator.type) {
      case TokenType.MINUS: {
        return -this.assertNumber(expr.expr);
      }
      case TokenType.PLUS: {
        return this.assertNumber(expr.expr);
      }
      case TokenType.BANG: {
        const value = this.interpret(expr.expr);

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
   

    switch(expr.operator.type) {
      case TokenType.CARET: {
        return Math.pow(this.assertNumber(expr.leftExpr), this.assertNumber(expr.rightExpr));
      }
      case TokenType.PLUS: {
        return this.interpret(expr.leftExpr) + this.interpret(expr.rightExpr);
      }
      case TokenType.MINUS: {
        return this.assertNumber(expr.leftExpr) - this.assertNumber(expr.rightExpr);
      }
      case TokenType.MUL: {
        return this.assertNumber(expr.leftExpr) * this.assertNumber(expr.rightExpr);
      }
      case TokenType.SLASH: {
        return this.assertNumber(expr.leftExpr) / this.assertNumber(expr.rightExpr);
      }
      case TokenType.GT: {
        return this.assertNumber(expr.leftExpr) > this.assertNumber(expr.rightExpr);
      }
      case TokenType.GTE: {
        return this.assertNumber(expr.leftExpr) >= this.assertNumber(expr.rightExpr);
      }
      case TokenType.LT: {
        return this.assertNumber(expr.leftExpr) < this.assertNumber(expr.rightExpr);
      }
      case TokenType.LTE: {
        return this.assertNumber(expr.leftExpr) <= this.assertNumber(expr.rightExpr);
      }
      case TokenType.EQ_EQ: {
        const leftValue = this.interpret(expr.leftExpr);
        const rightValue = this.interpret(expr.rightExpr);

        return leftValue === rightValue;
      }
      case TokenType.BANG_EQ: {
        const leftValue = this.interpret(expr.leftExpr);
        const rightValue = this.interpret(expr.rightExpr);

        return leftValue !== rightValue;
      }
    }
  }

  visitAssignmentExpr(expr: AssignmentExpression) {
    const variableName = expr.lValue.literalValue as string;
    const value = this.interpret(expr.rValue);

    if (environment.isDefined(variableName)) {
      environment.assign(variableName, value);
    } else {
      throw Errors.undefinedVariable(variableName, expr.lValue.location);
    }

    return value;
  }

  visitFunctionCallExpr(expr: FunctionCallExpression) {
    const loxCallable = this.interpret(expr.calle);

    if (loxCallable instanceof LoxCallable) {
      if (loxCallable.arity !== expr.args.length) {
        throw new TSLoxError('Runtime', expr.calle.location, `expected ${loxCallable.arity} args but got ${expr.args.length}`);
      }

      const args = expr.args.map(arg => this.interpret(arg));
      return loxCallable.call(...args);
    } else {
      throw new TSLoxError('Runtime', expr.calle.location, `'${loxCallable}' is not callable`);
    }
  }
}

export class StatementInterpreter implements StatementVisitor {
  constructor(private expressionInterpreter: ExpressionInterpreter) {}

  visitExpressionStatement(statement: ExpressionStatement) {
    return this.expressionInterpreter.interpret(statement.expression);  
  }

  visitVariableDeclarationStatement(statement: VariableDeclarationStatement) {
    const variableDeclarations = statement.declarations;

    for (const variableDeclaration of variableDeclarations) {
      const variableName = variableDeclaration.identifier.literalValue as string;
      const initializer = variableDeclaration.initializer;
      let initializerValue = 0;

      if (initializer) {
        initializerValue = this.expressionInterpreter.interpret(initializer);
      }

      if (environment.isDefinedInScope(variableName)) {
        throw new TSLoxError('Runtime', variableDeclaration.identifier.location, `identifier '${variableName}' is already declared in current scope`);
      }

      environment.define(variableName, initializerValue);
    }
  }

  interpretBlockStatement(blockStatement: BlockStatement, env: Environment) {
    environment = env;
    blockStatement.statements.forEach(statement => statement.accept(this));

    if (environment.outerScope) {
      environment = environment.outerScope;
    }
  }

  visitBlockStatement(statement: BlockStatement) {
    this.interpretBlockStatement(statement, new Environment(environment));
  }

  visitFunctionDeclarationStatement(statement: FunctionDeclarationStatement) {
    const functionName = statement.functionName.literalValue as string;

    environment.define(functionName, new LoxCallableFn(environment, statement, this));
  }

  visitIfStatement(statement: IfStatement) {
    const conditionValue = this.expressionInterpreter.interpret(statement.condition);

    if (conditionValue) {
      statement.trueStatement.accept(this);
    } else {
      statement.falseStatement?.accept(this);
    }
  }

  visitWhileStatement(statement: WhileStatement) {
    let conditionValue = this.expressionInterpreter.interpret(statement.condition);

    while (conditionValue) {
      statement.body.accept(this);
      conditionValue = this.expressionInterpreter.interpret(statement.condition);
    }
  }
}
