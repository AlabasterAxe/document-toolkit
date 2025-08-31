// Main exports for the document generation library
export { DocumentGenerator } from "./core/document-generator.js";
export { DocumentContentProcessor } from "./core/content-processor.js";

// Type exports
export type {
  DocumentFormat,
  DocumentGenerationOptions,
  GenerationResult,
  TemplateProps,
  ContentProcessor
} from "./types/index.js";

// Re-import for convenience function
import { DocumentGenerator } from "./core/document-generator.js";
import type { DocumentGenerationOptions } from "./types/index.js";

// Convenience function for common use case
export async function generateDocument(options: DocumentGenerationOptions) {
  return DocumentGenerator.generateDocument(options);
}