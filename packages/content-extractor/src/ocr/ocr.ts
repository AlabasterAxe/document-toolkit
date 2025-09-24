import { mkdirSync, statSync } from "node:fs";
import { readdir, writeFile } from "node:fs/promises";
import * as path from "node:path";
import { join } from "jsr:@std/path/join";
import { exists } from "jsr:@std/fs/exists";
import { getMistralMarkdowns } from "./mistral-ocr.ts";
import { extractSections } from "./gemini-section-md.ts";
import { GeminiClient } from "./gemini-client.ts";
import { processMarkdown } from "./clean-mds.ts";

// Document configuration management
interface DocConfig {
  type: string;
  bookName: string;
  version: string;
  config: {
    pageOffset: number;
    ocrProvider?: string;
    sectionFormat?: string;
  };
  toc: any[];
  processedAt?: Date;
}

async function saveDocConfig(docDir: string, tocData: any): Promise<void> {
  if (!(await exists(docDir))) {
    await Deno.mkdir(docDir, { recursive: true });
  }

  const bookName = path.basename(docDir);
  const docConfig: DocConfig = {
    type: "document-ocr",
    bookName,
    version: "1.0",
    config: {
      pageOffset: tocData.pageOffset,
      ocrProvider: "gemini",
      sectionFormat: "markdown",
    },
    toc: tocData.tocEntries,
    processedAt: new Date(),
  };

  const configPath = join(docDir, "docconfig.json");
  await Deno.writeTextFile(configPath, JSON.stringify(docConfig, null, 2));
  console.log(`📚 Saved document config for "${bookName}" at ${configPath}`);
}

async function loadDocConfig(docDir: string): Promise<DocConfig | null> {
  const configPath = join(docDir, "docconfig.json");

  if (!(await exists(configPath))) {
    return null;
  }

  const configContent = await Deno.readTextFile(configPath);
  return JSON.parse(configContent) as DocConfig;
}

async function processTOC(docDir: string, tocFilePath: string): Promise<void> {
  const bookName = path.basename(docDir);
  console.log(
    `📖 Processing TOC for document "${bookName}" from ${tocFilePath}`
  );

  if (!(await exists(tocFilePath))) {
    console.error(`❌ TOC file not found: ${tocFilePath}`);
    Deno.exit(1);
  }

  // Get API keys
  const geminiApiKey = Deno.env.get("GEMINI_API_KEY");
  if (!geminiApiKey) {
    throw new Error("GEMINI_API_KEY environment variable is required");
  }
  const geminiClient = new GeminiClient(geminiApiKey);

  console.log("🔍 Extracting TOC structure...");

  const toc = await geminiClient.extractTOC(tocFilePath);

  await saveDocConfig(docDir, toc);
}

async function processHeadings(
  docDir: string,
  startPage: number,
  endPage: number,
  maxDepth?: number
): Promise<void> {
  const bookName = path.basename(docDir);
  console.log(`📚 Loading document config for "${bookName}"`);

  const docConfig = await loadDocConfig(docDir);
  if (!docConfig) {
    console.error(
      `❌ No document config found for "${bookName}". Please run: pnpm ocr ${docDir} toc <toc-file>`
    );
    Deno.exit(1);
  }

  console.log(`✅ Found TOC with ${docConfig.toc.length} entries`);
  console.log(
    `🔍 Filtering headings for pages ${startPage}-${endPage}${
      maxDepth ? ` (max depth ${maxDepth})` : ""
    }`
  );

  // Filter headings that start within the page range
  let filteredEntries = docConfig.toc.filter(
    (entry) => entry.page >= startPage && entry.page <= endPage
  );

  // Apply depth filter if specified
  if (maxDepth !== undefined) {
    filteredEntries = filteredEntries.filter(
      (entry) => entry.depth <= maxDepth
    );
  }

  // Check for incomplete sections at the end
  // If the last heading's next sibling or parent appears after endPage, exclude it
  if (filteredEntries.length > 0) {
    const lastEntry = filteredEntries[filteredEntries.length - 1];
    const lastEntryIndex = docConfig.toc.findIndex(
      (entry) => entry.globalIndex === lastEntry.globalIndex
    );

    if (lastEntryIndex < docConfig.toc.length - 1) {
      // Find the next heading that would indicate the end of this section
      const nextEntry = docConfig.toc[lastEntryIndex + 1];

      // If the next entry is at the same or higher level (lower depth number)
      // and appears after our end page, the last section is incomplete
      if (nextEntry.depth <= lastEntry.depth && nextEntry.page > endPage) {
        console.log(
          `⚠️  Excluding incomplete section "${lastEntry.name}" (continues beyond page ${endPage})`
        );
        filteredEntries.pop();
      }
    }
  }

  // Format and display results
  if (filteredEntries.length === 0) {
    console.log("No complete headings found in the specified range.");
    return;
  }

  console.log(`\nFound ${filteredEntries.length} complete headings:\n`);

  for (const entry of filteredEntries) {
    const indent = "  ".repeat(entry.depth - 1);
    const depthIndicator =
      entry.depth === 1
        ? "📖"
        : entry.depth === 2
        ? "📝"
        : entry.depth === 3
        ? "📄"
        : "📋";

    console.log(
      `${indent}${depthIndicator} ${entry.name} (page ${entry.page})`
    );
  }
}

async function processContents(
  docDir: string,
  contentsFilePath: string
): Promise<void> {
  const bookName = path.basename(docDir);
  console.log(
    `📄 Processing contents for document "${bookName}" from ${contentsFilePath}`
  );

  const contentsFileBaseName = path.parse(contentsFilePath).name;

  if (!(await exists(contentsFilePath))) {
    console.error(`❌ Contents file not found: ${contentsFilePath}`);
    Deno.exit(1);
  }

  // Load document config
  const docConfig = await loadDocConfig(docDir);
  if (!docConfig) {
    console.error(
      `❌ No document config found for "${bookName}". Please run: pnpm ocr ${docDir} toc <toc-file>`
    );
    Deno.exit(1);
  }

  console.log(
    `✅ Found document config for "${bookName}" with ${docConfig.toc.length} entries`
  );

  const jobsDir = path.join(docDir, "jobs");
  const sectionsDir = path.join(docDir, "sections");

  // Create job directory for content processing
  const jobDir = path.join(jobsDir, "contentParts", contentsFileBaseName);
  const responseDir = path.join(jobDir, "responses");
  const resultsDir = path.join(jobDir, "results");

  [jobDir, responseDir, resultsDir, sectionsDir].forEach((dir) =>
    mkdirSync(dir, { recursive: true })
  );

  await Deno.copyFile(
    contentsFilePath,
    path.join(jobDir, `${contentsFileBaseName}.pdf`)
  );

  // Detect content start page using first TOC entry
  const geminiApiKey = Deno.env.get("GEMINI_API_KEY");
  if (!geminiApiKey) {
    console.error("❌ GEMINI_API_KEY environment variable is required");
    Deno.exit(1);
  }

  const geminiClient = new GeminiClient(geminiApiKey);

  let excerptStartPage = 1;
  if (docConfig.toc.length > 0) {
    console.log(`🔍 Detecting content start page in PDF...`);
    excerptStartPage = await geminiClient.detectContentStartPage(
      contentsFilePath
    );
    console.log(`📍 This PDF excerpt starts at book page ${excerptStartPage}`);
  }

  // Find relevant TOC entries that should be in this excerpt, preserving global indices
  const relevantTocEntries = docConfig.toc
    .map((entry, index) => ({ ...entry, globalIndex: index + 1 })) // Add 1-based global index
    .filter((entry) => entry.page >= excerptStartPage);

  if (relevantTocEntries.length === 0) {
    console.warn(
      `⚠️ No TOC entries found at or after page ${excerptStartPage}. Processing without TOC structure.`
    );
  } else {
    console.log(
      `📋 Found ${relevantTocEntries.length} relevant TOC entries starting from page ${excerptStartPage}`
    );
  }

  // Page offset should be 0 for chapter excerpts that start with actual content
  // The offset is only needed for PDFs with non-content pages at the beginning
  const pageOffset = 0;
  console.log(
    `🔢 Page offset set to ${pageOffset} for chapter excerpt (book page ${excerptStartPage} = PDF page 1)`
  );

  // Check if OCR results already exist
  let mdFiles: string[];
  let existingResultFiles = [];

  if (await exists(resultsDir)) {
    existingResultFiles = Array.from(await readdir(resultsDir))
      .filter(
        (file) =>
          file.startsWith(`${contentsFileBaseName}-`) && file.endsWith(".md")
      )
      .sort((a, b) => {
        const getPageNum = (filename: string) => {
          const match = filename.match(/-(\d+)\.md$/);
          return match ? parseInt(match[1]) : 0;
        };
        return getPageNum(a) - getPageNum(b);
      });
  }

  if (existingResultFiles.length > 0) {
    console.log(
      `📁 Found existing OCR results (${existingResultFiles.length} files), reusing them...`
    );
    mdFiles = await Promise.all(
      existingResultFiles.map((file) =>
        Deno.readTextFile(path.join(resultsDir, file))
      )
    );
  } else {
    // Process with Mistral OCR
    console.log("🔍 Running OCR on contents...");
    mdFiles = await getMistralMarkdowns(contentsFilePath);

    // Save OCR results
    for (const [index, md] of mdFiles.entries()) {
      await writeFile(
        path.join(resultsDir, `${contentsFileBaseName}-${index}.md`),
        md
      );
    }
    console.log(`💾 Saved ${mdFiles.length} OCR result files to ${resultsDir}`);
  }

  // Save the filtered TOC and page offset for this specific job
  const jobTocData = {
    tocEntries: relevantTocEntries,
    pageOffset: pageOffset,
    excerptStartPage: excerptStartPage,
    originalBookName: bookName,
  };
  await writeFile(
    path.join(jobDir, "toc-extraction.json"),
    JSON.stringify(jobTocData, null, 2)
  );
  console.log(
    `💾 Saved filtered TOC with ${relevantTocEntries.length} entries and offset ${pageOffset} for processing`
  );

  // Use existing Gemini processing with adjusted TOC
  await extractSections([jobDir], [docDir]);

  console.log(
    `✅ Successfully processed contents for "${bookName}" using document config structure`
  );
}

async function* walk(dir: string): AsyncIterableIterator<string> {
  for await (const d of Deno.readDir(dir)) {
    const entry = path.join(dir, d.name);
    if (d.isDirectory) yield* walk(entry);
    else if (d.isFile) yield entry;
  }
}

async function processClean(directoryPath: string): Promise<void> {
  console.log(`🧹 Cleaning markdown files in directory: ${directoryPath}`);

  if (!(await exists(directoryPath))) {
    console.error(`❌ Directory not found: ${directoryPath}`);
    Deno.exit(1);
  }

  let processedCount = 0;

  for await (const file of walk(directoryPath)) {
    if (file.endsWith(".md")) {
      console.log(`📄 Processing file: ${file}`);
      try {
        const content = await Deno.readTextFile(file);
        const processedContent = processMarkdown(content, [
          "footnotes",
          "stars",
          "trimStart",
          "collapseSpaces",
          "latex",
        ]);
        await Deno.writeTextFile(file, processedContent);
        processedCount++;
      } catch (error) {
        console.error(`❌ Error processing ${file}:`, error);
      }
    }
  }

  console.log(`✅ Successfully processed ${processedCount} markdown files`);
}

function printUsage(): void {
  console.log(`
Usage:
  pnpm ocr <doc-dir> toc <toc-file-path>
  pnpm ocr <doc-dir> contents <contents-file-path>
  pnpm ocr <doc-dir> headings <start-page> <end-page> [max-depth]
  pnpm ocr <doc-dir> clean

Examples:
  pnpm ocr ./apps/cjelc/documents/business-orgs toc "pdfs/biz_orgs_toc.pdf"
  pnpm ocr ./apps/cjelc/documents/business-orgs contents "pdfs/biz_orgs_ch1.pdf"
  pnpm ocr ./apps/cjelc/documents/business-orgs headings 1 50
  pnpm ocr ./apps/cjelc/documents/business-orgs headings 100 200 2
  pnpm ocr ./apps/cjelc/documents/business-orgs clean
`);
}

// Parse command line arguments
const args = Deno.args;

if (args.length === 0) {
  // Legacy behavior - process all PDFs in pdfs directory
  console.log("🔄 Legacy mode: processing all PDFs in pdfs/ directory");

  async function processFiles(): Promise<string[]> {
    const pdfDir = "pdfs";
    const files = (await readdir(pdfDir)).filter(
      (file) => file !== ".DS_Store"
    );

    files.sort((a: string, b: string) => a.localeCompare(b));

    const jobDirs = [];
    for (const file of files) {
      const filePath = path.join(pdfDir, file);
      if (statSync(filePath).isFile()) {
        console.log(`Converting file: ${file}`);
        const pdfFilename = path.parse(file).name;
        jobDirs.push(pdfFilename);
        const jobDir = path.join("jobs", pdfFilename);
        const responseDir = path.join(jobDir, "responses");
        const resultsDir = path.join(jobDir, "results");
        const combinedDir = path.join(jobDir, "combined");

        [jobDir, responseDir, resultsDir, combinedDir].forEach((dir) =>
          mkdirSync(dir, { recursive: true })
        );

        await Deno.copyFile(filePath, path.join(jobDir, file));

        const mdFiles = await getMistralMarkdowns(filePath);

        for (const [index, md] of mdFiles.entries()) {
          await writeFile(
            path.join(resultsDir, `${pdfFilename}-${index}.md`),
            md
          );
        }

        await Deno.remove(filePath);
      }
    }
    return jobDirs;
  }

  try {
    const jobDirs = await processFiles();
    await extractSections(jobDirs);
  } catch (error) {
    console.error("Error processing files:", error);
    Deno.exit(1);
  }
} else if (args.length >= 2) {
  const docDir = args[0];
  const command = args[1];

  // Validate document directory exists
  if (!(await exists(docDir))) {
    console.error(`❌ Document directory not found: ${docDir}`);
    Deno.exit(1);
  }

  try {
    if (command === "toc") {
      if (args.length < 3) {
        console.error("❌ toc command requires a PDF file path");
        printUsage();
        Deno.exit(1);
      }
      const filePath = args[2];
      await processTOC(docDir, filePath);
    } else if (command === "contents") {
      if (args.length < 3) {
        console.error("❌ contents command requires a PDF file path");
        printUsage();
        Deno.exit(1);
      }
      const filePath = args[2];
      await processContents(docDir, filePath);
    } else if (command === "headings") {
      if (args.length < 4) {
        console.error(
          "❌ headings command requires start-page and end-page arguments"
        );
        printUsage();
        Deno.exit(1);
      }

      const startPage = parseInt(args[2]);
      const endPage = parseInt(args[3]);
      const maxDepth = args[4] ? parseInt(args[4]) : undefined;

      // Validate arguments
      if (isNaN(startPage) || isNaN(endPage)) {
        console.error("❌ Start page and end page must be valid numbers");
        printUsage();
        Deno.exit(1);
      }

      if (startPage > endPage) {
        console.error("❌ Start page must be less than or equal to end page");
        Deno.exit(1);
      }

      if (maxDepth !== undefined && (isNaN(maxDepth) || maxDepth < 1)) {
        console.error("❌ Max depth must be a positive number");
        Deno.exit(1);
      }

      await processHeadings(docDir, startPage, endPage, maxDepth);
    } else if (command === "clean") {
      await processClean(docDir);
    } else {
      console.error(`❌ Unknown command: ${command}`);
      printUsage();
      Deno.exit(1);
    }
  } catch (error) {
    console.error(`❌ Error processing ${command}:`, error);
    Deno.exit(1);
  }
} else {
  printUsage();
  Deno.exit(1);
}
