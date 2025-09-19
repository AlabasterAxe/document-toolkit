import * as React from "react";
import { HeaUsptoResponseHeader, HeaderProps } from "../components/HeaHeader";

type HeaUsptoResponseTemplateProps = HeaderProps & {
  markdownContent: string;
};

// Process page break macros for USPTO documents
function processPageBreaks(htmlContent: string): string {
  // Handle page breaks that are wrapped in paragraph tags by markdown
  let content = htmlContent.replace(
    /<p>\{\{PAGE_BREAK\}\}<\/p>/g,
    '<div style="page-break-before: always;"></div>'
  );
  return content.replace(
    /\{\{PAGE_BREAK\}\}/g,
    '<div style="page-break-before: always;"></div>'
  );
}

export function HeaUsptoResponse(props: HeaUsptoResponseTemplateProps) {
  const { markdownContent, ...headerProps } = props;
  const processedContent = processPageBreaks(markdownContent);

  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <title>{headerProps.documentType}</title>
        <link rel="stylesheet" href="legal-style.css" />
      </head>
      <body>
        <HeaUsptoResponseHeader {...headerProps} />
        <main dangerouslySetInnerHTML={{ __html: processedContent }} />
      </body>
    </html>
  );
}
