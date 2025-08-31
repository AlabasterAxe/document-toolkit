import * as React from "react";
export declare class DocumentContentProcessor {
    /**
     * Process markdown content with footnotes and page breaks
     */
    static processFootnotes(htmlContent: string): React.ReactNode[];
    /**
     * Basic footnote processing that can be overridden
     */
    static createFootnoteProcessor(FootnoteComponent: React.ComponentType<any>): (htmlContent: string) => React.ReactNode[];
}
