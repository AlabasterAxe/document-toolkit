import * as React from "react";

export interface AcademicTemplateProps {
  title?: string;
  author?: string;
  institution?: string;
  course?: string;
  professor?: string;
  date?: string;
  abstract?: string;
  markdownContent?: string;
  children?: React.ReactNode;
}

export const AcademicTemplate: React.FC<AcademicTemplateProps> = ({
  title = "Academic Paper",
  author,
  institution,
  course,
  professor,
  date,
  abstract,
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

          .title-page {
            text-align: center;
            margin-bottom: 3rem;
          }

          .paper-title {
            font-size: 14pt;
            font-weight: bold;
            margin: 0 0 2rem 0;
            text-decoration: underline;
          }

          .author-info {
            margin: 1rem 0;
            font-size: 12pt;
          }

          .course-info {
            margin-top: 2rem;
            font-size: 12pt;
          }

          .abstract {
            margin: 2rem 0;
            padding: 1rem 2rem;
          }

          .abstract-title {
            font-weight: bold;
            text-align: center;
            margin-bottom: 1rem;
          }

          .abstract-content {
            text-align: justify;
            text-indent: 0;
            line-height: 1.5;
          }

          .document-content {
            margin-top: 2rem;
          }

          p {
            margin: 0 0 1rem 0;
            text-align: justify;
            text-indent: 0.5in;
          }

          .no-indent {
            text-indent: 0;
          }

          h1 {
            font-size: 12pt;
            font-weight: bold;
            text-align: center;
            margin: 2rem 0 1rem 0;
            text-transform: uppercase;
          }

          h2 {
            font-size: 12pt;
            font-weight: bold;
            margin: 1.5rem 0 0.75rem 0;
            text-align: left;
          }

          h3 {
            font-size: 12pt;
            font-weight: bold;
            margin: 1rem 0 0.5rem 0;
            font-style: italic;
          }

          blockquote {
            margin: 1rem 0;
            padding: 0 2rem;
            font-style: italic;
            text-indent: 0;
          }

          .block-quote {
            margin: 1rem 0;
            padding: 0 2rem;
            text-indent: 0;
            font-size: 11pt;
          }

          ul, ol {
            margin: 1rem 0;
            padding-left: 2rem;
          }

          li {
            margin: 0.5rem 0;
            text-indent: 0;
          }

          .bibliography {
            margin-top: 2rem;
            page-break-before: always;
          }

          .bibliography-title {
            font-size: 12pt;
            font-weight: bold;
            text-align: center;
            margin-bottom: 2rem;
          }

          .bibliography-entry {
            margin: 0 0 1rem 0;
            text-indent: -0.5in;
            margin-left: 0.5in;
          }

          .footnote {
            font-size: 10pt;
            border-top: 1px solid #000;
            margin-top: 2rem;
            padding-top: 0.5rem;
          }

          table {
            border-collapse: collapse;
            width: 100%;
            margin: 1rem 0;
            font-size: 11pt;
          }

          th, td {
            border: 1px solid #000;
            padding: 0.5rem;
            text-align: left;
          }

          th {
            background: #f0f0f0;
            font-weight: bold;
            text-align: center;
          }

          .table-caption {
            font-size: 11pt;
            text-align: center;
            margin: 0.5rem 0;
            font-style: italic;
          }

          @media print {
            body { margin: 0.75in; }
            .title-page { page-break-after: always; }
            h1 { page-break-before: always; }
          }
        `}</style>
      </head>
      <body>
        <div className="title-page">
          <div className="paper-title">{title}</div>

          {author && <div className="author-info">By: {author}</div>}
          {institution && <div className="author-info">{institution}</div>}

          <div className="course-info">
            {course && <div>{course}</div>}
            {professor && <div>Professor: {professor}</div>}
            {date && <div>{date}</div>}
          </div>
        </div>

        {abstract && (
          <div className="abstract">
            <div className="abstract-title">Abstract</div>
            <div className="abstract-content">{abstract}</div>
          </div>
        )}

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

export default AcademicTemplate;