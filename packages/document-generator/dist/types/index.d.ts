import * as React from "react";
export type DocumentFormat = "pdf" | "docx";
export interface DocumentGenerationOptions {
    content: string;
    template: React.ComponentType<any>;
    templateProps?: Record<string, any>;
    format: DocumentFormat;
    outputPath?: string;
    cssPath?: string;
    timeout?: number;
}
export interface GenerationResult {
    success: boolean;
    outputPath: string;
    error?: string;
}
export interface TemplateProps {
    markdownContent: string;
    [key: string]: any;
}
export interface ContentProcessor {
    processContent(content: string): React.ReactNode[];
}
