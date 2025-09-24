import { GoogleGenerativeAI } from "@google/generative-ai";
import { Buffer } from "node:buffer";

export interface TOCEntry {
  name: string;
  depth: number;
  page: number;
  globalIndex?: number; // Index in the original complete TOC
}

export interface TOCExtraction {
  tocEntries: TOCEntry[];
  pageOffset: number;
}

export interface HeadingLocation {
  heading: string;
  lineIndex: number;
}

export class GeminiClient {
  private genAI: GoogleGenerativeAI;

  constructor(apiKey: string) {
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  private async callGemini(model: string, prompt: string): Promise<string> {
    const geminiModel = this.genAI.getGenerativeModel({ model });
    const result = await geminiModel.generateContent(prompt);
    const response = await result.response;
    return response.text();
  }

  private async callGeminiWithPDF(
    model: string,
    prompt: string,
    pdfPath: string
  ): Promise<string> {
    const geminiModel = this.genAI.getGenerativeModel({ model });

    // Read PDF and convert to base64 like the glass_goals example
    const pdfData = await Deno.readFile(pdfPath);

    // Convert Uint8Array to Buffer-like object and then to base64
    const buffer = Buffer.from(pdfData);
    const base64String = buffer.toString("base64");

    const pdfFilePart = {
      inlineData: {
        data: base64String,
        mimeType: "application/pdf",
      },
    };

    const result = await geminiModel.generateContent([prompt, pdfFilePart]);
    const response = await result.response;
    return response.text();
  }

  async extractTOC(pdfPath: string): Promise<TOCExtraction> {
    const prompt = `Analyze this PDF document and extract the table of contents (TOC) information.

Instructions:
1. Look for explicit table of contents sections in the document
2. If there is no explicit table of contents, return an empty list
3. Extract each TOC entry with:
   - name: The heading text
   - depth: The hierarchical level (1 for main sections, 2 for subsections, etc.)
   - page: The page number as listed in the TOC
4. Also determine the page offset - the difference between PDF page numbers and TOC page numbers
5. Return ONLY a valid JSON object in this exact format:

{
  "tocEntries": [
    {"name": "Introduction", "depth": 1, "page": 1},
    {"name": "Background", "depth": 2, "page": 3}
  ],
  "pageOffset": 0
}

If no TOC is found, return:
{
  "tocEntries": [],
  "pageOffset": 0
}`;

    const response = await this.callGeminiWithPDF(
      "gemini-2.5-pro",
      prompt,
      pdfPath
    );

    try {
      // Extract JSON from response (handle cases where there's extra text)
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return { tocEntries: [], pageOffset: 0 };
      }

      return JSON.parse(jsonMatch[0]) as TOCExtraction;
    } catch (error) {
      console.warn("Failed to parse TOC extraction response:", error);
      return { tocEntries: [], pageOffset: 0 };
    }
  }

  async findHeadingLines(
    pageContent: string,
    expectedHeadings: string[]
  ): Promise<HeadingLocation[]> {
    if (expectedHeadings.length === 0) {
      return [];
    }

    const prompt = `Analyze the following page content and identify which line numbers correspond to the given headings.

Page Content (with line numbers):
${pageContent
  .split("\n")
  .map((line, i) => `${i + 1}: ${line}`)
  .join("\n")}

Expected Headings (in order):
${expectedHeadings.map((h, i) => `${i + 1}. "${h}"`).join("\n")}

Instructions:
1. Find which line number each heading corresponds to in the page content
2. Headings should appear in the given order (later headings should never have earlier line numbers)
3. Look for exact matches or very similar matches (accounting for OCR errors, formatting differences)
4. It's okay if the heading and the line content only differ in a list number prefix (like "1. " or extra punctuation)
4. If a heading is not found on this page, omit it from the results
5. Return ONLY a valid JSON array in this exact format:

[
  {"heading": "Introduction", "lineIndex": 5},
  {"heading": "Background", "lineIndex": 12}
]

Return an empty array [] if no headings are found.`;

    const response = await this.callGemini("gemini-2.5-flash", prompt);

    try {
      // Extract JSON from response
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        return [];
      }

      return JSON.parse(jsonMatch[0]) as HeadingLocation[];
    } catch (error) {
      console.warn("Failed to parse heading location response:", error);
      return [];
    }
  }

  async detectContentStartPage(pdfPath: string): Promise<number> {
    const prompt = `You will be provided a PDF that is a contiguous extract of a book or document. Your job is to determine the page number that the pdf starts at.

Please use the page number on the page to determine the starting page number.

You may need to infer the page number, for example if the first page does not have a page number, but the second page has page number 6, then you can infer that the first page is page 5.

If you are unable to determine the page number, please return 1.

Return only the page number as a single integer.`;

    const response = await this.callGeminiWithPDF(
      "gemini-2.5-flash",
      prompt,
      pdfPath
    );

    try {
      const pageNum = parseInt(response.trim());
      return isNaN(pageNum) ? 1 : pageNum;
    } catch (error) {
      console.warn("Failed to parse content start page:", error);
      return 1;
    }
  }
}
