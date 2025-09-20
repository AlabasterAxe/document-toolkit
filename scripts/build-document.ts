#!/usr/bin/env tsx

import { Command } from "commander";
import { resolve, join, dirname, extname, basename } from "path";
import { existsSync, readFileSync } from "fs";
import { fileURLToPath } from "url";
import matter from "gray-matter";
import * as React from "react";
// Note: We'll import this dynamically after building the package

const program = new Command();
const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, "..");

interface BuildConfig {
  input: string;
  output?: string;
  format: "html" | "pdf" | "docx";
  template?: string;
  app?: string;
}

program
  .name("doc:build")
  .description("Build documents from TSX or markdown files")
  .argument("<input>", "Input file path (.tsx or .md)")
  .option("-f, --format <format>", "Output format (html, pdf, docx)", "pdf")
  .option("-o, --output <output>", "Output file path")
  .option("-t, --template <template>", "Template name to use")
  .option("-a, --app <app>", "App context for template/component resolution")
  .action(async (input: string, options) => {
    const config: BuildConfig = {
      input: resolve(input),
      format: options.format as "html" | "pdf" | "docx",
      output: options.output,
      template: options.template,
      app: options.app
    };

    await buildDocument(config);
  });

async function buildDocument(config: BuildConfig) {
  try {
    console.log(`🚀 Building document: ${config.input}`);

    if (!existsSync(config.input)) {
      throw new Error(`Input file not found: ${config.input}`);
    }

    const inputExt = extname(config.input);
    const inputName = basename(config.input, inputExt);

    // Default output path - use repository-wide dist directory
    if (!config.output) {
      const distDir = join(rootDir, "dist");

      // Create dist directory if it doesn't exist
      if (!existsSync(distDir)) {
        const { mkdirSync } = await import("fs");
        mkdirSync(distDir, { recursive: true });
      }

      config.output = join(distDir, `${inputName}.${config.format}`);
    }

    let content: string;
    let templateProps: Record<string, any> = {};
    let templateName: string | undefined = config.template;

    if (inputExt === ".md") {
      // Parse markdown with frontmatter
      const fileContent = readFileSync(config.input, "utf-8");
      const parsed = matter(fileContent);
      content = parsed.content;
      templateProps = { ...parsed.data };

      // Use template from frontmatter if not specified
      if (!templateName && parsed.data.template) {
        templateName = parsed.data.template;
      }
    } else if (inputExt === ".tsx" || inputExt === ".jsx") {
      // For TSX files, we'll need to dynamically import and render
      const module = await import(config.input);
      const Component = module.default || module[inputName];

      if (!Component) {
        throw new Error(`No default export or named export '${inputName}' found in ${config.input}`);
      }

      // For TSX, we render the component directly
      content = ""; // The component will handle rendering
      templateProps = { Component };
    } else {
      throw new Error(`Unsupported file type: ${inputExt}. Use .md, .tsx, or .jsx files.`);
    }

    // Auto-detect app context from file path if not specified
    let appContext = config.app;
    if (!appContext && config.input.includes('/apps/')) {
      const pathParts = config.input.split('/');
      const appsIndex = pathParts.findIndex(part => part === 'apps');
      if (appsIndex >= 0 && pathParts[appsIndex + 1]) {
        appContext = pathParts[appsIndex + 1];
        console.log(`🔍 Auto-detected app context: ${appContext}`);
      }
    }

    // Resolve template
    const template = await resolveTemplate(templateName, appContext);

    // Resolve CSS styles
    const styles = await resolveStyles(templateName, appContext);

    console.log(`📄 Generating ${config.format.toUpperCase()} document...`);

    // Import generateDocument dynamically
    const { generateDocument } = await import("../packages/document-generator/dist/index.js");

    const result = await generateDocument({
      content,
      template,
      templateProps: { ...templateProps, styles },
      format: config.format as "pdf" | "docx" | "html",
      outputPath: config.output,
    });

    if (result.success) {
      console.log(`✅ Document generated successfully!`);
      console.log(`📁 Output: ${result.outputPath}`);
    } else {
      console.error(`❌ Document generation failed: ${result.error}`);
      process.exit(1);
    }
  } catch (error) {
    console.error("💥 Build failed:", error);
    process.exit(1);
  }
}

async function resolveTemplate(templateName?: string, appContext?: string) {
  // Default to a basic template if none specified
  if (!templateName) {
    templateName = "default";
  }

  // Try to resolve template in this order:
  // 1. App-specific template: apps/{app}/templates/{templateName}
  // 2. Shared template: packages/document-generator/src/templates/{templateName}
  // 3. Built-in default

  const possiblePaths = [];

  if (appContext) {
    possiblePaths.push(
      join(rootDir, "apps", appContext, "templates", `${templateName}.tsx`),
      join(rootDir, "apps", appContext, "templates", `${templateName}.jsx`)
    );
  }

  possiblePaths.push(
    join(rootDir, "packages/document-generator/src/templates", `${templateName}.tsx`),
    join(rootDir, "packages/document-generator/src/templates", `${templateName}.jsx`),
    join(rootDir, "packages/document-generator/dist/templates", `${templateName}.js`)
  );

  for (const templatePath of possiblePaths) {
    if (existsSync(templatePath)) {
      console.log(`📋 Using template: ${templatePath}`);
      const module = await import(templatePath);
      return module.default || module[templateName] || module;
    }
  }

  console.warn(`⚠️  Template '${templateName}' not found, using default`);

  // Import default template from the generator package
  const generatorModule = await import("../packages/document-generator/dist/index.js");
  return generatorModule.defaultTemplate || basicTemplate;
}

// Basic fallback template - return a simple template component
const basicTemplate = (props: any) => {
  const React = require('react');
  return React.createElement('html', { lang: 'en' }, [
    React.createElement('head', { key: 'head' }, [
      React.createElement('meta', { key: 'charset', charSet: 'utf-8' }),
      React.createElement('title', { key: 'title' }, props.title || 'Document'),
      React.createElement('style', { key: 'style' }, `
        body { font-family: Arial, sans-serif; margin: 2rem; line-height: 1.6; }
        h1 { color: #333; border-bottom: 2px solid #333; padding-bottom: 0.5rem; }
        h2 { color: #555; margin-top: 2rem; }
      `)
    ]),
    React.createElement('body', { key: 'body' }, [
      props.title && React.createElement('h1', { key: 'heading' }, props.title),
      React.createElement('div', { key: 'content', dangerouslySetInnerHTML: { __html: props.markdownContent || '' } })
    ])
  ]);
};

async function resolveStyles(templateName?: string, appContext?: string): Promise<string> {
  let combinedStyles = "";

  // Always include base styles
  const baseStylesPath = join(rootDir, "packages/document-generator/src/styles/base.css");
  if (existsSync(baseStylesPath)) {
    let baseStyles = readFileSync(baseStylesPath, "utf-8");

    // Handle font embedding for Century Schoolbook
    const fontPath = join(rootDir, "fonts/centuryschoolbook.ttf");

    if (existsSync(fontPath)) {
      console.log(`🔤 Embedding font: ${fontPath}`);
      const fontBuffer = readFileSync(fontPath);
      const fontBase64 = fontBuffer.toString('base64');
      const dataUri = `data:font/truetype;base64,${fontBase64}`;

      // Replace the font URL reference
      baseStyles = baseStyles.replace(
        "url('fonts/centuryschoolbook.ttf')",
        `url('${dataUri}')`
      );
    }

    combinedStyles += baseStyles + "\n";
  }

  // Add template-specific styles if they exist
  const possibleStylePaths = [];

  if (templateName) {
    // Convert template name to lowercase for CSS files
    const styleName = templateName.toLowerCase();

    // App-specific styles first
    if (appContext) {
      possibleStylePaths.push(
        join(rootDir, "apps", appContext, "styles", `${styleName}.css`),
        join(rootDir, "apps", appContext, "styles", `${templateName}.css`)
      );
    }

    // Shared template styles
    possibleStylePaths.push(
      join(rootDir, "packages/document-generator/src/styles", `${styleName}.css`),
      join(rootDir, "packages/document-generator/src/styles", `${templateName}.css`)
    );
  }

  // Add any found template-specific styles
  for (const stylePath of possibleStylePaths) {
    if (existsSync(stylePath)) {
      console.log(`🎨 Using styles: ${stylePath}`);
      combinedStyles += readFileSync(stylePath, "utf-8") + "\n";
      break; // Use first match (app-specific takes precedence)
    }
  }

  // App-wide styles (if any)
  if (appContext) {
    const appStylesPath = join(rootDir, "apps", appContext, "styles", "app.css");
    if (existsSync(appStylesPath)) {
      console.log(`🎨 Using app styles: ${appStylesPath}`);
      combinedStyles += readFileSync(appStylesPath, "utf-8") + "\n";
    }
  }

  return combinedStyles;
}

program.parse();