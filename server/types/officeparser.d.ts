declare module 'officeparser' {
    interface ParserConfig {
      outputErrorToConsole?: boolean;
      newlineDelimiter?: string;
      ignoreNotes?: boolean;
      putNotesAtLast?: boolean;
    }
  
    export function parseOfficeAsync(filePath: string, config?: ParserConfig): Promise<string>;
  }