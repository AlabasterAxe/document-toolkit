# @document-toolkit/example-usage

Example usage of the `@document-toolkit/generator` package, demonstrating how to consume and use the document generation toolkit.

## What This Example Demonstrates

- ✅ **Consuming the generator package** from another project
- ✅ **Creating custom React templates** for document layout
- ✅ **Processing markdown content** with footnotes and page breaks
- ✅ **Generating both PDF and DOCX** outputs
- ✅ **Using TypeScript** with full type safety
- ✅ **Custom footnote handling** with project-specific components

## Running the Example

### Prerequisites

Make sure you're in the monorepo root and have installed dependencies:

```bash
# From the document-toolkit root
pnpm install
pnpm build  # Build all packages
```

### Generate Documents

```bash
# From the example-usage directory
cd packages/example-usage

# Generate PDF (default)
pnpm generate:pdf

# Generate DOCX  
pnpm generate:docx

# Or run directly with tsx
pnpm dev --format=pdf
pnpm dev --format=docx
```

### Expected Output

The example will:

1. Read `content/sample-document.md` 
2. Process it through the `ExampleTemplate` React component
3. Handle footnote macros and page breaks
4. Generate `example-output.pdf` or `example-output.docx`
5. Display success/error messages

## Code Structure

```
src/
├── index.ts                    # Main example script
├── templates/
│   └── ExampleTemplate.tsx    # Custom document template  
└── components/
    └── SimpleFootnote.tsx     # Custom footnote component
content/
└── sample-document.md         # Test content with macros
```

## Key Integration Points

### 1. Template Creation

```typescript
import type { TemplateProps } from "@document-toolkit/generator";
import { DocumentContentProcessor } from "@document-toolkit/generator";

function ExampleTemplate({ markdownContent, title }: TemplateProps) {
  const processContent = DocumentContentProcessor.createFootnoteProcessor(MyFootnote);
  const processedContent = processContent(markdownContent);
  
  return <html>...</html>;
}
```

### 2. Document Generation

```typescript
import { generateDocument } from "@document-toolkit/generator";

const result = await generateDocument({
  content: markdownContent,
  template: ExampleTemplate,
  templateProps: { title: "My Document" },
  format: "pdf", // or "docx"
  outputPath: "./output.pdf"
});
```

### 3. Content Processing

The example shows how to:
- Process `{{FOOTNOTE:text}}` macros
- Handle `{{PAGE_BREAK}}` macros  
- Maintain footnote numbering across the document
- Apply custom styling through React components

## Verification Checklist

After running the example, verify:

- [ ] PDF/DOCX files are generated without errors
- [ ] Document title and metadata appear correctly  
- [ ] Footnotes are numbered sequentially
- [ ] Page breaks work (check page 2 in PDF)
- [ ] Styling matches the template (Times New Roman, proper spacing)
- [ ] Markdown content is properly converted to HTML

## Integration Pattern

This example demonstrates the recommended pattern for consuming `@document-toolkit/generator`:

1. **Create project-specific templates** that match your document structure
2. **Implement custom footnote components** for your footnote styling needs  
3. **Use the content processor** to handle macros consistently
4. **Configure output paths** and formats based on your workflow
5. **Handle errors gracefully** with proper success/failure checking

This pattern allows the core generator to remain generic while supporting highly customized document layouts for specific projects.