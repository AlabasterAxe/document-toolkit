import { join } from "jsr:@std/path/join";
import { exists } from "jsr:@std/fs/exists";
import { processMarkdown } from "./clean-mds.ts";
import { GeminiClient, TOCEntry, HeadingLocation } from "./gemini-client.ts";
import { getMistralMarkdowns } from "./mistral-ocr.ts";

const SKIP_SECTIONS = [
  "Take Note",
  "FYI",
  "Make the Connection",
  "Food for Thought",
  "Definition",
  "Practice Pointer",
];

function isSkipSection(line: string) {
  for (const skipSection of SKIP_SECTIONS) {
    if (line.indexOf(skipSection) !== -1) {
      return true;
    }
  }
}

const FOOTNOTE_REGEX = /^\[\^\d+\]/;
const ALT_FOOTNOTE_REGEX = /^(?:\${\s*})?\^{?\d+/;

function isSplitLine(line: string): boolean {
  const trimmedLine = line.trim();

  if (trimmedLine.length === 0) {
    return false;
  }

  if (trimmedLine.startsWith("#")) {
    return false;
  }

  let i = trimmedLine.length - 1;
  let lastChar = trimmedLine[i];
  while ((lastChar === '"' || lastChar === "'") && i > 0) {
    i--;
    lastChar = trimmedLine[i];
  }

  return Boolean(lastChar.match(/[a-zA-Z-,]/));
}

type ContentHierarchy = {
  name: string;
  depth: number;
  sectionNumber?: number;
  contents: string[];
  footnotes: string[];
  children: Map<string, ContentHierarchy>;
};

async function writeContentHierarchy(
  hierarchy: ContentHierarchy,
  baseDir: string
) {
  // Sanitize directory/file names
  function sanitize(name: string) {
    return name
      .replace(/#/g, "")
      .replace(/\s+/g, "_")
      .replace(/[^a-zA-Z0-9_\-]/g, "")
      .substring(0, 30)
      .replace(/^_+|_+$/g, "");
  }

  // Skip creating directory for root node (name === "root")
  if (hierarchy.name === "root") {
    // Just write children directly to baseDir
    for (const child of hierarchy.children.values()) {
      await writeContentHierarchy(child, baseDir);
    }
    return;
  }

  const nodeName = sanitize(hierarchy.name);

  // Create directory name with zero-padded section number, without depth prefix
  let dirName: string;
  if (hierarchy.sectionNumber) {
    const paddedNumber = hierarchy.sectionNumber.toString().padStart(5, "0");
    dirName = `${paddedNumber}-${nodeName}`;
  } else {
    dirName = nodeName;
  }

  const nodeDir = join(baseDir, dirName);

  if (!(await exists(nodeDir, { isDirectory: true }))) {
    await Deno.mkdir(nodeDir, { recursive: true });
  }

  // Write contents to content.md if any
  if (hierarchy.contents.length > 0 || hierarchy.footnotes.length > 0) {
    const contentLines = [...hierarchy.contents];

    // Add footnotes at the end if any exist
    if (hierarchy.footnotes.length > 0) {
      contentLines.push("", ...hierarchy.footnotes);
    }

    // Process and clean the markdown content before writing
    const rawContent = contentLines.join("\n");
    const cleanedContent = processMarkdown(rawContent, [
      "footnotes",
      "stars",
      "trimStart",
      "collapseSpaces",
      "latex",
    ]);

    await Deno.writeTextFile(
      join(nodeDir, "content.md"),
      cleanedContent
    );
  }

  // Recurse into children
  for (const child of hierarchy.children.values()) {
    await writeContentHierarchy(child, nodeDir);
  }
}

async function processWithGemini(
  pdfMarkdowns: string[],
  tocEntries: TOCEntry[],
  pageOffset: number,
  geminiClient: GeminiClient,
  dir: string
): Promise<{
  rootHierarchy: ContentHierarchy;
  failedHeadingRequests: Array<{
    page: number;
    expectedHeadings: string[];
    foundHeadings: string[];
    pageContent: string;
  }>;
}> {
  console.log(
    `Processing ${pdfMarkdowns.length} pages with ${tocEntries.length} TOC entries`
  );

  const rootHierarchy: ContentHierarchy = {
    name: "root",
    depth: 0,
    contents: [],
    footnotes: [],
    children: new Map(),
  };

  const nodeStack: ContentHierarchy[] = [rootHierarchy];
  let currentNode = rootHierarchy;

  // Debug tracking for failed heading requests
  const failedHeadingRequests: Array<{
    page: number;
    expectedHeadings: string[];
    foundHeadings: string[];
    pageContent: string;
  }> = [];

  // Global section indices will come from TOC entries

  // Create a map of TOC entries by their actual PDF page
  const tocByPage = new Map<number, TOCEntry[]>();

  // Get excerpt start page from existing TOC data if available
  const tocOutputPath = join(dir, "toc-extraction.json");
  let excerptStartPage = 1;
  if (await exists(tocOutputPath)) {
    try {
      const tocData = JSON.parse(await Deno.readTextFile(tocOutputPath));
      excerptStartPage = tocData.excerptStartPage || 1;
    } catch (error) {
      console.warn(
        "Could not read excerpt start page from TOC data, using default"
      );
    }
  }

  for (const entry of tocEntries) {
    // Map book page to 0-indexed PDF page: bookPage - excerptStartPage = pdfPageIndex
    const pdfPageIndex = entry.page - excerptStartPage;
    if (pdfPageIndex >= 0 && pdfPageIndex < pdfMarkdowns.length) {
      if (!tocByPage.has(pdfPageIndex)) {
        tocByPage.set(pdfPageIndex, []);
      }
      tocByPage.get(pdfPageIndex)!.push(entry);
    }
  }

  // State for line splitting detection
  let splitSentence = false;

  // Process each page
  for (let pageIndex = 0; pageIndex < pdfMarkdowns.length; pageIndex++) {
    const pageContent = pdfMarkdowns[pageIndex];
    const pageLines = pageContent.split("\n");
    const expectedHeadings = tocByPage.get(pageIndex) || [];

    // Get heading locations for this page if any headings are expected
    let headingLocations: HeadingLocation[] = [];
    if (expectedHeadings.length > 0) {
      const headingNames = expectedHeadings.map((entry) => entry.name);
      console.log(`Page ${pageIndex + 1}: Looking for headings:`, headingNames);

      try {
        headingLocations = await geminiClient.findHeadingLines(
          pageContent,
          headingNames
        );

        const foundHeadingNames = headingLocations.map((loc) => loc.heading);
        const missedHeadings = headingNames.filter(
          (name) => !foundHeadingNames.includes(name)
        );

        for (const location of headingLocations) {
          console.log(
            `Found heading "${location.heading}" at page ${
              pageIndex + 1
            }, line ${location.lineIndex}`
          );
        }

        // Track failed requests for debugging
        if (missedHeadings.length > 0) {
          failedHeadingRequests.push({
            page: pageIndex + 1,
            expectedHeadings: headingNames,
            foundHeadings: foundHeadingNames,
            pageContent: pageContent,
          });
        }
      } catch (error) {
        console.warn(`Error finding headings on page ${pageIndex + 1}:`, error);
        // Also track API errors as failed requests
        failedHeadingRequests.push({
          page: pageIndex + 1,
          expectedHeadings: headingNames,
          foundHeadings: [],
          pageContent: `ERROR: ${error}`,
        });
      }
    }

    // Create a map for quick lookup of heading line indices
    const headingAtLine = new Map<
      number,
      { heading: string; depth: number; globalIndex?: number }
    >();
    for (const location of headingLocations) {
      const tocEntry = expectedHeadings.find(
        (entry) => entry.name === location.heading
      );
      if (tocEntry) {
        headingAtLine.set(location.lineIndex, {
          heading: tocEntry.name,
          depth: tocEntry.depth,
          globalIndex: tocEntry.globalIndex,
        });
      }
    }

    // Process each line on this page
    for (let lineIndex = 0; lineIndex < pageLines.length; lineIndex++) {
      const line = pageLines[lineIndex];
      const trimmedLine = line.trim();

      // Skip section processing for certain patterns
      if (isSkipSection(trimmedLine)) {
        continue;
      }

      // Check for footnotes and add to current node's footnotes
      if (
        FOOTNOTE_REGEX.test(trimmedLine) ||
        ALT_FOOTNOTE_REGEX.test(trimmedLine)
      ) {
        currentNode.footnotes.push(line);
        continue;
      }

      // Handle line splitting logic
      if (splitSentence && !trimmedLine.startsWith("#")) {
        if (trimmedLine !== "") {
          // Concatenate with previous line
          const lastContentIndex = currentNode.contents.length - 1;
          if (lastContentIndex >= 0) {
            currentNode.contents[lastContentIndex] += " " + trimmedLine;
          } else {
            currentNode.contents.push(line);
          }
          splitSentence = isSplitLine(trimmedLine);
        }
        continue;
      } else {
        splitSentence = isSplitLine(trimmedLine);
      }

      // Check if this line is a heading
      const headingInfo = headingAtLine.get(lineIndex + 1); // Gemini uses 1-indexed line numbers
      if (headingInfo) {
        // Create new content hierarchy node using global TOC index
        const newNode: ContentHierarchy = {
          name: headingInfo.heading,
          depth: headingInfo.depth,
          sectionNumber: headingInfo.globalIndex,
          contents: [],
          footnotes: [],
          children: new Map(),
        };

        // Adjust node stack based on depth (using logic from selected code)
        while (nodeStack.length > headingInfo.depth) {
          nodeStack.pop();
        }

        const parent = nodeStack[nodeStack.length - 1];
        parent.children.set(headingInfo.heading, newNode);
        nodeStack.push(newNode);
        currentNode = newNode;

        console.log(
          `Created section: "${headingInfo.heading}" at depth ${headingInfo.depth} (global section ${headingInfo.globalIndex})`
        );
      } else {
        // Add line to current content hierarchy
        currentNode.contents.push(line);
      }
    }
  }

  return { rootHierarchy, failedHeadingRequests };
}

async function processDir(dir: string, destDir?: string) {
  const skipFile = join(dir, ".skip");

  if (await exists(skipFile, { isFile: true })) {
    console.log(`Skipping ${dir}`);
    return;
  }

  // Get all PDF files in the directory
  const pdfFiles = Array.from(Deno.readDirSync(dir))
    .filter((file) => file.isFile && file.name.endsWith(".pdf"))
    .map((file) => file.name)
    .sort(); // Sort to ensure consistent ordering

  if (pdfFiles.length === 0) {
    console.error(`No PDF file found in ${dir}`);
    return;
  }

  // Process each PDF file separately
  for (const pdfFile of pdfFiles) {
    await processPdfFile(dir, pdfFile, destDir);
  }
}

async function processPdfFile(
  dir: string,
  pdfFileName: string,
  destDir?: string
) {
  // Use the full filename without extension as identifier
  const fileIdentifier = pdfFileName.replace(".pdf", "");

  const outputDir = destDir ? join(destDir, "sections") : join(dir, "sections");
  const sourcePdfPath = join(dir, pdfFileName);

  console.log(`Processing ${sourcePdfPath} -> sections/...`);

  // Create sections directory (shared across all PDFs)
  if (!(await exists(outputDir, { isDirectory: true }))) {
    await Deno.mkdir(outputDir, { recursive: true });
  }

  // Get API keys
  const geminiApiKey = Deno.env.get("GEMINI_API_KEY");
  if (!geminiApiKey) {
    throw new Error("GEMINI_API_KEY environment variable is required");
  }

  const geminiClient = new GeminiClient(geminiApiKey);

  try {
    // Check if we have a pre-existing TOC extraction (from book chunk processing)
    const tocOutputPath = join(dir, "toc-extraction.json");
    let tocEntries: any[] = [];
    let pageOffset = 0;
    let pdfMarkdowns: string[] = [];

    if (await exists(tocOutputPath)) {
      console.log(
        "📋 Found existing TOC extraction, using pre-calculated data..."
      );
      const existingTocData = JSON.parse(
        await Deno.readTextFile(tocOutputPath)
      );
      tocEntries = existingTocData.tocEntries;
      pageOffset = existingTocData.pageOffset;

      console.log(
        `Using existing TOC with ${tocEntries.length} entries and page offset: ${pageOffset}`
      );

      // Read existing OCR results from results directory, filtered by current PDF chapter
      const resultsDir = join(dir, "results");
      if (await exists(resultsDir)) {
        const resultFiles = Array.from(Deno.readDirSync(resultsDir))
          .filter((file) => {
            if (!file.isFile || !file.name.endsWith(".md")) return false;
            // Only include files that match the current file identifier
            return file.name.startsWith(`${fileIdentifier}-`);
          })
          .sort((a, b) => {
            // Extract page numbers from filenames like "biz_orgs_ch1-0.md", "biz_orgs_ch1-10.md"
            const getPageNum = (filename: string) => {
              const match = filename.match(/-(\d+)\.md$/);
              return match ? parseInt(match[1]) : 0;
            };
            return getPageNum(a.name) - getPageNum(b.name);
          });

        console.log(
          `Loading OCR results for ${fileIdentifier} (${resultFiles.length} files)`
        );

        pdfMarkdowns = await Promise.all(
          resultFiles.map((file) =>
            Deno.readTextFile(join(resultsDir, file.name))
          )
        );
        console.log(
          `Loaded ${pdfMarkdowns.length} pages from existing OCR results`
        );
      } else {
        console.log("No existing OCR results found, running OCR...");
        pdfMarkdowns = await getMistralMarkdowns(sourcePdfPath);
      }
    } else {
      // Run OCR and TOC extraction in parallel for speed (legacy behavior)
      console.log(
        "Starting parallel processing: Mistral OCR and Gemini TOC extraction..."
      );

      const [ocrResults, tocResults] = await Promise.all([
        getMistralMarkdowns(sourcePdfPath),
        geminiClient.extractTOC(sourcePdfPath),
      ]);

      pdfMarkdowns = ocrResults;
      tocEntries = tocResults.tocEntries;
      pageOffset = tocResults.pageOffset;

      console.log(`Got ${pdfMarkdowns.length} pages from Mistral`);
      console.log(
        `Found ${tocEntries.length} TOC entries with page offset: ${pageOffset}`
      );

      // Save TOC as JSON for debugging
      await Deno.writeTextFile(
        tocOutputPath,
        JSON.stringify({ tocEntries, pageOffset }, null, 2)
      );
      console.log(`Saved TOC extraction to ${tocOutputPath}`);
    }

    // Process with new page-by-page approach
    const { rootHierarchy, failedHeadingRequests } = await processWithGemini(
      pdfMarkdowns,
      tocEntries,
      pageOffset,
      geminiClient,
      dir
    );

    // Write debug information about failed heading requests (file-specific)
    if (failedHeadingRequests.length > 0) {
      const debugOutputPath = join(
        dir,
        `failed-heading-requests-${fileIdentifier}.json`
      );
      await Deno.writeTextFile(
        debugOutputPath,
        JSON.stringify(failedHeadingRequests, null, 2)
      );
      console.log(
        `Saved ${failedHeadingRequests.length} failed heading requests to ${debugOutputPath}`
      );
    }

    // Write the hierarchy to shared sections directory
    await writeContentHierarchy(rootHierarchy, outputDir);

    console.log(`Successfully processed ${pdfFileName} -> sections/`);
  } catch (error) {
    console.error(`Error processing ${pdfFileName}:`, error);
    throw error;
  }
}

export async function extractSections(
  jobDirs: string[],
  sectionDestinations?: string[]
) {
  for await (const [index, jobDir] of jobDirs.entries()) {
    const dir = Deno.statSync(jobDir);
    if (dir.isDirectory) {
      await processDir(jobDir, sectionDestinations?.[index]);
    }
  }
}
