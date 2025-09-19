import * as React from "react";

export interface LegalTemplateProps {
  title?: string;
  plaintiff?: string;
  defendant?: string;
  caseNumber?: string;
  court?: string;
  attorney?: string;
  date?: string;
  markdownContent?: string;
  children?: React.ReactNode;
}

export const LegalTemplate: React.FC<LegalTemplateProps> = ({
  title = "Legal Document",
  plaintiff,
  defendant,
  caseNumber,
  court,
  attorney,
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
            line-height: 2.0;
            margin: 1in;
            color: #000;
            background: white;
          }

          .case-header {
            text-align: center;
            margin-bottom: 2rem;
            text-transform: uppercase;
            font-weight: bold;
          }

          .case-title {
            font-size: 14pt;
            margin: 0.5rem 0;
          }

          .case-info {
            margin: 2rem 0;
            border: 2px solid #000;
            padding: 1rem;
          }

          .case-parties {
            margin-bottom: 1rem;
          }

          .party {
            margin: 0.5rem 0;
            text-transform: uppercase;
          }

          .vs {
            text-align: center;
            margin: 0.5rem 0;
            font-style: italic;
          }

          .case-details {
            text-align: right;
            font-size: 11pt;
            margin-top: 1rem;
          }

          .document-title {
            text-align: center;
            font-size: 14pt;
            font-weight: bold;
            text-transform: uppercase;
            margin: 2rem 0;
            text-decoration: underline;
          }

          .document-content {
            text-align: justify;
            text-indent: 0.5in;
          }

          p {
            margin: 0 0 1rem 0;
            text-indent: 0.5in;
          }

          .paragraph-numbered p {
            text-indent: 0;
            margin-left: 0.5in;
          }

          h1 {
            font-size: 12pt;
            font-weight: bold;
            text-align: center;
            text-transform: uppercase;
            margin: 2rem 0 1rem 0;
            text-decoration: underline;
          }

          h2 {
            font-size: 12pt;
            font-weight: bold;
            margin: 1.5rem 0 0.75rem 0;
            text-transform: uppercase;
          }

          h3 {
            font-size: 12pt;
            font-weight: bold;
            margin: 1rem 0 0.5rem 0;
          }

          .signature-block {
            margin-top: 3rem;
            margin-left: 3in;
          }

          .signature-line {
            border-top: 1px solid #000;
            width: 3in;
            margin: 2rem 0 0.5rem 0;
          }

          .attorney-info {
            font-size: 11pt;
            line-height: 1.5;
          }

          blockquote {
            margin: 1rem 2rem;
            padding: 0.5rem 1rem;
            border-left: 3px solid #000;
          }

          ul, ol {
            margin: 1rem 0;
            padding-left: 2rem;
          }

          li {
            margin: 0.5rem 0;
          }

          .certificate {
            margin-top: 2rem;
            padding: 1rem;
            border: 1px solid #000;
            font-size: 11pt;
          }

          @media print {
            body { margin: 0.5in; }
            .case-header, .document-title { page-break-after: avoid; }
          }
        `}</style>
      </head>
      <body>
        <div className="case-header">
          {court && <div className="case-title">{court}</div>}
        </div>

        <div className="case-info">
          <div className="case-parties">
            {plaintiff && <div className="party">{plaintiff},</div>}
            {plaintiff && defendant && <div className="vs">v.</div>}
            {defendant && <div className="party">{defendant}</div>}
          </div>

          <div className="case-details">
            {caseNumber && <div>Case No. {caseNumber}</div>}
          </div>
        </div>

        <div className="document-title">{title}</div>

        <div className="document-content">
          {markdownContent && (
            <div dangerouslySetInnerHTML={{ __html: markdownContent }} />
          )}
          {children}
        </div>

        {attorney && (
          <div className="signature-block">
            <div className="signature-line"></div>
            <div className="attorney-info">
              {attorney}
              {date && <div>Date: {date}</div>}
            </div>
          </div>
        )}
      </body>
    </html>
  );
};

export default LegalTemplate;