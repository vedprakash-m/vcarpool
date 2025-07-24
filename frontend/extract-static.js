#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

console.log(
  "🔄 Creating Azure Static Web Apps deployment from standalone build..."
);

const nextDir = path.join(__dirname, ".next");
const standaloneDir = path.join(nextDir, "standalone");
const staticDir = path.join(nextDir, "static");
const outputDir = path.join(__dirname, "out");
const publicDir = path.join(__dirname, "public");

// Create output directory
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Create a simple index.html that redirects to the Next.js app
const indexHtml = `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Carpool - Loading...</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <link rel="icon" href="/favicon.ico">
    <style>
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        display: flex;
        justify-content: center;
        align-items: center;
        height: 100vh;
        margin: 0;
        background: #f5f5f5;
      }
      .loading {
        text-align: center;
      }
      .spinner {
        border: 3px solid #f3f3f3;
        border-top: 3px solid #3498db;
        border-radius: 50%;
        width: 40px;
        height: 40px;
        animation: spin 1s linear infinite;
        margin: 0 auto 20px;
      }
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    </style>
    <script>
      // Redirect to Azure Functions-based Next.js app
      setTimeout(() => {
        window.location.href = '/api/app';
      }, 100);
    </script>
</head>
<body>
    <div class="loading">
        <div class="spinner"></div>
        <h2>Loading Carpool...</h2>
        <p>Initializing application...</p>
    </div>
</body>
</html>`;

fs.writeFileSync(path.join(outputDir, "index.html"), indexHtml);

// Copy public assets
if (fs.existsSync(publicDir)) {
  const copyRecursive = (src, dest) => {
    if (fs.statSync(src).isDirectory()) {
      if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest, { recursive: true });
      }
      fs.readdirSync(src).forEach((file) => {
        copyRecursive(path.join(src, file), path.join(dest, file));
      });
    } else {
      fs.copyFileSync(src, dest);
    }
  };

  fs.readdirSync(publicDir).forEach((file) => {
    copyRecursive(path.join(publicDir, file), path.join(outputDir, file));
  });
  console.log("✅ Copied public assets");
}

// Copy the standalone application to api directory for Azure Functions
const apiDir = path.join(outputDir, "api");
if (fs.existsSync(standaloneDir)) {
  if (!fs.existsSync(apiDir)) {
    fs.mkdirSync(apiDir, { recursive: true });
  }

  // Copy standalone files
  const copyStandalone = (src, dest) => {
    if (fs.statSync(src).isDirectory()) {
      if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest, { recursive: true });
      }
      fs.readdirSync(src).forEach((file) => {
        copyStandalone(path.join(src, file), path.join(dest, file));
      });
    } else {
      fs.copyFileSync(src, dest);
    }
  };

  copyStandalone(standaloneDir, apiDir);
  console.log("✅ Copied standalone application");
}

// Create a simple routes configuration for SWA
const routes = [
  {
    route: "/api/app*",
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedRoles: ["anonymous"],
  },
  {
    route: "/*",
    serve: "/index.html",
    statusCode: 200,
  },
];

fs.writeFileSync(
  path.join(outputDir, "staticwebapp.config.json"),
  JSON.stringify({ routes }, null, 2)
);

console.log("✅ Azure Static Web Apps deployment ready!");
console.log(`📁 Output directory: ${outputDir}`);
console.log("📋 Files created:");
console.log("   - index.html (entry point)");
console.log("   - staticwebapp.config.json (routing config)");
console.log("   - api/ (Next.js standalone app)");
console.log("   - public assets");
