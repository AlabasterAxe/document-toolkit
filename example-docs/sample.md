---
title: "Sample Document"
author: "Document Toolkit"
date: "2024-01-15"
template: "default"
---

# Introduction

This is a sample document that demonstrates the **document toolkit** capabilities. The system can generate documents in multiple formats from this markdown source.

## Features

The document toolkit supports:

1. **Multiple output formats**: PDF, DOCX, and HTML
2. **Template system**: Choose from built-in templates or create custom ones
3. **Front-matter support**: Configure document metadata and template selection
4. **Markdown processing**: Full markdown syntax support

### Code Examples

Here's a simple JavaScript example:

```javascript
function generateDocument(content, template) {
  return documentToolkit.render(content, template);
}
```

## Templates Available

The system comes with several built-in templates:

- **Default**: General-purpose document template
- **Legal**: Formatted for legal documents with case headers
- **Academic**: Styled for academic papers with proper citations
- **Custom**: App-specific templates for specialized use cases

> **Note**: You can override any template by placing a custom version in your app's `templates/` directory.

## Usage Examples

### Basic Usage

```bash
# Generate a PDF from markdown
pnpm doc:build sample.md --format pdf

# Generate HTML with a specific template
pnpm doc:build sample.md --format html --template academic

# Generate for a specific app context
pnpm doc:build sample.md --format pdf --app example-usage --template custom
```

### Advanced Configuration

You can configure the output using front-matter in your markdown files:

```yaml
---
title: "My Document"
author: "Jane Doe"
template: "legal"
plaintiff: "Smith Inc."
defendant: "Jones LLC"
court: "Superior Court of California"
---
```

## Conclusion

This document toolkit provides a flexible, powerful way to generate professional documents from simple markdown or TSX source files, with support for multiple output formats and customizable templates.