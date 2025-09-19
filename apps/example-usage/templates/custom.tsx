import * as React from "react";

export interface CustomTemplateProps {
  title?: string;
  company?: string;
  department?: string;
  markdownContent?: string;
  children?: React.ReactNode;
}

export const CustomTemplate: React.FC<CustomTemplateProps> = ({
  title = "Company Document",
  company = "Example Corp",
  department,
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
            font-family: 'Arial', sans-serif;
            font-size: 11pt;
            line-height: 1.4;
            margin: 0.75in;
            color: #333;
            background: white;
          }

          .company-header {
            border-bottom: 3px solid #0066cc;
            padding-bottom: 1rem;
            margin-bottom: 2rem;
          }

          .company-logo {
            font-size: 20pt;
            font-weight: bold;
            color: #0066cc;
            margin-bottom: 0.5rem;
          }

          .document-title {
            font-size: 16pt;
            font-weight: bold;
            color: #333;
            margin: 1rem 0;
          }

          .department-info {
            font-size: 10pt;
            color: #666;
            font-style: italic;
          }

          .document-content {
            margin-top: 2rem;
          }

          h1 {
            font-size: 14pt;
            font-weight: bold;
            color: #0066cc;
            margin: 2rem 0 1rem 0;
            border-bottom: 1px solid #0066cc;
            padding-bottom: 0.25rem;
          }

          h2 {
            font-size: 12pt;
            font-weight: bold;
            color: #333;
            margin: 1.5rem 0 0.75rem 0;
          }

          h3 {
            font-size: 11pt;
            font-weight: bold;
            color: #555;
            margin: 1rem 0 0.5rem 0;
          }

          p {
            margin: 0 0 1rem 0;
            text-align: justify;
          }

          .highlight {
            background: #fff3cd;
            padding: 0.5rem 1rem;
            border-left: 4px solid #ffc107;
            margin: 1rem 0;
          }

          ul, ol {
            margin: 1rem 0;
            padding-left: 1.5rem;
          }

          li {
            margin: 0.25rem 0;
          }

          blockquote {
            margin: 1rem 0;
            padding: 0.5rem 1rem;
            border-left: 3px solid #0066cc;
            background: #f8f9fa;
            font-style: italic;
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
            background: #0066cc;
            color: white;
            font-weight: bold;
          }

          .footer {
            margin-top: 3rem;
            padding-top: 1rem;
            border-top: 1px solid #ddd;
            font-size: 9pt;
            color: #666;
            text-align: center;
          }

          @media print {
            body { margin: 0.5in; }
            .company-header { page-break-after: avoid; }
          }
        `}</style>
      </head>
      <body>
        <div className="company-header">
          <div className="company-logo">{company}</div>
          <div className="document-title">{title}</div>
          {department && <div className="department-info">{department}</div>}
        </div>

        <div className="document-content">
          {markdownContent && (
            <div dangerouslySetInnerHTML={{ __html: markdownContent }} />
          )}
          {children}
        </div>

        <div className="footer">
          <div>© {new Date().getFullYear()} {company}. All rights reserved.</div>
          <div>This document is confidential and proprietary.</div>
        </div>
      </body>
    </html>
  );
};

export default CustomTemplate;