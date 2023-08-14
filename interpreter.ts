import { ErrorReporter, ReturnStatementError, TSLoxError } from "./error";
import { AssignmentExpression, BinaryExpression, ClassInstantiationExpression, Expression, ExpressionVisitor, FunctionCallExpression, GroupingExpression, InstanceGetExpression, Literal, TernaryExpression, ThisExpression, UnaryExpression } from "./expr";
import { Token, TokenType } from "./lexer";
import { Bindings } from "./resolver";
import { BlockStatement, ClassDeclarationStatement, ExpressionStatement, FunctionDeclarationStatement, IfStatement, ReturnStatement, Statement, StatementVisitor, VariableDeclarationStatement, WhileStatement } from "./stmt";
import { TokenLocation } from "./types";

const Errors = {
  undefinedVariable: (variableName: string, location: TokenLocation) => new TSLoxError('Runtime', location, `undefined variable '${variableName}'`),
  propertyOnlyOnClass: (location: TokenLocation) => new TSLoxError('Runtime', location, 'property can be only accessed on a class instance')
} 

class Environment {
  private declarations: Map<string, any> = new Map()

  constructor(private _outerScope?: Environment) {}

  define(variableName: string, value: any) {
    this.declarations.set(variableName, value);
  }

  assign(variableName: string, value: any, depth?: number) {
    if (depth !== undefined) {
      const environment = this.resolve(depth);

      return environment?.setValue(variableName, value);
    } 
    else {
      this.setGlobalVariable(variableName, value);
    }
  }

  getValue(variableName: string) {
    return this.declarations.get(variableName);
  }

  setValue(variableName: string, value: any) {
    this.declarations.set(variableName, value);
  }

  private getGlobalVariable(variableName: string) {
    return this.getGlobalEnvironment().getValue(variableName);
  }

  private setGlobalVariable(variableName: string, value: any) {
    this.getGlobalEnvironment()?.setValue(variableName, value);
  }

  private getGlobalEnvironment() {
    let environment: Environment | undefined = this;

    while (environment?._outerScope) {
      environment = environment.outerScope;
    }

    return environment as Environment;
  }

  get(variableName: string, depth?: number): any {
    if (depth !== undefined) {
      const environment = this.resolve(depth);

      return environment?.getValue(variableName);
    } else {
      return this.getGlobalVariable(variableName);
    }
  }

  isDefined(variableName: string): boolean {
    return this.declarations.has(variableName) || Boolean(this._outerScope?.isDefined(variableName));
  }

  isDefinedInScope(variableName: string): boolean {
    return this.declarations.has(variableName);
  }

  resolve(depth: number): Environment | undefined {
    let environment: Environment | undefined = this;

    for (let i = 0; i < depth; i++) {
      environment = environment?._outerScope;
    }

    return environment;
  }

  public get outerScope() {
    return this._outerScope;
  }
}

let currentEnvironment = new Environment();

abstract class LoxCallable {
  constructor(public arity: number) {}

  abstract call(...args: any[]): any;

  abstract toString(): string;
}

class LoxCallableFn extends LoxCallable {
  private loxInstance: LoxInstance | null;

  constructor(private closure: Environment, private functionDeclaration: FunctionDeclarationStatement, private interpreter: TSLoxInterpreter) {
    super(functionDeclaration.args.length);
    this.loxInstance = null;
  }

  get functionName() {
    return this.functionDeclaration.functionName.literalValue as string;
  }

  bind(loxInstance: LoxInstance) {
    this.loxInstance = loxInstance;

    return this;
  }

  call(...args: any[]) {
    let environment = new Environment(this.closure);

    if (this.loxInstance !== null) {
      this.closure.define(TokenType.THIS, this.loxInstance);
    }

    const argNames = this.functionDeclaration.args.map(arg => arg.literalValue as string);
    const oldEnvironment = currentEnvironment;

    argNames.forEach((argName, index) => environment.define(argName, args[index]));

    try {
      this.interpreter.interpretBlockStatement(this.functionDeclaration.body, environment);
    } catch (err) {
      if (err instanceof ReturnStatementError) {  
        if (err.returnStatement.returnExpr) {
          const returnValue = this.interpreter.interpretExpression(err.returnStatement.returnExpr);
          currentEnvironment = oldEnvironment;

          return returnValue;
        }
      } else {
        throw err;
      }
    }
  }

  toString(): string {
    return `fn <${this.functionDeclaration.functionName.literalValue}>`;
  }
}

class LoxClass {
  private methods: LoxCallableFn[];

  constructor(public classDeclaration: ClassDeclarationStatement, interpreter: TSLoxInterpreter) {
    this.methods = classDeclaration.methods.map(fn => new LoxCallableFn(new Environment(currentEnvironment), fn, interpreter))
  }

  get arity() {
    const constructor = this.findMethod('constructor');

    if (constructor) {
      return constructor.arity;
    } else {
      return 0;
    }
  }

  findMethod(methodName: string) {
    return this.methods.find(method => method.functionName === methodName);
  }

  toString() {
    return `class <${this.classDeclaration.className.literalValue}>`;
  }
}

class LoxInstance {
  private fields: Map<string, any>;

  constructor(public loxClass: LoxClass) {
    this.fields = new Map();
  }

  getProperty(property: Token) {
    const propertyName = property.literalValue as string;

    if (this.fields.has(propertyName)) {
      return this.fields.get(propertyName);
    } else {
      const method = this.loxClass.findMethod(propertyName);

      if (method) return method.bind(this);
      else throw new TSLoxError('Runtime', property.location, `accessing undefined property ${propertyName} on instance`);
    }
  }

  setField(property: Token, value: any) {
    const propertyName = property.literalValue as string;
    
    this.fields.set(propertyName, value);
  }

  toString() {
   return `instance <${this.loxClass.classDeclaration.className.literalValue}>`;
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

  call( ...args: any[]) {
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

currentEnvironment.define('clock', new NativeClock(0));
currentEnvironment.define('print', new NativePrint(1));

export class ExpressionInterpreter implements ExpressionVisitor {
  constructor(private bindings: Bindings) {}

  public interpret(expr: Expression): any {
    return expr.accept(this);
  }

  private assertNumber(expr: Expression) {
    const value = this.interpret(expr);

    if (isNaN(value)) {
      throw new TSLoxError('Runtime', expr.location, 'expected operand to be a number');
    } else {
      return value as number;
    }
  }

  visitThisExpression(expr: ThisExpression) {
    const depth = this.bindings.get(expr);

    return currentEnvironment.get(TokenType.THIS, depth);
  }

  visitLiteral(expr: Literal) {
    if (expr.value.type === TokenType.NONE) return 0;
    if (expr.value.type === TokenType.TRUE) return 1;
    if (expr.value.type === TokenType.FALSE) return 0;
    if (expr.value.type === TokenType.IDENTIFIER) {
      const variableName = expr.value.literalValue as string;

      if (currentEnvironment.isDefined(variableName)) {
        const depth = this.bindings.get(expr);

        return currentEnvironment.get(variableName, depth);
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
      case TokenType.PLUS_PLUS: {
        if (expr.expr instanceof Literal) {
          if (expr.expr.value.type === TokenType.IDENTIFIER) {
            const oldValue = this.assertNumber(expr.expr);
            const newValue = oldValue + 1;

            currentEnvironment.assign(expr.expr.value.literalValue as string, newValue, this.bindings.get(expr.expr));

            return expr.isPostfix? oldValue: newValue;
          }
        } else {
          throw new TSLoxError('Runtime', expr.expr.location, 'operand of increment operator must be an identifier');
        }
      }
      case TokenType.MINUS_MINUS: {
        if (expr.expr instanceof Literal) {
          if (expr.expr.value.type === TokenType.IDENTIFIER) {
            const oldValue = this.assertNumber(expr.expr);
            const newValue = oldValue - 1;

            currentEnvironment.assign(expr.expr.value.literalValue as string, newValue, this.bindings.get(expr.expr));
            
            return expr.isPostfix? oldValue: newValue;
          }
        } else {
          throw new TSLoxError('Runtime', expr.expr.location, 'operand of decrement operator must be an identifier');
        }
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
    const value = this.interpret(expr.rValue);

    if (expr.lValue instanceof Literal) {
      const variableName = expr.lValue.value.literalValue as string;

      if (currentEnvironment.isDefined(variableName)) {
        currentEnvironment.assign(variableName, value, this.bindings.get(expr.lValue));
      } else {
        throw Errors.undefinedVariable(variableName, expr.lValue.location);
      }
    } else if (expr.lValue instanceof InstanceGetExpression) {
      const instance = this.interpret(expr.lValue.instance);

      if (instance instanceof LoxInstance) {
        instance.setField(expr.lValue.property, value);
      } else {
        throw Errors.propertyOnlyOnClass(expr.lValue.location);
      }
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
    } else if (loxCallable instanceof LoxClass) {
      throw new TSLoxError('Runtime', expr.calle.location, `class '${loxCallable.classDeclaration.className.literalValue}' can be only instantiated using the new operator`);
    }
    else {
      throw new TSLoxError('Runtime', expr.calle.location, `'${loxCallable}' is not callable`);
    }
  }

  visitClassInstantiationExpression(expr: ClassInstantiationExpression) {
    const loxClass = this.interpret(expr.callExpression.calle);

    if (loxClass instanceof LoxClass) {
      if (loxClass.arity != expr.callExpression.args.length) {
        throw new TSLoxError(
          'Runtime', expr.callExpression.calle.location,
          `expected ${loxClass.arity} args but got ${expr.callExpression.args.length}`
        )
      }
      const loxInstance = new LoxInstance(loxClass);
      const constructor = loxClass.findMethod('constructor')?.bind(loxInstance);

      // execute the constructor
      if (constructor) {
        const args = expr.callExpression.args.map(arg => this.interpret(arg));
        constructor.call(...args);
      }

      return loxInstance;
    } else {
      throw new TSLoxError('Runtime', expr.callExpression.location, `${loxClass} is not a class`);
    }
  }

  visitInstanceGetExpression(expr: InstanceGetExpression) {
    const instance = this.interpret(expr.instance);

    if (instance instanceof LoxInstance) {
      return instance.getProperty(expr.property);
    } else {
      throw Errors.propertyOnlyOnClass(expr.property.location);
    }
  }
}

export class TSLoxInterpreter implements StatementVisitor {
  constructor(private expressionInterpreter: ExpressionInterpreter, private errorReporter: ErrorReporter) {}

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

      if (currentEnvironment.isDefinedInScope(variableName)) {
        throw new TSLoxError('Runtime', variableDeclaration.identifier.location, `identifier '${variableName}' is already declared in current scope`);
      }

      currentEnvironment.define(variableName, initializerValue);
    }
  }

  interpretBlockStatement(blockStatement: BlockStatement, environment: Environment) {
    const oldEnvironment = currentEnvironment;

    currentEnvironment = environment;
    blockStatement.statements.forEach(statement => statement.accept(this));
    currentEnvironment = oldEnvironment;
  }

  visitBlockStatement(statement: BlockStatement) {
    this.interpretBlockStatement(statement, new Environment(currentEnvironment));
  }

  visitFunctionDeclarationStatement(statement: FunctionDeclarationStatement) {
    const functionName = statement.functionName.literalValue as string;

    currentEnvironment.define(functionName, new LoxCallableFn(currentEnvironment, statement, this));
  }

  visitIfStatement(statement: IfStatement) {
    const conditionValue = this.interpretExpression(statement.condition);

    if (conditionValue) {
      statement.trueStatement.accept(this);
    } else {
      statement.falseStatement?.accept(this);
    }
  }

  visitWhileStatement(statement: WhileStatement) {
    let conditionValue = this.interpretExpression(statement.condition);

    while (conditionValue) {
      statement.body.accept(this);
      conditionValue = this.interpretExpression(statement.condition);
    }
  }

  visitReturnStatement(statement: ReturnStatement) {
    throw new ReturnStatementError(statement);
  }

  visitClassDeclarationStatement(statement: ClassDeclarationStatement) {
    const className = statement.className.literalValue as string;

    if (currentEnvironment.isDefinedInScope(className)) {
      throw Errors.undefinedVariable(className, statement.className.location);
    }

    currentEnvironment.define(className, new LoxClass(statement, this));
  }

  interpretExpression(expression: Expression) {
    return this.expressionInterpreter.interpret(expression);
  }

  interpret(statements: Statement[]) {
    for (const statement of statements) {
      try {
        statement.accept(this);
      } catch (error) {
        if (error instanceof TSLoxError) {
          this.errorReporter.report(error);
        } else if (error instanceof ReturnStatementError) {
          this.errorReporter.report(new TSLoxError('Runtime', error.returnStatement.returnTokenLocation, 'cannot use return statement outside a function'));
        } else {
          throw error;
        }
      }
    }
  }
}
