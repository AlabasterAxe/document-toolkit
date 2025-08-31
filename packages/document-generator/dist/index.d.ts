export { DocumentGenerator } from "./core/document-generator.js";
export { DocumentContentProcessor } from "./core/content-processor.js";
export type { DocumentFormat, DocumentGenerationOptions, GenerationResult, TemplateProps, ContentProcessor } from "./types/index.js";
import type { DocumentGenerationOptions } from "./types/index.js";
export declare function generateDocument(options: DocumentGenerationOptions): Promise<import("./types/index.js").GenerationResult>;
