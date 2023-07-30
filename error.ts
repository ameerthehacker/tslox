import { ReturnStatement } from "./stmt";
import { TokenLocation } from "./types";

export class TSLoxError extends Error {
  constructor(public type: 'Syntax' | 'Runtime', public location: TokenLocation, public message: string) {
    super();

    this.name = `${type} Error`;
    this.message = `${location.row}:${location.col}: ${type} Error: ${message}`;
  }
}

export class ReturnStatementError extends Error {
  constructor(public returnStatement: ReturnStatement) {
    super();
  }
}

export interface ErrorReporter {
  report(error: TSLoxError): void;
}

export default class ConsoleErrorReporter implements ErrorReporter {
  report(error: TSLoxError): void {
    console.error(error.message);
  }
}
