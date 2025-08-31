import * as ReactDomServer from "react-dom/server";
import * as React from "react";
import { marked } from "marked";
import { readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { spawn } from "child_process";
import { BriefTemplate } from "./templates/BriefTemplate.tsx";
import { HeaUsptoResponse } from "./templates/HeaUsptoResponse.tsx";
import matter from "gray-matter";
import { load } from "cheerio";

// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// --- CLI Args ---
const argsFromCli = process.argv.slice(2);
const markdownPathArg = argsFromCli.find((arg) => !arg.startsWith("--"));

if (!markdownPathArg) {
  console.error("Error: Markdown file path is required.");
  console.log("Usage: bun build.tsx <path/to/markdown.md> [--format=pdf|docx]");
  process.exit(1);
}

const markdownFilePath = join(process.cwd(), markdownPathArg);

// --- 1. Read Input Files ---
console.log(`Reading content from ${markdownFilePath}...`);
const markdownFile = readFileSync(markdownFilePath, "utf-8");

// Parse front-matter from markdown
const { content: markdown, data: frontMatter } = matter(markdownFile);

// --- 2. Convert Markdown and Render React Template ---
console.log("Compiling document from template...");

const templates: Record<string, any> = {
  BriefTemplate,
  HeaUsptoResponse,
};

const templateName = frontMatter.template || "BriefTemplate";
const TemplateComponent = templates[templateName];

if (!TemplateComponent) {
  console.error(`Unknown template: ${templateName}`);
  process.exit(1);
}

const htmlContent = marked(markdown);
const renderedHtml = ReactDomServer.renderToStaticMarkup(
  <TemplateComponent {...frontMatter} markdownContent={htmlContent} />
);

const formatArg = argsFromCli.find((a) => a.startsWith("--format="));
const format = (formatArg ? formatArg.split("=")[1] : "pdf").toLowerCase();

// --- 3. Write HTML to temporary file ---
console.log("Writing HTML to temporary file...");
const tempHtmlPath = join(__dirname, "temp-document.html");
writeFileSync(tempHtmlPath, renderedHtml, "utf-8");

if (format === "pdf") {
  // --- 4a. Generate PDF using pagedjs-cli ---
  console.log("Generating PDF using pagedjs-cli...");
  const outputPath = join(__dirname, "output.pdf");

  await new Promise<void>((resolve, reject) => {
    const cliPath = join(__dirname, "node_modules", ".bin", "pagedjs-cli");
    const args = [
      tempHtmlPath, // input file
      "-o",
      outputPath, // output file
      "--timeout",
      "30000", // 30 second timeout
    ];

    console.log(`Running: ${cliPath} ${args.join(" ")}`);

    const process = spawn(cliPath, args, {
      stdio: ["pipe", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    process.stdout?.on("data", (data) => {
      stdout += data.toString();
      console.log("pagedjs-cli stdout:", data.toString());
    });

    process.stderr?.on("data", (data) => {
      stderr += data.toString();
      console.log("pagedjs-cli stderr:", data.toString());
    });

    process.on("close", (code) => {
      if (code === 0) {
        console.log("pagedjs-cli completed successfully");
        resolve();
      } else {
        console.error(`pagedjs-cli exited with code ${code}`);
        console.error("stderr:", stderr);
        reject(new Error(`pagedjs-cli failed with code ${code}: ${stderr}`));
      }
    });

    process.on("error", (error) => {
      console.error("Failed to start pagedjs-cli:", error);
      reject(error);
    });
  });

  console.log("✅ PDF generated successfully at docgen/output.pdf");
} else if (format === "docx") {
  // --- 4b. Generate DOCX using docx (fine-grained) or html-to-docx fallback ---
  const outputDocxPath = join(__dirname, "output.docx");

  console.log("Generating DOCX using docx (engine=docx)...");
  const $ = load(renderedHtml);
  const {
    Document,
    Packer,
    Paragraph,
    TextRun,
    HeadingLevel,
    FootnoteReferenceRun,
    Table,
    TableRow,
    TableCell,
    WidthType,
    AlignmentType,
    LevelFormat,
    PageBreak,
  } = await import("docx");

  let footnoteIdCounter = 0;
  const footnoteMap = new Map<number, { children: any[] }>();

  type StyleCtx = {
    bold?: boolean;
    italics?: boolean;
    underline?: boolean;
    color?: string;
    size?: number; // half-points (e.g., 24 = 12pt)
    textTransform?: "uppercase" | "capitalize";
  };
  const isTextNode = (n: unknown): n is { type: string; data?: string } =>
    !!n && typeof n === "object" && (n as any).type === "text";
  const isTagNode = (n: unknown): n is { type: string; name?: string } =>
    !!n && typeof n === "object" && (n as any).type === "tag";

  function createRuns(el: unknown, style: StyleCtx = {}) {
    const runs: any[] = [];
    if (isTextNode(el)) {
      const text = (el.data || "")
        .replace(/\s+/g, " ")
        .replace(/^\s|\s$/g, " ");
      if (text.trim()) {
        let finalText = text;
        if (style.textTransform === "uppercase")
          finalText = finalText.toUpperCase();
        if (style.textTransform === "capitalize")
          finalText = finalText.replace(
            /\b(\p{L}+)/gu,
            (m) => m[0].toUpperCase() + m.slice(1).toLowerCase()
          );
        runs.push(
          new TextRun({
            text: finalText,
            bold: style.bold,
            italics: style.italics,
            underline: style.underline ? {} : undefined,
            color: style.color,
            size: style.size,
          })
        );
      }
      return runs;
    }
    if (!isTagNode(el)) return runs;
    const tag = el.name?.toLowerCase();
    const $node = $(el as any);
    switch (tag) {
      case "strong":
      case "b":
        $node.contents().each((_, child) => {
          runs.push(...createRuns(child, { ...style, bold: true }));
        });
        break;
      case "em":
      case "i":
        $node.contents().each((_, child) => {
          runs.push(...createRuns(child, { ...style, italics: true }));
        });
        break;
      case "u":
        $node.contents().each((_, child) => {
          runs.push(...createRuns(child, { ...style, underline: true }));
        });
        break;
      case "sup":
        if ($node.hasClass("footnote-ref")) {
          const id = ++footnoteIdCounter;
          runs.push(new FootnoteReferenceRun(id));
        } else {
          $node.contents().each((_, child) => {
            runs.push(...createRuns(child, style));
          });
        }
        break;
      case "span":
        if ($node.hasClass("footnote-content")) {
          const id = footnoteIdCounter;
          const contentNodes = $node
            .contents()
            .toArray()
            .filter(
              (n) =>
                !(
                  n.type === "tag" &&
                  (n as any).name?.toLowerCase() === "span" &&
                  $(n).hasClass("footnote-number")
                )
            );
          const paraRuns: any[] = [];
          for (const child of contentNodes)
            paraRuns.push(
              ...createRuns(child, { ...style, size: 20 }) // 10pt footnotes
            );
          const paragraphs = [
            new Paragraph({
              alignment: AlignmentType.JUSTIFIED,
              spacing: { line: 240 }, // single spaced
              children: paraRuns,
            }),
          ];
          footnoteMap.set(id, { children: paragraphs });
        } else {
          $node.contents().each((_, child) => {
            runs.push(...createRuns(child, style));
          });
        }
        break;
      case "br":
        runs.push(new TextRun({ text: "", break: 1 }));
        break;
      case "a": {
        const href = $node.attr("href");
        if (href && /^https?:/i.test(href)) {
          $node.contents().each((_, child) => {
            runs.push(
              ...createRuns(child, {
                ...style,
                underline: true,
                color: "0000EE",
              })
            );
          });
        } else {
          $node.contents().each((_, child) => {
            runs.push(...createRuns(child, style));
          });
        }
        break;
      }
      default:
        $node.contents().each((_, child) => {
          runs.push(...createRuns(child, style));
        });
    }
    return runs;
  }

  function handleHeaUsptoResponseHeader($container: any) {
    const out: any[] = [];

    // USPTO Header
    const usptoHeaderText = $container.find(".uspto-header").text().trim();
    if (usptoHeaderText) {
      out.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: usptoHeaderText, bold: true })],
          spacing: { after: 240 },
        })
      );
    }

    // Header Table
    const $table = $container.find(".header-table");
    if ($table.length) {
      const rows: any[] = [];
      $table.find("tr").each((rowIndex: number, tr: any) => {
        const cells: any[] = [];
        $(tr)
          .find("td")
          .each((cellIndex: number, td: any) => {
            const $td = $(td);
            const paragraphs: any[] = [];

            let alignment: "left" | "right" | "center" = AlignmentType.LEFT;
            if (cellIndex === 1) {
              alignment = AlignmentType.RIGHT;
            }
            if ($td.attr("class")?.includes("-label")) {
              alignment = AlignmentType.RIGHT;
            }

            let isBold = false;
            if ($td.hasClass("document-name")) {
              alignment = AlignmentType.CENTER;
              isBold = true;
            }

            let spacing = {};
            if ($td.text().trim() === "Commissioner:") {
              spacing = { before: 720 };
            }

            const children = $td.children();
            if (children.length > 0 && children.is("div")) {
              children.each((_: number, div: any) => {
                const text = $(div).text().trim();
                if (text) {
                  paragraphs.push(
                    new Paragraph({
                      children: [new TextRun(text)],
                      alignment,
                      spacing,
                    })
                  );
                }
              });
            } else {
              const text = $td.text().trim();
              if (text) {
                paragraphs.push(
                  new Paragraph({
                    children: [new TextRun({ text, bold: isBold })],
                    alignment,
                    spacing,
                  })
                );
              }
            }

            const colSpan = $td.attr("colspan")
              ? parseInt($td.attr("colspan") as string, 10)
              : 1;

            cells.push(
              new TableCell({
                children: paragraphs,
                columnSpan: colSpan,
                margins: {
                  top: 100,
                  bottom: 100,
                },
                borders: {
                  top: { style: "nil", size: 0, color: "FFFFFF" },
                  bottom: { style: "nil", size: 0, color: "FFFFFF" },
                  left: { style: "nil", size: 0, color: "FFFFFF" },
                  right: { style: "nil", size: 0, color: "FFFFFF" },
                },
              })
            );
          });
        rows.push(new TableRow({ children: cells }));
      });

      const table = new Table({
        rows,
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: {
          top: { style: "nil", size: 0, color: "FFFFFF" },
          bottom: { style: "nil", size: 0, color: "FFFFFF" },
          left: { style: "nil", size: 0, color: "FFFFFF" },
          right: { style: "nil", size: 0, color: "FFFFFF" },
          insideHorizontal: { style: "nil", size: 0, color: "FFFFFF" },
          insideVertical: { style: "nil", size: 0, color: "FFFFFF" },
        },
      });
      out.push(table);
    }

    return out;
  }

  function mapBlock(el: unknown) {
    const blocks: any[] = [];
    if (!isTagNode(el)) return blocks;
    const tag = el.name?.toLowerCase();
    const $el = $(el as any);
    // Custom component handlers by class
    if (tag === "div" && $el.hasClass("caption-container")) {
      blocks.push(...handleCaption($el));
      return blocks;
    }
    if (tag === "div" && $el.hasClass("signature-block")) {
      blocks.push(...handleSignatureBlock($el));
      return blocks;
    }
    if (tag === "div" && $el.hasClass("hea-uspto-response-header")) {
      blocks.push(...handleHeaUsptoResponseHeader($el));
      return blocks;
    }
    if (
      tag === "div" &&
      $el.attr("style")?.includes("page-break-before: always")
    ) {
      // PageBreak must be wrapped in a Paragraph
      blocks.push(
        new Paragraph({
          children: [new PageBreak()],
        })
      );
      return blocks;
    }
    switch (tag) {
      case "h1":
      case "h2":
      case "h3":
      case "h4":
      case "h5":
      case "h6": {
        const levelMap = {
          h1: HeadingLevel.HEADING_1,
          h2: HeadingLevel.HEADING_2,
          h3: HeadingLevel.HEADING_3,
          h4: HeadingLevel.HEADING_4,
          h5: HeadingLevel.HEADING_5,
          h6: HeadingLevel.HEADING_6,
        } as const;
        const runs: any[] = [];
        const headingTagKey = tag as keyof typeof levelMap;
        const textTransform =
          headingTagKey === "h1" || headingTagKey === "h2"
            ? "uppercase"
            : headingTagKey === "h3" || headingTagKey === "h4"
            ? "capitalize"
            : undefined;
        $el.contents().each((_, child) => {
          runs.push(
            ...createRuns(child, {
              textTransform,
              color: "000000",
              size: 24,
              bold: true,
            } as any)
          );
        });
        // Apply alignment and spacing similar to CSS
        const alignment =
          headingTagKey === "h1" ? AlignmentType.CENTER : AlignmentType.LEFT;
        blocks.push(
          new Paragraph({
            heading: levelMap[headingTagKey],
            alignment,
            spacing: { before: 360, after: 240, line: 480 }, // ~1.5em before, 1em after, double-spaced
            indent: { firstLine: 0 },
            children: runs,
          })
        );
        break;
      }
      case "p": {
        const runs: any[] = [];
        $el.contents().each((_, child) => {
          runs.push(...createRuns(child));
        });
        blocks.push(
          new Paragraph({
            children: runs,
            spacing: { line: 480 }, // double-spaced paragraphs
            indent: { firstLine: 720 }, // 0.5" first-line indent for body paragraphs
          })
        );
        break;
      }
      case "ul": {
        $el.children("li").each((_, li) => {
          const runs: any[] = [];
          $(li)
            .contents()
            .each((__, child) => {
              runs.push(...createRuns(child));
            });
          blocks.push(
            new Paragraph({
              children: runs,
              numbering: { reference: "bullets", level: 0 },
              spacing: { line: 480 },
              indent: { firstLine: 0 },
            })
          );
        });
        break;
      }
      case "ol": {
        $el.children("li").each((_, li) => {
          const runs: any[] = [];
          $(li)
            .contents()
            .each((__, child) => {
              runs.push(...createRuns(child));
            });
          blocks.push(
            new Paragraph({
              children: runs,
              numbering: { reference: "numbered", level: 0 },
              spacing: { line: 480 },
              indent: { firstLine: 0 },
            })
          );
        });
        break;
      }
      default:
        $el.children().each((_, child) => {
          blocks.push(...mapBlock(child));
        });
    }
    return blocks;
  }

  function handleCaption($container: any) {
    const out: any[] = [];
    // Court header lines (left-aligned, single-spaced)
    const courtLines = $container
      .find(".court-header > div")
      .toArray()
      .map((n: any) => $(n).text().trim())
      .filter((t: string) => !!t);
    courtLines.forEach((line: string, idx: number) => {
      out.push(
        new Paragraph({
          alignment: AlignmentType.LEFT,
          spacing: {
            line: 240,
            after: idx === courtLines.length - 1 ? 240 : 0,
          }, // single-spaced lines
          indent: { firstLine: 0 },
          children: [new TextRun({ text: line })],
        })
      );
    });
    // Left cell: parties and roles
    const leftParas: any[] = [];
    const $partiesCell = $container.find("td.parties");
    if ($partiesCell.length) {
      const $plBlock = $partiesCell.children("div").eq(0);
      $plBlock.children("div").each((_: any, div: any) => {
        const $div = $(div);
        if ($div.hasClass("party-role")) return;
        const t = $div.text().trim();
        if (t) leftParas.push(new Paragraph({ children: [new TextRun(t)] }));
      });
      const $plRole = $plBlock.find(".party-role").first();
      if ($plRole.length) {
        const roleText = $plRole.text().trim();
        if (roleText)
          leftParas.push(
            new Paragraph({
              children: [new TextRun({ text: roleText, italics: true })],
            })
          );
      }
      const vsText = $partiesCell.find(".caption-vs").first().text().trim();
      if (vsText)
        leftParas.push(
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 240, after: 240 },
            children: [new TextRun(vsText)],
          })
        );
      const $defBlock = $partiesCell.children("div").eq(2);
      $defBlock.children("div").each((_: any, div: any) => {
        const $div = $(div);
        if ($div.hasClass("party-role")) return;
        const t = $div.text().trim();
        if (t) leftParas.push(new Paragraph({ children: [new TextRun(t)] }));
      });
      const $defRole = $defBlock.find(".party-role").first();
      if ($defRole.length) {
        const roleText = $defRole.text().trim();
        if (roleText)
          leftParas.push(
            new Paragraph({
              children: [new TextRun({ text: roleText, italics: true })],
            })
          );
      }
    }
    // Right cell: index no and doc type (left-aligned, doc type uppercase 11pt)
    const rightParas: any[] = [];
    const indexNo = $container.find(".index-no").first().text().trim();
    const docType = $container.find(".document-type").first().text().trim();
    if (indexNo)
      rightParas.push(
        new Paragraph({
          alignment: AlignmentType.LEFT,
          children: [new TextRun({ text: indexNo })],
        })
      );
    if (docType)
      rightParas.push(
        new Paragraph({
          alignment: AlignmentType.LEFT,
          spacing: { before: 240 },
          children: [
            new TextRun({ text: docType.toUpperCase(), bold: true, size: 22 }),
          ],
        })
      );

    const cellPadding = 150; // ~7.5pt (~10px)
    const table = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              width: { size: 60, type: WidthType.PERCENTAGE },
              margins: {
                top: cellPadding,
                bottom: cellPadding,
                left: cellPadding,
                right: cellPadding,
              },
              borders: {
                top: { size: 8, color: "000000", style: "single" },
                right: { size: 8, color: "000000", style: "single" },
                bottom: { size: 8, color: "000000", style: "single" },
                left: { size: 0, color: "FFFFFF", style: "nil" },
              },
              children: leftParas,
            }),
            new TableCell({
              width: { size: 40, type: WidthType.PERCENTAGE },
              margins: {
                top: cellPadding,
                bottom: cellPadding,
                left: cellPadding,
                right: cellPadding,
              },
              borders: {
                top: { size: 0, color: "FFFFFF", style: "nil" },
                right: { size: 0, color: "FFFFFF", style: "nil" },
                bottom: { size: 0, color: "FFFFFF", style: "nil" },
              },
              children: rightParas,
            }),
          ],
        }),
      ],
    });
    out.push(table);
    // Caption container bottom margin 2em (~24pt)
    out.push(
      new Paragraph({ spacing: { after: 480 }, children: [new TextRun("")] })
    );
    return out;
  }

  function handleSignatureBlock($container: any) {
    const out: any[] = [];
    // Date info
    $container.find(".signature-date > div").each((_: any, n: any) => {
      const t = $(n).text().trim();
      if (t)
        out.push(
          new Paragraph({
            children: [new TextRun(t)],
            spacing: { line: 240 }, // single-spaced
            keepLines: true,
            keepNext: true,
          })
        );
    });
    // Approximate 50% indent of text width (~6.5" usable width -> ~3.25" indent)
    const indent = { left: 4680, firstLine: 0 };
    let isFirstSigPara = true;
    const by = $container.find(".signature-by").first().text().trim();
    if (by)
      out.push(
        new Paragraph({
          indent,
          spacing: { line: 240, before: isFirstSigPara ? 720 : 0 },
          keepLines: true,
          keepNext: true,
          children: [new TextRun(by)],
        })
      );
    isFirstSigPara = false;
    if ($container.find(".signature-line").length) {
      out.push(
        new Paragraph({
          indent,
          spacing: { line: 240 },
          keepLines: true,
          keepNext: true,
          children: [new TextRun("____________________________")],
        })
      );
    }
    const name = $container.find(".signer-name").first().text().trim();
    if (name)
      out.push(
        new Paragraph({
          indent,
          spacing: { line: 240 },
          keepLines: true,
          keepNext: true,
          children: [new TextRun({ text: name, bold: true })],
        })
      );
    const title = $container.find(".signer-title").first().text().trim();
    if (title)
      out.push(
        new Paragraph({
          indent,
          spacing: { line: 240 },
          keepLines: true,
          keepNext: true,
          children: [new TextRun(title)],
        })
      );
    $container.find(".signer-address").each((_: any, n: any) => {
      const t = $(n).text().trim();
      if (t)
        out.push(
          new Paragraph({
            indent,
            spacing: { line: 240 },
            keepLines: true,
            keepNext: true,
            children: [new TextRun(t)],
          })
        );
    });
    const phone = $container.find(".signer-phone").first().text().trim();
    if (phone)
      out.push(
        new Paragraph({
          indent,
          spacing: { line: 240 },
          keepLines: true,
          // last line in block: no keepNext
          children: [new TextRun(phone)],
        })
      );
    return out;
  }

  const bodyChildren: any[] = [];
  $("body")
    .children()
    .each((_, el) => {
      bodyChildren.push(...mapBlock(el));
    });

  const footnotesObj: Record<number, { children: any[] }> = {};
  for (const [id, val] of footnoteMap.entries()) {
    footnotesObj[id] = val;
  }

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: {
            font: "Times New Roman",
            size: 24, // 12pt
          },
          paragraph: {},
        },
      },
    },
    numbering: {
      config: [
        {
          reference: "bullets",
          levels: [
            {
              level: 0,
              format: LevelFormat.BULLET,
              text: "\u2022",
              alignment: AlignmentType.LEFT,
            },
          ],
        },
        {
          reference: "numbered",
          levels: [
            {
              level: 0,
              format: LevelFormat.DECIMAL,
              text: "%1.",
              alignment: AlignmentType.LEFT,
            },
          ],
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: 12240, height: 15840 }, // Letter 8.5"x11"
            margin: { top: 1440, right: 1440, bottom: 2016, left: 1440 },
          },
        },
        children: bodyChildren,
      },
    ],
    footnotes:
      Object.keys(footnotesObj).length > 0 ? (footnotesObj as any) : undefined,
  });

  const buffer = await Packer.toBuffer(doc);
  writeFileSync(outputDocxPath, buffer);
  console.log("✅ DOCX generated successfully at docgen/output.docx");
} else {
  console.error(`Unknown --format: ${format}. Use pdf or docx.`);
  process.exit(1);
}
