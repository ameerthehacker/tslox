import { Location } from "./types";

export interface ErrorReporter {
  report(location: Location, message: string): void;
}

export default class ConsoleErrorReporter implements ErrorReporter {
  report(location: Location, message: string): void {
    console.error(`${location.row}:${location.col}: ${message}`);
  }
}
