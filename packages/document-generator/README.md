# Document Toolkit

React-based document generation toolkit for PDF and DOCX formats. Generate professional documents from React templates and markdown content.

## Features

- **Multi-format output**: Generate both PDF (via pagedjs-cli) and DOCX (via docx library) documents
- **React templates**: Use React components as document templates with full TypeScript support
- **Markdown processing**: Built-in markdown parsing with front-matter support
- **Content macros**: Support for footnotes and page breaks via macro syntax
- **Customizable styling**: CSS for PDF generation, programmatic styling for DOCX

## Installation

```bash
# From git repository
npm install git+https://github.com/yourusername/document-toolkit.git

# Or clone locally and link
git clone https://github.com/yourusername/document-toolkit.git
cd document-toolkit
npm install
npm run build
npm link

# In your project
npm link @matt/document-toolkit
```

## Usage

### Basic Usage

```typescript
import { generateDocument } from '@matt/document-toolkit';
import { MyTemplate } from './templates/MyTemplate';

const result = await generateDocument({
  content: markdownContent,
  template: MyTemplate,
  templateProps: { 
    title: "My Document",
    author: "John Doe" 
  },
  format: 'pdf',
  outputPath: './output.pdf',
  cssPath: './styles.css'
});

if (result.success) {
  console.log(`Document generated: ${result.outputPath}`);
} else {
  console.error(`Generation failed: ${result.error}`);
}
```

### Template Structure

Templates are React components that receive markdown content and template props:

```typescript
import * as React from 'react';
import { TemplateProps } from '@matt/document-toolkit';

interface MyTemplateProps extends TemplateProps {
  title: string;
  author: string;
}

export function MyTemplate({ markdownContent, title, author }: MyTemplateProps) {
  return (
    <html>
      <head>
        <title>{title}</title>
        <link rel="stylesheet" href="styles.css" />
      </head>
      <body>
        <header>
          <h1>{title}</h1>
          <p>By {author}</p>
        </header>
        <main dangerouslySetInnerHTML={{ __html: markdownContent }} />
      </body>
    </html>
  );
}
```

### Content Processing

The toolkit supports special macro syntax in markdown:

```markdown
# My Document

This is regular content.

{{FOOTNOTE:This becomes a footnote}}

More content here.

{{PAGE_BREAK}}

This appears on a new page.
```

### Custom Content Processing

For custom footnote handling or other content processing:

```typescript
import { DocumentContentProcessor } from '@matt/document-toolkit';

// Create a custom processor with your footnote component
const processContent = DocumentContentProcessor.createFootnoteProcessor(MyFootnoteComponent);

// Use in your template
const processedContent = processContent(markdownContent);
```

## API Reference

### `generateDocument(options)`

Main function to generate documents.

**Options:**
- `content: string` - Markdown content (with optional front-matter)
- `template: React.ComponentType` - React template component
- `templateProps?: object` - Additional props to pass to template
- `format: 'pdf' | 'docx'` - Output format
- `outputPath?: string` - Output file path (defaults to `output.{format}`)
- `cssPath?: string` - CSS file path for PDF generation
- `timeout?: number` - Timeout for PDF generation (default: 30000ms)

**Returns:** `Promise<GenerationResult>`
- `success: boolean` - Whether generation succeeded
- `outputPath: string` - Path to generated file
- `error?: string` - Error message if generation failed

### `DocumentContentProcessor`

Static methods for processing document content:

- `processFootnotes(htmlContent: string): React.ReactNode[]` - Basic footnote processing
- `createFootnoteProcessor(FootnoteComponent): function` - Create custom processor

## Dependencies

### Required
- React 18+
- Node.js 18+

### For PDF Generation
- pagedjs-cli (automatically installed, executed via npm scripts for maximum portability)

### For DOCX Generation
- docx library (automatically installed)

## Development

```bash
git clone <repository>
cd document-toolkit
npm install
npm run build
```

## License

MIT