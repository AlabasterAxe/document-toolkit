# Document Toolkit - Monorepo

A comprehensive toolkit for document generation supporting multiple output formats (HTML, PDF, DOCX) from markdown or TSX source files.

## Quick Start

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Generate a document
pnpm doc:build example-docs/sample.md --format pdf
```

## Usage

### Basic Command Structure

```bash
pnpm doc:build <input-file> [options]
```

**Options:**
- `-f, --format <format>` - Output format: `html`, `pdf`, `docx` (default: `pdf`)
- `-o, --output <path>` - Output file path (default: auto-generated)
- `-t, --template <name>` - Template to use (default: `default`)
- `-a, --app <app>` - App context for template resolution

### Examples

```bash
# Generate PDF with default template
pnpm doc:build example-docs/sample.md --format pdf

# Generate HTML with legal template
pnpm doc:build example-docs/sample.md --format html --template legal

# Use app-specific custom template
pnpm doc:build example-docs/sample.md --format pdf --app example-usage --template custom

# Generate all formats
pnpm doc:build example-docs/sample.md --format html
pnpm doc:build example-docs/sample.md --format pdf
pnpm doc:build example-docs/sample.md --format docx
```

## Input Formats

### Markdown with Front-matter

```markdown
---
title: "My Document"
author: "Jane Doe"
template: "legal"
court: "Superior Court"
---

# Document Content

Your markdown content here...
```

### TSX Files

```tsx
export default function MyDocument() {
  return <div>Your JSX content here...</div>;
}
```

## Templates

### Built-in Templates

- **`default`** - General-purpose document template
- **`legal`** - Legal documents with case headers and signatures
- **`academic`** - Academic papers with proper formatting

### Template Resolution Order

1. App-specific: `apps/{app}/templates/{template}.tsx`
2. Shared: `packages/document-generator/src/templates/{template}.tsx`
3. Fallback: Built-in default template

### Creating Custom Templates

Create templates in your app's `templates/` directory:

```tsx
// apps/my-app/templates/custom.tsx
import * as React from "react";

export interface CustomTemplateProps {
  title?: string;
  markdownContent?: string;
}

export const CustomTemplate: React.FC<CustomTemplateProps> = ({
  title,
  markdownContent
}) => {
  return (
    <html>
      <head>
        <title>{title}</title>
        <style>{/* Your custom styles */}</style>
      </head>
      <body>
        <h1>{title}</h1>
        <div dangerouslySetInnerHTML={{ __html: markdownContent }} />
      </body>
    </html>
  );
};

export default CustomTemplate;
```

## Monorepo Structure

```
├── packages/
│   ├── document-generator/     # Core generation library
│   └── content-extractor/      # Content extraction utilities
├── apps/
│   ├── example-usage/          # Example implementation
│   ├── cjelc/                  # App-specific documents
│   └── */                      # Other document apps
├── scripts/
│   └── build-document.ts       # Unified build CLI
└── example-docs/               # Sample documents
```

## Development

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm -r build

# Run individual app
cd apps/example-usage
pnpm dev
```

## Output Formats

- **HTML** - Standalone HTML files with embedded CSS
- **PDF** - Generated using pagedjs-cli with print CSS
- **DOCX** - Microsoft Word format using docx library

## License

MIT