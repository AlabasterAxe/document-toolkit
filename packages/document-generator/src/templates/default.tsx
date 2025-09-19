import * as React from "react";

export interface DefaultTemplateProps {
  title?: string;
  author?: string;
  date?: string;
  markdownContent?: string;
  children?: React.ReactNode;
}

export const DefaultTemplate: React.FC<DefaultTemplateProps> = ({
  title = "Document",
  author,
  date,
  markdownContent,
  children
}) => {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <title>{title}</title>
        <style>{`
          body {
            font-family: 'Times New Roman', serif;
            font-size: 12pt;
            line-height: 1.6;
            margin: 1in;
            color: #000;
            background: white;
          }

          .document-header {
            text-align: center;
            margin-bottom: 2rem;
            border-bottom: 2px solid #333;
            padding-bottom: 1rem;
          }

          .document-title {
            font-size: 18pt;
            font-weight: bold;
            margin: 0 0 0.5rem 0;
          }

          .document-meta {
            font-size: 11pt;
            color: #666;
            margin: 0.25rem 0;
          }

          .document-content {
            margin-top: 2rem;
          }

          h1 {
            font-size: 16pt;
            font-weight: bold;
            margin: 2rem 0 1rem 0;
            color: #333;
          }

          h2 {
            font-size: 14pt;
            font-weight: bold;
            margin: 1.5rem 0 0.75rem 0;
            color: #444;
          }

          h3 {
            font-size: 12pt;
            font-weight: bold;
            margin: 1rem 0 0.5rem 0;
            color: #555;
          }

          p {
            margin: 0 0 1rem 0;
            text-align: justify;
          }

          ul, ol {
            margin: 1rem 0;
            padding-left: 2rem;
          }

          li {
            margin: 0.5rem 0;
          }

          blockquote {
            margin: 1rem 2rem;
            padding: 0.5rem 1rem;
            border-left: 3px solid #ccc;
            font-style: italic;
            background: #f9f9f9;
          }

          code {
            font-family: 'Courier New', monospace;
            background: #f5f5f5;
            padding: 0.1rem 0.3rem;
            border-radius: 3px;
          }

          pre {
            font-family: 'Courier New', monospace;
            background: #f5f5f5;
            padding: 1rem;
            border-radius: 5px;
            overflow-x: auto;
            margin: 1rem 0;
          }

          table {
            border-collapse: collapse;
            width: 100%;
            margin: 1rem 0;
          }

          th, td {
            border: 1px solid #ddd;
            padding: 0.5rem;
            text-align: left;
          }

          th {
            background: #f5f5f5;
            font-weight: bold;
          }

          @media print {
            body { margin: 0.5in; }
            .document-header { page-break-after: avoid; }
          }
        `}</style>
      </head>
      <body>
        <div className="document-header">
          <h1 className="document-title">{title}</h1>
          {author && <div className="document-meta">By: {author}</div>}
          {date && <div className="document-meta">Date: {date}</div>}
        </div>

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

export default DefaultTemplate;