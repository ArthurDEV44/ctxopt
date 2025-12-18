#!/usr/bin/env node

import { Command } from "commander";

// Import native module (will be available after build)
// import { version, ping } from "@ctxopt/core";

const program = new Command();

program
  .name("ctxopt")
  .description("Terminal wrapper for Claude Code with automatic token optimization")
  .version("0.1.0");

program
  .command("start")
  .description("Start Claude Code with token optimization wrapper")
  .option("-v, --verbose", "Enable verbose logging")
  .action((options) => {
    console.log("Starting ctxopt wrapper...");
    if (options.verbose) {
      console.log("Verbose mode enabled");
    }
    // TODO: Implement PTY wrapper in P01
    console.log("PTY wrapper not yet implemented");
  });

program
  .command("ping")
  .description("Test native module connectivity")
  .action(() => {
    try {
      // const result = ping();
      // console.log(`Native module response: ${result}`);
      console.log("Native module not yet loaded");
    } catch (error) {
      console.error("Failed to load native module:", error);
    }
  });

program
  .command("version")
  .description("Show version information")
  .action(() => {
    console.log("@ctxopt/cli: 0.1.0");
    // console.log(`@ctxopt/core: ${version()}`);
    console.log("@ctxopt/core: not loaded");
  });

program.parse();
