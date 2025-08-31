// Main exports for the document generation library
export { DocumentGenerator } from "./core/document-generator.js";
export { DocumentContentProcessor } from "./core/content-processor.js";
// Re-import for convenience function
import { DocumentGenerator } from "./core/document-generator.js";
// Convenience function for common use case
export async function generateDocument(options) {
    return DocumentGenerator.generateDocument(options);
}
