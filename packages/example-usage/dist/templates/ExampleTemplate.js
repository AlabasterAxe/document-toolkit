import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { DocumentContentProcessor } from "@document-toolkit/generator";
import { SimpleFootnote, resetFootnoteCounter, FootnoteList } from "../components/SimpleFootnote.js";
export function ExampleTemplate({ markdownContent, title = "Example Document", author = "Document Generator", date = new Date().toLocaleDateString() }) {
    // Reset footnote counter for each document
    resetFootnoteCounter();
    // Process content with custom footnote component
    const processContent = DocumentContentProcessor.createFootnoteProcessor(SimpleFootnote);
    const processedContent = processContent(markdownContent);
    return (_jsxs("html", { children: [_jsxs("head", { children: [_jsx("meta", { charSet: "utf-8" }), _jsx("title", { children: title }), _jsx("style", { dangerouslySetInnerHTML: {
                            __html: `
            body {
              font-family: "Times New Roman", serif;
              font-size: 12pt;
              line-height: 2;
              margin: 1in;
              max-width: 8.5in;
            }
            
            h1 {
              text-align: center;
              font-size: 14pt;
              font-weight: bold;
              text-transform: uppercase;
              margin: 2em 0 1em 0;
            }
            
            h2 {
              font-size: 12pt;
              font-weight: bold;
              text-transform: uppercase;
              margin: 1.5em 0 1em 0;
            }
            
            h3, h4 {
              font-size: 12pt;
              font-weight: bold;
              margin: 1.5em 0 1em 0;
            }
            
            p {
              text-indent: 0.5in;
              margin: 0 0 1em 0;
            }
            
            .header {
              text-align: center;
              margin-bottom: 2em;
            }
            
            .document-title {
              font-size: 14pt;
              font-weight: bold;
              text-transform: uppercase;
            }
            
            .document-meta {
              font-size: 10pt;
              margin-top: 0.5em;
            }
            
            .footnote-ref {
              vertical-align: super;
              font-size: 0.8em;
            }
            
            .footnote-content {
              float: footnote;
              font-size: 10pt;
              line-height: 1.4;
            }
            
            @page {
              size: 8.5in 11in;
              margin: 1in;
            }
            
            /* Page break utilities */
            [style*="page-break-before: always"] {
              page-break-before: always;
            }
          `
                        } })] }), _jsxs("body", { children: [_jsxs("div", { className: "header", children: [_jsx("div", { className: "document-title", children: title }), _jsxs("div", { className: "document-meta", children: ["By ", author, " \u2022 ", date] })] }), _jsx("main", { children: processedContent }), _jsx(FootnoteList, {})] })] }));
}
