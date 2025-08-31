# Document Toolkit

A comprehensive monorepo toolkit for document processing, generation, and manipulation.

## Packages

### [@document-toolkit/generator](./packages/document-generator)
React-based document generation for PDF and DOCX formats. Generate professional documents from React templates and markdown content.

**Features:**
- Multi-format output (PDF via pagedjs-cli, DOCX via docx library)
- React template system with TypeScript support
- Markdown processing with front-matter
- Content macros for footnotes and page breaks
- Customizable styling

## Getting Started

This is a pnpm monorepo. To work with the packages:

```bash
# Install dependencies for all packages
pnpm install

# Build all packages
pnpm build

# Work on a specific package
cd packages/document-generator
pnpm dev
```

## Installation

Install packages individually from git:

```bash
# Install the document generator
npm install git+https://github.com/yourusername/document-toolkit.git#workspace=@document-toolkit/generator

# Or clone and link locally
git clone https://github.com/yourusername/document-toolkit.git
cd document-toolkit
pnpm install
pnpm build

# Link specific package
cd packages/document-generator
npm link
```

## Development

### Adding New Packages

1. Create a new directory in `packages/`
2. Add a `package.json` with name `@document-toolkit/your-package-name`
3. pnpm will automatically detect it as part of the workspace

### Package Structure

```
packages/
├── document-generator/     # React-based PDF/DOCX generation
├── content-extractor/     # Future: Extract text/data from documents
├── format-converter/      # Future: Convert between document formats
└── common-utils/         # Future: Shared utilities across packages
```

## Roadmap

- **Document Generation** ✅ (React templates → PDF/DOCX)
- **Content Extraction** 🔄 (PDF/DOCX → structured data)
- **Format Conversion** 📋 (Between various document formats)
- **Document Analysis** 📋 (Metadata, statistics, validation)

## License

MIT