#!/usr/bin/env node

/**
 * Performance monitoring script for Carpool frontend
 * Helps identify startup issues in Azure Static Web Apps deployment
 */

const fs = require("fs");
const path = require("path");

console.log("🔍 Carpool Frontend Performance Check");
console.log("=====================================");

// Check Node.js version
const nodeVersion = process.version;
console.log(`Node.js Version: ${nodeVersion}`);

// Check memory usage
const memUsage = process.memoryUsage();
console.log(`Memory Usage:`);
console.log(`  RSS: ${Math.round(memUsage.rss / 1024 / 1024)} MB`);
console.log(`  Heap Used: ${Math.round(memUsage.heapUsed / 1024 / 1024)} MB`);
console.log(`  Heap Total: ${Math.round(memUsage.heapTotal / 1024 / 1024)} MB`);

// Check build artifacts
const buildPath = path.join(__dirname, ".next");
if (fs.existsSync(buildPath)) {
  console.log("✅ Build artifacts found");

  // Check critical files
  const criticalFiles = [
    ".next/BUILD_ID",
    ".next/static",
    ".next/server",
    ".next/cache",
  ];

  criticalFiles.forEach((file) => {
    const filePath = path.join(__dirname, file);
    if (fs.existsSync(filePath)) {
      console.log(`✅ ${file} exists`);
    } else {
      console.log(`❌ ${file} missing`);
    }
  });
} else {
  console.log("❌ No build artifacts found - run npm run build first");
}

// Check package size
const packageJsonPath = path.join(__dirname, "package.json");
if (fs.existsSync(packageJsonPath)) {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
  const depCount = Object.keys(packageJson.dependencies || {}).length;
  const devDepCount = Object.keys(packageJson.devDependencies || {}).length;

  console.log(
    `Dependencies: ${depCount} production, ${devDepCount} development`
  );

  // Check for heavy dependencies
  const heavyDeps = ["@mui/material", "lodash", "moment", "webpack"];

  const foundHeavyDeps = heavyDeps.filter(
    (dep) =>
      packageJson.dependencies?.[dep] || packageJson.devDependencies?.[dep]
  );

  if (foundHeavyDeps.length > 0) {
    console.log(
      `⚠️  Heavy dependencies detected: ${foundHeavyDeps.join(", ")}`
    );
  }
}

// Environment checks
console.log("\nEnvironment Configuration:");
console.log(`NODE_ENV: ${process.env.NODE_ENV || "not set"}`);
console.log(
  `NEXT_TELEMETRY_DISABLED: ${process.env.NEXT_TELEMETRY_DISABLED || "not set"}`
);
console.log(`NODE_OPTIONS: ${process.env.NODE_OPTIONS || "not set"}`);

// Performance recommendations
console.log("\n📊 Performance Recommendations:");
console.log("1. Ensure NODE_OPTIONS includes --max-old-space-size=4096");
console.log("2. Set NEXT_TELEMETRY_DISABLED=1 in production");
console.log("3. Use Next.js 14+ for better Azure SWA compatibility");
console.log("4. Enable SWC minification for faster builds");
console.log("5. Optimize image loading with next/image");

console.log("\n✅ Performance check completed");
