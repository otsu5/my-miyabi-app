/**
 * Log Instrumenter
 * Dynamically injects log statements into code
 */

import { InstrumentationPoint, LogEntry } from './debug-agent';

export class LogInstrumenter {
  /**
   * Instrument file with log statements
   */
  instrument(
    filePath: string,
    points: InstrumentationPoint[],
    originalContent: string
  ): string {
    const lines = originalContent.split('\n');

    // Sort points by line number in descending order to avoid line shift issues
    const sortedPoints = [...points].sort((a, b) => b.line - a.line);

    for (const point of sortedPoints) {
      const lineIndex = point.line - 1; // Convert to 0-indexed

      if (lineIndex >= 0 && lineIndex < lines.length) {
        const logStatement = this.generateLogStatement(point);

        // Insert log statement after the line
        lines.splice(lineIndex + 1, 0, logStatement);
      }
    }

    return lines.join('\n');
  }

  /**
   * Restore original content by removing debug markers
   */
  restore(content: string): string {
    // Remove lines with [蛍-DEBUG] marker
    const lines = content.split('\n');

    return lines.filter((line) => !line.includes('[蛍-DEBUG]')).join('\n');
  }

  /**
   * Generate log statement with variable capture
   */
  private generateLogStatement(point: InstrumentationPoint): string {
    const varCaptures = point.variables
      .map((v) => `${v}: ${JSON.stringify(eval(v))}`)
      .join(', ');

    if (varCaptures) {
      return `  /* [蛍-DEBUG] */ console.log(\`[蛍] Line ${point.line}: ${varCaptures}\`);`;
    } else {
      return `  /* [蛍-DEBUG] */ console.log(\`[蛍] Line ${point.line}: checkpoint\`);`;
    }
  }

  /**
   * Parse log output and extract log entries
   */
  parseLogOutput(output: string): LogEntry[] {
    const logEntries: LogEntry[] = [];

    // Match pattern: [蛍] Line <line>: <data>
    const logPattern = /\[蛍\] Line (\d+): (.+)/g;

    let match;

    while ((match = logPattern.exec(output)) !== null) {
      const line = parseInt(match[1], 10);
      const data = match[2];

      // Parse variables from data
      const variables = this.parseVariables(data);

      const entry: LogEntry = {
        timestamp: new Date(),
        file: 'unknown',
        line,
        variables,
        message: data,
      };

      logEntries.push(entry);
    }

    return logEntries;
  }

  /**
   * Parse variables from log data
   */
  private parseVariables(data: string): Record<string, unknown> {
    const variables: Record<string, unknown> = {};

    // Match pattern: key: value, ...
    const varPattern = /(\w+):\s*(.+?)(?=,\s*\w+:|$)/g;

    let match;

    while ((match = varPattern.exec(data)) !== null) {
      const key = match[1];
      let value = match[2].trim();

      // Remove trailing comma if present
      if (value.endsWith(',')) {
        value = value.slice(0, -1).trim();
      }

      // Try to parse JSON
      try {
        variables[key] = JSON.parse(value);
      } catch {
        variables[key] = value;
      }
    }

    return variables;
  }
}
