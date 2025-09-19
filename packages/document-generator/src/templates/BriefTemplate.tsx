import * as React from "react";
import type { TemplateProps } from "../types";
import {
  Footnote,
  resetFootnoteCounter,
  FootnoteList,
} from "../components/Footnote.js";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { DocumentContentProcessor } from "../core/content-processor";
import { Caption } from "../components/Caption";
import { SignatureBlock } from "../components/SignatureBlock";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const caseInfo = JSON.parse(
  readFileSync(join(__dirname, "..", "case-info.json"), "utf-8")
);

interface BriefTemplateProps extends TemplateProps {
  documentType?: string;
}

export function BriefTemplate({
  markdownContent,
  documentType,
}: BriefTemplateProps) {
  // Reset footnote counter for each document
  resetFootnoteCounter();

  // Use the document-toolkit's content processor with our custom footnote component
  const processContent =
    DocumentContentProcessor.createFootnoteProcessor(Footnote);
  const processedContent = processContent(markdownContent);

  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <title>Legal Brief</title>
        <link rel="stylesheet" href="legal-style.css" />
      </head>
      <body>
        <Caption {...caseInfo} documentType={documentType} />
        <main>{processedContent}</main>
        <SignatureBlock />
        <FootnoteList />
      </body>
    </html>
  );
}
