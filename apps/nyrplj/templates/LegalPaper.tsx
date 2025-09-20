import * as React from "react";
import { DocumentContentProcessor } from "../../../packages/document-generator/src/core/content-processor";

export interface LegalPaperProps {
  title?: string;
  author?: string;
  institution?: string;
  date?: string;
  abstract?: string;
  markdownContent?: string;
  styles?: string;
  children?: React.ReactNode;
}

// Process both footnotes and endnotes in the content
function processFootnotesAndEndnotes(htmlContent: string): {
  content: string;
  footnotes: string[];
  endnotes: string[]
} {
  const footnotes: string[] = [];
  const endnotes: string[] = [];
  let footnoteCounter = 1;
  let endnoteCounter = 1;

  // First process footnotes (will render at bottom of page via CSS)
  let content = htmlContent.replace(/\{\{FOOTNOTE:([^}]+)\}\}/g, (match, footnoteText) => {
    footnotes.push(footnoteText.trim());
    const footnoteNumber = footnoteCounter++;
    return `<span class="footnote-content" data-footnote="${footnoteNumber}">${footnoteText.trim()}</span><span class="footnote-ref">${footnoteNumber}</span>`;
  });

  // Then process endnotes (will render at end of document)
  content = content.replace(/\{\{ENDNOTE:([^}]+)\}\}/g, (match, endnoteText) => {
    endnotes.push(endnoteText.trim());
    const endnoteNumber = endnoteCounter++;
    return `<span class="endnote-ref">${endnoteNumber}</span>`;
  });

  return { content, footnotes, endnotes };
}

export const LegalPaper: React.FC<LegalPaperProps> = ({
  title = "Legal Paper",
  author,
  institution,
  date,
  abstract,
  markdownContent,
  styles,
  children
}) => {
  // Process both footnotes and endnotes from the markdown content
  const { content: processedContent, footnotes, endnotes } = markdownContent
    ? processFootnotesAndEndnotes(markdownContent)
    : { content: "", footnotes: [], endnotes: [] };

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <title>{title}</title>
        {styles && <style dangerouslySetInnerHTML={{ __html: styles }} />}
      </head>
      <body>
        {/* Title Page */}
        <div className="title-page">
          <div className="paper-title">{title}</div>
          {author && <div className="author-info">By: {author}</div>}
          {institution && <div className="author-info">{institution}</div>}
          {date && <div className="date-info">{date}</div>}
        </div>

        {/* Abstract */}
        {abstract && (
          <div className="abstract">
            <div className="abstract-title">Abstract</div>
            <div className="abstract-content">{abstract}</div>
          </div>
        )}

        {/* Main Content */}
        <div className="document-content">
          {processedContent && (
            <div dangerouslySetInnerHTML={{ __html: processedContent }} />
          )}
          {children}
        </div>

        {/* Endnotes Section - appears after all content */}
        {endnotes.length > 0 && (
          <div className="endnotes-section">
            <h2 className="endnotes-title">Endnotes</h2>
            <ol className="endnotes-list">
              {endnotes.map((endnote, index) => (
                <li key={index} className="endnote-item">
                  <div className="endnote-content">{endnote}</div>
                </li>
              ))}
            </ol>
          </div>
        )}
      </body>
    </html>
  );
};

export default LegalPaper;