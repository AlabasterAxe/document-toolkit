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
- `-o, --output <path>` - Output file path (default: `dist/{filename}.{format}`)
- `-t, --template <name>` - Template to use (overrides frontmatter template)
- `-a, --app <app>` - App context for template resolution (auto-detected from file path)

### Examples

```bash
# Basic usage - auto-detects app context and uses frontmatter template
pnpm doc:build apps/cjelc/memos/feedback.md

# Generate different formats
pnpm doc:build apps/hea/patent-response.md --format html
pnpm doc:build apps/intro-to-ip/assignment.md --format docx

# Override template from command line
pnpm doc:build example-docs/sample.md --template legal --format pdf

# Manual app context (rarely needed)
pnpm doc:build file.md --app myapp --format pdf
```

### Smart Defaults

- **App Context**: Auto-detected from file paths like `apps/{app}/...`
- **Template**: Specified in frontmatter, falls back to `default`
- **Output**: All files go to `dist/{filename}.{format}` (git-ignored)
- **Styles**: Automatically cascaded from base + template-specific + app overrides

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
  styles?: string;  // Cascaded CSS styles
  children?: React.ReactNode;
}

export const CustomTemplate: React.FC<CustomTemplateProps> = ({
  title,
  markdownContent,
  styles,
  children
}) => {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <title>{title}</title>
        {styles && <style dangerouslySetInnerHTML={{ __html: styles }} />}
      </head>
      <body>
        <h1>{title}</h1>
        {markdownContent && (
          <div dangerouslySetInnerHTML={{ __html: markdownContent }} />
        )}
        {children}
      </body>
    </html>
  );
};

export default CustomTemplate;
```

## Styling System

The toolkit includes a cascading CSS system similar to template resolution:

### CSS Resolution Order

1. **Base styles** (always included): `packages/document-generator/src/styles/base.css`
2. **Template-specific styles**:
   - App-specific: `apps/{app}/styles/{template}.css`
   - Shared: `packages/document-generator/src/styles/{template}.css`
3. **App-wide styles** (optional): `apps/{app}/styles/app.css`

### Creating Custom Styles

```css
/* packages/document-generator/src/styles/memo.css */
.memo-header {
  margin-bottom: 2rem;
  text-align: center;
  font-weight: bold;
}

.memo-fields {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

/* Extends base.css automatically */
```

All styles are automatically combined and injected inline, eliminating external dependencies for PDF generation.

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