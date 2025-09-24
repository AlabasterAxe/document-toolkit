// read ocr_response_ch7.json, iterate over the "pages" array, and write each page to a separate markdown file in a new directory

import { join } from "jsr:@std/path/join";
import { exists } from "jsr:@std/fs/exists";
import { applyPatch, createTwoFilesPatch, diffLines } from "npm:diff";
import { processMarkdown } from "./clean-mds.ts";

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

function zip<A, B>(a: A[], b: B[]): [A, B][] {
  if (a.length !== b.length) {
    throw new Error("Arrays must be of the same length");
  }
  return a.map((k, i) => [k, b[i]]);
}

type OrderedListType =
  | "upper-alpha"
  | "upper-roman"
  | "lower-alpha"
  | "lower-roman"
  | "decimal";

type ListItem = {
  type: OrderedListType;
  ordinal: string;
  contents: string;
};

const UPPER_ALPHA_REGEX = /^\(?([A-Z])[\.\)]/;
const UPPER_ROMAN_REGEX = /^\(?([IVX]+)[\.\)]/;
const LOWER_ALPHA_REGEX = /^\(?([a-z])[\.\)]/;
const LOWER_ROMAN_REGEX = /^\(?([ivx]+)[\.\)]/;
const DECIMAL_REGEX = /^\(?(\d+)[\.\)]/;

function isOrderedListItem(line: string): ListItem | undefined {
  let type: OrderedListType;
  let ordinal: string;
  let contents: string;

  if (UPPER_ROMAN_REGEX.test(line)) {
    ordinal = line.match(UPPER_ROMAN_REGEX)![1];
    contents = line.replace(UPPER_ROMAN_REGEX, "").trim();
    type = "upper-roman";
  } else if (LOWER_ROMAN_REGEX.test(line)) {
    ordinal = line.match(LOWER_ROMAN_REGEX)![1];
    contents = line.replace(LOWER_ROMAN_REGEX, "").trim();
    type = "lower-roman";
  } else if (UPPER_ALPHA_REGEX.test(line)) {
    ordinal = line.match(UPPER_ALPHA_REGEX)![1];
    contents = line.replace(UPPER_ALPHA_REGEX, "").trim();
    type = "upper-alpha";
  } else if (LOWER_ALPHA_REGEX.test(line)) {
    ordinal = line.match(LOWER_ALPHA_REGEX)![1];
    contents = line.replace(LOWER_ALPHA_REGEX, "").trim();
    type = "lower-alpha";
  } else if (line.match(DECIMAL_REGEX)) {
    ordinal = line.match(DECIMAL_REGEX)![1];
    contents = line.replace(DECIMAL_REGEX, "").trim();
    type = "decimal";
  } else {
    return undefined;
  }
  return { type, ordinal, contents };
}

async function writeContentHierarchy(
  hierarchy: ContentHierarchy,
  baseDir: string,
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

  // Skip creating directory for root node - use baseDir directly
  let nodeDir = baseDir;
  if (hierarchy.name !== baseDir) {
    const nodeName = sanitize(hierarchy.name);
    nodeDir = join(baseDir, nodeName);

    if (!(await exists(nodeDir, { isDirectory: true }))) {
      await Deno.mkdir(nodeDir, { recursive: true });
    }
  }

  // Write contents to content.md if any
  if (hierarchy.contents.length > 0) {
    await Deno.writeTextFile(
      join(nodeDir, "content.md"),
      hierarchy.contents.join("\n"),
    );
  }
  // Recurse into children
  for (const child of hierarchy.children.values()) {
    await writeContentHierarchy(child, nodeDir);
  }
}

function lowerRomanToDecimal(roman: string): number {
  switch (roman) {
    case "i":
      return 1;
    case "ii":
      return 2;
    case "iii":
      return 3;
    case "iiii":
      return 4;
    case "iv":
      return 4;
    case "v":
      return 5;
    case "vi":
      return 6;
    case "vii":
      return 7;
    case "viii":
      return 8;
    case "ix":
      return 9;
    case "x":
      return 10;
    default:
      throw new Error(`I didn't get that far: ${roman}`);
  }
}

function decimalToLowerRoman(num: number): string {
  switch (num) {
    case 1:
      return "i";
    case 2:
      return "ii";
    case 3:
      return "iii";
    case 4:
      return "iv";
    case 5:
      return "v";
    case 6:
      return "vi";
    case 7:
      return "vii";
    case 8:
      return "viii";
    case 9:
      return "ix";
    case 10:
      return "x";
    default:
      throw new Error(`I didn't get that far: ${num}`);
  }
}

function upperRomanToDecimal(roman: string): number {
  switch (roman) {
    case "I":
      return 1;
    case "II":
      return 2;
    case "III":
      return 3;
    case "IV":
      return 4;
    case "V":
      return 5;
    case "VI":
      return 6;
    case "VII":
      return 7;
    case "VIII":
      return 8;
    case "IX":
      return 9;
    case "X":
      return 10;
    default:
      throw new Error(`I didn't get that far: ${roman}`);
  }
}

function decimalToUpperRoman(num: number): string {
  switch (num) {
    case 1:
      return "I";
    case 2:
      return "II";
    case 3:
      return "III";
    case 4:
      return "IV";
    case 5:
      return "V";
    case 6:
      return "VI";
    case 7:
      return "VII";
    case 8:
      return "VIII";
    case 9:
      return "IX";
    case 10:
      return "X";
    default:
      throw new Error(`I didn't get that far: ${num}`);
  }
}

function alphaToDecimal(alpha: string): number {
  switch (alpha.toUpperCase()) {
    case "A":
      return 1;
    case "B":
      return 2;
    case "C":
      return 3;
    case "D":
      return 4;
    case "E":
      return 5;
    case "F":
      return 6;
    case "G":
      return 7;
    case "H":
      return 8;
    case "I":
      return 9;
    case "J":
      return 10;
    default:
      throw new Error(`I didn't get that far: ${alpha}`);
  }
}

function decimalToAlpha(num: number): string {
  switch (num) {
    case 1:
      return "A";
    case 2:
      return "B";
    case 3:
      return "C";
    case 4:
      return "D";
    case 5:
      return "E";
    case 6:
      return "F";
    case 7:
      return "G";
    case 8:
      return "H";
    case 9:
      return "I";
    case 10:
      return "J";
    default:
      throw new Error(`I didn't get that far: ${num}`);
  }
}

function listItemToDecimal(item: ListItem): number {
  const listType = item.type;
  switch (listType) {
    case "decimal":
      return parseInt(item.ordinal.match(/^\d+/)![0]);
    case "lower-alpha":
      return alphaToDecimal(item.ordinal.match(/^\w+/)![0]);
    case "upper-alpha":
      return alphaToDecimal(item.ordinal.match(/^\w+/)![0]);
    case "lower-roman":
      return lowerRomanToDecimal(item.ordinal.match(/^\w+/)![0]);
    case "upper-roman":
      return upperRomanToDecimal(item.ordinal.match(/^\w+/)![0]);
    default:
      throw new Error(`Unknown list type: ${listType}`);
  }
}

function decimalToListItem(type: OrderedListType, num: number): ListItem {
  let val: string;
  switch (type) {
    case "decimal":
      val = `${num}`;
      break;
    case "lower-alpha":
      val = `${decimalToAlpha(num).toLowerCase()}.`;
      break;
    case "upper-alpha":
      val = `${decimalToAlpha(num)}.`;
      break;
    case "lower-roman":
      val = `${decimalToLowerRoman(num)}.`;
      break;
    case "upper-roman":
      val = `${decimalToUpperRoman(num)}.`;
      break;
    default:
      throw new Error(`Unknown list type: ${type}`);
  }
  return { type, ordinal: val, contents: "" };
}

function increment(item: ListItem): ListItem {
  const listType = item.type;
  let newVal: string;

  switch (listType) {
    case "decimal":
      const num = parseInt(item.ordinal.match(/^\d+/)![0]);
      newVal = `${num + 1}.`;
      break;
    case "lower-alpha":
      const lowerAlpha = String.fromCharCode(item.ordinal.charCodeAt(0) + 1);
      newVal = `${lowerAlpha}.`;
      break;
    case "upper-alpha":
      const upperAlpha = String.fromCharCode(item.ordinal.charCodeAt(0) + 1);
      newVal = `${upperAlpha}.`;
      break;
    case "lower-roman":
      const lowerRoman = lowerRomanToDecimal(item.ordinal.match(/^\w+/)![0]);
      newVal = `${decimalToLowerRoman(lowerRoman + 1)}.`;
      break;
    case "upper-roman":
      const upperRoman = upperRomanToDecimal(item.ordinal.match(/^\w+/)![0]);
      newVal = `${decimalToUpperRoman(upperRoman + 1)}.`;
      break;
    default:
      throw new Error(`Unknown list type: ${listType}`);
  }

  const newItem: ListItem = {
    type: listType,
    ordinal: item.ordinal.replace(/^\w+/, newVal),
    contents: item.contents,
  };
  return newItem;
}

const FOOTNOTE_REGEX = /^\[\^\d+\]/;

const ALT_FOOTNOTE_REGEX = /^(?:\${\s*})?\^{?\d+/;

type ContentHierarchy = {
  name: string;
  listItem?: ListItem;
  contents: string[];
  children: Map<string, ContentHierarchy>;
};

async function processDir(dir: string) {
  const skipFile = join(dir, ".skip");

  if (await exists(skipFile, { isFile: true })) {
    console.log(`Skipping ${dir}`);
    return;
  }

  const resultsDir = join(dir, "results");
  const outputDir = join(dir, "sections");
  const sourcePdf = Deno.readDirSync(dir).find((file) =>
    file.isFile && file.name.endsWith(".pdf")
  )?.name;

  if (!sourcePdf) {
    console.error(`No PDF file found in ${dir}`);
    return;
  }
  const sourcePdfPath = join(dir, sourcePdf);

  if (await exists(outputDir, { isDirectory: true })) {
    await Deno.remove(outputDir, { recursive: true });
  }
  await Deno.mkdir(outputDir);
  if (!(await exists(resultsDir, { isDirectory: true }))) {
    return;
  }

  const files = await Array.fromAsync(Deno.readDir(resultsDir));

  files.sort(
    (a, b) =>
      parseInt(a.name.split("-").at(-1)!) - parseInt(b.name.split("-").at(-1)!),
  );

  function getContentItem(
    root: ContentHierarchy,
    path: ListItem[],
  ): ContentHierarchy | undefined {
    let current: ContentHierarchy | undefined = root;
    for (const item of path) {
      if (!current?.children.get(item.ordinal)) {
        return undefined;
      }
      current = current?.children.get(item.ordinal);
    }
    return current;
  }

  function listItemTypeInStack(
    stack: ListItem[],
    orderedListType: OrderedListType,
  ): number {
    return stack.findLastIndex((item) => item.type === orderedListType);
  }

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

  let currSection: string[] = [];
  let currSectionStartPageIndex = 1;
  let currSectionDirname: string | undefined;
  let extras: string[] = [];
  let splitSentence = false;
  let pageIndex = 0;
  let handlingTOC = false;
  let tocStack: ListItem[] = [];
  const contentHierarchy: ContentHierarchy = {
    name: dir,
    contents: [],
    children: new Map(),
  };
  let hasToc = false;

  const tocStackHistory: ListItem[][] = [];
  let tocHistoryIndex = 0;

  let currHierarchyNode: ContentHierarchy = contentHierarchy;

  async function cutSection(sectionIndex: number, lineIndex: number) {
    if (!currSectionDirname) {
      throw new Error("current section directory name is undefined");
    }
    // make sure the directory exists
    if (!(await exists(currSectionDirname, { isDirectory: true }))) {
      await Deno.mkdir(currSectionDirname, { recursive: true });
    }

    const contentFilename = join(
      currSectionDirname,
      "content.md",
    );
    await Deno.writeTextFile(
      contentFilename,
      processMarkdown([...currSection, "\n", ...extras].join("\n")),
    );

    // // use qpdf to put the corresponding pages into the section directory
    // const sectionPdfFilename = join(
    //   currSectionDirname,
    //   "section.pdf",
    // );
    // const sectionPageRange = `${currSectionStartPageIndex}-${
    //   (sectionIndex === 0 && lineIndex === 0) ? pageIndex - 1 : pageIndex
    // }`;

    // const qpdfArgs = [
    //   sourcePdfPath,
    //   "--pages",
    //   ".",
    //   sectionPageRange,
    //   "--",
    //   sectionPdfFilename,
    // ];

    // const qpdfProcess = new Deno.Command("qpdf", {
    //   args: qpdfArgs,
    // });

    // const qpdfStatus = await qpdfProcess.output();

    // if (!qpdfStatus.success) {
    //   const errorText = new TextDecoder().decode(qpdfStatus.stderr);

    //   if (errorText.includes("operation succeeded")) {
    //     // Ignore the error if qpdf says the operation succeeded
    //   } else {
    //     console.error(
    //       `Error running qpdf with args: ${qpdfArgs}\n\n Got Output:\n${qpdfStatus.stderr}`,
    //     );
    //     Deno.exit(1);
    //   }
    // }

    currSection = [];
    currSectionStartPageIndex = pageIndex;
    currSectionDirname = undefined;
    extras = [];
  }

  for await (const mistralPath of files) {
    pageIndex++;
    console.log(`Processing ${mistralPath.name}`);
    const mistralFile = await Deno.readTextFile(
      join(resultsDir, mistralPath.name),
    );

    const lines = mistralFile.split("\n");

    let pendingExtra: string[] | undefined;
    const generatedFilenames = new Set<string>();
    let sectionIndex = 0;
    let lineIndex = 0;
    for (const line of lines) {
      const trimmedLine = line.trim();

      // if (line.toLocaleLowerCase().includes("table of contents")) {
      //   handlingTOC = true;
      //   hasToc = true;
      //   continue;
      // }

      if (hasToc) {
        const listItem = isOrderedListItem(
          trimmedLine.replace(/^\#+/, "").trim(),
        );
        if (listItem && tocHistoryIndex < tocStackHistory.length) {
          const nextTocStack = tocStackHistory[tocHistoryIndex];
          const nextContentNode = getContentItem(
            contentHierarchy,
            nextTocStack,
          );
          if (nextContentNode) {
            if (nextContentNode.name.includes(listItem?.contents)) {
              tocHistoryIndex++;
              currHierarchyNode = nextContentNode;
              handlingTOC = false;
            }
          }
        }
        if (!handlingTOC) {
          currHierarchyNode.contents.push(line);
          continue;
        }
      }

      if (handlingTOC) {
        const listItem = isOrderedListItem(trimmedLine);
        if (listItem) {
          const listItemTypeIndex = listItemTypeInStack(
            tocStack,
            listItem?.type!,
          );
          if (tocStack.length === 0) {
            tocStack.push(listItem);
            tocStackHistory.push([...tocStack]);
            contentHierarchy.children.set(listItem.ordinal, {
              name: trimmedLine,
              listItem,
              contents: [],
              children: new Map(),
            });
          } else if (listItemTypeIndex !== -1) {
            // we've popped back to an earlier level
            tocStack = tocStack.slice(0, listItemTypeIndex);
            const parent = getContentItem(contentHierarchy, tocStack);
            if (!parent) {
              throw new Error("Parent not found");
            }
            const maxChildOrdinal = parent.children.size;

            let correctedListItem = listItem;
            if (listItemToDecimal(listItem) !== maxChildOrdinal + 1) {
              console.warn(
                `WARNING: List item is not ${
                  maxChildOrdinal + 1
                } (${listItem.ordinal}), something is wrong, but correcting it and moving on with my life.`,
              );
              correctedListItem = {
                ...decimalToListItem(listItem.type, maxChildOrdinal + 1),
                contents: listItem.contents,
              };
            }
            parent.children.set(correctedListItem.ordinal, {
              name: trimmedLine,
              listItem: correctedListItem,
              contents: [],
              children: new Map(),
            });
            tocStack.push(correctedListItem);
            tocStackHistory.push([...tocStack]);
          } else {
            const parent = getContentItem(contentHierarchy, tocStack);
            if (!parent) {
              throw new Error("Parent not found");
            }
            const maxChildOrdinal = parent.children.size;

            let correctedListItem = listItem;
            if (listItemToDecimal(listItem) !== maxChildOrdinal + 1) {
              console.warn(
                `WARNING: List item is not ${
                  maxChildOrdinal + 1
                } (${listItem.ordinal}), something is wrong, but correcting it and moving on with my life.`,
              );
              correctedListItem = {
                ...decimalToListItem(listItem.type, maxChildOrdinal + 1),
                contents: listItem.contents,
              };
            }
            parent.children.set(correctedListItem.ordinal, {
              name: trimmedLine,
              listItem: correctedListItem,
              contents: [],
              children: new Map(),
            });
            tocStack.push(correctedListItem);
            tocStackHistory.push([...tocStack]);
          }
        }
      }

      if (pendingExtra) {
        pendingExtra.push(line);

        if (line !== "") {
          extras.push(...pendingExtra, "\n");
          pendingExtra = undefined;
        }
        continue;
      }

      if (isSkipSection(trimmedLine)) {
        pendingExtra = [line];
        continue;
      }

      if (FOOTNOTE_REGEX.test(trimmedLine)) {
        extras.push(line);
        continue;
      }

      if (ALT_FOOTNOTE_REGEX.test(trimmedLine)) {
        extras.push(line);
        continue;
      }

      if (splitSentence && !trimmedLine.startsWith("#")) {
        if (trimmedLine !== "") {
          currSection[currSection.length - 1] += " " + trimmedLine;

          splitSentence = isSplitLine(trimmedLine);
        }
        continue;
      } else {
        if (lineIndex === 0) {
          currSection.push("");
        }
        splitSentence = isSplitLine(trimmedLine);
      }

      if (
        trimmedLine[0] === "#" &&
        !currSection.every((line) =>
          line.trim().startsWith("#") || line.length == 0
        ) &&
        currSectionStartPageIndex !== pageIndex
      ) {
        if (currSectionDirname) {
          await cutSection(sectionIndex, lineIndex);
        }

        // make the current page file name the same as the first heading
        currSectionDirname = join(
          outputDir,
          `p${pageIndex.toString().padStart(4, "0")}-s${
            (++sectionIndex)
              .toString()
              .padStart(2, "0")
          }-${
            trimmedLine
              .replace(/#/g, "")
              .replace(/\s/g, "_")
              .replace(/[^a-zA-Z0-9_]/g, "")
              .trim()
              .substring(0, 50)
          }`,
        );

        if (generatedFilenames.has(currSectionDirname)) {
          console.error(`Duplicate filename detected: ${currSectionDirname}`);
          Deno.exit(1);
        }
      } else if (trimmedLine.startsWith("#") && !currSectionDirname) {
        currSectionDirname = join(
          outputDir,
          `p${pageIndex.toString().padStart(4, "0")}-s${
            (++sectionIndex)
              .toString()
              .padStart(2, "0")
          }-${
            trimmedLine
              .replace(/#/g, "")
              .replace(/\s/g, "_")
              .replace(/[^a-zA-Z0-9_]/g, "")
              .trim()
              .substring(0, 50)
          }`,
        );

        if (generatedFilenames.has(currSectionDirname)) {
          console.error(`Duplicate filename detected: ${currSectionDirname}`);
          Deno.exit(1);
        }
        generatedFilenames.add(currSectionDirname);
      } else if (trimmedLine !== "") {
        // if last char is a character or a hyphen, set fileSplitSentence to true
        splitSentence = isSplitLine(trimmedLine);
      }

      currSection.push(line);
      lineIndex++;
    }
  }
  if (currSection.length > 0 && currSectionDirname) {
    await cutSection(0, 0);
  }

  if (hasToc) {
    await writeContentHierarchy(contentHierarchy, outputDir);
  }
}

export async function main(jobDirs?: string[]) {
  const dirs = (await Array.fromAsync(Deno.readDir("jobs"))).filter((d) =>
    jobDirs == undefined || jobDirs.includes(d.name)
  ).sort((
    a,
    b,
  ) => a.name.localeCompare(b.name));

  for await (const dir of dirs) {
    if (dir.isDirectory) {
      await processDir(join("jobs", dir.name));
    }
  }
}

if (import.meta.main) {
  await main();
  console.log("Done.");
}
