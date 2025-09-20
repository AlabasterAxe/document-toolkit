import * as ReactDomServer from "react-dom/server";
import * as React from "react";
import { marked } from "marked";
import { writeFileSync } from "fs";
import { dirname, join } from "path";
import { spawn } from "child_process";
import { Cheerio, load } from "cheerio";
import type { AnyNode } from "domhandler";
import matter from "gray-matter";
import { fileURLToPath } from "url";
import type {
  DocumentGenerationOptions,
  GenerationResult,
} from "../types/index.js";
import {
  AlignmentType,
  Document,
  EndnoteReferenceRun,
  FootnoteReferenceRun,
  HeadingLevel,
  Packer,
  Paragraph,
  TextRun,
} from "docx";

// ESM __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class DocumentGenerator {
  /**
   * Generate a document from markdown content using a React template
   */
  static async generateDocument(
    options: DocumentGenerationOptions,
  ): Promise<GenerationResult> {
    try {
      const {
        content,
        template: TemplateComponent,
        templateProps = {},
        format,
        outputPath,
        cssPath,
        timeout = 30000,
      } = options;

      // Parse front-matter from markdown if present
      const { content: markdown, data: frontMatter } = matter(content);

      // Create footnote and endnote extensions for marked
      const extensions = this.createFootnoteEndnoteExtensions();

      // Configure marked with footnote/endnote extensions
      marked.use({ extensions });

      // Convert markdown to HTML
      const htmlContent = marked(markdown);

      // Render React template to HTML
      const renderedHtml = ReactDomServer.renderToStaticMarkup(
        React.createElement(TemplateComponent, {
          ...templateProps,
          ...frontMatter,
          markdownContent: htmlContent,
        }),
      );

      // Determine output path
      const finalOutputPath = outputPath ||
        join(process.cwd(), `output.${format}`);

      if (format === "pdf") {
        await this.generatePDF(renderedHtml, finalOutputPath, cssPath, timeout);
      } else if (format === "docx") {
        await this.generateDOCX(renderedHtml, finalOutputPath);
      } else if (format === "html") {
        await this.generateHTML(renderedHtml, finalOutputPath);
      } else {
        throw new Error(
          `Unsupported format: ${format}. Supported formats: pdf, docx, html`,
        );
      }

      return {
        success: true,
        outputPath: finalOutputPath,
      };
    } catch (error) {
      return {
        success: false,
        outputPath: options.outputPath || "",
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Generate PDF using pagedjs-cli
   */
  private static async generatePDF(
    html: string,
    outputPath: string,
    cssPath?: string,
    timeout: number = 30000,
  ): Promise<void> {
    // Transform intermediary footnote/endnote HTML to PagedJS format
    let finalHtml = this.transformHtmlForPagedJS(html);

    // Write HTML to temporary file in dist directory
    const tempHtmlPath = join(dirname(outputPath), "temp-document.html");

    // If cssPath is provided, inject it into the HTML
    if (cssPath) {
      finalHtml = finalHtml.replace(
        '<link rel="stylesheet" href="legal-style.css" />',
        `<link rel="stylesheet" href="${cssPath}" />`,
      );
    }

    writeFileSync(tempHtmlPath, finalHtml, "utf-8");

    return new Promise<void>((resolve, reject) => {
      // Use npm script to run pagedjs-cli - much more robust than path detection
      const packageDir = join(__dirname, "..", "..");

      const args = [
        "run",
        "generate-pdf",
        "--",
        tempHtmlPath,
        "-o",
        outputPath,
        "--timeout",
        timeout.toString(),
      ];

      const childProcess = spawn("npm", args, {
        cwd: packageDir,
        stdio: ["pipe", "pipe", "pipe"],
      });

      let stdout = "";
      let stderr = "";

      childProcess.stdout?.on("data", (data: any) => {
        stdout += data.toString();
      });

      childProcess.stderr?.on("data", (data: any) => {
        stderr += data.toString();
      });

      childProcess.on("close", (code: number | null) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`pagedjs-cli failed with code ${code}: ${stderr}`));
        }
      });

      childProcess.on("error", (error: Error) => {
        reject(new Error(`Failed to start pagedjs-cli: ${error.message}`));
      });
    });
  }

  /**
   * Generate DOCX using docx library
   * Enhanced to handle template-specific content structure with native footnote support
   */
  private static async generateDOCX(
    html: string,
    outputPath: string,
  ): Promise<void> {
    // Load HTML and prepare to extract footnotes/endnotes from HTML elements
    const $ = load(html);

    // Create footnotes and endnotes maps for native support
    const footnotes: Record<number, { children: Paragraph[] }> = {};
    const endnotes: Record<number, { children: Paragraph[] }> = {};
    const footnoteIdTracker = { current: 1 };
    const endnoteIdTracker = { current: 1 };

    const paragraphs: Paragraph[] = [];

    // Extract footnotes and endnotes from HTML elements
    $("div.footnote[data-footnote-id]").each((_, el) => {
      const $el = $(el);
      const footnoteIdStr = $el.attr("data-footnote-id") ||
        footnoteIdTracker.current.toString();
      const footnoteId = parseInt(footnoteIdStr);
      const content = $el.text();

      footnotes[footnoteId] = {
        children: [
          new Paragraph({ children: [new TextRun({ text: content })] }),
        ],
      };
      footnoteIdTracker.current = Math.max(
        footnoteIdTracker.current,
        footnoteId + 1,
      );
    });

    $("div.endnote[data-endnote-id]").each((_, el) => {
      const $el = $(el);
      const endnoteIdStr = $el.attr("data-endnote-id") ||
        endnoteIdTracker.current.toString();
      const endnoteId = parseInt(endnoteIdStr);
      const content = $el.text();

      endnotes[endnoteId] = {
        children: [
          new Paragraph({ children: [new TextRun({ text: content })] }),
        ],
      };
      endnoteIdTracker.current = Math.max(
        endnoteIdTracker.current,
        endnoteId + 1,
      );
    });

    // Extract main document content with native footnote and endnote processing
    for (
      const el of $(".document-content").find(
        "p, h1, h2, h3, h4, h5, h6",
      ).toArray()
    ) {
      const $el = $(el);
      const children = await this.processElementWithHtmlFootnotes($el);

      if (children.length > 0) {
        const tagName = el.tagName?.toLowerCase();

        if (tagName?.startsWith("h")) {
          // Handle headings
          const level = parseInt(tagName.slice(1)) as 1 | 2 | 3 | 4 | 5 | 6;
          const headingLevels = [
            HeadingLevel.HEADING_1,
            HeadingLevel.HEADING_2,
            HeadingLevel.HEADING_3,
            HeadingLevel.HEADING_4,
            HeadingLevel.HEADING_5,
            HeadingLevel.HEADING_6,
          ];

          paragraphs.push(
            new Paragraph({
              heading: headingLevels[level - 1],
              alignment: level === 1
                ? AlignmentType.CENTER
                : AlignmentType.LEFT,
              children: children.map((child) =>
                typeof child === "string"
                  ? new TextRun({ text: child, bold: true, size: 24 })
                  : child
              ),
              spacing: { line: 480, before: 240, after: 240 },
            }),
          );
        } else {
          // Handle regular paragraphs
          paragraphs.push(
            new Paragraph({
              children: children.map((child) =>
                typeof child === "string"
                  ? new TextRun({ text: child, size: 24 })
                  : child
              ),
              spacing: { line: 480 }, // double-spaced
              indent: { firstLine: 720 }, // 0.5" first-line indent
              alignment: AlignmentType.JUSTIFIED,
            }),
          );
        }
      }
    }

    const doc = new Document({
      styles: {
        default: {
          document: {
            run: {
              font: "Times New Roman",
              size: 24, // 12pt
            },
          },
        },
      },
      footnotes: footnotes, // Add footnotes support
      endnotes: endnotes, // Add endnotes support
      sections: [
        {
          properties: {
            page: {
              size: { width: 12240, height: 15840 }, // Letter 8.5"x11"
              margin: { top: 1440, right: 1440, bottom: 2016, left: 1440 },
            },
          },
          children: paragraphs,
        },
      ],
    });

    const buffer = await Packer.toBuffer(doc);
    writeFileSync(outputPath, buffer);
  }

  /**
   * Generate HTML file
   */
  private static async generateHTML(
    html: string,
    outputPath: string,
  ): Promise<void> {
    // Ensure the HTML is properly formatted with DOCTYPE and structure
    const fullHtml = html.startsWith("<!DOCTYPE")
      ? html
      : `<!DOCTYPE html>\n${html}`;
    writeFileSync(outputPath, fullHtml, "utf-8");
  }

  /**
   * Create footnote and endnote extensions for marked
   */
  private static createFootnoteEndnoteExtensions() {
    let footnoteCounter = 1;
    let endnoteCounter = 1;

    const footnoteExtension = {
      name: "footnote",
      level: "inline" as const,
      start(src: string) {
        return src.indexOf("{{FOOTNOTE:");
      },
      tokenizer(src: string) {
        const match = /^\{\{FOOTNOTE:(.*?)\}\}/.exec(src);
        if (match) {
          const footnoteId = footnoteCounter++;
          return {
            type: "footnote",
            raw: match[0],
            text: match[1].trim(),
            footnoteId,
          };
        }
      },
      renderer(token: { footnoteId: number; text: string }) {
        const { footnoteId, text } = token;
        return `<span class="footnote-ref" data-footnote-id="${footnoteId}"></span><div class="footnote" data-footnote-id="${footnoteId}">${text}</div>`;
      },
    };

    const endnoteExtension = {
      name: "endnote",
      level: "inline" as const,
      start(src: string) {
        return src.indexOf("{{ENDNOTE:");
      },
      tokenizer(src: string) {
        const match = /^\{\{ENDNOTE:(.*?)\}\}/.exec(src);
        if (match) {
          const endnoteId = endnoteCounter++;
          return {
            type: "endnote",
            raw: match[0],
            text: match[1].trim(),
            endnoteId,
          };
        }
      },
      renderer(token: { endnoteId: number; text: string }) {
        const { endnoteId, text } = token;
        return `<span class="endnote-ref" data-endnote-id="${endnoteId}"></span><div class="endnote" data-endnote-id="${endnoteId}">${text}</div>`;
      },
    };

    return [footnoteExtension, endnoteExtension];
  }

  /**
   * Process an element and its children, extracting footnotes and endnotes from HTML elements
   * Returns an array of TextRuns and FootnoteReferenceRuns/EndnoteReferences
   */
  private static async processElementWithHtmlFootnotes(
    $el: Cheerio<AnyNode>,
  ): Promise<(string | FootnoteReferenceRun | EndnoteReferenceRun)[]> {
    const children: (string | FootnoteReferenceRun | EndnoteReferenceRun)[] = [];

    // Iterate through child nodes (text and elements)
    const childNodes = $el.contents();

    for (let i = 0; i < childNodes.length; i++) {
      const node = childNodes.eq(i);
      const nodeType = node.get(0)?.type;

      if (nodeType === 'text') {
        // Text node
        const text = node.text().trim();
        if (text) {
          children.push(text);
        }
      } else if (node.is('span.footnote-ref')) {
        // Footnote reference span
        const footnoteId = parseInt(node.attr('data-footnote-id') || '0');
        children.push(await this.createFootnoteReference(footnoteId));
      } else if (node.is('span.endnote-ref')) {
        // Endnote reference span
        const endnoteId = parseInt(node.attr('data-endnote-id') || '0');
        children.push(await this.createEndnoteReference(endnoteId));
      } else if (node.is('div.footnote, div.endnote')) {
        // Skip footnote/endnote content divs - these are processed separately
        continue;
      } else {
        // Other elements - recursively process their text content
        const text = node.text().trim();
        if (text) {
          children.push(text);
        }
      }
    }

    // If no children were processed, fall back to element text
    if (children.length === 0) {
      const text = $el.text().trim();
      if (text) {
        return [text];
      }
    }

    return children;
  }

  /**
   * Transform intermediary HTML to PagedJS-compatible format
   */
  private static transformHtmlForPagedJS(html: string): string {
    const $ = load(html);

    // Transform footnotes: combine footnote-ref spans with footnote divs
    $('span.footnote-ref').each((_, refEl) => {
      const $ref = $(refEl);
      const footnoteId = $ref.attr('data-footnote-id');

      if (footnoteId) {
        // Find the corresponding footnote content
        const $footnoteDiv = $(`.footnote[data-footnote-id="${footnoteId}"]`);
        if ($footnoteDiv.length > 0) {
          const footnoteText = $footnoteDiv.text();

          // Replace the footnote-ref span with PagedJS footnote span
          $ref.replaceWith(`<span class="footnote">${footnoteText}</span>`);

          // Remove the footnote div (it's now inline)
          $footnoteDiv.remove();
        }
      }
    });

    // Collect endnotes and generate endnotes section
    const endnotes: { id: string, text: string }[] = [];

    $('span.endnote-ref').each((_, refEl) => {
      const $ref = $(refEl);
      const endnoteId = $ref.attr('data-endnote-id');

      if (endnoteId) {
        // Find the corresponding endnote content
        const $endnoteDiv = $(`.endnote[data-endnote-id="${endnoteId}"]`);
        if ($endnoteDiv.length > 0) {
          const endnoteText = $endnoteDiv.text();

          // Replace endnote-ref with superscript number
          $ref.replaceWith(`<sup class="endnote-ref">${endnoteId}</sup>`);

          // Collect endnote for later generation
          endnotes.push({ id: endnoteId, text: endnoteText });

          // Remove the endnote div (we'll regenerate at end)
          $endnoteDiv.remove();
        }
      }
    });

    // Generate endnotes section if we have endnotes
    if (endnotes.length > 0) {
      // Sort endnotes by ID to maintain order
      endnotes.sort((a, b) => parseInt(a.id) - parseInt(b.id));

      const endnotesHtml = `
        <div class="endnotes-section">
          <h2>Endnotes</h2>
          ${endnotes.map(endnote =>
            `<p class="endnote-item">
              <span class="endnote-number">${endnote.id}.</span>
              <span class="endnote-text">${endnote.text}</span>
            </p>`
          ).join('\n')}
        </div>
      `;

      // Append endnotes section to document body
      $('body').append(endnotesHtml);
    }

    return $.html();
  }

  /**
   * Create a footnote reference run
   */
  private static async createFootnoteReference(
    id: number,
  ): Promise<FootnoteReferenceRun> {
    return new FootnoteReferenceRun(id);
  }

  /**
   * Create an endnote reference run using native EndnoteReferenceRun
   */
  private static async createEndnoteReference(
    id: number,
  ): Promise<EndnoteReferenceRun> {
    return new EndnoteReferenceRun(id);
  }

}
