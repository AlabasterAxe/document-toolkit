import * as ReactDomServer from "react-dom/server";
import * as React from "react";
import { marked } from "marked";
import { writeFileSync } from "fs";
import { join, dirname } from "path";
import { spawn } from "child_process";
import { load } from "cheerio";
import matter from "gray-matter";
import { fileURLToPath } from "url";
// ESM __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
export class DocumentGenerator {
    /**
     * Generate a document from markdown content using a React template
     */
    static async generateDocument(options) {
        try {
            const { content, template: TemplateComponent, templateProps = {}, format, outputPath, cssPath, timeout = 30000 } = options;
            // Parse front-matter from markdown if present
            const { content: markdown, data: frontMatter } = matter(content);
            // Convert markdown to HTML
            const htmlContent = marked(markdown);
            // Render React template to HTML
            const renderedHtml = ReactDomServer.renderToStaticMarkup(React.createElement(TemplateComponent, {
                ...templateProps,
                ...frontMatter,
                markdownContent: htmlContent
            }));
            // Determine output path
            const finalOutputPath = outputPath || join(process.cwd(), `output.${format}`);
            if (format === "pdf") {
                await this.generatePDF(renderedHtml, finalOutputPath, cssPath, timeout);
            }
            else if (format === "docx") {
                await this.generateDOCX(renderedHtml, finalOutputPath);
            }
            else {
                throw new Error(`Unsupported format: ${format}`);
            }
            return {
                success: true,
                outputPath: finalOutputPath
            };
        }
        catch (error) {
            return {
                success: false,
                outputPath: options.outputPath || "",
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }
    /**
     * Generate PDF using pagedjs-cli
     */
    static async generatePDF(html, outputPath, cssPath, timeout = 30000) {
        // Write HTML to temporary file
        const tempHtmlPath = join(dirname(outputPath), "temp-document.html");
        // If cssPath is provided, inject it into the HTML
        let finalHtml = html;
        if (cssPath) {
            finalHtml = html.replace('<link rel="stylesheet" href="legal-style.css" />', `<link rel="stylesheet" href="${cssPath}" />`);
        }
        writeFileSync(tempHtmlPath, finalHtml, "utf-8");
        return new Promise((resolve, reject) => {
            // Use npm script to run pagedjs-cli - much more robust than path detection
            const packageDir = join(__dirname, "..", "..");
            const args = [
                "run", "generate-pdf", "--",
                tempHtmlPath,
                "-o",
                outputPath,
                "--timeout",
                timeout.toString()
            ];
            const childProcess = spawn("npm", args, {
                cwd: packageDir,
                stdio: ["pipe", "pipe", "pipe"],
            });
            let stdout = "";
            let stderr = "";
            childProcess.stdout?.on("data", (data) => {
                stdout += data.toString();
            });
            childProcess.stderr?.on("data", (data) => {
                stderr += data.toString();
            });
            childProcess.on("close", (code) => {
                if (code === 0) {
                    resolve();
                }
                else {
                    reject(new Error(`pagedjs-cli failed with code ${code}: ${stderr}`));
                }
            });
            childProcess.on("error", (error) => {
                reject(new Error(`Failed to start pagedjs-cli: ${error.message}`));
            });
        });
    }
    /**
     * Generate DOCX using docx library
     * Note: This is a simplified version - the full implementation from build.tsx
     * would need to be adapted based on specific template needs
     */
    static async generateDOCX(html, outputPath) {
        const $ = load(html);
        const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, } = await import("docx");
        // This is a very basic implementation - projects would need to customize
        // the DOCX generation based on their specific template requirements
        const paragraphs = [];
        // Extract text content and create basic paragraphs
        $("body").find("p, h1, h2, h3, h4, h5, h6").each((_, el) => {
            const $el = $(el);
            const text = $el.text().trim();
            if (text) {
                const tagName = el.tagName?.toLowerCase();
                if (tagName?.startsWith("h")) {
                    // Handle headings
                    const level = parseInt(tagName.slice(1));
                    const headingLevels = [
                        HeadingLevel.HEADING_1,
                        HeadingLevel.HEADING_2,
                        HeadingLevel.HEADING_3,
                        HeadingLevel.HEADING_4,
                        HeadingLevel.HEADING_5,
                        HeadingLevel.HEADING_6,
                    ];
                    paragraphs.push(new Paragraph({
                        heading: headingLevels[level - 1],
                        alignment: level === 1 ? AlignmentType.CENTER : AlignmentType.LEFT,
                        children: [new TextRun({ text, bold: true })],
                    }));
                }
                else {
                    // Handle regular paragraphs
                    paragraphs.push(new Paragraph({
                        children: [new TextRun(text)],
                        spacing: { line: 480 }, // double-spaced
                        indent: { firstLine: 720 }, // 0.5" first-line indent
                    }));
                }
            }
        });
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
}
