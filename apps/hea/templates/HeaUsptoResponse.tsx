import * as React from "react";
import { HeaUsptoResponseHeader, HeaderProps } from "../components/HeaHeader";

type HeaUsptoResponseTemplateProps = HeaderProps & {
  markdownContent?: string;
  styles?: string;
  children?: React.ReactNode;
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
  const { markdownContent, styles, children, ...headerProps } = props;
  const processedContent = markdownContent
    ? processPageBreaks(markdownContent)
    : "";

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <title>{headerProps.documentType}</title>
        {styles && <style dangerouslySetInnerHTML={{ __html: styles }} />}
      </head>
      <body>
        <HeaUsptoResponseHeader {...headerProps} />
        <main>
          {markdownContent && (
            <div dangerouslySetInnerHTML={{ __html: processedContent }} />
          )}
          {children}
        </main>
      </body>
    </html>
  );
}

export default HeaUsptoResponse;
