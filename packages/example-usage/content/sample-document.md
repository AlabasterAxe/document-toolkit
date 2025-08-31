---
title: "Document Generation Test"
author: "Document Toolkit Example"
date: "2024-01-15"
---

# Introduction

This is a test document to verify that the document-toolkit generator is working correctly. This document demonstrates various features including footnotes, page breaks, and different heading levels.

## Features Demonstrated

### Basic Text Formatting

This paragraph shows normal text flow with proper indentation. The document uses Times New Roman font at 12pt with double-spacing, following common legal document formatting standards.

### Footnote Support

This sentence has a footnote{{FOOTNOTE:This is an example footnote that provides additional context or citations.}} that demonstrates the macro processing capabilities.

Here's another paragraph with multiple footnotes.{{FOOTNOTE:First footnote in this paragraph.}} The footnote numbering should continue sequentially.{{FOOTNOTE:Second footnote showing proper numbering sequence.}}

### Lists and Structure

The document generator supports various markdown features:

- **Bold text** for emphasis
- *Italic text* for subtle emphasis  
- Regular paragraph text with proper spacing
- Nested content structures

### Page Breaks

The following macro will create a page break:

{{PAGE_BREAK}}

## Section After Page Break

This content should appear on a new page when generating PDF output. This demonstrates the page break macro functionality.

### Complex Content

Here's a paragraph that combines multiple features:

1. Numbered list item with a footnote{{FOOTNOTE:Footnote within a list item.}}
2. Another numbered item
3. Final item in the list

The document concludes with this paragraph that summarizes the test.{{FOOTNOTE:Final footnote to test the complete numbering sequence.}}

## Conclusion

This example document tests the core functionality of the document-toolkit generator including:

- Markdown processing
- Footnote macro expansion  
- Page break handling
- React template rendering
- PDF and DOCX generation

If you can see this content properly formatted in the output, the extraction and packaging was successful!