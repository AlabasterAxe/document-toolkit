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

export const LegalPaper: React.FC<LegalPaperProps> = ({
  title = "Legal Paper",
  author,
  institution,
  date,
  abstract,
  markdownContent,
  styles,
  children,
}) => {
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
          {markdownContent && (
            <div dangerouslySetInnerHTML={{ __html: markdownContent }} />
          )}
          {children}
        </div>
      </body>
    </html>
  );
};

export default LegalPaper;
