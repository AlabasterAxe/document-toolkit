import type { DocumentGenerationOptions, GenerationResult } from "../types/index.js";
export declare class DocumentGenerator {
    /**
     * Generate a document from markdown content using a React template
     */
    static generateDocument(options: DocumentGenerationOptions): Promise<GenerationResult>;
    /**
     * Generate PDF using pagedjs-cli
     */
    private static generatePDF;
    /**
     * Generate DOCX using docx library
     * Note: This is a simplified version - the full implementation from build.tsx
     * would need to be adapted based on specific template needs
     */
    private static generateDOCX;
}
