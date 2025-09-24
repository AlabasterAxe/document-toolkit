import path from "node:path";
import { parse } from "@unified-latex/unified-latex-util-parse";
import { Argument, Macro, Node } from "@unified-latex/unified-latex-types";
import { join } from "jsr:@std/path/join";

async function* walk(dir: string): AsyncIterableIterator<string> {
  for await (const d of Deno.readDir(dir)) {
    const entry = path.join(dir, d.name);
    if (d.isDirectory) yield* walk(entry);
    else if (d.isFile) yield entry;
  }
}

const mathRegex = /\$(.*?[^\\])\$/gs;

const footnoteRegex = /^\[\^\d+\]:?\s*[\^*]/g;
const lonelyFootnoteRegex = /^\[\^\d+\]$/g;

const indentedFootnoteRegex = /^\s+\^\d+/g;

const spaceyFootnoteRegex = /\s+\[\^(\d+)\](\d+)/g;

const encounteredMacros: Record<string, boolean> = {};

function handleMacro(ast: Macro): string {
  const macroArgs = ast.args?.map(transformLatexToText).join("") || "";
  switch (ast.content) {
    case "mid":
      return "|";
    case "$":
      return "$";
    case "int":
    case "S":
      return "§";
    case "iint":
      return "§§";
    case "%":
      return "%";
    case "&":
      return "&";
    case "dagger":
      return "†";
    case "ddagger":
      return "‡";
    case "ldots":
      return ". . .";
    case "star":
      return "*";
    case "prime":
      return "'";
    case "mathrm":
    case "text":
      return macroArgs;
    case "mathbb":
      if (macroArgs.trim() === "S") return "§";
      return `**${macroArgs}**`;
    case "downarrow":
      return "↓";
    case "qquad":
      return ". . .";
    default:
      if (!encounteredMacros[ast.content]) {
        console.log("Encountered new macro:", ast.content);
        encounteredMacros[ast.content] = true;
      }
      return macroArgs;
  }
}

function transformLatexToText(ast: Node | Argument): string {
  switch (ast.type) {
    case "string":
      return ast.content;
    case "whitespace":
      return "";
    case "argument":
    case "root":
    case "group":
      return ast.content.map(transformLatexToText).join("");
    case "macro":
      return handleMacro(ast);
    default:
      return "";
  }
}

type FixType = "stars" | "footnotes" | "latex" | "trimStart" | "collapseSpaces";

// Function to process and replace LaTeX expressions
export function processMarkdown(
  mdContent: string,
  fixes: FixType[] = ["stars", "footnotes", "latex"],
): string {
  if (fixes.includes("stars")) {
    mdContent = mdContent
      .replace(/\$\{ \}\^\{\* \* \*\}\$/g, "* * *")
      .replace(/\$\{ \}\^\{\\bullet \* \*\}\$/g, "* * *")
      .replace(/\$\{ \}\^\{\* \* \}\$/g, "* * *")
      .replace(/\$\{ \}\^\{ \* \*\}\$/g, "* * *")
      .replace(/\$\{ \}\^\{\* \* \* \*\}\$/g, "* * *")
      .replace(/\$\s?\*\s?\*\s?\*?\$/g, "* * *");
  }

  const fixedLines = mdContent.split("\n").map((line) => {
    if (fixes.includes("footnotes") && line.trim().match(lonelyFootnoteRegex)) {
      return undefined;
    }

    if (fixes.includes("trimStart")) {
      line = line.trimStart();
    }

    if (fixes.includes("collapseSpaces")) {
      line = line.replace(/\s+/g, " ");
    }

    if (fixes.includes("latex")) {
      line = line.replace(
        mathRegex,
        (match, blockMath, inlineMath) => {
          const latexCode = blockMath || inlineMath; // Extract matched LaTeX
          if (latexCode?.length > 40) {
            console.log("Skipping Long LaTeX:", latexCode);
            return match; // Skip long LaTeX
          }
          try {
            const parsedAst = parse(latexCode);
            const stringResult = transformLatexToText(parsedAst);
            return stringResult; // Convert back to plaintext (or modify)
          } catch (error) {
            console.error("Failed to parse LaTeX:", error);
            return match; // Keep original if parsing fails
          }
        },
      );
    }

    if (fixes.includes("footnotes")) {
      line = line.replace(
        spaceyFootnoteRegex,
        (match, footnote1, footnote2) => {
          if (footnote1 === footnote2) {
            return `^${footnote1} `;
          }
          return match;
        },
      );
      if (line.match(indentedFootnoteRegex)) {
        return line.trimStart();
      }
      return line.replace(footnoteRegex, (match) => match.at(-1)!);
    }

    return line;
  }).filter((line) => line !== undefined);

  return fixedLines.join("\n");
}

async function main() {
  const booksDir = join("books");

  for await (const file of walk(booksDir)) {
    if (file.endsWith(".md")) {
      console.log(`Processing file: ${file}`);
      const content = await Deno.readTextFile(file);
      const processedContent = processMarkdown(content, [
        "footnotes",
        "stars",
        "trimStart",
        "collapseSpaces",
      ]);
      await Deno.writeTextFile(file, processedContent);
    }
  }
}

if (import.meta.main) {
  await main();
  console.log("Done.");
}
