import { generateDocument } from "@document-toolkit/generator";
import { ExampleTemplate } from "./templates/ExampleTemplate";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function main() {
  try {
    console.log("🚀 Starting document generation example...");

    // Read the sample markdown content
    const contentPath = join(__dirname, "..", "content", "sample-document.md");
    const markdownContent = readFileSync(contentPath, "utf-8");

    // Get format from command line args (default to PDF)
    const args = process.argv.slice(2);
    const formatArg = args.find((arg) => arg.startsWith("--format="));
    const format = formatArg
      ? formatArg.split("=")[1] as "pdf" | "docx"
      : "pdf";

    console.log(`📄 Generating ${format.toUpperCase()} document...`);

    // Generate the document
    const result = await generateDocument({
      content: markdownContent,
      template: ExampleTemplate,
      templateProps: {
        title: "Document Toolkit Example",
        author: "Automated Test",
        date: new Date().toLocaleDateString(),
      },
      format: format,
      outputPath: join(__dirname, "..", `example-output.${format}`),
    });

    if (result.success) {
      console.log(`✅ Document generated successfully!`);
      console.log(`📁 Output: ${result.outputPath}`);
      console.log(
        `🔍 Check the generated ${format.toUpperCase()} file to verify the content.`,
      );
    } else {
      console.error(`❌ Document generation failed: ${result.error}`);
      process.exit(1);
    }
  } catch (error) {
    console.error("💥 Unexpected error:", error);
    process.exit(1);
  }
}

// Run the example
main().catch(console.error);
