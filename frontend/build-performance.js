#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

// Simple build performance monitoring
class BuildMonitor {
  constructor() {
    this.startTime = Date.now();
    this.stages = [];
  }

  stage(name) {
    const now = Date.now();
    const elapsed = now - this.startTime;

    this.stages.push({
      name,
      timestamp: now,
      elapsed: elapsed / 1000,
    });

    console.log(`[${elapsed / 1000}s] ${name}`);
  }

  summary() {
    const totalTime = (Date.now() - this.startTime) / 1000;
    console.log("\n=== Build Performance Summary ===");
    console.log(`Total build time: ${totalTime}s`);

    this.stages.forEach((stage, i) => {
      const duration =
        i < this.stages.length - 1
          ? this.stages[i + 1].elapsed - stage.elapsed
          : totalTime - stage.elapsed;

      console.log(`${stage.name}: ${duration.toFixed(2)}s`);
    });
  }
}

// Export for use in next.config.js
module.exports = BuildMonitor;

// Run if called directly
if (require.main === module) {
  const monitor = new BuildMonitor();

  // Mock build stages for testing
  monitor.stage("Dependencies installed");
  setTimeout(() => {
    monitor.stage("TypeScript compiled");
    setTimeout(() => {
      monitor.stage("Bundle created");
      monitor.summary();
    }, 1000);
  }, 500);
}
