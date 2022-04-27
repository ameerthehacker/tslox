export interface ErrorReporter {
  report(line: number, message: string): void;
}

export default class ConsoleErrorReporter implements ErrorReporter {
  report(line: number, message: string): void {
    console.error(`${line}: ${message}`);
  }
}
