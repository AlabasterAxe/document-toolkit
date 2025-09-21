#!/usr/bin/env tsx

import { Command } from "commander";
import { createServer } from "http";
import { basename, dirname, join, resolve } from "path";
import { existsSync, readFileSync, watchFile } from "fs";
import { fileURLToPath } from "url";
import { WebSocketServer } from "ws";
import { generateDocument } from "@document-toolkit/generator";
import matter from "gray-matter";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

const program = new Command();
const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, "..");

interface DevServerConfig {
  input: string;
  port: number;
  template?: string;
  app?: string;
}

let currentConfig: DevServerConfig;
let wsServer: WebSocketServer;

program
  .name("dev-server")
  .description("Live preview development server for documents")
  .argument("<input>", "Input markdown file path")
  .option("-p, --port <port>", "Development server port", "3000")
  .option("-t, --template <template>", "Template name to use")
  .option("-a, --app <app>", "App context for template resolution")
  .action(async (input: string, options) => {
    currentConfig = {
      input: resolve(input),
      port: parseInt(options.port),
      template: options.template,
      app: options.app,
    };

    await startDevServer();
  });

async function startDevServer() {
  if (!existsSync(currentConfig.input)) {
    console.error(`❌ Input file not found: ${currentConfig.input}`);
    process.exit(1);
  }

  console.log(`🚀 Starting development server...`);
  console.log(`📄 Watching: ${currentConfig.input}`);

  // Check if port is already in use
  await handlePortConflict();

  // Initial document generation
  await generatePreviewDocument();

  // Create HTTP server
  const server = createServer(async (req, res) => {
    const url = req.url || "/";

    if (url === "/") {
      // Serve the preview HTML
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(await getPreviewHtml());
    } else if (url === "/ws-client.js") {
      // Serve WebSocket client script
      res.writeHead(200, { "Content-Type": "application/javascript" });
      res.end(getWebSocketClient());
    } else {
      res.writeHead(404);
      res.end("Not Found");
    }
  });

  // Setup WebSocket server for live reload
  wsServer = new WebSocketServer({ server });
  wsServer.on("connection", (ws) => {
    console.log("🔌 Client connected");
    ws.on("close", () => console.log("🔌 Client disconnected"));
  });

  // Watch the input file for changes
  setupFileWatcher();

  // Start server with error handling
  server.on("error", (err: any) => {
    if (err.code === "EADDRINUSE") {
      console.error(
        `❌ Port ${currentConfig.port} is already in use. Try a different port with -p <port>`,
      );
      process.exit(1);
    } else {
      console.error("❌ Server error:", err);
      process.exit(1);
    }
  });

  server.listen(currentConfig.port, () => {
    console.log(
      `✅ Development server running on http://localhost:${currentConfig.port}`,
    );
    console.log(
      `🔄 File watching active - edit ${
        basename(currentConfig.input)
      } to see live updates`,
    );
    console.log("💡 Press Ctrl+C to stop the server");
  });

  // Graceful shutdown handling
  let isShuttingDown = false;
  const gracefulShutdown = () => {
    if (isShuttingDown) return;
    isShuttingDown = true;
    console.log("\n🛑 Shutting down gracefully...");
    let shutdownComplete = false;
    const timeout = setTimeout(() => {
      if (!shutdownComplete) {
        console.log("⏰ Graceful shutdown timed out, forcing exit.");
        process.exit(0);
      }
    }, 1000);

    server.close(() => {
      wsServer.close(() => {
        shutdownComplete = true;
        clearTimeout(timeout);
        console.log("✅ Server stopped");
        process.exit(0);
      });
    });
  };

  process.on("SIGINT", gracefulShutdown);
  process.on("SIGTERM", gracefulShutdown);
}

async function generatePreviewDocument(): Promise<void> {
  try {
    console.log("🔄 Generating preview...");

    // Parse markdown with frontmatter
    const fileContent = readFileSync(currentConfig.input, "utf-8");
    const parsed = matter(fileContent);
    const content = parsed.content;
    let templateProps = { ...parsed.data };

    // Auto-detect app context from file path if not specified
    let appContext = currentConfig.app;
    if (!appContext && currentConfig.input.includes("/apps/")) {
      const pathParts = currentConfig.input.split("/");
      const appsIndex = pathParts.findIndex((part) => part === "apps");
      if (appsIndex >= 0 && pathParts[appsIndex + 1]) {
        appContext = pathParts[appsIndex + 1];
      }
    }

    // Use template from frontmatter if not specified in config
    const templateName = currentConfig.template || parsed.data.template ||
      "legal";

    // Resolve template
    const template = await resolveTemplate(templateName, appContext);

    // Generate HTML document
    const previewPath = join(__dirname, "..", "dist", "preview.html");

    const result = await generateDocument({
      content,
      template,
      templateProps,
      format: "html",
      outputPath: previewPath,
      debug: false,
    });

    if (result.success) {
      console.log("✅ Preview updated");
      // Notify connected clients to reload
      broadcastReload();
    } else {
      console.error("❌ Preview generation failed:", result.error);
    }
  } catch (error) {
    console.error("💥 Preview generation error:", error);
  }
}

async function getPreviewHtml(): Promise<string> {
  const previewPath = join(__dirname, "..", "dist", "preview.html");

  if (!existsSync(previewPath)) {
    await generatePreviewDocument();
  }

  let html = readFileSync(previewPath, "utf-8");

  // Inject PagedJS, live reload scripts, and page border styles
  const scripts = `
    <!-- PagedJS for PDF-like preview -->
    <script src="https://unpkg.com/pagedjs/dist/paged.polyfill.js"></script>
    <!-- Live reload WebSocket client -->
    <script src="/ws-client.js"></script>
    <!-- Page border styles for development -->
    <style>
      /* Development-only page visualization styles */
      @media screen {
        body {
          background: #f5f5f5 !important;
          padding: 20px !important;
        }

        .pagedjs_pages {
          display: flex !important;
          flex-direction: column !important;
          align-items: center !important;
          gap: 20px !important;
        }

        .pagedjs_page {
          box-shadow: 0 4px 12px rgba(0,0,0,0.15) !important;
          border: 1px solid #ddd !important;
          background: white !important;
          margin: 0 !important;
          position: relative !important;
        }


        /* Show page margins for visual reference */
        .pagedjs_page {
          position: relative !important;
        }

        .pagedjs_page::after {
          content: '' !important;
          position: absolute !important;
          top: 0 !important;
          left: 0 !important;
          right: 0 !important;
          bottom: 0 !important;
          border: 1px dashed rgba(0,0,0,0.1) !important;
          margin: 1in !important;
          pointer-events: none !important;
          z-index: 1000 !important;
        }
      }

    </style>
  `;

  // Insert scripts before closing body tag
  if (html.includes("</body>")) {
    html = html.replace("</body>", `${scripts}\n</body>`);
  } else {
    html += scripts;
  }

  return html;
}

function getWebSocketClient(): string {
  return `
    (function() {
      const ws = new WebSocket('ws://localhost:${currentConfig.port}');

      ws.onmessage = function(event) {
        if (event.data === 'reload') {
          console.log('📄 Document updated, reloading...');
          window.location.reload();
        }
      };

      ws.onopen = function() {
        console.log('🔌 Live reload connected');
      };

      ws.onclose = function() {
        console.log('🔌 Live reload disconnected');
        // Try to reconnect after a delay
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      };
    })();
  `;
}

function setupFileWatcher(): void {
  // Watch the main input file
  watchFile(currentConfig.input, { interval: 1000 }, async (curr, prev) => {
    if (curr.mtime > prev.mtime) {
      console.log(
        `📝 ${basename(currentConfig.input)} changed, regenerating...`,
      );
      await generatePreviewDocument();
    }
  });

  // Also watch for template changes if we can determine the template path
  // This would require more sophisticated template resolution
}

function broadcastReload(): void {
  if (wsServer) {
    wsServer.clients.forEach((client) => {
      if (client.readyState === 1) { // WebSocket.OPEN
        client.send("reload");
      }
    });
  }
}

// Template resolution logic (simplified from build-document.ts)
async function resolveTemplate(templateName?: string, appContext?: string) {
  if (!templateName) {
    templateName = "legal"; // Default for your use case
  }

  const possiblePaths = [];

  if (appContext) {
    possiblePaths.push(
      join(rootDir, "apps", appContext, "templates", `${templateName}.tsx`),
      join(rootDir, "apps", appContext, "templates", `${templateName}.jsx`),
    );
  }

  possiblePaths.push(
    join(
      rootDir,
      "packages/document-generator/src/templates",
      `${templateName}.tsx`,
    ),
    join(
      rootDir,
      "packages/document-generator/dist/templates",
      `${templateName}.js`,
    ),
  );

  for (const templatePath of possiblePaths) {
    if (existsSync(templatePath)) {
      const module = await import(templatePath);
      return module.default || module[templateName] || module;
    }
  }

  // Fallback to legal template from templates
  const legalModule = await import(
    "../packages/document-generator/dist/templates/legal.js"
  );
  return legalModule.default || legalModule.LegalTemplate;
}

async function getProcessesOnPort(port: number): Promise<string[]> {
  try {
    const { stdout } = await execAsync(`lsof -ti:${port}`);
    return stdout.trim().split("\n").filter((pid) => pid.length > 0);
  } catch (error) {
    // No processes found on port
    return [];
  }
}

async function killProcesses(pids: string[]): Promise<void> {
  if (pids.length === 0) return;

  try {
    await execAsync(`kill -9 ${pids.join(" ")}`);
    console.log(
      `✅ Killed ${pids.length} process(es) on port ${currentConfig.port}`,
    );
  } catch (error) {
    console.error(`❌ Failed to kill processes:`, error);
    throw error;
  }
}

async function promptUser(question: string): Promise<boolean> {
  return new Promise((resolve) => {
    const readline = require("readline");
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    rl.question(question + " (y/n): ", (answer: string) => {
      rl.close();
      resolve(answer.toLowerCase().startsWith("y"));
    });
  });
}

async function handlePortConflict(): Promise<void> {
  const processes = await getProcessesOnPort(currentConfig.port);

  if (processes.length > 0) {
    console.log(
      `⚠️  Port ${currentConfig.port} is already in use by ${processes.length} process(es).`,
    );

    const shouldKill = await promptUser(
      `Would you like to kill the existing process(es) and continue?`,
    );

    if (shouldKill) {
      await killProcesses(processes);
      // Wait a moment for the OS to fully release the port
      await new Promise((resolve) => setTimeout(resolve, 1000));
    } else {
      console.log(
        `💡 Try using a different port: pnpm doc:preview ${
          basename(currentConfig.input)
        } -p ${currentConfig.port + 1}`,
      );
      process.exit(0);
    }
  }
}

program.parse();
