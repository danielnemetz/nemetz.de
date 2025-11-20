declare module 'linkedom' {
  interface ParsedHTML {
    document: Document;
  }

  export function parseHTML(html: string): ParsedHTML;
}
